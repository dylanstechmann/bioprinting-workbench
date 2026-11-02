import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBoundedJson, validateSource, validateDataKind, assertAllowedKeys } from '../src/validation.js';
import { parseCalibrationInput, calibrationExample, fitSlabDemand } from '../src/calibration.js';
import { validateProcedureState } from '../src/procedure.js';

test('bounded JSON rejects roots, bytes and unsupported/prototype keys', () => {
  for (const input of ['null', '[]', '1']) assert.throws(() => parseBoundedJson(input, 100), TypeError);
  assert.throws(() => parseBoundedJson('{"x":"é"}', 9), RangeError);
  assert.throws(() => assertAllowedKeys(JSON.parse('{"__proto__":{}}'), []), TypeError);
});
test('source dates and URLs are strict; provenance is not inferred', () => {
  const source = { citation: 'Fixture', accessedDate: '2024-02-29' };
  assert.equal(validateSource(source).accessedDate, source.accessedDate);
  for (const date of ['2026-02-29', '2026-02-30', '2026-13-01']) assert.throws(() => validateSource({ ...source, accessedDate: date }), RangeError);
  for (const url of ['javascript:alert(1)', '/local', 'https://user:password@example.com']) assert.throws(() => validateSource({ ...source, url }));
  assert.equal(validateDataKind(), 'unspecified');
  assert.throws(() => validateDataKind('verified'));
});
test('slab rejects duplicate IDs and finite operands producing overflow', () => {
  const input = JSON.parse(calibrationExample());
  input.measurements[1].id = input.measurements[0].id;
  assert.throws(() => parseCalibrationInput(JSON.stringify(input)), RangeError);
  input.measurements = [{ id: 'overflow', center: 1e308, boundary: 1e-308 }];
  assert.throws(() => parseCalibrationInput(JSON.stringify(input)), RangeError);
  input.measurements = [{ id: 'variance', center: 1e200, boundary: 1 }];
  input.measurements.push({ id: 'other', center: 1, boundary: 1 });
  assert.throws(() => fitSlabDemand(input), RangeError);
});
test('procedure restoration rejects fake and duplicate checks without mutation', () => {
  const valid = { mode: 'gated', completedChecks: ['expand-bench'] };
  const copy = validateProcedureState(valid); copy.completedChecks.push('expand-population');
  assert.equal(valid.completedChecks.length, 1);
  for (const completedChecks of [['unknown'], ['expand-bench', 'expand-bench']]) assert.throws(() => validateProcedureState({ mode: 'free', completedChecks }));
});