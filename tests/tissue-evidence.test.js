import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getTissueEvidenceCatalog, validateTissueEvidenceCatalog, TISSUE_EVIDENCE_SCHEMA } from '../src/tissue-evidence.js';
import { getEvidenceCatalog } from '../src/cell-evidence.js';
import { getAgingEvidenceCatalog } from '../src/aging-evidence.js';
import { getApplicationsEvidenceCatalog } from '../src/applications-evidence.js';
import { getGeroscienceEvidenceCatalog } from '../src/geroscience-evidence.js';

test('tissue evidence is species-separated, reviewed, and matches the shipped verbatim audit', () => {
  const catalog = getTissueEvidenceCatalog();
  const foreign = [getEvidenceCatalog().claims, getAgingEvidenceCatalog().claims, getApplicationsEvidenceCatalog().claims, getGeroscienceEvidenceCatalog().claims].flat();
  validateTissueEvidenceCatalog(catalog);
  assert.equal(catalog.schema, TISSUE_EVIDENCE_SCHEMA);
  assert.equal(catalog.sources.length, 13);
  assert.equal(catalog.claims.length, 13);
  for (const c of catalog.claims) {
    assert.equal(c.supportStatus, 'reviewed');
    assert.ok(c.limitations.length >= 1);
    assert.ok(c.locator.length > 8);
    assert.ok(!foreign.some(x => x.id === c.id));
  }
  const human = catalog.claims.find(c => c.id === 'myonuclei-are-measurable');
  assert.equal(human.species, 'human');
  assert.ok(human.limitations.some(l => l.includes('creates none')));
  assert.ok(catalog.claims.every(c => c.species !== 'human' || c.id === 'myonuclei-are-measurable'));
  const gundersen = catalog.claims.find(c => c.id === 'myonuclei-retained-through-atrophy');
  assert.equal(gundersen.species, 'mouse');
  assert.ok(gundersen.limitations.some(l => l.includes('no human result')));
  const audit = JSON.parse(readFileSync(new URL('../docs/tissue-evidence-audit.json', import.meta.url), 'utf8'));
  assert.equal(audit.schema, 'bioprinting-workbench/tissue-evidence-audit/1');
  assert.equal(audit.fetchDate, '2026-11-02');
  assert.deepEqual(new Set(audit.claims.map(c => c.id)), new Set(catalog.claims.map(c => c.id)));
  for (const entry of audit.claims) {
    assert.ok(entry.verbatimQuote.length > 60);
    const runtime = catalog.claims.find(c => c.id === entry.id);
    assert.equal(runtime.locator, entry.locator);
  }
  for (const s of audit.sources) {
    const runtime = catalog.sources.find(x => x.id === s.id);
    assert.equal(runtime.doi, s.doi);
    assert.equal(runtime.journalYear, s.journalYear);
  }
});

test('tissue evidence rejects forged or upgraded entries', () => {
  const base = getTissueEvidenceCatalog();
  for (const mutate of [
    c => { c.schema = 'bioprinting-workbench/tissue-evidence/2'; },
    c => { c.claims[0].sourceId = 'fake'; },
    c => { c.claims[0].species = 'fish'; },
    c => { c.claims[0].supportStatus = 'unreviewed'; },
    c => { c.claims[0].id = 'culture-selection'; },
    c => { c.claims[0].id = 'methylation-age-clock'; },
    c => { c.claims[0].limitations = []; },
    c => { c.claims[0].locator = ' '; },
    c => { c.claims[1].id = c.claims[0].id; },
    c => { c.claims[0].extra = 1; },
    c => { c.sources[0].fullTextUrl = null; },
    c => { c.sources[0].doi = 'not-a-doi'; },
    c => { c.sources[1].id = c.sources[0].id; },
    c => { c.sources = []; },
  ]) { const raw = structuredClone(base); mutate(raw); assert.throws(() => validateTissueEvidenceCatalog(raw)); }
});
