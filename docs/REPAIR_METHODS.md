# Genome-maintenance method evidence, separated by species

Owner-approved teaching content for an AI-assisted personal learning project. Source
reading is agent-run, not independent expert review. This page compares what reviewed
studies measured. It prescribes nothing, is directed at no person or animal, and
certifies no safe or validated method, no timeline acceleration and no organ-production
forecast.

## How the comparison is organized

- A **cell system** pairs a cell category with a species (a human system for every
  category, plus mouse embryonic stem cells). Claims never cross species: a mouse finding
  is never attached to a human system, and human timing never lands on the mouse row.
- A **method comparison row** links reviewed sources, claims, measured endpoints, the
  comparator design and explicit unmeasured endpoints. Adverse outcomes ship beside
  benefit claims; findings are shown side by side without averaging, cross-species
  transfer or a declared contradiction.
- Published-method parameters for each row appear separately as cited research-reference
  recipes: [METHOD_RECIPES.md](METHOD_RECIPES.md) (provenance:
  `docs/method-recipes-audit.json`).
- Expansion-relevant observations are labeled `reported-study-endpoint` only when a
  reviewed paper reported them for its own cultures; they are not timeline predictions.

## Rows

### Nucleoside supplementation in human PSC culture — Halliwell et al. 2020

DOI 10.1016/j.stemcr.2020.04.004, PMC7355123 (open access, CC BY). Replication-support
category; systems `human-ipsc`, `human-esc`; observed outcome `improved-endpoint` for the
studied lines. Reported endpoints: increased replication-fork speed and longer DNA
fibers, reduced replication origin density, reduced γH2AX damage markers and mitotic
aberrations, and improved survival/clonogenicity/population growth (68%→79% of tracked
cells entered mitosis; 59%→91% formed colonies). Unmeasured: reversal of existing
mutations, removal of mutant clones, cancer-risk reduction, transplant readiness, organ
production. Timeline evidence is `reported-study-endpoint` for those cultures only.

### Forced fork acceleration with nucleosides in mouse ES cells — Kurashima et al. 2024 (adverse evidence)

DOI 10.1038/s44319-024-00207-5, PMC11387781 (open access). System `mouse-esc`; observed
outcome `adverse-endpoint`. Reported: fork speed increased throughout S phase and active
origin density fell, but replication completion and cell-cycle progression miscoordinated
— premature G2/M entry before S-phase completion, ultra-fine bridges rising from about
20% to about 40% of cells, increased micronuclei, γH2AX rising from 6.1% to 13.1%.
The overall growth rate was reported as not affected, so timeline evidence is
`not-established`. The same paper also reports that one tested human iPS line
(PChiPS771) showed no fork-asymmetry reduction under its tested medium condition — a
single-line observation that neither confirms nor contradicts the Halliwell endpoints.

### Serum-free/xeno-free expansion comparison for human BM-MSCs — Bhat et al. 2021

DOI 10.1038/s41598-021-83088-1, PMC7873235 (open access, CC BY 4.0). Quality-assessment
category (an expansion-kinetics comparison, not a DNA-repair intervention); system
`human-msc`; observed outcome `mixed`. Six commercial low-serum/serum-free/xeno-free
formulations were compared against a serum-containing control at 1000 and 5000
cells/cm². Reported population doubling times (P4–P5) at 1000 cells/cm² were about
46.3–59.8 h across evaluated formulations versus about 55.1 h in control, and about
123.4 h for the formulation that failed P5 growth. Distinct media-specific endpoints are
never pooled into one universal interval. No genome-stability endpoint was measured.

## Hypothetical time comparison (kept separate)

The workbench also offers pure arithmetic between two user-entered hypothetical
durations (`src/planning-comparison.js`): a signed difference and a signed percentage of
the baseline, with the assumption origin always labeled `user-hypothetical`. It is not
linked to any method, recipe, species or published interval, changes no growth, oxygen,
flow or storyboard value, and never predicts an organ-production timeline.

See [GENOME_STABILITY.md](GENOME_STABILITY.md) for what damage markers do and do not
mean, and [SOURCES.md](SOURCES.md) for the ledger.