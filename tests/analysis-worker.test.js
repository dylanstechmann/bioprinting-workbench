import test from 'node:test';
import assert from 'node:assert/strict';
test('worker rejects malformed envelopes without secondary errors',async()=>{
  const previous={onmessage:globalThis.onmessage,postMessage:globalThis.postMessage},messages=[];
  globalThis.postMessage=m=>messages.push(m);
  try{
    await import('../src/analysis-worker.js');
    for(const data of [null,1,{}, {requestId:1,kind:'unknown'}, {requestId:2,kind:'oxygen-solve',payload:null}])assert.doesNotThrow(()=>globalThis.onmessage({data}));
    assert.equal(messages.length,5);assert.ok(messages.every(m=>m.status==='error'));
    assert.equal(messages[0].requestId,null);
  }finally{Object.assign(globalThis,previous);}
});