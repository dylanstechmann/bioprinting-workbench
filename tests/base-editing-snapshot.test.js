import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getGenomeRestoreIdea } from '../src/tissue-atlas.js';

test('base-editing snapshot is provenance-pinned and matches the sibling catalog census', () => {
  const snapshot = JSON.parse(readFileSync(new URL('../docs/base-editing-snapshot.json', import.meta.url), 'utf8'));
  assert.equal(snapshot.schema, 'bioprinting-workbench/base-editing-snapshot/1');
  assert.equal(snapshot.provenance.repo, 'base-editing-evidence');
  assert.equal(snapshot.provenance.repoCommit, '4d49f75');
  assert.match(snapshot.provenance.studiesJsonSha256, /^[a-f0-9]{64}$/);
  assert.equal(snapshot.provenance.snapshotDate, '2026-11-02');
  assert.ok(snapshot.provenance.note.includes('uncommitted review-doc modification'));
  assert.ok(snapshot.provenance.note.includes('NEIGHBORS.md respected'));
  assert.equal(snapshot.cardCount, snapshot.cards.length);
  assert.equal(snapshot.cardCount, 23);
  const ids = new Set(snapshot.cards.map(c => c.id));
  assert.equal(ids.size, 23);
  const knownStages = new Set(snapshot.stages);
  assert.deepEqual(knownStages, new Set(['human_cells', 'human_case', 'animal', 'plant', 'human_cohort', 'human_trial']));
  for (const c of snapshot.cards) {
    assert.ok(knownStages.has(c.stage));
    assert.ok(c.title.length > 10);
    assert.ok(c.intervention_class.length > 3);
    assert.ok(/^https:\/\//.test(c.source_url));
  }
  assert.deepEqual(snapshot.stageCounts, { human_cells: 7, human_case: 1, animal: 7, plant: 3, human_cohort: 2, human_trial: 3 });
  const census = {};
  for (const c of snapshot.cards) census[c.stage] = (census[c.stage] || 0) + 1;
  assert.deepEqual(census, snapshot.stageCounts);
});

test('genome-restore idea stays within snapshot-backed limits', () => {
  const snapshot = JSON.parse(readFileSync(new URL('../docs/base-editing-snapshot.json', import.meta.url), 'utf8'));
  assert.ok(snapshot.cards.every(c => !/whole-body/i.test(c.intervention_class)));
  const idea = getGenomeRestoreIdea();
  const writeBack = idea.steps.find(s => s.id === 'periodic-write-back');
  assert.ok(writeBack.note.includes('snapshot-pinned'));
  assert.ok(writeBack.note.includes('far below whole-tissue repair'));
});
