// Registered-model sweep presets: synthetic UI conveniences so every sweep-capable registered
// model can be exercised without inventing physical mappings. Presets reuse each model's own
// audited default constants where they exist (DEFAULTS, OXYGEN_DEFAULTS, NOZZLE_SHEAR_DEFAULTS,
// defaultVascularSupply, the teaching network). They are never fitted, never measured, never
// applied to scenario state, and carry no scientific-default claim. Runtime validity is
// enforced by the model adapters and validateSweepSpec — never trusted from here.
import { DEFAULTS } from './model.js';
import { OXYGEN_DEFAULTS } from './oxygen3d.js';
import { createTeachingNetwork } from './flow.js';
import { NOZZLE_SHEAR_DEFAULTS, HYPOTHETICAL_DENSITY_KG_PER_M3 } from './nozzle-shear.js';
import { defaultVascularSupply } from './vascular-supply.js';

export const SWEEP_PRESET_NOTICE = 'Sweep presets are synthetic UI conveniences, not fitted or measured defaults. Nothing here is applied to the scenario; bounds are enforced by the audited validators.';

const PRESETS = {
  storyboard: () => ({ time: 2.5, parameters: { ...DEFAULTS } }),
  'slab-oxygen': () => ({ demand: 1, points: 21 }),
  // Resolution 9 keeps bounded sweeps fast; the box sweep cap also rejects resolution > 17.
  'box-oxygen': () => ({ settings: { ...OXYGEN_DEFAULTS, resolution: 9 } }),
  'flow-resistance': () => ({ network: createTeachingNetwork({ enabled: true, pressureDrive: .6, branchResistances: [1, 1, 1] }) }),
  'nozzle-shear': () => ({ settings: { ...NOZZLE_SHEAR_DEFAULTS }, densityKgPerM3: HYPOTHETICAL_DENSITY_KG_PER_M3 }),
  'vascular-supply': () => ({ record: defaultVascularSupply() }),
  'relative-division': () => ({ settings: { model: 'idealized-relative-doubling', doublings: 5, hypotheticalDoublingHours: 24 } }),
};

export const SWEEP_PRESETS = Object.freeze({ ...PRESETS });

function merge(base, overrides) {
  const out = structuredClone(base);
  for (const [key, value] of Object.entries(overrides)) {
    const nested = value && typeof value === 'object' && !Array.isArray(value)
      && out[key] && typeof out[key] === 'object' && !Array.isArray(out[key]);
    out[key] = nested ? merge(out[key], value) : structuredClone(value);
  }
  return out;
}

/** Fresh, validated-by-later-stages base inputs for a registered model. `overrides` deep-merges
 * into the preset (plain objects merge; scalars and arrays replace). Out-of-bounds values are
 * not rejected here: the audited adapter/evaluator validators own those limits and throw. */
export function sweepBaseInputs(modelId, overrides = {}) {
  const preset = PRESETS[modelId];
  if (!preset) throw new RangeError(`No sweep preset for ${String(modelId)}`);
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) throw new TypeError('sweepBaseInputs overrides must be a plain object');
  return merge(preset(), overrides);
}