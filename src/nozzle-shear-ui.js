import { evaluateNozzleShear, getNozzleShearCatalog, validateNozzleShearSettings, NOZZLE_SHEAR_DEFAULTS } from './nozzle-shear.js';

/** Nozzle shear reference panel: idealized capillary physics beside verbatim-quoted open-access
 * evidence. Pure front-end sub-controller; every change re-derives the result from the model. */
export function createNozzleShearUI({ elements: $, onStateChange = () => {} }) {
  if (typeof onStateChange !== 'function') throw new TypeError('Nozzle shear UI needs a state-change callback');
  let state = { settings: { ...NOZZLE_SHEAR_DEFAULTS }, parameterOrigin: 'cited-fit-application' };
  let disposed = false;
  const listeners = [];
  const NS = 'http://www.w3.org/2000/svg';
  const svgNode = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); return e; };
  const listen = (id, event, handler) => { const el = $(id); el.addEventListener(event, handler); listeners.push(() => el.removeEventListener(event, handler)); };
  const catalog = getNozzleShearCatalog();
  const evidence = $('nozzle-evidence');
  if (evidence) {
    for (const c of catalog.claims) {
      const li = document.createElement('li');
      const q = document.createElement('blockquote'); q.textContent = c.verbatimQuote;
      const meta = document.createElement('small');
      meta.textContent = `${c.statement} — ${c.locator} · ${c.basis === 'secondhand-restatement' ? 'secondhand restatement' : 'primary text'}, agent-source-reading · ${catalog.sources[0].journalYear}, doi:${catalog.sources[0].doi}`;
      li.append(q, meta); evidence.append(li);
    }
  }
  function proposeFromInputs() {
    if (disposed) return;
    try {
      const viscosityMode = $('nozzle-viscosity-mode').value;
      const next = validateNozzleShearSettings({
        diameterUm: Number($('nozzle-diameter').value),
        flowMm3PerS: Number($('nozzle-flow').value),
        viscosityMode,
        viscosityPas: Number($('nozzle-viscosity').value),
      });
      state = { settings: next, parameterOrigin: viscosityMode === 'cited-cellink-fit' ? 'cited-fit-application' : 'hypothetical-controls' };
      $('nozzle-status').textContent = 'Design inputs updated. Reference calculation only — not a protocol, a print setting or a viability prediction.';
      render(); onStateChange();
    } catch (error) { $('nozzle-status').textContent = `Previous inputs retained. ${error.message}`; }
  }
  const LOG_MIN = 1, LOG_MAX = 20000;
  const xOf = pa => 34 + (Math.log10(Math.max(pa, LOG_MIN)) - Math.log10(LOG_MIN)) / (Math.log10(LOG_MAX) - Math.log10(LOG_MIN)) * 330;
  function drawChart(result) {
    const svg = $('nozzle-chart');
    if (!svg) return;
    svg.replaceChildren();
    svg.append(svgNode('rect', { x: 34, y: 18, width: 330, height: 44, fill: '#eef4f2' }));
    svg.append(svgNode('rect', { x: xOf(455.43), y: 18, width: xOf(5000) - xOf(455.43), height: 44, fill: '#d8ece5' }));
    svg.append(svgNode('rect', { x: xOf(5000), y: 18, width: xOf(10000) - xOf(5000), height: 44, fill: '#f3e2c0' }));
    svg.append(svgNode('rect', { x: xOf(10000), y: 18, width: 34 + 330 - xOf(10000), height: 44, fill: '#ecc7c0' }));
    for (const [value, label] of [[30, '30'], [160, '160'], [455.43, '455'], [5000, '5 kPa'], [10000, '10 kPa']]) {
      const line = svgNode('line', { x1: xOf(value), x2: xOf(value), y1: 18, y2: 62, stroke: '#35544e', 'stroke-dasharray': '2 3', 'stroke-width': 1 });
      svg.append(line);
      const text = svgNode('text', { x: xOf(value), y: 76, 'font-size': 10, fill: 'currentColor', 'text-anchor': 'middle' }); text.textContent = label; svg.append(text);
    }
    const tau = Math.min(Math.max(result.wallShearStressPa, LOG_MIN), LOG_MAX);
    svg.append(svgNode('circle', { cx: xOf(tau), cy: 40, r: 6, fill: '#267b72', stroke: '#0f2b27' }));
    const label = svgNode('text', { x: 34, y: 104, 'font-size': 12, fill: 'currentColor' });
    label.textContent = `tau_w = ${result.wallShearStressPa.toFixed(1)} Pa · band: ${result.band.replace(/-/g, ' ')} · ${result.laminarAssumptionHolds ? 'laminar assumption holds (Re ' + result.reynoldsNumber.toFixed(1) + ')' : 'LAMINAR ASSUMPTION BROKEN (Re ' + result.reynoldsNumber.toFixed(0) + ')'}`;
    svg.append(label);
    svg.setAttribute('aria-label', `Log-scale wall shear chart. Computed ${result.wallShearStressPa.toFixed(1)} pascals against cited context: 30, 160 and 455.43 pascals of reported simulation values, and restated in-vitro context bands below 5 kilopascals, 5 to 10 kilopascals, above 10 kilopascals. Idealized reference, not a safety verdict.`);
  }
  function render() {
    if (disposed) return;
    const result = evaluateNozzleShear(state.settings);
    $('nozzle-viscosity').disabled = state.settings.viscosityMode === 'cited-cellink-fit';
    $('nozzle-diameter').value = state.settings.diameterUm;
    $('nozzle-flow').value = state.settings.flowMm3PerS;
    $('nozzle-viscosity-mode').value = state.settings.viscosityMode;
    $('nozzle-viscosity').value = state.settings.viscosityPas;
    const rows = [
      ['Mean nozzle velocity', `${result.meanVelocityMmPerS.toFixed(2)} mm/s`],
      ['Wall shear rate', `${result.wallShearRatePerS.toFixed(1)} 1/s`],
      ['Apparent viscosity', `${result.apparentViscosityPas.toPrecision(3)} Pa·s (${result.viscositySource})`],
      ['Wall shear stress', `${result.wallShearStressPa.toFixed(2)} Pa · ${(result.ratioToLowBandPa * 100).toFixed(1)}% of the restated 5 kPa low-band edge`],
      ['Band placement', `${result.band.replace(/-/g, ' ')}`],
      ['Reynolds check', `Re = ${result.reynoldsNumber.toFixed(1)} with hypothetical density 1000 kg/m3 — ${result.laminarAssumptionHolds ? 'the laminar idealization is self-consistent here' : 'above 2300: the laminar idealization does not hold here, treat the value as illustrative only'}`],
    ];
    $('nozzle-values').replaceChildren(...rows.map(([k, v]) => { const tr = document.createElement('tr'); const a = document.createElement('th'); a.textContent = k; const b = document.createElement('td'); b.textContent = v; tr.append(a, b); return tr; }));
    drawChart(result);
  }
  listen('nozzle-diameter', 'input', proposeFromInputs);
  listen('nozzle-flow', 'input', proposeFromInputs);
  listen('nozzle-viscosity-mode', 'change', proposeFromInputs);
  listen('nozzle-viscosity', 'input', proposeFromInputs);
  render();
  return {
    render,
    getState: () => structuredClone(state),
    setState(next) {
      if (disposed) throw new Error('Nozzle shear UI disposed');
      const settings = validateNozzleShearSettings(next.settings);
      const parameterOrigin = next.parameterOrigin === (settings.viscosityMode === 'cited-cellink-fit' ? 'cited-fit-application' : 'hypothetical-controls') ? next.parameterOrigin : (settings.viscosityMode === 'cited-cellink-fit' ? 'cited-fit-application' : 'hypothetical-controls');
      state = { settings, parameterOrigin };
      render();
    },
    diagnostics: () => { const r = evaluateNozzleShear(state.settings); return { tauPa: r.wallShearStressPa, band: r.band, re: r.reynoldsNumber, laminar: r.laminarAssumptionHolds }; },
    dispose() { if (!disposed) { disposed = true; listeners.forEach(remove => remove()); } },
  };
}
