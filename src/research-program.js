import { assertAllowedKeys, text } from './validation.js';
import { getEvidenceCatalog } from './cell-evidence.js';
import { getAgingEvidenceCatalog } from './aging-evidence.js';
import { getApplicationsEvidenceCatalog } from './applications-evidence.js';
import { getGeroscienceEvidenceCatalog } from './geroscience-evidence.js';

/** Study-planning simulation only: a literature-anchored program node catalog plus BUILD/STACK/INFER — selection, dependency closure and first-order inferences. Never a funded program, protocol, timeline or treatment advice. */
export const PROGRAM_LAYERS = ['aging-mechanism', 'printing-capability', 'measurement'];
export const PROGRAM_TIERS = ['human-measured', 'mouse-measured', 'animal-or-in-vitro', 'review-supported', 'theory'];
const PROGRAM_NODES = [
  { id: 'hallmark-mapping', label: 'Hallmark mapping (the hypothesis space)', layer: 'aging-mechanism', tier: 'review-supported', anchorClaimIds: ['aging-nine-hallmarks-2013', 'aging-twelve-hallmarks-2023'], adverseClaimIds: [], openQuestions: ['Which hallmark interactions dominate which tissue outcomes, given the reviews describe interconnected hallmarks rather than independent levers?'], inference: 'Inference (theory): hallmarks are a hypothesis map, not an intervention list; a program question must name the measurable endpoint it would move.', dependencyIds: [] },
  { id: 'aging-biomarkers', label: 'Aging biomarkers (methylation clocks)', layer: 'measurement', tier: 'human-measured', anchorClaimIds: ['methylation-age-clock'], adverseClaimIds: ['methylation-age-clock'], openQuestions: ['Is a methylation-clock reading causal, or a correlational readout — and which health endpoint does a clock change actually proxy?'], inference: 'Inference (theory): an intervention can move a clock reading without moving healthspan; clocks support narrower questions, not every outcome domain — the regen-workbench program method keeps outcome domains separate.', dependencyIds: [] },
  { id: 'senescent-burden-clearance', label: 'Senescent-cell burden clearance (senolytics)', layer: 'aging-mechanism', tier: 'review-supported', anchorClaimIds: ['senolytics-translation-limits'], adverseClaimIds: ['senolytics-translation-limits'], openQuestions: ['Which senescent populations in aged human tissue are net-harmful, given the reviewed risk of targeting beneficial senescent cells and the absence of validated trial designs?'], inference: 'Inference (theory): clearing cells that look senescent is only as good as the specificity of the target list; the adverse anchor is the constraint, not a dosing guide.', dependencyIds: ['aging-biomarkers'] },
  { id: 'mtor-pathway-modulation', label: 'mTOR-pathway modulation (rapamycin-class)', layer: 'aging-mechanism', tier: 'mouse-measured', anchorClaimIds: ['rapamycin-lifespan-mice'], adverseClaimIds: ['rapamycin-lifespan-mice'], openQuestions: ['Does murine lifespan extension translate to human healthspan, when even the mouse abstract leaves open postponing cancer versus retarding aging?'], inference: 'Inference (theory): the measured anchor is mouse lifespan, not human benefit; any human claim in a program built here is a hypothesis to test, never a conclusion.', dependencyIds: ['aging-biomarkers'] },
  { id: 'nad-precursor-restoration', label: 'NAD+ precursor restoration', layer: 'aging-mechanism', tier: 'review-supported', anchorClaimIds: ['nad-precursor-limits'], adverseClaimIds: ['nad-precursor-limits'], openQuestions: ['Do precursor-driven tissue NAD+ changes translate to function in humans, given the reviewed pharmacokinetic instability and tissue-specific bioavailability?'], inference: 'Inference (theory): mechanism plausibility from experimental studies is not human efficacy; the review itself names the translation limits a program must design around.', dependencyIds: ['aging-biomarkers'] },
  { id: 'partial-reprogramming', label: 'Partial reprogramming (cyclic OSKM-class)', layer: 'aging-mechanism', tier: 'mouse-measured', anchorClaimIds: ['reprogramming-in-vivo-mouse'], adverseClaimIds: ['reprogramming-in-vitro-age'], openQuestions: ['Can identity-preserving cyclic dosing improve hallmarks in humans, when the only reviewed in-vivo amelioration is mouse and full reprogramming erases cell identity?'], inference: 'Inference (theory): the leap from mouse amelioration to human treatment is exactly the open question; a program that assumed it would be assuming its conclusion.', dependencyIds: ['aging-biomarkers'] },
  { id: 'systemic-youth-factors', label: 'Systemic youthful factors (parabiosis-derived)', layer: 'aging-mechanism', tier: 'mouse-measured', anchorClaimIds: ['parabiosis-systemic-factors'], adverseClaimIds: ['parabiosis-systemic-factors'], openQuestions: ['Which circulating factors mediate the reviewed mouse rejuvenation, and do they exist with comparable roles in human plasma?'], inference: 'Inference (theory): a surgical mouse experiment is a clue, not a method; no human blood-product use is reviewed here.', dependencyIds: ['aging-biomarkers'] },
  { id: 'genome-stability-gate', label: 'Genome-stability gate (variant-selection control)', layer: 'printing-capability', tier: 'human-measured', anchorClaimIds: ['culture-selection'], adverseClaimIds: ['culture-selection', 'kurashima-fork-acceleration'], openQuestions: ['How would a cell-supply program detect and prevent TP53-mutant expansion during extended culture, given the reviewed hESC evidence?'], inference: 'Inference (theory): the excluded lever of the expansion module lives here as a gate — pushing growth is easy, keeping the culture honest is the research problem.', dependencyIds: [] },
  { id: 'stem-cell-supply', label: 'Stem-cell supply (expansion without selection pressure)', layer: 'printing-capability', tier: 'human-measured', anchorClaimIds: ['halliwell-survival', 'msc-variability', 'pluripotent-cycle'], adverseClaimIds: ['fibroblast-senescence', 'kurashima-miscoordination'], openQuestions: ['Can the cell numbers a tissue program needs be produced without transformed-variant selection or senescence limits, under media and passage constraints measured only per study?'], inference: 'Inference (theory): expansion yields are study-specific, not universal; a program must plan its own growth-QC rather than inherit a schedule.', dependencyIds: ['genome-stability-gate'] },
  { id: 'vascularized-volume-printing', label: 'Vascularized-volume printing (human-scale constructs)', layer: 'printing-capability', tier: 'animal-or-in-vitro', anchorClaimIds: ['itop-human-scale-constructs', 'printed-adipose-neovessels'], adverseClaimIds: ['printed-adipose-neovessels'], openQuestions: ['Can printed human-scale volumes vascularize and survive in vivo in humans, when the reviewed anchors are preclinical constructs and animal grafts?'], inference: 'Inference (theory): printing a shape is demonstrated; printing a living perfused volume that integrates in a human is the open capability.', dependencyIds: ['stem-cell-supply'] },
  { id: 'functional-tissue-verification', label: 'Functional-tissue verification (what says it works)', layer: 'printing-capability', tier: 'human-measured', anchorClaimIds: ['diep-flap-profile'], adverseClaimIds: ['diep-flap-profile'], openQuestions: ['Which endpoint counts as function for a printed tissue, and over what durability window — given the flap literature shows even native vascularized tissue carries measurable complication rates?'], inference: 'Inference (theory): verification is a designed test battery, not a single assay; identity, function and durability are separate outcome domains.', dependencyIds: ['vascularized-volume-printing'] },
  { id: 'host-integration', label: 'Host integration (implantation, immunity, durability)', layer: 'printing-capability', tier: 'theory', anchorClaimIds: ['diep-flap-profile'], adverseClaimIds: [], openQuestions: ['What immunologic and wound-healing responses would a printed graft face in a human host, and no reviewed source establishes any?'], inference: 'Inference (theory): this is the least-anchored node of the framework — the honest program places it last, after the measured capabilities it depends on.', dependencyIds: ['functional-tissue-verification'] },
  { id: 'organ-chip-testing', label: 'Organ-chip and printed-model testing (drug endpoints)', layer: 'measurement', tier: 'review-supported', anchorClaimIds: ['body-on-chip-drug-testing', 'printed-mature-adipocytes'], adverseClaimIds: [], openQuestions: ['Can fluidically linked printed organ models predict human toxicity well enough to change preclinical decisions, per the reviewed platform goals?'], inference: 'Inference (theory): this is the nearest-term use of printing — measurement models — because it needs reproducibility, not lifelong function in a body.', dependencyIds: [] },
];
const NOTICES = [
  'Study-planning simulation only: this is a personal learning program design, not a funded program, protocol, timeline or advice.',
  'BUILD = selecting nodes; STACK = the dependency closure that names prerequisites; INFER = first-order theory statements anchored to the tier of their evidence. Stacking is dependency ordering, never effect multiplication.',
  'Species separation holds everywhere: mouse-measured and review-supported anchors never become human outcomes; theory-tier nodes are hypotheses to test, not findings.',
  'Aligned with the regen-workbench research desk method (read-only companion): question, alternatives, data eligibility, frozen plan, runs, review — with identity, viability, genome stability, adverse findings, function and durability kept as separate outcome domains.',
  'Nothing here recommends, doses or directs anything at any person or animal; no youth score is computed.',
];
export function defaultResearchProgram() { return { selectedNodeIds: [] }; }
export function validateResearchProgram(raw) {
  assertAllowedKeys(raw, ['selectedNodeIds'], 'researchProgram');
  const ids = raw.selectedNodeIds;
  if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) throw new TypeError('Invalid research-program selection');
  if (new Set(ids).size !== ids.length) throw new RangeError('Duplicate research-program selection');
  const known = new Set(PROGRAM_NODES.map(n => n.id));
  if (ids.some(id => !known.has(id))) throw new RangeError('Unknown research-program node selection');
  return { selectedNodeIds: [...ids] };
}
export function getProgramNodes() { return structuredClone(PROGRAM_NODES); }
export function validateProgramNodes(nodes) {
  if (!Array.isArray(nodes) || !nodes.length || nodes.length > 32) throw new RangeError('Invalid program node list');
  const claims = new Map([...getEvidenceCatalog().claims, ...getAgingEvidenceCatalog().claims, ...getApplicationsEvidenceCatalog().claims, ...getGeroscienceEvidenceCatalog().claims].map(c => [c.id, c]));
  const ids = new Set();
  for (const n of nodes) {
    assertAllowedKeys(n, ['id','label','layer','tier','anchorClaimIds','adverseClaimIds','openQuestions','inference','dependencyIds']);
    const id = text(n.id, 128, 'id'); if (ids.has(id)) throw new RangeError('Duplicate program node ID'); ids.add(id);
    text(n.label, 2000, 'label'); text(n.inference, 2000, 'inference');
    if (!PROGRAM_LAYERS.includes(n.layer)) throw new RangeError('Unknown program layer');
    if (!PROGRAM_TIERS.includes(n.tier)) throw new RangeError('Unknown program tier');
    for (const key of ['anchorClaimIds', 'adverseClaimIds']) {
      if (!Array.isArray(n[key]) || (key === 'anchorClaimIds' && !n[key].length) || n[key].some(claimId => !claims.has(claimId))) throw new RangeError(`Dangling program ${key}`);
    }
    if (['human-measured', 'mouse-measured'].includes(n.tier) && !n.adverseClaimIds.length) throw new RangeError('Findings-based program nodes carry adverse evidence');
    if (!Array.isArray(n.openQuestions) || !n.openQuestions.length || n.openQuestions.length > 16) throw new RangeError('Program nodes need open questions');
    n.openQuestions.forEach(q => text(q, 2000, 'openQuestions'));
    if (!Array.isArray(n.dependencyIds) || new Set(n.dependencyIds).size !== n.dependencyIds.length) throw new RangeError('Invalid program dependencies');
  }
  const byId = new Map(nodes.map(n => [n.id, n]));
  const visited = new Set(), visiting = new Set();
  function visit(id) {
    if (!ids.has(id)) throw new RangeError('Dangling program dependency');
    if (visiting.has(id)) throw new RangeError('Cyclic program dependencies');
    if (visited.has(id)) return;
    visiting.add(id); byId.get(id).dependencyIds.forEach(visit); visiting.delete(id); visited.add(id);
  }
  nodes.forEach(n => visit(n.id));
  for (const layer of PROGRAM_LAYERS) if (!nodes.some(n => n.layer === layer)) throw new RangeError(`Missing ${layer} layer`);
  return structuredClone(nodes);
}
const TIER_RANK = new Map(PROGRAM_TIERS.map((t, i) => [t, i]));
export function evaluateResearchProgram(settings) {
  const parsed = validateResearchProgram(settings);
  const result = { status: 'unconfigured', assumptionOrigin: 'user-hypothetical-simulation', selected: [], prerequisites: [], programFloor: null, openQuestions: [], inferences: [], notices: NOTICES };
  if (!parsed.selectedNodeIds.length) return result;
  result.status = 'designed';
  const byId = new Map(PROGRAM_NODES.map(n => [n.id, n]));
  const closure = new Map();
  function close(id) {
    if (closure.has(id)) return;
    closure.set(id, null);
    for (const dep of byId.get(id).dependencyIds) close(dep);
  }
  for (const id of parsed.selectedNodeIds) close(id);
  for (const id of parsed.selectedNodeIds) {
    const n = byId.get(id);
    result.selected.push({ id, label: n.label, tier: n.tier, relation: 'selected' });
  }
  for (const id of closure.keys()) {
    if (parsed.selectedNodeIds.includes(id)) continue;
    const n = byId.get(id);
    const requiredBy = [...closure.keys()].filter(other => byId.get(other).dependencyIds.includes(id));
    result.prerequisites.push({ id, label: n.label, tier: n.tier, relation: 'prerequisite', requiredBy });
  }
  let floor = 0;
  for (const id of closure.keys()) floor = Math.max(floor, TIER_RANK.get(byId.get(id).tier));
  result.programFloor = PROGRAM_TIERS[floor];
  for (const id of closure.keys()) {
    const n = byId.get(id);
    for (const question of n.openQuestions) result.openQuestions.push({ id, question });
    result.inferences.push({ id, inference: n.inference });
  }
  return result;
}
const validatedNodes = validateProgramNodes(PROGRAM_NODES);
