import test from 'node:test';
import assert from 'node:assert/strict';
import { createModelExplorationUI } from '../src/model-exploration-ui.js';

function stubEnv() {
  const make = () => ({
    children: [], value: '', textContent: '', disabled: false, listeners: new Map(),
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = nodes; },
    addEventListener(name, fn) { this.listeners.set(name, fn); },
    removeEventListener(name, fn) { if (this.listeners.get(name) === fn) this.listeners.delete(name); },
  });
  const nodes = new Map();
  return { $: id => { if (!nodes.has(id)) nodes.set(id, make()); return nodes.get(id); }, nodes };
}

test('the exploration UI runs, cancels and keeps the last result separate from pending work', async () => {
  const original = globalThis.document;
  const { $ } = stubEnv();
  globalThis.document = { createElement: make => ({ children: [], textContent: '', append(...n) { this.children.push(...n); } }) };
  const calls = { cancelled: 0, run: null };
  const client = {
    async run(spec, { onProgress } = {}) {
      calls.run = spec;
      onProgress({ completed: 1, failed: 0, total: 2 });
      return {
        status: 'partial',
        points: [
          { index: 0, values: { demand: 0 }, status: 'succeeded', run: { quantities: { center: { value: 1, unit: '1' } } }, error: null },
          { index: 1, values: { demand: 1 }, status: 'failed', run: null, error: 'boom' },
        ],
        summary: { ranges: [{ path: 'center', unit: '1', min: 1, max: 1, count: 1 }], sensitivities: [], notice: 'No probability, causal effect, viability or efficacy claim.' },
      };
    },
    cancel() { calls.cancelled++; },
  };
  try {
    $('sweep-axis').value = 'demand';
    $('sweep-values').value = '0, 1';
    const ui = createModelExplorationUI({
      elements: $,
      client,
      getInputs: () => ({ modelId: 'slab-oxygen', baseInputs: { demand: 1, points: 21 } }),
    });
    assert.equal(ui.getLastResult(), null);
    await $('sweep-run').listeners.get('click')();
    assert.equal(calls.run.modelId, 'slab-oxygen');
    assert.deepEqual(calls.run.axes, [{ path: 'demand', values: [0, 1] }]);
    assert.match($('sweep-status').textContent, /partial: 2 points/);
    assert.equal($('sweep-results').children.length, 2);
    assert.ok(ui.getLastResult());
    $('sweep-cancel').listeners.get('click')();
    assert.equal(calls.cancelled, 1);
    assert.match($('sweep-status').textContent, /No scenario values were changed/);
    ui.dispose();
  } finally {
    globalThis.document = original;
  }
});

test('the exploration UI surfaces spec errors without touching results', async () => {
  const original = globalThis.document;
  const { $ } = stubEnv();
  globalThis.document = { createElement: () => ({ children: [], textContent: '', append() {} }) };
  try {
    $('sweep-axis').value = 'ghost';
    $('sweep-values').value = '1';
    const ui = createModelExplorationUI({
      elements: $,
      client: { async run() { throw new Error('should not run'); }, cancel() {} },
      getInputs: () => ({ modelId: 'slab-oxygen', baseInputs: { demand: 1, points: 21 } }),
    });
    await $('sweep-run').listeners.get('click')();
    assert.match($('sweep-status').textContent, /ghost|values/);
    assert.equal(ui.getLastResult(), null);
    ui.dispose();
  } finally {
    globalThis.document = original;
  }
});
