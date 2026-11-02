import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnalysisClient } from '../src/analysis-client.js';
test('worker requests independently supersede stale jobs and dispose safely',async()=>{
  const sent=[],worker={postMessage:m=>sent.push(m),terminate(){this.terminated=true;}};
  const client=createAnalysisClient({workerFactory:()=>worker});
  const first=client.request('oxygen-solve',{});const rejected=assert.rejects(first,{name:'AbortError'});
  const second=client.request('oxygen-solve',{});const fit=client.request('oxygen-fit',{});
  worker.onmessage({data:{...sent[0],status:'ok',result:'stale'}});
  worker.onmessage({data:{...sent[1],status:'ok',result:'fresh'}});
  worker.onmessage({data:{...sent[2],status:'ok',result:'fit'}});
  await rejected;assert.equal(await second,'fresh');assert.equal(await fit,'fit');
  client.dispose();assert.equal(worker.terminated,true);await assert.rejects(client.request('oxygen-solve',{}));
});
test('worker creation failure is explicit',async()=>{
  const c=createAnalysisClient({workerFactory:()=>{throw Error('blocked');}});await assert.rejects(c.request('oxygen-solve',{}),/could not start/);c.dispose();
});
test('malformed replies fail pending work without throwing in the message handler',async()=>{
  const worker={postMessage(){},terminate(){this.terminated=true;}};
  const c=createAnalysisClient({workerFactory:()=>worker});
  const p=assert.rejects(c.request('oxygen-solve',{}),/Malformed/);
  assert.doesNotThrow(()=>worker.onmessage({data:null}));
  await p;assert.equal(worker.terminated,true);c.dispose();c.dispose();
});
test('worker faults and timeout reject all pending work',async()=>{
  for(const mode of ['onerror','onmessageerror','timeout']){
    const worker={postMessage(){},terminate(){this.terminated=true;}};
    const c=createAnalysisClient({workerFactory:()=>worker,timeoutMs:5});
    const a=assert.rejects(c.request('oxygen-solve',{}));
    const b=assert.rejects(c.request('oxygen-fit',{}));
    if(mode!=='timeout')worker[mode]();
    await Promise.all([a,b]);assert.equal(worker.terminated,true);c.dispose();
  }
});
test('postMessage exceptions reject only that request and unsupported kinds reject',async()=>{
  const worker={postMessage(){throw Error('clone failed');},terminate(){}};
  const c=createAnalysisClient({workerFactory:()=>worker});
  await assert.rejects(c.request('oxygen-solve',{}),/clone failed/);
  await assert.rejects(c.request('unknown',{}),/kind/);c.dispose();
});