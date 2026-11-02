import { getTissueTargets, getGenomeRestoreIdea, evaluateTissueAtlas } from './tissue-atlas.js';
import { getEvidenceCatalog } from './cell-evidence.js';
import { getAgingEvidenceCatalog } from './aging-evidence.js';
import { getApplicationsEvidenceCatalog } from './applications-evidence.js';
import { getGeroscienceEvidenceCatalog } from './geroscience-evidence.js';
import { getTissueEvidenceCatalog } from './tissue-evidence.js';

/** Tissue-atlas panel: frontier targets with tiers and barriers, an unselectable aspiration entry, and the genome-restore ideas desk. Simulation-labeled. */
export function createTissueAtlasUI({ elements: $, onStateChange }) {
  if (typeof onStateChange !== 'function') throw new TypeError('Tissue atlas UI needs a state-change callback');
  let disposed = false;
  const listeners = [];
  const element = (tag, text) => { const e = document.createElement(tag); e.textContent = text; return e; };
  const claims = [...getEvidenceCatalog().claims, ...getAgingEvidenceCatalog().claims, ...getApplicationsEvidenceCatalog().claims, ...getGeroscienceEvidenceCatalog().claims, ...getTissueEvidenceCatalog().claims];
  const sources = new Map([...getEvidenceCatalog().sources, ...getAgingEvidenceCatalog().sources, ...getApplicationsEvidenceCatalog().sources, ...getGeroscienceEvidenceCatalog().sources, ...getTissueEvidenceCatalog().sources].map(s => [s.id, s]));
  const checkboxes = new Map();
  const box = $('atlas-targets');
  for (const t of getTissueTargets()) {
    const card = document.createElement('article');
    const label = document.createElement('label');
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = `atlas-target-${t.id}`;
    if (t.status === 'aspiration') { cb.disabled = true; }
    else { cb.addEventListener('change', proposeFromInputs); listeners.push(() => cb.removeEventListener('change', proposeFromInputs)); }
    checkboxes.set(t.id, cb);
    label.append(cb, element('span', `${t.label} — ${t.region} · tier: ${t.status}`));
    card.append(label, element('small', `Barriers: ${t.barriers.join(' ')}`), element('small', `Open question: ${t.openQuestion}`));
    if (t.aspirationNote) card.append(element('small', t.aspirationNote));
    const anchors = document.createElement('ul');
    for (const id of t.anchorClaimIds) {
      const c = claims.find(c => c.id === id), s = sources.get(c.sourceId);
      const li = element('li', `Anchor (${c.species}): ${c.statement} `);
      const a = element('a', `${s.title} (${s.journalYear})`); a.href = s.fullTextUrl || s.url; a.target = '_blank'; a.rel = 'noreferrer';
      li.append(a, element('small', ` ${c.locator}`)); anchors.append(li);
    }
    card.append(anchors);
    box.append(card);
  }
  const idea = getGenomeRestoreIdea();
  const ideaCard = document.createElement('article');
  ideaCard.append(element('h3', `Ideas desk — ${idea.label}`));
  for (const step of idea.steps) {
    ideaCard.append(element('p', `${step.label} — verdict: ${step.verdict}. ${step.note}`));
  }
  ideaCard.append(element('small', idea.notices.join(' ')));
  box.append(ideaCard);
  function proposeFromInputs() {
    if (disposed) return;
    const selectedTargetIds = [...checkboxes.entries()].filter(([, cb]) => cb.checked).map(([id]) => id);
    $('atlas-status').textContent = 'Atlas selection proposed. Simulation-labeled teaching view — never a clinical readiness claim.';
    onStateChange({ tissueAtlas: { selectedTargetIds } });
  }
  function render(state) {
    if (disposed) return;
    const atlas = state.tissueAtlas;
    for (const [id, cb] of checkboxes) { if (!cb.disabled) cb.checked = atlas.selectedTargetIds.includes(id); }
    const r = evaluateTissueAtlas(atlas);
    if (r.status !== 'explored') {
      $('atlas-result').textContent = `Frontier-target atlas: select targets to see their tiers and barriers together. ${r.notices[0]}`;
      return;
    }
    const lines = [`Atlas view of ${r.selected.length} selected target(s):`];
    for (const s of r.selected) lines.push(`${s.label} [${s.status}] — barriers: ${s.barriers.join(' ')} Open question: ${s.openQuestion}`);
    lines.push(r.summary);
    lines.push(...r.notices);
    $('atlas-result').textContent = lines.join(' ');
  }
  return { render, dispose() { if (!disposed) { disposed = true; listeners.forEach(remove => remove()); } } };
}
