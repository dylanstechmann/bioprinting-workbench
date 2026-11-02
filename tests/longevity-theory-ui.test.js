import test from 'node:test';
import assert from 'node:assert/strict';
import { createLongevityTheoryUI } from '../src/longevity-theory-ui.js';
import { defaultLearningState, validateLearningState } from '../src/cell-division.js';

function harness() {
  const nodes = new Map();
  const make = tag => {
    const el = {
      tagName: tag, children: [], textContent: '', value: '', className: '', type: '', checked: false, disabled: false, _id: '', href: '', target: '', rel: '', listeners: {},
      append(...items) { for (const i of items) this.children.push(i); },
      replaceChildren(...items) { this.children = [...items]; },
      addEventListener(type, fn) { this.listeners[type] = fn; },
      removeEventListener(type) { delete this.listeners[type]; },
      setAttribute() {},
    };
    Object.defineProperty(el, 'id', { get() { return this._id; }, set(v) { this._id = v; if (v) nodes.set(v, this); } });
    return el;
  };
  globalThis.document = { createElement: make };
  const $ = id => { if (!nodes.has(id)) nodes.set(id, make('div')); return nodes.get(id); };
  return { $ };
}

test('longevity UI renders barriers, keeps the whole-body lever unselectable and proposes patches', () => {
  const { $ } = harness();
  let patch = null;
  const ui = createLongevityTheoryUI({ elements: $, onStateChange: p => { patch = p; } });
  const state = defaultLearningState();
  ui.render(state);
  assert.equal($('longevity-barriers').children.length, 6);
  assert.ok($('longevity-result').textContent.includes('enter a hypothetical single-organ-failure fraction'));
  assert.ok($('longevity-result').textContent.includes('Simulation theory only'));
  assert.equal($('longevity-barrier-whole-body-including-brain').disabled, true);
  assert.ok($('longevity-barriers').children.some(card => JSON.stringify(card.children).includes('whole-body replacement')));
  assert.ok($('longevity-barriers').children.some(card => JSON.stringify(card.children).includes('mouse study — never transferred to human outcomes')));
  $('longevity-fraction').value = '0.25';
  $('longevity-organs').value = '3';
  $('longevity-cadence').value = '10';
  $('longevity-horizon').value = '60';
  $('longevity-barrier-systemic-aging-environment').checked = true;
  $('longevity-barrier-systemic-aging-environment').listeners.change();
  assert.deepEqual(patch.longevityPerspective, { singleOrganFailureFraction: 0.25, replacedOrganCount: 3, replacementCadenceYears: 10, planningHorizonYears: 60, selectedBarrierIds: ['systemic-aging-environment'] });
  assert.ok($('longevity-status').textContent.includes('Hypothetical arithmetic only'));
  const accepted = validateLearningState({ ...state, longevityPerspective: patch.longevityPerspective });
  ui.render(accepted);
  assert.ok($('longevity-result').textContent.includes('Addressable ceiling: 0.25'));
  assert.ok($('longevity-result').textContent.includes('Untouched in principle: 0.75'));
  assert.ok($('longevity-result').textContent.includes('18 printed-organ transplants'));
  assert.ok($('longevity-result').textContent.includes('No reviewed source demonstrates eternal youth'));
  assert.ok(!JSON.stringify(accepted).includes('totalReplacements'));
  const handler = $('longevity-horizon').listeners.change;
  ui.dispose();
  handler();
  assert.equal(patch.longevityPerspective.planningHorizonYears, 60);
  ui.dispose();
});

test('longevity UI requires its state-change callback', () => {
  const { $ } = harness();
  assert.throws(() => createLongevityTheoryUI({ elements: $ }));
});
