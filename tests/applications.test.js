import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultApplicationsPerspective, validateApplicationsPerspective, evaluateApplicationsTheory, getApplicationsLedger, getApproachCatalog, validateApplicationsCatalog } from '../src/applications.js';
import { getApplicationsEvidenceCatalog } from '../src/applications-evidence.js';

const catalog = () => { const evidence = getApplicationsEvidenceCatalog(); return validateApplicationsCatalog(getApplicationsLedger(), getApproachCatalog(), evidence); };

test('applications ledger and approach catalog anchors resolve; the filler shortcut stays excluded', () => {
  const { ledger, approaches } = catalog();
  assert.equal(ledger.length, 6);
  assert.equal(approaches.length, 5);
  assert.deepEqual(approaches.filter(a => a.selectable).map(a => a.id), ['silicone-implant', 'autologous-fat-graft', 'autologous-flap', 'bioprinted-adipose']);
  const excluded = approaches.find(a => a.id === 'unregulated-injectables');
  assert.equal(excluded.category, 'excluded');
  assert.equal(excluded.selectable, false);
  assert.ok(excluded.anchorClaimIds.includes('unregulated-filler-complications'));
  for (const e of ledger) assert.ok(e.anchorClaimIds.length);
  for (const mutate of [
    l => { l.ledger.find(e => e.id === 'skin-wound-printing').anchorClaimIds = []; },
    l => { l.ledger[0].id = l.ledger[1].id; },
    l => { l.ledger.find(e => e.id === 'auricular-reconstruction').status = 'fantasy'; },
    l => { l.ledger.find(e => e.id === 'auricular-reconstruction').status = 'measured-in-humans'; },
    l => { l.approaches.find(a => a.id === 'silicone-implant').anchorClaimIds.push('fake'); },
    l => { l.approaches.find(a => a.id === 'silicone-implant').adverseClaimIds = []; },
    l => { l.approaches.find(a => a.id === 'unregulated-injectables').selectable = true; },
    l => { l.approaches.find(a => a.id === 'autologous-fat-graft').selectable = false; },
    l => { l.approaches[0].id = l.approaches[1].id; },
    l => { l.approaches.find(a => a.id === 'bioprinted-adipose').category = 'excluded'; },
    l => { l.approaches.find(a => a.id === 'autologous-flap').category = 'implant'; },
  ]) { const raw = structuredClone({ ledger: getApplicationsLedger(), approaches: getApproachCatalog() }); mutate(raw); assert.throws(() => validateApplicationsCatalog(raw.ledger, raw.approaches, getApplicationsEvidenceCatalog())); }
});

test('applications arithmetic is transparent, bounded and hypothesis-labeled', () => {
  const base = defaultApplicationsPerspective();
  assert.equal(evaluateApplicationsTheory(base).status, 'unconfigured');
  const volumeOnly = evaluateApplicationsTheory({ ...base, plannedFatVolumeML: 300, resorptionFraction: 0.4 });
  assert.equal(volumeOnly.status, 'calculated');
  assert.equal(volumeOnly.retainedVolumeML, 180);
  assert.equal(volumeOnly.fatSessions, null);
  assert.equal(volumeOnly.implantInterventions, null);
  assert.equal(volumeOnly.assumptionOrigin, 'user-hypothetical-simulation');
  assert.ok(volumeOnly.notices.some(n => n.includes('Simulation theory only')));
  assert.ok(volumeOnly.notices.some(n => n.includes('bioprinted breast graft in a living human')));
  const scheduled = evaluateApplicationsTheory({ ...base, plannedFatVolumeML: 300, resorptionFraction: 0.4, fatRetouchYears: 3, implantReplacementYears: 10, planningHorizonYears: 30, selectedApproachIds: ['autologous-fat-graft', 'silicone-implant', 'bioprinted-adipose'] });
  assert.equal(scheduled.fatSessions, 10);
  assert.equal(scheduled.implantInterventions, 3);
  assert.ok(scheduled.approachEffects.some(e => e.id === 'autologous-fat-graft' && e.note.includes('retains 180 mL')));
  assert.ok(scheduled.approachEffects.some(e => e.id === 'silicone-implant' && e.note.includes('3 implant-related interventions')));
  assert.ok(scheduled.approachEffects.some(e => e.id === 'bioprinted-adipose' && e.note.includes('does not establish human volume retention')));
  assert.ok(scheduled.anchorSummaries.some(a => a.id === 'cal-fat-retention'));
  assert.ok(scheduled.adverseSummaries.some(a => a.id === 'bia-alcl-textured-implants'));
  assert.ok(scheduled.adverseSummaries.some(a => a.id === 'implant-secondary-procedures'));
  const flap = evaluateApplicationsTheory({ ...base, plannedFatVolumeML: 100, resorptionFraction: 0.2, selectedApproachIds: ['autologous-flap'] });
  assert.ok(flap.approachEffects.some(e => e.note.includes('flaps are surgery, not arithmetic')));
});

test('applications inputs reject forged, unbounded or unlinked values', () => {
  const base = defaultApplicationsPerspective();
  for (const patch of [
    { selectedApproachIds: ['unregulated-injectables'] },
    { selectedApproachIds: ['fake'] },
    { selectedApproachIds: ['silicone-implant', 'silicone-implant'] },
    { selectedApproachIds: 'silicone-implant' },
    { plannedFatVolumeML: 5 },
    { plannedFatVolumeML: 2500 },
    { plannedFatVolumeML: 250.5 },
    { resorptionFraction: 1 },
    { resorptionFraction: -0.1 },
    { fatRetouchYears: 0.1 },
    { fatRetouchYears: 11 },
    { implantReplacementYears: 0.5 },
    { planningHorizonYears: 100 },
    { extra: 1 },
  ]) assert.throws(() => validateApplicationsPerspective({ ...base, ...patch }));
  assert.equal(validateApplicationsPerspective({ ...base, plannedFatVolumeML: 300, resorptionFraction: 0, selectedApproachIds: ['autologous-flap'] }).plannedFatVolumeML, 300);
});
