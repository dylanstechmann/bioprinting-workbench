import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  VASCULAR_SUPPLY_SCHEMA, evaluateVascularSupply, defaultVascularSupply,
  validateVascularSupplySettings, validateVascularSupplyRecord, getVascularSupplyCatalog, validateVascularSupplyCatalog,
} from '../src/vascular-supply.js';

test('the planar identity is exact and the Krogh boundary conditions hold numerically', () => {
  const s = { diffusivityD_m2PerS: 1e-9, consumptionM_molPerM3S: 1e-2, inletC0_molPerM3: 0.13, channelRadiusUm: 100 };
  const L = Math.sqrt((2 * s.diffusivityD_m2PerS * s.inletC0_molPerM3) / s.consumptionM_molPerM3S) * 1e6;
  const r = evaluateVascularSupply({ settings: s, parameterOrigin: 'hypothetical-controls' });
  assert.ok(Math.abs(r.computed.planarLimitUm - L) < 1e-9);
  assert.equal(L.toFixed(0), '161'); // pinned worked example: inside the cited 100-200 um teaching band
  const R = r.computed.kroghCriticalRadiusUm * 1e-6, r0 = s.channelRadiusUm * 1e-6;
  const { diffusivityD_m2PerS: D, consumptionM_molPerM3S: M, inletC0_molPerM3: C0 } = s;
  const cEdge = C0 + (M / (4 * D)) * (R * R - r0 * r0) - ((M * R * R) / (2 * D)) * Math.log(R / r0);
  assert.ok(Math.abs(cEdge) / C0 < 1e-9, 'the critical radius must zero the edge concentration');
  const cWall = C0 + 0; // at r = r0 the profile equals C0 by construction
  assert.equal(cWall, C0);
  assert.ok(r.computed.kroghCriticalRadiusUm > r.computed.planarLimitUm, 'the cylindrical idealization supplies farther than the planar one');
  assert.ok(Math.abs(r.computed.channelSpacingUm - 2 * r.computed.kroghCriticalRadiusUm) < 1e-9);
  assert.ok(Math.abs(r.computed.channelDensityPerMm2 - 1e6 / (Math.PI * r.computed.kroghCriticalRadiusUm ** 2)) < 1e-6);
});

test('the profile runs from the channel wall to the critical edge and is monotone', () => {
  const r = evaluateVascularSupply(defaultVascularSupply());
  assert.equal(r.status, 'explored');
  assert.equal(r.computed.profile.length, 41);
  assert.ok(Math.abs(r.computed.profile[0].cOverC0 - 1) < 1e-9);
  assert.ok(r.computed.profile[r.computed.profile.length - 1].cOverC0 < 1e-6);
  for (let i = 1; i < r.computed.profile.length; i++) assert.ok(r.computed.profile[i].cOverC0 <= r.computed.profile[i - 1].cOverC0 + 1e-12);
  assert.deepEqual(r.bandContext.bandUm, [100, 200]);
  assert.ok(r.bandContext.anchorClaimIds.length >= 2);
  for (const forbidden of ['guarantee', 'will survive', 'safe for', 'approved']) assert.ok(!r.notices.join(' ').includes(forbidden));
});

test('a tiny consumption leaves supply not limiting at the capped scale, honestly', () => {
  const r = evaluateVascularSupply({ settings: { diffusivityD_m2PerS: 1e-8, consumptionM_molPerM3S: 1e-6, inletC0_molPerM3: 0.5, channelRadiusUm: 500 }, parameterOrigin: 'hypothetical-controls' });
  assert.equal(r.status, 'not-limiting-at-scale');
  assert.equal(r.computed.kroghCriticalRadiusUm, null);
  assert.equal(r.computed.channelSpacingUm, null);
  assert.equal(r.computed.channelDensityPerMm2, null);
  assert.ok(r.computed.planarLimitUm > 1000);
});

test('settings and record validators reject forged inputs and origins', () => {
  for (const bad of [
    { diffusivityD_m2PerS: 0, consumptionM_molPerM3S: 1e-2, inletC0_molPerM3: 0.13, channelRadiusUm: 100 },
    { diffusivityD_m2PerS: 1e-9, consumptionM_molPerM3S: -1e-3, inletC0_molPerM3: 0.13, channelRadiusUm: 100 },
    { diffusivityD_m2PerS: 1e-9, consumptionM_molPerM3S: 1e-2, inletC0_molPerM3: 0.6, channelRadiusUm: 100 },
    { diffusivityD_m2PerS: 1e-9, consumptionM_molPerM3S: 1e-2, inletC0_molPerM3: 0.13, channelRadiusUm: 1 },
    { diffusivityD_m2PerS: 1e-9, consumptionM_molPerM3S: 1e-2, inletC0_molPerM3: 0.13 },
  ]) assert.throws(() => validateVascularSupplySettings(bad));
  assert.throws(() => validateVascularSupplyRecord({ settings: defaultVascularSupply().settings, parameterOrigin: 'cited-fit' }));
  assert.throws(() => validateVascularSupplyRecord({ settings: defaultVascularSupply().settings, parameterOrigin: 'hypothetical-controls', extra: 1 }));
  const good = validateVascularSupplyRecord(defaultVascularSupply());
  assert.equal(good.parameterOrigin, 'hypothetical-controls');
});

test('the catalog is valid, band-agreed, and matches the shipped verbatim audit', () => {
  const catalog = getVascularSupplyCatalog();
  validateVascularSupplyCatalog(catalog);
  assert.equal(catalog.schema, VASCULAR_SUPPLY_SCHEMA);
  assert.equal(catalog.sources.length, 4);
  assert.equal(catalog.claims.length, 10);
  assert.ok(catalog.claims.filter(c => c.topic === 'diffusion-band').length === 2);
  assert.ok(catalog.claims.filter(c => c.topic === 'host-connection').length >= 3);
  const audit = JSON.parse(readFileSync(new URL('../docs/vascular-supply-audit.json', import.meta.url), 'utf8'));
  assert.equal(audit.schema, 'bioprinting-workbench/vascular-supply-audit/1');
  assert.equal(audit.fetchDate, '2026-11-02');
  assert.deepEqual(new Set(audit.claims.map(c => c.id)), new Set(catalog.claims.map(c => c.id)));
  for (const entry of audit.claims) {
    const runtime = catalog.claims.find(c => c.id === entry.id);
    assert.equal(runtime.verbatimQuote, entry.verbatimQuote);
    assert.equal(runtime.locator, entry.locator);
    assert.equal(runtime.topic, entry.topic);
    if (entry.bandUm) assert.deepEqual(runtime.bandUm, entry.bandUm);
  }
  assert.deepEqual(new Set(audit.sources.map(s => s.doi)), new Set(catalog.sources.map(s => s.doi)));
});

test('forged catalogs are rejected: bands, topics, sources, basis', () => {
  const base = getVascularSupplyCatalog();
  for (const mutate of [
    c => { c.schema = 'bioprinting-workbench/vascular-supply-evidence/2'; },
    c => { c.claims[0].id = 'foreign-claim'; },
    c => { c.claims[0].sourceId = 'fake-source'; },
    c => { c.claims[0].topic = 'clinical-outcome'; },
    c => { c.claims[0].basis = 'secondhand-restatement'; },
    c => { c.claims[0].verbatimQuote = 'too short'; },
    c => { c.claims[0].limitations = []; },
    c => { c.claims.find(x => x.topic === 'diffusion-band').bandUm = [100, 300]; },
    c => { c.claims.find(x => x.topic === 'printed-resolution').bandUm = [100, 200]; },
    c => { c.claims = c.claims.filter(x => x.topic !== 'host-connection'); },
    c => { c.claims = c.claims.filter(x => x.topic !== 'diffusion-band' ? true : x.id !== 'vascular-supply-diffusion-band-z'); },
    c => { c.claims[1].id = c.claims[0].id; },
    c => { c.sources[0].doi = 'not-a-doi'; },
  ]) { const raw = structuredClone(base); mutate(raw); assert.throws(() => validateVascularSupplyCatalog(raw)); }
});
