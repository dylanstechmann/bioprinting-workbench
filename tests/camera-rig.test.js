import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraDelta, fitCameraToBounds, getCameraPose } from '../src/camera-rig.js';

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const cornersOf = bounds => {
  const out = [];
  for (let i = 0; i < 8; i++) out.push([i & 1 ? bounds.max[0] : bounds.min[0], i >> 1 & 1 ? bounds.max[1] : bounds.min[1], i >> 2 & 1 ? bounds.max[2] : bounds.min[2]]);
  return out;
};
function assertFits(pose, bounds, aspect, { fovDegrees = 38, padding = 1.15 } = {}) {
  const position = [pose.target[0] + pose.offset[0], pose.target[1] + pose.offset[1], pose.target[2] + pose.offset[2]];
  const forwardRaw = sub(pose.target, position), forward = forwardRaw.map(v => v / Math.hypot(...forwardRaw));
  let up = [0, 1, 0];
  if (Math.abs(dot(forward, up)) > .999) up = [0, 0, -1];
  const rightRaw = cross(forward, up), right = rightRaw.map(v => v / Math.hypot(...rightRaw));
  const screenUp = cross(right, forward);
  const tanV = Math.tan(fovDegrees * Math.PI / 360), tanH = tanV * aspect;
  for (const corner of cornersOf(bounds)) {
    const v = sub(corner, position);
    const depth = dot(v, forward);
    assert.ok(depth > 0, 'corner stays in front of the camera');
    assert.ok(Math.abs(dot(v, right)) * padding <= depth * tanH + 1e-9, 'corner fits horizontally');
    assert.ok(Math.abs(dot(v, screenUp)) * padding <= depth * tanV + 1e-9, 'corner fits vertically');
  }
}

test('camera poses follow all five stages with finite targets and offsets', () => {
  for (let stage = 0; stage <= 4; stage++) {
    for (const mode of ['lab', 'construct', 'top']) {
      const pose = getCameraPose(mode, { stage, constructPosition: [.1, .35, -.6], aspect: 1.4 });
      assert.equal(pose.target.length, 3); assert.equal(pose.offset.length, 3);
      assert.ok([...pose.target, ...pose.offset].every(Number.isFinite));
    }
  }
  assert.deepEqual(getCameraPose('construct', { stage: 0, constructPosition: [0, 0, 0] }).target, [-4.8, .65, .65]);
  assert.deepEqual(getCameraPose('construct', { stage: 3, constructPosition: [0, 0, 0] }).target, [4.5, .65, 1.8]);
  assert.deepEqual(getCameraPose('construct', { stage: 2, constructPosition: [.1, .35, -.6] }).target, [.1, .6, -.6]);
});

test('narrow viewports widen framing and camera deltas preserve orbit movement', () => {
  const wide = getCameraPose('construct', { stage: 2, constructPosition: [0, 0, 0], aspect: 2 });
  const narrow = getCameraPose('construct', { stage: 2, constructPosition: [0, 0, 0], aspect: .5 });
  assert.ok(narrow.offset[1] > wide.offset[1]);
  const delta = cameraDelta([.1, .35, -.6], [4.5, .25, 1.8]);
  [4.4, -.1, 2.4].forEach((expected, index) => assert.ok(Math.abs(delta[index] - expected) < 1e-12));
});

test('camera input validation rejects malformed state', () => {
  const valid = { stage: 2, constructPosition: [0, 0, 0] };
  for (const mode of ['unknown', null, '__proto__']) assert.throws(() => getCameraPose(mode, valid));
  for (const stage of [-1, 5, 1.5, NaN]) assert.throws(() => getCameraPose('lab', { ...valid, stage }));
  for (const aspect of [0, -1, NaN, Infinity]) assert.throws(() => getCameraPose('lab', { ...valid, aspect }));
  for (const position of [null, [0, 0], [0, NaN, 0], '0,0,0']) assert.throws(() => getCameraPose('lab', { ...valid, constructPosition: position }));
  assert.throws(() => cameraDelta([0, 0, 0], [0, Infinity, 0]));
});

test('bounds fitting frames every artwork corner across aspect ratios and paddings', () => {
  const bounds = { min: [-7, 0, -3.5], max: [7, 3.2, 3.5] };
  for (const aspect of [.45, 1, 1.4, 1.78, 2.4]) {
    const pose = fitCameraToBounds(bounds, { aspect });
    assert.deepEqual(pose.target, [0, 1.6, 0]);
    assertFits(pose, bounds, aspect);
  }
  const narrow = Math.hypot(...fitCameraToBounds(bounds, { aspect: .45 }).offset);
  const wide = Math.hypot(...fitCameraToBounds(bounds, { aspect: 2.4 }).offset);
  assert.ok(narrow > wide, 'narrow aspects pull the camera farther back');
  const padded = Math.hypot(...fitCameraToBounds(bounds, { aspect: 1, padding: 2 }).offset);
  assert.ok(padded > Math.hypot(...fitCameraToBounds(bounds, { aspect: 1 }).offset), 'padding adds margin');
});

test('bounds fitting solves the symmetric cube exactly and clamps distances', () => {
  const cube = { min: [-2, -2, -2], max: [2, 2, 2] };
  const pose = fitCameraToBounds(cube, { aspect: 1, direction: [0, 0, 1], padding: 1 });
  const expected = 2 + 2 / Math.tan(19 * Math.PI / 180);
  assert.ok(Math.abs(Math.hypot(...pose.offset) - expected) < 1e-9, 'exact corner-geometry distance');
  assert.deepEqual(pose.target, [0, 0, 0]);
  assert.equal(Math.hypot(...fitCameraToBounds({ min: [1, 1, 1], max: [1, 1, 1] }, { direction: [0, 0, 1] }).offset), 2.5);
  const clamped = fitCameraToBounds({ min: [-40, 0, -40], max: [40, 20, 40] }, { aspect: .45, maxDistance: 33 });
  assert.ok(Math.hypot(...clamped.offset) <= 33 + 1e-9, 'maxDistance honored');
  const vertical = fitCameraToBounds(cube, { aspect: 1, direction: [0, 6, 0] });
  assert.ok(vertical.offset.every(Number.isFinite), 'vertical directions use a fallback up axis');
});

test('bounds fitting rejects malformed bounds, options and directions', () => {
  const bounds = { min: [0, 0, 0], max: [1, 1, 1] };
  for (const bad of [null, 'box', 3, [], { min: [0, 0, 0] }, { min: [0, 0, 0], max: [1, 1, 1], depth: 0 }, { min: [0, 0], max: [1, 1, 1] }, { min: [0, NaN, 0], max: [1, 1, 1] }, { min: [2, 2, 2], max: [1, 1, 1] }]) {
    assert.throws(() => fitCameraToBounds(bad));
  }
  for (const aspect of [0, -1, NaN, Infinity]) assert.throws(() => fitCameraToBounds(bounds, { aspect }));
  for (const fov of [0, 121, NaN]) assert.throws(() => fitCameraToBounds(bounds, { fovDegrees: fov }));
  for (const padding of [.9, 2.1, NaN]) assert.throws(() => fitCameraToBounds(bounds, { padding }));
  for (const direction of [[0, 0, 0], [0, 0, NaN], null, 3]) assert.throws(() => fitCameraToBounds(bounds, { direction }));
  for (const up of [[0, 0, 0], [NaN, 0, 0]]) assert.throws(() => fitCameraToBounds(bounds, { up }));
  assert.throws(() => fitCameraToBounds(bounds, { minDistance: 0 }));
  assert.throws(() => fitCameraToBounds(bounds, { maxDistance: 1 }));
});

test('getCameraPose honors artwork bounds and keeps legacy poses without them', () => {
  const bounds = { min: [-7, 0, -3.5], max: [7, 3.2, 3.5] };
  const options = { stage: 2, constructPosition: [0, 0, 0], aspect: 1.4 };
  const legacy = getCameraPose('lab', options);
  const fitted = getCameraPose('lab', { ...options, bounds });
  assert.deepEqual(fitted.target, [0, 1.6, 0]);
  const wideBench = getCameraPose('lab', { ...options, bounds: { min: [-14, 0, -7], max: [14, 6, 7] } });
  assert.ok(Math.hypot(...wideBench.offset) > Math.hypot(...fitted.offset), 'wider artwork pulls the camera farther back');
  assert.ok(Math.hypot(...fitted.offset) >= 2.5, 'fitted distance respects the orbit minimum');
  assertFits(fitted, bounds, 1.4);
  assertFits(wideBench, { min: [-14, 0, -7], max: [14, 6, 7] }, 1.4);
  for (const mode of ['construct', 'top']) {
    const pose = getCameraPose(mode, { ...options, bounds });
    assertFits(pose, bounds, 1.4);
  }
  assert.deepEqual(getCameraPose('lab', options), legacy, 'no-bounds behavior unchanged');
});
