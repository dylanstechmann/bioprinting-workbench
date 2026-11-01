import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const glbPath = new URL('../assets/bioprinter.glb', import.meta.url);
function readGlb() {
  const data = readFileSync(glbPath);
  const magic = data.toString('ascii', 0, 4);
  const version = data.readUInt32LE(4);
  const length = data.readUInt32LE(8);
  const chunkLength = data.readUInt32LE(12);
  const chunkType = data.toString('ascii', 16, 20);
  const json = JSON.parse(data.toString('utf8', 20, 20 + chunkLength));
  return { data, magic, version, length, chunkType, json };
}

test('bioprinter GLB is a valid self-contained glTF 2.0 asset', () => {
  const { data, magic, version, length, chunkType, json } = readGlb();
  assert.equal(magic, 'glTF');
  assert.equal(version, 2);
  assert.equal(length, data.length);
  assert.equal(chunkType, 'JSON');
  assert.ok(json.meshes.length >= 30);
  assert.ok(json.materials.length >= 4);
  for (const buffer of json.buffers) assert.ok(!buffer.uri, 'buffers must be embedded in the GLB');
});

test('GLB contains only authored printer nodes and a glass material', () => {
  const { json } = readGlb();
  const names = json.nodes.map(n => n.name || '');
  assert.ok(names.every(n => n === '' || n.startsWith('Printer_')), 'no foreign scene content may leak into the asset');
  for (const required of ['Printer_Base', 'Printer_TopCap', 'Printer_BuildPlate', 'Printer_Glass_Door']) assert.ok(names.includes(required), required);
  assert.ok(!names.some(n => /printhead|nozzle|cartridge/i.test(n)), 'animated printhead must stay procedural');
  assert.ok(json.materials.some(m => /glass/i.test(m.name || '')));
});

test('authoring script and loader dependencies are vendored', () => {
  for (const path of ['../assets/author_bioprinter.py', '../vendor/three/loaders/GLTFLoader.js', '../vendor/three/utils/BufferGeometryUtils.js', '../vendor/three/utils/SkeletonUtils.js']) {
    assert.ok(existsSync(new URL(path, import.meta.url)), path);
  }
});
