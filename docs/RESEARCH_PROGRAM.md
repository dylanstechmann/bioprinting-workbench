# Build, stack, infer: a literature-anchored research program framework

Owner-authorized speculative teaching content for an AI-assisted personal learning project
(2026-11-02: "Can you lay out a research program/framework based off public literature? …
mechanisms that I could guess were relevant/influencial. Building/stacking/inference…
outline/plan in immense detail, then act upon it"). This is a **study-planning simulation**
for a hobby project: it organizes what public literature actually supports, does not
fund, dose, direct or promise anything, and computes no youth score. The interactive
version is the workbench's *Hypothetical research program* panel
(`src/research-program.js`); verbatim quotes for every measured anchor live in the shipped
audit JSONs. The framework is aligned — read-only — with the owner's regen-workbench
research desk (question → alternatives → data eligibility → frozen plan → runs → review,
with identity, viability, genome stability, adverse findings, function and durability kept
as separate outcome domains, and no universal youth score).

## The method, in three moves

- **BUILD.** A program is a set of named questions, not a set of hopes. Each node in the
  catalog names a target, its evidence tier, its adverse anchors and the open question it
  exists to answer.
- **STACK.** Dependencies are ordered by capability, not optimism: an integration question
  stacks on verification, verification on vascularized printing, printing on cell supply,
  supply on a genome-stability gate. Selecting a node pulls its prerequisites into the
  program automatically — stacking is dependency ordering, **never effect multiplication**.
- **INFER.** Each node carries a first-order inference and nothing more: one conditional
  statement anchored to the tier of its evidence. Cross-node arithmetic is refused
  because no reviewed source licenses combining these levers quantitatively.

## Evidence tiers

`human-measured` (measured in human data) < `mouse-measured` < `animal-or-in-vitro` <
`review-supported` < `theory`. A program's **floor** is the weakest-strongest tier it
contains, stated plainly: if your stack touches host integration, the floor is `theory`,
and every line above that floor is a hypothesis, not a finding.

## The catalog (thirteen nodes)

**Aging-mechanism layer.** Hallmark mapping [review-supported; hallmarks reviews 2013/2023]
provides the hypothesis space — interconnected hallmarks, not independent levers. Senescent-
cell burden clearance [review-supported; translation constraints include the risk of
targeting *beneficial* senescent cells and the absence of validated trial designs].
mTOR-pathway modulation [mouse-measured; rapamycin extended murine lifespan from 600 days
of age at three sites — the abstract itself leaves open postponing cancer versus retarding
aging]. NAD+ precursor restoration [review-supported; experimental promise with
pharmacokinetic instability and tissue-specific bioavailability named as translation
limits]. Partial reprogramming [mouse-measured; cyclic OSKM ameliorated hallmarks in a
premature-aging mouse model — full reprogramming erases identity, no human in-vivo result].
Systemic youthful factors [mouse-measured; heterochronic parabiosis modulated aged
progenitor behavior — a surgical mouse clue, not a human method].

**Printing-capability layer.** Genome-stability gate [human-measured in culture: TP53-mutant
subpopulations expanded across passages; fork pushing raised damage markers without growth
gain] → stem-cell supply [study-specific expansion arithmetic; senescence and selection as
adverse anchors] → vascularized-volume printing [animal-or-in-vitro: human-scale ITOP
constructs with microchannels against the 100–200 μm diffusion limit; printed adipose with
8-fold more neovessels in animals] → functional-tissue verification [the flap literature
shows even native vascularized tissue carries measured complication rates — verification
is a battery, not an assay] → host integration [theory: the least-anchored node, honestly
placed last].

**Measurement layer.** Aging biomarkers: methylation clocks [human-measured — near zero in
iPSCs, passage-correlated, heritable age acceleration; a readout, not an outcome domain].
Organ-chip and printed-model testing [review-supported: fluidically linked organ chips for
disease mechanisms, therapeutic testing and personalized medicine] — likely the nearest-term
real application of bioprinting.

## What a good program question looks like (desk-aligned)

1. Name the missing capability or causal step, the biological unit, the measured outcome and
   the comparator — plus the boring alternative explanation (batch, selection, composition,
   measurement bias).
2. State which alternative observations would *contradict* the favored mechanism.
3. Check data eligibility before frozen-plan fixation; record estimand, splits, exclusions.
4. Keep identity, viability, genome stability, adverse findings, function and durability
   as separate outcome domains — a clock reading or an expression panel supports a narrower
   question, not every domain.
5. Review honestly: supported within scope, contradicted, inconclusive, or not testable —
   then name the observation that would resolve the remaining gap.

## The honest conclusion of the framework

The mechanisms the intuition reaches for are exactly the ones the literature has measured
least in humans: the geroscience levers are mouse/review-tier, and the printing frontier is
an in-vitro/animal capability with a theory-tier host-integration question at its top.
A program built from these nodes earns its keep by ordering its questions under their real
evidence floor — not by multiplying hopes. That is the uncensored version: the map is good,
the territory above the floor is still almost all open.

## Sources reviewed for this module

Four abstracts fetched from the Europe PMC REST API on 2026-11-02 (PMIDs 42775553,
19587680, 42669985, 24138928; verbatim quotes in `docs/geroscience-evidence-audit.json`),
plus the thirty-plus previously reviewed claims across the cell-evidence, aging-evidence
and applications-evidence catalogs. Mouse findings are never transferred to human outcomes
anywhere in this workbench.
