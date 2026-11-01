import test from 'node:test';
import assert from 'node:assert/strict';
import { CALIBRATION_INPUT_SCHEMA, NO_CALIBRATION, parseCalibrationInput, fitSlabDemand, calibrationExample } from '../src/calibration.js';

const valid = (measurements, extra = {}) => JSON.stringify({ schema: CALIBRATION_INPUT_SCHEMA, source: { citation: 'Test source', accessedDate: '2026-11-01' }, units: 'dimensionless-ratio', measurements, ...extra });

test('valid input parses and normalizes', () => {
  const input = parseCalibrationInput(valid([{ id: 'a', center: .4, boundary: 1 }, { id: 'b', center: .42, boundary: 1.05 }]));
  assert.equal(input.schema, CALIBRATION_INPUT_SCHEMA);
  assert.equal(input.units, 'dimensionless-ratio');
  assert.equal(input.source.citation, 'Test source');
  assert.equal(input.measurements.length, 2);
  assert.deepEqual(input.measurements[0], { id: 'a', center: .4, boundary: 1 });
});

test('malformed and invalid inputs are rejected with clear errors', () => {
  assert.throws(() => parseCalibrationInput('not json'), SyntaxError);
  assert.throws(() => parseCalibrationInput('[]'), TypeError);
  assert.throws(() => parseCalibrationInput(valid([])), RangeError);
  assert.throws(() => parseCalibrationInput(valid([{ id: 'a', center: 1, boundary: 1 }], { schema: 'wrong' })), RangeError);
  assert.throws(() => parseCalibrationInput(valid([{ id: 'a', center: 1, boundary: 1 }], { units: 'mg/mL' })), RangeError);
  assert.throws(() => parseCalibrationInput(valid([{ id: 'a', center: 1, boundary: 1 }], { source: { citation: '', accessedDate: '2026-11-01' } })), TypeError);
  assert.throws(() => parseCalibrationInput(valid([{ id: 'a', center: 1, boundary: 1 }], { source: { citation: 'x', accessedDate: '2026-13-40' } })), RangeError);
  assert.throws(() => parseCalibrationInput(valid([{ id: 'a', center: 0, boundary: 1 }])), RangeError);
  assert.throws(() => parseCalibrationInput(valid([{ id: 'a', center: Number.NaN, boundary: 1 }])), RangeError);
  assert.throws(() => parseCalibrationInput(valid([{ id: '', center: 1, boundary: 1 }])), TypeError);
  assert.throws(() => parseCalibrationInput(valid(Array.from({ length: 101 }, (_, i) => ({ id: 'm' + i, center: 1, boundary: 1 })))), RangeError);
});

test('exact synthetic data recovers the demand parameter', () => {
  const q = 1.2;
  const measurements = [0, 1, 2].map(i => ({ id: 's' + i, center: 1 - q / 2, boundary: 1 }));
  const fit = fitSlabDemand(parseCalibrationInput(valid(measurements)));
  assert.ok(Math.abs(fit.q - q) < 1e-9);
  assert.equal(fit.n, 3);
  assert.equal(fit.residualStd, 0);
  assert.equal(fit.inDomain, true);
  assert.equal(fit.model, 'steady-1d-slab-constant-consumption');
  assert.match(fit.assumptionNotice, /not a tissue measurement/);
});

test('noisy data reports spread and out-of-domain ratios are flagged', () => {
  const noisy = fitSlabDemand(parseCalibrationInput(valid([{ id: 'a', center: .4, boundary: 1 }, { id: 'b', center: .45, boundary: 1 }])));
  assert.ok(noisy.residualStd > 0);
  assert.ok(noisy.minQ < noisy.maxQ);
  const bad = fitSlabDemand(parseCalibrationInput(valid([{ id: 'a', center: 1.2, boundary: 1 }])));
  assert.equal(bad.inDomain, false);
  assert.ok(bad.q < 0);
});

test('example fixture parses and the no-dataset status is explicit', () => {
  const parsed = parseCalibrationInput(calibrationExample());
  assert.ok(parsed.source.citation.includes('SYNTHETIC'));
  const fit = fitSlabDemand(parsed);
  assert.equal(fit.n, 2);
  assert.equal(NO_CALIBRATION.status, 'no-dataset');
  assert.match(NO_CALIBRATION.message, /Nothing is calibrated/);
});
