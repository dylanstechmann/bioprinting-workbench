export const WORKSPACE_AREAS = Object.freeze(['studio', 'models', 'research', 'evidence']);

export function normalizeWorkspaceArea(value) {
  return typeof value === 'string' && WORKSPACE_AREAS.includes(value) ? value : null;
}

export function nextWorkspaceArea(current, key) {
  const area = normalizeWorkspaceArea(current);
  if (!area) throw new RangeError('Unknown workspace area');
  const index = WORKSPACE_AREAS.indexOf(area);
  if (key === 'Home') return WORKSPACE_AREAS[0];
  if (key === 'End') return WORKSPACE_AREAS.at(-1);
  if (key === 'ArrowRight') return WORKSPACE_AREAS[(index + 1) % WORKSPACE_AREAS.length];
  if (key === 'ArrowLeft') return WORKSPACE_AREAS[(index - 1 + WORKSPACE_AREAS.length) % WORKSPACE_AREAS.length];
  return area;
}

/** Progressive enhancement only. Existing controls and scientific content never change. */
export function createWorkspaceShell({ root = document, onAreaChange = () => {} } = {}) {
  if (!root?.querySelector || typeof onAreaChange !== 'function') throw new TypeError('Workspace shell needs a root and callback');
  const tabs = [...root.querySelectorAll('[data-workspace-target]')];
  const panels = [...root.querySelectorAll('[data-workspace-area]')];
  const tablist = root.querySelector('#workspace-tabs');
  const researchNav = root.querySelector('#research-nav');
  if (!tablist || tabs.length !== WORKSPACE_AREAS.length || panels.length !== WORKSPACE_AREAS.length) throw new Error('Workspace markup is incomplete');
  for (const area of WORKSPACE_AREAS) {
    if (tabs.filter(tab => tab.dataset.workspaceTarget === area).length !== 1 || panels.filter(panel => panel.dataset.workspaceArea === area).length !== 1) throw new Error(`Missing ${area} workspace`);
  }
  const cards = [...root.querySelectorAll('.learning > article.panel')];
  const cardButtons = new Map(), listeners = [];
  let activeArea = 'studio', activeResearchCardId = null, disposed = false;
  const listen = (target, name, handler) => { target.addEventListener(name, handler); listeners.push(() => target.removeEventListener(name, handler)); };
  const setHash = id => {
    if (!globalThis.location || !globalThis.history?.replaceState) return;
    const base = `${globalThis.location.pathname}${globalThis.location.search}`;
    globalThis.history.replaceState(null, '', id ? `${base}#${id}` : base);
  };
  function showResearchCard(id) {
    if (!cards.length) return;
    const card = cards.find(element => element.id === id) || cards[0];
    activeResearchCardId = card.id;
    for (const element of cards) element.hidden = element !== card;
    for (const [cardId, button] of cardButtons) button.setAttribute('aria-pressed', String(cardId === activeResearchCardId));
  }
  function activate(area, { focus = false, updateHash = false, scroll = false } = {}) {
    if (disposed) throw new Error('Workspace shell is disposed');
    const normalized = normalizeWorkspaceArea(area);
    if (!normalized) throw new RangeError('Unknown workspace area');
    activeArea = normalized;
    for (const panel of panels) panel.hidden = panel.dataset.workspaceArea !== normalized;
    for (const tab of tabs) {
      const selected = tab.dataset.workspaceTarget === normalized;
      tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    }
    if (updateHash) setHash(normalized === 'studio' ? '' : normalized);
    if (scroll) tablist.scrollIntoView({ block: 'start', behavior: 'auto' });
    onAreaChange(normalized);
  }
  function openResearchCard(id, { focus = false, updateHash = false, scroll = false } = {}) {
    if (disposed || !cards.some(card => card.id === id)) throw new RangeError('Unknown research card');
    showResearchCard(id); activate('research');
    if (updateHash) setHash(id);
    if (scroll) researchNav?.scrollIntoView({ block: 'start', behavior: 'auto' });
    if (focus) cardButtons.get(id)?.focus();
  }

  for (const tab of tabs) {
    const area = tab.dataset.workspaceTarget;
    tab.id = `workspace-tab-${area}`; tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', `workspace-panel-${area}`);
    listen(tab, 'click', () => activate(area, { updateHash: true }));
    listen(tab, 'keydown', event => {
      if (!['Home', 'End', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault(); activate(nextWorkspaceArea(activeArea, event.key), { focus: true, updateHash: true });
    });
  }
  for (const panel of panels) {
    panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', `workspace-tab-${panel.dataset.workspaceArea}`);
  }
  for (const [index, card] of cards.entries()) {
    if (!card.id) card.id = `research-module-${index + 1}`;
    const title = card.querySelector('h2')?.textContent?.trim();
    if (!title || !researchNav) continue;
    const button = root.createElement('button');
    button.type = 'button'; button.textContent = title; button.setAttribute('aria-controls', card.id); button.setAttribute('aria-pressed', 'false');
    listen(button, 'click', () => openResearchCard(card.id, { updateHash: true, scroll: true }));
    researchNav.append(button); cardButtons.set(card.id, button);
  }
  if (cards[0]) showResearchCard(cards[0].id);
  function activateFromHash() {
    const id = globalThis.location?.hash?.slice(1) || '';
    if (!id) { activate('studio'); return; }
    if (normalizeWorkspaceArea(id)) { activate(id); return; }
    const target = root.getElementById(id), area = target?.closest?.('[data-workspace-area]')?.dataset.workspaceArea;
    if (!area) return;
    if (cards.some(card => card.id === id)) showResearchCard(id);
    activate(area);
  }
  if (globalThis.addEventListener) listen(globalThis, 'hashchange', activateFromHash);
  tablist.hidden = false;
  if (researchNav) researchNav.hidden = false;
  activateFromHash();
  return {
    activate, openResearchCard,
    getState: () => ({ activeArea, activeResearchCardId }),
    dispose() {
      if (disposed) return;
      disposed = true; listeners.splice(0).forEach(remove => remove());
      for (const panel of panels) panel.hidden = false;
      for (const card of cards) card.hidden = false;
      researchNav?.replaceChildren();
      if (researchNav) researchNav.hidden = true;
      tablist.hidden = true;
    },
  };
}
