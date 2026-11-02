# Local scenario import/export

Version 4 exports **inputs**, not trusted model outcomes. Files stay in memory;
nothing is uploaded, persisted or fetched from source citations. Personal learning
project with AI assistance; restored progress is self-reported, not scientific QC.

`bioprinting-workbench/4` includes:
- fixed storyboard model and seed 42;
- validated parameters/time;
- procedure mode and unique known completed check IDs;
- camera preset, reveal state and scene environment theme (`lab` or `treedome`);
- analytical slab demand, normalized 3D box settings/parameter origin, network settings;
- optional bounded raw slab and 3D point datasets with declared provenance;
- learning cell category, species-separated cell system, optional method comparison,
  independent relative-doubling assumptions, an optional research horizon, a
  hypothetical two-duration comparison and the expansion-theory record (mechanism
  selection, hypothetical multipliers, bounds-checked nullable inputs); null fields
  remain unknown, not zero;
- application-authored limitations.

See `tests/fixtures/scenario-v4.json` for a complete synthetic fixture. The v2 and v3
fixtures remain as migration evidence. Evidence prose, source-review status, recipe
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
defaults for the new /4 inputs: the species-separated cell system is set to the default
human system for the saved cell category, the method comparison is cleared, the
hypothetical comparison starts empty and the environment theme defaults to `lab`. The
migration warns truthfully; imports pause playback and recompute rather than trust
saved results.
