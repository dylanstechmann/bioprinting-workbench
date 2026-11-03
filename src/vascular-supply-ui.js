import { evaluateVascularSupply, getVascularSupplyCatalog, defaultVascularSupply, validateVascularSupplyRecord } from './vascular-supply.js';

/** Krogh-supply reference panel: hypothetical physical inputs, computed idealized distances,
 * the cited 100-200 um band as context, verbatim evidence. Upgrades nothing. */
export function createVascularSupplyUI({ elements: $, onStateChange = () => {} }) {
  let state = defaultVascularSupply();
  const element = (tag, text) => { const e = document.createElement(tag); e.textContent = text; return e; };
  const catalog = getVascularSupplyCatalog();
  const inputs = { diffusivity: $('vascular-diffusivity'), consumption: $('vascular-consumption'), inlet: $('vascular-inlet'), radius: $('vascular-radius') };
  function readInputs() {
    return { diffusivityD_m2PerS: Number(inputs.diffusivity.value), consumptionM_molPerM3S: Number(inputs.consumption.value), inletC0_molPerM3: Number(inputs.inlet.value), channelRadiusUm: Number(inputs.radius.value) };
  }
  function propose() {
    try {
      const next = validateVascularSupplyRecord({ settings: readInputs(), parameterOrigin: 'hypothetical-controls' });
      state = next;
      $('vascular-status').textContent = 'Idealized supply distance recomputed from your hypothetical inputs. Model output only; no viability prediction.';
    } catch (error) {
      $('vascular-status').textContent = 'Previous inputs retained. ' + error.message;
    }
    render(); onStateChange();
  }
  for (const input of Object.values(inputs)) input.addEventListener('change', propose);
  function render() {
    const result = evaluateVascularSupply(state);
    inputs.diffusivity.value = state.settings.diffusivityD_m2PerS;
    inputs.consumption.value = state.settings.consumptionM_molPerM3S;
    inputs.inlet.value = state.settings.inletC0_molPerM3;
    inputs.radius.value = state.settings.channelRadiusUm;
    const values = $('vascular-values');
    values.replaceChildren();
    const rows = [
      ['Krogh critical radius (µm)', result.computed.kroghCriticalRadiusUm === null ? 'not limiting at the 10 mm cap in this idealization' : result.computed.kroghCriticalRadiusUm.toFixed(1)],
      ['Planar comparison thickness (µm)', result.computed.planarLimitUm.toFixed(1)],
      ['Channel center spacing (µm)', result.computed.channelSpacingUm === null ? '—' : result.computed.channelSpacingUm.toFixed(1)],
      ['Idealized channel density (channels/mm²)', result.computed.channelDensityPerMm2 === null ? '—' : result.computed.channelDensityPerMm2.toFixed(2)],
      ['Cited teaching band (µm)', result.bandContext.bandUm.join('–') + ' (context, not a threshold)'],
    ];
    for (const [k, v] of rows) { const tr = document.createElement('tr'); tr.append(element('th', k), element('td', v)); values.append(tr); }
    const chart = $('vascular-chart');
    const W = 380, H = 120, pad = 26;
    const profile = result.computed.profile;
    const rMax = Math.max(1, profile[profile.length - 1].rUm);
    const points = profile.map(p => `${(pad + (p.rUm / rMax) * (W - 2 * pad)).toFixed(2)},${(H - pad - p.cOverC0 * (H - 2 * pad)).toFixed(2)}`).join(' ');
    const bandTop = H - pad - (result.bandContext.bandUm[1] >= rMax ? 1 : 0) * (H - 2 * pad);
    const bandX1 = pad + (Math.min(result.bandContext.bandUm[0], rMax) / rMax) * (W - 2 * pad);
    const bandX2 = pad + (Math.min(result.bandContext.bandUm[1], rMax) / rMax) * (W - 2 * pad);
    chart.replaceChildren();
    const ns = 'http://www.w3.org/2000/svg';
    for (const [x1, x2] of [[bandX1, bandX2]]) {
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', x1); rect.setAttribute('width', Math.max(0, x2 - x1)); rect.setAttribute('y', pad); rect.setAttribute('height', H - 2 * pad);
      rect.setAttribute('fill', 'rgba(64,160,120,.12)'); chart.append(rect);
    }
    const polyline = document.createElementNS(ns, 'polyline');
    polyline.setAttribute('points', points); polyline.setAttribute('fill', 'none'); polyline.setAttribute('stroke', '#2f7d63'); polyline.setAttribute('stroke-width', '2'); chart.append(polyline);
    const axis = document.createElementNS(ns, 'line');
    axis.setAttribute('x1', pad); axis.setAttribute('x2', W - pad); axis.setAttribute('y1', H - pad); axis.setAttribute('y2', H - pad); axis.setAttribute('stroke', '#888'); chart.append(axis);
    const evidence = $('vascular-evidence');
    evidence.replaceChildren();
    const byId = new Map(catalog.sources.map(s => [s.id, s]));
    for (const c of catalog.claims) {
      const source = byId.get(c.sourceId);
      const li = document.createElement('li');
      li.append(element('blockquote', c.verbatimQuote), element('small', `${c.statement} — ${c.locator} · ${source.journalYear}, doi:${source.doi} · agent-source-reading`));
      evidence.append(li);
    }
  }
  render();
  return { getState: () => structuredClone(state), setState(next) { state = validateVascularSupplyRecord(next); render(); }, diagnostics: () => { const r = evaluateVascularSupply(state); return { kroghUm: r.computed.kroghCriticalRadiusUm, planarUm: r.computed.planarLimitUm, band: r.bandContext.bandUm, status: r.status }; } };
}
