import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { collectReleaseInventory } from '../scripts/verify-release.mjs';
import { validateRepairResearchCatalog, getRepairResearchCatalog } from '../src/repair-research.js';
import { validateRecipeCatalog, getRecipeCatalog } from '../src/method-recipes.js';
import { validateMechanismCatalog, getMechanismCatalog } from '../src/acceleration-theory.js';
import { getEvidenceCatalog } from '../src/cell-evidence.js';
test('candidate inventory excludes private/authoring/git/test files and includes runtime licenses',()=>{
  const inventory=collectReleaseInventory();assert.ok(inventory.length>20);
  for(const row of inventory){assert.ok(!row.path.startsWith('/'));assert.ok(!/(^|\/)(\.git|\.env|tests|scripts|node_modules|__pycache__)(\/|$)/.test(row.path));assert.ok(!row.path.endsWith('.py'));assert.match(row.sha256,/^[a-f0-9]{64}$/);}
  assert.ok(inventory.some(r=>r.path==='LICENSE'));assert.ok(inventory.some(r=>r.path==='vendor/three/LICENSE'));
});
test('development version is consistent without representing publication',()=>{
  const version=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version;
  assert.match(version,/-dev$/);assert.ok(readFileSync(new URL('../index.html',import.meta.url),'utf8').includes(`v${version}`));
});
test('authored research and recipe catalogs validate for the release contract', () => {
  validateRepairResearchCatalog(getRepairResearchCatalog());
  validateRecipeCatalog(getRecipeCatalog());
  validateMechanismCatalog(getMechanismCatalog(), getEvidenceCatalog());
  const recipes = getRecipeCatalog().recipes;
  assert.ok(recipes.length >= 3);
  for (const r of recipes) {
    assert.equal(r.framing, 'published-research-description');
    for (const step of r.steps) for (const p of step.parameters) assert.ok(p.locator.length > 8);
  }
});
