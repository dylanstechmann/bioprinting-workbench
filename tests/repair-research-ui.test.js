import test from 'node:test';
import assert from 'node:assert/strict';
import { createRepairResearchUI } from '../src/repair-research-ui.js';
import { defaultLearningState, validateLearningState } from '../src/cell-division.js';

function domShim() {
  const make = tag => {
    const el = {
      tagName: tag, children: [], textContent: '', value: '', className: '', label: '', listeners: {},
      append(...items) { for (const i of items) this.children.push(i); },
      replaceChildren(...items) { this.children = [...items]; },
      addEventListener(type, fn) { this.listeners[type] = fn; },
      removeEventListener(type) { delete this.listeners[type]; },
      setAttribute() {},
    };
    return el;
  };
  globalThis.document = { createElement: make };
}
function harness() {
  domShim();
  const nodes = new Map();
  const $ = id => { if (!nodes.has(id)) nodes.set(id, document.createElement('div')); return nodes.get(id); };
  return { $ };
}

test('research UI renders species options, per-system methods and adverse prominence', () => {
  const { $ } = harness();
  let proposed = null, comparison = null;
  const ui = createRepairResearchUI({ elements: $, onSelectionChange: patch => { proposed = patch; }, onComparisonChange: c => { comparison = c; } });
  const state = defaultLearningState();
  ui.render(state);
  const systems = $('research-system').children;
  assert.equal(systems.length, 1);
  assert.equal(systems[0].label, 'Human');
  assert.equal(systems[0].children[0].value, 'human-msc');
  const methodOptions = $('research-method').children;
  assert.equal(methodOptions[0].value, '');
  assert.ok(methodOptions.some(o => o.value === 'bhat-media-expansion'));
  assert.ok($('research-evidence').children.length > 1);
  assert.match($('comparison-result').textContent, /enter two of your own durations/);
  // mouse system renders adverse method row with its findings
  const mouse = validateLearningState({ ...state, selectedCellType: 'esc', selectedCellSystemId: 'mouse-esc' });
  ui.render(mouse);
  assert.ok($('research-evidence').children.some(node => JSON.stringify(node.children).includes('adverse-endpoint')));
  assert.ok($('research-method').children.some(o => o.value === 'kurashima-fork-acceleration'));
  ui.render(state);
  // change events propose validated patches and comparison parsing
  $('research-system').value = 'human-ipsc';
  $('research-system').listeners.change();
  assert.deepEqual(proposed, { selectedCellSystemId: 'human-ipsc', selectedMethodId: null });
  $('comparison-baseline').value = '100';
  $('comparison-alternative').value = '';
  $('comparison-baseline').listeners.change();
  assert.deepEqual(comparison, { baselineHours: 100, comparisonHours: null });
  $('comparison-alternative').value = '80';
  $('comparison-alternative').listeners.change();
  assert.deepEqual(comparison, { baselineHours: 100, comparisonHours: 80 });
  const savedHandler = $('research-system').listeners.change;
  ui.dispose();
  $('research-system').value = 'mouse-esc';
  savedHandler();
  assert.deepEqual(proposed, { selectedCellSystemId: 'human-ipsc', selectedMethodId: null });
  ui.dispose();
});

test('research UI requires proposal callbacks and ignores change events after disposal', () => {
  const { $ } = harness();
  assert.throws(() => createRepairResearchUI({ elements: $ }));
  const ui = createRepairResearchUI({ elements: $, onSelectionChange: () => {}, onComparisonChange: () => {} });
  ui.dispose();
  let proposed = null;
  const ui2 = createRepairResearchUI({ elements: $, onSelectionChange: p => { proposed = p; }, onComparisonChange: () => {} });
  const handler = $('research-method').listeners.change;
  ui2.dispose();
  $('research-method').value = 'halliwell-nucleosides';
  handler();
  assert.equal(proposed, null);
});