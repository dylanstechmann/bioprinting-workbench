import { getMechanismCatalog, evaluateExpansionTheory } from './acceleration-theory.js';
import { getEvidenceCatalog } from './cell-evidence.js';

/** Simulation-labeled expansion-theory panel: mechanism cards with measured anchors, hypothetical inputs and a transparent arithmetic decomposition. */
export function createExpansionTheoryUI({ elements: $, onStateChange }) {
  if (typeof onStateChange !== 'function') throw new TypeError('Expansion theory UI needs a state-change callback');
  let disposed = false;
  const listeners = [];
  const element = (tag, text) => { const e = document.createElement(tag); e.textContent = text; return e; };
  const catalog = getMechanismCatalog(), evidence = getEvidenceCatalog();
  const sources = new Map(evidence.sources.map(s => [s.id, s]));
  const INPUTS = [['expansion-start', 'startCells'], ['expansion-target', 'targetCells'], ['expansion-doubling', 'doublingHours'], ['expansion-overhead', 'overheadHours'], ['expansion-split', 'splitRatio'], ['expansion-attrition', 'attritionFraction'], ['expansion-rescued', 'attritionRescuedFraction'], ['expansion-medium', 'mediumPdtMultiplier'], ['expansion-fork', 'forkCycleMultiplier']];
  const checkboxes = new Map();
  function claimRow(id, kind) {
    const c = evidence.claims.find(c => c.id === id), s = sources.get(c.sourceId);
    const li = element('li', `${kind === 'adverse' ? 'Adverse evidence: ' : 'Measured anchor: '}${c.statement} `);
    const a = element('a', `${s.title} (${s.journalYear})`); a.href = s.fullTextUrl || s.url; a.target = '_blank'; a.rel = 'noreferrer';
    li.append(a, element('small', ` ${c.locator} · ${c.supportStatus}, agent-source-reading`));
    return li;
  }
  const cards = $('expansion-mechanisms');
  for (const m of catalog) {
    const card = document.createElement('article');
    const label = document.createElement('label');
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = `expansion-mech-${m.id}`;
    if (!m.selectable) { cb.disabled = true; label.className = 'excluded-lever'; }
    else { cb.addEventListener('change', proposeFromInputs); listeners.push(() => cb.removeEventListener('change', proposeFromInputs)); checkboxes.set(m.id, cb); }
    label.append(cb, element('span', m.selectable ? m.label : `${m.label} — shown, never selectable`));
    card.append(label, element('p', m.measuredSummary), element('small', m.theoryNote));
    const anchors = document.createElement('ul');
    for (const id of m.anchorClaimIds) anchors.append(claimRow(id, 'anchor'));
    for (const id of m.adverseClaimIds) anchors.append(claimRow(id, 'adverse'));
    if (anchors.children.length) card.append(anchors);
    cards.append(card);
  }
  for (const [id] of INPUTS) { const el = $(id); el.addEventListener('change', proposeFromInputs); listeners.push(() => el.removeEventListener('change', proposeFromInputs)); }
  function proposeFromInputs() {
    if (disposed) return;
    const optional = id => $(id).value.trim() === '' ? null : Number($(id).value);
    const selectedMechanismIds = [...checkboxes.entries()].filter(([, cb]) => cb.checked).map(([id]) => id);
    $('expansion-status').textContent = 'Simulation-theory inputs proposed. Hypothetical arithmetic only — no laboratory action, treatment or safety assessment.';
    onStateChange({ expansionTheory: { startCells: optional('expansion-start'), targetCells: optional('expansion-target'), doublingHours: optional('expansion-doubling'), overheadHours: optional('expansion-overhead'), splitRatio: optional('expansion-split'), attritionFraction: optional('expansion-attrition'), attritionRescuedFraction: optional('expansion-rescued'), mediumPdtMultiplier: optional('expansion-medium'), forkCycleMultiplier: optional('expansion-fork'), selectedMechanismIds } });
  }
  function formatResult(r, theory) {
    const n = v => v.toLocaleString('en-US', { maximumFractionDigits: 2 });
    const lines = [];
    lines.push(`Doublings needed: ${n(r.pureDoublings)} (${theory.startCells.toLocaleString('en-US')} → ${theory.targetCells.toLocaleString('en-US')} cells).`);
    lines.push(`Passages: ${r.passages} at 1:${theory.splitRatio ?? 4} split (${n(r.doublingsPerPassage)} doublings each).`);
    lines.push(r.attritionExtraDoublings > 0 ? `Attrition adds ${n(r.attritionExtraDoublings)} replacement doublings (fraction used ${r.attritionFractionUsed}; baseline ${r.baselineAttritionFraction}).` : 'No attrition cost modeled (fraction 1).');
    lines.push(`Cycling: ${n(r.effectiveDoublings)} doublings × ${n(r.cycleHours)} h = ${n(r.cyclingHours)} h. Overhead: ${r.passages} × ${n(theory.overheadHours ?? 0)} h = ${n(r.overheadTotalHours)} h.`);
    lines.push(`Simulation-theory total: ${n(r.totalHours)} h (~${n(r.totalHours / 24)} days) versus ${n(r.baselineTotalHours)} h without the selected mechanisms.`);
    for (const d of r.assumedDefaults) lines.push(d);
    for (const e of r.mechanismEffects) lines.push(`${e.label}: ${e.hoursSaved === null ? '' : `${n(e.hoursSaved)} h saved (first-order). `}${e.note}`);
    lines.push(...r.notices);
    return lines.join(' ');
  }
  function render(state) {
    if (disposed) return;
    const theory = state.expansionTheory;
    for (const [id, key] of INPUTS) $(id).value = theory[key] ?? '';
    for (const [id, cb] of checkboxes) cb.checked = theory.selectedMechanismIds.includes(id);
    const r = evaluateExpansionTheory(theory);
    $('expansion-result').textContent = r.status === 'unconfigured'
      ? `Hypothetical expansion theory: enter starting cells, target cells and a hypothetical doubling time to compute a decomposition. ${r.notices[0]}`
      : formatResult(r, theory);
  }
  return { render, dispose() { if (!disposed) { disposed = true; listeners.forEach(remove => remove()); } } };
}