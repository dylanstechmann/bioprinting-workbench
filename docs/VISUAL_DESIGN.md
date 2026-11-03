# Scientific instrument — Phase A hardening (focused workspace slice)

Approved direction: instrument polish, then multiscale views, then research cockpit.
Agent-developed software/presentation work on a personal hobby/learning project; not
independent scientific review. No ResearchDesk integration is added in this phase.
Owner Gate A review of composition, contrast and responsive framing is still required;
this file records agent-run measurements, not aesthetic approval.

## Phase A changes (2026-11-03, uncommitted)

- Bounds-fitted lab camera: src/camera-rig.js adds fitCameraToBounds (all eight artwork
  corners projected into the frustum with padding; illustrative units only) and a bounds
  option on getCameraPose. src/scene.js computes visible-artwork bounds (room/dome background
  and floating labels excluded), refits on resize for every view, refits once after GLB
  equipment settles unless the user is orbiting, and adapts the OrbitControls distance
  ceiling to the fitted pose. Construct/top views keep their reviewed stage anchors.
- Frame policy extracted (src/frame-policy.js): shouldAdvanceFrame/shouldDrawFrame now gate
  clock advance and drawing; a renderedFrames counter in lab diagnostics makes suspension
  measurable instead of assumed.
- Transactional scenario application (src/scenario-application.js): next and rollback
  states are prepared before any UI write; a failed commit restores the previous snapshot;
  if restoration itself fails, the status line says so instead of claiming retention.
- Layout compaction and one gate row: duplicate gate chips removed (the stage strip already
  shows lock state); header/intro/notice/tabs/stages/viewer heading tightened.
- Contrast pass: darker lab floor/bench/wall palette in src/environment.js, reduced
  environment-intensity and hemisphere wash, stronger sun; environment textures are now
  seeded (131/132/133) instead of Math.random, making every procedural texture deterministic.
- scripts/browser-smoke.js rewritten for the four-area workspace: area-aware calibration
  flow, measured frame suspension/resume, /13 round-trip, all-area 390px overflow, no page
  errors. It no longer targets hidden controls or the obsolete Version 4 status text.

## Measured results (agent-run, headless Chromium)

- Node v24.18.1: npm test 184 passed, 0 failed/skipped (173 -> 184: +2 frame-policy,
  +5 scenario-application, +4 camera-rig tests); npm run check 121 modules; git diff --check
  clean; npm run verify:release automated checks pass.
- Layout at 1280x720: document height 4,021 px (43,514 px pre-slice baseline; 4,206 px at
  this session's start), viewer top exactly 400 px (was 584 px), 320 px of scene visible
  in the first viewport, no horizontal overflow. At 390x844 all four areas report width
  390 with no overflow.
- Lab camera fit: target follows the visible artwork center (about [-0.01, 1.65, 0.11];
  stage 4 shifts to y=1.36 when the recipient patch replaces the printer). All 15
  stage x camera combinations produced valid fitted poses; render calls per combination:
  lab 566-725, construct 337-632, top 251-451.
- Resource stability: three full lab/treedome + low/high/balanced cycles returned identical
  316 geometries, 19 textures, 584 calls (stage 0 / lab / balanced). Settled-cycle counts
  only; not a GPU-leak certificate, and idle-state counts differ (264/17) before theme and
  shadow caches warm.
- Drawing suspension, measured: renderedFrames froze exactly while in Models and resumed
  growing after returning to Studio. Headless rAF here is heavily throttled (~1-10 fps), so
  the smoke script polls for resume instead of using fixed windows; no FPS claims are made.
- Keyboard tabs (ArrowRight -> Models, End -> Evidence & limits, Home -> Studio), deep link
  #research-module-8, WebGL-unavailable fallback (message shown, quality control disabled,
  /13 export still working, zero page errors) and reduced-motion diagnostics (true) all
  verified in the connected browser.
- Contrast evidence from decoded screenshots (region x40-620, y620-715, luminance
  0.2126R+0.7152G+0.0722B): the old floor clustered near white (p50 229.9, p95 231.9);
  the new floor sits at p50 188.9 with equipment highlights to p95 233.9, and the
  full-frame share of >235-luminance pixels fell from 45.8% to 40%. The agent cannot view
  images; whether the result looks good is the owner's Gate A judgment.
- Smoke execution note: the full single-shot smoke exceeds this MCP environment's 60-second
  round-trip budget, so it was executed here as two sequential halves with identical
  assertions (half A: studio default, layout, gates, animated head, suspension-frozen,
  no page errors; half B: resume, slab example/clear in Studio, 3D fit/apply in Models,
  /13 round-trip, invalid-import atomicity, 390px all areas, no page errors). Both halves
  passed. The repository keeps the canonical single script.

## Owner-review limitations (Gate A input)

- Screenshots are captured but not visually reviewed by the agent: 1280x720 desktop
  (/tmp/phase-a-desktop-final.png), lab scene (/tmp/phase-a-lab-final.png). Owner should
  judge composition, contrast and readability directly.
- Lab view is intentionally static across stage changes (stability over jumpiness);
  construct/top framing is unchanged from the previously reviewed slice.
- Touch-target sizes on some compacted controls (32-34 px) are below the 44 px comfort
  guideline; keyboard focus outlines are retained. Owner may prefer larger targets.
- No FPS or general performance claim; high-preset pixel-ratio caps were not visually
  exercised (headless devicePixelRatio is 1).
- devicePixelRatio-1 headless rendering only; no wide-gamut or color-management claims.

## Earlier focused-slice record (same day, superseded measurements above)

Four workspace areas, keyboard tabs, deep links, 14 research cards, quality presets,
  reduced motion, cross-reference refresh, import rollback and a dependency-free Node static
  preview (127.0.0.1:8096, GET/HEAD, containment checks, no listings). 173 tests/117 modules
  passed then; document height was 4,206 px with viewer top 584 px; 3-cycle stability was
  264 geometries/18 textures/584 calls. The pale-lab and first-viewport findings recorded
  there motivated Phase A.

No new dependencies, credentials, hosted jobs, commits, pushes, tags or deployment.
Multiscale views, the domain/unit/provenance registry, exploration sweeps, the hypothesis
cockpit and ResearchDesk exchange remain deferred pending Gate A and the later plan gates.

## Resource matrix and new presentation views - 2026-11-03 (measured; owner review not run)

- >=10-cycle settled resource matrix (`docs/resource-matrix-run-2026-11-03.json`): 60
  samples, lab/treedome x low/balanced/high at 1440x1000, deterministic per position-in-run
  with cache-only warm-up deltas. Settled counts only, not a GPU-leak certificate, no FPS
  claims. The older 316 geometries / 19 textures figure at lab/balanced predates the
  multiscale modules and is a different app state, not directly comparable.
- Magnified construct inset: bottom-right framed inset (28% width, 4:3, 22-degree FOV) with
  a second pass of the live scene from the fitted construct bounds; labelled
  "MAGNIFIED CONSTRUCT - PRESENTATION ONLY"; hidden and non-rendering unless toggled; one
  WebGL context preserved.
- Explanatory cross-sections panel: three schematic figures (printed channel 100-300 um
  quoted; capillary 10-50 um quoted beside the 100-200 um teaching band; connection gap
  marked "not modeled"), each carrying the not-to-scale disclaimer and its evidence anchor.
