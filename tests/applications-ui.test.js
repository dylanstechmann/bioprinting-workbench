import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplicationsUI } from '../src/applications-ui.js';
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

test('applications UI renders the ledger and comparison, keeps the filler shortcut unselectable, and proposes patches', () => {
  const { $ } = harness();
  let patch = null;
  const ui = createApplicationsUI({ elements: $, onStateChange: p => { patch = p; } });
  const state = defaultLearningState();
  ui.render(state);
  assert.equal($('applications-ledger').children.length, 6);
  assert.equal($('breast-approaches').children.length, 5);
  assert.ok($('applications-result').textContent.includes('enter a planned fat-graft volume'));
  assert.ok($('applications-result').textContent.includes('Simulation theory only'));
  assert.equal($('apps-approach-unregulated-injectables').disabled, true);
  assert.ok($('breast-approaches').children.some(card => JSON.stringify(card.children).includes('mastalgia (90%)')));
  assert.ok($('breast-approaches').children.some(card => JSON.stringify(card.children).includes('BIA-ALCL')));
  assert.ok($('applications-ledger').children.some(card => JSON.stringify(card.children).includes('8-fold more neovessels')));
  $('apps-fat-volume').value = '300';
  $('apps-resorption').value = '0.4';
  $('apps-fat-retouch').value = '3';
  $('apps-implant-years').value = '10';
  $('apps-horizon').value = '30';
  $('apps-approach-autologous-fat-graft').checked = true;
  $('apps-approach-autologous-fat-graft').listeners.change();
  assert.deepEqual(patch.applicationsPerspective, { plannedFatVolumeML: 300, resorptionFraction: 0.4, fatRetouchYears: 3, implantReplacementYears: 10, planningHorizonYears: 30, selectedApproachIds: ['autologous-fat-graft'] });
  assert.ok($('applications-status').textContent.includes('Hypothetical arithmetic only'));
  const accepted = validateLearningState({ ...state, applicationsPerspective: patch.applicationsPerspective });
  ui.render(accepted);
  assert.ok($('applications-result').textContent.includes('retains 180 mL'));
  assert.ok($('applications-result').textContent.includes('10 sessions across 30 years'));
  assert.ok($('applications-result').textContent.includes('3 implant-related interventions'));
  assert.ok($('applications-result').textContent.includes('No reviewed source demonstrates a bioprinted breast graft in a living human'));
  assert.ok(!JSON.stringify(accepted).includes('retainedVolumeML'));
  assert.ok(!JSON.stringify(accepted).includes('fatSessions'));
  const handler = $('apps-horizon').listeners.change;
  ui.dispose();
  handler();
  assert.equal(patch.applicationsPerspective.planningHorizonYears, 30);
  ui.dispose();
});

test('applications UI requires its state-change callback', () => {
  const { $ } = harness();
  assert.throws(() => createApplicationsUI({ elements: $ }));
});
