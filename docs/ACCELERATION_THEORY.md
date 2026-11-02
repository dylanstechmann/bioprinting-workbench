# How much could expansion accelerate? (simulation theory, not measurement)

Owner-authorized speculative teaching content for an AI-assisted personal learning
project (2026-11-01: "Don't censor yourself. This is just simulation."). Every number
below is tagged **[measured]** (transcribed from a source the development agent opened;
see `docs/SOURCES.md` and `docs/method-recipes-audit.json`) or **[theory]**
(extrapolation under stated assumptions). Nothing here is a protocol, treatment
instruction, prediction, safety claim or organ-production schedule, and nothing is
directed at any person or animal. The interactive version of this analysis is the
workbench's *Hypothetical expansion theory* panel (`src/acceleration-theory.js`).

## Four accelerations that do not couple

1. Replication fork speed (molecular)
2. Cell-cycle duration (single cell)
3. Effective expansion rate (survival-weighted population growth)
4. Wall-clock time to a target cell number (passages, seeding, overheads)

**[measured]** The single most important fact from the reviewed sources: in mouse ES
cells, significant fork acceleration left S-phase duration similar and *"the overall
growth rate was not affected"* (Kurashima et al. 2024). Fork speed, by itself, bought
nothing at the population level.

## Mechanism-by-mechanism

**M1. Nucleoside attrition rescue (human PSC context).** **[measured]** Of tracked
seeded MIFF1 cells, 68% vs 79% entered mitosis and 59% vs 91% formed colonies without
vs with supplementation (Halliwell et al. 2020); the paper reports improved survival,
clonogenicity and population growth, and no doubling-time change. **[theory]** The
plausible acceleration is *yield rescue*: fewer cells lost per passage, not faster
cycling. Gate arithmetic (0.40 → 0.72 of attached cells founding colonies) can look
like ~1.8× output, but colonies that are founded still expand at the same cycle
arithmetic, so bulk-growth effects are smaller than gate math suggests. Ceiling: full
attrition rescue caps near ~2×.

**M2. Medium formulation (human BM-MSC context).** **[measured]** Bhat et al. report
media-specific population doubling times (Figure 4 caption: about 22–46 h across
compared formulations, one excluded; the shipped method row also cites a 46.3 h vs
55.1 h control comparison). **[theory]** Plausible span: roughly −10% to +40%
doubling-time change depending on formulation — and media can be slower or fail a
passage outright. No universal medium claim survives their variance.

**M3. Split ratio and seeding density (logistics).** **[measured]** Bhat et al.
compared 1000 and 5000 cells/cm² with comparable yield in their hands. **[theory]**
Seeding 5× denser skips log₂(5) ≈ 2.3 doublings per passage — about 5 days at a ~50 h
PDT — but consumes 5× more seed stock (fold expansion per passage drops ~256× → ~51×).
It accelerates logistics, not biology, and can even hurt time-to-target when seed
supply is the constraint.

**M4. Passage overhead (logistics).** **[theory]** At ~0.5–1 day of non-cycling
overhead per 4–7-day passage, ~10–15% of wall-clock is recoverable by process changes
(bigger split ratios → fewer passages for the same total doublings). Real, bounded,
unglamorous.

**M5. Replication fork speed push.** **[measured]** Zero population-growth
acceleration with ~2× damage markers in mouse ES cells (ultra-fine bridges ~20% →
~40%; γH2AX 6.1% → 13.1%; Kurashima et al. 2024). S phase stayed similar because fewer
origins fired. **[theory]** Any real cycle-time gain would require *coordinated* origin
up-regulation, which nothing reviewed demonstrates in PSCs. A hypothetical 2× fork
speed with matched origin firing would compress an ~8–10 h S phase toward ~4–5 h —
at most ~25–30% faster cycling on a ~16–18 h PSC cycle (Ghule et al. 2011,
**[measured]**), pure theory.

**M6. Transformed / apoptosis-resistant variant selection — the excluded lever.**
**[measured]** TP53-mutant subpopulations expanded across passages in studied hESC
cultures (Merkle et al. 2017) — a real selection effect obtained through genome
instability. It is shown for teaching and never selectable: it is the false economy
this simulator refuses.

## Combining honestly

The levers act on different terms, so they do not cleanly multiply. A defensible
overall theory: **single-digit-percent to at most ~2× wall-clock improvement to a
target cell number**, assembled mostly from attrition rescue plus logistics — with
**near-zero defensible acceleration from replication manipulation itself**, whose one
measured outcome was no growth gain at ~2× damage. The exponential character never
changes: 10⁶ → 10¹² cells is ~20 doublings, ≈18+ days at the best measured PDTs before
any overhead. And organ timelines are not cell-expansion-limited in the first place:
vascularization, maturation and integration dominate, which is why no total here
implies any organ-production timeline.