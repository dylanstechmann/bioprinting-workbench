import { getRepairResearchCatalog, getCellSystems, getMethodsForCellSystem, getCellSystemEvidence } from './repair-research.js';
import { getEvidenceCatalog } from './cell-evidence.js';
import { evaluatePlanningComparison } from './planning-comparison.js';

/** Event-driven species/system/method comparison controller plus separate hypothetical-comparison inputs; never owns learning state. */
export function createRepairResearchUI({ elements: $, onSelectionChange, onComparisonChange }) {
  if (typeof onSelectionChange !== 'function' || typeof onComparisonChange !== 'function') throw new TypeError('Repair research UI needs proposal callbacks');
  let disposed = false;
  const listeners = [];
  const element = (tag, text) => { const e = document.createElement(tag); e.textContent = text; return e; };
  const research = getRepairResearchCatalog(), evidence = getEvidenceCatalog();
  const sources = new Map(evidence.sources.map(s => [s.id, s]));

  function render(state) {
    if (disposed) return;
    const systems = getCellSystems({ cellTypeId: state.selectedCellType });
    const bySpecies = new Map();
    for (const s of systems) { if (!bySpecies.has(s.speciesId)) bySpecies.set(s.speciesId, []); bySpecies.get(s.speciesId).push(s); }
    $('research-system').replaceChildren(...[...bySpecies.entries()].map(([species, list]) => {
      const group = document.createElement('optgroup'); group.label = list[0].speciesLabel;
      for (const s of list) { const option = element('option', s.label); option.value = s.id; group.append(option); }
      return group;
    }));
    $('research-system').value = state.selectedCellSystemId;
    const methods = getMethodsForCellSystem(state.selectedCellSystemId);
    const none = element('option', 'No method comparison selected'); none.value = '';
    $('research-method').replaceChildren(none, ...methods.map(m => { const o = element('option', m.label); o.value = m.id; return o; }));
    $('research-method').value = state.selectedMethodId ?? '';
    const box = $('research-evidence');
    const systemEvidence = getCellSystemEvidence(state.selectedCellSystemId);
    box.replaceChildren(element('p', research.notice));
    const head = document.createElement('article');
    head.append(element('h3', systemEvidence.system.label));
    head.append(element('p', `${systemEvidence.system.speciesLabel} species · ${systemEvidence.system.origin} origin · claims: ${systemEvidence.claims.length}; timing observations: ${systemEvidence.timings.length || 'none established for this system'}`));
    const claims = document.createElement('ul');
    for (const c of systemEvidence.claims) {
      const li = element('li', `${c.statement} ${c.limitations.join(' ')} `);
      const s = sources.get(c.sourceId);
      const a = element('a', `${s.title} (${s.journalYear})`); a.href = s.fullTextUrl || s.url; a.target = '_blank'; a.rel = 'noreferrer';
      li.append(a, element('small', ` ${c.locator} · ${c.supportStatus}, agent-source-reading · ${s.reviewedOn}`));
      claims.append(li);
    }
    head.append(claims);
    box.append(head);
    for (const m of methods) {
      const row = document.createElement('article');
      row.append(element('h4', m.label));
      row.append(element('p', `${m.mechanismSummary} Comparator: ${m.comparatorSummary}`));
      row.append(element('p', `Measured endpoints: ${m.measuredEndpoints.join(' · ')}`));
      row.append(element('p', `Not measured: ${m.unmeasuredEndpoints.join(' · ')}`));
      row.append(element('small', `Outcome: ${m.observedOutcome} · timeline evidence: ${m.timelineEvidence} · ${m.limitations.join(' ')}`));
      box.append(row);
    }
    if (!methods.length) box.append(element('p', 'No reviewed method comparison applies to this cell system yet.'));
    $('comparison-baseline').value = state.planningComparison.baselineHours ?? '';
    $('comparison-alternative').value = state.planningComparison.comparisonHours ?? '';
    const comparison = evaluatePlanningComparison(state.planningComparison);
    $('comparison-result').textContent = comparison.status === 'incomplete'
      ? `Hypothetical time comparison: enter two of your own durations. ${comparison.notice}`
      : `Hypothetical difference: ${comparison.differenceHours.toLocaleString('en-US')} hours (${comparison.relativeChangePercent.toFixed(1)}% of the baseline) under your assumptions only. ${comparison.notice}`;
  }

  function listen(id, event, handler) { const el = $(id); el.addEventListener(event, handler); listeners.push(() => el.removeEventListener(event, handler)); }
  listen('research-system', 'change', () => {
    if (disposed) return;
    $('research-status').textContent = 'Cell-system selection proposed; method comparison cleared because systems own their methods.';
    onSelectionChange({ selectedCellSystemId: $('research-system').value, selectedMethodId: null });
  });
  listen('research-method', 'change', () => {
    if (disposed) return;
    const value = $('research-method').value;
    onSelectionChange(value ? { selectedMethodId: value } : { selectedMethodId: null });
  });
  listen('comparison-baseline', 'change', onComparisonInput);
  listen('comparison-alternative', 'change', onComparisonInput);
  function onComparisonInput() {
    if (disposed) return;
    const optional = id => $(id).value.trim() === '' ? null : Number($(id).value);
    onComparisonChange({ baselineHours: optional('comparison-baseline'), comparisonHours: optional('comparison-alternative') });
  }
  return { render, dispose() { if (!disposed) { disposed = true; listeners.forEach(remove => remove()); } } };
}