import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateCrossReference, defaultCrossReference, validateCrossReferenceRecord,
  validateCrossReferenceSettings, CROSS_REFERENCE_NOTICES,
} from '../src/cross-reference.js';
import { evaluateNozzleShear } from '../src/nozzle-shear.js';
import { evaluateVascularSupply } from '../src/vascular-supply.js';

const nozzle = { settings: { diameterUm: 400, flowMm3PerS: 10, viscosityMode: 'hypothetical-constant', viscosityPas: 3 }, parameterOrigin: 'hypothetical-controls' };
const vascular = { settings: { diffusivityD_m2PerS: 2e-9, consumptionM_molPerM3S: 1e-2, inletC0_molPerM3: 0.13, channelRadiusUm: 100 }, parameterOrigin: 'hypothetical-controls' };
const storyboard = { spacing: 0.36, layers: 6, population: 0.6, perfusion: 0.6, channels: true, recipient: 'animal' };

function enabledRecord(overrides = {}) {
  return { ...defaultCrossReference(), enabled: true, settings: { ...defaultCrossReference().settings, ...overrides } };
}

test('the view is an identity re-parameterization of the two audited evaluators', () => {
  for (const [flowScale, radiusScale, consumptionScale, layerScale] of [[10, 500, 1e-2, 100], [0.5, 100, 1e-3, 40], [80, 1500, 5e-2, 250]]) {
    const record = enabledRecord({ flowScaleMm3PerS: flowScale, radiusScaleUm: radiusScale, consumptionScaleMolPerM3S: consumptionScale, layerScaleUm: layerScale });
    const r = evaluateCrossReference(record, structuredClone(nozzle), structuredClone(vascular), storyboard);
    const flow = storyboard.perfusion * flowScale;
    const radius = (storyboard.spacing * radiusScale) / 2;
    const consumption = storyboard.population * consumptionScale;
    const directShear = evaluateNozzleShear({ ...nozzle.settings, flowMm3PerS: flow });
    const directSupply = evaluateVascularSupply({ settings: { ...vascular.settings, channelRadiusUm: radius, consumptionM_molPerM3S: consumption }, parameterOrigin: 'hypothetical-controls' });
    assert.equal(r.status, 'mapped');
    for (const value of [r.shear.tauPa, r.shear.reynolds, r.supply.kroghCriticalRadiusUm, r.supply.planarLimitUm]) assert.ok(Number.isFinite(value));
    assert.equal(typeof r.shear.laminar, 'boolean');
    assert.equal(r.shear.tauPa, directShear.wallShearStressPa);
    assert.equal(r.shear.reynolds, directShear.reynoldsNumber);
    assert.equal(r.shear.laminar, directShear.laminarAssumptionHolds);
    assert.equal(r.supply.kroghCriticalRadiusUm, directSupply.computed.kroghCriticalRadiusUm);
    assert.equal(r.supply.planarLimitUm, directSupply.computed.planarLimitUm);
    assert.deepEqual(r.supply.bandUm, directSupply.bandContext.bandUm);
    assert.equal(r.mapped.flowMm3PerS, flow);
    assert.equal(r.mapped.channelRadiusUm, radius);
    assert.equal(r.mapped.consumptionMolPerM3S, consumption);
    assert.equal(r.mapped.constructThicknessUm, storyboard.layers * layerScale);
  }
});

test('the underlying records are never mutated and disabled records map nothing', () => {
  const before = { nozzle: structuredClone(nozzle), vascular: structuredClone(vascular) };
  const record = enabledRecord();
  evaluateCrossReference(record, nozzle, vascular, storyboard);
  assert.deepEqual({ nozzle, vascular }, before);
  assert.notEqual(record.settings.flowMm3PerS, nozzle.settings.flowMm3PerS);
  const disabled = evaluateCrossReference(defaultCrossReference(), nozzle, vascular, storyboard);
  assert.equal(disabled.status, 'disabled');
  assert.equal(disabled.mapped, undefined);
  assert.deepEqual(disabled.notices, [...CROSS_REFERENCE_NOTICES]);
});

test('teaching arithmetic and not-limiting honesty', () => {
  const r = evaluateCrossReference(enabledRecord(), nozzle, vascular, storyboard);
  assert.ok(Math.abs(r.teaching.thicknessVsPlanarUm - (r.mapped.constructThicknessUm - r.supply.planarLimitUm)) < 1e-9);
  assert.ok(Math.abs(r.teaching.thicknessVsKroghUm - (r.mapped.constructThicknessUm - r.supply.kroghCriticalRadiusUm)) < 1e-9);
  assert.equal(r.teaching.verdicts.length, 2);
  for (const forbidden of ['guarantee', 'will survive', 'safe for', 'approved', 'predict']) assert.ok(!r.teaching.verdicts.join(' ').includes(forbidden));
  const sparse = evaluateCrossReference(enabledRecord({ consumptionScaleMolPerM3S: 1e-5 }), nozzle,
    { ...vascular, settings: { ...vascular.settings, diffusivityD_m2PerS: 1e-8, inletC0_molPerM3: 0.5 } },
    { ...storyboard, population: 0.1 });
  assert.equal(sparse.supply.kroghCriticalRadiusUm, null);
  assert.ok(Number.isFinite(sparse.supply.planarLimitUm));
  assert.equal(sparse.teaching.thicknessVsPlanarUm, null);
  assert.equal(sparse.teaching.thicknessVsKroghUm, null);
  assert.ok(sparse.teaching.verdicts.some(v => v.includes('not supply-limited')));
});

test('validators reject forged records, scales, origins and storyboards', () => {
  for (const bad of [
    { flowScaleMm3PerS: 0, radiusScaleUm: 500, consumptionScaleMolPerM3S: 1e-2, layerScaleUm: 100 },
    { flowScaleMm3PerS: 10, radiusScaleUm: 5, consumptionScaleMolPerM3S: 1e-2, layerScaleUm: 100 },
    { flowScaleMm3PerS: 10, radiusScaleUm: 500, consumptionScaleMolPerM3S: -1e-3, layerScaleUm: 100 },
    { flowScaleMm3PerS: 10, radiusScaleUm: 500, consumptionScaleMolPerM3S: 1e-2, layerScaleUm: 0 },
    { flowScaleMm3PerS: 10, radiusScaleUm: 500, consumptionScaleMolPerM3S: 1e-2 },
  ]) assert.throws(() => validateCrossReferenceSettings(bad));
  assert.throws(() => validateCrossReferenceRecord({ ...defaultCrossReference(), parameterOrigin: 'cited-fit' }));
  assert.throws(() => validateCrossReferenceRecord({ ...defaultCrossReference(), enabled: 'yes' }));
  assert.throws(() => validateCrossReferenceRecord({ ...defaultCrossReference(), extra: 1 }));
  const good = validateCrossReferenceRecord(defaultCrossReference());
  assert.equal(good.enabled, false);
  assert.throws(() => evaluateCrossReference(enabledRecord(), nozzle, vascular, { ...storyboard, layers: 2.5 }));
  assert.throws(() => evaluateCrossReference(enabledRecord(), nozzle, vascular, { ...storyboard, perfusion: 'high' }));
  const outOfRangeRadius = enabledRecord({ radiusScaleUm: 10 });
  assert.throws(() => evaluateCrossReference(outOfRangeRadius, nozzle, vascular, storyboard));
});
