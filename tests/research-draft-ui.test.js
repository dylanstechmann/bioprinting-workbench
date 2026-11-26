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
  const find = (node, id) => node.id === id ? node : (node.children ?? []).map(child => find(child, id)).find(Boolean);
  return { $: id => {
    if (!nodes.has(id)) {
      const existing = [...nodes.values()].map(node => find(node, id)).find(Boolean);
      nodes.set(id, existing ?? make());
    }
    return nodes.get(id);
  }, nodes, make };
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

test('loadCard round-trips an existing draft and review state stays truthful', () => {
  const original = globalThis.document;
  const { $, make } = stubEnv();
  globalThis.document = { createElement: make };
  try {
    const workspace = createHypothesisWorkspace();
    const ui = createResearchDraftUI({ elements: $, workspace });
    fill(ui);
    ui.save();
    const saved = workspace.list()[0];
    workspace.update(saved.id, { ...saved, reviewStatus: 'owner-reviewed', authorship: { ...saved.authorship, reviewedBy: 'owner' } });
    assert.throws(() => ui.loadCard('missing-card'), RangeError);
    ui.loadCard('draft-one');
    assert.deepEqual(ui.getAlternativeRows(), [
      { id: 'alt-a', prediction: 'pattern weakens', falsifier: 'pattern persists' },
      { id: 'alt-b', prediction: 'pattern follows assumptions', falsifier: 'pattern independent of assumptions' },
    ]);
    ui.save();
    let card = workspace.get('draft-one');
    assert.equal(card.reviewStatus, 'owner-reviewed', 'unchanged save preserves existing owner review');
    assert.equal(card.authorship.reviewedBy, 'owner');
    ui.setField('title', 'A changed question');
    ui.save();
    card = workspace.get('draft-one');
    assert.equal(card.reviewStatus, 'unreviewed', 'changed content clears the stale review');
    assert.equal(card.authorship.reviewedBy, null);
    assert.equal(card.authorship.createdBy, 'agent', 'the original creator is preserved');
    ui.addAlternative();
    assert.equal(ui.getAlternativeRows().length, 3);
    ui.loadCard('draft-one');
    assert.equal(ui.getAlternativeRows().length, 2, 'loading trims alternative rows to the stored record');
    ui.dispose();
  } finally { globalThis.document = original; }
});

});

test('external cards load completely and inertly, then Save preserves import authorship and lineage', () => {
  const original = globalThis.document;
  const { $, make } = stubEnv();
  globalThis.document = { createElement: make };
  try {
    const workspace = createHypothesisWorkspace();
    const changes = [];
    const ui = createResearchDraftUI({ elements: $, workspace, onChange: state => changes.push(state) });
    fill(ui, { id: 'local-card', title: 'Retain this other record' });
    ui.save();
    const before = workspace.list();
    const external = {
      id: 'imported-card', revision: 7, title: '<img src=x onerror=alert(1)>',
      question: 'Imported question', scope: 'Imported scope', claimBoundary: 'Software record only.',
      status: 'draft', system: 'Imported synthetic system', mechanism: 'Imported mechanism',
      alternatives: Array.from({ length: 8 }, (_, index) => ({ id: `alt-${index}`, prediction: `prediction ${index}`, falsifier: `falsifier ${index}` })),
      predictions: [], falsifiers: [], confounders: ['confounder-a', 'confounder-b'],
      missingMeasurements: ['measurement-a'], modelIds: ['slab-oxygen', 'box-oxygen'],
      supportingEvidenceIds: ['evidence-support'], contradictingEvidenceIds: ['evidence-against'],
      queryPlanIds: ['query-parent'], parentHypothesisIds: ['hyp-parent', 'hyp-grandparent'],
      authorship: { createdBy: 'import', method: 'external-file', reviewedBy: 'owner' },
      reviewStatus: 'owner-reviewed',
    };
    assert.throws(() => ui.loadExternalCard({ ...external, revision: 0 }), RangeError);
    assert.deepEqual(workspace.list(), before);
    assert.equal(changes.length, 1, 'only the explicit local Save reported a change');
    ui.loadExternalCard(external);
    assert.deepEqual(workspace.list(), before, 'loading an external record is preview/edit only');
    assert.equal(changes.length, 1, 'external loading does not synchronize or apply state');
    const expectedFields = {
      id: external.id, revision: '7', title: external.title, question: external.question,
      scope: external.scope, claimBoundary: external.claimBoundary, system: external.system,
      mechanism: external.mechanism, status: external.status, authorshipCreatedBy: 'import',
      authorshipMethod: 'external-file', predictions: '', falsifiers: '',
      confounders: 'confounder-a\nconfounder-b', missingMeasurements: 'measurement-a',
      modelIds: 'slab-oxygen, box-oxygen', supportingEvidenceIds: 'evidence-support',
      contradictingEvidenceIds: 'evidence-against', queryPlanIds: 'query-parent',
      parentHypothesisIds: 'hyp-parent, hyp-grandparent',
    };
    for (const [name, value] of Object.entries(expectedFields)) assert.equal($(name === 'status' ? 'draft-card-status' : `draft-${name}`).value, value, name);
    assert.equal(ui.getAlternativeRows().length, 8);
    assert.deepEqual(ui.getAlternativeRows(), external.alternatives);
    external.title = 'caller mutation must not leak into the editor';
    external.alternatives[0].prediction = 'caller mutation';
    external.parentHypothesisIds.length = 0;
    ui.save();
    assert.equal(workspace.list().length, 2, 'Save retains unrelated existing records');
    let saved = workspace.get('imported-card');
    assert.equal(saved.title, expectedFields.title);
    assert.equal(saved.alternatives[0].prediction, 'prediction 0');
    assert.equal(saved.revision, 7, 'Save never auto-increments revision');
    assert.equal(saved.reviewStatus, 'owner-reviewed', 'unchanged reviewed import retains its review');
    assert.equal(saved.authorship.reviewedBy, 'owner');
    assert.equal(saved.authorship.createdBy, 'import');
    assert.equal(saved.authorship.method, 'external-file');
    assert.deepEqual(saved.parentHypothesisIds, ['hyp-parent', 'hyp-grandparent']);
    assert.deepEqual(saved.supportingEvidenceIds, ['evidence-support']);
    assert.deepEqual(saved.contradictingEvidenceIds, ['evidence-against']);
    ui.setField('question', 'An actual editable-content change');
    ui.setField('authorshipCreatedBy', 'owner');
    ui.save();
    saved = workspace.get('imported-card');
    assert.equal(saved.reviewStatus, 'unreviewed');
    assert.equal(saved.authorship.reviewedBy, null);
    assert.equal(saved.authorship.createdBy, 'import', 'the original creator cannot be rewritten');
    assert.equal(saved.revision, 7);
    assert.equal(workspace.get('local-card').title, 'Retain this other record');
    ui.dispose();
  } finally { globalThis.document = original; }
});

test('draft cards expose one bounded delegated edit listener and clean it up', () => {
  const original = globalThis.document;
  const { $, make } = stubEnv();
  globalThis.document = { createElement: make };
  try {
    const workspace = createHypothesisWorkspace();
    const ui = createResearchDraftUI({ elements: $, workspace });
    fill(ui);
    ui.save();
    const listener = $('draft-cards').listeners.get('click');
    assert.equal(typeof listener, 'function');
    const edit = $('draft-cards').children.find(node => node.id === 'draft-edit-draft-one');
    assert.ok(edit, 'an accessible edit control is rendered');
    assert.match(edit.textContent, /Edit draft-one/);
    ui.setField('title', 'Unsaved form text');
    listener({ target: edit });
    assert.equal($('draft-title').value, 'A draft question');
    for (let index = 0; index < 5; index++) ui.renderCards();
    assert.equal($('draft-cards').listeners.get('click'), listener, 'rerenders never grow listeners');
    assert.equal($('draft-cards').listeners.size, 1);
    ui.dispose();
    assert.equal($('draft-cards').listeners.size, 0);
  } finally { globalThis.document = original; }
});


test('Save refuses a conflicting external card instead of overwriting an owner-reviewed same-ID record', () => {
  const original = globalThis.document;
  const { $, make } = stubEnv();
  globalThis.document = { createElement: make };
  try {
    const workspace = createHypothesisWorkspace();
    const ui = createResearchDraftUI({ elements: $, workspace });
    fill(ui, { id: 'shared-card', title: 'Workspace original' });
    ui.save();
    const reviewed = { ...workspace.get('shared-card'), reviewStatus: 'owner-reviewed', authorship: { ...workspace.get('shared-card').authorship, reviewedBy: 'workspace-owner' } };
    workspace.update('shared-card', reviewed);
    const external = { ...reviewed, title: 'Conflicting external replacement', authorship: { ...reviewed.authorship, reviewedBy: 'external-owner' } };
    ui.loadExternalCard(external);
    ui.save();
    assert.match($('draft-status').textContent, /conflict/i);
    assert.match($('draft-status').textContent, /reload/i);
    assert.equal(workspace.get('shared-card').title, 'Workspace original', 'stale external content must not overwrite');
    assert.equal(workspace.get('shared-card').authorship.reviewedBy, 'workspace-owner');
    assert.equal(workspace.get('shared-card').reviewStatus, 'owner-reviewed');
    ui.loadCard('shared-card');
    ui.save();
    assert.equal(workspace.get('shared-card').title, 'Workspace original');
    assert.equal(workspace.get('shared-card').reviewStatus, 'owner-reviewed', 'legitimate unchanged same-record Save remains allowed');
    assert.equal(workspace.get('shared-card').authorship.reviewedBy, 'workspace-owner');
    ui.dispose();
  } finally { globalThis.document = original; }
});

test('Save detects an intervening workspace update and leaves the newer record untouched', () => {
  const original = globalThis.document;
  const { $, make } = stubEnv();
  globalThis.document = { createElement: make };
  try {
    const workspace = createHypothesisWorkspace();
    const ui = createResearchDraftUI({ elements: $, workspace });
    fill(ui, { id: 'draft-one', title: 'Loaded revision' });
    ui.save();
    ui.loadCard('draft-one');
    const intervening = { ...workspace.get('draft-one'), title: 'Intervening workspace edit', reviewStatus: 'owner-reviewed', authorship: { ...workspace.get('draft-one').authorship, reviewedBy: 'owner' } };
    workspace.update('draft-one', intervening);
    ui.save();
    assert.match($('draft-status').textContent, /conflict/i);
    assert.match($('draft-status').textContent, /reload/i);
    assert.deepEqual(workspace.get('draft-one'), intervening, 'the newer record and its review are byte-for-byte retained');
    ui.loadCard('draft-one');
    ui.save();
    assert.equal(workspace.get('draft-one').title, 'Intervening workspace edit');
    assert.equal(workspace.get('draft-one').reviewStatus, 'owner-reviewed');
    ui.dispose();
  } finally { globalThis.document = original; }
});

test('untouched list controls preserve padded multiline and comma-containing baseline values losslessly', () => {
  const original = globalThis.document;
  const { $, make } = stubEnv();
  globalThis.document = { createElement: make };
  try {
    const workspace = createHypothesisWorkspace();
    const ui = createResearchDraftUI({ elements: $, workspace });
    const external = {
      id: 'lossless-card', revision: 3, title: 'Lossless lists', question: 'q', scope: 's', claimBoundary: 'cb',
      status: 'draft', system: 'sys', mechanism: 'm',
      alternatives: [{ id: 'a1', prediction: 'p1', falsifier: 'f1' }, { id: 'a2', prediction: 'p2', falsifier: 'f2' }],
      predictions: ['  padded prediction  ', 'first line\nsecond line'],
      falsifiers: ['  padded falsifier  ', 'falsifier line one\nfalsifier line two'],
      confounders: ['  padded confounder  ', 'confounder one\ncontinued'],
      missingMeasurements: ['measurement,with-comma', '  padded measurement  '],
      modelIds: ['model,with-comma', '  padded-model  '],
      supportingEvidenceIds: ['support,with-comma', '  padded-support  '],
      contradictingEvidenceIds: ['against,with-comma', '  padded-against  '],
      queryPlanIds: ['query,with-comma', '  padded-query  '],
      parentHypothesisIds: ['parent,with-comma', '  padded-parent  '],
      authorship: { createdBy: 'import', method: 'lossless-test', reviewedBy: 'owner' },
      reviewStatus: 'owner-reviewed',
    };
    ui.loadExternalCard(external);
    ui.save();
    let saved = workspace.get('lossless-card');
    for (const name of ['predictions', 'falsifiers', 'confounders', 'missingMeasurements', 'modelIds', 'supportingEvidenceIds', 'contradictingEvidenceIds', 'queryPlanIds', 'parentHypothesisIds']) {
      assert.deepEqual(saved[name], external[name], `${name} must survive untouched load/Save verbatim`);
    }
    assert.equal(saved.reviewStatus, 'owner-reviewed', 'lossless unchanged Save retains the actual target review');
    assert.equal(saved.authorship.reviewedBy, 'owner');
    ui.setField('confounders', 'replacement confounder\nsecond replacement');
    ui.save();
    saved = workspace.get('lossless-card');
    assert.deepEqual(saved.confounders, ['replacement confounder', 'second replacement'], 'a genuinely edited control is parsed');
    assert.deepEqual(saved.predictions, external.predictions, 'other untouched controls still use baseline arrays');
    assert.deepEqual(saved.modelIds, external.modelIds, 'comma-containing untouched ids remain one item');
    assert.equal(saved.reviewStatus, 'unreviewed', 'a real list edit clears owner review');
    assert.equal(saved.authorship.reviewedBy, null);
    ui.dispose();
  } finally { globalThis.document = original; }
});
