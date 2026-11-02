import { assertAllowedKeys, finite, text, validateSource } from './validation.js';
import { getEvidenceCatalog } from './cell-evidence.js';
import { getAgingEvidenceCatalog } from './aging-evidence.js';
import { getApplicationsEvidenceCatalog } from './applications-evidence.js';
import { getGeroscienceEvidenceCatalog } from './geroscience-evidence.js';

/** Tissue-atlas evidence for the frontier-target module, agent-read from fetched Europe PMC abstracts (2026-11-02). Species-separated; in-vitro and animal findings never become human outcomes. */
export const TISSUE_EVIDENCE_SCHEMA = 'bioprinting-workbench/tissue-evidence/1';
const SPECIES = ['human', 'mouse', 'other'];
const reviewedOn = '2026-11-02';
function source(id, doi, title, journalYear, url, fullTextUrl) {
  return { id, doi, title, journalYear, onlineDate: null, url, fullTextUrl, identifierStatus: 'resolved', supportStatus: 'reviewed', reviewedOn, reviewKind: 'agent-source-reading', limitations: ['Agent-run source reading of the fetched abstract, not independent domain review. No figures, protocols or datasets reproduced.'] };
}
const sources = [
  source('lung-review-2026', '10.1016/j.bioadv.2026.215240', '3D bioprinting and scaffold technology applications for the management of lung diseases.', 2026, 'https://doi.org/10.1016/j.bioadv.2026.215240', 'https://europepmc.org/article/MED/42887177'),
  source('gingiva-mechano-2025', '10.7150/thno.114503', 'Mechanotransduction-enhanced bioconstructs fabricated using a bioink comprising collagen and omega-3 fatty acids for gingival tissue regeneration.', 2025, 'https://doi.org/10.7150/thno.114503', 'https://europepmc.org/article/MED/40521200'),
  source('gingiva-substitutes-2026', '10.1016/j.bioadv.2026.215082', 'Redefining gingival substitutes: Enhanced mechanics and bioactivity in SVV-functionalised bioprinted CollMA/HAMA hydrogels.', 2026, 'https://doi.org/10.1016/j.bioadv.2026.215082', 'https://europepmc.org/article/MED/42531828'),
  source('pdl-scaffolds-2024', '10.1021/acsami.4c13830', 'Bioprinting PDLSC-Laden Collagen Scaffolds for Periodontal Ligament Regeneration.', 2024, 'https://doi.org/10.1021/acsami.4c13830', 'https://europepmc.org/article/MED/39467547'),
  source('periodontal-nanocomposite-2026', '10.3390/biomimetics11060425', '3D-Bioprinted Multifunctional Nanocomposite Scaffolds for Alveolar Bone-Periodontal Ligament-Root Cementum Regeneration.', 2026, 'https://doi.org/10.3390/biomimetics11060425', 'https://europepmc.org/article/MED/42345714'),
  source('dental-pulp-review-2026', '10.1177/19373368261485519', '3D Bioprinting Approaches for Dental Pulp Regeneration: A Scoping Review.', 2026, 'https://doi.org/10.1177/19373368261485519', 'https://europepmc.org/article/MED/42712105'),
  source('silk-neural-review-2026', '10.3390/life16060892', 'Silk-Derived 3D-Bioprinted Scaffolds for Neural Repair and Nerve Regeneration: A Comprehensive Review.', 2026, 'https://doi.org/10.3390/life16060892', 'https://europepmc.org/article/MED/42355420'),
  source('muscle-coaxial-2026', '10.1088/1758-5090/ae9597', 'One-step coaxial bioprinting of aligned and vascularized 3D skeletal muscle constructs.', 2026, 'https://doi.org/10.1088/1758-5090/ae9597', 'https://europepmc.org/article/MED/42556410'),
  source('myonuclei-pipeline-2026', '10.1016/j.isci.2026.116961', 'A semi-automated pipeline for morphological analysis of myonuclei along single muscle fibers.', 2026, 'https://doi.org/10.1016/j.isci.2026.116961', 'https://europepmc.org/article/MED/42571222'),
  source('skin-vascularized-review-2025', '10.1093/burnst/tkaf018', 'Bioprinting vascularized skin analogs: a stepwise approach.', 2025, 'https://doi.org/10.1093/burnst/tkaf018', 'https://europepmc.org/article/MED/40718701'),
  source('reprogramming-review-2026', '10.1016/j.arr.2026.103009', 'The epigenetic rejuvenation promise: Partial reprogramming as a therapeutic strategy for aging and disease.', 2026, 'https://doi.org/10.1016/j.arr.2026.103009', 'https://europepmc.org/article/MED/41490578'),
  source('circrna-osk-2026', '10.1186/s13287-026-05193-0', 'A circRNA platform for safe partial reprogramming and rejuvenation of mesenchymal stem cells without pluripotent conversion.', 2026, 'https://doi.org/10.1186/s13287-026-05193-0', 'https://europepmc.org/article/MED/42907856'),
];
function claim(id, sourceId, species, modelContext, statement, locator, limitations) {
  return { id, sourceId, species, modelContext, statement, locator, supportStatus: 'reviewed', limitations };
}
const claims = [
  claim('lung-models-not-organs', 'lung-review-2026', 'other', 'review of 3D bioprinting and scaffold strategies for lung disease', 'The review links bioprinting strategies and scaffold/bioink properties with lung-specific structural and mechanical requirements and examines applications in disease modeling, tissue regeneration and organ replacement, and drug discovery and testing, emphasizing how model design determines physiological relevance, disease-specific performance and translational potential — including no printed functional lung.', 'Abstract, sentences 4–5', ['Review of preclinical models; no printed gas-exchanging lung or human transplant result is reviewed anywhere in it.']),
  claim('gingival-fibroblast-bioconstructs', 'gingiva-mechano-2025', 'other', 'human gingival fibroblasts in printed collagen/omega-3 bioink, in vitro', 'A cell-laden collagen bioink containing omega-3 fatty acids (EPA and DHA), with human gingival fibroblasts activated by a shear-induced bioprinting process engaging mechanosensitive channels, produced printed constructs with promising gene-expression responses — while the paper states that effective vascularization and extracellular remodeling remain essential for successful gingival regeneration.', 'Abstract, Rationale, Methods and Results', ['In-vitro human-cell study; no grafted, vascularized or host-integrated gingiva is reviewed.']),
  claim('prevascularized-gingival-hydrogels', 'gingiva-substitutes-2026', 'other', 'bioprinted CollMA/HAMA hydrogels with endothelial cells, in vitro', 'SVV- and QK-functionalised CollMA/HAMA bioinks supported endothelial-cell-driven pre-vascular network formation, with interconnected networks maintained over a 14-day in-vitro pre-incubation described by the authors as a prerequisite for subsequent host anastomosis — which the study does not show.', 'Abstract, sentences 1–2', ['In-vitro pre-networks only; host anastomosis, epithelial seal and durability are not demonstrated.']),
  claim('pdlsc-laden-collagen', 'pdl-scaffolds-2024', 'other', 'bioprinted periodontal-ligament stem cells in collagen bioink, in vitro plus mouse subcutaneous implant', 'Periodontal-ligament stem cells were bioprinted in collagen-based bioinks mimicking native extracellular matrix at two concentrations; characterization covered viability and osteogenic markers, in-vivo biocompatibility was verified by subcutaneous implantation in mice, and the approach is positioned to guide periodontal ligament organization rather than prove functional loaded attachment.', 'Abstract, approach and biocompatibility sentences', ['Mouse subcutaneous biocompatibility and in-vitro assays only; oriented, load-bearing PDL insertion in humans is not established.']),
  claim('alveolar-pdl-cementum-scaffolds', 'periodontal-nanocomposite-2026', 'other', 'review of printed nanocomposite scaffolds for the periodontal complex', 'The review describes 3D-bioprinted multifunctional nanocomposite scaffolds for alveolar bone, periodontal ligament and root-cementum regeneration as dynamic microenvironments supporting cell adhesion, proliferation and differentiation, while noting that the structural complexity of these tissues has historically posed significant challenges for clinical regeneration and that guided bone regeneration remains limited.', 'Abstract, sentences 1–2 and 5', ['Review of preclinical scaffolds; no human periodontal-complex regeneration result is reviewed.']),
  claim('dental-pulp-printing-preclinical', 'dental-pulp-review-2026', 'other', 'scoping review of cell-laden 3D bioprinting for dental pulp regeneration', 'The scoping review screened 143 records and included 13 cell-laden bioprinting studies for dental pulp regeneration, all preclinical investigations published between 2018 and 2026, with extrusion-based printing the most frequent modality and GelMA the predominant bioink base — meaning the pulp-dentin complex is supported only in models, not in patients.', 'Abstract, screening-results sentence (excerpt)', ['All included studies preclinical; no human bioprinted dental pulp result is reviewed.']),
  claim('silk-nerve-scaffolds', 'silk-neural-review-2026', 'other', 'review of silk-derived bioprinted neural scaffolds', 'The review highlights silk-fibroin composite scaffolds, often incorporating collagen or conductive polymers, as promising bioprinted neural tissue scaffolds, examining how material composition, scaffold architecture and fabrication strategy influence biological response — while framing the field around limited nerve regeneration and functional deficits and not establishing restored human nerve function.', 'Abstract, sentences 1–2 and 4', ['Review of preclinical scaffolds; no restored human peripheral-nerve function is reviewed.']),
  claim('aligned-vascularized-muscle', 'muscle-coaxial-2026', 'other', 'coaxial-bioprinted aligned skeletal-muscle constructs, in vitro', 'A one-step coaxial bioprinting strategy fabricated aligned and vascularized skeletal-muscle constructs in a single step: shear stress during printing induced myoblast alignment and promoted myogenic differentiation, compartmentalization separated muscle and vascular domains, and dynamic culture supported the constructs — presented as a route toward vascularized muscle grafts for volumetric muscle loss, for which the paper states effective therapeutic options remain limited.', 'Abstract, strategy and shear-alignment sentences', ['In-vitro constructs; no implanted, innervated or force-producing human muscle graft is reviewed.']),
  claim('myonuclei-are-measurable', 'myonuclei-pipeline-2026', 'human', 'validated imaging-analysis pipeline on human single muscle fibers', 'A semi-automated, validated image-analysis pipeline quantifies myonuclear number, position, shape and three-dimensional orientation along individual muscle fibers, reporting per-fiber and biopsy-level summaries — a measurement tool for myonuclear spatial organization in real human tissue, not a method to produce or print it.', 'Abstract, problem, pipeline and analyses sentences', ['Measurement pipeline on biopsy material; it quantifies architecture and creates none.']),
  claim('vascularized-skin-analogs', 'skin-vascularized-review-2025', 'other', 'review of bioprinted vascularized skin substitutes', 'The stepwise review examines printing modalities, ink formulations and cell-sourcing strategies for vascularized skin analogs, stating that integrating functional vascular networks within engineered skin constructs is indispensable for nutrient perfusion and overall tissue viability, with ink components considered for their roles in angiogenesis and blood-vessel formation within printed constructs.', 'Abstract, sentences 2–3', ['Review-level status; no clinically transplanted vascularized printed skin is reviewed.']),
  claim('lineage-preserving-reprogramming-checklist', 'reprogramming-review-2026', 'other', 'review of partial reprogramming as a therapeutic strategy', 'The review links lineage-preserving partial reprogramming to quantifiable rejuvenation endpoints, defines mesenchymal drift as an age- and disease-associated trajectory amenable to reversal, maps strategies beyond OSKM including small-molecule programs and CRISPR-based control circuits, and proposes a translational checklist emphasizing schedule, delivery and safety pharmacology to de-risk early clinical entry points.', 'Abstract, contributions and checklist sentences', ['Review with a preclinical checklist; no human partial-reprogramming therapy is reviewed as established.']),
  claim('transient-nonintegrating-reprogramming', 'circrna-osk-2026', 'other', 'LNP-delivered circRNA partial reprogramming of mesenchymal stem cells, in vitro', 'A lipid-nanoparticle-delivered circular RNA co-expressing OCT4, SOX2 and KLF4 achieved transient, coordinated partial-reprogramming factor expression without genomic modification; senescent late-passage mesenchymal stem cells showed reduced beta-galactosidase activity, DNA-damage markers and inflammatory cytokine secretion, and a droplet-digital-PCR pluripotency check indicated the delivery alone was insufficient to convert the cells into induced pluripotent stem cells.', 'Abstract, Background, Methods and Results', ['In-vitro MSC study; no human dosing, schedule or in-vivo rejuvenation is established.']),
];
function list(value, label, max = 32) {
  if (!Array.isArray(value) || value.length > max) throw new TypeError(`Invalid ${label}`);
  return value.map(v => text(v, 2000, label));
}
function date(value) { validateSource({ citation: 'Date validation', accessedDate: value }); return value; }
function url(value) { return validateSource({ citation: 'URL validation', accessedDate: reviewedOn, url: value }).url; }
/** Validates authored tissue-atlas content as strictly as imported state; never upgrades evidence. */
export function validateTissueEvidenceCatalog(raw) {
  assertAllowedKeys(raw, ['schema', 'sources', 'claims'], 'tissue-catalog');
  if (raw.schema !== TISSUE_EVIDENCE_SCHEMA) throw new RangeError('Unsupported tissue evidence schema');
  if (!Array.isArray(raw.sources) || !raw.sources.length || raw.sources.length > 64) throw new RangeError('Invalid tissue sources');
  if (!Array.isArray(raw.claims) || !raw.claims.length || raw.claims.length > 128) throw new RangeError('Invalid tissue claims');
  const sourceIds = new Set(), claimIds = new Set();
  for (const s of raw.sources) {
    assertAllowedKeys(s, ['id','doi','title','journalYear','onlineDate','url','fullTextUrl','identifierStatus','supportStatus','reviewedOn','reviewKind','limitations']);
    const id = text(s.id, 128, 'id'); if (sourceIds.has(id)) throw new RangeError('Duplicate tissue source ID'); sourceIds.add(id);
    text(s.title, 2000, 'title'); if (!Number.isInteger(s.journalYear)) throw new RangeError('Invalid journal year'); finite(s.journalYear, 1900, 2100, 'journalYear');
    if (!['resolved','unreachable','unresolved','not-applicable'].includes(s.identifierStatus) || !['reviewed','unreviewed'].includes(s.supportStatus) || s.reviewKind !== 'agent-source-reading') throw new RangeError('Invalid tissue source status');
    if (s.doi !== null && !/^10[.][0-9]{4,9}[/][^ ]+$/.test(text(s.doi, 256, 'doi'))) throw new TypeError('Invalid DOI');
    if ((s.doi === null) !== (s.identifierStatus === 'not-applicable')) throw new RangeError('Identifier status mismatch');
    url(s.url); if (s.fullTextUrl !== null) url(s.fullTextUrl);
    if (s.onlineDate !== null) date(s.onlineDate); if (s.reviewedOn !== null) date(s.reviewedOn);
    if (s.supportStatus === 'reviewed' && (!s.reviewedOn || !s.fullTextUrl)) throw new RangeError('Reviewed source needs date and text');
    list(s.limitations, 'limitations');
  }
  const foreignClaimIds = new Set([...getEvidenceCatalog().claims, ...getAgingEvidenceCatalog().claims, ...getApplicationsEvidenceCatalog().claims, ...getGeroscienceEvidenceCatalog().claims].map(c => c.id));
  for (const c of raw.claims) {
    assertAllowedKeys(c, ['id','sourceId','species','modelContext','statement','locator','supportStatus','limitations']);
    const id = text(c.id, 128, 'id'); if (claimIds.has(id)) throw new RangeError('Duplicate tissue claim ID'); claimIds.add(id);
    if (foreignClaimIds.has(id)) throw new RangeError('Tissue claim ID collides with another catalog');
    if (!sourceIds.has(c.sourceId) || !SPECIES.includes(c.species)) throw new RangeError('Invalid tissue claim reference/species');
    if (c.supportStatus !== 'reviewed') throw new RangeError('Tissue claims must be reviewed');
    for (const field of ['statement','modelContext','locator']) text(c[field], 2000, field);
    if (raw.sources.find(s => s.id === c.sourceId).supportStatus !== 'reviewed') throw new RangeError('Claim cannot upgrade source');
    if (!list(c.limitations, 'limitations').length) throw new RangeError('Tissue claim needs limitations');
  }
  return structuredClone(raw);
}
const catalog = validateTissueEvidenceCatalog({ schema: TISSUE_EVIDENCE_SCHEMA, sources, claims });
export function getTissueEvidenceCatalog() { return structuredClone(catalog); }
