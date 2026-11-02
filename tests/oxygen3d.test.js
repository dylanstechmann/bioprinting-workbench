import test from 'node:test';
import assert from 'node:assert/strict';
import { OXYGEN_DEFAULTS, buildBoxOperator, solveOxygenBasis, solveOxygen3D, extractOxygenSlice, sampleOxygenBasis } from '../src/oxygen3d.js';
import { solvePCG } from '../src/numerics.js';
import { oxygen3DExample, parseOxygen3DMeasurements, fitOxygen3DDemand } from '../src/calibration3d.js';

test('PCG verifies true residual and reports exhaustion/breakdown', () => {
  const op = { diagonal: new Float64Array([2, 3]), rhs: new Float64Array([1, 2]), apply(x, y) { y[0] = 2*x[0] - x[1]; y[1] = 3*x[1] - x[0]; } };
  assert.equal(solvePCG(op).converged, true);
  assert.equal(solvePCG({ ...op, maxIterations: 1 }).converged, false);
  assert.equal(solvePCG({ ...op, rhs: new Float64Array(2) }).iterations, 0);
  assert.throws(() => solvePCG({ ...op, diagonal: [0, 1] }));
  assert.equal(solvePCG({ ...op, apply(x, y) { y[0] = -x[0]; y[1] = -x[1]; } }).reason, 'breakdown');
});
test('3D all-face box is symmetric, bounded and conserves boundary flux', () => {
  const settings = { ...OXYGEN_DEFAULTS, resolution: 9 }, basis = solveOxygenBasis(settings), r = solveOxygen3D(settings, basis);
  assert.ok(r.converged && r.inDomain); assert.ok(r.balanceError < 1e-8);
  assert.ok(r.residualInfinity < 1e-8);
  for (let i=0;i<r.values.length;i++) assert.ok(Math.abs(r.values[i]-r.values.at(-i-1))<1e-10);
  assert.ok(solveOxygen3D({ ...settings, demand: 0 }, basis).values.every(c => c === 1));
  assert.equal(extractOxygenSlice(r, 'z', 4).values.length, 81);
  assert.throws(() => extractOxygenSlice(r, 'z', 9));
  assert.equal(sampleOxygenBasis(basis, [-1,0,0]), 0);
});
test('slab-x and manufactured all-face solutions converge at second order', () => {
  const errors = [], manufactured = [];
  for (const resolution of [9,17,33]) {
    const s = { ...OXYGEN_DEFAULTS, resolution, boundaryMode: 'slab-x' }, r = solveOxygen3D(s), h=2/resolution;
    let error=0;
    for(let i=0;i<resolution;i++) { const x=-1+(i+.5)*h; error=Math.max(error,Math.abs(r.values[i]-(1-(1-x*x)/2))); }
    errors.push(error);
    const op=buildBoxOperator({...s,boundaryMode:'all-faces'}), exact = new Float64Array(resolution**3), rhs=new Float64Array(exact.length);
    for(let k=0;k<resolution;k++)for(let j=0;j<resolution;j++)for(let i=0;i<resolution;i++) {
      const idx=i+resolution*(j+resolution*k), [x,y,z]=[i,j,k].map(t=>-1+(t+.5)*h);
      exact[idx]=Math.cos(Math.PI*x/2)*Math.cos(Math.PI*y/2)*Math.cos(Math.PI*z/2); rhs[idx]=3*Math.PI**2/4*exact[idx];
    }
    const solved=solvePCG({...op,rhs}); assert.ok(solved.converged);
    manufactured.push(Math.max(...solved.values.map((v,i)=>Math.abs(v-exact[i]))));
  }
  for(const list of [errors,manufactured]) for(let i=1;i<list.length;i++) assert.ok(list[i-1]/list[i]>3, `refinement ${list}`);
  console.log('Refinement errors slab/manufactured:',errors,manufactured);
});
test('3D fitting recovers exact data, exposes unidentifiable and incompatible data', () => {
  const input=parseOxygen3DMeasurements(oxygen3DExample()), basis=solveOxygenBasis({...OXYGEN_DEFAULTS,boundaryMode:'slab-x'});
  input.measurements.forEach(m=>{ m.concentration=1-1.2*sampleOxygenBasis(basis,m.position); });
  const fit=fitOxygen3DDemand(input,basis); assert.ok(Math.abs(fit.q-1.2)<1e-8); assert.ok(fit.residualRMSE<1e-10);
  input.measurements.forEach(m=>{m.position=[-1,0,0];m.concentration=1;});
  assert.equal(fitOxygen3DDemand(input,basis).identifiable,false);
  input.measurements=[{id:'incompatible',position:[0,0,0],concentration:1.2,boundary:1}];
  assert.equal(fitOxygen3DDemand(input,basis).inDomain,false);
  assert.throws(()=>fitOxygen3DDemand(input,solveOxygenBasis(OXYGEN_DEFAULTS)));
});