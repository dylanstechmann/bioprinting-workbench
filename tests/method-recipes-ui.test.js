import test from 'node:test';
import assert from 'node:assert/strict';
import { createMethodRecipesUI } from '../src/method-recipes-ui.js';
import { defaultLearningState, validateLearningState } from '../src/cell-division.js';

function domShim() {
  const make = tag => {
    const el = {
      tagName: tag, children: [], textContent: '', value: '', className: '', listeners: {},
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

test('recipe cards render parameters with locators and adverse evidence warnings', () => {
  const { $ } = harness();
  const ui = createMethodRecipesUI({ elements: $ });
  const state = defaultLearningState();
  ui.render(state);
  const box = $('method-recipes');
  const serialized = JSON.stringify(box.children);
  assert.match(serialized, /cited research description/);
  assert.match(serialized, /1000 cells\/cm/);
  assert.match(serialized, /Population doublings/);
  // no method selected on human-msc: the Bhat card shows; switching to the ipsc method shows the Halliwell card with adverse warnings
  const ipsc = validateLearningState({ ...state, selectedCellType: 'ipsc', selectedCellSystemId: 'human-ipsc', selectedMethodId: 'halliwell-nucleosides' });
  ui.render(ipsc);
  const halliwell = JSON.stringify(box.children);
  assert.match(halliwell, /15 µM/);
  assert.match(halliwell, /Adverse evidence beside this method/);
  assert.match(halliwell, /ultra-fine bridges/);
  assert.match(halliwell, /Experimental Procedures: Nucleoside Supplementation/);
  // adverse-evidence mouse recipe is labeled as adverse evidence, not adoption
  const mouse = validateLearningState({ ...ipsc, selectedCellType: 'esc', selectedCellSystemId: 'mouse-esc', selectedMethodId: 'kurashima-fork-acceleration' });
  ui.render(mouse);
  const kurashima = JSON.stringify(box.children);
  assert.match(kurashima, /adverse evidence, not as a method to adopt/);
  assert.match(kurashima, /50 fold/);
  ui.dispose();
});

test('recipes UI shows an explicit absence for systems without cards', () => {
  const { $ } = harness();
  const ui = createMethodRecipesUI({ elements: $ });
  ui.render(defaultLearningState());
  assert.match(JSON.stringify($('method-recipes').children), /Bhat et al\. 2021/);
  const fibroblast = validateLearningState({ ...defaultLearningState(), selectedCellType: 'fibroblast', selectedCellSystemId: 'human-fibroblast' });
  ui.render(fibroblast);
  assert.match(JSON.stringify($('method-recipes').children), /No published-method reference card applies/);
});