import { assertAllowedKeys, finite, text, validateSource } from './validation.js';

export const CELL_TYPE_IDS = Object.freeze(['msc', 'endothelial', 'fibroblast', 'ipsc', 'esc', 'hepatocyte', 'cholangiocyte', 'liver-sinusoidal-endothelial', 'liver-stromal', 'liver-immune']);
const all = [...CELL_TYPE_IDS];
const reviewedOn = '2026-11-01';
function source(id, doi, title, journalYear, url, fullTextUrl = url, onlineDate = null) {
  return { id, doi, title, journalYear, onlineDate, url, fullTextUrl, identifierStatus: doi ? 'resolved' : 'not-applicable', supportStatus: 'reviewed', reviewedOn, reviewKind: 'agent-source-reading', limitations: ['Source reading is agent-run, not independent domain review. No figures, protocols or datasets reproduced.'] };
}
const sources = [
  source('bhat', '10.1038/s41598-021-83088-1', 'Expansion and characterization of bone marrow derived human mesenchymal stromal cells in serum-free conditions', 2021, 'https://doi.org/10.1038/s41598-021-83088-1', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7873235/'),
  source('ghule', '10.1002/jcp.22440', 'Reprogramming the pluripotent cell cycle: Restoration of an abbreviated G1 phase in human induced pluripotent stem (iPS) cells', 2011, 'https://doi.org/10.1002/jcp.22440', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3045197/'),
  source('halliwell', '10.1016/j.stemcr.2020.04.004', 'Nucleosides Rescue Replication-Mediated Genome Instability of Human Pluripotent Stem Cells', 2020, 'https://doi.org/10.1016/j.stemcr.2020.04.004', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7355123/'),
  source('kurashima', '10.1038/s44319-024-00207-5', 'Embryonic stem cells maintain high origin activity and slow forks to coordinate replication with cell cycle progression', 2024, 'https://doi.org/10.1038/s44319-024-00207-5', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11387781/'),
  source('merkle', '10.1038/nature22312', 'Human pluripotent stem cells recurrently acquire and expand dominant negative P53 mutations', 2017, 'https://doi.org/10.1038/nature22312', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5427175/'),
  source('sturm', '10.1080/15592294.2019.1626651', 'Human aging DNA methylation signatures are conserved but accelerated in cultured fibroblasts', 2019, 'https://doi.org/10.1080/15592294.2019.1626651', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6691995/'),
  source('yuan', '10.1038/s41586-025-09884-1', 'Human assembloids recapitulate periportal liver tissue in vitro', 2026, 'https://doi.org/10.1038/s41586-025-09884-1', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12893922/', '2025-12-17'),
  source('cycle', null, 'NHGRI: Cell Cycle', 2026, 'https://www.genome.gov/genetics-glossary/Cell-Cycle'),
  source('dna', null, 'NHGRI: DNA Replication', 2026, 'https://www.genome.gov/genetics-glossary/DNA-Replication'),
  source('culture', null, 'ATCC: Primary Cell Culture Guide', 2026, 'https://www.atcc.org/resources/culture-guides/primary-cell-culture-guide'),
];
function claim(id, sourceId, cellTypeIds, statement, locator, limitations, modelContext = 'human cell culture', species = 'human') {
  return { id, sourceId, cellTypeIds, species, modelContext, statement, locator, supportStatus: 'reviewed', limitations };
}
const claims = [
  claim('cycle-location', 'cycle', all, 'Nuclear DNA is copied in S phase; mitosis partitions chromosomes and cytokinesis separates daughter cells. Cell-cycle duration is not automatically the population doubling time.', 'Definition and narration', ['No universal duration or synchronization is inferred.'], 'cell-cycle definitions'),
  claim('copy-genome', 'dna', all, 'DNA replication copies the genome before division; it is not the creation of a new organ.', 'Definition', ['No error rate or repair treatment is specified.'], 'DNA replication definition'),
  claim('culture-location', 'culture', all, 'Culture vessels are housed in controlled culture equipment; microscopy is used for observation. Primary-cell comparisons are sensitive to donor and culture differences.', 'Primary cell culture introduction; Challenges; endothelial culture and microscopy sections', ['Conceptual equipment mapping only. No handling instructions or equipment settings.']),
  claim('msc-variability', 'bhat', ['msc'], 'The Figure 4 caption reports BM-MSC population doubling times across compared conditions of about 22–46 hours, excluding one formulation; Results include different P4–P5 summaries.', 'Figure 4 caption; Results: growth kinetics; Discussion', ['Study-specific comparison, not a universal interval, confidence interval or schedule. Distinct endpoints must not be pooled.']),
  claim('pluripotent-cycle', 'ghule', ['ipsc', 'esc'], 'The studied human iPS and hES cultures showed an approximately 16–18-hour cell cycle, measured between successive S phases.', 'Results: Reprogrammed Pluripotent Cells Have an Abbreviated Cell Cycle of 16–18 Hours; Figure 6', ['Cell-cycle observation, not population doubling or a duration for differentiated derivatives.']),
  claim('fibroblast-senescence', 'sturm', ['fibroblast'], 'The studied primary dermal fibroblast culture slowed to a replicative-senescence plateau.', 'Results: Primary human fibroblasts grown across the cellular lifespan; Figure 1b', ['A specified donor culture; no universal fibroblast lifespan or indefinite expansion is inferred.']),
  claim('replication-stress', 'halliwell', ['ipsc', 'esc'], 'Nucleosides added to culture medium reduced replication stress, genome-damage markers and mitotic aberrations in the studied human PSC cultures.', 'Summary; Results and Discussion; Figure 3', ['Not a generic coating or repair recipe. No demonstrated reversal of existing mutations, removal of mutant clones, cancer prevention or graft-safety guarantee.']),
  claim('culture-selection', 'merkle', ['ipsc', 'esc'], 'TP53-mutant subpopulations expanded across passages in the studied hESC cultures; the broader screen also included hiPSC lines.', 'Results; Figure 3d; Figure 4', ['Selection is different from counting replication events. Not every line had detectable mutations; no cancer probability is computed.']),
  claim('halliwell-survival', 'halliwell', ['ipsc', 'esc'], 'Nucleoside supplementation improved survival, clonogenicity and population growth in the studied human PSC cultures; of tracked seeded MIFF1 cells, 68% versus 79% entered mitosis and 59% versus 91% formed colonies without versus with supplementation.', 'Summary; Results and Discussion; Figures 4A and 4B', ['Study-specific clonogenic tracking. No transplant, cancer-risk, mutation-reversal or whole-organ endpoint.']),
  claim('kurashima-es-culture', 'kurashima', ['esc'], 'The reviewed mouse ES cultures (line E14Tg2A) were maintained in G-MEM with 10% FBS, non-essential amino acids, sodium pyruvate, β-mercaptoethanol, penicillin-streptomycin and leukemia inhibitory factor at 37 °C with 5% CO₂.', 'Methods: Cell culture', ['A published method description for the reviewed study only; the same paper reports adverse outcomes for forced fork acceleration.'], 'mouse ES cell culture (in vitro)', 'mouse'),
  claim('kurashima-fork-acceleration', 'kurashima', ['esc'], 'In mouse ES cells, exogenous ribonucleoside supplementation accelerated replication-fork speed throughout S phase and reduced active origin density while S-phase duration stayed similar and the overall growth rate was not affected.', 'Results and discussion: fork acceleration and origin activation sections; Figures 3 and 4', ['Fork-speed change is not a growth-rate, doubling-time or timeline change.'], 'mouse ES cell culture (in vitro)', 'mouse'),
  claim('kurashima-miscoordination', 'kurashima', ['esc'], 'Forced fork acceleration in mouse ES cells caused miscoordination between completion of DNA replication and cell-cycle progression, increasing ultra-fine bridges from about 20% to about 40% of cells and micronuclei; γH2AX increased from 6.1% to 13.1%.', 'Abstract; Results and discussion: Replication fork acceleration causes miscoordination between DNA replication and cell cycle progression in ES cells; Figures 3E and 4C–G', ['Adverse in-vitro mouse finding. It is not evidence about human outcomes, treatment safety or organ production.'], 'mouse ES cell culture (in vitro)', 'mouse'),
  claim('kurashima-human-ips-nuance', 'kurashima', ['ipsc'], 'In one tested human iPS cell line (PChiPS771), nucleoside supplementation at 0.5×, 1× or 2× the suggested concentration did not reduce fork asymmetry under the tested medium condition.', 'Results and discussion: fork pausing section; Figure EV3G', ['A single-line, single-condition observation; it neither confirms nor contradicts the Halliwell endpoints by itself.'], 'human iPS cell culture (in vitro)'),
  claim('liver-assembloid', 'yuan', ['hepatocyte', 'cholangiocyte', 'liver-sinusoidal-endothelial', 'liver-stromal', 'liver-immune'], 'The work assembled human periportal liver tissue models containing hepatocyte and cholangiocyte compartments with portal fibroblasts, not a complete liver.', 'Abstract; Introduction; Discussion', ['Human in-vitro model and reported mouse experiments are different endpoints. No whole-liver production duration is established.'], 'human periportal liver assembloids in vitro'),
  claim('liver-gaps', 'yuan', ['hepatocyte', 'cholangiocyte', 'liver-sinusoidal-endothelial', 'liver-stromal', 'liver-immune'], 'The Discussion identifies absent immune/other mesenchymal populations and portal vasculature as limitations.', 'Discussion', ['No generic endothelial or stromal population is automatically equivalent to its liver-specific counterpart.'], 'scope limitations of a periportal assembloid'),
];
const descriptions = [
  ['msc', 'Mesenchymal stromal cells', ['Stromal tissue-engineering context; not automatically hepatocytes.'], ['msc-variability'], ['msc-time']],
  ['endothelial', 'Endothelial cells', ['Vessel-lining research context; generic cells are not automatically liver sinusoidal endothelium.'], ['culture-location'], ['endothelial-unknown']],
  ['fibroblast', 'Fibroblasts', ['Connective-tissue/stromal culture context.'], ['fibroblast-senescence'], ['fibroblast-unknown']],
  ['ipsc', 'Induced pluripotent stem cells (iPSCs)', ['Pluripotent source, distinct from differentiated derivatives.'], ['pluripotent-cycle', 'replication-stress', 'halliwell-survival', 'culture-selection', 'kurashima-human-ips-nuance'], ['ipsc-cycle']],
  ['esc', 'Embryonic pluripotent stem cells', ['Pluripotent research comparison, not interchangeable with all iPSC lines.'], ['pluripotent-cycle', 'replication-stress', 'halliwell-survival', 'culture-selection'], ['esc-cycle']],
  ['hepatocyte', 'Hepatocytes / hepatocyte-like derivatives', ['Liver parenchymal context; identity and maturity are distinct from cell number.'], ['liver-assembloid', 'liver-gaps'], ['hepatocyte-unknown']],
  ['cholangiocyte', 'Cholangiocytes', ['Biliary epithelial compartment in the cited liver model.'], ['liver-assembloid', 'liver-gaps'], ['cholangiocyte-unknown']],
  ['liver-sinusoidal-endothelial', 'Liver sinusoidal endothelial context', ['Liver-specific endothelial identity is an evidence gap here.'], ['liver-gaps'], ['liver-sinusoidal-endothelial-unknown']],
  ['liver-stromal', 'Liver stromal / stellate / portal-fibroblast context', ['Portal fibroblasts appear in the cited model; stromal subtypes remain distinct.'], ['liver-assembloid', 'liver-gaps'], ['liver-stromal-unknown']],
  ['liver-immune', 'Liver resident immune-cell context', ['Immune populations are absent from the cited assembloid model.'], ['liver-gaps'], ['liver-immune-unknown']],
];
const profiles = descriptions.map(([id, label, roles, claimIds, timingIds]) => ({ id, label, roles, cultureLocation: 'Conceptual bench mapping: culture vessel in controlled culture equipment; microscope for observation. Later construct studies may use culture/perfusion chambers. No device settings or culture schedule.', claimIds: ['cycle-location', 'copy-genome', 'culture-location', ...claimIds.filter(c => c !== 'culture-location')], timingIds, uncertainties: ['Identity, contamination, genomic stability, passage effects and function are not measured by this app.'] }));
const timings = profiles.map(p => {
  const known = p.id === 'msc' || ['ipsc', 'esc'].includes(p.id);
  return { id: p.timingIds[0], claimId: p.id === 'msc' ? 'msc-variability' : ['ipsc', 'esc'].includes(p.id) ? 'pluripotent-cycle' : p.claimIds.at(-1), cellTypeId: p.id, metric: ['ipsc', 'esc'].includes(p.id) ? 'cell-cycle' : 'population-doubling', hours: known ? p.id === 'msc' ? { min: 22, max: 46 } : { min: 16, max: 18 } : null, valueKind: known ? 'reported-range' : 'not-established', statistic: known ? 'Approximate reported range, not a confidence interval' : null, context: known ? 'Read-only literature observation; never automatically applied to arithmetic controls.' : 'A transferable timing interval is not established from the reviewed sources for this cell category.', limitations: [known ? claims.find(c => c.id === (p.id === 'msc' ? 'msc-variability' : 'pluripotent-cycle')).limitations[0] : 'Unknown does not mean zero growth or that no literature exists.'] };
});

function list(value, label, max = 32) {
  if (!Array.isArray(value) || value.length > max) throw new TypeError(`Invalid ${label}`);
  return value.map(v => text(v, 2000, label));
}
function date(value) { validateSource({ citation: 'Date validation', accessedDate: value }); return value; }
function url(value) { return validateSource({ citation: 'URL validation', accessedDate: reviewedOn, url: value }).url; }
/** Validates authored content as strictly as imported state; never upgrades evidence. */
export function validateEvidenceCatalog(raw) {
  assertAllowedKeys(raw, ['sources', 'claims', 'profiles', 'timings'], 'catalog');
  const groups = {};
  for (const key of ['sources', 'claims', 'profiles', 'timings']) {
    if (!Array.isArray(raw[key]) || !raw[key].length || raw[key].length > 128) throw new RangeError(`Invalid ${key}`);
    groups[key] = new Set();
    for (const row of raw[key]) { const id = text(row.id, 128, 'id'); if (groups[key].has(id)) throw new RangeError('Duplicate evidence ID'); groups[key].add(id); }
  }
  for (const s of raw.sources) {
    assertAllowedKeys(s, ['id','doi','title','journalYear','onlineDate','url','fullTextUrl','identifierStatus','supportStatus','reviewedOn','reviewKind','limitations']);
    text(s.title, 2000, 'title'); finite(s.journalYear, 1900, 2100, 'journalYear');
    if (!Number.isInteger(s.journalYear) || !['resolved','unreachable','unresolved','not-applicable'].includes(s.identifierStatus) || !['reviewed','unreviewed'].includes(s.supportStatus) || s.reviewKind !== 'agent-source-reading') throw new RangeError('Invalid evidence status');
    if (s.doi !== null && !/^10\.\d{4,9}\/\S+$/.test(text(s.doi, 256, 'doi'))) throw new TypeError('Invalid DOI');
    if ((s.doi === null) !== (s.identifierStatus === 'not-applicable')) throw new RangeError('Identifier status mismatch');
    url(s.url); if (s.fullTextUrl !== null) url(s.fullTextUrl);
    if (s.onlineDate !== null) date(s.onlineDate);
    if (s.reviewedOn !== null) date(s.reviewedOn);
    if (s.supportStatus === 'reviewed' && (!s.reviewedOn || !s.fullTextUrl)) throw new RangeError('Reviewed source needs date and text');
    list(s.limitations, 'limitations');
  }
  for (const c of raw.claims) {
    assertAllowedKeys(c, ['id','sourceId','cellTypeIds','species','modelContext','statement','locator','supportStatus','limitations']);
    if (!groups.sources.has(c.sourceId) || !['human','mouse','other'].includes(c.species) || !['reviewed','unreviewed'].includes(c.supportStatus)) throw new RangeError('Invalid claim reference/status');
    const ids = list(c.cellTypeIds, 'cellTypeIds'); if (!ids.length || ids.some(id => !CELL_TYPE_IDS.includes(id))) throw new RangeError('Unknown claim cell type');
    for (const field of ['statement','modelContext','locator']) text(c[field], 2000, field);
    if (c.supportStatus === 'reviewed' && raw.sources.find(s => s.id === c.sourceId).supportStatus !== 'reviewed') throw new RangeError('Claim cannot upgrade source');
    list(c.limitations, 'limitations');
  }
  for (const t of raw.timings) {
    assertAllowedKeys(t, ['id','claimId','cellTypeId','metric','hours','valueKind','statistic','context','limitations']);
    const c = raw.claims.find(c => c.id === t.claimId);
    if (!c || !c.cellTypeIds.includes(t.cellTypeId) || !CELL_TYPE_IDS.includes(t.cellTypeId) || !['cell-cycle','population-doubling','culture-observation'].includes(t.metric)) throw new RangeError('Invalid timing reference/metric');
    if (!['point','reported-range','not-established'].includes(t.valueKind)) throw new RangeError('Invalid timing kind');
    if (t.valueKind === 'not-established') { if (t.hours !== null || t.statistic !== null) throw new RangeError('Unknown timing must be null'); }
    else {
      assertAllowedKeys(t.hours, ['min','max']); finite(t.hours.min, Number.MIN_VALUE, 1e9, 'min'); finite(t.hours.max, t.hours.min, 1e9, 'max');
      if (c.supportStatus !== 'reviewed' || (t.valueKind === 'point' && t.hours.min !== t.hours.max)) throw new RangeError('Unsupported numeric timing');
      text(t.statistic, 2000, 'statistic');
    }
    text(t.context, 2000, 'context'); list(t.limitations, 'limitations');
  }
  for (const p of raw.profiles) {
    assertAllowedKeys(p, ['id','label','roles','cultureLocation','claimIds','timingIds','uncertainties']);
    if (!CELL_TYPE_IDS.includes(p.id)) throw new RangeError('Unknown profile');
    text(p.label, 2000, 'label'); text(p.cultureLocation, 2000, 'cultureLocation'); list(p.roles, 'roles'); list(p.uncertainties, 'uncertainties');
    if (!list(p.claimIds, 'claimIds').length || p.claimIds.some(id => !groups.claims.has(id))) throw new RangeError('Dangling profile claim');
    if (!list(p.timingIds, 'timingIds').length || p.timingIds.some(id => !raw.timings.some(t => t.id === id && t.cellTypeId === p.id))) throw new RangeError('Dangling profile timing');
  }
  if (CELL_TYPE_IDS.some(id => !groups.profiles.has(id))) throw new RangeError('Missing cell profile');
  return structuredClone(raw);
}
const catalog = validateEvidenceCatalog({ sources, claims, profiles, timings });
export function getEvidenceCatalog() { return structuredClone(catalog); }
export function getCellProfile(id) { const p = catalog.profiles.find(p => p.id === id); if (!p) throw new RangeError('Unknown cell type'); return structuredClone(p); }
export function getTimingObservations(id) { return getCellProfile(id).timingIds.map(key => structuredClone(catalog.timings.find(t => t.id === key))); }
export function getClaimsForCell(id) { return getCellProfile(id).claimIds.map(key => structuredClone(catalog.claims.find(c => c.id === key))); }