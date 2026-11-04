# Implementation Plan

[Overview]

Continue the already-authorized full roadmap of bioprinting-workbench through its complete measurement-fit course and release-readiness course: finish registered-model sweeps, native run/fit/study provenance artifacts, convergence downloads and hypothesis/query draft editors; complete presentation wiring; close exchange parity and hardening gaps; execute the complete two-app (Workbench → ResearchDesk → Workbench) browser roundtrip with Desk verification; then produce coherent version metadata, primary-source audit evidence and a final measured closeout ending in a commit/file proposal.

Scope preservation is a hard requirement, not a preference. The owner's November 3 authorization ("all of it") and the November 4 confirmation ("all of it" for this continuation) cover every workstream in the archived plan at `docs/IMPLEMENTATION_PLAN_ARCHIVE_2026-11-04.md` — end-to-end hardening, scientific-computation foundations, 3D/accessibility/performance work and the ResearchDesk round trip. No prior narrowing to a single phase, a single app, documentation-only work or release-only work is permitted; if a checkpoint seems blocked, record the blocker and continue independent unblocked work. This personal hobby/learning project stays AI-assisted and disclosed as such. Speculative and hypothetical research scope is preserved; limitations name the actual model, evidence and unknowns — they do not remove exploration. No treatment guidance, transplant-readiness score or biological-validation claim appears anywhere.

Context: the working trees of both repositories carry uncommitted implementation from the November 3–4 session (Workbench: DAG-safe exchange, staged exports, exact viewport restoration, RGBA overlays, dataset/fit provenance, convergence studies, selection-aware exports, parity corpus; ResearchDesk: reviewed-query submission through the real queue, ZIP exports, HTTP apply under the store lock). Last measured Workbench baseline: **294 tests passed / 170 syntax-checked modules**; Desk exchange + loopback HTTP: 22 passed; eight parity cases green; all nine evaluator/numerics/scenario SHA-256 baselines unchanged; `provenance:check` fresh. These numbers are checkpoints, not guarantees — re-measure at every phase close. Publication boundaries are unchanged: implementation is not permission to commit, tag, push, deploy or call live providers; `main` publishes via GitHub Pages, so the closeout presents a commit proposal and stops.

High-level approach: work in five milestones with failing-first regression tests and measured evidence per milestone. Milestones 1–3 are Workbench-only. Milestone 4 reserves `/workspace/regen-workbench` (one editing agent at a time; use the workspace controller/launcher reservation) before touching Desk files, then returns to Workbench for the roundtrip return path. Milestone 5 is release-readiness closeout only — no publication. Every milestone closes with the standard battery in `docs/IMPLEMENTATION_PHASES_A_G_2026-11-03.md` ("Every phase close") and an update to `docs/IMPLEMENTATION_PROGRESS_2026-11-03.md` or a new dated continuation file.

[Types]

All JavaScript contracts are plain-object records validated by existing functions (`validation.js`, `domain-models.js`, `hypothesis-workspace.js`, `research-exchange.js`, `measurement-provenance.js`). Python contracts live in `tools/bioprint_exchange.py`. New and changed record shapes:

1. **StudyArtifact** — `schema: 'bioprinting-workbench/convergence-study-artifact/1'`. Immutable export of one convergence study: `{ schema, createdAt, modelId: 'box-oxygen', boundary, settings, resolutions: [9,17,33], samples: [{resolution, center, residualInfinity, balanceError, errorInfinity: number|null, converged}], comparisons: [{coarse, fine, centerDelta, observedOrder: number|null}], notices: string[], status }`. `errorInfinity`/`observedOrder` stay null when no analytic reference exists (all-faces case); nothing is interpolated. Digested with the existing canonical-JSON conventions from `model-provenance.js` (`sorted-json-lf/1`).

2. **RunRecord** — local capture of native work, new module `src/run-records.js`: `{ id, kind: 'fit-run' | 'model-run' | 'sweep-run' | 'study-run', modelId, status, createdAt, datasetRecordId: string|null, application: object|null, artifactFileName: string|null, artifactSha256: string|null, payload }`. `status` is exactly one of `RUN_STATUSES` from `model-provenance.js` (`succeeded | out-of-domain | numerical-failure | cancelled | failed`). `toForeignRun(record)` projects to the exchange `modelRuns` shape accepted by `validateForeignModelRun` (`{modelId, id, status, note, queryPlanId: null, deskRunId: null}`) without relabelling any status. `toArtifactDescriptor(record)` projects to `validateArtifactDescriptor` (`{id, filename, mediaType, sha256, bytes, note}`) with exact bytes for `verifyArtifactFiles`.

3. **SweepComparison** — result of comparing two completed sweep runs: `{ modelId, runIds: [a, b], deltas: [{path, index, values, a: number|null, b: number|null, delta: number|null}] }`, bounded to `MAX_SWEEP_POINTS` (100) rows per output. Comparison is only defined for runs of the same `modelId` and identical axis specs; quantities are compared only when their registered units match exactly (no conversion anywhere); non-succeeded points yield null deltas, never dropped rows.

4. **Draft persistence** — no new file schema. Hypothesis/query drafts persist through the existing exchange bundle `bioprinting-workbench/research-exchange/1`, whose `hypotheses` array already validates with `validateHypothesisCard(item, { allowDraft: true })`. Cockpit save/load reuses `parseResearchBundle`/`exportResearchBundle`; scenario /13 files remain a separate format.

5. **Presentation additions** — already typed in `scientific-view-state.js`: `representation: 'illustration' | 'model-field'`, `cutPlane: {axis: 'x'|'y'|'z', fraction: 0..1} | null`, `motion: 'system' | 'reduced'`. No state-schema change; the scene gains the matching effect methods.

6. **Version metadata** — one coherent dev version **0.25.0-dev** across `package.json`, `index.html` footer (`v0.25.0-dev`), `docs/RELEASE.md` ("Current development version"), `docs/ROADMAP.md` (new section header), `docs/CONTEXT_STATE.md`, `docs/MODEL_EXPLORATION.md`. `scripts/verify-release.mjs`'s version-consistency check (`index.html` must contain `v${targetVersion}`) is the enforcement point; `tests/release.test.js` pins it.

7. **Status-vocabulary translation table** (roundtrip) — documented in `docs/RESEARCH_EXCHANGE.md`: Workbench native statuses map one-to-one onto the `validateForeignModelRun` allowlist (`succeeded | out-of-domain | numerical-failure | cancelled | failed | unsupported-foreign | queued | running | partial | interrupted | submission-unknown`). Desk statuses `partial | interrupted | submission-unknown` are preserved verbatim on return; they are never coerced to `failed`.

[Files]

New files (full paths and purpose):

- `/workspace/bioprinting-workbench/src/run-records.js` — RunRecord creation, bounded in-memory registry (add/list/clear, max 100 entries, oldest evicted with a notice), `toForeignRun`, `toArtifactDescriptor`, exact-byte digesting via WebCrypto.
- `/workspace/bioprinting-workbench/src/sweep-presets.js` — explicit per-model base-input presets for the seven registered models (`storyboard`, `slab-oxygen`, `box-oxygen`, `flow-resistance`, `nozzle-shear`, `vascular-supply`, `relative-division`) as named constants, plus `sweepBaseInputs(modelId, overrides)` that merges user overrides and returns the envelope each adapter's `validateInputs` accepts. Presets are synthetic UI conveniences, labelled as such; runtime validity is enforced by `validateSweepSpec`, never trusted from the preset.
- `/workspace/bioprinting-workbench/src/research-draft-ui.js` — `createResearchDraftUI({ elements, workspace, onChange })`: form-based draft editor for hypothesis cards (title/question/scope/claimBoundary/system/mechanism; 2–8 alternative rows each with prediction+falsifier; predictions/falsifiers/confounders/missingMeasurements lists; modelIds and evidence-id cross references) and query-plan generation via `buildQueryPlans`. All rendering textContent-only, like `research-cockpit-ui.js`.
- `/workspace/bioprinting-workbench/scripts/browser-roundtrip.js` — `createBrowserRoundtripSuite({ workbenchURL, deskURL, part, viewport })` returning a function that receives an existing Playwright `browser`/`page` pair (Workbench page plus a Desk tab). Parts: `'roundtrip'` (export → Desk import → reviewed query → mocked run → ZIP export → return import), `'desk-controls'` (query review/submission UI, export controls, bounded download-failure matrix). Adds no application dependency.
- `/workspace/bioprinting-workbench/docs/IMPLEMENTATION_PLAN_ARCHIVE_2026-11-04.md` — byte-identical archive of the previous plan (created before this file was rewritten; SHA-256 `350c5330…8d7c3`).
- `/workspace/bioprinting-workbench/docs/RESEARCH_SOURCES_AUDIT_2026-11-04.md` — primary-source audit record: each claim/parameter, source actually opened, locator, disagreements, unavailable sources; explicitly marks agent review vs. independent domain review.
- `/workspace/bioprinting-workbench/docs/IMPLEMENTATION_PROGRESS_2026-11-04.md` — continuation checkpoint log (or dated successors per milestone).
- `/workspace/regen-workbench/tests/fixtures/bioprint_exchange/` — extended parity corpus additions (same JSON mirrored byte-identically under `/workspace/bioprinting-workbench/tests/fixtures/research-exchange/parity-cases.json`).

Existing files to modify — Workbench:

- `index.html` — Models panel: `#sweep-model` select (registered ids), `#sweep-axis` + `#sweep-axis2` (second axis optional, "none" allowed), per-axis `#sweep-values`, `#sweep-compare-a`/`#sweep-compare-b` run-slot selects and `#sweep-compare` output region; convergence panel: `#convergence-download`, `#convergence-history` list; cockpit panel: draft-editor container `#draft-editor`; presentation panel: `#presentation-cut-axis`, `#presentation-cut-fraction`, `#presentation-motion`; footer `v0.25.0-dev`.
- `src/app.js` — `getInputs()` for `createModelExplorationUI` builds `modelId` + `baseInputs` from the sweep selectors via `sweepBaseInputs`; wire `captureRunRecord` into slab fit, box fit/apply, sweep completion (`onRun`) and convergence completion; call `lab.presentation.setRepresentation/setCutPlane/setMotion` in `onStateChange`; hand `createHypothesisWorkspace` output into both cockpit and draft UI; pass run registry into `prepareSelectedResearchExport` context so modelRuns/artifacts export.
- `src/model-exploration-ui.js` — model/axis selectors populated from `getDomainModels()` (`supportedOperations` includes `'sweep'`; hide non-sweep models with a visible note), two-axis spec assembly, comparison of two retained results via `compareSweepRuns`, disposal of comparison listeners.
- `src/model-exploration.js` — add `compareSweepRuns(a, b)` (pure, bounded, same-unit-only).
- `src/convergence-study.js` — add `serializeStudyArtifact(result, context)`.
- `src/convergence-study-ui.js` — retained history (bounded, e.g. 20 studies), `#convergence-download` producing the StudyArtifact JSON blob download, history selection re-rendering the table; dispose revokes object URLs.
- `src/research-cockpit-ui.js` — accept `workspace` + `draftUI` state changes, render draft records with their status, keep import inert (imports never mark owner-reviewed, never run jobs).
- `src/scientific-views.js` — `setRepresentation`, `setCutPlane` (Three.js clipping planes on presentation-group materials; `renderer.localClippingEnabled` set transactionally with rollback on throw), `setMotion` (freeze/unfreeze tracers and shader animation without touching scenario time).
- `src/scene.js` — expose the three methods on the `presentation` object; extend `diagnostics()` with `representation`, `cutPlane`, `motion`; keep exact-viewport/inset restoration guarantees; visibility restore on scale transition back to `laboratory` must be covered by a test.
- `src/scientific-view-ui.js` — bind cut-plane/motion controls through `reduceScientificViewState` events (`setCutPlane`, `setMotion`), errors revert control values like existing handlers.
- `src/instrument.css` — styles for the new controls consistent with the existing instrument theme.

- `scripts/verify-release.mjs` — exclude planning archives (`docs/IMPLEMENTATION_HISTORY_2026-11-03.md`, `docs/IMPLEMENTATION_PLAN_ARCHIVE_2026-11-04.md`, prior closeout/verification transcripts) from the publishable inventory; keep version-consistency check; no behavior change otherwise.
- `scripts/browser-verification-suite.js` — add parts `'exploration'` (model/axes sweep + comparison), `'drafts'` (draft editor round-trip through export), `'presentation'` (representation/cut/motion + visibility restore).
- `scripts/browser-resource-matrix.js` — persist the settled ten-cycle matrix and fresh-page series as JSON evidence under `docs/` (deterministic per position-in-run; explicitly not a GPU-leak certificate).
- `scripts/verify-exchange-parity.mjs` — consume the extended parity corpus; exit nonzero on any divergence.
- `package.json` — `0.25.0-dev`.
- Tests listed under [Testing].

Existing files to modify — ResearchDesk (only after reservation, milestone 4):

- `/workspace/regen-workbench/tools/bioprint_exchange.py` — cross-language normalization parity for nested alternative fields, ISO-8601 timestamps, and cross-reference uniqueness (query→hypothesis, evidence→source, artifact descriptor→file); mirror any new corpus case into the JS fixture file byte-identically.
- `/workspace/regen-workbench/tools/regen_desk.py` — export finalization hardening: fsync-then-rename publication of staging directories, explicit error strings for missing artifact/oversize/hash-mismatch used by the browser download-failure matrix; keep `Desk.submit()` untouched by import.
- `/workspace/regen-workbench/tools/desk/app.js`, `/workspace/regen-workbench/tools/desk/index.html` — make query review/submission and export controls deterministically drivable from the browser suite (stable ids already present; add missing `id`s/`aria` hooks only), bounded download-failure messages.
- `/workspace/regen-workbench/tests/test_bioprint_exchange.py`, `/workspace/regen-workbench/tests/test_bioprint_exchange_http.py` — new parity cases, export-finalization and download-failure cases.
- `/workspace/regen-workbench/BIOPRINT_EXCHANGE.md` — status-vocabulary translation table and parity-corpus version note.

Docs to update (documentation only; no claim upgrades): `docs/ROADMAP.md` (new "Local 0.25.0-dev follow-on" section), `docs/RELEASE.md` (version, inventory exclusions), `docs/VERIFICATION.md` (measured results + not-run gates), `docs/RESEARCH_EXCHANGE.md`, `docs/RESEARCH_COCKPIT.md`, `docs/MODEL_EXPLORATION.md`, `docs/MULTISCALE_VIEWS.md`, `docs/IMPLEMENTATION_PROGRESS_2026-11-03.md` (append pointers), `CONTEXT_STATE.md`.

Files not to touch: the seven evaluator modules (`src/model.js`, `oxygen.js`, `oxygen3d.js`, `flow.js`, `nozzle-shear.js`, `vascular-supply.js`, `cell-division.js`), `src/numerics.js`, `src/scenario.js` (scenario /13 must round-trip byte-stable; /14 stays rejected), `tests/fixtures/scenario-v*.json`, and regen-workbench `data/iris-*` (untracked, owner data).

[Functions]

New functions (name, signature, file path, purpose):

- `createRunRegistry({ max = 100 } = {})` → `{ add(record), list(), get(id), clear(), size() }` — `src/run-records.js`; bounded in-memory store, eviction notice, structuredClone isolation.
- `createRunRecord({ kind, modelId, status, createdAt, payload, datasetRecordId, application })` → RunRecord — `src/run-records.js`; validates `status ∈ RUN_STATUSES`, ids bounded.
- `toForeignRun(record)` → `{modelId, id, status, note, queryPlanId: null, deskRunId: null}` — `src/run-records.js`; passes `validateForeignModelRun` unchanged.
- `async toArtifactDescriptor(record)` → `validateArtifactDescriptor` record with exact `sha256`/`bytes` — `src/run-records.js`.
- `sweepBaseInputs(modelId, overrides = {})` → plain inputs envelope — `src/sweep-presets.js`.
- `compareSweepRuns(a, b)` → SweepComparison — `src/model-exploration.js`; throws on mismatched model/axes; same-unit-only.
- `serializeStudyArtifact(result, context)` → plain StudyArtifact record — `src/convergence-study.js`.
- `createResearchDraftUI({ elements, workspace, onChange })` → `{ getState, setState, dispose }` — `src/research-draft-ui.js`.
- `createBrowserRoundtripSuite({ workbenchURL, deskURL, part, viewport })` → async fn({ browser, page }) → evidence record — `scripts/browser-roundtrip.js`.
- Desk: `_publish_staging(staging_dir, final_dir)` (fsync + `os.replace`) in `tools/regen_desk.py`; `_download_failure(kind)` message map for the failure matrix.

Modified functions:

- `createModelExplorationUI({ elements, client, getInputs, onRun })` — `src/model-exploration-ui.js`: add model/second-axis selectors, comparison region, and result retention for two runs; keep run/cancel token semantics and "never writes scenario" guarantee.
- `createConvergenceStudyUI({ elements, getSettings, clientFactory, onRun })` — `src/convergence-study-ui.js`: add history + download; keep dedicated-client cancellation semantics.
- `onStateChange` closure and `createModelExplorationUI(...)` call in `src/app.js`: wire representation/cut-plane/motion, run capture, per-model inputs.
- `presentation` object factory in `src/scene.js` (line ~394): add `setRepresentation`, `setCutPlane`, `setMotion`; extend `diagnostics()`.
- `createScientificViewUI` — `src/scientific-view-ui.js`: bind cut-plane/motion controls.
- `verifyRelease(directory, { targetVersion })` — `scripts/verify-release.mjs`: inventory exclusions.
- `createBrowserVerificationSuite({ baseURL, part, viewport })` — `scripts/browser-verification-suite.js`: new parts.
- `prepareSelectedResearchExport(state, selection, context)` — `src/research-selection.js`: accept run registry in `context`, include selected run/artifact records.
- Desk `export_bio` and loopback export handler — staging publication via `_publish_staging`.

Removed functions: none. No migration strategy needed; all changes are additive except this plan document rewrite, whose previous content is archived byte-for-byte at `docs/IMPLEMENTATION_PLAN_ARCHIVE_2026-11-04.md`.

[Classes]

No classes are added or removed. The codebase uses closure factories (`createLab`, `createAnalysisUI`, `createResearchCockpitUI`, `createHypothesisWorkspace`; `Desk` is the one Python class). New state (run registry, draft UI, comparison slots) follows the same closure-factory pattern with explicit `dispose()`; `Desk` in `tools/regen_desk.py` gains private helpers but no new public class.

[Dependencies]

None. The Workbench keeps zero npm dependencies (Node built-in test runner, vendored Three.js, native ES modules, WebCrypto for SHA-256); ResearchDesk keeps Python 3.12 stdlib only. No new packages, no version changes, no network installs. Runtime environment constraints the implementation must respect: Python is `/home/vscode/.local/bin/python3.12` (`/usr/bin/python3` is stripped); shell transport mangles `!`/quoting so scripts are written to `/tmp/*.py|*.mjs` and executed; the Playwright runner caps calls at 60 s, needs files under `/tmp/cline-playwright`, wraps them as expressions (no trailing `;`), and `waitForFunction` rAF polling is unreliable there (use interval polling; pass cross-call state via `page.localStorage`).

[Testing]

Failing-first for every behavioral change; each file is Node `node:test` unless noted.

- `tests/run-records.test.js` (new) — registry bounds/eviction, status validation, `toForeignRun` passes `validateForeignModelRun` for every `RUN_STATUSES` value, `toArtifactDescriptor` hash verification via `verifyArtifactFiles`, no fabricated provenance (null implementation digests stay null).
- `tests/sweep-presets.test.js` (new) — every preset round-trips `validateSweepSpec` (incl. box-oxygen ≤25 points and resolution ≤17), overrides rejected outside declared bounds.
- `tests/model-exploration.test.js` (extend) — `compareSweepRuns`: mismatched model/axes throw; unit-mismatched quantities yield null delta; bounded row count.
- `tests/model-exploration-ui.test.js` (extend) — model/axis selector validation, two-axis run, comparison of two retained runs, cancellation tokens unaffected.
- `tests/convergence-study.test.js` (extend) — `serializeStudyArtifact` shape; null analytic fields preserved.
- `tests/convergence-study-ui.test.js` (extend) — history bounded, download blob correct, dispose revokes URLs, cancelled study leaves no history entry.
- `tests/research-draft-ui.test.js` (new) — draft create/edit validates via `validateHypothesisCard({allowDraft:true})`; 2–8 alternatives enforced; missing predictions block ready-for-review but keep drafts; XSS strings stay inert (textContent); dispose removes listeners.
- `tests/research-cockpit-ui.test.js` (extend) — draft records flow into selection/export; imported drafts never become owner-reviewed; stale async guards intact.
- `tests/research-exchange.test.js` (extend) — native run round-trip through `modelRuns`, artifact descriptor parity with Python corpus cases.
- `tests/scientific-view-state.test.js` (already green) — no change expected; keep as reducer pin.

- `tests/scene-resources.test.js` (extend) — `setRepresentation/setCutPlane/setMotion` diagnostics, clip-plane rollback on injected throw, visibility restore to laboratory, disposal of clip resources; fake-THREE plus existing real-pixel checks (`scripts/browser-resource-matrix.js`).
- `tests/release.test.js` (extend) — version coherence `v0.25.0-dev`, planning archives excluded from inventory, scenario /13 fixtures still byte-stable.
- `tests/scientific-overlays.test.js`, `tests/magnified-viewport.test.js` (extend only if representation/cut work touches them).
- Python: `tests/test_bioprint_exchange.py`, `tests/test_bioprint_exchange_http.py` (regen-workbench) — extended parity corpus (nested fields, timestamps, cross references), export finalization, download-failure matrix, idempotent submission and stale-HTTP-apply cases remain green; mocked provider still executes through the real queue with zero external calls.
- Cross-language: `npm run verify:exchange-parity` must pass over the extended corpus in both repositories with byte-identical fixture files (SHA-256 pinned in `tests/fixtures/research-exchange/golden-digests.json`).
- Browser (existing connected Playwright runner; adapters take an injected page; no app dependency): new suite parts (`exploration`, `drafts`, `presentation`; `provenance` already exists) plus `scripts/browser-roundtrip.js` parts (`roundtrip`, `desk-controls`) at 1280×720 and 390 px; zero page errors; scenario bytes invariant after every run; the two-app roundtrip must show export → Desk import (inert preview → apply) → reviewed query submission through the real queue with a mocked provider → hash-verified ZIP → return import with preserved statuses.
- Standing gates that remain **not-run** and must be reported as such: owner visual review, independent citation/scientific review, live-provider demonstration (needs owner credentials and explicit opt-in), tag/push/deployment, authoring isolation beyond existing evidence.
- Standard phase-close battery every milestone: `npm test`, `npm run check`, `npm run provenance:check`, `PYTHON=/home/vscode/.local/bin/python3.12 npm run verify:exchange-parity`, `npm run verify:release`, `git diff --check`, Python `unittest` for `test_bioprint_exchange*.py`, and the evaluator/scenario SHA-256 baseline comparison (nine files).

[Implementation Order]

1. Re-baseline: run the standard battery on the current uncommitted trees; confirm sole-editor status and reservations; record measured counts in the progress log. Preserve all existing changes; no resets or reverts. Confirm `docs/IMPLEMENTATION_PLAN_ARCHIVE_2026-11-04.md` matches the pre-rewrite plan hash.
2. Milestone 1a (sweeps): add failing tests for `sweepBaseInputs`/`compareSweepRuns` and the model/axis selectors; implement `src/sweep-presets.js`, `compareSweepRuns`, `model-exploration-ui` selectors/axes (1–2 axes, 2–10 values, existing caps), and `app.js` per-model `getInputs`. Validate: extended unit tests, browser part `exploration`, scenario bytes invariant.
3. Milestone 1b (run/fit/study artifacts): failing tests for RunRecord projection and StudyArtifact; implement `src/run-records.js`, `serializeStudyArtifact`, convergence history/download UI, capture wiring in `app.js`, and `research-selection.js` export of selected runs/artifacts. Validate: `tests/run-records.test.js` etc., export a bundle containing native `modelRuns` + artifact and re-import it idempotently in a test.
4. Milestone 1c (draft editors): failing tests; implement `src/research-draft-ui.js`, cockpit integration, index.html panel; drafts persist via exchange bundles (allowDraft semantics already accepted). Validate: `research-draft-ui`/`research-cockpit-ui` tests, browser part `drafts`.
5. Milestone 2 (presentation wiring): failing tests for representation/cut/motion; implement `scientific-views.js` effects, `scene.js` API + diagnostics + visibility restore, `scientific-view-ui.js` controls, `app.js` wiring. Validate: `scene-resources`/state tests, browser part `presentation`, inset/main pass counters still separate, WebGL-failure path still degrades cleanly.
6. Milestone 3 (exchange parity + hardening): extend `parity-cases.json` with nested-field/timestamp/cross-reference/diamond-DAG cases; implement any normalization gaps found in `research-exchange.js` and `bioprint_exchange.py` (keep both sides byte-identical); add Desk staging fsync/`os.replace` publication and its failure tests. Validate: parity runner in both repos, HTTP suite, adversarial-writer test documents the non-sandbox limitation.

7. Phase-close checkpoint for milestones 1–3: full battery, browser parts, resource matrix run, progress-log update. No commit.
8. Milestone 4a (Desk, reserved): reserve `/workspace/regen-workbench` via the workspace controller (no concurrent agents; save/inspect Workbench state first); implement Desk browser hooks, download-failure messages, `_publish_staging`; extend Python tests. Validate: `test_bioprint_exchange*.py`, `test_regen_desk.py` (three known pre-existing failures tracked separately).
9. Milestone 4b (roundtrip): implement `scripts/browser-roundtrip.js`; execute the full Workbench → Desk → Workbench flow with the mocked provider through the actual queue/executor; repair observed integration defects; document the status-vocabulary translation in `docs/RESEARCH_EXCHANGE.md` and `BIOPRINT_EXCHANGE.md`. Validate: roundtrip evidence JSON with zero page errors and preserved statuses; selected export re-imports idempotently.
10. Milestone 5a (version + inventory): synchronize 0.25.0-dev metadata everywhere listed in [Types]; exclude planning archives from release inventory in `verify-release.mjs`; extend `tests/release.test.js`. Validate: `verify:release` passes with coherent version.
11. Milestone 5b (evidence + audit): run the ten-cycle settled resource matrix and fresh-page series to `docs/` JSON; run all browser parts at 1280×720 and 390 px; perform the primary-source audit by actually opening each cited source (record locators/disagreements/unavailable sources in `docs/RESEARCH_SOURCES_AUDIT_2026-11-04.md`; no claim upgrades without opening a source); update `VERIFICATION.md` with measured results and explicit not-run gates.
12. Milestone 5c (closeout): rebuild `model-provenance.json` only if the provenance closure genuinely changed (`npm run provenance:build` + `provenance:check`); run the complete battery in both repos; audit both worktrees (`git status` tracked+untracked, binary hashes); write the final progress entry; present the commit/file proposal with known limitations and last-known-good revision — then stop. No commit, tag, push, release, Pages change or live call. Owner visual walkthrough, citation review and any publication are separate future authorizations.

Completion criteria (from the archived plan, all still binding): selected export produces a reimportable bundle; mocked research return works through the actual queue end-to-end in the browser; field overlays encode current values; inset failures cannot corrupt main rendering; dataset/fit/study provenance is inspectable including downloads; registered-model sweeps and bounded comparison work without invented physical mappings; drafts are editable and exchangeable; committed verification commands reproduce measured outcomes. A notice or test around a nonfunctional button is not feature completion. Report specific blockers for concurrent edits, environment limits, unexplained numerical regressions, unresolved parity or unsafe filesystem confinement while continuing independent unblocked work. No silent feature removal or reduction of speculative scope is authorized.