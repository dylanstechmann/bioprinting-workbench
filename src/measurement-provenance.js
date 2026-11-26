import { parseCalibrationInput } from './calibration.js';
import { parseOxygen3DMeasurements } from './calibration3d.js';
import { sha256Bytes, sha256Canonical } from './model-provenance.js';
import { MEASUREMENT_BYTES } from './validation.js';

const DATASET_SCHEMA = 'bioprinting-workbench/dataset/1';
const parsers = new Map([['slab-oxygen', parseCalibrationInput], ['box-oxygen', parseOxygen3DMeasurements]]);
const idPattern = /^[a-z0-9][a-z0-9_-]{1,63}$/;
const digestPattern = /^[a-f0-9]{64}$/;
function checkIdentity(id, timestamp) {
  if (typeof id !== 'string' || !idPattern.test(id)) throw new TypeError('Provenance record requires a lower-case ID');
  if (typeof timestamp !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(timestamp) || !Number.isFinite(Date.parse(timestamp))) throw new TypeError('Provenance timestamp must be a UTC ISO instant');
}
function freezeRecord(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeRecord(child);
    Object.freeze(value);
  }
  return value;
}

function copyMeasurementBytes(rawBytes) {
  if (!(rawBytes instanceof Uint8Array) || rawBytes.byteLength > MEASUREMENT_BYTES) throw new RangeError('Dataset requires at most 256 KiB of original UTF-8 bytes');
  return Uint8Array.from(rawBytes);
}

function parseMeasurementBytes(parse, bytes) {
  return parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

function sourceMatches(declared, normalized) {
  if (!declared || typeof declared !== 'object' || Array.isArray(declared)) return false;
  const fields = Object.keys(normalized);
  return Object.keys(declared).length === fields.length &&
    fields.every(field => Object.hasOwn(declared, field) && declared[field] === normalized[field]);
}

export async function createDatasetRecord({ id, rawBytes, modelId, importedAt }) {
  checkIdentity(id, importedAt);
  const bytes = copyMeasurementBytes(rawBytes);
  const parse = parsers.get(modelId);
  if (!parse) throw new RangeError('Unsupported dataset model');
  const normalizedInput = parseMeasurementBytes(parse, bytes);
  return freezeRecord({ schema: DATASET_SCHEMA, id, modelId,
    inputSchema: normalizedInput.schema, source: normalizedInput.source,
    declaredDataKind: normalizedInput.dataKind, units: normalizedInput.units,
    rawSha256: await sha256Bytes(bytes), normalizedSha256: await sha256Canonical(normalizedInput),
    measurementCount: normalizedInput.measurements.length, importedAt, normalizedInput });
}

export async function verifyDatasetRecord(record, rawBytes = null) {
  const parse = parsers.get(record?.modelId);
  if (!parse || record.schema !== DATASET_SCHEMA) throw new TypeError('Invalid dataset record');
  const { rawSha256, normalizedSha256 } = record;
  checkIdentity(record.id, record.importedAt);
  if (typeof rawSha256 !== 'string' || !digestPattern.test(rawSha256) ||
      typeof normalizedSha256 !== 'string' || !digestPattern.test(normalizedSha256)) {
    throw new TypeError('Dataset digests must be lowercase SHA-256');
  }
  const bytes = rawBytes instanceof Uint8Array ? copyMeasurementBytes(rawBytes) : null;
  const normalized = parse(JSON.stringify(record.normalizedInput));
  const metadataMatches = record.inputSchema === normalized.schema &&
    record.declaredDataKind === normalized.dataKind && record.units === normalized.units &&
    record.measurementCount === normalized.measurements.length &&
    sourceMatches(record.source, normalized.source);
  const normalizedMatches = metadataMatches && await sha256Canonical(normalized) === normalizedSha256;
  let rawMatches = bytes === null ? null : false;
  if (bytes !== null && normalizedMatches && await sha256Bytes(bytes) === rawSha256) {
    let original;
    try {
      original = parseMeasurementBytes(parse, bytes);
    } catch (error) {
      if (!(error instanceof TypeError || error instanceof SyntaxError || error instanceof RangeError)) throw error;
    }
    rawMatches = original !== undefined && await sha256Canonical(original) === normalizedSha256;
  }
  return { rawAvailable: bytes !== null, normalizedMatches, rawMatches };
}

export async function buildFitRun(context, nativeFit) {
  checkIdentity(context.id, context.startedAt);
  checkIdentity(context.id, context.finishedAt);
  if (Date.parse(context.finishedAt) < Date.parse(context.startedAt)) throw new RangeError('Fit finish precedes start');
  const dataset = context.dataset;
  const { id: datasetId, modelId, normalizedSha256: datasetSha256, declaredDataKind } = dataset;
  if (!(await verifyDatasetRecord(dataset)).normalizedMatches) throw new RangeError('Dataset content or metadata changed');
  if (nativeFit.dataKind !== declaredDataKind) throw new RangeError('Fit data declaration differs from dataset');
  if (context.implementationSha256 !== null && !digestPattern.test(context.implementationSha256)) throw new TypeError('Implementation digest must be SHA-256 or null');
  let status = 'succeeded';
  if (nativeFit.identifiable === false) status = 'unidentifiable';
  else if (nativeFit.converged === false) status = 'numerical-failure';
  else if (!nativeFit.inDomain) status = 'out-of-domain';
  const estimate = nativeFit.q;
  if (estimate !== null && !Number.isFinite(estimate)) throw new RangeError('Nonfinite fit estimate');
  const metric = modelId === 'box-oxygen' ? nativeFit.residualRMSE : nativeFit.residualStd;
  if (!Number.isFinite(metric)) throw new RangeError('Nonfinite fit residual');
  return freezeRecord({ schema: 'bioprinting-workbench/fit-run/1', id: context.id,
    datasetId, datasetSha256, modelId,
    settingsSnapshot: structuredClone(context.settingsSnapshot), implementationSha256: context.implementationSha256,
    startedAt: context.startedAt, finishedAt: context.finishedAt, status, estimate,
    residuals: structuredClone(nativeFit.residuals ?? []),
    residualMetric: { name: modelId === 'box-oxygen' ? 'ratio-RMSE' : 'demand-standard-deviation', value: metric },
    diagnostics: structuredClone(nativeFit), applied: false });
}

/** An application is a new immutable receipt, not a mutation of the original fit. */
export function recordFitApplication(record, { appliedAt, previousDemand, demand }) {
  checkIdentity(record?.id, appliedAt);
  if (record.schema !== 'bioprinting-workbench/fit-run/1' || record.status !== 'succeeded') throw new RangeError('Only a succeeded fit may be applied');
  if (Date.parse(appliedAt) < Date.parse(record.finishedAt)) throw new RangeError('Application precedes fit completion');
  if (!Number.isFinite(previousDemand) || previousDemand < 0 || previousDemand > 2) throw new RangeError('Invalid previous demand');
  if (!Number.isFinite(demand) || demand < 0 || demand > 2 || demand !== record.estimate) throw new RangeError('Applied demand must match the in-domain fit estimate');
  return freezeRecord({ ...structuredClone(record), applied: true,
    application: { appliedAt, previousDemand, demand, origin: 'explicit-fit-application' } });
}
