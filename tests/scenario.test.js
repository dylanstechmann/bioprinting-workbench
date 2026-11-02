import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULTS, snapshot } from '../src/model.js';
import { createProcedureState } from '../src/procedure.js';
import { createScenario, defaultAnalyses, serializeScenario, parseScenario } from '../src/scenario.js';
const initial=()=>({parameters:{...DEFAULTS},time:0,procedure:createProcedureState(),view:{camera:'lab',reveal:false,environment:'lab'},analyses:defaultAnalyses(),datasets:{slab:null,oxygen3d:null}});
test('scenario v4 round-trip deep copies canonical inputs and rejects forged results',()=>{
  const state=initial(), result=parseScenario(serializeScenario(state));
  assert.deepEqual(result.scenario,createScenario(state));assert.deepEqual(result.warnings,[]);
  result.scenario.parameters.layers=9;assert.equal(state.parameters.layers,6);
  const forged=JSON.parse(serializeScenario(state));forged.calculatedSafety=1;
  assert.throws(()=>parseScenario(JSON.stringify(forged)));
});
test('v4 carries species system, method, comparison and environment as inputs only',()=>{
  const s=createScenario(initial());
  s.learning.selectedCellType='esc';s.learning.selectedCellSystemId='mouse-esc';
  s.learning.planningComparison={baselineHours:120,comparisonHours:96};s.view.environment='treedome';
  const restored=parseScenario(serializeScenario(s)).scenario;
  assert.deepEqual(restored.learning,s.learning);assert.equal(restored.view.environment,'treedome');
  for(const mutate of [v=>v.learning.selectedCellSystemId='human-msc',v=>v.learning.selectedMethodId='halliwell-nucleosides',v=>v.learning.planningComparison.baselineHours=0,v=>v.view.environment='sandy-house',v=>v.learning.repairSuccess=true]){
    const raw=structuredClone(s);mutate(raw);assert.throws(()=>parseScenario(JSON.stringify(raw)));
  }
  assert.ok(!serializeScenario(s).includes('differenceHours'));
  assert.ok(!serializeScenario(s).includes('relativeChangePercent'));
});
test('v3 migration preserves inputs and defaults the new fields with truthful warnings',()=>{
  const v3=(()=>{const s=createScenario(initial());s.schema='bioprinting-workbench/3';delete s.learning.selectedCellSystemId;delete s.learning.selectedMethodId;delete s.learning.planningComparison;delete s.view.environment;s.learning.researchHorizonYears=7;s.learning.selectedCellType='ipsc';return s;})();
  const r=parseScenario(JSON.stringify(v3));
  assert.equal(r.migratedFrom,'bioprinting-workbench/3');assert.equal(r.scenario.schema,'bioprinting-workbench/4');
  assert.equal(r.scenario.learning.selectedCellSystemId,'human-ipsc');assert.equal(r.scenario.learning.selectedMethodId,null);
  assert.deepEqual(r.scenario.learning.planningComparison,{baselineHours:null,comparisonHours:null});
  assert.equal(r.scenario.view.environment,'lab');assert.equal(r.scenario.learning.researchHorizonYears,7);
  assert.ok(r.warnings.length);assert.ok(r.warnings.some(w=>w.includes('species-separated')));
  const extra=JSON.parse(JSON.stringify(v3));extra.learning.selectedMethodId=null;
  assert.throws(()=>parseScenario(JSON.stringify(extra)));
  const extraView=JSON.parse(JSON.stringify(v3));extraView.view.environment='lab';
  assert.throws(()=>parseScenario(JSON.stringify(extraView)));
});
test('v2 migration chains through v3 defaults with layered warnings',()=>{
  const v2=createScenario(initial());delete v2.learning;delete v2.view.environment;v2.schema='bioprinting-workbench/2';
  const r=parseScenario(JSON.stringify(v2));
  assert.equal(r.migratedFrom,'bioprinting-workbench/2');assert.equal(r.scenario.schema,'bioprinting-workbench/4');
  assert.equal(r.scenario.learning.selectedCellSystemId,'human-msc');
  assert.deepEqual(r.scenario.learning.planningComparison,{baselineHours:null,comparisonHours:null});
  assert.equal(r.scenario.view.environment,'lab');
  assert.ok(r.warnings.length>=2);assert.ok(r.warnings.some(w=>w.startsWith('Version 2')));
  v2.learning={};assert.throws(()=>parseScenario(JSON.stringify(v2)));
});
test('legacy migration warns and resets unexported progress/datasets',()=>{
  const legacy={...snapshot(3.5,DEFAULTS),procedure:{mode:'free',checksComplete:16},oxygenTeachingModel:{demand:1.2}};
  const migrated=parseScenario(JSON.stringify(legacy));
  assert.equal(migrated.scenario.time,0);assert.deepEqual(migrated.scenario.procedure,createProcedureState());
  assert.equal(migrated.scenario.view.environment,'lab');
  assert.equal(migrated.scenario.analyses.slab.demand,1.2);assert.ok(migrated.warnings[0].includes('3.5'));assert.equal(migrated.scenario.datasets.slab,null);
});
test('invalid gates, flow contradictions, datasets and schema reject before mutation',()=>{
  for(const mutate of [s=>s.time=3,s=>s.seed=7,s=>s.procedure.completedChecks=['fake'],s=>s.analyses.flow.enabled=false,s=>s.datasets.slab={},s=>s.schema='unknown',s=>s.schema='bioprinting-workbench/5',s=>s.parameters.extra=1]){
    const s=createScenario(initial());mutate(s);assert.throws(()=>parseScenario(JSON.stringify(s)));
  }
  const free=initial();free.procedure.mode='free';free.time=4.5;assert.equal(parseScenario(serializeScenario(free)).scenario.time,4.5);
});
test('shipped migration fixtures restore to the current schema',()=>{
  for(const [file,from] of [['scenario-v2.json','bioprinting-workbench/2'],['scenario-v3.json','bioprinting-workbench/3'],['scenario-v4.json',null]]){
    const r=parseScenario(readFileSync(new URL(`./fixtures/${file}`,import.meta.url),'utf8'));
    assert.equal(r.scenario.schema,'bioprinting-workbench/4');assert.equal(r.migratedFrom,from);
  }
  const v4=parseScenario(readFileSync(new URL('./fixtures/scenario-v4.json',import.meta.url),'utf8')).scenario;
  assert.equal(v4.view.environment,'treedome');assert.equal(v4.learning.selectedCellSystemId,'mouse-esc');
  assert.equal(v4.learning.selectedMethodId,'kurashima-fork-acceleration');
  assert.deepEqual(v4.learning.planningComparison,{baselineHours:120,comparisonHours:96});
});