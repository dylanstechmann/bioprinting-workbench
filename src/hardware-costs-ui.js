import { getHardwareCatalog, getHardwareCategories, evaluateHardwareBudget } from './hardware-costs.js';

/** Reference hardware cost panel with a hand-rolled SVG chart: indicative estimates only, never a quote or purchase plan. */
const CATEGORY_COLORS = { 'motion-platform': '#267b72', 'extrusion-toolhead': '#5b8c5a', 'bioink-materials': '#b0713f', 'sterile-culture': '#8c3b5e', 'measurement-qc': '#3b5e8c', 'consumables-recurring': '#6b6b6b' };
export function createHardwareCostsUI({ elements: $, onStateChange }) {
  if (typeof onStateChange !== 'function') throw new TypeError('Hardware cost UI needs a state-change callback');
  let disposed = false;
  const listeners = [];
  const NS = 'http://www.w3.org/2000/svg';
  const element = (tag, text) => { const e = document.createElement(tag); e.textContent = text; return e; };
  const svgNode = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); return e; };
  const parts = getHardwareCatalog().parts;
  const categoriesById = new Map(getHardwareCategories().map(c => [c.id, c]));
  const checkboxes = new Map();
  const box = $('hardware-cost-parts');
  for (const p of parts) {
    const card = document.createElement('article');
    const label = document.createElement('label');
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = `hardware-part-${p.id}`;
    cb.addEventListener('change', proposeFromInputs); listeners.push(() => cb.removeEventListener('change', proposeFromInputs));
    checkboxes.set(p.id, cb);
    label.append(cb, element('span', `${p.label} — ${categoriesById.get(p.category).label} · reference estimate $${p.referencePriceUSD}${p.recurring ? '/month-ish' : ''}${p.optional ? ' · optional (acellular path skips it)' : ''}`));
    card.append(label, element('small', p.note));
    box.append(card);
  }
  function proposeFromInputs() {
    if (disposed) return;
    const includedPartIds = [...checkboxes.entries()].filter(([, cb]) => cb.checked).map(([id]) => id);
    $('hardware-cost-status').textContent = 'Reference budget selection changed. Indicative estimates only — not a quote, not current, no purchase recommended.';
    onStateChange({ hardwareBudget: { includedPartIds } });
  }
  function drawBar(svg, y, rowHeight, label, segments, total) {
    const labelText = svgNode('text', { x: 8, y: y + rowHeight * 0.68, 'font-size': 13, fill: 'currentColor' }); labelText.textContent = label; svg.append(labelText);
    let x = 90;
    const max = 580;
    for (const seg of segments) {
      const width = total > 0 ? Math.max((seg.value / total) * max, seg.value > 0 ? 1.5 : 0) : 0;
      const rect = svgNode('rect', { x, y, width, height: rowHeight, fill: CATEGORY_COLORS[seg.id] });
      const title = svgNode('title', {}); title.textContent = `${categoriesById.get(seg.id).label}: $${seg.value}${label.startsWith('Recurring') ? '/month' : ''}`;
      rect.append(title); svg.append(rect);
      x += width;
    }
    const totalText = svgNode('text', { x: x + 8, y: y + rowHeight * 0.68, 'font-size': 13, fill: 'currentColor' }); totalText.textContent = `$${total}`; svg.append(totalText);
  }
  function renderChart(result) {
    const svg = $('hardware-cost-chart'); svg.replaceChildren();
    svg.append(svgNode('rect', { x: 90, y: 14, width: 580, height: 34, fill: 'none', stroke: '#267b72', 'stroke-dasharray': '4 3' }));
    if (result.status !== 'costed') return;
    const oneTime = result.categories.map(c => ({ id: c.id, value: c.oneTimeUSD })).filter(s => s.value > 0);
    const recurring = result.categories.map(c => ({ id: c.id, value: c.recurringMonthlyUSD })).filter(s => s.value > 0);
    drawBar(svg, 14, 34, 'One-time', oneTime, result.oneTimeTotalUSD);
    if (result.recurringMonthlyUSD > 0) drawBar(svg, 56, 30, 'Recurring/month', recurring, result.recurringMonthlyUSD);
    let lx = 90;
    for (const [id, color] of Object.entries(CATEGORY_COLORS)) {
      if (!result.categories.some(c => c.id === id)) continue;
      svg.append(svgNode('rect', { x: lx, y: 98, width: 10, height: 10, fill: color }));
      const legendText = svgNode('text', { x: lx + 14, y: 107, 'font-size': 11, fill: 'currentColor' }); legendText.textContent = categoriesById.get(id).label.split(' (')[0]; svg.append(legendText);
      lx += 18 + categoriesById.get(id).label.split(' (')[0].length * 6.2;
    }
  }
  function render(state) {
    if (disposed) return;
    const budget = state.hardwareBudget;
    for (const [id, cb] of checkboxes) cb.checked = budget.includedPartIds.includes(id);
    const r = evaluateHardwareBudget(budget);
    renderChart(r);
    if (r.status !== 'costed') {
      $('hardware-cost-result').textContent = `No parts selected: this shows nothing. ${r.notices[0]}`;
      return;
    }
    const lines = [`Reference bench, ${r.parts.length} parts included. One-time: $${r.oneTimeTotalUSD}. Recurring: about $${r.recurringMonthlyUSD} per month. The two are never summed — a bench you buy once and a habit you fund monthly are different facts.`];
    lines.push(`Where the one-time money goes: ${r.categories.filter(c => c.oneTimeUSD > 0).map(c => `${categoriesById.get(c.id).label.split(' (')[0]} $${c.oneTimeUSD}`).join('; ')}.`);
    lines.push(...r.notices);
    $('hardware-cost-result').textContent = lines.join(' ');
  }
  return { render, dispose() { if (!disposed) { disposed = true; listeners.forEach(remove => remove()); } } };
}
