import test from 'node:test';
import assert from 'node:assert/strict';
import { WORKSPACE_AREAS, createWorkspaceShell, nextWorkspaceArea, normalizeWorkspaceArea } from '../src/workspace-shell.js';

test('workspace navigation validates areas and wraps keyboard movement', () => {
  assert.deepEqual(WORKSPACE_AREAS, ['studio', 'models', 'research', 'evidence']);
  for (const area of WORKSPACE_AREAS) assert.equal(normalizeWorkspaceArea(area), area);
  for (const value of [null, '', 'other', '__proto__', 1]) assert.equal(normalizeWorkspaceArea(value), null);
  assert.equal(nextWorkspaceArea('studio', 'ArrowRight'), 'models');
  assert.equal(nextWorkspaceArea('studio', 'ArrowLeft'), 'evidence');
  assert.equal(nextWorkspaceArea('evidence', 'ArrowRight'), 'studio');
  assert.equal(nextWorkspaceArea('models', 'Home'), 'studio');
  assert.equal(nextWorkspaceArea('models', 'End'), 'evidence');
  assert.equal(nextWorkspaceArea('models', 'Tab'), 'models');
  assert.throws(() => nextWorkspaceArea('bad', 'Home'));
});

class FakeElement {
  constructor(dataset = {}, title = '') {
    this.dataset = dataset; this.title = title; this.children = []; this.attributes = {};
    this.listeners = new Map(); this.hidden = false; this.id = ''; this.textContent = '';
  }
  addEventListener(name, fn) { this.listeners.set(name, fn); }
  removeEventListener(name) { this.listeners.delete(name); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  append(node) { this.children.push(node); }
  replaceChildren(...nodes) { this.children = nodes; }
  querySelector(selector) { return selector === 'h2' ? { textContent: this.title } : null; }
  closest(selector) { return selector === '[data-workspace-area]' ? this.area || null : null; }
  scrollIntoView() { this.scrolled = true; }
  focus() { this.focused = true; }
}

function harness() {
  const tabs = WORKSPACE_AREAS.map(area => new FakeElement({ workspaceTarget: area }));
  const panels = WORKSPACE_AREAS.map(area => { const p = new FakeElement({ workspaceArea: area }); p.id = `workspace-panel-${area}`; return p; });
  const cards = [new FakeElement({}, 'First question'), new FakeElement({}, 'Second question')];
  cards.forEach(card => { card.area = panels[2]; });
  const tablist = new FakeElement(), researchNav = new FakeElement();
  tablist.hidden = researchNav.hidden = true;
  const byId = new Map([...panels, ...cards].map(element => [element.id, element]));
  const root = {
    querySelectorAll(selector) {
      if (selector === '[data-workspace-target]') return tabs;
      if (selector === '[data-workspace-area]') return panels;
      if (selector === '.learning > article.panel') return cards;
      return [];
    },
    querySelector(selector) { return selector === '#workspace-tabs' ? tablist : selector === '#research-nav' ? researchNav : null; },
    getElementById(id) { return byId.get(id) || null; },
    createElement() { return new FakeElement(); },
  };
  return { root, tabs, panels, cards, tablist, researchNav };
}

test('shell hides inactive areas, navigates research and restores content on disposal', () => {
  const { root, tabs, panels, cards, tablist, researchNav } = harness();
  const changes = [], shell = createWorkspaceShell({ root, onAreaChange: area => changes.push(area) });
  assert.deepEqual(changes, ['studio']);
  assert.equal(tablist.hidden, false); assert.equal(researchNav.hidden, false);
  assert.deepEqual(panels.map(panel => panel.hidden), [false, true, true, true]);
  assert.deepEqual(cards.map(card => card.hidden), [false, true]);
  assert.equal(researchNav.children.length, 2);
  assert.equal(researchNav.children[0].textContent, 'First question');
  assert.equal(tabs[0].attributes['aria-selected'], 'true');
  tabs[0].listeners.get('keydown')({ key: 'ArrowRight', preventDefault() {} });
  assert.equal(shell.getState().activeArea, 'models');
  assert.equal(tabs[1].focused, true);
  shell.openResearchCard(cards[1].id);
  assert.equal(shell.getState().activeArea, 'research');
  assert.deepEqual(cards.map(card => card.hidden), [true, false]);
  assert.equal(researchNav.children[1].attributes['aria-pressed'], 'true');
  assert.throws(() => shell.activate('invalid'));
  assert.throws(() => shell.openResearchCard('invalid'));
  shell.dispose(); shell.dispose();
  assert.ok(panels.every(panel => !panel.hidden)); assert.ok(cards.every(card => !card.hidden));
  assert.equal(researchNav.children.length, 0); assert.equal(researchNav.hidden, true);
  assert.ok(tabs.every(tab => tab.listeners.size === 0));
  assert.throws(() => shell.activate('studio'), /disposed/);
});
