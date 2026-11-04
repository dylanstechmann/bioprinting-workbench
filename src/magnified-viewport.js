import { fitCameraToBounds, CAMERA_LIMITS } from './camera-rig.js';

/** Magnified construct inset: a second, narrow-FOV camera pass of the live scene rendered
 * into a framed bottom-right region of the existing canvas. Presentation only — it never
 * changes scenario state and makes no physical dimension claim. One WebGL context only. */
export const MAGNIFIED_FOV_DEGREES = 22;
export const INSET_FRACTION = 0.28;
const INSET_ASPECT = 4 / 3;
const INSET_MARGIN = 12;

/**
 * @param {{ THREE: object, renderer: object, scene: object, getBounds: () => {min: number[], max: number[]}, getQuality?: () => string }} deps
 */
export function createMagnifiedViewport({ THREE, renderer, scene, getBounds, getQuality = () => 'unspecified' }) {
  if (!THREE || typeof THREE.PerspectiveCamera !== 'function') throw new TypeError('Magnified viewport needs THREE.PerspectiveCamera');
  if (!renderer || typeof renderer.render !== 'function' || !renderer.domElement) throw new TypeError('Magnified viewport needs a renderer with domElement');
  if (!scene || typeof scene !== 'object') throw new TypeError('Magnified viewport needs a scene');
  if (typeof getBounds !== 'function') throw new TypeError('Magnified viewport needs a getBounds function');
  if (typeof getQuality !== 'function') throw new TypeError('getQuality must be a function');

  let enabled = false, disposed = false, lastError = null;
  let lastPose = { target: [0, 0.6, 0], offset: [3.5, 2.7, 4.1] };
  const insetCamera = new THREE.PerspectiveCamera(MAGNIFIED_FOV_DEGREES, INSET_ASPECT, CAMERA_LIMITS.near, CAMERA_LIMITS.far);

  function setEnabled(on) {
    enabled = on === true;
    if (!enabled) lastError = null;
  }

  /** Render the inset pass. No-op unless enabled; never throws out of the draw loop:
   *  degenerate bounds skip the pass and surface in diagnostics(). */
  function renderInset() {
    if (disposed || !enabled) return false;
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    if (!w || !h) return false;
    const insetW = Math.floor(Math.min(w * INSET_FRACTION, w - 2 * INSET_MARGIN, (h - 2 * INSET_MARGIN) * INSET_ASPECT));
    const insetH = Math.round(insetW / INSET_ASPECT);
    if (insetW < 40 || insetH < 30) return false;
    const x = w - insetW - INSET_MARGIN, y = INSET_MARGIN; // GL viewport origin is bottom-left.
    let pose;
    try {
      pose = fitCameraToBounds(getBounds(), { aspect: insetW / insetH, fovDegrees: MAGNIFIED_FOV_DEGREES, padding: 1.12, direction: [3.5, 2.7, 4.1] });
    } catch (error) {
      lastError = error.message;
      return false;
    }
    lastError = null;
    lastPose = pose;
    insetCamera.aspect = insetW / insetH;
    insetCamera.fov = MAGNIFIED_FOV_DEGREES;
    insetCamera.position.set(pose.target[0] + pose.offset[0], pose.target[1] + pose.offset[1], pose.target[2] + pose.offset[2]);
    insetCamera.lookAt(pose.target[0], pose.target[1], pose.target[2]);
    insetCamera.updateProjectionMatrix();
    const hadScissorTest = typeof renderer.getScissorTest === 'function' ? renderer.getScissorTest() : false;
    const readRect = getter => {
      // Three.js getters copy into a Vector4-like target; preserve logical pixels,
      // not the DPR-scaled drawing-buffer rectangle.
      const target = { x: 0, y: 0, z: w, w: h, copy(v) { Object.assign(this, v); return this; } };
      const rect = typeof renderer[getter] === 'function' ? renderer[getter](target) : target;
      return [rect.x, rect.y, rect.z, rect.w];
    };
    const scissor = readRect('getScissor'), viewport = readRect('getViewport');
    let rendered = false;
    try {
      renderer.setScissorTest(true);
      renderer.setScissor(x, y, insetW, insetH);
      renderer.setViewport(x, y, insetW, insetH);
      renderer.render(scene, insetCamera);
      rendered = true;
    } catch (error) {
      lastError = error.message;
    } finally {
      renderer.setScissor(...scissor);
      renderer.setViewport(...viewport);
      renderer.setScissorTest(hadScissorTest);
    }
    return rendered;
  }

  function diagnostics() {
    return {
      enabled,
      quality: getQuality(),
      fovDegrees: MAGNIFIED_FOV_DEGREES,
      cameraPosition: lastPose.target.map((value, i) => value + lastPose.offset[i]),
      cameraTarget: [...lastPose.target],
      lastError,
    };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    enabled = false;
  }

  return { setEnabled, renderInset, diagnostics, dispose };
}
