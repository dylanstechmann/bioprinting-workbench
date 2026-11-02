import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getGeroscienceEvidenceCatalog, validateGeroscienceEvidenceCatalog, GEROSCIENCE_EVIDENCE_SCHEMA } from '../src/geroscience-evidence.js';
import { getEvidenceCatalog } from '../src/cell-evidence.js';
import { getAgingEvidenceCatalog } from '../src/aging-evidence.js';
import { getApplicationsEvidenceCatalog } from '../src/applications-evidence.js';

test('geroscience evidence is species-separated, reviewed, and matches the shipped verbatim audit', () => {
  const catalog = getGeroscienceEvidenceCatalog();
  const foreign = [getEvidenceCatalog().claims, getAgingEvidenceCatalog().claims, getApplicationsEvidenceCatalog().claims].flat();
  validateGeroscienceEvidenceCatalog(catalog);
  assert.equal(catalog.schema, GEROSCIENCE_EVIDENCE_SCHEMA);
  assert.equal(catalog.sources.length, 4);
  assert.equal(catalog.claims.length, 4);
  for (const c of catalog.claims) {
    assert.equal(c.supportStatus, 'reviewed');
    assert.ok(c.limitations.length >= 1);
    assert.ok(c.locator.length > 8);
    assert.ok(!foreign.some(x => x.id === c.id));
  }
  const mouse = catalog.claims.find(c => c.id === 'rapamycin-lifespan-mice');
  assert.equal(mouse.species, 'mouse');
  assert.ok(mouse.limitations.some(l => l.includes('no human outcome')));
  const human = catalog.claims.find(c => c.id === 'methylation-age-clock');
  assert.equal(human.species, 'human');
  const audit = JSON.parse(readFileSync(new URL('../docs/geroscience-evidence-audit.json', import.meta.url), 'utf8'));
  assert.equal(audit.schema, 'bioprinting-workbench/geroscience-evidence-audit/1');
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

test('geroscience evidence rejects forged or upgraded entries', () => {
  const base = getGeroscienceEvidenceCatalog();
  for (const mutate of [
    c => { c.schema = 'bioprinting-workbench/geroscience-evidence/2'; },
    c => { c.claims[0].sourceId = 'fake'; },
    c => { c.claims[0].species = 'fish'; },
    c => { c.claims[0].supportStatus = 'unreviewed'; },
    c => { c.claims[0].id = 'culture-selection'; },
    c => { c.claims[0].id = 'cal-fat-retention'; },
    c => { c.claims[0].limitations = []; },
    c => { c.claims[0].locator = ' '; },
    c => { c.claims[1].id = c.claims[0].id; },
    c => { c.claims[0].extra = 1; },
    c => { c.sources[0].fullTextUrl = null; },
    c => { c.sources[0].doi = 'not-a-doi'; },
    c => { c.sources[1].id = c.sources[0].id; },
    c => { c.sources = []; },
  ]) { const raw = structuredClone(base); mutate(raw); assert.throws(() => validateGeroscienceEvidenceCatalog(raw)); }
});
