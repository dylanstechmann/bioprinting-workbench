import test from 'node:test';
import assert from 'node:assert/strict';
import { FLOW_MODEL, createTeachingNetwork, solveFlowNetwork } from '../src/flow.js';
test('network series and parallel values satisfy conservation', () => {
  const network=createTeachingNetwork({enabled:true,pressureDrive:.6,branchResistances:[1,1,1]}), r=solveFlowNetwork(network);
  assert.equal(r.status,'solved'); assert.ok(r.maxInteriorResidual<1e-9 && r.globalBalanceError<1e-9);
  assert.ok(Math.abs(r.edgeFlows.find(e=>e.id==='feed').flow-.6/(2+1/3))<1e-9);
  assert.ok(Math.abs(r.edgeFlows.find(e=>e.id==='branch-0').flow-.6/7)<1e-9);
  network.edges[1].resistance=2;
  const unequal=solveFlowNetwork(network); assert.ok(Math.abs(unequal.edgeFlows[2].flow/unequal.edgeFlows[1].flow-2)<1e-9);
});
test('zero drive, reversal, fixed-only graphs and unanchored rejection', () => {
  const network=createTeachingNetwork({enabled:true,pressureDrive:0,branchResistances:[1,1,1]});
  assert.ok(solveFlowNetwork(network).edgeFlows.every(e=>e.flow===0));
  const fixed={model:FLOW_MODEL,nodes:[{id:'a',position:[0,0,0],boundaryPressure:0},{id:'b',position:[1,0,0],boundaryPressure:1}],edges:[{id:'e',from:'a',to:'b',resistance:2}]};
  assert.equal(solveFlowNetwork(fixed).edgeFlows[0].flow,-.5);
  delete fixed.nodes[0].boundaryPressure; delete fixed.nodes[1].boundaryPressure;
  assert.throws(()=>solveFlowNetwork(fixed),/Unanchored/);
  fixed.edges[0].resistance=0; assert.throws(()=>solveFlowNetwork(fixed));
});