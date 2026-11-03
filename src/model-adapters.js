// Phase B adapters: thin, exact wrappers over the existing audited evaluators. Each adapter
// validates a complete input envelope, calls the native function exactly once with defensive
// copies, and returns a defensive copy of the native result. No equation, tolerance or native
// field is altered here; status flags are classified from native outputs, never coerced.
import { assertAllowedKeys, assertPlainRecord, finite } from './validation.js';
import { getDomainModel, DOMAIN_MODEL_SCHEMA_VERSION } from './domain-models.js';
import { projectQuantities } from './model-provenance.js';
import { sample } from './model.js';
import { oxygenProfile } from './oxygen.js';
import { solveOxygen3D } from './oxygen3d.js';
import { solveFlowNetwork } from './flow.js';
import { evaluateNozzleShear } from './nozzle-shear.js';
import { evaluateVascularSupply } from './vascular-supply.js';
import { evaluateRelativeDivision } from './cell-division.js';

function envelope(raw, keys, path) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.getPrototypeOf(raw) !== Object.prototype) throw new TypeError(`${path} must be a plain object`);
  for (const key of Object.keys(raw)) if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new TypeError(`${path}.${key} is forbidden`);
  assertAllowedKeys(raw, keys, path);
  return raw;
}

/** Pure status classification over native flags; exported for tests so classification is
 * pinned without manufacturing numerical failures inside scientific tolerances. */
export function classifyBoxResult(result) {
  return !result.converged ? 'numerical-failure' : !result.inDomain ? 'out-of-domain' : 'succeeded';
}
export function classifyFlowResult(result) {
  return result.status === 'numerical-failure' ? 'numerical-failure' : 'succeeded';
}
export function classifyNozzleResult(result) {
  return result.laminarAssumptionHolds ? 'succeeded' : 'out-of-domain';
}

const ADAPTERS = {
  storyboard: {
    validateInputs(raw) {
      envelope(raw, ['time', 'parameters'], 'inputs');
      if (!Number.isFinite(raw.time)) throw new TypeError('time must be finite');
      assertPlainRecord(raw.parameters, 'inputs.parameters');
      return { time: raw.time, parameters: structuredClone(raw.parameters) };
    },
    evaluate(inputs) {
      return { result: sample(inputs.time, inputs.parameters), notices: [], diagnostics: ['native clamps time to [0, 4.999]'] };
    },
  },
  'slab-oxygen': {
    validateInputs(raw) {
      envelope(raw, ['demand', 'points'], 'inputs');
      return { demand: finite(raw.demand, 0, 2, 'demand'), points: raw.points };
    },
    evaluate(inputs) {
      return { result: oxygenProfile(inputs.demand, inputs.points), notices: [], diagnostics: ['dimensionless steady 1d slab'] };
    },
  },
  'box-oxygen': {
    validateInputs(raw) {
      envelope(raw, ['settings'], 'inputs');
      assertPlainRecord(raw.settings, 'inputs.settings');
      return { settings: structuredClone(raw.settings) };
    },
    evaluate(inputs) {
      const result = solveOxygen3D(inputs.settings);
      return {
        result,
        status: classifyBoxResult(result),
        notices: [],
        diagnostics: [`converged: ${result.converged}`, `inDomain: ${result.inDomain}`, `iterations: ${result.iterations}`, 'units: dimensionless'],
      };
    },
  },
  'flow-resistance': {
    validateInputs(raw) {
      envelope(raw, ['network'], 'inputs');
      assertPlainRecord(raw.network, 'inputs.network');
      return { network: structuredClone(raw.network) };
    },
    evaluate(inputs) {
      const result = solveFlowNetwork(inputs.network);
      return {
        result,
        status: classifyFlowResult(result),
        notices: [result.message].filter(Boolean),
        diagnostics: [`native status: ${result.status}`, `globalBalanceError: ${result.globalBalanceError}`, 'dimensionless resistance network'],
      };
    },
  },
  'nozzle-shear': {
    validateInputs(raw) {
      envelope(raw, ['settings', 'densityKgPerM3'], 'inputs');
      assertPlainRecord(raw.settings, 'inputs.settings');
      return { settings: structuredClone(raw.settings), densityKgPerM3: finite(raw.densityKgPerM3, Number.MIN_VALUE, Infinity, 'densityKgPerM3') };
    },
    evaluate(inputs) {
      // Explicit density pins the native optional parameter; no implicit default is hidden.
      const result = evaluateNozzleShear(inputs.settings, inputs.densityKgPerM3);
      return {
        result,
        status: classifyNozzleResult(result),
        notices: [...result.notices],
        diagnostics: [`laminarAssumptionHolds: ${result.laminarAssumptionHolds}`, `viscositySource: ${result.viscositySource}`, `band (context only): ${result.band}`],
      };
    },
  },
  'vascular-supply': {
    validateInputs(raw) {
      envelope(raw, ['record'], 'inputs');
      assertPlainRecord(raw.record, 'inputs.record');
      return { record: structuredClone(raw.record) };
    },
    evaluate(inputs) {
      const result = evaluateVascularSupply(inputs.record);
      return {
        result,
        status: 'succeeded',
        notices: [...result.notices],
        diagnostics: [`native status: ${result.status}`, result.computed.kroghCriticalRadiusUm === null ? 'no critical radius within the 10 mm cap' : 'critical radius computed'],
      };
    },
  },
  'relative-division': {
    validateInputs(raw) {
      envelope(raw, ['settings'], 'inputs');
      assertPlainRecord(raw.settings, 'inputs.settings');
      return { settings: structuredClone(raw.settings) };
    },
    evaluate(inputs) {
      const result = evaluateRelativeDivision(inputs.settings);
      return { result, status: 'succeeded', notices: [result.notice].filter(Boolean), diagnostics: ['relative arithmetic only'] };
    },
  },
};

export function getModelAdapter(id) {
  const adapter = ADAPTERS[id];
  const definition = getDomainModel(id); // throws on unknown ids
  if (!adapter) throw new RangeError(`Unknown domain model: ${String(id)}`);
  return Object.freeze({
    id,
    validateInputs: raw => adapter.validateInputs(raw),
    evaluate: inputs => adapter.evaluate(inputs),
    definition,
  });
}

/** Evaluate one registered model exactly once. Invalid envelopes throw; native result flags
 * map to succeeded/out-of-domain/numerical-failure without coercion. quantities carry the
 * model's declared origins, or derived provenance when a runId is supplied. */
export function evaluateDomainModel(id, inputs, { runId = null } = {}) {
  const definition = getDomainModel(id);
  const adapter = getModelAdapter(id);
  const validated = adapter.validateInputs(inputs);
  const outcome = adapter.evaluate(validated);
  const status = outcome.status || 'succeeded';
  if (!['succeeded', 'out-of-domain', 'numerical-failure'].includes(status)) throw new RangeError('Adapter produced an unsupported status');
  const result = structuredClone(outcome.result);
  return {
    modelId: definition.id,
    modelVersion: DOMAIN_MODEL_SCHEMA_VERSION,
    status,
    result,
    quantities: projectQuantities(definition, result, { runId }),
    diagnostics: [...(outcome.diagnostics || [])],
    sourceIds: [...definition.sourceIds],
    notices: [...(outcome.notices || [])],
  };
}
