import test from 'node:test';
import assert from 'node:assert/strict';
import { createResearchProgramUI } from '../src/research-program-ui.js';
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

test('research-program UI renders all nodes, proposes selections and stacks prerequisites', () => {
  const { $ } = harness();
  let patch = null;
  const ui = createResearchProgramUI({ elements: $, onStateChange: p => { patch = p; } });
  const state = defaultLearningState();
  ui.render(state);
  assert.equal($('program-nodes').children.length, 13);
  assert.ok($('program-result').textContent.includes('select program nodes'));
  assert.ok($('program-result').textContent.includes('never effect multiplication'));
  $('program-node-host-integration').checked = true;
  $('program-node-host-integration').listeners.change();
  assert.deepEqual(patch.researchProgram, { selectedNodeIds: ['host-integration'] });
  assert.ok($('program-status').textContent.includes('no funding, protocol, treatment'));
  const accepted = validateLearningState({ ...state, researchProgram: patch.researchProgram });
  ui.render(accepted);
  assert.ok($('program-result').textContent.includes('BUILD — selected: Host integration'));
  assert.ok($('program-result').textContent.includes('STACK — prerequisites your selection pulls in'));
  assert.ok($('program-result').textContent.includes('Program evidence floor: theory'));
  assert.ok($('program-result').textContent.includes('genome-stability-gate'));
  assert.ok(!JSON.stringify(accepted).includes('programFloor'));
  const handler = $('program-node-organ-chip-testing').listeners.change;
  ui.dispose();
  handler();
  assert.equal(patch.researchProgram.selectedNodeIds.length, 1);
  ui.dispose();
});

test('research-program UI requires its state-change callback', () => {
  const { $ } = harness();
  assert.throws(() => createResearchProgramUI({ elements: $ }));
});
