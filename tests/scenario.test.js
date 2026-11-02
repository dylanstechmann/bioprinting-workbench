import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULTS, snapshot } from '../src/model.js';
import { createProcedureState } from '../src/procedure.js';
import { createScenario, defaultAnalyses, serializeScenario, parseScenario } from '../src/scenario.js';
const initial=()=>({parameters:{...DEFAULTS},time:0,procedure:createProcedureState(),view:{camera:'lab',reveal:false,environment:'lab'},analyses:defaultAnalyses(),datasets:{slab:null,oxygen3d:null}});
test('scenario v10 round-trip deep copies canonical inputs and rejects forged results',()=>{
  const state=initial(), result=parseScenario(serializeScenario(state));
  assert.deepEqual(result.scenario,createScenario(state));assert.deepEqual(result.warnings,[]);
  result.scenario.parameters.layers=9;assert.equal(state.parameters.layers,6);
  const forged=JSON.parse(serializeScenario(state));forged.calculatedSafety=1;
  assert.throws(()=>parseScenario(JSON.stringify(forged)));
});
test('v10 carries species system, method, comparison, environment, longevity perspective, applications comparison, research program, hardware budget and tissue atlas as inputs only',()=>{
  const s=createScenario(initial());
  s.learning.selectedCellType='esc';s.learning.selectedCellSystemId='mouse-esc';
  s.learning.planningComparison={baselineHours:120,comparisonHours:96};s.view.environment='treedome';
  s.learning.expansionTheory={...s.learning.expansionTheory,startCells:1e6,targetCells:1e12,doublingHours:24,selectedMechanismIds:['attrition-rescue']};s.learning.longevityPerspective={...s.learning.longevityPerspective,singleOrganFailureFraction:0.25,selectedBarrierIds:['systemic-aging-environment']};s.learning.applicationsPerspective={...s.learning.applicationsPerspective,plannedFatVolumeML:300,resorptionFraction:0.4,selectedApproachIds:['autologous-fat-graft']};s.learning.researchProgram={selectedNodeIds:['host-integration']};s.learning.hardwareBudget={includedPartIds:['psu-12v','milligram-scale']};s.learning.tissueAtlas={selectedTargetIds:['lung-alveoli','skeletal-muscle']}
  const restored=parseScenario(serializeScenario(s)).scenario;
  assert.deepEqual(restored.learning,s.learning);assert.equal(restored.view.environment,'treedome');
  for(const mutate of [v=>v.learning.selectedCellSystemId='human-msc',v=>v.learning.selectedMethodId='halliwell-nucleosides',v=>v.learning.planningComparison.baselineHours=0,v=>v.view.environment='sandy-house',v=>v.learning.repairSuccess=true,v=>v.learning.expansionTheory.selectedMechanismIds=['transformed-variant-selection'],v=>v.learning.expansionTheory.forkCycleMultiplier=.9,v=>v.learning.expansionTheory.targetCells=1e5,v=>v.learning.expansionTheory.extra=1,v=>v.learning.longevityPerspective.selectedBarrierIds=['whole-body-including-brain'],v=>v.learning.longevityPerspective.singleOrganFailureFraction=1.5,v=>v.learning.longevityPerspective.extra=1,v=>v.learning.applicationsPerspective.selectedApproachIds=['unregulated-injectables'],v=>v.learning.applicationsPerspective.resorptionFraction=1,v=>v.learning.applicationsPerspective.extra=1]){
    const raw=structuredClone(s);mutate(raw);assert.throws(()=>parseScenario(JSON.stringify(raw)));
  }
  assert.ok(!serializeScenario(s).includes('differenceHours'));
  assert.ok(!serializeScenario(s).includes('relativeChangePercent'));assert.ok(!serializeScenario(s).includes('totalReplacements'));assert.ok(!serializeScenario(s).includes('addressableCeiling'));assert.ok(!serializeScenario(s).includes('retainedVolumeML'));assert.ok(!serializeScenario(s).includes('fatSessions'));assert.ok(!serializeScenario(s).includes('implantInterventions'));assert.ok(!serializeScenario(s).includes('programFloor'));assert.ok(!serializeScenario(s).includes('prerequisites'));assert.ok(!serializeScenario(s).includes('oneTimeTotalUSD'));assert.ok(!serializeScenario(s).includes('barriers'));
});
test('v3 migration preserves inputs and defaults the new fields with truthful warnings',()=>{
  const v3=(()=>{const s=createScenario(initial());s.schema='bioprinting-workbench/3';delete s.learning.selectedCellSystemId;delete s.learning.selectedMethodId;delete s.learning.planningComparison;delete s.learning.expansionTheory;delete s.learning.longevityPerspective;delete s.learning.applicationsPerspective;delete s.learning.researchProgram;delete s.learning.hardwareBudget;delete s.learning.tissueAtlas;delete s.view.environment;s.learning.researchHorizonYears=7;s.learning.selectedCellType='ipsc';return s;})();
  const r=parseScenario(JSON.stringify(v3));
  assert.equal(r.migratedFrom,'bioprinting-workbench/3');assert.equal(r.scenario.schema,'bioprinting-workbench/10');
  assert.equal(r.scenario.learning.selectedCellSystemId,'human-ipsc');assert.equal(r.scenario.learning.selectedMethodId,null);
  assert.deepEqual(r.scenario.learning.planningComparison,{baselineHours:null,comparisonHours:null});
  assert.deepEqual(r.scenario.learning.expansionTheory.selectedMechanismIds,[]);assert.equal(r.scenario.learning.expansionTheory.startCells,null);
  assert.deepEqual(r.scenario.learning.longevityPerspective.selectedBarrierIds,[]);assert.equal(r.scenario.learning.longevityPerspective.singleOrganFailureFraction,null);
  assert.deepEqual(r.scenario.learning.applicationsPerspective.selectedApproachIds,[]);assert.equal(r.scenario.learning.applicationsPerspective.plannedFatVolumeML,null);
  assert.deepEqual(r.scenario.learning.researchProgram.selectedNodeIds,[]);
  assert.equal(r.scenario.learning.hardwareBudget.includedPartIds.length,22);
  assert.deepEqual(r.scenario.learning.tissueAtlas.selectedTargetIds,[]);
  assert.equal(r.scenario.view.environment,'lab');assert.equal(r.scenario.learning.researchHorizonYears,7);
  assert.ok(r.warnings.length);assert.ok(r.warnings.some(w=>w.includes('species-separated')));
  const extra=JSON.parse(JSON.stringify(v3));extra.learning.selectedMethodId=null;
  assert.throws(()=>parseScenario(JSON.stringify(extra)));
  const extraView=JSON.parse(JSON.stringify(v3));extraView.view.environment='lab';
  assert.throws(()=>parseScenario(JSON.stringify(extraView)));
});
test('v4 migration preserves inputs and defaults longevity with truthful warnings',()=>{
  const v4=(()=>{const s=createScenario(initial());s.learning.expansionTheory={...s.learning.expansionTheory,startCells:1e6,targetCells:1e12,doublingHours:24,selectedMechanismIds:['attrition-rescue']};s.schema='bioprinting-workbench/4';delete s.learning.longevityPerspective;delete s.learning.applicationsPerspective;delete s.learning.researchProgram;delete s.learning.hardwareBudget;delete s.learning.tissueAtlas;return s;})();
  const r=parseScenario(JSON.stringify(v4));
  assert.equal(r.migratedFrom,'bioprinting-workbench/4');assert.equal(r.scenario.schema,'bioprinting-workbench/10');
  assert.deepEqual(r.scenario.learning.longevityPerspective,{singleOrganFailureFraction:null,replacedOrganCount:null,replacementCadenceYears:null,planningHorizonYears:null,selectedBarrierIds:[]});
  assert.deepEqual(r.scenario.learning.applicationsPerspective,{plannedFatVolumeML:null,resorptionFraction:null,fatRetouchYears:null,implantReplacementYears:null,planningHorizonYears:null,selectedApproachIds:[]});
  assert.deepEqual(r.scenario.learning.researchProgram,{selectedNodeIds:[]});
  assert.equal(r.scenario.learning.hardwareBudget.includedPartIds.length,22);
  assert.deepEqual(r.scenario.learning.tissueAtlas.selectedTargetIds,[]);
  assert.equal(r.scenario.learning.expansionTheory.startCells,1e6);
  assert.ok(r.warnings.length);assert.ok(r.warnings.some(w=>w.includes('longevity')&&w.includes('applications')&&w.includes('research-program')&&w.includes('hardware-budget')&&w.includes('tissue-atlas')));
  const extra=JSON.parse(JSON.stringify(v4));extra.learning.longevityPerspective={};
  assert.throws(()=>parseScenario(JSON.stringify(extra)));
});
test('v5 migration preserves inputs and defaults applications with truthful warnings',()=>{
  const v5=(()=>{const s=createScenario(initial());s.learning.longevityPerspective={...s.learning.longevityPerspective,singleOrganFailureFraction:0.25};s.schema='bioprinting-workbench/5';delete s.learning.applicationsPerspective;delete s.learning.researchProgram;delete s.learning.hardwareBudget;delete s.learning.tissueAtlas;return s;})();
  const r=parseScenario(JSON.stringify(v5));
  assert.equal(r.migratedFrom,'bioprinting-workbench/5');assert.equal(r.scenario.schema,'bioprinting-workbench/10');
  assert.deepEqual(r.scenario.learning.applicationsPerspective,{plannedFatVolumeML:null,resorptionFraction:null,fatRetouchYears:null,implantReplacementYears:null,planningHorizonYears:null,selectedApproachIds:[]});
  assert.equal(r.scenario.learning.longevityPerspective.singleOrganFailureFraction,0.25);
  assert.ok(r.warnings.length);assert.ok(r.warnings.some(w=>w.includes('applications')));
  const extra=JSON.parse(JSON.stringify(v5));extra.learning.applicationsPerspective={};
  assert.throws(()=>parseScenario(JSON.stringify(extra)));
});
test('v6 migration preserves inputs and defaults the research program with truthful warnings',()=>{
  const v6=(()=>{const s=createScenario(initial());s.learning.applicationsPerspective={...s.learning.applicationsPerspective,plannedFatVolumeML:300};s.schema='bioprinting-workbench/6';delete s.learning.researchProgram;delete s.learning.hardwareBudget;delete s.learning.tissueAtlas;return s;})();
  const r=parseScenario(JSON.stringify(v6));
  assert.equal(r.migratedFrom,'bioprinting-workbench/6');assert.equal(r.scenario.schema,'bioprinting-workbench/10');
  assert.deepEqual(r.scenario.learning.researchProgram,{selectedNodeIds:[]});
  assert.equal(r.scenario.learning.applicationsPerspective.plannedFatVolumeML,300);
  assert.deepEqual(r.scenario.learning.tissueAtlas.selectedTargetIds,[]);
  assert.ok(r.warnings.length);assert.ok(r.warnings.some(w=>w.includes('research-program')&&w.includes('hardware-budget')&&w.includes('tissue-atlas')));
  const extra=JSON.parse(JSON.stringify(v6));extra.learning.researchProgram={};
  assert.throws(()=>parseScenario(JSON.stringify(extra)));
});
test('v7 migration preserves inputs and defaults the hardware budget with truthful warnings',()=>{
  const v7=(()=>{const s=createScenario(initial());s.schema='bioprinting-workbench/7';delete s.learning.hardwareBudget;delete s.learning.tissueAtlas;return s;})();
  const r=parseScenario(JSON.stringify(v7));
  assert.equal(r.migratedFrom,'bioprinting-workbench/7');assert.equal(r.scenario.schema,'bioprinting-workbench/10');
  assert.equal(r.scenario.learning.hardwareBudget.includedPartIds.length,22);
  assert.deepEqual(r.scenario.learning.researchProgram.selectedNodeIds,[]);
  assert.ok(r.warnings.length);assert.ok(r.warnings.some(w=>w.includes('hardware-budget')));
  const extra=JSON.parse(JSON.stringify(v7));extra.learning.hardwareBudget={};
  assert.throws(()=>parseScenario(JSON.stringify(extra)));
});
test('v8 migration preserves inputs and defaults the tissue atlas with truthful warnings',()=>{
  const v8=(()=>{const s=createScenario(initial());s.schema='bioprinting-workbench/8';delete s.learning.tissueAtlas;return s;})();
  const r=parseScenario(JSON.stringify(v8));
  assert.equal(r.migratedFrom,'bioprinting-workbench/8');assert.equal(r.scenario.schema,'bioprinting-workbench/10');
  assert.deepEqual(r.scenario.learning.tissueAtlas.selectedTargetIds,[]);
  assert.equal(r.scenario.learning.hardwareBudget.includedPartIds.length,22);
  assert.ok(r.warnings.length);assert.ok(r.warnings.some(w=>w.includes('tissue-atlas')));
  const extra=JSON.parse(JSON.stringify(v8));extra.learning.tissueAtlas={selectedTargetIds:['elite-muscle-architecture']};
  assert.throws(()=>parseScenario(JSON.stringify(extra)));
});
test('v2 migration chains through v3 defaults with layered warnings',()=>{
  const v2=createScenario(initial());delete v2.learning;delete v2.view.environment;v2.schema='bioprinting-workbench/2';
  const r=parseScenario(JSON.stringify(v2));
  assert.equal(r.migratedFrom,'bioprinting-workbench/2');assert.equal(r.scenario.schema,'bioprinting-workbench/10');
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
  for(const mutate of [s=>s.time=3,s=>s.seed=7,s=>s.procedure.completedChecks=['fake'],s=>s.analyses.flow.enabled=false,s=>s.datasets.slab={},s=>s.schema='unknown',s=>s.schema='bioprinting-workbench/11',s=>s.parameters.extra=1]){
    const s=createScenario(initial());mutate(s);assert.throws(()=>parseScenario(JSON.stringify(s)));
  }
  const free=initial();free.procedure.mode='free';free.time=4.5;assert.equal(parseScenario(serializeScenario(free)).scenario.time,4.5);
});
test('shipped migration fixtures restore to the current schema',()=>{
  for(const [file,from] of [['scenario-v2.json','bioprinting-workbench/2'],['scenario-v3.json','bioprinting-workbench/3'],['scenario-v4.json','bioprinting-workbench/4'],['scenario-v5.json','bioprinting-workbench/5'],['scenario-v6.json','bioprinting-workbench/6'],['scenario-v7.json','bioprinting-workbench/7'],['scenario-v8.json','bioprinting-workbench/8'],['scenario-v9.json','bioprinting-workbench/9'],['scenario-v10.json',null]]){
    const r=parseScenario(readFileSync(new URL(`./fixtures/${file}`,import.meta.url),'utf8'));
    assert.equal(r.scenario.schema,'bioprinting-workbench/10');assert.equal(r.migratedFrom,from);
  }
  const v4=parseScenario(readFileSync(new URL('./fixtures/scenario-v4.json',import.meta.url),'utf8')).scenario;
  assert.equal(v4.view.environment,'treedome');assert.equal(v4.learning.selectedCellSystemId,'mouse-esc');
  assert.equal(v4.learning.selectedMethodId,'kurashima-fork-acceleration');
  assert.deepEqual(v4.learning.planningComparison,{baselineHours:120,comparisonHours:96});
  assert.deepEqual(v4.learning.expansionTheory.selectedMechanismIds,['attrition-rescue']);
  assert.equal(v4.learning.expansionTheory.startCells,1e6);assert.equal(v4.learning.expansionTheory.targetCells,1e12);assert.equal(v4.learning.expansionTheory.doublingHours,24);
  const v5=parseScenario(readFileSync(new URL('./fixtures/scenario-v5.json',import.meta.url),'utf8')).scenario;
  assert.equal(v5.schema,'bioprinting-workbench/10');
  assert.deepEqual(v5.learning.longevityPerspective,{singleOrganFailureFraction:0.25,replacedOrganCount:3,replacementCadenceYears:10,planningHorizonYears:60,selectedBarrierIds:['systemic-aging-environment','partial-reprogramming-lever']});
  const v6=parseScenario(readFileSync(new URL('./fixtures/scenario-v6.json',import.meta.url),'utf8')).scenario;
  assert.equal(v6.schema,'bioprinting-workbench/10');
  assert.deepEqual(v6.learning.applicationsPerspective,{plannedFatVolumeML:300,resorptionFraction:0.4,fatRetouchYears:3,implantReplacementYears:10,planningHorizonYears:30,selectedApproachIds:['autologous-fat-graft','bioprinted-adipose']});
  const v7=parseScenario(readFileSync(new URL('./fixtures/scenario-v7.json',import.meta.url),'utf8')).scenario;
  assert.equal(v7.schema,'bioprinting-workbench/10');
  assert.deepEqual(v7.learning.researchProgram,{selectedNodeIds:['host-integration','aging-biomarkers']});
  const v8=parseScenario(readFileSync(new URL('./fixtures/scenario-v8.json',import.meta.url),'utf8')).scenario;
  assert.equal(v8.schema,'bioprinting-workbench/10');
  assert.deepEqual(v8.learning.hardwareBudget,{includedPartIds:['psu-12v','milligram-scale']});
  const v9=parseScenario(readFileSync(new URL('./fixtures/scenario-v9.json',import.meta.url),'utf8'));
  assert.equal(v9.scenario.schema,'bioprinting-workbench/10');assert.equal(v9.migratedFrom,'bioprinting-workbench/9');
  assert.deepEqual(v9.scenario.learning.tissueAtlas,{selectedTargetIds:['lung-alveoli','skeletal-muscle']});
  assert.deepEqual(v9.scenario.analyses.nozzleShear,{settings:{diameterUm:400,flowMm3PerS:10,viscosityMode:'cited-cellink-fit',viscosityPas:1},parameterOrigin:'cited-fit-application'});
  assert.ok(v9.warnings.some(w=>w.includes('nozzle-shear')));
  const v10=parseScenario(readFileSync(new URL('./fixtures/scenario-v10.json',import.meta.url),'utf8'));
  assert.equal(v10.scenario.schema,'bioprinting-workbench/10');assert.equal(v10.migratedFrom,null);
  assert.deepEqual(v10.scenario.analyses.nozzleShear,{settings:{diameterUm:250,flowMm3PerS:2.5,viscosityMode:'hypothetical-constant',viscosityPas:3},parameterOrigin:'hypothetical-controls'});
  for(const mutate of [v=>v.analyses.nozzleShear.parameterOrigin='cited-fit-application',v=>v.analyses.nozzleShear.settings.diameterUm=10,v=>{delete v.analyses.nozzleShear;},v=>v.analyses.nozzleShear.settings.viscosityMode='wishful']){
    const raw=structuredClone(v10.scenario);mutate(raw);assert.throws(()=>parseScenario(JSON.stringify(raw)));
  }
});