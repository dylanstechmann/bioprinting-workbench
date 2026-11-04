import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFieldRGBA } from '../src/overlay-data.js';

test('scalar pixels have explicit RGBA bytes, clamping and deterministic midpoint', () => {
  assert.deepEqual([...makeFieldRGBA([-1, 0, 0.5, 1, 2])], [
    0, 0, 255, 255, 0, 0, 255, 255, 128, 180, 128, 255, 255, 0, 0, 255, 255, 0, 0, 255,
  ]);
  assert.deepEqual([...makeFieldRGBA([4], { min: 4, max: 4 })], [128, 180, 128, 255]);
  assert.throws(() => makeFieldRGBA([NaN]), /finite/);
  assert.throws(() => makeFieldRGBA([Infinity]), /finite/);
  assert.throws(() => makeFieldRGBA(['1']), /finite/);
  assert.throws(() => makeFieldRGBA([1], { min: 2, max: 1 }), /range/);
});