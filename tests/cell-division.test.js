import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultLearningState, validateLearningState, evaluateRelativeDivision } from '../src/cell-division.js';
test('relative arithmetic has no biological time default and bounded finite results',()=>{
  const state=defaultLearningState();assert.equal(evaluateRelativeDivision(state.division).relativePopulation,1);
  assert.equal(evaluateRelativeDivision(state.division).hypotheticalElapsedHours,null);
  for(const d of [1,.5,40]){const r=evaluateRelativeDivision({...state.division,doublings:d,hypotheticalDoublingHours:10});assert.equal(r.relativePopulation,2**d);assert.equal(r.hypotheticalElapsedHours,d*10);}
  const horizon=validateLearningState({...state,researchHorizonYears:7});assert.deepEqual(evaluateRelativeDivision(horizon.division),evaluateRelativeDivision(state.division));
  for(const v of [-1,41,NaN,Infinity])assert.throws(()=>evaluateRelativeDivision({...state.division,doublings:v}));
  for(const v of [0,1001,NaN,undefined])assert.throws(()=>evaluateRelativeDivision({...state.division,hypotheticalDoublingHours:v}));
  for(const patch of [{selectedCellType:'unknown'},{researchHorizonYears:21},{cancerRisk:0},{division:{...state.division,extra:1}}])assert.throws(()=>validateLearningState({...state,...patch}));
});
test('learning state carries species system, method and hypothetical comparison under strict matching',()=>{
  const state=defaultLearningState();
  assert.equal(state.selectedCellType,'msc');assert.equal(state.selectedCellSystemId,'human-msc');assert.equal(state.selectedMethodId,null);
  assert.deepEqual(state.planningComparison,{baselineHours:null,comparisonHours:null});
  assert.deepEqual(state.expansionTheory.selectedMechanismIds,[]);assert.equal(state.expansionTheory.startCells,null);
  assert.deepEqual(state.longevityPerspective.selectedBarrierIds,[]);assert.equal(state.longevityPerspective.singleOrganFailureFraction,null);
  assert.deepEqual(state.applicationsPerspective.selectedApproachIds,[]);assert.equal(state.applicationsPerspective.plannedFatVolumeML,null);
  assert.deepEqual(state.researchProgram.selectedNodeIds,[]);
  assert.equal(state.hardwareBudget.includedPartIds.length,22);
  assert.deepEqual(state.tissueAtlas.selectedTargetIds,[]);
  const mouse=validateLearningState({...state,selectedCellType:'esc',selectedCellSystemId:'mouse-esc'});
  assert.equal(mouse.selectedCellSystemId,'mouse-esc');
  const withMethod=validateLearningState({...state,selectedCellType:'ipsc',selectedCellSystemId:'human-ipsc',selectedMethodId:'halliwell-nucleosides'});
  assert.equal(withMethod.selectedMethodId,'halliwell-nucleosides');
  const compared=validateLearningState({...state,planningComparison:{baselineHours:120,comparisonHours:96}});
  assert.equal(compared.planningComparison.baselineHours,120);
  assert.equal(validateLearningState({...state,selectedMethodId:'bhat-media-expansion'}).selectedMethodId,'bhat-media-expansion');
  const expanded=validateLearningState({...state,expansionTheory:{...state.expansionTheory,startCells:1e6,targetCells:1e12,doublingHours:24,selectedMechanismIds:['medium-formulation'],mediumPdtMultiplier:1.1}});
  assert.equal(expanded.expansionTheory.startCells,1e6);
  const longevity=validateLearningState({...state,longevityPerspective:{...state.longevityPerspective,singleOrganFailureFraction:0.25,selectedBarrierIds:['systemic-aging-environment']}});
  assert.equal(longevity.longevityPerspective.singleOrganFailureFraction,0.25);
  const apps=validateLearningState({...state,applicationsPerspective:{...state.applicationsPerspective,plannedFatVolumeML:300,resorptionFraction:0.4,selectedApproachIds:['autologous-fat-graft']}});
  assert.equal(apps.applicationsPerspective.plannedFatVolumeML,300);
  const prog=validateLearningState({...state,researchProgram:{selectedNodeIds:['host-integration']}});
  assert.deepEqual(prog.researchProgram.selectedNodeIds,['host-integration']);
  const bench=validateLearningState({...state,hardwareBudget:{includedPartIds:['psu-12v']}});
  assert.deepEqual(bench.hardwareBudget.includedPartIds,['psu-12v']);
  const atlasState=validateLearningState({...state,tissueAtlas:{selectedTargetIds:['lung-alveoli']}});
  assert.deepEqual(atlasState.tissueAtlas.selectedTargetIds,['lung-alveoli']);
  for(const patch of [{selectedCellSystemId:'mouse-esc'},{selectedCellSystemId:'human-esc'},{selectedCellSystemId:'fake'},{selectedMethodId:'halliwell-nucleosides'},{planningComparison:{baselineHours:0,comparisonHours:1}},{planningComparison:{extra:1}},{expansionTheory:{...state.expansionTheory,selectedMechanismIds:['transformed-variant-selection']}},{expansionTheory:{...state.expansionTheory,forkCycleMultiplier:.9}},{expansionTheory:{...state.expansionTheory,startCells:1e6,targetCells:1e5}},{expansionTheory:{...state.expansionTheory,extra:1}},{longevityPerspective:{...state.longevityPerspective,selectedBarrierIds:['whole-body-including-brain']}},{longevityPerspective:{...state.longevityPerspective,singleOrganFailureFraction:1.5}},{longevityPerspective:{...state.longevityPerspective,extra:1}},{applicationsPerspective:{...state.applicationsPerspective,selectedApproachIds:['unregulated-injectables']}},{applicationsPerspective:{...state.applicationsPerspective,resorptionFraction:1}},{applicationsPerspective:{...state.applicationsPerspective,extra:1}},{researchProgram:{selectedNodeIds:['fake']}},{researchProgram:{selectedNodeIds:['host-integration','host-integration']}},{researchProgram:{extra:1}},{hardwareBudget:{includedPartIds:['fake']}},{hardwareBudget:{includedPartIds:['psu-12v','psu-12v']}},{hardwareBudget:{extra:1}},{tissueAtlas:{selectedTargetIds:['fake']}},{tissueAtlas:{selectedTargetIds:['elite-muscle-architecture']}},{tissueAtlas:{extra:1}}]){
    assert.throws(()=>validateLearningState({...state,...patch}));
  }
});