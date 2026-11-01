import test from 'node:test';
import assert from 'node:assert/strict';
import { oxygenProfile } from '../src/oxygen.js';

test('zero demand gives a uniform field', () => {
  const r = oxygenProfile(0); assert.ok(r.profile.every(p => p.concentration === 1));
});
test('boundaries, symmetry, center and extremes satisfy analytical solution', () => {
  for (const demand of [0, .5, 1, 2]) {
    const r = oxygenProfile(demand, 101); assert.equal(r.profile[0].concentration, 1); assert.equal(r.profile.at(-1).concentration, 1);
    assert.equal(r.profile[50].concentration, 1 - demand / 2);
    for (let i = 0; i < r.points; i++) assert.ok(Math.abs(r.profile[i].concentration - r.profile.at(-1 - i).concentration) < 1e-12);
  }
});
test('finite difference recovers constant curvature and flux balance', () => {
  const r = oxygenProfile(1.3, 101), h = 2 / (r.points - 1), c = r.profile.map(p => p.concentration);
  for (let i = 1; i < c.length - 1; i++) assert.ok(Math.abs((c[i-1] - 2*c[i] + c[i+1]) / (h*h) - 1.3) < 1e-10);
  const left = (-3*c[0] + 4*c[1] - c[2]) / (2*h), right = (3*c.at(-1) - 4*c.at(-2) + c.at(-3)) / (2*h);
  assert.ok(Math.abs(right - left - 2*1.3) < 1e-10);
});
test('rejects invalid demand, resolution and nonfinite inputs', () => {
  for (const value of [-.01, 2.01, NaN, Infinity]) assert.throws(() => oxygenProfile(value));
  for (const n of [2, 4, 1003, NaN]) assert.throws(() => oxygenProfile(1, n));
});
test('declares synthetic provenance and no calibration', () => {
  const r = oxygenProfile(1); assert.equal(r.calibration, 'none-synthetic'); assert.equal(r.units, 'dimensionless');
});