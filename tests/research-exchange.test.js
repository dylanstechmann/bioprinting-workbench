import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseResearchBundle, validateResearchBundle, verifyArtifactFiles, previewResearchImport,
  applyResearchImport, exportResearchBundle, emptyExchangeState, EXCHANGE_SCHEMA,
} from '../src/research-exchange.js';
import { canonicalJsonBytes, sha256Canonical, CANONICALIZATION } from '../src/model-provenance.js';

const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/research-exchange/${name}`, import.meta.url), 'utf8'));
const artifactBytes = () => new Uint8Array(readFileSync(new URL('./fixtures/research-exchange/synthetic.json', import.meta.url)));

test('shared ancestors form a valid diamond, not a cycle', () => {
  const bundle = fixture('minimal.json');
  const template = bundle.hypotheses[0];
  bundle.hypotheses = ['root', 'left', 'right', 'leaf'].map(id => ({ ...structuredClone(template), id }));
  bundle.hypotheses[1].parentHypothesisIds = ['root'];
  bundle.hypotheses[2].parentHypothesisIds = ['root'];
  bundle.hypotheses[3].parentHypothesisIds = ['left', 'right'];
  assert.equal(validateResearchBundle(bundle).hypotheses.length, 4);
  bundle.hypotheses[0].parentHypothesisIds = ['leaf'];
  assert.throws(() => validateResearchBundle(bundle), /acyclic/);
});

test('duplicate record IDs are rejected in every exchange group', () => {
  for (const group of ['queries', 'modelRuns', 'evidence']) {
    const bundle = fixture('roundtrip.json');
    assert.ok(bundle[group].length, group);
    bundle[group].push(structuredClone(bundle[group][0]));
    assert.throws(() => validateResearchBundle(bundle), /Duplicate/);
  }
});

test('forged preview cannot suppress a real conflict', async () => {
  const initial = fixture('minimal.json');
  const empty = emptyExchangeState();
  const state = await applyResearchImport(await previewResearchImport(initial, empty), empty, initial);
  const conflict = fixture('conflicts.json');
  const preview = await previewResearchImport(conflict, state);
  await assert.rejects(() => applyResearchImport({ ...preview, conflicts: [] }, state, conflict), /conflicts/);
});

test('minimal and roundtrip fixtures validate; invalid schema fails closed', () => {
  const minimal = validateResearchBundle(fixture('minimal.json'));
  assert.equal(minimal.schema, EXCHANGE_SCHEMA);
  const roundtrip = validateResearchBundle(fixture('roundtrip.json'));
  assert.equal(roundtrip.hypotheses.length, 2);
  assert.equal(roundtrip.modelRuns[0].status, 'unsupported-foreign');
  assert.throws(() => validateResearchBundle(fixture('invalid.json')), RangeError);
  assert.throws(() => parseResearchBundle('['.repeat(30) + ']'.repeat(30)), RangeError);
  assert.throws(() => parseResearchBundle('x'.repeat(6 * 1024 * 1024)), RangeError);
  assert.throws(() => parseResearchBundle('not json'), TypeError);
});

test('bundle validation rejects dangling references, cycles and prototype forgery', () => {
  const base = fixture('roundtrip.json');
  const dangling = structuredClone(base);
  dangling.queries[0].hypothesisId = 'ghost';
  assert.throws(() => validateResearchBundle(dangling), RangeError);
  const cyclic = structuredClone(base);
  cyclic.hypotheses[0].parentHypothesisIds = ['hyp-b'];
  assert.throws(() => validateResearchBundle(cyclic), RangeError);
  const dup = structuredClone(base);
  dup.hypotheses.push(structuredClone(dup.hypotheses[0]));
  assert.throws(() => validateResearchBundle(dup), RangeError);
  const forged = JSON.parse(JSON.stringify(base).replace('"hypotheses"', '"__proto__": {"x": 1}, "hypotheses"'));
  assert.throws(() => validateResearchBundle(forged), TypeError);
  const published = structuredClone(base);
  published.publicationReviewStatus = 'approved';
  assert.throws(() => validateResearchBundle(published), RangeError);
});

test('artifact verification hashes exact bytes and never trusts descriptors alone', async () => {
  const bundle = fixture('roundtrip.json');
  const good = await verifyArtifactFiles(bundle, [{ filename: 'synthetic.json', bytes: artifactBytes() }]);
  assert.deepEqual(good.verified, ['art-1']);
  assert.deepEqual(good.failed, []);
  const wrongBytes = await verifyArtifactFiles(bundle, [{ filename: 'synthetic.json', bytes: new Uint8Array([1, 2, 3]) }]);
  assert.equal(wrongBytes.failed[0].reason, 'size mismatch');
  const missing = await verifyArtifactFiles(bundle, []);
  assert.equal(missing.failed[0].reason, 'file not selected');
  const tampered = structuredClone(bundle);
  tampered.artifacts[0].sha256 = 'a'.repeat(64);
  const badHash = await verifyArtifactFiles(tampered, [{ filename: 'synthetic.json', bytes: artifactBytes() }]);
  assert.equal(badHash.failed[0].reason, 'hash mismatch');
});
test('preview is inert and classifies creates/duplicates/conflicts exactly', async () => {
  const bundle = fixture('minimal.json');
  const empty = emptyExchangeState();
  const first = await previewResearchImport(bundle, empty);
  assert.equal(first.conflicts.length, 0);
  assert.equal(first.creates.length, 1);
  assert.ok(first.warnings.some(w => /not-approved/.test(w)));
  const applied = await applyResearchImport(first, empty, bundle);
  assert.equal(applied.hypotheses.length, 1);
  const second = await previewResearchImport(bundle, applied);
  assert.deepEqual(second.duplicates, ['hypotheses:hyp-a']);
  assert.equal(second.creates.length, 0);
  const conflictBundle = fixture('conflicts.json');
  const conflict = await previewResearchImport(conflictBundle, applied);
  assert.deepEqual(conflict.conflicts, ['hypotheses:hyp-a']);
  await assert.rejects(() => applyResearchImport(conflict, applied, conflictBundle), /conflicts/);
  const again = await applyResearchImport(second, applied, bundle);
  assert.equal(again.hypotheses.length, 1);
});

test('stale previews reject and apply constructs new state without mutation', async () => {
  const bundle = fixture('minimal.json');
  const empty = emptyExchangeState();
  const preview = await previewResearchImport(bundle, empty);
  const changed = { ...emptyExchangeState(), evidence: [{ id: 'ev-x', statement: 's', sourceClass: 'unreviewed-lead', reviewState: 'unreviewed', locator: 'x', sourceId: null }] };
  await assert.rejects(() => applyResearchImport(preview, changed, bundle), /stale/);
  const tamperedPreview = { ...preview, bundleSha256: 'b'.repeat(64) };
  await assert.rejects(() => applyResearchImport(tamperedPreview, empty, bundle), /stale/);
  const original = emptyExchangeState();
  await applyResearchImport(preview, original, bundle);
  assert.equal(original.hypotheses.length, 0, 'apply never mutates the source state');
});

test('export is a validated subset with explicit privacy and never-approved publication', () => {
  const card = fixture('minimal.json').hypotheses[0];
  const exported = exportResearchBundle({ hypotheses: [card] }, { bundleId: 'bundle-export', createdAt: '2026-11-03T12:00:00Z', privacyClassification: 'selected-for-exchange' });
  assert.equal(exported.privacyClassification, 'selected-for-exchange');
  assert.equal(exported.publicationReviewStatus, 'not-approved');
  assert.throws(() => exportResearchBundle({ hypotheses: [card] }, { bundleId: 'BadId!', createdAt: '2026-11-03T12:00:00Z' }), TypeError);
  assert.throws(() => exportResearchBundle({ hypotheses: [{ ...card, note: 'secret' }] }, { bundleId: 'bundle-export', createdAt: '2026-11-03T12:00:00Z' }), TypeError);
});

test('cross-language golden digests match the Python adapter byte-for-byte', async () => {
  const golden = fixture('golden-digests.json');
  assert.equal(golden.canonicalizer, CANONICALIZATION);
  assert.equal(Buffer.from(canonicalJsonBytes(golden.vector.input)).toString('utf8'), golden.vector.canonical);
  assert.equal(await sha256Canonical(golden.vector.input), golden.vector.sha256);
  for (const [name, digest] of Object.entries(golden.fixtures)) {
    assert.equal(await sha256Canonical(fixture(name)), digest, `${name} canonical digest must match the Python side`);
  }
  const { createHash } = await import('node:crypto');
  for (const [name, digest] of Object.entries(golden.artifacts)) {
    const bytes = readFileSync(new URL(`./fixtures/research-exchange/${name}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), digest, `${name} exact-byte digest must match the Python side`);
  }
});
