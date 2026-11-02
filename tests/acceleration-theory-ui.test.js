import test from 'node:test';
import assert from 'node:assert/strict';
import { createExpansionTheoryUI } from '../src/acceleration-theory-ui.js';
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

test('expansion UI renders mechanisms, keeps the instability lever unselectable and proposes patches', () => {
  const { $ } = harness();
  let patch = null;
  const ui = createExpansionTheoryUI({ elements: $, onStateChange: p => { patch = p; } });
  const state = defaultLearningState();
  ui.render(state);
  assert.equal($('expansion-mechanisms').children.length, 6);
  assert.ok($('expansion-result').textContent.includes('enter starting cells'));
  assert.ok($('expansion-result').textContent.includes('Simulation theory only'));
  assert.equal($('expansion-mech-transformed-variant-selection').disabled, true);
  assert.ok($('expansion-mechanisms').children.some(card => JSON.stringify(card.children).includes('TP53-mutant subpopulations')));
  $('expansion-start').value = '1000000';
  $('expansion-target').value = '1000000000000';
  $('expansion-doubling').value = '24';
  $('expansion-mech-attrition-rescue').checked = true;
  $('expansion-mech-attrition-rescue').listeners.change();
  assert.deepEqual(patch.expansionTheory, { startCells: 1e6, targetCells: 1e12, doublingHours: 24, overheadHours: null, splitRatio: null, attritionFraction: null, attritionRescuedFraction: null, mediumPdtMultiplier: null, forkCycleMultiplier: null, selectedMechanismIds: ['attrition-rescue'] });
  assert.ok($('expansion-status').textContent.includes('Hypothetical arithmetic only'));
  const accepted = validateLearningState({ ...state, expansionTheory: patch.expansionTheory });
  ui.render(accepted);
  assert.ok($('expansion-result').textContent.includes('Doublings needed'));
  assert.ok($('expansion-result').textContent.includes('No attrition cost modeled'));
  assert.ok($('expansion-result').textContent.includes('No organ-production timeline'));
  // invalid proposal retained: previous inputs re-render after the parent rejects
  ui.render(accepted);
  const handler = $('expansion-fork').listeners.change;
  ui.dispose();
  handler();
  assert.equal(patch.expansionTheory.doublingHours, 24);
  ui.dispose();
});

test('expansion UI requires its state-change callback', () => {
  const { $ } = harness();
  assert.throws(() => createExpansionTheoryUI({ elements: $ }));
});