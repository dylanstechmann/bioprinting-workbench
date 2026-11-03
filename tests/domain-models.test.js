import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODEL_UNITS, validateUnit, validateQuantity, validateFieldDefinition,
  validateDomainModelDefinition, getDomainModels, getDomainModel,
} from '../src/domain-models.js';

const KNOWN = ['storyboard', 'slab-oxygen', 'box-oxygen', 'flow-resistance', 'nozzle-shear', 'vascular-supply', 'relative-division'];

test('the registry holds exactly the seven known independent models', () => {
  const models = getDomainModels();
  assert.deepEqual(models.map(m => m.id).sort(), [...KNOWN].sort());
  for (const m of models) {
    assert.equal(m.version, 1);
    assert.equal(m.couplingPolicy, 'independent');
    assert.equal(m.implementationId, m.id);
    assert.ok(m.supportedOperations.includes('evaluate'));
    for (const op of m.supportedOperations) assert.ok(['evaluate', 'sweep', 'field'].includes(op));
  }
});

test('registry getters return defensive copies and reject unknown ids', () => {
  const a = getDomainModel('storyboard');
  a.label = 'tampered';
  a.outputDefinitions.progress.unit = 'Pa';
  const b = getDomainModel('storyboard');
  assert.equal(b.label, 'Dimensionless synthetic storyboard');
  assert.equal(b.outputDefinitions.progress.unit, '1');
  assert.throws(() => getDomainModel('cross-reference'), RangeError);
  assert.throws(() => getDomainModel('toString'), RangeError);
});

test('unit allowlist is exact and no unknown unit passes', () => {
  assert.ok(MODEL_UNITS.includes('Pa'));
  assert.ok(MODEL_UNITS.includes('relative-population'));
  assert.equal(new Set(MODEL_UNITS).size, MODEL_UNITS.length);
  for (const bad of ['mL', 'cells', 'mm', '', 'PA']) assert.throws(() => validateUnit(bad), RangeError);
});

test('quantity present/null rules and missing reasons', () => {
  const q = validateQuantity({ value: 1.5, unit: 'Pa', origin: 'hypothetical', sourceIds: [], uncertainty: null, missingReason: null });
  assert.equal(q.value, 1.5);
  assert.throws(() => validateQuantity({ value: null, unit: 'Pa', origin: 'synthetic', sourceIds: [], uncertainty: null, missingReason: null }), TypeError);
  const missing = validateQuantity({ value: null, unit: 'um', origin: 'synthetic', sourceIds: [], uncertainty: null, missingReason: 'No value in this model.' });
  assert.equal(missing.value, null);
  assert.throws(() => validateQuantity({ value: 1, unit: 'Pa', origin: 'synthetic', sourceIds: [], uncertainty: null, missingReason: 'why' }), RangeError);
});

test('derived provenance and literature sources are enforced', () => {
  assert.throws(() => validateQuantity({ value: 1, unit: '1', origin: 'derived', sourceIds: [], uncertainty: null, missingReason: null }), RangeError);
  const derived = validateQuantity({ value: 1, unit: '1', origin: 'derived', sourceIds: [], uncertainty: null, missingReason: null }, { runId: 'run-1' });
  assert.equal(derived.origin, 'derived');
  assert.throws(() => validateQuantity({ value: 1, unit: '1', origin: 'literature', sourceIds: [], uncertainty: null, missingReason: null }), RangeError);
  assert.throws(() => validateQuantity({ value: 1, unit: '1', origin: 'literature', sourceIds: ['ghost'], uncertainty: null, missingReason: null }, { runId: 'run-1', sourceIds: ['known'] }), RangeError);
  const lit = validateQuantity({ value: 1, unit: '1', origin: 'literature', sourceIds: ['known'], uncertainty: null, missingReason: null }, { runId: 'run-1', sourceIds: ['known'] });
  assert.deepEqual(lit.sourceIds, ['known']);
});
test('interval uncertainty: exact unit, ordering, enclosure, null rules', () => {
  const ok = validateQuantity({ value: 2, unit: 'Pa', origin: 'synthetic', sourceIds: [], uncertainty: { kind: 'interval', lower: 1, upper: 3, unit: 'Pa' }, missingReason: null });
  assert.equal(ok.uncertainty.lower, 1);
  assert.throws(() => validateQuantity({ value: 2, unit: 'Pa', origin: 'synthetic', sourceIds: [], uncertainty: { kind: 'interval', lower: 1, upper: 3, unit: 'um' }, missingReason: null }), RangeError);
  assert.throws(() => validateQuantity({ value: 2, unit: 'Pa', origin: 'synthetic', sourceIds: [], uncertainty: { kind: 'interval', lower: 3, upper: 1, unit: 'Pa' }, missingReason: null }), RangeError);
  assert.throws(() => validateQuantity({ value: 5, unit: 'Pa', origin: 'synthetic', sourceIds: [], uncertainty: { kind: 'interval', lower: 1, upper: 3, unit: 'Pa' }, missingReason: null }), RangeError);
  assert.throws(() => validateQuantity({ value: null, unit: 'Pa', origin: 'synthetic', sourceIds: [], uncertainty: { kind: 'interval', lower: 1, upper: 3, unit: 'Pa' }, missingReason: 'gap' }), RangeError);
});

test('quantity rejects duplicates, floods, coercion and prototype forgery', () => {
  const base = { value: 1, unit: '1', origin: 'synthetic', sourceIds: [], uncertainty: null, missingReason: null };
  assert.throws(() => validateQuantity({ ...base, value: '1' }), RangeError);
  assert.throws(() => validateQuantity({ ...base, sourceIds: ['a', 'a'] }), TypeError);
  assert.throws(() => validateQuantity({ ...base, sourceIds: Array.from({ length: 51 }, (_, i) => `s${i}`) }), TypeError);
  assert.throws(() => validateQuantity(JSON.parse('{"value":1,"unit":"1","origin":"synthetic","sourceIds":[],"uncertainty":null,"missingReason":null,"__proto__":{"polluted":true}}')), TypeError);
});

test('field definitions enforce type/unit/bounds/enum coherence', () => {
  const num = validateFieldDefinition({ unit: 'Pa', type: 'number', min: 0, max: 1, nullable: false, values: null });
  assert.equal(num.unit, 'Pa');
  assert.throws(() => validateFieldDefinition({ unit: 'Pa', type: 'boolean', min: null, max: null, nullable: false, values: null }), RangeError);
  assert.throws(() => validateFieldDefinition({ unit: null, type: 'number', min: 0, max: 1, nullable: false, values: null }), RangeError);
  assert.throws(() => validateFieldDefinition({ unit: 'Pa', type: 'number', min: 2, max: 1, nullable: false, values: null }), RangeError);
  assert.throws(() => validateFieldDefinition({ unit: null, type: 'string', min: null, max: null, nullable: false, values: ['a', 'a'] }), RangeError);
  assert.throws(() => validateFieldDefinition({ unit: null, type: 'string', min: 1, max: null, nullable: false, values: ['a'] }), RangeError);
  assert.throws(() => validateFieldDefinition({ unit: 'count', type: 'array', min: 1.5, max: null, nullable: false, values: null }), RangeError);
});

test('domain definitions reject unknown keys, versions, coupling and field ids', () => {
  const story = getDomainModel('storyboard');
  assert.throws(() => validateDomainModelDefinition({ ...story, extra: 1 }), TypeError);
  assert.throws(() => validateDomainModelDefinition({ ...story, version: 2 }), RangeError);
  assert.throws(() => validateDomainModelDefinition({ ...story, implementationId: 'other' }), RangeError);
  assert.throws(() => validateDomainModelDefinition({ ...story, couplingPolicy: 'explicit-hypothetical-mapping' }), RangeError);
  assert.throws(() => validateDomainModelDefinition({ ...story, supportedOperations: ['execute'] }), RangeError);
  assert.throws(() => validateDomainModelDefinition({ ...story, inputDefinitions: { '..x': story.inputDefinitions.time } }), RangeError);
});

test('every registered field declares a coherent unit and boundary', () => {
  for (const model of getDomainModels()) {
    for (const [path, def] of Object.entries({ ...model.inputDefinitions, ...model.outputDefinitions })) {
      const checked = validateFieldDefinition(def, path);
      if (checked.type === 'number' || checked.type === 'integer') assert.ok(MODEL_UNITS.includes(checked.unit), `${model.id}.${path}`);
      else assert.equal(checked.unit, null, `${model.id}.${path}`);
    }
  }
});

test('no null substitution exists: absent model values require explicit reasons', () => {
  const vascular = getDomainModel('vascular-supply');
  assert.equal(vascular.outputDefinitions['computed.kroghCriticalRadiusUm'].nullable, true);
  const division = getDomainModel('relative-division');
  assert.equal(division.outputDefinitions.hypotheticalElapsedHours.nullable, true);
  const slab = getDomainModel('slab-oxygen');
  assert.equal(slab.outputDefinitions.center.nullable, false);
});
