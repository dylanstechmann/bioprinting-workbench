import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createBrowserRoundtripSuite,
  createRoundtripCheckpoint,
  validateRoundtripCheckpoint,
  selectionFromBundle,
  deskExportBody,
} from '../scripts/browser-roundtrip.js';

const bundle = {
  bundleId: 'bundle-fixture',
  hypotheses: [{ id: 'hyp-1' }, { id: 'hyp-2' }],
  queries: [{ id: 'query-1' }],
  modelRuns: [{ id: 'run-fixture-1' }],
  evidence: [{ id: 'evidence-1' }],
  artifacts: [{ filename: 'synthetic.json', bytes: 12, sha256: 'a'.repeat(64) }],
};
const bundleText = JSON.stringify(bundle);
const urls = { workbenchURL: 'http://127.0.0.1:8091/', deskURL: 'http://127.0.0.1:8092/' };
const deskRunId = 'b'.repeat(32);

test('suite validates parts, URLs and viewport bounds up front', () => {
  assert.throws(() => createBrowserRoundtripSuite({ ...urls, part: 'nonsense' }), RangeError);
  assert.throws(() => createBrowserRoundtripSuite({ ...urls, workbenchURL: 'file:///tmp' }), TypeError);
  assert.throws(() => createBrowserRoundtripSuite({ ...urls, viewport: { width: 10, height: 10 } }), RangeError);
  for (const part of ['export', 'desk', 'return', 'desk-controls']) {
    assert.equal(typeof createBrowserRoundtripSuite({ ...urls, part }), 'function');
  }
});

test('selection is derived from bundle ids and refuses malformed bundles', () => {
  assert.deepEqual(selectionFromBundle(bundle), {
    hypothesisIds: ['hyp-1', 'hyp-2'], queryIds: ['query-1'], modelRunIds: ['run-fixture-1'], evidenceIds: ['evidence-1'],
  });
  assert.throws(() => selectionFromBundle({ ...bundle, hypotheses: [{ id: 'x' }, { id: 'x' }] }), RangeError);
  assert.throws(() => selectionFromBundle({ ...bundle, queries: [{}] }), TypeError);
  assert.throws(() => selectionFromBundle(null), TypeError);
});

test('checkpoints bind session, origins, phases and ids', () => {
  const checkpoint = createRoundtripCheckpoint({
    sessionId: 'session-1', ...urls, phase: 'export', bundleText,
    artifactExpectations: [{ filename: 'synthetic.json', bytes: 12, sha256: 'a'.repeat(64) }],
    expectedScenarioSha256: 'c'.repeat(64),
    deskRunIds: [deskRunId],
    expectedRunStatuses: [{ id: deskRunId, status: 'complete' }],
  });
  assert.equal(checkpoint.sessionId, 'session-1');
  assert.equal(checkpoint.workbenchOrigin, 'http://127.0.0.1:8091');
  assert.throws(() => validateRoundtripCheckpoint(checkpoint, { sessionId: 'other' }), RangeError);
  assert.throws(() => validateRoundtripCheckpoint(checkpoint, { workbenchOrigin: 'http://evil.invalid' }), RangeError);
  assert.throws(() => createRoundtripCheckpoint({ sessionId: 'session-1', ...urls, phase: 'middle', bundleText }), RangeError);
  assert.throws(() => createRoundtripCheckpoint({ sessionId: 'bad session!', ...urls, phase: 'export', bundleText }), TypeError);
  assert.throws(() => validateRoundtripCheckpoint({ ...checkpoint, deskRunIds: ['nope'] }), TypeError);
  assert.throws(() => validateRoundtripCheckpoint({ ...checkpoint, expectedRunStatuses: [{ id: 'c'.repeat(32), status: 'complete' }] }), RangeError);
  assert.throws(() => validateRoundtripCheckpoint({ ...checkpoint, expectedRunStatuses: [{ id: deskRunId, status: 'queued' }] }), TypeError);
  assert.throws(() => validateRoundtripCheckpoint({ ...checkpoint, artifactExpectations: [{ filename: 'a', bytes: -1, sha256: 'a'.repeat(64) }] }), TypeError);
});

test('desk export bodies always carry an explicit nonempty selection', () => {
  const checkpoint = createRoundtripCheckpoint({ sessionId: 'session-1', ...urls, phase: 'desk', bundleText, deskRunIds: [deskRunId], expectedRunStatuses: [{ id: deskRunId, status: 'complete' }] });
  const body = deskExportBody(checkpoint);
  assert.deepEqual(body.deskRunIds, [deskRunId]);
  assert.deepEqual(body.hypothesisIds, ['hyp-1', 'hyp-2']);
  assert.deepEqual(body.evidenceIds, ['evidence-1']);
  const emptyBundle = JSON.stringify({ hypotheses: [], queries: [], modelRuns: [], evidence: [], artifacts: [] });
  const empty = createRoundtripCheckpoint({ sessionId: 'session-1', ...urls, phase: 'export', bundleText: emptyBundle });
  assert.throws(() => deskExportBody(empty), /refusing an empty export/);
  assert.throws(() => deskExportBody({ ...checkpoint, schema: 'other' }), TypeError);
});

test('return phase refuses a checkpoint without an explicit Desk run selection', async () => {
  const run = createBrowserRoundtripSuite({
    ...urls, part: 'return', sessionId: 'session-1',
    checkpoint: createRoundtripCheckpoint({ sessionId: 'session-1', ...urls, phase: 'desk', bundleText }),
  });
  await assert.rejects(async () => run({ browser: {}, page: { on() {}, off() {}, setViewportSize() {}, evaluate: async () => '' } }), /explicit Desk run selection/);
});
