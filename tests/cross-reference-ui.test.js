import test from 'node:test';
import assert from 'node:assert/strict';
import { createCrossReferenceUI } from '../src/cross-reference-ui.js';
import { defaultCrossReference } from '../src/cross-reference.js';
import { defaultVascularSupply } from '../src/vascular-supply.js';
import { NOZZLE_SHEAR_DEFAULTS } from '../src/nozzle-shear.js';

test('cross-reference refresh reads upstream state, retains notices on errors and disposes listeners', () => {
  const original = globalThis.document;
  const make = () => ({
    children: [], value: '', checked: false, textContent: '', listeners: new Map(),
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = nodes; },
    addEventListener(name, fn) { this.listeners.set(name, fn); },
    removeEventListener(name) { this.listeners.delete(name); },
  });
  const nodes = new Map();
  const $ = id => { if (!nodes.has(id)) nodes.set(id, make()); return nodes.get(id); };
  globalThis.document = { createElement: make };
  const storyboard = { spacing: .36, layers: 6, population: .6, perfusion: .6 };
  const nozzle = { settings: { ...NOZZLE_SHEAR_DEFAULTS } };
  const vascular = defaultVascularSupply();
  try {
    const ui = createCrossReferenceUI({ elements: $, getStoryboard: () => storyboard, getNozzle: () => nozzle, getVascular: () => vascular });
    ui.setState({ ...defaultCrossReference(), enabled: true });
    const firstFlow = $('crossref-values').children[0].children[1].textContent;
    storyboard.perfusion = .3; ui.refresh();
    assert.notEqual($('crossref-values').children[0].children[1].textContent, firstFlow);
    const nextFlow = $('crossref-values').children[0].children[1].textContent;
    nozzle.settings.diameterUm = 600; ui.refresh();
    assert.notEqual($('crossref-values').children[0].children[1].textContent, nextFlow);
    const firstSupply = $('crossref-values').children[1].children[1].textContent;
    vascular.settings.inletC0_molPerM3 = .2; ui.refresh();
    assert.notEqual($('crossref-values').children[1].children[1].textContent, firstSupply);
    storyboard.spacing = .001; ui.refresh();
    assert.match($('crossref-values').children[0].children[1].textContent, /outside a reference validator/);
    assert.equal($('crossref-notice').children.length, 4);
    storyboard.spacing = .36; ui.refresh();
    assert.equal($('crossref-values').children.length, 6);
    const state = ui.getState(); state.enabled = false;
    assert.equal(ui.getState().enabled, true);
    const rows = $('crossref-values').children;
    ui.dispose(); ui.refresh();
    assert.equal($('crossref-values').children, rows);
    assert.equal($('crossref-enabled').listeners.size, 0);
  } finally {
    if (original === undefined) delete globalThis.document; else globalThis.document = original;
  }
});