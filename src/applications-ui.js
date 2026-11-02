import { getApplicationsLedger, getApproachCatalog, evaluateApplicationsTheory } from './applications.js';
import { getApplicationsEvidenceCatalog } from './applications-evidence.js';

/** Simulation-labeled applications panel: static ledger cards plus a breast soft-tissue comparison with measured anchors, hypothetical inputs and intervention-count arithmetic. */
export function createApplicationsUI({ elements: $, onStateChange }) {
  if (typeof onStateChange !== 'function') throw new TypeError('Applications UI needs a state-change callback');
  let disposed = false;
  const listeners = [];
  const element = (tag, text) => { const e = document.createElement(tag); e.textContent = text; return e; };
  const evidence = getApplicationsEvidenceCatalog();
  const sources = new Map(evidence.sources.map(s => [s.id, s]));
  const INPUTS = [['apps-fat-volume', 'plannedFatVolumeML'], ['apps-resorption', 'resorptionFraction'], ['apps-fat-retouch', 'fatRetouchYears'], ['apps-implant-years', 'implantReplacementYears'], ['apps-horizon', 'planningHorizonYears']];
  const checkboxes = new Map();
  function claimRow(id, kind) {
    const c = evidence.claims.find(c => c.id === id), s = sources.get(c.sourceId);
    const li = element('li', `${kind === 'adverse' ? 'Adverse evidence: ' : 'Measured anchor: '}${c.statement} `);
    const a = element('a', `${s.title} (${s.journalYear})`); a.href = s.fullTextUrl || s.url; a.target = '_blank'; a.rel = 'noreferrer';
    li.append(a, element('small', ` ${c.locator} · ${c.supportStatus}, agent-source-reading · ${c.species === 'human' ? 'human study' : c.species === 'mouse' ? 'mouse study — never transferred to human outcomes' : c.modelContext}`));
    return li;
  }
  const ledgerBox = $('applications-ledger');
  for (const entry of getApplicationsLedger()) {
    const card = document.createElement('article');
    card.append(element('h3', `${entry.label} · ${entry.status}`), element('p', entry.summary), element('small', entry.caveat));
    const anchors = document.createElement('ul');
    for (const id of entry.anchorClaimIds) anchors.append(claimRow(id, 'anchor'));
    for (const id of entry.adverseClaimIds) anchors.append(claimRow(id, 'adverse'));
    if (anchors.children.length) card.append(anchors);
    ledgerBox.append(card);
  }
  const approachBox = $('breast-approaches');
  for (const a of getApproachCatalog()) {
    const card = document.createElement('article');
    const label = document.createElement('label');
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = `apps-approach-${a.id}`;
    if (!a.selectable) { cb.disabled = true; label.className = 'excluded-lever'; }
    else { cb.addEventListener('change', proposeFromInputs); listeners.push(() => cb.removeEventListener('change', proposeFromInputs)); checkboxes.set(a.id, cb); }
    label.append(cb, element('span', a.selectable ? a.label : `${a.label} — shown, never selectable`));
    card.append(label, element('p', a.measuredSummary), element('small', a.theoryNote));
    const anchors = document.createElement('ul');
    for (const id of a.anchorClaimIds) anchors.append(claimRow(id, 'anchor'));
    for (const id of a.adverseClaimIds) anchors.append(claimRow(id, 'adverse'));
    if (anchors.children.length) card.append(anchors);
    approachBox.append(card);
  }
  for (const [id] of INPUTS) { const el = $(id); el.addEventListener('change', proposeFromInputs); listeners.push(() => el.removeEventListener('change', proposeFromInputs)); }
  function proposeFromInputs() {
    if (disposed) return;
    const optional = id => $(id).value.trim() === '' ? null : Number($(id).value);
    const selectedApproachIds = [...checkboxes.entries()].filter(([, cb]) => cb.checked).map(([id]) => id);
    $('applications-status').textContent = 'Simulation-theory inputs proposed. Hypothetical arithmetic only — no laboratory action, treatment or safety assessment.';
    onStateChange({ applicationsPerspective: { plannedFatVolumeML: optional('apps-fat-volume'), resorptionFraction: optional('apps-resorption'), fatRetouchYears: optional('apps-fat-retouch'), implantReplacementYears: optional('apps-implant-years'), planningHorizonYears: optional('apps-horizon'), selectedApproachIds } });
  }
  function formatResult(r, theory) {
    const n = v => v.toLocaleString('en-US', { maximumFractionDigits: 2 });
    const lines = [];
    if (r.retainedVolumeML !== null) lines.push(`One-pass fat-graft retention: ${n(theory.plannedFatVolumeML)} mL × (1 − ${theory.resorptionFraction}) = ${n(r.retainedVolumeML)} mL retained (your hypothesis; the reviewed cohort measured 76.4–84.0% retention with cell enrichment).`);
    if (r.fatSessions !== null) lines.push(`Hypothetical regraft schedule: ${r.fatSessions} sessions across ${n(theory.planningHorizonYears)} years at your ${n(theory.fatRetouchYears)}-year interval.`);
    if (r.implantInterventions !== null) lines.push(`Hypothetical implant schedule: ${r.implantInterventions} implant-related interventions across ${n(theory.planningHorizonYears)} years at your ${n(theory.implantReplacementYears)}-year cadence — intervention counts only, never a safety comparison.`);
    for (const e of r.approachEffects) lines.push(`${e.label}: ${e.note}`);
    lines.push(...r.notices);
    return lines.join(' ');
  }
  function render(state) {
    if (disposed) return;
    const theory = state.applicationsPerspective;
    for (const [id, key] of INPUTS) $(id).value = theory[key] ?? '';
    for (const [id, cb] of checkboxes) cb.checked = theory.selectedApproachIds.includes(id);
    const r = evaluateApplicationsTheory(theory);
    $('applications-result').textContent = r.status === 'unconfigured'
      ? `Hypothetical applications comparison: enter a planned fat-graft volume and a hypothetical resorption fraction to compute one-pass retention and intervention counts. ${r.notices[0]}`
      : formatResult(r, theory);
  }
  return { render, dispose() { if (!disposed) { disposed = true; listeners.forEach(remove => remove()); } } };
}
