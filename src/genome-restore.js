// Genome-backup-and-restore idea assessment: the owner's proposal, decomposed into steps,
// each carrying verbatim-quoted open-access evidence and an honest verdict. Recording
// information in DNA is real research (barcodes, lineage); writing a whole stored genome back
// into living cells is not. This module computes verdicts from its catalog and upgrades nothing.
import { assertAllowedKeys, text } from './validation.js';

export const GENOME_RESTORE_SCHEMA = 'bioprinting-workbench/genome-restore-evidence/1';
export const GENOME_RESTORE_STEPS = Object.freeze([
  { id: 'digital-backup', label: 'Record the original genome digitally (SSD/HDD)', claimCount: 2 },
  { id: 'organic-reserve', label: 'Keep original cells banked (organic reserve)', claimCount: 3 },
  { id: 'periodic-write-back', label: 'Fetch stored DNA periodically and write it back', claimCount: 4 },
  { id: 'edit-directed-differentiation', label: 'Steer differentiation by editing', claimCount: 2 },
]);
export const GENOME_RESTORE_VERDICTS = Object.freeze(['established-practice', 'real-adjacent-research', 'theory-only']);
const STEP_IDS = Object.freeze(GENOME_RESTORE_STEPS.map(s => s.id));
const STEP_VERDICT = Object.freeze({ 'digital-backup': 'established-practice', 'organic-reserve': 'established-practice', 'periodic-write-back': 'theory-only', 'edit-directed-differentiation': 'theory-only' });
export const GENOME_RESTORE_NOTICES = Object.freeze([
  'Verdicts describe research and practice maturity, never clinical readiness, safety or feasibility for any person or animal.',
  'Recording information in DNA exists as research (event and lineage barcodes); it records bits of cell history, not whole genomes, and there is no reviewed write-path from stored sequence back into chromatin.',
  'Somatic mosaicism means there is no single "original genome" to restore: cells of one body differ, and a stored sequence is a consensus of what was sampled, when it was sampled.',
  'Editing is locus-by-locus; whole-genome rewrite-in-place, delivery to most cells of a living tissue and epigenome restoration from sequence remain open research questions, not procedures.',
  'Animal-model sources (zebrafish embryos) stay research context and never become human results.',
]);

const SOURCES = Object.freeze([
  { id: 'takasugi-2022', doi: '10.1093/genetics/iyab196', journalYear: 'Genetics 2022', fullTextUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8733422/', license: 'CC-BY 4.0', citation: 'Takasugi PR, Wang S, Truong KT, Drage EP, Kanishka SN, Higbee MA, Bamidele N, Ojelabi O, Sontheimer EJ, Gagnon JA. Orthogonal CRISPR-Cas tools for genome editing, inhibition, and CRISPR recording in zebrafish embryos. Genetics. 2022;220(1):iyab196. doi:10.1093/genetics/iyab196' },
  { id: 'waldvogel-2024', doi: '10.1038/s41576-024-00715-z', journalYear: 'Nat Rev Genet 2024', fullTextUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11408116/', license: 'author manuscript (PMC open access)', citation: 'Waldvogel SM, Posey JE, Goodell MA. Human embryonic genetic mosaicism and its effects on development and disease. Nat Rev Genet. 2024;25(10):698-714. doi:10.1038/s41576-024-00715-z' },
  { id: 'zhang-2025', doi: '10.1093/gpbjnl/qzaf034', journalYear: 'Genomics Proteomics Bioinformatics 2025', fullTextUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12449060/', license: 'CC-BY 4.0', citation: 'Zhang X, Ma D, Liu F. CRISPR Technology and Its Emerging Applications. Genomics Proteomics Bioinformatics. 2025;23(3):qzaf034. doi:10.1093/gpbjnl/qzaf034' },
  { id: 'alvarez-palomo-2022', doi: '10.1186/s13287-022-02961-6', journalYear: 'Stem Cell Res Ther 2022', fullTextUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9372949/', license: 'CC-BY 4.0', citation: 'Alvarez-Palomo B, Veiga A, Raya A, Codinach M, Torrents S, Ponce Verdugo L, Rodriguez-Aierbe C, Cuellar L, Alenda R, Arbona C, Hernandez-Maraver D, Fuste C, Querol S. Public Cord Blood Banks as a source of starting material for clinical grade HLA-homozygous induced pluripotent stem cells. Stem Cell Res Ther. 2022;13(1):408. doi:10.1186/s13287-022-02961-6' },
]);

const CLAIMS = Object.freeze([
  { id: 'genome-restore-sequencing-is-routine', sourceId: 'waldvogel-2024', step: 'digital-backup', verdict: 'established-practice', statement: 'High-throughput sequencing is ordinary enough that whole-tissue mosaicism surveys are a standard finding.', verbatimQuote: "Recent high-throughput sequencing studies have revealed that mosaicism is common, clone sizes often increase with age and specific variants can affect tissue function and disease development.", locator: 'Introduction, mosaicism across tissues', supportStatus: 'reviewed', basis: 'primary-text', species: 'general', limitations: ['A stored genome is a consensus of the cells sampled, at the time they were sampled, not a record of every cell in a body.'] },
  { id: 'genome-restore-backup-is-consensus', sourceId: 'waldvogel-2024', step: 'digital-backup', verdict: 'established-practice', statement: 'Because most cell divisions permanently acquire at least one small variant, any one cell differs from the consensus a backup would store.', verbatimQuote: "Nevertheless, most cell divisions are accompanied by the permanent acquisition of at least one single-nucleotide substitution or small insertion or deletion (indel)1–6, which can be propagated to cellular progeny, generating a clone of related variant cells.", locator: 'Introduction, post-zygotic mutation accumulation', supportStatus: 'reviewed', basis: 'primary-text', species: 'general', limitations: ['The digital copy is real and cheap; the mismatch between one stored consensus and the mosaic body it came from is the honest fine print of the backup idea.'] },
  { id: 'genome-restore-banking-is-established', sourceId: 'alvarez-palomo-2022', step: 'organic-reserve', verdict: 'established-practice', statement: 'Cord blood banks are described as a real, screened starting material for clinical-grade iPSC line production.', verbatimQuote: "Cord blood banks are an ideal source of young, HLA-typed and virus screened starting material to produce HLA-homozygous iPSC lines for wide immune-compatibility allogenic cell therapy approaches.", locator: 'Abstract, background', supportStatus: 'reviewed', basis: 'primary-text', species: 'human', limitations: ['Banking preserves cell lines under controlled quality programs, not whole tissues, and reserves remain subject to the aging and drift of their donor context.'] },
  { id: 'genome-restore-clinical-grade-demand', sourceId: 'alvarez-palomo-2022', step: 'organic-reserve', verdict: 'established-practice', statement: 'Clinical trials of iPSC-derived cell products are increasing, which is what makes clinical-grade iPSC production relevant and necessary.', verbatimQuote: "The increasing number of clinical trials for induced pluripotent stem cell (iPSC)-derived cell therapy products makes the production on clinical grade iPSC more and more relevant and necessary.", locator: 'Abstract, background', supportStatus: 'reviewed', basis: 'primary-text', species: 'human', limitations: ['Clinical development of specific iPSC products is ongoing research context, not a guarantee that any planned therapy will work.'] },
  { id: 'genome-restore-ipsc-differentiation', sourceId: 'alvarez-palomo-2022', step: 'organic-reserve', verdict: 'established-practice', statement: 'iPSCs can be expanded without limit in culture and differentiated toward essentially any cell type, with donor background chosen.', verbatimQuote: "IPSC can be expanded unlimitedly and they can be differentiated into any cell type in the body; moreover, the genetic background of the donor can be chosen.", locator: 'Background', supportStatus: 'reviewed', basis: 'primary-text', species: 'human', limitations: ['Differentiation protocols are established as research practice; producing a specific functional tissue for a specific person is a separate, unsolved problem.'] },
  { id: 'genome-restore-editing-is-locus-by-locus', sourceId: 'zhang-2025', step: 'periodic-write-back', verdict: 'theory-only', statement: 'The reviewed editing toolbox is limited by off-target effects and unpredictable outcomes, and its systems are built for targeted loci, not whole genomes.', verbatimQuote: "However, the traditional DSB-based CRISPR-Cas9 system is limited by off-target effects and unpredictable editing outcomes (e.g., large deletions, chromosomal rearrangements, and chromosome loss) [2], which have driven the rapid development of novel CRISPR systems with enhanced accuracy, precision, and versatility.", locator: 'CRISPR application landscape, editing limitations', supportStatus: 'reviewed', basis: 'primary-text', species: 'general', limitations: ['Base and prime editing extend precision at targeted sites; none of the reviewed systems writes a whole stored genome back into living cells.'] },
  { id: 'genome-restore-recording-is-bits', sourceId: 'takasugi-2022', step: 'periodic-write-back', verdict: 'theory-only', statement: 'CRISPR recording exists and records inside living cells, but current methods record only a few bits of information.', verbatimQuote: "Current CRISPR recording methods rely on SpyCas9, and only record a few bits of information.", locator: 'Results, CRISPR recording', supportStatus: 'reviewed', basis: 'primary-text', species: 'zebrafish', limitations: ['Zebrafish embryo research context; the recording direction is cell history into DNA barcodes, not a stored genome back into chromosomes.'] },
  { id: 'genome-restore-no-single-original', sourceId: 'waldvogel-2024', step: 'periodic-write-back', verdict: 'theory-only', statement: 'Mammals are mosaics of genetically distinct clones, so there is no single original genome to write back.', verbatimQuote: "As a result, mammals are complex mosaics of clones that are genetically distinct from one another.", locator: 'Introduction, clonal mosaicism', supportStatus: 'reviewed', basis: 'primary-text', species: 'general', limitations: ['A restore target would have to choose among mosaic lineages, and the reviewed literature offers no demonstrated whole-tissue rewrite of a living body.'] },
  { id: 'genome-restore-write-path-open', sourceId: 'takasugi-2022', step: 'periodic-write-back', verdict: 'theory-only', statement: 'The write-path from a stored sequence back into chromatin of most cells of a living tissue is not demonstrated in any reviewed source.', verbatimQuote: "In these applications, expression of CRISPR components generates permanent “edits” to a barcode, recording lineage relationships or cell signaling pathway activation.", locator: 'Introduction, biological recording', supportStatus: 'reviewed', basis: 'primary-text', species: 'general', limitations: ['Recording writes permanent barcode edits as cell history, the reverse direction of genome restoration; the period-fetch-and-rewrite loop remains an open question, not a procedure.'] },
  { id: 'genome-restore-bes-preclinical', sourceId: 'zhang-2025', step: 'periodic-write-back', verdict: 'theory-only', statement: 'Even the most advanced base editors remain mostly preclinical beyond one program.', verbatimQuote: "In addition to VERVE-101, there have also been several BEs in preclinical research phase [76].", locator: 'Base editors, clinical status', supportStatus: 'reviewed', basis: 'primary-text', species: 'general', limitations: ['Preclinical status describes research pipelines, not an approved whole-genome write-back capability or any safety claim.'] },
  { id: 'genome-restore-mosaicism-definition', sourceId: 'waldvogel-2024', step: 'context', verdict: 'real-adjacent-research', statement: 'Mosaicism means a variant present in some, not all, cells of an organism, which is the structural reason a backup is a consensus rather than a copy.', verbatimQuote: "In other words, mosaicism refers to any mutation that is acquired in the nuclear genome after the zygote stage of embryogenesis, meaning that the resulting genetic variant is present in some, but not all, cells of the organism.", locator: 'Introduction, definition', supportStatus: 'reviewed', basis: 'primary-text', species: 'general', limitations: ['Definition and context only; it supports no therapeutic claim.'] },
  { id: 'genome-restore-lineage-recording', sourceId: 'takasugi-2022', step: 'context', verdict: 'real-adjacent-research', statement: 'Multichannel CRISPR recording with orthogonal systems is implemented and improves information density for lineage reconstruction.', verbatimQuote: "We implemented multichannel CRISPR recording using three CRISPR systems and show that LbaCas12a may provide superior information density compared with previous methods.", locator: 'Results, CRISPR recording', supportStatus: 'reviewed', basis: 'primary-text', species: 'zebrafish', limitations: ['Zebrafish embryo research context, not a human result; recording tools are for observing cell history, not restoring genomes.'] },
  { id: 'genome-restore-differentiation-needs-programs', sourceId: 'takasugi-2022', step: 'edit-directed-differentiation', verdict: 'theory-only', statement: 'Recording and editing can document and perturb lineage decisions, but the reviewed route to a cell type is a differentiation program, not an edit that installs identity.', verbatimQuote: "CRISPR can be adapted for recording information inside living cells and organisms.", locator: 'Introduction, biological recording', supportStatus: 'reviewed', basis: 'primary-text', species: 'general', limitations: ['Recording lineage or signaling activation is observation; using edits to steer a differentiation program is a research idea with no reviewed demonstration as a workflow.'] },
  { id: 'genome-restore-differentiation-from-banked', sourceId: 'alvarez-palomo-2022', step: 'edit-directed-differentiation', verdict: 'theory-only', statement: 'The contrast anchor for edit-directed differentiation: the reviewed established route to a chosen cell type runs from banked iPSC through culture and differentiation protocols, not through installed sequence edits.', verbatimQuote: "IPSC-derived cells are being tested at the moment in clinical trials for regenerative medicine to treat diseases such as age-related macular degeneration [3] or Parkinson’s disease [4], and for immunotherapies for conditions such as cancer [5] or graft-versus-host disease [6].", locator: 'Background', supportStatus: 'reviewed', basis: 'primary-text', species: 'human', limitations: ['Research-practice context; steering fate by editing rather than by culture conditions and transcription programs remains theoretical.'] },
]);

export function validateGenomeRestoreCatalog(raw) {
  assertAllowedKeys(raw, ['schema', 'sources', 'claims'], 'genomeRestoreCatalog');
  if (raw.schema !== GENOME_RESTORE_SCHEMA) throw new RangeError('Unknown genome-restore evidence schema');
  if (!Array.isArray(raw.sources) || !Array.isArray(raw.claims)) throw new TypeError('Catalog needs sources and claims');
  const sourceIds = new Set();
  for (const s of raw.sources) {
    assertAllowedKeys(s, ['id', 'doi', 'journalYear', 'fullTextUrl', 'license', 'citation'], 'genomeRestoreSource');
    text(s.id, 64, 'source.id');
    if (sourceIds.has(s.id)) throw new RangeError('Duplicate source'); sourceIds.add(s.id);
    if (!/^10\.[0-9]{4,}[^ ]+$/.test(s.doi)) throw new RangeError('Malformed DOI');
    if (!/^https:\/\/[^ ]+$/.test(s.fullTextUrl)) throw new TypeError('fullTextUrl must be https');
    text(s.license, 64, 'source.license'); text(s.journalYear, 64, 'source.journalYear'); text(s.citation, 2000, 'source.citation');
  }
  const claimIds = new Set();
  for (const c of raw.claims) {
    assertAllowedKeys(c, ['id', 'sourceId', 'step', 'verdict', 'statement', 'verbatimQuote', 'locator', 'supportStatus', 'basis', 'species', 'limitations'], 'genomeRestoreClaim');
    if (!c.id.startsWith('genome-restore-')) throw new RangeError('Claim ids must carry the module prefix');
    text(c.id, 96, 'claim.id');
    if (claimIds.has(c.id)) throw new RangeError('Duplicate claim'); claimIds.add(c.id);
    if (![...STEP_IDS, 'context'].includes(c.step)) throw new RangeError('Unknown genome-restore step');
    if (!GENOME_RESTORE_VERDICTS.includes(c.verdict)) throw new RangeError('Unknown verdict');
    text(c.statement, 2000, 'claim.statement'); text(c.verbatimQuote, 2000, 'claim.verbatimQuote');
    if (c.verbatimQuote.length < 60) throw new RangeError('Verbatim quote too short to be verifiable');
    text(c.locator, 80, 'claim.locator');
    if (c.supportStatus !== 'reviewed') throw new RangeError('Unsupported support status');
    if (c.basis !== 'primary-text') throw new RangeError('Genome-restore claims must come from fetched primary text');
    if (!['general', 'human', 'zebrafish'].includes(c.species)) throw new RangeError('Unknown species context');
    if (c.species === 'zebrafish' && !c.limitations.some(l => /research context/i.test(l))) throw new RangeError('Animal-model claims must say they stay research context');
    if (!Array.isArray(c.limitations) || c.limitations.length < 1 || c.limitations.some(l => typeof l !== 'string' || !l.trim())) throw new RangeError('Claims need honest limitations');
    if (c.step !== 'context' && c.verdict !== STEP_VERDICT[c.step]) throw new RangeError('Claim verdict conflicts with the catalog verdict for its step');
    if (!sourceIds.has(c.sourceId)) throw new RangeError('Claim references an unknown source');
    if (c.step === 'context' && c.verdict === 'theory-only') throw new RangeError('Context claims are research context, not theory-of-record');
  }
  for (const step of GENOME_RESTORE_STEPS) {
    const stepClaims = raw.claims.filter(c => c.step === step.id);
    if (stepClaims.length < 2) throw new RangeError(`Step ${step.id} needs at least two anchors`);
  }
  if (!raw.claims.some(c => c.step === 'context')) throw new RangeError('Catalog needs its research-context claims');
  return structuredClone(raw);
}

const catalog = validateGenomeRestoreCatalog({ schema: GENOME_RESTORE_SCHEMA, sources: SOURCES, claims: CLAIMS });
export function getGenomeRestoreCatalog() { return structuredClone(catalog); }
export function getGenomeRestoreSteps() { return structuredClone(GENOME_RESTORE_STEPS); }
export function defaultGenomeRestoreIdea() { return { selectedStepIds: [] }; }
export function validateGenomeRestoreSelection(raw) {
  assertAllowedKeys(raw, ['selectedStepIds'], 'genomeRestoreIdea');
  if (!Array.isArray(raw.selectedStepIds) || raw.selectedStepIds.some(id => typeof id !== 'string')) throw new TypeError('Invalid genome-restore selection');
  if (new Set(raw.selectedStepIds).size !== raw.selectedStepIds.length) throw new RangeError('Duplicate genome-restore step selection');
  if (raw.selectedStepIds.some(id => !STEP_IDS.includes(id))) throw new RangeError('Unknown genome-restore step');
  return { selectedStepIds: [...raw.selectedStepIds] };
}
export function evaluateGenomeRestoreIdea(raw) {
  const selection = validateGenomeRestoreSelection(raw);
  const result = { status: 'unconfigured', selectedSteps: [], summary: null, notices: [...GENOME_RESTORE_NOTICES] };
  if (!selection.selectedStepIds.length) return result;
  result.status = 'explored';
  result.selectedSteps = selection.selectedStepIds.map(id => {
    const step = GENOME_RESTORE_STEPS.find(s => s.id === id);
    const anchors = catalog.claims.filter(c => c.step === id);
    const blockers = [...new Set(anchors.flatMap(c => c.limitations))];
    return { id: step.id, label: step.label, verdict: STEP_VERDICT[id], anchors: anchors.map(c => ({ id: c.id, statement: c.statement, quote: c.verbatimQuote, locator: c.locator, source: c.species })), blockers };
  });
  const established = result.selectedSteps.filter(s => s.verdict === 'established-practice').length;
  const theory = result.selectedSteps.filter(s => s.verdict === 'theory-only').length;
  result.summary = `${established} established-practice step(s) and ${theory} theory-only step(s) in this selection. Verdicts come from the four fetched open-access sources; nothing here is a procedure, an approval, or a prediction of what editing will ever safely do in a living body.`;
  return result;
}
