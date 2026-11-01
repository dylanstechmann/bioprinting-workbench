// Local, user-supplied measurement import for the idealized oxygen slab.
// No dataset is bundled with this project. A fit computed here is an estimate under the
// steady 1D slab assumptions; it is not a tissue measurement, viability or safety result.

export const CALIBRATION_INPUT_SCHEMA = 'bioprinting-workbench/calibration-input/1';
export const NO_CALIBRATION = Object.freeze({ status: 'no-dataset', message: 'No measurement file loaded. Nothing is calibrated.' });
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseCalibrationInput(text) {
  let raw;
  try { raw = JSON.parse(text); }
  catch (error) { throw new SyntaxError(`Measurement file is not valid JSON: ${error.message}`); }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError('Measurement file must be a JSON object');
  if (raw.schema !== CALIBRATION_INPUT_SCHEMA) throw new RangeError(`Expected schema "${CALIBRATION_INPUT_SCHEMA}"`);
  if (raw.units !== 'dimensionless-ratio') throw new RangeError("Expected units \"dimensionless-ratio\" (center/boundary concentration ratio)");
  const source = raw.source;
  if (source === null || typeof source !== 'object' || Array.isArray(source)) throw new TypeError('source must be an object with a citation');
  if (typeof source.citation !== 'string' || !source.citation.trim()) throw new TypeError('source.citation must be a non-empty string');
  if (source.url !== undefined && typeof source.url !== 'string') throw new TypeError('source.url must be a string when provided');
  if (typeof source.accessedDate !== 'string' || !DATE.test(source.accessedDate) || Number.isNaN(Date.parse(source.accessedDate))) throw new RangeError('source.accessedDate must be a valid YYYY-MM-DD date');
  if (!Array.isArray(raw.measurements) || raw.measurements.length < 1 || raw.measurements.length > 100) throw new RangeError('measurements must contain 1 to 100 entries');
  const measurements = raw.measurements.map((m, i) => {
    if (m === null || typeof m !== 'object' || Array.isArray(m)) throw new TypeError(`measurements[${i}] must be an object`);
    if (typeof m.id !== 'string' || !m.id.trim()) throw new TypeError(`measurements[${i}].id must be a non-empty string`);
    for (const key of ['center', 'boundary']) {
      if (typeof m[key] !== 'number' || !Number.isFinite(m[key]) || m[key] <= 0) throw new RangeError(`measurements[${i}].${key} must be a finite number > 0`);
    }
    return { id: m.id, center: m.center, boundary: m.boundary };
  });
  return { schema: CALIBRATION_INPUT_SCHEMA, source: { citation: source.citation, url: source.url, accessedDate: source.accessedDate }, units: 'dimensionless-ratio', measurements };
}

export function fitSlabDemand(input) {
  const qValues = input.measurements.map(m => 2 * (1 - m.center / m.boundary));
  const n = qValues.length;
  const q = qValues.reduce((a, b) => a + b, 0) / n;
  const variance = qValues.reduce((a, v) => a + (v - q) ** 2, 0) / n;
  return {
    model: 'steady-1d-slab-constant-consumption', n, q,
    residualStd: Math.sqrt(variance), minQ: Math.min(...qValues), maxQ: Math.max(...qValues),
    inDomain: q >= 0 && q <= 2, sourceCitation: input.source.citation,
    assumptionNotice: 'Estimate assumes the steady 1D slab model with uniform consumption and unit boundary concentration; it is not a tissue measurement, viability or safety result.',
  };
}

export function calibrationExample() {
  return JSON.stringify({
    schema: CALIBRATION_INPUT_SCHEMA,
    source: { citation: 'SYNTHETIC EXAMPLE - replace with your real measured pairs and their source citation', accessedDate: '2026-11-01' },
    units: 'dimensionless-ratio',
    measurements: [{ id: 'sample-a', center: 0.42, boundary: 1.01 }, { id: 'sample-b', center: 0.39, boundary: 0.98 }],
  }, null, 2);
}
