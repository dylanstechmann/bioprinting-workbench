import test from 'node:test';
import assert from 'node:assert/strict';
import { scanText, scanClaims, CLAIM_PATTERNS } from '../scripts/scan-claims.mjs';

test('claims scanner flags synthetic overclaims and spares honest negations', () => {
  assert.equal(CLAIM_PATTERNS.length, 5);
  const overclaims = [
    'This method will regenerate whole organs.',
    'The printed graft guarantees repair of the tissue.',
    'Clinically proven results.',
    'You must inject the bioink daily.',
    'This scaffold is safe in humans.',
    'Patients are cured by the construct.',
  ];
  for (const sample of overclaims) {
    const findings = scanText(sample, 'sample.js');
    assert.ok(findings.length >= 1, 'expected a finding for: ' + sample);
  }
  const honest = [
    'No reviewed method will regenerate whole organs.',
    'Nothing here is clinically proven.',
    'This is not safe in humans and never claims to be.',
    'No patients are cured by any construct reviewed.',
    'The construct is unproven in humans; the module says so.',
  ];
  for (const sample of honest) {
    const findings = scanText(sample, 'sample.js');
    assert.equal(findings.length, 0, 'false positive on: ' + sample);
  }
});

test('the real authored sources scan clean', () => {
  const result = scanClaims(new URL('..', import.meta.url).pathname);
  assert.equal(result.schema, 'bioprinting-workbench/claims-scan/1');
  assert.equal(result.findings.length, 0);
  assert.ok(result.summary.includes('unreviewed finding(s)'));
  assert.ok(result.summary.startsWith('Scanned '));
});
