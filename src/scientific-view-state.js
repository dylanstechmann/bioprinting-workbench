// Phase C presentation state: pure, validated, stored separately from scenario /13.
// Scale changes are discrete representational transitions — not a continuous physical zoom,
// not a biological model, and never a scenario time/control reset.
import { getOverlayDefinitions } from './scientific-overlays.js';

export const PRESENTATION_SCALES = Object.freeze(['laboratory', 'construct', 'cell', 'tissue-context']);
export const PRESENTATION_REPRESENTATIONS = Object.freeze(['illustration', 'model-field']);
export const PRESENTATION_MOTION = Object.freeze(['system', 'reduced']);
export const CUT_AXES = Object.freeze(['x', 'y', 'z']);
const OVERLAY_IDS = Object.freeze(getOverlayDefinitions().map(d => d.id));

export function defaultScientificViewState() {
  return { scale: 'laboratory', representation: 'illustration', quality: 'balanced', overlayIds: [], selectionId: null, cutPlane: null, motion: 'system' };
}

export function validateScientificViewState(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.getPrototypeOf(raw) !== Object.prototype) throw new TypeError('presentation state must be a plain object');
  const allowed = ['scale', 'representation', 'quality', 'overlayIds', 'selectionId', 'cutPlane', 'motion'];
  for (const key of Object.keys(raw)) if (!allowed.includes(key)) throw new TypeError(`presentation.${key} is unsupported`);
  if (!PRESENTATION_SCALES.includes(raw.scale)) throw new RangeError('Unknown presentation scale');
  if (!PRESENTATION_REPRESENTATIONS.includes(raw.representation)) throw new RangeError('Unknown representation');
  if (!['low', 'balanced', 'high'].includes(raw.quality)) throw new RangeError('Unknown quality');
  if (!PRESENTATION_MOTION.includes(raw.motion)) throw new RangeError('Unknown motion mode');
  if (!Array.isArray(raw.overlayIds) || raw.overlayIds.length > 4 || new Set(raw.overlayIds).size !== raw.overlayIds.length) throw new RangeError('overlayIds must be unique (max 4)');
  for (const id of raw.overlayIds) if (!OVERLAY_IDS.includes(id)) throw new RangeError(`Unknown overlay ${id}`);
  if (raw.selectionId !== null && (typeof raw.selectionId !== 'string' || !raw.selectionId.trim() || raw.selectionId.length > 64)) throw new TypeError('selectionId must be null or a bounded id');
  let cutPlane = null;
  if (raw.cutPlane !== null) {
    const plane = raw.cutPlane;
    if (!plane || typeof plane !== 'object' || Array.isArray(plane)) throw new TypeError('cutPlane must be an object');
    for (const key of Object.keys(plane)) if (!['axis', 'fraction'].includes(key)) throw new TypeError(`cutPlane.${key} is unsupported`);
    if (!CUT_AXES.includes(plane.axis)) throw new RangeError('cutPlane.axis unsupported');
    if (typeof plane.fraction !== 'number' || !Number.isFinite(plane.fraction) || plane.fraction < 0 || plane.fraction > 1) throw new RangeError('cutPlane.fraction must be in [0, 1]');
    cutPlane = { axis: plane.axis, fraction: plane.fraction };
  }
  return { scale: raw.scale, representation: raw.representation, quality: raw.quality, overlayIds: [...raw.overlayIds], selectionId: raw.selectionId, cutPlane, motion: raw.motion };
}

/** Pure reducer. Invalid events throw; valid transitions return a new state and never mutate. */
export function reduceScientificViewState(state, event) {
  const current = validateScientificViewState(state);
  if (!event || typeof event !== 'object' || Array.isArray(event)) throw new TypeError('event must be a record');
  switch (event.type) {
    case 'setScale': {
      if (!PRESENTATION_SCALES.includes(event.scale)) throw new RangeError('Unknown presentation scale');
      return validateScientificViewState({ ...current, scale: event.scale });
    }
    case 'setRepresentation': {
      if (!PRESENTATION_REPRESENTATIONS.includes(event.representation)) throw new RangeError('Unknown representation');
      return validateScientificViewState({ ...current, representation: event.representation });
    }
    case 'setQuality': {
      if (!['low', 'balanced', 'high'].includes(event.quality)) throw new RangeError('Unknown quality');
      return validateScientificViewState({ ...current, quality: event.quality });
    }
    case 'setMotion': {
      if (!PRESENTATION_MOTION.includes(event.motion)) throw new RangeError('Unknown motion mode');
      return validateScientificViewState({ ...current, motion: event.motion });
    }
    case 'toggleOverlay': {
      if (!OVERLAY_IDS.includes(event.id)) throw new RangeError(`Unknown overlay ${String(event.id)}`);
      const has = current.overlayIds.includes(event.id);
      const overlayIds = has ? current.overlayIds.filter(id => id !== event.id) : [...current.overlayIds, event.id];
      return validateScientificViewState({ ...current, overlayIds });
    }
    case 'select': {
      return validateScientificViewState({ ...current, selectionId: event.id === null ? null : String(event.id) });
    }
    case 'setCutPlane': {
      return validateScientificViewState({ ...current, cutPlane: event.plane === null ? null : event.plane });
    }
    case 'reset': {
      return defaultScientificViewState();
    }
    default:
      throw new RangeError(`Unknown presentation event: ${String(event.type)}`);
  }
}
