import { parseCalibrationInput } from './calibration.js';
import { parseOxygen3DMeasurements } from './calibration3d.js';
import { sha256Bytes, sha256Canonical } from './model-provenance.js';
import { MEASUREMENT_BYTES } from './validation.js';

const parsers = { 'slab-oxygen': parseCalibrationInput, 'box-oxygen': parseOxygen3DMeasurements };
const idPattern = /^[a-z0-9][a-z0-9_-]{1,63}$/;
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

export async function createDatasetRecord({ id, rawBytes, modelId, importedAt }) {
  checkIdentity(id, importedAt);
  if (!(rawBytes instanceof Uint8Array) || rawBytes.byteLength > MEASUREMENT_BYTES) throw new RangeError('Dataset requires at most 256 KiB of original UTF-8 bytes');
  const parse = parsers[modelId];
  if (!parse) throw new RangeError('Unsupported dataset model');
  const bytes = Uint8Array.from(rawBytes);
  const normalizedInput = parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  return freezeRecord({ schema: 'bioprinting-workbench/dataset/1', id, modelId,
    inputSchema: normalizedInput.schema, source: normalizedInput.source,
    declaredDataKind: normalizedInput.dataKind, units: normalizedInput.units,
    rawSha256: await sha256Bytes(bytes), normalizedSha256: await sha256Canonical(normalizedInput),
    measurementCount: normalizedInput.measurements.length, importedAt, normalizedInput });
}

export async function verifyDatasetRecord(record, rawBytes = null) {
  const parse = parsers[record?.modelId];
  if (!parse || record.schema !== 'bioprinting-workbench/dataset/1') throw new TypeError('Invalid dataset record');
  const normalized = parse(JSON.stringify(record.normalizedInput));
  const normalizedMatches = await sha256Canonical(normalized) === record.normalizedSha256;
  const rawAvailable = rawBytes instanceof Uint8Array;
  return { rawAvailable, normalizedMatches, rawMatches: rawAvailable ? await sha256Bytes(rawBytes) === record.rawSha256 : null };
}

export async function buildFitRun(context, nativeFit) {
  checkIdentity(context.id, context.startedAt);
  checkIdentity(context.id, context.finishedAt);
  if (Date.parse(context.finishedAt) < Date.parse(context.startedAt)) throw new RangeError('Fit finish precedes start');
  if (!(await verifyDatasetRecord(context.dataset)).normalizedMatches) throw new RangeError('Dataset content changed');
  const modelId = context.dataset.modelId;
  if (nativeFit.dataKind !== context.dataset.declaredDataKind) throw new RangeError('Fit data declaration differs from dataset');
  if (context.implementationSha256 !== null && !/^[a-f0-9]{64}$/.test(context.implementationSha256)) throw new TypeError('Implementation digest must be SHA-256 or null');
  let status = 'succeeded';
  if (nativeFit.identifiable === false) status = 'unidentifiable';
  else if (nativeFit.converged === false) status = 'numerical-failure';
  else if (!nativeFit.inDomain) status = 'out-of-domain';
  const estimate = nativeFit.q;
  if (estimate !== null && !Number.isFinite(estimate)) throw new RangeError('Nonfinite fit estimate');
  const metric = modelId === 'box-oxygen' ? nativeFit.residualRMSE : nativeFit.residualStd;
  if (!Number.isFinite(metric)) throw new RangeError('Nonfinite fit residual');
  return freezeRecord({ schema: 'bioprinting-workbench/fit-run/1', id: context.id,
    datasetId: context.dataset.id, datasetSha256: context.dataset.normalizedSha256, modelId,
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