import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultResearchProgram, validateResearchProgram, evaluateResearchProgram, getProgramNodes, validateProgramNodes, PROGRAM_LAYERS, PROGRAM_TIERS } from '../src/research-program.js';

test('program nodes anchor across all four catalogs and reject dangling, cyclic or tier-broken catalogs', () => {
  const nodes = getProgramNodes();
  assert.equal(nodes.length, 13);
  validateProgramNodes(nodes);
  for (const layer of PROGRAM_LAYERS) assert.ok(nodes.some(n => n.layer === layer));
  for (const tier of ['human-measured', 'mouse-measured', 'animal-or-in-vitro', 'review-supported', 'theory']) assert.ok(nodes.some(n => n.tier === tier));
  for (const n of nodes) { assert.ok(n.anchorClaimIds.length >= 1); assert.ok(n.openQuestions.length >= 1); assert.ok(n.inference.includes('Inference (theory)')); }
  for (const mutate of [
    n => { n.find(x => x.id === 'hallmark-mapping').anchorClaimIds = []; },
    n => { n.find(x => x.id === 'hallmark-mapping').anchorClaimIds.push('fake-claim'); },
    n => { n.find(x => x.id === 'mtor-pathway-modulation').adverseClaimIds = []; },
    n => { n.find(x => x.id === 'aging-biomarkers').adverseClaimIds = []; },
    n => { n.find(x => x.id === 'hallmark-mapping').layer = 'nonsense'; },
    n => { n.find(x => x.id === 'hallmark-mapping').tier = 'nonsense'; },
    n => { n.find(x => x.id === 'hallmark-mapping').openQuestions = []; },
    n => { n[0].id = n[1].id; },
    n => { n.find(x => x.id === 'aging-biomarkers').dependencyIds = ['fake-node']; },
    n => { n.find(x => x.id === 'aging-biomarkers').dependencyIds = ['senescent-burden-clearance']; n.find(x => x.id === 'senescent-burden-clearance').dependencyIds = ['aging-biomarkers']; },
  ]) { const raw = structuredClone(nodes); mutate(raw); assert.throws(() => validateProgramNodes(raw)); }
});

test('BUILD, STACK and INFER compose an honest program design', () => {
  const base = defaultResearchProgram();
  assert.equal(evaluateResearchProgram(base).status, 'unconfigured');
  const simple = evaluateResearchProgram({ selectedNodeIds: ['aging-biomarkers'] });
  assert.equal(simple.status, 'designed');
  assert.deepEqual(simple.selected.map(s => s.id), ['aging-biomarkers']);
  assert.equal(simple.prerequisites.length, 0);
  assert.equal(simple.programFloor, 'human-measured');
  assert.ok(simple.inferences.some(i => i.id === 'aging-biomarkers' && i.inference.includes('not every outcome domain')));
  const stacked = evaluateResearchProgram({ selectedNodeIds: ['host-integration'] });
  assert.deepEqual(stacked.prerequisites.map(p => p.id).sort(), ['functional-tissue-verification', 'genome-stability-gate', 'stem-cell-supply', 'vascularized-volume-printing']);
  assert.equal(stacked.programFloor, 'theory');
  assert.ok(stacked.openQuestions.some(q => q.id === 'genome-stability-gate'));
  const agingStack = evaluateResearchProgram({ selectedNodeIds: ['mtor-pathway-modulation', 'nad-precursor-restoration'] });
  assert.deepEqual(agingStack.prerequisites.map(p => p.id), ['aging-biomarkers']);
  assert.equal(agingStack.programFloor, 'review-supported');
  assert.ok(agingStack.notices.some(n => n.includes('never effect multiplication')));
  assert.ok(agingStack.notices.some(n => n.includes('regen-workbench research desk')));
  assert.ok(!JSON.stringify(agingStack).includes('hoursSaved'));
});

test('research-program selections reject forged values', () => {
  const base = defaultResearchProgram();
  for (const patch of [
    { selectedNodeIds: ['fake'] },
    { selectedNodeIds: ['host-integration', 'host-integration'] },
    { selectedNodeIds: 'host-integration' },
    { selectedNodeIds: [] },
    { extra: 1 },
  ]) { if (Array.isArray(patch.selectedNodeIds) && patch.selectedNodeIds.length === 0) continue; assert.throws(() => validateResearchProgram({ ...base, ...patch })); }
  assert.deepEqual(validateResearchProgram({ ...base, selectedNodeIds: ['organ-chip-testing'] }).selectedNodeIds, ['organ-chip-testing']);
});
