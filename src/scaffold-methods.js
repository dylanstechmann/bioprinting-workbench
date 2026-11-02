import { assertAllowedKeys, text } from './validation.js';
import { getEvidenceCatalog } from './cell-evidence.js';
import { getAgingEvidenceCatalog } from './aging-evidence.js';
import { getApplicationsEvidenceCatalog } from './applications-evidence.js';
import { getGeroscienceEvidenceCatalog } from './geroscience-evidence.js';
import { getTissueEvidenceCatalog } from './tissue-evidence.js';
import { getScaffoldEvidenceCatalog } from './scaffold-evidence.js';

/** Scaffold-methods survey: the established/experimental/theoretical toolbox behind the atlas targets. Reference content, never clinical guidance; no method here is a human result. */
export const SCAFFOLD_MATURITIES = ['established', 'experimental', 'theoretical'];
const SCAFFOLD_METHODS = [
  { id: 'extrusion-multimaterial', label: 'Multimaterial extrusion bioprinting', maturity: 'established', whatItDoes: 'Coprints several cell-laden and sacrificial inks layer by layer to put parenchyma, stroma and vasculature into one thick construct, perfusable on chip.', limits: 'The reviewed demonstration is an on-chip construct over 6 weeks; nothing implanted or anastomosed to a host is reviewed, and nozzle shear stresses cell viability.', anchorClaimIds: ['extrusion-multimaterial-vascularized'] },
  { id: 'embedded-support-bath', label: 'Embedded support-bath printing (FRESH)', maturity: 'established', whatItDoes: 'Prints soft inks inside a granular support gel that holds the shape until it gels, extending printable materials from collagen I to type II and III isoform bioinks.', limits: 'Bath rheology and ink diffusion bound the fidelity; the reviewed work is in-vitro scaffold fabrication, not tissue function.', anchorClaimIds: ['fresh-collagen-isoforms'] },
  { id: 'sacrificial-biofabrication', label: 'Sacrificial writing of vasculature (SWIFT family)', maturity: 'experimental', whatItDoes: 'Prints the negative space as a temporary template, then washes it out to leave perfusable channels; coaxial variants print branching, multilayered vessels with muscle-cell shells as they go.', limits: 'Template removal completeness, endothelial lining quality and host anastomosis remain open; the reviewed vessels are preclinical.', anchorClaimIds: ['coaxial-sacrificial-vessels', 'sacrificial-biofabrication-family'] },
  { id: 'dlp-photocuring', label: 'Digital light processing (DLP) photocuring', maturity: 'established', whatItDoes: 'Cures bioink layer by layer under projected light patterns for fine resolution, speed and gentle cell handling, with methacrylated polymers, dECM-derived hydrogels and nanocomposite inks.', limits: 'Light penetration and phototoxic chemistry bound depth and cell density; the reviewed results are constructs and models, not transplants.', anchorClaimIds: ['dlp-bioink-landscape'] },
  { id: 'volumetric-tomographic', label: 'Volumetric (tomographic) printing', maturity: 'experimental', whatItDoes: 'Forms a whole volume at once from light-field projections in seconds, and the same optics can stimulate optogenetic circuits deep inside the finished construct.', limits: 'Optical scattering, opacity and cell density limit scale; the reviewed demonstration is an in-vitro activation experiment.', anchorClaimIds: ['volumetric-post-print-stimulation'] },
  { id: 'cell-only-support-bath', label: 'Cell-only inks in support baths', maturity: 'experimental', whatItDoes: 'Prints aggregates of cells as the entire ink into a support bath, letting geometric confinement direct tissue-scale collagen alignment — the bath is the scaffold.', limits: 'Fusion timing, mechanics and scale are unreviewed beyond in-vitro fibrocartilage; slow self-assembly is the cost.', anchorClaimIds: ['cell-only-ink-alignment'] },
  { id: 'in-situ-printing', label: 'In-situ printing into the wound', maturity: 'experimental', whatItDoes: 'Deposits bioactive constructs directly onto living tissue at the point of care, reframing wound treatment as an on-site biofabrication problem with clinically driven design rules.', limits: 'Hostile wound environments, deformation and time pressure; the review establishing the design rules reports no bedside-printed human graft result.', anchorClaimIds: ['in-situ-design-rules'] },
  { id: 'factor-gradient-conduits', label: 'Biochemical factor gradients in conduits', maturity: 'established', whatItDoes: 'Builds reversible concentration gradients of growth factors (GDNF in the reviewed case) inside synthetic nerve conduits to steer motor-axon extension — the biochemical half of the toolbox.', limits: 'Single-factor bias and factor stability; the reviewed conduits are preclinical, and gradients pattern chemistry, not living architecture.', anchorClaimIds: ['gradient-nerve-conduits'] },
  { id: 'four-d-shape-morphing', label: '4D shape-morphing (programmed swelling)', maturity: 'theoretical', whatItDoes: 'Encodes tomorrow\'s shape during fabrication: layer-by-layer crosslink-density variation in GelMA makes printed hydrogels bend on immersion — time as a fourth print dimension.', limits: 'A hydrogel proof of concept; no tissue-level, vascularized or in-vivo application is reviewed, and morphing precision under load is unestablished.', anchorClaimIds: ['four-d-programmed-morphing'] },
];
const NOTICES = [
  'Reference survey of printing and patterning methods, sorted by how established their reviewed evidence is; it is not a selection guide or a clinical readiness claim.',
  'Every anchor is a preclinical, in-vitro or review-level source; no method here has produced a reviewed human transplanted tissue.',
  'The vascularization thread runs through the whole list: sacrificial templates, coaxial vessels, in-situ deposition and factor gradients are four different attacks on the same diffusion limit.',
];
export function getScaffoldMethods() { return structuredClone(SCAFFOLD_METHODS); }
export function validateScaffoldMethods(methods) {
  if (!Array.isArray(methods) || !methods.length || methods.length > 32) throw new RangeError('Invalid scaffold-methods list');
  const claims = new Set([...getEvidenceCatalog().claims, ...getAgingEvidenceCatalog().claims, ...getApplicationsEvidenceCatalog().claims, ...getGeroscienceEvidenceCatalog().claims, ...getTissueEvidenceCatalog().claims, ...getScaffoldEvidenceCatalog().claims].map(c => c.id));
  const ids = new Set();
  for (const m of methods) {
    assertAllowedKeys(m, ['id','label','maturity','whatItDoes','limits','anchorClaimIds']);
    const id = text(m.id, 128, 'id'); if (ids.has(id)) throw new RangeError('Duplicate scaffold-method ID'); ids.add(id);
    text(m.label, 2000, 'label'); text(m.whatItDoes, 2000, 'whatItDoes'); text(m.limits, 2000, 'limits');
    if (!SCAFFOLD_MATURITIES.includes(m.maturity)) throw new RangeError('Unknown scaffold maturity');
    if (!Array.isArray(m.anchorClaimIds) || !m.anchorClaimIds.length || m.anchorClaimIds.some(claimId => !claims.has(claimId))) throw new RangeError('Dangling scaffold-method anchor');
  }
  for (const maturity of SCAFFOLD_MATURITIES) if (!methods.some(m => m.maturity === maturity)) throw new RangeError(`Missing ${maturity} method tier`);
  return structuredClone(methods);
}
const validated = validateScaffoldMethods(SCAFFOLD_METHODS);
export function evaluateScaffoldMethods() {
  const counts = Object.fromEntries(SCAFFOLD_MATURITIES.map(maturity => [maturity, validated.filter(m => m.maturity === maturity).length]));
  return {
    status: 'reference',
    methodCount: validated.length,
    maturityCounts: counts,
    summary: `Method survey: ${validated.length} methods across established (${counts.established}), experimental (${counts.experimental}) and theoretical (${counts.theoretical}) tiers. No method tier includes a reviewed human transplanted tissue; maturity describes method evidence, never clinical readiness.`,
    notices: NOTICES,
  };
}
