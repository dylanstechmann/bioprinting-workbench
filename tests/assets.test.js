import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

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
test('all five GLBs match manifest, budgets, chunk and accessor bounds', () => {
  const manifest=JSON.parse(readFileSync(new URL('../assets/manifest.json',import.meta.url),'utf8'));
  assert.equal(manifest.assets.length,5);let total=0;
  for(const asset of manifest.assets){
    const data=readFileSync(new URL(`../${asset.file}`,import.meta.url));total+=data.length;
    assert.equal(data.length,asset.bytes);assert.ok(data.length<=asset.maxBytes);
    assert.equal(createHash('sha256').update(data).digest('hex'),asset.sha256);
    assert.equal(data.toString('ascii',0,4),'glTF');assert.equal(data.readUInt32LE(8),data.length);
    const chunks=[];for(let i=12;i<data.length;){const length=data.readUInt32LE(i);assert.equal(length%4,0);assert.ok(i+8+length<=data.length);chunks.push({type:data.readUInt32LE(i+4),start:i+8,length});i+=8+length;assert.ok(i<=data.length);}
    assert.equal(chunks.length,2);assert.equal(chunks[1].type,0x004e4942);
    const gltf=JSON.parse(data.toString('utf8',chunks[0].start,chunks[0].start+chunks[0].length));
    assert.ok(gltf.buffers.every(b=>!b.uri));assert.ok((gltf.images||[]).every(i=>!i.uri));
    for(const view of gltf.bufferViews)assert.ok((view.byteOffset||0)+view.byteLength<=gltf.buffers[view.buffer].byteLength);
    const components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16},bytes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
    for(const a of gltf.accessors){const v=gltf.bufferViews[a.bufferView],element=components[a.type]*bytes[a.componentType];assert.ok((a.byteOffset||0)+(a.count-1)*(v.byteStride||element)+element<=v.byteLength);}
    const names=gltf.nodes.map(n=>n.name);assert.ok(names.every(n=>n.startsWith(asset.nodePrefix)));for(const required of asset.requiredNodes)assert.ok(names.includes(required));
    assert.ok(asset.triangles<10000);assert.ok(gltf.materials.length<=8);
  }
  assert.ok(total<=1536*1024);
});
