import test from 'node:test';
import assert from 'node:assert/strict';
import { captureSlabMeasurement } from '../src/slab-measurement.js';
import { calibrationExample, fitSlabDemand, parseCalibrationInput } from '../src/calibration.js';
import { sha256Bytes } from '../src/model-provenance.js';

test('slab capture preserves original bytes and native fit without applying controls', async () => {
  const text = calibrationExample(), rawBytes = new TextEncoder().encode(text);
  const captured = await captureSlabMeasurement({ rawBytes, id: 'slab-one', demand: 0.5, importedAt: new Date().toISOString() });
  assert.deepEqual(captured.fit, fitSlabDemand(parseCalibrationInput(text)));
  assert.equal(captured.provenance.dataset.rawSha256, await sha256Bytes(rawBytes));
  assert.equal(captured.provenance.fitRun.settingsSnapshot.demand, 0.5);
  assert.equal(captured.provenance.fitRun.applied, false);
  assert.equal(captured.provenance.fitRun.implementationSha256, null);
  assert.ok(Object.isFrozen(captured.provenance.dataset));
});

test('slab capture rejects malformed bytes and preserves out-of-domain fit diagnostics', async () => {
  const options = { id: 'slab-two', demand: 1, importedAt: new Date().toISOString() };
  await assert.rejects(captureSlabMeasurement({ ...options, rawBytes: new Uint8Array([255]) }));
  const input = JSON.parse(calibrationExample());input.measurements.forEach(row => { row.center = 2 * row.boundary; });
  const captured = await captureSlabMeasurement({ ...options, rawBytes: new TextEncoder().encode(JSON.stringify(input)) });
  assert.equal(captured.provenance.fitRun.status, 'out-of-domain');
  assert.equal(captured.provenance.fitRun.applied, false);
});