# Scaffold-methods survey: the toolbox behind the targets

Owner-authorized speculative teaching content (2026-11-02: "various
established/experimental/theoretical methods/idea for scaffolding and other related stuff such as
vascularization and biochemical this and that"). This is a **reference survey**, not a selection
guide: each method is sorted by how established its reviewed evidence is, and no method tier
includes a reviewed human transplanted tissue. Ten abstracts were fetched from the Europe PMC
REST API on 2026-11-02 and are verbatim-quoted in `docs/scaffold-evidence-audit.json`.

## The three maturity tiers

**Established (4):** multimaterial extrusion, FRESH-style support baths, DLP photocuring, and
biochemical factor gradients in conduits. Established means the method reliably produces what it
claims in preclinical and in-vitro hands — not that it is in patients.

**Experimental (4):** sacrificial vascular writing (the SWIFT family), volumetric/tomographic
printing, cell-only inks in support baths, and in-situ printing into wounds.

**Theoretical (1):** 4D shape-morphing — programmed swelling encoded during fabrication. A hydrogel
proof of concept today; the tier exists because the owner asked for theoretical methods honestly
labeled as such.

## Method by method

- **Multimaterial extrusion (established).** Coprint parenchyma, stroma and sacrificial vasculature
  into one thick construct perfusable on chip for over six weeks (Kolesky 2016, the foundation).
  Limit: on-chip is not in-body; nothing anastomosed to a host.
- **FRESH support baths (established).** Print soft inks inside a granular gel that holds the shape;
  now beyond collagen I into type II and III isoforms (2025).
- **Sacrificial biofabrication (experimental).** Print the negative space, wash it out, line it with
  cells: co-SWIFT prints hierarchically branching, multilayered vessels with muscle-cell shells
  (2024), and the 2026 review maps the whole stimuli-responsive sacrificial-material taxonomy.
  This is the vascularization workhorse the atlas targets all lean on.
- **DLP photocuring (established).** Resolution, speed and gentle cell handling, with bioink advances
  from methacrylated polymers to dECM-derived hydrogels (2026 review).
- **Volumetric printing (experimental).** Whole volumes cured in seconds from light-field
  projections; the same optics can trigger optogenetic circuits deep inside the finished construct
  (2026) — printing and stimulation in one machine.
- **Cell-only inks (experimental).** The cells are the ink and the bath is the scaffold; confinement
  directs collagen alignment (2026). Self-assembly trades speed for architecture.
- **In-situ printing (experimental).** Print directly into the wound at the point of care; the 2026
  design-rule mini-review is honest that the literature is still material-centered with no bedside
  graft result.
- **Factor gradients (established, material side).** Reversible GDNF concentration gradients in
  synthetic nerve conduits steering motor-axon extension (2015) — the biochemical half of the
  toolbox the owner's "biochemical this and that" points at.
- **4D shape-morphing (theoretical).** Layer-by-layer crosslink-density variation makes GelMA bend
  on immersion (2026 proof of concept). Time as a fourth print dimension; no tissue application
  reviewed.

## The honest close

Vascularization is the thread through the whole list: sacrificial templates, coaxial vessels,
in-situ deposition and factor gradients are four different attacks on the same diffusion limit —
the limit every atlas target names first. The methods are real and improving fast; none of them
has printed a reviewed functional tissue into a living human. Read with the tissue atlas
([ATLAS.md](ATLAS.md)) for which targets these methods are supposed to serve.
