import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  NOZZLE_SHEAR_DEFAULTS, NOZZLE_SHEAR_EVIDENCE_SCHEMA, NOZZLE_SHEAR_MODEL, CELLINK_FIT,
  CITED_CFD_MAX_PA, LOW_BAND_PA, HIGH_BAND_PA,
  evaluateNozzleShear, validateNozzleShearSettings, getNozzleShearCatalog, validateNozzleShearCatalog,
} from '../src/nozzle-shear.js';

const pa = (d, q, mode = 'hypothetical-constant', mu = 1) => evaluateNozzleShear({ diameterUm: d, flowMm3PerS: q, viscosityMode: mode, viscosityPas: mu }).wallShearStressPa;

test('newtonian wall shear matches every analytic identity of laminar pipe flow', () => {
  const r = evaluateNozzleShear({ diameterUm: 410, flowMm3PerS: 3.5, viscosityMode: 'hypothetical-constant', viscosityPas: 2.5 });
  const d = 410e-6, Q = 3.5e-9, mu = 2.5, U = r.meanVelocityMmPerS / 1000;
  assert.ok(Math.abs(r.wallShearStressPa - 4 * mu * Q / (Math.PI * Math.pow(d / 2, 3))) / r.wallShearStressPa < 1e-12);
  assert.ok(Math.abs(r.wallShearStressPa - 8 * mu * U / d) / r.wallShearStressPa < 1e-12);
  assert.ok(Math.abs(r.wallShearStressPa - 32 * mu * Q / (Math.PI * d ** 3)) / r.wallShearStressPa < 1e-12);
  assert.equal(r.model, NOZZLE_SHEAR_MODEL);
});

test('the cited-fit branch reproduces K times gamma-dot-to-the-n with the Rabinowitsch correction', () => {
  const r = evaluateNozzleShear({ ...NOZZLE_SHEAR_DEFAULTS });
  const d = NOZZLE_SHEAR_DEFAULTS.diameterUm * 1e-6, Q = NOZZLE_SHEAR_DEFAULTS.flowMm3PerS * 1e-9;
  const newtonianRate = 4 * Q / (Math.PI * (d / 2) ** 3);
  const corrected = (3 * CELLINK_FIT.n + 1) / (4 * CELLINK_FIT.n) * newtonianRate;
  assert.ok(Math.abs(r.wallShearRatePerS - corrected) / corrected < 1e-12);
  assert.ok(Math.abs(r.wallShearStressPa - CELLINK_FIT.K * Math.pow(corrected, CELLINK_FIT.n)) / r.wallShearStressPa < 1e-12);
  assert.equal(r.viscositySource.includes('cited-cellink-fit'), true);
});

test('the cited piston input lands near the paper CFD range as context, not reproduction', () => {
  const r = evaluateNozzleShear({ ...NOZZLE_SHEAR_DEFAULTS });
  assert.ok(r.wallShearStressPa > 455 && r.wallShearStressPa < 480);
  const midCfd = (362.85 + 383.24) / 2;
  const ratio = r.wallShearStressPa / midCfd;
  assert.ok(ratio > 1.15 && ratio < 1.30, 'idealization gap should be about 20 percent, got ' + ratio);
  assert.equal(r.band, 'low-per-restated-bands');
  assert.equal(r.laminarAssumptionHolds, true);
  assert.ok(r.reynoldsNumber < 10);
});

test('band placement changes exactly at the cited CFD maximum and the restated band edges', () => {
  assert.equal(evaluateNozzleShear({ diameterUm: 200, flowMm3PerS: 0.357, viscosityMode: 'hypothetical-constant', viscosityPas: 1 }).band, 'below-cited-cfd-maximum');
  assert.equal(evaluateNozzleShear({ diameterUm: 200, flowMm3PerS: 0.358, viscosityMode: 'hypothetical-constant', viscosityPas: 1 }).band, 'low-per-restated-bands');
  assert.equal(evaluateNozzleShear({ diameterUm: 200, flowMm3PerS: 3.92, viscosityMode: 'hypothetical-constant', viscosityPas: 1 }).band, 'low-per-restated-bands');
  assert.equal(evaluateNozzleShear({ diameterUm: 200, flowMm3PerS: 3.94, viscosityMode: 'hypothetical-constant', viscosityPas: 1 }).band, 'medium-per-restated-bands');
  assert.equal(evaluateNozzleShear({ diameterUm: 200, flowMm3PerS: 7.85, viscosityMode: 'hypothetical-constant', viscosityPas: 1 }).band, 'medium-per-restated-bands');
  assert.equal(evaluateNozzleShear({ diameterUm: 200, flowMm3PerS: 7.86, viscosityMode: 'hypothetical-constant', viscosityPas: 1 }).band, 'high-per-restated-bands');
  assert.ok(CITED_CFD_MAX_PA === 455.43 && LOW_BAND_PA === 5000 && HIGH_BAND_PA === 10000);
});

test('a tiny nozzle at high flow breaks the laminar assumption and the module says so', () => {
  const r = evaluateNozzleShear({ diameterUm: 60, flowMm3PerS: 100, viscosityMode: 'cited-cellink-fit', viscosityPas: 1 });
  assert.ok(r.reynoldsNumber > 2300);
  assert.equal(r.laminarAssumptionHolds, false);
  assert.ok(r.notices.length >= 4);
  assert.ok(r.assumptions.length >= 3);
});

test('settings validation rejects out-of-range geometry and unknown modes', () => {
  for (const bad of [
    { diameterUm: 59, flowMm3PerS: 10, viscosityMode: 'cited-cellink-fit', viscosityPas: 1 },
    { diameterUm: 601, flowMm3PerS: 10, viscosityMode: 'cited-cellink-fit', viscosityPas: 1 },
    { diameterUm: 400, flowMm3PerS: 100.001, viscosityMode: 'cited-cellink-fit', viscosityPas: 1 },
    { diameterUm: 400, flowMm3PerS: 10, viscosityMode: 'wishful', viscosityPas: 1 },
    { diameterUm: 400, flowMm3PerS: 10, viscosityMode: 'cited-cellink-fit', viscosityPas: 0.001 },
    { diameterUm: 400, flowMm3PerS: 10, viscosityMode: 'cited-cellink-fit', viscosityPas: 1, extra: true },
  ]) assert.throws(() => validateNozzleShearSettings(bad));
  const ok = validateNozzleShearSettings({ diameterUm: 60, flowMm3PerS: 0.001, viscosityMode: 'hypothetical-constant', viscosityPas: 200 });
  assert.deepEqual(ok, { diameterUm: 60, flowMm3PerS: 0.001, viscosityMode: 'hypothetical-constant', viscosityPas: 200 });
});

test('the catalog matches the shipped verbatim audit exactly', () => {
  const catalog = getNozzleShearCatalog();
  validateNozzleShearCatalog(catalog);
  assert.equal(catalog.schema, NOZZLE_SHEAR_EVIDENCE_SCHEMA);
  assert.equal(catalog.claims.length, 11);
  assert.equal(catalog.sources.length, 1);
  const audit = JSON.parse(readFileSync(new URL('../docs/nozzle-shear-audit.json', import.meta.url), 'utf8'));
  assert.equal(audit.schema, 'bioprinting-workbench/nozzle-shear-audit/1');
  assert.equal(audit.fetchDate, '2026-11-02');
  assert.deepEqual(new Set(audit.claims.map(c => c.id)), new Set(catalog.claims.map(c => c.id)));
  for (const entry of audit.claims) {
    const runtime = catalog.claims.find(c => c.id === entry.id);
    assert.equal(runtime.verbatimQuote, entry.verbatimQuote);
    assert.equal(runtime.locator, entry.locator);
    assert.ok(entry.verbatimQuote.length >= 60);
  }
  assert.equal(catalog.sources[0].doi, audit.sources[0].doi);
  assert.equal(catalog.sources[0].journalYear, audit.sources[0].journalYear);
  const restated = catalog.claims.filter(c => c.basis === 'secondhand-restatement');
  assert.ok(restated.length >= 4);
  for (const c of restated) assert.ok(c.limitations.some(l => /restatement|not fetched/i.test(l)));
});

test('the catalog rejects forged, upgraded or under-limited entries', () => {
  const base = getNozzleShearCatalog();
  for (const mutate of [
    c => { c.schema = 'bioprinting-workbench/nozzle-shear-evidence/2'; },
    c => { c.claims[0].id = 'some-other-module-claim'; },
    c => { c.claims[0].verbatimQuote = 'short'; },
    c => { c.claims[0].supportStatus = 'unreviewed'; },
    c => { c.claims[0].basis = 'independent-replication'; },
    c => { c.claims[0].context = 'clinical'; },
    c => { c.claims[0].limitations = []; },
    c => { const s = c.claims.find(x => x.basis === 'secondhand-restatement'); s.limitations = ['Unrelated limitation text only.']; },
    c => { c.claims[1].id = c.claims[0].id; },
    c => { c.sources[0].doi = 'not-a-doi'; },
    c => { c.sources[0].fullTextUrl = 'ftp://example'; },
    c => { c.claims.push(structuredClone(c.claims[0])); },
  ]) { const raw = structuredClone(base); mutate(raw); assert.throws(() => validateNozzleShearCatalog(raw)); }
});
