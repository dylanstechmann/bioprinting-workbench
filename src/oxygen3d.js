import { finite, assertAllowedKeys } from './validation.js';
import { solvePCG } from './numerics.js';
export const OXYGEN_MODEL = 'steady-3d-box-constant-consumption';
export const OXYGEN_DEFAULTS = Object.freeze({ model: OXYGEN_MODEL, demand: 1, resolution: 17, boundaryMode: 'all-faces' });
export function validateOxygen3DSettings(raw) {
  assertAllowedKeys(raw, ['model', 'demand', 'resolution', 'boundaryMode'], 'oxygen3d');
  if (raw.model !== OXYGEN_MODEL || ![9, 17, 25, 33].includes(raw.resolution) || !['all-faces', 'slab-x'].includes(raw.boundaryMode)) throw new RangeError('Invalid 3D oxygen model/grid/boundary mode');
  return { model: raw.model, demand: finite(raw.demand, 0, 2, 'demand'), resolution: raw.resolution, boundaryMode: raw.boundaryMode };
}
export function buildBoxOperator(raw) {
  const settings = validateOxygen3DSettings(raw), n = settings.resolution, h = 2 / n, weight = 1 / (h * h), size = n ** 3;
  const diagonal = new Float64Array(size), boundaryCount = new Uint8Array(size);
  const strides = [1, n, n * n];
  for (let k = 0; k < n; k++) for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const idx = i + n * (j + n * k), coords = [i, j, k];
    for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
      if (coords[axis] + sign >= 0 && coords[axis] + sign < n) diagonal[idx] += weight;
      else if (axis === 0 || settings.boundaryMode === 'all-faces') { diagonal[idx] += 2 * weight; boundaryCount[idx]++; }
    }
  }
  function apply(x, out) {
    for (let k = 0; k < n; k++) for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const idx = i + n * (j + n * k), coords = [i, j, k];
      let value = diagonal[idx] * x[idx];
      for (let axis = 0; axis < 3; axis++) {
        if (coords[axis] > 0) value -= weight * x[idx - strides[axis]];
        if (coords[axis] < n - 1) value -= weight * x[idx + strides[axis]];
      }
      out[idx] = value;
    }
  }
  return { settings, n, h, diagonal, boundaryCount, apply, rhs: new Float64Array(size).fill(1) };
}
export function solveOxygenBasis(settings) {
  const operator = buildBoxOperator(settings);
  return { ...solvePCG(operator), settings: operator.settings, key: `${operator.n}:${operator.settings.boundaryMode}` };
}
export function solveOxygen3D(raw, basis = null) {
  const settings = validateOxygen3DSettings(raw), op = buildBoxOperator(settings);
  basis ||= solveOxygenBasis(settings);
  if (basis.key !== `${op.n}:${settings.boundaryMode}`) throw new RangeError('Oxygen basis settings mismatch');
  const values = Float64Array.from(basis.values, w => 1 - settings.demand * w);
  let min = Infinity, max = -Infinity, netBoundaryInflux = 0;
  values.forEach((c, i) => { min = Math.min(min, c); max = Math.max(max, c); netBoundaryInflux += op.boundaryCount[i] * 2 * op.h * (1 - c); });
  const totalConsumption = settings.demand * 8;
  return { settings, values, center: values[(values.length - 1) / 2], min, max, iterations: basis.iterations, residualInfinity: basis.residualInfinity, relativeResidual: basis.relativeResidual, converged: basis.converged, netBoundaryInflux, totalConsumption, balanceError: Math.abs(netBoundaryInflux - totalConsumption), inDomain: min >= -1e-10 && max <= 1 + 1e-10, units: 'dimensionless', parameterOrigin: 'synthetic-controls' };
}
export function sampleOxygenBasis(basis, position) {
  if (!Array.isArray(position) || position.length !== 3) throw new TypeError('position must have three coordinates');
  const n = basis.settings.resolution, h = 2 / n;
  const brackets = position.map((v, axis) => {
    finite(v, -1, 1, 'position');
    const t = (v + 1) / h - .5, supplied = axis === 0 || basis.settings.boundaryMode === 'all-faces';
    if (t < 0) return supplied ? [-1, 0, (v + 1) / (h / 2)] : [0, 0, 0];
    if (t > n - 1) return supplied ? [n - 1, n, (v - (1 - h / 2)) / (h / 2)] : [n - 1, n - 1, 0];
    return [Math.floor(t), Math.min(n - 1, Math.floor(t) + 1), t - Math.floor(t)];
  });
  let value = 0;
  for (let corner = 0; corner < 8; corner++) {
    let weight = 1; const indices = [];
    for (let axis = 0; axis < 3; axis++) { const side = (corner >> axis) & 1, b = brackets[axis]; indices.push(b[side]); weight *= side ? b[2] : 1 - b[2]; }
    if (indices.every(i => i >= 0 && i < n)) value += weight * basis.values[indices[0] + n * (indices[1] + n * indices[2])];
  }
  return value;
}
export function extractOxygenSlice(result, axis, index) {
  const n = result.settings.resolution, a = ['x', 'y', 'z'].indexOf(axis);
  if (a < 0 || !Number.isInteger(index) || index < 0 || index >= n) throw new RangeError('Invalid slice');
  const values = new Float64Array(n * n), other = [0, 1, 2].filter(i => i !== a);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const xyz = []; xyz[a] = index; xyz[other[0]] = i; xyz[other[1]] = j; values[i + n * j] = result.values[xyz[0] + n * (xyz[1] + n * xyz[2])]; }
  return { axis, index, coordinate: -1 + (index + .5) * 2 / n, width: n, height: n, values };
}