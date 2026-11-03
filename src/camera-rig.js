const MODES = Object.freeze(['lab', 'construct', 'top']);
export const CAMERA_LIMITS = Object.freeze({ fovDegrees: 38, near: .05, far: 100, minDistance: 2.5, defaultMaxDistance: 29 });
const vector = (value, name) => {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) throw new TypeError(`${name} must be a finite 3D vector`);
  return [...value];
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize3 = value => {
  const length = Math.hypot(...value);
  if (!(length > 1e-9)) throw new RangeError('Camera direction must be nonzero');
  return value.map(component => component / length);
};

/** Fit a perspective camera so every bounds corner stays inside the frustum with margin.
 *  Illustrative scene units only; never a physical field-of-view or dimension claim. */
export function fitCameraToBounds(bounds, { aspect = 1, fovDegrees = CAMERA_LIMITS.fovDegrees, padding = 1.15, direction = [12.5, 9.2, 15.2], up = [0, 1, 0], minDistance = CAMERA_LIMITS.minDistance, maxDistance = null } = {}) {
  if (!bounds || typeof bounds !== 'object' || Array.isArray(bounds)) throw new TypeError('Camera bounds must be an object with min and max');
  for (const key of Object.keys(bounds)) if (key !== 'min' && key !== 'max') throw new TypeError(`Camera bounds.${key} is unsupported`);
  const min = vector(bounds.min, 'bounds.min'), max = vector(bounds.max, 'bounds.max');
  for (let i = 0; i < 3; i++) if (min[i] > max[i]) throw new RangeError('Camera bounds min must not exceed max');
  if (!Number.isFinite(aspect) || aspect <= 0) throw new RangeError('Aspect must be finite and positive');
  if (!Number.isFinite(fovDegrees) || fovDegrees < 1 || fovDegrees > 120) throw new RangeError('Fov must be in [1, 120] degrees');
  if (!Number.isFinite(padding) || padding < 1 || padding > 2) throw new RangeError('Padding must be in [1, 2]');
  if (!Number.isFinite(minDistance) || minDistance <= 0) throw new RangeError('minDistance must be positive');
  if (maxDistance !== null && (!Number.isFinite(maxDistance) || maxDistance < minDistance)) throw new RangeError('maxDistance must be at least minDistance');
  const view = normalize3(vector(direction, 'direction'));
  const worldUp = normalize3(vector(up, 'up'));
  let right = cross(view, worldUp);
  if (Math.hypot(...right) < 1e-6) {
    const fallbackUp = [[0, 1, 0], [1, 0, 0], [0, 0, 1]].reduce((best, axis) => Math.abs(dot(view, axis)) < Math.abs(dot(view, best)) ? axis : best);
    right = cross(view, fallbackUp);
  }
  right = normalize3(right);
  const screenUp = cross(view, right);
  const tanV = Math.tan(fovDegrees * Math.PI / 360), tanH = tanV * aspect;
  const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  let distance = 0;
  for (let corner = 0; corner < 8; corner++) {
    const w = [
      (corner & 1 ? max[0] : min[0]) - center[0],
      (corner >> 1 & 1 ? max[1] : min[1]) - center[1],
      (corner >> 2 & 1 ? max[2] : min[2]) - center[2],
    ];
    const radial = Math.max(Math.abs(dot(w, right)) * padding / tanH, Math.abs(dot(w, screenUp)) * padding / tanV);
    distance = Math.max(distance, dot(w, view) + radial);
  }
  distance = Math.max(distance, minDistance);
  if (maxDistance !== null) distance = Math.min(distance, maxDistance);
  return { target: center, offset: view.map(component => component * distance) };
}

/** Camera composition in illustrative scene units, never biological dimensions. */
export function getCameraPose(mode, { stage, constructPosition, aspect = 1, bounds = null } = {}) {
  if (!MODES.includes(mode)) throw new RangeError('Unknown camera mode');
  if (!Number.isInteger(stage) || stage < 0 || stage > 4) throw new RangeError('Invalid stage');
  if (!Number.isFinite(aspect) || aspect <= 0) throw new RangeError('Aspect must be finite and positive');
  const construct = vector(constructPosition, 'constructPosition');
  if (bounds != null) {
    const direction = mode === 'lab' ? [12.5, 9.2, 15.2] : mode === 'top' ? [0.01, 6, 0.01] : stage === 0 ? [3.8, 2.6, 4.4] : [3.5, 2.7, 4.1];
    return fitCameraToBounds(bounds, { aspect, direction });
  }
  if (mode === 'lab') return { target: [0, 0.6, 0], offset: [12.5, 9.2, 15.2] };
  let target;
  if (stage === 0) target = [-4.8, 0.65, 0.65];
  else if (stage === 1) target = [0.1, 1.1, -0.6];
  else if (stage === 3) target = [4.5, 0.65, 1.8];
  else if (stage === 4) target = [construct[0] * 0.35, Math.min(construct[1], 1.1), construct[2]];
  else target = [construct[0], construct[1] + 0.25, construct[2]];
  const narrowScale = Math.max(1, 1.15 / aspect);
  const base = mode === 'top' ? [0.01, stage === 0 ? 6 : 6.5, 0.01] : stage === 0 ? [3.8, 2.6, 4.4] : [3.5, 2.7, 4.1];
  return { target, offset: base.map(value => value * narrowScale) };
}

export function cameraDelta(previousPosition, nextPosition) {
  const previous = vector(previousPosition, 'previousPosition');
  const next = vector(nextPosition, 'nextPosition');
  return next.map((value, index) => value - previous[index]);
}
