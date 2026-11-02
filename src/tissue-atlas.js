import { assertAllowedKeys, text } from './validation.js';
import { getEvidenceCatalog } from './cell-evidence.js';
import { getAgingEvidenceCatalog } from './aging-evidence.js';
import { getApplicationsEvidenceCatalog } from './applications-evidence.js';
import { getGeroscienceEvidenceCatalog } from './geroscience-evidence.js';
import { getTissueEvidenceCatalog } from './tissue-evidence.js';

/** Frontier-target atlas: which tissues the field is actually trying to print, at what evidence tier, with which barriers. Simulation-labeled teaching catalog; never a clinical claim. */
export const ATLAS_REGIONS = ['dental', 'pulmonary', 'dermal', 'neural', 'muscular'];
export const ATLAS_STATUSES = ['review-stage', 'in-vitro', 'preclinical', 'aspiration'];
const TISSUE_TARGETS = [
  { id: 'lung-alveoli', label: 'Lung alveoli (the gas-exchange wish)', region: 'pulmonary', status: 'review-stage', anchorClaimIds: ['lung-models-not-organs'], adverseClaimIds: [], barriers: ['Thin gas-exchange membrane with blood on one side and air on the other, co-patterned at alveolar scale.', 'No reviewed construct exchanges gas like living alveoli in vivo.'], openQuestion: 'Can any printed construct move oxygen and carbon dioxide like alveoli inside a living body? No reviewed source shows it.', relatedIds: { programNode: 'vascularized-volume-printing' } },
  { id: 'gingiva', label: 'Gingiva (gums: the seal and the smile)', region: 'dental', status: 'in-vitro', anchorClaimIds: ['gingival-fibroblast-bioconstructs', 'prevascularized-gingival-hydrogels'], adverseClaimIds: ['gingival-fibroblast-bioconstructs'], barriers: ['Epithelial seal against a tooth, under chewing loads and bacteria.', 'Vascularization and host anastomosis — the pre-networks are 14-day in-vitro facts, not grafts.', 'Trial-level honesty is catalogued in the regen-workbench dental track (companion, read-only): small trials, no proven oriented attachment.'], openQuestion: 'Can a printed gingival substitute seal, vascularize and persist in a human mouth? Not reviewed.', relatedIds: { programNode: 'host-integration' } },
  { id: 'periodontal-complex', label: 'Periodontal complex (bone, ligament, cementum as one unit)', region: 'dental', status: 'preclinical', anchorClaimIds: ['pdlsc-laden-collagen', 'alveolar-pdl-cementum-scaffolds'], adverseClaimIds: ['pdlsc-laden-collagen'], barriers: ['Oriented ligament fibers inserting into cementum and bone under load.', 'Three different tissues with one interface each — the hardest kind of regenerative target.', 'Reviewed evidence is mouse subcutaneous biocompatibility and scaffold reviews.'], openQuestion: 'Can the bone-ligament-cementum attachment be regenerated, not just filled? No human result is reviewed.', relatedIds: {} },
  { id: 'tooth-pulp-dentin', label: 'Tooth pulp-dentin complex (and the whole-tooth horizon)', region: 'dental', status: 'review-stage', anchorClaimIds: ['dental-pulp-printing-preclinical'], adverseClaimIds: ['dental-pulp-printing-preclinical'], barriers: ['All 13 reviewed studies are preclinical (2018–2026); extrusion and GelMA dominate, humans have none.', 'Whole-tooth crown and root form remains beyond any reviewed printing approach.'], openQuestion: 'Can bioprinting support living pulp-dentin regeneration in a human tooth, let alone print a whole tooth? Not reviewed.', relatedIds: {} },
  { id: 'facial-deep-collagen', label: 'Facial and deep dermal collagen (cosmetic and functional youthfulness)', region: 'dermal', status: 'review-stage', anchorClaimIds: ['vascularized-skin-analogs', 'skin-bioprinting-status'], adverseClaimIds: ['skin-bioprinting-status'], barriers: ['Deep dermis with vascular networks, fat and fascia layers — not a surface sheet.', 'Perfused, vascularized skin substitutes remain the barrier both reviews name.', 'Durability and integration in an aging face are unmodeled anywhere.'], openQuestion: 'Can printed deep-dermis equivalents vascularize and persist in a human face? No reviewed result.', relatedIds: { applications: 'skin-wound-printing' } },
  { id: 'peripheral-nerve', label: 'Peripheral nerve (regrowth, not just conduits)', region: 'neural', status: 'review-stage', anchorClaimIds: ['silk-nerve-scaffolds'], adverseClaimIds: ['silk-nerve-scaffolds'], barriers: ['Axon guidance across long gaps with Schwann-cell support.', 'Functional recovery endpoints — reviews of scaffolds do not establish restored human function.'], openQuestion: 'Can a printed nerve scaffold restore function after injury in humans? Not reviewed.', relatedIds: {} },
  { id: 'skeletal-muscle', label: 'Skeletal muscle (aligned, vascularized, innervated)', region: 'muscular', status: 'in-vitro', anchorClaimIds: ['aligned-vascularized-muscle'], adverseClaimIds: ['aligned-vascularized-muscle'], barriers: ['Innervation — a printed muscle needs motor neurons to fire it.', 'Vascular integration and force transmission at human scale remain unreviewed.'], openQuestion: 'Can coaxial-printed aligned muscle grafts integrate, vascularize and produce force in vivo? In-vitro only so far.', relatedIds: { programNode: 'vascularized-volume-printing' } },
  { id: 'elite-muscle-architecture', label: 'Elite-athlete muscle architecture (the honest ceiling of the wish)', region: 'muscular', status: 'aspiration', anchorClaimIds: ['myonuclei-are-measurable'], adverseClaimIds: [], barriers: ['Myonuclear number, position and three-dimensional orientation are measurable in human fibers — and no reviewed method produces them.', 'Fascicle pennation and the woven connective architecture of elite lifters are descriptive anatomy, not a printing spec.'], openQuestion: 'Could a program ever print elite myonuclei density and pennation? Nothing reviewed here even approaches it — this entry exists to say so honestly.', aspirationNote: 'Aspiration entry, shown and never selectable: measuring elite architecture is real; creating it by printing is not reviewed anywhere and is treated as theory at the honest edge of the map.', relatedIds: {} },
  { id: 'breast-soft-tissue-bridge', label: 'Breast soft tissue (covered by the applications ledger)', region: 'dermal', status: 'review-stage', anchorClaimIds: ['printed-adipose-neovessels', 'printed-mature-adipocytes'], adverseClaimIds: ['printed-adipose-neovessels'], barriers: ['Catalogued in the applications module rather than duplicated here.'], openQuestion: 'Open the applications ledger for the honest breast-printing status; this entry is a cross-reference, not a second copy.', relatedIds: { applications: 'breast-soft-tissue' } },
];
const GENOME_RESTORE_IDEA = {
  id: 'genome-backup-restore',
  label: 'Genome backup and restore (the owner idea, assessed honestly)',
  steps: [
    { id: 'digital-backup', label: 'Record the original genome digitally (SSD/HDD)', verdict: 'real-today', anchorClaimIds: [], note: 'Sequencing a genome and storing it on a computer is ordinary computing; the stored string is real and durable. The catch: there is no write-path from the SSD back into living chromatin — storage solves nothing by itself.' },
    { id: 'organic-reserve', label: 'Keep original cells stored organically', verdict: 'real-today', anchorClaimIds: [], note: 'Cell banking exists and works for some cell types; the honest limits are that reserves also age, drift and lose viability, and banking is best-established for early-passage and stem-like cells, not whole tissues.' },
    { id: 'periodic-write-back', label: 'Fetch the stored DNA periodically and put it back into dividing cells', verdict: 'theory', anchorClaimIds: ['lineage-preserving-reprogramming-checklist', 'transient-nonintegrating-reprogramming'], note: 'The unsolved step. Editing is locus-by-locus, not wholesale; the companion base-editing-evidence repo (read-only, snapshot-pinned in docs/base-editing-snapshot.json) documents measured conditional editing and intended-only coverage far below whole-tissue repair. Somatic mosaicism means there is no single original to restore; delivery to most cells of a living tissue is unsolved; and nothing reviewed writes a pristine genome back into dividing cells.' },
    { id: 'differentiation-editing', label: 'Use DNA editing to steer differentiation', verdict: 'theory', anchorClaimIds: ['reprogramming-in-vivo-mouse', 'reprogramming-in-vitro-age'], note: 'Editing is not a differentiation program. Yamanaka-class partial reprogramming resets epigenetic age in mouse and in-vitro systems — the reviewed anchors — and lineage-preserving schedules with delivery and safety checklists are the honest research direction, not a procedure. No human application is reviewed as established.' },
  ],
  notices: [
    'Ideas-desk assessment only: nothing here is a procedure, protocol, dosing schedule or recommendation, and nothing was performed.',
    'The two real-today steps are real; the two theory steps name their unsolved parts plainly: whole-genome write-back and edit-directed differentiation are open research questions.',
    'Species separation holds: mouse and in-vitro reprogramming findings never become human outcomes.',
  ],
};
const MYONUCLEAR_MEMORY_IDEA = {
  id: 'myonuclear-memory',
  label: 'Myonuclear muscle memory (the elite-lifter question, assessed honestly)',
  steps: [
    { id: 'overload-adds-nuclei', label: 'Overload exercise adds myonuclei before major size gain', verdict: 'measured-in-mice', anchorClaimIds: ['myonuclei-retained-through-atrophy'], note: 'In-vivo imaging in mouse muscle shows new myonuclei arrive before any major increase in size during overload - the nuclei are the first responders, not the after-effect.' },
    { id: 'nuclei-survive-atrophy', label: 'Acquired myonuclei survive detraining and severe atrophy', verdict: 'measured-in-mice', anchorClaimIds: ['myonuclei-retained-through-atrophy'], note: 'The same imaging shows old and newly acquired nuclei retained through denervation-driven atrophy lasting a considerable period of the animal lifespan, protected from the apoptosis of inactive muscle. A local memory mechanism in the tissue itself - in mice.' },
    { id: 'print-elite-architecture', label: 'Print or edit elite myonuclear architecture into new muscle', verdict: 'theory', anchorClaimIds: ['myonuclei-are-measurable'], note: 'Measuring myonuclear number, position and orientation in human fibers is real; nothing reviewed produces or edits that architecture, and no reviewed source transfers the mouse retention finding into a human guarantee. This is the honest ceiling of the elite-athlete wish - the same ceiling the aspiration entry states.' },
  ],
  notices: [
    'Ideas-desk assessment only: no training advice, no procedure, nothing performed, and the mouse findings never become human outcomes.',
    'Species separation holds: the retention evidence is mouse in-vivo imaging; the human transfer stays theory until something reviewed says otherwise.',
  ],
};
const NOTICES = [
  'Simulation-labeled teaching atlas: tiers describe the strength of reviewed evidence for each target, never a clinical readiness claim.',
  'In-vitro and preclinical findings never become human outcomes; the aspiration entry is rendered and never selectable.',
  'The dental entries cite the regen-workbench dental track (read-only companion) for trial-level honesty; this atlas adds printing-focused evidence on top.',
];
export function defaultTissueAtlas() { return { selectedTargetIds: [] }; }
export function getMyonuclearMemoryIdea() { return structuredClone(MYONUCLEAR_MEMORY_IDEA); }
export function getIdeasDesk() { return [getGenomeRestoreIdea(), structuredClone(MYONUCLEAR_MEMORY_IDEA)]; }
export function validateTissueAtlas(raw) {
  assertAllowedKeys(raw, ['selectedTargetIds'], 'tissueAtlas');
  const ids = raw.selectedTargetIds;
  if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) throw new TypeError('Invalid tissue-atlas selection');
  if (new Set(ids).size !== ids.length) throw new RangeError('Duplicate tissue-atlas selection');
  const byId = new Map(TISSUE_TARGETS.map(t => [t.id, t]));
  for (const id of ids) {
    if (!byId.has(id)) throw new RangeError('Unknown tissue-atlas target');
    if (byId.get(id).status === 'aspiration') throw new RangeError('Aspiration entries are never selectable');
  }
  return { selectedTargetIds: [...ids] };
}
export function getTissueTargets() { return structuredClone(TISSUE_TARGETS); }
export function getGenomeRestoreIdea() { return structuredClone(GENOME_RESTORE_IDEA); }
export function validateTissueTargets(targets) {
  if (!Array.isArray(targets) || !targets.length || targets.length > 32) throw new RangeError('Invalid atlas target list');
  const claims = new Map([...getEvidenceCatalog().claims, ...getAgingEvidenceCatalog().claims, ...getApplicationsEvidenceCatalog().claims, ...getGeroscienceEvidenceCatalog().claims, ...getTissueEvidenceCatalog().claims].map(c => [c.id, c]));
  const ids = new Set();
  for (const t of targets) {
    assertAllowedKeys(t, ['id','label','region','status','anchorClaimIds','adverseClaimIds','barriers','openQuestion','relatedIds','aspirationNote']);
    const id = text(t.id, 128, 'id'); if (ids.has(id)) throw new RangeError('Duplicate atlas target ID'); ids.add(id);
    text(t.label, 2000, 'label'); text(t.openQuestion, 2000, 'openQuestion');
    if (!ATLAS_REGIONS.includes(t.region)) throw new RangeError('Unknown atlas region');
    if (!ATLAS_STATUSES.includes(t.status)) throw new RangeError('Unknown atlas status');
    for (const key of ['anchorClaimIds', 'adverseClaimIds']) {
      if (!Array.isArray(t[key]) || (key === 'anchorClaimIds' && !t[key].length) || t[key].some(claimId => !claims.has(claimId))) throw new RangeError(`Dangling atlas ${key}`);
    }
    if (['in-vitro', 'preclinical'].includes(t.status) && !t.adverseClaimIds.length) throw new RangeError('Findings-based atlas targets carry adverse evidence');
    if (!Array.isArray(t.barriers) || !t.barriers.length || t.barriers.length > 8) throw new RangeError('Atlas targets need barriers');
    t.barriers.forEach(b => text(b, 2000, 'barriers'));
    assertAllowedKeys(t.relatedIds, [], 'relatedIds');
    for (const key of Object.keys(t.relatedIds)) throw new RangeError('relatedIds must be empty until cross-module references validate');
  }
  for (const region of ATLAS_REGIONS) if (!targets.some(t => t.region === region)) throw new RangeError(`Missing ${region} targets`);
  if (!targets.some(t => t.status === 'aspiration')) throw new RangeError('Atlas needs its honesty entry');
  return structuredClone(targets);
}
const validatedTargets = validateTissueTargets(TISSUE_TARGETS.map(t => ({ ...t, relatedIds: {} })));
export function evaluateTissueAtlas(settings) {
  const parsed = validateTissueAtlas(settings);
  const result = { status: 'unconfigured', assumptionOrigin: 'user-hypothetical-simulation', selected: [], summary: null, notices: NOTICES };
  if (!parsed.selectedTargetIds.length) return result;
  result.status = 'explored';
  const byId = new Map(TISSUE_TARGETS.map(t => [t.id, t]));
  result.selected = parsed.selectedTargetIds.map(id => {
    const t = byId.get(id);
    return { id: t.id, label: t.label, region: t.region, status: t.status, barriers: t.barriers, openQuestion: t.openQuestion };
  });
  const statuses = result.selected.map(s => s.status);
  result.summary = `Atlas view: ${result.selected.length} target(s). Strongest tier reached: ${statuses.includes('preclinical') ? 'preclinical (animal or implanted models)' : statuses.includes('in-vitro') ? 'in-vitro constructs' : 'review-stage mapping'}. No reviewed target includes a human printed-tissue result, and this summary never upgrades one.`;
  return result;
}
