export function createAnalysisClient({ workerFactory = () => new Worker(new URL('./analysis-worker.js', import.meta.url), { type: 'module' }), timeoutMs = 30000 } = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) throw new RangeError('Invalid worker timeout');
  let worker, unavailable = null, serial = 0;
  const pending = new Map();
  function fail(error) { unavailable = error; for (const { reject, timer } of pending.values()) { clearTimeout(timer); reject(error); } pending.clear(); worker?.terminate(); worker = null; }
  try {
    worker = workerFactory();
    worker.onmessage = ({ data }) => {
      if (unavailable) return;
      if (!data || !Number.isSafeInteger(data.requestId) || !['oxygen-solve','oxygen-fit','oxygen-convergence'].includes(data.kind) || !['ok','error'].includes(data.status)) { fail(new Error('Malformed analysis worker reply')); return; }
      const job = pending.get(data.requestId);
      if (!job || data.kind !== job.kind) return;
      pending.delete(data.requestId); clearTimeout(job.timer);
      if (data.status === 'ok') job.resolve(data.result); else job.reject(new Error(data.error?.message || 'Analysis failed'));
    };
    worker.onerror = () => fail(new Error('3D worker unavailable; slab, flow and storyboard remain usable.'));
    worker.onmessageerror = worker.onerror;
  } catch { unavailable = new Error('3D worker could not start; other models remain usable.'); }
  function invalidate(kind) {
    for (const [id, job] of pending) if (!kind || job.kind === kind) { clearTimeout(job.timer); job.reject(new DOMException('Superseded analysis', 'AbortError')); pending.delete(id); }
  }
  return {
    request(kind, payload) {
      if (!['oxygen-solve','oxygen-fit','oxygen-convergence'].includes(kind)) return Promise.reject(new TypeError('Unsupported analysis kind'));
      if (unavailable) return Promise.reject(unavailable);
      invalidate(kind);
      return new Promise((resolve, reject) => {
        const requestId = ++serial;
        const timer = setTimeout(() => fail(new Error('3D analysis timed out')), timeoutMs);
        pending.set(requestId, { kind, resolve, reject, timer });
        try { worker.postMessage({ requestId, kind, payload }); } catch (error) { clearTimeout(timer); pending.delete(requestId); reject(error); }
      });
    }, invalidate,
    dispose() { invalidate(); worker?.terminate(); worker = null; unavailable = new Error('Analysis client disposed'); },
  };
}