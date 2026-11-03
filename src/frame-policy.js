import { WORKSPACE_AREAS } from './workspace-shell.js';

function booleanField(value, name) {
  if (typeof value !== 'boolean') throw new TypeError(`${name} must be a boolean`);
  return value;
}

/** Pure per-frame policy: advance the storyboard clock only while playing on a visible document. */
export function shouldAdvanceFrame({ playing, documentHidden } = {}) {
  booleanField(playing, 'playing');
  booleanField(documentHidden, 'documentHidden');
  return playing && !documentHidden;
}

/** Pure per-frame policy: WebGL work runs only in Studio on a visible document with a live renderer. */
export function shouldDrawFrame({ documentHidden, activeArea, webglAvailable = true } = {}) {
  booleanField(documentHidden, 'documentHidden');
  booleanField(webglAvailable, 'webglAvailable');
  if (!WORKSPACE_AREAS.includes(activeArea)) throw new RangeError('Unknown workspace area');
  return !documentHidden && activeArea === 'studio' && webglAvailable;
}