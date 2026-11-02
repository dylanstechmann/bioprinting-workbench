import { assertAllowedKeys, finite, text, validateSource } from './validation.js';
import { getEvidenceCatalog } from './cell-evidence.js';
import { getAgingEvidenceCatalog } from './aging-evidence.js';
import { getApplicationsEvidenceCatalog } from './applications-evidence.js';

/** Geroscience-lever evidence for the research-program framework, agent-read from fetched Europe PMC abstracts (2026-11-02). Species-separated; mouse findings never become human outcomes. */
export const GEROSCIENCE_EVIDENCE_SCHEMA = 'bioprinting-workbench/geroscience-evidence/1';
const SPECIES = ['human', 'mouse', 'other'];
const reviewedOn = '2026-11-02';
function source(id, doi, title, journalYear, url, fullTextUrl) {
  return { id, doi, title, journalYear, onlineDate: null, url, fullTextUrl, identifierStatus: 'resolved', supportStatus: 'reviewed', reviewedOn, reviewKind: 'agent-source-reading', limitations: ['Agent-run source reading of the fetched abstract, not independent domain review. No figures, protocols or datasets reproduced.'] };
}
const sources = [
  source('senolytic-review-2026', '10.1080/14728222.2026.2738910', 'Senolytics for cancer treatment: complexities and opportunities.', 2026, 'https://doi.org/10.1080/14728222.2026.2738910', 'https://europepmc.org/article/MED/42775553'),
  source('rapamycin-2009', '10.1038/nature08221', 'Rapamycin fed late in life extends lifespan in genetically heterogeneous mice.', 2009, 'https://doi.org/10.1038/nature08221', 'https://europepmc.org/article/MED/19587680'),
  source('nad-review-2026', '10.2174/0113895575469704260805105227', 'Nicotinamide Adenine Dinucleotide and Its Anti-aging Effects in the Context of Longevity and Menopause.', 2026, 'https://doi.org/10.2174/0113895575469704260805105227', 'https://europepmc.org/article/MED/42669985'),
  source('horvath-clock-2013', '10.1186/gb-2013-14-10-r115', 'DNA methylation age of human tissues and cell types.', 2013, 'https://doi.org/10.1186/gb-2013-14-10-r115', 'https://europepmc.org/article/MED/24138928'),
];
function claim(id, sourceId, species, modelContext, statement, locator, limitations) {
  return { id, sourceId, species, modelContext, statement, locator, supportStatus: 'reviewed', limitations };
}
const claims = [
  claim('senolytics-translation-limits', 'senolytic-review-2026', 'other', 'review of senolytic translation in cancer-treatment senescence', 'The review describes translation constraints for senescence-eliminating agents: outcomes differ between aging and tumor cell models, efficacy varies by tumor background, efficacious agents do not necessarily eliminate the risk of proliferative recovery, and several of the highest-efficacy compounds carry established or potential adverse effects; translation is constrained by therapy-induced-senescence heterogeneity, the risk of targeting beneficial senescent cells, and the absence of validated clinical trial designs.', 'Abstract, Introduction and Expert opinion', ['A cancer-treatment review, not an aging-intervention trial; it constrains expectations and supports no dosing or use.']),
  claim('rapamycin-lifespan-mice', 'rapamycin-2009', 'mouse', 'genetically heterogeneous mice at three independent test sites', 'Rapamycin, an mTOR-pathway inhibitor, extended median and maximal lifespan when fed beginning at 600 days of age in genetically heterogeneous mice at three independent sites — an increase at the 90%-mortality point of 14% for females and 9% for males — with disease patterns of treated mice not differing from controls; the authors note rapamycin may extend lifespan by postponing death from cancer, by retarding mechanisms of aging, or both.', 'Abstract, sentences 2–4 and 7', ['Mouse lifespan pharmacology; the abstract itself does not separate anti-aging from cancer-postponement effects, and no human outcome is reviewed.']),
  claim('nad-precursor-limits', 'nad-review-2026', 'other', 'narrative review of NAD+ metabolism, aging and menopause', 'The review links declining NAD+ during aging to mitochondrial dysfunction, impaired metabolic regulation, chronic inflammatory signaling and neurodegenerative alterations, and reports that precursors such as NMN and NR show promising biological effects in experimental studies, while human translation faces limitations including pharmacokinetic instability and tissue-specific bioavailability.', 'Abstract, sentences 6–7', ['Narrative review; experimental effects and human limitations are cited without effect sizes and support no supplementation recommendation.']),
  claim('methylation-age-clock', 'horvath-clock-2013', 'human', 'multi-tissue epigenetic age predictor (8,000 samples, 51 tissues and cell types)', 'The multi-tissue DNA methylation age predictor — built from 8,000 samples across 82 Illumina datasets and 51 healthy tissues and cell types — is close to zero for embryonic and induced pluripotent stem cells, correlates with cell passage number, gives rise to a highly heritable measure of age acceleration, and is applicable to chimpanzee tissues; the author proposes it measures the cumulative effect of an epigenetic maintenance system.', 'Abstract, Background, Results and Conclusions', ['A correlational readout validated on human tissues; the abstract does not establish that changing the clock reading changes aging.']),
];
function list(value, label, max = 32) {
  if (!Array.isArray(value) || value.length > max) throw new TypeError(`Invalid ${label}`);
  return value.map(v => text(v, 2000, label));
}
function date(value) { validateSource({ citation: 'Date validation', accessedDate: value }); return value; }
function url(value) { return validateSource({ citation: 'URL validation', accessedDate: reviewedOn, url: value }).url; }
/** Validates authored geroscience content as strictly as imported state; never upgrades evidence. */
export function validateGeroscienceEvidenceCatalog(raw) {
  assertAllowedKeys(raw, ['schema', 'sources', 'claims'], 'geroscience-catalog');
  if (raw.schema !== GEROSCIENCE_EVIDENCE_SCHEMA) throw new RangeError('Unsupported geroscience evidence schema');
  if (!Array.isArray(raw.sources) || !raw.sources.length || raw.sources.length > 64) throw new RangeError('Invalid geroscience sources');
  if (!Array.isArray(raw.claims) || !raw.claims.length || raw.claims.length > 128) throw new RangeError('Invalid geroscience claims');
  const sourceIds = new Set(), claimIds = new Set();
  for (const s of raw.sources) {
    assertAllowedKeys(s, ['id','doi','title','journalYear','onlineDate','url','fullTextUrl','identifierStatus','supportStatus','reviewedOn','reviewKind','limitations']);
    const id = text(s.id, 128, 'id'); if (sourceIds.has(id)) throw new RangeError('Duplicate geroscience source ID'); sourceIds.add(id);
    text(s.title, 2000, 'title'); if (!Number.isInteger(s.journalYear)) throw new RangeError('Invalid journal year'); finite(s.journalYear, 1900, 2100, 'journalYear');
    if (!['resolved','unreachable','unresolved','not-applicable'].includes(s.identifierStatus) || !['reviewed','unreviewed'].includes(s.supportStatus) || s.reviewKind !== 'agent-source-reading') throw new RangeError('Invalid geroscience source status');
    if (s.doi !== null && !/^10[.][0-9]{4,9}[/][^ ]+$/.test(text(s.doi, 256, 'doi'))) throw new TypeError('Invalid DOI');
    if ((s.doi === null) !== (s.identifierStatus === 'not-applicable')) throw new RangeError('Identifier status mismatch');
    url(s.url); if (s.fullTextUrl !== null) url(s.fullTextUrl);
    if (s.onlineDate !== null) date(s.onlineDate); if (s.reviewedOn !== null) date(s.reviewedOn);
    if (s.supportStatus === 'reviewed' && (!s.reviewedOn || !s.fullTextUrl)) throw new RangeError('Reviewed source needs date and text');
    list(s.limitations, 'limitations');
  }
  const foreignClaimIds = new Set([...getEvidenceCatalog().claims, ...getAgingEvidenceCatalog().claims, ...getApplicationsEvidenceCatalog().claims].map(c => c.id));
  for (const c of raw.claims) {
    assertAllowedKeys(c, ['id','sourceId','species','modelContext','statement','locator','supportStatus','limitations']);
    const id = text(c.id, 128, 'id'); if (claimIds.has(id)) throw new RangeError('Duplicate geroscience claim ID'); claimIds.add(id);
    if (foreignClaimIds.has(id)) throw new RangeError('Geroscience claim ID collides with another catalog');
    if (!sourceIds.has(c.sourceId) || !SPECIES.includes(c.species)) throw new RangeError('Invalid geroscience claim reference/species');
    if (c.supportStatus !== 'reviewed') throw new RangeError('Geroscience claims must be reviewed');
    for (const field of ['statement','modelContext','locator']) text(c[field], 2000, field);
    if (raw.sources.find(s => s.id === c.sourceId).supportStatus !== 'reviewed') throw new RangeError('Claim cannot upgrade source');
    if (!list(c.limitations, 'limitations').length) throw new RangeError('Geroscience claim needs limitations');
  }
  return structuredClone(raw);
}
const catalog = validateGeroscienceEvidenceCatalog({ schema: GEROSCIENCE_EVIDENCE_SCHEMA, sources, claims });
export function getGeroscienceEvidenceCatalog() { return structuredClone(catalog); }
