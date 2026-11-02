import { assertAllowedKeys, finite } from './validation.js';

/** Hypothetical planning inputs only: two user-entered durations compared arithmetically. Never a method outcome, prediction or schedule. */
export function defaultPlanningComparison() {
  return { baselineHours: null, comparisonHours: null };
}
export function validatePlanningComparison(raw) {
  assertAllowedKeys(raw, ['baselineHours', 'comparisonHours'], 'planningComparison');
  return {
    baselineHours: raw.baselineHours === null ? null : finite(raw.baselineHours, 1e-9, 1e6, 'planningComparison.baselineHours'),
    comparisonHours: raw.comparisonHours === null ? null : finite(raw.comparisonHours, 1e-9, 1e6, 'planningComparison.comparisonHours'),
  };
}
export function evaluatePlanningComparison(raw) {
  const settings = validatePlanningComparison(raw);
  const notice = 'Signed arithmetic between two user-entered hypothetical durations. Not a method effect, measured timeline, prediction or organ-production schedule; input bounds are software limits, not biological ranges.';
  if (settings.baselineHours === null || settings.comparisonHours === null) {
    return { status: 'incomplete', differenceHours: null, relativeChangePercent: null, assumptionOrigin: 'user-hypothetical', notice };
  }
  const differenceHours = settings.baselineHours - settings.comparisonHours;
  return { status: 'calculated', differenceHours, relativeChangePercent: 100 * differenceHours / settings.baselineHours, assumptionOrigin: 'user-hypothetical', notice };
}