import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnalysisUI } from '../src/analysis-ui.js';
import { solveOxygen3D } from '../src/oxygen3d.js';

function stubElements() {
  const make = () => ({
    children: [], value: '', checked: false, textContent: '', hidden: false, max: '', disabled: false, listeners: new Map(),
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = nodes; },
    addEventListener(name, fn) { this.listeners.set(name, fn); },
    removeEventListener(name) { this.listeners.delete(name); },
    setAttribute() {},
    getContext() { return { fillStyle: '', fillRect() {} }; },
  });
  const nodes = new Map();
  return { $: id => { if (!nodes.has(id)) nodes.set(id, make()); return nodes.get(id); }, nodes };
}

test('getFieldSnapshot clones typed arrays, pins generation and reports missing fields', async () => {
  const original = globalThis.document;
  const { $, nodes } = stubElements();
  globalThis.document = { createElement: () => stubElements().$('x') };
  nodes.get('oxygen3d-resolution'); // ensure exists before client use
  const client = {
    requests: 0,
    async request(kind, payload) { this.requests++; return solveOxygen3D(payload.settings); },
    invalidate() {}, dispose() {},
  };
  try {
    const ui = createAnalysisUI({ elements: $, client });
    const missing = ui.getFieldSnapshot();
    assert.equal(missing.snapshot, null);
    assert.match(missing.reason, /No solved box field yet/);
    await $('oxygen3d-solve').listeners.get('click')();
    assert.equal(client.requests, 1);
    const { snapshot, reason } = ui.getFieldSnapshot();
    assert.equal(reason, null);
    assert.equal(snapshot.modelId, 'box-oxygen');
    assert.equal(snapshot.values instanceof Float64Array, true);
    assert.equal(snapshot.settings.resolution, 17);
    const direct = solveOxygen3D(snapshot.settings);
    assert.deepEqual([...snapshot.values], [...direct.values]);
    snapshot.values[0] = -12345;
    assert.notEqual(ui.getFieldSnapshot().snapshot.values[0], -12345, 'callers cannot corrupt the stored field');
    ui.dispose();
  } finally {
    globalThis.document = original;
  }
});
