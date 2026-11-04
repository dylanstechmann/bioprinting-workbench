import test from 'node:test';
import assert from 'node:assert/strict';
import { createResearchCockpitUI } from '../src/research-cockpit-ui.js';
import { emptyExchangeState } from '../src/research-exchange.js';
import { createRunRegistry } from '../src/run-records.js';

function stubEnv() {
  const make = () => ({
    children: [], value: '', textContent: '', className: '', disabled: false, listeners: new Map(),
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = nodes; },
    addEventListener(name, fn) { this.listeners.set(name, fn); },
    removeEventListener(name, fn) { if (this.listeners.get(name) === fn) this.listeners.delete(name); },
  });
  const nodes = new Map();
  return { $: id => { if (!nodes.has(id)) nodes.set(id, make()); return nodes.get(id); }, nodes };
}
const minimalBundleText = JSON.stringify({
  schema: 'bioprinting-workbench/research-exchange/1', bundleId: 'bundle-x', createdAt: '2026-11-03T12:00:00Z',
  producer: { application: 'test', version: '1', executedBy: 'agent' },
  sourceRevision: { commit: null, dirty: true, implementationSha256: null },
  hypotheses: [{
    id: 'hyp-x', revision: 1, title: '<img src=x onerror=alert(1)>', question: 'q', scope: 's', claimBoundary: 'cb',
    status: 'draft', system: 'sys', mechanism: 'm',
    alternatives: [{ id: 'a1', prediction: 'p', falsifier: 'f' }, { id: 'a2', prediction: 'p', falsifier: 'f' }],
    predictions: [], falsifiers: [], confounders: [], missingMeasurements: [], modelIds: [],
    supportingEvidenceIds: [], contradictingEvidenceIds: [], queryPlanIds: [], parentHypothesisIds: [],
    authorship: { createdBy: 'agent', method: 'test', reviewedBy: null }, reviewStatus: 'unreviewed',
  }],
  queries: [], modelRuns: [], evidence: [], artifacts: [],
  privacyClassification: 'private', publicationReviewStatus: 'not-approved',
});

test('the cockpit previews inertly, applies on explicit action and renders XSS as text', async () => {
  const original = globalThis.document;
  const { $ } = stubEnv();
  globalThis.document = { createElement: () => stubEnv().$('row') };
  try {
    const changes = [];
    const ui = createResearchCockpitUI({ elements: $, onChange: state => changes.push(state) });
    assert.equal(ui.getState().hypotheses.length, 0);
    const importListener = $('cockpit-import').listeners.get('change');
    await importListener({ target: { files: [{ text: async () => minimalBundleText }], value: 'x' } });
    assert.match($('cockpit-status').textContent, /Preview ready/);
    assert.equal(ui.getState().hypotheses.length, 0, 'preview alone never writes');
    assert.equal($('cockpit-apply').disabled, false);
    await $('cockpit-apply').listeners.get('click')();
    assert.equal(ui.getState().hypotheses.length, 1);
    assert.equal(changes.length, 1);
    const rendered = $('cockpit-cards').children.map(child => child.textContent).join(' ');
    assert.ok(rendered.includes('<img src=x onerror=alert(1)>'), 'markup renders as inert text');
    assert.equal($('cockpit-cards').children.every(row => row.children.length === 0), true, 'no markup nodes are ever created');
    await $('cockpit-export').listeners.get('click')();
    const exported = JSON.parse($('cockpit-export-output').value);
    assert.equal(exported.publicationReviewStatus, 'not-approved');
    ui.dispose();
  } finally {
    globalThis.document = original;
  }
});

test('the cockpit surfaces import errors without changing state', async () => {
  const original = globalThis.document;
  const { $ } = stubEnv();
  globalThis.document = { createElement: () => stubEnv().$('row') };
  try {
    const ui = createResearchCockpitUI({ elements: $ });
    await $('cockpit-import').listeners.get('change')({ target: { files: [{ text: async () => '{"schema":"other/1"}' }], value: 'x' } });
    assert.match($('cockpit-status').textContent, /schema/i);
    assert.deepEqual(ui.getState(), emptyExchangeState());
    ui.dispose();
  } finally {
    globalThis.document = original;
  }
});

test('newer imports, state replacement and disposal invalidate pending asynchronous reads', async () => {
  const original = globalThis.document;
  const { $ } = stubEnv();
  globalThis.document = { createElement: () => stubEnv().$('row') };
  try {
    const ui = createResearchCockpitUI({ elements: $ });
    const importFile = $('cockpit-import').listeners.get('change');
    let finish;
    const slow = importFile({ target: { files: [{ text: () => new Promise(resolve => { finish = resolve; }) }] } });
    await importFile({ target: { files: [{ text: async () => minimalBundleText.replace('bundle-x', 'bundle-new') }] } });
    finish(minimalBundleText);
    await slow;
    assert.match($('cockpit-status').textContent, /bundle-new/);
    ui.setState(emptyExchangeState());
    assert.equal($('cockpit-apply').disabled, true);
    const after = importFile({ target: { files: [{ text: () => new Promise(resolve => { finish = resolve; }) }] } });
    ui.dispose();
    const status = $('cockpit-status').textContent;
    finish(minimalBundleText);
    await after;
    assert.equal($('cockpit-status').textContent, status);
    assert.deepEqual(ui.getState(), emptyExchangeState());
  } finally { globalThis.document = original; }
});

test('refreshRuns shows newly captured native runs unselected without touching prior state', () => {
  const original = globalThis.document;
  const { $ } = stubEnv();
  globalThis.document = { createElement: () => stubEnv().$('row') };
  try {
    const registry = createRunRegistry();
    registry.add({ id: 'run-a', kind: 'sweep-run', modelId: 'box-oxygen', status: 'succeeded', createdAt: '2026-11-04T00:00:00Z', payload: { spec: {}, summary: {}, points: [] }, artifactFileName: 'run-a.json' });
    const ui = createResearchCockpitUI({ elements: $, runRegistry: registry });
    const labelFor = id => $('cockpit-selection').children.find(child =>
      [child.textContent, ...child.children.map(node => String(node.textContent ?? ''))].join(' ').includes(`modelRuns: ${id}`));
    assert.ok(labelFor('run-a'), 'captured native runs are selectable');
    assert.equal(labelFor('run-a').children[0].checked, true, 'first-listed runs start selected');
    registry.add({ id: 'run-b', kind: 'sweep-run', modelId: 'slab-oxygen', status: 'failed', createdAt: '2026-11-04T00:00:01Z', payload: { spec: {}, summary: {}, points: [] }, artifactFileName: 'run-b.json' });
    ui.refreshRuns();
    assert.ok(labelFor('run-b'), 'new runs appear after refreshRuns');
    assert.equal(labelFor('run-b').children[0].checked, false, 'new runs stay unselected');
    assert.equal(labelFor('run-a').children[0].checked, true, 'prior selection survives the refresh');
    ui.dispose();
  } finally { globalThis.document = original; }
});
