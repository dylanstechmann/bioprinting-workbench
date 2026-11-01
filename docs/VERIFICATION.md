# Agent-run verification — 2026-11-01

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