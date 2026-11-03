# Bounded model exploration (Phase D)

Personal hobby/learning project, AI-assisted. Sweeps are **deterministic enumerations** over
numeric input axes of one registered independent model. A sweep point is a synthetic or
hypothetical model call — not an experiment, not an optimization, not a dose or protocol. No
probability, causal effect, viability, efficacy or ranking claim is computed anywhere, and no
swept or fitted value is ever written into scenario controls or applied automatically.

## Contract (`src/model-exploration.js`)

- `validateSweepSpec(raw, registry)`: `SweepSpec = {modelId, baseInputs, axes, seed}` with
  1–2 axes, each 2–10 explicitly listed unique finite values inside the registry's declared
  bounds (enum-valued fields must list enum members), ≤ 100 total points, uint32 seed
  (retained for contract stability; none of the models uses randomness). **Box-oxygen
  additionally caps resolution at 17 (base and axes) and 25 points.** The model must advertise
  `sweep` in `supportedOperations`.
- `enumerateSweepPoints(spec)`: deterministic order (last axis fastest), each point carries a
  fresh deep copy of `baseInputs` with axis values set — mutating one point never affects
  another or the caller's inputs (pinned by test).
- `runParameterSweep(spec, {evaluate, signal, onProgress})`: per-point `evaluate(inputs)` with
  failures **retained** as failed points (`{status, run, error}`), cancellation honored between
  points, progress callbacks with completed/failed/total. Status `succeeded|partial|failed|cancelled`.
- `summarizeSensitivity(run)`: same-unit min/max ranges and central finite-difference slopes
  per axis/output from single-axis slices only; mixed/missing points yield null slopes, never
  invented metrics. The summary notice restates the no-claims boundary.

## Execution (`src/exploration-client.js`, `src/exploration-worker.js`)

Sweeps run in a **dedicated worker** — the existing two-kind analysis-worker protocol
(oxygen-solve/oxygen-fit) is untouched. The client allows one sweep at a time, tags requests
with a generation so stale replies can never publish after cancel/replace, terminates the
worker on explicit cancel, and bounds each job at 30 s. Worker-side envelopes are revalidated
before any point runs. Heavy sweeps therefore cannot block the interactive UI.

## UI (`src/model-exploration-ui.js`)

Explicit **Run sweep** / **Cancel** controls with live status; the last valid result is stored
separately from pending work and stale runs are ignored (run-token guard). The v1 panel exposes
the slab demand axis; the underlying API covers any registered numeric axis pair.

## Tests and limitations

`tests/model-exploration.test.js`, `tests/exploration-client.test.js`,
`tests/model-exploration-ui.test.js` pin bounds/enums/caps, deterministic enumeration with
input isolation, failure retention, cancellation, timeout/worker-failure handling, stale-result
suppression and UI behavior. The 100-point total cap is structurally unreachable past the
per-axis 10-value limit (10 × 10 = 100 exactly) and is enforced defensively. Browser
worker-cancellation verification remains part of the bounded smoke pass; no FPS or
performance claim is made.
