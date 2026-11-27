# Working context state (updated 2026-11-26, publication reconciliation)

Private agent working note — supersedes stale current-status claims below while retaining them as
history. Not a release artifact (root-level file; outside the release inventory walk).

## Current observed state

- Repository: `/workspace/bioprinting-workbench`; branch `continuation/2026-11-04-versioning`;
  implementation base `feda2e34023ac4783c937267c6164d333cfe0862`; fetched publication base
  `31bf72627ab2f6bc2a78fa8876da6c5351e9ece1`. Unique work was reconciled in an isolated temporary
  worktree; the original dirty tree was preserved.
- Presentation browser verification now requires actual graphics scale/state diagnostics after every
  transition, pointer/keyboard activation, explicit cut-plane-off/motion-system states, scenario-byte
  invariance and no horizontal overflow. Absent/stale/contradictory diagnostics and WebGL-disabled
  false success are covered by focused regressions; the misleading rollback check is gone.
- Publication gates: focused 37/37; full 351/351 with 0 skipped; syntax 182 modules; provenance fresh;
  exchange parity 16/16; release 24 PASS / 6 NOT-RUN across 162 candidates; `git diff --check` clean.
  Fresh Chromium drafts checks passed 9/9 at desktop, mobile and with WebGL disabled. Presentation
  passed 9/9 at desktop/mobile and was correctly blocked with WebGL disabled; all runs had 0 page errors.
- Historical presentation-only gates: focused 14/14; full 349/349 with 0 skipped; syntax 181 modules;
  provenance fresh; exchange parity 16/16; release 24 PASS / 6 NOT-RUN across 162 candidates;
  `git diff --check` clean. Baseline focused was 4/4 and ten new tests failed before implementation.
- Actual `docs/browser-presentation-2026-11-16.json`: headless Chromium 155.0.8059.12 desktop
  1280×720 and mobile 390×844 each pass 9/9 with zero page errors, unchanged 2,955-byte scenarios
  and no overflow. WebGL-disabled 1280×720 is blocked with `webgl:false`, never passed. The prior
  `docs/browser-controls-2026-11-15.json` is preserved byte-for-byte.
- Implemented full local/imported draft editing, immutable validated baselines, explicit Save with
  creator/lineage/review preservation and no revision auto-increment, defensive cockpit edit
  handoff, bounded delegated listeners and fail-closed browser result aggregation. Save refuses
  same-ID baseline/current conflicts with a reload diagnostic; review retention is based on the
  actual target. Untouched list controls preserve padded, multiline and comma-containing arrays.
- Prior draft-editing final gates after review corrections: focused 18/18; full 339/339 with 0 skipped; syntax 181 modules; provenance
  fresh without rebuild; exchange parity 16/16; `git diff --check` clean; release verification 24
  PASS and 6 explicit NOT-RUN lines, 161 candidate files. Baseline was focused 8/8, full 329/329,
  syntax 180 modules, with no pre-existing failures observed.
- Actual drafts-only browser evidence is in `docs/browser-controls-2026-11-15.json`: desktop
  1280×720, mobile 390×844 and WebGL-disabled 1280×720 all pass 9/9 checks with zero page errors,
  exact 2,626-byte downloaded-bundle comparisons containing a real imported-title edit, preserved
  creator/lineage/revision and unreviewed metadata, unchanged canonical scenario bytes and no
  horizontal overflow. Headless Chromium 155.0.8059.12 only. Other browser parts are not claimed.
- No scenario/schema/evaluator/numerics/fixture/dependency changes; no provider/query execution,
  containers, installations or provenance rebuild. The historical implementation runs made no commit
  or push; the 2026-11-26 owner-authorized reconciliation was committed and fast-forward pushed to
  the continuation branch without a merge, tag or deployment.
- Remaining: convergence/exchange/provenance/exploration browser parts, non-Chromium/physical-device/accessibility/owner visual
  review, citation/scientific and external claims review, live Blender/providers, owner approval
  and deployment. Software results do not establish scientific, biological, clinical or safety
  validity.

## Historical working context (2026-11-03; retained, not current evidence)


Private agent working note — supersedes the full transcript for situational awareness.
Not a release artifact (root-level file; outside the release inventory walk).

## Status: B–G phases + verification close-out + magnified viewport COMPLETE and committed
- Workbench: 273 tests / 156 modules (184/121 at the Phase A baseline); `provenance:check`
  fresh; `verify:release` automated checks pass; evaluators + scenario /13 byte-identical.
- ResearchDesk: `test_bioprint_exchange.py` 11/11 (incl. cross-language golden digests,
  byte-identical map in both fixture dirs); `test_regen_desk.py` 30 run with the same 3
  pre-existing failures that reproduce at clean HEAD (not ours).
- Browser evidence (Playwright code runner, 60 s cap, halves of `scripts/browser-smoke-phases-cde.js`):
  c-d = 7/7 checks (scales + unknown label, overlay cap/legends, magnified inset, WebGL
  health, sweep completion ranges-only, sweep cancel zero rows + no scenario writes,
  keyboard equivalence); e = 3/3 (preview inert, XSS title inert after apply, export
  round-trip idempotent, cross-sections with quoted bands). 390 px clean; zero page errors.
- Resource matrix: `docs/resource-matrix-run-2026-11-03.json` — 60 rows, deterministic
  cold/warm series per fresh load; settled counts only, NOT a GPU-leak certificate.
- Committed 2026-11-03 on explicit owner instruction ("all of it") in both repos; no push,
  no deployment. `data/iris-*` in regen-workbench stayed untracked/untouched.

## Plan-audit verdict (prior model narrowed scope — confirmed, scope restored + executed)
- Archives: `docs/IMPLEMENTATION_PHASES_A_G_2026-11-03.md` (original),
  `docs/IMPLEMENTATION_PHASE_B_ONLY_2026-11-03.md` (narrowed),
  `docs/IMPLEMENTATION_PLAN_B_G_2026-11-03.md` (executed B–G plan).
- Owner rules kept (not censorship): hobby/AI-assist disclosures; no treatment /
  transplant-readiness / biological-validation claims; no secrets; evaluators untouched;
  scenario /13 round-trips, /14 rejected; Desk import never calls `Desk.submit()`.

## Where things live
- This cycle's plan: `implementation_plan.md` (checkpoints at top). Phase docs:
  `docs/{DOMAIN_MODELS,MULTISCALE_VIEWS,MODEL_EXPLORATION,RESEARCH_COCKPIT,RESEARCH_EXCHANGE}.md`.
- New this cycle: `src/{magnified-viewport,vascular-cross-sections}.js`,
  `scripts/browser-smoke-phases-cde.js`, `scripts/browser-resource-matrix.js`,
  `tests/fixtures/research-exchange/golden-digests.json` (+ byte copy in regen-workbench).
- Exchange contract: `regen-workbench/BIOPRINT_EXCHANGE.md` + `tools/bioprint_exchange.py`.

## Environment quirks (do not re-discover)
- `/usr/bin/python3` is stripped (no `json`/`unittest`) → use
  `/home/vscode/.local/bin/python3.12`. Shell transport mangles `!`/quoting → write scripts
  to `/tmp/*.py|*.mjs` via the editor, then run them.
- Playwright runner: 60 s per call; files must live under `/tmp/cline-playwright`; the
  runner wraps the file as an expression (strip the trailing `;`); `waitForFunction` rAF
  polling is unreliable in its background page → use interval polling helpers; runner
  `globalThis` does NOT persist across calls → pass state via page `localStorage`.
- Sweep axes accept 2..10 explicit values (validated); same-tick run+cancel makes abort
  tests deterministic. Quality/theme switches cost ~1.5–2 s each in headless (shadow
  recompiles) → matrix runs in 2-cycle bounded runs.
- Any edit inside the provenance closure → `npm run provenance:build`, re-run
  `provenance:check` + `verify:release`.

## Standing not-run gates (report honestly, never silently claim)
Owner visual review (evidence produced in docs/VISUAL_DESIGN.md) · citation/scientific
review · live-provider demo (needs owner credentials) · deployment.

## Next actions on owner request
Owner visual review session · citation/scientific review · live-provider demonstration only with
explicit owner credentials/opt-in · deployment only with explicit authorization.
