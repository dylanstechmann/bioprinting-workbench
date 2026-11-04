import test from 'node:test';
import assert from 'node:assert/strict';
import { runConvergenceStudy, validateConvergenceStudySpec, compareRefinements, serializeStudyArtifact } from '../src/convergence-study.js';
import { OXYGEN_DEFAULTS } from '../src/oxygen3d.js';

const spec = { modelId: 'box-oxygen', settings: { ...OXYGEN_DEFAULTS, boundaryMode: 'slab-x' }, resolutions: [17, 9] };

test('bounded study composes native solves with analytic second-order errors', async () => {
  const progress = [];
  const result = await runConvergenceStudy(spec, { onProgress: p => progress.push(p) });
  assert.equal(result.status, 'succeeded');
  assert.deepEqual(result.samples.map(s => s.resolution), [9, 17]);
  assert.ok(result.comparisons[0].observedOrder > 1.95 && result.comparisons[0].observedOrder < 2.05);
  assert.deepEqual(progress, [{ completed: 1, total: 2 }, { completed: 2, total: 2 }]);
  assert.deepEqual(await runConvergenceStudy(spec), result);
});

test('all-faces studies do not claim analytic error or order', async () => {
  const result = await runConvergenceStudy({ ...spec, settings: OXYGEN_DEFAULTS });
  assert.equal(result.reference, 'grid-comparison');
  assert.ok(result.samples.every(s => s.errorInfinity === null));
  assert.equal(result.comparisons[0].observedOrder, null);
});

test('study artifacts serialize inspectable provenance without invented fields', async () => {
  const artifact = serializeStudyArtifact(await runConvergenceStudy({ ...spec, settings: OXYGEN_DEFAULTS, resolutions: [9, 17] }), { createdAt: '2026-11-04T00:00:00Z' });
  assert.equal(artifact.schema, 'bioprinting-workbench/convergence-study-artifact/1');
  assert.equal(artifact.modelId, 'box-oxygen');
  assert.equal(artifact.boundary, 'all-faces');
  assert.equal(artifact.reference, 'grid-comparison');
  assert.deepEqual(artifact.resolutions, [9, 17]);
  assert.ok(artifact.samples.every(s => s.errorInfinity === null));
  assert.ok(artifact.comparisons.every(c => c.observedOrder === null));
  assert.equal(artifact.status, 'succeeded');
  assert.deepEqual(artifact.notices.length > 0, true);
  const analytic = serializeStudyArtifact(await runConvergenceStudy({ ...spec, resolutions: [9, 17] }), { createdAt: '2026-11-04T00:00:00Z' });
  assert.equal(analytic.reference, 'analytic-slab-x');
  assert.ok(analytic.samples.every(s => Number.isFinite(s.errorInfinity)));
  assert.ok(analytic.comparisons.every(c => Number.isFinite(c.observedOrder)));
});

test('validation, cancellation and undefined orders fail explicitly', async () => {
  for (const resolutions of [[9], [9, 9], [8, 17], [9, 17, 25, 33, 41]]) {
    assert.throws(() => validateConvergenceStudySpec({ ...spec, resolutions }));
  }
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(runConvergenceStudy(spec, { signal: controller.signal }), { name: 'AbortError' });
  const zero = await runConvergenceStudy({ ...spec, settings: { ...spec.settings, demand: 0 } });
  assert.equal(zero.comparisons[0].observedOrder, null);
  assert.equal(compareRefinements([
    { resolution: 9, h: 2 / 9, center: 1, errorInfinity: 0.1, converged: false },
    { resolution: 17, h: 2 / 17, center: 1, errorInfinity: 0.01, converged: true },
  ], 'analytic-slab-x')[0].observedOrder, null);
});