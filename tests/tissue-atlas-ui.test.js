import test from 'node:test';
import assert from 'node:assert/strict';
import { createTissueAtlasUI } from '../src/tissue-atlas-ui.js';
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

test('tissue-atlas UI renders targets, keeps the aspiration unselectable and the ideas desk honest', () => {
  const { $ } = harness();
  let patch = null;
  const ui = createTissueAtlasUI({ elements: $, onStateChange: p => { patch = p; } });
  const state = defaultLearningState();
  ui.render(state);
  assert.equal($('atlas-targets').children.length, 10);
  assert.ok($('atlas-result').textContent.includes('select targets'));
  const aspiration = $('atlas-target-elite-muscle-architecture');
  assert.equal(aspiration.disabled, true);
  $('atlas-target-lung-alveoli').checked = true;
  $('atlas-target-lung-alveoli').listeners.change();
  assert.deepEqual(patch.tissueAtlas, { selectedTargetIds: ['lung-alveoli'] });
  assert.ok($('atlas-status').textContent.includes('never a clinical readiness claim'));
  const accepted = validateLearningState({ ...state, tissueAtlas: patch.tissueAtlas });
  ui.render(accepted);
  assert.ok($('atlas-result').textContent.includes('Lung alveoli'));
  assert.ok($('atlas-result').textContent.includes('review-stage mapping'));
  assert.ok($('atlas-result').textContent.includes('never upgrades'));
  assert.ok($('atlas-targets').children.some(c => c.children.some(x => (x.textContent || '').includes('Ideas desk'))));
  assert.ok(!JSON.stringify(accepted).includes('barriers'));
  const handler = $('atlas-target-gingiva').listeners.change;
  ui.dispose();
  handler();
  assert.deepEqual(patch.tissueAtlas.selectedTargetIds, ['lung-alveoli']);
  ui.dispose();
});

test('tissue-atlas UI requires its state-change callback', () => {
  const { $ } = harness();
  assert.throws(() => createTissueAtlasUI({ elements: $ }));
});
