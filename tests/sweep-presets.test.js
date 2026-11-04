import test from 'node:test';
import assert from 'node:assert/strict';
import { SWEEP_PRESETS, SWEEP_PRESET_NOTICE, sweepBaseInputs } from '../src/sweep-presets.js';
import { validateSweepSpec } from '../src/model-exploration.js';
import { getDomainModels } from '../src/domain-models.js';
import { getModelAdapter, evaluateDomainModel } from '../src/model-adapters.js';

function numericAxes(definition) {
  return Object.entries(definition.inputDefinitions)
    .filter(([, def]) => def.type === 'number' || def.type === 'integer');
}

function twoValues(def) {
  if (def.values) return def.values.filter(v => def.min === null || v >= def.min).slice(0, 2);
  const lo = def.min ?? 0;
  const hi = def.max ?? lo + 2;
  return [lo, hi];
}

test('every sweep-capable registered model has a preset its own adapter and evaluator accept', () => {
  for (const definition of getDomainModels()) {
    if (!definition.supportedOperations.includes('sweep')) continue;
    assert.ok(SWEEP_PRESETS[definition.id], `missing preset for ${definition.id}`);
    const baseInputs = sweepBaseInputs(definition.id);
    getModelAdapter(definition.id).validateInputs(baseInputs);
    const outcome = evaluateDomainModel(definition.id, baseInputs);
    assert.ok(['succeeded', 'out-of-domain', 'numerical-failure'].includes(outcome.status));
  }
  assert.match(SWEEP_PRESET_NOTICE, /never fitted|synthetic UI conveniences/i);
});

test('presets round-trip validateSweepSpec on each registered numeric axis', () => {
  for (const definition of getDomainModels()) {
    if (!definition.supportedOperations.includes('sweep')) continue;
    for (const [path, def] of numericAxes(definition)) {
      let values = twoValues(def).filter(v => def.values === null || def.values.includes(v));
      if (definition.id === 'box-oxygen') values = values.filter(v => v <= 17);
      if (new Set(values).size < 2) continue; // no legal pair exists for this axis
      const spec = { modelId: definition.id, baseInputs: sweepBaseInputs(definition.id), axes: [{ path, values }], seed: 1 };
      const validated = validateSweepSpec(spec);
      assert.equal(validated.modelId, definition.id);
    }
  }
});

test('sweepBaseInputs merges nested overrides, returns fresh objects and does not invent bounds', () => {
  const merged = sweepBaseInputs('box-oxygen', { settings: { demand: 0.5 } });
  assert.equal(merged.settings.demand, 0.5);
  assert.equal(merged.settings.model, 'steady-3d-box-constant-consumption');
  assert.equal(merged.settings.resolution, 9);
  assert.throws(() => sweepBaseInputs('ghost-model'), RangeError);
  assert.throws(() => sweepBaseInputs('slab-oxygen', [1]), TypeError);
  const first = sweepBaseInputs('nozzle-shear');
  first.settings.diameterUm = 999;
  assert.equal(sweepBaseInputs('nozzle-shear').settings.diameterUm, 400);
  // Bounds enforcement stays in the audited validators, never in the presets.
  assert.throws(() => evaluateDomainModel('slab-oxygen', sweepBaseInputs('slab-oxygen', { demand: 5 })), RangeError);
});