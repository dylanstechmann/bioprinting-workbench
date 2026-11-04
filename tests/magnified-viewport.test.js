import test from 'node:test';
import assert from 'node:assert/strict';
import { createMagnifiedViewport, MAGNIFIED_FOV_DEGREES, INSET_FRACTION } from '../src/magnified-viewport.js';
import { CAMERA_LIMITS } from '../src/camera-rig.js';

class FakeCamera {
  constructor(fov, aspect, near, far) {
    this.fov = fov; this.aspect = aspect; this.near = near; this.far = far;
    this.position = { x: 0, y: 0, z: 0, set: (x, y, z) => Object.assign(this.position, { x, y, z }) };
    this.lookAtArgs = null; this.updated = false;
  }
  lookAt(...args) { this.lookAtArgs = args; }
  updateProjectionMatrix() { this.updated = true; }
}
const FakeTHREE = { PerspectiveCamera: FakeCamera };

function stubRenderer(w = 800, h = 600) {
  const calls = [];
  return {
    calls,
    domElement: { clientWidth: w, clientHeight: h },
    scissorTest: false,
    setScissorTest(on) { this.scissorTest = on; calls.push(['scissorTest', on]); },
    getScissorTest() { return this.scissorTest; },
    setScissor(...args) { calls.push(['scissor', ...args]); },
    setViewport(...args) { calls.push(['viewport', ...args]); },
    render(scene, camera) { calls.push(['render', scene, camera]); },
  };
}

const bounds = () => ({ min: [-1, 0, -1], max: [1, 1.2, 1] });

test('disabled inset renders nothing and never touches renderer state', () => {
  const renderer = stubRenderer();
  const viewport = createMagnifiedViewport({ THREE: FakeTHREE, renderer, scene: {}, getBounds: bounds });
  viewport.renderInset();
  assert.equal(renderer.calls.length, 0);
  assert.equal(viewport.diagnostics().enabled, false);
});

test('enabled inset renders a fitted narrow-FOV pass and restores scissor state', () => {
  const renderer = stubRenderer();
  const scene = { name: 'scene' };
  const viewport = createMagnifiedViewport({ THREE: FakeTHREE, renderer, scene, getBounds: bounds, getQuality: () => 'balanced' });
  viewport.setEnabled(true);
  viewport.renderInset();
  const renders = renderer.calls.filter(call => call[0] === 'render');
  assert.equal(renders.length, 1);
  assert.equal(renders[0][1], scene);
  const camera = renders[0][2];
  assert.ok(camera instanceof FakeCamera);
  assert.equal(camera.fov, MAGNIFIED_FOV_DEGREES);
  assert.ok(camera.updated, 'projection matrix updated');
  assert.ok(Math.abs(camera.aspect - (Math.floor(800 * INSET_FRACTION) / Math.round(Math.floor(800 * INSET_FRACTION) / (4 / 3)))) < 1e-6, 'inset aspect matches its pixel rectangle');
  const [, x, y, insetW, insetH] = renderer.calls.find(call => call[0] === 'viewport');
  assert.ok(insetW > 0 && insetH > 0 && x >= 0 && y >= 0, 'inset sits inside the canvas');
  assert.ok(x + insetW <= 800 && y + insetH <= 600, 'inset stays inside the canvas bounds');
  assert.equal(renderer.calls.at(-1)[0], 'scissorTest');
  assert.equal(renderer.calls.at(-1)[1], false, 'scissor test restored after the inset pass');
  const diagnostics = viewport.diagnostics();
  assert.equal(diagnostics.enabled, true);
  assert.equal(diagnostics.quality, 'balanced');
  assert.equal(diagnostics.fovDegrees, MAGNIFIED_FOV_DEGREES);
  assert.equal(diagnostics.cameraPosition.length, 3);
  assert.equal(diagnostics.cameraTarget.length, 3);
  assert.ok(diagnostics.cameraTarget.every(Number.isFinite));
  assert.equal(diagnostics.lastError, null);
});

test('fitted pose respects the minimum camera distance', () => {
  const renderer = stubRenderer();
  const viewport = createMagnifiedViewport({ THREE: FakeTHREE, renderer, scene: {}, getBounds: () => ({ min: [0, 0, 0], max: [0.1, 0.1, 0.1] }) });
  viewport.setEnabled(true);
  viewport.renderInset();
  const { cameraPosition, cameraTarget } = viewport.diagnostics();
  const distance = Math.hypot(...cameraPosition.map((value, i) => value - cameraTarget[i]));
  assert.ok(distance >= CAMERA_LIMITS.minDistance - 1e-6, `distance ${distance} respects minDistance`);
});

test('render failure restores exact prior rectangles and reports diagnostics', () => {
  const renderer = stubRenderer();
  const priorViewport = [7, 9, 321, 123], priorScissor = [11, 13, 210, 110];
  renderer.getViewport = target => target.copy({ x: 7, y: 9, z: 321, w: 123 });
  renderer.getScissor = target => target.copy({ x: 11, y: 13, z: 210, w: 110 });
  renderer.scissorTest = true;
  renderer.render = () => { throw new Error('GPU failure'); };
  const viewport = createMagnifiedViewport({ THREE: FakeTHREE, renderer, scene: {}, getBounds: bounds });
  viewport.setEnabled(true);
  assert.doesNotThrow(() => viewport.renderInset());
  assert.deepEqual(renderer.calls.filter(c => c[0] === 'viewport').at(-1).slice(1), priorViewport);
  assert.deepEqual(renderer.calls.filter(c => c[0] === 'scissor').at(-1).slice(1), priorScissor);
  assert.equal(renderer.scissorTest, true);
  assert.match(viewport.diagnostics().lastError, /GPU failure/);
});

test('short canvas constrains both inset dimensions', () => {
  const renderer = stubRenderer(1440, 90);
  const viewport = createMagnifiedViewport({ THREE: FakeTHREE, renderer, scene: {}, getBounds: bounds });
  viewport.setEnabled(true);
  viewport.renderInset();
  const [, x, y, width, height] = renderer.calls.find(c => c[0] === 'viewport');
  assert.ok(x >= 0 && y >= 0 && x + width <= 1440 && y + height <= 90);
});

test('degenerate bounds skip the inset without throwing and surface in diagnostics', () => {
  const renderer = stubRenderer();
  const viewport = createMagnifiedViewport({ THREE: FakeTHREE, renderer, scene: {}, getBounds: () => ({ min: [1, 1, 1], max: [0, 0, 0] }) });
  viewport.setEnabled(true);
  viewport.renderInset();
  assert.equal(renderer.calls.length, 0, 'no render pass for degenerate bounds');
  assert.match(viewport.diagnostics().lastError, /min must not exceed max/);
});

test('zero-size canvas skips the pass; dispose is idempotent and disables the inset', () => {
  const renderer = stubRenderer(0, 0);
  const viewport = createMagnifiedViewport({ THREE: FakeTHREE, renderer, scene: {}, getBounds: bounds });
  viewport.setEnabled(true);
  viewport.renderInset();
  assert.equal(renderer.calls.length, 0);
  viewport.dispose();
  viewport.dispose();
  viewport.renderInset();
  assert.equal(renderer.calls.length, 0);
  assert.equal(viewport.diagnostics().enabled, false);
});

test('construction rejects missing or malformed dependencies', () => {
  const renderer = stubRenderer();
  assert.throws(() => createMagnifiedViewport({}), TypeError);
  assert.throws(() => createMagnifiedViewport({ THREE: FakeTHREE, scene: {}, getBounds: bounds }), TypeError);
  assert.throws(() => createMagnifiedViewport({ THREE: FakeTHREE, renderer, scene: {}, getBounds: null }), TypeError);
  assert.throws(() => createMagnifiedViewport({ THREE: FakeTHREE, renderer, scene: {}, getBounds: bounds, getQuality: 7 }), TypeError);
  viewportNoop: {
    const viewport = createMagnifiedViewport({ THREE: FakeTHREE, renderer, scene: {}, getBounds: bounds });
    viewport.setEnabled('yes');
    viewport.renderInset();
    assert.equal(renderer.calls.length, 0, 'setEnabled only accepts literal true');
  }
});
