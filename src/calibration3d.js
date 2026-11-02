import { parseBoundedJson, assertAllowedKeys, finite, text, validateSource, validateDataKind, MEASUREMENT_BYTES } from './validation.js';
import { OXYGEN_MODEL, sampleOxygenBasis } from './oxygen3d.js';
export const CALIBRATION_3D_SCHEMA = 'bioprinting-workbench/calibration-input/2';
export function parseOxygen3DMeasurements(value) {
  const raw = parseBoundedJson(value, MEASUREMENT_BYTES);
  assertAllowedKeys(raw, ['schema', 'model', 'dataKind', 'source', 'units', 'domain', 'measurements']);
  if (raw.schema !== CALIBRATION_3D_SCHEMA || raw.model !== OXYGEN_MODEL || raw.units !== 'dimensionless-ratio') throw new RangeError('Invalid 3D measurement schema/model/units');
  assertAllowedKeys(raw.domain, ['min', 'max', 'boundaryMode'], 'domain');
  if (JSON.stringify(raw.domain.min) !== '[-1,-1,-1]' || JSON.stringify(raw.domain.max) !== '[1,1,1]' || !['all-faces', 'slab-x'].includes(raw.domain.boundaryMode)) throw new RangeError('Measurements must use the normalized box domain');
  if (!Array.isArray(raw.measurements) || raw.measurements.length < 1 || raw.measurements.length > 100) throw new RangeError('Expected 1–100 measurement points');
  const ids = new Set();
  const measurements = raw.measurements.map(m => {
    assertAllowedKeys(m, ['id', 'position', 'concentration', 'boundary'], 'measurement');
    const id = text(m.id, 128, 'measurement.id');
    if (ids.has(id)) throw new RangeError('Duplicate point ID'); ids.add(id);
    if (!Array.isArray(m.position) || m.position.length !== 3) throw new TypeError('Expected three point coordinates');
    const concentration = finite(m.concentration, 0, Number.MAX_VALUE, 'concentration'), boundary = finite(m.boundary, Number.MIN_VALUE, Number.MAX_VALUE, 'boundary');
    if (!Number.isFinite(concentration / boundary)) throw new RangeError('Ratio overflows');
    return { id, position: m.position.map(x => finite(x, -1, 1, 'position')), concentration, boundary };
  });
  return { schema: CALIBRATION_3D_SCHEMA, model: OXYGEN_MODEL, dataKind: validateDataKind(raw.dataKind), source: validateSource(raw.source), units: raw.units, domain: { min: [-1, -1, -1], max: [1, 1, 1], boundaryMode: raw.domain.boundaryMode }, measurements };
}
export function fitOxygen3DDemand(raw, basis) {
  const input = parseOxygen3DMeasurements(JSON.stringify(raw));
  if (!basis.converged || basis.settings.boundaryMode !== input.domain.boundaryMode) throw new RangeError('Fit requires a converged matching-boundary basis');
  const points = input.measurements.map(m => ({ id: m.id, b: sampleOxygenBasis(basis, m.position), observedRatio: m.concentration / m.boundary }));
  const sensitivityNormSquared = points.reduce((s, p) => s + p.b * p.b, 0), identifiable = sensitivityNormSquared > 1e-12;
  const q = identifiable ? points.reduce((s, p) => s + p.b * (1 - p.observedRatio), 0) / sensitivityNormSquared : null;
  if (q !== null && !Number.isFinite(q)) throw new RangeError('Fit arithmetic overflows');
  const residuals = points.map(p => { const predictedRatio = q === null ? 1 : 1 - q * p.b; return { id: p.id, observedRatio: p.observedRatio, predictedRatio, residual: predictedRatio - p.observedRatio }; });
  const residualRMSE = Math.sqrt(residuals.reduce((s, p) => s + p.residual ** 2, 0) / points.length);
  if (!Number.isFinite(residualRMSE)) throw new RangeError('Fit residual overflows');
  return { model: OXYGEN_MODEL, n: points.length, q, residualRMSE, residuals, sensitivityNormSquared, identifiable, inDomain: identifiable && q >= 0 && q <= 2, resolution: basis.settings.resolution, boundaryMode: basis.settings.boundaryMode, converged: basis.converged, source: input.source, dataKind: input.dataKind, assumptionNotice: 'One demand estimate with fixed normalized geometry, diffusivity and boundaries. User provenance is unverified; this is not tissue validation, viability or safety.' };
}
export function oxygen3DExample() {
  return JSON.stringify({ schema: CALIBRATION_3D_SCHEMA, model: OXYGEN_MODEL, dataKind: 'synthetic', source: { citation: 'SYNTHETIC analytical slab-x fixture: q=1.2, off-grid positions; finite-volume/interpolation error is expected', accessedDate: '2026-11-01' }, units: 'dimensionless-ratio', domain: { min: [-1,-1,-1], max: [1,1,1], boundaryMode: 'slab-x' }, measurements: [-.37, .13, .56].map((x, i) => ({ id: `synthetic-${i}`, position: [x, .17, -.23], concentration: 1 - 1.2 * (1 - x * x) / 2, boundary: 1 })) }, null, 2);
}