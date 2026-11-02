import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('the live Blender isolation run is recorded as passing evidence with consistent counts', () => {
  const evidence = JSON.parse(readFileSync(resolve(root, 'docs/blender-isolation-run-2026-11-02.json'), 'utf8'));
  assert.equal(evidence.schema, 'bioprinting-workbench/blender-isolation-run/1');
  assert.equal(evidence.verdict, 'pass');
  assert.equal(evidence.marker, 'AUTHORING_CHECKS_PASSED');
  assert.ok(evidence.blenderVersion.startsWith('Blender '));
  assert.equal(evidence.stagingCleanupConfirmed, true);
  assert.equal(evidence.temporaryListenerStopped, true);
  assert.ok(evidence.findings.length >= 2);
  const manifest = JSON.parse(readFileSync(resolve(root, 'assets/manifest.json'), 'utf8'));
  assert.equal(manifest.assets.length, 4);
  for (const entry of evidence.assets) {
    const shipped = manifest.assets.find(a => a.id === entry.id);
    assert.ok(shipped, 'evidence asset missing from shipped manifest: ' + entry.id);
    assert.equal(entry.bytes, shipped.bytes);
    assert.equal(entry.sha256, shipped.sha256);
    assert.equal(entry.meshes, shipped.meshes);
    assert.equal(entry.materials, shipped.materials);
    assert.equal(entry.triangles, shipped.triangles);
    assert.ok(Array.isArray(entry.requiredNodes) && entry.requiredNodes.length >= 2);
    assert.ok(entry.priorShippedBytes > 0);
    assert.equal(typeof entry.structuralCountsMatchPriorShipped, 'boolean');
  }
});

test('the evidence records the prior surgered values and the divergence honestly', () => {
  const evidence = JSON.parse(readFileSync(resolve(root, 'docs/blender-isolation-run-2026-11-02.json'), 'utf8'));
  const bioprinter = evidence.assets.find(a => a.id === 'bioprinter');
  assert.equal(bioprinter.priorShippedMaterials, 6);
  assert.equal(bioprinter.materials, 7);
  assert.equal(bioprinter.structuralCountsMatchPriorShipped, false);
  const perfusion = evidence.assets.find(a => a.id === 'perfusion-chamber');
  assert.equal(perfusion.structuralCountsMatchPriorShipped, true);
});
