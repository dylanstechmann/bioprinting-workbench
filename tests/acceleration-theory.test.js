import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultExpansionTheory, validateExpansionTheory, evaluateExpansionTheory, getMechanismCatalog, validateMechanismCatalog } from '../src/acceleration-theory.js';
import { getEvidenceCatalog } from '../src/cell-evidence.js';

test('mechanism catalog anchors resolve and the instability lever stays excluded', () => {
  const catalog = getMechanismCatalog(), evidence = getEvidenceCatalog();
  assert.equal(catalog.length, 6);
  assert.deepEqual(catalog.filter(m => m.selectable).map(m => m.id), ['attrition-rescue', 'medium-formulation', 'split-seeding-logistics', 'passage-overhead', 'fork-speed-push']);
  const excluded = catalog.find(m => m.id === 'transformed-variant-selection');
  assert.equal(excluded.category, 'excluded');
  assert.equal(excluded.selectable, false);
  validateMechanismCatalog(catalog, evidence);
  for (const mutate of [
    c => { c.find(m => m.id === 'fork-speed-push').anchorClaimIds = []; },
    c => { c.find(m => m.id === 'fork-speed-push').adverseClaimIds = []; },
    c => { c.find(m => m.id === 'attrition-rescue').anchorClaimIds.push('fake'); },
    c => { c.find(m => m.id === 'transformed-variant-selection').selectable = true; },
    c => { c.find(m => m.id === 'medium-formulation').selectable = false; },
    c => { c[0].id = c[1].id; },
    c => { c.find(m => m.id === 'medium-formulation').category = 'excluded'; },
    c => { c.find(m => m.id === 'passage-overhead').category = 'attrition'; },
  ]) { const raw = structuredClone(catalog); mutate(raw); assert.throws(() => validateMechanismCatalog(raw, evidence)); }
});

test('expansion arithmetic is transparent, bounded and hypothesis-labeled', () => {
  const base = defaultExpansionTheory();
  assert.equal(evaluateExpansionTheory(base).status, 'unconfigured');
  const plain = evaluateExpansionTheory({ ...base, startCells: 1e6, targetCells: 1e12, doublingHours: 24, overheadHours: 4, splitRatio: 4 });
  assert.equal(plain.status, 'calculated');
  assert.ok(Math.abs(plain.pureDoublings - Math.log2(1e6)) < 1e-9);
  assert.equal(plain.passages, 10);
  assert.equal(plain.attritionExtraDoublings, 0);
  assert.ok(Math.abs(plain.totalHours - (Math.log2(1e6) * 24 + 40)) < 1e-9);
  assert.equal(plain.assumptionOrigin, 'user-hypothetical-simulation');
  assert.ok(plain.notices.some(n => n.includes('No organ-production timeline')));
  assert.ok(plain.notices.some(n => n.includes('Simulation theory only')));
  const rescued = evaluateExpansionTheory({ ...base, startCells: 1e6, targetCells: 1e12, doublingHours: 24, splitRatio: 4, attritionFraction: .4, attritionRescuedFraction: .72, selectedMechanismIds: ['attrition-rescue'] });
  assert.ok(Math.abs(rescued.attritionExtraDoublings - 10 * -Math.log2(.72)) < 1e-9);
  const effect = rescued.mechanismEffects.find(e => e.id === 'attrition-rescue');
  assert.ok(effect.hoursSaved > 0);
  assert.ok(Math.abs(effect.hoursSaved - 10 * (-Math.log2(.4) + Math.log2(.72)) * 24) < 1e-9);
  assert.ok(rescued.anchorSummaries.some(a => a.id === 'halliwell-survival'));
  assert.ok(rescued.adverseSummaries.some(a => a.id === 'kurashima-miscoordination'));
  const medium = evaluateExpansionTheory({ ...base, startCells: 1e6, targetCells: 1e12, doublingHours: 24, selectedMechanismIds: ['medium-formulation'], mediumPdtMultiplier: .9 });
  assert.ok(Math.abs(medium.cycleHours - 21.6) < 1e-9);
  assert.ok(medium.mechanismEffects.find(e => e.id === 'medium-formulation').hoursSaved > 0);
  const fork = evaluateExpansionTheory({ ...base, startCells: 1e6, targetCells: 1e12, doublingHours: 24, selectedMechanismIds: ['fork-speed-push'], forkCycleMultiplier: .8 });
  assert.ok(fork.mechanismEffects.find(e => e.id === 'fork-speed-push').hoursSaved > 0);
  assert.ok(fork.anchorSummaries.some(a => a.id === 'kurashima-fork-acceleration'));
  const defaulted = evaluateExpansionTheory({ ...base, startCells: 1e3, targetCells: 1e4, doublingHours: 24 });
  assert.equal(defaulted.assumedDefaults.length, 2);
  assert.ok(defaulted.totalHours > 0);
});

test('expansion inputs reject forged, unbounded or unlinked values', () => {
  const base = defaultExpansionTheory();
  for (const patch of [
    { selectedMechanismIds: ['transformed-variant-selection'] },
    { selectedMechanismIds: ['fake'] },
    { selectedMechanismIds: ['attrition-rescue', 'attrition-rescue'] },
    { attritionRescuedFraction: .72 },
    { mediumPdtMultiplier: .9 },
    { forkCycleMultiplier: .9 },
    { selectedMechanismIds: ['fork-speed-push'], forkCycleMultiplier: .5 },
    { selectedMechanismIds: ['attrition-rescue'], attritionRescuedFraction: 0 },
    { startCells: 999 },
    { startCells: 1.5 },
    { targetCells: 1e16 },
    { splitRatio: 1 },
    { splitRatio: 2.5 },
    { doublingHours: .01 },
    { overheadHours: 200 },
    { attritionFraction: .001 },
    { extra: 1 },
    { startCells: 1e6, targetCells: 1e5 },
    { startCells: 1e6, targetCells: 1e6 },
  ]) assert.throws(() => validateExpansionTheory({ ...base, ...patch }));
  assert.deepEqual(validateExpansionTheory({ ...base, startCells: 1e6, targetCells: 1e9, doublingHours: 24, selectedMechanismIds: ['medium-formulation'], mediumPdtMultiplier: 1.1 }).selectedMechanismIds, ['medium-formulation']);
});