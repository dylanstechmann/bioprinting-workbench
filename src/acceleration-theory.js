import { assertAllowedKeys, finite } from './validation.js';
import { getEvidenceCatalog } from './cell-evidence.js';

/** Simulation theory only: a mechanism catalog anchored to reviewed claims plus transparent wall-clock arithmetic on user-hypothetical inputs. Never a measured timeline, method outcome, prediction or organ-production schedule. */
const CATEGORIES = ['attrition', 'medium', 'replication', 'logistics', 'excluded'];
const MECHANISMS = [
  { id: 'attrition-rescue', label: 'Nucleoside attrition rescue (human PSC context)', category: 'attrition', selectable: true, anchorClaimIds: ['halliwell-survival'], adverseClaimIds: ['kurashima-miscoordination', 'kurashima-fork-acceleration'], measuredSummary: 'Halliwell et al. tracked seeded MIFF1 cells: 68% versus 79% entered mitosis and 59% versus 91% formed colonies without versus with nucleosides; the paper reports improved survival, clonogenicity and population growth, and no doubling-time change.', theoryNote: 'Theory: yield rescue, not faster cycling. A rescued survival fraction models fewer losses per seeding; gate arithmetic can overstate bulk growth-curve effects.' },
  { id: 'medium-formulation', label: 'Medium formulation choice (human BM-MSC context)', category: 'medium', selectable: true, anchorClaimIds: ['msc-variability'], adverseClaimIds: [], measuredSummary: 'Bhat et al. report media-specific BM-MSC population doubling times (Figure 4 caption: about 22–46 hours across compared formulations, one excluded; the shipped method row also cites a 46.3 h versus 55.1 h control comparison); endpoints are never pooled.', theoryNote: 'Theory: a medium multiplier of 0.9 models a ~11% faster doubling. Media can also be slower or fail to support a passage at all.' },
  { id: 'split-seeding-logistics', label: 'Split ratio and seeding density (pure logistics)', category: 'logistics', selectable: true, anchorClaimIds: [], adverseClaimIds: [], measuredSummary: 'Bhat et al. compared 1000 and 5000 cells/cm² seeding densities with comparable yield and characteristics in their hands (seeding parameters appear on the Bhat recipe card).', theoryNote: 'Arithmetic, not biology: seeding 5× denser skips about 2.3 doublings per passage but consumes 5× more seed stock; here it only amortizes passage overhead.' },
  { id: 'passage-overhead', label: 'Passage overhead recovery (process logistics)', category: 'logistics', selectable: true, anchorClaimIds: [], adverseClaimIds: [], measuredSummary: 'No reviewed source quantifies a universal passage overhead; harvest, counting, reseeding and reattachment time remain process assumptions you set.', theoryNote: 'Arithmetic: total overhead = passages × your overhead hours. Larger split ratios reduce passage count for the same doublings, saving overhead only.' },
  { id: 'fork-speed-push', label: 'Replication fork speed push (measured anchor: no growth gain)', category: 'replication', selectable: true, anchorClaimIds: ['kurashima-fork-acceleration', 'pluripotent-cycle'], adverseClaimIds: ['kurashima-miscoordination'], measuredSummary: 'Kurashima et al.: nucleosides accelerated replication-fork speed in mouse ES cells, but S-phase duration stayed similar and the overall growth rate was not affected; ultra-fine bridges rose from about 20% to about 40% of cells and γH2AX from 6.1% to 13.1%.', theoryNote: 'Theory: any cycle-time gain would require coordinated origin firing. The measured anchor is zero growth change with about 2× damage markers, so multipliers below 1.0 are hypothetical exploration only.' },
  { id: 'transformed-variant-selection', label: 'Transformed / apoptosis-resistant variant selection', category: 'excluded', selectable: false, anchorClaimIds: ['culture-selection'], adverseClaimIds: ['culture-selection', 'kurashima-miscoordination'], measuredSummary: 'Merkle et al.: TP53-mutant subpopulations expanded across passages in the studied hESC cultures — a real selection effect obtained through genome instability.', theoryNote: 'Excluded lever, shown for teaching: expansion via genome instability is the false economy this simulator refuses to model as a selectable acceleration.' },
];
const NOTICES = [
  'Simulation theory only: every number comes from your own hypothetical inputs. Nothing here is a measured timeline, a method outcome, a prediction or a protocol.',
  'Mechanism terms act on different quantities (cycle time, survival, logistics); combining them is a first-order idealization, not clean multiplication.',
  'Survival-gate arithmetic can overstate bulk growth-curve effects; colonies that are founded still expand at the same cycle arithmetic.',
  'No organ-production timeline follows from any total here: whole-organ bottlenecks such as vascularization, maturation and integration are not cell-expansion-limited.',
];
export function defaultExpansionTheory() { return { startCells: null, targetCells: null, doublingHours: null, overheadHours: null, splitRatio: null, attritionFraction: null, attritionRescuedFraction: null, mediumPdtMultiplier: null, forkCycleMultiplier: null, selectedMechanismIds: [] }; }
function integer(value, min, max, name) { if (!Number.isInteger(value)) throw new RangeError(`${name} must be an integer`); return finite(value, min, max, name); }
export function validateExpansionTheory(raw) {
  assertAllowedKeys(raw, ['startCells','targetCells','doublingHours','overheadHours','splitRatio','attritionFraction','attritionRescuedFraction','mediumPdtMultiplier','forkCycleMultiplier','selectedMechanismIds'], 'expansionTheory');
  const selectable = new Set(MECHANISMS.filter(m => m.selectable).map(m => m.id));
  const ids = raw.selectedMechanismIds;
  if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string' || !selectable.has(id)) || new Set(ids).size !== ids.length) throw new RangeError('Unknown or duplicate mechanism selection');
  const settings = { startCells: raw.startCells === null ? null : integer(raw.startCells, 1e3, 1e12, 'startCells'), targetCells: raw.targetCells === null ? null : integer(raw.targetCells, 1001, 1e15, 'targetCells'), doublingHours: raw.doublingHours === null ? null : finite(raw.doublingHours, .1, 1000, 'doublingHours'), overheadHours: raw.overheadHours === null ? null : finite(raw.overheadHours, 0, 168, 'overheadHours'), splitRatio: raw.splitRatio === null ? null : integer(raw.splitRatio, 2, 100, 'splitRatio'), attritionFraction: raw.attritionFraction === null ? null : finite(raw.attritionFraction, .01, 1, 'attritionFraction'), attritionRescuedFraction: raw.attritionRescuedFraction === null ? null : finite(raw.attritionRescuedFraction, .01, 1, 'attritionRescuedFraction'), mediumPdtMultiplier: raw.mediumPdtMultiplier === null ? null : finite(raw.mediumPdtMultiplier, .5, 1.5, 'mediumPdtMultiplier'), forkCycleMultiplier: raw.forkCycleMultiplier === null ? null : finite(raw.forkCycleMultiplier, .7, 1, 'forkCycleMultiplier'), selectedMechanismIds: [...ids] };
  if (settings.startCells !== null && settings.targetCells !== null && settings.targetCells <= settings.startCells) throw new RangeError('targetCells must exceed startCells');
  if (settings.attritionRescuedFraction !== null && !ids.includes('attrition-rescue')) throw new RangeError('attritionRescuedFraction requires the attrition-rescue mechanism');
  if (settings.mediumPdtMultiplier !== null && !ids.includes('medium-formulation')) throw new RangeError('mediumPdtMultiplier requires the medium-formulation mechanism');
  if (settings.forkCycleMultiplier !== null && !ids.includes('fork-speed-push')) throw new RangeError('forkCycleMultiplier requires the fork-speed-push mechanism');
  return settings;
}
export function getMechanismCatalog() { return structuredClone(catalog); }
export function validateMechanismCatalog(raw, evidence) {
  const ids = new Set();
  for (const m of raw) {
    assertAllowedKeys(m, ['id','label','category','selectable','anchorClaimIds','adverseClaimIds','measuredSummary','theoryNote'], 'mechanism');
    if (typeof m.id !== 'string' || !m.id || ids.has(m.id)) throw new RangeError('Duplicate or empty mechanism id');
    ids.add(m.id);
    if (!CATEGORIES.includes(m.category)) throw new RangeError('Unknown mechanism category');
    if (typeof m.label !== 'string' || !m.label.trim()) throw new RangeError('Mechanism label required');
    if ((m.category === 'excluded') === m.selectable) throw new RangeError('Only the excluded category is not selectable');
    for (const key of ['anchorClaimIds','adverseClaimIds']) {
      if (!Array.isArray(m[key]) || m[key].some(id => typeof id !== 'string')) throw new RangeError('Invalid claim id list');
      for (const id of m[key]) if (!evidence.claims.some(c => c.id === id)) throw new RangeError(`Unknown ${key} claim`);
    }
    if (m.category !== 'logistics' && !m.anchorClaimIds.length) throw new RangeError('Non-logistics mechanisms need measured anchors');
    if (['replication', 'excluded'].includes(m.category) && !m.adverseClaimIds.length) throw new RangeError('Adverse anchors required for this category');
    if (typeof m.measuredSummary !== 'string' || !m.measuredSummary.trim()) throw new RangeError('Measured summary required');
    if (typeof m.theoryNote !== 'string' || !m.theoryNote.trim()) throw new RangeError('Theory note required');
  }
  return structuredClone(raw);
}
const catalog = validateMechanismCatalog(MECHANISMS, getEvidenceCatalog());
export function evaluateExpansionTheory(raw) {
  const settings = validateExpansionTheory(raw);
  const result = { status: 'unconfigured', assumptionOrigin: 'user-hypothetical-simulation', pureDoublings: null, doublingsPerPassage: null, passages: null, attritionExtraDoublings: null, attritionFractionUsed: null, baselineAttritionFraction: null, effectiveDoublings: null, cycleHours: null, cyclingHours: null, overheadTotalHours: null, totalHours: null, baselineTotalHours: null, assumedDefaults: [], mechanismEffects: [], anchorSummaries: [], adverseSummaries: [], notices: NOTICES };
  if (settings.startCells === null || settings.targetCells === null || settings.doublingHours === null) return result;
  result.status = 'calculated';
  const splitRatio = settings.splitRatio ?? 4, overheadHours = settings.overheadHours ?? 0;
  if (settings.splitRatio === null) result.assumedDefaults.push('Split ratio assumed 1:4 (seed = harvest/4).');
  if (settings.overheadHours === null) result.assumedDefaults.push('Passage overhead assumed 0 hours.');
  const medium = settings.mediumPdtMultiplier ?? 1, fork = settings.forkCycleMultiplier ?? 1;
  const cycleHours = settings.doublingHours * medium * fork;
  const pureDoublings = Math.log2(settings.targetCells / settings.startCells);
  const doublingsPerPassage = Math.log2(splitRatio);
  const passages = Math.ceil(pureDoublings / doublingsPerPassage);
  const baselineFraction = settings.attritionFraction ?? 1;
  const rescued = settings.selectedMechanismIds.includes('attrition-rescue') && settings.attritionRescuedFraction !== null;
  const fraction = rescued ? settings.attritionRescuedFraction : baselineFraction;
  const extraDoublings = fraction === 1 ? 0 : passages * -Math.log2(fraction);
  const baselineExtraDoublings = baselineFraction === 1 ? 0 : passages * -Math.log2(baselineFraction);
  const effectiveDoublings = pureDoublings + extraDoublings;
  result.pureDoublings = pureDoublings; result.doublingsPerPassage = doublingsPerPassage; result.passages = passages;
  result.attritionExtraDoublings = extraDoublings; result.attritionFractionUsed = fraction; result.baselineAttritionFraction = baselineFraction;
  result.effectiveDoublings = effectiveDoublings; result.cycleHours = cycleHours;
  result.cyclingHours = effectiveDoublings * cycleHours; result.overheadTotalHours = passages * overheadHours;
  result.totalHours = result.cyclingHours + result.overheadTotalHours;
  result.baselineTotalHours = (pureDoublings + baselineExtraDoublings) * settings.doublingHours + passages * overheadHours;
  for (const id of settings.selectedMechanismIds) {
    const mechanism = MECHANISMS.find(m => m.id === id);
    let hoursSaved = null, note = mechanism.theoryNote;
    if (id === 'attrition-rescue') hoursSaved = settings.attritionFraction === null ? null : (baselineExtraDoublings - extraDoublings) * cycleHours;
    if (id === 'medium-formulation') hoursSaved = pureDoublings * settings.doublingHours * (1 - medium);
    if (id === 'fork-speed-push') hoursSaved = pureDoublings * settings.doublingHours * medium * (1 - fork);
    if (id === 'split-seeding-logistics') note = `At 1:${splitRatio}, ${passages} passages carry ${result.overheadTotalHours.toLocaleString('en-US')} h of overhead; denser seeding skips doublings but consumes more seed stock.`;
    if (id === 'passage-overhead') note = `Overhead share: ${result.overheadTotalHours.toLocaleString('en-US')} h of the ${result.totalHours.toLocaleString('en-US')} h total; recovered only by process changes, not biology.`;
    result.mechanismEffects.push({ id, label: mechanism.label, hoursSaved, note });
  }
  const evidence = getEvidenceCatalog();
  for (const id of settings.selectedMechanismIds) {
    const mechanism = MECHANISMS.find(m => m.id === id);
    for (const claimId of mechanism.anchorClaimIds) if (!result.anchorSummaries.some(c => c.id === claimId)) result.anchorSummaries.push(evidence.claims.find(c => c.id === claimId));
    for (const claimId of mechanism.adverseClaimIds) if (!result.adverseSummaries.some(c => c.id === claimId)) result.adverseSummaries.push(evidence.claims.find(c => c.id === claimId));
  }
  return result;
}