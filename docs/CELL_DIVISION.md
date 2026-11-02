# Cell division: evidence and an independent arithmetic reference

Personal hobby and learning project, developed with AI assistance. Source reading and
software checks are agent-run, not independent scientific review. Nothing here is a
culture protocol, treatment instruction or organ-manufacturing schedule.

## Different clocks

- **Cell cycle:** one cell's progression through replication and division.
- **Population doubling:** net change in a population; survival, losses and heterogeneity matter.
- **Culture duration:** observation interval, not necessarily continuous proliferation.
- **Passage count:** transfer history, not a fixed number of cell divisions.
- **Differentiation/maturation:** identity/function questions, not just increasing cell number.
- **Organ construction:** architecture and functional dependencies, not an exponential count.

The NHGRI Cell Cycle definition/narration explains DNA synthesis in S phase and
partitioning of chromosomes during mitosis. Nuclear replication, mitosis and cytokinesis
are separate concepts. The ATCC primary-cell guide supplies the conceptual equipment
mapping: vessels in controlled culture equipment, microscopy for observation. No settings
or handling schedule from that guide is restated. A printer is not a DNA-repair device.
Culture/perfusion chambers illustrate later construct studies, not a required universal route.

## Read-only observations — never operating presets

| Category | Reviewed observation | Limits |
| --- | --- | --- |
| BM-MSC | Approximately 22–46 hours population doubling in Bhat et al., Figure 4 caption | Caption comparison excludes one formulation. Results contain different P4–P5 summaries. Not a universal range or confidence interval. |
| iPSC and hESC | Approximately 16–18 hours **cell cycle** in Ghule et al., Results/Figure 6 | Successive-S-phase measurement in studied lines; not population doubling or a rate for differentiated derivatives. |
| Fibroblast | Sturm et al., Results/Figure 1b, reports a senescence plateau in a specified donor culture | No transferable doubling interval accepted here. |
| Generic endothelium and liver categories | Transferable timing not established from the reviewed sources | Unknown is not zero, and does not mean no relevant literature exists. |

All ten categories are selectable in the app, including hepatocyte/hepatocyte-like,
cholangiocyte, liver sinusoidal endothelial, liver stromal and liver immune contexts.
The app neither assigns one rate to every cell nor transfers pluripotent rates to derivatives.
The published observations do not populate arithmetic controls automatically.

## Independent arithmetic

`relativePopulation = 2 ** doublings`

An optional, user-hypothetical hours-per-doubling gives
`hypotheticalElapsedHours = doublings * hypotheticalDoublingHours`.
Default time is null. Bounds (0–40 doublings, 1–1000 hypothetical hours) are software
limits, not biological ranges. Fractional doublings are a population idealization, not
fractional mitosis. The model has no capacity, death, selection, senescence or maturation.
It gives no absolute cell yield, cancer probability or whole-organ outcome. It does not
drive the storyboard, oxygen demand, network flow or recipient context.

Complete source metadata and claim locators: `src/cell-evidence.js` and
`docs/cell-evidence-audit.json`. Source links are optional user-clicked links, not network
dependencies of the running app. No research dataset is bundled.

## Sources

- Bhat et al. (2021), DOI: 10.1038/s41598-021-83088-1, PMC7873235.
- Ghule et al. (2011), DOI: 10.1002/jcp.22440, PMC3045197.
- Sturm et al. (2019), DOI: 10.1080/15592294.2019.1626651, PMC6691995.
- NHGRI Cell Cycle and DNA Replication glossaries; ATCC Primary Cell Culture Guide.

See [genome stability](GENOME_STABILITY.md) and [organ research](ORGAN_RESEARCH.md).
## 0.8.0-dev learning-state extension (local, unreleased)

Learning state now also carries a species-separated `selectedCellSystemId` (a human
system per category plus mouse embryonic stem cells), an optional `selectedMethodId`
that must apply to the selected system, and a `planningComparison` of two
user-hypothetical durations. The hypothetical comparison is pure signed arithmetic and
is never linked to a method, species or literature interval. See
[REPAIR_METHODS.md](REPAIR_METHODS.md) and [METHOD_RECIPES.md](METHOD_RECIPES.md).
