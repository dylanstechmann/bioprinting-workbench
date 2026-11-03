import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultScientificViewState, validateScientificViewState, reduceScientificViewState,
  PRESENTATION_SCALES,
} from '../src/scientific-view-state.js';

test('default presentation state matches the documented defaults', () => {
  assert.deepEqual(defaultScientificViewState(), {
    scale: 'laboratory', representation: 'illustration', quality: 'balanced',
    overlayIds: [], selectionId: null, cutPlane: null, motion: 'system',
  });
});

test('validation rejects unknown scales, representations, qualities and motion modes', () => {
  const base = defaultScientificViewState();
  assert.throws(() => validateScientificViewState({ ...base, scale: 'organ' }), RangeError);
  assert.throws(() => validateScientificViewState({ ...base, representation: 'physical-zoom' }), RangeError);
  assert.throws(() => validateScientificViewState({ ...base, quality: 'ultra' }), RangeError);
  assert.throws(() => validateScientificViewState({ ...base, motion: 'hyper' }), RangeError);
  assert.throws(() => validateScientificViewState({ ...base, extra: 1 }), TypeError);
  assert.throws(() => validateScientificViewState({ ...base, scale: 5 }), RangeError);
});

test('overlay ids are registry-bound, unique and capped at four', () => {
  const base = defaultScientificViewState();
  assert.throws(() => validateScientificViewState({ ...base, overlayIds: ['ghost-overlay'] }), RangeError);
  assert.throws(() => validateScientificViewState({ ...base, overlayIds: ['box-oxygen-slice', 'box-oxygen-slice'] }), RangeError);
  assert.throws(() => validateScientificViewState({ ...base, overlayIds: ['box-oxygen-slice', 'slab-profile', 'flow-network', 'nozzle-shear-reference', 'vascular-supply-reference'] }), RangeError);
  assert.deepEqual(validateScientificViewState({ ...base, overlayIds: ['box-oxygen-slice'] }).overlayIds, ['box-oxygen-slice']);
});

test('selection and cut planes are strictly validated', () => {
  const base = defaultScientificViewState();
  assert.throws(() => validateScientificViewState({ ...base, selectionId: '' }), TypeError);
  assert.throws(() => validateScientificViewState({ ...base, selectionId: 'x'.repeat(65) }), TypeError);
  assert.throws(() => validateScientificViewState({ ...base, cutPlane: { axis: 'w', fraction: 0.5 } }), RangeError);
  assert.throws(() => validateScientificViewState({ ...base, cutPlane: { axis: 'x', fraction: 1.5 } }), RangeError);
  assert.throws(() => validateScientificViewState({ ...base, cutPlane: { axis: 'x', fraction: 0.5, side: 'left' } }), TypeError);
  const ok = validateScientificViewState({ ...base, selectionId: 'scaffold', cutPlane: { axis: 'z', fraction: 0.25 } });
  assert.equal(ok.cutPlane.axis, 'z');
  assert.equal(ok.selectionId, 'scaffold');
});

test('the reducer is pure and enforces discrete transitions', () => {
  const start = defaultScientificViewState();
  const frozen = Object.freeze({ ...start });
  const scaled = reduceScientificViewState(frozen, { type: 'setScale', scale: 'cell' });
  assert.equal(scaled.scale, 'cell');
  assert.equal(frozen.scale, 'laboratory');
  const overlaid = reduceScientificViewState(scaled, { type: 'toggleOverlay', id: 'box-oxygen-slice' });
  assert.deepEqual(overlaid.overlayIds, ['box-oxygen-slice']);
  const toggledOff = reduceScientificViewState(overlaid, { type: 'toggleOverlay', id: 'box-oxygen-slice' });
  assert.deepEqual(toggledOff.overlayIds, []);
  assert.deepEqual(reduceScientificViewState(scaled, { type: 'select', id: 'printer' }).selectionId, 'printer');
  assert.deepEqual(reduceScientificViewState(scaled, { type: 'setCutPlane', plane: { axis: 'x', fraction: 0.5 } }).cutPlane, { axis: 'x', fraction: 0.5 });
  assert.deepEqual(reduceScientificViewState(overlaid, { type: 'reset' }), defaultScientificViewState());
});

test('the reducer rejects unknown events and invalid payloads', () => {
  const start = defaultScientificViewState();
  assert.throws(() => reduceScientificViewState(start, { type: 'explode' }), RangeError);
  assert.throws(() => reduceScientificViewState(start, { type: 'setScale', scale: 'organ' }), RangeError);
  assert.throws(() => reduceScientificViewState(start, { type: 'toggleOverlay', id: 'ghost' }), RangeError);
  assert.throws(() => reduceScientificViewState(start, { type: 'setQuality', quality: 'ultra' }), RangeError);
  assert.throws(() => reduceScientificViewState(start, { type: 'setMotion', motion: 'hyper' }), RangeError);
  assert.throws(() => reduceScientificViewState(start, 'setScale'), TypeError);
  for (const scale of PRESENTATION_SCALES) assert.equal(reduceScientificViewState(start, { type: 'setScale', scale }).scale, scale);
});
