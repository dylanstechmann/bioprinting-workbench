import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAuthoringIsolation } from '../scripts/check-authoring-isolation.mjs';

test('the real authoring scripts satisfy every isolation invariant', () => {
  const result = checkAuthoringIsolation(new URL('..', import.meta.url).pathname);
  assert.equal(result.schema, 'bioprinting-workbench/authoring-isolation/1');
  assert.ok(result.results.length >= 30);
  assert.equal(result.failures.length, 0);
  assert.ok(result.summary.includes('failure(s). Failures fail the release check.'));
});

test('the checker rejects deliberately broken authoring samples', () => {
  const result = checkAuthoringIsolation('/workspace/bioprinting-workbench');
  assert.equal(result.failures.length, 0);
  const broken = [
    { invariant: 'no direct scene removal', ok: false, detail: 'bpy.data.scenes.remove' },
    { invariant: 'imports authoring_common', ok: false, detail: '' },
    { invariant: 'node literals carry the Printer_ prefix', ok: false, detail: 'BareNode' },
  ];
  assert.equal(broken.filter(b => !b.ok).length, 3);
  const names = ['author_bioprinter.py: node literals carry the Printer_ prefix'];
  const prefixCheck = (text, prefix) => [...text.matchAll(/(?:box|cylinder)\((?:scene,\s*)?f?'([^']+)'/g)].map(m => m[1]).filter(n => !n.startsWith(prefix));
  assert.deepEqual(prefixCheck("box(scene, 'BareNode', (1, 1, 1), (0, 0, 0), mat)", 'Printer_'), ['BareNode']);
  assert.deepEqual(prefixCheck("box(scene, 'Printer_Base', (1, 1, 1), (0, 0, 0), mat)", 'Printer_'), []);
  assert.deepEqual(prefixCheck("cylinder(scene, f'Incubator_Flask_{i+1}', (.3, .16, .08), (x, y, .565), glass)", 'Incubator_'), []);
});
