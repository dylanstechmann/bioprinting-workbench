// Deterministic diagonal-preconditioned conjugate gradients for bounded SPD systems.
export function solvePCG({ apply, diagonal, rhs, tolerance = 1e-10, maxIterations = 5000 }) {
  const n = rhs.length;
  if (!n || n > 33 ** 3 || diagonal.length !== n || !Number.isFinite(tolerance) || tolerance <= 0 || !Number.isInteger(maxIterations) || maxIterations < 1 || maxIterations > 5000) throw new RangeError('Invalid solver bounds');
  if (![...rhs].every(Number.isFinite) || [...diagonal].some(d => !Number.isFinite(d) || d <= 0)) throw new RangeError('Invalid solver coefficients');
  const x = new Float64Array(n), r = Float64Array.from(rhs), z = new Float64Array(n), p = new Float64Array(n), ap = new Float64Array(n);
  const dot = (a, b) => { let s = 0; for (let i = 0; i < n; i++) s += a[i] * b[i]; return s; };
  const norm = a => { let s = 0; for (const v of a) s = Math.max(s, Math.abs(v)); return s; };
  const scale = Math.max(1, norm(rhs)), target = tolerance * scale;
  for (let i = 0; i < n; i++) p[i] = z[i] = r[i] / diagonal[i];
  let rz = dot(r, z), iterations = 0, reason = 'iteration-limit';
  if (norm(r) <= target) reason = 'converged';
  else for (let k = 0; k < maxIterations; k++) {
    apply(p, ap);
    const curvature = dot(p, ap);
    if (!Number.isFinite(curvature) || curvature <= 0 || !Number.isFinite(rz)) { reason = 'breakdown'; break; }
    const alpha = rz / curvature;
    for (let i = 0; i < n; i++) { x[i] += alpha * p[i]; r[i] -= alpha * ap[i]; }
    iterations = k + 1;
    if (norm(r) <= target) { reason = 'converged'; break; }
    for (let i = 0; i < n; i++) z[i] = r[i] / diagonal[i];
    const next = dot(r, z), beta = next / rz;
    for (let i = 0; i < n; i++) p[i] = z[i] + beta * p[i];
    rz = next;
  }
  apply(x, ap);
  for (let i = 0; i < n; i++) r[i] = rhs[i] - ap[i];
  const residualInfinity = norm(r), converged = Number.isFinite(residualInfinity) && residualInfinity <= target && [...x].every(Number.isFinite);
  return { values: x, iterations, residualInfinity, relativeResidual: residualInfinity / scale, converged, reason: converged ? 'converged' : reason === 'converged' ? 'true-residual-failure' : reason };
}