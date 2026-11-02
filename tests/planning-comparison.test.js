import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultPlanningComparison, validatePlanningComparison, evaluatePlanningComparison } from '../src/planning-comparison.js';

test('planning comparison is nullable, signed, hypothetical arithmetic only', () => {
  const d = defaultPlanningComparison();
  assert.deepEqual(d, { baselineHours: null, comparisonHours: null });
  assert.equal(evaluatePlanningComparison(d).status, 'incomplete');
  assert.equal(evaluatePlanningComparison(d).differenceHours, null);
  assert.equal(evaluatePlanningComparison({ baselineHours: 100, comparisonHours: null }).status, 'incomplete');
  const faster = evaluatePlanningComparison({ baselineHours: 100, comparisonHours: 80 });
  assert.equal(faster.status, 'calculated');
  assert.equal(faster.differenceHours, 20);
  assert.equal(faster.relativeChangePercent, 20);
  const slower = evaluatePlanningComparison({ baselineHours: 80, comparisonHours: 100 });
  assert.equal(slower.differenceHours, -20);
  assert.equal(slower.relativeChangePercent, -25);
  assert.equal(slower.assumptionOrigin, 'user-hypothetical');
  assert.ok(slower.notice.includes('Not a method effect'));
  for (const patch of [{ baselineHours: '100' }, { baselineHours: 0 }, { baselineHours: -1 }, { baselineHours: NaN }, { baselineHours: Infinity }, { comparisonHours: 1e7 }, { extra: 1 }]) {
    assert.throws(() => evaluatePlanningComparison({ ...d, ...patch }));
  }
  assert.equal(validatePlanningComparison({ baselineHours: 1e6, comparisonHours: 1e-9 }).baselineHours, 1e6);
});