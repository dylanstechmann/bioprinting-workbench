import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDomainModel, getModelAdapter, classifyBoxResult, classifyFlowResult, classifyNozzleResult } from '../src/model-adapters.js';
import { sample, DEFAULTS } from '../src/model.js';
import { oxygenProfile } from '../src/oxygen.js';
import { solveOxygen3D } from '../src/oxygen3d.js';
import { solveFlowNetwork, createTeachingNetwork } from '../src/flow.js';
import { evaluateNozzleShear } from '../src/nozzle-shear.js';
import { evaluateVascularSupply, defaultVascularSupply } from '../src/vascular-supply.js';
import { evaluateRelativeDivision } from '../src/cell-division.js';

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    for (const v of Object.values(value)) deepFreeze(v);
    Object.freeze(value);
  }
  return value;
}

test('storyboard adapter is a direct-call identity across boundary times', () => {
  for (const time of [0, 2.5, 4.999, 10, -5]) {
    const inputs = { time, parameters: { ...DEFAULTS } };
    const evaluation = evaluateDomainModel('storyboard', inputs);
    assert.equal(evaluation.status, 'succeeded');
    assert.deepEqual(evaluation.result, sample(time, { ...DEFAULTS }));
    assert.equal(evaluation.result.stage, Math.floor(Math.max(0, Math.min(4.999, time))));
    for (const q of Object.values(evaluation.quantities)) assert.equal(q.origin, 'synthetic');
  }
});

test('slab adapter is a direct-call identity and preserves native error behavior', () => {
  for (const [demand, points] of [[0.6, 41], [2, 3], [0, 1001]]) {
    const evaluation = evaluateDomainModel('slab-oxygen', { demand, points });
    assert.deepEqual(evaluation.result, oxygenProfile(demand, points));
    assert.equal(evaluation.status, 'succeeded');
  }
  assert.throws(() => evaluateDomainModel('slab-oxygen', { demand: 3, points: 41 }), RangeError);
  assert.throws(() => evaluateDomainModel('slab-oxygen', { demand: 0.5, points: 40 }), RangeError);
  assert.throws(() => oxygenProfile(3, 41), RangeError);
});

test('box adapter is a direct-call identity including typed arrays and classifies flags', () => {
  for (const settings of [
    { model: 'steady-3d-box-constant-consumption', demand: 1, resolution: 9, boundaryMode: 'all-faces' },
    { model: 'steady-3d-box-constant-consumption', demand: 1.5, resolution: 9, boundaryMode: 'slab-x' },
    { model: 'steady-3d-box-constant-consumption', demand: 1, resolution: 17, boundaryMode: 'all-faces' },
  ]) {
    const direct = solveOxygen3D(settings);
    const evaluation = evaluateDomainModel('box-oxygen', { settings });
    assert.deepEqual(evaluation.result, direct);
    assert.equal(evaluation.result.values instanceof Float64Array, true);
    assert.equal(evaluation.status, classifyBoxResult(direct));
    // result copy: mutating the evaluation values must not touch a fresh direct call
    evaluation.result.values[0] = -99;
    assert.notEqual(solveOxygen3D(settings).values[0], -99);
  }
  assert.throws(() => evaluateDomainModel('box-oxygen', { settings: { model: 'steady-3d-box-constant-consumption', demand: 1, resolution: 13, boundaryMode: 'all-faces' } }), RangeError);
});

test('flow adapter is a direct-call identity for teaching, reversed and custom graphs', () => {
  const teaching = createTeachingNetwork({ enabled: true, pressureDrive: 0.7, branchResistances: [1, 2, 3] });
  const reversed = {
    model: 'dimensionless-linear-resistance-network',
    nodes: [{ id: 'a', position: [0, 0, 0], boundaryPressure: 0 }, { id: 'b', position: [1, 0, 0], boundaryPressure: 1 }],
    edges: [{ id: 'e', from: 'a', to: 'b', resistance: 2 }],
  };
  for (const network of [teaching, reversed]) {
    const evaluation = evaluateDomainModel('flow-resistance', { network });
    assert.deepEqual(evaluation.result, solveFlowNetwork(network));
    assert.equal(evaluation.status, 'succeeded');
    for (const q of Object.values(evaluation.quantities)) assert.equal(q.origin, 'synthetic');
  }
  const unanchored = {
    model: 'dimensionless-linear-resistance-network',
    nodes: [{ id: 'a', position: [0, 0, 0] }, { id: 'b', position: [1, 0, 0] }],
    edges: [{ id: 'e', from: 'a', to: 'b', resistance: 1 }],
  };
  assert.throws(() => evaluateDomainModel('flow-resistance', { network: unanchored }), RangeError);
  assert.throws(() => solveFlowNetwork(unanchored), RangeError);
});

test('nozzle adapter pins explicit density and is a direct-call identity in both modes', () => {
  const cases = [
    [{ diameterUm: 400, flowMm3PerS: 10, viscosityMode: 'hypothetical-constant', viscosityPas: 3 }, 1000],
    [{ diameterUm: 400, flowMm3PerS: 10, viscosityMode: 'cited-cellink-fit', viscosityPas: 1 }, 1000],
    [{ diameterUm: 200, flowMm3PerS: 0.5, viscosityMode: 'hypothetical-constant', viscosityPas: 0.05 }, 1250],
  ];
  for (const [settings, density] of cases) {
    const evaluation = evaluateDomainModel('nozzle-shear', { settings, densityKgPerM3: density });
    const direct = evaluateNozzleShear(settings, density);
    assert.deepEqual(evaluation.result, direct);
    assert.equal(evaluation.status, 'succeeded');
    assert.equal(evaluation.quantities.wallShearStressPa.unit, 'Pa');
    assert.equal(evaluation.quantities.wallShearStressPa.origin, 'hypothetical');
  }
  const highRe = evaluateDomainModel('nozzle-shear', {
    settings: { diameterUm: 600, flowMm3PerS: 100, viscosityMode: 'hypothetical-constant', viscosityPas: 0.01 },
    densityKgPerM3: 5e7,
  });
  assert.equal(highRe.result.laminarAssumptionHolds, false);
  assert.equal(highRe.status, 'out-of-domain');
  assert.throws(() => evaluateDomainModel('nozzle-shear', { settings: cases[0][0] }), RangeError);
});
test('vascular adapter is a direct-call identity for limiting and cap-null cases', () => {
  const limiting = defaultVascularSupply();
  const nonlimiting = { settings: { diffusivityD_m2PerS: 2e-9, consumptionM_molPerM3S: 1e-6, inletC0_molPerM3: 0.13, channelRadiusUm: 100 }, parameterOrigin: 'hypothetical-controls' };
  for (const record of [limiting, nonlimiting]) {
    const evaluation = evaluateDomainModel('vascular-supply', { record });
    assert.deepEqual(evaluation.result, evaluateVascularSupply(record));
    assert.equal(evaluation.status, 'succeeded');
    assert.equal(evaluation.quantities['computed.planarLimitUm'].unit, 'um');
    assert.equal(evaluation.sourceIds.length > 0, true);
    assert.equal(evaluation.notices.length > 0, true);
  }
  assert.equal(evaluateDomainModel('vascular-supply', { record: nonlimiting }).result.status, 'not-limiting-at-scale');
});

test('division adapter is a direct-call identity with and without assumed hours', () => {
  for (const settings of [
    { model: 'idealized-relative-doubling', doublings: 3, hypotheticalDoublingHours: null },
    { model: 'idealized-relative-doubling', doublings: 2.5, hypotheticalDoublingHours: 12 },
    { model: 'idealized-relative-doubling', doublings: 0, hypotheticalDoublingHours: 1 },
  ]) {
    const evaluation = evaluateDomainModel('relative-division', { settings });
    assert.deepEqual(evaluation.result, evaluateRelativeDivision(settings));
    assert.equal(evaluation.status, 'succeeded');
    const hours = evaluation.quantities.hypotheticalElapsedHours;
    assert.equal(hours.unit, 'h');
    if (settings.hypotheticalDoublingHours === null) assert.equal(hours.value, null);
    else assert.equal(hours.value, settings.doublings * settings.hypotheticalDoublingHours);
  }
});

test('status classification helpers pin the flag mapping exactly', () => {
  assert.equal(classifyBoxResult({ converged: true, inDomain: true }), 'succeeded');
  assert.equal(classifyBoxResult({ converged: true, inDomain: false }), 'out-of-domain');
  assert.equal(classifyBoxResult({ converged: false, inDomain: true }), 'numerical-failure');
  assert.equal(classifyBoxResult({ converged: false, inDomain: false }), 'numerical-failure');
  assert.equal(classifyFlowResult({ status: 'solved' }), 'succeeded');
  assert.equal(classifyFlowResult({ status: 'numerical-failure' }), 'numerical-failure');
  assert.equal(classifyNozzleResult({ laminarAssumptionHolds: true }), 'succeeded');
  assert.equal(classifyNozzleResult({ laminarAssumptionHolds: false }), 'out-of-domain');
});

test('adapters never mutate deep-frozen caller inputs and return owned results', () => {
  const frozenInputs = deepFreeze({
    storyboard: { time: 1.2, parameters: { spacing: 0.36, layers: 6, population: 0.6, perfusion: 0.6, channels: true, recipient: 'animal' } },
    slab: { demand: 0.5, points: 21 },
    box: { settings: { model: 'steady-3d-box-constant-consumption', demand: 1, resolution: 9, boundaryMode: 'all-faces' } },
    flow: deepFreeze(structuredClone(createTeachingNetwork({ enabled: true, pressureDrive: 0.5, branchResistances: [1, 1, 1] }))),
    nozzle: { settings: { diameterUm: 300, flowMm3PerS: 5, viscosityMode: 'hypothetical-constant', viscosityPas: 1 }, densityKgPerM3: 1000 },
    vascular: { record: defaultVascularSupply() },
    division: { settings: { model: 'idealized-relative-doubling', doublings: 1, hypotheticalDoublingHours: 2 } },
  });
  const before = structuredClone(frozenInputs);
  const results = [
    evaluateDomainModel('storyboard', frozenInputs.storyboard),
    evaluateDomainModel('slab-oxygen', frozenInputs.slab),
    evaluateDomainModel('box-oxygen', frozenInputs.box),
    evaluateDomainModel('flow-resistance', { network: frozenInputs.flow }),
    evaluateDomainModel('nozzle-shear', frozenInputs.nozzle),
    evaluateDomainModel('vascular-supply', frozenInputs.vascular),
    evaluateDomainModel('relative-division', frozenInputs.division),
  ];
  assert.deepEqual(structuredClone(frozenInputs), before);
  for (const evaluation of results) {
    assert.ok(evaluation.result && typeof evaluation.result === 'object');
    assert.equal(Object.isFrozen(evaluation.result), false); // caller owns a mutable copy
    assert.ok(evaluation.diagnostics.length > 0);
    assert.ok(Array.isArray(evaluation.notices));
  }
});

test('model adapters are fixed, frozen and reject unknown models', () => {
  assert.throws(() => getModelAdapter('cross-reference'), RangeError);
  assert.throws(() => evaluateDomainModel('nope', {}), RangeError);
  assert.throws(() => evaluateDomainModel('storyboard', { time: 1, parameters: { ...DEFAULTS }, extra: 1 }), TypeError);
  assert.throws(() => evaluateDomainModel('storyboard', JSON.parse(`{"time":1,"parameters":${JSON.stringify(DEFAULTS)},"__proto__":{"x":1}}`)), TypeError);
  const adapter = getModelAdapter('slab-oxygen');
  assert.equal(Object.isFrozen(adapter), true);
  assert.equal(adapter.id, 'slab-oxygen');
});
