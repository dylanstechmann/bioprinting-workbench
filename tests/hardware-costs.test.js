import test from 'node:test';
import assert from 'node:assert/strict';
import { HARDWARE_COST_SCHEMA, HARDWARE_CATEGORIES, getHardwareCatalog, validateHardwareCatalog, defaultHardwareBudget, validateHardwareBudget, evaluateHardwareBudget } from '../src/hardware-costs.js';

test('hardware catalog is a reference-only, basis-labeled, fully-explained parts list', () => {
  const catalog = getHardwareCatalog();
  validateHardwareCatalog(catalog);
  assert.equal(catalog.schema, HARDWARE_COST_SCHEMA);
  assert.equal(catalog.parts.length, 22);
  assert.deepEqual(HARDWARE_CATEGORIES, ['motion-platform','extrusion-toolhead','bioink-materials','sterile-culture','measurement-qc','consumables-recurring']);
  for (const category of HARDWARE_CATEGORIES) assert.ok(catalog.parts.some(p => p.category === category));
  for (const p of catalog.parts) {
    assert.ok(['authored-estimate', 'fetched-list-price'].includes(p.priceBasis));
    if (p.priceBasis === 'authored-estimate') assert.equal(p.fetchDate, null);
    else assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(p.fetchDate));
    assert.ok(p.referencePriceUSD >= 1 && p.referencePriceUSD <= 50000);
    assert.ok(p.note.length >= 40);
    assert.ok(p.sourceUrl.startsWith('https://'));
    assert.equal(typeof p.recurring, 'boolean');
  }
  assert.ok(catalog.parts.some(p => p.recurring));
  assert.ok(catalog.parts.some(p => !p.recurring));
  assert.equal(catalog.parts.filter(p => p.optional).length, 6);
  for (const mutate of [
    c => { c.schema = 'bioprinting-workbench/hardware-cost/2'; },
    c => { c.parts[0].category = 'mystery'; },
    c => { c.parts[0].referencePriceUSD = 0; },
    c => { c.parts[0].referencePriceUSD = 50001; },
    c => { c.parts[0].referencePriceUSD = 19.999; },
    c => { c.parts[0].priceBasis = 'vendor-guess'; },
    c => { c.parts[0].priceBasis = 'fetched-list-price'; },
    c => { c.parts[0].priceBasis = 'fetched-list-price'; c.parts[0].fetchDate = 'not-a-date'; },
    c => { c.parts[0].sourceUrl = 'http://insecure.example'; },
    c => { c.parts[0].note = 'short'; },
    c => { c.parts[0].recurring = 'yes'; },
    c => { c.parts[1].id = c.parts[0].id; },
    c => { c.parts = c.parts.filter(p => p.category !== 'measurement-qc'); },
    c => { c.parts = c.parts.filter(p => !p.recurring); },
    c => { c.parts = c.parts.filter(p => !p.optional); },
    c => { c.parts[0].extra = 1; },
  ]) { const raw = structuredClone(catalog); mutate(raw); assert.throws(() => validateHardwareCatalog(raw)); }
});

test('hardware budget evaluation keeps one-time and recurring costs separate and honest', () => {
  const base = defaultHardwareBudget();
  assert.equal(base.includedPartIds.length, 22);
  assert.equal(evaluateHardwareBudget({ includedPartIds: [] }).status, 'unconfigured');
  const full = evaluateHardwareBudget(base);
  assert.equal(full.status, 'costed');
  assert.equal(full.assumptionOrigin, 'reference-hypothetical');
  assert.equal(full.oneTimeTotalUSD, 5586.95);
  assert.equal(full.recurringMonthlyUSD, 462.41);
  assert.equal(full.categories.length, 6);
  const sterile = full.categories.find(c => c.id === 'sterile-culture');
  assert.equal(sterile.oneTimeUSD, 4890);
  assert.equal(sterile.recurringMonthlyUSD, 0);
  const bioink = full.categories.find(c => c.id === 'bioink-materials');
  assert.equal(bioink.oneTimeUSD, 80);
  assert.equal(bioink.recurringMonthlyUSD, 277.41);
  const acellular = evaluateHardwareBudget({ includedPartIds: getHardwareCatalog().parts.filter(p => !p.optional).map(p => p.id) });
  assert.equal(acellular.oneTimeTotalUSD, 696.95);
  assert.equal(acellular.recurringMonthlyUSD, 185);
  const parts = getHardwareCatalog().parts;
  const fetched = parts.filter(p => p.priceBasis === 'fetched-list-price');
  assert.deepEqual(fetched.map(p => p.id), ['nema17-stepper-x3', 'psu-12v', 'culture-medium-500ml']);
  for (const p of fetched) assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(p.fetchDate));
  for (const p of parts.filter(q => q.priceBasis === 'authored-estimate')) assert.equal(p.fetchDate, null);
  for (const p of parts.filter(q => q.sourceUrl === 'https://www.fishersci.com/')) assert.equal(p.priceBasis, 'authored-estimate');
  assert.equal(parts.length, 22);
  assert.ok(acellular.categories.length < 6);
  assert.ok(full.notices.some(n => n.includes('not a quote')));
  assert.ok(full.notices.some(n => n.includes('No purchase is recommended')));
  assert.ok(full.notices.some(n => n.includes('never summed into a single number')));
  assert.ok(full.notices.some(n => n.includes('In-silico first')));
  assert.ok(!JSON.stringify(full).includes('grandTotal'));
  for (const patch of [
    { includedPartIds: ['fake-part'] },
    { includedPartIds: ['psu-12v', 'psu-12v'] },
    { includedPartIds: 'psu-12v' },
    { extra: 1 },
  ]) { assert.throws(() => validateHardwareBudget({ ...base, ...patch })); }
  assert.deepEqual(validateHardwareBudget({ ...base, includedPartIds: ['psu-12v'] }).includedPartIds, ['psu-12v']);
});
