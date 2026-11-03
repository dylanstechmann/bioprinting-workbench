// Phase B registry: explicit unit, quantity and domain-model contracts over the existing
// audited evaluators. Pure description + validation only; no evaluator is re-implemented or
// re-parameterized here. Quantities describe software outputs; they are never biological
// measurements, validation claims or transplant-readiness scores.
import { assertAllowedKeys, assertPlainRecord, finite } from './validation.js';
import { getNozzleShearCatalog } from './nozzle-shear.js';
import { getVascularSupplyCatalog } from './vascular-supply.js';

export const DOMAIN_MODEL_SCHEMA_VERSION = 1;
/** Complete unit allowlist matching native evaluator outputs. '1' is dimensionless/normalized;
 * 'count' counts discrete items (doublings may be fractional by population idealization).
 * No implicit conversion exists anywhere in this registry. */
export const MODEL_UNITS = Object.freeze(['1', 'count', 'Pa', 'Pa*s', 'um', 'mm3/s', 'mm/s', '1/s', 'm2/s', 'mol/m3', 'mol/(m3*s)', '1/mm2', 'kg/m3', 'h', 'relative-population']);
const QUANTITY_ORIGINS = Object.freeze(['synthetic', 'hypothetical', 'user-declared-measured', 'literature', 'derived']);
const FIELD_TYPES = Object.freeze(['number', 'integer', 'boolean', 'string', 'array']);
const DANGEROUS_KEYS = Object.freeze(['__proto__', 'prototype', 'constructor']);

function assertSafeKeys(value, path) {
  assertPlainRecord(value, path);
  for (const key of Object.keys(value)) if (DANGEROUS_KEYS.includes(key)) throw new TypeError(`${path}.${key} is forbidden`);
  return value;
}
function boundedText(value, max, path) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new TypeError(`${path} must be a nonempty string (max ${max})`);
  return value;
}
function boundedList(value, maxItems, maxItem, path) {
  if (!Array.isArray(value) || value.length > maxItems) throw new TypeError(`${path} must be an array (max ${maxItems})`);
  return value.map((item, i) => boundedText(item, maxItem, `${path}[${i}]`));
}

export function validateUnit(unit) {
  if (!MODEL_UNITS.includes(unit)) throw new RangeError(`Unknown unit: ${String(unit)}`);
  return unit;
}

/** Quantity = {value,unit,origin,sourceIds,uncertainty,missingReason}. Null value requires a
 * nonempty missingReason; nonnull requires missingReason null. Derived quantities require a
 * run id; literature quantities require resolvable source ids. No confidence levels exist. */
export function validateQuantity(raw, { runId = null, sourceIds = [] } = {}) {
  assertSafeKeys(raw, 'quantity');
  assertAllowedKeys(raw, ['value', 'unit', 'origin', 'sourceIds', 'uncertainty', 'missingReason'], 'quantity');
  const unit = validateUnit(raw.unit);
  if (!QUANTITY_ORIGINS.includes(raw.origin)) throw new RangeError('quantity.origin unsupported');
  if (raw.origin === 'derived' && !runId) throw new RangeError('Derived quantities require run provenance');
  const ids = raw.sourceIds;
  if (!Array.isArray(ids) || ids.length > 50 || new Set(ids).size !== ids.length) throw new TypeError('quantity.sourceIds must be unique (max 50)');
  for (const id of ids) {
    boundedText(id, 64, 'quantity.sourceIds[]');
    if (sourceIds.length && !sourceIds.includes(id)) throw new RangeError(`quantity.sourceIds references unknown source ${id}`);
  }
  if (raw.origin === 'literature' && !ids.length) throw new RangeError('Literature quantities need source references');
  let uncertainty = null;
  if (raw.uncertainty !== null) {
    assertSafeKeys(raw.uncertainty, 'quantity.uncertainty');
    assertAllowedKeys(raw.uncertainty, ['kind', 'lower', 'upper', 'unit'], 'quantity.uncertainty');
    if (raw.uncertainty.kind !== 'interval') throw new RangeError('Only interval uncertainty exists');
    const uUnit = validateUnit(raw.uncertainty.unit);
    if (uUnit !== unit) throw new RangeError('Uncertainty unit must match the quantity unit exactly');
    const lower = finite(raw.uncertainty.lower, -Infinity, Infinity, 'quantity.uncertainty.lower');
    const upper = finite(raw.uncertainty.upper, -Infinity, Infinity, 'quantity.uncertainty.upper');
    if (lower > upper) throw new RangeError('Uncertainty interval must be ordered');
    uncertainty = { kind: 'interval', lower, upper, unit: uUnit };
  }
  if (raw.value === null) {
    const reason = boundedText(raw.missingReason, 1000, 'quantity.missingReason');
    if (uncertainty) throw new RangeError('A missing value cannot carry uncertainty');
    return { value: null, unit, origin: raw.origin, sourceIds: [...ids], uncertainty: null, missingReason: reason };
  }
  const value = finite(raw.value, -Infinity, Infinity, 'quantity.value');
  if (raw.missingReason !== null) throw new RangeError('A present value must have missingReason null');
  if (uncertainty && (value < uncertainty.lower || value > uncertainty.upper)) throw new RangeError('Uncertainty interval must encompass the value');
  return { value, unit, origin: raw.origin, sourceIds: [...ids], uncertainty, missingReason: null };
}
/** FieldDefinition = {unit,type,min,max,nullable,values}; all keys required, irrelevant ones null. */
export function validateFieldDefinition(raw, path = 'field') {
  assertSafeKeys(raw, path);
  assertAllowedKeys(raw, ['unit', 'type', 'min', 'max', 'nullable', 'values'], path);
  if (!FIELD_TYPES.includes(raw.type)) throw new RangeError(`${path}.type unsupported`);
  if (typeof raw.nullable !== 'boolean') throw new TypeError(`${path}.nullable must be boolean`);
  let unit = null;
  if (raw.type === 'number' || raw.type === 'integer') {
    unit = validateUnit(raw.unit);
  } else if (raw.unit !== null) {
    throw new RangeError(`${path}.unit must be null for non-numeric fields`);
  }
  let min = null, max = null;
  if (raw.type === 'number' || raw.type === 'integer' || raw.type === 'array') {
    min = raw.min === null ? null : finite(raw.min, -Infinity, Infinity, `${path}.min`);
    max = raw.max === null ? null : finite(raw.max, -Infinity, Infinity, `${path}.max`);
    if (min !== null && max !== null && min > max) throw new RangeError(`${path} bounds unordered`);
    if (raw.type === 'array' && ((min !== null && (!Number.isInteger(min) || min < 0)) || (max !== null && !Number.isInteger(max)))) throw new RangeError(`${path} array lengths are nonnegative integers`);
  } else if (raw.min !== null || raw.max !== null) {
    throw new RangeError(`${path}.min/max must be null for this type`);
  }
  let values = null;
  if (raw.values !== null) {
    if (!Array.isArray(raw.values) || !raw.values.length || raw.values.length > 200) throw new TypeError(`${path}.values must be a bounded array`);
    if (raw.type === 'string') values = raw.values.map((v, i) => boundedText(v, 200, `${path}.values[${i}]`));
    else if (raw.type === 'integer') values = raw.values.map((v, i) => finite(v, -Infinity, Infinity, `${path}.values[${i}]`));
    else throw new RangeError(`${path}.values only applies to string/integer fields`);
    if (new Set(values).size !== values.length) throw new RangeError(`${path}.values must be unique`);
    if (min !== null && values.some(v => v < min)) throw new RangeError(`${path}.values below min`);
    if (max !== null && values.some(v => v > max)) throw new RangeError(`${path}.values above max`);
  }
  return { unit, type: raw.type, min, max, nullable: raw.nullable, values };
}

function validateDefinitionsMap(raw, path) {
  assertSafeKeys(raw, path);
  const entries = Object.entries(raw);
  if (!entries.length || entries.length > 100) throw new RangeError(`${path} needs 1..100 fields`);
  const out = {};
  for (const [key, def] of entries) {
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(key) || key.includes('..')) throw new RangeError(`${path} has an invalid field id`);
    out[key] = validateFieldDefinition(def, `${path}.${key}`);
  }
  return out;
}

export function validateDomainModelDefinition(raw) {
  assertSafeKeys(raw, 'domainModel');
  assertAllowedKeys(raw, ['id', 'version', 'label', 'domain', 'inputDefinitions', 'outputDefinitions', 'assumptions', 'boundaryConditions', 'validityConditions', 'sourceIds', 'implementationId', 'couplingPolicy', 'supportedOperations', 'quantityOrigin'], 'domainModel');
  const id = boundedText(raw.id, 64, 'domainModel.id');
  if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(id)) throw new RangeError('domainModel.id must be a lower-case id');
  if (raw.version !== DOMAIN_MODEL_SCHEMA_VERSION) throw new RangeError('Unknown domain-model version');
  if (raw.implementationId !== id) throw new RangeError('implementationId must match the manifest entry id');
  if (raw.couplingPolicy !== 'independent') throw new RangeError('Registered models are independent; cross-reference stays a mapping adapter');
  if (!Array.isArray(raw.supportedOperations) || !raw.supportedOperations.length || raw.supportedOperations.length > 3) throw new RangeError('supportedOperations bounded');
  for (const op of raw.supportedOperations) if (!['evaluate', 'sweep', 'field'].includes(op)) throw new RangeError('Unsupported operation');
  const sourceIds = raw.sourceIds;
  if (!Array.isArray(sourceIds) || sourceIds.length > 50 || new Set(sourceIds).size !== sourceIds.length) throw new TypeError('sourceIds must be unique');
  for (const sid of sourceIds) boundedText(sid, 64, 'sourceIds[]');
  return {
    id,
    version: raw.version,
    label: boundedText(raw.label, 300, 'domainModel.label'),
    domain: boundedText(raw.domain, 200, 'domainModel.domain'),
    inputDefinitions: validateDefinitionsMap(raw.inputDefinitions, 'inputDefinitions'),
    outputDefinitions: validateDefinitionsMap(raw.outputDefinitions, 'outputDefinitions'),
    assumptions: boundedList(raw.assumptions, 50, 2000, 'assumptions'),
    boundaryConditions: boundedList(raw.boundaryConditions, 50, 2000, 'boundaryConditions'),
    validityConditions: boundedList(raw.validityConditions, 50, 2000, 'validityConditions'),
    sourceIds: [...sourceIds],
    implementationId: raw.implementationId,
    couplingPolicy: raw.couplingPolicy,
    supportedOperations: [...raw.supportedOperations],
    quantityOrigin: QUANTITY_ORIGINS.includes(raw.quantityOrigin) ? raw.quantityOrigin : 'synthetic',
  };
}

const nozzleSourceIds = getNozzleShearCatalog().sources.map(s => s.id);
const vascularSourceIds = getVascularSupplyCatalog().sources.map(s => s.id);
const DEFINITIONS = Object.freeze([
  validateDomainModelDefinition({
    id: 'storyboard', version: 1, label: 'Dimensionless synthetic storyboard', domain: 'synthetic-teaching', quantityOrigin: 'synthetic',
    inputDefinitions: {
      time: { unit: '1', type: 'number', min: null, max: null, nullable: false, values: null },
      'parameters.spacing': { unit: '1', type: 'number', min: 0.24, max: 0.6, nullable: false, values: null },
      'parameters.layers': { unit: 'count', type: 'integer', min: 3, max: 9, nullable: false, values: null },
      'parameters.population': { unit: '1', type: 'number', min: 0.1, max: 1, nullable: false, values: null },
      'parameters.perfusion': { unit: '1', type: 'number', min: 0, max: 1, nullable: false, values: null },
      'parameters.channels': { unit: null, type: 'boolean', min: null, max: null, nullable: false, values: null },
      'parameters.recipient': { unit: null, type: 'string', min: null, max: null, nullable: false, values: ['animal', 'human'] },
    },
    outputDefinitions: {
      stage: { unit: 'count', type: 'integer', min: 0, max: 4, nullable: false, values: null },
      progress: { unit: '1', type: 'number', min: 0, max: 1, nullable: false, values: null },
      expansion: { unit: '1', type: 'number', min: 0, max: 1, nullable: false, values: null },
      occupancy: { unit: '1', type: 'number', min: 0, max: 1, nullable: false, values: null },
      printed: { unit: '1', type: 'number', min: 0, max: 1, nullable: false, values: null },
      flow: { unit: '1', type: 'number', min: 0, max: 1, nullable: false, values: null },
      integration: { unit: '1', type: 'number', min: 0, max: 1, nullable: false, values: null },
    },
    assumptions: ['Scripted, dimensionless five-stage teaching timeline.', 'Time is clamped to [0, 4.999] and is not experimental hours.'],
    boundaryConditions: ['Synthetic parameter ranges defined by the storyboard validator.'],
    validityConditions: ['Numbers describe scripted animation state only; no adhesion, differentiation, flow or integration prediction.'],
    sourceIds: [], implementationId: 'storyboard', couplingPolicy: 'independent', supportedOperations: ['evaluate', 'sweep'],
  }),
  validateDomainModelDefinition({
    id: 'slab-oxygen', version: 1, label: 'Idealized steady 1D slab oxygen profile', domain: 'idealized-diffusion', quantityOrigin: 'synthetic',
    inputDefinitions: {
      demand: { unit: '1', type: 'number', min: 0, max: 2, nullable: false, values: null },
      points: { unit: 'count', type: 'integer', min: 3, max: 1001, nullable: false, values: null },
    },
    outputDefinitions: {
      center: { unit: '1', type: 'number', min: 0, max: 1, nullable: false, values: null },
      boundary: { unit: '1', type: 'number', min: 1, max: 1, nullable: false, values: null },
      profile: { unit: null, type: 'array', min: 3, max: 1001, nullable: false, values: null },
    },
    assumptions: ["Steady 1D slab c'' = constant demand with c(-1) = c(1) = 1.", 'Dimensionless; no biological parameter values.'],
    boundaryConditions: ['Fixed unit concentration at both faces.'],
    validityConditions: ['Points must be odd in [3, 1001]. No channel or flow coupling is implied.'],
    sourceIds: [], implementationId: 'slab-oxygen', couplingPolicy: 'independent', supportedOperations: ['evaluate', 'sweep'],
  }),
  validateDomainModelDefinition({
    id: 'box-oxygen', version: 1, label: 'Steady 3D box oxygen field', domain: 'numerical-field', quantityOrigin: 'synthetic',
    inputDefinitions: {
      'settings.model': { unit: null, type: 'string', min: null, max: null, nullable: false, values: ['steady-3d-box-constant-consumption'] },
      'settings.demand': { unit: '1', type: 'number', min: 0, max: 2, nullable: false, values: null },
      'settings.resolution': { unit: 'count', type: 'integer', min: 9, max: 33, nullable: false, values: [9, 17, 25, 33] },
      'settings.boundaryMode': { unit: null, type: 'string', min: null, max: null, nullable: false, values: ['all-faces', 'slab-x'] },
    },
    outputDefinitions: {
      center: { unit: '1', type: 'number', min: null, max: null, nullable: false, values: null },
      min: { unit: '1', type: 'number', min: null, max: null, nullable: false, values: null },
      max: { unit: '1', type: 'number', min: null, max: null, nullable: false, values: null },
      iterations: { unit: 'count', type: 'integer', min: 0, max: 5000, nullable: false, values: null },
      relativeResidual: { unit: '1', type: 'number', min: null, max: null, nullable: false, values: null },
      netBoundaryInflux: { unit: '1', type: 'number', min: null, max: null, nullable: false, values: null },
      totalConsumption: { unit: '1', type: 'number', min: null, max: null, nullable: false, values: null },
      balanceError: { unit: '1', type: 'number', min: null, max: null, nullable: false, values: null },
      converged: { unit: null, type: 'boolean', min: null, max: null, nullable: false, values: null },
      inDomain: { unit: null, type: 'boolean', min: null, max: null, nullable: false, values: null },
    },
    assumptions: ['Steady linear finite-difference box with constant consumption and unit boundary concentration.', 'Dimensionless teaching field, not tissue oxygen.'],
    boundaryConditions: ['all-faces or slab-x supplied faces at concentration 1.'],
    validityConditions: ['Non-converged solutions are numerical failures; out-of-range fields are out-of-domain.'],
    sourceIds: [], implementationId: 'box-oxygen', couplingPolicy: 'independent', supportedOperations: ['evaluate', 'sweep', 'field'],
  }),
  validateDomainModelDefinition({
    id: 'flow-resistance', version: 1, label: 'Dimensionless linear resistance network', domain: 'network-flow', quantityOrigin: 'synthetic',
    inputDefinitions: {
      'network.model': { unit: null, type: 'string', min: null, max: null, nullable: false, values: ['dimensionless-linear-resistance-network'] },
      'network.nodes': { unit: null, type: 'array', min: 1, max: 64, nullable: false, values: null },
      'network.edges': { unit: null, type: 'array', min: 1, max: 128, nullable: false, values: null },
    },
    outputDefinitions: {
      maxInteriorResidual: { unit: '1', type: 'number', min: null, max: null, nullable: false, values: null },
      globalBalanceError: { unit: '1', type: 'number', min: null, max: null, nullable: false, values: null },
      status: { unit: null, type: 'string', min: null, max: null, nullable: false, values: ['solved', 'numerical-failure'] },
    },
    assumptions: ['Linear pressure-flow resistance network, not CFD and not living vessel function.'],
    boundaryConditions: ['Each connected component needs at least one boundary pressure anchor.'],
    validityConditions: ['Node/edge caps 64/128; dimensionless pressures and flows.'],
    sourceIds: [], implementationId: 'flow-resistance', couplingPolicy: 'independent', supportedOperations: ['evaluate', 'sweep'],
  }),
  validateDomainModelDefinition({
    id: 'nozzle-shear', version: 1, label: 'Idealized steady laminar capillary shear reference', domain: 'capillary-shear-reference', quantityOrigin: 'hypothetical',
    inputDefinitions: {
      'settings.diameterUm': { unit: 'um', type: 'number', min: 60, max: 600, nullable: false, values: null },
      'settings.flowMm3PerS': { unit: 'mm3/s', type: 'number', min: 0.001, max: 100, nullable: false, values: null },
      'settings.viscosityMode': { unit: null, type: 'string', min: null, max: null, nullable: false, values: ['hypothetical-constant', 'cited-cellink-fit'] },
      'settings.viscosityPas': { unit: 'Pa*s', type: 'number', min: 0.01, max: 200, nullable: false, values: null },
      densityKgPerM3: { unit: 'kg/m3', type: 'number', min: null, max: null, nullable: false, values: null },
    },
    outputDefinitions: {
      meanVelocityMmPerS: { unit: 'mm/s', type: 'number', min: null, max: null, nullable: false, values: null },
      wallShearRatePerS: { unit: '1/s', type: 'number', min: null, max: null, nullable: false, values: null },
      apparentViscosityPas: { unit: 'Pa*s', type: 'number', min: null, max: null, nullable: false, values: null },
      wallShearStressPa: { unit: 'Pa', type: 'number', min: null, max: null, nullable: false, values: null },
      ratioToLowBandPa: { unit: '1', type: 'number', min: null, max: null, nullable: false, values: null },
      reynoldsNumber: { unit: '1', type: 'number', min: null, max: null, nullable: false, values: null },
      densityKgPerM3: { unit: 'kg/m3', type: 'number', min: null, max: null, nullable: false, values: null },
    },
    assumptions: ['Steady fully-developed laminar capillary of a generalized Newtonian fluid.', 'Hypothetical inputs; the cited rheology fit is literature context inside a hypothetical calculation.'],
    boundaryConditions: ['Uniform inner diameter; contractions and shear history are not modeled.'],
    validityConditions: ['Reynolds > 2300 marks the laminar assumption out-of-domain. Band labels are context, not safety verdicts.'],
    sourceIds: nozzleSourceIds, implementationId: 'nozzle-shear', couplingPolicy: 'independent', supportedOperations: ['evaluate', 'sweep'],
  }),
  validateDomainModelDefinition({
    id: 'vascular-supply', version: 1, label: 'Idealized Krogh-cylinder supply reference', domain: 'oxygen-supply-reference', quantityOrigin: 'hypothetical',
    inputDefinitions: {
      'record.parameterOrigin': { unit: null, type: 'string', min: null, max: null, nullable: false, values: ['hypothetical-controls'] },
      'record.settings.diffusivityD_m2PerS': { unit: 'm2/s', type: 'number', min: 1e-10, max: 1e-8, nullable: false, values: null },
      'record.settings.consumptionM_molPerM3S': { unit: 'mol/(m3*s)', type: 'number', min: 1e-6, max: 0.1, nullable: false, values: null },
      'record.settings.inletC0_molPerM3': { unit: 'mol/m3', type: 'number', min: 0.001, max: 0.5, nullable: false, values: null },
      'record.settings.channelRadiusUm': { unit: 'um', type: 'number', min: 10, max: 500, nullable: false, values: null },
    },
    outputDefinitions: {
      'computed.kroghCriticalRadiusUm': { unit: 'um', type: 'number', min: null, max: null, nullable: true, values: null },
      'computed.planarLimitUm': { unit: 'um', type: 'number', min: null, max: null, nullable: false, values: null },
      'computed.channelSpacingUm': { unit: 'um', type: 'number', min: null, max: null, nullable: true, values: null },
      'computed.channelDensityPerMm2': { unit: '1/mm2', type: 'number', min: null, max: null, nullable: true, values: null },
      status: { unit: null, type: 'string', min: null, max: null, nullable: false, values: ['explored', 'not-limiting-at-scale'] },
    },
    assumptions: ['Steady Krogh cylinder: uniform diffusivity, zero-order consumption, one channel, no flow resistance.', 'Hypothetical inputs; computed distances are model outputs, not viability thresholds.'],
    boundaryConditions: ['Inlet concentration fixed at channel wall; 10 mm outer cap.'],
    validityConditions: ['A null critical radius means not supply-limiting within the cap under these inputs.'],
    sourceIds: vascularSourceIds, implementationId: 'vascular-supply', couplingPolicy: 'independent', supportedOperations: ['evaluate', 'sweep'],
  }),
  validateDomainModelDefinition({
    id: 'relative-division', version: 1, label: 'Idealized relative doubling arithmetic', domain: 'population-arithmetic', quantityOrigin: 'synthetic',
    inputDefinitions: {
      'settings.model': { unit: null, type: 'string', min: null, max: null, nullable: false, values: ['idealized-relative-doubling'] },
      'settings.doublings': { unit: 'count', type: 'number', min: 0, max: 40, nullable: false, values: null },
      'settings.hypotheticalDoublingHours': { unit: 'h', type: 'number', min: 1, max: 1000, nullable: true, values: null },
    },
    outputDefinitions: {
      relativePopulation: { unit: 'relative-population', type: 'number', min: null, max: null, nullable: false, values: null },
      doublings: { unit: 'count', type: 'number', min: 0, max: 40, nullable: false, values: null },
      hypotheticalElapsedHours: { unit: 'h', type: 'number', min: null, max: null, nullable: true, values: null },
    },
    assumptions: ['Relative arithmetic only: 2^doublings with optional assumed hours.'],
    boundaryConditions: ['Doublings in [0, 40]; hours null or [1, 1000] as a user assumption.'],
    validityConditions: ['No cell death, senescence, capacity, identity, maturation, genome stability or organ yield. Never a culture schedule.'],
    sourceIds: [], implementationId: 'relative-division', couplingPolicy: 'independent', supportedOperations: ['evaluate', 'sweep'],
  }),
]);

export function getDomainModels() {
  return DEFINITIONS.map(d => structuredClone(d));
}
export function getDomainModel(id) {
  const found = DEFINITIONS.find(d => d.id === id);
  if (!found) throw new RangeError(`Unknown domain model: ${String(id)}`);
  return structuredClone(found);
}
