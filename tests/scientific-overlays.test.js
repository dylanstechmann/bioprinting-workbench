import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OVERLAY_DEFINITIONS, MAX_ACTIVE_OVERLAYS, MAX_OVERLAY_TEXTURE_SIDE,
  getOverlayDefinitions, getOverlayDefinition, createScientificOverlays,
} from '../src/scientific-overlays.js';

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
class Geometry { constructor(...args) { this.args = args; this.disposed = false; this.attributes = {}; } dispose() { this.disposed = true; } setAttribute(name, attr) { this.attributes[name] = attr; } }
class Material { constructor(params) { Object.assign(this, params); this.disposed = false; } dispose() { this.disposed = true; } }
const FakeTHREE = {
  Group: class extends Obj {},
  Mesh: class extends Obj { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; } },
  LineSegments: class extends Obj { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; } },
  PlaneGeometry: Geometry, BoxGeometry: Geometry, SphereGeometry: Geometry, BufferGeometry: Geometry,
  MeshBasicMaterial: Material, MeshStandardMaterial: Material, LineBasicMaterial: Material,
  Float32BufferAttribute: class { constructor(array, itemSize) { this.array = array; this.itemSize = itemSize; } },
  DataTexture: class { constructor(data, width, height) { this.image = { data, width, height }; this.disposed = false; } dispose() { this.disposed = true; } },
};

const field = (width, height) => ({ values: Float64Array.from({ length: width * height }, (_, i) => i / (width * height)), width, height });

test('overlay definitions are explicit, unit-labelled reference layers', () => {
  assert.equal(OVERLAY_DEFINITIONS.length, 5);
  for (const def of getOverlayDefinitions()) {
    assert.ok(def.id && def.modelId && def.legend.length > 20);
    assert.ok(['normalized-box', 'network', 'illustrative'].includes(def.coordinateSpace));
    assert.ok(['model-field', 'network', 'reference-panel'].includes(def.representation));
    assert.equal(def.requiresRun, true);
    assert.match(def.legend, /Not /);
  }
  assert.throws(() => getOverlayDefinition('ghost'), RangeError);
});

test('field overlays build bounded textures and enforce the 256 cap', () => {
  const parent = new FakeTHREE.Group();
  const overlays = createScientificOverlays({ THREE: FakeTHREE, parent });
  overlays.setOverlay('box-oxygen-slice', field(16, 16));
  assert.deepEqual(overlays.active(), ['box-oxygen-slice']);
  assert.equal(parent.children.length, 1);
  assert.throws(() => overlays.setOverlay('box-oxygen-slice', field(MAX_OVERLAY_TEXTURE_SIDE + 1, 4)), RangeError);
  assert.throws(() => overlays.setOverlay('box-oxygen-slice', { values: [1, 2], width: 3, height: 3 }), RangeError);
  assert.throws(() => overlays.setOverlay('slab-profile', { values: [], width: 0, height: 0 }), RangeError);
  overlays.dispose();
  assert.equal(parent.children.length, 0);
});

test('network overlays validate coordinates and cap edge counts', () => {
  const parent = new FakeTHREE.Group();
  const overlays = createScientificOverlays({ THREE: FakeTHREE, parent });
  overlays.setOverlay('flow-network', { edges: [{ from: [-1, 0, 0], to: [1, 0, 0], flow: 0.4 }] });
  assert.deepEqual(overlays.active(), ['flow-network']);
  assert.throws(() => overlays.setOverlay('flow-network', { edges: [{ from: [0, 0], to: [1, 0] }] }), TypeError);
  assert.throws(() => overlays.setOverlay('flow-network', { edges: [{ from: [NaN, 0, 0], to: [1, 0, 0] }] }), RangeError);
  overlays.dispose();
});

test('at most four overlays are active and legend entries are complete', () => {
  const parent = new FakeTHREE.Group();
  const overlays = createScientificOverlays({ THREE: FakeTHREE, parent });
  const ids = OVERLAY_DEFINITIONS.map(d => d.id);
  overlays.setOverlay(ids[0], field(4, 4));
  overlays.setOverlay(ids[1], field(4, 4));
  overlays.setOverlay(ids[2], { edges: [] });
  overlays.setOverlay(ids[3], { marker: true });
  assert.throws(() => overlays.setOverlay(ids[4], { marker: true }), RangeError);
  assert.equal(overlays.active().length, MAX_ACTIVE_OVERLAYS);
  const legend = overlays.getLegend();
  assert.equal(legend.length, 4);
  for (const entry of legend) assert.ok(entry.id && entry.unit && entry.legend);
  overlays.setOverlay(ids[0], null);
  overlays.setOverlay(ids[4], { marker: true });
  assert.equal(overlays.active().length, 4);
  overlays.clear();
  assert.deepEqual(overlays.active(), []);
  assert.equal(parent.children.length, 0);
});

test('replacing an overlay disposes the previous resources and rejects unknown ids', () => {
  const parent = new FakeTHREE.Group();
  const overlays = createScientificOverlays({ THREE: FakeTHREE, parent });
  overlays.setOverlay('box-oxygen-slice', field(4, 4));
  const firstObject = parent.children[0];
  const firstTexture = firstObject.material.map;
  overlays.setOverlay('box-oxygen-slice', field(8, 8));
  assert.equal(parent.children.length, 1);
  assert.notEqual(parent.children[0], firstObject);
  assert.equal(firstTexture.disposed, true);
  assert.throws(() => overlays.setOverlay('ghost', {}), RangeError);
  assert.throws(() => overlays.setOverlay('box-oxygen-slice'), TypeError);
  overlays.dispose();
});

test('both field overlays encode samples and request texture upload', () => {
  const parent = new FakeTHREE.Group();
  const overlays = createScientificOverlays({ THREE: FakeTHREE, parent });
  for (const id of ['box-oxygen-slice', 'slab-profile']) {
    overlays.setOverlay(id, { width: 2, height: 1, values: [0, 1] });
    const texture = parent.children.at(-1).material.map;
    assert.ok(texture.image.data instanceof Uint8Array);
    assert.deepEqual([...texture.image.data], [0, 0, 255, 255, 255, 0, 0, 255]);
    assert.equal(texture.needsUpdate, true);
    assert.throws(() => overlays.setOverlay(id, { width: 1, height: 1, values: [NaN] }), /finite/);
  }
});

test('failed replacement cleans allocations while preserving the previous overlay', () => {
  const parent = new FakeTHREE.Group();
  let allocated;
  const THREE = { ...FakeTHREE, DataTexture: class extends FakeTHREE.DataTexture {
    constructor(...args) { super(...args); allocated = this; }
  } };
  const overlays = createScientificOverlays({ THREE, parent });
  overlays.setOverlay('box-oxygen-slice', field(2, 2));
  const previous = parent.children[0];
  THREE.PlaneGeometry = class { constructor() { throw new Error('allocation failed'); } };
  assert.throws(() => overlays.setOverlay('box-oxygen-slice', field(4, 4)), /allocation failed/);
  assert.equal(allocated.disposed, true);
  assert.deepEqual(parent.children, [previous]);
  assert.equal(previous.material.disposed, false);
});
