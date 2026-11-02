import { getRecipeCatalog, getRecipesForMethod, getRecipesForCellSystem, getAdverseEvidenceForRecipe } from './method-recipes.js';
import { getEvidenceCatalog } from './cell-evidence.js';

/** Renders cited published-method reference cards: steps, parameters with source locators, endpoints, adverse evidence and limits. */
export function createMethodRecipesUI({ elements: $ }) {
  let disposed = false;
  const catalog = getRecipeCatalog(), evidence = getEvidenceCatalog();
  const sources = new Map(evidence.sources.map(s => [s.id, s]));
  const element = (tag, text) => { const e = document.createElement(tag); e.textContent = text; return e; };
  function render(state) {
    if (disposed) return;
    const box = $('method-recipes');
    const recipes = state.selectedMethodId ? getRecipesForMethod(state.selectedMethodId) : getRecipesForCellSystem(state.selectedCellSystemId);
    box.replaceChildren(element('p', catalog.notice));
    if (!recipes.length) { box.append(element('p', 'No published-method reference card applies to the current selection.')); return; }
    for (const recipe of recipes) {
      const card = document.createElement('article');
      card.append(element('h3', recipe.title));
      card.append(element('p', recipe.summary));
      for (const step of recipe.steps) {
        const section = document.createElement('section');
        section.append(element('h4', step.title));
        section.append(element('p', step.body));
        if (step.parameters.length) {
          const table = document.createElement('table');
          table.append(element('caption', 'Reported parameters — cited research description, not an instruction'));
          const head = document.createElement('tr'); head.append(element('th', 'Parameter'), element('th', 'Reported value'), element('th', 'Source and locator'));
          const thead = document.createElement('thead'); thead.append(head); table.append(thead);
          const body = document.createElement('tbody');
          for (const p of step.parameters) {
            const row = document.createElement('tr');
            row.append(element('td', p.name), element('td', `${p.value}${p.unit ? ` ${p.unit}` : ''}${p.note ? ` (${p.note})` : ''}`));
            const td = document.createElement('td');
            const s = sources.get(p.sourceId);
            const a = element('a', `${s.title} (${s.journalYear})`); a.href = s.fullTextUrl || s.url; a.target = '_blank'; a.rel = 'noreferrer';
            td.append(a, element('small', ` ${p.locator}`));
            row.append(td); body.append(row);
          }
          table.append(body); section.append(table);
        }
        card.append(section);
      }
      card.append(element('p', `Observed endpoints: ${recipe.observedEndpoints.join(' · ')}`));
      const adverse = getAdverseEvidenceForRecipe(recipe.id);
      if (adverse.length) {
        const warn = element('p', `Adverse evidence beside this method: ${adverse.map(c => c.statement).join(' ')}`);
        warn.className = 'warning';
        card.append(warn);
      }
      card.append(element('small', recipe.limitations.join(' ')));
      box.append(card);
    }
  }
  return { render, dispose() { disposed = true; } };
}