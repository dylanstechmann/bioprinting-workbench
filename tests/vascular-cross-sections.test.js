import test from 'node:test';
import assert from 'node:assert/strict';
import { CROSS_SECTIONS, renderCrossSections } from '../src/vascular-cross-sections.js';

function stubDocument() {
  const make = (tag = '#element') => {
    const node = {
      tag, children: [], className: '', textContent: '', attributes: new Map(),
      appendChild(child) { this.children.push(child); return child; },
      replaceChildren(...nodes) { this.children = nodes; },
      setAttribute(name, value) { this.attributes.set(name, value); },
      getAttribute(name) { return this.attributes.get(name) ?? null; },
    };
    Object.defineProperty(node, 'innerHTML', {
      get() { return ''; },
      set() { throw new Error('innerHTML is forbidden in cross-sections'); },
    });
    return node;
  };
  return { createElement: tag => make(tag), createElementNS: (_ns, tag) => make(tag) };
}
const container = () => {
  const node = { children: [], appendChild(child) { this.children.push(child); return child; }, removeChild(child) { this.children = this.children.filter(node => node !== child); }, replaceChildren(...nodes) { this.children = nodes; } };
  return node;
};
const walk = (node, visit) => { visit(node); for (const child of node.children ?? []) walk(child, visit); };
const allText = node => { const out = []; walk(node, n => { if (n.textContent) out.push(n.textContent); }); return out; };

test('three evidence-anchored sections render with disclaimers and quoted bands', () => {
  const doc = stubDocument();
  const box = container();
  const cleanup = renderCrossSections(box, { document: doc });
  assert.equal(box.children.length, 3);
  const texts = allText(box).join('\n');
  for (const section of CROSS_SECTIONS) {
    assert.ok(texts.includes(section.title), `${section.id} title rendered`);
    assert.ok(texts.includes(section.disclaimer), `${section.id} disclaimer rendered`);
    assert.ok(texts.includes(section.evidenceAnchor), `${section.id} evidence anchor rendered`);
  }
  assert.match(texts, /100–300 µm/, 'extrusion band quoted');
  assert.match(texts, /10–50 µm/, 'capillary band quoted');
  assert.match(texts, /100–200 µm/, 'teaching band quoted');
  assert.match(texts, /not modeled/, 'connection gap stays an explicit gap');
  assert.match(texts, /Schematic cross-sections, not to scale/);
  cleanup();
  assert.equal(box.children.length, 0, 'cleanup removes owned figures');
});

test('hostile strings render inert via textContent only', () => {
  const doc = stubDocument();
  const box = container();
  const hostile = [{ ...CROSS_SECTIONS[0], id: 'hostile-1', title: '<img src=x onerror=alert(1)>', scaleNote: '<script>evil()</script>', labels: ['"><svg onload=alert(2)>'], evidenceAnchor: 'anchor text <b>bold</b>', disclaimer: 'd <iframe>' }];
  const cleanup = renderCrossSections(box, { sections: hostile, document: doc });
  const texts = allText(box);
  assert.ok(texts.includes('<img src=x onerror=alert(1)>'), 'raw markup kept as text');
  assert.ok(texts.includes('<script>evil()</script>'), 'script string kept as text');
  assert.ok(texts.includes('"><svg onload=alert(2)>'), 'svg injection string kept as text');
  const seen = [];
  walk(box, node => { if (node.tag) seen.push(node.tag); });
  const allowed = new Set(['figure', 'figcaption', 'strong', 'p', 'ul', 'li', 'svg', 'circle', 'text', 'line', 'title', 'desc']);
  assert.ok(seen.every(tag => allowed.has(tag)), `elements built via createElement/NS only: ${seen.join(',')}`);
  cleanup();
});

test('specs are frozen and validate against malformed sections', () => {
  assert.ok(Object.isFrozen(CROSS_SECTIONS));
  for (const section of CROSS_SECTIONS) assert.ok(Object.isFrozen(section));
  const doc = stubDocument();
  const box = container();
  assert.throws(() => renderCrossSections(box, { document: doc, sections: [] }), TypeError);
  assert.throws(() => renderCrossSections(box, { document: doc, sections: [{ ...CROSS_SECTIONS[0], title: 'x' }] }), TypeError, 'short title rejected');
  assert.throws(() => renderCrossSections(box, { document: doc, sections: [{ ...CROSS_SECTIONS[0], diagram: 'organ' }] }), TypeError);
  assert.throws(() => renderCrossSections(box, { document: doc, sections: [{ ...CROSS_SECTIONS[0], labels: [] }] }), TypeError);
  assert.throws(() => renderCrossSections(null, { document: doc }), TypeError);
  assert.throws(() => renderCrossSections(box, { document: null }), TypeError);
});
