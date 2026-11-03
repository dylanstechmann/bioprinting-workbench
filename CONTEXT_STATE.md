# Working context state (compacted 2026-11-03, post verification close-out)

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
Push when asked · owner visual review session · citation/scientific review · live-provider
demonstration only with explicit owner credentials/opt-in · deployment.
