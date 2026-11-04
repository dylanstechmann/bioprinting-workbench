// Phase D exploration controls: explicit run/cancel over the worker-backed client. The last
// valid result is stored separately from pending work; sweep points never write into scenario
// controls and nothing is auto-applied anywhere. The model selector lists every registered
// model advertising sweep support with its own registered numeric axes (1-2 axes, never
// invented); retained results compare side by side through the bounded same-unit comparison.
import { validateSweepSpec, compareSweepRuns } from './model-exploration.js';
import { getDomainModel, getDomainModels } from './domain-models.js';

function row(cells) {
  const tr = document.createElement('tr');
  for (const cell of cells) {
    const td = document.createElement('td');
    td.textContent = String(cell);
    tr.append(td);
  }
  return tr;
}

function option(value, label) {
  const el = document.createElement('option');
  el.value = value;
  el.textContent = label;
  return el;
}

function numericAxes(definition) {
  return Object.entries(definition.inputDefinitions)
    .filter(([, def]) => def.type === 'number' || def.type === 'integer')
    .map(([path, def]) => ({ path, def }));
}

export function createModelExplorationUI({ elements: $, client, getInputs, onRun = () => {} }) {
  let lastResult = null, runToken = 0, disposed = false, runCounter = 0;
  const MAX_RETAINED_RUNS = 4;
  const completedRuns = []; // bounded retained results for side-by-side comparison
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
  function renderCompareSelectors() {
    for (const id of ['sweep-compare-a', 'sweep-compare-b']) {
      $(id).replaceChildren(...completedRuns.map(run => option(run.id, run.id)));
    }
    if (completedRuns.length >= 2) {
      $('sweep-compare-a').value = completedRuns[completedRuns.length - 2].id;
      $('sweep-compare-b').value = completedRuns[completedRuns.length - 1].id;
    }
  }
  function populateModels() {
    const select = $('sweep-model');
    select.replaceChildren();
    for (const definition of getDomainModels()) {
      if (!definition.supportedOperations.includes('sweep')) continue;
      select.append(option(definition.id, `${definition.id} · ${definition.label}`));
    }
    if (!select.value) select.value = select.children[0]?.value ?? '';
  }
  function populateAxes({ reset = false } = {}) {
    const definition = getDomainModel($('sweep-model').value);
    const axes = numericAxes(definition);
    const axis1 = $('sweep-axis'), axis2 = $('sweep-axis2');
    if (reset) axis1.value = '';
    axis1.replaceChildren(...axes.map(({ path, def }) => option(path, `${path} (${def.unit ?? 'no unit'})`)));
    if (!axis1.value) axis1.value = axes[0]?.path ?? '';
    if (reset) axis2.value = '';
    axis2.replaceChildren(option('', 'none (single axis)'), ...axes.filter(({ path }) => path !== axis1.value).map(({ path }) => option(path, path)));
    if (axis2.value === axis1.value) axis2.value = '';
    if (!axes.length) status(`${$('sweep-model').value} has no registered numeric axes; sweeps are unavailable for it.`);
  }

  on($('sweep-model'), 'change', () => {
    try {
      const definition = getDomainModel($('sweep-model').value);
      populateAxes({ reset: true });
      if (numericAxes(definition).length) status(`Model ${$('sweep-model').value} selected. Choose registered axes and explicit values.`);
    } catch (error) {
      status(error.message);
    }
  });

  on($('sweep-run'), 'click', async () => {
    const token = ++runToken;
    try {
      const { modelId, baseInputs } = getInputs();
      const definition = getDomainModel(modelId);
      const parseValues = raw => raw.split(',').map(v => Number(v.trim()));
      const axes = [{ path: $('sweep-axis').value, values: parseValues($('sweep-values').value) }];
      if ($('sweep-axis2').value) axes.push({ path: $('sweep-axis2').value, values: parseValues($('sweep-values2').value) });
      const spec = validateSweepSpec({ modelId, baseInputs, axes, seed: 1 });
      $('sweep-run').disabled = true;
      $('sweep-cancel').disabled = false;
      status(`Sweeping ${definition.id} in a worker… 0/${spec.axes.reduce((n, axis) => n * axis.values.length, 1)}`);
      const result = await client.run(spec, {
        onProgress: progress => { if (!disposed && token === runToken) status(`Sweeping ${definition.id} in a worker… ${progress.completed}/${progress.total} (${progress.failed} failed)`); },
      });
      if (disposed || token !== runToken) return;
      lastResult = result;
      runCounter++;
      completedRuns.push({ id: `run ${runCounter}`, result: structuredClone(result) });
      while (completedRuns.length > MAX_RETAINED_RUNS) completedRuns.shift();
      status(`Sweep ${result.status}: ${result.points.length} points, ${result.points.filter(p => p.status !== 'succeeded').length} not succeeded.`);
      renderResult(result);
      renderCompareSelectors();
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
  on($('sweep-compare-run'), 'click', () => {
    if (disposed) return;
    try {
      const idA = $('sweep-compare-a').value, idB = $('sweep-compare-b').value;
      const runA = completedRuns.find(entry => entry.id === idA);
      const runB = completedRuns.find(entry => entry.id === idB);
      if (!runA || !runB) throw new RangeError('Select two retained runs to compare');
      const comparison = compareSweepRuns(runA.result, runB.result, { idA, idB });
      const tbody = $('sweep-compare');
      tbody.replaceChildren();
      for (const delta of comparison.deltas.slice(0, 100)) {
        tbody.append(row([delta.path, delta.index, JSON.stringify(delta.values), String(delta.a), String(delta.b), delta.delta === null ? 'not comparable' : String(delta.delta)]));
      }
      status(`Compared ${idA} and ${idB}: ${comparison.deltas.length} same-unit rows; ${comparison.deltas.filter(d => d.delta === null).length} not comparable (missing values or disagreeing units are never converted).`);
    } catch (error) {
      status(error.message);
    }
  });
  $('sweep-cancel').disabled = true;
  populateModels();
  populateAxes();
  renderCompareSelectors();
  return {
    getLastResult: () => lastResult,
    getCompletedRuns: () => completedRuns.map(entry => structuredClone(entry)),
    dispose() {
      disposed = true;
      runToken++;
      completedRuns.length = 0;
      for (const [target, name, fn] of listeners) target.removeEventListener(name, fn);
      listeners.length = 0;
    },
  };
}