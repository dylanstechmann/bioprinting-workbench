// Sweep client: one sweep at a time, explicit cancel that terminates the worker, bounded
// timeout, and generation tagging so a stale worker reply can never publish progress or
// results after cancel/replace.
export function createExplorationClient({ workerFactory = () => new Worker(new URL('./exploration-worker.js', import.meta.url), { type: 'module' }), timeoutMs = 30000 } = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) throw new RangeError('Invalid exploration timeout');
  let worker = null, unavailable = null, serial = 0, generation = 0;
  let pending = null; // {requestId, kind, resolve, reject, timer, generation}

  function ensureWorker() {
    if (worker || unavailable) return worker;
    try {
      worker = workerFactory();
      worker.onmessage = ({ data }) => {
        if (!pending || !data || data.requestId !== pending.requestId) return;
        if (data.kind === 'sweep-progress' && pending.generation === generation) {
          pending.onProgress?.(data.progress);
          return;
        }
        if (data.kind !== 'sweep-run') return;
        if (pending.generation !== generation) return;
        const job = pending;
        pending = null;
        clearTimeout(job.timer);
        if (data.status === 'ok') job.resolve(data.result);
        else job.reject(new Error(data.error?.message || 'Sweep failed'));
      };
      const fail = error => {
        unavailable = error;
        if (pending && pending.generation === generation) {
          const job = pending;
          pending = null;
          clearTimeout(job.timer);
          job.reject(error);
        }
        worker?.terminate();
        worker = null;
      };
      worker.onerror = () => fail(new Error('Exploration worker unavailable; the interactive models remain usable.'));
      worker.onmessageerror = () => fail(new Error('Exploration worker sent a malformed reply.'));
    } catch {
      unavailable = new Error('Exploration worker could not start; the interactive models remain usable.');
    }
    return worker;
  }

  const api = {
    run(spec, { onProgress } = {}) {
      if (unavailable) return Promise.reject(unavailable);
      if (pending) return Promise.reject(new Error('A sweep is already running; cancel it first.'));
      const handle = ensureWorker();
      if (!handle || unavailable) return Promise.reject(unavailable || new Error('Exploration worker unavailable.'));
      generation++;
      const currentGeneration = generation;
      return new Promise((resolve, reject) => {
        const requestId = ++serial;
        const timer = setTimeout(() => {
          if (pending && pending.generation === currentGeneration) {
            const job = pending;
            pending = null;
            api.cancel();
            job.reject(new Error('Sweep timed out'));
          }
        }, timeoutMs);
        pending = { requestId, kind: 'sweep-run', resolve, reject, timer, generation: currentGeneration, onProgress };
        try {
          handle.postMessage({ requestId, kind: 'sweep-run', spec });
        } catch (error) {
          clearTimeout(timer);
          pending = null;
          reject(error);
        }
      });
    },
    cancel() {
      generation++;
      if (pending) {
        const job = pending;
        pending = null;
        clearTimeout(job.timer);
        job.reject(new DOMException('Sweep cancelled', 'AbortError'));
      }
      worker?.terminate();
      worker = null;
    },
    dispose() {
      api.cancel();
      unavailable = new Error('Exploration client disposed');
    },
  };
  return api;
}
