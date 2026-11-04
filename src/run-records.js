// Native run capture: a bounded in-memory registry of immutable records for locally executed
// fit, model, sweep and convergence-study work. Records are inspectable provenance, never
// scientific validation. Exchange projection preserves every status verbatim except the one
// documented vocabulary translation (fit status "unidentifiable" -> exchange envelope
// "unsupported-foreign" with the native status named in the note; it is not a failure claim).
// Artifact digests hash exact serialized bytes; nothing here fetches URLs or opens paths.
import { sha256Bytes } from './model-provenance.js';

export const RUN_RECORD_KINDS = Object.freeze(['fit-run', 'model-run', 'sweep-run', 'study-run']);
export const RUN_RECORD_STATUSES = Object.freeze(['succeeded', 'out-of-domain', 'numerical-failure', 'cancelled', 'failed', 'partial', 'unidentifiable']);
const idPattern = /^[a-z0-9][a-z0-9_-]{1,63}$/;
const FILENAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$/;

function boundedText(value, max, field) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new TypeError(`${field} must be nonempty text (max ${max})`);
  return value;
}

export function createRunRecord(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.getPrototypeOf(raw) !== Object.prototype) throw new TypeError('runRecord must be a plain object');
  for (const key of Object.keys(raw)) if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new TypeError(`runRecord.${key} is forbidden`);
  const allowed = ['id', 'kind', 'modelId', 'status', 'createdAt', 'payload', 'datasetRecordId', 'application', 'artifactFileName', 'artifactSha256', 'note'];
  for (const key of Object.keys(raw)) if (!allowed.includes(key)) throw new TypeError(`runRecord.${key} is unsupported`);
  if (typeof raw.id !== 'string' || !idPattern.test(raw.id)) throw new TypeError('runRecord.id must be a lower-case id');
  if (!RUN_RECORD_KINDS.includes(raw.kind)) throw new RangeError('runRecord.kind unsupported');
  if (!RUN_RECORD_STATUSES.includes(raw.status)) throw new RangeError('runRecord.status unsupported');
  if (typeof raw.createdAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(raw.createdAt) || !Number.isFinite(Date.parse(raw.createdAt))) throw new TypeError('runRecord.createdAt must be a UTC ISO instant');
  if (!raw.payload || typeof raw.payload !== 'object' || Array.isArray(raw.payload)) throw new TypeError('runRecord.payload must be a record');
  if (raw.datasetRecordId != null && (typeof raw.datasetRecordId !== 'string' || !idPattern.test(raw.datasetRecordId))) throw new TypeError('runRecord.datasetRecordId must be a lower-case id or null');
  if (raw.artifactFileName != null && (typeof raw.artifactFileName !== 'string' || !FILENAME_PATTERN.test(raw.artifactFileName) || raw.artifactFileName.includes('..'))) {
    throw new TypeError('runRecord.artifactFileName must be a flat safe basename');
  }
  if (raw.artifactSha256 != null && !/^[a-f0-9]{64}$/.test(raw.artifactSha256)) throw new TypeError('runRecord.artifactSha256 must be lowercase hex or null');
  return {
    id: raw.id, kind: raw.kind, modelId: boundedText(raw.modelId, 64, 'runRecord.modelId'), status: raw.status,
    createdAt: raw.createdAt, payload: structuredClone(raw.payload),
    datasetRecordId: raw.datasetRecordId ?? null, application: raw.application ? structuredClone(raw.application) : null,
    artifactFileName: raw.artifactFileName ?? `${raw.id}.json`, artifactSha256: raw.artifactSha256 ?? null,
    note: raw.note == null ? null : boundedText(raw.note, 500, 'runRecord.note'),
  };
}

/** Bounded in-memory registry. `add` returns `{ record, evicted }` so callers can surface an
 * explicit notice when the oldest entry is dropped. All reads return defensive clones. */
export function createRunRegistry({ max = 100 } = {}) {
  if (!Number.isInteger(max) || max < 1 || max > 1000) throw new RangeError('run registry max must be an integer in 1..1000');
  const entries = [];
  return {
    add(raw) {
      const record = createRunRecord(raw);
      if (entries.some(existing => existing.id === record.id)) throw new RangeError(`Duplicate run record id ${record.id}`);
      entries.push(record);
      let evicted = null;
      if (entries.length > max) evicted = entries.shift();
      return { record: structuredClone(record), evicted: evicted ? structuredClone(evicted) : null };
    },
    get(id) {
      const found = entries.find(entry => entry.id === id);
      return found ? structuredClone(found) : null;
    },
    list: () => entries.map(entry => structuredClone(entry)),
    clear: () => { entries.length = 0; },
    size: () => entries.length,
  };
}

/** Exchange `modelRuns` projection. Non-`unidentifiable` statuses pass through verbatim. */
export function toForeignRun(record) {
  const validated = createRunRecord(record);
  const status = validated.status === 'unidentifiable' ? 'unsupported-foreign' : validated.status;
  const note = validated.status === 'unidentifiable'
    ? 'Native fit status "unidentifiable" preserved in the exported artifact; "unsupported-foreign" marks it outside the exchange status vocabulary and is not a failure claim.'
    : validated.note ?? `Native ${validated.kind} captured locally; metadata only on exchange.`;
  return { modelId: validated.modelId, id: validated.id, status, note, queryPlanId: null, deskRunId: null };
}

/** Exact serialized bytes of the run's payload artifact. Deterministic pretty JSON + LF. */
export function artifactBytesFor(record) {
  const validated = createRunRecord(record);
  return new TextEncoder().encode(`${JSON.stringify(validated.payload, null, 2)}\n`);
}

/** Descriptor for the payload artifact with exact byte count and SHA-256 of the exact bytes. */
export async function toArtifactDescriptor(record) {
  const validated = createRunRecord(record);
  const bytes = artifactBytesFor(validated);
  const sha256 = await sha256Bytes(bytes);
  return {
    id: `${validated.id}-artifact`,
    filename: validated.artifactFileName,
    mediaType: 'application/json',
    bytes: bytes.byteLength,
    sha256,
    provenance: { modelRunIds: [validated.id], evidenceIds: [], producer: 'bioprinting-workbench run registry' },
  };
}