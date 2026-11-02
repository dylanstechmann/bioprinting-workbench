import test from 'node:test';
import assert from 'node:assert/strict';
import { loadEquipmentAsset } from '../src/equipment.js';
function root(valid=true){const part={isMesh:true,name:valid?'Test_Glass':'Foreign',position:{toArray:()=>[0,0,0]},scale:{toArray:()=>[1,1,1]},quaternion:{toArray:()=>[0,0,0,1]},geometry:{computeBoundingBox(){},boundingBox:{min:{toArray:()=>[-1,-1,-1]},max:{toArray:()=>[1,1,1]}},dispose(){this.disposed=true;}},material:{dispose(){}}};return {part,traverse(fn){fn(part);}};}
test('late GLB honors reveal, hides fallback only after validation and disposes',async()=>{
  let resolve;const fallback=[{visible:true}],parent={add(){this.added=true;},remove(){this.removed=true;}},r=root();
  const handle=loadEquipmentAsset({spec:{url:'local',nodePrefix:'Test_',requiredNodes:['Test_Glass']},parent,fallback,load:()=>new Promise(r=>resolve=r)});
  handle.setReveal(true);await Promise.resolve();assert.equal(fallback[0].visible,true);resolve({scene:r});await handle.ready;
  assert.equal(handle.diagnostics().status,'loaded');assert.equal(r.part.visible,false);assert.equal(fallback[0].visible,false);
  handle.dispose();assert.equal(r.part.geometry.disposed,true);assert.equal(fallback[0].visible,true);
});
test('null/primitive assets never hide fallback and late completion disposes once',async()=>{
  for(const value of [null,1,{}, {scene:null},{scene:1}]){
    const fallback=[{visible:true}];const h=loadEquipmentAsset({spec:{url:'local',nodePrefix:'Test_',requiredNodes:['Test_Glass']},parent:{add(){throw Error('must not add');},remove(){}},fallback,load:async()=>value});
    await h.ready;assert.equal(h.diagnostics().status,'fallback');assert.equal(fallback[0].visible,true);h.dispose();h.dispose();
  }
  let finish;const r=root();let disposals=0;r.part.geometry.dispose=()=>disposals++;
  const h=loadEquipmentAsset({spec:{url:'local',nodePrefix:'Test_',requiredNodes:[]},parent:{add(){throw Error('late mount');},remove(){}},fallback:[],load:()=>new Promise(resolve=>finish=resolve)});
  await Promise.resolve();h.dispose();finish({scene:r});await h.ready;h.dispose();assert.equal(disposals,1);
});
test('request and invalid-asset failures retain procedural fallback',async()=>{
  for(const load of [()=>Promise.reject(Error('missing')),()=>Promise.resolve({scene:root(false)})]){
    const fallback=[{visible:true}],h=loadEquipmentAsset({spec:{nodePrefix:'Test_',requiredNodes:['Test_Glass']},parent:{add(){}},fallback,load});await h.ready;
    assert.equal(h.diagnostics().status,'fallback');assert.equal(fallback[0].visible,true);
  }
});