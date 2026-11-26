# Implementation continuation checkpoint — November 4, 2026

Personal hobby/learning project; changes and verification performed by the coding agent.
This is a measured checkpoint of the continuation plan at `implementation_plan.md`, not a
release, not scientific validation and not owner approval. At the November 4 checkpoint, nothing
here was committed, pushed, tagged or deployed; later sections record their own subsequent state.

## Implemented (milestones 1-4 of the continuation plan)

- **Registered-model sweeps** (`src/sweep-presets.js`, `src/model-exploration.js`,
  `src/model-exploration-ui.js`): model selector over all seven registered models with their own
  registered numeric axes (1-2 axes, existing caps), synthetic presets that reuse audited default
  constants, and bounded same-unit-only `compareSweepRuns` side-by-side comparison. Non-succeeded
  points and disagreeing units yield null deltas, never dropped rows; nothing is applied to the
  scenario.
- **Native run capture** (`src/run-records.js`): bounded registry of fit/model/sweep/study records
  with `toForeignRun` (statuses verbatim except the documented fit-status `unidentifiable` ->
  exchange-envelope `unsupported-foreign` translation, with the native status named in the note)
  and `toArtifactDescriptor` exact-byte SHA-256 digests. Selected registry runs export with their
  payload artifacts as verified dependencies (`src/research-selection.js`).
- **Convergence artifacts** (`src/convergence-study.js`, `src/convergence-study-ui.js`):
  `serializeStudyArtifact` keeps analytic fields null where no analytic reference exists; the UI
  retains bounded history (20) with explicit JSON downloads and revoke-on-dispose.
- **Hypothesis/query draft editors** (`src/research-draft-ui.js`): form editing validated by the
  same `validateHypothesisCard({allowDraft:true})` contract; 2-8 alternatives enforced; missing
  predictions/falsifiers keep records in draft status; reviewStatus is never upgraded; text-only
  rendering (XSS payloads stay inert data); query plans generated explicitly and never executed.
- **Presentation wiring** (`src/scientific-views.js`, `src/scene.js`, `src/scientific-view-ui.js`):
  representation (illustration <-> bounds frame), transactional cut planes (rollback on injected
  failure, last good state kept) and reduced motion (animated clock freeze; scenario time
  untouched); scene diagnostics expose the presentation state.

- **Exchange parity + hardening**: strict shared UTC-instant validation on both sides (real
  calendar dates; offset/loose forms rejected identically - the prior JS/Python divergence is
  fixed); shared corpus extended to 16 cases (byte-identical fixture files); Desk export
  publication is now fsync-then-atomic-rename with an injected fsync-failure regression and a
  hostile-writer regression proving foreign directories are never overwritten (documented as
  filesystem hygiene, not an adversarial sandbox).
- **Bounded download failures** (`tools/regen_desk.py::_download_failure`): named
  missing-artifact / oversize-artifact / hash-mismatch messages ("Nothing was downloaded");
  ZIP assembly verifies each artifact's bytes against its recorded SHA-256 before archiving.
- **Roundtrip adapter** (`scripts/browser-roundtrip.js`): `createBrowserRoundtripSuite` with
  bounded parts `export` / `desk` / `return` / `desk-controls`, cross-call state via page
  localStorage, in-page ZIP extraction via DecompressionStream. Adapter is committed-ready;
  full two-application browser EXECUTION remains outstanding (see below).

## Measured verification (this continuation)

- Workbench full suite: **314 passed / 0 failed / 0 skipped** (session baseline was 294; net +20
  new tests incl. sweep presets, comparison, run records, study artifacts, draft editor,
  presentation effects, registry export).
- Syntax checked **177** project modules. `provenance:check` matches the implementation closure.
- Exchange parity corpus: **16/16 PASS** (JS + Python, byte-identical fixtures).
- ResearchDesk `test_bioprint_exchange*.py`: **25 passed** (incl. new finalization and
  download-failure-matrix tests). `test_regen_desk.py` not rerun this continuation.
- `npm run verify:release`: automated checks PASS (unit tests, syntax, claims-language scan,
  authoring-isolation static checks, allowlisted inventory with planning archives excluded);
  browser checks, citation/claims review, live Blender isolation, owner approval and deployment
  explicitly NOT-RUN as designed.
- All nine evaluator/numerics/scenario SHA-256 baseline files re-verified unchanged; scenario /13
  untouched, /14 still rejected. No evaluator, numerics or scenario code was modified.

## Honest outstanding work

- Full two-application browser roundtrip EXECUTION (adapter exists; needs both local servers plus
  a mocked-provider Desk process) and the Desk browser control/failure matrix run.
- Ten-cycle settled resource matrix + fresh-page series and full viewport captures for the new
  controls; browser parts `exploration` / `drafts` / `presentation` runs against the live app.
- Primary-source audit of pre-existing displayed numeric claims (no new scientific claims were
  added in this continuation; all new copy is process/limitation text).
- Broad Desk suite (`test_regen_desk.py`) baseline comparison; its previously reported
  environment-limited failures were not re-evaluated here.
- Owner visual review, independent citation/scientific review, live-provider demonstration and
  any publication remain separate not-run gates.

## Repeatable commands

From `/workspace/bioprinting-workbench`:

```sh
npm test
npm run check
npm run provenance:check
PYTHON=/home/vscode/.local/bin/python3.12 npm run verify:exchange-parity
npm run verify:release
```

From `/workspace/regen-workbench`:

```sh
/home/vscode/.local/bin/python3.12 -B -m unittest discover -s tests -p 'test_bioprint_exchange*.py' -v
```

Browser adapters: `scripts/browser-verification-suite.js` (parts `convergence`, `exchange`,
`provenance`) and `scripts/browser-roundtrip.js` (parts `export`, `desk`, `return`,
`desk-controls`); both take an injected Playwright page/browser and add no application dependency.

No runtime packages, commits, pushes, deployments or live/paid provider calls were made.

## Continuation round · deep gaps and live two-application roundtrip (2026-11-04, later)

Scope executed from the continuation `implementation_plan.md` under owner instruction to also
update GitHub for versioning history. This was AI-assisted development on the personal
hobby/learning project; all live runs used the local mocked-provider fixture only.

**Versioning:** pre-implementation snapshots of both working trees were committed and pushed to
the `continuation/2026-11-04-versioning` branch of each repository (Workbench `aaa46c0`, regen
`f399620`) before any code changed. `main` was not touched, so Pages did not publish.

**Defects found and fixed (each with regressions):**
- `scripts/browser-roundtrip-archive.js` (new): bounded ZIP extraction via EOCD + central
  directory walked by structural lengths, local-header payload offsets, stored/deflate,
  7 fixture tests covering traversal/duplicates/encryption/ZIP64/corruption/limits.
- Empty `{}` Desk/return exports replaced by explicit checkpoint selections;
  `deskExportBody` refuses empty selections (5 adapter contract tests).
- Adapter Desk selectors were wrong end to end (nonexistent ids, statuses and download link);
  rebuilt against the real `desk/app.js` contract (`bioprint-file`/preview/apply,
  `bioprint-query` + `bioprint-blueprint` selects, `bioprint-review-query`/`bioprint-submit-query`,
  comma-separated `bioprint-run-ids`, `bioprint-results.zip` download event, Desk served at `/`).
- `regen-workbench/tools/desk/app.js`: reviewed submission referenced an undefined `selected`
  blueprint binding (could never submit); replaced with an explicit blueprint select populated
  from `/api/state`.
- `roundtrip.json` fixture query named provider `local-desk`, which Desk rejects; changed to
  `pubmed` on both sides with golden canonical digests updated to
  `2d5f1307a3ed90a2df033608628fa7493fd89155ae1571c411acd6628bf4bc19`.
- UI continuation fixes: convergence history selection renders the retained study
  (`renderStudy`), cockpit exposes non-destructive `refreshRuns()` (wired to `captureRun` without
  a TDZ hazard), draft editor exposes `loadCard()` with truthful review handling (unchanged
  content preserves owner review; changed content clears it; creator preserved), stable
  `draft-*` field/alternative ids for accessibility.

**Measured results (fresh):** Workbench `npm test` 329/329 (incl. 15 new regression tests),
`npm run check` 180 modules. Desk `test_bioprint_exchange*.py` 28/28 (3 new queue/export tests
running the real executor with only `search_provider` mocked and an outbound guard).
`tests/browser_exchange_server.py` fixture smoke: import → review → real queue → mocked
`pubmed:ok` (3 synthetic hits) → explicit export ZIP, PASS.

**Live browser roundtrip (evidence: `docs/browser-roundtrip-2026-11-04.json`):** A Workbench
visible-control export (all groups nonempty, scenario fingerprint recorded) → B Desk visible
import/review/submit through the real queue with mocked provider (`deskRunId 6d9dee67…`,
duplicate-submit token dedupe proven, run complete `pubmed:ok`) and explicit-ID UI export
(`bioprint-results.zip`, 2078 bytes) → archive bytes verified with the unit-tested extractor
(manifest artifact sha match; `complete`→`succeeded`; `unsupported-foreign` preserved) →
C Workbench return import + artifact-file selection, scenario fingerprint unchanged, idempotent
re-import, run panel shows both runs with truthful statuses.

**Not run / remaining gates:** full `browser-verification-suite.js` UI execution of the new
`exploration`/`drafts`/`presentation` parts, the 390px viewport matrix, ten-cycle resource
evidence, WebGL-failure path, primary-source claim audit, `npm run verify:release` closeout,
owner visual acceptance, independent citation/scientific review, live-provider demo (owner
credentials) and any tag/merge/push to `main` (which would publish). Release docs
(`RESEARCH_EXCHANGE.md`, `RESEARCH_COCKPIT.md`, `VERIFICATION.md`) still need their documented
updates from the plan before an unpublished release candidate is proposed.

Pre-existing `data/iris-*` untracked Desk directories were left untouched.

## Draft editing and fail-closed drafts browser evidence — 2026-11-15

This narrow, uncommitted AI-assisted increment started at clean
`feda2e34023ac4783c937267c6164d333cfe0862` on `continuation/2026-11-04-versioning`.
It adds full visible local/imported card editing, defensive cockpit-to-draft handoff, explicit
Save/review/lineage semantics and fail-closed `pass|fail|blocked` browser aggregation. No schema,
scenario, evaluator, numerics, fixture, dependency or provider integration changed. Preview-only
imports remain unsynchronized until Apply, and external edit loading remains inert until Save.

**Fresh baseline:** the two existing focused UI files passed **8/8**; `npm test` passed **329/329**
with 0 failed/skipped; `npm run check` covered **180 modules**. No pre-existing test failure was
observed. The newly added focused regressions initially failed for the missing external-edit,
cockpit-handoff and browser-aggregation capabilities before implementation.

**Final focused/full gates:**
- `node --test tests/research-draft-ui.test.js tests/research-cockpit-ui.test.js tests/browser-verification-suite.test.js` — **15 passed, 0 failed, 0 skipped**.
- `npm test` — **336 passed, 0 failed, 0 skipped**.
- `npm run check` — **181 project modules** syntax checked.
- `npm run provenance:check` — existing manifest matches the implementation closure; no rebuild ran.
- `PYTHON=/home/vscode/.local/bin/python3.12 npm run verify:exchange-parity` — **16/16 PASS**.
- `npm run verify:release` — **24 PASS lines, 6 explicit NOT-RUN gates**, 161 inventoried candidate files. Its generic browser gate remains printed as NOT-RUN; the independent drafts-only browser matrix below is not silently folded into that script's result.
- `git diff --check` — **clean**.

**Actual browser runs:** the connected Kilo Playwright endpoint could not launch its configured,
absent Chrome binary; no browser was installed. The existing cached Playwright package and cached
headless Chromium 155.0.8059.12 ran the same suite directly against `npm start -- --host 127.0.0.1
--port 8096`. `docs/browser-controls-2026-11-15.json` was written only after three fresh passing
runs. Desktop 1280×720, mobile 390×844 and WebGL-disabled 1280×720 each report top-level **pass**,
**9/9 checks**, **0 page errors**, actual downloaded-byte equality (2,600 bytes), unchanged
canonical scenario bytes (2,955) and no horizontal overflow. WebGL was disabled by a pre-startup
canvas `getContext` override and diagnostics confirmed `webgl:false`; this does not claim a
presentation check.

**Remaining not-run gates:** non-drafts browser parts, Firefox/WebKit/physical devices,
assistive-technology and owner visual review, citation/scientific review, external claims-scanner
review, live Blender isolation, live providers, owner release approval and deployment. Query plans
were generated locally but never executed. No scientific, biological, clinical, safety or
publication-readiness conclusion follows from these software checks.


## Independent review corrections — 2026-11-16

Three scoped regressions first reproduced the review findings, then passed after correction:

- **HIGH / optimistic concurrency:** a same-ID current record that differs anywhere from the
  immutable loaded baseline now refuses Save with an explicit conflict/reload diagnostic. This
  covers conflicting external cards and intervening `workspace.update` calls; neither can overwrite
  newer content or inherit its owner review. Review retention is computed against the actual final
  target and only for an identical editable projection. Legitimate unchanged same-record Saves,
  including owner-reviewed records, remain covered and pass.
- **MEDIUM / lossless untouched lists:** each list control's exact populated serialization is
  tracked. An untouched control clones the baseline array verbatim, preserving padding, embedded
  newlines and comma-containing entries; only a genuinely changed control is parsed. The real-edit
  case still clears stale review metadata.
- **LOW / actual imported editing:** the browser path changes the imported title before Save and
  parses the real downloaded bytes to assert the edited title, original creator, lineage/reference
  arrays, unchanged revision and unreviewed/null-reviewer metadata.

Fresh results after these corrections: focused **18/18**, full **339/339**, 0 failed/skipped;
syntax **181 modules**; parity **16/16**; provenance fresh without rebuild; `git diff --check`
clean; release **24 PASS / 6 NOT-RUN**, 161 candidate files. The real drafts artifact was regenerated
on November 16 at desktop 1280×720, mobile 390×844 and WebGL-disabled 1280×720: all three **pass
9/9 with 0 page errors**, exact **2,626-byte** downloaded bundles containing the imported edit,
unchanged **2,955-byte** canonical scenario serialization and no horizontal overflow. All previous
not-run gates and scientific/safety limitations remain unchanged.


## Diagnostic-backed presentation browser evidence — 2026-11-16

Starting from the preserved uncommitted draft-editing state at the same branch/HEAD, the focused
browser-suite baseline passed **4/4**. Ten new presentation regressions failed before implementation;
after strengthening only `runPresentationPart`, the focused suite passed **14/14**. Passing now
requires actual graphics scale/state diagnostics after each transition, pointer and keyboard
activation, explicit cut-plane-off/motion-system states, canonical scenario-byte invariance and no
horizontal overflow. Absent, stale and contradictory diagnostics fail; WebGL-disabled is blocked from
actual diagnostics even if no fallback banner is present.

Fresh gates: full **349/349**, 0 failed/skipped; syntax **181 modules**; provenance fresh without
rebuild; exchange parity **16/16**; release **24 PASS / 6 NOT-RUN**, 162 candidate files; and
`git diff --check` clean. The real local Playwright/Chromium 155.0.8059.12 matrix generated
`docs/browser-presentation-2026-11-16.json`: desktop 1280×720 and mobile 390×844 each **passed 9/9**
with zero page errors, unchanged **2,955-byte** scenario serializations and no overflow;
WebGL-disabled 1280×720 recorded **blocked** with `webgl:false` and zero page errors, never a pass.
The prior `docs/browser-controls-2026-11-15.json` remained byte-identical.

This does not close the release script's generic NOT-RUN browser gate or the other browser parts,
non-Chromium/physical-device/accessibility/owner visual reviews, scientific/citation/external claims
reviews, live Blender/providers, owner approval or deployment. No production scientific code,
scenario/schema/evaluator/numerics, dependencies or provider integrations changed.
