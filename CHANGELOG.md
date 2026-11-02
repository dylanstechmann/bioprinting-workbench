# Change log

Personal hobby and learning project, AI-assisted. Agent-run software/source checks are
not biological validation or independent scientific review.

## 0.20.0-dev - local, uncommitted and unpublished

- The peristaltic perfusion-pump circuit joined the shipped assets as a genuine Blender-authored
  GLB (25 meshes, 6 materials, 2,876 triangles), authored in the owner's live Blender 5.1.2 via
  MCP and exported without touching or saving their own open scene. All ten
  AUTHORING_CHECKS_PASSED checks and the export hashes are recorded in
  docs/blender-isolation-run-2026-11-02-pump.json; the GLB was transferred over the temporary
  host listener and verified hash-identical.
- Fifth manifest entry and equipment spec (perfusion-pump); the GLB mounts at the procedural
  pump's bench position with the procedural pump as its fallback. No scenario schema change.
- Tests 150 -> 152; the manifest suite covers five GLBs and a new test pins the pump evidence.

## 0.19.0-dev - committed and pushed to main on 2026-11-02

- The genome-backup-and-restore idea became an interactive module: the owner's wish (record the
  original genome to disk, bank original cells, fetch the stored DNA periodically to rewrite
  fast-dividing cells, edit toward differentiation) decomposed into four selectable steps, each
  with a computed verdict from four freshly fetched open-access sources. Two steps are
  established practice (digital backup; cell banking via the cord-blood/iPSC literature), two
  are theory-only (periodic whole-genome write-back; edit-directed differentiation) - anchored
  to CRISPR-recording reality (bits of cell history into barcodes, not genomes back into
  chromatin), locus-by-locus editing limits, and the mosaicism fact that there is no single
  original genome. 14 verbatim quotes with locators and source ids, mirrored in
  docs/genome-restore-audit.json and tested for equality; zebrafish-source claims carry
  validator-enforced research-context limitations.
- Scenario schema /11: learning.genomeRestoreIdea; migrateScenarioV10 with truthful warning; the
  v3-v9 migrations gained the same defaulting; new fixture scenario-v11.json. Unit tests
  146 -> 150.
- Companion doc docs/GENOME_RESTORE.md; ATLAS.md ideas desk now points to the module.

## 0.18.0-dev — committed and pushed to main on 2026-11-02

- The shear tradeoff module: the workbench's first physics-anchored teaching model of the core
  extrusion-bioprinting tradeoff. An idealized steady laminar capillary computes wall shear
  from nozzle diameter, flow and viscosity mode (hypothetical constant, or the cited Cellink
  power-law fit with the standard Rabinowitsch correction), with a Reynolds check that flags
  when the laminar idealization breaks. Analytic identities are pinned by tests
  (4μQ/(πr³) ≡ 8μU/d ≡ 32μQ/(πd³); the power-law branch reduces to the Newtonian branch
  at n = 1).
- The evidence layer is a single fetched open-access CC-BY CFD study (Gómez-Blanco et al. 2023,
  Int J Bioprint, doi:10.18063/ijb.730): their wall-shear values, their rheology fit and inlet
  conditions, and the viability context bands they rest ate from Blaeser et al. Eleven verbatim
  quotes with locators ship in docs/nozzle-shear-audit.json and are tested for equality with
  the runtime catalog; secondhand restatements are stored with that basis and cannot drop the
  not-fetched limitation without failing validation.
- The honest idealization gap is stated and pinned: at the study's piston input the idealized
  model gives ~468 Pa versus their CFD 362.85-383.24 Pa (~20% from the contraction geometry the
  idealization omits), asserted in a test as context, not reproduction.
- Scenario schema /10: analyses.nozzleShear (settings plus origin consistent with the viscosity
  mode); v9 and older files migrate with truthful defaults-and-warning; v3-v8 migrations gained
  the same defaulting; new fixture scenario-v10.json. Unit tests 138 → 146.
- README publication-status prose rewritten to match reality (it still described the live site
  as published v0.3 with unpublished working-tree extensions).

## 0.17.0-dev — committed and pushed to main on 2026-11-02

- The live-in-Blender isolation checks finally ran: the six authoring/check python files were
  fetched from the repository into a temporary staging directory on the owner's Blender host
  (sha256-verified before running) and blender_authoring_check.run_checks executed inside the
  live Blender 5.1.2 session - AUTHORING_CHECKS_PASSED, with the owner's open scene fingerprint
  asserted unchanged and staging cleaned up afterward. Evidence: docs/blender-isolation-run-2026-11-02.json.
- The first attempt exposed a real trap: the long-running Blender session had stale authoring
  modules cached in sys.modules from the pre-marker era, and the cancelled-export rejection
  silently misbehaved until the cache was purged. The purge is now part of
  tests/blender_authoring_check.py and is enforced as a static invariant.
- The four shipped GLBs are now genuine Blender 5.1.2 exports of the canonical authoring
  scripts (replacing the 0.14-era Node-surgered bytes): fresh structural counts differ honestly
  (bioprinter gains a seventh material; triangle counts change on three assets; the surgered
  values are preserved in the evidence file), the manifest regenerated from the live run, and
  every file hash, node prefix and required node re-verified container-side.
- tests/blender-evidence.test.js pins the evidence contract and keeps it consistent with the
  shipped manifest so any future asset change without a fresh live run fails tests.

## 0.16.0-dev — committed and pushed to main on 2026-11-02

- Add the in-repo claims-language scanner (scripts/scan-claims.mjs): five negation-aware pattern
  families over all authored src text, wired into verify:release as a real PASS check
  (claims-language scan) with unit tests; the external scanner review stays not-run, honestly
  distinguished.
- Add authoring-isolation static checks (scripts/check-authoring-isolation.mjs): 34 textual
  invariants over authoring_common.py and the four author scripts, wired as a second PASS check;
  the live-in-Blender isolation test stays not-run.
- Anchor three hardware prices through the reserved fetched-list-price path (vendor pages became
  fetchable): NEMA17 steppers $42 (3 x fetched $14.00 unit price, multiplication stated), 12 V
  supply $24.95, basal medium 500 mL $27.41; reference totals move to $5,586.95 once +
  $462.41/month cell-capable and $696.95 once + $185/month acellular; every other attempt
  (Sigma-Aldrich/Fisher 403, Creality ambiguous, wrong-product candidate, FBS size mismatch,
  GitHub no-list-price) is recorded in HARDWARE_COSTS.md and stays an authored estimate.
- Price validator now allows cent precision (sub-cent values rejected); part factory carries
  basis and fetch-date parameters.

## 0.15.0-dev — committed and pushed to main on 2026-11-02

- Add the scaffold-methods survey: nine methods across established, experimental and theoretical
tiers (extrusion, FRESH support baths, sacrificial vascular writing, DLP, volumetric printing,
cell-only inks, in-situ printing, factor gradients, 4D shape-morphing), anchored to ten freshly
fetched sources incl. the foundational Kolesky 2016; verbatim quotes in
  docs/scaffold-evidence-audit.json; reference panel added to the atlas (no scenario change).
- Add the second ideas-desk entry: myonuclear muscle memory — overload adds myonuclei before
  hypertrophy and they survive atrophy in mouse in-vivo imaging (Gundersen 2010, new 13th tissue
  claim), with the human elite-athlete transfer kept theory.
- Vendor docs/base-editing-snapshot.json: a provenance-pinned read-only mirror of the sibling
  base-editing-evidence catalog (23 cards, sha256 of its studies.json recorded), machine-checked
  by tests; the genome-restore step notes now cite the snapshot, not just prose.
- Refresh the remaining three GLBs — incubator (culture flasks, dishes, CO2 bottle and regulator),
  perfusion chamber (reservoir, bubble trap, line fittings) and microscope (culture dish, slide
  box) — via the Node GLB-surgery pattern with authoring scripts updated to match and the manifest
  re-pinned for all three.
- Companion-repo decision: regen-workbench receives a reciprocal cross-reference (its tree is
  clean); anagen and base-editing-evidence carry uncommitted prior work and are reported, not
  modified; no sibling result is imported as evidence (NEIGHBORS.md respected).

## 0.14.0-dev — committed and pushed to main on 2026-11-02

- Add the frontier-target tissue atlas: nine targets (lung alveoli, gingiva, periodontal
  complex, tooth pulp-dentin, facial deep collagen, peripheral nerve, skeletal muscle, the
  elite-athlete architecture aspiration entry rendered and never selectable, and the
  breast cross-reference), each with an honest status tier, barriers, open question and
  anchors across all five evidence catalogs; twelve freshly fetched 2024-2026 sources
  are verbatim-quoted in docs/tissue-evidence-audit.json.
- Add the ideas-desk genome-backup-and-restore assessment: digital backup and organic
  reserves are real today; periodic whole-genome write-back and edit-directed
  differentiation are theory with named unsolved steps, citing the base-editing-evidence
  repo (read-only) and two 2026 partial-reprogramming sources.
- Update the bioprinter GLB with the syringe-extruder toolhead from the 0.13 parts list
  (Node GLB-binary surgery; the authoring script is updated to match and the manifest is
  re-pinned with Printer_SyringeBarrel as a required node).
- Extend the scenario to /9 with the tissueAtlas learning record; /8, /7, /6, /5, /4 and
  /3 migrations default it with truthful warnings, and the aspiration entry rejects
  selection on import.
- Add docs/ATLAS.md and docs/tissue-evidence-audit.json.

## 0.13.0-dev — committed and pushed to main on 2026-11-02

- Add the reference hardware cost ledger with browser visualizations: a 22-part parts list
  across six categories (motion platform, extrusion toolhead, bioink materials,
  sterile-culture infrastructure, measurement/QC, recurring consumables), each price an
  authored indicative estimate with a provenance basis and honesty note; vendor pages
  were attempted for anchoring on 2026-11-02 and timed out, so no price claims to be
  current, and the validator keeps a fetched-list-price path for future anchored numbers.
- The evaluator keeps one-time and recurring costs separate ($5,615 once + $525/month
  cell-capable; $725 + $185/month acellular practice) and the hand-rolled SVG chart redraws
  live as parts are included or excluded; the printed syringe carriage cites the
  open-perfusion-rig companion project.
- Extend the scenario to /8 with the hardwareBudget learning record; /7, /6, /5, /4 and /3
  migrations default it with truthful warnings.
- Add docs/HARDWARE_COSTS.md (full parts write-up and the in-silico-first argument).

## 0.12.0-dev — committed and pushed to main on 2026-11-02

- Add the simulation-labeled research-program framework: a thirteen-node BUILD/STACK/INFER
  catalog (aging mechanisms, printing capabilities, measurement tools) anchored across all
  four evidence catalogs plus four newly fetched geroscience abstracts (senolytic
  translation limits, rapamycin mouse lifespan, NAD+ precursor limits, methylation clock),
  with cycle-checked dependencies, first-order inferences and an honest program evidence
  floor. Aligned read-only with the regen-workbench research desk method.
- Extend the scenario to /7 with the researchProgram learning record; /6, /5, /4 and /3
  migrations default it with truthful warnings.
- Add docs/RESEARCH_PROGRAM.md and docs/geroscience-evidence-audit.json.

## 0.11.0-dev — committed and pushed to main on 2026-11-02

- Add the simulation-labeled applications & breast soft-tissue comparison module: a
  six-entry applications ledger (ear, skin, breast soft tissue, hair, human-scale
  constructs, drug-testing tissues) and a five-approach comparison (silicone implants,
  autologous fat grafting, autologous flaps, hypothetical printed adipose, and the excluded
  unregulated-injectables lever), all anchored to twelve newly fetched abstracts with
  adverse records beside every benefit.
- Extend the scenario to /6 with the applicationsPerspective learning record; /5, /4, /3 and
  /2 migrations default it with truthful warnings.
- Add docs/APPLICATIONS.md (measured/preclinical/research-stage/theory tagged) and
  docs/FABRICATION_ANALOGY.md (why organs are not chips).

## 0.10.0-dev — committed and pushed to main on 2026-11-02

- Add the simulation-labeled longevity & aging-barrier module: a six-barrier catalog
  anchored to four newly reviewed geroscience sources (hallmarks of aging 2013/2023, mouse
  partial reprogramming 2016, mouse parabiosis 2005; verbatim-quoted in
  docs/aging-evidence-audit.json) plus transparent ceiling/logistics arithmetic on
  user-hypothetical inputs; the whole-body-including-brain lever is shown, never selectable.
- Extend the scenario to /5 with the longevityPerspective learning record; /4, /3 and /2
  migrations default it with truthful warnings.
- Add docs/LONGEVITY_THEORY.md with every number tagged measured vs theory.

## 0.9.0-dev — committed and pushed to main on 2026-11-01

- Add the hypothetical expansion-theory explorer: a mechanism catalog anchored to
  reviewed claims (survival-gate rescue, medium choice, split-ratio logistics,
  passage overhead, replication-fork push) plus transparent wall-clock arithmetic on
  user-hypothetical inputs; the genome-instability lever is shown, never selectable.
- Extend scenario /4 (never published in the older shape) with the expansionTheory
  learning record; /3 and /2 migrations default it.
- Add docs/ACCELERATION_THEORY.md with every number tagged measured vs theory.

## 0.7.0-dev and 0.8.0-dev — committed and pushed to main on 2026-11-01

Owner-authorized publication (GitHub Pages serves the branch automatically). See the
0.7/0.8 sections below for content, and VERIFICATION.md for the executed checks.

## 0.7.0-dev — content

- Harden malformed worker requests/replies, bounded timeout tests, stale fit/file intent,
  invalid-asset/late-disposal regressions and Blender canceled-export reporting.
- Add independent cell profiles, read-only timing observations, conceptual locations,
  genome-stability limits and liver research barriers. No repair recipe or cancer score.
- Add bounded relative-doubling arithmetic, no biological default time, and an optional
  research horizon that predicts no organ completion.
- Add scenario /3 learning inputs; preserve strict /2 migration and warned/reset /1 migration.
- Add read-only candidate inventory/verification and explicit publication gates.

## Earlier four milestones — implemented locally, never released as intermediate versions

Four authored equipment GLBs with procedural fallbacks; independent dimensionless
oxygen box/scalar fitting; conservation-checked resistance network; /2 input restoration.
The historical approved plan remains archived in implementation_plan.md. No claim of
flow–oxygen coupling, real-data calibration or tissue validation is added.

## Published baseline: v0.3

Blender-authored printer with procedural fallback. Later local development does not
retroactively publish intermediate 0.4/0.5/0.6 milestones.