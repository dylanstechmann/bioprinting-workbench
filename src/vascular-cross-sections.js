const DISCLAIMER = 'Schematic cross-sections, not to scale. Presentation geometry only: no fluid function, biological compatibility, healing, integration or vessel function is simulated.';
const SVG_NS = 'http://www.w3.org/2000/svg';
const STRING_FIELDS = ['id', 'title', 'scaleNote', 'evidenceAnchor', 'disclaimer'];

/** Explanatory vascular cross-sections: static, evidence-anchored schematics. Pure
 *  presentation content — every claim string is a quoted band or an explicit evidence gap
 *  restated from docs/VASCULAR_SUPPLY.md. Never treatment guidance or validation. */
export const CROSS_SECTIONS = Object.freeze([
  Object.freeze({
    id: 'printed-channel',
    title: 'Printed channel — extrusion scale',
    scaleNote: 'The extrusion scale this workbench animates: quoted resolution band 100–300 µm channel diameter, reached well by extrusion printing.',
    labels: Object.freeze(['Scaffold wall', 'Printed lumen — extrusion reaches 100–300 µm channels well']),
    evidenceAnchor: 'Resolution bands quoted from Seymour et al. 2022, Biofabrication, doi:10.1088/1758-5090/ac4fb5; restated in docs/VASCULAR_SUPPLY.md.',
    disclaimer: DISCLAIMER,
    diagram: 'printed',
  }),
  Object.freeze({
    id: 'capillary-scale',
    title: 'Capillary scale',
    scaleNote: 'The capillary scale is far smaller: quoted band 10–50 µm, reached poorly by extrusion printing. The oxygen teaching model uses the quoted 100–200 µm band as context only.',
    labels: Object.freeze(['Capillary wall', 'Capillary lumen — 10–50 µm, reached poorly by extrusion printing', 'Teaching band: cells roughly 100–200 µm from the nearest vessel']),
    evidenceAnchor: 'Diffusion band quoted from Yeo et al. 2023, Biofabrication, doi:10.1088/1758-5090/ad0b3f; restated in docs/VASCULAR_SUPPLY.md.',
    disclaimer: DISCLAIMER,
    diagram: 'capillary',
  }),
  Object.freeze({
    id: 'connection-gap',
    title: 'The connection gap',
    scaleNote: 'Printed channels and host vessels do not connect themselves. The reviewed sources leave anastomosis mechanisms uncertain, and nothing here simulates a connection.',
    labels: Object.freeze(['Printed channel', 'Host vessel', 'Connection (anastomosis) — not modeled; mechanisms uncertain']),
    evidenceAnchor: 'Anastomosis uncertainty from Yeo et al. 2023; docs/VASCULAR_SUPPLY.md models no endothelialization, sprouting, hierarchy or host anastomosis.',
    disclaimer: DISCLAIMER,
    diagram: 'gap',
  }),
]);

function validateSection(section, index) {
  if (!section || typeof section !== 'object' || Array.isArray(section)) throw new TypeError(`cross-sections[${index}] must be an object`);
  for (const key of STRING_FIELDS) {
    if (typeof section[key] !== 'string' || section[key].length < 3 || section[key].length > 600) throw new TypeError(`cross-sections[${index}].${key} must be a bounded string`);
  }
  if (!Array.isArray(section.labels) || section.labels.length < 1 || section.labels.length > 8) throw new TypeError(`cross-sections[${index}].labels must be a bounded array`);
  for (const label of section.labels) if (typeof label !== 'string' || label.length < 2 || label.length > 300) throw new TypeError(`cross-sections[${index}].labels entries must be bounded strings`);
  if (!['printed', 'capillary', 'gap'].includes(section.diagram)) throw new TypeError(`cross-sections[${index}].diagram is unsupported`);
}

function diagramSVG(doc, diagram) {
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 220 110');
  svg.setAttribute('role', 'img');
  const circle = (cx, cy, r, fill, stroke, dash = null) => {
    const node = doc.createElementNS(SVG_NS, 'circle');
    node.setAttribute('cx', String(cx)); node.setAttribute('cy', String(cy)); node.setAttribute('r', String(r));
    node.setAttribute('fill', fill); node.setAttribute('stroke', stroke); node.setAttribute('stroke-width', '3');
    if (dash) node.setAttribute('stroke-dasharray', dash);
    svg.appendChild(node);
    return node;
  };
  const text = (x, y, content) => {
    const node = doc.createElementNS(SVG_NS, 'text');
    node.setAttribute('x', String(x)); node.setAttribute('y', String(y)); node.setAttribute('font-size', '8');
    node.setAttribute('fill', '#38554e');
    node.textContent = content;
    svg.appendChild(node);
    return node;
  };
  if (diagram === 'printed') {
    circle(55, 55, 40, '#e8f0ea', '#267b72');
    circle(55, 55, 30, '#fdfefb', '#267b72');
    text(110, 40, 'wall'); text(110, 55, 'lumen'); text(110, 70, '100–300 µm (quoted)');
  } else if (diagram === 'capillary') {
    circle(55, 55, 14, '#e8f0ea', '#267b72');
    circle(55, 55, 9, '#fdfefb', '#267b72');
    circle(55, 55, 48, 'none', '#c08f45', '4 4');
    text(110, 35, 'capillary 10–50 µm'); text(110, 50, '(quoted)'); text(110, 70, '100–200 µm teaching band');
  } else {
    circle(35, 55, 26, '#e8f0ea', '#267b72');
    circle(165, 55, 18, '#f4eddf', '#947442');
    const gap = doc.createElementNS(SVG_NS, 'line');
    gap.setAttribute('x1', '72'); gap.setAttribute('y1', '55'); gap.setAttribute('x2', '138'); gap.setAttribute('y2', '55');
    gap.setAttribute('stroke', '#947442'); gap.setAttribute('stroke-width', '3'); gap.setAttribute('stroke-dasharray', '5 5');
    svg.appendChild(gap);
    text(20, 95, 'printed channel'); text(140, 95, 'host vessel'); text(88, 42, 'not modeled');
  }
  return svg;
}

/** Render the cross-section figures into `container` with textContent-only DOM/SVG writes.
 *  Accepts an injectable document and section list for testing. Returns a cleanup function. */
export function renderCrossSections(container, { sections = CROSS_SECTIONS, document: doc = globalThis.document } = {}) {
  if (!container || typeof container.appendChild !== 'function') throw new TypeError('renderCrossSections needs a container element');
  if (!doc || typeof doc.createElement !== 'function' || typeof doc.createElementNS !== 'function') throw new TypeError('renderCrossSections needs a document');
  if (!Array.isArray(sections) || sections.length < 1 || sections.length > 8) throw new TypeError('sections must be a bounded array');
  sections.forEach(validateSection);
  const created = [];
  for (const section of sections) {
    const figure = doc.createElement('figure');
    figure.className = 'cross-section';
    figure.appendChild(diagramSVG(doc, section.diagram));
    const caption = doc.createElement('figcaption');
    const title = doc.createElement('strong');
    title.textContent = section.title;
    caption.appendChild(title);
    const note = doc.createElement('p');
    note.textContent = section.scaleNote;
    caption.appendChild(note);
    const list = doc.createElement('ul');
    for (const label of section.labels) {
      const item = doc.createElement('li');
      item.textContent = label;
      list.appendChild(item);
    }
    caption.appendChild(list);
    const anchor = doc.createElement('p');
    anchor.className = 'micro';
    anchor.textContent = section.evidenceAnchor;
    caption.appendChild(anchor);
    const disclaimer = doc.createElement('p');
    disclaimer.className = 'micro';
    disclaimer.textContent = section.disclaimer;
    caption.appendChild(disclaimer);
    figure.appendChild(caption);
    container.appendChild(figure);
    created.push(figure);
  }
  return () => {
    for (const figure of created) figure.replaceChildren();
    created.length = 0;
  };
}

