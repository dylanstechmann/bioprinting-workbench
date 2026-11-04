import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveResearchSelection, prepareSelectedResearchExport } from '../src/research-selection.js';
import { createRunRegistry } from '../src/run-records.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/research-exchange/roundtrip.json', import.meta.url)));
const context = { bundleId: 'bundle-selection', createdAt: '2026-11-03T12:00:00Z' };

test('query selection includes its hypothesis and missing references block export', () => {
  const resolved = resolveResearchSelection(fixture, { queryIds: [fixture.queries[0].id] });
  assert.ok(resolved.selection.hypothesisIds.includes(fixture.queries[0].hypothesisId));
  assert.equal(resolved.blockedReasons.length, 0);
  assert.ok(resolveResearchSelection(fixture, { hypothesisIds: ['missing'] }).blockedReasons.length);
  assert.throws(() => resolveResearchSelection(fixture, { queryIds: ['aa', 'aa'] }));
});

test('selected artifact export requires exact verified bytes', async () => {
  const selection = { artifactIds: [fixture.artifacts[0].id] };
  await assert.rejects(prepareSelectedResearchExport(fixture, selection, context), /Artifact bytes/);
  const result = await prepareSelectedResearchExport(fixture, selection, { ...context, files: [{
    filename: 'synthetic.json', bytes: readFileSync(new URL('./fixtures/research-exchange/synthetic.json', import.meta.url)),
  }] });
  assert.equal(result.bundle.artifacts.length, 1);
  assert.equal(result.files.length, 1);
});

test('native registry runs export verbatim with verified payload artifacts', async () => {
  const registry = createRunRegistry();
  const { record } = registry.add({
    id: 'sweep-slab-oxygen-1', kind: 'sweep-run', modelId: 'slab-oxygen', status: 'partial',
    createdAt: '2026-11-04T00:00:00Z', payload: { spec: { modelId: 'slab-oxygen' }, points: [] },
    artifactFileName: 'sweep-slab-oxygen-1.json',
  });
  const result = await prepareSelectedResearchExport(fixture, { modelRunIds: [record.id] }, {
    ...context, bundleId: 'bundle-registry', privacyClassification: 'selected-for-exchange', runRegistry: registry,
  });
  assert.equal(result.bundle.modelRuns.length, 1);
  assert.equal(result.bundle.modelRuns[0].status, 'partial'); // verbatim, never relabelled
  assert.equal(result.bundle.artifacts.length, 1);
  assert.equal(result.bundle.artifacts[0].provenance.modelRunIds[0], record.id);
  assert.equal(result.files.length, 1);
  assert.ok(result.addedDependencies.some(dep => dep.includes('native run payload')));
  // Without the registry the same selection is honestly blocked as missing, never silently dropped.
  await assert.rejects(prepareSelectedResearchExport(fixture, { modelRunIds: [record.id] }, context), /Missing/);
});