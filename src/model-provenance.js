// Phase B provenance: deterministic canonical JSON bytes, exact-byte SHA-256, and ModelRun
// records whose digests attest byte identity only. A hash is integrity evidence, never
// scientific validation, and missing provenance is labelled incomplete, never silently trusted.
import { validateQuantity, getDomainModels } from './domain-models.js';

export const MODEL_RUN_SCHEMA = 'bioprinting-workbench/model-run/1';
export const CANONICALIZATION = 'sorted-json-lf/1';
const DANGEROUS_KEYS = ['__proto__', 'prototype', 'constructor'];
const MAX_DEPTH = 32;
const MAX_NODES = 100000;
const MAX_BYTES = 1024 * 1024;
const RUN_STATUSES = ['succeeded', 'out-of-domain', 'numerical-failure', 'cancelled', 'failed'];

function wellFormedString(s) {
  if (typeof s.isWellFormed === 'function') return s.isWellFormed();
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = s.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      i++;
    } else if (c >= 0xdc00 && c <= 0xdfff) return false;
  }
  return true;
}

function serialize(value, parts, ancestors, state) {
  if (++state.nodes > MAX_NODES) throw new RangeError('Canonical JSON exceeds node limit');
  if (ancestors.has(value)) throw new TypeError('Canonical JSON rejects cycles');
  if (value === null) { parts.push('null'); return; }
  const t = typeof value;
  if (t === 'boolean') { parts.push(value ? 'true' : 'false'); return; }
  if (t === 'number') {
    if (!Number.isFinite(value)) throw new RangeError('Canonical JSON rejects nonfinite numbers');
    parts.push(JSON.stringify(value === 0 ? 0 : value)); // -0 normalizes to 0
    return;
  }
  if (t === 'string') {
    if (!wellFormedString(value)) throw new TypeError('Canonical JSON rejects lone surrogates');
    parts.push(JSON.stringify(value));
    return;
  }
  if (t === 'bigint' || t === 'function' || t === 'symbol' || t === 'undefined') throw new TypeError(`Canonical JSON rejects ${t}`);
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) throw new TypeError('Canonical JSON rejects binary views; serialize explicit bytes');
  if (state.depth >= MAX_DEPTH) throw new RangeError('Canonical JSON exceeds depth limit');
  if (Array.isArray(value)) {
    ancestors.add(value); state.depth++;
    if (Object.keys(value).length !== value.length || Reflect.ownKeys(value).length !== value.length + 1) throw new TypeError('Canonical JSON rejects sparse arrays, extra or non-enumerable properties');
    parts.push('[');
    for (let i = 0; i < value.length; i++) {
      if (i) parts.push(',');
      serialize(value[i], parts, ancestors, state);
    }
    parts.push(']');
    state.depth--; ancestors.delete(value);
    return;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) throw new TypeError('Canonical JSON rejects exotic prototypes');
  ancestors.add(value); state.depth++;
  const keys = [];
  for (const key of Object.keys(value)) {
    if (DANGEROUS_KEYS.includes(key)) throw new TypeError(`Canonical JSON rejects ${key}`);
    const desc = Object.getOwnPropertyDescriptor(value, key);
    if (!desc || !desc.enumerable || !('value' in desc)) throw new TypeError('Canonical JSON rejects accessors/non-enumerable properties');
    if (desc.value === undefined) throw new TypeError('Canonical JSON rejects undefined values');
    keys.push(key);
  }
  if (Reflect.ownKeys(value).length !== keys.length) throw new TypeError('Canonical JSON rejects symbol or non-enumerable keys');
  keys.sort();
  parts.push('{');
  for (let i = 0; i < keys.length; i++) {
    if (i) parts.push(',');
    const key = keys[i];
    if (!wellFormedString(key)) throw new TypeError('Canonical JSON rejects lone surrogates in keys');
    parts.push(JSON.stringify(key), ':');
    serialize(value[key], parts, ancestors, state);
  }
  parts.push('}');
  state.depth--; ancestors.delete(value);
}

/** Canonical JSON bytes: recursively sorted keys (UTF-16 code units), array order retained,
 * JSON.stringify leaf formatting, UTF-8, exactly one trailing LF. Project-specific format,
 * not an RFC canonicalization claim. */
export function canonicalJsonBytes(value) {
  const parts = [];
  serialize(value, parts, new Set(), { depth: 0, nodes: 0 });
  parts.push('\n');
  const bytes = new TextEncoder().encode(parts.join(''));
  if (bytes.length > MAX_BYTES) throw new RangeError('Canonical JSON exceeds byte limit');
  return bytes;
}

/** SHA-256 of exact bytes; respects views (byteOffset/length), never detaches input. */
export async function sha256Bytes(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('sha256Bytes takes a Uint8Array');
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('Web Crypto is unavailable; no insecure fallback exists');
  const digest = await subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Canonical(value) {
  return sha256Bytes(canonicalJsonBytes(value));
}
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
function validTimestamp(value, path) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(value)) throw new TypeError(`${path} must be an ISO-UTC instant`);
  if (!Number.isFinite(Date.parse(value))) throw new RangeError(`${path} is not a real instant`);
  return value;
}
function pathValue(obj, dotted) {
  let cur = obj;
  for (const part of dotted.split('.')) {
    if (cur === null || typeof cur !== 'object' || !(part in cur)) return { found: false, value: undefined };
    cur = cur[part];
  }
  return { found: true, value: cur };
}
function missingReasonFor(modelId, path) {
  if (modelId === 'vascular-supply' && path.includes('CriticalRadius')) return 'Not supply-limiting within the model 10 mm cap under these inputs.';
  if (modelId === 'vascular-supply') return 'Depends on a null critical radius under these inputs.';
  if (modelId === 'relative-division') return 'No hypothetical doubling time was supplied.';
  return `Native model reports no value for ${path}.`;
}

/** Project declared scalar outputs into Quantity records. Booleans/enums/fields stay raw. */
export function projectQuantities(definition, result, { runId = null } = {}) {
  const origin = runId ? 'derived' : definition.quantityOrigin;
  const quantities = {};
  for (const [path, def] of Object.entries(definition.outputDefinitions)) {
    if (def.type !== 'number' && def.type !== 'integer') continue;
    const { found, value } = pathValue(result, path);
    quantities[path] = found && value !== null && value !== undefined
      ? validateQuantity({ value, unit: def.unit, origin, sourceIds: definition.sourceIds.length ? [definition.sourceIds[0]] : [], uncertainty: null, missingReason: null }, { runId, sourceIds: definition.sourceIds })
      : validateQuantity({ value: null, unit: def.unit, origin, sourceIds: [], uncertainty: null, missingReason: missingReasonFor(definition.id, path) }, { runId, sourceIds: definition.sourceIds });
  }
  return quantities;
}
/** Validate a ModelRun record structurally (does not verify digests; see verifyModelRun). */
export function validateModelRun(raw, registry = getDomainModels()) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.getPrototypeOf(raw) !== Object.prototype) throw new TypeError('modelRun must be a plain object');
  for (const key of Object.keys(raw)) if (DANGEROUS_KEYS.includes(key)) throw new TypeError(`modelRun.${key} is forbidden`);
  const allowed = ['schema', 'id', 'modelId', 'modelVersion', 'inputSnapshot', 'inputSha256', 'implementationSha256', 'provenanceStatus', 'startedAt', 'finishedAt', 'status', 'outputs', 'diagnostics', 'sourceIds', 'notices'];
  for (const key of Object.keys(raw)) if (!allowed.includes(key)) throw new TypeError(`modelRun.${key} is unsupported`);
  if (raw.schema !== MODEL_RUN_SCHEMA) throw new RangeError('Unknown model-run schema');
  if (typeof raw.id !== 'string' || !ID_RE.test(raw.id)) throw new TypeError('modelRun.id invalid');
  const definition = registry.find(d => d.id === raw.modelId && d.version === raw.modelVersion);
  if (!definition) throw new RangeError(`Unknown model/version: ${String(raw.modelId)}`);
  if (typeof raw.inputSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(raw.inputSha256)) throw new TypeError('inputSha256 must be lowercase hex');
  if (raw.implementationSha256 !== null && !/^[a-f0-9]{64}$/.test(raw.implementationSha256)) throw new TypeError('implementationSha256 must be lowercase hex or null');
  if (!['pinned', 'incomplete'].includes(raw.provenanceStatus)) throw new RangeError('provenanceStatus unsupported');
  if (raw.provenanceStatus === 'pinned' && raw.implementationSha256 === null) throw new RangeError('pinned runs need an implementation digest');
  if (raw.provenanceStatus === 'incomplete' && raw.implementationSha256 !== null) throw new RangeError('incomplete runs carry a null implementation digest');
  const startedAt = validTimestamp(raw.startedAt, 'modelRun.startedAt'), finishedAt = validTimestamp(raw.finishedAt, 'modelRun.finishedAt');
  if (Date.parse(finishedAt) < Date.parse(startedAt)) throw new RangeError('finishedAt precedes startedAt');
  if (!RUN_STATUSES.includes(raw.status)) throw new RangeError('modelRun.status unsupported');
  if (!raw.outputs || typeof raw.outputs !== 'object' || Array.isArray(raw.outputs)) throw new TypeError('modelRun.outputs must be a record');
  const emptyOutputs = raw.status === 'cancelled' || raw.status === 'failed';
  const outputs = {};
  for (const [path, q] of Object.entries(raw.outputs)) {
    if (!Object.prototype.hasOwnProperty.call(definition.outputDefinitions, path)) throw new RangeError(`Unknown output path ${path}`);
    const def = definition.outputDefinitions[path];
    if (def.type !== 'number' && def.type !== 'integer') throw new RangeError(`Output ${path} is not a scalar quantity`);
    outputs[path] = validateQuantity(q, { runId: raw.id, sourceIds: definition.sourceIds });
    if (outputs[path].origin !== 'derived') throw new RangeError(`Output ${path} must carry derived run provenance, never an upgraded origin`);
  }
  if (emptyOutputs && Object.keys(outputs).length) throw new RangeError('failed/cancelled runs carry empty outputs');
  if (!emptyOutputs && raw.status !== 'numerical-failure') {
    for (const path of Object.keys(definition.outputDefinitions)) {
      const def = definition.outputDefinitions[path];
      if ((def.type === 'number' || def.type === 'integer') && !(path in outputs)) throw new RangeError(`Missing declared output ${path}`);
    }
  }
  const boundedTextList = (list, max, name) => {
    if (!Array.isArray(list)) throw new TypeError(`modelRun.${name} must be an array`);
    return list.map((item, i) => {
      if (typeof item !== 'string' || !item.trim() || item.length > max) throw new TypeError(`modelRun.${name}[${i}] must be bounded text`);
      return item;
    });
  };
  const diagnostics = boundedTextList(raw.diagnostics, 500, 'diagnostics');
  const notices = boundedTextList(raw.notices, 2000, 'notices');
  const sourceIds = raw.sourceIds;
  if (!Array.isArray(sourceIds) || sourceIds.length > 50 || new Set(sourceIds).size !== sourceIds.length) throw new TypeError('modelRun.sourceIds must be unique');
  for (const sid of sourceIds) {
    if (typeof sid !== 'string' || !ID_RE.test(sid)) throw new TypeError('modelRun.sourceIds entries invalid');
    if (definition.sourceIds.length && !definition.sourceIds.includes(sid)) throw new RangeError(`Unknown source ${sid}`);
  }
  return { schema: MODEL_RUN_SCHEMA, id: raw.id, modelId: definition.id, modelVersion: definition.version, inputSnapshot: structuredClone(raw.inputSnapshot), inputSha256: raw.inputSha256, implementationSha256: raw.implementationSha256, provenanceStatus: raw.provenanceStatus, startedAt, finishedAt, status: raw.status, outputs, diagnostics: [...diagnostics], sourceIds: [...sourceIds], notices: [...notices] };
}
/** Build a ModelRun from a matching AdapterEvaluation. Hashes the complete input snapshot;
 * resolves the implementation digest from the manifest or labels provenance incomplete. */
export async function buildModelRun(context, evaluation) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) throw new TypeError('context must be a record');
  const { id, modelId, inputs, startedAt, finishedAt, manifest = null } = context;
  if (typeof id !== 'string' || !ID_RE.test(id)) throw new TypeError('context.id invalid');
  if (!evaluation || evaluation.modelId !== modelId) throw new RangeError('Evaluation does not match the run model');
  const definition = getDomainModels().find(d => d.id === modelId && d.version === evaluation.modelVersion);
  if (!definition) throw new RangeError('Unknown model/version');
  if (!RUN_STATUSES.includes(evaluation.status)) throw new RangeError('Unsupported evaluation status');
  const inputSnapshot = structuredClone(inputs);
  const inputSha256 = await sha256Canonical(inputSnapshot);
  let implementationSha256 = null, provenanceStatus = 'incomplete';
  const entry = manifest?.models?.find?.(m => m && m.id === modelId && m.version === definition.version);
  if (entry && typeof entry.implementationSha256 === 'string' && /^[a-f0-9]{64}$/.test(entry.implementationSha256)) {
    implementationSha256 = entry.implementationSha256;
    provenanceStatus = 'pinned';
  }
  const status = evaluation.status;
  const outputs = status === 'cancelled' || status === 'failed' || status === 'numerical-failure'
    ? {}
    : projectQuantities(definition, evaluation.result, { runId: id });
  return validateModelRun({
    schema: MODEL_RUN_SCHEMA, id, modelId, modelVersion: definition.version,
    inputSnapshot, inputSha256, implementationSha256, provenanceStatus,
    startedAt, finishedAt, status, outputs,
    diagnostics: (evaluation.diagnostics || []).map(String),
    sourceIds: [...(evaluation.sourceIds || [])],
    notices: [...(evaluation.notices || [])],
  });
}

/** Recompute input digest and match manifest entry. Structural validation alone never
 * implies these matches. */
export async function verifyModelRun(run, manifest) {
  const validated = validateModelRun(run);
  const inputMatches = (await sha256Canonical(validated.inputSnapshot)) === validated.inputSha256;
  const entry = manifest?.models?.find?.(m => m && m.id === validated.modelId && m.version === validated.modelVersion);
  const implementationMatches = Boolean(entry && validated.implementationSha256 && entry.implementationSha256 === validated.implementationSha256);
  return { inputMatches, implementationMatches, provenanceStatus: validated.provenanceStatus };
}
