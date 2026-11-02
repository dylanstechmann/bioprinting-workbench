# The genome-backup-and-restore idea, assessed step by step

Owner-authorized speculative teaching content for an AI-assisted personal learning project
(the 2026-11-02 wish: record the original genome digitally — SSD/HDD — keep some original cells
stored organically, fetch the stored DNA periodically to put it back into fast-multiplying cells,
possibly using editing for differentiation too). This module decomposes that wish into four
selectable steps and computes a verdict for each from four freshly fetched open-access sources.
It is an honest-assessment teaching tool, not a procedure, and it directs nothing at any person
or animal.

## The four steps and their verdicts

**Digital backup — established practice.** Sequencing and storing a genome is ordinary computing:
whole-tissue mosaicism surveys are a standard finding. The fine print: the stored sequence is a
consensus of the cells that were sampled, at the time they were sampled.

**Organic reserve — established practice.** Cord-blood banks are described in the fetched
literature as a real, screened starting material for clinical-grade iPSC production, and
iPSC-derived products are in trials. Banking preserves cell lines under quality programs, not
whole tissues, and reserves remain subject to their donor context.

**Periodic whole-genome write-back — theory-only.** Three independent reasons, each anchored to
a fetched quote: (1) the editing toolbox is locus-by-locus and still limited by off-target and
unpredictable outcomes, with the most advanced base editors mostly preclinical; (2) CRISPR
"recording" is real but it writes a few bits of cell history into barcode targets — the reverse
direction of the wish; (3) mammals are mosaics of genetically distinct clones, so there is no
single "original genome" to restore, and clone sizes grow with age. A stored consensus has no
reviewed write-path back into the chromatin of most cells of a living tissue, and the
epigenome is not restorable from sequence in any reviewed source.

**Edit-directed differentiation — theory-only, with a real adjacent path.** Recording and
editing can document and perturb lineage decisions, but the reviewed route to a chosen cell
type runs from banked iPSC through culture and differentiation programs. Steering fate by
installing sequence edits, rather than by those programs, has no reviewed demonstration.

Net: two of four steps are real today, and the two that carry the wish are open research
questions. The idea is not crazy — it is ahead of its write-path.

## The evidence layer

Four open-access sources fetched 2026-11-02, all quoted verbatim and mirrored in
`docs/genome-restore-audit.json` with locators, tested for equality with the runtime catalog:

- Takasugi et al., *Orthogonal CRISPR-Cas tools for genome editing, inhibition, and CRISPR
  recording in zebrafish embryos*, Genetics 2022, doi:10.1093/genetics/iyab196 (CC-BY;
  PMC8733422) — CRISPR recording demonstrated, its information density, and its direction
  (cell history into DNA barcodes).
- Waldvogel, Posey & Goodell, *Human embryonic genetic mosaicism and its effects on development
  and disease*, Nat Rev Genet 2024, doi:10.1038/s41576-024-00715-z (author manuscript,
  PMC11408116) — why there is no single original genome.
- Zhang, Ma & Liu, *CRISPR Technology and Its Emerging Applications*, Genomics Proteomics
  Bioinformatics 2025, doi:10.1093/gpbjnl/qzaf034 (CC-BY; PMC12449060) — the editing landscape
  and its stated limitations.
- Alvarez-Palomo et al., *Public Cord Blood Banks as a source of starting material for clinical
  grade HLA-homozygous induced pluripotent stem cells*, Stem Cell Res Ther 2022,
  doi:10.1186/s13287-022-02961-6 (CC-BY; PMC9372949) — the banking-is-real anchor.

Every claim carries its source id, a locator, and honest limitations; zebrafish-source claims
must say they stay research context or validation fails. The catalog validator rejects unknown
verdicts, unanchored steps, mis-verdicted claims, unknown species contexts and forged entries
(pinned by tests). The editing-rate and intended-coverage limits additionally cite the
base-editing-evidence companion repo via its provenance-pinned snapshot
(`docs/base-editing-snapshot.json`, 23 cards), read-only, unchanged.

## What this module does not do

- It computes no probability that genome restoration will ever work, and no timeline.
- It makes no clinical, safety or species claim; the zebrafish evidence stays zebrafish.
- It does not couple to the storyboard, oxygen, flow or nozzle-shear models.
- Nothing here is a protocol, a lab workflow, or advice for any person or animal.

## Scenario persistence

The step selection persists as `learning.genomeRestoreIdea` in scenario schema
`bioprinting-workbench/11` (with the nozzle-shear record under `analyses`). Version 10 and older
files migrate with the selection initialized to defaults and a warning that says so. See
[SCENARIOS.md](SCENARIOS.md) and the ideas-desk history in [ATLAS.md](ATLAS.md), where this
assessment began as prose in the 0.14 milestone.
