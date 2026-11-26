# Multiscale presentation views (Phase C)

Personal hobby/learning project, AI-assisted. These views are **presentation layers** over
schematic geometry. A scale transition is a discrete representational change — never a
continuous physical zoom, never a biological model, and never a measurement painted onto the
storyboard. Scenario /13 bytes are untouched by every presentation control.

## Scales (`src/scientific-views.js`)

| scale | content | explicit limit |
| --- | --- | --- |
| `laboratory` | the reviewed lab scene | overlays stay separate from equipment |
| `construct` | framed scaffold bars, stage-independent | illustrative toolpath artwork, not a printer program |
| `cell` | schematic sphere cluster | **physical scale UNKNOWN** — the storyboard carries no cell-diameter measurement and none is invented |
| `tissue-context` | abstract patch beside a construct block | no organ reconstruction, immune compatibility, healing or integration |

Each scale is framed independently from its own bounds (`presentationSpec`); returning to
`laboratory` restores the previously framed lab camera. While a presentation scale is active,
lab-visibility animation is suspended and lab objects are hidden behind the presentation root
in the same WebGL renderer/context — one context owner, no second canvas.

## Overlays (`src/scientific-overlays.js`)

Five registered overlays, at most four active, textures capped at 256×256, every geometry /
material / texture created is owned and disposed by the factory:

- `box-oxygen-slice` (model-field, normalized-box proxy plane): dimensionless slice field.
  Rendered **only on its proxy**, never painted onto scaffold geometry.
- `slab-profile` (model-field, illustrative strip): dimensionless 1D profile.
- `flow-network` (network lines): dimensionless resistance-network flows — not CFD, not
  living vessel function.
- `nozzle-shear-reference` / `vascular-supply-reference` (reference-panel markers): labelled
  contextual panels with accessible legend text; never calibrated tissue fields.

`getLegend()` returns id + unit + legend for every active overlay so the accessible text
alternative always accompanies the visuals. Legends restate limitations; they never upgrade a
model output to a measurement, viability threshold or safety verdict.

## State (`src/scientific-view-state.js`)

`PresentationState = {scale, representation, quality, overlayIds, selectionId, cutPlane, motion}`
validated strictly (unknown scales/overlays/selections/cut planes throw; ≤ 4 unique overlays).
The pure reducer `reduceScientificViewState` performs discrete transitions only. State is held
by the presentation UI, separately from scenario state.

## Field snapshots (`src/analysis-ui.js`)

`getFieldSnapshot()` returns `{snapshot, reason}` with a defensive `Float64Array` clone of the
solved box field plus pinned `{settings, parameterOrigin, generation}`; before a solve it
returns a reason instead of fabricating values. Callers cannot corrupt the stored field
(pinned by test).

## Observed browser diagnostic checks — 2026-11-16

`scripts/browser-verification-suite.js` now requires actual `graphics.presentationScale` and
`graphics.presentationState` diagnostics after every scale, representation, cut-plane and motion
transition; a changed notice or visible control is insufficient. Pointer and keyboard activation are
both exercised. The final cut-plane-off and motion-system checks describe only those observed state
transitions, not an invalid-input rollback. Canonical scenario bytes are compared before/after and
horizontal overflow is rejected.

Fresh headless Chromium evidence is in `docs/browser-presentation-2026-11-16.json`: 1280×720 and
390×844 each passed 9/9 checks with unchanged 2,955-byte scenario serializations and no horizontal
overflow. WebGL-disabled 1280×720 was **blocked** from `graphics.webgl:false`, not passed. Focused
unit regressions also prove absent, stale and contradictory diagnostics fail closed. These are
software state checks, not owner visual review, a resource-leak certificate or scientific validation.

## Tests and limitations

`tests/scientific-view-state.test.js`, `tests/scientific-overlays.test.js`,
`tests/scientific-views.test.js`, `tests/analysis-ui-field.test.js` pin the contracts above
with stub-THREE lifecycle checks (creation, replacement disposal, ≤ 4 enforcement, texture
cap, coordinate validation) and DOM-stub UI checks. Known limits: visual composition of the
new views has **not** been owner-reviewed (screenshots pending); the ≥ 10-cycle settled
resource matrix remains the standing Phase A gap (only ≥ 3 cycles were measured there); no
FPS claims; no quantitative overlay renders without its own legend; pixel assertions never
replace visual review.
