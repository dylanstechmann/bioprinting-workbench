import test from 'node:test';
import assert from 'node:assert/strict';
import { getOrganResearchSummary, validateOrganBarriers } from '../src/organ-research.js';
test('barriers are open questions, with general and liver contexts',()=>{
  const a=getOrganResearchSummary(),b=getOrganResearchSummary('general');assert.ok(a.barriers.length>b.barriers.length);assert.ok(a.barriers.every(b=>b.status==='not-modeled'));
  assert.throws(()=>getOrganResearchSummary('heart'));
  for(const mutate of [bs=>bs[0].dependencyIds=['missing'],bs=>bs[0].dependencyIds=[bs[0].id],bs=>bs[0].status='ready',bs=>bs[0].claimIds=['missing']]){const bs=getOrganResearchSummary().barriers;mutate(bs);assert.throws(()=>validateOrganBarriers(bs));}
});