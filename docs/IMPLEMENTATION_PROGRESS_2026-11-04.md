# Implementation continuation checkpoint — November 4, 2026

Personal hobby/learning project; changes and verification performed by the coding agent.
This is a measured checkpoint of the continuation plan at `implementation_plan.md`, not a
release, not scientific validation and not owner approval. Nothing here was committed,
pushed, tagged or deployed.

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
Pre-existing `data/iris-*` untracked Desk directories were left untouched.