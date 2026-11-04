import { createAnalysisClient } from './analysis-client.js';
import { serializeStudyArtifact } from './convergence-study.js';

/** A dedicated client per study lets cancellation terminate CPU work without
 * disturbing the separate fit/solve worker. No study changes model settings. Completed
 * studies are retained as bounded, downloadable StudyArtifact records; cancelled or stale
 * completions never enter history. */
export function createConvergenceStudyUI({ elements: $, getSettings, clientFactory = createAnalysisClient, onRun = () => {} }) {
  let client = null, generation = 0, disposed = false, lastResult = null, studyCounter = 0;
  const MAX_STUDY_HISTORY = 20;
  const history = [];
  const downloadUrls = [];
  const runButton = $('convergence-run'), cancelButton = $('convergence-cancel');
  const status = $('convergence-status'), output = $('convergence-results');
  function renderHistory() {
    const select = $('convergence-history');
    select.replaceChildren(...history.map(entry => {
      const option = document.createElement('option');
      option.value = entry.id;
      option.textContent = `${entry.id} · ${entry.artifact.createdAt} · ${entry.artifact.status}`;
      return option;
    }));
    if (history.length) select.value = history[history.length - 1].id;
  }
  function stop(message) {
    generation++;
    client?.dispose();
    client = null;
    runButton.disabled = false;
    cancelButton.disabled = true;
    if (message) status.textContent = message;
  }
  async function run() {
    if (disposed) return;
    stop();
    const operation = generation;
    lastResult = null;
    output.replaceChildren();
    runButton.disabled = true;
    cancelButton.disabled = false;
    status.textContent = 'Running grids 9, 17 and 33 in a dedicated worker…';
    try {
      client = clientFactory();
      const result = await client.request('oxygen-convergence', {
        modelId: 'box-oxygen', settings: getSettings(), resolutions: [9, 17, 33],
      });
      if (disposed || operation !== generation) return;
      lastResult = structuredClone(result);
      studyCounter++;
      const artifact = serializeStudyArtifact(result, { createdAt: new Date().toISOString() });
      history.push({ id: `study ${studyCounter}`, artifact });
      while (history.length > MAX_STUDY_HISTORY) history.shift();
      renderHistory();
      for (const sample of result.samples) {
        const row = document.createElement('tr');
        for (const value of [sample.resolution, sample.center, sample.residualInfinity,
          sample.balanceError, sample.errorInfinity ?? 'No analytic reference', sample.converged ? 'yes' : 'no']) {
          const cell = document.createElement('td');
          cell.textContent = String(value);
          row.append(cell);
        }
        output.append(row);
      }
      status.textContent = `${result.status}. ${result.notices.join(' ')} ${result.comparisons.map(c =>
        `${c.coarse}→${c.fine}: center difference ${c.centerDelta}; observed order ${c.observedOrder ?? 'undefined'}`).join(' · ')}`;
      onRun(structuredClone(result));
    } catch (error) {
      if (!disposed && operation === generation) status.textContent = error.message;
    } finally {
      if (!disposed && operation === generation) stop();
    }
  }
  const cancel = () => stop('Study cancelled. Its worker was terminated; no result was applied.');
  const download = () => {
    if (disposed) return;
    const selected = history.find(entry => entry.id === $('convergence-history').value) ?? history[history.length - 1];
    if (!selected) { status.textContent = 'No completed study to download yet.'; return; }
    const text = `${JSON.stringify(selected.artifact, null, 2)}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    downloadUrls.push(url);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `convergence-study-${selected.id.replace(/\s+/g, '-')}.json`;
    anchor.textContent = `Download ${anchor.download}`;
    anchor.click();
    status.textContent = `${anchor.download} prepared as an explicit local download; nothing is uploaded.`;
  };
  runButton.addEventListener('click', run);
  cancelButton.addEventListener('click', cancel);
  $('convergence-download').addEventListener('click', download);
  renderHistory();
  return {
    getLastResult: () => structuredClone(lastResult),
    getHistory: () => history.map(entry => structuredClone(entry)),
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      for (const url of downloadUrls) URL.revokeObjectURL(url);
      downloadUrls.length = 0;
      history.length = 0;
      runButton.removeEventListener('click', run);
      cancelButton.removeEventListener('click', cancel);
      $('convergence-download').removeEventListener('click', download);
    },
  };
}