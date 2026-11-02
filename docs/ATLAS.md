# The tissue atlas: where each frontier target actually stands

Owner-authorized speculative teaching content for an AI-assisted personal learning
project (2026-11-02: "it would be nice to get some bioprinting of lung alveoli, gums
(in mouth), teeth, facial and other bodily deep collagen..., nerves, muscle (and perhaps
the myonuclei and organization unique to elite bodybuilders/powerlifters...)"). This is a
**simulation-labeled teaching atlas**: each target's tier describes the strength of its
reviewed evidence, never clinical readiness, and in-vitro/preclinical findings never
become human outcomes. Thirteen abstracts were fetched from the Europe PMC REST API on
2026-11-02 and are verbatim-quoted in `docs/tissue-evidence-audit.json`; the dental
entries additionally cite the regen-workbench dental track (read-only companion) for
trial-level honesty, and the genome-restore section cites the base-editing-evidence repo
(read-only companion) for editing-rate and coverage limits. Neither companion repo was
modified.

## The tiers, honestly ranked

Nothing in this atlas is in a human as printed tissue. The tiers mean: **review-stage**
(reviews map a field of preclinical work), **in-vitro** (constructs exist outside bodies),
**preclinical** (animal or implanted models), **aspiration** (measurable in humans,
produced by nothing reviewed). The honest closest-to-clinic entries are the dental ones —
and even those are scaffolds and small trials, not printed organs.

## Target by target

**Lung alveoli — review-stage.** The 2026 Biomaterials Advances review links printing
strategies with lung-specific structural and mechanical requirements for disease
modeling, regeneration and drug testing — a models-and-discovery story, not a gas-
exchanging organ. Barrier: co-patterning blood and air at alveolar thinness.

**Gingiva — in-vitro.** Two 2025–2026 studies bring real cells: human gingival
fibroblasts in a collagen/omega-3 bioink with shear-induced mechanotransduction, and
prevascularized CollMA/HAMA substitutes with 14-day endothelial networks — a
prerequisite for host anastomosis, which neither shows. Barriers: epithelial seal under
chewing load, vascularization, durability. The dental desk track supplies the trial-level
counterweight: small trials, no proven oriented attachment.

**Periodontal complex — preclinical.** PDLSC-laden collagen bioinks (2024) and printed
nanocomposite scaffolds for the bone-ligament-cementum unit (2026). Barrier: oriented,
load-bearing ligament insertion — three tissues, three interfaces, one graft.

**Tooth pulp-dentin — review-stage.** The 2026 scoping review found 13 studies, all
preclinical, extrusion-and-GelMA dominated. Whole-tooth form remains beyond every
reviewed approach.

**Facial and deep dermal collagen — review-stage.** The vascularized-skin-analog reviews
(plus the applications ledger's skin entry) name the same barrier: perfused vascular
networks in deep dermis, not surface sheets. Nothing models durability in an aging face.

**Peripheral nerve — review-stage.** Silk-derived printed scaffolds with collagen and
conductive polymers; functional recovery remains the unproven endpoint.

**Skeletal muscle — in-vitro.** One-step coaxial printing now aligns myoblasts and builds
vascular compartments simultaneously (2026). Innervation and force at human scale remain
unreviewed.

**Elite-athlete muscle architecture — aspiration, rendered and never selectable.**
Myonuclear number, position and 3D orientation are measurably real in human biopsy
fibers (2026 pipeline paper), and printed bipennate-style architecture exists in vitro —
but nothing reviewed produces elite myonuclei density or the woven connective architecture
of a trained lifer's fascia. This entry exists to say the ceiling honestly: measurable,
yes; printable, not by anything reviewed here.

## Ideas desk: the genome-backup-and-restore concept, assessed step by step

The owner idea: record the original genome digitally (SSD/HDD), keep some original cells
stored organically, and fetch the stored DNA periodically to put back into fast-dividing
cells — possibly using editing to steer differentiation too. Honest verdicts:

1. **Digital backup — real today.** Sequencing and storing a genome is ordinary
   computing. The catch: there is no write-path from the SSD back into chromatin.
2. **Organic reserve — real today.** Cell banking works for some cell types; reserves
   also age and drift, and banking is not whole-tissue preservation.
3. **Periodic whole-genome write-back — theory.** Editing is locus-by-locus; the
   base-editing-evidence companion documents conditional editing and intended-only
   coverage far below whole-tissue repair; somatic mosaicism means there is no single
   "original"; delivery to most cells of a living tissue is unsolved. Two 2026 sources
   frame what IS real adjacent to this: lineage-preserving partial reprogramming with a
   schedule/delivery/safety checklist, and transient non-integrating circRNA delivery
   that rejuvenated senescent MSCs in vitro without genomic modification.
4. **Edit-directed differentiation — theory.** Editing is not a differentiation
   program. Yamanaka-class reprogramming resets epigenetic age in mouse and in-vitro
   systems (the reviewed anchors) and is the honest research direction — not a procedure.

Net: two of four steps are real, and the two that matter for the wish are open research
questions. That is the uncensored version — the idea is not crazy, it is simply ahead of
its write-path.

## The 3D setup refresh

The bioprinter GLB now carries the syringe-extruder toolhead the reference parts list
([parts write-up](HARDWARE_COSTS.md)) describes — cross-beam, carriage, mount, glass barrel,
plunger, cap and needle assembly docked at the left gantry, matching the open-perfusion-
rig companion's physical design language. The update was performed as a Node GLB-binary
surgery on the Blender-authored asset (the connected Blender instance runs on a separate
Windows host that cannot see this workspace), with the authoring script updated to match
so a future Blender session can regenerate equivalently; the manifest is re-pinned and
the asset tests verify the result.

## 0.15 companion additions

The ideas desk gained a second entry — myonuclear muscle memory: mouse in-vivo imaging shows
overload adds myonuclei before hypertrophy and that they survive atrophy (Gundersen 2010), while
printing or editing elite human architecture stays theory. The methods toolbox behind every
target is surveyed separately in [SCAFFOLD_METHODS.md](SCAFFOLD_METHODS.md), and the
base-editing-evidence companion catalog is now mirrored as a provenance-pinned snapshot
(`base-editing-snapshot.json`) that tests machine-check instead of prose citation.

## 0.19 pointer

The ideas desk above is now an interactive module with fetched evidence behind every verdict:
see [GENOME_RESTORE.md](GENOME_RESTORE.md) and the genome-restore panel in the app. The prose
verdicts here are unchanged and still true: two steps real, two theory, the write-path open.

## 0.19 pointer

The ideas desk above is now an interactive module with fetched evidence behind every verdict:
see [GENOME_RESTORE.md](GENOME_RESTORE.md) and the genome-restore panel in the app. The prose
verdicts here are unchanged and still true: two steps real, two theory, the write-path open.

## 0.20 addition

The peristaltic pump and reservoir circuit named in stage 4's equipment line is now a real
Blender-authored asset (assets/perfusion_pump.glb), the fifth in the manifest, with its own
dated isolation evidence (docs/blender-isolation-run-2026-11-02-pump.json). The procedural
pump remains as the loading fallback. This was a genuine live-Blender export via MCP, not
GLB-binary surgery; the owner's separate open scene was never saved or modified.
