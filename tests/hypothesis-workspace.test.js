import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateHypothesisCard, generateHypothesisCandidates, buildQueryPlans, createHypothesisWorkspace,
} from '../src/hypothesis-workspace.js';

const base = {
  id: 'hyp-test', revision: 1, title: 'Synthetic question', question: 'What explains it?',
  scope: 'synthetic only', claimBoundary: 'No biological or clinical claim.', status: 'draft',
  system: 'synthetic construct', mechanism: 'illustrative mechanism',
  alternatives: [
    { id: 'a1', prediction: 'p1', falsifier: 'f1' },
    { id: 'a2', prediction: 'p2', falsifier: 'f2' },
  ],
  predictions: [], falsifiers: [], confounders: [], missingMeasurements: [],
  modelIds: [], supportingEvidenceIds: [], contradictingEvidenceIds: ['ev-contradicting'],
  queryPlanIds: [], parentHypothesisIds: [],
  authorship: { createdBy: 'agent', method: 'template', reviewedBy: null },
  reviewStatus: 'unreviewed',
};

test('cards require 2-8 competing alternatives and preserve contradicting evidence', () => {
  const card = validateHypothesisCard(base, { allowDraft: true });
  assert.equal(card.alternatives.length, 2);
  assert.deepEqual(card.contradictingEvidenceIds, ['ev-contradicting']);
  assert.throws(() => validateHypothesisCard({ ...base, alternatives: [base.alternatives[0]] }, { allowDraft: true }), RangeError);
  const nine = { ...base, alternatives: Array.from({ length: 9 }, (_, i) => ({ id: `a${i}`, prediction: 'p', falsifier: 'f' })) };
  assert.throws(() => validateHypothesisCard(nine, { allowDraft: true }), RangeError);
  assert.throws(() => validateHypothesisCard({ ...base, alternatives: [base.alternatives[0], { id: 'a2', prediction: 'p' }] }, { allowDraft: true }), TypeError);
});

test('drafts stay drafts without fabricated predictions; ready-for-review requires them', () => {
  const draft = validateHypothesisCard(base, { allowDraft: true });
  assert.deepEqual(draft.predictions, []);
  assert.throws(() => validateHypothesisCard(base), TypeError);
  assert.throws(() => validateHypothesisCard({ ...base, status: 'ready-for-review' }, { allowDraft: true }), RangeError);
  const ready = validateHypothesisCard({ ...base, status: 'ready-for-review', predictions: ['p'], falsifiers: ['f'] });
  assert.equal(ready.status, 'ready-for-review');
});

test('review status never implies validation and authorship is explicit', () => {
  assert.throws(() => validateHypothesisCard({ ...base, reviewStatus: 'validated' }, { allowDraft: true }), RangeError);
  assert.throws(() => validateHypothesisCard({ ...base, authorship: { createdBy: 'oracle', method: 'm', reviewedBy: null } }, { allowDraft: true }), RangeError);
  assert.throws(() => validateHypothesisCard({ ...base, title: 'x'.repeat(301) }, { allowDraft: true }), TypeError);
  const forged = JSON.parse('{"__proto__":{"polluted":true}}');
  assert.throws(() => validateHypothesisCard({ ...base, ...forged }, { allowDraft: true }), TypeError);
  assert.equal({}.polluted, undefined);
});

test('candidate generation is deterministic prompts, not discoveries', () => {
  const first = generateHypothesisCandidates({ question: 'Q?', system: 'synthetic construct' }, { count: 3 });
  const second = generateHypothesisCandidates({ question: 'Q?', system: 'synthetic construct' }, { count: 3 });
  assert.deepEqual(first, second);
  assert.equal(first.length, 3);
  for (const candidate of first) {
    assert.ok(candidate.prediction && candidate.falsifier);
    assert.match(candidate.statement, /synthetic construct/);
    assert.ok(!('validated' in candidate));
  }
});

test('query plans are planned-only and never queue anything', () => {
  const plans = buildQueryPlans(base, ['local-desk']);
  assert.equal(plans.length, 2);
  for (const plan of plans) {
    assert.equal(plan.executionStatus, 'planned');
    assert.ok(plan.query.length <= 500);
    assert.match(plan.disclosure, /local/);
  }
  assert.throws(() => buildQueryPlans(base, []), RangeError);
});

test('the workspace enforces unique ids and preserves records on update', () => {
  const workspace = createHypothesisWorkspace({ cards: [base] });
  assert.equal(workspace.list().length, 1);
  assert.throws(() => workspace.add(base), RangeError);
  workspace.add({ ...base, id: 'hyp-two' });
  const updated = workspace.update('hyp-two', { ...base, id: 'ignored', title: 'Updated' });
  assert.equal(updated.title, 'Updated');
  assert.equal(updated.id, 'hyp-two');
  workspace.archive('hyp-two');
  assert.equal(workspace.get('hyp-two').status, 'archived');
  assert.throws(() => workspace.update('ghost', base), RangeError);
  const copy = workspace.list();
  copy[0].title = 'tampered';
  assert.notEqual(workspace.list()[0].title, 'tampered');
});
