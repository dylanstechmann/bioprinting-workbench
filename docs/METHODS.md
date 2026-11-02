# Model specification

## Scope

An AI-assisted, agent-run software demonstration for a personal hobby and learning project.
No biological experiment was performed. No paper was reproduced and no experimental data
were fitted. All numerical constants below are synthetic presentation choices. The separate
analytical oxygen reference case is described in [OXYGEN.md](OXYGEN.md); it is not coupled
to the storyboard and does not establish tissue oxygen or safety.

Time is a dimensionless storyboard coordinate clamped to `[0, 4.999]`. Its integer part
selects one of five stages; its fractional part is stage progress. Playback lasts roughly
45 wall-clock seconds. That duration is not culture, printing or maturation time.

The model uses a fixed-seed 32-bit linear congruential random generator (seed 42) for cell
positions. Scaffold layers alternate X and Z filaments over `[-1.25, 1.25]`, with
dimensionless spacing 0.24–0.60, three to nine layers, height increment 0.11 and radius 0.04.
Layer count and spacing change the actual mesh. These bounds reflect visual legibility,
not printability, porosity measured in an experiment or a published protocol window.

Stage 0 expansion is linear: `0.12 + 0.88 * progress`, then fixed at 1. Stage 1 reveals
`floor(filament_count * progress)` filaments and moves a cartridge along the next line.
Stage 2 occupancy is `relative_population * progress`, then fixed at relative population.
Cell markers appear in fixed seeded order, with Z moved toward the nearest filament plane
and Y restricted to nominal layer levels. This placement is not an adhesion force model.
The translucent box is an abstract matrix, not a computed extracellular matrix structure.

Stage 3 onward has illustrative flow equal to the selected dimensionless perfusion factor
only when designed channels are enabled. Tracers traverse predefined Catmull–Rom curves;
the standalone network now supplies relative branch rates after conservation checks,
but no physical velocity field, coupled transport or living-vessel calculation is performed.
Tracer motion continues when sequence playback is paused; pause freezes storyboard
progress, not the illustrative fluid animation. Three channels and end manifolds are
conceptual geometry, not a validated vascular topology.

Stage 4 moves the construct toward an abstract tissue patch. Recipient context labels
have no mathematical effect. There is no simulation of transplantation, host perfusion,
anastomosis, graft take, immune response, healing, innervation or tissue function.

## Procedure walkthrough and gating

`src/procedure.js` holds eight steps (`ProcedureStep`: id, stage, order, title, purpose,
publishedBasis with DOI links, virtualChecks, unknowns) mapped to the five storyboard
stages. Factual workflow statements attribute to cited open-access sources; published-method
parameters appear only as cited research-reference recipes
([METHOD_RECIPES.md](METHOD_RECIPES.md)), never as treatment instructions. Progress state is `{ completedChecks: [], mode }`
in memory only. Stage 0 is always unlocked; stage n unlocks when every virtual check of
stages below n is completed. `clampTime` limits storyboard time to the highest unlocked
stage; playback pauses at that boundary. A `free` mode toggle disables gates without
removing checkpoints. These rules are pure functions tested in `tests/procedure.test.js`,
including a wording guard over step titles, purposes and check labels. Gate state is
derived from completed checks, never stored separately. The full walkthrough text is
[PROCEDURE.md](PROCEDURE.md).

## Measurement import

`src/calibration.js` validates a local JSON file (`bioprinting-workbench/calibration-input/1`:
source citation, accessed date, `dimensionless-ratio` units, 1–100 positive finite
center/boundary pairs) and computes `q_i = 2 × (1 − center/boundary)`, reporting the mean,
residual standard deviation, min/max, count and an in-domain flag for `[0, 2]`. No dataset
is bundled; nothing is calibrated by default. A fit is an estimate under the 1D slab
assumptions, not a tissue measurement or safety result. See [CALIBRATION.md](CALIBRATION.md).

## Scales and assets

Coordinates use arbitrary scene units. Cells and constructs are enlarged relative to
equipment. The cultured cells are different illustrative markers from the seeded construct;
no tracking of individual cells across transfer is claimed. The construct jumps between
printer and chamber at stage transitions; there is no robotic transfer or collision model.
Generic procedural equipment establishes a plausible lab context but is neither vendor CAD
nor a calibrated geometric twin. No real hardware is operated or exported toolpath produced.

## Reproducibility and checks

Current JSON /4 exports include schema, model label, seed, canonical inputs, learning
selections (cell category, species-separated system, method, hypothetical comparison),
view theme, optional raw point datasets and limitations, not sampled/derived results.
They contain no medical or personal data. `npm test` checks bounds,
deterministic geometry/state, invalid inputs, channel controls, species-label equivalence
and attribution. Browser checks inspect stage changes, rendering, geometry edits,
timeline, cameras, export, mobile layout and WebGL failure. Software checks do not
constitute biological validation. Current run details are recorded in `docs/VERIFICATION.md`.

No install or build step is needed. Bundled Three.js imports are local and pinned.
External evidence links open only when clicked; the simulator does not fetch their contents.
## Additional independent mathematical panels (local, unreleased)

The normalized-box finite-volume oxygen model and linear resistance network are
independent of the scripted storyboard and of one another. Analytical slab behavior
is unchanged. See OXYGEN.md, CALIBRATION.md and FLOW.md for equations, numerical
checks, assumptions and provenance; SCENARIOS.md describes versioned input files.
Software convergence and conservation are not biological validation.

## Independent cell learning (local 0.7.0-dev)

The evidence catalog separates cell-cycle observations from population doubling and from
null/unknown timings. Published observations are never automatically applied to controls.
Relative arithmetic `2 ** doublings` has optional hypothetical elapsed time; there is no
capacity, death, selection or maturation model. The default has no time parameter. Its
values and the optional research horizon do not modify `sample()`, flow or oxygen.
The barrier graph is an authored teaching organization, not a demonstrated fabrication
sequence. Read CELL_DIVISION.md, GENOME_STABILITY.md and ORGAN_RESEARCH.md for sourced
claims and limits. Source resolution and mathematical tests are distinct from expert review.

## Species-separated evidence, recipes and environments (local 0.8.0-dev)

`src/repair-research.js` (cell systems plus method comparisons), `src/method-recipes.js`
(published-method reference cards with per-parameter provenance),
`src/planning-comparison.js` (user-hypothetical duration arithmetic) and
`src/environment.js` (lab and Treedome themes with an owned-resource lifecycle) extend
the workbench. Validators enforce species separation, provenance, units on numeric
parameters, third-person phrasing and adverse-evidence linkage. None of these modules
couples into `sample()`, oxygen or flow. See REPAIR_METHODS.md, METHOD_RECIPES.md,
ENVIRONMENTS.md and `docs/method-recipes-audit.json`.

`src/acceleration-theory.js` (0.9.0-dev) adds the simulation-labeled expansion-theory
explorer: a mechanism catalog whose anchors and adverse links must resolve against the
evidence catalog, plus a pure evaluator over user-hypothetical inputs (start/target
cells, hours per doubling, split ratio, overhead, survival fractions, medium and fork
multipliers). The excluded genome-instability lever is unselectable by validation.
Every output is labeled user-hypothetical-simulation; no measured timeline, organ-production
schedule or biological parameter is asserted. See ACCELERATION_THEORY.md.
