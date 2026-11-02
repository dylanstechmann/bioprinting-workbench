import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getAgingEvidenceCatalog, validateAgingEvidenceCatalog, AGING_EVIDENCE_SCHEMA } from '../src/aging-evidence.js';
import { getEvidenceCatalog } from '../src/cell-evidence.js';

test('aging evidence is species-separated, reviewed, and matches the shipped verbatim audit', () => {
  const catalog = getAgingEvidenceCatalog(), cell = getEvidenceCatalog();
  validateAgingEvidenceCatalog(catalog);
  assert.equal(catalog.schema, AGING_EVIDENCE_SCHEMA);
  assert.equal(catalog.sources.length, 4);
  assert.equal(catalog.claims.length, 5);
  const species = new Set(catalog.claims.map(c => c.species));
  assert.ok(species.has('mouse') && species.has('other') && !species.has('human'));
  for (const c of catalog.claims) {
    assert.equal(c.supportStatus, 'reviewed');
    assert.ok(c.limitations.length >= 1);
    assert.ok(c.locator.length > 8);
    assert.ok(!cell.claims.some(x => x.id === c.id));
    assert.ok(cell.sources.every(s => s.id !== c.sourceId));
  }
  const mouse = catalog.claims.filter(c => c.species === 'mouse');
  assert.deepEqual(mouse.map(c => c.id).sort(), ['parabiosis-systemic-factors', 'reprogramming-in-vivo-mouse']);
  for (const c of mouse) assert.ok(c.limitations.some(l => l.includes('never transferred to human outcomes')) || c.limitations.some(l => l.includes('no human application')));
  const audit = JSON.parse(readFileSync(new URL('../docs/aging-evidence-audit.json', import.meta.url), 'utf8'));
  assert.equal(audit.schema, 'bioprinting-workbench/aging-evidence-audit/1');
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

test('aging evidence rejects forged or upgraded entries', () => {
  const base = getAgingEvidenceCatalog();
  for (const mutate of [
    c => { c.schema = 'bioprinting-workbench/aging-evidence/2'; },
    c => { c.claims[0].sourceId = 'fake'; },
    c => { c.claims[0].species = 'fish'; },
    c => { c.claims[0].supportStatus = 'unreviewed'; },
    c => { c.claims[0].id = 'culture-selection'; },
    c => { c.claims[0].limitations = []; },
    c => { c.claims[0].locator = ' '; },
    c => { c.claims[1].id = c.claims[0].id; },
    c => { c.claims[0].extra = 1; },
    c => { c.sources[0].fullTextUrl = null; },
    c => { c.sources[0].doi = 'not-a-doi'; },
    c => { c.sources[1].id = c.sources[0].id; },
    c => { c.sources = []; },
  ]) { const raw = structuredClone(base); mutate(raw); assert.throws(() => validateAgingEvidenceCatalog(raw)); }
});
