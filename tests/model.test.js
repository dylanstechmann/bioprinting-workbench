import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { DEFAULTS, STAGES, validate, random, scaffold, sample, snapshot } from '../src/model.js';

test('five distinct teaching stages retain evidence boundaries', () => {
  assert.equal(STAGES.length, 5);
  assert.match(STAGES[4].description, /No surgery/);
  assert.match(STAGES[3].description, /not automatically blood vessels/);
});
test('default scaffold alternates orthogonal layers', () => {
  const lines = scaffold(DEFAULTS);
  assert.equal(lines.length, 42);
  for (const l of lines) { assert.equal(l.a[1], l.b[1]); assert.ok(l.layer % 2 ? l.a[0] === l.b[0] : l.a[2] === l.b[2]); }
});
test('denser spacing and more layers increase filament count', () => {
  assert.ok(scaffold({ ...DEFAULTS, spacing: .24 }).length > scaffold(DEFAULTS).length);
  assert.ok(scaffold({ ...DEFAULTS, layers: 9 }).length > scaffold(DEFAULTS).length);
});
test('stage boundaries are deterministic and bounded', () => {
  assert.equal(sample(-1).stage, 0); assert.equal(sample(99).stage, 4);
  for (let stage = 0; stage < 5; stage++) assert.equal(sample(stage).stage, stage);
  assert.equal(sample(1.5).printed, .5); assert.equal(sample(2.5).occupancy, .3);
});
test('channels and zero perfusion independently stop tracer flow', () => {
  assert.equal(sample(3.5, { ...DEFAULTS, channels: false }).flow, 0);
  assert.equal(sample(3.5, { ...DEFAULTS, perfusion: 0 }).flow, 0);
  assert.equal(sample(3.5).flow, .6); assert.equal(sample(2.9).flow, 0);
});
test('recipient labels do not fabricate species-specific predictions', () => {
  assert.deepEqual(sample(4.5, { ...DEFAULTS, recipient: 'animal' }), sample(4.5, { ...DEFAULTS, recipient: 'human' }));
});
test('invalid inputs are rejected rather than silently interpreted', () => {
  for (const patch of [{ layers: 3.5 }, { spacing: NaN }, { layers: 12 }, { population: -1 }, { perfusion: Infinity }, { recipient: 'mouse' }, { channels: 1 }]) assert.throws(() => validate({ ...DEFAULTS, ...patch }));
  assert.throws(() => sample(NaN));
});
test('random source is reproducible and bounded', () => {
  const a = random(42), b = random(42);
  for (let i = 0; i < 500; i++) { const n = a(); assert.equal(n, b()); assert.ok(n >= 0 && n < 1); }
});
test('scenario exports preserve parameters, seed, state and limitations', () => {
  const result = JSON.parse(JSON.stringify(snapshot(3.2, DEFAULTS)));
  assert.deepEqual(result.parameters, DEFAULTS); assert.equal(result.seed, 42);
  assert.equal(result.state.stage, 3); assert.match(result.limitations, /Not biologically calibrated/);
  result.parameters.layers = 9; assert.equal(DEFAULTS.layers, 6);
});
test('every sampled scenario remains bounded across parameter extremes', () => {
  for (const spacing of [.24, .6]) for (const layers of [3, 9]) for (let t = 0; t <= 5; t += .05) {
    const state = sample(t, { ...DEFAULTS, spacing, layers });
    for (const key of ['occupancy', 'printed', 'expansion', 'flow', 'integration']) assert.ok(state[key] >= 0 && state[key] <= 1, key);
  }
});
test('runtime is locally bundled with license and no CDN dependency', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /AI-assisted/); assert.match(html, /cited research-reference cards/); assert.match(html, /no transplant guidance/i);
  assert.ok(!html.includes('https://cdn'));
  for (const file of ['three.module.js', 'three.core.js', 'OrbitControls.js', 'RoomEnvironment.js', 'RoundedBoxGeometry.js', 'LICENSE']) assert.ok(existsSync(new URL(`../vendor/three/${file}`, import.meta.url)));
});