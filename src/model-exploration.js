// Phase D exploration: bounded parameter sweeps over registered models. Sweep points never
// write into scenario controls, fitted values are never auto-applied, and summaries report
// same-unit ranges and finite-difference slopes only — never probability, causal effect,
// viability or efficacy rankings.
import { getDomainModels } from './domain-models.js';

function assertPlain(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError(`${path} must be a plain object`);
  for (const key of Object.keys(value)) if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new TypeError(`${path}.${key} is forbidden`);
  return value;
}
function pathSet(obj, dotted, value) {
  const parts = dotted.split('.');
  let cursor = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cursor[parts[i]] || typeof cursor[parts[i]] !== 'object') throw new RangeError(`baseInputs is missing ${parts.slice(0, i + 1).join('.')}`);
    cursor = cursor[parts[i]];
  }
  cursor[parts[parts.length - 1]] = value;
}

export const MAX_SWEEP_POINTS = 100;
export const MAX_SWEEP_AXES = 2;

export function validateSweepSpec(raw, registry = getDomainModels()) {
  assertPlain(raw, 'sweepSpec');
  for (const key of Object.keys(raw)) if (!['modelId', 'baseInputs', 'axes', 'seed'].includes(key)) throw new TypeError(`sweepSpec.${key} is unsupported`);
  const definition = registry.find(d => d.id === raw.modelId);
  if (!definition) throw new RangeError(`Unknown sweep model: ${String(raw.modelId)}`);
  if (!definition.supportedOperations.includes('sweep')) throw new RangeError(`${definition.id} does not advertise sweep support`);
  assertPlain(raw.baseInputs, 'sweepSpec.baseInputs');
  if (!Array.isArray(raw.axes) || raw.axes.length < 1 || raw.axes.length > MAX_SWEEP_AXES) throw new RangeError(`sweepSpec.axes needs 1..${MAX_SWEEP_AXES} entries`);
  const axes = raw.axes.map((axis, i) => {
    assertPlain(axis, `sweepSpec.axes[${i}]`);
    for (const key of Object.keys(axis)) if (!['path', 'values'].includes(key)) throw new TypeError(`sweepSpec.axes[${i}].${key} is unsupported`);
    const def = definition.inputDefinitions[axis.path];
    if (!def) throw new RangeError(`Unknown sweep axis path ${axis.path}`);
    if (def.type !== 'number' && def.type !== 'integer') throw new RangeError(`Sweep axis ${axis.path} must be numeric`);
    if (!Array.isArray(axis.values) || axis.values.length < 2 || axis.values.length > 10) throw new RangeError('Sweep axes list 2..10 explicit values');
    const values = axis.values.map((value, j) => {
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new RangeError(`sweepSpec.axes[${i}].values[${j}] must be finite`);
      if (def.min !== null && value < def.min) throw new RangeError(`Sweep value below the declared minimum for ${axis.path}`);
      if (def.max !== null && value > def.max) throw new RangeError(`Sweep value above the declared maximum for ${axis.path}`);
      if (def.values && !def.values.includes(value)) throw new RangeError(`Sweep value is not in the declared enum for ${axis.path}`);
      return value;
    });
    if (new Set(values).size !== values.length) throw new RangeError(`Sweep axis ${axis.path} values must be unique`);
    return { path: axis.path, values };
  });
  const paths = axes.map(a => a.path);
  if (new Set(paths).size !== paths.length) throw new RangeError('Sweep axes must target distinct paths');
  const total = axes.reduce((product, axis) => product * axis.values.length, 1);
  if (total > MAX_SWEEP_POINTS) throw new RangeError(`Sweep exceeds ${MAX_SWEEP_POINTS} total points`);
  if (raw.modelId === 'box-oxygen') {
    if (total > 25) throw new RangeError('Box-oxygen sweeps are limited to 25 points');
    const resolution = raw.baseInputs?.settings?.resolution;
    if (typeof resolution !== 'number' || resolution > 17) throw new RangeError('Box-oxygen sweeps run at resolution <= 17');
    for (const axis of axes) if (axis.path === 'settings.resolution' && axis.values.some(value => value > 17)) throw new RangeError('Box-oxygen sweeps run at resolution <= 17');
  }
  const seed = raw.seed;
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new RangeError('sweepSpec.seed must be a uint32');
  return { modelId: definition.id, baseInputs: structuredClone(raw.baseInputs), axes, seed };
}

/** Deterministic enumeration: axes in listed order (last axis fastest). */
export function enumerateSweepPoints(spec) {
  const validated = validateSweepSpec(spec);
  const points = [];
  const walk = (axisIndex, chosen) => {
    if (axisIndex === validated.axes.length) {
      const inputs = structuredClone(validated.baseInputs);
      const values = {};
      for (const [path, value] of chosen) { pathSet(inputs, path, value); values[path] = value; }
      points.push({ index: points.length, inputs, values });
      return;
    }
    for (const value of validated.axes[axisIndex].values) walk(axisIndex + 1, [...chosen, [validated.axes[axisIndex].path, value]]);
  };
  walk(0, []);
  return points;
}
/** Run every enumerated point through `evaluate(inputs)`. Per-point failures are retained as
 * failed points, never dropped. Cancellation via signal aborts between points. */
export async function runParameterSweep(spec, { evaluate, signal = null, onProgress = () => {} } = {}) {
  if (typeof evaluate !== 'function') throw new TypeError('runParameterSweep needs an evaluate function');
  const validated = validateSweepSpec(spec);
  const points = enumerateSweepPoints(validated);
  const results = [];
  let completed = 0, failed = 0, cancelled = false;
  for (const point of points) {
    if (signal?.aborted) { cancelled = true; break; }
    try {
      const evaluation = await evaluate(structuredClone(point.inputs));
      const ok = evaluation && evaluation.status === 'succeeded';
      if (!ok) failed++;
      results.push({
        index: point.index, inputs: point.inputs, values: point.values,
        status: evaluation?.status ?? 'failed',
        run: evaluation ? { status: evaluation.status, quantities: structuredClone(evaluation.quantities ?? {}) } : null,
        error: null,
      });
    } catch (error) {
      failed++;
      results.push({ index: point.index, inputs: point.inputs, values: point.values, status: 'failed', run: null, error: String(error?.message || error) });
    }
    completed++;
    onProgress({ completed, failed, total: points.length });
  }
  return {
    spec: validated,
    points: results,
    summary: summarizeSensitivity({ spec: validated, points: results, summary: null, status: 'done' }),
    status: cancelled ? 'cancelled' : failed === 0 ? 'succeeded' : failed === points.length ? 'failed' : 'partial',
  };
}

/** Same-unit ranges and central finite-difference slopes per axis and output quantity.
 * Zero-variance coordinates and mixed-status points yield null, never invented metrics. */
export function summarizeSensitivity(run) {
  const axes = run.spec.axes;
  const outputs = new Map();
  for (const point of run.points) {
    for (const [path, quantity] of Object.entries(point.run?.quantities ?? {})) {
      if (quantity && typeof quantity.value === 'number') outputs.set(path, quantity.unit);
    }
  }
  const ranges = [...outputs].map(([path, unit]) => {
    const values = run.points.map(p => p.run?.quantities?.[path]).filter(q => q && typeof q.value === 'number').map(q => q.value);
    return { path, unit, min: values.length ? Math.min(...values) : null, max: values.length ? Math.max(...values) : null, count: values.length };
  });
  const sensitivities = [];
  for (const axis of axes) {
    for (const [path, unit] of outputs) {
      const byValue = new Map();
      for (const point of run.points) {
        const keys = Object.keys(point.values);
        if (keys.length !== 1 || keys[0] !== axis.path) continue;
        const quantity = point.run?.quantities?.[path];
        if (quantity && typeof quantity.value === 'number') byValue.set(point.values[axis.path], quantity.value);
      }
      const xs = [...byValue.keys()].sort((a, b) => a - b);
      const slopes = [];
      for (let i = 1; i < xs.length; i++) {
        const dx = xs[i] - xs[i - 1];
        if (dx > 0) slopes.push((byValue.get(xs[i]) - byValue.get(xs[i - 1])) / dx);
      }
      const slope = slopes.length ? slopes.reduce((a, b) => a + b, 0) / slopes.length : null;
      sensitivities.push({ axisPath: axis.path, outputPath: path, unit, slope: Number.isFinite(slope) ? slope : null, pointsUsed: xs.length });
    }
  }
  return { ranges, sensitivities, notice: 'Ranges and finite-difference slopes of same-unit model outputs over the enumerated points only. No probability, causal effect, viability or efficacy claim.' };
}

export const MAX_COMPARISON_ROWS = 1000;

/** Pure, bounded side-by-side comparison of two completed sweep runs of the same model with
 * identical axis specs and aligned point values. Deltas are same-unit only: a delta is null
 * wherever a value is missing/failed or the two units disagree. Nothing is converted,
 * interpolated, ranked or dropped; every aligned point keeps its row. */
export function compareSweepRuns(runA, runB, { idA = 'run-a', idB = 'run-b' } = {}) {
  assertPlain(runA, 'comparison.runA');
  assertPlain(runB, 'comparison.runB');
  if (!runA.spec || !runB.spec || runA.spec.modelId !== runB.spec.modelId) throw new RangeError('Comparison requires runs of the same model');
  if (JSON.stringify(runA.spec.axes) !== JSON.stringify(runB.spec.axes)
    || JSON.stringify(runA.spec.baseInputs ?? null) !== JSON.stringify(runB.spec.baseInputs ?? null)) {
    throw new RangeError('Comparison requires identical axis specs');
  }
  const pointsA = runA.points, pointsB = runB.points;
  if (!Array.isArray(pointsA) || !Array.isArray(pointsB) || pointsA.length !== pointsB.length || pointsA.length > MAX_SWEEP_POINTS) {
    throw new RangeError('Comparison requires aligned bounded point lists');
  }
  for (let i = 0; i < pointsA.length; i++) {
    if (JSON.stringify(pointsA[i]?.values ?? null) !== JSON.stringify(pointsB[i]?.values ?? null)) {
      throw new RangeError('Comparison points are not aligned');
    }
  }
  const paths = [...new Set([...pointsA, ...pointsB].flatMap(p => Object.keys(p?.run?.quantities ?? {})))].sort();
  const deltas = [];
  for (const path of paths) {
    let rowsForPath = 0;
    for (let index = 0; index < pointsA.length; index++) {
      if (rowsForPath >= MAX_SWEEP_POINTS) break;
      const quantityA = pointsA[index]?.run?.quantities?.[path] ?? null;
      const quantityB = pointsB[index]?.run?.quantities?.[path] ?? null;
      const a = quantityA && typeof quantityA.value === 'number' && Number.isFinite(quantityA.value) ? quantityA.value : null;
      const b = quantityB && typeof quantityB.value === 'number' && Number.isFinite(quantityB.value) ? quantityB.value : null;
      const unitA = quantityA?.unit ?? null, unitB = quantityB?.unit ?? null;
      const sameUnit = a !== null && b !== null && unitA === unitB;
      deltas.push({
        path, index,
        values: structuredClone(pointsA[index]?.values ?? null),
        unit: unitA ?? unitB,
        a, b,
        delta: sameUnit ? a - b : null,
      });
      rowsForPath++;
    }
  }
  if (deltas.length > MAX_COMPARISON_ROWS) throw new RangeError(`Comparison exceeds the bounded row limit (${MAX_COMPARISON_ROWS})`);
  return { modelId: runA.spec.modelId, runIds: [idA, idB], deltas };
}
