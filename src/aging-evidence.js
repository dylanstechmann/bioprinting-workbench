import { assertAllowedKeys, finite, text, validateSource } from './validation.js';
import { getEvidenceCatalog } from './cell-evidence.js';

/** Organism-level geroscience evidence, agent-read from fetched Europe PMC abstracts (2026-11-02). Species-separated: mouse findings never become human outcomes. */
export const AGING_EVIDENCE_SCHEMA = 'bioprinting-workbench/aging-evidence/1';
const SPECIES = ['human', 'mouse', 'other'];
const reviewedOn = '2026-11-02';
function source(id, doi, title, journalYear, url, fullTextUrl, onlineDate) {
  return { id, doi, title, journalYear, onlineDate, url, fullTextUrl, identifierStatus: 'resolved', supportStatus: 'reviewed', reviewedOn, reviewKind: 'agent-source-reading', limitations: ['Agent-run source reading of the fetched abstract, not independent domain review. No figures, protocols or datasets reproduced.'] };
}
const sources = [
  source('hallmarks-2013', '10.1016/j.cell.2013.05.039', 'The hallmarks of aging', 2013, 'https://doi.org/10.1016/j.cell.2013.05.039', 'https://europepmc.org/article/MED/23746838', '2013-06-01'),
  source('hallmarks-2023', '10.1016/j.cell.2022.11.001', 'Hallmarks of aging: An expanding universe', 2023, 'https://doi.org/10.1016/j.cell.2022.11.001', 'https://europepmc.org/article/MED/36599349', '2023-01-03'),
  source('ocampo-2016', '10.1016/j.cell.2016.11.052', 'In Vivo Amelioration of Age-Associated Hallmarks by Partial Reprogramming', 2016, 'https://doi.org/10.1016/j.cell.2016.11.052', 'https://europepmc.org/article/MED/27984723', '2016-12-01'),
  source('conboy-2005', '10.1038/nature03260', 'Rejuvenation of aged progenitor cells by exposure to a young systemic environment', 2005, 'https://doi.org/10.1038/nature03260', 'https://europepmc.org/article/MED/15716955', '2005-02-01'),
];
function claim(id, sourceId, species, modelContext, statement, locator, limitations) {
  return { id, sourceId, species, modelContext, statement, locator, supportStatus: 'reviewed', limitations };
}
const claims = [
  claim('aging-nine-hallmarks-2013', 'hallmarks-2013', 'other', 'mammalian review framing', 'The review describes aging as a progressive loss of physiological integrity and the primary risk factor for major human pathologies including cancer, diabetes, cardiovascular disorders and neurodegenerative diseases, and enumerates nine tentative hallmarks — genomic instability, telomere attrition, epigenetic alterations, loss of proteostasis, deregulated nutrient sensing, mitochondrial dysfunction, cellular senescence, stem cell exhaustion and altered intercellular communication — common to different organisms with emphasis on mammalian aging.', 'Abstract, sentences 1–2 and 4–5', ['Review-level framing, not a measurement of any person, cell or organ; no therapy, timeline or intervention claim is implied.']),
  claim('aging-twelve-hallmarks-2023', 'hallmarks-2023', 'other', 'mammalian review framing', 'The updated review proposes twelve hallmarks of aging — the nine above plus disabled macroautophagy, chronic inflammation and dysbiosis — each required to manifest with age, accelerate aging when experimentally accentuated, and offer a possible target to decelerate, stop or reverse aging by intervention; the hallmarks are described as interconnected with each other and with the hallmarks of health.', 'Abstract, sentences 1–2', ['A definitional framework; it is not evidence that any existing intervention achieves deceleration, stopping or reversal in humans.']),
  claim('reprogramming-in-vitro-age', 'ocampo-2016', 'other', 'premise from prior in-vitro literature', 'The paper states the field premise: in-vitro reprogramming to pluripotency reverses cellular age, but alteration of the aging process through reprogramming had not been directly demonstrated in vivo before this study.', 'Abstract, sentence 2', ['A research premise sentence; reprogramming to pluripotency erases cell identity and is not an aging intervention.']),
  claim('reprogramming-in-vivo-mouse', 'ocampo-2016', 'mouse', 'mouse in vivo (premature-aging model and older wild-type mice)', 'Short-term cyclic expression of Oct4, Sox2, Klf4 and c-Myc ameliorated cellular and physiological hallmarks of aging and prolonged lifespan in a mouse model of premature aging, and improved recovery from metabolic disease and muscle injury in older wild-type mice.', 'Abstract, sentences 3–4', ['Mouse in-vivo findings are never transferred to human outcomes in this workbench; no human in-vivo reprogramming result is reviewed.']),
  claim('parabiosis-systemic-factors', 'conboy-2005', 'mouse', 'mouse heterochronic parabiosis (shared circulatory system)', 'Heterochronic parabiosis — surgically joining young and old mice — restored Notch signalling activation, proliferation and regenerative capacity of aged muscle satellite cells, and increased aged hepatocyte proliferation; the authors conclude the age-related decline of progenitor cell activity can be modulated by systemic factors that change with age.', 'Abstract, sentences 4–5 and 7–8', ['A surgical mouse experiment; no human application, blood-product use or treatment is reviewed or implied.']),
];
function list(value, label, max = 32) {
  if (!Array.isArray(value) || value.length > max) throw new TypeError(`Invalid ${label}`);
  return value.map(v => text(v, 2000, label));
}
function date(value) { validateSource({ citation: 'Date validation', accessedDate: value }); return value; }
function url(value) { return validateSource({ citation: 'URL validation', accessedDate: reviewedOn, url: value }).url; }
/** Validates authored geroscience content as strictly as imported state; never upgrades evidence. */
export function validateAgingEvidenceCatalog(raw) {
  assertAllowedKeys(raw, ['schema', 'sources', 'claims'], 'aging-catalog');
  if (raw.schema !== AGING_EVIDENCE_SCHEMA) throw new RangeError('Unsupported aging evidence schema');
  if (!Array.isArray(raw.sources) || !raw.sources.length || raw.sources.length > 64) throw new RangeError('Invalid aging sources');
  if (!Array.isArray(raw.claims) || !raw.claims.length || raw.claims.length > 128) throw new RangeError('Invalid aging claims');
  const sourceIds = new Set(), claimIds = new Set();
  for (const s of raw.sources) {
    assertAllowedKeys(s, ['id','doi','title','journalYear','onlineDate','url','fullTextUrl','identifierStatus','supportStatus','reviewedOn','reviewKind','limitations']);
    const id = text(s.id, 128, 'id'); if (sourceIds.has(id)) throw new RangeError('Duplicate aging source ID'); sourceIds.add(id);
    text(s.title, 2000, 'title'); if (!Number.isInteger(s.journalYear)) throw new RangeError('Invalid journal year'); finite(s.journalYear, 1900, 2100, 'journalYear');
    if (!['resolved','unreachable','unresolved','not-applicable'].includes(s.identifierStatus) || !['reviewed','unreviewed'].includes(s.supportStatus) || s.reviewKind !== 'agent-source-reading') throw new RangeError('Invalid aging source status');
    if (s.doi !== null && !/^10[.][0-9]{4,9}[/][^ ]+$/.test(text(s.doi, 256, 'doi'))) throw new TypeError('Invalid DOI');
    if ((s.doi === null) !== (s.identifierStatus === 'not-applicable')) throw new RangeError('Identifier status mismatch');
    url(s.url); if (s.fullTextUrl !== null) url(s.fullTextUrl);
    if (s.onlineDate !== null) date(s.onlineDate); if (s.reviewedOn !== null) date(s.reviewedOn);
    if (s.supportStatus === 'reviewed' && (!s.reviewedOn || !s.fullTextUrl)) throw new RangeError('Reviewed source needs date and text');
    list(s.limitations, 'limitations');
  }
  const cellClaimIds = new Set(getEvidenceCatalog().claims.map(c => c.id));
  for (const c of raw.claims) {
    assertAllowedKeys(c, ['id','sourceId','species','modelContext','statement','locator','supportStatus','limitations']);
    const id = text(c.id, 128, 'id'); if (claimIds.has(id)) throw new RangeError('Duplicate aging claim ID'); claimIds.add(id);
    if (cellClaimIds.has(id)) throw new RangeError('Aging claim ID collides with cell-evidence claim ID');
    if (!sourceIds.has(c.sourceId) || !SPECIES.includes(c.species)) throw new RangeError('Invalid aging claim reference/species');
    if (c.supportStatus !== 'reviewed') throw new RangeError('Aging claims must be reviewed');
    for (const field of ['statement','modelContext','locator']) text(c[field], 2000, field);
    if (raw.sources.find(s => s.id === c.sourceId).supportStatus !== 'reviewed') throw new RangeError('Claim cannot upgrade source');
    if (!list(c.limitations, 'limitations').length) throw new RangeError('Aging claim needs limitations');
  }
  return structuredClone(raw);
}
const catalog = validateAgingEvidenceCatalog({ schema: AGING_EVIDENCE_SCHEMA, sources, claims });
export function getAgingEvidenceCatalog() { return structuredClone(catalog); }
