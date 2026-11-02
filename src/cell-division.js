import { assertAllowedKeys, finite } from './validation.js';
import { CELL_TYPE_IDS } from './cell-evidence.js';
import { defaultCellSystemId, validateCellSystemSelection, validateMethodSelection } from './repair-research.js';
import { defaultPlanningComparison, validatePlanningComparison } from './planning-comparison.js';
import { defaultExpansionTheory, validateExpansionTheory } from './acceleration-theory.js';
import { defaultLongevityPerspective, validateLongevityPerspective } from './longevity-theory.js';
import { defaultApplicationsPerspective, validateApplicationsPerspective } from './applications.js';
import { defaultResearchProgram, validateResearchProgram } from './research-program.js';
import { defaultHardwareBudget, validateHardwareBudget } from './hardware-costs.js';

/** Independent arithmetic inputs, never a culture schedule or storyboard clock. */
export function defaultLearningState() {
  return { selectedCellType: 'msc', selectedCellSystemId: defaultCellSystemId('msc'), selectedMethodId: null, division: { model: 'idealized-relative-doubling', doublings: 0, hypotheticalDoublingHours: null }, researchHorizonYears: null, planningComparison: defaultPlanningComparison(), expansionTheory: defaultExpansionTheory(), longevityPerspective: defaultLongevityPerspective(), applicationsPerspective: defaultApplicationsPerspective(), researchProgram: defaultResearchProgram(), hardwareBudget: defaultHardwareBudget() };
}
export function validateDivisionSettings(raw) {
  assertAllowedKeys(raw, ['model', 'doublings', 'hypotheticalDoublingHours'], 'division');
  if (raw.model !== 'idealized-relative-doubling') throw new RangeError('Unsupported division model');
  return { model: raw.model, doublings: finite(raw.doublings, 0, 40, 'doublings'), hypotheticalDoublingHours: raw.hypotheticalDoublingHours === null ? null : finite(raw.hypotheticalDoublingHours, 1, 1000, 'hypotheticalDoublingHours') };
}
export function validateLearningState(raw) {
  assertAllowedKeys(raw, ['selectedCellType', 'selectedCellSystemId', 'selectedMethodId', 'division', 'researchHorizonYears', 'planningComparison', 'expansionTheory', 'longevityPerspective', 'applicationsPerspective', 'researchProgram', 'hardwareBudget'], 'learning');
  if (!CELL_TYPE_IDS.includes(raw.selectedCellType)) throw new RangeError('Unknown cell type');
  validateCellSystemSelection(raw.selectedCellType, raw.selectedCellSystemId);
  validateMethodSelection(raw.selectedCellSystemId, raw.selectedMethodId);
  return { selectedCellType: raw.selectedCellType, selectedCellSystemId: raw.selectedCellSystemId, selectedMethodId: raw.selectedMethodId, division: validateDivisionSettings(raw.division), researchHorizonYears: raw.researchHorizonYears === null ? null : finite(raw.researchHorizonYears, 0, 20, 'researchHorizonYears'), planningComparison: validatePlanningComparison(raw.planningComparison), expansionTheory: validateExpansionTheory(raw.expansionTheory), longevityPerspective: validateLongevityPerspective(raw.longevityPerspective), applicationsPerspective: validateApplicationsPerspective(raw.applicationsPerspective), researchProgram: validateResearchProgram(raw.researchProgram), hardwareBudget: validateHardwareBudget(raw.hardwareBudget) };
}
export function evaluateRelativeDivision(raw) {
  const settings = validateDivisionSettings(raw);
  return { model: settings.model, relativePopulation: 2 ** settings.doublings, doublings: settings.doublings, hypotheticalElapsedHours: settings.hypotheticalDoublingHours === null ? null : settings.doublings * settings.hypotheticalDoublingHours, parameterOrigin: 'synthetic-user-assumption', notice: 'Idealized relative arithmetic only: no cell death, senescence, capacity, identity, maturation, genome stability or organ yield. Fractional doublings describe a population idealization, not fractional mitosis.' };
}