import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSweepSpec, enumerateSweepPoints, runParameterSweep, summarizeSensitivity,
  compareSweepRuns, MAX_SWEEP_POINTS,
} from '../src/model-exploration.js';
import { evaluateDomainModel } from '../src/model-adapters.js';

const slabSpec = values => ({ modelId: 'slab-oxygen', baseInputs: { demand: 1, points: 21 }, axes: [{ path: 'demand', values }], seed: 1 });

test('sweep specs enforce declared bounds, explicit values and point caps', () => {
  const ok = validateSweepSpec(slabSpec([0, 1, 2]));
  assert.equal(ok.modelId, 'slab-oxygen');
  assert.throws(() => validateSweepSpec({ ...slabSpec([0, 1]), axes: [{ path: 'ghost', values: [0, 1] }] }), RangeError);
  assert.throws(() => validateSweepSpec({ modelId: 'box-oxygen', baseInputs: { settings: { model: 'steady-3d-box-constant-consumption', demand: 1, resolution: 9, boundaryMode: 'all-faces' } }, axes: [{ path: 'settings.boundaryMode', values: ['all-faces', 'slab-x'] }], seed: 0 }), /numeric/);
  assert.throws(() => validateSweepSpec({ modelId: 'box-oxygen', baseInputs: { settings: { model: 'steady-3d-box-constant-consumption', demand: 1, resolution: 9, boundaryMode: 'all-faces' } }, axes: [{ path: 'settings.resolution', values: [9, 25] }], seed: 0 }), /enum|resolution/);
  assert.throws(() => validateSweepSpec(slabSpec([0])), RangeError);
  assert.throws(() => validateSweepSpec(slabSpec([0, 0])), RangeError);
  assert.throws(() => validateSweepSpec(slabSpec([0, 3])), RangeError);
  assert.throws(() => validateSweepSpec(slabSpec([0, NaN])), RangeError);
  assert.throws(() => validateSweepSpec({ ...slabSpec([0, 1]), seed: 1.5 }), RangeError);
  assert.throws(() => validateSweepSpec({ ...slabSpec([0, 1]), seed: -1 }), RangeError);
  assert.throws(() => validateSweepSpec({ modelId: 'storyboard', baseInputs: { time: 1, parameters: {} }, axes: [{ path: 'time', values: [0, 1] }], seed: 0, extra: 1 }), TypeError);
});

test('two-axis sweeps cap total points and box-oxygen has stricter limits', () => {
  const twoAxis = { modelId: 'slab-oxygen', baseInputs: { demand: 1, points: 21 }, axes: [{ path: 'demand', values: [0, 1, 2] }, { path: 'points', values: [21, 41] }], seed: 0 };
  assert.equal(enumerateSweepPoints(twoAxis).length, 6);
  const tooManyValues = { modelId: 'slab-oxygen', baseInputs: { demand: 1, points: 21 }, axes: [{ path: 'demand', values: [0, .125, .25, .5, .75, 1, 1.25, 1.5, 1.75, 2, 2.25] }], seed: 0 };
  assert.throws(() => validateSweepSpec(tooManyValues), /2\.\.10 explicit values/);
  // 10 x 10 values is exactly the total cap and is allowed; no axis can legally exceed it
  const boundary = { modelId: 'slab-oxygen', baseInputs: { demand: 1, points: 21 }, axes: [{ path: 'demand', values: [0, .125, .25, .5, .75, 1, 1.25, 1.5, 1.75, 2] }, { path: 'points', values: [21, 41, 61, 81, 101, 121, 141, 161, 181, 201] }], seed: 0 };
  assert.equal(enumerateSweepPoints(boundary).length, MAX_SWEEP_POINTS);
  const boxOk = { modelId: 'box-oxygen', baseInputs: { settings: { model: 'steady-3d-box-constant-consumption', demand: 1, resolution: 9, boundaryMode: 'all-faces' } }, axes: [{ path: 'settings.demand', values: [0, 1, 2] }], seed: 0 };
  assert.equal(validateSweepSpec(boxOk).axes.length, 1);
  // 30 points against the box-specific 25-point cap, via a synthetic registry with wide numeric fields
  const wideBox = structuredClone(boxOk);
  wideBox.axes = [{ path: 'settings.demand', values: [0, .5, 1, 1.5, 2] }, { path: 'settings.resolution', values: [9, 17] }];
  const registry = [{
    id: 'box-oxygen', supportedOperations: ['evaluate', 'sweep'],
    inputDefinitions: {
      'settings.demand': { unit: '1', type: 'number', min: 0, max: 2, nullable: false, values: null },
      'settings.resolution': { unit: 'count', type: 'integer', min: 9, max: 33, nullable: false, values: null },
    },
  }];
  wideBox.axes[1].values = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  assert.throws(() => validateSweepSpec(wideBox, registry), /25 points/);
  assert.throws(() => validateSweepSpec({ ...boxOk, baseInputs: { settings: { ...boxOk.baseInputs.settings, resolution: 25 } } }), /resolution <= 17/);
});

test('enumeration is deterministic, ordered and never shares mutable inputs', () => {
  const spec = { modelId: 'slab-oxygen', baseInputs: { demand: 1, points: 21 }, axes: [{ path: 'demand', values: [0, 1] }, { path: 'points', values: [21, 41] }], seed: 0 };
  const points = enumerateSweepPoints(spec);
  assert.deepEqual(points.map(p => p.values), [
    { demand: 0, points: 21 }, { demand: 0, points: 41 }, { demand: 1, points: 21 }, { demand: 1, points: 41 },
  ]);
  points[0].inputs.demand = 999;
  assert.equal(enumerateSweepPoints(spec)[0].inputs.demand, 0);
  assert.deepEqual(spec.baseInputs, { demand: 1, points: 21 });
});

test('the runner retains per-point failures, honors cancellation and reports progress', async () => {
  const seen = [];
  const evaluate = inputs => {
    if (inputs.demand === 1) throw new RangeError('point out of domain');
    return evaluateDomainModel('slab-oxygen', inputs);
  };
  const partial = await runParameterSweep(slabSpec([0, 1, 2]), { evaluate, onProgress: p => seen.push(p) });
  assert.equal(partial.status, 'partial');
  assert.equal(partial.points.length, 3);
  assert.equal(partial.points[1].status, 'failed');
  assert.match(partial.points[1].error, /point out of domain/);
  assert.deepEqual(seen.map(p => p.completed), [1, 2, 3]);
  assert.equal(seen[2].failed, 1);

  const controller = new AbortController();
  const cancelling = runParameterSweep(slabSpec([0, .5, 1, 1.5, 2]), {
    evaluate: inputs => { controller.abort(); return evaluateDomainModel('slab-oxygen', inputs); },
    signal: controller.signal,
  });
  const cancelled = await cancelling;
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.points.length, 1);
});

test('compareSweepRuns aligns equal specs and reports same-unit numeric deltas', async () => {
  const evaluate = inputs => evaluateDomainModel('slab-oxygen', inputs);
  const a = await runParameterSweep(slabSpec([0, 1, 2]), { evaluate });
  const b = await runParameterSweep(slabSpec([0, 1, 2]), { evaluate });
  const comparison = compareSweepRuns(a, b, { idA: 'a', idB: 'b' });
  assert.equal(comparison.modelId, 'slab-oxygen');
  assert.deepEqual(comparison.runIds, ['a', 'b']);
  const centerRows = comparison.deltas.filter(r => r.path === 'center');
  assert.equal(centerRows.length, 3);
  for (const row of centerRows) {
    assert.equal(row.delta, 0);
    assert.ok(Number.isFinite(row.a) && Number.isFinite(row.b));
    assert.equal(row.unit, '1');
    assert.ok(row.values && typeof row.values === 'object');
  }
});

test('compareSweepRuns rejects misaligned runs and keeps failed points as null rows', async () => {
  const evaluate = inputs => evaluateDomainModel('slab-oxygen', inputs);
  const a = await runParameterSweep(slabSpec([0, 1, 2]), { evaluate });
  const otherAxis = await runParameterSweep({ ...slabSpec([0, 1, 2]), axes: [{ path: 'points', values: [21, 41, 61] }] }, { evaluate });
  assert.throws(() => compareSweepRuns(a, otherAxis), RangeError);
  assert.throws(() => compareSweepRuns(a, { ...otherAxis, spec: { ...otherAxis.spec, axes: a.spec.axes, modelId: 'storyboard' } }), RangeError);
  assert.throws(() => compareSweepRuns(a, { ...otherAxis, spec: { ...otherAxis.spec, axes: a.spec.axes }, points: otherAxis.points.slice(0, 1) }), RangeError);
  // Units that disagree are never converted: the delta is null while both values stay visible.
  const forged = structuredClone(a);
  forged.points[0].run.quantities.center = { value: 0.25, unit: 'count' };
  const mismatched = compareSweepRuns(a, forged);
  const row = mismatched.deltas.find(r => r.path === 'center' && r.index === 0);
  assert.equal(row.delta, null);
  assert.equal(row.b, 0.25);
  assert.ok(Number.isFinite(row.a));
  // A failed point on one side yields null for that side and a null delta, never a dropped row.
  const partial = structuredClone(a);
  partial.points[1] = { ...partial.points[1], status: 'failed', run: null, error: 'injected failure' };
  const cmp = compareSweepRuns(a, partial);
  const failedRow = cmp.deltas.find(r => r.path === 'center' && r.index === 1);
  assert.ok(Number.isFinite(failedRow.a));
  assert.equal(failedRow.b, null);
  assert.equal(failedRow.delta, null);
});

test('comparison rows are deterministic, sorted and bounded', () => {
  const makeRun = () => ({
    spec: slabSpec([0, 1]), status: 'done', summary: null,
    points: [0, 1].map(i => ({
      index: i, values: { demand: i }, status: 'succeeded', error: null,
      run: { status: 'succeeded', quantities: Object.fromEntries(Array.from({ length: 30 }, (_, k) => [`q${String(k).padStart(2, '0')}`, { value: i + k, unit: '1' }])) },
    })),
  });
  const comparison = compareSweepRuns(makeRun(), makeRun());
  assert.equal(comparison.deltas.length, 60); // 30 outputs x 2 points
  assert.deepEqual(comparison.deltas.slice(0, 4).map(r => [r.path, r.index]), [['q00', 0], ['q00', 1], ['q01', 0], ['q01', 1]]);
  const oversized = makeRun();
  oversized.points[0].run.quantities = Object.fromEntries(Array.from({ length: 600 }, (_, k) => [`o${k}`, { value: 1, unit: '1' }]));
  const alsoOversized = makeRun();
  alsoOversized.points[0].run.quantities = structuredClone(oversized.points[0].run.quantities);
  assert.throws(() => compareSweepRuns(oversized, alsoOversized), /bounded|rows/i);
});

test('identical inputs give identical outputs and summaries carry no ranking claims', async () => {
  const evaluate = inputs => evaluateDomainModel('slab-oxygen', inputs);
  const a = await runParameterSweep(slabSpec([0, 1, 2]), { evaluate });
  const b = await runParameterSweep(slabSpec([0, 1, 2]), { evaluate });
  assert.deepEqual(a.points.map(p => p.run.quantities.center.value), b.points.map(p => p.run.quantities.center.value));
  const summary = summarizeSensitivity(a);
  const centerRange = summary.ranges.find(r => r.path === 'center');
  assert.equal(centerRange.unit, '1');
  assert.equal(centerRange.count, 3);
  const slope = summary.sensitivities.find(s => s.outputPath === 'center');
  assert.ok(Number.isFinite(slope.slope));
  assert.ok(slope.slope < 0, 'higher demand lowers center concentration');
  assert.match(summary.notice, /No probability, causal effect, viability or efficacy/);
  for (const entry of summary.sensitivities) assert.ok(!('ranking' in entry));
});
