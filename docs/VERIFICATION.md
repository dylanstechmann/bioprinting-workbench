# Agent-run verification — 2026-11-01

## v0.2 — gated procedure walkthrough, measurement import, fidelity pass (owner-requested)

On Node v24.18.1, `npm test` passed **30 tests, 0 failed, 0 skipped** (16 prior plus 9
procedure and 5 calibration tests); `npm run check` passed for all six runtime modules.
New unit coverage: step/stage coverage and unique ids, DOI-shaped citations, a wording
guard over step titles/purposes/check labels, gate unlock order, `clampTime` behavior,
`setMode` validation, summary counts, calibration schema rejection cases, exact synthetic
recovery of the slab demand (`q = 1.2` within 1e-9), noisy-data spread and out-of-domain
flagging. `citation-check/scripts/refcheck.py` re-verified both DOIs against their
registry titles on 2026-11-01 (2 matches, 0 needing attention); the Grigoryan in-vivo
attribution was additionally checked against the paper's PubMed abstract, and the Kolesky
workflow attributions against the open-access text. The claims scanner reported no MED/LOW
findings and one HIGH `disclosure-removed` hit that was reviewed and kept as a documented
false positive: the flagged line is the footer, whose version label changed from v0.1 to
v0.2; the AI-assistance disclosure text in that line is byte-identical and fully
preserved. The scanner's removed-line rule mechanically re-triggers on any edit to that
single-line footer, so the honest resolution is this note rather than reverting to a
stale version label or weakening the disclosure. No statement was weakened.

Browser verification (headless Chromium, real WebGL): **18 grouped checks passed** —
gated mode by default with stages 1–4 locked and their buttons disabled; timeline capped
at the active gate; stage-0 checkpoints unlock stage 1; playback advances and pauses
exactly at the gate (time = 1.999, playing = false); the free-exploration toggle unlocks
all stages, and returning to gated clamps time back to the gate; "View in simulator"
seeks unlocked stages; the calibration example loads (q ≈ 1.186 for the synthetic pairs)
and appears in diagnostics and the exported JSON together with the procedure summary;
an invalid file shows a friendly error; clear returns to no-dataset; restart resets
checkpoints while keeping the mode; the renderer reports the PMREM room environment and
17 textures; 390 px mobile has no horizontal overflow; a forced-WebGL-failure page keeps
the gating and calibration panels usable. A full-page screenshot was captured and
`docs/preview.png` refreshed from the real render. No JavaScript console errors occurred.

Not tested: Safari/Firefox, physical devices, assistive-technology audit, frame-rate
guarantees (headless playback ran slower than real time), and any biological, mechanical
or fluid behavior. The Blender→GLB asset path remains a documented follow-up.

## Oxygen reference and visual upgrade (subsequent local changes)

On Node v24.18.1, `npm test` passed **16 tests, 0 failed, 0 skipped**;
`npm run check` passed. The five added oxygen tests check the analytical model's
boundaries, symmetry, zero-demand limit, center, finite-difference curvature,
flux balance, validation and provenance. This is mathematical verification, not
calibration against measurements. The claims scanner reported no findings.

In headless Chromium with WebGL, agent-run browser checks exercised the oxygen
slider and graph, export of the reference model, 3D stage selection, and a
390-pixel mobile viewport. A forced WebGL failure displayed the fallback while
the oxygen controls remained usable. A screenshot was inspected in temporary
storage; the older checked-in preview represents the previous version. The
procedural geometry has more equipment details, but remains non-photorealistic.
The Kolesky DOI was rechecked against its title on 2026-11-01: 1 match, 0 errors.
No experimental dataset was used, and no new research source was introduced.

These checks concern software behavior, not scientific or biological validation.

## Automated checks

- `npm test` on Node v24.18.1: **11 passed, 0 failed, 0 skipped**.
- `npm run check`: syntax checks passed for all three authored runtime modules.
- `git diff --check`: no whitespace errors.
- `citation-check/scripts/refcheck.py` for both cited DOIs on Python 3.12.16:
  **2 resolved, 0 not found, no flags**. Titles agree with the source ledger.
  Registry output is preserved as `citation-check.json`; resolution alone does not
  establish support for a scientific claim. Primary full texts were also opened.
- `regen-guardrails/scripts/claims_scan.py`: no HIGH/MED/LOW wording findings and no
  missing statements after making the AI-assisted disclosure machine-readable.
  The new MIT `LICENSE` is flagged as a tripwire; it is newly created for this requested
  project, not a modification or removal of a pre-existing repository's license.

System Python 3.12.3 was missing standard-library modules (`dataclasses` and `http.server`)
in this container. The citation scan, claims scan and static preview server therefore used
the already-existing Python 3.12.16 runtime at
`/home/vscode/.cache/venvs/courselab/bin/python`; no sibling source was modified or package
installed. Node tests run directly without dependencies. Docker/Compose was not run;
Docker and the reservation controller are unavailable in this legacy workspace environment.
The new independent sibling tree was created here; existing active project trees were
read only. Infrastructure generation/controller state was not changed.

## Browser checks

Headless Chromium through the connected Playwright browser, real WebGL renderer:
**16 grouped checks passed**:

1–5. Each of the five stage buttons selects its corresponding sampled stage.
6. Layer count changes actual geometry: 6 to 9 layers, 42 to 63 filaments.
7. Spacing changes actual geometry: spacing 0.24 with 9 layers gives 99 filaments.
8. Disabling channels sets illustrative flow to zero.
9. Zero perfusion independently stops illustrative flow.
10. Human context displays the explicit integration-not-established warning.
11. Scrubbing to 2.5 produces the expected 0.3 scripted occupancy.
12. Playback advances time; pause control works.
13. Three camera presets and scaffold-reveal toggle operate.
14. Downloaded JSON parses and retains seed and selected context.
15. 390 × 844 mobile viewport has no horizontal overflow.
16. Forced WebGL failure shows a useful fallback and keeps stage controls functional.

Visual inspection: lab overview and close construct/perfusion scene at desktop resolution;
mobile layout captured. The checked-in `preview.png` is an actual browser screenshot of
the rendered prototype, not a concept image. Initial Three.js deprecated soft-shadow warning
was corrected to PCFShadowMap. Headless GPU readback performance warnings were observed;
no runtime JavaScript errors occurred in the functioning renderer checks. High draw-call
count remains a performance improvement opportunity; no frame-rate guarantee is made.

No Safari, Firefox, physical phone, assistive-technology audit, calibrated mechanics,
fluid simulation, oxygen solver, tissue experiment, physical printing or transplant tested.