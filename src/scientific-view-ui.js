// Phase C presentation controls: plain-DOM, textContent-only rendering. Legends and notices
// stay visible text, never images of text, and unknown scale stays explicitly labelled.
import { defaultScientificViewState, validateScientificViewState, reduceScientificViewState } from './scientific-view-state.js';
import { getOverlayDefinitions } from './scientific-overlays.js';
import { presentationSpec } from './scientific-views.js';

export function createScientificViewUI({ elements: $, onStateChange = () => {}, getRuns = () => ({}) }) {
  let state = defaultScientificViewState();
  const listeners = [];
  const on = (target, name, fn) => { target.addEventListener(name, fn); listeners.push([target, name, fn]); };
  function emit() { onStateChange(validateScientificViewState(state)); }
  function renderNotice() {
    $('presentation-notice').textContent = presentationSpec(state.scale).notice;
  }
  function renderLegend() {
    const container = $('presentation-legend');
    container.replaceChildren();
    for (const overlayId of state.overlayIds) {
      const definition = getOverlayDefinitions().find(d => d.id === overlayId);
      const row = document.createElement('p');
      row.className = 'micro';
      row.textContent = `${definition.id} · unit ${definition.unit} · ${definition.legend}`;
      container.append(row);
    }
    if (!state.overlayIds.length) {
      const row = document.createElement('p');
      row.className = 'micro';
      row.textContent = 'No overlay active. Overlays are explicitly separate reference/field layers, never measurements painted on the scaffold.';
      container.append(row);
    }
  }
  function buildOverlayControls() {
    const container = $('presentation-overlay-list');
    container.replaceChildren();
    for (const definition of getOverlayDefinitions()) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = state.overlayIds.includes(definition.id);
      input.addEventListener('change', () => {
        try {
          state = reduceScientificViewState(state, { type: 'toggleOverlay', id: definition.id });
          renderLegend(); emit();
        } catch (error) {
          input.checked = state.overlayIds.includes(definition.id);
          $('presentation-selection').textContent = error.message;
        }
      });
      listeners.push([input, 'change', null]);
      label.append(input, document.createTextNode ? document.createTextNode(` ${definition.id}`) : ` ${definition.id}`);
      container.append(label);
    }
  }
  on($('presentation-scale'), 'change', () => {
    try {
      state = reduceScientificViewState(state, { type: 'setScale', scale: $('presentation-scale').value });
      renderNotice(); emit();
    } catch (error) {
      $('presentation-scale').value = state.scale;
      $('presentation-selection').textContent = error.message;
    }
  });
  on($('presentation-representation'), 'change', () => {
    try {
      state = reduceScientificViewState(state, { type: 'setRepresentation', representation: $('presentation-representation').value });
      emit();
    } catch (error) {
      $('presentation-representation').value = state.representation;
      $('presentation-selection').textContent = error.message;
    }
  });
  buildOverlayControls();
  renderNotice();
  renderLegend();
  void getRuns;
  return {
    getState: () => validateScientificViewState(state),
    setState(next) {
      state = validateScientificViewState(next);
      $('presentation-scale').value = state.scale;
      $('presentation-representation').value = state.representation;
      buildOverlayControls();
      renderNotice();
      renderLegend();
    },
    dispose() {
      for (const [target, name, fn] of listeners) if (fn) target.removeEventListener(name, fn);
      listeners.length = 0;
    },
  };
}
