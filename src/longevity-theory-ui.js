import { getBarrierCatalog, evaluateLongevityTheory } from './longevity-theory.js';
import { getEvidenceCatalog } from './cell-evidence.js';
import { getAgingEvidenceCatalog } from './aging-evidence.js';

/** Simulation-labeled longevity panel: barrier cards with measured anchors, hypothetical inputs and a transparent ceiling/logistics decomposition. */
export function createLongevityTheoryUI({ elements: $, onStateChange }) {
  if (typeof onStateChange !== 'function') throw new TypeError('Longevity theory UI needs a state-change callback');
  let disposed = false;
  const listeners = [];
  const element = (tag, text) => { const e = document.createElement(tag); e.textContent = text; return e; };
  const catalog = getBarrierCatalog();
  const cellEvidence = getEvidenceCatalog(), agingEvidence = getAgingEvidenceCatalog();
  const claims = [...cellEvidence.claims, ...agingEvidence.claims];
  const sources = new Map([...cellEvidence.sources, ...agingEvidence.sources].map(s => [s.id, s]));
  const INPUTS = [['longevity-fraction', 'singleOrganFailureFraction'], ['longevity-organs', 'replacedOrganCount'], ['longevity-cadence', 'replacementCadenceYears'], ['longevity-horizon', 'planningHorizonYears']];
  const checkboxes = new Map();
  function claimRow(id, kind) {
    const c = claims.find(c => c.id === id), s = sources.get(c.sourceId);
    const li = element('li', `${kind === 'adverse' ? 'Adverse evidence: ' : 'Measured anchor: '}${c.statement} `);
    const a = element('a', `${s.title} (${s.journalYear})`); a.href = s.fullTextUrl || s.url; a.target = '_blank'; a.rel = 'noreferrer';
    li.append(a, element('small', ` ${c.locator} · ${c.supportStatus}, agent-source-reading · ${c.species === 'mouse' ? 'mouse study — never transferred to human outcomes' : c.modelContext}`));
    return li;
  }
  const cards = $('longevity-barriers');
  for (const b of catalog) {
    const card = document.createElement('article');
    const label = document.createElement('label');
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = `longevity-barrier-${b.id}`;
    if (!b.selectable) { cb.disabled = true; label.className = 'excluded-lever'; }
    else { cb.addEventListener('change', proposeFromInputs); listeners.push(() => cb.removeEventListener('change', proposeFromInputs)); checkboxes.set(b.id, cb); }
    label.append(cb, element('span', b.selectable ? b.label : `${b.label} — shown, never selectable`));
    card.append(label, element('p', b.measuredSummary), element('small', b.theoryNote));
    const anchors = document.createElement('ul');
    for (const id of b.anchorClaimIds) anchors.append(claimRow(id, 'anchor'));
    for (const id of b.adverseClaimIds) anchors.append(claimRow(id, 'adverse'));
    if (anchors.children.length) card.append(anchors);
    cards.append(card);
  }
  for (const [id] of INPUTS) { const el = $(id); el.addEventListener('change', proposeFromInputs); listeners.push(() => el.removeEventListener('change', proposeFromInputs)); }
  function proposeFromInputs() {
    if (disposed) return;
    const optional = id => $(id).value.trim() === '' ? null : Number($(id).value);
    const selectedBarrierIds = [...checkboxes.entries()].filter(([, cb]) => cb.checked).map(([id]) => id);
    $('longevity-status').textContent = 'Simulation-theory inputs proposed. Hypothetical arithmetic only — no laboratory action, treatment or safety assessment.';
    onStateChange({ longevityPerspective: { singleOrganFailureFraction: optional('longevity-fraction'), replacedOrganCount: optional('longevity-organs'), replacementCadenceYears: optional('longevity-cadence'), planningHorizonYears: optional('longevity-horizon'), selectedBarrierIds } });
  }
  function formatResult(r, theory) {
    const n = v => v.toLocaleString('en-US', { maximumFractionDigits: 4 });
    const lines = [];
    lines.push(`Addressable ceiling: ${n(r.addressableCeiling)} of deaths — an absolute best case even if every printed-organ transplant worked perfectly and forever.`);
    lines.push(`Untouched in principle: ${n(r.unaffectedShare)} — systemic aging, multi-organ failure, neurodegeneration and cancer are not addressed by replacing single organs.`);
    if (r.totalReplacements !== null) lines.push(`Hypothetical schedule: ${theory.replacedOrganCount} organs × ${r.replacementsPerOrgan} replacements each = ${n(r.totalReplacements)} printed-organ transplants across ${n(theory.planningHorizonYears)} years (~${n(r.replacementsPerPersonYear)} per person-year). That is a factory plan, not a rejuvenation plan.`);
    for (const e of r.barrierEffects) lines.push(`${e.label}: ${e.note}`);
    lines.push(...r.notices);
    return lines.join(' ');
  }
  function render(state) {
    if (disposed) return;
    const theory = state.longevityPerspective;
    for (const [id, key] of INPUTS) $(id).value = theory[key] ?? '';
    for (const [id, cb] of checkboxes) cb.checked = theory.selectedBarrierIds.includes(id);
    const r = evaluateLongevityTheory(theory);
    $('longevity-result').textContent = r.status === 'unconfigured'
      ? `Hypothetical longevity theory: enter a hypothetical single-organ-failure fraction to compute the ceiling decomposition. ${r.notices[0]}`
      : formatResult(r, theory);
  }
  return { render, dispose() { if (!disposed) { disposed = true; listeners.forEach(remove => remove()); } } };
}
