# Implementation checkpoint — November 3–4, 2026

Personal hobby/learning project; changes and verification performed by the coding agent.
This is an implementation checkpoint, not completion of the twelve-stage plan or a release.
The session began November 3; browser tool UTC timestamps crossed into November 4.

## Implemented

- JavaScript/Python diamond-DAG validation, cycle detection and uniqueness in all record groups.
- JavaScript apply independently recomputes conflicts; Desk HTTP apply requires the reviewed
  bundle/store digest pair under the store lock. Imports never submit jobs.
- Whole-selection export preflight: exact descriptor/file hashes, aggregate/per-file bounds,
  duplicate/reserved names, missing files, symlink targets and existing destinations.
  Export writes a staging directory and publishes it after all writes succeed. Desk selects
  generated output directory names instead of using caller bundle IDs as filesystem paths.
- Actual Desk ZIP exports from stored selected IDs and bounded redacted run snapshots;
  explicit provider-query review and submission through the existing queue, with persisted
  submission-unknown before dispatch and idempotent repeated review tokens.
- Exact viewport/scissor restoration through render exceptions, short-canvas inset sizing,
  active-presentation inset target, and separate main/inset/total draw-call diagnostics.
- Finite scalar RGBA unsigned-byte textures for box and slab overlays; texture upload flag,
  failed-construction cleanup and live box-field invalidation/refresh.
- Immutable original-byte/normalized dataset digests and native fit records. Box measurement
  imports capture these records and expose them in an inspectable details panel. Restored
  scenario datasets explicitly do not claim original-byte provenance; implementation digest
  remains null rather than fabricated. Slab import UI integration remains outstanding.
- Native-solver convergence at bounded supported grids, analytic slab-X error/order versus
  all-faces grid-only comparisons, dedicated cancellable worker and numeric results table.
- Workbench dependency-aware selection of all five exchange groups, exact artifact verification,
  real download links and stale asynchronous import/export/disposal guards.
- Named/described cross-section SVGs and owned-figure removal; responsive exchange layout fix
  after real pointer interaction found the sticky navigation covering the controls.
- Shared eight-case JS/Python parity corpus and executable runner; injectable browser suite
  with explicit base URL, part and viewport. Historical browser script accepts an override URL.

## Measured verification

Node v24.18.1; Python 3.12.16 at `/home/vscode/.local/bin/python3.12`.

- Initial Workbench baseline: 273 tests passed, none failed/skipped.
- Current full Workbench suite: 291 tests passed, none failed/skipped (rerun at checkpoint).
- Syntax: 168 project modules checked before the final checkpoint rerun.
- Desk exchange plus loopback HTTP tests: 22 passed. Cases cover no-submit imports, stale HTTP
  apply, origin rejection, staging failure, exact bytes, duplicate selection, idempotent explicit
  submission, submission ambiguity and ZIP artifact hashes.
- A mocked provider also executes through the actual existing queue/executor, creates its
  saved native run and returns a hash-verified ZIP. No external provider is contacted.
- Eight parity cases execute both actual validators: all expected outcomes match.
- `npm run provenance:check`: existing implementation closure matches.
- All seven evaluator files, numerics and scenario file remain byte-identical to session-start
  SHA-256 snapshots. Scenario `/13` and research-exchange `/1` remain unchanged.
- Archived historical plan SHA-256 matches HEAD's former `implementation_plan.md`:
  `be0d3c3ec9eafded2f9585a0ab4e906065cbf4f26904602ee32c54c291300d25`.
- Release script reports passing inventory/claims-language/isolation/whitespace/unit/syntax
  checks, and correctly leaves owner approval, deployment, citation support and its own browser
  gate NOT-RUN. Separate browser checks below are not silently substituted into those gates.

### Browser observations

Connected Playwright, actual local application at `http://127.0.0.1:8096/`, 1280×720:

- Checked-in injectable suite convergence part passed (UTC November 4, 00:21:13–00:21:22).
  Three rows per study; slab observed orders 1.99999999985 and 2.00000000012. All-faces order
  stays undefined. No page errors during that suite.
- Exchange part passed (00:21:28–00:21:37): real manifest download, two hypotheses, one query,
  one run, one evidence record and one artifact preserved. No page errors during that suite.
- Actual Three.js texture render/readPixels: GL error 0; input `[0,1]` produced blue and red
  pixels, not the former uniform slab rectangle. This was a separate bounded diagnostic render.
- Ten cycles on one continuous page alternating construct/laboratory with overlay replacement
  and inset: resources repeated at 272 geometries/19 textures for construct and 271/18 for
  laboratory; no upward trend in those samples. Main/inset totals were 8+8=16 and 584+399=983.
  This is a narrow resource observation, not the complete planned performance matrix or GPU
  timing certification. Initial pointer-driven loop exceeded the tool timeout; the successful
  resource loop dispatched existing DOM events and is not evidence of pointer accessibility.

### Broad Desk suite limitation

System Python full discovery ran 840 tests: 705 passed, 1 failed, 8 errors, 126 skipped.
Seven errors involve unavailable experiment validation (`jsonschema`), and one needs PyYAML;
the failure expects a valid experiment card but receives invalid when validation is unavailable.
Do not call this a passing full suite or assert every failure is pre-existing without a clean
baseline in an environment containing the declared optional validation dependencies.
Full output was captured at `/tmp/implementation-desk-full.log` (ephemeral, not committed).

## Remaining plan work (not represented as complete)

- Complete nested-field/timestamp/reference parity coverage and cross-language normalization.
- Harden concurrent export finalization further if hostile local writers are in scope; staging
  and generated IDs protect the normal app path but are not an adversarial filesystem sandbox.
- Full representation/cut-plane/motion wiring, camera/visibility transitions, resource ownership
  audit and persistent reproducible ten-cycle/fresh-page/viewport evidence matrix.
- Slab provenance UI, model-run and dataset/fit/study artifact integration, explicit application
  receipts, registered-model sweep selector/axes and side-by-side comparison.
- Hypothesis/query draft editors; convergence artifact downloads and retained run history.
- Complete end-to-end browser roundtrip across both applications. The actual queue/executor
  mocked-provider integration passes in Python; the two-app browser flow remains outstanding.
- Desk browser verification of new query/export controls, bounded download failure matrix,
  primary-source audit, walkthrough, coherent version update and final measured closeout.

No new runtime packages, commits, pushes, deployments or live/paid provider calls were made.
Pre-existing `data/iris-*` untracked Desk directories were left untouched.

## Repeatable commands

### Continued provenance checkpoint

- Added slab original-byte dataset and native-fit capture in `src/slab-measurement.js` and the
  slab import/example UI. Capture never applies controls. Restored scenarios still explicitly
  lack original-byte provenance; implementation digests remain unavailable rather than invented.
- Box fits now produce an immutable explicit-application receipt containing the timestamp,
  previous demand and exact applied estimate. Refit/input/settings invalidation clears the
  displayed successful record instead of leaving stale provenance visible.
- Regression tests reproduced the missing receipt and stale display before repair. Node
  v24.18.1 full suite subsequently passed 294/294, with zero skips; syntax checked 170 modules.
  Implementation closure and all nine saved evaluator/numerics/scenario hashes still match.
- Added browser suite `part: 'provenance'`: slab byte digest, inert capture, box application and
  settings invalidation passed on the actual app at 1280×720 without page errors (browser UTC
  timestamp November 4, 2026, 00:51:15–00:51:34). This is not a full accessibility audit.
- No Desk source changes, dependency installations, commits, pushes or provider calls in this
  continuation. The previously reported broad Desk environment failures remain unresolved.


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

The browser adapter is `/workspace/bioprinting-workbench/scripts/browser-verification-suite.js`.
Import `createBrowserVerificationSuite` into a Playwright-capable runner and call the returned
function with an existing `page`, explicitly passing `baseURL` and `part: 'convergence'` or
`part: 'exchange'`. It adds no application dependency. This session used the connected runner
with temporary wrappers outside either repository. Browser adapter execution requires fixture
paths to be served by the local development server, not a restricted production inventory.