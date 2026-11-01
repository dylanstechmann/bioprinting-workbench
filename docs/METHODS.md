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
no pressure, velocity field, mass conservation or oxygen calculation is performed.
Tracer motion continues when sequence playback is paused; pause freezes storyboard
progress, not the illustrative fluid animation. Three channels and end manifolds are
conceptual geometry, not a validated vascular topology.

Stage 4 moves the construct toward an abstract tissue patch. Recipient context labels
have no mathematical effect. There is no simulation of transplantation, host perfusion,
anastomosis, graft take, immune response, healing, innervation or tissue function.

## Procedure walkthrough and gating

`src/procedure.js` holds eight steps (`ProcedureStep`: id, stage, order, title, purpose,
publishedBasis with DOI links, virtualChecks, unknowns) mapped to the five storyboard
stages. Factual workflow statements attribute to cited open-access sources; actionable
lab parameters are never restated. Progress state is `{ completedChecks: [], mode }`
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

JSON exports include schema, model label, seed, parameters, time, sampled state and
limitations. They contain no medical or personal data. `npm test` checks bounds,
deterministic geometry/state, invalid inputs, channel controls, species-label equivalence
and attribution. Browser checks inspect stage changes, rendering, geometry edits,
timeline, cameras, export, mobile layout and WebGL failure. Software checks do not
constitute biological validation. Current run details are recorded in `docs/VERIFICATION.md`.

No install or build step is needed. Bundled Three.js imports are local and pinned.
External evidence links open only when clicked; the simulator does not fetch their contents.