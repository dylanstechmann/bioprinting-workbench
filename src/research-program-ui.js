import { getProgramNodes, evaluateResearchProgram } from './research-program.js';
import { getEvidenceCatalog } from './cell-evidence.js';
import { getAgingEvidenceCatalog } from './aging-evidence.js';
import { getApplicationsEvidenceCatalog } from './applications-evidence.js';
import { getGeroscienceEvidenceCatalog } from './geroscience-evidence.js';

/** Simulation-labeled research-program panel: BUILD/STACK/INFER over a literature-anchored node catalog. */
export function createResearchProgramUI({ elements: $, onStateChange }) {
  if (typeof onStateChange !== 'function') throw new TypeError('Research program UI needs a state-change callback');
  let disposed = false;
  const listeners = [];
  const element = (tag, text) => { const e = document.createElement(tag); e.textContent = text; return e; };
  const claims = [...getEvidenceCatalog().claims, ...getAgingEvidenceCatalog().claims, ...getApplicationsEvidenceCatalog().claims, ...getGeroscienceEvidenceCatalog().claims];
  const sources = new Map([...getEvidenceCatalog().sources, ...getAgingEvidenceCatalog().sources, ...getApplicationsEvidenceCatalog().sources, ...getGeroscienceEvidenceCatalog().sources].map(s => [s.id, s]));
  const checkboxes = new Map();
  function claimRow(id, kind) {
    const c = claims.find(c => c.id === id), s = sources.get(c.sourceId);
    const li = element('li', `${kind === 'adverse' ? 'Adverse/limiting evidence: ' : 'Measured anchor: '}${c.statement} `);
    const a = element('a', `${s.title} (${s.journalYear})`); a.href = s.fullTextUrl || s.url; a.target = '_blank'; a.rel = 'noreferrer';
    li.append(a, element('small', ` ${c.locator} · ${c.supportStatus}, agent-source-reading · tier context: ${c.species}`));
    return li;
  }
  const box = $('program-nodes');
  for (const n of getProgramNodes()) {
    const card = document.createElement('article');
    const label = document.createElement('label');
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = `program-node-${n.id}`;
    cb.addEventListener('change', proposeFromInputs); listeners.push(() => cb.removeEventListener('change', proposeFromInputs)); checkboxes.set(n.id, cb);
    label.append(cb, element('span', `${n.label} — ${n.layer} · evidence tier: ${n.tier}`));
    card.append(label, element('p', n.inference), element('small', `Open question: ${n.openQuestions[0]}`));
    const anchors = document.createElement('ul');
    for (const id of n.anchorClaimIds) anchors.append(claimRow(id, 'anchor'));
    for (const id of n.adverseClaimIds) anchors.append(claimRow(id, 'adverse'));
    if (anchors.children.length) card.append(anchors);
    if (n.dependencyIds.length) card.append(element('small', `Stacks on: ${n.dependencyIds.join(', ')}.`));
    box.append(card);
  }
  function proposeFromInputs() {
    if (disposed) return;
    const selectedNodeIds = [...checkboxes.entries()].filter(([, cb]) => cb.checked).map(([id]) => id);
    $('program-status').textContent = 'Simulation program inputs proposed. Study-planning hypothesis only — no funding, protocol, treatment or safety assessment.';
    onStateChange({ researchProgram: { selectedNodeIds } });
  }
  function formatResult(r) {
    const lines = [];
    lines.push(`BUILD — selected: ${r.selected.map(s => `${s.label} (${s.tier})`).join('; ') || 'none'}.`);
    if (r.prerequisites.length) lines.push(`STACK — prerequisites your selection pulls in: ${r.prerequisites.map(p => `${p.label} (${p.tier}, required by ${p.requiredBy.map(id => id).join(', ')})`).join('; ')}.`);
    else lines.push('STACK — no prerequisites beyond your selection.');
    lines.push(`Program evidence floor: ${r.programFloor} — the weakest-strongest tier in your stack; every claim above that floor is a hypothesis, not a finding.`);
    lines.push('INFER — first-order inferences:');
    for (const i of r.inferences) lines.push(`  ${i.id}: ${i.inference}`);
    lines.push(`Open questions your program must answer: ${r.openQuestions.map(q => q.id).join(', ')}.`);
    lines.push(...r.notices);
    return lines.join(' ');
  }
  function render(state) {
    if (disposed) return;
    const program = state.researchProgram;
    for (const [id, cb] of checkboxes) cb.checked = program.selectedNodeIds.includes(id);
    const r = evaluateResearchProgram(program);
    $('program-result').textContent = r.status === 'unconfigured'
      ? `Hypothetical research program: select program nodes to design a study-planning stack. ${r.notices[1]}`
      : formatResult(r);
  }
  return { render, dispose() { if (!disposed) { disposed = true; listeners.forEach(remove => remove()); } } };
}
