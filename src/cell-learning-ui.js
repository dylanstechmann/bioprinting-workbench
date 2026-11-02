import { CELL_TYPE_IDS, getCellProfile, getTimingObservations, getClaimsForCell, getEvidenceCatalog } from './cell-evidence.js';
import { defaultLearningState, validateLearningState, evaluateRelativeDivision } from './cell-division.js';
import { getOrganResearchSummary } from './organ-research.js';
import { defaultCellSystemId } from './repair-research.js';
import { createRepairResearchUI } from './repair-research-ui.js';
import { createMethodRecipesUI } from './method-recipes-ui.js';
import { createExpansionTheoryUI } from './acceleration-theory-ui.js';
import { createLongevityTheoryUI } from './longevity-theory-ui.js';
import { createApplicationsUI } from './applications-ui.js';
import { createResearchProgramUI } from './research-program-ui.js';
import { createHardwareCostsUI } from './hardware-costs-ui.js';
import { createTissueAtlasUI } from './tissue-atlas-ui.js';
import { createGenomeRestoreUI } from './genome-restore-ui.js';

/** Single state owner: coordinates division arithmetic, research comparison and recipe subcontrollers. */
export function createCellLearningUI({ elements: $, onStateChange = () => {} }) {
  let state = defaultLearningState(), disposed = false;
  const listeners = [];
  const element = (tag, text) => { const e = document.createElement(tag); e.textContent = text; return e; };
  const catalog = getEvidenceCatalog();
  const select = $('learning-cell');
  select.replaceChildren(...CELL_TYPE_IDS.map(id => { const option = element('option', getCellProfile(id).label); option.value = id; return option; }));
  const researchUI = createRepairResearchUI({ elements: $, onSelectionChange: patch => propose(patch), onComparisonChange: comparison => propose({ planningComparison: comparison }) });
  const recipesUI = createMethodRecipesUI({ elements: $ });
  const expansionUI = createExpansionTheoryUI({ elements: $, onStateChange: patch => propose(patch) });
  const longevityUI = createLongevityTheoryUI({ elements: $, onStateChange: patch => propose(patch) });
  const applicationsUI = createApplicationsUI({ elements: $, onStateChange: patch => propose(patch) });
  const programUI = createResearchProgramUI({ elements: $, onStateChange: patch => propose(patch) });
  const hardwareUI = createHardwareCostsUI({ elements: $, onStateChange: patch => propose(patch) });
  const atlasUI = createTissueAtlasUI({ elements: $, onStateChange: patch => propose(patch) });
  const genomeUI = createGenomeRestoreUI({ elements: $, onStateChange: patch => propose(patch) });
  function render() {
    const p = getCellProfile(state.selectedCellType), result = evaluateRelativeDivision(state.division);
    select.value = p.id;
    $('learning-doublings').value = state.division.doublings;
    $('learning-hours').value = state.division.hypotheticalDoublingHours ?? '';
    $('learning-horizon').value = state.researchHorizonYears ?? '';
    const box = $('learning-profile'); box.replaceChildren(element('h3', p.label), element('p', p.roles.join(' ')), element('p', p.cultureLocation));
    const table = document.createElement('table'); table.append(element('caption', 'Read-only timing evidence — not culture schedules'));
    const head = document.createElement('tr'); head.append(element('th', 'Metric'), element('th', 'Observation'), element('th', 'Context and limits')); const thead = document.createElement('thead'); thead.append(head); table.append(thead);
    const body = document.createElement('tbody');
    for (const t of getTimingObservations(p.id)) { const row = document.createElement('tr'); row.append(element('td', t.metric), element('td', t.hours ? `Approximately ${t.hours.min}–${t.hours.max} hours` : 'Not established from reviewed sources'), element('td', `${t.context} ${t.limitations.join(' ')}`)); body.append(row); }
    table.append(body); box.append(table);
    const list = document.createElement('ul');
    for (const c of getClaimsForCell(p.id)) {
      const li = element('li', `${c.statement} ${c.limitations.join(' ')} `), s = catalog.sources.find(s => s.id === c.sourceId);
      const a = element('a', `${s.title} (${s.journalYear})`); a.href = s.fullTextUrl || s.url; a.target = '_blank'; a.rel = 'noreferrer';
      li.append(a, element('small', ` ${c.locator} · ${c.supportStatus}, agent-source-reading · ${s.reviewedOn}`)); list.append(li);
    }
    box.append(list, element('p', p.uncertainties.join(' ')));
    $('learning-result').textContent = `Relative population: ${result.relativePopulation.toLocaleString('en-US', { maximumFractionDigits: 4 })} × starting population. ${result.hypotheticalElapsedHours === null ? 'Hypothetical elapsed time: not specified.' : `Arithmetic elapsed time: ${result.hypotheticalElapsedHours.toLocaleString('en-US')} hours under your assumption only.`} ${result.notice}`;
    $('learning-horizon-status').textContent = state.researchHorizonYears === null ? 'No research horizon specified. No organ completion time is calculated.' : `${state.researchHorizonYears} years is your research-planning annotation only. It changes no growth, oxygen, flow or storyboard value and establishes no whole-organ production timeline.`;
    researchUI.render(state);
    recipesUI.render(state);
    expansionUI.render(state);
    longevityUI.render(state);
    applicationsUI.render(state);
    programUI.render(state);
    hardwareUI.render(state);
    atlasUI.render(state);
    genomeUI.render(state);
  }
  function listen(id, event, handler) { const el = $(id); el.addEventListener(event, handler); listeners.push(() => el.removeEventListener(event, handler)); }
  function propose(patch) {
    if (disposed) return;
    try {
      state = validateLearningState({ ...state, ...patch });
      $('learning-status').textContent = 'Independent learning inputs updated. No laboratory action, treatment or safety assessment.';
      render(); onStateChange();
    } catch (error) { render(); $('learning-status').textContent = `Previous inputs retained. ${error.message}`; }
  }
  function update() {
    if (disposed) return;
    try {
      const optional = id => $(id).value.trim() === '' ? null : Number($(id).value);
      state = validateLearningState({ ...state, division: { ...state.division, doublings: Number($('learning-doublings').value), hypotheticalDoublingHours: optional('learning-hours') }, researchHorizonYears: optional('learning-horizon') });
      $('learning-status').textContent = 'Independent learning inputs updated. No laboratory action, treatment or safety assessment.';
      render(); onStateChange();
    } catch (error) { render(); $('learning-status').textContent = `Previous inputs retained. ${error.message}`; }
  }
  listen('learning-cell', 'change', () => propose({ selectedCellType: select.value, selectedCellSystemId: defaultCellSystemId(select.value), selectedMethodId: null }));
  for (const id of ['learning-doublings', 'learning-hours', 'learning-horizon']) listen(id, 'change', update);
  const organ = getOrganResearchSummary();
  $('organ-barriers').replaceChildren(element('p', organ.notice));
  for (const b of organ.barriers) { const card = document.createElement('article'); card.append(element('h3', b.label), element('p', b.missingEvidence.join(' ')), element('small', `Not modeled · depends on: ${b.dependencyIds.join(', ') || 'independent evidence'}. Dependency map is an authored teaching organization, not a proven fabrication order.`)); $('organ-barriers').append(card); }
  render();
  return { getState: () => structuredClone(state), setState(next) { if (disposed) throw new Error('Learning controller disposed'); state = validateLearningState(next); render(); }, diagnostics: () => ({ ...structuredClone(state), arithmetic: evaluateRelativeDivision(state.division) }), dispose() { if (!disposed) { disposed = true; listeners.forEach(remove => remove()); researchUI.dispose(); recipesUI.dispose(); expansionUI.dispose(); longevityUI.dispose(); applicationsUI.dispose(); programUI.dispose(); hardwareUI.dispose(); atlasUI.dispose(); genomeUI.dispose(); } } };
}