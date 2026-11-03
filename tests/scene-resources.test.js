import test from 'node:test';
import assert from 'node:assert/strict';
import { disposeObjectResources } from '../src/scene-resources.js';

test('scene resource disposal deduplicates shared geometry, materials and textures', () => {
  const counts = { geometry: 0, material: 0, texture: 0 };
  const geometry = { dispose() { counts.geometry++; } };
  const texture = { isTexture: true, dispose() { counts.texture++; } };
  const material = { map: texture, dispose() { counts.material++; } };
  const otherMaterial = { map: texture, dispose() { counts.material++; } };
  const root = { traverse(fn) {
    fn({ geometry, material });
    fn({ geometry, material: [material, otherMaterial] });
    fn({ material: null });
  } };
  assert.deepEqual(disposeObjectResources(root), { geometries: 1, materials: 2, textures: 1 });
  assert.deepEqual(counts, { geometry: 1, material: 2, texture: 1 });
});

test('resource helper requires a traversable root', () => {
  for (const value of [null, {}, 1, 'scene']) assert.throws(() => disposeObjectResources(value), TypeError);
});
