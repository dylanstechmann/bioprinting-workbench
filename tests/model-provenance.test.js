import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  canonicalJsonBytes, sha256Bytes, sha256Canonical, validateModelRun,
  buildModelRun, verifyModelRun, projectQuantities, MODEL_RUN_SCHEMA,
} from '../src/model-provenance.js';
import { getDomainModel } from '../src/domain-models.js';
import { evaluateDomainModel } from '../src/model-adapters.js';

const golden = JSON.parse(readFileSync(new URL('./fixtures/model-provenance-v1.json', import.meta.url), 'utf8'));

function hex(bytes) { return [...bytes].map(b => b.toString(16).padStart(2, '0')).join(''); }

test('canonical golden vectors: exact bytes and independent SHA-256', async () => {
  for (const vector of golden.vectors) {
    const bytes = canonicalJsonBytes(vector.input);
    assert.equal(new TextDecoder().decode(bytes), vector.canonicalText, vector.name);
    assert.equal(hex(bytes), hex(Buffer.from(vector.canonicalText, 'utf8')), vector.name);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), vector.sha256, vector.name);
    assert.equal(await sha256Bytes(bytes), vector.sha256, vector.name);
  }
});

test('canonicalization is key-order independent and LF terminated exactly once', () => {
  const a = canonicalJsonBytes({ b: 1, a: { d: 4, c: 3 } });
  const b = canonicalJsonBytes({ a: { c: 3, d: 4 }, b: 1 });
  assert.deepEqual([...a], [...b]);
  assert.equal(a[a.length - 1], 10);
  assert.notEqual(a[a.length - 2], 10);
  const numericKeys = canonicalJsonBytes({ '10': 1, '9': 2, b: 3, a: 4 });
  assert.equal(new TextDecoder().decode(numericKeys), '{"10":1,"9":2,"a":4,"b":3}\n');
});

test('canonical JSON rejects dangerous and non-JSON values', () => {
  const cases = [
    () => canonicalJsonBytes({ a: undefined }),
    () => canonicalJsonBytes({ a: 1n }),
    () => canonicalJsonBytes({ a() {} }),
    () => canonicalJsonBytes({ a: NaN }),
    () => canonicalJsonBytes({ a: Infinity }),
    () => canonicalJsonBytes(new Float64Array(2)),
    () => canonicalJsonBytes([1, , 2]),
    () => canonicalJsonBytes(JSON.parse('{"__proto__":1}')),
  ];
  for (const fn of cases) assert.throws(fn, /Canonical JSON rejects/);
  const getter = {};
  Object.defineProperty(getter, 'a', { enumerable: true, get: () => 1 });
  assert.throws(() => canonicalJsonBytes(getter), TypeError);
  assert.throws(() => canonicalJsonBytes({ [Symbol('k')]: 1 }), TypeError);
  assert.throws(() => canonicalJsonBytes(Object.defineProperty({}, 'hidden', { value: 1 })), TypeError);
  assert.throws(() => canonicalJsonBytes({ a: '\ud800' }), TypeError);
});

test('canonical JSON rejects cycles but tolerates shared noncyclic references', () => {
  const shared = { x: 1 };
  assert.equal(new TextDecoder().decode(canonicalJsonBytes({ a: shared, b: shared })), '{"a":{"x":1},"b":{"x":1}}\n');
  const cyclic = { a: 1 };
  cyclic.self = cyclic;
  assert.throws(() => canonicalJsonBytes(cyclic), TypeError);
  const deep = {};
  let cursor = deep;
  for (let i = 0; i < 40; i++) { cursor.next = {}; cursor = cursor.next; }
  assert.throws(() => canonicalJsonBytes(deep), RangeError);
});

test('sha256Bytes respects views and rejects non-buffers', async () => {
  const backing = new Uint8Array([9, 9, 104, 105, 9]);
  const view = backing.subarray(2, 4);
  assert.equal(await sha256Bytes(view), createHash('sha256').update(Buffer.from('hi')).digest('hex'));
  assert.deepEqual([...backing], [9, 9, 104, 105, 9]);
  await assert.rejects(() => sha256Bytes(new ArrayBuffer(4)), TypeError);
  await assert.rejects(() => sha256Bytes([1, 2]), TypeError);
  await assert.rejects(() => sha256Bytes('x'), TypeError);
});
const TIMES = { startedAt: '2026-11-03T12:00:00Z', finishedAt: '2026-11-03T12:00:01Z' };
const FAKE_DIGEST = 'f'.repeat(64);
const manifestFor = id => ({ schema: 'bioprinting-workbench/model-provenance/1', canonicalization: 'sorted-json-lf/1', models: [{ id, version: 1, roots: ['src/model-adapters.js'], files: [], implementationSha256: FAKE_DIGEST }] });
const divisionInputs = { settings: { model: 'idealized-relative-doubling', doublings: 3, hypotheticalDoublingHours: null } };

test('buildModelRun pins provenance from a manifest or labels it incomplete', async () => {
  const evaluation = evaluateDomainModel('relative-division', divisionInputs);
  const pinned = await buildModelRun({ id: 'run-0001', modelId: 'relative-division', inputs: divisionInputs, ...TIMES, manifest: manifestFor('relative-division') }, evaluation);
  assert.equal(pinned.provenanceStatus, 'pinned');
  assert.equal(pinned.implementationSha256, FAKE_DIGEST);
  assert.equal(pinned.inputSha256, await sha256Canonical(divisionInputs));
  assert.equal(pinned.outputs.relativePopulation.value, 8);
  assert.equal(pinned.outputs.hypotheticalElapsedHours.value, null);
  assert.match(pinned.outputs.hypotheticalElapsedHours.missingReason, /doubling time/i);
  const incomplete = await buildModelRun({ id: 'run-0002', modelId: 'relative-division', inputs: divisionInputs, ...TIMES, manifest: null }, evaluation);
  assert.equal(incomplete.provenanceStatus, 'incomplete');
  assert.equal(incomplete.implementationSha256, null);
  const noManifestEntry = await buildModelRun({ id: 'run-0003', modelId: 'relative-division', inputs: divisionInputs, ...TIMES, manifest: manifestFor('storyboard') }, evaluation);
  assert.equal(noManifestEntry.provenanceStatus, 'incomplete');
});

test('run quantities are derived and complete for succeeded runs', async () => {
  const evaluation = evaluateDomainModel('relative-division', { settings: { model: 'idealized-relative-doubling', doublings: 2, hypotheticalDoublingHours: 24 } }, { runId: 'run-0009' });
  for (const q of Object.values(evaluation.quantities)) assert.equal(q.origin, 'derived');
  const run = await buildModelRun({ id: 'run-0009', modelId: 'relative-division', inputs: divisionInputs, ...TIMES, manifest: manifestFor('relative-division') }, evaluation);
  assert.equal(run.outputs.hypotheticalElapsedHours.value, 48);
  assert.equal(run.outputs.hypotheticalElapsedHours.unit, 'h');
  assert.equal(run.outputs.relativePopulation.unit, 'relative-population');
});

test('verifyModelRun detects input tampering and manifest mismatch', async () => {
  const evaluation = evaluateDomainModel('slab-oxygen', { demand: 0.5, points: 41 });
  const manifest = manifestFor('slab-oxygen');
  const run = await buildModelRun({ id: 'run-0010', modelId: 'slab-oxygen', inputs: { demand: 0.5, points: 41 }, ...TIMES, manifest }, evaluation);
  const good = await verifyModelRun(run, manifest);
  assert.deepEqual(good, { inputMatches: true, implementationMatches: true, provenanceStatus: 'pinned' });
  const tampered = { ...run, inputSnapshot: { ...run.inputSnapshot, demand: 0.6 } };
  assert.equal((await verifyModelRun(tampered, manifest)).inputMatches, false);
  assert.equal((await verifyModelRun(run, manifestFor('box-oxygen'))).implementationMatches, false);
});
test('failed and cancelled runs carry empty outputs and reasons', async () => {
  const evaluation = evaluateDomainModel('slab-oxygen', { demand: 0.5, points: 41 });
  for (const status of ['cancelled', 'failed']) {
    const run = await buildModelRun({ id: `run-${status}`, modelId: 'slab-oxygen', inputs: { demand: 0.5, points: 41 }, ...TIMES, manifest: null }, { ...evaluation, status, diagnostics: ['stopped'] });
    assert.deepEqual(run.outputs, {});
    assert.deepEqual(run.diagnostics, ['stopped']);
    assert.equal(run.provenanceStatus, 'incomplete');
  }
});

test('validateModelRun enforces structure without verifying digests', () => {
  const center = { value: 0.5, unit: '1', origin: 'derived', sourceIds: [], uncertainty: null, missingReason: null };
  const boundary = { value: 1, unit: '1', origin: 'derived', sourceIds: [], uncertainty: null, missingReason: null };
  const base = {
    schema: MODEL_RUN_SCHEMA, id: 'run-0020', modelId: 'slab-oxygen', modelVersion: 1,
    inputSnapshot: { demand: 1, points: 41 }, inputSha256: 'a'.repeat(64), implementationSha256: null,
    provenanceStatus: 'incomplete', ...TIMES, status: 'succeeded',
    outputs: { center, boundary }, diagnostics: [], sourceIds: [], notices: [],
  };
  assert.equal(validateModelRun(base).id, 'run-0020');
  assert.throws(() => validateModelRun({ ...base, provenanceStatus: 'pinned' }), RangeError);
  assert.throws(() => validateModelRun({ ...base, implementationSha256: FAKE_DIGEST }), RangeError);
  assert.throws(() => validateModelRun({ ...base, status: 'cancelled', outputs: { center } }), RangeError);
  assert.throws(() => validateModelRun({ ...base, outputs: { ghost: center } }), RangeError);
  assert.throws(() => validateModelRun({ ...base, outputs: { center } }), RangeError);
  assert.throws(() => validateModelRun({ ...base, finishedAt: '2026-11-03T11:00:00Z' }), RangeError);
  assert.throws(() => validateModelRun({ ...base, startedAt: 'yesterday' }), TypeError);
  assert.throws(() => validateModelRun({ ...base, schema: 'other/1' }), RangeError);
  assert.throws(() => validateModelRun({ ...base, outputs: { center: { ...center, origin: 'user-declared-measured' }, boundary } }), RangeError);
});

test('projectQuantities preserves legit nulls with specific reasons and never upgrades origins', () => {
  const definition = getDomainModel('vascular-supply');
  const nonlimiting = evaluateDomainModel('vascular-supply', {
    record: { settings: { diffusivityD_m2PerS: 2e-9, consumptionM_molPerM3S: 1e-6, inletC0_molPerM3: 0.13, channelRadiusUm: 100 }, parameterOrigin: 'hypothetical-controls' },
  });
  assert.equal(nonlimiting.status, 'succeeded');
  assert.equal(nonlimiting.result.computed.kroghCriticalRadiusUm, null);
  const quantities = projectQuantities(definition, nonlimiting.result);
  assert.equal(quantities['computed.kroghCriticalRadiusUm'].value, null);
  assert.match(quantities['computed.kroghCriticalRadiusUm'].missingReason, /10 mm cap/);
  assert.equal(quantities['computed.planarLimitUm'].value > 0, true);
  assert.equal(quantities['computed.planarLimitUm'].origin, 'hypothetical');
});
