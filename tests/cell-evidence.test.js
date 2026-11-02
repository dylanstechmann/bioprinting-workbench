import test from 'node:test';
import assert from 'node:assert/strict';
import { CELL_TYPE_IDS, getEvidenceCatalog, validateEvidenceCatalog, getCellProfile, getClaimsForCell, getTimingObservations } from '../src/cell-evidence.js';
test('all ten profiles have sourced claims and known or explicit unknown timing',()=>{
  for(const id of CELL_TYPE_IDS){const p=getCellProfile(id);assert.equal(p.id,id);assert.ok(getClaimsForCell(id).length);const ts=getTimingObservations(id);assert.ok(ts.length);for(const t of ts)assert.equal(t.hours===null,t.valueKind==='not-established');}
  const p=getCellProfile('msc');p.label='mutated';assert.notEqual(getCellProfile('msc').label,p.label);
  assert.throws(()=>getCellProfile('unknown'));
  assert.equal(getTimingObservations('ipsc')[0].metric,'cell-cycle');assert.equal(getTimingObservations('msc')[0].metric,'population-doubling');
  const yuan=getEvidenceCatalog().sources.find(s=>s.id==='yuan');assert.equal(yuan.onlineDate,'2025-12-17');assert.equal(yuan.journalYear,2026);
});
test('catalog rejects dangling IDs, unsafe URLs, unreviewed numbers and invalid null states',()=>{
  for(const mutate of [c=>c.sources[0].url='javascript:alert(1)',c=>c.sources[0].url='https://user:secret@example.com',c=>c.claims[0].sourceId='missing',c=>c.timings[0].hours.min=-1,c=>c.timings[1].hours={min:1,max:2},c=>c.claims.find(c=>c.id==='msc-variability').supportStatus='unreviewed',c=>c.sources[0].reviewedOn=null,c=>c.profiles.pop(),c=>c.sources[0].extra=1]){const c=getEvidenceCatalog();mutate(c);assert.throws(()=>validateEvidenceCatalog(c));}
});
test('mouse evidence is species-tagged and separated from human-oriented profiles',()=>{
  const catalog=getEvidenceCatalog();
  const kurashima=catalog.sources.find(s=>s.id==='kurashima');
  assert.equal(kurashima.doi,'10.1038/s44319-024-00207-5');assert.equal(kurashima.supportStatus,'reviewed');assert.ok(kurashima.fullTextUrl.includes('PMC11387781'));
  const mouse=catalog.claims.filter(c=>c.species==='mouse');
  assert.deepEqual(mouse.map(c=>c.id).sort(),['kurashima-es-culture','kurashima-fork-acceleration','kurashima-miscoordination']);
  for(const c of mouse)assert.equal(c.sourceId,'kurashima');
  const nuance=catalog.claims.find(c=>c.id==='kurashima-human-ips-nuance');
  assert.equal(nuance.species,'human');assert.equal(nuance.cellTypeIds.join(),'ipsc');
  const survival=catalog.claims.find(c=>c.id==='halliwell-survival');
  assert.equal(survival.species,'human');
  for(const p of catalog.profiles)for(const id of p.claimIds)assert.equal(catalog.claims.find(c=>c.id===id).species,'human');
  validateEvidenceCatalog(getEvidenceCatalog());
});