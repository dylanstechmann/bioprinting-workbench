import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnalysisUI } from '../src/analysis-ui.js';
import { oxygen3DExample } from '../src/calibration3d.js';
function harness() {
  const nodes=new Map();
  const $=id=>{if(!nodes.has(id))nodes.set(id,{value:'0',textContent:'',disabled:false,hidden:false,listeners:{},addEventListener(e,fn){this.listeners[e]=fn;}});return nodes.get(id);};
  const jobs=[];const client={invalidate(){},dispose(){},request(kind,payload){return new Promise((resolve,reject)=>jobs.push({kind,payload,resolve,reject}));}};
  const ui=createAnalysisUI({elements:$,client});return {$,ui,jobs};
}
const fit={identifiable:true,inDomain:true,converged:true,q:1,n:3,residualRMSE:0,sensitivityNormSquared:1,dataKind:'synthetic',assumptionNotice:'reference only'};
test('new file intent blocks stale fit completion even if client does not cancel',async()=>{
  const {$,ui,jobs}=harness();await $('fit3d-example').listeners.click();assert.equal(jobs.length,1);
  let finish;const file={size:10,arrayBuffer:()=>new Promise(r=>finish=r)};const target={files:[file],value:'file'};
  const pending=$('fit3d-file').listeners.change({target});jobs[0].resolve(fit);await Promise.resolve();
  assert.equal(ui.diagnostics().fit,null);assert.equal($('fit3d-apply').disabled,true);
  finish(new TextEncoder().encode('{').buffer);await pending;assert.equal(ui.diagnostics().fit,null);ui.dispose();
});
test('clear wins over delayed file and failed refit clears old success',async()=>{
  const {$,ui,jobs}=harness();let finish;
  const pending=$('fit3d-file').listeners.change({target:{files:[{size:10,arrayBuffer:()=>new Promise(r=>finish=r)}],value:'file'}});
  $('fit3d-clear').listeners.click();finish(new TextEncoder().encode(oxygen3DExample()).buffer);await pending;assert.equal(ui.getState().dataset,null);
  await $('fit3d-example').listeners.click();jobs[0].resolve(fit);
  for (let i=0; i<100 && !ui.diagnostics().fit; i++) await new Promise(resolve => setTimeout(resolve, 1));
  assert.ok(ui.diagnostics().fit);
  assert.equal(ui.getMeasurementProvenance().fitRun.applied, false);
  $('fit3d-run').listeners.click();assert.equal(ui.diagnostics().fit,null);
  assert.equal(JSON.parse($('fit3d-provenance').textContent).fitRun, null);
  jobs[1].reject(Error('failed refit'));await Promise.resolve();assert.equal($('fit3d-apply').disabled,true);ui.dispose();
});

test('explicit fit application records the applied value without mutating the fit snapshot', async () => {
  const {$,ui,jobs}=harness();await $('fit3d-example').listeners.click();jobs[0].resolve(fit);
  for(let i=0;i<100&&!ui.diagnostics().fit;i++)await new Promise(resolve=>setTimeout(resolve,1));
  const before=ui.getMeasurementProvenance().fitRun;
  $('fit3d-apply').listeners.click();
  const after=ui.getMeasurementProvenance().fitRun;
  assert.equal(before.applied,false);assert.equal(after.applied,true);
  assert.equal(after.application.demand,fit.q);
  assert.equal(after.application.previousDemand,before.settingsSnapshot.demand);
  assert.equal(ui.getState().oxygen3d.parameterOrigin,'explicit-fit-application');
  ui.dispose();
});