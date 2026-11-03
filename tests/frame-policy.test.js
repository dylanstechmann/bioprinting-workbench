import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldAdvanceFrame, shouldDrawFrame } from '../src/frame-policy.js';

test('frame advance requires active playback on a visible document', () => {
  assert.equal(shouldAdvanceFrame({ playing: true, documentHidden: false }), true);
  assert.equal(shouldAdvanceFrame({ playing: true, documentHidden: true }), false);
  assert.equal(shouldAdvanceFrame({ playing: false, documentHidden: false }), false);
  assert.equal(shouldAdvanceFrame({ playing: false, documentHidden: true }), false);
  for (const bad of [undefined, null, 1, 'yes', {}]) {
    assert.throws(() => shouldAdvanceFrame({ playing: bad, documentHidden: false }), TypeError);
    assert.throws(() => shouldAdvanceFrame({ playing: true, documentHidden: bad }), TypeError);
  }
});

test('drawing requires Studio, a visible document and a live renderer', () => {
  assert.equal(shouldDrawFrame({ documentHidden: false, activeArea: 'studio', webglAvailable: true }), true);
  assert.equal(shouldDrawFrame({ documentHidden: false, activeArea: 'studio' }), true);
  assert.equal(shouldDrawFrame({ documentHidden: false, activeArea: 'models' }), false);
  assert.equal(shouldDrawFrame({ documentHidden: false, activeArea: 'research' }), false);
  assert.equal(shouldDrawFrame({ documentHidden: false, activeArea: 'evidence' }), false);
  assert.equal(shouldDrawFrame({ documentHidden: true, activeArea: 'studio' }), false);
  assert.equal(shouldDrawFrame({ documentHidden: false, activeArea: 'studio', webglAvailable: false }), false);
  for (const bad of [undefined, null, 3, 'lobby', []]) assert.throws(() => shouldDrawFrame({ documentHidden: false, activeArea: bad }), RangeError);
  for (const bad of [undefined, null, 0, 'no']) assert.throws(() => shouldDrawFrame({ documentHidden: bad, activeArea: 'studio' }), TypeError);
  assert.throws(() => shouldDrawFrame({ documentHidden: false, activeArea: 'studio', webglAvailable: 'maybe' }), TypeError);
});