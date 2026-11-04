# Implementation Plan

[Overview]

Complete and demonstrate the remaining Workbench exploration, provenance, presentation and ResearchDesk exchange workflows, then prepare an evidence-backed unpublished release candidate without committing or publishing.

Planning date: November 4, 2026. The previous active plan is preserved byte-for-byte at `/workspace/bioprinting-workbench/docs/IMPLEMENTATION_PLAN_CONTINUATION_ARCHIVE_2026-11-04.md`, SHA-256 `82ce536b08c4d99582a0c97767911b90b3739c14297b5ecef28045042fd40c3c`. That plan and earlier archived phases remain scope requirements: no roadmap feature is silently dropped. This turn authorizes planning documents only; implementation requires explicit confirmation. The earlier ambiguous “sure” is not commit authorization.

Both repositories have substantial uncommitted changes based on Workbench `689200d` and Desk `2b95b71`. Preserve them; do not pull, reset, stash, stage or commit. Previously reported 314 Workbench tests, 177 modules, 16 parity cases and 25 Desk exchange tests are historical checkpoints, not newly measured results. Previous completion claims were premature: the adapter has incorrect ZIP extraction, no established mocked provider, empty return selection and unreliable status assertions; browser feature parts and source audit remain missing.

Architecture: dependency-free native JavaScript ES modules, vendored Three.js, factory-function DOM controllers and Node built-in tests; Python Desk owns an RLock, persistent store and single-worker ThreadPoolExecutor. Preserve scenario `/13` byte stability, `/14` rejection, the existing nine evaluator/numerics/scenario hashes and Desk `data/iris-*`. No evaluator/numerics/scenario changes to make integration pass. Preserve hobby/learning and AI-assistance disclosures, synthetic labels, research credits, uncertainties and exploratory scope. No biological validation claim, treatment guidance, credentials, live-provider calls, new dependencies, commits, tags, pushes, deployment or Pages changes.

The user confirmed no other agent is editing these repositories. Managed reservations still require verification before implementation: `workspace-control` was not found here. Follow `/workspace/.agent-containers/README.md`; do not bypass unavailable infrastructure or start unrestricted agents. Finish/save/inspect each repository before switching its reservation. Test Desk only with temporary stores. Unavailable execution must be recorded as blocked, never passed.

[Types]

Keep plain-object/JSDoc JavaScript contracts, existing Python records, exchange schema and status vocabulary; no TypeScript migration.

- `RoundtripCheckpoint`: `{schema:'bioprinting-workbench/roundtrip-checkpoint/1',sessionId:string,workbenchOrigin:string,deskOrigin:string,phase:string,bundleText:string,hypothesisIds:string[],queryIds:string[],modelRunIds:string[],evidenceIds:string[],deskRunIds:string[],expectedScenarioSha256:string,expectedRunStatuses:{id:string,status:string}[],artifactExpectations:{filename:string,bytes:number,sha256:string}[]}`. Validate session/origin/IDs/hashes; explicit shared browser context; test-owned storage only, cleared on teardown. No private research in application localStorage.
- `ArchiveEntry`: `{filename:string,bytes:Uint8Array,compressionMethod:0|8,expectedBytes:number}`. Bounded archive/entry/count/expanded sizes using existing exchange/export caps; reject duplicate/traversal names, encryption, unsupported methods/ZIP64, truncation and invalid offsets. Manifest byte counts and SHA-256 must match extracted artifacts.
- `BrowserCheckEvidence`: retain current schema/part/URL/viewport/timestamps/checks/errors; add `status:'pass'|'fail'|'blocked'|'not-run'`, expected/observed values, fixture identity and timeout diagnostics. A blocked/failing check cannot yield overall pass. Distinguish expected injected failures from unexpected page/network errors.
- `StudyHistoryEntry` remains `{id:string,artifact:StudyArtifact}` with maximum 20 entries. Selected history controls rows/notices/download, never scenario/model settings. Cancelled or stale results never enter history.
- Cockpit `refreshRuns()` updates native run choices without discarding imported state, checkbox selection, file attachments, pending previews or valid downloads. Prefer narrow controller API, not a new event bus.
- Draft `loadCard(id:string)` populates complete existing record/alternatives without mutating workspace. Save uses existing immutable revision/validation semantics; retains unrelated fields and lineage; never upgrades authorship/review status. Changed reviewed content must not misleadingly retain prior review.
- `SourceAuditRow`: `{claimId:string,file:string,locator:string,displayedClaim:string,sourceId:string,sourceURL:string,accessedAt:string|null,primarySourceLocator:string|null,status:'supported'|'qualified'|'contradicted'|'unavailable'|'not-reviewed',notes:string}`.
- Resource evidence records viewport/view/overlay, distinct main/inset passes, cycle, settled counters, fresh-page baseline, timing distribution and disposal. Ten settled repetitions per existing planned matrix case; no single-frame memory conclusions.

[Files]

All paths below are absolute. New files:
- `/workspace/bioprinting-workbench/scripts/browser-roundtrip-archive.js`: bounded extraction and artifact verification helper, no runtime dependency.
- `/workspace/bioprinting-workbench/tests/browser-roundtrip.test.js`: phase/checkpoint/selection/status/timeout regressions.
- `/workspace/bioprinting-workbench/tests/browser-roundtrip-archive.test.js`: stored/deflated and malformed archive fixtures.
- `/workspace/regen-workbench/tests/browser_exchange_server.py`: temporary loopback Desk fixture, deterministic mocked provider boundary, actual queue/executor and outbound guard.
- `/workspace/bioprinting-workbench/docs/RESEARCH_SOURCES_AUDIT_2026-11-04.md`: opened primary sources, exact locators and unresolved claims.
- `/workspace/bioprinting-workbench/docs/browser-roundtrip-2026-11-04.json`, `/workspace/bioprinting-workbench/docs/browser-controls-2026-11-04.json`, `/workspace/bioprinting-workbench/docs/resource-matrix-2026-11-04.json`: actual measured evidence, including blockers. Add bounded desktop/mobile screenshots only from actual runs without private data.

Existing Workbench changes:
- `/workspace/bioprinting-workbench/scripts/browser-roundtrip.js`: correct selectors/response assertions, shared context, bounded phases/checkpoints, exact job polling, explicit export IDs, archive helper, returned artifact selection, status/idempotence/scenario checks.
- `/workspace/bioprinting-workbench/scripts/browser-verification-suite.js`: implement currently absent `exploration`, `drafts`, `presentation` parts while preserving existing three parts.
- `/workspace/bioprinting-workbench/scripts/browser-smoke.js` and `/workspace/bioprinting-workbench/scripts/browser-smoke-phases-cde.js`: reconcile selectors and collect existing diagnostics/resource matrix without weakening assertions.
- `/workspace/bioprinting-workbench/src/convergence-study-ui.js`: history-selected rendering and bounded Blob URL lifecycle.
- `/workspace/bioprinting-workbench/src/research-cockpit-ui.js`: non-destructive native-run refresh and explicit imported-card edit handoff.
- `/workspace/bioprinting-workbench/src/research-draft-ui.js`: visible existing-card load/edit, full field/alternative roundtrip, safe revision/review handling and listener cleanup.
- `/workspace/bioprinting-workbench/src/app.js`: refresh cockpit after capture; synchronize import/workspace/draft views without loops or scenario writes; guard initialization order and dispose controllers/listeners.
- `/workspace/bioprinting-workbench/index.html` and `/workspace/bioprinting-workbench/src/instrument.css`: accessible edit labels and mobile layout only as needed.
- `/workspace/bioprinting-workbench/tests/convergence-study-ui.test.js`, `/workspace/bioprinting-workbench/tests/research-cockpit-ui.test.js`, `/workspace/bioprinting-workbench/tests/research-draft-ui.test.js`, `/workspace/bioprinting-workbench/tests/research-selection.test.js`: failing-first UI/selection regressions.
- `/workspace/bioprinting-workbench/scripts/verify-release.mjs` and `/workspace/bioprinting-workbench/tests/release.test.js`: all planning archive exclusions, including this new archive; package/footer/current RELEASE coherence; retain runtime provenance/licenses and explicit external gates.
- `/workspace/bioprinting-workbench/package.json`, `/workspace/bioprinting-workbench/docs/RELEASE.md`, `/workspace/bioprinting-workbench/docs/ROADMAP.md`: retain already synchronized `0.25.0-dev`; correct premature readiness language. Historical version sections are not coherence errors.
- `/workspace/bioprinting-workbench/docs/RESEARCH_EXCHANGE.md` and `/workspace/bioprinting-workbench/docs/RESEARCH_COCKPIT.md`: tested review/submit/import behavior and native `unidentifiable` to envelope `unsupported-foreign` mapping with preserved native artifact status.
- `/workspace/bioprinting-workbench/docs/VERIFICATION.md` and `/workspace/bioprinting-workbench/docs/IMPLEMENTATION_PROGRESS_2026-11-04.md`: fresh measurements, commands, counts and truthful outstanding gates.
- `/workspace/bioprinting-workbench/assets/model-provenance.json`: regenerate only if hashed computation closure genuinely changes; protected computation/scenario hashes remain unchanged.

Existing Desk changes, only under its reservation:
- `/workspace/regen-workbench/tests/test_bioprint_exchange_http.py`: real queue mocked-provider, stale/duplicate review, selected archive and HTTP failure regressions.
- `/workspace/regen-workbench/tests/test_bioprint_exchange.py`: archive/status/dependency regressions found during execution.
- `/workspace/regen-workbench/tools/desk/app.js`, `/workspace/regen-workbench/tools/desk/index.html`: browser-observed response/selection/review/download defects only; no production fake-success path.
- `/workspace/regen-workbench/tools/regen_desk.py`: narrow regression-backed fixes, preserving RLock, persisted ambiguity receipt, queue, authorization and bounds.
- `/workspace/regen-workbench/BIOPRINT_EXCHANGE.md`: tested exchange/status mapping and imported-artifact-byte limitation.

No source deletion/movement, deployment/configuration changes or dependency updates. Prior plan archive is documentation preservation only. Do not edit credentials, Desk real data, vendored libraries or protected evaluator/scenario modules. Source audit corrections elsewhere require a specific opened-source locator and minimal documented change, not broad scientific rewriting.

[Functions]

New functions:
- `extractRoundtripArchive(buffer:ArrayBuffer, limits:{maxEntries:number,maxArchiveBytes:number,maxEntryBytes:number,maxTotalBytes:number}):Promise<Map<string,Uint8Array>>`, `/workspace/bioprinting-workbench/scripts/browser-roundtrip-archive.js`: validate EOCD/central directory, follow local-header offsets and calculate payload starts from local name/extra lengths. Advance central entries by 46 + name + extra + comment lengths, not compressed payload size. Support methods 0 and 8 explicitly, reject unsupported/encrypted/ZIP64 entries and out-of-bounds/oversized expansion. Derive defaults from existing exchange/export validators, not arbitrary enlarged limits.
- `verifyRoundtripArtifacts(bundle:Object, entries:Map<string,Uint8Array>):Promise<Array<{filename:string,bytes:number,sha256:string}>>`, same file: require exact manifest artifact counts/hashes using existing browser crypto; never execute bytes.
- `renderStudy(artifact:StudyArtifact):void`, local to `/workspace/bioprinting-workbench/src/convergence-study-ui.js`: single renderer for live completion and selected history.
- `refreshRuns():void`, returned controller method from `createResearchCockpitUI`, `/workspace/bioprinting-workbench/src/research-cockpit-ui.js`: non-destructive choice refresh including eviction handling.
- `loadCard(id:string):void`, returned controller method from `createResearchDraftUI`, `/workspace/bioprinting-workbench/src/research-draft-ui.js`: populate fields/rows with validated existing card and retain safe edit baseline.
- `mock_search_provider(provider, query, limit)` and `main()`, `/workspace/regen-workbench/tests/browser_exchange_server.py`: deterministic labeled synthetic response for allowlisted fixture requests; temporary store/cache/provenance, loopback ephemeral port, hard outbound guard, readiness output, complete executor/server cleanup. Patch only external boundary; do not stub queue, submit, execute or stored job results.

Modified functions:
- `createBrowserRoundtripSuite`, `runDeskPart`, `runReturnPart`, `runDeskControlsPart`, `/workspace/bioprinting-workbench/scripts/browser-roundtrip.js`: preserve original part compatibility while splitting import, review-submit, interval-poll, explicit export and return into bounded calls. Use supplied shared context rather than isolated `browser.newPage()` contexts when checkpoint storage is required. Assert apply response `applied:true`, not assumed prose. Submission may return queued; poll `/api/runs` for exact receipt `deskRunId`. Failed/partial/ambiguous outcomes are not a successful mocked run. Export selected dependencies and exact completed run IDs, never `{}`.
- `createBrowserVerificationSuite`, `/workspace/bioprinting-workbench/scripts/browser-verification-suite.js`: allow/implement three missing parts, verify actual UI/state/download transitions, retain existing parts.
- `createConvergenceStudyUI`: attach/remove history change listener, reuse selected-artifact renderer, preserve stale/cancelled generation guards, revoke superseded URLs safely.
- `createResearchDraftUI` and its `renderCards`, `collectCard`, `save`: visible existing-card editing, safe revision handling, full field retention and no automatic review/authorship upgrade; dynamic row/listener disposal.
- `captureRun(partial)`, `/workspace/bioprinting-workbench/src/app.js`: refresh initialized cockpit after successful capture without temporal-dead-zone failures or swallowed exceptions.
- `collectReleaseInventory(directory)` and `verifyRelease(directory,options)`, `/workspace/bioprinting-workbench/scripts/verify-release.mjs`: complete archive exclusions and current-version checks; external approval remains separate. Avoid recursive `npm test` through release unit tests.
- Conditional regression-backed fixes only: `Desk.preview_bioprint_submission`, `Desk.submit_bioprint_query`, `Desk.export_bioprint_archive`, `make_handler`, `/workspace/regen-workbench/tools/regen_desk.py`. Preserve review-token deduplication, submission-unknown persistence, locks, size/hash checks and fsync/rename hygiene.

No removed functions. Maintain adapter compatibility while migrating callers.

[Classes]

No new production classes or inheritance. Continue JavaScript factory controllers with explicit disposers. Existing Python `Desk` keeps ownership of store/RLock/executor; compose fixture server around it rather than substituting a fake class. Extend `ExchangeHttpTests` in `/workspace/regen-workbench/tests/test_bioprint_exchange_http.py` and existing unittest classes in `/workspace/regen-workbench/tests/test_bioprint_exchange.py`. No generic command runner/service class or execution endpoint.

[Dependencies]

No new npm/Python packages or vendored upgrades. Use Node built-ins, browser File/Blob/WebCrypto/DecompressionStream, vendored Three.js, Python stdlib/unittest/zipfile and available external Playwright tools. Verify deflate-raw support in actual browser; unavailable support is a blocker or use fixture-side Python stdlib extraction for transport with browser-side byte verification, not a new package. No installation into mounted repositories. Use `/home/vscode/.local/bin/python3.12` when available and record versions. Follow managed project environments; no nested Docker/socket mounts or assumed host capability.

[Testing]

1. Record both worktrees/diffs, original nine protected hashes, `/13` fixture hash, versions and mirrored parity equality. Historical logs do not establish a fresh pass. Workbench: `npm test`, `npm run check`, `npm run provenance:check`, `PYTHON=/home/vscode/.local/bin/python3.12 npm run verify:exchange-parity`. Desk: `/home/vscode/.local/bin/python3.12 -B -m unittest discover -s tests -p 'test_bioprint_exchange*.py' -v`; run `test_regen_desk.py` separately and compare exact names/tracebacks of the three previously reported failures, without assuming their cause.
2. Failing-first unit cases: stored/deflated ZIP, local offsets, central comments/extras, malformed/truncated/bomb/path/duplicate/encrypted/unsupported archives, exact bytes/hashes; nonempty selected job payload; wrong checkpoint session; queued receipt polling; history rendering/download identity; immediate native registry refresh without lost selections; existing-card load/edit fidelity and review safety; cancellation, URL/listener cleanup.
3. HTTP integration: import never calls submit; review-confirm-submit uses real executor with only provider boundary mocked; duplicate/stale review cannot duplicate work; selected run/archive snapshots/status/hashes agree; same-origin/request-size protections intact. Outbound guard must fail unexpected real requests.
4. Browser roundtrip at 1280x720 and width 390: visible export/import/review/submit, exact-job interval polling, explicit selected native/mock run export, ZIP artifact verification, Workbench manifest plus artifact-file selection, status/native payload preservation, scenario invariance and repeat import idempotence. Missing dependencies or failed jobs fail the check. Each runner call remains below 60 seconds with validated checkpoints and complete teardown.
5. Feature browser checks: seven registered model options, two-axis bounds, retained comparisons including failed points/unit disagreement; convergence history/download; visible draft create/load/edit/query/export; representation/cut rollback/reduced-motion, keyboard navigation, mobile overflow and WebGL fallback. Assert actual displayed state, not existence or status text alone.
6. Download matrix: unknown job, missing bytes, oversized file, hash mismatch, HTTP/network failure and successful exact-byte download. Corrupt only isolated fixture stores. Failed cases require bounded error, no successful download/partial publication, truthful status and cleanup.
7. Resource evidence: reuse original matrix/diagnostics; ten settled repetitions plus fresh-page series for views/overlays/inset, cancellation/disposal and restoration at both viewports. Keep main/inset counters separate; record timings without invented universal thresholds. Investigate resource slope/restoration regressions.
8. Source audit: enumerate displayed numeric/method claims; actually open each referenced primary source using research/browser tools and record access date, table/figure/section, units and context. Separate published evidence, synthetic constants and conceptual geometry. Unavailable source is not support; abstracts/secondary summaries do not prove detailed parameters. Make minimal supported corrections. Agent review is not owner or independent scientific approval.
9. Extend release tests for every archive exclusion, retained licenses/provenance, coherent `0.25.0-dev` and external not-run gates. Run `npm run verify:release`, complete Workbench battery/parity, broad Desk battery, both `git diff --check` and protected hashes again. Capture command exit codes separately; trailing shell commands must not mask failure; independent jobs must not write the same log. Read final files/logs and inspect all changed/untracked files before proposing commits.

[Implementation Order]

1. Obtain explicit implementation confirmation; verify managed reservation/environment and preserve current diffs/hashes. Resolve unavailable controller access before affected edits. No commit authorization is inferred.
2. Establish fresh tests/hashes, exact Desk failures and current hypothesis revision/validation semantics and archive bounds. Protect the original nine-file baseline rather than choosing a weaker subset.
3. Implement failing-first Workbench history selection, non-destructive cockpit run refresh and visible full-fidelity existing-card editing. Run focused tests and full local battery.
4. Implement/test bounded archive helper and checkpoint/selection contracts. Repair response assertions, shared-context handling, bounded adapter phases and interval job polling.
5. Save/inspect Workbench; switch managed reservation to Desk. Add isolated loopback mocked-provider fixture and actual queue HTTP tests; repair demonstrated Desk bugs only. No real data/provider activity; verify cleanup.
6. Switch back after Desk worktree inspection. Execute two-app roundtrip desktop/mobile from clean test-owned state; verify explicit run selection, bytes/statuses, duplicate import and scenario invariance. Fix observed issues with regressions.
7. Implement/run missing feature browser parts, full download matrix, keyboard/mobile/WebGL fallback, and ten-cycle/fresh-page resources. Record blockers and continue independent checks; unavailable execution never passes.
8. Finish release coherence/exclusions regressions. Correct premature readiness claims in progress/roadmap, retaining dated historical evidence.
9. Complete opened-primary-source audit and minimal justified corrections; document status mapping/workflow and actual verification observations.
10. Run full phase-close battery in both managed environments; compare protected hashes/corpus; verify final edited/new files/evidence and exact pass/fail/skip/not-run counts. Rebuild provenance only for legitimate closure changes.
11. Present repository-separated final file/diff and prospective commit grouping, baselines, limitations and owner-review gates; stop without staging, committing, tagging, pushing, deploying, Pages changes or live-provider calls. Any commit needs a separate explicit authorization after evidence/file review.

Acceptance requires functioning selected export/reimport with verified bytes, actual queued mocked execution and browser return with truthful statuses, working history/run-refresh/card-edit paths, real browser/resource evidence or explicit blockers, traceable source support, unchanged protected computations/scenario and coherent metadata. Owner visual review, independent scientific/citation review, live Blender checks and publication remain separate gates.
