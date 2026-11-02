import { GENOME_RESTORE_STEPS, evaluateGenomeRestoreIdea, getGenomeRestoreCatalog } from './genome-restore.js';

/** Genome-backup-and-restore idea desk: step selection, computed verdicts, quoted anchors.
 * The verdicts come from the module's fetched-evidence catalog; this UI upgrades nothing. */
export function createGenomeRestoreUI({ elements: $, onStateChange }) {
  if (typeof onStateChange !== 'function') throw new TypeError('Genome restore UI needs a state-change callback');
  let disposed = false;
  const listeners = [];
  const element = (tag, text) => { const e = document.createElement(tag); e.textContent = text; return e; };
  const catalog = getGenomeRestoreCatalog();
  const boxes = new Map();
  const list = $('genome-restore-steps');
  for (const step of GENOME_RESTORE_STEPS) {
    const label = document.createElement('label');
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = `genome-step-${step.id}`; cb.value = step.id;
    cb.addEventListener('change', propose); listeners.push(() => cb.removeEventListener('change', propose));
    boxes.set(step.id, cb);
    label.append(cb, element('span', step.label)); list.append(label);
  }
  const evidence = $('genome-restore-evidence');
  if (evidence) {
    const byId = new Map(catalog.sources.map(x => [x.id, x]));
    for (const c of catalog.claims.filter(x => x.step === 'context')) {
      const source = byId.get(c.sourceId);
      const li = document.createElement('li');
      li.append(element('blockquote', c.verbatimQuote), element('small', `${c.statement} — ${c.locator} · research context, agent-source-reading · ${source.journalYear}, doi:${source.doi}`));
      evidence.append(li);
    }
  }
  function propose() {
    if (disposed) return;
    onStateChange({ genomeRestoreIdea: { selectedStepIds: [...boxes.entries()].filter(([, cb]) => cb.checked).map(([id]) => id) } });
  }
  function render(state) {
    if (disposed) return;
    const selection = state.genomeRestoreIdea;
    for (const [id, cb] of boxes) cb.checked = selection.selectedStepIds.includes(id);
    const result = evaluateGenomeRestoreIdea(selection);
    const box = $('genome-restore-result');
    if (result.status !== 'explored') {
      box.textContent = 'No steps selected: this shows nothing yet. The idea desk is an honest-assessment tool, not a procedure.';
      return;
    }
    box.replaceChildren();
    for (const step of result.selectedSteps) {
      const card = document.createElement('article');
      card.append(element('h3', `${step.label} — verdict: ${step.verdict.replace(/-/g, ' ')}`));
      const anchors = document.createElement('ul');
      for (const a of step.anchors) {
        const li = document.createElement('li');
        li.append(element('blockquote', a.quote), element('small', `${a.statement} — ${a.locator} · agent-source-reading`));
        anchors.append(li);
      }
      card.append(anchors);
      const blockers = element('p', `Blockers: ${step.blockers.join(' ')}`);
      card.append(blockers);
      box.append(card);
    }
    box.append(element('p', result.summary));
  }
  return { render, dispose() { if (!disposed) { disposed = true; listeners.forEach(remove => remove()); } } };
}
