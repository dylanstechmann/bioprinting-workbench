# Implementation Plan

## Execution checkpoint — November 3, 2026 (plan below executed through step 9)

Verification close-out landed — cross-language golden digests pinned both sides (JS 7/7 +
Python 11/11), browser halves for the C/D/E UI passed (7 + 3 checks, scenario bytes
invariant, 390 px clean, zero page errors), the >=10-cycle settled resource matrix is
recorded (`docs/resource-matrix-run-2026-11-03.json`, deterministic per position-in-run;
settled counts only, not a GPU-leak certificate), and the magnified construct inset +
explanatory vascular cross-sections shipped with unit tests. Workbench 273 tests / 156
modules; provenance fresh; verify:release automated checks pass. The planned two-half matrix
split became five bounded 2-cycle runs (60 s runner cap) — recorded as a deviation. Commits
made in both repos on explicit owner instruction ("all of it"); no push or deployment.
Remaining not-run gates: owner visual review, citation/scientific review, live-provider demo
(owner credentials), deployment.

[Overview]

Close out and finish the uncommitted B–G body of work on the Bioprinting Workbench and its
sibling ResearchDesk adapter: run the pending browser verification for the Phase C/D/E UI,
execute the standing ≥10-cycle settled resource matrix, add the missing cross-language golden
fixture test, deliver the next bounded ROADMAP milestone (a separate magnified construct
viewport and explanatory vascular cross-sections), record everything honestly, and then
commit the finished work in both repositories on explicit owner instruction ("all of it",
2026-11-03). Owner-confirmed scope of this cycle: pending verification + close-out AND the
next ROADMAP feature milestone AND commits at the end. No push, publication or deployment is
authorized by this plan.

Context and constraints carried forward unchanged: this is a personal hobby/learning project
with AI-assisted development kept visible; no person/animal-directed treatment instructions,
transplant-readiness scores or biological-validation claims; no secrets/credentials in either
repository; scientific evaluators and their equations are not altered; scenario /13
round-trips unchanged and /14 stays rejected; the ResearchDesk import path never calls
`Desk.submit()`. The previous plan (`docs/IMPLEMENTATION_PLAN_B_G_2026-11-03.md`, archived
byte copy) is fully executed: Workbench 263 tests / 150 modules, ResearchDesk exchange suite
10/10, evaluators and scenario /13 byte-identical, nothing committed. Standing owner gates
that remain not-run regardless of this cycle: citation/scientific review, live-provider demo
(owner credentials), deployment, and owner visual review of the visuals (this cycle produces
the evidence for that review; the review itself is the owner's).

Approach: pure test work first (cross-language golden digests), then presentation-only
feature work (magnified viewport + cross-sections; zero evaluator or scenario-schema
changes), then bounded browser verification of the C/D/E UI plus the new panels and the
≥10-cycle resource matrix measured on the final UI, then close-out docs and the full local
batteries in both repos, and only then the two commits. Browser work runs through the
existing Playwright code-runner in bounded halves (this environment caps a single run at
60 s), against the dependency-free Node preview server (`npm start`, scripts/serve.mjs).

[Types]

No TypeScript and no schema-library dependency; all contracts stay plain objects with
explicit allowlisted fields and runtime validation, matching the codebase's factory-function
style. New or pinned data shapes:

- Golden digest map (new file, byte-identical copy in both repos):
  `tests/fixtures/research-exchange/golden-digests.json`
  `{ "canonicalizer": "sorted-json-lf/1", "vector": { "input": { "b": 2, "a": 1 }, "canonical": "{\"a\":1,\"b\":2}\n" }, "fixtures": { "minimal.json": "<sha256 hex>", "roundtrip.json": "...", "conflicts.json": "...", "invalid.json": "...", "synthetic.json": "..." } }`
  where each digest is sha256 over the canonical bytes of the parsed fixture content produced
  by `canonicalJsonBytes` (JS, `src/model-provenance.js`) / `canonical_json_bytes` (Python,
  `tools/bioprint_exchange.py`) — both sorted-key compact JSON plus one trailing LF.
- Magnified-viewport state (ephemeral presentation state, never serialized into scenario
  bytes): `{ enabled: boolean }` plus an internal second `THREE.PerspectiveCamera` whose pose
  is derived per frame from the construct bounds via `fitCameraToBounds` with a narrowed
  field of view. Diagnostics addition: `magnified: { enabled, cameraPosition, cameraTarget, fovDegrees }`.
- Cross-section spec (static frozen constant in `src/vascular-cross-sections.js`):
  `CROSS_SECTIONS: ReadonlyArray<{ id, title, scaleNote, labels: string[], evidenceAnchor, disclaimer }>` — 3 schematic sections (printed channel, capillary scale, connection gap) whose strings are evidence-anchored explanatory text only; each carries the standing schematic/not-to-scale disclaimer.
- Resource-matrix evidence file `docs/resource-matrix-run-2026-11-03.json`:
  `{ date, cycles: 10, matrix: [{ cycle, environment, quality, geometries, textures, calls }], stableAcrossCycles: boolean, notes: string }` — settled-cycle counts only, explicitly not a GPU-leak certificate.

[Files]

Archived this cycle: `implementation_plan.md` (executed B–G plan) →
`docs/IMPLEMENTATION_PLAN_B_G_2026-11-03.md` (byte copy, done before this plan was written).

New files (all under `/workspace/bioprinting-workbench` unless noted):

- `tests/fixtures/research-exchange/golden-digests.json` — pinned cross-language golden map
  (shape under [Types]); generated once from the JS canonicalizer and verified against the
  Python one before pinning.
- `/workspace/regen-workbench/tests/fixtures/bioprint_exchange/golden-digests.json` — byte
  copy of the same file (the fixture directories already share the five bundle files).
- `src/magnified-viewport.js` — `createMagnifiedViewport({ THREE, renderer, scene, getBounds,
  getQuality })` factory: owns one secondary `THREE.PerspectiveCamera` and a
  `renderInset({ width, height })` scissored second pass (bottom-right framed inset on the
  existing single canvas/WebGL context — the project's single-WebGL-owner rule from
  `scientific-views.js` is preserved), `setEnabled(boolean)`, `diagnostics()`, `dispose()`.
  It renders no content of its own beyond the scene from the fitted construct pose.
- `src/vascular-cross-sections.js` — `CROSS_SECTIONS` frozen spec (3 sections) plus
  `renderCrossSections(container)` building SVG/DOM with `textContent` only (XSS-inert like
  the cockpit), each section carrying a scale note, an evidence anchor string and the
  schematic disclaimer.
- `tests/magnified-viewport.test.js`, `tests/vascular-cross-sections.test.js` — unit tests
  (details under [Testing]).
- `scripts/browser-smoke-phases-cde.js` — Playwright code-runner script (`async page => …`,
  same shape as `scripts/browser-smoke.js`) exercising the Phase C/D/E UI; runnable in two
  bounded halves via a `part` constant (`'c-d'` / `'e'`) to respect the 60 s cap.
- `scripts/browser-resource-matrix.js` — code-runner script taking a `startCycle`/`cycles`
  window (default 5) so the 10-cycle matrix runs as two bounded halves and merges results
  into `docs/resource-matrix-run-2026-11-03.json`.

Existing files to modify:

- `tests/research-exchange.test.js` — add golden-map tests: the `{"b":2,"a":1}` vector's
  canonical bytes equal the pinned literal, and `sha256Canonical` of each of the five parsed
  fixtures matches `golden-digests.json`.
- `/workspace/regen-workbench/tests/test_bioprint_exchange.py` — add
  `test_fixture_golden_digests` (and keep `test_cross_language_golden_bytes`): for each
  fixture, `sha256(bx.canonical_json_bytes(parsed))` matches the same map.
- `src/scene.js` — wire `createMagnifiedViewport` into the existing draw loop after the main
  pass (inset only while enabled and only in Studio; respects render suspension outside
  Studio and reduced-motion/quality settings), expose `magnified` in `diagnostics()` and a
  `setMagnified(enabled)` handle alongside `setQuality`/`setEnvironment`.
- `src/app.js` — toggle wiring (`#magnify-construct` checkbox → `lab.setMagnified`), extend
  `globalThis.bioprintingWorkbench.diagnostics()` with the `magnified` entry.
- `index.html` — magnify toggle in the existing `.view-tools` control group; new
  `EXPLANATORY CROSS-SECTIONS` panel (id `vascular-cross-sections`) with the standing
  evidence/limits framing near the vascular panel.
- `src/styles.css` and/or `src/instrument.css` — inset frame styling (accessible label,
  contrast-checked) and cross-section panel/SVG styling; no layout regressions at 390 px.
- `docs/VISUAL_DESIGN.md` — record the ≥10-cycle matrix evidence and the new viewport/cross-
  section visuals with the same measured-tone as existing entries.
- `docs/VERIFICATION.md`, `docs/ROADMAP.md`, `CHANGELOG.md`, `README.md`,
  `CONTEXT_STATE.md`, `implementation_plan.md` (checkpoint) — close-out records with
  measured counts and remaining not-run gates (details under [Testing]).

Files deliberately untouched: every evaluator (`src/model.js`, `oxygen.js`, `oxygen3d.js`,
`flow.js`, `nozzle-shear.js`, `vascular-supply.js`, `cell-division.js`, `numerics.js`,
`validation.js`, `cross-reference.js`, `scenario.js`), evidence catalogs, scenario schema /13,
`tools/regen_desk.py` exchange routes, and the untracked owner `data/iris-*` directories in
`/workspace/regen-workbench` (excluded from the commit).

[Functions]

New functions:

- `createMagnifiedViewport({ THREE, renderer, scene, getBounds, getQuality })` in
  `src/magnified-viewport.js`. Returns `{ setEnabled(on: boolean): void, renderInset(): void,
  diagnostics(): { enabled, cameraPosition, cameraTarget, fovDegrees }, dispose(): void }`.
  `renderInset()` (called from the scene draw loop after the main pass) fits the secondary
  camera to `getBounds()` via `fitCameraToBounds` (`src/camera-rig.js`) at a narrowed
  `fovDegrees` (magnification), then renders a scissored bottom-right inset sized ~28% of the
  canvas with `renderer.setScissorTest(true)` and an explicit frame border drawn by CSS on a
  positioned overlay. No second WebGL context; no new scene content.
- `CROSS_SECTIONS` + `renderCrossSections(container)` in `src/vascular-cross-sections.js`.
  Three frozen specs: `printed-channel` (extrusion-scale context, 100–300 µm quoted band),
  `capillary-scale` (10–50 µm quoted band beside the cited 100–200 µm diffusion context),
  `connection-gap` (anastomosis/connection mechanisms uncertain — an explicit evidence gap
  panel). `renderCrossSections` builds SVG circles/annuli + text nodes with `textContent`
  only and returns a cleanup function.
- `sha256` helper already exists both sides (`sha256Canonical` JS; `hashlib.sha256` Python) —
  reused, not duplicated.

Modified functions:

- Scene draw loop in `src/scene.js` (`update`/`draw` closure): after the main render, call
  `magnifiedViewport.renderInset()` only when enabled, in Studio, and drawing is not
  suspended; restore `setScissorTest(false)` and viewport after the inset pass.
- `diagnostics()` in `src/scene.js`: add the `magnified` entry (see [Types]).
- `createApp` wiring in `src/app.js`: bind `#magnify-construct` change → `lab.setMagnified`;
  extend the exported `diagnostics()` with `magnified: lab diagnostics entry`.
- `renderCrossSections` panel bootstrap (called from `src/app.js` next to the existing
  vascular panel bootstrap).

Removed functions: none.

[Classes]

None. The codebase is factory-function modules over plain objects; this cycle adds no
classes and no inheritance. The two new modules follow the existing
`createX({ deps }) -> { …api, dispose }` pattern (`scientific-views.js`,
`model-exploration-ui.js`).

[Dependencies]

None new. No npm packages (the repo has none), no new Python requirements (stdlib only),
reusing the vendored Three.js, Node built-in `node:test`, and the existing Playwright MCP
code-runner for browser evidence. `assets/model-provenance.json` needs no rebuild: no file
in the model closure (`model-adapters.js` + evaluators + `domain-models.js`,
`model-provenance.js`, `validation.js`, catalogs) is modified by this plan — `provenance:check`
must still pass at close-out as evidence.

[Testing]

Unit (Node built-in `node:test`, run via `npm test`):

- `tests/research-exchange.test.js` additions: golden vector literal bytes; per-fixture
  canonical sha256 equality against `golden-digests.json`; map regeneration mismatch fails.
- `tests/magnified-viewport.test.js`: with a stubbed `renderer`/`THREE`, `setEnabled(true)`
  produces a fitted secondary-camera pose within `CAMERA_LIMITS`; inset pass leaves scissor
  test disabled afterwards (restore assertion); `diagnostics()` shape; disabled state renders
  nothing; `dispose()` idempotent.
- `tests/vascular-cross-sections.test.js`: 3 sections rendered; every section node carries
  the disclaimer text; hostile strings in specs render inert (textContent, no `innerHTML`);
  cleanup empties the container.
- `tests/scientific-views.test.js` / `tests/visual-quality.test.js` untouched; existing
  263 tests keep passing (263 + ~12 new ≈ 275 expected — exact count recorded at close-out).

Python (in `/workspace/regen-workbench`, `/home/vscode/.local/bin/python3.12 -B -m unittest …`):

- `test_bioprint_exchange.py`: `test_fixture_golden_digests` (5 fixtures × identical digests
  as the JS side) + retained byte-vector test. Target 12 tests, all passing; full affected
  suites re-run (`test_regen_desk.py` expected unchanged: 30 run, same 3 pre-existing
  failures that reproduce at clean HEAD — not ours).

Browser (Playwright code-runner, bounded halves, evidence to `/tmp` + summarized in docs):

- `scripts/browser-smoke.js` still green (regression).
- `scripts/browser-smoke-phases-cde.js` half `c-d`: `#presentation-scale` cycles all four
  scales (cell shows the scale-unknown label in `#view-label`/panel copy), overlay legend
  entries complete and ≤4 active, `exportScenario()` bytes identical before/after all
  presentation changes, keyboard selection equivalence, WebGL-fallback banner behavior
  unchanged, `#sweep-run` then `#sweep-cancel` ends with "Sweep cancelled. No scenario values
  were changed." and scenario bytes unchanged; magnify toggle shows/labels the inset and
  `diagnostics().magnified.enabled` flips.
- half `e`: cockpit preview is inert (bundle selected → preview shown, `exportScenario()`
  unchanged, `#cockpit-apply` stays disabled until a valid preview), XSS-style fixture
  strings render inert (no script execution, `pageerror` empty), apply then export → reimport
  round-trips canonically, cross-section panel renders 3 sections with disclaimers.
- `scripts/browser-resource-matrix.js`: 10 settled cycles across lab/treedome ×
  low/balanced/high sampling `diagnostics().graphics.{geometries,textures,calls}` per cycle;
  two bounded halves (cycles 0–4, 5–9) merged into
  `docs/resource-matrix-run-2026-11-03.json`; `stableAcrossCycles` asserts identical counts
  across cycles; wording everywhere: settled-cycle counts only, not a GPU-leak certificate,
  no FPS claims.
- Overflow check at 390 px for every area after the new panel.

Close-out battery (both repos, in order): `npm test`, `npm run check`, `npm run
provenance:check`, `git diff --check`, `npm run verify:release`; Python suites as above;
evaluator + scenario /13 byte-hash comparison (before/after); then the two commits
(`git status` audit that only intended files change; `data/iris-*` excluded). Docs record
exact measured counts and keep the not-run gates (owner visual review, citation/scientific
review, live-provider demo, deployment) visible.

[Implementation Order]

1. Baseline: record current `npm test`/`npm run check` outputs; re-hash evaluator + scenario
   files to `/tmp` for the final byte-identity comparison.
2. Cross-language golden digests: generate `golden-digests.json` from the JS canonicalizer,
   verify Python `canonical_json_bytes` reproduces every digest, pin byte-identical copies
   in both fixture directories, add the JS and Python tests, run both affected suites.
3. Magnified viewport: `src/magnified-viewport.js` + unit tests → `src/scene.js` draw-loop
   and diagnostics wiring → `src/app.js` + `index.html` toggle + CSS → quick browser check
   of the inset frame and suspension behavior.
4. Explanatory cross-sections: `src/vascular-cross-sections.js` + unit tests →
   `index.html` panel + `src/app.js` bootstrap + CSS → 390 px overflow check.
5. Browser verification C/D/E: write `scripts/browser-smoke-phases-cde.js`, run half `c-d`
   then half `e` via the Playwright code-runner against `npm start`; capture evidence.
6. Resource matrix: write `scripts/browser-resource-matrix.js`, run cycles 0–4 and 5–9,
   merge `docs/resource-matrix-run-2026-11-03.json`, assert `stableAcrossCycles`.
7. Close-out docs: `docs/ROADMAP.md` 0.23/0.24 entries (B–G milestone + this cycle,
   hobby/AI-assisted framing, no biological claims), `docs/VERIFICATION.md` measured entry,
   `docs/VISUAL_DESIGN.md` matrix + visuals, `CHANGELOG.md`, `README.md`, `CONTEXT_STATE.md`,
   `implementation_plan.md` checkpoint.
8. Full batteries both repos (see [Testing]); rebuild the provenance manifest only if a
   closure file unexpectedly changed; confirm `provenance:check` and `verify:release` pass.
9. Commits (explicit owner authorization recorded in this plan): `/workspace/bioprinting-workbench`
   — all intended working-tree changes including this plan and the archive; message discloses
   AI assistance and hobby/learning status and lists the not-run gates. `/workspace/regen-workbench`
   — exchange adapter files + tests + schema only; `data/iris-*` left untracked. No push, no
   publication. Final summary lists what shipped and what remains owner-gated.
