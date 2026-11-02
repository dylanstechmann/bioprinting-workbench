import { assertAllowedKeys, finite, text } from './validation.js';
import { getEvidenceCatalog } from './cell-evidence.js';
import { getAgingEvidenceCatalog } from './aging-evidence.js';

/** Simulation theory only: a barrier catalog anchored to reviewed claims plus transparent ceiling/logistics arithmetic on user-hypothetical inputs. Never a measured timeline, longevity prediction, life-extension protocol or eternal-youth claim. */
const CATEGORIES = ['ceiling', 'state-of-printing', 'systemic', 'levers', 'cell-intrinsic', 'excluded'];
const BARRIERS = [
  { id: 'single-organ-ceiling', label: 'Single-organ failure ceiling (mortality decomposition)', category: 'ceiling', selectable: true, anchorClaimIds: ['aging-nine-hallmarks-2013'], adverseClaimIds: [], measuredSummary: 'No reviewed source pools cause-of-death fractions for this teaching model; the reviewed aging literature describes aging as the primary risk factor for major human pathologies across many systems. You set the addressable fraction as a hypothesis.', theoryNote: 'Arithmetic, not medicine: replacing one organ can at best address deaths from that organ failing. The fraction you set is an absolute ceiling, never a forecast or a life-extension estimate.' },
  { id: 'no-printed-solid-organ', label: 'No printed solid organ in a living human (state of the field)', category: 'state-of-printing', selectable: true, anchorClaimIds: [], adverseClaimIds: [], measuredSummary: 'In the reviewed printing literature, printed thick vascularized tissues were demonstrated in vitro with perfusion over weeks (the storyboard citations); no reviewed source demonstrates a fully bioprinted solid organ transplanted into a living human with long-term function.', theoryNote: 'Theory: the ceiling arithmetic assumes an organ-printing capability that does not exist in the reviewed human literature; every number stays hypothetical until that changes.' },
  { id: 'systemic-aging-environment', label: 'Systemic, interconnected aging (organ replacement resets nothing)', category: 'systemic', selectable: true, anchorClaimIds: ['aging-twelve-hallmarks-2023', 'parabiosis-systemic-factors'], adverseClaimIds: [], measuredSummary: 'The 2023 review describes twelve aging hallmarks that are interconnected with each other and with the hallmarks of health; mouse heterochronic parabiosis showed aged progenitor behavior can be modulated by systemic factors (mouse-only).', theoryNote: 'Theory: a printed organ is inserted into an aged systemic environment. Interconnected hallmarks mean replacing parts does not reset the rest; the mouse parabiosis result is not a human rejuvenation method.' },
  { id: 'partial-reprogramming-lever', label: 'Partial reprogramming lever (mouse-only anchor)', category: 'levers', selectable: true, anchorClaimIds: ['reprogramming-in-vivo-mouse'], adverseClaimIds: ['reprogramming-in-vitro-age'], measuredSummary: 'Mouse only: short-term cyclic OSKM ameliorated cellular and physiological hallmarks of aging and prolonged lifespan in a premature-aging mouse model, and improved recovery from metabolic disease and muscle injury in older wild-type mice; before that study, altering aging through reprogramming had not been directly demonstrated in vivo.', theoryNote: 'Theory: even a faithful human analog would target hallmark biology, not organ availability — an independent research program, not a bioprinting payoff. No human in-vivo result is reviewed; full reprogramming erases cell identity.' },
  { id: 'cell-intrinsic-cooperation', label: 'Cell-intrinsic limits to indefinite expansion', category: 'cell-intrinsic', selectable: true, anchorClaimIds: ['fibroblast-senescence', 'culture-selection'], adverseClaimIds: ['kurashima-fork-acceleration', 'kurashima-miscoordination'], measuredSummary: 'The studied fibroblast culture slowed to a replicative-senescence plateau; TP53-mutant subpopulations expanded across passages in the studied hESC cultures; pushing replication-fork speed raised damage markers without growth gain in mouse ES cells.', theoryNote: 'Theory: indefinite cell expansion for repeated transplant logistics collides with senescence and with the transformed-variant selection excluded in the expansion module; cells do not cooperate with being pushed forever.' },
  { id: 'whole-body-including-brain', label: 'Whole-body replacement including the brain', category: 'excluded', selectable: false, anchorClaimIds: [], adverseClaimIds: [], measuredSummary: 'No reviewed source demonstrates whole-body replacement, brain replacement, or continuity of a person\'s self across a copied brain; this is not an evidenced biological possibility.', theoryNote: 'The excluded lever of this module: even a complete organ-printing pipeline leaves the brain, and replacing it is not the same person made younger. It is shown for teaching and never selectable, because no reviewed science bears on it.' },
];
const NOTICES = [
  'Simulation theory only: every number computed here is user-hypothetical arithmetic, not a measurement, prediction or longevity claim.',
  'No reviewed source demonstrates eternal youth, any human anti-aging treatment, or a bioprinted solid organ functioning long-term in a human.',
  'Aging is systemic and multi-hallmark; single-organ replacement does not reset it (theory).',
  'Nothing here is medical advice, a treatment, a life-extension protocol, or an instruction directed at any person or animal.',
];
export function defaultLongevityPerspective() {
  return { singleOrganFailureFraction: null, replacedOrganCount: null, replacementCadenceYears: null, planningHorizonYears: null, selectedBarrierIds: [] };
}
export function validateLongevityPerspective(raw) {
  assertAllowedKeys(raw, ['singleOrganFailureFraction', 'replacedOrganCount', 'replacementCadenceYears', 'planningHorizonYears', 'selectedBarrierIds'], 'longevityPerspective');
  const integer = (value, min, max, path) => { if (!Number.isInteger(finite(value, min, max, path))) throw new RangeError(`${path} must be an integer`); return value; };
  const selectedBarrierIds = raw.selectedBarrierIds;
  if (!Array.isArray(selectedBarrierIds) || selectedBarrierIds.some(id => typeof id !== 'string')) throw new TypeError('Invalid barrier selection');
  if (new Set(selectedBarrierIds).size !== selectedBarrierIds.length) throw new RangeError('Duplicate barrier selection');
  const selectable = new Set(BARRIERS.filter(b => b.selectable).map(b => b.id));
  if (selectedBarrierIds.some(id => !selectable.has(id))) throw new RangeError('Unknown or excluded barrier selection');
  return {
    singleOrganFailureFraction: raw.singleOrganFailureFraction === null ? null : finite(raw.singleOrganFailureFraction, 0, 1, 'singleOrganFailureFraction'),
    replacedOrganCount: raw.replacedOrganCount === null ? null : integer(raw.replacedOrganCount, 1, 10, 'replacedOrganCount'),
    replacementCadenceYears: raw.replacementCadenceYears === null ? null : finite(raw.replacementCadenceYears, 0.5, 50, 'replacementCadenceYears'),
    planningHorizonYears: raw.planningHorizonYears === null ? null : finite(raw.planningHorizonYears, 1, 120, 'planningHorizonYears'),
    selectedBarrierIds: [...selectedBarrierIds],
  };
}
export function getBarrierCatalog() { return structuredClone(BARRIERS); }
export function validateBarrierCatalog(barrers, evidenceCatalog, agingCatalog) {
  if (!Array.isArray(barrers) || !barrers.length || barrers.length > 32) throw new RangeError('Invalid barrier catalog');
  const ids = new Set();
  const claims = new Map([...evidenceCatalog.claims, ...agingCatalog.claims].map(c => [c.id, c]));
  for (const b of barrers) {
    assertAllowedKeys(b, ['id', 'label', 'category', 'selectable', 'anchorClaimIds', 'adverseClaimIds', 'measuredSummary', 'theoryNote']);
    const id = text(b.id, 128, 'id'); if (ids.has(id)) throw new RangeError('Duplicate barrier ID'); ids.add(id);
    text(b.label, 2000, 'label'); text(b.measuredSummary, 2000, 'measuredSummary'); text(b.theoryNote, 2000, 'theoryNote');
    if (!CATEGORIES.includes(b.category)) throw new RangeError('Unknown barrier category');
    for (const key of ['anchorClaimIds', 'adverseClaimIds']) {
      if (!Array.isArray(b[key])) throw new TypeError(`Invalid ${key}`);
      if (b[key].some(claimId => !claims.has(claimId))) throw new RangeError(`Dangling ${key} claim`);
    }
    if (b.category === 'excluded' ? b.selectable !== false : b.selectable !== true) throw new RangeError('Excluded barriers are never selectable; all others must be');
    if (['systemic', 'levers', 'cell-intrinsic'].includes(b.category) && !b.anchorClaimIds.length) throw new RangeError('Evidence-anchored barriers need measured anchors');
    if (b.category === 'levers' && !b.adverseClaimIds.length) throw new RangeError('Lever barriers carry adverse evidence');
  }
  if (barrers.filter(b => b.category === 'excluded').length !== 1) throw new RangeError('Exactly one excluded lever is expected');
  for (const category of CATEGORIES) if (!barrers.some(b => b.category === category)) throw new RangeError(`Missing ${category} barrier category`);
  return structuredClone(barrers);
}
export function evaluateLongevityTheory(settings) {
  const parsed = validateLongevityPerspective(settings);
  const result = { status: 'unconfigured', assumptionOrigin: 'user-hypothetical-simulation', addressableCeiling: null, unaffectedShare: null, replacementsPerOrgan: null, totalReplacements: null, replacementsPerPersonYear: null, barrierEffects: [], anchorSummaries: [], adverseSummaries: [], notices: NOTICES };
  if (parsed.singleOrganFailureFraction === null) return result;
  result.status = 'calculated';
  result.addressableCeiling = parsed.singleOrganFailureFraction;
  result.unaffectedShare = 1 - parsed.singleOrganFailureFraction;
  if (parsed.replacedOrganCount !== null && parsed.replacementCadenceYears !== null && parsed.planningHorizonYears !== null) {
    result.replacementsPerOrgan = Math.ceil(parsed.planningHorizonYears / parsed.replacementCadenceYears);
    result.totalReplacements = parsed.replacedOrganCount * result.replacementsPerOrgan;
    result.replacementsPerPersonYear = result.totalReplacements / parsed.planningHorizonYears;
  }
  for (const id of parsed.selectedBarrierIds) {
    const barrier = BARRIERS.find(b => b.id === id);
    let note = barrier.theoryNote;
    if (id === 'single-organ-ceiling') note = `At your hypothetical fraction ${parsed.singleOrganFailureFraction}, single-organ replacement addresses at most ${parsed.singleOrganFailureFraction} of deaths; ${result.unaffectedShare} remains untouched in principle.`;
    if (id === 'no-printed-solid-organ') note = 'The ceiling assumes a human organ-printing capability that no reviewed source demonstrates; treat every number here as theory.';
    if (id === 'systemic-aging-environment' && parsed.replacedOrganCount !== null) note = `Even replacing ${parsed.replacedOrganCount} organs on schedule leaves the systemic hallmarks in place; parts replacement does not reset the aged environment (theory).`;
    if (id === 'partial-reprogramming-lever') note = 'Mouse-only anchor: no human in-vivo reprogramming result is reviewed; this lever is independent of bioprinting and unproven in humans.';
    if (id === 'cell-intrinsic-cooperation') note = 'Cell supply for repeated transplants collides with replicative senescence and transformed-variant selection; pushing cells raised damage markers without growth gain in the measured anchors.';
    result.barrierEffects.push({ id, label: barrier.label, note });
  }
  const evidence = getEvidenceCatalog(), aging = getAgingEvidenceCatalog();
  const all = [...evidence.claims, ...aging.claims];
  for (const id of parsed.selectedBarrierIds) {
    const barrier = BARRIERS.find(b => b.id === id);
    for (const claimId of barrier.anchorClaimIds) if (!result.anchorSummaries.some(c => c.id === claimId)) result.anchorSummaries.push(all.find(c => c.id === claimId));
    for (const claimId of barrier.adverseClaimIds) if (!result.adverseSummaries.some(c => c.id === claimId)) result.adverseSummaries.push(all.find(c => c.id === claimId));
  }
  return result;
}
