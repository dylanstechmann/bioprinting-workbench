import test from 'node:test';
import assert from 'node:assert/strict';
import { getEnvironmentSpecs, validateEnvironmentId, createEnvironment, ENVIRONMENT_IDS } from '../src/environment.js';

class Resource { constructor(tag) { this.tag = tag; this.disposed = false; } dispose() { this.disposed = true; } }
function fakeTHREE() {
  const resources = [];
  const tracked = cls => class extends cls { constructor(...args) { super(...args); resources.push(this); } };
  const geometry = base => tracked(class extends Resource { constructor() { super(base); } });
  const material = base => tracked(class extends Resource { constructor() { super(base); this.opacity = 1; this.side = 'front'; } });
  const THREE = {
    Group: class { constructor() { this.children = []; } add(o) { this.children.push(o); } remove(o) { const i = this.children.indexOf(o); if (i >= 0) this.children.splice(i, 1); } },
    Mesh: class { constructor(geometry, material) { this.geometry = geometry; this.material = material; this.position = { x: 0, y: 0, z: 0, set() {} }; this.rotation = { x: 0, y: 0, z: 0 }; this.castShadow = false; this.receiveShadow = false; } },
    BoxGeometry: geometry('box'), CylinderGeometry: geometry('cylinder'), SphereGeometry: geometry('sphere'), TorusGeometry: geometry('torus'), IcosahedronGeometry: geometry('icosahedron'),
    MeshStandardMaterial: material('standard'), MeshPhysicalMaterial: material('physical'),
    CanvasTexture: tracked(class extends Resource { constructor() { super('canvas'); this.wrapS = this.wrapT = null; this.colorSpace = null; this.anisotropy = 0; this.repeat = { set() {} }; } }),
    Color: class { constructor(c) { this.c = c; } }, Fog: class { constructor(c, n, f) { this.c = c; this.n = n; this.f = f; } },
    RepeatWrapping: 'repeat', SRGBColorSpace: 'srgb', FrontSide: 'front', DoubleSide: 'double',
  };
  return { THREE, resources };
}
function fakeScene() {
  return { children: [], add(o) { this.children.push(o); }, remove(o) { const i = this.children.indexOf(o); if (i >= 0) this.children.splice(i, 1); }, background: 'unset', fog: 'unset' };
}

test('environment specs separate fiction and validate ids', () => {
  const specs = getEnvironmentSpecs();
  assert.deepEqual(ENVIRONMENT_IDS, specs.map(s => s.id));
  const treedome = specs.find(s => s.id === 'treedome');
  assert.equal(treedome.fictional, true);
  assert.match(treedome.attribution, /SpongeBob SquarePants/);
  assert.match(treedome.attribution, /Unofficial/);
  assert.equal(specs.find(s => s.id === 'lab').fictional, false);
  assert.equal(validateEnvironmentId('lab'), 'lab');
  assert.equal(validateEnvironmentId('treedome'), 'treedome');
  assert.throws(() => validateEnvironmentId('sandy-house'));
  assert.throws(() => createEnvironment({ THREE: null, scene: fakeScene() }));
});

test('theme switches rebuild owned resources without growth; teardown disposes once', () => {
  const { THREE, resources } = fakeTHREE();
  const scene = fakeScene();
  const env = createEnvironment({ THREE, scene });
  env.setEnvironment('lab');
  const lab = env.diagnostics();
  assert.equal(lab.id, 'lab');
  assert.equal(lab.fictional, false);
  assert.ok(lab.ownedGeometries > 10 && lab.ownedMaterials > 5);
  env.setEnvironment('treedome');
  const dome = env.diagnostics();
  assert.equal(dome.id, 'treedome');
  assert.equal(dome.fictional, true);
  assert.equal(scene.background.c, '#8fc7dd');
  env.update(5);
  env.update(5, { reducedMotion: true });
  env.setEnvironment('lab');
  const again = env.diagnostics();
  assert.equal(again.ownedGeometries, lab.ownedGeometries);
  assert.equal(again.ownedMaterials, lab.ownedMaterials);
  assert.equal(again.ownedObjects, lab.ownedObjects);
  assert.equal(again.ownedTextures, lab.ownedTextures);
  env.dispose();
  env.dispose();
  assert.equal(env.diagnostics().id, null);
  assert.throws(() => env.setEnvironment('lab'));
  assert.ok(resources.every(r => r.disposed));
  assert.equal(scene.children.length, 0);
  assert.equal(scene.background, null);
});