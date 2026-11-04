# Implementation Plan

[Overview]

Complete all four owner-selected workstreams—end-to-end hardening, scientific-computation foundations, 3D/accessibility/performance improvements, and the ResearchDesk round trip—with functional features, regression tests and reproducible evidence.

Owner confirmed **all of it** on November 3, 2026 and subsequently explicitly authorized implementation. Do not narrow that scope to documentation or a single phase. Implementation is underway; measured checkpoint results and outstanding work are recorded in `/workspace/bioprinting-workbench/docs/IMPLEMENTATION_PROGRESS_2026-11-03.md`. This plan remains the full scope, not a claim that all milestones are complete. The scope supports speculative research and hypothetical studies; limitations identify the actual model, evidence and unknowns rather than remove exploration.

## Baseline and publication facts

- Workbench local/remote main: `689200d5c1492cc10b2623a439cb1cc631aaf988`.
- ResearchDesk local/remote main: `2b95b7193a468d167204f999b5fbea67a9bd54e1`.
- Both commits were pushed on explicit instruction in this conversation; remote hashes verified with `git ls-remote`.
- GitHub Pages uses legacy Workbench `main`/root publication. Read-only API inspection reports commit `689200d5c1492cc10b2623a439cb1cc631aaf988` built at November 3, 2026, 23:07:24 UTC. The push therefore triggered publication even though no separate deployment command was issued. A built deployment does not establish browser correctness.
- Historical counts, not rerun during this planning pass: Workbench 273 tests / 156 syntax-checked modules; exchange 11 tests; three previously recorded Desk failures require a fresh baseline.
- Previous plan preserved at `/workspace/bioprinting-workbench/docs/IMPLEMENTATION_VERIFICATION_CLOSEOUT_2026-11-03.md`.
- No further push, release, Pages configuration change, paid generation or live provider call is automatic under this plan. Future main pushes can publish and must be described accordingly.

## Findings from source investigation

1. `src/magnified-viewport.js::renderInset()` restores assumed full-canvas rectangles, not previous rectangles; rendering exceptions bypass restoration. Width-only sizing can overflow a short canvas. Its aspect test accepts any positive aspect.
2. `src/scientific-overlays.js` supplies Float64 data to a default DataTexture without a supported explicit pixel format, ignores slab values when drawing its solid rectangle, and has no transaction cleanup on construction failure. Fake-THREE tests do not establish real pixels.
3. `src/app.js` refreshes overlays on presentation events rather than every relevant field change; a missing box field falls through to marker data even though the overlay requires a field. Independent quality controls can disagree. Representation/cut-plane/motion state is not fully wired.
4. `src/scene.js` renders the inset after the main pass; per-render counters may describe only the last pass. Non-lab views hide the live construct targeted by the inset. Camera and visibility restoration need transition coverage.
5. Cross-section SVGs have no useful accessible names; cleanup empties, rather than removes, owned figures. Source anchors are free text and combine different claim responsibilities.
6. The cockpit exports only hypotheses despite holding queries, runs, evidence and artifacts. Async import has no generation/disposal guard, and `setState()` retains pending previews. There is no full draft/edit/select/export workflow.
7. Both ancestry validators use a global seen set and can reject a valid diamond-shaped DAG. Group uniqueness, nested allowlists, timestamps and cross-references need consistent parity tests. JS apply trusts supplied conflict metadata rather than recomputing a trusted preview.
8. `Desk.export_bioprint_results()` uses caller bundle ID as a path component before basename validation. `export_selected_results()` writes incrementally without whole-selection preflight, descriptor/file matching, aggregate enforcement or atomic finalization. The Desk export button only displays counts; no result export route is connected.
9. Measurement imports and 3D manufactured-solution/refinement tests already exist. Extend rather than rewrite them: immutable dataset/fit/study provenance, user-visible grid studies and reproducible run capture are missing increments.
10. Browser scripts are code-runner expressions with hard-coded URLs. The matrix merger lives outside the repo. No committed orchestration validates the whole cross-repo round trip.
11. Package/footer still say `0.22.0-dev`, milestone headings reach 0.24, release guidance is stale, candidate revision is always null, and planning-archive exclusions are incomplete.

## Scope and engineering boundaries

Retain seven native evaluators, equations, tolerances and scenario /13 behavior as the regression baseline. Add composition and comparison without pretending independent domains are physically coupled. Measured inputs remain user-declared, not independently authenticated; hypothetical inputs remain supported and labelled. Preserve negative/conflicting findings and hobby/AI-assistance disclosures.

Deliver numerical convergence studies, provenance-backed fitting, registered-model sweeps, side-by-side comparison and explicit compatible input bindings. A new coupled advection/diffusion solver, nonlinear rheology or vascular growth requires separately specified equations, boundaries, primary-source support and verification cases; UI mappings alone do not implement it. Record these as concrete subsequent solver milestones, not permanent bans. No software test implies biological or clinical validation.

[Types]

Continue plain JavaScript objects/runtime validators and Python stdlib dictionaries; no TypeScript migration.

1. **VerificationReport** (`bioprinting-workbench/verification-run/1`): `{id,startedAt,finishedAt,sourceRevision:{commit:string|null,dirty:boolean},runtime:{node,python:string|null,browser:string|null},checks:[{id,status:'pass'|'fail'|'not-run',command:string|null,evidencePath:string|null,notes}],scenarioDigestBefore:string|null,scenarioDigestAfter:string|null}`. ISO timestamps; missing evidence is not-run, never inferred pass.
2. **OverlaySnapshot**: `{id,modelId,generation:nonnegative integer,unit,coordinateSpace,availability:'ready'|'missing'|'stale'|'failed',reason:string|null,field:{width,height,values:Float64Array}|null,edges:Array|null,runId:string|null,range:{min,max}|null}`. Finite values, exact dimensions, at most four overlays and texture side <=256; no fabricated marker for missing fields.
3. **FrameRenderStats**: `{mainCalls,insetCalls,totalCalls,geometries,textures,insetRendered:boolean}`. Nonnegative integer counts; total calls includes both passes, resource counts are distinct. Zero-size/disposed frames do not count work.
4. **DatasetRecord** (`bioprinting-workbench/dataset/1`): `{id,modelId:'slab-oxygen'|'box-oxygen',inputSchema,source,declaredDataKind:'synthetic'|'measured',units:'dimensionless-ratio',rawSha256,normalizedSha256,measurementCount,importedAt,normalizedInput}`. Reuse 256 KiB/1–100-observation parser caps. Hash original bytes and normalized input separately. Keep files local.
5. **FitRun** (`bioprinting-workbench/fit-run/1`): `{id,datasetId,datasetSha256,modelId,settingsSnapshot,implementationSha256:string|null,startedAt,finishedAt,status:'succeeded'|'unidentifiable'|'out-of-domain'|'numerical-failure'|'cancelled'|'failed',estimate:number|null,residuals:Array,residualMetric:{name,value:number|null},diagnostics,applied:boolean}`. Derived estimates are not measured parameters. Apply is an explicit local action, not an import side effect.
6. **ConvergenceStudySpec**: `{modelId:'box-oxygen',settings,resolutions}`; use sorted unique existing grid sizes `[9,17,25,33]`, 2–4 entries, default `[9,17,33]`. **ConvergenceStudyResult**: `{id,spec,samples:[{resolution,h,center,min,max,residualInfinity,balanceError,converged,inDomain,errorInfinity:number|null}],comparisons:[{coarse,fine,centerDelta,observedOrder:number|null}],reference:'analytic-slab-x'|'grid-comparison',status,notices}`. Only slab-x has an analytic profile; all-faces grid differences are not exact errors. Undefined/zero-error/nonconverged orders are null.
7. **ResearchSelection**: `{hypothesisIds,queryIds,modelRunIds,evidenceIds,artifactIds}`, bounded unique IDs. Compute reference/ancestor closure and preview added dependencies/missing bytes. Full native ModelRun/FitRun/study records travel as JSON artifacts under exchange /1; compact foreign runs stay metadata, avoiding an undocumented schema extension.
8. **DeskExchangePreviewToken**: `{bundleSha256,expectedStoreSha256}`, returned at preview and checked under lock on panel apply. Do not trust client-supplied conflict arrays.
9. **DeskResultSelection**: IDs of existing server records/runs/artifacts plus validated bundle metadata; no arbitrary output roots or paths. Generated export IDs identify server-owned directories. Map native Desk `complete` explicitly to exchange `succeeded`, retain native status in receipt artifact, preserve partial/interrupted/submission-unknown and never auto-retry ambiguity.
10. **ExchangeParityCase**: `{id,input,expected:'accept'|'reject',reason:string|null}`. Cover DAGs/cycles, duplicate IDs, nested keys, Unicode, ISO timestamps, bool/integer distinctions, signed zero, exponents, large numbers and limits. Exact producer bytes remain artifact integrity; do not assume universal JS/Python numeric canonicalization.

[Files]

Paths are absolute. Braced lists below enumerate specific sibling files, not a directory-wide edit authorization.

## New Workbench files

- `/workspace/bioprinting-workbench/src/overlay-data.js`: pure field validation, snapshot extraction and RGBA mapping.
- `/workspace/bioprinting-workbench/src/measurement-provenance.js`: immutable dataset/fit records over existing parsers and fits.
- `/workspace/bioprinting-workbench/src/convergence-study.js`: bounded refinement study and comparison.
- `/workspace/bioprinting-workbench/src/convergence-study-ui.js`: explicit run/cancel, progress, accessible results.
- `/workspace/bioprinting-workbench/src/research-selection.js`: dependency closure and artifact-backed selected export.
- `/workspace/bioprinting-workbench/src/research-draft-ui.js`: hypothesis/query draft forms using existing validators/workspace.
- `/workspace/bioprinting-workbench/scripts/browser-verification-suite.js`: parameterized browser suite factory with injected Playwright page.
- `/workspace/bioprinting-workbench/scripts/merge-browser-evidence.mjs`: bounded-run report and resource-matrix validation/merge.
- `/workspace/bioprinting-workbench/scripts/verify-exchange-parity.mjs`: shared Node/Python acceptance and golden-byte runner.
- `/workspace/bioprinting-workbench/tests/overlay-data.test.js`, `/workspace/bioprinting-workbench/tests/measurement-provenance.test.js`, `/workspace/bioprinting-workbench/tests/convergence-study.test.js`, `/workspace/bioprinting-workbench/tests/convergence-study-ui.test.js`, `/workspace/bioprinting-workbench/tests/research-selection.test.js`, `/workspace/bioprinting-workbench/tests/research-draft-ui.test.js`, `/workspace/bioprinting-workbench/tests/browser-evidence.test.js`, `/workspace/bioprinting-workbench/tests/exchange-parity.test.js`: matching regressions.
- `/workspace/bioprinting-workbench/tests/fixtures/research-exchange/parity-cases.json`: accepted/rejected shared corpus.
- `/workspace/bioprinting-workbench/docs/MEASUREMENT_PROVENANCE.md`, `/workspace/bioprinting-workbench/docs/CONVERGENCE_STUDIES.md`, `/workspace/bioprinting-workbench/docs/APP_WALKTHROUGH.md`: contracts, reproduction and walkthrough. Dated evidence only after actual runs.

## Existing Workbench files to modify

- `/workspace/bioprinting-workbench/src/magnified-viewport.js`, `/workspace/bioprinting-workbench/src/scene.js`: state restoration, bounds, target visibility, frame statistics and ownership.
- `/workspace/bioprinting-workbench/src/scientific-overlays.js`, `/workspace/bioprinting-workbench/src/scientific-views.js`, `/workspace/bioprinting-workbench/src/scientific-view-state.js`, `/workspace/bioprinting-workbench/src/scientific-view-ui.js`: actual field encoding, transactional resources, functioning representation/cut-plane/motion, synchronized quality.
- `/workspace/bioprinting-workbench/src/app.js`, `/workspace/bioprinting-workbench/src/analysis-ui.js`, `/workspace/bioprinting-workbench/src/analysis-client.js`, `/workspace/bioprinting-workbench/src/analysis-worker.js`: retain controllers; provenance/run capture; refresh snapshots; study worker requests/cancel and complete disposal.
- `/workspace/bioprinting-workbench/src/exploration-client.js`, `/workspace/bioprinting-workbench/src/model-exploration-ui.js`: registry-backed model/axis choices, input validation and worker cleanup instead of slab-only UI.
- `/workspace/bioprinting-workbench/src/research-exchange.js`, `/workspace/bioprinting-workbench/src/research-cockpit-ui.js`, `/workspace/bioprinting-workbench/src/hypothesis-workspace.js`: correct DAG/reference validation, trusted preview apply, async guards, editing and complete selected export.
- `/workspace/bioprinting-workbench/src/model-provenance.js`, `/workspace/bioprinting-workbench/src/domain-models.js`: compatible capture/attachment hooks if required; keep ModelRun /1 and native-output semantics. Put new dataset/fit/study metadata in separate artifacts.
- `/workspace/bioprinting-workbench/src/vascular-cross-sections.js`: accessible SVGs, owned-node cleanup and claim-specific source locators.
- `/workspace/bioprinting-workbench/index.html`, `/workspace/bioprinting-workbench/src/instrument.css`, `/workspace/bioprinting-workbench/src/analysis.css`: functional controls, responsive inset, selection/download forms, focus/status/contrast/touch targets.
- `/workspace/bioprinting-workbench/scripts/browser-smoke.js`, `/workspace/bioprinting-workbench/scripts/browser-smoke-phases-cde.js`, `/workspace/bioprinting-workbench/scripts/browser-resource-matrix.js`: parameterized adapters, continuous-page matrix and failure cases.
- `/workspace/bioprinting-workbench/scripts/verify-release.mjs`: truthful revision/dirty state, tested archive exclusion, evidence linkage without treating file presence as test execution.
- `/workspace/bioprinting-workbench/scripts/build-model-provenance.mjs`, `/workspace/bioprinting-workbench/assets/model-provenance.json`: extend roots only if justified; rebuild changed dependency closure and explain changed digests.
- `/workspace/bioprinting-workbench/package.json`: dependency-free evidence/parity commands; synchronize integrated development version `0.25.0-dev` with footer at close-out, not a tagged scientific release.
- Extend existing tests corresponding to every modified module, especially magnifier/overlay/analysis-client/cockpit/exchange/release/scenario/evaluator identity tests.
- `/workspace/bioprinting-workbench/README.md`, `/workspace/bioprinting-workbench/CHANGELOG.md`, `/workspace/bioprinting-workbench/CONTEXT_STATE.md`, `/workspace/bioprinting-workbench/implementation_plan.md` and `/workspace/bioprinting-workbench/docs/{ROADMAP,RELEASE,VERIFICATION,VISUAL_DESIGN,DOMAIN_MODELS,MULTISCALE_VIEWS,MODEL_EXPLORATION,RESEARCH_COCKPIT,RESEARCH_EXCHANGE,VASCULAR_SUPPLY}.md`: reconcile real behavior, version history, Pages publication, measured outcomes and remaining review.

## ResearchDesk changes

- `/workspace/regen-workbench/tools/bioprint_exchange.py`: parity, trusted/stale previews, strict selection preflight, descriptor-byte checks and atomic export.
- `/workspace/regen-workbench/tools/regen_desk.py`: token-bound apply, reviewed plan-to-existing-queue submission, record-ID export, bounded export/download routes with existing Host/Origin protection.
- `/workspace/regen-workbench/tools/desk/app.js`, `/workspace/regen-workbench/tools/desk/index.html`: real selected result export/download, plan review/submit, in-flight states, stale-response suppression.
- `/workspace/regen-workbench/tools/schemas/bioprint-research-exchange-v1.json`: match documented and enforced /1 constraints; no undocumented fields.
- `/workspace/regen-workbench/tests/test_bioprint_exchange.py`: regressions; new `/workspace/regen-workbench/tests/test_bioprint_exchange_http.py`: loopback HTTP tests with temporary stores and mocked providers.
- `/workspace/regen-workbench/tests/fixtures/bioprint_exchange/parity-cases.json`: byte-identical shared corpus.
- `/workspace/regen-workbench/BIOPRINT_EXCHANGE.md`, `/workspace/regen-workbench/RESEARCH_DESK.md`: actual routes, runnable mock round trip, integrity and opt-in provider handling.

No application file deletions/moves planned. Preserve previous plans and exclude all planning archives from release inventory with a tested rule. Do not touch `/workspace/regen-workbench/data/iris-*`, credentials, vendor assets, unrelated methods repos or history.

[Functions]

## New functions

- `makeFieldRGBA(values,{min,max}) -> Uint8Array`, `buildOverlaySnapshot(id,context) -> OverlaySnapshot`, `validateOverlaySnapshot(raw) -> OverlaySnapshot` in `/workspace/bioprinting-workbench/src/overlay-data.js`: finite validation and deterministic colors, including constant ranges/out-of-domain display, before GPU allocation.
- `createDatasetRecord({id,rawBytes,modelId,importedAt}) -> Promise<DatasetRecord>`, `buildFitRun(context,nativeFit) -> Promise<FitRun>`, `verifyDatasetRecord(record) -> Promise<{rawAvailable,normalizedMatches}>` in `/workspace/bioprinting-workbench/src/measurement-provenance.js`: exact-byte/normalized linkage without changing fitting arithmetic.
- `validateConvergenceStudySpec(raw)`, `runConvergenceStudy(spec,{solve,signal,onProgress}) -> Promise<ConvergenceStudyResult>`, `compareRefinements(samples,reference)` in `/workspace/bioprinting-workbench/src/convergence-study.js`: inject native solve for tests; terminate dedicated worker to interrupt synchronous solves.
- `createConvergenceStudyUI({elements,client,getSettings,onRun}) -> {getLastResult,dispose}` in `/workspace/bioprinting-workbench/src/convergence-study-ui.js`.
- `resolveResearchSelection(state,selection) -> {selection,addedDependencies,blockedReasons}`, `prepareSelectedResearchExport(state,selection,context) -> Promise<{bundle,files}>` in `/workspace/bioprinting-workbench/src/research-selection.js`.
- `createResearchDraftUI({elements,workspace,onChange}) -> {setDraft,getDraft,dispose}` in `/workspace/bioprinting-workbench/src/research-draft-ui.js`: explicit save, 2–8 alternatives, no automatic owner-reviewed status.
- `createBrowserVerificationSuite({baseURL,part,viewport}) -> async(page)=>report` in `/workspace/bioprinting-workbench/scripts/browser-verification-suite.js`: browser supplied externally, no mandatory package.
- `validateMatrixReport(report)`, `mergeBrowserEvidence(reports,{expectedRevision,requiredParts})` in `/workspace/bioprinting-workbench/scripts/merge-browser-evidence.mjs`: reject missing/duplicate rows, mixed revisions/state and omitted failures.
- `validate_selection(selection,state)`, `preflight_export(bundle,files)`, `build_result_bundle(selection,context)` in `/workspace/regen-workbench/tools/bioprint_exchange.py`: pure validation before filesystem writes.
- `Desk.preview_bioprint_submission(data)`, `Desk.submit_bioprint_query(data)` in `/workspace/regen-workbench/tools/regen_desk.py`: explicit reviewed query -> existing queue once, with an existing selected blueprint, allowed provider IDs, visible limits and duplicate-click protection. Never dispatch from import.

## Modified functions

- `createMagnifiedViewport()/renderInset()` in `/workspace/bioprinting-workbench/src/magnified-viewport.js`: capture exact viewport/scissor/test and applicable autoClear state, restore in finally, contain errors, clamp width/height and identify unavailable target.
- `createLab()/draw()/setPresentationScale()/diagnostics()` in `/workspace/bioprinting-workbench/src/scene.js`: both-pass counts, explicit visibility/camera ownership, inset-compatible transitions, deduplicated disposal.
- `createScientificOverlays()/setOverlay()/clear()/dispose()` in `/workspace/bioprinting-workbench/src/scientific-overlays.js`: RGBA unsigned-byte textures with update flag; data-driven slab/network, atomic replacement and cleanup after exceptions.
- `createScientificViews()/dispose()` and `createScientificViewUI()` in their same-named `/workspace/bioprinting-workbench/src/` files: shared resources disposed once, wired representation/cut-plane/motion, synchronized quality/availability and removable listeners.
- `createAnalysisUI()/solve()/runFit()/getFieldSnapshot()/dispose()` in `/workspace/bioprinting-workbench/src/analysis-ui.js`: provenance, field-change notifications, stale invalidation, explicit run capture and listener cleanup.
- `createAnalysisClient()/request()` in `/workspace/bioprinting-workbench/src/analysis-client.js` and handler in `/workspace/bioprinting-workbench/src/analysis-worker.js`: strict `oxygen-convergence` messages and dedicated cancellable study lifecycle; preserve solve/fit contracts.
- `createModelExplorationUI()/dispose()` and `createExplorationClient()` in their existing `/workspace/bioprinting-workbench/src/` modules: registered-model controls, reject empty comma tokens, progress validation and owned-worker cleanup.
- `validateResearchBundle()` in `/workspace/bioprinting-workbench/src/research-exchange.js` and `validate_bundle()` in `/workspace/regen-workbench/tools/bioprint_exchange.py`: three-color/path-stack DFS, per-group unique IDs, explicit reference/filename checks and nested allowlists. Validate merged-state invariants too.
- `applyResearchImport()/apply_import()` in those modules: recompute trusted conflicts and check snapshot/token; reject forged or stale previews.
- `createResearchCockpitUI()` in `/workspace/bioprinting-workbench/src/research-cockpit-ui.js`: operation generations, file-size precheck, state-change invalidation, complete selected exports, real downloads/URL revocation, disposal guards.
- `renderCrossSections()` in `/workspace/bioprinting-workbench/src/vascular-cross-sections.js`: unique SVG title/description IDs, claim-specific anchors, duplicate section rejection, remove owned figures on cleanup.
- `Desk.apply_bioprint_import()/export_bioprint_results()` and HTTP handlers in `/workspace/regen-workbench/tools/regen_desk.py`: lock-scoped compare-and-swap, server-owned generated paths and allowlisted downloads without arbitrary path input/disclosure.
- `export_selected_results()` in `/workspace/regen-workbench/tools/bioprint_exchange.py`: validate all names/descriptors/files/hashes/aggregate sizes before staging; reject reserved manifest names, duplicates, symlinks and overwrites; atomically rename and clean only owned staging on failure.
- `verifyRelease()/collectReleaseInventory()` in `/workspace/bioprinting-workbench/scripts/verify-release.mjs`: observed revision/dirty state, complete planning-archive exclusion and accurate publication limitations.

Remove hypotheses-only cockpit export and counts-only Desk pseudo-export handlers only when complete replacements are tested/wired. No evaluator removals. Preserve public helper signatures through explicit compatibility wrappers where necessary.

[Classes]

No new production class/framework. Extend existing `Desk` methods and nested HTTP handler with narrow explicit routes, not a generic execution endpoint. Retain JavaScript factories. Extend test renderer fakes to model exact state and injected failures; worker fakes must model stale replies, errors and termination. No inheritance migration.

[Dependencies]

No new runtime npm/Python package. Continue vendored Three.js, Node built-ins/test runner and Python stdlib/unittest. Inspect exact vendored revision and texture/render-state APIs before implementation. Browser automation uses existing connected Playwright or an explicitly configured external runner, not an undeclared import. Do not install packages into mounted repos or start nested Docker. Honor available project reservations. No paid generation or live provider is required for planned engineering work.

[Testing]

## Baseline

Before coding confirm sole-editor status: a Claude process was observed with cwd `/workspace` during planning; establish it is not editing these trees. Recheck HEAD/status, runtime versions and environment. Hash seven evaluators, numerics and scenario implementation before/after. Equation changes need a documented justification, new regression evidence and plan update, not a concealed refactor.

Run Workbench `npm test`, `npm run check`, `npm run provenance:check`, `npm run verify:release`, `git diff --check`. Report actual counts. Run exchange/HTTP tests using `/home/vscode/.local/bin/python3.12 -B -m unittest discover -s tests -p 'test_bioprint_exchange*.py' -v` if available, plus the existing Desk suite separately. Reproduce alleged pre-existing failures from committed code in an isolated temporary copy; do not hide them in aggregate reporting.

## Required regressions

- Graph/parity: diamonds allowed; cycles/missing parents/duplicates rejected; nested keys/ISO syntax/Unicode/bool-vs-integer/number boundaries match documented policy in both languages; deterministic selection closure.
- Import: forged and stale previews rejected; async A/B reads cannot replace newer state; disposal prevents writes; double clicks do not duplicate apply; disk/memory rollback; import makes zero submit/provider/subprocess calls.
- Export: every selected record survives round trip; dependency additions visible; missing bytes fail explicitly; descriptors and exact-byte hashes agree; single 10 MiB/aggregate 25 MiB bounds; duplicate/reserved names/traversal/symlinks/existing targets/injected failures leave no partial final export. No notes/caches/secrets.
- Rendering: exact state restoration on success/throw; DPR 1/2, narrow/short canvas, hidden target, zero-size/disposed/no-WebGL cases; actual RGBA pixel fixtures and browser WebGL errors; refresh/remove stale overlays; one context; shared resources disposed once.
- Numerical: native direct-call identity; slab-x analytic refinement; all-faces differences not labelled exact error; nonconvergence/null order/cancel/stale handling; same inputs+implementation reproduce numeric content excluding IDs/timestamps.
- Fitting: raw/normalized digests distinct; dataset changes invalidate fits; synthetic/measured declarations retained; boundary-only data unidentifiable; no auto-apply; incompatible estimate shown unapplied; no invented uncertainty.
- UI: keyboard-only path, named SVGs/tables, focus on validation errors, readable statuses/contrast, reduced motion and responsive 390/768/1280/1440 widths with 720/1000 heights; no horizontal overflow. Scenario /13 unchanged by presentation, sweeps or research actions.

## Browser and integration evidence

Run bounded root and Pages-style subpath suites covering registered sweeps, study run/cancel, dataset fit/apply, inset/overlays, drafts, bundle preview/apply/download, blocked worker/GLB, no WebGL and malformed input. Verify downloaded bytes, not just textarea text. Every report identifies actual revision/configuration.

Run ten consecutive matrix cycles in a persistent page, chunking calls without reloading when required. Cover lab/Treedome × low/balanced/high, then documented overlay/inset variants. Record warm-up and settle failures; compare identical app states; count main/inset/total passes separately. Fresh-page repetitions form a separate series, not uninterrupted lifecycle evidence. Counts do not prove leak freedom or FPS.

Run a temporary mocked-provider Desk HTTP workflow: Workbench export -> preview -> token-bound apply -> explicit query review/submit -> receipt -> selected artifact export -> Workbench reimport -> verified bytes and status preservation. Include partial/interrupted/submission-unknown without live calls or auto-retry. Live demo is optional/separately authorized. Check chosen existing provider requirements rather than assume every public literature API needs a private key.

Agent source-support review is actionable work: open primary sources, record locators, disagreements and unavailable sources; distinguish agent review from independent domain review. No need to demand the owner's scientific signature before performing that audit. Do not add/revise numerical scientific claims without opening their source.

[Implementation Order]

1. Confirm plan, sole-editor state and environment; preserve history; re-baseline both repos and critical hashes. Record actual Pages publication side effect. Use milestones/checkpoints rather than one giant diff.
2. Add failing exchange correctness tests first: DAG/cycle/duplicate/nested/timestamp parity, forged/stale previews, path confinement. Fix both validators and trusted apply; run shared parity before UI expansion.
3. Implement whole-selection artifact preflight, generated safe export directories, atomic staging/finalization and export/download routes with existing origin/body protections.
4. Add rendering failure regressions, then exact state restoration, bounded inset, RGBA fields, transactional overlays, deduplicated ownership and frame counters. Inspect real pixels before aesthetic expansion.
5. Wire refreshed snapshots, quality synchronization, representation/cut-plane/motion and missing-data states. Resolve inset targets across scales; improve SVG/accessibility/focus/responsive design without touching scenario bytes.
6. Add immutable dataset/fit provenance, explicit fit/apply lifecycle and native model-run capture. Expose registered-model/axis sweeps and bounded side-by-side comparison without invented physical mappings.
7. Add pure bounded convergence study, dedicated worker/cancel, results tables and artifact export. Test analytic slab and grid-only box cases separately; no stale results or main-thread blocking.
8. Add hypothesis/query editing, dependency-aware record selection, artifact verification and real downloads; wire Desk reviewed-query submission to existing queue and complete selected result export. Import remains inert.
9. Execute mocked end-to-end round trip including failure/partial/ambiguous cases; repair observed integration defects and explicitly document any status vocabulary translation.
10. Commit reproducible browser adapters, merger/parity scripts and evidence; execute continuous-page ten-cycle matrix plus separate fresh-page series, failure paths and viewport captures.
11. Audit primary-source support and docs; reconcile historical versions, synchronize 0.25.0-dev metadata, actual revision/publication state and archive exclusions. Write walkthrough and measured evidence with AI/hobby attribution.
12. Rebuild provenance only for real closure changes; run full batteries/browser checks, compare evaluator/scenario hashes, audit both worktrees and report actual results/unresolved issues. Present commit/file proposal. Do not push again automatically because main publishes. Show the app during a subsequent requested walkthrough, not as a substitute for owner's visual preferences.

## Completion criteria

Selected export produces a reimportable bundle; mocked research return works through the actual queue; field overlays encode current values; inset failures cannot corrupt main rendering; dataset/fit/study provenance is inspectable; committed verification commands reproduce measured outcomes. A notice or test around a nonfunctional button is not feature completion.

Report specific blockers for concurrent edits, environment limits, unexplained numerical regressions, unresolved parity or unsafe filesystem confinement; continue independent unblocked work where possible. Owner visual preference, independent scientific review, live/paid calls and future publication are separate decisions—not excuses to defer engineering or source-review work the agent can do. No silent feature removal or reduction of speculative scope is authorized.