# Local scenario import/export

Version 13 exports **inputs**, not trusted model outcomes. Files stay in memory;
nothing is uploaded, persisted or fetched from source citations. Personal learning
project with AI assistance; restored progress is self-reported, not scientific QC.

`bioprinting-workbench/13` includes:
- fixed storyboard model and seed 42;
- validated parameters/time;
- procedure mode and unique known completed check IDs;
- camera preset, reveal state and scene environment theme (`lab` or `treedome`);
- analytical slab demand, normalized 3D box settings/parameter origin, network settings, and the nozzle-shear design record (inner diameter, volumetric flow, viscosity mode with origin consistency);
- optional bounded raw slab and 3D point datasets with declared provenance;
- learning cell category, species-separated cell system, optional method comparison,
  independent relative-doubling assumptions, an optional research horizon, a
  hypothetical two-duration comparison, the expansion-theory record (mechanism
  selection, hypothetical multipliers, bounds-checked nullable inputs) and the
  longevity-perspective record (single-organ-failure fraction, replacement schedule,
  barrier selection), the applications-comparison record (fat-graft volume,
  resorption fraction, regraft and implant cadences, horizon, approach selection) and
  the research-program selection (chosen program nodes; empty until selected) and
  the hardware-budget selection (reference parts included in the cost view; defaults to
  the full 22-part list) and the tissue-atlas selection (chosen frontier targets; the
  aspiration entry is rendered and never selectable); and the genome-restore idea selection (which steps of the backup-and-restore wish are being explored); and the vascular-supply design inputs (diffusivity, consumption, inlet oxygen, channel radius; hypothetical-controls); and the cross-reference mapping scales (perfusion-to-flow, spacing-to-diameter, population-to-consumption, layers-to-thickness; disabled by default); all nullable; null fields remain
  unknown, not zero;
- application-authored limitations.

See `tests/fixtures/scenario-v13.json` for a complete synthetic fixture. The v2 through v12
fixtures remain as migration evidence; v12 and older files restore with the cross-reference
mapping initialized to defaults and a warning that says so. Evidence prose, source-review status, recipe
cards, arithmetic outcomes, cancer scores and organ-completion estimates are not
export fields. Fields are validated explicitly; unknown structural keys, unsupported
versions, nonfinite/out-of-range values, contradictory flow controls, unknown checks,
system/method mismatches and gated timestamps beyond completed checkpoints are rejected.
Scenario files are limited to 1 MiB; each measurement format to 256 KiB and 100
observations. No arbitrary worker/asset paths, scripts or external data URLs are
executed.

Import parses and validates before replacing application state. Successful restore
pauses playback, synchronizes controls/view/gates/theme, invalidates prior worker jobs,
and recomputes derived analyses. Invalid input retains the previous scenario.
Derived outputs, meshes and numeric fields are not exported. A saved applied-fit
origin is a declaration, not evidence that a fit or source was independently verified.

## Version 1 migration

Older exports include only summary progress and sometimes fit summaries, not check
IDs or raw data. Migration preserves valid parameters and slab demand, resets
walkthrough to gated/time 0, defaults new analyses/view and warns with the old
timestamp. It never invents completed checks or measurements from summary counts.
Unknown future versions are not guessed or silently accepted.

## Version 2 migration

Strictly validate the old input contract, preserving analyses, raw datasets, view and
known gate IDs. Add default learning inputs and a warning; never infer them from
outputs. A malformed /2 file cannot smuggle /3 or /4 fields into state.

## Version 3 migration

Strictly validate the /3 contract (three-key learning record, two-key view), then add
defaults for the newer inputs: the species-separated cell system is set to the default
human system for the saved cell category, the method comparison is cleared, the
hypothetical comparison, the longevity-perspective, applications-comparison and
research-program, hardware-budget and tissue-atlas records start empty (hardware-budget
defaults to the full 22-part list) and the environment theme defaults to `lab`. The
migration warns truthfully; imports pause playback and recompute rather than trust
saved results.

## Version 4 migration

Strictly validate the /4 contract (seven-key learning record), then add defaults for the
new /5 inputs: the longevity-perspective record starts empty — no single-organ-failure
fraction, no replacement schedule, no barriers selected. The migration warns truthfully;
imports pause playback and recompute rather than trust saved results. A /4 file carrying a
longevityPerspective key is rejected, not guessed or silently accepted.

## Version 5 migration

Strictly validate the /5 contract (eight-key learning record), then add defaults for the
new /6 inputs: the applications-comparison record starts empty — no fat-graft volume, no
resorption fraction, no cadences, no approaches selected. The migration warns truthfully;
imports pause playback and recompute rather than trust saved results. A /5 file carrying
an applicationsPerspective key is rejected, not guessed or silently accepted.

## Version 6 migration

Strictly validate the /6 contract (nine-key learning record), then add defaults for the
new /7 inputs: the research-program selection starts empty — no program nodes chosen. The
migration warns truthfully; imports pause playback and recompute rather than trust saved
results. A /6 file carrying a researchProgram key is rejected, not guessed or silently
accepted.

## Version 7 migration

Strictly validate the /7 contract (ten-key learning record), then add defaults for the
new /8 inputs: the hardware-budget selection defaults to the full 22-part reference
list. The migration warns truthfully; imports pause playback and recompute rather than
trust saved results. A /7 file carrying a hardwareBudget key is rejected, not guessed
or silently accepted.

## Version 8 migration

Strictly validate the /8 contract (eleven-key learning record), then add defaults for the
new /9 inputs: the tissue-atlas selection starts empty — no targets chosen. The migration
warns truthfully; imports pause playback and recompute rather than trust saved results.
A /8 file carrying a tissueAtlas key is rejected, not guessed or silently accepted, and
the aspiration target rejects selection on import just as it refuses the checkbox.
