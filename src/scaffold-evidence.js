import { assertAllowedKeys, finite, text, validateSource } from './validation.js';
import { getEvidenceCatalog } from './cell-evidence.js';
import { getAgingEvidenceCatalog } from './aging-evidence.js';
import { getApplicationsEvidenceCatalog } from './applications-evidence.js';
import { getGeroscienceEvidenceCatalog } from './geroscience-evidence.js';
import { getTissueEvidenceCatalog } from './tissue-evidence.js';

/** Scaffold-methods evidence for the frontier module, agent-read from fetched Europe PMC abstracts (2026-11-02). Species-separated; reviews, in-vitro and animal findings never become human outcomes. */
export const SCAFFOLD_EVIDENCE_SCHEMA = 'bioprinting-workbench/scaffold-evidence/1';
const SPECIES = ['human', 'mouse', 'other'];
const reviewedOn = '2026-11-02';
function source(id, doi, title, journalYear, url, fullTextUrl) {
  return { id, doi, title, journalYear, onlineDate: null, url, fullTextUrl, identifierStatus: 'resolved', supportStatus: 'reviewed', reviewedOn, reviewKind: 'agent-source-reading', limitations: ['Agent-run source reading of the fetched abstract, not independent domain review. No figures, protocols or datasets reproduced.'] };
}
const sources = [
  source('kolesky-2016', '10.1073/pnas.1521342113', 'Three-dimensional bioprinting of thick vascularized tissues.', 2016, 'https://doi.org/10.1073/pnas.1521342113', 'https://europepmc.org/article/MED/26951646'),
  source('co-swift-2024', '10.1002/adma.202401528', 'Embedding Biomimetic Vascular Networks via Coaxial Sacrificial Writing into Functional Tissue.', 2024, 'https://doi.org/10.1002/adma.202401528', 'https://europepmc.org/article/MED/39092638'),
  source('sacrificial-vascularization-review-2026', '10.1002/adma.202507747', 'Sacrificial Biofabrication for Vascularization: Concept, Materials, Technologies, and Applications.', 2026, 'https://doi.org/10.1002/adma.202507747', 'https://europepmc.org/article/MED/40922624'),
  source('fresh-collagens-2025', '10.1021/acsbiomaterials.4c01826', 'FRESH 3D Bioprinting of Collagen Types I, II, and III.', 2025, 'https://doi.org/10.1021/acsbiomaterials.4c01826', 'https://europepmc.org/article/MED/39622052'),
  source('cell-only-bath-2026', '10.1016/j.mtbio.2026.103308', 'Embedded cell-only bioprinting to engineer structurally aligned meniscal fibrocartilage.', 2026, 'https://doi.org/10.1016/j.mtbio.2026.103308', 'https://europepmc.org/article/MED/42326069'),
  source('volumetric-optogenetics-2026', '10.1002/adma.74563', 'Spatial Control of Light-Responsive Proteins and Optogenetics Within Hydrogels via Volumetric Bioprinting.', 2026, 'https://doi.org/10.1002/adma.74563', 'https://europepmc.org/article/MED/42573182'),
  source('dlp-review-2026', '10.1186/s13036-026-00718-w', 'Digital light processing bioprinting: bioink innovations and applications in tissue and organ regeneration.', 2026, 'https://doi.org/10.1186/s13036-026-00718-w', 'https://europepmc.org/article/MED/42436547'),
  source('in-situ-wounds-2026', '10.1177/08853282261503314', 'In-situ bioprinting at bioactive wound interfaces: A clinically driven design-rule framework.', 2026, 'https://doi.org/10.1177/08853282261503314', 'https://europepmc.org/article/MED/42956823'),
  source('gdnf-gradient-2015', '10.1016/j.biomaterials.2015.08.054', 'A modular, plasmin-sensitive, clickable poly(ethylene glycol)-heparin-laminin microsphere system for establishing localized gradients of glial-cell derived human neurotrophic factor in nerve guidance conduits.', 2015, 'https://doi.org/10.1016/j.biomaterials.2015.08.054', 'https://europepmc.org/article/MED/26352518'),
  source('shape-morphing-4d-2026', '10.3390/gels12050382', 'In Situ Programming of Shape-Morphing Hydrogels via Vat Photopolymerization for 4D Bioprinting.', 2026, 'https://doi.org/10.3390/gels12050382', 'https://europepmc.org/article/MED/42196067'),
];
function claim(id, sourceId, species, modelContext, statement, locator, limitations) {
  return { id, sourceId, species, modelContext, statement, locator, supportStatus: 'reviewed', limitations };
}
const claims = [
  claim('extrusion-multimaterial-vascularized', 'kolesky-2016', 'other', 'multimaterial extrusion bioprinting of cell-laden vascularized tissues, perfused on chip', 'The foundational multimaterial extrusion method bioprinted 3D cell-laden, vascularized tissues exceeding 1 cm in thickness that were perfused on chip for long time periods (over 6 weeks), integrating parenchyma, stroma and endothelium into a single thick tissue by coprinting multiple cell-laden inks within a customized extracellular matrix alongside embedded vasculature subsequently lined with endothelial cells.', 'Abstract, method and coprinting sentences', ['On-chip perfused tissue construct; no implanted, anastomosed or human-transplanted tissue is reviewed.']),
  claim('coaxial-sacrificial-vessels', 'co-swift-2024', 'other', 'coaxial sacrificial embedded bioprinting in granular and densely cellular matrices', 'Coaxial sacrificial writing into functional tissues (co-SWIFT) is an embedded bioprinting method generating hierarchically branching, multilayered vascular networks: coaxial printheads with an extended core-shell configuration interconnect printed branching vessels, and optimized core-shell inks yield biomimetic vessels with a smooth-muscle-cell-laden shell surrounding perfusable lumens.', 'Abstract, method-design and ink sentences', ['Preclinical biofabrication method; no implanted, anastomosed or human vascular result is reviewed.']),
  claim('sacrificial-biofabrication-family', 'sacrificial-vascularization-review-2026', 'other', 'review of sacrificial biofabrication for vascularization', 'The review defines sacrificial biofabrication as an effective method for engineering vascular structures by creating temporary templates subsequently removed to form well-defined vascular channels, providing a taxonomy of commonly used sacrificial materials based on external stimulus type and design principles for the surrounding materials.', 'Abstract, definition and taxonomy sentences', ['Review of preclinical methods; no functional human vasculature is reviewed.']),
  claim('fresh-collagen-isoforms', 'fresh-collagens-2025', 'other', 'FRESH support-bath bioprinting of collagen bioinks, in vitro', 'Freeform reversible embedding of suspended hydrogel (FRESH) 3D bioprinting was extended beyond the established collagen I bioink to type II, type III and combination bioinks, printing millimeter-sized scaffolds with micrometer-scale features at fidelity comparable to the collagen-I scaffolds.', 'Abstract, extension and fidelity sentences', ['In-vitro scaffold fabrication; no tissue function, implantation or human result is reviewed.']),
  claim('cell-only-ink-alignment', 'cell-only-bath-2026', 'other', 'mesenchymal stromal cell-only bioinks printed into a methacrylated xanthan support bath, in vitro', 'MSC-only bioinks were bioprinted into a methacrylated xanthan gum support bath to generate filaments of differing widths, and reducing filament width enhanced collagen alignment in the resulting fibrocartilaginous tissues — external geometric confinement directing tissue-scale collagen architecture.', 'Abstract, translation and width-comparison sentences', ['In-vitro tissue engineering; no implanted graft or human result is reviewed.']),
  claim('volumetric-post-print-stimulation', 'volumetric-optogenetics-2026', 'other', 'tomographic volumetric bioprinting with post-printing optogenetic stimulation, in vitro', 'Tomographic volumetric bioprinting was repurposed to enable post-printing stimulation of photosensitive protein switches and optogenetic circuits in cells deep within hydrogel constructs, demonstrating selective activation of a light-responsive protein probe within multi-material centimeter-scale constructs.', 'Abstract, method and demonstration sentences', ['In-vitro demonstration; no therapeutic or human application is reviewed.']),
  claim('dlp-bioink-landscape', 'dlp-review-2026', 'other', 'review of digital light processing bioprinting bioinks', 'The review states that DLP bioprinting offers superior spatial resolution, rapid printing speed and gentle cell handling compared with extrusion- and inkjet-based methods through layer-by-layer photopolymerization, and that recent bioink advances — methacrylated natural polymers, decellularized-extracellular-matrix-derived hydrogels, hybrid nanocomposites and cell-laden formulations — have expanded the biofabrication landscape.', 'Abstract, capability and bioink-advances sentences', ['Review-level status; no clinically transplanted DLP-printed tissue is reviewed.']),
  claim('in-situ-design-rules', 'in-situ-wounds-2026', 'other', 'mini-review of in-situ bioprinting at wound interfaces', 'In-situ bioprinting reframes wound treatment as an on-site biofabrication problem enabling direct deposition of bioactive constructs onto living tissue at the point of care, while the review finds current literature largely material- and technology-centered with no unified framework linking real wound constraints to printable design parameters, and establishes a clinically driven design-rule framework.', 'Abstract, reframing and framework sentences', ['Review and design framework; no bedside-printed human graft result is reviewed.']),
  claim('gradient-nerve-conduits', 'gdnf-gradient-2015', 'other', 'synthetic PEG-heparin-laminin microsphere nerve guidance conduits, in vitro and animal model', 'An almost entirely synthetic nerve guidance conduit was developed allowing control of soluble growth-factor delivery kinetics, cell-initiated degradability and cell attachment, with a modular microsphere format that simplifies formation of concentration gradients of reversibly bound glial-cell-derived neurotrophic factor to facilitate motor-axon extension.', 'Abstract, conduit-design and gradient sentences', ['Preclinical conduit engineering; no restored human nerve function is reviewed.']),
  claim('four-d-programmed-morphing', 'shape-morphing-4d-2026', 'other', 'proof-of-concept vat-photopolymerization 4D bioprinting of GelMA hydrogels', 'A proof-of-concept 4D-bioprinting strategy encodes shape-morphing directly during fabrication: modulating light exposure time layer-by-layer in vat photopolymerization introduces spatial crosslink-density variations in GelMA constructs, enabling controlled bending upon immersion as differential swelling drives deformation.', 'Abstract, strategy and deformation sentences', ['Hydrogel proof of concept; no tissue-level or in-vivo application is reviewed.']),
];
function list(value, label, max = 32) {
  if (!Array.isArray(value) || value.length > max) throw new TypeError(`Invalid ${label}`);
  return value.map(v => text(v, 2000, label));
}
function date(value) { validateSource({ citation: 'Date validation', accessedDate: value }); return value; }
function url(value) { return validateSource({ citation: 'URL validation', accessedDate: reviewedOn, url: value }).url; }
/** Validates authored scaffold-methods content as strictly as imported state; never upgrades evidence. */
export function validateScaffoldEvidenceCatalog(raw) {
  assertAllowedKeys(raw, ['schema', 'sources', 'claims'], 'scaffold-catalog');
  if (raw.schema !== SCAFFOLD_EVIDENCE_SCHEMA) throw new RangeError('Unsupported scaffold evidence schema');
  if (!Array.isArray(raw.sources) || !raw.sources.length || raw.sources.length > 64) throw new RangeError('Invalid scaffold sources');
  if (!Array.isArray(raw.claims) || !raw.claims.length || raw.claims.length > 128) throw new RangeError('Invalid scaffold claims');
  const sourceIds = new Set(), claimIds = new Set();
  for (const s of raw.sources) {
    assertAllowedKeys(s, ['id','doi','title','journalYear','onlineDate','url','fullTextUrl','identifierStatus','supportStatus','reviewedOn','reviewKind','limitations']);
    const id = text(s.id, 128, 'id'); if (sourceIds.has(id)) throw new RangeError('Duplicate scaffold source ID'); sourceIds.add(id);
    text(s.title, 2000, 'title'); if (!Number.isInteger(s.journalYear)) throw new RangeError('Invalid journal year'); finite(s.journalYear, 1900, 2100, 'journalYear');
    if (!['resolved','unreachable','unresolved','not-applicable'].includes(s.identifierStatus) || !['reviewed','unreviewed'].includes(s.supportStatus) || s.reviewKind !== 'agent-source-reading') throw new RangeError('Invalid scaffold source status');
    if (s.doi !== null && !/^10[.][0-9]{4,9}[/][^ ]+$/.test(text(s.doi, 256, 'doi'))) throw new TypeError('Invalid DOI');
    if ((s.doi === null) !== (s.identifierStatus === 'not-applicable')) throw new RangeError('Identifier status mismatch');
    url(s.url); if (s.fullTextUrl !== null) url(s.fullTextUrl);
    if (s.onlineDate !== null) date(s.onlineDate); if (s.reviewedOn !== null) date(s.reviewedOn);
    if (s.supportStatus === 'reviewed' && (!s.reviewedOn || !s.fullTextUrl)) throw new RangeError('Reviewed source needs date and text');
    list(s.limitations, 'limitations');
  }
  const foreignClaimIds = new Set([...getEvidenceCatalog().claims, ...getAgingEvidenceCatalog().claims, ...getApplicationsEvidenceCatalog().claims, ...getGeroscienceEvidenceCatalog().claims, ...getTissueEvidenceCatalog().claims].map(c => c.id));
  for (const c of raw.claims) {
    assertAllowedKeys(c, ['id','sourceId','species','modelContext','statement','locator','supportStatus','limitations']);
    const id = text(c.id, 128, 'id'); if (claimIds.has(id)) throw new RangeError('Duplicate scaffold claim ID'); claimIds.add(id);
    if (foreignClaimIds.has(id)) throw new RangeError('Scaffold claim ID collides with another catalog');
    if (!sourceIds.has(c.sourceId) || !SPECIES.includes(c.species)) throw new RangeError('Invalid scaffold claim reference/species');
    if (c.supportStatus !== 'reviewed') throw new RangeError('Scaffold claims must be reviewed');
    for (const field of ['statement','modelContext','locator']) text(c[field], 2000, field);
    if (raw.sources.find(s => s.id === c.sourceId).supportStatus !== 'reviewed') throw new RangeError('Claim cannot upgrade source');
    if (!list(c.limitations, 'limitations').length) throw new RangeError('Scaffold claim needs limitations');
  }
  return structuredClone(raw);
}
const catalog = validateScaffoldEvidenceCatalog({ schema: SCAFFOLD_EVIDENCE_SCHEMA, sources, claims });
export function getScaffoldEvidenceCatalog() { return structuredClone(catalog); }
