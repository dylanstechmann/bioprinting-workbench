import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatasetRecord, verifyDatasetRecord, buildFitRun, recordFitApplication } from '../src/measurement-provenance.js';
import { calibrationExample, fitSlabDemand } from '../src/calibration.js';
import { sha256Bytes } from '../src/model-provenance.js';

const encode = text => new TextEncoder().encode(text);
const importedAt = '2026-11-03T12:00:00Z';
const create = rawBytes => createDatasetRecord({ id: 'dataset-one', modelId: 'slab-oxygen', rawBytes, importedAt });

test('original bytes and normalized content have independent immutable provenance', async () => {
  const text = calibrationExample();
  const a = await create(encode(text));
  const b = await create(encode(JSON.stringify(JSON.parse(text))));
  assert.notEqual(a.rawSha256, b.rawSha256);
  assert.equal(a.normalizedSha256, b.normalizedSha256);
  assert.equal(a.declaredDataKind, 'synthetic');
  assert.throws(() => { a.normalizedInput.measurements[0].center = 99; });
  assert.deepEqual(await verifyDatasetRecord(a, encode(text)), { rawAvailable: true, normalizedMatches: true, rawMatches: true });
  assert.equal((await verifyDatasetRecord(a)).rawMatches, null);
  const tampered = structuredClone(a);
  tampered.normalizedInput.measurements[0].center += 0.1;
  assert.equal((await verifyDatasetRecord(tampered)).normalizedMatches, false);
});

test('receipt metadata agrees with the normalized input before a fit can use it', async () => {
  const dataset = await create(encode(calibrationExample()));
  const changes = {
    inputSchema: 'unrelated-schema',
    declaredDataKind: 'user-declared-measured',
    units: 'percent',
    measurementCount: dataset.measurementCount + 1,
    source: { ...dataset.source, citation: 'Unrelated citation' },
  };
  for (const [field, value] of Object.entries(changes)) {
    const modified = { ...dataset, [field]: value };
    assert.equal((await verifyDatasetRecord(modified)).normalizedMatches, false, field);
  }
  const relabeled = { ...dataset, declaredDataKind: changes.declaredDataKind };
  const native = { ...fitSlabDemand(dataset.normalizedInput), dataKind: changes.declaredDataKind };
  await assert.rejects(buildFitRun({ id: 'fit-one', dataset: relabeled, settingsSnapshot: { demand: 1 },
    implementationSha256: null, startedAt: importedAt, finishedAt: importedAt }, native), /metadata changed/);
});

test('original byte verification also binds the same normalized dataset', async () => {
  const input = JSON.parse(calibrationExample());
  const dataset = await create(encode(calibrationExample()));
  const reformatted = encode(JSON.stringify(input));
  assert.equal((await verifyDatasetRecord(dataset, reformatted)).rawMatches, false);

  input.measurements[0].center += 0.1;
  const unrelated = encode(JSON.stringify(input));
  const mixedReceipt = { ...dataset, rawSha256: await sha256Bytes(unrelated) };
  assert.deepEqual(await verifyDatasetRecord(mixedReceipt, unrelated), {
    rawAvailable: true, normalizedMatches: true, rawMatches: false,
  });
  const invalidUtf8 = Uint8Array.of(0xff);
  const malformedReceipt = { ...dataset, rawSha256: await sha256Bytes(invalidUtf8) };
  assert.equal((await verifyDatasetRecord(malformedReceipt, invalidUtf8)).rawMatches, false);
  await assert.rejects(verifyDatasetRecord(dataset, new Uint8Array(256 * 1024 + 1)), /256 KiB/);
});

test('fit records retain native arithmetic, declaration and explicit unapplied status', async () => {
  const dataset = await create(encode(calibrationExample()));
  const native = fitSlabDemand(dataset.normalizedInput);
  const record = await buildFitRun({ id: 'fit-one', dataset, settingsSnapshot: { demand: 1 },
    implementationSha256: null, startedAt: importedAt, finishedAt: importedAt }, native);
  assert.equal(record.estimate, native.q);
  assert.equal(record.applied, false);
  assert.equal(record.residualMetric.value, native.residualStd);
  assert.equal(record.datasetSha256, dataset.normalizedSha256);
  const applied = recordFitApplication(record, { appliedAt: importedAt, previousDemand: 1, demand: record.estimate });
  assert.equal(record.applied, false);
  assert.equal(applied.applied, true);
  assert.equal(applied.application.previousDemand, 1);
  assert.throws(() => { applied.application.demand = 0; });
  assert.throws(() => recordFitApplication(record, { appliedAt: importedAt, previousDemand: 1, demand: 0 }), /estimate/);
  assert.throws(() => recordFitApplication({ ...record, status: 'out-of-domain' }, { appliedAt: importedAt, previousDemand: 1, demand: record.estimate }), /succeeded/);
  await assert.rejects(create(new Uint8Array(256 * 1024 + 1)), /256 KiB/);
});
