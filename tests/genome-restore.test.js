import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  GENOME_RESTORE_SCHEMA, GENOME_RESTORE_STEPS, GENOME_RESTORE_VERDICTS,
  getGenomeRestoreCatalog, validateGenomeRestoreCatalog, validateGenomeRestoreSelection,
  evaluateGenomeRestoreIdea, defaultGenomeRestoreIdea, getGenomeRestoreSteps,
} from '../src/genome-restore.js';

test('the catalog is valid, step-mapped and matches the shipped verbatim audit', () => {
  const catalog = getGenomeRestoreCatalog();
  validateGenomeRestoreCatalog(catalog);
  assert.equal(catalog.schema, GENOME_RESTORE_SCHEMA);
  assert.equal(catalog.sources.length, 4);
  assert.equal(catalog.claims.length, 14);
  for (const step of GENOME_RESTORE_STEPS) {
    const anchors = catalog.claims.filter(c => c.step === step.id);
    assert.ok(anchors.length >= 2, step.id + ' needs two or more anchors');
    for (const c of anchors) assert.equal(c.verdict === 'established-practice', step.id === 'digital-backup' || step.id === 'organic-reserve');
  }
  assert.ok(catalog.claims.filter(c => c.step === 'context').length >= 2);
  for (const c of catalog.claims) {
    assert.ok(c.verbatimQuote.length >= 60);
    assert.equal(c.basis, 'primary-text');
    assert.ok(c.limitations.length >= 1);
    if (c.species === 'zebrafish') assert.ok(c.limitations.some(l => /research context/i.test(l)));
  }
  const audit = JSON.parse(readFileSync(new URL('../docs/genome-restore-audit.json', import.meta.url), 'utf8'));
  assert.equal(audit.schema, 'bioprinting-workbench/genome-restore-audit/1');
  assert.equal(audit.fetchDate, '2026-11-02');
  assert.deepEqual(new Set(audit.claims.map(c => c.id)), new Set(catalog.claims.map(c => c.id)));
  for (const entry of audit.claims) {
    const runtime = catalog.claims.find(c => c.id === entry.id);
    assert.equal(runtime.verbatimQuote, entry.verbatimQuote);
    assert.equal(runtime.locator, entry.locator);
    assert.equal(runtime.verdict, entry.verdict);
    assert.equal(runtime.sourceId, entry.sourceId);
  }
  assert.ok(new Set(catalog.claims.map(c => c.sourceId)).size === 4);
  assert.deepEqual(new Set(audit.sources.map(s => s.doi)), new Set(catalog.sources.map(s => s.doi)));
});

test('evaluation reports the honest two-and-two verdicts from the catalog, never an upgrade', () => {
  const all = evaluateGenomeRestoreIdea({ selectedStepIds: GENOME_RESTORE_STEPS.map(s => s.id) });
  assert.equal(all.status, 'explored');
  const verdicts = Object.fromEntries(all.selectedSteps.map(s => [s.id, s.verdict]));
  assert.equal(verdicts['digital-backup'], 'established-practice');
  assert.equal(verdicts['organic-reserve'], 'established-practice');
  assert.equal(verdicts['periodic-write-back'], 'theory-only');
  assert.equal(verdicts['edit-directed-differentiation'], 'theory-only');
  assert.equal(all.selectedSteps.find(s => s.id === 'periodic-write-back').anchors.length, 5);
  assert.ok(all.summary.includes('2 established-practice step(s) and 2 theory-only step(s)'));
  for (const forbidden of ['will safely', 'proven safe', 'guaranteed', 'approved for']) assert.ok(!all.summary.includes(forbidden));
  const empty = evaluateGenomeRestoreIdea(defaultGenomeRestoreIdea());
  assert.equal(empty.status, 'unconfigured');
  assert.equal(empty.summary, null);
  const writeBack = evaluateGenomeRestoreIdea({ selectedStepIds: ['periodic-write-back'] });
  assert.ok(writeBack.selectedSteps[0].blockers.some(b => b.includes('no single \\"original genome\\"') || b.includes('single \\"original')) || writeBack.notices.some(n => n.includes('no single')));
});

test('selections reject unknown, duplicated or forged steps', () => {
  for (const bad of [
    { selectedStepIds: ['teleportation'] },
    { selectedStepIds: ['digital-backup', 'digital-backup'] },
    { selectedStepIds: 'digital-backup' },
    { selectedStepIds: [] , extra: 1 },
    { selectedStepIds: ['context'] },
    {},
  ]) assert.throws(() => validateGenomeRestoreSelection(bad));
  assert.deepEqual(validateGenomeRestoreSelection({ selectedStepIds: ['organic-reserve'] }), { selectedStepIds: ['organic-reserve'] });
  assert.deepEqual(defaultGenomeRestoreIdea(), { selectedStepIds: [] });
  assert.equal(getGenomeRestoreSteps().length, 4);
  assert.ok(GENOME_RESTORE_VERDICTS.includes('theory-only'));
});

test('the catalog rejects forged, mis-verdicted or animal-upgraded entries', () => {
  const base = getGenomeRestoreCatalog();
  for (const mutate of [
    c => { c.schema = 'bioprinting-workbench/genome-restore-evidence/2'; },
    c => { c.claims[0].id = 'foreign-claim'; },
    c => { c.claims[0].step = 'whole-body-restore'; },
    c => { c.claims[0].verdict = 'approved-clinic'; },
    c => { c.claims[0].basis = 'secondhand-restatement'; },
    c => { c.claims[0].verbatimQuote = 'too short'; },
    c => { c.claims[0].species = 'mouse'; },
    c => { const z = c.claims.find(x => x.species === 'zebrafish'); z.limitations = ['Only limitation text.']; },
    c => { const s = c.claims.find(x => x.id === 'genome-restore-no-single-original'); s.verdict = 'established-practice'; },
    c => { c.claims[1].id = c.claims[0].id; },
    c => { c.sources[0].doi = 'not-a-doi'; },
    c => { c.sources[0].fullTextUrl = 'http://insecure'; },
    c => { c.claims[0].sourceId = 'fake-source'; },
    c => { c.claims = c.claims.filter(x => x.step !== 'periodic-write-back'); },
    c => { c.claims = c.claims.filter(x => x.step !== 'context'); },
  ]) { const raw = structuredClone(base); mutate(raw); assert.throws(() => validateGenomeRestoreCatalog(raw)); }
});
