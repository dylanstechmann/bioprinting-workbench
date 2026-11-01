import test from 'node:test';
import assert from 'node:assert/strict';
import { PROCEDURE_STEPS, procedureForStage, createProcedureState, toggleCheck, stepProgress, isStageUnlocked, unlockedStages, clampTime, setMode, procedureSummary, nextGate } from '../src/procedure.js';

test('steps cover every stage with unique ids and ordering', () => {
  assert.equal(PROCEDURE_STEPS.length, 8);
  const ids = new Set(PROCEDURE_STEPS.map(s => s.id));
  assert.equal(ids.size, PROCEDURE_STEPS.length);
  for (let stage = 0; stage < 5; stage++) assert.ok(procedureForStage(stage).length >= 1);
  assert.throws(() => procedureForStage(5), RangeError);
  assert.deepEqual(PROCEDURE_STEPS.map(s => s.order), [...PROCEDURE_STEPS.keys()].map(i => i + 1));
});

test('every step cites at least one DOI-shaped published basis', () => {
  for (const step of PROCEDURE_STEPS) {
    assert.ok(step.publishedBasis.length >= 1);
    assert.ok(step.publishedBasis.some(b => typeof b.doi === 'string' && /^10\.\d{4,9}\//.test(b.doi) && typeof b.url === 'string' && b.url.startsWith('https://')), step.id);
    assert.ok(step.virtualChecks.length >= 1);
    assert.ok(step.unknowns.length >= 1);
  }
});

test('check ids are unique across all steps', () => {
  const ids = PROCEDURE_STEPS.flatMap(s => s.virtualChecks.map(c => c.id));
  assert.equal(new Set(ids).size, ids.length);
});

test('wording guard: no direct-action clinical terms in titles, purposes or check labels', () => {
  const blocklist = /\b(inject|infuse|administer|transplant|implant|operate|dose|excise|dissect|suture)\b/i;
  for (const step of PROCEDURE_STEPS) {
    for (const text of [step.title, step.purpose, ...step.virtualChecks.map(c => c.label)]) {
      assert.ok(!blocklist.test(text), `blocked term in: ${text}`);
    }
  }
});

test('toggleCheck is pure and rejects unknown ids', () => {
  const state = createProcedureState();
  const next = toggleCheck(state, 'expand-population');
  assert.deepEqual(state.completedChecks, []);
  assert.deepEqual(next.completedChecks, ['expand-population']);
  assert.deepEqual(toggleCheck(next, 'expand-population').completedChecks, []);
  assert.throws(() => toggleCheck(state, 'nope'), RangeError);
});

test('gated progression unlocks stages in order', () => {
  let state = createProcedureState();
  assert.equal(state.mode, 'gated');
  assert.deepEqual(unlockedStages(state), [true, false, false, false, false]);
  assert.equal(nextGate(state).stage, 1);
  for (const c of PROCEDURE_STEPS.filter(s => s.stage === 0).flatMap(s => s.virtualChecks)) state = toggleCheck(state, c.id);
  assert.deepEqual(unlockedStages(state), [true, true, false, false, false]);
  assert.equal(isStageUnlocked(state, 1), true);
  assert.equal(isStageUnlocked(state, 2), false);
  assert.equal(nextGate(state).stage, 2);
  assert.equal(nextGate(state).remainingChecks.length, 4);
});

test('clampTime respects the active gate and the storyboard range', () => {
  const state = createProcedureState();
  assert.equal(clampTime(state, 3.5), 0.999);
  assert.equal(clampTime(state, 0.5), 0.5);
  const free = setMode(state, 'free');
  assert.equal(clampTime(free, 3.5), 3.5);
  assert.equal(clampTime(free, 9), 4.999);
  assert.throws(() => clampTime(state, Number.NaN), TypeError);
});

test('setMode validates and procedureSummary reports mode and unlocks', () => {
  const state = createProcedureState();
  assert.throws(() => setMode(state, 'chaos'), TypeError);
  const free = setMode(state, 'free');
  assert.equal(free.mode, 'free');
  assert.deepEqual(free.completedChecks, []);
  const summary = procedureSummary(free);
  assert.equal(summary.mode, 'free');
  assert.equal(summary.steps, 8);
  assert.equal(summary.checks, 16);
  assert.deepEqual(summary.unlockedStages, [true, true, true, true, true]);
  assert.equal(procedureSummary(state).checksComplete, 0);
  assert.equal(nextGate(free), null);
});

test('stepProgress reflects completed checks', () => {
  let state = createProcedureState();
  const step = PROCEDURE_STEPS[0];
  assert.equal(stepProgress(state, step), 0);
  state = toggleCheck(state, step.virtualChecks[0].id);
  assert.equal(stepProgress(state, step), .5);
  state = toggleCheck(state, step.virtualChecks[1].id);
  assert.equal(stepProgress(state, step), 1);
});
