import test from 'node:test';
import assert from 'node:assert/strict';
import { createHardwareCostsUI } from '../src/hardware-costs-ui.js';
import { defaultLearningState, validateLearningState } from '../src/cell-division.js';

function harness() {
  const nodes = new Map();
  const make = tag => {
    const el = {
      tagName: tag, children: [], textContent: '', value: '', className: '', type: '', checked: false, disabled: false, _id: '', listeners: {},
      append(...items) { for (const i of items) this.children.push(i); },
      replaceChildren(...items) { this.children = [...items]; },
      addEventListener(type, fn) { this.listeners[type] = fn; },
      removeEventListener(type) { delete this.listeners[type]; },
      setAttribute() {},
    };
    Object.defineProperty(el, 'id', { get() { return this._id; }, set(v) { this._id = v; if (v) nodes.set(v, this); } });
    return el;
  };
  globalThis.document = { createElement: make, createElementNS: make };
  const $ = id => { if (!nodes.has(id)) nodes.set(id, make('div')); return nodes.get(id); };
  return { $ };
}

test('hardware cost UI renders the reference list, chart and live budget updates', () => {
  const { $ } = harness();
  let patch = null;
  const ui = createHardwareCostsUI({ elements: $, onStateChange: p => { patch = p; } });
  const state = defaultLearningState();
  ui.render(state);
  assert.equal($('hardware-cost-parts').children.length, 22);
  const svg = $('hardware-cost-chart');
  assert.ok(svg.children.length > 10);
  assert.ok($('hardware-cost-result').textContent.includes('One-time: $5615'));
  assert.ok($('hardware-cost-result').textContent.includes('about $525 per month'));
  assert.ok($('hardware-cost-result').textContent.includes('never summed'));
  assert.ok($('hardware-cost-result').textContent.includes('Sterile-culture infrastructure $4890'));
  assert.ok(!$('hardware-cost-result').textContent.includes('grandTotal'));
  $('hardware-part-bench-laminar-hood').checked = false;
  $('hardware-part-bench-laminar-hood').listeners.change();
  assert.equal(patch.hardwareBudget.includedPartIds.length, 21);
  assert.ok(!patch.hardwareBudget.includedPartIds.includes('bench-laminar-hood'));
  assert.ok($('hardware-cost-status').textContent.includes('not a quote'));
  const accepted = validateLearningState({ ...state, hardwareBudget: patch.hardwareBudget });
  ui.render(accepted);
  assert.ok($('hardware-cost-result').textContent.includes('One-time: $3715'));
  const allOff = patch.hardwareBudget.includedPartIds.length;
  assert.ok(!JSON.stringify(accepted).includes('oneTimeTotalUSD'));
  ui.dispose();
  assert.equal(allOff, 21);
});

test('hardware cost UI requires its state-change callback', () => {
  const { $ } = harness();
  assert.throws(() => createHardwareCostsUI({ elements: $ }));
});
