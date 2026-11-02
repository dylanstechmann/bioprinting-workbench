import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getRecipeCatalog, validateRecipeCatalog, getRecipesForMethod, getRecipesForCellSystem, getAdverseEvidenceForRecipe } from '../src/method-recipes.js';
import { getRepairResearchCatalog } from '../src/repair-research.js';
import { getEvidenceCatalog } from '../src/cell-evidence.js';

const NUMERIC = /^\s*[-+]?[\d]/;

test('every recipe parameter traces to a reviewed source with locator and unit', () => {
  const catalog = getRecipeCatalog(), evidence = getEvidenceCatalog();
  const sources = new Map(evidence.sources.map(s => [s.id, s]));
  for (const r of catalog.recipes) {
    assert.equal(r.framing, 'published-research-description');
    for (const step of r.steps) {
      assert.ok(step.sourceIds.length);
      for (const p of step.parameters) {
        assert.ok(sources.has(p.sourceId) && sources.get(p.sourceId).supportStatus === 'reviewed');
        assert.ok(p.locator.length > 8);
        if (NUMERIC.test(p.value)) assert.ok(typeof p.unit === 'string' && p.unit.trim().length);
        else assert.ok(p.unit === null || typeof p.unit === 'string');
      }
    }
  }
  const halliwell = catalog.recipes.find(r => r.id === 'halliwell-nucleoside-supplementation');
  const nuc = halliwell.steps.find(s => s.id === 'halliwell-supplement-nucleosides');
  const byName = Object.fromEntries(nuc.parameters.map(p => [p.name, p.value]));
  assert.deepEqual([byName.Cytidine, byName.Guanosine, byName.Uridine, byName.Adenosine, byName.Thymidine], ['15', '15', '15', '15', '6']);
  assert.equal(byName['Stock dilution'], '0.5');
  assert.ok(halliwell.adverseEvidenceIds.includes('kurashima-miscoordination'));
  assert.ok(getAdverseEvidenceForRecipe('halliwell-nucleoside-supplementation').some(c => c.id === 'kurashima-miscoordination'));
  assert.equal(getRecipesForMethod('halliwell-nucleosides').length, 1);
  assert.equal(getRecipesForCellSystem('mouse-esc').length, 1);
  assert.throws(() => getAdverseEvidenceForRecipe('fake'));
  const bhat = catalog.recipes.find(r => r.id === 'bhat-msc-serum-free-expansion');
  assert.deepEqual(bhat.adverseEvidenceIds, []);
  assert.equal(bhat.timelineEvidence, 'reported-study-endpoint');
});

test('recipe validator rejects second-person, unsafe, unprovenanced and mislinked content', () => {
  const catalog = getRecipeCatalog(), research = getRepairResearchCatalog(), evidence = getEvidenceCatalog();
  const mutate = fn => { const raw = structuredClone(catalog); fn(raw); assert.throws(() => validateRecipeCatalog(raw, evidence, research)); };
  mutate(c => c.recipes[0].steps[0].parameters[0].sourceId = 'cycle');
  mutate(c => c.recipes[0].steps[0].parameters[0].locator = '');
  mutate(c => c.recipes[0].steps[0].parameters[0].unit = null);
  mutate(c => c.recipes[0].steps[0].body = 'Add the nucleosides to your culture.');
  mutate(c => c.recipes[0].summary = 'A validated safe method.');
  mutate(c => c.recipes[0].adverseEvidenceIds = []);
  mutate(c => c.recipes[0].methodEvidenceId = 'bhat-media-expansion');
  mutate(c => c.recipes[0].framing = 'recommendation');
  mutate(c => c.recipes[0].timelineEvidence = 'guaranteed');
  mutate(c => { c.recipes[1].id = c.recipes[0].id; });
  mutate(c => c.recipes[0].steps[0].sourceIds = ['bhat']);
  mutate(c => c.recipes[0].adverseEvidenceIds = ['fake-claim']);
  mutate(c => c.schema = 'bioprinting-workbench/method-recipes/2');
});

test('runtime recipe catalog matches the shipped provenance audit exactly', () => {
  const catalog = getRecipeCatalog();
  const audit = JSON.parse(readFileSync(new URL('../docs/method-recipes-audit.json', import.meta.url), 'utf8'));
  assert.equal(audit.schema, 'bioprinting-workbench/method-recipes-audit/1');
  const runtime = [];
  for (const r of catalog.recipes) for (const step of r.steps) for (const p of step.parameters) runtime.push(`${r.id}|${step.id}|${p.name}|${p.value}|${p.unit}|${p.sourceId}|${p.locator}`);
  const audited = audit.parameters.map(p => `${p.recipeId}|${p.stepId}|${p.name}|${p.value}|${p.unit}|${p.sourceId}|${p.locator}`);
  assert.deepEqual(new Set(audited), new Set(runtime));
  assert.equal(audited.length, runtime.length);
  const basis = new Map(audit.stepBasis.map(b => [b.stepId, b]));
  for (const r of catalog.recipes) for (const step of r.steps) {
    const b = basis.get(step.id);
    assert.ok(b && b.quote.length > 20 && b.sourceId === step.sourceIds[0]);
  }
  for (const entry of audit.fullTextAccess) assert.ok(entry.readableSections.length > 0 && entry.bytes > 1000);
});