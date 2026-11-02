import test from 'node:test';
import assert from 'node:assert/strict';
import { getScaffoldMethods, validateScaffoldMethods, evaluateScaffoldMethods, SCAFFOLD_MATURITIES } from '../src/scaffold-methods.js';

test('scaffold methods cover all three maturity tiers with resolving anchors', () => {
  const methods = getScaffoldMethods();
  assert.equal(methods.length, 9);
  validateScaffoldMethods(methods);
  for (const maturity of SCAFFOLD_MATURITIES) assert.ok(methods.some(m => m.maturity === maturity));
  assert.ok(methods.some(m => m.id === 'extrusion-multimaterial' && m.maturity === 'established'));
  assert.ok(methods.some(m => m.id === 'four-d-shape-morphing' && m.maturity === 'theoretical'));
  for (const m of methods) {
    assert.ok(m.anchorClaimIds.length >= 1);
    assert.ok(m.whatItDoes.length > 60);
    assert.ok(m.limits.length > 60);
  }
  for (const mutate of [
    ms => { ms[0].maturity = 'proven'; },
    ms => { ms[0].anchorClaimIds = []; },
    ms => { ms[0].anchorClaimIds.push('fake-claim'); },
    ms => { ms[0].id = ms[1].id; },
    ms => { ms[0].extra = 1; },
    ms => { ms[0].whatItDoes = ' '; },
    ms => { return ms.filter(m => m.maturity !== 'theoretical'); },
    ms => { return ms.filter(m => m.maturity !== 'experimental'); },
  ]) { const raw = structuredClone(methods); const mutated = mutate(raw); if (Array.isArray(mutated)) assert.throws(() => validateScaffoldMethods(mutated)); else assert.throws(() => validateScaffoldMethods(raw)); }
});

test('scaffold methods evaluation reports tiers without upgrading any method', () => {
  const r = evaluateScaffoldMethods();
  assert.equal(r.status, 'reference');
  assert.equal(r.methodCount, 9);
  assert.deepEqual(r.maturityCounts, { established: 4, experimental: 4, theoretical: 1 });
  assert.ok(r.summary.includes('never clinical readiness'));
  assert.ok(r.notices.some(n => n.includes('no method here has produced a reviewed human transplanted tissue')));
});
