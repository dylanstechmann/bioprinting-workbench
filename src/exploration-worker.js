// Dedicated sweep worker: the existing analysis-worker protocol (oxygen-solve/oxygen-fit)
// stays untouched. Sweep envelopes are validated here again — never trust the caller thread.
import { runParameterSweep, validateSweepSpec } from './model-exploration.js';
import { evaluateDomainModel } from './model-adapters.js';

globalThis.onmessage = ({ data }) => {
  const requestId = Number.isSafeInteger(data?.requestId) ? data.requestId : null;
  const kind = typeof data?.kind === 'string' ? data.kind : null;
  try {
    if (!Number.isSafeInteger(requestId) || requestId < 1 || kind !== 'sweep-run') throw new TypeError('Invalid exploration worker request');
    const spec = validateSweepSpec(data.spec);
    const controller = new AbortController();
    runParameterSweep(spec, {
      evaluate: inputs => evaluateDomainModel(spec.modelId, inputs),
      signal: controller.signal,
      onProgress: progress => globalThis.postMessage({ requestId, kind: 'sweep-progress', progress }),
    }).then(result => {
      globalThis.postMessage({ requestId, kind: 'sweep-run', status: 'ok', result });
    }, error => {
      globalThis.postMessage({ requestId, kind: 'sweep-run', status: 'error', error: { name: error.name, message: error.message } });
    });
  } catch (error) {
    globalThis.postMessage({ requestId, kind: 'sweep-run', status: 'error', error: { name: error.name, message: error.message } });
  }
};
