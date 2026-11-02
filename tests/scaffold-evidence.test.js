import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getScaffoldEvidenceCatalog, validateScaffoldEvidenceCatalog, SCAFFOLD_EVIDENCE_SCHEMA } from '../src/scaffold-evidence.js';
import { getEvidenceCatalog } from '../src/cell-evidence.js';
import { getAgingEvidenceCatalog } from '../src/aging-evidence.js';
import { getApplicationsEvidenceCatalog } from '../src/applications-evidence.js';
import { getGeroscienceEvidenceCatalog } from '../src/geroscience-evidence.js';
import { getTissueEvidenceCatalog } from '../src/tissue-evidence.js';

test('scaffold evidence is species-separated, reviewed, and matches the shipped verbatim audit', () => {
  const catalog = getScaffoldEvidenceCatalog();
  const foreign = [getEvidenceCatalog().claims, getAgingEvidenceCatalog().claims, getApplicationsEvidenceCatalog().claims, getGeroscienceEvidenceCatalog().claims, getTissueEvidenceCatalog().claims].flat();
  validateScaffoldEvidenceCatalog(catalog);
  assert.equal(catalog.schema, SCAFFOLD_EVIDENCE_SCHEMA);
  assert.equal(catalog.sources.length, 10);
  assert.equal(catalog.claims.length, 10);
  for (const c of catalog.claims) {
    assert.equal(c.supportStatus, 'reviewed');
    assert.equal(c.species, 'other');
    assert.ok(c.limitations.length >= 1);
    assert.ok(c.locator.length > 8);
    assert.ok(!foreign.some(x => x.id === c.id));
  }
  const audit = JSON.parse(readFileSync(new URL('../docs/scaffold-evidence-audit.json', import.meta.url), 'utf8'));
  assert.equal(audit.schema, 'bioprinting-workbench/scaffold-evidence-audit/1');
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

test('scaffold evidence rejects forged or upgraded entries', () => {
  const base = getScaffoldEvidenceCatalog();
  for (const mutate of [
    c => { c.schema = 'bioprinting-workbench/scaffold-evidence/2'; },
    c => { c.claims[0].sourceId = 'fake'; },
    c => { c.claims[0].species = 'fish'; },
    c => { c.claims[0].supportStatus = 'unreviewed'; },
    c => { c.claims[0].id = 'culture-selection'; },
    c => { c.claims[0].id = 'lung-models-not-organs'; },
    c => { c.claims[0].limitations = []; },
    c => { c.claims[0].locator = ' '; },
    c => { c.claims[1].id = c.claims[0].id; },
    c => { c.claims[0].extra = 1; },
    c => { c.sources[0].fullTextUrl = null; },
    c => { c.sources[0].doi = 'not-a-doi'; },
    c => { c.sources[1].id = c.sources[0].id; },
    c => { c.sources = []; },
  ]) { const raw = structuredClone(base); mutate(raw); assert.throws(() => validateScaffoldEvidenceCatalog(raw)); }
});
