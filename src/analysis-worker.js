import { solveOxygenBasis, solveOxygen3D, validateOxygen3DSettings } from './oxygen3d.js';
import { fitOxygen3DDemand } from './calibration3d.js';
const cache = new Map();
globalThis.onmessage = ({ data }) => {
  const requestId = Number.isSafeInteger(data?.requestId) ? data.requestId : null;
  const kind = typeof data?.kind === 'string' ? data.kind : null;
  try {
    if (!Number.isSafeInteger(requestId) || requestId < 1 || !['oxygen-solve', 'oxygen-fit'].includes(kind)) throw new TypeError('Invalid worker request');
    const payload = data.payload;
    const settings = validateOxygen3DSettings(payload?.settings), key = `${settings.resolution}:${settings.boundaryMode}`;
    if (!cache.has(key)) { if (cache.size >= 3) cache.delete(cache.keys().next().value); cache.set(key, solveOxygenBasis(settings)); }
    const basis = cache.get(key), result = kind === 'oxygen-solve' ? solveOxygen3D(settings, basis) : fitOxygen3DDemand(payload.input, basis);
    // Structured clone preserves cache ownership; do not transfer cached arrays.
    globalThis.postMessage({ requestId, kind, status: 'ok', result });
  } catch (error) { globalThis.postMessage({ requestId, kind, status: 'error', error: { name: error.name, message: error.message } }); }
};