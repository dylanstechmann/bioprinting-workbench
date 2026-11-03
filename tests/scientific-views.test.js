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
const FakeTHREE = {
  Group: class extends Obj {},
  Mesh: class extends Obj { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; } },
  PlaneGeometry: Geometry, BoxGeometry: Geometry, SphereGeometry: Geometry,
  MeshBasicMaterial: Material, MeshStandardMaterial: Material,
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
    ui.setState({ ...defaultScientificViewState(), scale: 'construct' });
    assert.equal($('presentation-scale').value, 'construct');
    assert.equal(changes.length, 2);
    ui.dispose();
  } finally {
    globalThis.document = original;
  }
});
