import test from 'node:test';
import assert from 'node:assert/strict';
import { createExplorationClient } from '../src/exploration-client.js';

class FakeWorker {
  constructor() { this.sent = []; this.terminated = false; this.onmessage = null; this.onerror = null; this.onmessageerror = null; FakeWorker.last = this; }
  postMessage(message) { this.sent.push(message); }
  terminate() { this.terminated = true; }
}
const spec = { modelId: 'slab-oxygen', baseInputs: { demand: 1, points: 21 }, axes: [{ path: 'demand', values: [0, 1] }], seed: 1 };

test('runs resolve from worker replies and progress flows through', async () => {
  const client = createExplorationClient({ workerFactory: () => new FakeWorker() });
  const progress = [];
  const promise = client.run(spec, { onProgress: p => progress.push(p) });
  const worker = FakeWorker.last;
  const { requestId } = worker.sent[0];
  worker.onmessage({ data: { requestId, kind: 'sweep-progress', progress: { completed: 1, failed: 0, total: 2 } } });
  worker.onmessage({ data: { requestId: requestId + 99, kind: 'sweep-run', status: 'ok', result: { stale: true } } });
  assert.equal(progress.length, 1);
  await assert.rejects(() => client.run(spec), /already running/);
  worker.onmessage({ data: { requestId, kind: 'sweep-run', status: 'ok', result: { status: 'succeeded', points: [] } } });
  const result = await promise;
  assert.equal(result.status, 'succeeded');
  client.dispose();
});

test('cancel terminates the worker and stale replies never publish', async () => {
  const client = createExplorationClient({ workerFactory: () => new FakeWorker() });
  const promise = client.run(spec);
  const worker = FakeWorker.last;
  const { requestId } = worker.sent[0];
  client.cancel();
  await assert.rejects(() => promise, err => err.name === 'AbortError');
  assert.equal(worker.terminated, true);
  // stale reply from a replaced worker must be ignored without throwing
  worker.onmessage({ data: { requestId, kind: 'sweep-run', status: 'ok', result: { stale: true } } });
  const second = client.run(spec);
  const next = FakeWorker.last;
  assert.notEqual(next, worker);
  next.onmessage({ data: { requestId: next.sent[0].requestId, kind: 'sweep-run', status: 'ok', result: { status: 'succeeded' } } });
  assert.equal((await second).status, 'succeeded');
  client.dispose();
});

test('timeouts and worker failures reject explicitly and disable further runs', async () => {
  const client = createExplorationClient({ workerFactory: () => new FakeWorker(), timeoutMs: 20 });
  const promise = client.run(spec);
  await assert.rejects(() => promise, /timed out/);
  assert.equal(FakeWorker.last.terminated, true);

  const failing = createExplorationClient({ workerFactory: () => new FakeWorker() });
  const pending = failing.run(spec);
  FakeWorker.last.onerror();
  await assert.rejects(() => pending, /unavailable/);
  await assert.rejects(() => failing.run(spec), /unavailable/);

  const broken = createExplorationClient({ workerFactory: () => { throw new Error('no worker'); } });
  await assert.rejects(() => broken.run(spec), /could not start/);
  broken.dispose();
});

test('malformed replies are rejected as worker failure and disposal is final', async () => {
  const client = createExplorationClient({ workerFactory: () => new FakeWorker() });
  const promise = client.run(spec);
  FakeWorker.last.onmessageerror();
  await assert.rejects(() => promise, /malformed/);
  client.dispose();
  await assert.rejects(() => client.run(spec), /disposed/);
  assert.throws(() => createExplorationClient({ timeoutMs: 0 }), RangeError);
});
