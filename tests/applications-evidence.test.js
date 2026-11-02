import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getApplicationsEvidenceCatalog, validateApplicationsEvidenceCatalog, APPLICATIONS_EVIDENCE_SCHEMA } from '../src/applications-evidence.js';
import { getEvidenceCatalog } from '../src/cell-evidence.js';
import { getAgingEvidenceCatalog } from '../src/aging-evidence.js';

test('applications evidence is species-separated, reviewed, and matches the shipped verbatim audit', () => {
  const catalog = getApplicationsEvidenceCatalog(), cell = getEvidenceCatalog(), aging = getAgingEvidenceCatalog();
  validateApplicationsEvidenceCatalog(catalog);
  assert.equal(catalog.schema, APPLICATIONS_EVIDENCE_SCHEMA);
  assert.equal(catalog.sources.length, 12);
  assert.equal(catalog.claims.length, 12);
  const species = new Set(catalog.claims.map(c => c.species));
  assert.ok(species.has('human') && species.has('mouse') && species.has('other'));
  for (const c of catalog.claims) {
    assert.equal(c.supportStatus, 'reviewed');
    assert.ok(c.limitations.length >= 1);
    assert.ok(c.locator.length > 8);
    assert.ok(!cell.claims.some(x => x.id === c.id) && !aging.claims.some(x => x.id === c.id));
  }
  const mouse = catalog.claims.filter(c => c.species === 'mouse');
  assert.deepEqual(mouse.map(c => c.id), ['hair-follicle-printing-mice']);
  for (const c of mouse) assert.ok(c.limitations.some(l => l.includes('no human')));
  const audit = JSON.parse(readFileSync(new URL('../docs/applications-evidence-audit.json', import.meta.url), 'utf8'));
  assert.equal(audit.schema, 'bioprinting-workbench/applications-evidence-audit/1');
  assert.equal(audit.fetchDate, '2026-11-02');
  assert.deepEqual(new Set(audit.claims.map(c => c.id)), new Set(catalog.claims.map(c => c.id)));
  assert.deepEqual(new Set(audit.sources.map(s => s.id)), new Set(catalog.sources.map(s => s.id)));
  for (const entry of audit.claims) {
    assert.ok(entry.verbatimQuote.length > 60);
    assert.ok(entry.locator.length > 8);
    const runtime = catalog.claims.find(c => c.id === entry.id);
    assert.equal(runtime.locator, entry.locator);
  }
  for (const s of audit.sources) {
    const runtime = catalog.sources.find(x => x.id === s.id);
    assert.equal(runtime.doi, s.doi);
    assert.equal(runtime.journalYear, s.journalYear);
  }
});

test('applications evidence rejects forged or upgraded entries', () => {
  const base = getApplicationsEvidenceCatalog();
  for (const mutate of [
    c => { c.schema = 'bioprinting-workbench/applications-evidence/2'; },
    c => { c.claims[0].sourceId = 'fake'; },
    c => { c.claims[0].species = 'fish'; },
    c => { c.claims[0].supportStatus = 'unreviewed'; },
    c => { c.claims[0].id = 'culture-selection'; },
    c => { c.claims[0].id = 'aging-nine-hallmarks-2013'; },
    c => { c.claims[0].limitations = []; },
    c => { c.claims[0].locator = ' '; },
    c => { c.claims[1].id = c.claims[0].id; },
    c => { c.claims[0].extra = 1; },
    c => { c.sources[0].fullTextUrl = null; },
    c => { c.sources[0].doi = 'not-a-doi'; },
    c => { c.sources[1].id = c.sources[0].id; },
    c => { c.sources = []; },
  ]) { const raw = structuredClone(base); mutate(raw); assert.throws(() => validateApplicationsEvidenceCatalog(raw)); }
});
