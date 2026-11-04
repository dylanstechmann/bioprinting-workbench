import test from 'node:test';
import assert from 'node:assert/strict';
import { createConvergenceStudyUI } from '../src/convergence-study-ui.js';

function environment() {
  const nodes = new Map();
  const make = () => ({ disabled: false, textContent: '', children: [], listeners: new Map(),
    replaceChildren() { this.children = []; }, append(child) { this.children.push(child); },
    addEventListener(event, callback) { this.listeners.set(event, callback); },
    removeEventListener(event) { this.listeners.delete(event); } });
  const $ = id => { if (!nodes.has(id)) nodes.set(id, make()); return nodes.get(id); };
  return { $, make };
}

test('study uses a dedicated disposable client and renders accessible numeric rows', async () => {
  const { $, make } = environment();
  const original = globalThis.document;
  globalThis.document = { createElement: make };
  let disposed = 0, captured;
  try {
    const ui = createConvergenceStudyUI({ elements: $, getSettings: () => ({ demand: 1 }), clientFactory: () => ({
      async request(kind, payload) {
        captured = { kind, payload };
        return { status: 'succeeded', spec: { modelId: 'box-oxygen', settings: { model: 'steady-3d-box-constant-consumption', demand: 1, resolution: 17, boundaryMode: 'all-faces' }, resolutions: [9, 17, 33] }, samples: [{ resolution: 9, center: 0.5, residualInfinity: 0, balanceError: 0, errorInfinity: null, converged: true }], comparisons: [], notices: ['Grid comparison.'] };
      }, dispose() { disposed++; },
    }) });
    await $('convergence-run').listeners.get('click')();
    assert.equal(captured.kind, 'oxygen-convergence');
    assert.deepEqual(captured.payload.resolutions, [9, 17, 33]);
    assert.equal($('convergence-results').children[0].children.length, 6);
    assert.equal(ui.getLastResult().status, 'succeeded');
    assert.equal(disposed, 1);
    ui.dispose();
  } finally { globalThis.document = original; }
});

test('the study UI retains bounded history and exposes artifact downloads', async () => {
  const { $, make } = environment();
  const original = globalThis.document, originalUrl = globalThis.URL;
  const revoked = [];
  const downloads = [];
  globalThis.document = { createElement: () => { const el = make(); el.click = () => downloads.push(el); return el; } };
  globalThis.URL = { createObjectURL: () => `blob:${downloads.length}`, revokeObjectURL: url => revoked.push(url) };
  const completed = { status: 'succeeded', spec: { modelId: 'box-oxygen', settings: { model: 'steady-3d-box-constant-consumption', demand: 1, resolution: 17, boundaryMode: 'all-faces' }, resolutions: [9, 17] }, samples: [{ resolution: 9, h: 2 / 9, center: 0.5, min: 0, max: 1, residualInfinity: 0, balanceError: 0, converged: true, inDomain: true, errorInfinity: null }], comparisons: [], reference: 'grid-comparison', notices: ['Grid comparison.'] };
  try {
    const ui = createConvergenceStudyUI({ elements: $, getSettings: () => ({ demand: 1 }), clientFactory: () => ({ async request() { return completed; }, dispose() {} }) });
    await $('convergence-run').listeners.get('click')();
    assert.equal(ui.getHistory().length, 1);
    assert.equal($('convergence-history').value, 'study 1');
    const artifact = ui.getHistory()[0].artifact;
    assert.equal(artifact.schema, 'bioprinting-workbench/convergence-study-artifact/1');
    await $('convergence-download').listeners.get('click')();
    assert.equal(downloads.length, 1);
    assert.match(downloads[0].download, /convergence-study/);
    ui.dispose();
    assert.ok(revoked.length >= 1, 'dispose revokes object URLs');
  } finally { globalThis.document = original; globalThis.URL = originalUrl; }
});

test('cancelled studies leave no history entry and history stays bounded', async () => {
  const { $ } = environment();
  let finish;
  const ui = createConvergenceStudyUI({ elements: $, getSettings: () => ({}), clientFactory: () => ({
    request() { return new Promise(resolve => { finish = resolve; }); }, dispose() {},
  }) });
  const running = $('convergence-run').listeners.get('click')();
  $('convergence-cancel').listeners.get('click')();
  finish({ status: 'succeeded' });
  await running;
  assert.equal(ui.getHistory().length, 0);
  ui.dispose();
});

test('cancel and dispose terminate the study and ignore stale completion', async () => {
  const { $ } = environment();
  let finish, disposed = 0;
  const ui = createConvergenceStudyUI({ elements: $, getSettings: () => ({}), clientFactory: () => ({
    request() { return new Promise(resolve => { finish = resolve; }); }, dispose() { disposed++; },
  }) });
  const running = $('convergence-run').listeners.get('click')();
  $('convergence-cancel').listeners.get('click')();
  finish({ status: 'succeeded' });
  await running;
  assert.match($('convergence-status').textContent, /cancelled/);
  assert.equal(disposed, 1);
  assert.equal(ui.getLastResult(), null);
  ui.dispose();
});