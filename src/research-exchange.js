// Phase E research exchange: file-based, provenance-preserving bundles between the offline
// Workbench and the local ResearchDesk. Preview never writes; apply constructs new state from
// exact bytes; hashes attest byte integrity only — never scientific validation. Bundles carry
// no secret/note field, no executable content, no HTML and no automatic URL fetch.
import { canonicalJsonBytes, sha256Bytes, sha256Canonical } from './model-provenance.js';
import { validateHypothesisCard } from './hypothesis-workspace.js';

export const EXCHANGE_SCHEMA = 'bioprinting-workbench/research-exchange/1';
export const MAX_BUNDLE_BYTES = 5 * 1024 * 1024;
export const MAX_ARTIFACT_BYTES = 10 * 1024 * 1024;
export const MAX_TOTAL_ARTIFACT_BYTES = 25 * 1024 * 1024;
export const MAX_NESTING = 20;
const FILENAME_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$/;
const MEDIA_TYPES = Object.freeze(['application/json', 'text/csv', 'text/markdown', 'image/png']);
const DANGEROUS_KEYS = ['__proto__', 'prototype', 'constructor'];
const ID_RE = /^[a-z0-9][a-z0-9_-]{1,63}$/;

function plain(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError(`${path} must be a plain object`);
  for (const key of Object.keys(value)) if (DANGEROUS_KEYS.includes(key)) throw new TypeError(`${path}.${key} is forbidden`);
  return value;
}
function checkNesting(value, depth = 0) {
  if (depth > MAX_NESTING) throw new RangeError(`Bundle JSON nesting exceeds ${MAX_NESTING}`);
  if (Array.isArray(value)) for (const item of value) checkNesting(item, depth + 1);
  else if (value && typeof value === 'object') for (const item of Object.values(value)) checkNesting(item, depth + 1);
}
function bounded(value, max, path) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new TypeError(`${path} must be nonempty text (max ${max})`);
  return value;
}
function idList(value, max, path) {
  if (!Array.isArray(value) || value.length > max) throw new TypeError(`${path} must be an array (max ${max})`);
  return value.map((item, i) => {
    if (typeof item !== 'string' || !ID_RE.test(item)) throw new TypeError(`${path}[${i}] must be an id`);
    return item;
  });
}
function isoInstant(value, path) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new TypeError(`${path} must be an ISO instant`);
  return value;
}

export function validateArtifactDescriptor(raw, path = 'artifact') {
  plain(raw, path);
  for (const key of Object.keys(raw)) if (!['id', 'filename', 'mediaType', 'bytes', 'sha256', 'provenance'].includes(key)) throw new TypeError(`${path}.${key} is unsupported`);
  const filename = raw.filename;
  if (typeof filename !== 'string' || !FILENAME_RE.test(filename) || filename.includes('..')) throw new TypeError(`${path}.filename must be a flat safe basename`);
  if (!MEDIA_TYPES.includes(raw.mediaType)) throw new RangeError(`${path}.mediaType unsupported`);
  if (!Number.isInteger(raw.bytes) || raw.bytes < 0 || raw.bytes > MAX_ARTIFACT_BYTES) throw new RangeError(`${path}.bytes out of range`);
  if (typeof raw.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(raw.sha256)) throw new TypeError(`${path}.sha256 must be lowercase hex`);
  const provenance = plain(raw.provenance, `${path}.provenance`);
  return {
    id: bounded(raw.id, 64, `${path}.id`),
    filename, mediaType: raw.mediaType, bytes: raw.bytes, sha256: raw.sha256,
    provenance: {
      modelRunIds: idList(provenance.modelRunIds ?? [], 50, `${path}.provenance.modelRunIds`),
      evidenceIds: idList(provenance.evidenceIds ?? [], 50, `${path}.provenance.evidenceIds`),
      producer: bounded(provenance.producer ?? 'unknown producer', 200, `${path}.provenance.producer`),
    },
  };
}

export function parseResearchBundle(text) {
  if (typeof text !== 'string') throw new TypeError('bundle must be text');
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > MAX_BUNDLE_BYTES) throw new RangeError(`Bundle exceeds ${MAX_BUNDLE_BYTES} bytes`);
  let raw;
  try { raw = JSON.parse(text); } catch (error) { throw new TypeError(`Bundle is not valid JSON: ${error.message}`); }
  checkNesting(raw);
  return plain(raw, 'bundle');
}
export function validateQueryPlan(raw, path = 'query') {
  plain(raw, path);
  for (const key of Object.keys(raw)) if (!['id', 'hypothesisId', 'query', 'providerIds', 'limit', 'purpose', 'disclosure', 'executionStatus'].includes(key)) throw new TypeError(`${path}.${key} is unsupported`);
  const limit = raw.limit;
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw new RangeError(`${path}.limit out of range`);
  if (!['planned', 'not-supported'].includes(raw.executionStatus)) throw new RangeError(`${path}.executionStatus unsupported`);
  return {
    id: bounded(raw.id, 64, `${path}.id`), hypothesisId: bounded(raw.hypothesisId, 64, `${path}.hypothesisId`),
    query: bounded(raw.query, 500, `${path}.query`), providerIds: idList(raw.providerIds, 8, `${path}.providerIds`),
    limit, purpose: bounded(raw.purpose, 500, `${path}.purpose`), disclosure: bounded(raw.disclosure, 500, `${path}.disclosure`),
    executionStatus: raw.executionStatus,
  };
}

export function validateEvidenceRecord(raw, path = 'evidence') {
  plain(raw, path);
  for (const key of Object.keys(raw)) if (!['id', 'statement', 'sourceClass', 'reviewState', 'locator', 'sourceId'].includes(key)) throw new TypeError(`${path}.${key} is unsupported`);
  if (!['primary-source', 'secondhand', 'synthetic-fixture', 'unreviewed-lead'].includes(raw.sourceClass)) throw new RangeError(`${path}.sourceClass unsupported`);
  if (!['unreviewed', 'owner-reviewed'].includes(raw.reviewState)) throw new RangeError(`${path}.reviewState unsupported`);
  return {
    id: bounded(raw.id, 64, `${path}.id`), statement: bounded(raw.statement, 2000, `${path}.statement`),
    sourceClass: raw.sourceClass, reviewState: raw.reviewState, locator: bounded(raw.locator, 500, `${path}.locator`),
    sourceId: raw.sourceId === null ? null : bounded(raw.sourceId, 64, `${path}.sourceId`),
  };
}

export function validateForeignModelRun(raw, path = 'modelRun') {
  // Bounded structural retention only: unknown model IDs are kept as unsupported foreign
  // metadata and are never executed, overlaid or upgraded. Desk run/receipt statuses are
  // preserved verbatim (partial/interrupted/submission-unknown are never relabelled failed).
  plain(raw, path);
  for (const key of Object.keys(raw)) if (!['modelId', 'id', 'status', 'note', 'queryPlanId', 'deskRunId'].includes(key)) throw new TypeError(`${path}.${key} is unsupported`);
  const modelId = bounded(raw.modelId ?? 'unknown-model', 64, `${path}.modelId`);
  const allowedStatuses = ['succeeded', 'out-of-domain', 'numerical-failure', 'cancelled', 'failed', 'unsupported-foreign', 'queued', 'running', 'partial', 'interrupted', 'submission-unknown'];
  if (!allowedStatuses.includes(raw.status)) throw new RangeError(`${path}.status unsupported`);
  return {
    modelId,
    id: raw.id === null ? null : bounded(raw.id, 64, `${path}.id`),
    status: raw.status,
    note: bounded(raw.note ?? 'retained as foreign metadata; not executed here', 500, `${path}.note`),
    queryPlanId: raw.queryPlanId === null || raw.queryPlanId === undefined ? null : bounded(raw.queryPlanId, 64, `${path}.queryPlanId`),
    deskRunId: raw.deskRunId === null || raw.deskRunId === undefined ? null : bounded(raw.deskRunId, 64, `${path}.deskRunId`),
  };
}
export function validateResearchBundle(raw) {
  plain(raw, 'bundle');
  const allowed = ['schema', 'bundleId', 'createdAt', 'producer', 'sourceRevision', 'hypotheses', 'queries', 'modelRuns', 'evidence', 'artifacts', 'privacyClassification', 'publicationReviewStatus'];
  for (const key of Object.keys(raw)) if (!allowed.includes(key)) throw new TypeError(`bundle.${key} is unsupported`);
  if (raw.schema !== EXCHANGE_SCHEMA) throw new RangeError('Unknown exchange schema');
  const producer = plain(raw.producer, 'bundle.producer');
  const sourceRevision = plain(raw.sourceRevision, 'bundle.sourceRevision');
  if (typeof sourceRevision.dirty !== 'boolean') throw new TypeError('sourceRevision.dirty must be boolean');
  if (sourceRevision.commit !== null && typeof sourceRevision.commit !== 'string') throw new TypeError('sourceRevision.commit must be null or text');
  if (sourceRevision.implementationSha256 !== null && !/^[a-f0-9]{64}$/.test(sourceRevision.implementationSha256)) throw new TypeError('sourceRevision.implementationSha256 must be lowercase hex or null');
  if (!['private', 'selected-for-exchange'].includes(raw.privacyClassification)) throw new RangeError('privacyClassification unsupported');
  if (raw.publicationReviewStatus !== 'not-approved') throw new RangeError('Imported/exported bundles are always not-approved for publication');
  const bundle = {
    schema: EXCHANGE_SCHEMA,
    bundleId: bounded(raw.bundleId, 64, 'bundle.bundleId'),
    createdAt: isoInstant(raw.createdAt, 'bundle.createdAt'),
    producer: {
      application: bounded(producer.application, 200, 'producer.application'),
      version: bounded(producer.version, 64, 'producer.version'),
      executedBy: ['owner', 'agent', 'import'].includes(producer.executedBy) ? producer.executedBy : (() => { throw new RangeError('producer.executedBy unsupported'); })(),
    },
    sourceRevision: { commit: sourceRevision.commit, dirty: sourceRevision.dirty, implementationSha256: sourceRevision.implementationSha256 },
    hypotheses: [], queries: [], modelRuns: [], evidence: [], artifacts: [],
    privacyClassification: raw.privacyClassification,
    publicationReviewStatus: 'not-approved',
  };
  const arrays = [
    ['hypotheses', 100, item => validateHypothesisCard(item, { allowDraft: true })],
    ['queries', 100, validateQueryPlan],
    ['modelRuns', 100, validateForeignModelRun],
    ['evidence', 500, validateEvidenceRecord],
    ['artifacts', 500, validateArtifactDescriptor],
  ];
  for (const [name, max, validate] of arrays) {
    const list = raw[name];
    if (!Array.isArray(list) || list.length > max) throw new TypeError(`bundle.${name} must be an array (max ${max})`);
    bundle[name] = list.map((item, i) => validate(item, `bundle.${name}[${i}]`));
  }
  const hypoIds = bundle.hypotheses.map(h => h.id);
  if (new Set(hypoIds).size !== hypoIds.length) throw new RangeError('Duplicate hypothesis ids in bundle');
  const knownHypo = new Set(hypoIds);
  for (const plan of bundle.queries) if (!knownHypo.has(plan.hypothesisId)) throw new RangeError(`Query ${plan.id} references an unknown hypothesis`);
  for (const card of bundle.hypotheses) {
    for (const parent of card.parentHypothesisIds) if (!knownHypo.has(parent)) throw new RangeError(`Hypothesis ${card.id} references unknown parent ${parent}`);
  }
  const parents = new Map(bundle.hypotheses.map(h => [h.id, h.parentHypothesisIds]));
  for (const start of parents.keys()) {
    const seen = new Set([start]);
    let frontier = [...(parents.get(start) || [])];
    while (frontier.length) {
      const next = frontier.pop();
      if (seen.has(next)) throw new RangeError('Hypothesis ancestry must be acyclic');
      seen.add(next);
      frontier.push(...(parents.get(next) || []));
    }
  }
  const artifactIds = bundle.artifacts.map(a => a.id);
  if (new Set(artifactIds).size !== artifactIds.length) throw new RangeError('Duplicate artifact ids in bundle');
  return bundle;
}
/** Verify selected artifact bytes: hash exact bytes, cap sizes, never fetch URLs or open paths. */
export async function verifyArtifactFiles(bundle, files) {
  const validated = validateResearchBundle(bundle);
  const provided = new Map();
  let total = 0;
  for (const file of files ?? []) {
    if (!file || typeof file !== 'object') throw new TypeError('artifact file entries must be records');
    const filename = bounded(file.filename, 200, 'artifactFile.filename');
    const bytes = file.bytes instanceof Uint8Array ? file.bytes : (() => { throw new TypeError('artifactFile.bytes must be a Uint8Array'); })();
    if (bytes.length > MAX_ARTIFACT_BYTES) throw new RangeError(`Artifact ${filename} exceeds ${MAX_ARTIFACT_BYTES} bytes`);
    total += bytes.length;
    if (total > MAX_TOTAL_ARTIFACT_BYTES) throw new RangeError(`Selected artifacts exceed ${MAX_TOTAL_ARTIFACT_BYTES} bytes`);
    provided.set(filename, bytes);
  }
  const verified = [], failed = [];
  for (const descriptor of validated.artifacts) {
    const bytes = provided.get(descriptor.filename);
    if (!bytes) { failed.push({ id: descriptor.id, reason: 'file not selected' }); continue; }
    if (bytes.length !== descriptor.bytes) { failed.push({ id: descriptor.id, reason: 'size mismatch' }); continue; }
    const digest = await sha256Bytes(bytes);
    if (digest !== descriptor.sha256) { failed.push({ id: descriptor.id, reason: 'hash mismatch' }); continue; }
    verified.push(descriptor.id);
  }
  return { verified, failed };
}

export function emptyExchangeState() {
  return { hypotheses: [], queries: [], modelRuns: [], evidence: [], artifacts: [], receipts: [] };
}

/** Preview performs no writes, submissions or network calls. Exact id+hash duplicates are
 * idempotent; same id with different content is a conflict and blocks apply. */
export async function previewResearchImport(bundle, currentState) {
  const validated = validateResearchBundle(bundle);
  const state = currentState ?? emptyExchangeState();
  const bundleSha256 = await sha256Canonical(validated);
  const expectedStoreSha256 = await sha256Canonical(state);
  const creates = [], duplicates = [], conflicts = [], warnings = [];
  const blockedReasons = [];
  const current = new Map();
  for (const group of ['hypotheses', 'queries', 'modelRuns', 'evidence', 'artifacts', 'receipts']) {
    for (const record of state[group] ?? []) current.set(`${group}:${record.id}`, await sha256Canonical(record));
  }
  for (const group of ['hypotheses', 'queries', 'modelRuns', 'evidence', 'artifacts']) {
    for (const record of validated[group]) {
      const key = `${group}:${record.id}`;
      const hash = await sha256Canonical(record);
      if (!current.has(key)) creates.push(key);
      else if (current.get(key) === hash) duplicates.push(key);
      else conflicts.push(key);
    }
  }
  if (validated.modelRuns.some(run => run.note.includes('foreign metadata'))) {
    warnings.push('Foreign model runs are retained as metadata only and will never be executed or overlaid here.');
  }
  if (validated.hypotheses.some(card => card.reviewStatus === 'unreviewed')) {
    warnings.push('Unreviewed hypothesis records are imported as unreviewed; import never marks anything owner-reviewed.');
  }
  warnings.push('Imported bundles always keep publicationReviewStatus not-approved.');
  if (conflicts.length) blockedReasons.push(`${conflicts.length} id conflicts must be resolved before apply`);
  return { bundleSha256, creates, duplicates, conflicts, warnings, blockedReasons, expectedStoreSha256 };
}
/** Apply constructs a NEW state from exact bytes; it never partially mutates the old one. */
export async function applyResearchImport(preview, currentState, bundle) {
  const validated = validateResearchBundle(bundle);
  const state = currentState ?? emptyExchangeState();
  const storeHash = await sha256Canonical(state);
  if (storeHash !== preview.expectedStoreSha256) throw new RangeError('Import preview is stale: the workspace changed since preview');
  const bundleHash = await sha256Canonical(validated);
  if (bundleHash !== preview.bundleSha256) throw new RangeError('Import preview is stale: bundle bytes differ');
  if (preview.conflicts.length) throw new RangeError('Import has unresolved id conflicts; apply refused');
  const next = {
    hypotheses: [...state.hypotheses], queries: [...state.queries], modelRuns: [...state.modelRuns],
    evidence: [...state.evidence], artifacts: [...state.artifacts], receipts: [...state.receipts],
  };
  for (const group of ['hypotheses', 'queries', 'modelRuns', 'evidence', 'artifacts']) {
    const existing = new Set(next[group].map(record => record.id));
    for (const record of validated[group]) if (!existing.has(record.id)) next[group].push(structuredClone(record));
  }
  return next;
}

/** Export a user-selected subset. Privacy is explicit; publication stays not-approved;
 * private notes are structurally impossible in this schema. */
export function exportResearchBundle(selection, context) {
  if (!selection || typeof selection !== 'object' || Array.isArray(selection)) throw new TypeError('selection must be a record');
  const bundle = {
    schema: EXCHANGE_SCHEMA,
    bundleId: typeof context?.bundleId === 'string' && ID_RE.test(context.bundleId) ? context.bundleId : (() => { throw new TypeError('context.bundleId must be an id'); })(),
    createdAt: isoInstant(context?.createdAt, 'context.createdAt'),
    producer: {
      application: bounded(context?.producer?.application ?? 'bioprinting-workbench', 200, 'producer.application'),
      version: bounded(context?.producer?.version ?? 'dev', 64, 'producer.version'),
      executedBy: ['owner', 'agent', 'import'].includes(context?.producer?.executedBy) ? context.producer.executedBy : 'agent',
    },
    sourceRevision: {
      commit: context?.sourceRevision?.commit ?? null,
      dirty: Boolean(context?.sourceRevision?.dirty),
      implementationSha256: context?.sourceRevision?.implementationSha256 ?? null,
    },
    hypotheses: selection.hypotheses ?? [], queries: selection.queries ?? [], modelRuns: selection.modelRuns ?? [],
    evidence: selection.evidence ?? [], artifacts: selection.artifacts ?? [],
    privacyClassification: ['private', 'selected-for-exchange'].includes(context?.privacyClassification) ? context.privacyClassification : 'private',
    publicationReviewStatus: 'not-approved',
  };
  return validateResearchBundle(bundle);
}
