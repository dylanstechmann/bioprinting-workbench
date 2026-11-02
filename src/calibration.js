// Local, user-supplied measurement import for the idealized oxygen slab.
// No dataset is bundled with this project. A fit computed here is an estimate under the
// steady 1D slab assumptions; it is not a tissue measurement, viability or safety result.

import { parseBoundedJson, assertAllowedKeys, validateSource, validateDataKind, text as checkedText, MEASUREMENT_BYTES } from './validation.js';
export const CALIBRATION_INPUT_SCHEMA = 'bioprinting-workbench/calibration-input/1';
export const NO_CALIBRATION = Object.freeze({ status: 'no-dataset', message: 'No measurement file loaded. Nothing is calibrated.' });

export function parseCalibrationInput(text) {
  let raw;
  try { raw = parseBoundedJson(text, MEASUREMENT_BYTES); }
  catch (error) { if (error instanceof SyntaxError) throw new SyntaxError(`Measurement file is not valid JSON: ${error.message}`); throw error; }
  assertAllowedKeys(raw, ['schema', 'source', 'units', 'measurements', 'dataKind']);
  if (raw.schema !== CALIBRATION_INPUT_SCHEMA) throw new RangeError(`Expected schema "${CALIBRATION_INPUT_SCHEMA}"`);
  if (raw.units !== 'dimensionless-ratio') throw new RangeError("Expected units \"dimensionless-ratio\" (center/boundary concentration ratio)");
  const source = validateSource(raw.source), ids = new Set();
  if (!Array.isArray(raw.measurements) || raw.measurements.length < 1 || raw.measurements.length > 100) throw new RangeError('measurements must contain 1 to 100 entries');
  const measurements = raw.measurements.map((m, i) => {
    assertAllowedKeys(m, ['id', 'center', 'boundary'], `measurements[${i}]`);
    const id = checkedText(m.id, 128, `measurements[${i}].id`);
    if (ids.has(id)) throw new RangeError(`Duplicate measurement ID: ${id}`);
    ids.add(id);
    for (const key of ['center', 'boundary']) {
      if (typeof m[key] !== 'number' || !Number.isFinite(m[key]) || m[key] <= 0) throw new RangeError(`measurements[${i}].${key} must be a finite number > 0`);
    }
    if (!Number.isFinite(2 * (1 - m.center / m.boundary))) throw new RangeError('Measurement ratio overflows');
    return { id, center: m.center, boundary: m.boundary };
  });
  return { schema: CALIBRATION_INPUT_SCHEMA, source, dataKind: validateDataKind(raw.dataKind), units: 'dimensionless-ratio', measurements };
}

export function fitSlabDemand(input) {
  input = parseCalibrationInput(JSON.stringify(input));
  const qValues = input.measurements.map(m => 2 * (1 - m.center / m.boundary));
  const n = qValues.length;
  const q = qValues.reduce((a, b) => a + b, 0) / n;
  const variance = qValues.reduce((a, v) => a + (v - q) ** 2, 0) / n;
  if (!Number.isFinite(q) || !Number.isFinite(variance)) throw new RangeError('Fit arithmetic overflows');
  return {
    model: 'steady-1d-slab-constant-consumption', n, q,
    residualStd: Math.sqrt(variance), minQ: Math.min(...qValues), maxQ: Math.max(...qValues),
    inDomain: q >= 0 && q <= 2, sourceCitation: input.source.citation, dataKind: input.dataKind,
    assumptionNotice: 'Estimate assumes the steady 1D slab model with uniform consumption and unit boundary concentration; it is not a tissue measurement, viability or safety result.',
  };
}

export function calibrationExample() {
  return JSON.stringify({
    schema: CALIBRATION_INPUT_SCHEMA, dataKind: 'synthetic',
    source: { citation: 'SYNTHETIC EXAMPLE - replace with your real measured pairs and their source citation', accessedDate: '2026-11-01' },
    units: 'dimensionless-ratio',
    measurements: [{ id: 'sample-a', center: 0.42, boundary: 1.01 }, { id: 'sample-b', center: 0.39, boundary: 0.98 }],
  }, null, 2);
}
