import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RUN_RECORD_KINDS, RUN_RECORD_STATUSES, createRunRecord, createRunRegistry,
  artifactBytesFor, toForeignRun, toArtifactDescriptor,
} from '../src/run-records.js';
import { validateForeignModelRun, validateArtifactDescriptor, verifyArtifactFiles, exportResearchBundle } from '../src/research-exchange.js';

const base = { id: 'fit-1', kind: 'fit-run', modelId: 'box-oxygen', status: 'succeeded', createdAt: '2026-11-04T00:00:00Z', payload: { schema: 'bioprinting-workbench/fit-run/1', estimate: 0.5 } };

test('run records validate identity, kind and status without relabelling anything', () => {
  assert.throws(() => createRunRecord({ ...base, id: 'Bad Id' }), TypeError);
  assert.throws(() => createRunRecord({ ...base, kind: 'ghost-kind' }), RangeError);
  assert.throws(() => createRunRecord({ ...base, status: 'bogus' }), RangeError);
  assert.throws(() => createRunRecord({ ...base, createdAt: 'not-a-timestamp' }), TypeError);
  const record = createRunRecord({ ...base, status: 'unidentifiable', datasetRecordId: 'dataset-1' });
  assert.equal(record.status, 'unidentifiable'); // fit-specific status preserved, never coerced to failed
  assert.equal(record.datasetRecordId, 'dataset-1');
  assert.equal(record.artifactSha256, null);
  assert.ok(RUN_RECORD_KINDS.includes('study-run') && RUN_RECORD_STATUSES.includes('partial'));
});

test('the registry is bounded, evicts with an explicit notice and isolates mutations', () => {
  const registry = createRunRegistry({ max: 2 });
  const make = id => ({ ...base, id, status: 'partial' });
  registry.add(make('run-1'));
  registry.add(make('run-2'));
  const third = registry.add(make('run-3'));
  assert.equal(third.evicted.id, 'run-1');
  assert.deepEqual(registry.list().map(r => r.id), ['run-2', 'run-3']);
  assert.equal(registry.size(), 2);
  const listed = registry.list();
  listed[0].payload.estimate = 999;
  assert.equal(registry.get('run-2').payload.estimate, 0.5);
  registry.clear();
  assert.equal(registry.size(), 0);
  assert.throws(() => registry.add({ ...base, id: 'x y' }), TypeError);
});

test('toForeignRun passes the exchange validator and preserves statuses verbatim', () => {
  for (const status of RUN_RECORD_STATUSES) {
    const foreign = toForeignRun(createRunRecord({ ...base, id: `run-${status}`, status }));
    validateForeignModelRun(foreign);
    if (status === 'unidentifiable') {
      // The only translation: documented vocabulary mapping, with the native status in the note.
      assert.equal(foreign.status, 'unsupported-foreign');
      assert.match(foreign.note, /unidentifiable/);
    } else {
      assert.equal(foreign.status, status);
      assert.ok(!/failed/.test(foreign.note) || status === 'failed');
    }
  }
});

test('artifact descriptors hash exact bytes and verify through the exchange path', async () => {
  const record = createRunRecord({ ...base, id: 'study-1', kind: 'study-run', artifactFileName: 'study-1.json' });
  const bytes = artifactBytesFor(record);
  assert.ok(bytes.byteLength > 0);
  const descriptor = await toArtifactDescriptor(record);
  validateArtifactDescriptor(descriptor);
  assert.equal(descriptor.filename, 'study-1.json');
  assert.equal(descriptor.bytes, bytes.byteLength);
  assert.deepEqual(descriptor.provenance.modelRunIds, ['study-1']);
  const bundle = exportResearchBundle({ modelRuns: [toForeignRun(record)], artifacts: [descriptor] },
    { bundleId: 'bundle-run-1', createdAt: '2026-11-04T00:00:00Z', privacyClassification: 'private' });
  const verified = await verifyArtifactFiles(bundle, [{ filename: descriptor.filename, bytes }]);
  assert.equal(verified.failed.length, 0);
  const tampered = Uint8Array.from(bytes);
  tampered[0] ^= 0xff;
  const bad = await verifyArtifactFiles(bundle, [{ filename: descriptor.filename, bytes: tampered }]);
  assert.equal(bad.failed.length, 1);
  assert.throws(() => createRunRecord({ ...base, artifactFileName: '../escape.json' }), TypeError);
});