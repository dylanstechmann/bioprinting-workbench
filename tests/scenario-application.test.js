import test from 'node:test';
import assert from 'node:assert/strict';
import { applyScenarioTransaction } from '../src/scenario-application.js';

const NEXT = Object.freeze({ id: 'next' });
const PREVIOUS = Object.freeze({ id: 'previous' });

function harness({ firstCommitThrows = false, rollbackThrows = false } = {}) {
  const calls = { prepare: [], commit: [], snapshot: 0, rollbackFailure: null };
  const snapshot = () => { calls.snapshot++; return PREVIOUS; };
  const prepare = value => { calls.prepare.push(value); return { prepared: value }; };
  const commit = prepared => {
    calls.commit.push(prepared);
    if (calls.commit.length === 1 && firstCommitThrows) throw new Error('commit failed');
    if (calls.commit.length === 2 && rollbackThrows) throw new Error('rollback failed');
    return prepared;
  };
  return { calls, snapshot, prepare, commit };
}

test('successful application prepares next and rollback states before committing once', () => {
  const { calls, snapshot, prepare, commit } = harness();
  const result = applyScenarioTransaction(NEXT, { snapshot, prepare, commit });
  assert.deepEqual(result, { applied: true, rollback: { prepared: PREVIOUS } });
  assert.deepEqual(calls.prepare, [NEXT, PREVIOUS]);
  assert.deepEqual(calls.commit, [{ prepared: NEXT }]);
  assert.equal(calls.snapshot, 1);
});

test('prepare failure propagates before any commit touches the UI', () => {
  const { calls, snapshot, commit } = harness();
  let caught = null;
  try { applyScenarioTransaction(NEXT, { snapshot, prepare: () => { throw new Error('invalid scenario'); }, commit }); }
  catch (error) { caught = error; }
  assert.match(caught?.message, /invalid scenario/);
  assert.equal(calls.commit.length, 0);
  assert.equal(calls.snapshot, 0);
});

test('commit failure restores the prepared rollback state', () => {
  const { calls, snapshot, prepare, commit } = harness({ firstCommitThrows: true });
  let caught = null;
  try { applyScenarioTransaction(NEXT, { snapshot, prepare, commit }); }
  catch (error) { caught = error; }
  assert.match(caught?.message, /commit failed/);
  assert.equal(caught.rollbackFailed, undefined);
  assert.deepEqual(calls.commit, [{ prepared: NEXT }, { prepared: PREVIOUS }]);
  assert.equal(calls.snapshot, 1);
});

test('rollback failure reports both errors without claiming restoration succeeded', () => {
  const { calls, snapshot, prepare, commit } = harness({ firstCommitThrows: true, rollbackThrows: true });
  let caught = null, reported = null;
  try { applyScenarioTransaction(NEXT, { snapshot, prepare, commit, onRollbackFailure: error => { reported = error; } }); }
  catch (error) { caught = error; }
  assert.match(caught?.message, /Scenario could not be applied and the previous state could not be fully restored/);
  assert.match(caught?.message, /commit failed/);
  assert.match(caught?.message, /rollback failed/);
  assert.equal(caught.rollbackFailed, true);
  assert.equal(caught.cause.message, 'commit failed');
  assert.equal(caught.rollbackError.message, 'rollback failed');
  assert.equal(reported, caught);
  assert.deepEqual(calls.commit, [{ prepared: NEXT }, { prepared: PREVIOUS }]);
});

test('invalid scenario input and collaborators are rejected before any work', () => {
  const { snapshot, prepare, commit } = harness();
  for (const next of [null, undefined, 'x', 3, [], () => {}, true]) {
    assert.throws(() => applyScenarioTransaction(next, { snapshot, prepare, commit }), TypeError);
  }
  assert.throws(() => applyScenarioTransaction(NEXT, { prepare, commit }), TypeError);
  assert.throws(() => applyScenarioTransaction(NEXT, { snapshot, commit }), TypeError);
  assert.throws(() => applyScenarioTransaction(NEXT, { snapshot, prepare }), TypeError);
  assert.throws(() => applyScenarioTransaction(NEXT, { snapshot, prepare, commit, onRollbackFailure: 'x' }), TypeError);
});