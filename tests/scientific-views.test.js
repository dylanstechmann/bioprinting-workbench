import test from 'node:test';
import assert from 'node:assert/strict';
import { presentationSpec, createScientificViews } from '../src/scientific-views.js';
import { createScientificViewUI } from '../src/scientific-view-ui.js';
import { defaultScientificViewState } from '../src/scientific-view-state.js';

class Obj {
  constructor() {
    this.children = []; this.position = { x: 0, y: 0, z: 0, set: (x, y, z) => Object.assign(this.position, { x, y, z }) };
    this.rotation = { x: 0, y: 0, z: 0 }; this.userData = {}; this.visible = true;
    this.material = null; this.geometry = null;
  }
  add(...objects) { this.children.push(...objects); }
  remove(object) { this.children = this.children.filter(c => c !== object); }
  traverse(fn) { fn(this); for (const child of this.children) child.traverse(fn); }
}
class Geometry { constructor(...args) { this.args = args; this.disposed = false; } dispose() { this.disposed = true; } }
class Material { constructor(params) { Object.assign(this, params); this.disposed = false; } dispose() { this.disposed = true; } }
class Vector3 { constructor(x, y, z) { this.x = x; this.y = y; this.z = z; } set(x, y, z) { Object.assign(this, { x, y, z }); } }
class Plane { constructor(normal, constant) { this.normal = normal; this.constant = constant; } }
const FakeTHREE = {
  Group: class extends Obj {},
  Mesh: class extends Obj { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; } },
  PlaneGeometry: Geometry, BoxGeometry: Geometry, SphereGeometry: Geometry,
  MeshBasicMaterial: Material, MeshStandardMaterial: Material, Vector3, Plane,
};

test('presentation specs frame each scale independently and keep limits visible', () => {
  for (const scale of ['construct', 'cell', 'tissue-context']) {
    const spec = presentationSpec(scale);
    assert.ok(spec.label && spec.notice.length > 40);
    assert.ok(spec.bounds.min.every((v, i) => v < spec.bounds.max[i]));
  }
  assert.match(presentationSpec('cell').notice, /UNKNOWN/);
  assert.match(presentationSpec('tissue-context').notice, /No organ reconstruction/);
  assert.equal(presentationSpec('laboratory').bounds, null);
  assert.throws(() => presentationSpec('organ'), RangeError);
});

test('scale roots are discrete, visibility-scoped and fully disposed', () => {
  const parent = new FakeTHREE.Group();
  const views = createScientificViews({ THREE: FakeTHREE, parent });
  assert.equal(views.scale(), 'laboratory');
  assert.equal(views.group.visible, true);
  views.setScale('cell');
  assert.equal(views.scale(), 'cell');
  assert.equal(views.bounds().min[0], -1.1);
  const cellGroup = views.group.children.find(g => g.name === 'presentation-cell');
  assert.equal(cellGroup.visible, true);
  views.setScale('construct');
  assert.equal(cellGroup.visible, false);
  assert.throws(() => views.setScale('organ'), RangeError);
  views.dispose();
  assert.equal(parent.children.length, 0);
});

test('representation, cut plane and motion are bounded transactional presentation effects', () => {
  const parent = new FakeTHREE.Group();
  const views = createScientificViews({ THREE: FakeTHREE, parent });
  views.setScale('construct');
  const construct = views.group.children.find(g => g.name === 'presentation-construct');
  const illustration = construct.children.filter(c => c.userData.illustration);
  const frames = construct.children.filter(c => c.userData.fieldFrame);
  assert.ok(illustration.length > 0 && frames.length === 1);
  views.setRepresentation('model-field');
  assert.ok(illustration.every(mesh => mesh.visible === false));
  assert.ok(frames.every(frame => frame.visible === true));
  views.setRepresentation('illustration');
  assert.ok(illustration.every(mesh => mesh.visible === true));
  assert.ok(frames.every(frame => frame.visible === false));
  assert.throws(() => views.setRepresentation('ghost'), RangeError);
  views.setCutPlane({ axis: 'x', fraction: 0.5 });
  const materials = [];
  views.group.traverse(object => { if (object.material) materials.push(object.material); });
  assert.ok(materials.length > 0 && materials.every(material => material.clippingPlanes.length === 1));
  assert.deepEqual(views.diagnostics().cutPlane, { axis: 'x', fraction: 0.5 });
  views.setCutPlane(null);
  assert.ok(materials.every(material => !material.clippingPlanes || material.clippingPlanes.length === 0));
  assert.equal(views.diagnostics().cutPlane, null);
  assert.throws(() => views.setCutPlane({ axis: 'diagonal', fraction: 0.5 }), RangeError);
  // An injected clip failure rolls every touched material back and keeps the last good state.
  views.setCutPlane({ axis: 'y', fraction: 0.25 });
  Object.defineProperty(materials[0], 'clippingPlanes', { configurable: true, get() { return []; }, set() { throw new Error('injected clip failure'); } });
  assert.throws(() => views.setCutPlane({ axis: 'z', fraction: 0.75 }), /injected clip failure/);
  assert.deepEqual(views.diagnostics().cutPlane, { axis: 'y', fraction: 0.25 });
  const restored = materials.find((material, index) => index > 0 && material.clippingPlanes?.length === 1);
  assert.equal(restored.clippingPlanes[0].normal.y, -1); // plane normal opposes the cut axis
  views.setMotion('reduced');
  assert.equal(views.diagnostics().motion, 'reduced');
  assert.throws(() => views.setMotion('fast'), RangeError);
  views.dispose();
});

test('the presentation UI drives state changes and renders inert text legends', () => {
  const original = globalThis.document;
  const make = () => ({
    children: [], value: '', checked: false, textContent: '', className: '', type: '', listeners: new Map(),
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = nodes; },
    addEventListener(name, fn) { this.listeners.set(name, fn); },
    removeEventListener(name) { this.listeners.delete(name); },
  });
  const nodes = new Map();
  const $ = id => { if (!nodes.has(id)) nodes.set(id, make()); return nodes.get(id); };
  globalThis.document = { createElement: make };
  try {
    const changes = [];
    const ui = createScientificViewUI({ elements: $, onStateChange: state => changes.push(state) });
    assert.deepEqual(ui.getState(), defaultScientificViewState());
    $('presentation-scale').value = 'cell';
    $('presentation-scale').listeners.get('change')();
    assert.equal(ui.getState().scale, 'cell');
    assert.match($('presentation-notice').textContent, /UNKNOWN/);
    const checkbox = $('presentation-overlay-list').children[0].children[0];
    checkbox.checked = true;
    checkbox.listeners.get('change')();
    assert.deepEqual(ui.getState().overlayIds, ['box-oxygen-slice']);
    assert.equal($('presentation-legend').children.length, 1);
    assert.match($('presentation-legend').children[0].textContent, /Not tissue oxygen/);
    $('presentation-cut-axis').value = 'x';
    $('presentation-cut-fraction').value = '0.5';
    $('presentation-cut-axis').listeners.get('change')();
    assert.deepEqual(ui.getState().cutPlane, { axis: 'x', fraction: 0.5 });
    $('presentation-cut-axis').value = 'off';
    $('presentation-cut-axis').listeners.get('change')();
    assert.equal(ui.getState().cutPlane, null);
    $('presentation-motion').value = 'reduced';
    $('presentation-motion').listeners.get('change')();
    assert.equal(ui.getState().motion, 'reduced');
    ui.setState({ ...defaultScientificViewState(), scale: 'construct' });
    assert.equal($('presentation-scale').value, 'construct');
    assert.equal($('presentation-motion').value, 'system');
    assert.equal(changes.length, 5);
    ui.dispose();
  } finally {
    globalThis.document = original;
  }
});
