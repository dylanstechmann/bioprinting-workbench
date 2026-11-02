import test from 'node:test';
import assert from 'node:assert/strict';
import { getRepairResearchCatalog, validateRepairResearchCatalog, getCellSystems, getMethodsForCellSystem, getCellSystemEvidence, defaultCellSystemId, validateCellSystemSelection, validateMethodSelection } from '../src/repair-research.js';
import { getEvidenceCatalog } from '../src/cell-evidence.js';

test('species-separated systems and method comparisons stay untangled', () => {
  const catalog = getRepairResearchCatalog();
  assert.equal(catalog.schema, 'bioprinting-workbench/repair-research/1');
  const human = getCellSystems({ speciesId: 'human' }), mouse = getCellSystems({ speciesId: 'mouse' });
  assert.equal(human.length, 10);
  assert.equal(mouse.length, 1);
  assert.equal(mouse[0].id, 'mouse-esc');
  const evidence = getEvidenceCatalog();
  for (const s of catalog.systems) for (const id of s.claimIds) assert.equal(evidence.claims.find(c => c.id === id).species, s.speciesId);
  const mouseSystem = catalog.systems.find(s => s.id === 'mouse-esc');
  assert.deepEqual(mouseSystem.timingIds, []);
  assert.deepEqual(getCellSystemEvidence('mouse-esc').claims.map(c => c.id), ['kurashima-es-culture', 'kurashima-fork-acceleration', 'kurashima-miscoordination']);
  assert.equal(getCellSystemEvidence('human-ipsc').system.speciesId, 'human');
  assert.throws(() => getCellSystemEvidence('unknown'));
  assert.equal(defaultCellSystemId('msc'), 'human-msc');
  assert.equal(validateCellSystemSelection('esc', 'mouse-esc'), 'mouse-esc');
  assert.equal(validateCellSystemSelection('esc', 'human-esc'), 'human-esc');
  assert.throws(() => validateCellSystemSelection('msc', 'mouse-esc'));
  assert.equal(validateMethodSelection('mouse-esc', null), null);
  assert.equal(validateMethodSelection('human-ipsc', 'halliwell-nucleosides'), 'halliwell-nucleosides');
  assert.throws(() => validateMethodSelection('mouse-esc', 'halliwell-nucleosides'));
  const mouseMethods = getMethodsForCellSystem('mouse-esc');
  assert.equal(mouseMethods.length, 1);
  assert.equal(mouseMethods[0].observedOutcome, 'adverse-endpoint');
  assert.equal(mouseMethods[0].timelineEvidence, 'not-established');
  for (const m of catalog.methods) { if (m.timelineEvidence === 'reported-study-endpoint') assert.ok(m.timelineClaimIds.length); else assert.deepEqual(m.timelineClaimIds, []); }
});

test('research catalog rejects species drift and forged rows', () => {
  const catalog = getRepairResearchCatalog();
  const mutate = fn => { const raw = structuredClone(catalog); fn(raw); assert.throws(() => validateRepairResearchCatalog(raw)); };
  mutate(c => c.systems.find(s => s.id === 'mouse-esc').claimIds.push('replication-stress'));
  mutate(c => c.systems.find(s => s.id === 'mouse-esc').claimIds.push('fake'));
  mutate(c => c.systems.find(s => s.id === 'mouse-esc').timingIds.push('esc-cycle'));
  mutate(c => c.methods.find(m => m.id === 'halliwell-nucleosides').claimIds.push('msc-variability'));
  mutate(c => c.methods.find(m => m.id === 'kurashima-fork-acceleration').timelineClaimIds.push('kurashima-fork-acceleration'));
  mutate(c => c.methods.find(m => m.id === 'halliwell-nucleosides').timelineEvidence = 'guaranteed-acceleration');
  mutate(c => c.methods.find(m => m.id === 'halliwell-nucleosides').cellSystemIds.push('fake-system'));
  mutate(c => c.methods.find(m => m.id === 'halliwell-nucleosides').sourceIds = ['not-a-source']);
  mutate(c => c.schema = 'bioprinting-workbench/repair-research/2');
  mutate(c => c.notice = '');
  mutate(c => c.systems.find(s => s.id === 'mouse-esc').evidenceStatus = 'not-established');
});