import test from 'node:test';
import assert from 'node:assert/strict';
import { createResearchDraftUI } from '../src/research-draft-ui.js';
import { createHypothesisWorkspace } from '../src/hypothesis-workspace.js';

function stubEnv() {
  const make = () => ({
    children: [], value: '', textContent: '', hidden: false, disabled: false, type: '', listeners: new Map(),
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = nodes; },
    addEventListener(name, fn) { this.listeners.set(name, fn); },
    removeEventListener(name, fn) { if (this.listeners.get(name) === fn) this.listeners.delete(name); },
  });
  const nodes = new Map();
  return { $: id => { if (!nodes.has(id)) nodes.set(id, make()); return nodes.get(id); }, nodes, make };
}

function fill(ui, overrides = {}) {
  const values = {
    id: 'draft-one', revision: 1, title: 'A draft question', question: 'What controls the pattern?',
    scope: 'normalized teaching box', claimBoundary: 'No biological claim.', system: 'normalized box',
    mechanism: 'diffusion-consumption balance', status: 'ready-for-review', authorshipCreatedBy: 'agent',
    authorshipMethod: 'agent-drafted', predictions: 'If demand rises, center falls.', falsifiers: 'A flat profile falsifies it.',
    confounders: 'grid effects', missingMeasurements: 'measured demand', modelIds: 'box-oxygen,slab-oxygen',
    supportingEvidenceIds: '', contradictingEvidenceIds: '', queryPlanIds: '', parentHypothesisIds: '',
    providerIds: 'pubmed', ...overrides,
  };
  for (const [name, value] of Object.entries(values)) ui.setField(name, value);
  ui.setAlternative(0, { id: 'alt-a', prediction: 'pattern weakens', falsifier: 'pattern persists' });
  ui.setAlternative(1, { id: 'alt-b', prediction: 'pattern follows assumptions', falsifier: 'pattern independent of assumptions' });
}

test('drafts save through the workspace validator and invalid drafts never enter', () => {
  const original = globalThis.document;
  const { $, make } = stubEnv();
  globalThis.document = { createElement: make };
  try {
    const workspace = createHypothesisWorkspace();
    const seen = [];
    const ui = createResearchDraftUI({ elements: $, workspace, onChange: next => seen.push(next) });
    fill(ui, { id: 'bad-id!', title: '' });
    ui.save();
    assert.equal(workspace.list().length, 0);
    assert.match($('draft-status').textContent, /draft-one|bad-id|title|id/i);
    fill(ui);
    ui.save();
    assert.equal(workspace.list().length, 1);
    const card = workspace.list()[0];
    assert.equal(card.id, 'draft-one');
    assert.equal(card.reviewStatus, 'unreviewed');
    assert.equal(card.authorship.createdBy, 'agent');
    assert.equal(card.authorship.reviewedBy, null); // editing never records a reviewer
    assert.deepEqual(card.modelIds, ['box-oxygen', 'slab-oxygen']);
    assert.ok(seen.length >= 1);
    ui.dispose();
  } finally { globalThis.document = original; }
});

test('alternatives stay within 2-8 and missing predictions block ready-for-review but keep drafts', () => {
  const original = globalThis.document;
  const { $, make } = stubEnv();
  globalThis.document = { createElement: make };
  try {
    const workspace = createHypothesisWorkspace();
    const ui = createResearchDraftUI({ elements: $, workspace });
    assert.equal(ui.getAlternativeRows().length, 2); // seeded minimum
    for (let i = 0; i < 10; i++) ui.addAlternative();
    assert.equal(ui.getAlternativeRows().length, 8); // bounded maximum
    for (let i = 0; i < 8; i++) ui.setAlternative(i, { id: `alt-${i}`, prediction: `p${i}`, falsifier: `f${i}` });
    // drafts without predictions persist as drafts
    fill(ui, { status: 'draft', predictions: '', falsifiers: '' });
    ui.save();
    assert.equal(workspace.list()[0].status, 'draft');
    // ready-for-review requires predictions and falsifiers; nothing is fabricated
    fill(ui, { id: 'draft-two', revision: 1, status: 'ready-for-review', predictions: '', falsifiers: '' });
    ui.save();
    assert.equal(workspace.list().length, 1);
    assert.match($('draft-status').textContent, /prediction|falsifier/i);
    // a review status can never be upgraded by editing
    assert.equal(workspace.list()[0].reviewStatus, 'unreviewed');
    ui.dispose();
  } finally { globalThis.document = original; }
});

test('dynamic text stays inert text and query plans are generated explicitly', () => {
  const original = globalThis.document;
  const { $, make } = stubEnv();
  globalThis.document = { createElement: make };
  try {
    const workspace = createHypothesisWorkspace();
    const seen = [];
    const ui = createResearchDraftUI({ elements: $, workspace, onChange: next => seen.push(next) });
    const payload = '<img src=x onerror=alert(1)>';
    fill(ui, { status: 'draft', title: payload, predictions: '', falsifiers: '' });
    ui.save();
    assert.equal(workspace.list()[0].title, payload); // stored verbatim as data
    ui.renderCards();
    const walk = node => [node, ...(node.children ?? []).flatMap(walk)];
    const rendered = walk($('draft-cards'));
    assert.ok(rendered.every(el => el.innerHTML === undefined), 'no element ever receives raw markup');
    assert.ok(rendered.some(el => (el.textContent ?? '').includes(payload)), 'the payload appears only as inert text');
    ui.generateQueries();
    const last = seen[seen.length - 1];
    assert.equal(last.queries.length, 2); // one query plan per competing alternative
    assert.equal(last.queries[0].id, 'draft-one-q1');
    assert.equal(last.queries[0].executionStatus, 'planned');
    assert.match(last.queries[0].disclosure, /local until explicitly selected/i);
    ui.dispose();
  } finally { globalThis.document = original; }
});