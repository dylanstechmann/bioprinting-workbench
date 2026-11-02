import { assertAllowedKeys, text } from './validation.js';
import { CELL_TYPE_IDS, getEvidenceCatalog } from './cell-evidence.js';

export const REPAIR_RESEARCH_SCHEMA = 'bioprinting-workbench/repair-research/1';
const SPECIES = ['human', 'mouse', 'other'];
const ORIGINS = ['primary', 'pluripotent', 'derived', 'unspecified'];
const CATEGORIES = ['replication-support', 'damage-prevention', 'repair-pathway-context', 'quality-assessment'];
const OUTCOMES = ['improved-endpoint', 'adverse-endpoint', 'mixed', 'not-established'];

function strings(value, label, max = 32) {
  if (!Array.isArray(value) || value.length > max) throw new TypeError(`Invalid ${label}`);
  return value.map(v => text(v, 2000, label));
}
function humanOrigin(cellTypeId) { return ['ipsc', 'esc'].includes(cellTypeId) ? 'pluripotent' : 'primary'; }

/** Authored, species-separated cell-study systems; static reference content, never user state or a culture schedule. */
function buildSystems(evidence) {
  const systems = evidence.profiles.map(p => ({
    id: `human-${p.id}`,
    speciesId: 'human',
    speciesLabel: 'Human',
    cellTypeId: p.id,
    label: `Human — ${p.label}`,
    origin: humanOrigin(p.id),
    evidenceStatus: 'reviewed',
    claimIds: [...p.claimIds],
    timingIds: [...p.timingIds],
    limitations: ['Species separation happens at this system layer; these records describe studied cultures, not universal properties of the cell type.', 'No individual donor, cell line or laboratory is characterized.'],
  }));
  systems.push({
    id: 'mouse-esc',
    speciesId: 'mouse',
    speciesLabel: 'Mouse',
    cellTypeId: 'esc',
    label: 'Mouse — embryonic stem cells (E14Tg2A in the reviewed study)',
    origin: 'pluripotent',
    evidenceStatus: 'reviewed',
    claimIds: ['kurashima-es-culture', 'kurashima-fork-acceleration', 'kurashima-miscoordination'],
    timingIds: [],
    limitations: ['Mouse in-vitro findings are never transferred to human outcomes in this workbench.', 'No mouse timing interval is established from the reviewed source.'],
  });
  return systems;
}

/** Authored method comparisons. Human and mouse rows stay separate; adverse evidence ships beside benefit claims. */
function buildMethods() {
  return [
    {
      id: 'halliwell-nucleosides',
      label: 'Nucleoside supplementation in human PSC culture (Halliwell et al. 2020)',
      category: 'replication-support',
      cellSystemIds: ['human-ipsc', 'human-esc'],
      sourceIds: ['halliwell'],
      claimIds: ['replication-stress', 'halliwell-survival'],
      mechanismSummary: 'Exogenous nucleosides were reported to support replication in the studied human PSC cultures, reducing replication stress.',
      measuredEndpoints: ['Increased replication-fork speed and longer newly synthesized DNA fibers', 'Reduced replication origin density (longer origin-to-origin distances)', 'Reduced genome-damage markers (γH2AX) and mitotic aberrations', 'Improved survival, clonogenicity and population growth in the studied lines'],
      comparatorSummary: 'Undifferentiated human PSCs versus isogenic differentiated derivatives, with and without nucleoside supplementation, across three lines.',
      observedOutcome: 'improved-endpoint',
      timelineEvidence: 'reported-study-endpoint',
      timelineClaimIds: ['halliwell-survival'],
      unmeasuredEndpoints: ['No reversal of existing mutations, removal of mutant clones, cancer-risk reduction, transplant readiness or organ-production endpoint'],
      limitations: ['Studied human PSC lines under specific media conditions; not a universal repair treatment.', 'Adverse mouse evidence for the same intervention class ships beside this method (see the Kurashima row).'],
      operationalStatus: 'summary-only',
    },
    {
      id: 'kurashima-fork-acceleration',
      label: 'Forced fork acceleration with nucleosides in mouse ES cells (Kurashima et al. 2024) — adverse evidence',
      category: 'replication-support',
      cellSystemIds: ['mouse-esc'],
      sourceIds: ['kurashima'],
      claimIds: ['kurashima-fork-acceleration', 'kurashima-miscoordination'],
      mechanismSummary: 'Exogenous ribonucleosides were reported to accelerate replication forks and reduce active origin density; in mouse ES cells this miscoordinated replication completion from cell-cycle progression.',
      measuredEndpoints: ['Increased fork speed throughout S phase', 'Reduced active origin density', 'Premature G2/M entry before S-phase completion', 'Ultra-fine bridges increased from about 20% to about 40% of cells', 'Micronuclei increased; γH2AX increased from 6.1% to 13.1%'],
      comparatorSummary: 'Mouse ES cells with and without nucleoside supplementation; mouse embryonic fibroblasts as a non-pluripotent comparison.',
      observedOutcome: 'adverse-endpoint',
      timelineEvidence: 'not-established',
      timelineClaimIds: [],
      unmeasuredEndpoints: ['No overall growth-rate change was reported; no human, transplant or organ-production endpoint'],
      limitations: ['Mouse ES in-vitro finding; cross-species extrapolation is not performed.', 'The same commercial nucleoside stock family is referenced by the human recipe; species, cell state, concentration and conditions differ.'],
      operationalStatus: 'summary-only',
    },
    {
      id: 'bhat-media-expansion',
      label: 'Serum-free/xeno-free media comparison for human BM-MSC expansion (Bhat et al. 2021)',
      category: 'quality-assessment',
      cellSystemIds: ['human-msc'],
      sourceIds: ['bhat'],
      claimIds: ['msc-variability'],
      mechanismSummary: 'Culture-medium and seeding-density conditions were compared for yield and doubling kinetics. This is an expansion-method comparison, not a DNA-repair intervention.',
      measuredEndpoints: ['Population doubling times (P4–P5) at 1000 cells/cm²: about 46.3–59.8 h across evaluated formulations versus about 55.1 h in the control medium; about 123.4 h for the formulation that failed P5 growth', 'Cumulative population doublings (P4–P5) of about 12.1–13.4 at 1000 cells/cm²', 'The lower seeding density showed higher proliferation capacity than the higher density'],
      comparatorSummary: 'Six commercial low-serum/serum-free/xeno-free formulations against a serum-containing control medium, at 1000 and 5000 cells/cm².',
      observedOutcome: 'mixed',
      timelineEvidence: 'reported-study-endpoint',
      timelineClaimIds: ['msc-variability'],
      unmeasuredEndpoints: ['No genome-stability, mutation, transplant or organ endpoint'],
      limitations: ['Study-specific donor pool and proprietary media compositions.', 'Distinct media-specific P4–P5 endpoints are not pooled into one interval.'],
      operationalStatus: 'summary-only',
    },
  ];
}

/** Validates authored research content as strictly as imported state; never upgrades evidence or invents timing. */
export function validateRepairResearchCatalog(raw, evidence = getEvidenceCatalog()) {
  assertAllowedKeys(raw, ['schema', 'systems', 'methods', 'notice'], 'repairResearch');
  if (raw.schema !== REPAIR_RESEARCH_SCHEMA) throw new RangeError('Unsupported repair-research schema');
  text(raw.notice, 2000, 'repairResearch.notice');
  if (!Array.isArray(raw.systems) || !raw.systems.length || raw.systems.length > 128) throw new RangeError('Invalid systems');
  if (!Array.isArray(raw.methods) || !raw.methods.length || raw.methods.length > 128) throw new RangeError('Invalid methods');
  const claims = new Map(evidence.claims.map(c => [c.id, c]));
  const timings = new Map(evidence.timings.map(t => [t.id, t]));
  const systemIds = new Set();
  for (const s of raw.systems) {
    assertAllowedKeys(s, ['id', 'speciesId', 'speciesLabel', 'cellTypeId', 'label', 'origin', 'evidenceStatus', 'claimIds', 'timingIds', 'limitations'], 'system');
    const id = text(s.id, 128, 'system.id');
    if (systemIds.has(id)) throw new RangeError('Duplicate system ID');
    systemIds.add(id);
    if (!SPECIES.includes(s.speciesId)) throw new RangeError('Invalid system species');
    text(s.speciesLabel, 128, 'system.speciesLabel');
    if (!CELL_TYPE_IDS.includes(s.cellTypeId)) throw new RangeError('Unknown system cell type');
    if (!ORIGINS.includes(s.origin) || !['reviewed', 'not-established'].includes(s.evidenceStatus)) throw new RangeError('Invalid system origin/status');
    text(s.label, 2000, 'system.label');
    const claimIds = strings(s.claimIds, 'system.claimIds');
    if (s.evidenceStatus === 'reviewed' && !claimIds.length) throw new RangeError('Reviewed system needs claims');
    if (s.evidenceStatus === 'not-established' && claimIds.length) throw new RangeError('Unreviewed system cannot attach claims');
    for (const claimId of claimIds) {
      const c = claims.get(claimId);
      if (!c) throw new RangeError('Dangling system claim');
      if (c.species !== s.speciesId) throw new RangeError('System/claim species mismatch');
    }
    for (const timingId of strings(s.timingIds, 'system.timingIds')) {
      const t = timings.get(timingId);
      if (!t || t.cellTypeId !== s.cellTypeId) throw new RangeError('Dangling or mismatched system timing');
      const c = claims.get(t.claimId);
      if (!c || c.species !== s.speciesId) throw new RangeError('Timing claim species mismatch');
    }
    strings(s.limitations, 'system.limitations');
  }
  const methodIds = new Set(), sources = new Set(evidence.sources.map(s => s.id));
  for (const m of raw.methods) {
    assertAllowedKeys(m, ['id', 'label', 'category', 'cellSystemIds', 'sourceIds', 'claimIds', 'mechanismSummary', 'measuredEndpoints', 'comparatorSummary', 'observedOutcome', 'timelineEvidence', 'timelineClaimIds', 'unmeasuredEndpoints', 'limitations', 'operationalStatus'], 'method');
    const id = text(m.id, 128, 'method.id');
    if (methodIds.has(id)) throw new RangeError('Duplicate method ID');
    methodIds.add(id);
    if (!CATEGORIES.includes(m.category) || !OUTCOMES.includes(m.observedOutcome) || m.operationalStatus !== 'summary-only') throw new RangeError('Invalid method classification');
    text(m.label, 2000, 'method.label');
    const cellSystemIds = strings(m.cellSystemIds, 'method.cellSystemIds');
    if (!cellSystemIds.length || cellSystemIds.some(sid => !systemIds.has(sid))) throw new RangeError('Dangling method system');
    const sourceIds = strings(m.sourceIds, 'method.sourceIds');
    if (!sourceIds.length || sourceIds.some(sid => !sources.has(sid))) throw new RangeError('Dangling method source');
    const systemClaims = new Set(cellSystemIds.flatMap(sid => raw.systems.find(s => s.id === sid).claimIds));
    const claimIds = strings(m.claimIds, 'method.claimIds');
    if (!claimIds.length) throw new RangeError('Method needs claims');
    for (const claimId of claimIds) {
      const c = claims.get(claimId);
      if (!c) throw new RangeError('Dangling method claim');
      if (!systemClaims.has(claimId)) throw new RangeError('Method claim not attached to its systems');
      if (!sourceIds.includes(c.sourceId)) throw new RangeError('Method source missing for claim');
    }
    for (const field of ['mechanismSummary', 'comparatorSummary']) text(m[field], 2000, `method.${field}`);
    strings(m.measuredEndpoints, 'method.measuredEndpoints');
    strings(m.unmeasuredEndpoints, 'method.unmeasuredEndpoints');
    strings(m.limitations, 'method.limitations');
    if (!['not-established', 'reported-study-endpoint'].includes(m.timelineEvidence)) throw new RangeError('Invalid timeline evidence');
    const timelineClaimIds = strings(m.timelineClaimIds, 'method.timelineClaimIds');
    if (m.timelineEvidence === 'reported-study-endpoint') {
      if (!timelineClaimIds.length) throw new RangeError('Reported timeline endpoints need claims');
      for (const claimId of timelineClaimIds) { if (!claims.has(claimId) || !systemClaims.has(claimId)) throw new RangeError('Dangling timeline claim'); }
    } else if (timelineClaimIds.length) throw new RangeError('Timeline claims require reported-study-endpoint');
  }
  return structuredClone(raw);
}

const catalog = validateRepairResearchCatalog({
  schema: REPAIR_RESEARCH_SCHEMA,
  systems: buildSystems(getEvidenceCatalog()),
  methods: buildMethods(),
  notice: 'Species-separated research reference. Human and mouse findings are shown side by side without averaging, cross-species transfer or claims of contradiction. No efficacy percentage, safe-method certification, validated timeline acceleration or organ-production forecast is implied by any row.',
});
export function getRepairResearchCatalog() { return structuredClone(catalog); }
export function getCellSystems({ speciesId = null, cellTypeId = null } = {}) {
  if (speciesId !== null && !SPECIES.includes(speciesId)) throw new RangeError('Unknown species');
  if (cellTypeId !== null && !CELL_TYPE_IDS.includes(cellTypeId)) throw new RangeError('Unknown cell type');
  return structuredClone(catalog.systems.filter(s => (speciesId === null || s.speciesId === speciesId) && (cellTypeId === null || s.cellTypeId === cellTypeId)));
}
export function getMethodsForCellSystem(systemId) { return structuredClone(catalog.methods.filter(m => m.cellSystemIds.includes(systemId))); }
export function getCellSystemEvidence(systemId) {
  const system = catalog.systems.find(s => s.id === systemId);
  if (!system) throw new RangeError('Unknown cell system');
  const evidence = getEvidenceCatalog();
  return { system: structuredClone(system), claims: structuredClone(system.claimIds.map(id => evidence.claims.find(c => c.id === id))), timings: structuredClone(system.timingIds.map(id => evidence.timings.find(t => t.id === id))) };
}
export function defaultCellSystemId(cellTypeId) { if (!CELL_TYPE_IDS.includes(cellTypeId)) throw new RangeError('Unknown cell type'); return `human-${cellTypeId}`; }
export function validateCellSystemSelection(cellTypeId, systemId) {
  if (!CELL_TYPE_IDS.includes(cellTypeId)) throw new RangeError('Unknown cell type');
  const system = catalog.systems.find(s => s.id === systemId);
  if (!system || system.cellTypeId !== cellTypeId) throw new RangeError('Cell system does not match the selected cell type');
  return systemId;
}
export function validateMethodSelection(systemId, methodId) {
  if (!catalog.systems.some(s => s.id === systemId)) throw new RangeError('Unknown cell system');
  if (methodId === null) return null;
  const method = catalog.methods.find(m => m.id === methodId);
  if (!method || !method.cellSystemIds.includes(systemId)) throw new RangeError('Method does not apply to the selected cell system');
  return methodId;
}