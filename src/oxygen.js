// Idealized steady 1D slab: c'' = demand, c(-1) = c(1) = 1.
// No biological parameter values, channel or flow coupling are implied.
export function oxygenProfile(demand, points = 41) {
  if (!Number.isFinite(demand) || demand < 0 || demand > 2) throw new RangeError('Demand must be in [0, 2]');
  if (!Number.isInteger(points) || points < 3 || points > 1001 || points % 2 === 0) throw new RangeError('Points must be odd and in [3, 1001]');
  const profile = Array.from({ length: points }, (_, i) => {
    const x = -1 + 2 * i / (points - 1);
    return { x, concentration: 1 - demand * (1 - x * x) / 2 };
  });
  return { demand, points, profile, center: 1 - demand / 2, boundary: 1, model: 'steady-1d-slab-constant-consumption', calibration: 'none-synthetic', units: 'dimensionless' };
}