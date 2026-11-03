import test from 'node:test';
import assert from 'node:assert/strict';
import { getQualityPreset } from '../src/visual-quality.js';

test('quality presets are bounded presentation-only copies', () => {
  for (const id of ['low', 'balanced', 'high']) {
    const preset = getQualityPreset(id);
    assert.equal(preset.id, id);
    assert.ok(preset.pixelRatioCap >= 1 && preset.pixelRatioCap <= 2);
    assert.ok(Number.isInteger(preset.shadowMapSize));
    assert.equal(typeof preset.shadows, 'boolean');
    preset.pixelRatioCap = 99;
    assert.notEqual(getQualityPreset(id).pixelRatioCap, 99);
  }
  assert.equal(getQualityPreset('low').shadows, false);
  for (const id of [null, {}, '__proto__', 'unknown', 'constructor']) assert.throws(() => getQualityPreset(id), RangeError);
});