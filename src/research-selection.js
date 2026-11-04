import { exportResearchBundle, verifyArtifactFiles } from './research-exchange.js';
import { toForeignRun, toArtifactDescriptor, artifactBytesFor } from './run-records.js';

const groups = { hypothesisIds: 'hypotheses', queryIds: 'queries', modelRunIds: 'modelRuns', evidenceIds: 'evidence', artifactIds: 'artifacts' };

/** Resolve reference closure without silently dropping missing records. */
export function resolveResearchSelection(state, selection) {
  if (!selection || typeof selection !== 'object' || Array.isArray(selection)) throw new TypeError('Research selection must be a record');
  const selected = {}, addedDependencies = [], blockedReasons = [];
  const pending = [];
  for (const key of Object.keys(selection)) if (!Object.hasOwn(groups, key)) throw new TypeError(`Unknown selection key ${key}`);
  for (const [key, group] of Object.entries(groups)) {
    const ids = selection[key] ?? [];
    if (!Array.isArray(ids) || ids.length > 500 || ids.some(id => typeof id !== 'string') || new Set(ids).size !== ids.length) throw new TypeError(`Invalid ${key}`);
    selected[key] = new Set();
    for (const id of ids) pending.push({ key, group, id, dependency: false });
  }
  while (pending.length) {
    const { key, group, id, dependency } = pending.shift();
    if (selected[key].has(id)) continue;
    const record = (state[group] ?? []).find(item => item.id === id);
    selected[key].add(id);
    if (!record) { blockedReasons.push(`Missing ${group}:${id}`); continue; }
    if (dependency) addedDependencies.push(`${group}:${id}`);
    const add = (targetKey, targetId) => {
      if (targetId) pending.push({ key: targetKey, group: groups[targetKey], id: targetId, dependency: true });
    };
    if (group === 'hypotheses') {
      for (const parent of record.parentHypothesisIds) add('hypothesisIds', parent);
      for (const evidence of [...record.supportingEvidenceIds, ...record.contradictingEvidenceIds]) add('evidenceIds', evidence);
      for (const query of record.queryPlanIds) add('queryIds', query);
    } else if (group === 'queries') add('hypothesisIds', record.hypothesisId);
    else if (group === 'modelRuns') add('queryIds', record.queryPlanId);
    else if (group === 'artifacts') {
      for (const runId of record.provenance.modelRunIds) add('modelRunIds', runId);
      for (const evidenceId of record.provenance.evidenceIds) add('evidenceIds', evidenceId);
    }
  }
  return { selection: Object.fromEntries(Object.entries(selected).map(([key, ids]) => [key, [...ids]])), addedDependencies, blockedReasons };
}

export async function prepareSelectedResearchExport(state, selection, context) {
  // Native captured runs (context.runRegistry) extend the exchange modelRuns group; a selected
  // native run automatically carries its payload artifact with verified exact bytes. Statuses
  // stay verbatim except the documented unidentifiable vocabulary translation.
  const registryRuns = context.runRegistry?.list?.() ?? [];
  const effectiveState = {
    ...state,
    modelRuns: [...(state.modelRuns ?? []), ...registryRuns.map(toForeignRun)],
  };
  const resolved = resolveResearchSelection(effectiveState, selection);
  if (resolved.blockedReasons.length) throw new RangeError(resolved.blockedReasons.join('; '));
  const records = {};
  for (const [key, group] of Object.entries(groups)) {
    const ids = new Set(resolved.selection[key]);
    records[group] = (effectiveState[group] ?? []).filter(record => ids.has(record.id));
  }
  const extraFiles = [];
  const registryById = new Map(registryRuns.map(record => [record.id, record]));
  for (const id of resolved.selection.modelRunIds) {
    const record = registryById.get(id);
    if (!record || records.artifacts.some(artifact => artifact.id === `${record.id}-artifact`)) continue;
    const descriptor = await toArtifactDescriptor(record);
    records.artifacts.push(descriptor);
    extraFiles.push({ filename: descriptor.filename, bytes: artifactBytesFor(record) });
    resolved.addedDependencies.push(`artifacts:${descriptor.id} (native run payload)`);
  }
  const bundle = exportResearchBundle(records, context);
  const files = [...(context.files ?? []).map(file => ({ filename: file.filename, bytes: new Uint8Array(file.bytes) })), ...extraFiles];
  const selectedNames = new Set(bundle.artifacts.map(artifact => artifact.filename));
  const selectedFiles = files.filter(file => selectedNames.has(file.filename));
  if (new Set(selectedFiles.map(file => file.filename)).size !== selectedFiles.length) throw new RangeError('Duplicate artifact file names');
  const verified = await verifyArtifactFiles(bundle, selectedFiles);
  if (verified.failed.length) throw new RangeError(`Artifact bytes unavailable or invalid: ${verified.failed.map(item => item.reason).join('; ')}`);
  return { bundle, files: selectedFiles, addedDependencies: resolved.addedDependencies };
}