import { evaluateCrossReference, defaultCrossReference, validateCrossReferenceRecord, CROSS_REFERENCE_NOTICES } from './cross-reference.js';

/** Cross-reference view: your storyboard knobs projected through YOUR hypothetical scales into
 * the two audited physics references. Identity re-parameterization, no coupling, no claims. */
export function createCrossReferenceUI({ elements: $, onStateChange = () => {}, getStoryboard, getNozzle, getVascular }) {
  if (typeof getStoryboard !== 'function' || typeof getNozzle !== 'function' || typeof getVascular !== 'function') throw new TypeError('The cross-reference needs storyboard and reference getters');
  let state = defaultCrossReference();
  const element = (tag, text) => { const e = document.createElement(tag); e.textContent = text; return e; };
  const inputs = {
    enabled: $('crossref-enabled'), flow: $('crossref-flow-scale'), radius: $('crossref-radius-scale'),
    consumption: $('crossref-consumption-scale'), layer: $('crossref-layer-scale'),
  };
  function propose() {
    try {
      state = validateCrossReferenceRecord({ enabled: inputs.enabled.checked, parameterOrigin: 'hypothetical-controls', settings: { flowScaleMm3PerS: Number(inputs.flow.value), radiusScaleUm: Number(inputs.radius.value), consumptionScaleMolPerM3S: Number(inputs.consumption.value), layerScaleUm: Number(inputs.layer.value) } });
      $('crossref-status').textContent = 'Mapping recomputed from your scales. Teaching juxtaposition only; nothing else in the workbench changed.';
    } catch (error) {
      $('crossref-status').textContent = 'Previous mapping retained. ' + error.message;
    }
    render(); onStateChange();
  }
  for (const input of Object.values(inputs)) input.addEventListener('change', propose);
  function render() {
    inputs.enabled.checked = state.enabled;
    inputs.flow.value = state.settings.flowScaleMm3PerS;
    inputs.radius.value = state.settings.radiusScaleUm;
    inputs.consumption.value = state.settings.consumptionScaleMolPerM3S;
    inputs.layer.value = state.settings.layerScaleUm;
    const values = $('crossref-values');
    values.replaceChildren();
    if (!state.enabled) {
      const tr = document.createElement('tr'); tr.append(element('th', 'Status'), element('td', 'The cross-reference is off. The references stay independent by default; enabling changes no model, it only juxtaposes mapped copies under your scales.')); values.append(tr);
      $('crossref-notice').replaceChildren(element('p', CROSS_REFERENCE_NOTICES[1]));
      return;
    }
    let result;
    try {
      result = evaluateCrossReference(state, getNozzle(), getVascular(), getStoryboard());
    } catch (error) {
      const tr = document.createElement('tr'); tr.append(element('th', 'Status'), element('td', 'Mapping present, but a mapped input is outside a reference validator: ' + error.message)); values.append(tr);
      return;
    }
    if (result.status !== 'mapped') { const tr = document.createElement('tr'); tr.append(element('th', 'Status'), element('td', 'Mapping disabled.')); values.append(tr); return; }
    const rows = [
      ['Mapped flow from perfusion', `${result.mapped.flowMm3PerS.toFixed(3)} mm\u00b3/s \u2192 wall shear ${result.shear.tauPa.toFixed(1)} Pa (${result.shear.laminar ? 'laminar idealization holds' : 'laminar idealization flagged'})`],
      ['Mapped channel radius from spacing', `${result.mapped.channelRadiusUm.toFixed(0)} \u00b5m \u2192 Krogh critical radius ${result.supply.kroghCriticalRadiusUm === null ? 'not limiting at the 10 mm cap' : result.supply.kroghCriticalRadiusUm.toFixed(0) + ' \u00b5m'} (planar ${result.supply.planarLimitUm.toFixed(0)} \u00b5m; cited band ${result.supply.bandUm.join('\u2013')} as context)`],
      ['Mapped consumption from population', `${result.mapped.consumptionMolPerM3S.toExponential(2)} mol/m\u00b3\u00b7s`],
      ['Mapped thickness from layers', `${result.mapped.constructThicknessUm.toFixed(0)} \u00b5m`],
      ...result.teaching.verdicts.map(v => ['Teaching comparison', v]),
    ];
    for (const [k, v] of rows) { const tr = document.createElement('tr'); tr.append(element('th', k), element('td', v)); values.append(tr); }
    $('crossref-notice').replaceChildren(...result.notices.map(n => element('p', n)));
  }
  render();
  return { getState: () => structuredClone(state), setState(next) { state = validateCrossReferenceRecord(next); render(); } };
}
