// Phase D exploration controls: explicit run/cancel over the worker-backed client. The last
// valid result is stored separately from pending work; sweep points never write into scenario
// controls and nothing is auto-applied anywhere.
import { validateSweepSpec } from './model-exploration.js';
import { getDomainModel } from './domain-models.js';

function row(cells) {
  const tr = document.createElement('tr');
  for (const cell of cells) {
    const td = document.createElement('td');
    td.textContent = String(cell);
    tr.append(td);
  }
  return tr;
}

export function createModelExplorationUI({ elements: $, client, getInputs, onRun = () => {} }) {
  let lastResult = null, runToken = 0, disposed = false;
  const listeners = [];
  const on = (target, name, fn) => { target.addEventListener(name, fn); listeners.push([target, name, fn]); };

  function status(text) { $('sweep-status').textContent = text; }
  function renderResult(result) {
    const tbody = $('sweep-results');
    tbody.replaceChildren();
    for (const point of result.points) {
      const summary = point.run
        ? Object.entries(point.run.quantities).slice(0, 3).map(([path, q]) => `${path}=${q.value === null ? 'null' : q.value.toPrecision(4)}`).join(' ')
        : point.error;
      tbody.append(row([point.index, JSON.stringify(point.values), point.status, summary]));
    }
    $('sweep-summary').textContent = result.summary
      ? `${result.summary.notice} Ranges reported for ${result.summary.ranges.length} outputs; ${result.summary.sensitivities.length} finite-difference slopes.`
      : '';
  }

  on($('sweep-run'), 'click', async () => {
    const token = ++runToken;
    try {
      const { modelId, baseInputs } = getInputs();
      const definition = getDomainModel(modelId);
      const axisPath = $('sweep-axis').value;
      const values = $('sweep-values').value.split(',').map(v => Number(v.trim()));
      const spec = validateSweepSpec({ modelId, baseInputs, axes: [{ path: axisPath, values }], seed: 1 });
      $('sweep-run').disabled = true;
      $('sweep-cancel').disabled = false;
      status(`Sweeping ${definition.id} in a worker… 0/${spec.axes[0].values.length}`);
      const result = await client.run(spec, {
        onProgress: progress => { if (!disposed && token === runToken) status(`Sweeping ${definition.id} in a worker… ${progress.completed}/${progress.total} (${progress.failed} failed)`); },
      });
      if (disposed || token !== runToken) return;
      lastResult = result;
      status(`Sweep ${result.status}: ${result.points.length} points, ${result.points.filter(p => p.status !== 'succeeded').length} not succeeded.`);
      renderResult(result);
      onRun(result);
    } catch (error) {
      if (!disposed && token === runToken) status(error.name === 'AbortError' ? 'Sweep cancelled. No scenario values were changed.' : error.message);
    } finally {
      if (!disposed && token === runToken) {
        $('sweep-run').disabled = false;
        $('sweep-cancel').disabled = true;
      }
    }
  });
  on($('sweep-cancel'), 'click', () => {
    runToken++;
    client.cancel();
    status('Sweep cancelled. No scenario values were changed.');
    $('sweep-run').disabled = false;
    $('sweep-cancel').disabled = true;
  });
  $('sweep-cancel').disabled = true;
  return {
    getLastResult: () => lastResult,
    dispose() {
      disposed = true;
      runToken++;
      for (const [target, name, fn] of listeners) target.removeEventListener(name, fn);
      listeners.length = 0;
    },
  };
}
