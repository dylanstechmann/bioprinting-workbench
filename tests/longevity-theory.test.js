import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultLongevityPerspective, validateLongevityPerspective, evaluateLongevityTheory, getBarrierCatalog, validateBarrierCatalog } from '../src/longevity-theory.js';
import { getEvidenceCatalog } from '../src/cell-evidence.js';
import { getAgingEvidenceCatalog } from '../src/aging-evidence.js';

test('barrier catalog anchors resolve and the whole-body lever stays excluded', () => {
  const catalog = getBarrierCatalog();
  assert.equal(catalog.length, 6);
  assert.deepEqual(catalog.filter(b => b.selectable).map(b => b.id), ['single-organ-ceiling', 'no-printed-solid-organ', 'systemic-aging-environment', 'partial-reprogramming-lever', 'cell-intrinsic-cooperation']);
  const excluded = catalog.find(b => b.id === 'whole-body-including-brain');
  assert.equal(excluded.category, 'excluded');
  assert.equal(excluded.selectable, false);
  validateBarrierCatalog(catalog, getEvidenceCatalog(), getAgingEvidenceCatalog());
  for (const mutate of [
    c => { c.find(b => b.id === 'systemic-aging-environment').anchorClaimIds = []; },
    c => { c.find(b => b.id === 'partial-reprogramming-lever').adverseClaimIds = []; },
    c => { c.find(b => b.id === 'cell-intrinsic-cooperation').anchorClaimIds.push('fake'); },
    c => { c.find(b => b.id === 'whole-body-including-brain').selectable = true; },
    c => { c.find(b => b.id === 'single-organ-ceiling').selectable = false; },
    c => { c[0].id = c[1].id; },
    c => { c.find(b => b.id === 'no-printed-solid-organ').category = 'excluded'; },
    c => { c.find(b => b.id === 'cell-intrinsic-cooperation').category = 'ceiling'; },
  ]) { const raw = structuredClone(catalog); mutate(raw); assert.throws(() => validateBarrierCatalog(raw, getEvidenceCatalog(), getAgingEvidenceCatalog())); }
});

test('longevity arithmetic is transparent, bounded and hypothesis-labeled', () => {
  const base = defaultLongevityPerspective();
  assert.equal(evaluateLongevityTheory(base).status, 'unconfigured');
  const ceilingOnly = evaluateLongevityTheory({ ...base, singleOrganFailureFraction: 0.25 });
  assert.equal(ceilingOnly.status, 'calculated');
  assert.equal(ceilingOnly.addressableCeiling, 0.25);
  assert.equal(ceilingOnly.unaffectedShare, 0.75);
  assert.equal(ceilingOnly.replacementsPerOrgan, null);
  assert.equal(ceilingOnly.totalReplacements, null);
  assert.equal(ceilingOnly.assumptionOrigin, 'user-hypothetical-simulation');
  assert.ok(ceilingOnly.notices.some(n => n.includes('Simulation theory only')));
  assert.ok(ceilingOnly.notices.some(n => n.includes('eternal youth')));
  const scheduled = evaluateLongevityTheory({ ...base, singleOrganFailureFraction: 0.25, replacedOrganCount: 3, replacementCadenceYears: 10, planningHorizonYears: 60, selectedBarrierIds: ['systemic-aging-environment', 'partial-reprogramming-lever'] });
  assert.equal(scheduled.replacementsPerOrgan, 6);
  assert.equal(scheduled.totalReplacements, 18);
  assert.ok(Math.abs(scheduled.replacementsPerPersonYear - 0.3) < 1e-9);
  assert.ok(scheduled.barrierEffects.some(e => e.id === 'systemic-aging-environment' && e.note.includes('3 organs')));
  assert.ok(scheduled.anchorSummaries.some(a => a.id === 'aging-twelve-hallmarks-2023'));
  assert.ok(scheduled.anchorSummaries.some(a => a.id === 'reprogramming-in-vivo-mouse'));
  assert.ok(scheduled.adverseSummaries.some(a => a.id === 'reprogramming-in-vitro-age'));
  const intrinsic = evaluateLongevityTheory({ ...base, singleOrganFailureFraction: 0.5, selectedBarrierIds: ['cell-intrinsic-cooperation'] });
  assert.ok(intrinsic.adverseSummaries.some(a => a.id === 'kurashima-fork-acceleration'));
  assert.ok(intrinsic.barrierEffects.some(e => e.note.includes('transformed-variant selection')));
});

test('longevity inputs reject forged, unbounded or unlinked values', () => {
  const base = defaultLongevityPerspective();
  for (const patch of [
    { selectedBarrierIds: ['whole-body-including-brain'] },
    { selectedBarrierIds: ['fake'] },
    { selectedBarrierIds: ['single-organ-ceiling', 'single-organ-ceiling'] },
    { selectedBarrierIds: 'no-printed-solid-organ' },
    { singleOrganFailureFraction: 1.5 },
    { singleOrganFailureFraction: -0.1 },
    { replacedOrganCount: 0 },
    { replacedOrganCount: 2.5 },
    { replacedOrganCount: 11 },
    { replacementCadenceYears: 0.1 },
    { replacementCadenceYears: 51 },
    { planningHorizonYears: 200 },
    { extra: 1 },
  ]) assert.throws(() => validateLongevityPerspective({ ...base, ...patch }));
  assert.deepEqual(validateLongevityPerspective({ ...base, singleOrganFailureFraction: 0, selectedBarrierIds: ['no-printed-solid-organ'] }).selectedBarrierIds, ['no-printed-solid-organ']);
  assert.equal(validateLongevityPerspective({ ...base, singleOrganFailureFraction: 1 }).singleOrganFailureFraction, 1);
});
