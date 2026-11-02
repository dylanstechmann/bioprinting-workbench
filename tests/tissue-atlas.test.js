import test from 'node:test';
import assert from 'node:assert/strict';
import { getTissueTargets, getGenomeRestoreIdea, getMyonuclearMemoryIdea, getIdeasDesk, validateTissueTargets, defaultTissueAtlas, validateTissueAtlas, evaluateTissueAtlas, ATLAS_REGIONS, ATLAS_STATUSES } from '../src/tissue-atlas.js';
test('myonuclear memory idea is assessed honestly with mouse anchors and a theory ceiling', () => {
  const idea = getMyonuclearMemoryIdea();
  assert.equal(idea.id, 'myonuclear-memory');
  assert.equal(idea.steps.length, 3);
  assert.deepEqual(idea.steps.map(s => s.verdict), ['measured-in-mice', 'measured-in-mice', 'theory']);
  assert.ok(idea.steps[0].anchorClaimIds.includes('myonuclei-retained-through-atrophy'));
  assert.ok(idea.steps[2].anchorClaimIds.includes('myonuclei-are-measurable'));
  assert.ok(idea.notices.some(n => n.includes('never become human outcomes')));
  const desk = getIdeasDesk();
  assert.equal(desk.length, 2);
  assert.equal(desk[0].id, 'genome-backup-restore');
  assert.equal(desk[1].id, 'myonuclear-memory');
});


test('atlas targets anchor across all five catalogs with an unselectable honesty entry', () => {
  const targets = getTissueTargets();
  assert.equal(targets.length, 9);
  validateTissueTargets(targets.map(t => ({ ...t, relatedIds: {} })));
  for (const region of ATLAS_REGIONS) assert.ok(targets.some(t => t.region === region));
  const aspiration = targets.find(t => t.id === 'elite-muscle-architecture');
  assert.equal(aspiration.status, 'aspiration');
  assert.ok(aspiration.aspirationNote.includes('never selectable'));
  for (const t of targets) {
    assert.ok(t.anchorClaimIds.length >= 1);
    assert.ok(t.barriers.length >= 1);
    assert.ok(t.openQuestion.length > 40);
    if (['in-vitro', 'preclinical'].includes(t.status)) assert.ok(t.adverseClaimIds.length >= 1);
  }
  assert.equal(targets.filter(t => t.status === 'aspiration').length, 1);
  for (const mutate of [
    t => { t[0].anchorClaimIds = []; },
    t => { t[0].anchorClaimIds.push('fake-claim'); },
    t => { t.find(x => x.id === 'gingiva').adverseClaimIds = []; },
    t => { t.find(x => x.id === 'lung-alveoli').region = 'mystery'; },
    t => { t.find(x => x.id === 'lung-alveoli').status = 'proven'; },
    t => { t.find(x => x.id === 'lung-alveoli').barriers = []; },
    t => { t[0].id = t[1].id; },
    t => { t.find(x => x.id === 'lung-alveoli').extra = 1; },
    t => { const filtered = t.filter(x => x.region !== 'neural'); return filtered; },
    t => { const filtered = t.filter(x => x.status !== 'aspiration'); return filtered; },
  ]) { const raw = structuredClone(targets).map(x => ({ ...x, relatedIds: {} })); const mutated = mutate(raw); if (mutated === raw) { assert.throws(() => validateTissueTargets(mutated)); } else assert.throws(() => validateTissueTargets(mutated)); }
});

test('atlas evaluation never upgrades a target and rejects the aspiration selection', () => {
  assert.equal(evaluateTissueAtlas(defaultTissueAtlas()).status, 'unconfigured');
  const r = evaluateTissueAtlas({ selectedTargetIds: ['lung-alveoli', 'skeletal-muscle'] });
  assert.equal(r.status, 'explored');
  assert.equal(r.assumptionOrigin, 'user-hypothetical-simulation');
  assert.deepEqual(r.selected.map(s => s.id), ['lung-alveoli', 'skeletal-muscle']);
  assert.ok(r.summary.includes('in-vitro constructs'));
  assert.ok(r.summary.includes('never upgrades'));
  const reviews = evaluateTissueAtlas({ selectedTargetIds: ['lung-alveoli'] });
  assert.ok(reviews.summary.includes('review-stage mapping'));
  assert.ok(r.selected.some(s => s.barriers.length >= 1));
  for (const patch of [
    { selectedTargetIds: ['fake-target'] },
    { selectedTargetIds: ['elite-muscle-architecture'] },
    { selectedTargetIds: ['lung-alveoli', 'lung-alveoli'] },
    { selectedTargetIds: 'lung-alveoli' },
    { extra: 1 },
  ]) { assert.throws(() => validateTissueAtlas({ ...defaultTissueAtlas(), ...patch })); }
  assert.deepEqual(validateTissueAtlas({ ...defaultTissueAtlas(), selectedTargetIds: ['tooth-pulp-dentin'] }).selectedTargetIds, ['tooth-pulp-dentin']);
});

test('genome-restore idea is assessed step-by-step with honest verdicts', () => {
  const idea = getGenomeRestoreIdea();
  assert.equal(idea.id, 'genome-backup-restore');
  assert.equal(idea.steps.length, 4);
  assert.deepEqual(idea.steps.map(s => s.verdict), ['real-today', 'real-today', 'theory', 'theory']);
  assert.ok(idea.steps.find(s => s.id === 'digital-backup').note.includes('no write-path'));
  assert.ok(idea.steps.find(s => s.id === 'periodic-write-back').note.includes('base-editing-evidence'));
  assert.ok(idea.steps.find(s => s.id === 'periodic-write-back').anchorClaimIds.includes('lineage-preserving-reprogramming-checklist'));
  assert.ok(idea.steps.find(s => s.id === 'differentiation-editing').anchorClaimIds.includes('reprogramming-in-vivo-mouse'));
  assert.ok(idea.notices.some(n => n.includes('nothing was performed')));
});
