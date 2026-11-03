# Implementation Plan

[Overview]

Deliver **v0.21.0-dev "The 200-micron wall"**: the workbench's second physics-anchored teaching model after nozzle shear - an idealized Krogh-cylinder oxygen-supply reference that answers the vascularization question every frontier target raises (how close must perfused channels be?) in physical units with hypothetical inputs, plus a four-source open-access evidence layer on the oxygen diffusion limit, printed microvascularization and host anastomosis, wired as a new analysis panel with scenario schema /12 and the same honesty discipline as the shear module.

[Context]

The existing transport models are deliberately dimensionless: oxygen.js is a normalized 1D slab (c'' = demand), oxygen3d takes owner-supplied measurements, and flow.js is a dimensionless linear resistance network with a PCG solver. Nothing computes a physical-units oxygen-supply distance. Every frontier atlas entry names perfusion as its barrier (alveolar gas exchange, deep dermis, gingival prevascularization), and the roadmap's declared intention is to teach endothelial lining and host-vessel connection as evidence gaps. The module mirrors the v0.18 pattern: an idealized model with hypothetical-controls inputs, computed-not-persisted results, a cited band shown as context rather than a viability prediction, and verbatim-quoted open-access evidence with secondhand-restatement discipline. Anchors confirmed available: Mansouri & Leipzig 2021 Biophys Rev (PMC10903443, mass transport limitations), Seymour et al. 2022 Biofabrication (PMC8988885, bioprinted microvasculature structure-to-function), Yeo et al. 2023 Biofabrication (PMC10658349, coupling printing and vascularization), Zhang et al. 2025 Acta Biomater (PMC12277018, perfusable multiscale networks).

[Types]

- Model (src/vascular-supply.js): settings { diffusivityD_m2PerS (1e-10..1e-8), consumptionM_molPerM3S (1e-6..1e-1), inletC0_molPerM3 (0.001..0.5), channelRadiusUm (10..500) }, all hypothetical-constant; parameterOrigin enum 'hypothetical-controls' only in v1.
- Krogh solution: C(r) = C0 + M/(4D)*(r^2 - r0^2) - (M*R^2/(2D))*ln(r/r0) on [r0, R], with C(r0)=C0 and C'(R)=0; critical radius R_crit solving C(R)=0, i.e. R^2*(1 - 2 ln(R/r0)) = r0^2 - 4 D C0 / M, solved by bisection; planar comparison thickness L = sqrt(2 D C0 / M); idealized minimum channel surface density 1/(pi R_crit^2) in channels/mm^2 and center-to-center spacing 2 R_crit. If no root exists within 10 mm the result says supply is not limiting at that scale in this idealization.
- Result: { status, computed: { kroghCriticalRadiusUm, planarLimitUm, channelSpacingUm, channelDensityPerMm2, profile: [{ rUm, cOverC0 }] }, bandContext: { bandUm: [100, 200], label: 'cited teaching band, not a prediction' }, notices }. Computed results are never persisted; scenario stores settings only (the nozzle-shear record shape).
- Evidence (same file): VASCULAR_SUPPLY_SCHEMA 'bioprinting-workbench/vascular-supply-evidence/1'; sources[] and claims[] (id prefix 'vascular-supply-', statement, verbatimQuote, locator, supportStatus 'reviewed', basis 'primary-text'|'secondhand-restatement', sourceId, limitations[]); the cited diffusion band lives as claim data, not a hardcoded constant.
- Scenario: analyses.vascularSupply { settings, parameterOrigin } under bioprinting-workbench/12.

[Files]

New: src/vascular-supply.js (model + catalog + validators); src/vascular-supply-ui.js (panel with inputs, computed readout, SVG concentration profile, evidence list); tests/vascular-supply.test.js; tests/fixtures/scenario-v12.json; docs/VASCULAR_SUPPLY.md; docs/vascular-supply-audit.json (verbatim quotes, locators, fetchDate).
Modified: src/scenario.js (schema /12, defaultAnalyses + analyses allowlist gains vascularSupply, normalize validates settings/origin, migrateScenarioV11 with truthful warning, older migration allowlists stay as their incoming shapes, parseScenario dispatch /11); src/app.js (createVascularSupplyUI wiring + state export/import, mirroring the nozzle-shear wiring); tests/scenario.test.js (/12 assertions, fixture list + v12, forge cases); index.html (analysis-section panel + scenario-status Version 12 prose + footer v0.21.0-dev); package.json (0.21.0-dev); docs/SCENARIOS.md, docs/SOURCES.md, docs/VERIFICATION.md, docs/ROADMAP.md, docs/ATLAS.md (barrier section links the estimator), CHANGELOG.md, README.md (model paragraph); implementation_plan.md (this plan; 0.20 archived).

[Functions]

New: validateVascularSupplySettings(raw), defaultVascularSupply(), validateVascularSupplyRecord(raw), evaluateVascularSupply(settings), getVascularSupplyCatalog(), validateVascularSupplyCatalog(raw) in src/vascular-supply.js; createVascularSupplyUI({ elements, onStateChange }) with getState/setState/diagnostics mirroring createNozzleShearUI in src/nozzle-shear-ui.js.
Modified: defaultAnalyses() and normalize() in src/scenario.js (vascularSupply record + allowlist), parseScenario dispatch and migrateScenarioV11.

[Classes]

None (module-function style per repo convention).

[Dependencies]

None. No new packages; no runtime network; evidence fetched once during development with curl and quoted verbatim.

[Testing]

- tests/vascular-supply.test.js: planar identity L = sqrt(2 D C0 / M) exactly; the Krogh profile satisfies C(r0)=C0 and zero slope at R within tolerance; the bisection root satisfies C(R_crit)=0 within 1e-9 relative; a pinned worked example (D=1e-9, C0=0.13, M=1e-2 gives a planar limit near 161 um, inside the cited 100-200 um band) and a case where the critical radius is not limiting within 10 mm; band placement is context-only with forbidden prediction language; forge rejections (out-of-bounds inputs, negative consumption, zero channel radius, unknown origin, mis-banded or secondhand-without-limitations claims, unknown sourceId); audit-verbatim equality with docs/vascular-supply-audit.json.
- tests/scenario.test.js: /12 round-trip, v11 migration defaults vascularSupply with truthful warning, fixture v12, reject unknown /13.
- Full battery: node --test tests/*.test.js (152 + new), npm run check, git diff --check, verify:release detached, connected-browser check (panel computes, profile renders, 0 console errors), commit + push, live Pages verification, doc-only record commit.

[Implementation Order]

1. Fetch the four sources and extract verbatim diffusion-limit, printed-microvascularization and anastomosis sentences with the established extractor pattern; store quotes.
2. Author src/vascular-supply.js (model first, then catalog with injected quotes), generate docs/vascular-supply-audit.json from the runtime catalog, write tests/vascular-supply.test.js, run green.
3. Scenario /12: scenario.js schema bump + defaultAnalyses + normalize + migrateScenarioV11 + dispatch, tests/scenario.test.js updates, fixtures/scenario-v12.json; run the scenario suite.
4. UI: src/vascular-supply-ui.js, app.js wiring, index.html panel + Version 12 prose + footer 0.21.0-dev; package.json bump; local browser check of computation and profile.
5. Docs: VASCULAR_SUPPLY.md, SOURCES.md, SCENARIOS.md, VERIFICATION.md, ROADMAP.md, ATLAS.md pointer, CHANGELOG.md, README.md.
6. Full battery, push, live Pages verification, doc-only record commit; report the model's idealization and the non-coupling boundary explicitly.

---

# Implementation Plan

[Overview]

Deliver **v0.21.0-dev "The 200-micron wall"**: the workbench's second physics-anchored teaching model after nozzle shear - an idealized Krogh-cylinder oxygen-supply reference that answers the vascularization question every frontier target raises (how close must perfused channels be?) in physical units with hypothetical inputs, plus a four-source open-access evidence layer on the oxygen diffusion limit, printed microvascularization and host anastomosis, wired as a new analysis panel with scenario schema /12 and the same honesty discipline as the shear module.

[Context]

The existing transport models are deliberately dimensionless: oxygen.js is a normalized 1D slab (c'' = demand), oxygen3d takes owner-supplied measurements, and flow.js is a dimensionless linear resistance network with a PCG solver. Nothing computes a physical-units oxygen-supply distance. Every frontier atlas entry names perfusion as its barrier (alveolar gas exchange, deep dermis, gingival prevascularization), and the roadmap's declared intention is to teach endothelial lining and host-vessel connection as evidence gaps. The module mirrors the v0.18 pattern: an idealized model with hypothetical-controls inputs, computed-not-persisted results, a cited band shown as context rather than a viability prediction, and verbatim-quoted open-access evidence with secondhand-restatement discipline. Anchors confirmed available: Mansouri & Leipzig 2021 Biophys Rev (PMC10903443, mass transport limitations), Seymour et al. 2022 Biofabrication (PMC8988885, bioprinted microvasculature structure-to-function), Yeo et al. 2023 Biofabrication (PMC10658349, coupling printing and vascularization), Zhang et al. 2025 Acta Biomater (PMC12277018, perfusable multiscale networks).

[Types]

- Model (src/vascular-supply.js): settings { diffusivityD_m2PerS (1e-10..1e-8), consumptionM_molPerM3S (1e-6..1e-1), inletC0_molPerM3 (0.001..0.5), channelRadiusUm (10..500) }, all hypothetical-constant; parameterOrigin enum 'hypothetical-controls' only in v1.
- Krogh solution: C(r) = C0 + M/(4D)*(r^2 - r0^2) - (M*R^2/(2D))*ln(r/r0) on [r0, R], with C(r0)=C0 and C'(R)=0; critical radius R_crit solving C(R)=0, i.e. R^2*(1 - 2 ln(R/r0)) = r0^2 - 4 D C0 / M, solved by bisection; planar comparison thickness L = sqrt(2 D C0 / M); idealized minimum channel surface density 1/(pi R_crit^2) in channels/mm^2 and center-to-center spacing 2 R_crit. If no root exists within 10 mm the result says supply is not limiting at that scale in this idealization.
- Result: { status, computed: { kroghCriticalRadiusUm, planarLimitUm, channelSpacingUm, channelDensityPerMm2, profile: [{ rUm, cOverC0 }] }, bandContext: { bandUm: [100, 200], label: 'cited teaching band, not a prediction' }, notices }. Computed results are never persisted; scenario stores settings only (the nozzle-shear record shape).
- Evidence (same file): VASCULAR_SUPPLY_SCHEMA 'bioprinting-workbench/vascular-supply-evidence/1'; sources[] and claims[] (id prefix 'vascular-supply-', statement, verbatimQuote, locator, supportStatus 'reviewed', basis 'primary-text'|'secondhand-restatement', sourceId, limitations[]); the cited diffusion band lives as claim data, not a hardcoded constant.
- Scenario: analyses.vascularSupply { settings, parameterOrigin } under bioprinting-workbench/12.

[Files]

New: src/vascular-supply.js (model + catalog + validators); src/vascular-supply-ui.js (panel with inputs, computed readout, SVG concentration profile, evidence list); tests/vascular-supply.test.js; tests/fixtures/scenario-v12.json; docs/VASCULAR_SUPPLY.md; docs/vascular-supply-audit.json (verbatim quotes, locators, fetchDate).
Modified: src/scenario.js (schema /12, defaultAnalyses + analyses allowlist gains vascularSupply, normalize validates settings/origin, migrateScenarioV11 with truthful warning, older migration allowlists stay as their incoming shapes, parseScenario dispatch /11); src/app.js (createVascularSupplyUI wiring + state export/import, mirroring the nozzle-shear wiring); tests/scenario.test.js (/12 assertions, fixture list + v12, forge cases); index.html (analysis-section panel + scenario-status Version 12 prose + footer v0.21.0-dev); package.json (0.21.0-dev); docs/SCENARIOS.md, docs/SOURCES.md, docs/VERIFICATION.md, docs/ROADMAP.md, docs/ATLAS.md (barrier section links the estimator), CHANGELOG.md, README.md (model paragraph); implementation_plan.md (this plan; 0.20 archived).

[Functions]

New: validateVascularSupplySettings(raw), defaultVascularSupply(), validateVascularSupplyRecord(raw), evaluateVascularSupply(settings), getVascularSupplyCatalog(), validateVascularSupplyCatalog(raw) in src/vascular-supply.js; createVascularSupplyUI({ elements, onStateChange }) with getState/setState/diagnostics mirroring createNozzleShearUI in src/nozzle-shear-ui.js.
Modified: defaultAnalyses() and normalize() in src/scenario.js (vascularSupply record + allowlist), parseScenario dispatch and migrateScenarioV11.

[Classes]

None (module-function style per repo convention).

[Dependencies]

None. No new packages; no runtime network; evidence fetched once during development with curl and quoted verbatim.

[Testing]

- tests/vascular-supply.test.js: planar identity L = sqrt(2 D C0 / M) exactly; the Krogh profile satisfies C(r0)=C0 and zero slope at R within tolerance; the bisection root satisfies C(R_crit)=0 within 1e-9 relative; a pinned worked example (D=1e-9, C0=0.13, M=1e-2 gives a planar limit near 161 um, inside the cited 100-200 um band) and a case where the critical radius is not limiting within 10 mm; band placement is context-only with forbidden prediction language; forge rejections (out-of-bounds inputs, negative consumption, zero channel radius, unknown origin, mis-banded or secondhand-without-limitations claims, unknown sourceId); audit-verbatim equality with docs/vascular-supply-audit.json.
- tests/scenario.test.js: /12 round-trip, v11 migration defaults vascularSupply with truthful warning, fixture v12, reject unknown /13.
- Full battery: node --test tests/*.test.js (152 + new), npm run check, git diff --check, verify:release detached, connected-browser check (panel computes, profile renders, 0 console errors), commit + push, live Pages verification, doc-only record commit.

[Implementation Order]

1. Fetch the four sources and extract verbatim diffusion-limit, printed-microvascularization and anastomosis sentences with the established extractor pattern; store quotes.
2. Author src/vascular-supply.js (model first, then catalog with injected quotes), generate docs/vascular-supply-audit.json from the runtime catalog, write tests/vascular-supply.test.js, run green.
3. Scenario /12: scenario.js schema bump + defaultAnalyses + normalize + migrateScenarioV11 + dispatch, tests/scenario.test.js updates, fixtures/scenario-v12.json; run the scenario suite.
4. UI: src/vascular-supply-ui.js, app.js wiring, index.html panel + Version 12 prose + footer 0.21.0-dev; package.json bump; local browser check of computation and profile.
5. Docs: VASCULAR_SUPPLY.md, SOURCES.md, SCENARIOS.md, VERIFICATION.md, ROADMAP.md, ATLAS.md pointer, CHANGELOG.md, README.md.
6. Full battery, push, live Pages verification, doc-only record commit; report the model's idealization and the non-coupling boundary explicitly.

---

# Implementation Plan

[Overview]

Deliver **v0.20.0-dev "The physical setups"**: author the missing peristaltic perfusion-pump circuit (the fourth physical-setup piece stage 4's equipment line names: "perfusion chamber · reservoir · peristaltic pump · tubing") as a genuine Blender-authored GLB, in the owner's live Blender 5.1.2 via MCP for Blender, with the same provenance discipline as the 2026-11-02 four-asset run: owner-scene fingerprint untouched, fresh owned scene, export without saving any .blend, sha-verified transfer, dated isolation evidence, and a manifest re-pin. Wire the asset into the scene with a procedural fallback, extend the asset/evidence tests, and ship through the full battery with live Pages verification. This is the fast-follow explicitly recorded in the 0.19 milestone.

[Context]

The four shipped GLBs (bioprinter 47 meshes/3,764 tris, incubator 26/2,536, microscope 20/2,288, perfusion-chamber 18/1,656) are pinned by docs/blender-isolation-run-2026-11-02.json; the pump is the missing fifth. authoring_common.py supplies create_owned_scene (refuses foreign scenes; marker asset_owner='bioprinting-workbench'), material(), box(), cylinder(), export_owned_scene (temporary window-scene switch, never saves a .blend). src/equipment.js: EQUIPMENT_SPECS rows [id, file, nodePrefix, requiredNodes] and validateEquipmentAsset (namespace, bounds, required nodes); createEquipmentAssets consumes mounts keyed by id with {parent, fallback}. Scene integration in src/scene.js near the existing chamberMount/chamberFallback. The 3D load diagnostics surface through diagnostics().equipment, so a live check can assert the pump reports glb-loaded. No scenario schema change in this milestone: an asset touches no learning or analysis state; /11 stays.

[Types]

- New manifest entry (assets/manifest.json): id 'perfusion-pump', file 'assets/perfusion_pump.glb', nodePrefix 'Pump_', requiredNodes ['Pump_Base','Pump_Head','Pump_Reservoir'], bytes, sha256, meshes, materials, triangles, blenderBounds [[minx,miny,minz],[maxx,maxy,maxz]] recorded from the live Blender run, maxBytes 358400 (house budget).
- New equipment spec row in src/equipment.js: ['perfusion-pump', 'perfusion_pump', 'Pump_', ['Pump_Base','Pump_Head','Pump_Reservoir']].
- New isolation evidence file docs/blender-isolation-run-2026-11-02-pump.json: schema bioprinting-workbench/blender-isolation-run/1, ranAt, executedBy, blenderVersion, hostContext (the open owner scene name/path/object count), sceneFingerprint before/after with assertion equal, staging cleanup, exported file sha256, export stats (meshes/materials/triangles/blenderBounds), transfer method and hash equality, and the AUTHORING_CHECKS_PASSED marker.
- No TypeScript, no new enums beyond the asset id; no scenario/learning types.

[Files]

New: assets/author_perfusion_pump.py (authoring script in the author_incubator.py style); assets/perfusion_pump.glb (genuine live-Blender export, never a synthetic download or edit); docs/blender-isolation-run-2026-11-02-pump.json (dated evidence).
Modified: assets/manifest.json (regenerated with the fifth entry); src/equipment.js (fifth EQUIPMENT_SPECS row); src/scene.js (pumpMount + procedural fallback, placement on the bench beside the perfusion chamber, mount passed to createEquipmentAssets); tests/assets.test.js (pump GLB structural test: glTF magic/version/length/chunk, embedded buffers, mesh and material floors); tests/blender-evidence.test.js (pump evidence pin + manifest consistency for the new asset); index.html (footer v0.20.0-dev only; no new panels); package.json (0.20.0-dev); docs/VERIFICATION.md (run details + browser checks + honest scope), docs/ROADMAP.md (0.20 entry), docs/ATLAS.md (3D setup refresh section gains the pump), docs/HARDWARE_COSTS.md (pump line links its 3D counterpart), CHANGELOG.md; implementation_plan.md (this plan; 0.19 archived).

[Functions]

New: build_asset(output_path=None) in assets/author_perfusion_pump.py — creates BioWorkbench_Pump via create_owned_scene, builds the circuit, calls export_owned_scene to perfusion_pump.glb, returns the scene.
Modified: none in the shared Python helpers (authoring_common.py is reused unchanged and must not drift from its 2026-11-02 hash-verified copy).
Removed: none.

[Classes]

None (function-based authoring scripts and the existing equipment loader).

[Dependencies]

None. MCP for Blender (live, addon 1.8, Blender 5.1.2) authors and exports; no new npm packages; no runtime network for the app (the GLB is a static asset served by Pages).

[Testing]

- tests/assets.test.js: new test 'perfusion pump GLB is a valid self-contained glTF 2.0 asset' — magic glTF, version 2, length equals file length, chunk JSON, no external buffer URIs, meshes >= 20, materials >= 3; manifest sha256 equals the file hash (existing manifest consistency coverage extended to the pump entry).
- tests/blender-evidence.test.js: the dated pump evidence file exists and validates (schema, ranAt, blenderVersion, scene-fingerprint equality, AUTHORING_CHECKS_PASSED, exported sha256 equals the manifest entry), and the five-asset manifest matches the equipment spec list exactly.
- Full battery: node --test tests/*.test.js (150 + new), npm run check, git diff --check, npm run verify:release detached (all-allowed-assets and claims-language checks stay green).
- Connected-browser check on the local static server: diagnostics().equipment['perfusion-pump'].status === 'glb-loaded' with zero console errors, and the fallback path verified by reading diagnostics after disposing/reloading if feasible.
- Commit + push + live Pages verification (footer v0.20.0-dev, the new GLB and evidence JSON served HTTP 200) + doc-only record commit.

[Implementation Order]

1. Write assets/author_perfusion_pump.py in the house style (Pump_ prefix; base, head housing, three rollers, race segments, reservoir with cap and label, inlet/outlet tubing stubs, control box with display; ~30 meshes, <3,500 tris, arbitrary illustrative units, no vendor CAD claims).
2. Commit and push the author script alone so raw.githubusercontent.com serves it (asset-prep commit).
3. Live MCP run: staging fetch of author_perfusion_pump.py and authoring_common.py from raw.githubusercontent with sha256 comparison against the workspace copies; purge authoring modules from sys.modules; fingerprint the owner's scene (name, filepath, object names, active object, selection, mode) before and after; run the author script in a fresh owned scene; export to the host staging dir; read the GLB stats back through MCP for the evidence file.
4. Transfer: temporary HTTP listener on the Blender host (0.0.0.0:8765, background thread) serving the staging GLB; fetch it from the container at http://192.168.1.71:8765/perfusion_pump.glb; assert sha256 equality; shut the listener down and delete host staging. If the LAN path is unreachable, stop and record honestly rather than shipping an unverified asset.
5. Regenerate assets/manifest.json (Node, LF-normalized), write docs/blender-isolation-run-2026-11-02-pump.json from the live-run values.
6. Wire src/equipment.js and src/scene.js (mount + procedural fallback), extend tests/assets.test.js and tests/blender-evidence.test.js, run the asset suites green.
7. Docs pass (VERIFICATION, ROADMAP, ATLAS 3D section, HARDWARE_COSTS pointer, CHANGELOG) and footer/package.json to 0.20.0-dev.
8. Full battery, connected-browser glb-loaded check, commit + push, live Pages verification, doc-only record commit. Report the live-run provenance, the scene diagnostics, and what was not touched (owner scene unsaved; no scenario schema change).

---

# Implementation Plan

[Overview]

Deliver **v0.20.0-dev "The physical setups"**: author the missing peristaltic perfusion-pump circuit (the fourth physical-setup piece stage 4's equipment line names: "perfusion chamber · reservoir · peristaltic pump · tubing") as a genuine Blender-authored GLB, in the owner's live Blender 5.1.2 via MCP for Blender, with the same provenance discipline as the 2026-11-02 four-asset run: owner-scene fingerprint untouched, fresh owned scene, export without saving any .blend, sha-verified transfer, dated isolation evidence, and a manifest re-pin. Wire the asset into the scene with a procedural fallback, extend the asset/evidence tests, and ship through the full battery with live Pages verification. This is the fast-follow explicitly recorded in the 0.19 milestone.

[Context]

The four shipped GLBs (bioprinter 47 meshes/3,764 tris, incubator 26/2,536, microscope 20/2,288, perfusion-chamber 18/1,656) are pinned by docs/blender-isolation-run-2026-11-02.json; the pump is the missing fifth. authoring_common.py supplies create_owned_scene (refuses foreign scenes; marker asset_owner='bioprinting-workbench'), material(), box(), cylinder(), export_owned_scene (temporary window-scene switch, never saves a .blend). src/equipment.js: EQUIPMENT_SPECS rows [id, file, nodePrefix, requiredNodes] and validateEquipmentAsset (namespace, bounds, required nodes); createEquipmentAssets consumes mounts keyed by id with {parent, fallback}. Scene integration in src/scene.js near the existing chamberMount/chamberFallback. The 3D load diagnostics surface through diagnostics().equipment, so a live check can assert the pump reports glb-loaded. No scenario schema change in this milestone: an asset touches no learning or analysis state; /11 stays.

[Types]

- New manifest entry (assets/manifest.json): id 'perfusion-pump', file 'assets/perfusion_pump.glb', nodePrefix 'Pump_', requiredNodes ['Pump_Base','Pump_Head','Pump_Reservoir'], bytes, sha256, meshes, materials, triangles, blenderBounds [[minx,miny,minz],[maxx,maxy,maxz]] recorded from the live Blender run, maxBytes 358400 (house budget).
- New equipment spec row in src/equipment.js: ['perfusion-pump', 'perfusion_pump', 'Pump_', ['Pump_Base','Pump_Head','Pump_Reservoir']].
- New isolation evidence file docs/blender-isolation-run-2026-11-02-pump.json: schema bioprinting-workbench/blender-isolation-run/1, ranAt, executedBy, blenderVersion, hostContext (the open owner scene name/path/object count), sceneFingerprint before/after with assertion equal, staging cleanup, exported file sha256, export stats (meshes/materials/triangles/blenderBounds), transfer method and hash equality, and the AUTHORING_CHECKS_PASSED marker.
- No TypeScript, no new enums beyond the asset id; no scenario/learning types.

[Files]

New: assets/author_perfusion_pump.py (authoring script in the author_incubator.py style); assets/perfusion_pump.glb (genuine live-Blender export, never a synthetic download or edit); docs/blender-isolation-run-2026-11-02-pump.json (dated evidence).
Modified: assets/manifest.json (regenerated with the fifth entry); src/equipment.js (fifth EQUIPMENT_SPECS row); src/scene.js (pumpMount + procedural fallback, placement on the bench beside the perfusion chamber, mount passed to createEquipmentAssets); tests/assets.test.js (pump GLB structural test: glTF magic/version/length/chunk, embedded buffers, mesh and material floors); tests/blender-evidence.test.js (pump evidence pin + manifest consistency for the new asset); index.html (footer v0.20.0-dev only; no new panels); package.json (0.20.0-dev); docs/VERIFICATION.md (run details + browser checks + honest scope), docs/ROADMAP.md (0.20 entry), docs/ATLAS.md (3D setup refresh section gains the pump), docs/HARDWARE_COSTS.md (pump line links its 3D counterpart), CHANGELOG.md; implementation_plan.md (this plan; 0.19 archived).

[Functions]

New: build_asset(output_path=None) in assets/author_perfusion_pump.py — creates BioWorkbench_Pump via create_owned_scene, builds the circuit, calls export_owned_scene to perfusion_pump.glb, returns the scene.
Modified: none in the shared Python helpers (authoring_common.py is reused unchanged and must not drift from its 2026-11-02 hash-verified copy).
Removed: none.

[Classes]

None (function-based authoring scripts and the existing equipment loader).

[Dependencies]

None. MCP for Blender (live, addon 1.8, Blender 5.1.2) authors and exports; no new npm packages; no runtime network for the app (the GLB is a static asset served by Pages).

[Testing]

- tests/assets.test.js: new test 'perfusion pump GLB is a valid self-contained glTF 2.0 asset' — magic glTF, version 2, length equals file length, chunk JSON, no external buffer URIs, meshes >= 20, materials >= 3; manifest sha256 equals the file hash (existing manifest consistency coverage extended to the pump entry).
- tests/blender-evidence.test.js: the dated pump evidence file exists and validates (schema, ranAt, blenderVersion, scene-fingerprint equality, AUTHORING_CHECKS_PASSED, exported sha256 equals the manifest entry), and the five-asset manifest matches the equipment spec list exactly.
- Full battery: node --test tests/*.test.js (150 + new), npm run check, git diff --check, npm run verify:release detached (all-allowed-assets and claims-language checks stay green).
- Connected-browser check on the local static server: diagnostics().equipment['perfusion-pump'].status === 'glb-loaded' with zero console errors, and the fallback path verified by reading diagnostics after disposing/reloading if feasible.
- Commit + push + live Pages verification (footer v0.20.0-dev, the new GLB and evidence JSON served HTTP 200) + doc-only record commit.

[Implementation Order]

1. Write assets/author_perfusion_pump.py in the house style (Pump_ prefix; base, head housing, three rollers, race segments, reservoir with cap and label, inlet/outlet tubing stubs, control box with display; ~30 meshes, <3,500 tris, arbitrary illustrative units, no vendor CAD claims).
2. Commit and push the author script alone so raw.githubusercontent.com serves it (asset-prep commit).
3. Live MCP run: staging fetch of author_perfusion_pump.py and authoring_common.py from raw.githubusercontent with sha256 comparison against the workspace copies; purge authoring modules from sys.modules; fingerprint the owner's scene (name, filepath, object names, active object, selection, mode) before and after; run the author script in a fresh owned scene; export to the host staging dir; read the GLB stats back through MCP for the evidence file.
4. Transfer: temporary HTTP listener on the Blender host (0.0.0.0:8765, background thread) serving the staging GLB; fetch it from the container at http://192.168.1.71:8765/perfusion_pump.glb; assert sha256 equality; shut the listener down and delete host staging. If the LAN path is unreachable, stop and record honestly rather than shipping an unverified asset.
5. Regenerate assets/manifest.json (Node, LF-normalized), write docs/blender-isolation-run-2026-11-02-pump.json from the live-run values.
6. Wire src/equipment.js and src/scene.js (mount + procedural fallback), extend tests/assets.test.js and tests/blender-evidence.test.js, run the asset suites green.
7. Docs pass (VERIFICATION, ROADMAP, ATLAS 3D section, HARDWARE_COSTS pointer, CHANGELOG) and footer/package.json to 0.20.0-dev.
8. Full battery, connected-browser glb-loaded check, commit + push, live Pages verification, doc-only record commit. Report the live-run provenance, the scene diagnostics, and what was not touched (owner scene unsaved; no scenario schema change).

---

# Implementation Plan

[Overview]

Deliver **v0.19.0-dev "The write path"**: the owner's genome-backup-and-restore idea (sequencing the original genome to disk, keeping organic reserves, periodically writing it back into fast-dividing cells, editing for differentiation) gets promoted from the atlas prose desk to a full interactive evidence module with fresh verbatim-quoted open-access sources on what is real (digital backup, cell banking, CRISPR event recording) and what is theory (whole-genome write-back, edit-directed differentiation, and the mosaicism fact that there is no single "original" genome to restore) — plus a genuine live-Blender 3D update: a new peristaltic perfusion-pump asset authored in the owner's Blender 5.1.2 via MCP, exported as a real GLB, manifest-pinned with dated isolation evidence, and wired into the scene with a procedural fallback.

[Context]

The requested "latest" tissue targets (lung alveoli, gingiva, teeth, facial deep collagen, nerves, muscle/myonuclei, elite-lifter fascia) were all fetched and tiered hours ago in the v0.14 atlas (13 targets, 13 verbatim-quoted abstracts, docs/ATLAS.md); re-fetching them adds nothing. What does NOT yet exist: (1) an evidence module for the genome-restore idea — the atlas carries only a four-verdict prose desk; (2) any Blender-authored perfusion pump: the four shipped GLBs are bioprinter, incubator, microscope and perfusion_chamber, while stage 4's equipment line names "perfusion chamber · reservoir · peristaltic pump · tubing" and the reference bench lists a pump — the pump and reservoir are the missing physical setup; (3) a GitHub release for v0.18.0-dev (v0.17.0-dev has one). Fresh open-access anchors confirmed available: Takasugi et al. 2022 Genetics (PMC8733422, CRISPR recording demonstrated in zebrafish embryos), Waldvogel/Posey/Goodell 2024 Nat Rev Genet author manuscript (PMC11408116, mammals as genetically distinct clone mosaics), Zhang/Ma/Liu 2025 GPB review (PMC12449060, CRISPR application landscape). Existing pinned evidence is reused, not refetched: the base-editing snapshot (23 sha-pinned cards), the aging/geroscience partial-reprogramming claims, and the tissue-evidence catalog.

[Types]

New data structures (src/genome-restore.js):
- GENOME_RESTORE_SCHEMA = 'bioprinting-workbench/genome-restore-evidence/1'.
- Steps enum: ['digital-backup', 'organic-reserve', 'periodic-write-back', 'edit-directed-differentiation'] — the four steps of the owner's own proposal.
- Verdict enum: 'established-practice' | 'real-adjacent-research' | 'theory-only'.
- Catalog: sources[] (id, doi, journalYear, fullTextUrl, license, citation) and claims[] (id prefix 'genome-restore-', statement, verbatimQuote, locator, supportStatus 'reviewed', basis 'primary-text'|'secondhand-restatement', step (steps enum or 'context'), verdict (verdict enum), limitations[]).
- Selection: { selectedStepIds: string[] } — selectable steps only; context claims never selectable.
- Evaluated result: { status, selected: [{step, verdict, statement, anchors, blockers}], summary, notices } — the net verdict "two of four steps are real today, and the two that matter for the wish are open research questions" is computed, never upgraded.
- Learning-state key: genomeRestoreIdea { selectedStepIds: [] } (default empty), scenario schema 'bioprinting-workbench/11'.
- Asset manifest gains a fifth entry: id 'perfusion_pump', file 'assets/perfusion_pump.glb', nodePrefix 'Pump_', requiredNodes ['Pump_Base','Pump_Head','Pump_Reservoir'], with bytes/sha256/meshes/materials/triangles/blenderBounds recorded from the live Blender export.

[Files]

New: src/genome-restore.js (catalog + validator + evaluator); src/genome-restore-ui.js (learning-section sub-controller); tests/genome-restore.test.js; tests/fixtures/scenario-v11.json; docs/GENOME_RESTORE.md; docs/genome-restore-audit.json (verbatim quotes, locators, fetchDate); assets/author_perfusion_pump.py (Blender authoring script in the authoring_common.py house style); assets/perfusion_pump.glb (genuine live-Blender export); docs/blender-isolation-run-2026-11-02-pump.json (dated isolation evidence: host, version, owner-scene fingerprint untouched, staging cleanup).
Modified: src/cell-division.js (defaultLearningState + validateLearningState gain genomeRestoreIdea, allowlist 12→13 keys); src/cell-learning-ui.js (compose createGenomeRestoreUI); src/scenario.js (SCENARIO_SCHEMA /11, migrateScenarioV10 defaults genomeRestoreIdea with truthful warning, v2–v9 migration allowlists extended where they pin the learning keys, parseScenario dispatch); src/equipment.js (loader list gains the pump row with requiredNodes); src/scene.js (pump placement on the bench with a procedural fallback in the established incubator-fallback pattern); tests/scenario.test.js (/11 assertions, v10 migration test, fixture list + scenario-v11.json, forge cases); tests/assets.test.js (5th asset expectations); tests/blender-evidence.test.js (new dated evidence JSON pinned; manifest↔evidence consistency for the pump); index.html (learning-section panel + scenario-status prose Version 11 + footer 0.19.0-dev); package.json (0.19.0-dev); assets/manifest.json (regenerated from the live run); docs/SCENARIOS.md, docs/SOURCES.md, docs/ATLAS.md (ideas-desk section now points to the module), docs/HARDWARE_COSTS.md (pump line links the 3D counterpart), CHANGELOG.md, docs/VERIFICATION.md, docs/ROADMAP.md, README.md (module paragraph); implementation_plan.md (this plan; 0.18 archived below).

[Functions]

New: validateGenomeRestoreCatalog(raw), getGenomeRestoreCatalog(), validateGenomeRestoreSelection(raw), evaluateGenomeRestoreIdea(selection), getGenomeRestoreSteps(), defaultGenomeRestoreIdea() — all in src/genome-restore.js; createGenomeRestoreUI({ elements, onStateChange }) in src/genome-restore-ui.js (render/propose/setState/dispose mirroring hardware-costs-ui.js).
Modified: defaultLearningState() and validateLearningState() in src/cell-division.js (new key, validated through validateGenomeRestoreSelection); normalize(raw) and defaultAnalyses unchanged except schema string; migrateScenarioV3–V9 learning-key allowlists in src/scenario.js each gain 'genomeRestoreIdea' (their fixtures predate the module); migrateScenarioV10 added; parseScenario(value) dispatches v10.

[Classes]

None (module-function style per repo convention).

[Dependencies]

None. No new packages; no runtime network; MCP for Blender (already live, addon 1.8, Blender 5.1.2) is used for authoring and export; `gh` CLI creates the v0.18.0-dev GitHub release.

[Testing]

- tests/genome-restore.test.js: catalog integrity (steps/verdicts/basis enums, secondhand-restatement discipline, no selectable context claims, unique prefixed ids, verbatim quotes ≥60 chars, every step covered by ≥1 claim); evaluator verdicts (digital-backup + organic-reserve → established-practice; periodic-write-back + edit-directed-differentiation → theory-only; selection of theory steps yields the no-write-path blockers; empty selection → unconfigured status; summary never says "possible"/"safe"/"will"); forge rejections (unknown step id, duplicated ids, bad basis, missing not-fetched limitation, context claim made selectable); audit-verbatim equality with docs/genome-restore-audit.json (same contract as tissue-evidence).
- tests/scenario.test.js: /11 round-trip, v10 migration defaults genomeRestoreIdea with truthful warning, older fixtures still migrate (extended allowlists), new scenario-v11.json, reject cases (missing key, unknown step, /12 unknown schema).
- tests/assets.test.js + tests/blender-evidence.test.js: the pump GLB hashes and required nodes verified against the manifest; the new dated isolation evidence JSON pinned (ranAt, AUTHORING_CHECKS_PASSED equivalent, owner-scene fingerprint, cleanup) and manifest↔evidence consistency enforced for the new asset.
- Full battery: node --test tests/*.test.js (expect 146+7-ish, zero failures), npm run check, git diff --check, verify:release detached (claims-language scan must pass over the new authored text), connected-browser check (new panel renders, footer 0.19.0-dev, 0 console errors), commit/push, live Pages verification, doc-only VERIFICATION record.

[Implementation Order]

1. Evidence fetch + extraction: pull Takasugi 2022 (PMC8733422), Waldvogel 2024 (PMC11408116), Zhang 2025 (PMC12449060); extract verbatim sentences with the established anchor-slice-clean-verify extractor pattern; store /tmp quotes.
2. Author src/genome-restore.js with quotes injected via the token patcher (verbatim fidelity guaranteed), generate docs/genome-restore-audit.json from the runtime catalog, write tests/genome-restore.test.js, run green.
3. Scenario /11: cell-division.js learning key, scenario.js schema bump + migrateScenarioV10 + extended older-migration allowlists, tests/scenario.test.js updates, fixtures/scenario-v11.json; run the scenario suite.
4. UI: src/genome-restore-ui.js, wire into cell-learning-ui.js, index.html learning-section panel + Version 11 prose + footer 0.19.0-dev; package.json bump; local server browser check.
5. Docs: GENOME_RESTORE.md, SOURCES.md, SCENARIOS.md, ATLAS.md pointer, VERIFICATION/ROADMAP/CHANGELOG/README sections.
6. Blender asset: write assets/author_perfusion_pump.py (mirroring author_incubator.py conventions: pure procedural bpy construction, Pump_ node prefix, named materials, no scene-file mutation); commit and push the author script so raw.githubusercontent serves it; in the owner's live Blender via MCP: fetch to tempfile staging with sha verification, purge sys.modules of authoring modules, assert the owner's scene fingerprint untouched, run the author script in a fresh blend file, export GLB, transfer out via the working LAN-listener pattern, delete staging; regenerate assets/manifest.json from the exported file (Node side), LF-normalize, run assets tests; second commit with the GLB + evidence JSON + scene wiring + equipment loader row.
7. Full battery, push, live Pages verification, doc-only record commit, gh release create for v0.18.0-dev with honest notes.
8. Report: the two-of-four verdicts, the mosaicism point (no single original), the new asset's live-run provenance, what remains theory and untouched.

---

# Implementation Plan

[Overview]

Deliver **v0.18.0-dev "The shear tradeoff"**: the workbench's first physics-anchored teaching model of the core extrusion-bioprinting tradeoff — nozzle wall shear stress versus reported cell-viability evidence — closing the single biggest honest gap the repo itself declares (the Print stage and README state that material rheology, printability windows and cell-damage fluid mechanics are not modeled). The model is an idealized steady laminar capillary reference with two viscosity modes (hypothetical constant; the cited Cellink power-law fit from an open-access CC-BY paper), an explicit Reynolds-assumption check, Rabinowitsch-corrected wall shear rate for the shear-thinning mode, and a cited evidence layer that positions the computed stress against verbatim-quoted open-access values and viability bands. A secondary workstream fixes the README's stale publication-status prose (it still claims the live site is at v0.3).

[Context]

Source of the evidence layer (fetched 2026-11-02, CC-BY, full text open at PMC10261129): Gómez-Blanco JC, Pagador JB, Galván-Chacón VP, Sánchez-Peralta LF, Matamoros M, Marcos A, Sánchez-Margallo FM, "Computational simulation-based comparative analysis of standard 3D printing and conical nozzles for pneumatic and piston-driven bioprinting", Int J Bioprint 2023;9(4):730, DOI 10.18063/ijb.730. Verbatim-quotable anchors extracted and stored under /tmp/gomez.html: (a) the studied geometries — a Cellink 22G conical tip and an E3D V6.4 0.4 mm standard nozzle; (b) inlet conditions — 15 kPa pneumatic (as Cellink recommends) and 10 mm³/s piston-driven; (c) the fitted rheology "μ = 87.906 (γ̇)^−0.792" for Cellink bioink at 37 °C (K = 87.906, n = 0.208); (d) their CFD shear results — 455.43/242.16 Pa (pneumatic nozzle/cone) and 362.85/383.24 Pa (piston nozzle/cone), with a stated maximum of 455.43 Pa "more than ten times lower than the threshold proposed by Blaeser et al."; (e) the viability bands as restated by that paper — <5 kPa "high cellular viability up to 96%", 5–10 kPa "91%", >10 kPa "76%"; (f) secondhand context values — Liu et al. 30/180/300 Pa and ~160 Pa across 22–30G tips; (g) the framing sentence that shear matters more than nozzle inner pressure for viability. The underlying Blaeser and Liu papers are not open-access and are NOT fetched: every claim is a verbatim quote from the fetched CC-BY text, and restatement status is enforced by the validator, matching the repo's species/technology-separation honesty rules.

Physics core (all idealized, analytically verifiable, mirroring the oxygen slab and flow network house style): for nozzle inner diameter d, volumetric flow Q, radius r = d/2 — mean velocity U = Q/(πr²); Newtonian wall shear rate γ̇w = 4Q/(πr³) ≡ 8U/d; Newtonian wall shear τw = μγ̇w ≡ 8μU/d ≡ 32μQ/(πd³); Reynolds number Re = ρUd/μ with fixed hypothetical ρ = 1000 kg/m³ (laminar assumption flagged when Re > 2300, like the flow network's numerical-failure honesty). Shear-thinning mode uses the cited power law with the standard Rabinowitsch correction for power-law pipe flow γ̇w,corr = ((3n+1)/(4n))·4Q/(πr³), τw = K·γ̇w,corr^n. Continuity property (tested): with K = μ0 and n = 1 the shear-thinning branch reduces exactly to the Newtonian branch. Calibration-relevant sanity anchor (tested and stated in docs): at the paper's piston input (d = 0.4 mm, Q = 10 mm³/s, K = 87.906, n = 0.208) the idealized reference gives τw ≈ 468 Pa versus the paper's CFD 362.85–383.24 Pa — same order, ~20% gap attributed honestly to the contraction/drop geometry the idealization omits; the module states this as context, not reproduction.

[Types]

New data structures (src/nozzle-shear.js):
- NOZZLE_SHEAR_MODEL = 'idealized-steady-laminar-capillary-shear-reference' (model string).
- Settings: { diameterUm: number [60, 600], flowMm3PerS: number [0.001, 100], viscosityMode: 'hypothetical-constant' | 'cited-cellink-fit', viscosityPas: number [0.01, 200] (used only in constant mode), parameterOrigin: 'hypothetical-controls' | 'cited-fit-application' }.
- Evidence catalog schema 'bioprinting-workbench/nozzle-shear-evidence/1': sources[] { id, doi, journalYear, fullTextUrl, license } and claims[] { id, statement, verbatimQuote, locator, supportStatus: 'reviewed', basis: 'primary-text' | 'secondhand-restatement', context: 'cfd-simulation' | 'rheology-fit' | 'inlet-conditions' | 'viability-context-restated', limitations: string[] }.
- Evaluated result: { status, diameterUm, flowMm3PerS, viscosityMode, apparentViscosityPas, meanVelocityMmPerS, wallShearRatePerS, wallShearStressPa, ratioToLowBandPa, band: 'below-reported-context' | 'low' | 'medium' | 'high', reynoldsNumber, laminarAssumptionHolds, assumptions: string[], notices: string[], claims: [...] }.
- Scenario /10: analyses.nozzleShear = { settings, parameterOrigin } (mirrors oxygen3d).

[Files]

New: src/nozzle-shear.js (physics + validation + catalog + evaluator); src/nozzle-shear-ui.js (sub-controller, pattern of hardware-costs-ui.js); tests/nozzle-shear.test.js (analytic verification, band boundaries, power-law continuity, forging rejections, audit-verbatim equality); tests/fixtures/scenario-v10.json; docs/NOZZLE_SHEAR.md (guide with formulas, cited comparison and limitations); docs/nozzle-shear-audit.json (fetchDate, source, verbatim quotes with locators).
Modified: index.html (new panel after the resistance-network panel: inputs nozzle-diameter, nozzle-flow, nozzle-viscosity-mode, nozzle-viscosity, SVG nozzle-chart with band markers, nozzle-status, nozzle-values table, quoted-evidence list, micro notices; scenario-status prose Version 9→10; footer 0.18.0-dev); src/app.js (create/restore/export nozzleShear state beside analysisUI; wire applyScenario); src/scenario.js (SCENARIO_SCHEMA 'bioprinting-workbench/10', normalize gains analyses.nozzleShear, defaultAnalyses gains defaults, migrateScenarioV9 added with truthful warning, parseScenario dispatch); package.json (0.18.0-dev); docs/SCENARIOS.md, docs/SOURCES.md, CHANGELOG.md, docs/VERIFICATION.md, docs/ROADMAP.md, README.md (0.18 module paragraph + the stale "published v0.3 / unpublished working-tree extensions" section rewritten to current truthful state); tests/scenario.test.js (/10 normalization + v9 migration tests); implementation_plan.md (this plan; 0.17 archived verbatim).

[Functions]

New: validateNozzleShearSettings(raw), evaluateNozzleShear(settings), getNozzleShearCatalog(), validateNozzleShearCatalog(raw), NOZZLE_SHEAR_DEFAULTS — all in src/nozzle-shear.js; createNozzleShearUI({ elements, onStateChange }) in src/nozzle-shear-ui.js with render/propose/setState/getState/diagnostics/dispose.
Modified: defaultAnalyses(parameters) in src/scenario.js (adds nozzleShear defaults); normalize(raw) in src/scenario.js (validates nozzleShear, keeps analyses key allowlist updated); parseScenario(value) in src/scenario.js (adds the v9 branch); createCellLearningUI untouched; scenarioState() in src/app.js (adds nozzleShear from the new controller); applyScenario in src/app.js (restores nozzleShear).

[Classes]

None (module-function style throughout, per repo convention).

[Dependencies]

None. No new packages; no runtime network; all literature quotes are baked into authored source with an audit JSON, per repo policy.

[Testing]

- tests/nozzle-shear.test.js: (1) analytic identities 4μQ/(πr³) === 8μU/d === 32μQ/(πd³) within 1e-9 relative; (2) band boundaries 4999.99/5000.01 and 9999.9/10000.1 with the 'below-reported-context' class under 30 Pa context floor... (band rule: τ < 455.43 Pa → 'below-reported-context'; 455.43–5000 → 'low'; 5000–10000 → 'medium'; > 10000 → 'high'; boundary values tested); (3) power-law continuity K=μ0, n=1 equals the Newtonian branch; (4) the piston-input anchor ≈ 468 Pa ± 0.5% with the doc-stated ~20% CFD gap as context assertion (468 not equal to CFD values; assert ratio in [1.15, 1.30]); (5) Reynolds flag at high flow; (6) forged-catalog rejections (bad schema, wrong basis enum, restated claim without limitation, unknown context, duplicate ids, short quotes); (7) verbatim equality: every catalog verbatimQuote appears in the shipped audit JSON with identical text, locators equal, source doi equal — same contract as tests/tissue-evidence.test.js.
- tests/scenario.test.js: /10 round-trip normalization, v9 migration defaults nozzleShear with truthful warning, older-version chain (v8→/10 via v9) still warns per step; new fixture scenario-v10.json (minimal valid /10 scenario).
- Existing suites must stay green: claims-language scanner (scan-claims.mjs PASS over the new authored text — the module must not say "will", "proven", "guarantees", "safe"); authoring-isolation static checks unaffected; assets/evidence suites untouched.
- Full battery: node --test tests/*.test.js (expect 145+ passed), npm run check, git diff --check, verify:release detached (all PASS), local-server browser check (new panel renders, footer 0.18.0-dev, 0 console errors), commit/push, live Pages verification, doc-only record commit.

[Implementation Order]

1. Author src/nozzle-shear.js: constants, settings validation, physics evaluator (both viscosity modes), cited catalog with verbatim quotes + validator; re-extract exact quote strings from /tmp/gomez.html in the same run to guarantee character-for-character verbatim fidelity (reference-number artifacts like "[ 38 ]" preserved as they appear in the text layer).
2. Write docs/nozzle-shear-audit.json from the same extraction; write tests/nozzle-shear.test.js; run it to green.
3. Author src/nozzle-shear-ui.js; add the index.html panel; wire src/app.js (state, export, restore); footer 0.18.0-dev; run local server and browser-check the panel.
4. Scenario /10: src/scenario.js schema bump + defaults + migrateScenarioV9 + parseScenario dispatch; scenario-status prose; tests/scenario.test.js additions + fixtures/scenario-v10.json; run scenario suite.
5. Docs: NOZZLE_SHEAR.md, SCENARIOS.md (/10 chain), SOURCES.md (Gómez-Blanco entry), CHANGELOG 0.18, VERIFICATION 0.18, ROADMAP follow-on, README (module paragraph + stale publication-status section rewritten truthfully).
6. Full battery + claims scanner + verify:release detached; commit/push; live Pages verification; doc-only record commit.
7. Report: what the module teaches, the honest 468-vs-~380 Pa idealization gap, what remains not-modeled (no species/clinic claim, no exposure-time biology, secondhand bands labeled).

---

# Implementation Plan

[Overview]

Deliver **v0.17.0-dev "Blender, actually used — and the GitHub side catches up"**: run the live-in-Blender isolation checks for the first time by transferring the authoring scripts through the connected Blender MCP channel (the previous blocker — the owner's Blender host cannot see /workspace — is solved by shipping file content, not paths); record the run as a continuously re-checked evidence artifact; and close the concrete GitHub gaps the owner's "Update the github?" question exposes: the repo's homepage is null despite live Pages, it has zero topics, zero releases, and the owner's profile README does not list the project at all.

[Workstream A — Live Blender isolation run (the previously-impossible check)]

The connected Blender is 5.1.2 (addon 1.8, protocol 15, telemetry off). Plan: (1) stage a temp directory on the Blender host (Blender's own `tempfile.gettempdir()`), never the user's scenes or a .blend; (2) transfer the six python files (assets/authoring_common.py 4857 B, author_bioprinter.py 4325 B, author_incubator.py 2371 B, author_microscope.py 2102 B, author_perfusion_chamber.py 1758 B, tests/blender_authoring_check.py 4662 B — about 20 KB, ~27 KB as base64) in chunked `execute_blender_code` calls that append decoded base64 into the staging tree (assets/ and tests/ layout preserved so the check script's `Path(__file__).resolve().parents[1]` root logic works); (3) run `run_checks(staging)` inside Blender: the script itself asserts foreign-scene fingerprints unchanged, second-generation reruns without data-block leaks, forced export failures handled, all node names carry the asset prefixes, size limits hold, and it exports the four GLBs into the staging dir and prints `AUTHORING_CHECKS_PASSED` plus a JSON entries list; (4) return the entries JSON and the staging-regenerated manifest to the container; (5) delete the staging directory from the Blender host (leave the owner's machine clean); (6) if Blender 5.x API changes break the 0.14-era script, adapt the staged copy live, run it, and record the adaptation honestly in the evidence — the repo copy stays canonical and the adaptation is folded back into the repo script so future runs work unmodified.

Repo GLBs are NOT replaced: fresh exports from Blender 5.1.2 may differ byte-wise from the shipped files (different Blender version than the original generation; the shipped files are hash-pinned by the manifest and structure-tested). The evidence records the per-asset comparison (bytes/sha256/meshes/materials/triangles match-or-diverge) instead of silently swapping bytes. If, exceptionally, every structural count matches and only bytes differ, that is recorded as version-difference, not defect.

[Workstream B — Evidence wiring and version bump]

- New artifact `docs/blender-isolation-run-2026-11-02.json`: schema `bioprinting-workbench/blender-isolation-run/1` with blenderVersion, ranAt, stagingCleanupConfirmed, entries (id, bytes, sha256, meshes, materials, triangles, blenderBounds, maxBytes, nodePrefix, requiredNodes), shippedComparison (per asset: structural counts equal true/false, byteEqual true/false), and the run's pass/fail verdict. Written from the live run's own output, not hand-authored.
- New `tests/blender-evidence.test.js`: asserts the evidence file exists and parses; asserts the run verdict is a pass and staging cleanup is confirmed; asserts every evidence entry's meshes/materials/triangles/requiredNodes match the shipped `assets/manifest.json` entry for the same asset — so any future GLB change that breaks consistency with the recorded live run fails tests until a fresh live run is recorded.
- `scripts/verify-release.mjs`: the not-run row for the live Blender isolation checks keeps its not-run status for the script itself (the release script still cannot execute Blender) but its notes now point at the recorded live-run evidence path; the 0.16 static checks remain companions.
- Version bump: `index.html` footer and `package.json` to `0.17.0-dev`.
- Docs: VERIFICATION.md 0.17 section (live-run method, results, what was and was not done), CHANGELOG.md 0.17 entry, docs/ROADMAP.md follow-on section, `implementation_plan.md` (this plan; the 0.16 plan archived verbatim below the divider).

[Workstream C — GitHub updates ("Update the github?")]

The push itself was already current (main at 655703e in sync). What is actually missing on the GitHub side, to be fixed with `gh api`:

1. **Repo metadata** (`repos/dylanstechmann/bioprinting-workbench`): set `homepage` to the live Pages URL (currently null despite the site being live); set `topics` to an honest set — bioprinting, tissue-engineering, simulation, education, browser, vanilla-javascript (no hype topics; nothing implying clinical use).
2. **First release**: after the v0.17.0-dev push, create annotated tag `v0.17.0-dev` and a GitHub release documenting the 0.10→0.17 arc in house style: AI-assisted personal learning project, teaching simulation only, not biologically calibrated, no laboratory work performed, evidence and verification records in docs/. Reversible by the owner (a release can be edited or deleted).
3. **Profile repo** (`dylanstechmann/dylanstechmann`): README "The stack" table does not list bioprinting-workbench; add one row (project name, role line in the table's existing voice, live Pages link), keeping the personal-hobby framing intact per workspace AGENTS.md. Commit and push.
4. **regen-workbench metadata**: has_pages=true but homepage=null — set homepage to its Pages URL only if the Pages site is the research desk UI; otherwise leave and report. Metadata only; no content changes.

[Types]

New evidence record type `docs/blender-isolation-run-2026-11-02.json` as specified in Workstream B. No catalog or learning-state schema changes; no scenario bump.

[Files]

New: `docs/blender-isolation-run-2026-11-02.json` (generated from the live run), `tests/blender-evidence.test.js`.
Modified: `scripts/verify-release.mjs` (not-run row notes point at the evidence), `index.html` (footer 0.17.0-dev), `package.json` (0.17.0-dev), `docs/VERIFICATION.md`, `CHANGELOG.md`, `docs/ROADMAP.md`, `implementation_plan.md` (archive + new plan), `assets/authoring_common.py` and/or `assets/author_*.py` and `tests/blender_authoring_check.py` ONLY if the live run exposes Blender 5.x API incompatibilities (fold the adaptation back into the repo; then re-run the 34 static invariants and the assets suite).
Companion repos: `dylanstechmann/README.md` (one stack-table row).

[Functions]

New: none in src/ (this milestone is verification machinery, not catalog logic). Test-side: the assertions described in tests/blender-evidence.test.js. Blender-side: `run_checks(root)` executes live as-is (or adapted per Workstream A step 6).

[Classes]

None.

[Dependencies]

None. The Blender MCP channel is the only integration used (already connected, up to date, telemetry consent off). No npm packages; no runtime network calls; the app itself is unchanged.

[Testing]

- The live run itself is the primary validation; its printed AUTHORING_CHECKS_PASSED marker and entries JSON are captured to the evidence file.
- `tests/blender-evidence.test.js` pins the evidence contract and its consistency with the shipped manifest (structural counts).
- Full battery after the bump: node --test tests/*.test.js (expect 138 passed: 136 + 2 evidence tests), npm run check, git diff --check, verify:release detached (all PASS; two scripted honesty checks remain; live-Blender row stays script-not-run but evidence-noted).
- Connected-browser check: footer v0.17.0-dev, no console errors, hardware panel unchanged.
- Companion-repo change (profile README) is documentation-only; verify the table renders in the live profile README after push.

[Implementation Order]

1. Stage and transfer the six python files to the Blender host via chunked execute_blender_code; verify staging tree integrity by hashing the written files inside Blender and comparing against container-side hashes.
2. Run the live isolation checks inside Blender; capture entries + staging manifest; delete the staging directory.
3. Write docs/blender-isolation-run-2026-11-02.json from the live output (payload-JSON pattern to survive transport); fold back any API adaptations into the repo scripts and re-run the static invariants if needed.
4. Write tests/blender-evidence.test.js; run it.
5. Wire the verify-release not-run row notes to the evidence path.
6. Version bump (footer + package.json).
7. Docs pass: VERIFICATION, CHANGELOG, ROADMAP, implementation_plan archive.
8. Full battery (tests, check, whitespace, verify:release detached, browser).
9. Commit, push, live Pages verify.
10. GitHub updates: repo homepage + topics; first release v0.17.0-dev with honest notes; profile README stack row (commit + push); regen-workbench homepage check (metadata only).
11. Final report: what "update the github" concretely meant (already-current push; the real gaps were homepage/topics/releases/profile listing), why Blender went unused before and how it is used now, and the state of the other repos (report-only).

---

# Implementation Plan

[Overview]

Deliver **v0.16.0-dev "Anchors and honesty machinery"**: turn two long-standing compensations into first-class scripted checks, and — now that vendor pages are fetchable from this environment for the first time — anchor every hardware price that can be honestly fetched through the validator's reserved `fetched-list-price` path, recompute the reference totals, and update every string that pins them. Workstream 1: an in-repo **claims-language scanner** (Node, no python needed) that mechanically scans authored `src/` text for overclaim, procedure-imperative and human-outcome language, wired into `verify:release` as a real PASS check with unit tests (the external historical scanner stays honestly not-run; this adds a runnable sibling, not a fake of it). Workstream 2: **authoring-isolation static checks** (Node) verifying the five Blender authoring scripts keep their safety invariants textually, also wired as a PASS check — while the live-in-Blender isolation row stays not-run, honestly distinguished. Workstream 3: **price anchoring** — fetch specific product pages (adafruit product pages parse cleanly at HTTP 200; sigmaaldrich, creality and thermofisher reachable; fishersci returns 403 so its nine parts stay authored-estimates; the two open-perfusion-rig GitHub lines carry no list price and stay estimates), parse list prices conservatively, switch clean matches to `fetched-list-price` with fetch dates, recompute one-time/recurring totals, and update the four places the old totals are pinned. No scenario-schema change; no learning-state change.

[Types]

**Price-basis record extension** (`src/hardware-costs.js`): the `part()` factory gains two optional trailing parameters so anchored parts can carry `priceBasis: 'fetched-list-price'` and `fetchDate: 'YYYY-MM-DD'` (validator already enforces: fetched prices require a fetch date; estimates must keep `fetchDate: null`). The catalog notice text changes from "public vendor pages could not be fetched" to a truthful mixed-basis statement naming which vendors were anchored, which were blocked (fishersci 403) and which carry no list price (GitHub companion lines). Expected anchored candidates (fetch-and-verify, not assumed): the three adafruit parts (NEMA17 stepper, GRBL-class controller, 12 V enclosed PSU), sodium alginate and possibly gelatin/calcium-chloride at sigmaaldrich, the motion-platform printer at creality, and the two thermofisher recurring lines (medium, FBS) if their product pages parse. Every fetch attempt is logged; only pages returning an unambiguous, single-product list price are anchored; ambiguous pages stay estimates with the attempt recorded.

**Claims-scan finding type** (`scripts/scan-claims.mjs`): `{ finding: string, file: string, line: number, pattern: string, severity: 'high'|'medium' }`. Pattern families (all case-insensitive, word-boundary aware, applied to `src/*.js` string literals only — the scanner strips code structure conservatively by scanning raw file text with documented false-positive handling): outcome-assertion (`will (cure|regenerate|restore|heal)`, `guarantees? (repair|function|safety)`, `clinically proven`), imperative-procedure (`you (should|must) (inject|take|administer|implant)`, direct second-person dosing), and human-outcome upgrade (`safe (for|in) humans?`, `established (for|in) humans?` without an adjacent negation such as `not`/`no`/`un`). Findings on lines within an explicit `ALLOWLIST` (documented, e.g. disclosure footers that quote the boundary itself) are recorded as `reviewed` and do not fail the check. The check fails on any unreviewed finding.

**Authoring-isolation invariant type** (`scripts/check-authoring-isolation.mjs`): a list of textual invariants over `assets/authoring_common.py` and the four `assets/author_*.py` files — each imports `authoring_common`; each calls `create_owned_scene` and `export_owned_scene`; no author file references `bpy.data.scenes.remove`, `bpy.ops.wm.save`, `.blend` writes or `os.remove`; scene removal and refusal logic live only in `authoring_common.py`; every `box(`/`cylinder(` name literal in author files starts with the asset's required node prefix (`Printer_`, `Incubator_`, `Microscope_`, `Chamber_`); the ownership marker constant (`OWNER = 'bioprinting-workbench'`) is present in `authoring_common.py`.

[Files]

New:

- `scripts/scan-claims.mjs` — `scanClaims(directory)` → `{ findings, reviewed, summary }`; also a `main` that prints findings and exits non-zero on unreviewed findings.
- `scripts/check-authoring-isolation.mjs` — `checkAuthoringIsolation(directory)` → invariant results list; throws on any violated invariant.
- `tests/scan-claims.test.js` — synthetic positive/negative samples (a temp fixture string set exercised through the pattern functions), the documented-allowlist behavior, and an assertion that the real `src/` scan returns zero unreviewed findings.
- `tests/authoring-isolation.test.js` — asserts the real asset scripts satisfy every invariant, and that the checker rejects deliberately broken samples.

Modified:

- `src/hardware-costs.js` — factory gains `priceBasis`/`fetchDate` parameters; anchored parts switch basis with product-page `sourceUrl` and `fetchDate: '2026-11-02'`; catalog notices rewritten truthfully (mixed bases, blocked vendors, no-price sources).
- `scripts/verify-release.mjs` — two new checks: `claims-language scan` (runs `scanClaims`, PASS when zero unreviewed findings) and `authoring-isolation static checks` (runs `checkAuthoringIsolation`); the `not-run` list drops none (the live Blender isolation row and the external claims-scanner review row stay not-run with sharpened notes distinguishing the new in-repo static scans from the external/live checks they complement).
- `tests/hardware-costs.test.js` — totals re-pinned to the post-anchoring values; new assertions: at least one part carries `fetched-list-price` with a valid fetch date; every fishersci-sourced part still carries `authored-estimate` with `fetchDate: null`; fetched and estimate parts never mix basis rules.
- `index.html` — hardware panel intro rewritten (anchored vs estimated wording, new totals); footer `v0.16.0-dev`.
- `package.json` — `0.16.0-dev`.
- `docs/HARDWARE_COSTS.md` — per-part table gains basis and fetch-date columns; a new "Fetch attempts (2026-11-02)" section records every vendor attempt: anchored, blocked (fishersci 403), or no-list-price (GitHub); summary totals updated.
- `docs/SOURCES.md` — 0.16 ledger rows for each anchored price (URL + date + what the page showed).
- `CHANGELOG.md`, `docs/ROADMAP.md`, `docs/VERIFICATION.md` — 0.16 sections; VERIFICATION records the new scripted checks and the first anchored prices.
- `implementation_plan.md` — this plan; the 0.15 plan archived verbatim below the divider.

[Functions]

New: `scanClaims(directory)` (scripts/scan-claims.mjs), `checkAuthoringIsolation(directory)` (scripts/check-authoring-isolation.mjs).

Modified: `part(...)` (src/hardware-costs.js — two optional trailing parameters, no call-site breakage for estimate parts); `verifyRelease` (scripts/verify-release.mjs — two check rows added ahead of the not-run loop).

[Classes]

None — the scanner and isolation checker are function modules returning plain data, matching house convention.

[Dependencies]

None. All price fetches happen once, agent-side, at plan-execution time (2026-11-02) and ship as static strings with dates — identical to the evidence-catalog pattern; the app itself still performs no network calls. The fishersci 403 is recorded, not retried indefinitely.

[Testing]

- `tests/scan-claims.test.js`: (a) pattern functions flag synthetic overclaims ("will regenerate tissue", "you must inject", "safe in humans") and reject honest negatives ("no reviewed method is safe in humans", "not established in humans"); (b) allowlisted disclosure text is recorded as reviewed, not a failure; (c) the live scan over the real `src/` returns zero unreviewed findings (the catalogs' honesty language passes by design — negation-aware patterns are required for this to hold).
- `tests/authoring-isolation.test.js`: real assets pass all invariants; mutated samples (an author script that calls `bpy.data.scenes.remove`, one missing the `authoring_common` import, one with an unprefixed node name) are rejected by the checker.
- `tests/hardware-costs.test.js`: re-pinned totals (cell-capable and acellular, one-time and monthly — exact values depend on which fetches anchor cleanly and are computed during implementation); basis assertions as above; chart/UI suite re-run because `hardware-costs-ui.test.js` may reference part counts (not prices — verify).
- Full suite + `npm run check` + `git diff --check` + `verify:release` (two new PASS rows) + connected-browser check (footer v0.16.0-dev, panel shows anchored/estimated wording, totals match, 0 console errors).

[Implementation Order]

1. Write `scripts/scan-claims.mjs` + `tests/scan-claims.test.js`; run; iterate patterns until the real-src scan is clean.
2. Write `scripts/check-authoring-isolation.mjs` + `tests/authoring-isolation.test.js`; run.
3. Wire both into `scripts/verify-release.mjs` with sharpened not-run notes; run verify:release detached.
4. Price-anchoring fetch pass: fetch candidate product pages, parse conservatively, log every attempt to /tmp for the docs table; decide the anchored set.
5. Extend `src/hardware-costs.js` (factory + anchored parts + notices); recompute totals; update `tests/hardware-costs.test.js` and run the hardware suites.
6. Update `index.html` panel + footer, `package.json`.
7. Docs: HARDWARE_COSTS.md (basis columns + attempts section), SOURCES 0.16 rows, CHANGELOG, ROADMAP, VERIFICATION.
8. Full verification battery; connected-browser check.
9. Commit, push, verify live Pages (footer v0.16.0-dev, updated panel text and served docs), doc-only live-verification commit, push.

---

# Archived plans

## Archived 0.15.0-dev plan — implemented, committed 3633235 + 8b45306 and pushed to main on 2026-11-02; preserved verbatim below

# Implementation Plan

[Overview]

Close the honest gaps in v0.14 with **v0.15.0-dev**: a **scaffold-methods survey** (the "various established/experimental/theoretical methods… scaffolding… vascularization… biochemical" ask the original prompt named and v0.14 under-covered), a second **ideas-desk entry** (myonuclear "muscle memory", anchored to the 2010 PNAS overload-myonuclei study), a **machine-checked snapshot** of the sibling base-editing-evidence catalog replacing prose-only citation of that repo, **finishing the 3D plural** by refreshing the remaining three GLBs (incubator, perfusion chamber, microscope) with the same Node-surgery pattern proven on the bioprinter, and a **reciprocal cross-reference commit** into the one sibling repo whose tree is clean (regen-workbench). Companion-repo handling is decided by investigation, not preference: anagen and base-editing-evidence both carry **uncommitted prior work** (`M docs/atlas.js`, `M ABE8E_Y149V_REVIEW.md`) and this container cannot run base-editing-evidence's packaged provenance tools (python stdlib broken, no workspace-control), so those repos are reported-not-modified — the snapshot pins their committed state instead (studies.json sha256 50893e27d59cab60ddc23e5a7f89ef6d6fa5bb851bd55e49ededfe3fbdbc69d at commit 4d49f75, data file itself clean).

[Types]

**New evidence claims** (`SCAFFOLD_EVIDENCE_SCHEMA = 'bioprinting-workbench/scaffold-evidence/1'`; 9 sources / 9 claims, species `'other'` for all — reviews, in-vitro and animal-model work; fetched 2026-11-02 from Europe PMC; verbatim quotes in `docs/scaffold-evidence-audit.json`):

1. `co-swift-2024` / `coaxial-sacrificial-vessels` — PMID 39092638, 10.1002/adma.202401528 — coaxial sacrificial writing into functional tissue: hierarchically branching, multilayered vascular networks with smooth-muscle-cell-laden shells around perfusable lumens, in granular and densely cellular matrices.
2. `sacrificial-vascularization-review-2026` / `sacrificial-biofabrication-family` — PMID 40922624, 10.1002/adma.202507747 — review defining sacrificial biofabrication for vascularization: temporary templates removed to leave defined channels, taxonomy of stimuli-responsive sacrificial materials.
3. `fresh-collagens-2025` / `fresh-collagen-isoforms` — PMID 39622052, 10.1021/acsbiomaterials.4c01826 — FRESH support-bath printing extended beyond collagen I to type II, III and combination bioinks with comparable fidelity.
4. `cell-only-bath-2026` / `cell-only-ink-alignment` — PMID 42326069, 10.1016/j.mtbio.2026.103308 — MSC-only bioinks printed into a methacrylated xanthan support bath; geometric confinement directs collagen alignment in fibrocartilage.
5. `volumetric-optogenetics-2026` / `volumetric-post-print-stimulation` — PMID 42573182, 10.1002/adma.74563 — tomographic volumetric bioprinting repurposed for post-printing optogenetic activation of light-responsive protein switches deep inside centimeter-scale constructs.
6. `dlp-review-2026` / `dlp-bioink-landscape` — PMID 42436547, 10.1186/s13036-026-00718-w — DLP review: resolution/speed/gentle cell handling; bioink advances including methacrylated natural polymers, dECM-derived hydrogels, hybrid nanocomposites, cell-laden formulations.
7. `in-situ-wounds-2026` / `in-situ-design-rules` — PMID 42956823, 10.1177/08853282261503314 — in-situ bioprinting at wound interfaces as a clinically driven design-rule framework; on-site deposition at point-of-care; lab-only validation gap named.
8. `gdnf-gradient-2015` / `gradient-nerve-conduits` — PMID 26352518, 10.1016/j.biomaterials.2015.08.054 — synthetic PEG-heparin-laminin microsphere nerve conduits forming reversible GDNF concentration gradients for motor-axon extension.
9. `shape-morphing-4d-2026` / `four-d-programmed-morphing` — PMID 42196067, 10.3390/gels12050382 — proof-of-concept 4D bioprinting: shape-morphing encoded during fabrication by layer-by-layer crosslink-density variation in GelMA; controlled bending on swelling.

**Method catalog** (`SCAFFOLD_METHODS`, 8 entries; maturity mirrors the owner's words "established/experimental/theoretical"): `{ id, label, maturity: 'established'|'experimental'|'theoretical', whatItDoes, limits, anchorClaimIds }` (anchors may resolve into the new scaffold catalog or existing catalogs — extrusion multimaterial re-anchors the existing Kolesky claim, resolved at implementation time by listing the cell-evidence catalog ids, not guessed here):

1. `extrusion-multimaterial` (established) — the 0.9-era foundation; anchors the existing Kolesky multimaterial claim.
2. `embedded-support-bath` (established) — FRESH and gel baths hold soft inks during printing; limits: bath mechanics and ink diffusion; anchors [fresh-collagen-isoforms].
3. `sacrificial-biofabrication` (experimental) — print the negative space, wash it out; limits: template removal completeness, endothelialization, anastomosis; anchors [coaxial-sacrificial-vessels, sacrificial-biofabrication-family].
4. `dlp-photocuring` (established) — light-patterned crosslinking; limits: phototoxicity, depth, bioink photochemistry; anchors [dlp-bioink-landscape].
5. `volumetric-tomographic` (experimental) — whole-volume light-field curing in seconds plus post-printing light control; limits: optics, cell density, opacity; anchors [volumetric-post-print-stimulation].
6. `cell-only-support-bath` (experimental) — cells as the ink, bath as the mold; limits: fusion time, mechanics, scale; anchors [cell-only-ink-alignment].
7. `in-situ-printing` (experimental) — print directly in the wound; limits: hostile environments, deformation, regulation; anchors [in-situ-design-rules].
8. `factor-gradient-conduits` (established, material-side) — reversible growth-factor gradients in synthetic conduits; limits: factor stability, single-factor bias; anchors [gradient-nerve-conduits].
9. `four-d-shape-morphing` (theoretical/proof-of-concept) — print today's crosslink density to command tomorrow's shape; limits: hydrogel-only demos, no tissue application reviewed; anchors [four-d-programmed-morphing].

**Second ideas-desk record** (`MYONUCLEAR_MEMORY_IDEA`, non-interactive): steps — overload adds myonuclei before hypertrophy (verdict `measured-in-mice`, anchor `myonuclei-retained-through-atrophy` — new tissue-evidence claim from PMID 20713720, 10.1073/pnas.0913935107, Gundersen 2010 PNAS: in-vivo imaging shows new myonuclei added before major size increase and retained through denervation atrophy; species `mouse`); retention through detraining (same anchor); transfer to elite-athlete muscle printing in humans (verdict `theory`, no reviewed method; cross-references the existing aspiration entry and the myonuclei-pipeline anchor). Notices: no training advice, nothing performed. This adds ONE new claim to the tissue-evidence catalog (13 claims total there).

**Companion snapshot type** (`docs/base-editing-snapshot.json`): `{ schema, source: { repo: 'base-editing-evidence', commit: '4d49f75', studiesJsonSha256: '50893e27…', snapshotDate: '2026-11-02', note: 'read-only mirror; source tree carried an uncommitted review-doc modification not reflected here; data file matches the committed state' }, cards: [{ id, title, stage, intervention_class, source_url }], stageCounts: { human_cells: 7, animal: 7, plant: 3, human_cohort: 2, human_case: 1, human_trial: 3 } }` — no limits text copied wholesale, no outcome claims imported (NEIGHBORS.md compliance: the snapshot backs the genome-restore idea's LIMITS statements, it does not import sibling results as evidence).

No scenario-schema change: **`/9` stays**; the methods survey and second idea are reference content with no learning record, no UI selection state.

[Files]

New (bioprinting-workbench):

- `src/scaffold-evidence.js` — 9 sources + 9 claims, validator mirroring the other evidence catalogs with collision checks against all five existing claim-id sets.
- `src/scaffold-methods.js` — `SCAFFOLD_METHODS` (9 entries above), notices, `getScaffoldMethods`, `validateScaffoldMethods` (maturity enum, anchors resolve across all six catalogs, whatItDoes/limits required, at least one method per maturity tier), `evaluateScaffoldMethods` — no-op-free reference summary (strongest maturity present, no human-outcome inference).
- `docs/scaffold-evidence-audit.json` — verbatim quotes + sentence-precise locators for the 9 claims.
- `docs/base-editing-snapshot.json` — the companion snapshot described in [Types].
- `docs/SCAFFOLD_METHODS.md` — the methods write-up: the three-maturity taxonomy, each method's what/limits/anchor, the vascularization thread (sacrificial family → co-SWIFT → in-situ), the biochemical gradient thread, and the honest "what this survey does not establish" close.
- `tests/scaffold-evidence.test.js`, `tests/scaffold-methods.test.js`, `tests/base-editing-snapshot.test.js`.

Modified (bioprinting-workbench):

- `src/tissue-evidence.js` — add ONE claim (`myonuclei-retained-through-atrophy`, mouse, PMID 20713720) + its source; 13 claims total.
- `docs/tissue-evidence-audit.json` — add the quote for the new claim.
- `src/tissue-atlas.js` — add `MYONUCLEAR_MEMORY_IDEA`, `getMyonuclearMemoryIdea()`, `getIdeasDesk()` (both ideas); genome-restore note for periodic-write-back gains a snapshot reference ("snapshot-pinned companion limits") instead of prose-only citation.
- `src/tissue-atlas-ui.js` — render the methods sub-section (non-interactive cards under `#atlas-methods`) and the second ideas-desk card.
- `index.html` — methods sub-section container inside the atlas panel; footer `v0.15.0-dev`.
- `package.json` — `0.15.0-dev`.
- `scripts/verify-release.mjs` — two checks: `scaffold-evidence contract`, `scaffold-methods contract`.
- `assets/author_incubator.py` — add culture flasks and dishes on a shelf plus a wall-mounted CO₂ bottle (names: `Incubator_Flask_1..3`, `Incubator_Dish_1..2`, `Incubator_CO2Bottle`, `Incubator_CO2Regulator`).
- `assets/author_perfusion_chamber.py` — add a media reservoir, bubble trap and Luer-style line fittings (names: `Chamber_Reservoir`, `Chamber_BubbleTrap`, `Chamber_LineFit_1..2` — the name guard `/printhead|nozzle|cartridge/i` is checked before commit).
- `assets/author_microscope.py` — add a culture dish on the stage window and a slide box beside (names: `Microscope_Dish`, `Microscope_SlideBox`).
- `assets/incubator.glb`, `assets/perfusion_chamber.glb`, `assets/microscope.glb` — regenerated via the Node GLB-binary surgery pattern (proven in 0.14): append `Incubator_`/`Chamber_`/`Microscope_`-prefixed nodes with indexed primitives reusing existing materials; `assets/manifest.json` re-pinned for all three (bytes, sha256, meshes, triangles; new required node each: `Incubator_Flask_1`, `Chamber_Reservoir`, `Microscope_Dish`).
- `tests/assets.test.js` — pins update via the manifest (no hardcoded counts in the test file beyond the >=30/<=10000 budgets already present).
- `docs/SOURCES.md` — 0.15 ledger (9 sources + the Gundersen addition to the 0.14 table region as a dated appendix row set).
- `CHANGELOG.md`, `docs/ROADMAP.md`, `README.md`, `docs/VERIFICATION.md` — 0.15 sections; companion-repo decision record (why anagen and base-editing-evidence were reported-not-modified).
- `implementation_plan.md` — this plan; 0.14 plan archived verbatim below the divider.

Modified (companion, regen-workbench only — clean tree):

- `studies/dental-regeneration-2026-10-09/README.md` — one short companion-reading paragraph pointing to the bioprinting-workbench tissue atlas (GitHub Pages URL + what it adds: printing-focused tiers), in the README's plain-prose style, no evidence claims added. Committed and pushed with that repo's own history; its untracked `data/iris-ip3r2-2026-10-17/` is left untouched.

Explicitly NOT modified, with reasons recorded in VERIFICATION.md: `anagen` (uncommitted `docs/atlas.js` from prior work — not committed over), `base-editing-evidence` (uncommitted `ABE8E_Y149V_REVIEW.md`; additionally its append-only receipt tooling cannot run in this container — broken python stdlib, no workspace-control — so no honest tranche is possible from here), `artificial-womb-models` and all other workspace repos (not evidence sources for this catalog per its own NEIGHBORS.md; out of scope).

[Functions]

New: `getScaffoldEvidenceCatalog()`, `validateScaffoldEvidenceCatalog(raw)` (src/scaffold-evidence.js); `getScaffoldMethods()`, `validateScaffoldMethods(methods)`, `evaluateScaffoldMethods()` (src/scaffold-methods.js); `getMyonuclearMemoryIdea()`, `getIdeasDesk()` (src/tissue-atlas.js).

Modified: `validateTissueEvidenceCatalog` (src/tissue-evidence.js — no signature change, one more claim); `createTissueAtlasUI` (src/tissue-atlas-ui.js — renders the two additions); `build_asset()` × 3 (assets/author_*.py — appended parts, no signature change); `verifyRelease` (scripts/verify-release.mjs — two check rows).

[Classes]

None — frozen catalogs and factory functions per house convention. The companion snapshot is a data file with a validating test, not a class.

[Dependencies]

None new. All nine new sources are static strings fetched from the Europe PMC REST API on 2026-11-02. The snapshot is generated from the sibling repo's committed `data/studies.json` (sha-pinned) with no runtime coupling. GLB updates use Node (built-in) on the existing GLB binaries; Blender is not required in this environment (the authoring scripts are updated in parallel so a future Blender session regenerates equivalently).

[Testing]

- `tests/scaffold-evidence.test.js` — catalog validates; species `'other'` for all (nothing becomes human); audit equality (ids, DOIs, sentence-precise locators, quotes > 60 chars); mutations reject (dangling source, bad species, upgraded status, id collisions with the other five catalogs, empty limitations).
- `tests/scaffold-methods.test.js` — 9 methods; maturity enum; ≥1 per tier; anchors resolve across all six catalogs; extrusion re-anchors the existing Kolesky claim (id resolved at implementation time by listing the cell-evidence catalog); whatItDoes and limits ≥ 1 sentence each; evaluator summary names the strongest tier present without human-outcome inference; mutations reject (unknown maturity, dangling anchors, duplicate ids, missing tier).
- `tests/base-editing-snapshot.test.js` — snapshot schema + provenance fields present; 23 cards; ids unique; stages ⊆ the six known stages; stageCounts match the card census and match the sibling repo's own stated counts (7/7/3/2/1/3); no card title duplicates another; the genome-restore idea's periodic-write-back note references the snapshot (string check); mutations of the committed file fail (wrong count, bad stage).
- `tests/tissue-evidence.test.js` — updated to 13 claims incl. the new mouse claim with its verbatim quote in the audit.
- `tests/tissue-atlas.test.js` — second idea asserted (3 steps, mouse anchor, theory transfer step, notices); `getIdeasDesk()` returns both.
- `tests/tissue-atlas-ui.test.js` — methods sub-section renders (9 cards, maturity labels), second ideas card renders; existing aspiration/selectability assertions unchanged.
- `tests/assets.test.js` — three re-pinned manifests pass (bytes/sha/triangles/meshes/requiredNodes).
- Full suite + `npm run check` + `git diff --check` + `verify:release` (two new checks PASS) + connected-browser check (footer v0.15.0-dev, methods section, two idea cards, 0 console errors, GLBs load).
- regen-workbench commit: its own README-prose change; no tests exist for that doc; pushed to its remote with a conventional message; the change is one paragraph, reviewed against the README's tone.

[Implementation Order]

1. `src/scaffold-evidence.js` + audit JSON + `tests/scaffold-evidence.test.js`; run.
2. `src/scaffold-methods.js` + `tests/scaffold-methods.test.js` (resolve the extrusion anchor id by listing the cell-evidence catalog first); run.
3. Add the Gundersen claim to `src/tissue-evidence.js` + audit; update its test to 13; run.
4. `src/tissue-atlas.js` second idea + `getIdeasDesk`; update atlas + UI tests; extend `src/tissue-atlas-ui.js` with the methods sub-section and second idea card; add `#atlas-methods` to index.html; run.
5. Snapshot: generate `docs/base-editing-snapshot.json` from the sibling's committed studies.json; write `tests/base-editing-snapshot.test.js`; wire the snapshot reference into the genome-restore step note; run.
6. GLB updates ×3: extend the three author scripts; Node-surgery each GLB; re-pin the manifest ×3; run asset + release suites; verify no forbidden node names.
7. `scripts/verify-release.mjs` + package.json version bump + index.html footer; full suite + verify:release.
8. Docs: SCAFFOLD_METHODS.md, SOURCES 0.15 ledger, CHANGELOG, ROADMAP, README, VERIFICATION (incl. the companion-decision record); splice `implementation_plan.md`.
9. Connected-browser verification; record in VERIFICATION.
10. Commit bioprinting-workbench; push; verify live Pages (footer v0.15.0-dev, methods section, re-pinned manifests served).
11. regen-workbench companion paragraph; commit + push that repo separately; verify its Pages still builds (its ResearchDesk is a static export — check the file is served if published, else note).
12. Doc-only live-verification commit; push; report — including the two uncommitted sibling changes found and deliberately not touched.

---

# Archived plans

## Archived 0.14.0-dev plan — implemented, committed 8426f5a + f05cd09 and pushed to main on 2026-11-02; preserved verbatim below

# Implementation Plan

[Overview]

Add v0.14.0-dev: a **tissue-target atlas module** covering the owner's requested frontier targets — lung alveoli, gingiva, periodontal ligament complex, tooth/dental pulp, facial and deep dermal collagen, peripheral nerve, skeletal muscle, and the elite-athlete myonuclei/connective-architecture question — each entry anchored to freshly fetched 2024–2026 literature with an honest status tier, barriers and open question; an **ideas-desk section** giving the owner's genome-backup-and-restore concept the same honest per-step assessment (digital backup: real today; organic reserve: real today; periodic whole-genome write-back: theory with named unsolved steps, citing the sibling base-editing-evidence repo read-only for editing-rate and coverage limits and two new 2026 partial-reprogramming sources for the delivery realism); and a **3D refresh** of the bioprinter GLB adding the syringe-extruder toolhead the 0.13 parts list describes, regenerated through the connected Blender 5.1.2 and re-pinned in the manifest. Then publish: commit, push, live Pages verification, doc-only record.

Owner authorization (2026-11-02): "How can we further improve this project/repo? Update our 3d versions of the physical setups? Update ourselves on the latest in bioprinting… dna editing (restore cell's dna back to original… recording the original dna on a computer… some dna editing possibly being useful for differentiation too), yamanaka factors, various established/experimental/theoretical methods… scaffolding and other related stuff such as vascularization… bioprinting of lung alveoli, gums (in mouth), teeth, facial and other bodily deep collagen…, nerves, muscle (and perhaps the myonuclei and organization unique to elite bodybuilders/powerlifters…)… I want you to plan/outline/theorize immensely/heavily/extensively, then act upon it." The applications ledger already covers ear/skin/breast/hair/constructs/drug-testing — the atlas complements it, cross-links it, and never duplicates. Mouse/in-vitro findings never become human outcomes; the elite-athlete architecture is rendered as an aspiration entry, shown honestly, never selectable as achieved.

[Types]

**New evidence claims** (`TISSUE_EVIDENCE_SCHEMA = 'bioprinting-workbench/tissue-evidence/1'`, 12 sources / 12 claims, species-separated, all fetched 2026-11-02, verbatim quotes in `docs/tissue-evidence-audit.json`):

1. `lung-bioprinting-review-2026` / `lung-models-not-organs` (other, review) — PMID 42887177, 10.1016/j.bioadv.2026.215240 — 3D bioprinting/scaffold review for lung diseases: disease modeling, tissue regeneration, organ replacement and drug testing; lung-specific structural and mechanical requirements; no printed functional lung.
2. `gingiva-mechano-2025` / `gingival-fibroblast-bioconstructs` (other, human gingival fibroblasts in vitro) — PMID 40521200, 10.7150/thno.114503 — collagen + omega-3 (EPA/DHA) bioink, shear-induced printing to activate mechanosensitive pathways; promising gene-expression results; vascularization and remodeling still required.
3. `gingiva-substitutes-2026` / `prevascularized-gingival-hydrogels` (other, in-vitro endothelial pre-networks) — PMID 42531828, 10.1016/j.bioadv.2026.215082 — CollMA/HAMA bioinks with SVV/QK peptides forming interconnected endothelial networks over 14 days in vitro; host anastomosis not shown.
4. `pdl-scaffolds-2024` / `pdlsc-laden-collagen` (other, in-vitro + mouse subcutaneous implant) — PMID 39467547, 10.1021/acsami.4c13830 — PDLSC-laden collagen bioinks tested for PDL organization; mouse subcutaneous biocompatibility only.
5. `periodontal-nanocomposite-2026` / `alveolar-pdl-cementum-scaffolds` (other, review of preclinical scaffolds) — PMID 42345714, 10.3390/biomimetics11060425 — printed nanocomposite scaffolds for alveolar bone–PDL–root cementum regeneration; preclinical promise, no human result.
6. `dental-pulp-review-2026` / `dental-pulp-printing-preclinical` (other, scoping review) — PMID 42712105, 10.1177/19373368261485519 — 13 studies 2018–2026, all preclinical; extrusion dominant, GelMA predominant; pulp-dentin complex support only in models.
7. `silk-neural-review-2026` / `silk-nerve-scaffolds` (other, review) — PMID 42355420, 10.3390/life16060892 — silk-fibroin bioprinted scaffolds with collagen/conductive polymers for neural repair; functional recovery evidence still limited.
8. `muscle-coaxial-2026` / `aligned-vascularized-muscle` (other, in-vitro constructs) — PMID 42556410, 10.1088/1758-5090/ae9597 — one-step coaxial printing of aligned, vascularized skeletal-muscle constructs; shear-induced myoblast alignment; volumetric-loss therapy not established.
9. `myonuclei-pipeline-2026` / `myonuclei-are-measurable` (human, imaging-analysis pipeline) — PMID 42571222, 10.1016/j.isci.2026.116961 — validated quantification of myonuclear number, position, shape and 3D orientation along single fibers; a measurement tool, not a production method.
10. `skin-vascularized-review-2025` / `vascularized-skin-analogs` (other, review) — PMID 40718701, 10.1093/burnst/tkaf018 — stepwise review of printing modalities, inks and cell sourcing for vascularized skin constructs; perfused skin substitutes still a barrier.
11. `reprogramming-review-2026` / `lineage-preserving-reprogramming-checklist` (other, review) — PMID 41490578, 10.1016/j.arr.2026.103009 — links lineage-preserving partial reprogramming to quantifiable rejuvenation endpoints; mesenchymal drift; strategies beyond OSKM; translational checklist of schedule, delivery and safety pharmacology.
12. `circrna-osk-2026` / `transient-nonintegrating-reprogramming` (other, in-vitro MSC study) — PMID 42907856, 10.1186/s13287-026-05193-0 — LNP-delivered circRNA co-expressing OCT4/SOX2/KLF4 transiently rejuvenated senescent late-passage MSCs without genomic modification; ddPCR ESRG check showed no pluripotent conversion.

**Atlas target record** (`TISSUE_TARGETS`, 9 entries): `{ id, label, region: 'dental'|'pulmonary'|'dermal'|'neural'|'muscular', status: 'review-stage'|'in-vitro'|'preclinical'|'aspiration', anchorClaimIds, adverseClaimIds, barriers: string[], openQuestion, aspirationNote (aspiration entry only, non-selectable), relatedIds: { applications?, programNode? } }`. Targets:

1. `lung-alveoli` (pulmonary, review-stage) — anchors [lung-models-not-organs]; barriers: gas-exchange membrane thinness, vascular-airway co-patterning; openQ: can any printed construct exchange gas like alveoli in vivo? None reviewed.
2. `gingiva` (dental, in-vitro) — anchors [gingival-fibroblast-bioconstructs, prevascularized-gingival-hydrogels]; adverse [gingival-fibroblast-bioconstructs]; barriers: epithelial seal, vascularization, host anastomosis; cross-links the regen-workbench dental track (read-only citation) for trial-level honesty.
3. `periodontal-complex` (dental, preclinical) — anchors [pdlsc-laden-collagen, alveolar-pdl-cementum-scaffolds]; barriers: oriented PDL insertion under load, multi-tissue interfaces.
4. `tooth-pulp-dentin` (dental, review-stage) — anchors [dental-pulp-printing-preclinical]; barriers: pulp-dentin complex regeneration in humans, whole-tooth crown/root form.
5. `facial-deep-collagen` (dermal, review-stage) — anchors [vascularized-skin-analogs, skin-bioprinting-status (applications catalog)]; adverse [skin-bioprinting-status]; barriers: deep-dermis vascularization, fat-fascia layers, durability.
6. `peripheral-nerve` (neural, review-stage) — anchors [silk-nerve-scaffolds]; barriers: axon guidance over long gaps, Schwann-cell function, functional recovery endpoints.
7. `skeletal-muscle` (muscular, in-vitro) — anchors [aligned-vascularized-muscle]; barriers: innervation, vascular integration, force transmission at scale.
8. `elite-muscle-architecture` (muscular, aspiration) — anchors [myonuclei-are-measurable]; aspirationNote rendered, never selectable: myonuclear number/orientation/fascicle pennation are measurable in humans, and printed bipennate architecture exists in vitro, but no reviewed method produces elite-athlete myonuclei or woven connective architecture; this entry is the honest ceiling of the wish.
9. `breast-soft-tissue-bridge` — NOT a new target; the atlas panel cross-references the applications ledger entry (no duplication; `relatedIds.applications = 'breast-soft-tissue'`).

**Ideas-desk record** (in-module, non-interactive, no scenario key): `GENOME_RESTORE_IDEA = { id: 'genome-backup-restore', steps: [{ id, label, verdict: 'real-today'|'theory', anchorClaimIds, note }] }` — digital genome backup (real: sequencing + storage is ordinary computing; note: no write-path back into chromatin), organic cell reserve (real: cell banking exists; note: aging accrues in the reserve too), periodic genome write-back (theory: base/prime editing is locus-by-locus with measured conditional rates and intended-only coverage far below 100% — citing base-editing-evidence repo read-only — plus somatic mosaicism means "the original" is per-cell, not one string; delivery to most cells of a living tissue unsolved), differentiation-directed editing (theory: editing is not a differentiation program; Yamanaka-class reprogramming resets epigenetic age in mouse/in-vitro systems — anchors [lineage-preserving-reprogramming-checklist, transient-nonintegrating-reprogramming, reprogramming-in-vivo-mouse, reprogramming-in-vitro-age]). Notices: simulation-only idea desk, no procedure, no dosing, nothing performed.

**`learning.tissueAtlas`** (new `/9` key): `{ selectedTargetIds: string[] }` — unique, subset, empty allowed; the aspiration entry is rejected on import (it is rendered but not selectable, like the excluded levers).

[Files]

New:

- `src/tissue-evidence.js` — 12 sources + 12 species-separated claims; validator mirrors the other catalogs plus collision checks against all four existing claim-id sets; audit equality tested.
- `src/tissue-atlas.js` — `TISSUE_TARGETS` (8 selectable + 1 aspiration), `GENOME_RESTORE_IDEA`, notices, `defaultTissueAtlas`, `validateTissueAtlas`, `getTissueTargets`, `getGenomeRestoreIdea`, `validateTissueTargets` (anchor resolution across all five catalogs; aspiration non-selectable rule; barriers required), `evaluateTissueAtlas` (selected targets with tiers, barriers, open questions, cross-links, honesty summary).
- `src/tissue-atlas-ui.js` — `createTissueAtlasUI` (region-grouped target cards, aspiration card rendered with a never-checkable control, ideas-desk genome-restore card with per-step verdicts, result summary, dispose).
- `docs/tissue-evidence-audit.json` — verbatim abstract quotes + locators for all 12 claims.
- `docs/ATLAS.md` — the atlas write-up: every target's tier, barriers and open question; the genome-backup idea assessed step-by-step; read-only citations of the regen-workbench dental track and base-editing-evidence repo; the honest closest-vs-furthest ranking.
- `tests/tissue-evidence.test.js`, `tests/tissue-atlas.test.js`, `tests/tissue-atlas-ui.test.js`.
- `tests/fixtures/scenario-v9.json` — native `/9` fixture with a populated tissueAtlas selection.

Modified:

- `src/cell-division.js` — import + `defaultLearningState()` adds `tissueAtlas`; `validateLearningState` accepts it.
- `src/cell-learning-ui.js` — instantiate/render/dispose `createTissueAtlasUI`.
- `src/scenario.js` — `SCENARIO_SCHEMA` → `/9`; new `migrateScenarioV8`; `/7`–`/3` migration patches add the tissueAtlas default; `parseScenario` dispatches `/8`.
- `index.html` — tissue-atlas panel (after the hardware-cost panel); Version 9 restore note; footer `v0.14.0-dev`.
- `package.json` — `0.14.0-dev`.
- `scripts/verify-release.mjs` — new checks `tissue-evidence contract` and `tissue-atlas contract`.
- `tests/release.test.js` — both new contract validations asserted.
- `tests/cell-division.test.js` — tissueAtlas default asserts + rejection patches.
- `tests/scenario.test.js` — v8→v9 renames; new v8-migration test; fixture loop gains `scenario-v9.json` (native) and `scenario-v8.json` (migrates from /8); invalid-schema case becomes `bioprinting-workbench/10`; tissueAtlas fields in round-trip/rejection tests; export purity; aspiration selection rejected.
- `assets/author_bioprinter.py` — add the syringe-extruder toolhead (docked on the gantry): `Printer_SyringeCarriage`, `Printer_SyringeBarrel`, `Printer_SyringePlunger`, `Printer_SyringeNozzle`, `Printer_SyringeMount`, reusing WHITE/ALU/DARK materials plus one new translucent `Bioink_Glass`; sized to match the 0.13 parts-list description.
- `assets/bioprinter.glb` — regenerated through connected Blender 5.1.2 (extended author script, same `export_owned_scene` path).
- `assets/manifest.json` — bioprinter entry re-pinned: bytes, sha256, meshes, triangles, blenderBounds recomputed from the new GLB; `maxBytes` 358400 unchanged and verified.
- `tests/assets.test.js` — bioprinter pins updated (bytes/sha/triangles/meshes, requiredNodes gains `Printer_SyringeBarrel`); node-prefix checks unchanged (`Printer_`).
- `docs/SOURCES.md` — 0.14 tissue-evidence ledger (12 sources).
- `docs/SCENARIOS.md` — Version 9 header/list + Version 8 migration section.
- `CHANGELOG.md`, `docs/ROADMAP.md`, `README.md` — 0.14 sections; 0.13 relabeled as pushed.
- `docs/VERIFICATION.md` — 0.14 section with executed checks; live-check paragraph after push (doc-only commit).
- `implementation_plan.md` — this plan; the 0.13 plan preserved verbatim below the archive divider.

[Functions]

New:

- `src/tissue-evidence.js`: `getTissueEvidenceCatalog()`, `validateTissueEvidenceCatalog(raw)`.
- `src/tissue-atlas.js`: `getTissueTargets()`, `validateTissueTargets(targets)`, `getGenomeRestoreIdea()`, `defaultTissueAtlas()`, `validateTissueAtlas(raw)`, `evaluateTissueAtlas(settings)`.
- `src/tissue-atlas-ui.js`: `createTissueAtlasUI({ elements, onStateChange })` → `{ render, dispose }`.

Modified:

- `defaultLearningState()` / `validateLearningState()` (src/cell-division.js) — add the tissueAtlas key.
- `migrateScenarioV3`…`migrateScenarioV7` (src/scenario.js) — add `tissueAtlas: defaultTissueAtlas()` to the defaulted learning patches (warning texts extended truthfully).
- `parseScenario` (src/scenario.js) — `/8` branch → `migrateScenarioV8`.
- `verifyRelease` (scripts/verify-release.mjs) — two new contract rows.
- `build_asset()` (assets/author_bioprinter.py) — add the syringe-extruder block before export; no signature change.

[Classes]

None — module-level factories and frozen catalogs per house convention. The aspiration non-selectability mirrors the excluded-lever precedent from the applications module.

[Dependencies]

None new: browser-native ES modules, `node:test`, hand-rolled DOM/SVG UI. The GLB update uses the already-connected Blender 5.1.2 via the MCP addon (the version that authored the original manifest) — no packages, no credentials. All 12 bibliographic records are static strings fetched from the Europe PMC REST API on 2026-11-02 and verbatim-quoted in the audit JSON. base-editing-evidence and the regen-workbench dental track are cited read-only; neither repo is modified.

[Testing]

- `tests/tissue-evidence.test.js`: catalog validates; species separation; audit equality (ids, locators, DOIs, quotes > 60 chars); mutations reject (dangling source, species, upgraded status, id collisions with all four existing catalogs, empty limitations).
- `tests/tissue-atlas.test.js`: target contract — 8 selectable + 1 aspiration; regions/status enums; anchors resolve across all five catalogs; adverse anchors required for in-vitro/preclinical targets; barriers and open questions ≥ 1 each; aspiration flagged non-selectable and rejected by `validateTissueAtlas` when selected; evaluator — empty → 'unconfigured', selection returns tiers/barriers/open questions/cross-links, honesty summary never claims a human result; genome-restore idea carries all four steps with verdict enums and anchor resolution; validation rejections (unknown id, duplicates, non-array).
- `tests/tissue-atlas-ui.test.js`: harness mirror — 8 target cards + aspiration card + ideas card render; selecting targets proposes a patch accepted by `validateLearningState`; the aspiration checkbox is disabled and fires no patch; result summary lists tiers and barriers; no derived keys in accepted state; dispose; missing callback throws.
- `tests/assets.test.js`: updated bioprinter pins pass (new bytes/sha256/meshes/triangles, `Printer_SyringeBarrel` required, all nodes still `Printer_`-prefixed).
- Existing suites updated as listed; expected total ≈ 124 (117 + 7).
- Release verification: full suite, `npm run check`, `npm run verify:release` (two new checks PASS), `git diff --check`, connected-browser check (footer v0.14.0-dev, 8 target cards + aspiration + ideas card, live selection summary, 0 console errors) and a Blender-side screenshot of the regenerated printer before export. Claims scanner remains not-run (documented); compensating checks continue.

[Implementation Order]

1. Write `src/tissue-evidence.js` + `docs/tissue-evidence-audit.json` + `tests/tissue-evidence.test.js`; run.
2. Write `src/tissue-atlas.js` + `tests/tissue-atlas.test.js`; run.
3. Write `src/tissue-atlas-ui.js` + `tests/tissue-atlas-ui.test.js`; extend `src/cell-division.js` + `tests/cell-division.test.js`; run.
4. GLB update: extend `assets/author_bioprinter.py`; run `build_asset()` in the connected Blender exporting to the repo path; screenshot-check; recompute the manifest entry (bytes/sha256/meshes/triangles/bounds); update `tests/assets.test.js`; run asset + release suites.
5. Add the index.html panel + Version-9 note + footer bump; wire `src/cell-learning-ui.js`.
6. Bump `src/scenario.js` to `/9` with `migrateScenarioV8` and chain updates; update `tests/scenario.test.js`; generate `tests/fixtures/scenario-v9.json`; run.
7. Update `scripts/verify-release.mjs` + `tests/release.test.js` + `package.json` (0.14.0-dev).
8. Docs: ATLAS.md, SOURCES.md, CHANGELOG, ROADMAP, SCENARIOS, README; full suite + verify:release.
9. Connected-browser verification; record in `docs/VERIFICATION.md`.
10. Commit, push `main`, verify live Pages serves v0.14.0-dev (footer, panel, served modules, ATLAS.md, updated bioprinter GLB served), append live-check paragraph, doc-only commit, push again.

---

# Archived plans

## Archived 0.13.0-dev plan — implemented and pushed as commits 7b13247 + 9d68a10 on 2026-11-02; preserved verbatim below

# Implementation Plan

[Overview]

Add v0.13.0-dev: a **reference hardware cost ledger with browser visualizations** for a hobby benchtop bioprinting setup — a 22-part reference parts list across six categories (motion platform, extrusion toolhead, bioink materials, sterile-culture infrastructure, measurement/QC, recurring consumables), each with an indicative reference price, provenance basis, honesty note and recurring/optional flags; an evaluator computing per-category subtotals, one-time total and recurring monthly total; and a hand-rolled SVG visualization (house precedent: the flow-network SVG and canvas heatmap in `src/analysis-ui.js`) rendering a category-stacked cost bar that updates live as parts are included/excluded. This is the "figuring stuff out on the computer prior to in the physical" milestone: the workbench stays the $0 in-silico entry point, and the parts list shows honestly where the money goes when the physical rig — where more is at stake — begins. The visualization makes the cost dominance explicit (sterile-culture infrastructure dwarfs the printer itself), and the module teaches the acellular-practice rig (~$800) versus cell-culture-capable bench (~$5.6K + ~$525/month) split. Published as a simulation-labeled reference panel; prices are reference estimates, not quotes, not current, and no purchase is recommended anywhere.

Owner authorization (2026-11-02): "Push the bounds? Go through the parts list for the bioprinting and the cost for each and make visualizations that will display in a browser? The parts list and prices are for reference. Getting eternal youth / lack of any bodily damage (ie. from aging)... figuring stuff out on the computer prior to in the physical in which more is at stake -- okay" + "plan out what to do and then act on it." Interpretation recorded in the plan and commit: no parts list with prices exists anywhere in the workspace (open-perfusion-rig holds math/firmware/SCAD only), so the reference list is **authored here**; open-perfusion-rig's parametric syringe carriage is cited as the physical-companion project for the extruder's printed part. Public vendor pages (Adafruit, Creality) were attempted for price anchoring on 2026-11-02 and timed out from this environment, so every price carries `priceBasis: 'authored-estimate'` with the attempt documented — the validator keeps a `fetched-list-price` path for future fetched anchors and requires sourceUrl+fetchDate for it. "Eternal youth / lack of any bodily damage" remains the aspiration framing only: the module states plainly that no parts total buys any outcome, that the research-program module's evidence floor still applies, and that cells, sterility and money are the physical stakes the in-silico workbench exists to respect.

[Types]

**Hardware part record** (catalog entries): `{ id, label, category, referencePriceUSD: int, priceBasis: 'fetched-list-price'|'authored-estimate', sourceUrl: https URL, note, recurring: bool, optional: bool }`. Categories enum: `['motion-platform','extrusion-toolhead','bioink-materials','sterile-culture','measurement-qc','consumables-recurring']`. Price bounds: integer 1..50000 USD. Every part: `note` ≥ 40 chars (purpose + honesty), `priceBasis` 'authored-estimate' today (validator requires fetched basis to carry fetch evidence), `sourceUrl` points at a representative vendor/product category page with no price claim.

**Catalog (22 parts)** — one-time: used FDM printer base $180; spare NEMA17 steppers ×3 $60; GRBL/RAMPS-class controller $50; 12 V enclosed PSU $35 (motion-platform); DIY syringe-pump extruder hardware $90; carriage-print filament $25 (extrusion-toolhead, cites open-perfusion-rig syringe_carriage.scad); sodium alginate 100 g $45; gelatin 500 g $20; calcium chloride 100 g $15 (bioink-materials); stovetop pressure sterilizer $90; hobby laminar-flow hood $1,900; used CO2 incubator $2,500; basic microscope $400 (sterile-culture, optional=true — acellular practice can skip); milligram scale $70; bench pH meter $90; USB temp logger $45 (measurement-qc). Recurring (~monthly): culture medium 500 mL $90; FBS 100 mL $250 (bioink-materials, recurring, optional); sterile syringes/needles $40; culture dishes/flasks $55; 0.22 µm sterile filters $60; gloves/disinfectant $30 (consumables-recurring). Totals the evaluator must reproduce: full one-time $5,615; recurring $525/month; acellular practice subset (sterile-culture + FBS/medium excluded) = $725 one-time + $185/month.

**Evaluator result** (`evaluateHardwareBudget`): `{ status: 'unconfigured'|'costed', assumptionOrigin: 'reference-hypothetical', parts: [...], categories: [{ id, label, subtotalUSD }], oneTimeTotalUSD, recurringMonthlyUSD, notices }` — one-time and recurring never summed into one number; notices carry reference-only/no-quote/no-purchase/in-silico-first statements.

**`learning.hardwareBudget`** (new `/8` key): `{ includedPartIds: string[] }` — default = all 22 catalog ids; unique, subset of catalog, empty allowed (unconfigured).

[Files]

New:

- `src/hardware-costs.js` — catalog + `HARDWARE_COST_SCHEMA`, `validateHardwareCatalog`, `getHardwareCatalog`, `defaultHardwareBudget`, `validateHardwareBudget`, `evaluateHardwareBudget`, category constants.
- `src/hardware-costs-ui.js` — `createHardwareCostsUI` (part cards with checkboxes and price chips, live SVG stacked-bar chart per `buildCostChart`, totals and notices, dispose).
- `docs/HARDWARE_COSTS.md` — full parts table with prices and provenance, acellular-vs-cell-capable comparison, in-silico-first essay, failed price-fetch documentation, disclaimers.
- `tests/hardware-costs.test.js`, `tests/hardware-costs-ui.test.js`.
- `tests/fixtures/scenario-v8.json` — native `/8` fixture with a populated hardwareBudget.

Modified:

- `src/cell-division.js` — import + `defaultLearningState()` adds `hardwareBudget`; `validateLearningState` accepts it.
- `src/cell-learning-ui.js` — instantiate/render/dispose `createHardwareCostsUI`.
- `src/scenario.js` — `SCENARIO_SCHEMA` → `/8`; new `migrateScenarioV7`; `/6`–`/3` migration patches add the hardwareBudget default; `parseScenario` dispatches `/7`.
- `index.html` — hardware-cost panel (after the research-program panel) with `<svg id="hardware-cost-chart">`; Version 8 restore note; footer `v0.13.0-dev`.
- `package.json` — `0.13.0-dev`.
- `scripts/verify-release.mjs` — new check `hardware-cost contract`.
- `tests/release.test.js` — hardware-cost contract asserted.
- `tests/cell-division.test.js` — hardwareBudget default asserts + rejection patches.
- `tests/scenario.test.js` — v7→v8 renames; new v7-migration test; fixture loop gains `scenario-v8.json` (native) and `scenario-v7.json` (migrates from /7); invalid-schema case becomes `bioprinting-workbench/9`; hardwareBudget fields in round-trip/rejection tests; export purity (no `oneTimeTotalUSD` in export).
- `docs/SOURCES.md` — 0.13 hardware-reference ledger (authored estimates; fetch attempts documented as timed out).
- `docs/SCENARIOS.md` — Version 8 header/list + Version 7 migration section.
- `CHANGELOG.md`, `docs/ROADMAP.md`, `README.md` — 0.13 sections; 0.12 relabeled as pushed.
- `docs/VERIFICATION.md` — 0.13 section with executed checks; live-check paragraph after push (doc-only commit).
- `implementation_plan.md` — this plan; the 0.12 plan preserved verbatim below the archive divider.

[Functions]

New:

- `src/hardware-costs.js`: `getHardwareCategories()`, `getHardwareCatalog()`, `validateHardwareCatalog(raw)`, `defaultHardwareBudget()`, `validateHardwareBudget(raw)`, `evaluateHardwareBudget(settings)`.
- `src/hardware-costs-ui.js`: `createHardwareCostsUI({ elements, onStateChange })` → `{ render, dispose }` (internal `buildCostChart(result)` builds the SVG via `document.createElementNS`).

Modified:

- `defaultLearningState()` / `validateLearningState()` (src/cell-division.js) — add the hardwareBudget key.
- `migrateScenarioV3`…`migrateScenarioV6` (src/scenario.js) — add `hardwareBudget: defaultHardwareBudget()` to the defaulted learning patches (warning text extended truthfully).
- `parseScenario` (src/scenario.js) — `/7` branch → `migrateScenarioV7`.
- `verifyRelease` (scripts/verify-release.mjs) — `hardware-cost contract` row.

[Classes]

None — module-level factories and frozen catalogs per house convention.

[Dependencies]

None: no packages, no runtime network, no chart library — the SVG chart is hand-rolled to match the zero-dependency rule and the existing `src/analysis-ui.js` SVG/canvas precedent. All prices are static authored strings; the only external references are source URLs displayed as links.

[Testing]

- `tests/hardware-costs.test.js`: catalog contract — 22 parts, all six categories populated, every entry authored-estimate with note ≥40 chars and https sourceUrl, prices in bounds, recurring/optional flags; validator rejections (bad basis, http url, duplicate ids, unknown category, price 0/50001, note too short, fetched basis without... fetched WITH url is the future path — forged 'fetched-list-price' with url passes; so the rejection matrix covers enum/bounds/shape, and a test pins today's all-estimate state); evaluator — default full budget returns status 'costed', oneTimeTotalUSD 5615, recurringMonthlyUSD 525, category subtotals (sterile-culture 4890 largest), acellular subset math (~805/155), empty selection → 'unconfigured', notices include reference-only and in-silico-first; budget validation rejections (unknown id, duplicates, non-array).
- `tests/hardware-costs-ui.test.js`: harness mirror — 22 part cards render, default chart SVG contains six category segments and both totals, unchecking the hood updates the patch and rerender drops the sterile-culture subtotal, accepted state carries no derived keys, dispose, missing callback throws.
- Existing suites updated as listed; expected total ≈ 117 (112 + 5).
- Release verification: full suite, `npm run check`, `npm run verify:release` (new check PASS), `git diff --check`, connected-browser check: footer v0.13.0-dev, 22 cards, SVG chart renders with category labels, unchecking a part updates totals, 0 console errors. Claims scanner remains not-run (documented).

[Implementation Order]

1. Write `src/hardware-costs.js` + `tests/hardware-costs.test.js`; run.
2. Write `src/hardware-costs-ui.js` + `tests/hardware-costs-ui.test.js`; extend `src/cell-division.js` + `tests/cell-division.test.js`; run.
3. Add the index.html panel + Version-8 note + footer bump; wire `src/cell-learning-ui.js`.
4. Bump `src/scenario.js` to `/8` with `migrateScenarioV7` and chain updates; update `tests/scenario.test.js`; generate `tests/fixtures/scenario-v8.json`; run.
5. Update `scripts/verify-release.mjs` + `tests/release.test.js` + `package.json` (0.13.0-dev).
6. Docs: HARDWARE_COSTS.md, SOURCES.md, CHANGELOG, ROADMAP, SCENARIOS, README; full suite + verify:release.
7. Connected-browser verification; record in `docs/VERIFICATION.md`.
8. Commit, push `main`, verify live Pages serves v0.13.0-dev (footer, panel, served modules, HARDWARE_COSTS.md), append live-check paragraph, doc-only commit, push again.

---

# Archived plans

## Archived 0.12.0-dev plan — implemented and pushed as commits 82d9b2b + 2977e86 on 2026-11-02; preserved verbatim below

# Implementation Plan

[Overview]

Add v0.12.0-dev: a simulation-labeled **research program framework module** that turns the owner's request — "lay out a research program/framework based off public literature... mechanisms that I could guess were relevant/influential. Building/stacking/inference" — into an interactive, literature-anchored program designer: a catalog of research nodes (aging-mechanism levers, printing capabilities, and measurement tools) whose evidence tiers, adverse anchors, open questions and dependencies are drawn from the four accumulated evidence catalogs plus four newly fetched geroscience sources; the evaluator implements **BUILD** (select nodes), **STACK** (dependency closure with prerequisites auto-identified, cycle-checked), and **INFER** (first-order theory inferences per node, never cross-node effect multiplication), and reports the program's honest evidence floor. The framework aligns with the owner's regen-workbench research desk (read-only reference: its question→alternatives→data→frozen-plan→runs→review method and its "clocks support narrower questions, not every outcome domain" caveat are cited as companion method) and ships as `docs/RESEARCH_PROGRAM.md` plus a workbench panel. Then publish: commit, push, live Pages verification.

Owner authorization (2026-11-02): "Can you lay out a research program/framework based off public literature?... Building/stacking/inference... You're welcome to make use of the regen-workbench research desk and other projects/repos... I want you to outline/plan in immense detail, then act upon it." Interpretation: the program is a study-planning simulation for a personal learning project — uncensored about the levers (senolytics, rapamycin/mTOR, NAD+ precursors, partial reprogramming, systemic factors, clocks, stem-cell supply, vascularization) and equally uncensored about their measured limits (senolytic translation constraints incl. targeting beneficial senescent cells; rapamycin's "postponing cancer vs retarding aging" ambiguity; NAD+ pharmacokinetic limits; mouse-only reprogramming and parabiosis; no human printed-tissue result). No treatment, dosing, protocol, timeline or funding claim; mouse/animal findings never become human outcomes; regen-workbench is referenced read-only (its own AGENTS.md and history are untouched).

[Types]

**Program node record** (`PROGRAM_NODES` entries): `{ id, label, layer: 'aging-mechanism'|'printing-capability'|'measurement', tier: 'human-measured'|'mouse-measured'|'animal-or-in-vitro'|'review-supported'|'theory', anchorClaimIds, adverseClaimIds, openQuestions: string[], inference, dependencyIds }`. Anchor/adverse ids resolve against the union of FOUR catalogs: cell-evidence, aging-evidence, applications-evidence and the new geroscience-evidence claims.

**New evidence claims** (`GEROSCIENCE_EVIDENCE_SCHEMA = 'bioprinting-workbench/geroscience-evidence/1'`, 4 sources / 4 claims, species-separated):

- `senolytic-review-2026` / `senolytics-translation-limits` (other, review of senolytic translation in cancer-treatment senescence) — PMID 42775540? No: PMID 42775553, DOI 10.1080/14728222.2026.2738910 — variable efficacy, proliferative-recovery risk, adverse effects limiting translation, risk of targeting beneficial senescent cells, absence of validated trial designs.
- `rapamycin-2009` / `rapamycin-lifespan-mice` (mouse) — PMID 19587680, DOI 10.1038/nature08221, Nature 2009 — rapamycin from 600 days extended median and maximal lifespan in genetically heterogeneous mice at three sites (14% females, 9% males at 90% mortality); mechanism may be postponing cancer, retarding aging, or both.
- `nad-review-2026` / `nad-precursor-limits` (other, narrative review) — PMID 42669985, DOI 10.2174/0113895575469704260805105227 — NAD+ decline implicated in mitochondrial dysfunction, inflammation and metabolic aging; NMN/NR promising experimentally but human translation limited by pharmacokinetic instability and tissue-specific bioavailability.
- `horvath-clock-2013` / `methylation-age-clock` (human) — PMID 24138928, DOI 10.1186/gb-2013-14-10-r115, Genome Biology 2013 — multi-tissue DNA methylation age predictor (8,000 samples, 51 tissues, 353 CpGs); near-zero in iPSCs, correlates with passage number, heritable age acceleration, applicable to chimpanzee; author proposes it measures the cumulative effect of an epigenetic maintenance system.

**Program-node catalog (13 nodes, layer/tier/anchors)** — anchors from all four catalogs (existing claim ids reused):

1. `hallmark-mapping` (aging-mechanism, review-supported) — anchors [aging-nine-hallmarks-2013, aging-twelve-hallmarks-2023]; the map for hypotheses, not an intervention list; deps [].
2. `aging-biomarkers` (measurement, human-measured) — anchors [methylation-age-clock]; openQ: causality vs correlation, which endpoint a clock proxies; inference: an intervention can move a clock without moving healthspan — clocks support narrower questions, not every outcome domain; deps [].
3. `senescent-burden-clearance` (aging-mechanism, review-supported) — anchors+adverse [senolytics-translation-limits]; deps [aging-biomarkers].
4. `mtor-pathway-modulation` (aging-mechanism, mouse-measured) — anchors+adverse [rapamycin-lifespan-mice]; deps [aging-biomarkers].
5. `nad-precursor-restoration` (aging-mechanism, review-supported) — anchors+adverse [nad-precursor-limits]; deps [aging-biomarkers].
6. `partial-reprogramming` (aging-mechanism, mouse-measured) — anchors [reprogramming-in-vivo-mouse], adverse [reprogramming-in-vitro-age]; deps [aging-biomarkers].
7. `systemic-youth-factors` (aging-mechanism, mouse-measured) — anchors [parabiosis-systemic-factors]; deps [aging-biomarkers].
8. `genome-stability-gate` (printing-capability, human-measured in culture) — anchors [culture-selection], adverse [culture-selection, kurashima-fork-acceleration]; deps [].
9. `stem-cell-supply` (printing-capability, human-measured in culture) — anchors [halliwell-survival, msc-variability, pluripotent-cycle], adverse [fibroblast-senescence, kurashima-miscoordination]; deps [genome-stability-gate].
10. `vascularized-volume-printing` (printing-capability, animal-or-in-vitro) — anchors [itop-human-scale-constructs, printed-adipose-neovessels], adverse [printed-adipose-neovessels]; deps [stem-cell-supply].
11. `functional-tissue-verification` (printing-capability, human-measured benchmark via flaps) — anchors+adverse [diep-flap-profile]; deps [vascularized-volume-printing].
12. `host-integration` (printing-capability, theory) — anchors [diep-flap-profile]; deps [functional-tissue-verification].
13. `organ-chip-testing` (measurement, review-supported) — anchors [body-on-chip-drug-testing, printed-mature-adipocytes]; deps [].

**Evaluator result** (`evaluateResearchProgram`): `{ status: 'unconfigured'|'designed', assumptionOrigin: 'user-hypothetical-simulation', selected: [{ id, label, tier, relation: 'selected' }], prerequisites: [{ id, label, tier, relation: 'prerequisite', requiredBy: string[] }], programFloor: tier, openQuestions: [{ id, question }], inferences: [{ id, inference }], notices }`. Tier floor = the weakest-strongest tier present in the closure, ranked human-measured < mouse-measured < animal-or-in-vitro < review-supported < theory.

**`learning.researchProgram`** (new `/7` key): `{ selectedNodeIds: string[] }` — unique, subset of node ids, empty allowed.

[Files]

New:

- `src/geroscience-evidence.js` — 4 sources + 4 species-separated claims; validator mirrors the other evidence catalogs plus collision checks against all three existing claim-id sets.
- `src/research-program.js` — `PROGRAM_NODES` (13), `NOTICES`, `defaultResearchProgram`, `validateResearchProgram`, `getProgramNodes`, `validateProgramNodes` (incl. DFS cycle detection mirroring `validateOrganBarriers`), `evaluateResearchProgram` (BUILD/STACK/INFER).
- `src/research-program-ui.js` — `createResearchProgramUI` (layer-grouped node cards, disabled theory-tier framing where applicable, closure/floor/inference result rendering, dispose).
- `docs/RESEARCH_PROGRAM.md` — the full framework in prose: the six-step desk-aligned method, phased program logic, the build/stack/inference definitions, every node's tier and open question, all measured anchors quoted with PMIDs, and an explicit read-only reference to the regen-workbench research desk.
- `docs/geroscience-evidence-audit.json` — verbatim abstract quotes + locators (audit↔runtime equality tested).
- `tests/geroscience-evidence.test.js`, `tests/research-program.test.js`, `tests/research-program-ui.test.js`.
- `tests/fixtures/scenario-v7.json` — native `/7` fixture with a populated researchProgram selection.

Modified:

- `src/cell-division.js` — import + `defaultLearningState()` adds `researchProgram`; `validateLearningState` accepts it.
- `src/cell-learning-ui.js` — instantiate/render/dispose `createResearchProgramUI`.
- `src/scenario.js` — `SCENARIO_SCHEMA = 'bioprinting-workbench/7'`; new `migrateScenarioV6`; `/5` and `/4` and `/3` migration patches add the researchProgram default; `parseScenario` dispatches `/6`.
- `index.html` — research-program panel (after the breast-comparison panel); Version 7 restore note; footer `v0.12.0-dev`.
- `package.json` — `0.12.0-dev`.
- `scripts/verify-release.mjs` — new checks `geroscience-evidence contract` and `research-program contract`.
- `tests/release.test.js` — both new contract validations asserted.
- `tests/cell-division.test.js` — researchProgram default asserts + rejection patches.
- `tests/scenario.test.js` — v6→v7 renames; new v6-migration test; fixture loop gains `scenario-v7.json` (native) and `scenario-v6.json` (migrates from /6); invalid-schema case becomes `bioprinting-workbench/8`; researchProgram fields in round-trip/rejection tests; export purity (no `programFloor`/`prerequisites` in export).
- `docs/SOURCES.md` — 0.12 geroscience ledger (4 sources, same table format).
- `docs/SCENARIOS.md` — Version 7 header/list + Version 6 migration section.
- `CHANGELOG.md` — 0.12.0-dev section; 0.11.0-dev relabeled as pushed.
- `docs/ROADMAP.md` — 0.12 follow-on section; 0.11 relabeled as pushed.
- `README.md` — feature bullet for `src/research-program.js`.
- `docs/VERIFICATION.md` — 0.12 section with executed checks; live-check paragraph after push (doc-only commit).
- `implementation_plan.md` — this plan; the prior 0.11 plan preserved verbatim below the archive divider.

[Functions]

New:

- `src/geroscience-evidence.js`: `getGeroscienceEvidenceCatalog()`, `validateGeroscienceEvidenceCatalog(raw)`.
- `src/research-program.js`: `getProgramNodes()`, `validateProgramNodes(nodes, catalogs)`, `defaultResearchProgram()`, `validateResearchProgram(raw)`, `evaluateResearchProgram(settings)`.
- `src/research-program-ui.js`: `createResearchProgramUI({ elements, onStateChange })` → `{ render, dispose }`.

Modified:

- `defaultLearningState()` / `validateLearningState()` (src/cell-division.js) — add the researchProgram key.
- `migrateScenarioV3` / `migrateScenarioV4` / `migrateScenarioV5` (src/scenario.js) — add `researchProgram: defaultResearchProgram()` to the defaulted learning patches (with truthful warning updates).
- `parseScenario` (src/scenario.js) — `/6` branch → `migrateScenarioV6`.
- `verifyRelease` (scripts/verify-release.mjs) — two new contract rows.

[Classes]

None — module-level factories and frozen catalogs only, per house convention. The dependency-graph cycle check mirrors the existing DFS in `src/organ-research.js`.

[Dependencies]

None. No packages, no runtime network. The only new inputs are the four fetched bibliographic records (PMIDs 42775553, 19587680, 42669985, 24138928) stored as static strings, plus read-only reference text from the local regen-workbench research-desk documents (cited, not copied at length).

[Testing]

- `tests/geroscience-evidence.test.js`: catalog validates; species separation; audit equality (ids, locators, DOIs, quotes >60 chars); mutations reject (dangling source, species, upgraded status, id collisions with all three prior catalogs, empty limitations).
- `tests/research-program.test.js`: node catalog contract — 13 nodes, layers/tiers enums, anchors resolve across all four catalogs, dangling/cyclic dependencies reject (cycle test mutates two nodes into a cycle), each node carries ≥1 open question and 1 inference; evaluator — unconfigured on empty selection, BUILD returns selected, STACK auto-adds prerequisites with requiredBy labels (selecting host-integration pulls functional-tissue-verification, vascularized-volume-printing, stem-cell-supply, genome-stability-gate), INFER returns per-node inferences, programFloor ranks the weakest tier honestly, notices include simulation-only and desk-method caveats; validation rejections (unknown id, duplicates, non-array).
- `tests/research-program-ui.test.js`: harness mirror — 13 node cards grouped by layer, selection proposes a patch accepted by `validateLearningState`, result lists selected + prerequisites + floor + open questions, no derived keys in accepted state, dispose, missing callback throws.
- Existing suites updated as listed; expected total ≈ 112 (104 + 8).
- Release verification: full suite, `npm run check`, `npm run verify:release` (both new checks PASS), `git diff --check`, connected-browser check (node static server): footer v0.12.0-dev, panel renders 13 cards, selecting host-integration pulls the four prerequisites, 0 console errors. Claims scanner remains not-run (documented); compensating checks continue.

[Implementation Order]

1. Write `src/geroscience-evidence.js` + `docs/geroscience-evidence-audit.json` + `tests/geroscience-evidence.test.js`; run.
2. Write `src/research-program.js` + `tests/research-program.test.js`; run.
3. Write `src/research-program-ui.js` + `tests/research-program-ui.test.js`; extend `src/cell-division.js` + `tests/cell-division.test.js`; run.
4. Add the index.html panel + Version-7 note + footer bump; wire `src/cell-learning-ui.js`.
5. Bump `src/scenario.js` to `/7` with `migrateScenarioV6` and chain updates; update `tests/scenario.test.js`; generate `tests/fixtures/scenario-v7.json`; run.
6. Update `scripts/verify-release.mjs` + `tests/release.test.js` + `package.json` (0.12.0-dev).
7. Docs: RESEARCH_PROGRAM.md, SOURCES.md, CHANGELOG, ROADMAP, SCENARIOS, README; run the full suite + verify:release.
8. Connected-browser verification; record in `docs/VERIFICATION.md`.
9. Commit, push `main` (gh credential helper), verify live Pages serves v0.12.0-dev, append live-check paragraph, doc-only commit, push again.

---

# Archived plans

## Archived 0.11.0-dev plan — implemented and pushed as commits 8d9a565 + b301531 on 2026-11-02; preserved verbatim below

# Implementation Plan

[Overview]

Add v0.11.0-dev: a simulation-labeled **applications & breast soft-tissue comparison module** answering the owner's request — "bioprinting for boob jobs versus silicone bags", "not censoring and implement/act after planning and get this sophisticated/advanced/research/cuttingEdge" (2026-11-02). Three deliverables: (1) an **applications ledger** — cosmetic/functional/research entries (ear reconstruction, skin/wound printing, breast soft tissue, hair follicles, human-scale constructs, drug-testing tissues) anchored to twelve newly fetched Europe PMC abstracts; (2) a **hypothetical breast soft-tissue comparison** — silicone implants vs autologous fat grafting vs autologous (DIEP-style) flaps vs hypothetical printed adipose, each with its measured adverse record beside the benefit framing (BIA-ALCL and textured implants; the 74,756-discharge revision study; 12-month fat retention 76.4–84.0% in a small cell-enriched cohort; flap complication ranges), transparent intervention-count arithmetic on user-hypothetical inputs, and the **excluded lever: unregulated injectable fillers** (a measured 10-patient complication series — shown, never selectable); (3) **docs** — `docs/APPLICATIONS.md` (measured/preclinical/research-stage/theory tagged) and `docs/FABRICATION_ANALOGY.md` (the "why organs aren't chips" inversions essay, tagged textbook/theory). Then publish: commit, push, live Pages verification.

Interpretation (same as the 0.9/0.10 rulings): uncensored means the full clinical reality is shown — including the adverse records that marketing omits (BIA-ALCL, revision burden, filler catastrophes, fat necrosis, irradiated-breast retention loss) and the honest absence (no reviewed source demonstrates a bioprinted breast graft in a living human). Clinical language throughout (breast augmentation / reconstruction); augmentation in healthy tissue vs reconstruction after cancer are distinct risk contexts and the module computes neither; no recommendation, no surgical or medical instruction, nothing directed at any person; every measured claim verbatim-quoted in `docs/applications-evidence-audit.json` (tested against the runtime catalog); mouse/animal findings never become human outcomes.

[Types]

**`learning.applicationsPerspective`** (new key in the `/6` learning record; all numeric fields nullable):

- `plannedFatVolumeML: number|null` — 10..2000, hypothetical per-session graft volume
- `resorptionFraction: number|null` — 0..0.99, hypothetical fraction of grafted volume lost (user sets; reviewed retention is a small-cohort anchor, never a default)
- `fatRetouchYears: number|null` — 0.5..10, hypothetical regraft interval
- `implantReplacementYears: number|null` — 1..40, hypothetical implant revision/replacement cadence (no universal schedule exists in the reviewed sources)
- `planningHorizonYears: number|null` — 1..80, horizon for intervention-count arithmetic
- `selectedApproachIds: string[]` — unique, subset of selectable approach ids; the excluded id always rejects

**Ledger record**: `{ id, label, category: 'cosmetic'|'functional'|'research', status: 'measured-in-humans'|'preclinical'|'research-stage'|'theory', anchorClaimIds, adverseClaimIds, summary, caveat }`.

**Approach record**: `{ id, label, category: 'implant'|'graft'|'flap'|'printed'|'excluded', selectable, anchorClaimIds, adverseClaimIds, measuredSummary, theoryNote }`.

**Evaluator result** (`evaluateApplicationsTheory`): `{ status, assumptionOrigin: 'user-hypothetical-simulation', retainedVolumeML, fatSessions, implantInterventions, approachEffects: [{ id, label, note }], anchorSummaries, adverseSummaries, notices }` — nulls while unconfigured.

**Applications evidence catalog** — `APPLICATIONS_EVIDENCE_SCHEMA = 'bioprinting-workbench/applications-evidence/1'`: 12 sources, 12 claims (one per source, species-separated):

- `bia-alcl-2026` / `bia-alcl-textured-implants` (human) — PMID 42625740, DOI 10.3389/fonc.2026.1889467, PMC13489856
- `implant-revisions-2026` / `implant-secondary-procedures` (human) — PMID 42295736, DOI 10.1097/sap.0000000000004800
- `filler-complications-2026` / `unregulated-filler-complications` (human) — PMID 42848728, DOI 10.1159/mpp/adpag032
- `cal-svf-2026` / `cal-fat-retention` (human) — PMID 42420658, DOI 10.1007/s00266-026-06092-8, PMC13630905
- `diep-flap-2026` / `diep-flap-profile` (human) — PMID 42903308, DOI 10.1097/gox.0000000000008185, PMC13680933
- `adipose-bioprint-2025` / `printed-adipose-neovessels` (other, animal in vivo) — PMID 40509638, DOI 10.1002/adhm.202500627
- `adipocyte-print-2026` / `printed-mature-adipocytes` (human, in vitro) — PMID 42780948, DOI 10.48130/els-0026-0006, PMC13599641
- `itop-2016` / `itop-human-scale-constructs` (other, preclinical) — PMID 26878319, DOI 10.1038/nbt.3413
- `skin-bioprint-review-2025` / `skin-bioprinting-status` (other, review) — PMID 39569402, DOI 10.1088/2631-7990/ad878c, PMC11574952
- `hair-skin-print-2025` / `hair-follicle-printing-mice` (mouse) — PMID 40083946, DOI 10.7150/thno.104854, PMC11898285
- `body-on-chip-2022` / `body-on-chip-drug-testing` (other, review) — PMID 35987699, DOI 10.1186/s13287-022-03130-5, PMC9392934
- `ear-dlp-2026` / `auricular-ear-printing` (other, animal preclinical) — PMID 42399996, DOI 10.1186/s13287-026-05156-5, PMC13613730

**Audit JSON**: `docs/applications-evidence-audit.json`, schema `bioprinting-workbench/applications-evidence-audit/1` — verbatim abstract quotes + locators + fetch metadata (Europe PMC REST, 2026-11-02); audit↔runtime equality tested.

[Files]

New:

- `src/applications-evidence.js` — 12 sources + 12 species-separated claims mirroring the aging-evidence validator rules (plus no-id-collision checks against cell-evidence and aging-evidence claims).
- `src/applications.js` — `LEDGER` (6 entries: auricular-reconstruction, skin-wound-printing, breast-soft-tissue, hair-follicle-regeneration, human-scale-constructs, drug-testing-tissues), `APPROACHES` (5: silicone-implant, autologous-fat-graft, autologous-flap, bioprinted-adipose, excluded unregulated-injectables), `NOTICES`, default/validate `applicationsPerspective`, `validateApplicationsCatalog`, `evaluateApplicationsTheory`.
- `src/applications-ui.js` — `createApplicationsUI` rendering the ledger cards and the comparison panel (disabled excluded lever, status/result roles, dispose).
- `docs/APPLICATIONS.md` — ledger narrative + the breast comparison narrative; every number tagged measured/preclinical/research-stage/theory.
- `docs/FABRICATION_ANALOGY.md` — "Why organs aren't chips" (ten inversions), tags [textbook]/[theory] defined upfront; authored reasoning, no fabricated citations.
- `docs/applications-evidence-audit.json` — verbatim quotes.
- `tests/applications-evidence.test.js`, `tests/applications.test.js`, `tests/applications-ui.test.js`.
- `tests/fixtures/scenario-v6.json` — native `/6` fixture with populated applicationsPerspective (300 mL, 0.4 resorption, 3-year retouch, 10-year implant cadence, 30-year horizon, approaches fat-graft + printed-adipose).

Modified:

- `src/cell-division.js` — import default/validate applications functions; `defaultLearningState()` adds `applicationsPerspective`; `validateLearningState` accepts it.
- `src/cell-learning-ui.js` — instantiate/render/dispose `createApplicationsUI`.
- `src/scenario.js` — `SCENARIO_SCHEMA = 'bioprinting-workbench/6'`; new `migrateScenarioV5` (strict /5 contract → defaults applicationsPerspective, truthful warning); `migrateScenarioV4` and `migrateScenarioV3` add the applications default too; `parseScenario` dispatches `/5`.
- `index.html` — applications-ledger panel + breast-comparison panel (5 labeled inputs: apps-fat-volume, apps-resorption, apps-fat-retouch, apps-implant-years, apps-horizon); Version 6 restore note; footer `v0.11.0-dev`.
- `package.json` — `0.11.0-dev`.
- `scripts/verify-release.mjs` — new checks `applications-evidence contract` and `applications catalog contract`.
- `tests/release.test.js` — both new contract validations asserted.
- `tests/cell-division.test.js` — applicationsPerspective default asserts + rejection patches.
- `tests/scenario.test.js` — v5→v6 renames; new v5-migration test; fixture loop gains `scenario-v6.json` (native) and `scenario-v5.json` (migrates from /5); invalid-schema case becomes `bioprinting-workbench/7`; applications fields in round-trip/rejection tests; export purity (no retainedVolumeML/fatSessions in export).
- `docs/SOURCES.md` — 0.10 aging-source catch-up entry + 0.11 applications ledger (same table format).
- `docs/SCENARIOS.md` — Version 6 header/list + Version 5 migration section.
- `CHANGELOG.md` — 0.11.0-dev section; 0.10.0-dev relabeled as pushed.
- `docs/ROADMAP.md` — 0.11 follow-on section.
- `README.md` — feature bullet for `src/applications.js` + docs links.
- `docs/VERIFICATION.md` — 0.11 section with executed checks; live-check paragraph after push (doc-only commit).
- `implementation_plan.md` — this plan; the prior 0.10 plan preserved verbatim below the archive divider.

[Functions]

New:

- `src/applications-evidence.js`: `getApplicationsEvidenceCatalog()`, `validateApplicationsEvidenceCatalog(raw)`.
- `src/applications.js`: `getApplicationsLedger()`, `getApproachCatalog()`, `validateApplicationsCatalog(ledger, approaches, applicationsEvidence)`, `defaultApplicationsPerspective()`, `validateApplicationsPerspective(raw)`, `evaluateApplicationsTheory(settings)`.
- `src/applications-ui.js`: `createApplicationsUI({ elements, onStateChange })` → `{ render, dispose }`.

Modified:

- `defaultLearningState()` / `validateLearningState()` (src/cell-division.js) — add the applicationsPerspective key.
- `migrateScenarioV3` / `migrateScenarioV4` (src/scenario.js) — add `applicationsPerspective: defaultApplicationsPerspective()` to the defaulted learning patch.
- `parseScenario` (src/scenario.js) — `/5` branch → `migrateScenarioV5`.
- `verifyRelease` (scripts/verify-release.mjs) — two new contract rows.

[Classes]

None — module-level factories and frozen catalogs only, per house convention.

[Dependencies]

None. No packages, no runtime network. The only new inputs are the twelve fetched bibliographic records (PMIDs above) stored as static strings in the evidence file and audit JSON.

[Testing]

- `tests/applications-evidence.test.js`: catalog validates; species separation (mouse/other claims never human); every claim has an audit entry with verbatim quote + locator; audit id/source sets equal runtime sets; mutations reject (dangling source, fake species, upgraded status, id collision with cell-evidence or aging-evidence claims, empty limitations, empty locator).
- `tests/applications.test.js`: ledger + approach catalog contracts (ids unique, categories/status enums, anchors/adverses resolve, excluded approach never selectable, evidence-bearing statuses require anchors, mutation rejections incl. making the excluded approach selectable and category moves); evaluator arithmetic (unconfigured on defaults; gate = planned volume + resorption; retainedVolume = planned × (1−r); ceil-based session/intervention counts when cadences present; per-approach notes; anchor/adverse summaries); validation rejections (excluded id, duplicates, out-of-range values, unknown key).
- `tests/applications-ui.test.js`: harness mirror — 6 ledger cards + 5 approach cards render; excluded filler checkbox disabled; patch proposes through `validateLearningState`; result text contains the retention and intervention-count lines and notices; export purity (no derived keys in accepted state); dispose; missing callback throws.
- Existing suites updated as listed; expected total ≈ 106 (96 + 10).
- Release verification: `npm test`, `npm run check`, `npm run verify:release` (both new checks PASS), `git diff --check`, connected-browser check at 127.0.0.1:8096 (footer v0.11.0-dev; ledger + comparison panels; excluded lever disabled; inputs 300 mL / 0.4 / 3 y / 10 y / 30 y → retention and intervention decomposition; 0 console errors). Claims scanner remains not-run (documented); compensating mechanical checks continue.

[Implementation Order]

1. Write `src/applications-evidence.js` + `docs/applications-evidence-audit.json` + `tests/applications-evidence.test.js`; run.
2. Write `src/applications.js` + `tests/applications.test.js`; run.
3. Write `src/applications-ui.js` + `tests/applications-ui.test.js`; extend `src/cell-division.js` + `tests/cell-division.test.js`; run.
4. Add the index.html panels + Version-6 note + footer bump; wire `src/cell-learning-ui.js`.
5. Bump `src/scenario.js` to `/6` with `migrateScenarioV5`; update `tests/scenario.test.js`; generate `tests/fixtures/scenario-v6.json`; run.
6. Update `scripts/verify-release.mjs` + `tests/release.test.js` + `package.json` (0.11.0-dev).
7. Docs: APPLICATIONS.md, FABRICATION_ANALOGY.md, SOURCES.md, CHANGELOG, ROADMAP, SCENARIOS, README; run the full suite + verify:release.
8. Connected-browser verification; record in `docs/VERIFICATION.md`.
9. Commit, push `main` (gh credential helper), verify live Pages serves v0.11.0-dev, append live-check paragraph, doc-only commit, push again.

---

# Archived plans

## Archived 0.10.0-dev plan — implemented and pushed as commits 3ff6630 + 451ab9b on 2026-11-02; preserved verbatim below

# Implementation Plan

[Overview]

Add v0.10.0-dev: a simulation-labeled **hypothetical longevity & aging-barrier module** that takes the owner's eternal-youth goal seriously enough to model what would actually have to be true — a six-barrier catalog anchored to newly fetched, verbatim-quoted geroscience sources (López-Otín et al. hallmarks of aging 2013 and 2023; Ocampo et al. partial reprogramming 2016, mouse; Conboy et al. heterochronic parabiosis 2005, mouse) plus already-reviewed cell-evidence claims, transparent ceiling/logistics arithmetic on user-hypothetical inputs, and the excluded whole-body-including-brain lever shown but never selectable. Then publish: commit, push, live Pages verification.

Owner instruction in this conversation (2026-11-02): "Further develop this project repo such that our bioprinting can get us closer to eternal youth. Plan, seriously, in immense detail, without censoring yourself, then carry out on that plan." Interpreted exactly as the 2026-11-01 "Don't censor yourself. This is just simulation." ruling: ambitious, theory-grade speculative teaching content is welcome; *accuracy*, not censorship, is the constraint. The uncensored answer to "can bioprinting reach eternal youth" is modeled honestly: printed organs could at best address a user-hypothetical share of deaths from single-organ failure; aging itself is systemic, interconnected and multi-hallmark; the only in-vivo amelioration evidence reviewed is mouse reprogramming and mouse parabiosis; no reviewed source demonstrates a human path to indefinite youth; and whole-body replacement including the brain is excluded from arithmetic because no reviewed science bears on continuity of self. "Then carry out on that plan" is the same-message authorization to implement and publish after planning, consistent with the two prior sessions.

Provenance discipline (unchanged): the four new sources were fetched from the Europe PMC REST API on 2026-11-02 and every claim quotes the fetched abstract verbatim in `docs/aging-evidence-audit.json`; claims are third-person restatements with locators; species separation is enforced (mouse findings never become human outcomes); every computed number is labeled user-hypothetical-simulation; no measured timeline, treatment, safety, life-extension or eternal-youth claim is made; adverse and limiting evidence ships beside benefit framing.

[Types]

**`learning.longevityPerspective`** (new key in the `/5` learning record; all numeric fields nullable, null = not specified):

- `singleOrganFailureFraction: number|null` — 0..1, user-hypothetical share of deaths that replacing one organ could in principle address; the module's gate input
- `replacedOrganCount: integer|null` — 1..10, organs on a hypothetical replacement schedule
- `replacementCadenceYears: number|null` — 0.5..50, years between replacements per scheduled organ
- `planningHorizonYears: number|null` — 1..120, horizon for schedule arithmetic
- `selectedBarrierIds: string[]` — unique, subset of selectable barrier ids; the excluded id always rejects

**Barrier record** (`BARRIERS` catalog entries, mirroring `MECHANISMS`): `{ id, label, category: 'ceiling'|'state-of-printing'|'systemic'|'levers'|'cell-intrinsic'|'excluded', selectable: boolean, anchorClaimIds: string[], adverseClaimIds: string[], measuredSummary: string, theoryNote: string }`. Claim ids resolve against the union of `cell-evidence` claims and the new `aging-evidence` claims.

**Evaluator result** (`evaluateLongevityTheory`): `{ status: 'unconfigured'|'calculated', assumptionOrigin: 'user-hypothetical-simulation', addressableCeiling, unaffectedShare, replacementsPerOrgan, totalReplacements, replacementsPerPersonYear, barrierEffects: [{ id, label, note }], anchorSummaries: [claim], adverseSummaries: [claim], notices: string[] }` with nulls while unconfigured.

**Aging evidence catalog** (`AGING_EVIDENCE_SCHEMA = 'bioprinting-workbench/aging-evidence/1'`): sources `{ id, doi, title, journalYear, onlineDate, url, fullTextUrl, identifierStatus, supportStatus, reviewedOn, reviewKind, limitations }` (mirrors cell-evidence sources) and claims `{ id, sourceId, species: 'human'|'mouse'|'other', modelContext, statement, locator, supportStatus, limitations }` (organism-level, so no cellTypeIds binding; species enum and review discipline unchanged).

**Audit JSON** (`docs/aging-evidence-audit.json`, schema `bioprinting-workbench/aging-evidence-audit/1`): `{ schema, fetchedFrom, fetchDate, sources: [{ id, pmid, doi, title, journalYear, url }], claims: [{ id, locator, verbatimQuote }] }` — the runtime catalog and the audit must match exactly (tested).

[Files]

New files:

- `src/aging-evidence.js` — four reviewed sources + five verbatim-anchored, species-separated claims (aging-nine-hallmarks-2013 [other], aging-twelve-hallmarks-2023 [other], reprogramming-in-vitro-age [other], reprogramming-in-vivo-mouse [mouse], parabiosis-systemic-factors [mouse]); `validateAgingEvidenceCatalog` mirrors cell-evidence rules.
- `src/longevity-theory.js` — `BARRIERS` catalog (six barriers incl. excluded `whole-body-including-brain`), `NOTICES`, `defaultLongevityPerspective`, `validateLongevityPerspective`, `validateBarrierCatalog`, `evaluateLongevityTheory`.
- `src/longevity-theory-ui.js` — `createLongevityTheoryUI` mirroring the expansion panel (cards, disabled excluded lever, status/result roles, dispose).
- `docs/LONGEVITY_THEORY.md` — "Could bioprinting reach eternal youth? (simulation theory, not measurement)"; every number tagged [measured] or [theory]; measured anchors quote the fetched abstracts with PMIDs.
- `docs/aging-evidence-audit.json` — verbatim abstract quotes + fetch metadata (audit↔runtime equality tested).
- `tests/aging-evidence.test.js`, `tests/longevity-theory.test.js`, `tests/longevity-theory-ui.test.js` — contract + arithmetic + harness tests mirroring the acceleration-theory suite.
- `tests/fixtures/scenario-v5.json` — native `/5` fixture (mouse-esc system, kurashima method, expansion inputs, populated longevityPerspective: fraction 0.25, 3 organs, 10-year cadence, 60-year horizon, barriers ['systemic-aging-environment','partial-reprogramming-lever']).

Modified files:

- `src/cell-division.js` — import default/validate longevity functions; `defaultLearningState()` adds `longevityPerspective`; `validateLearningState` accepts and validates the key.
- `src/cell-learning-ui.js` — instantiate + render + dispose `createLongevityTheoryUI` exactly like `expansionUI`.
- `src/scenario.js` — `SCENARIO_SCHEMA = 'bioprinting-workbench/5'`; new `migrateScenarioV4` (old four-key learning → defaults longevity with truthful warning); `migrateScenarioV3` retargets `/5` and defaults longevity too; `parseScenario` dispatches `/4`; `/2` chains unchanged; `/1` reset semantics unchanged.
- `index.html` — new longevity panel after the expansion panel; scenario-status helper text says Version 5 and mentions the longevity perspective; footer `v0.10.0-dev`.
- `src/app.js` — no change expected (footer is static; schema consumed through scenario.js).
- `package.json` — version `0.10.0-dev`.
- `scripts/verify-release.mjs` — new checks `aging-evidence contract` and `longevity-theory contract` (catalog validators run against both evidence catalogs).
- `tests/release.test.js` — assert both new contract validations alongside the existing three.
- `tests/scenario.test.js` — v4→v5 renames; new v4-migration test (defaults + warning); fixture loop gains `scenario-v5.json` (native, schema /5) and `scenario-v4.json` now migrates from `/4`; the invalid-schema case becomes `bioprinting-workbench/6`; longevity fields in the round-trip/rejection tests.
- `tests/cell-division.test.js` — default-state key assertions + new rejection patches (excluded barrier id, out-of-range fraction, unknown key).
- `docs/SCENARIOS.md` — Version 5 section + Version 4 migration section; header copy updated.
- `docs/VERIFICATION.md` — new 0.10.0-dev section with executed checks; live-verification paragraph appended after the push (doc-only commit, same as last session).
- `CHANGELOG.md` — 0.10.0-dev section at top; 0.9.0-dev section re-labeled as pushed to main on 2026-11-01.
- `docs/ROADMAP.md` — "Local 0.10.0-dev follow-on" section; 0.9 section updated to reflect publication.
- `README.md` — feature-list bullet for `src/longevity-theory.js` beside the acceleration-theory bullet.
- `implementation_plan.md` — this plan; the prior 0.9 plan is preserved verbatim below the archive divider.

[Functions]

New (all in `/workspace/bioprinting-workbench`):

- `src/aging-evidence.js`: `getAgingEvidenceCatalog()`, `validateAgingEvidenceCatalog(raw)` — schema/source/claim validation mirroring cell-evidence (species enum, locator length, reviewed-source rules, no cross-catalog id collisions with cell-evidence claim ids).
- `src/longevity-theory.js`: `defaultLongevityPerspective()`, `validateLongevityPerspective(raw)`, `getBarrierCatalog()`, `validateBarrierCatalog(barrers, evidenceCatalog, agingCatalog)`, `evaluateLongevityTheory(settings)`.
- `src/longevity-theory-ui.js`: `createLongevityTheoryUI({ elements, onStateChange })` returning `{ render, dispose }`.

Modified:

- `defaultLearningState()` (src/cell-division.js) — adds `longevityPerspective: defaultLongevityPerspective()`.
- `validateLearningState(raw)` (src/cell-division.js) — allowed-keys list gains `longevityPerspective`; delegates to `validateLongevityPerspective`.
- `migrateScenarioV3(raw)` (src/scenario.js) — learning patch gains `longevityPerspective: defaultLongevityPerspective()`; warning text updated truthfully.
- `parseScenario(value)` (src/scenario.js) — adds the `/4` → `migrateScenarioV4` branch before the native `/5` branch.
- `verifyRelease(directory, options)` (scripts/verify-release.mjs) — two new `check(...)` contract rows.

[Classes]

None — the project uses module-level factory functions and frozen catalogs only (no classes anywhere); the new module follows that convention. `BARRIERS`/claims/sources are plain frozen data validated at import time.

[Dependencies]

None. No packages, no build step, no network calls at runtime; the only new "inputs" are the four fetched bibliographic references (PMIDs 23746838, 36599349, 27984723, 15716955) recorded as static strings in the evidence file and audit JSON. Node built-in tests and the existing `npm start` python http.server (verified working in this container) are the only tooling.

[Testing]

- `tests/aging-evidence.test.js`: catalog validates; species separation (mouse claims never human); every claim has an audit entry with a non-empty verbatimQuote and locator; audit id set == runtime id set; mutations (dangling source, unknown species, dropped limitation, empty locator) reject.
- `tests/longevity-theory.test.js`: six-barrier catalog contract (ids unique, one excluded + non-selectable, anchors/adverses resolve across both catalogs, mutations reject); evaluator — unconfigured on nulls, ceiling/unaffected arithmetic at the gate input, schedule arithmetic only when all three schedule inputs present, barrier notes + anchor/adverse summaries for selections, notices include 'Simulation theory only' and 'No reviewed source demonstrates eternal youth'; validation rejections (excluded id, dup ids, fraction 1.5, organs 0, cadence 0.1, horizon 200, unknown key, fraction present without schedule inputs is allowed).
- `tests/longevity-theory-ui.test.js`: harness mirror of the expansion UI tests — six cards render, excluded checkbox disabled with 'shown, never selectable', patch proposes through `validateLearningState`, result text contains the ceiling line and notices, dispose stops callbacks, missing onStateChange throws.
- Existing suites updated as listed in [Files]; expected pass count ≈ 100+ (88 baseline + ~14 new assertions/tests).
- Release verification: `npm test`, `npm run check`, `npm run verify:release` (both new contract checks must PASS), `git diff --check`, then a connected-browser check at 127.0.0.1:8096 (python http.server): footer v0.10.0-dev, six barrier cards, excluded lever disabled, fraction 0.25 → ceiling decomposition, `/5` export carries only inputs, 0 console errors. Claims scanner remains not-run (container Python stdlib incomplete — documented); compensating mechanical checks continue.

[Implementation Order]

1. Write `src/aging-evidence.js` + `docs/aging-evidence-audit.json` + `tests/aging-evidence.test.js`; run them.
2. Write `src/longevity-theory.js` + `tests/longevity-theory.test.js`; run them.
3. Write `src/longevity-theory-ui.js` + `tests/longevity-theory-ui.test.js`; extend `src/cell-division.js` + `tests/cell-division.test.js`; run them.
4. Add the index.html panel, helper-text and footer bump; wire `src/cell-learning-ui.js`.
5. Bump `src/scenario.js` to `/5` with `migrateScenarioV4`; update `tests/scenario.test.js`; generate `tests/fixtures/scenario-v5.json` via `serializeScenario`; run the suite.
6. Update `scripts/verify-release.mjs` + `tests/release.test.js` + `package.json` (0.10.0-dev).
7. Docs: `docs/LONGEVITY_THEORY.md`, SCENARIOS, CHANGELOG, ROADMAP, README; run the full `npm test` + `npm run check` + `npm run verify:release`.
8. Connected-browser verification; record honestly in `docs/VERIFICATION.md`.
9. Commit (message records owner authorization, AI-assisted framing, what was and was not verified), push `main` via the gh credential helper, verify live Pages serves v0.10.0-dev, append the live-check paragraph, doc-only commit, push again.

---

# Archived plans

## Archived 0.9.0-dev plan — implemented and pushed as commits a58062d + d9205e8 on 2026-11-01; preserved verbatim below

# Implementation Plan

[Overview]

Publish the fully verified 0.7.0-dev/0.8.0-dev working tree to GitHub (owner-authorized this conversation: "go ahead and update the github repo"), then add v0.9.0-dev: a simulation-labeled **hypothetical expansion & acceleration theory explorer** that turns the in-conversation mechanism-by-mechanism acceleration analysis into an app module — a mechanism catalog anchored to already-reviewed measured claims plus pure, fully-explained wall-clock arithmetic.

Owner instructions in this conversation, in order: (1) the acceleration-theory question ("could guess/theorize how much acceleration based upon various mechanisms"); (2) **"go ahead and update the github repo"** — explicit commit/push/publication authorization for the existing verified tree (Pages publishes automatically from `main`); (3) "plan for what's next and then implement. Don't censor yourself. This is just simulation."

Interpretation of "Don't censor yourself. This is just simulation": speculative, theory-grade simulated content is in scope and welcome — hypothetical multipliers, an excluded-lever display, theory docs. What still holds is *accuracy*, not censorship: no invented citations or numbers (anchors reuse only claims already reviewed in `src/cell-evidence.js`), every output labeled user-hypothetical/simulation-theory, adverse evidence retained beside benefit framing, and no real-world treatment instructions directed at any person or animal (this app is a simulator; recipes stay cited research descriptions per the owner-revised AGENTS.md). No safety, validation, transplant-readiness or organ-production-timeline claim is made anywhere.

Scope: one module (`src/acceleration-theory.js`) + one UI (`src/acceleration-theory-ui.js`) + learning/scenario integration (schema `/4` extended in place — it has never been published, so no migration debt) + docs + tests + version bump to 0.9.0-dev. Two commits, each verified before its push: commit 1 publishes the 0.7/0.8 milestones as verified; commit 2 publishes 0.9.0-dev. Live Pages verification after each push, reported honestly with propagation caveats.

[Types]

**`learning.expansionTheory`** (new key in the `/4` learning record; all fields nullable, null = not specified):

- `startCells: integer|null` — 1e3..1e12
- `targetCells: integer|null` — startCells+1 .. 1e15 (must exceed start when both set)
- `doublingHours: number|null` — 0.1..1000 (user assumption, never a literature default)
- `overheadHours: number|null` — 0..168 (non-cycling time per passage)
- `splitRatio: integer|null` — 2..100 (seed = harvest/ratio)
- `attritionFraction: number|null` — 0.01..1 (baseline per-passage effective founder/survival fraction)
- `attritionRescuedFraction: number|null` — 0.01..1 (with the attrition-rescue mechanism)
- `mediumPdtMultiplier: number|null` — 0.5..1.5 (1 = unchanged)
- `forkCycleMultiplier: number|null` — 0.7..1.0 (measured anchor: no growth change; hypothetical only)
- `selectedMechanismIds: string[]` — unique, subset of selectable mechanism ids

**Mechanism record** (`MECHANISMS` catalog entries): `{ id, label, category: 'attrition'|'medium'|'replication'|'logistics'|'excluded', selectable: boolean, anchorClaimIds: string[], adverseClaimIds: string[], measuredSummary: string, theoryNote: string }`.

**Evaluator result**: `{ status: 'unconfigured'|'calculated', assumptionOrigin: 'user-hypothetical-simulation', pureDoublings, doublingsPerPassage, passages, attritionExtraDoublings, effectiveDoublings, cycleHours, cyclingHours, overheadTotalHours, totalHours, baselineTotalHours, assumedDefaults: string[], mechanismEffects: [{ id, label, hoursDelta, note }], anchorSummaries: [{ claimId, statement }], adverseSummaries: [{ claimId, statement }], notices: string[] }` with nulls and status `'unconfigured'` until start/target/doubling are set.

[Files]

New:
- `/workspace/bioprinting-workbench/src/acceleration-theory.js` — mechanism catalog, validation, pure evaluator.
- `/workspace/bioprinting-workbench/src/acceleration-theory-ui.js` — event-driven panel subcontroller (repair-research-ui pattern).
- `/workspace/bioprinting-workbench/tests/acceleration-theory.test.js` — catalog integrity + arithmetic + rejection contracts.
- `/workspace/bioprinting-workbench/tests/acceleration-theory-ui.test.js` — DOM-stub harness contract.
- `/workspace/bioprinting-workbench/docs/ACCELERATION_THEORY.md` — the measured-vs-theory write-up (from the in-conversation analysis), simulator-framed.

Modified:
- `src/cell-division.js` — `defaultLearningState()`/`validateLearningState()` gain `expansionTheory`.
- `src/scenario.js` — `/3` and `/2` migration chains add `expansionTheory: defaultExpansionTheory()` defaults; `/4` normalize passes through `validateLearningState` unchanged.
- `src/cell-learning-ui.js` — instantiate/dispose the new subcontroller.
- `index.html` — new wide learning panel (`#expansion-*` elements) after the hypothetical-time-comparison panel; footer `v0.9.0-dev`.
- `src/learning.css` — panel/mechanism-list styles.
- `tests/fixtures/scenario-v4.json` — regenerate with `expansionTheory` present.
- `tests/scenario.test.js`, `tests/cell-division.test.js` — new contracts.
- `scripts/verify-release.mjs` — import + `check('acceleration-theory contract', ...)`.
- `tests/release.test.js` — validate the new catalog in the release contract.
- `package.json` — version `0.9.0-dev`.
- `CHANGELOG.md` — 0.7/0.8 publication entry + 0.9.0-dev entry.
- `docs/VERIFICATION.md`, `docs/ROADMAP.md`, `README.md`, `docs/METHODS.md`, `docs/SCENARIOS.md` — actual-result sections and module references.
- `implementation_plan.md` — this plan; prior plan preserved verbatim below under an archive heading (backup also at `/tmp/bioprint-before-theory-plan-full.md`).

Deleted: none.
[Functions]

New (all in `src/acceleration-theory.js` unless noted):
- `defaultExpansionTheory()` → `{ startCells: null, targetCells: null, doublingHours: null, overheadHours: null, splitRatio: null, attritionFraction: null, attritionRescuedFraction: null, mediumPdtMultiplier: null, forkCycleMultiplier: null, selectedMechanismIds: [] }`.
- `validateExpansionTheory(raw)` — `assertAllowedKeys`; integers enforced for `startCells`/`targetCells`/`splitRatio`; bounds above; `targetCells > startCells` when both set; `selectedMechanismIds` unique and each a selectable catalog id; `attritionRescuedFraction` non-null requires `'attrition-rescue'` selected; `mediumPdtMultiplier` non-null requires `'medium-formulation'`; `forkCycleMultiplier` non-null requires `'fork-speed-push'`.
- `getMechanismCatalog()` → frozen deep copy of `MECHANISMS`.
- `validateMechanismCatalog(raw, evidence)` — unique ids; category enum; `selectable === false` only for `'excluded'`; every `anchorClaimId`/`adverseClaimId` exists in `evidence.claims`; non-logistics categories require ≥1 anchor; `'replication'` and `'excluded'` require ≥1 adverse anchor; text fields nonempty.
- `evaluateExpansionTheory(raw)` — pure; validates first. `unconfigured` until start/target/doubling set. Arithmetic (defaults `splitRatio ?? 4`, `overheadHours ?? 0`, recorded in `assumedDefaults`): `cycleHours = doublingHours × (mediumPdtMultiplier ?? 1) × (forkCycleMultiplier ?? 1)`; `pureDoublings = log2(target/start)`; `passages = ceil(pureDoublings / log2(splitRatio))`; attrition fraction `f` = (`attrition-rescue` selected && rescued set) ? rescued : (attritionFraction ?? 1); `attritionExtraDoublings = passages × (−log2(f))`; `effectiveDoublings = pureDoublings + attritionExtraDoublings`; `totalHours = effectiveDoublings × cycleHours + passages × overheadHours`; `baselineTotalHours = pureDoublings × doublingHours + passages × (overheadHours ?? 0)`; `mechanismEffects` per selected id with first-order deltas (attrition: `passages × (−log2(f_base) + log2(f_rescued)) × cycleHours` when both fractions set; medium: `pureDoublings × doublingHours × (m − 1)`; fork: `pureDoublings × doublingHours × m × (k − 1)`; logistics: `(passages_baseline − passages_r) × overhead`-style overhead-amortization note); `anchorSummaries`/`adverseSummaries` pulled from the evidence catalog for all selected + displayed mechanisms; `notices` fixed strings (idealization/non-multiplication, gate-arithmetic caveat, organ-timeline disclaimer, simulation labeling).
- `createExpansionTheoryUI({ elements, onStateChange })` (`src/acceleration-theory-ui.js`) — renders mechanism cards (selectable checkboxes; excluded lever rendered struck-through, never checkable), inputs, evaluated decomposition, anchors with source links, adverse warnings, status line; input `change` events propose `expansionTheory` patches through `onStateChange`; `dispose()` removes listeners and ignores later events.

Modified:
- `defaultLearningState()`/`validateLearningState()` (`src/cell-division.js`) — add `expansionTheory: defaultExpansionTheory()` / `validateExpansionTheory(raw.expansionTheory)`; allowed-keys list grows.
- `migrateScenarioV3` (`src/scenario.js`) — default `expansionTheory` beside the existing `planningComparison` default; `migrateScenarioV2` chains through V3 unchanged.
- `createCellLearningUI` (`src/cell-learning-ui.js`) — `expansionUI = createExpansionTheoryUI({ elements, onStateChange: patch => propose(patch) })`; `render()` calls `expansionUI.render(state)`; `dispose()` chains.
- `verifyRelease` (`scripts/verify-release.mjs`) — new check `'acceleration-theory contract'` validating the mechanism catalog against the evidence catalog.

[Classes]

None. The codebase uses functional module factories; `createExpansionTheoryUI` follows the existing `createRepairResearchUI`/`createMethodRecipesUI` subcontroller pattern (closure state, explicit `dispose`, DOM-only, no framework).

[Dependencies]

No new runtime packages; Node built-ins and the vendored Three.js 0.187.0 are unchanged. No new external sources: anchors reuse claims already reviewed in `src/cell-evidence.js` (`halliwell-survival`, `msc-variability`, `pluripotent-cycle`, `culture-selection`, `kurashima-fork-acceleration`, `kurashima-miscoordination`). Nothing is fetched at runtime. Git identity is the existing repo-local configuration (Dylan Stechmann); commit messages disclose AI-assisted development per repo convention.

[Testing]

- `tests/acceleration-theory.test.js`: catalog integrity (unique ids; anchors/adverses exist in the evidence catalog; excluded lever not selectable; replication category carries adverse anchors; logistics may be anchorless); evaluator arithmetic (e.g. start 1e6 → target 1e12, 24 h, 1:4 split, 4 h overhead: pureDoublings ≈ 19.93, passages = 10, baseline ≈ 518 h; attrition f = 0.40 vs 0.72 → extra doublings 13.2 vs 4.7 → rescuing saves ≈ 8.5 doublings); defaults recorded in `assumedDefaults`; `unconfigured` status with nulls; rejections (target ≤ start, non-integer cells/ratio, NaN/Infinity, out-of-bounds, unknown/duplicate mechanism ids, multiplier without its mechanism selected, forged keys); notices contain the simulation and organ-timeline disclaimers; selecting fork-speed-push surfaces the measured no-growth-change anchor and adverse summaries.
- `tests/acceleration-theory-ui.test.js` (DOM-stub harness): renders mechanism cards; excluded lever not checkable; input events propose validated patches; events ignored after dispose; requires the state-change callback.
- `tests/scenario.test.js`: `/4` round-trip carries `expansionTheory`; forged values (unknown mechanism, out-of-bounds, multiplier-without-mechanism) reject; fixture restore asserts the new field; v3/v2 migrations default it.
- `tests/cell-division.test.js`: default learning state includes `expansionTheory`; rejections mirrored.
- `tests/release.test.js`: `validateMechanismCatalog` included in the release-contract test.
- Full local verification before each push: `node --test tests/*.test.js`, `node scripts/check-syntax.mjs`, `node scripts/verify-release.mjs`, `git diff --check`; connected-browser check of the new panel (inputs → decomposition text, adverse anchors visible, export includes `expansionTheory`, theme switch still clean, 390 px no overflow).
- Live Pages verification after each push: fetch the site, confirm footer version and reachability of a newly added file (`/src/environment.js` after commit 1, `/src/acceleration-theory.js` after commit 2); report propagation lag honestly.

[Implementation Order]

1. Back up the current `implementation_plan.md` to `/tmp/bioprint-before-theory-plan-full.md`; write this plan as the active section, preserving the prior plan verbatim below an archive heading.
2. **Commit 1 + push** (repo update, owner-authorized): stage and commit the entire verified 0.7.0-dev/0.8.0-dev tree (including this plan and CHANGELOG entries), push `main`; this publishes v0.8.0-dev to GitHub Pages automatically. Verify the live site.
3. Implement `src/acceleration-theory.js` + `tests/acceleration-theory.test.js`; run the suite until green.
4. Extend `src/cell-division.js` learning state and `src/scenario.js` migrations; regenerate `tests/fixtures/scenario-v4.json`; update `tests/scenario.test.js` and `tests/cell-division.test.js`.
5. Implement `src/acceleration-theory-ui.js`; wire into `src/cell-learning-ui.js`; add the `index.html` panel and `src/learning.css` styles; add `tests/acceleration-theory-ui.test.js`.
6. Docs + version: `docs/ACCELERATION_THEORY.md`, CHANGELOG 0.9.0-dev entry, VERIFICATION/ROADMAP/README/METHODS/SCENARIOS updates, `package.json` + footer `0.9.0-dev`; extend `scripts/verify-release.mjs` and `tests/release.test.js`.
7. Full verification (tests, syntax, release contract, browser, whitespace); record actual results in VERIFICATION.md.
8. **Commit 2 + push**: commit 0.9.0-dev and push; verify the live Pages site (footer `v0.9.0-dev`, `/src/acceleration-theory.js` reachable). No tag, no release object, no Pages-config changes; pushing `main` is the only publication action, exactly as authorized.

---

# Archived plan — 0.7.0-dev/0.8.0-dev era (superseded by the active plan above; preserved verbatim)

# Implementation Plan

[Overview]

Add owner-authorized, source-bound published-method reference recipes (restating actionable in vitro research parameters from verified open-access papers), a human/mouse genome-maintenance evidence comparison, an independent hypothetical timeline calculator, species-separated cell-study contexts, and an original interactive Treedome-inspired 3D setting, without claiming validated timeline acceleration, safe DNA repair, transplant readiness or any whole-organ production forecast.

## Request, approvals and boundaries — November 1, 2026 (revised)

Owner instructions in this conversation, in order:

1. "add dna repair recipes/methods so that we can accelerate the timelines";
2. selection of every offered direction (methods evidence comparison, independent hypothetical time calculator, and protocol investigation), a 3D interactive simulation at Sandy Cheeks's house from SpongeBob SquarePants, and cell systems beyond humans and into animals;
3. **"you can have actionable laboratory recipes. Don't have a gated workstream."** This revises the repository's earlier owner-approved procedure boundary (2026-11-01) that prohibited restating actionable lab parameters. Recipes are now first-class scope and the previously planned gate is removed.

**Plan only.** This task changes `/workspace/bioprinting-workbench/implementation_plan.md` only. No application code, assets, scenario data or `AGENTS.md` text changes now; the guidance revision below is the first implementation step and begins only after this plan is confirmed. Preserve all tracked and untracked work. Commit, push, release and publication remain separate approvals; a push to the existing Pages branch may publish automatically.

**What the recipe authorization covers — and what still holds.** The owner may and did revise repository guidance. These limits are not removed by that instruction; they keep the content honest and defensible:

- **Provenance, not invention.** Every actionable parameter (concentration, time, temperature, volume, seeding density, device setting) must be transcribed from an open-access primary source opened in-session during implementation, with a section/table locator. Inventing, optimizing, extrapolating or improving a protocol is out of scope because it has no source. Where a method step cannot be verified, the recipe states "not restated from the reviewed source"; absence is an acceptable deliverable.
- **Research description, not treatment direction.** Recipes describe what published researchers did in in vitro studies, phrased about the researchers ("Halliwell et al. reported…"), never as second-person instructions to a reader. No sentence applies any method to a person or animal, and no recipe is framed as transplant preparation, therapy or a clinical procedure.
- **No validation, safety or timeline-acceleration claims.** Measured endpoints are cited exactly. Reviewed adverse evidence ships beside every related benefit claim. No "safe", "validated", "cancer-free" or "transplant-ready" language, and no claim that a recipe accelerates expansion or organ production.
- **No vendor, pricing or clinic content.** Reagents are named as the source names them, for study identification only; no recommendations, suppliers, prices or clinics.

**Species scope.** Human and mouse cell systems first, from verified sources; other animal systems enter only with their own verified evidence. Sandy is a fictional setting reference, not squirrel-biology evidence; SpongeBob is not a specified sponge cell line.

**Treedome setting.** Original procedural dome, tree, treehouse room and underwater surroundings inspired by the requested fictional setting; no ripped models, show frames, music, dialogue or logos; a visible fan-made unofficial credit; the theme changes presentation only and supplies no biological parameters.

## Investigation and scientific decision record

- HEAD `08af88f`; local `0.7.0-dev`; strict scenario `/3`; ten human-oriented cell profiles; event-driven learning controller; independent arithmetic/oxygen/flow modules; static authored evidence; Three.js browser app; Node built-in tests; no framework or runtime packages. No TODO/FIXME found in targeted search.
- Baseline rerun November 1, 2026, Node v24.18.1: **66 tests passed, 0 failed, 0 skipped; 40 modules syntax-checked**; `git diff --check` clean. Log `/tmp/bioprint-repair-plan-baseline.txt`. Terminal integration sometimes reports unknown completion; actual command logs are the evidence, not shell status lines.
- `src/cell-evidence.js` claims already carry `species: human|mouse|other`, but profiles are human-oriented with no cell-system discriminator; species filtering must be added at claim/system level without relabeling existing profiles.
- `src/cell-division.js` implements only `2 ** doublings`, optional hypothetical hours and a horizon annotation. `src/scenario.js` strictly rejects unknown keys, so new inputs require a `/4` migration, not looser parsing.
- `src/scene.js:createLab` owns room, bench, equipment, controls and partial disposal; decorative context is not yet separable and `dispose()` does not release every shared resource. Theme work needs explicit ownership and lifecycle tests.
- Three DOIs re-resolved November 1, 2026 (OK, no flags; no expected-title MATCH requested): `/tmp/bioprint-repair-plan-refs.json`. Resolution is not claim support.
- Verified recipe-relevant parameters already read in-session from fetched full text:
  - **Halliwell et al. 2020**, DOI `10.1016/j.stemcr.2020.04.004`, PMC7355123 (Europe PMC full text): studied human PSC cultures were reported as supplemented with a formulation of "15 μM cytidine, 15 μM guanosine, 15 μM uridine, 15 μM adenosine, and 6 μM thymidine" (Results). Reported endpoints: increased replication-fork speed and DNA fiber lengths, decreased origin density, decreased genome-damage markers and mitotic aberrations, and improved survival, clonogenicity and population growth in the studied lines. Culture endpoints only — no mutation reversal, cancer prevention or transplant safety.
  - **Bhat et al. 2021**, DOI `10.1038/s41598-021-83088-1`, PMC7873235 (Europe PMC full text): BM-MSC media comparisons at seeding densities of 1000 and 5000 cells/cm² across P4→P5, incubation described at 37 °C and 5% CO₂; reported population doubling times varied by formulation (caption comparison about 21.89–45.7 h, with media-specific results differing; endpoints are not pooled).
  - **Kurashima et al. 2024**, DOI `10.1038/s44319-024-00207-5`, PMC11387781 (Europe PMC abstract): mouse ES cells; forced replication-fork acceleration with nucleosides was reported together with miscoordination between replication completion and cell-cycle progression and genome instability. This adverse evidence ships beside nucleoside-related benefit claims; detailed results claims stay unreviewed until their full-text sections are audited.
- Remaining method details (complete medium composition, substrate, passaging intervals, vessel/device settings) must be extracted from each paper's Methods at implementation; only parameters actually present in fetched text are restated. PMC browser access was intermittently challenged; Europe PMC XML succeeded. The audit file records which sections were readable.
- The human and mouse studies differ in species, cell state, conditions and endpoints; findings are shown side by side without averaging, cross-species extrapolation, or declaring a simple contradiction.
- Preservation: the superseded draft active section is backed up at `/tmp/bioprint-before-recipe-plan-active.md`; the prior 0.7 plan and its four-milestone archive remain verbatim below.

[Types]

Plain JavaScript records with JSDoc, validated with the existing `assertAllowedKeys`, `assertPlainRecord`, `finite`, `text`, `validateSource` helpers. Reject unknown keys, invalid enums, nonfinite values, unsafe URLs, duplicate IDs and dangling references. Bound strings (<=2000) and arrays (<=32; catalog rows <=128). Export defensive clones. Distinguish authored evidence, recipe reference content, user inputs, derived arithmetic and fictional theme metadata.

1. `SpeciesId = 'human' | 'mouse' | 'other'` (`other` requires a nonempty `speciesLabel` and is not a transferable evidence category). Initial selectable systems are human and mouse only.
2. `CellSystem = { id, speciesId, speciesLabel, cellTypeId, label, origin: 'primary'|'pluripotent'|'derived'|'unspecified', evidenceStatus: 'reviewed'|'not-established', claimIds, timingIds, limitations }`. `cellTypeId` references an existing category ID. Seed one explicit human system per legacy profile plus `mouse-esc`; do not fabricate mouse timing for other categories.
3. Extend `EvidenceClaim`/`TimingObservation` usage with species/system matching at the system layer; existing `EvidenceSource`, `EvidenceClaim`, `TimingObservation`, `CellProfile` exports stay compatible. New sources are constructed with explicit support status (no review-by-default); `reviewKind` stays `agent-source-reading`.
4. `MethodEvidence = { id, label, category: 'replication-support'|'damage-prevention'|'repair-pathway-context'|'quality-assessment', cellSystemIds, sourceIds, claimIds, mechanismSummary, measuredEndpoints, comparatorSummary, observedOutcome: 'improved-endpoint'|'adverse-endpoint'|'mixed'|'not-established', timelineEvidence: 'not-established'|'reported-study-endpoint', timelineClaimIds, unmeasuredEndpoints, limitations, operationalStatus: 'summary-only' }`. Reviewed sources and claim locators are required for any asserted outcome. No efficacy percentage, safe/ready flag or automatic speed multiplier.
5. `RepairResearchCatalog = { schema: 'bioprinting-workbench/repair-research/1', systems, methods }` with separate human (Halliwell) and mouse (Kurashima) method rows, adverse outcome prominent, plus a quality-assessment row distinguishing observation from intervention.

### Published-method reference recipes (owner-authorized actionable scope)

6. `RecipeParameter = { name, value, unit: string|null, sourceId, locator, note: string|null }`. `value` renders the published parameter verbatim (e.g., "15", "1000", "37 °C / 5% CO₂"); a numeric `value` requires a non-null `unit` unless the source is explicitly unitless; names stay generic.
7. `RecipeStep = { id, title, body, parameters: RecipeParameter[], sourceIds }`. `body` is a third-person description of what the researchers did; second-person instructions are rejected by the validator.
8. `MethodRecipe = { id, methodEvidenceId, cellSystemIds, title, summary, steps, observedEndpoints, adverseEvidenceIds, timelineEvidence: 'not-established'|'reported-study-endpoint', limitations, framing: 'published-research-description' }`. Every recipe links to reviewed `MethodEvidence`; recipes with related reviewed adverse claims require nonempty `adverseEvidenceIds`.
9. `RecipeCatalog = { schema: 'bioprinting-workbench/method-recipes/1', recipes }`. Validator enforces source+locator for every parameter, species consistency between recipes and their systems, the imperative/safety phrasing blocklist, and that recipe content stays within what the cited sources state. Recipes are authored reference content and are not scenario inputs or exports.
10. `PlanningComparison = { baselineHours: number|null, comparisonHours: number|null }` (both null by default; finite >0 and <=1,000,000 when present; software bounds, not biological windows). `PlanningComparisonResult = { status: 'incomplete'|'calculated', differenceHours, relativeChangePercent, assumptionOrigin: 'user-hypothetical', notice }` with `differenceHours = baseline - comparison` and `relativeChangePercent = 100 * difference / baseline`. Signed output; never clamped; not linked to any method or species.
11. Scenario `/4`: `learning = { selectedCellType, selectedCellSystemId, selectedMethodId: string|null, division, researchHorizonYears, planningComparison }` (system must match cell type; method must apply to that system) and `view = { camera, reveal, environment: 'lab'|'treedome' }`. `/1` resets as today; strict `/2` and `/3` migrations add defaults (human system mapping, no method, null durations, lab theme) with truthful warnings. Unknown future schemas reject.
12. `EnvironmentSpec = { id: 'lab'|'treedome', label, description, attribution, fictional: boolean, presetBounds: { center, radius } }`; `EnvironmentHandle = { setEnvironment(id), update(clock, { reducedMotion }), diagnostics(), dispose() }` with owned groups and idempotent teardown; no arbitrary asset URLs.

[Files]

New (created during implementation only, not in this planning task):

- `/workspace/bioprinting-workbench/src/repair-research.js` — authored cell systems and method-evidence comparison with strict validation and defensive-clone getters.
- `/workspace/bioprinting-workbench/src/method-recipes.js` — authored recipe catalog with provenance-bound parameters, strict validation and getters.
- `/workspace/bioprinting-workbench/src/method-recipes-ui.js` — accessible recipe reference panel: per-step parameters with source links, measured endpoints, adverse evidence and limits.
- `/workspace/bioprinting-workbench/src/planning-comparison.js` — nullable hypothetical-duration validation and pure signed arithmetic.
- `/workspace/bioprinting-workbench/src/repair-research-ui.js` — event-driven species/system/method comparison controller and separate hypothetical comparison inputs.
- `/workspace/bioprinting-workbench/src/environment.js` — original procedural lab-room and Treedome-inspired context groups, theme registry, resource ownership and cleanup.
- `/workspace/bioprinting-workbench/tests/repair-research.test.js`, `tests/method-recipes.test.js`, `tests/method-recipes-ui.test.js`, `tests/planning-comparison.test.js`, `tests/repair-research-ui.test.js`, `tests/environment.test.js`.
- `/workspace/bioprinting-workbench/tests/fixtures/scenario-v4.json` (retain v2/v3 fixtures for migration coverage).
- `/workspace/bioprinting-workbench/scripts/browser-repair-research.js` — bounded connected-Playwright checks with configurable base URL; no npm browser dependency.
- `/workspace/bioprinting-workbench/docs/METHOD_RECIPES.md` — full reference cards: steps, parameters with locators, measured endpoints, adverse evidence, limits.
- `/workspace/bioprinting-workbench/docs/REPAIR_METHODS.md` and `/workspace/bioprinting-workbench/docs/ENVIRONMENTS.md`.
- `/workspace/bioprinting-workbench/docs/method-recipes-audit.json` — identifier results, fetched-section readability record, parameter locators, verification dates, explicit absence of independent review.

Existing files to modify:

- `/workspace/bioprinting-workbench/AGENTS.md` — **first implementation step**: replace the 2026-11-01 procedure boundary with the owner's revised instruction: published open-access method parameters may be restated as cited research-reference content, provided every parameter traces to a verified primary source, phrasing stays third-person research description, nothing is directed at treating any person or animal, and no validation/transplant-readiness claim is made. All other guidance (disclosure, limitations, credits, no server endpoints) unchanged.
- `src/cell-evidence.js` — add the mouse ES source with scoped claims only after full-text audit; explicit support status for new rows; species/system exclusion checks.
- `src/cell-division.js` — extend `defaultLearningState`/`validateLearningState`; `evaluateRelativeDivision` equations unchanged.
- `src/cell-learning-ui.js` — coordinate the new comparison and recipe subcontrollers under one state owner; render only species-consistent evidence.
- `src/scenario.js` — `/4` plus strict `/3` migration (chained from `/2`/`/1`); never accept `/4` fields in `/3`.
- `src/scene.js` — extract decorative context to the environment module; additive `setEnvironment`; theme-aware framing; owned-resource disposal. Equipment mounts, camera presets, gates and construct equations unchanged.
- `src/app.js` — theme control and canonical view state; `/4` restore before effects; failed-import state retention; no-WebGL fallback intact.
- `index.html` — species/system/method selectors, recipe reference section, separate hypothetical comparison inputs, theme control and fiction badge; keep every existing limitation statement.
- `src/learning.css` — responsive recipe/comparison panels readable without color alone; reduced-motion support.
- `tests/cell-evidence.test.js`, `tests/cell-division.test.js`, `tests/scenario.test.js` — compatibility, migration and identity constraints.
- `scripts/browser-smoke.js` — expect `/4`; retain storyboard/fit/fallback coverage.
- `scripts/verify-release.mjs` and `tests/release.test.js` — validate the new authored catalogs in the release contract.
- `README.md`, `docs/{SOURCES,GENOME_STABILITY,CELL_DIVISION,SCENARIOS,METHODS,ROADMAP,RELEASE,VERIFICATION}.md`, `CHANGELOG.md` — new capabilities, provenance rules, fiction separation, actual results.
- `package.json` and the in-app footer — matching `0.8.0-dev` marker only when implementation is accepted; no publication labeling.

Unchanged: no deletions or moves; no new GLBs required; `src/{model,oxygen,oxygen3d,calibration,calibration3d,flow,numerics,analysis-worker}.js` equations; the 16 walkthrough gate IDs; existing asset hashes; no AGENTS.md edit during planning (it is step 2 of implementation).

[Functions]

New:

- `src/repair-research.js`: `validateRepairResearchCatalog(raw, evidence)`, `getRepairResearchCatalog()`, `getCellSystems({ speciesId, cellTypeId })`, `getMethodsForCellSystem(systemId)`, `getCellSystemEvidence(systemId)`, `defaultCellSystemId(cellTypeId)` (stable legacy human mapping; no rate inference).
- `src/method-recipes.js`: `validateRecipeCatalog(raw, evidence, research)` (per-parameter source+locator enforcement, unit rules, third-person phrasing blocklist, adverse-evidence linkage, species consistency), `getRecipeCatalog()`, `getRecipesForMethod(methodEvidenceId)`, `getRecipesForCellSystem(systemId)`, `getAdverseEvidenceForRecipe(recipeId)`.
- `src/method-recipes-ui.js`: `createMethodRecipesUI({ elements, onStateChange })` — recipe cards rendered with textContent and safe external anchors; disposal removes listeners; no duplicate state ownership.
- `src/planning-comparison.js`: `defaultPlanningComparison()`, `validatePlanningComparison(raw)`, `evaluatePlanningComparison(raw)` — pure, signed, nonpredictive.
- `src/repair-research-ui.js`: `createRepairResearchUI({ elements, onSelectionChange, onComparisonChange })` — validated proposals only; ignore events after dispose; incompatible system change clears method selection with a status explanation.
- `src/environment.js`: `getEnvironmentSpecs()`, `validateEnvironmentId(id)`, `createEnvironment({ THREE, parent, reducedMotion })` with private `buildLabContext`, `buildTreedomeContext`, `disposeOwnedResources`; never disposes shared bench/equipment or foreign objects; idempotent.
- `src/scenario.js`: `migrateScenarioV3(raw)` — strict old-contract validation, human-system mapping, defaults, truthful warning; no input mutation.

Modified:

- `defaultLearningState`/`validateLearningState` (cell-division.js): new selection and comparison fields; avoid import cycles (repair-research and planning-comparison depend only on validation/evidence).
- `validateEvidenceCatalog` and source construction (cell-evidence.js): explicit status for new sources; no invented system-specific timing.
- `createCellLearningUI` (cell-learning-ui.js): single state owner coordinating research and recipe subcontrollers.
- `createLab` (scene.js): additive `setEnvironment`; theme-aware `view(name)`; `dispose()` exactly once for owned context resources; diagnostics report environment separately from scientific state.
- `scenarioState`, `prepareScenarioApplication`, `commitScenarioApplication`, `applyScenario` (app.js): `/4` validation before mutation; rollback on commit failure; theme restoration for older versions.
- `SCENARIO_SCHEMA`, `createScenario`, `normalize`, `parseScenario`, `migrateScenarioV1`, `migrateScenarioV2`, `serializeScenario` (scenario.js): `/4` contract; chained strict migrations; `migratedFrom` reported accurately.
- `verifyRelease`, `collectReleaseInventory`: new catalog checks; external reviews remain explicitly not-run.

Removed: none. No `applyRepair()` API; no automatic mapping from any method or recipe to `hypotheticalDoublingHours`, planning durations or horizon.

[Classes]

No new, modified or removed application classes. Continue closure-based controllers, pure validated records and existing Three.js composition. No renderer/controls subclassing, global store, server endpoints or framework. Vendored Three.js and Worker classes remain unmodified.

[Dependencies]

No new runtime, npm, Python or paid-generation dependencies. Existing pinned Three.js, ES modules, DOM APIs, Node built-ins (test/fs/crypto/child_process) and the connected Playwright only. Original procedural artwork needs no external asset service. Source verification and full-text extraction are development-time tasks, never runtime API calls. No Docker layer, credentials, analytics or new deployment workflow.

[Testing]

1. **Recipe provenance:** every parameter carries a valid `sourceId` + `locator`; numeric values require units (or explicit source unitless); reject invented values, second-person imperatives, safety/validation phrasing, recipes without reviewed `methodEvidenceId`, missing adverse linkage where reviewed adverse claims apply, species/system mismatch, vendor-recommendation phrasing, and any parameter absent from the audit's fetched-section record.
2. **Recipe review:** at implementation, re-open each primary source's Methods; record readable sections; only restate parameters present in fetched text; audit JSON matches the runtime catalog exactly; claims scanner run on recipe prose (advisory; the documented HIGH disclosure false positive is reported, not hidden); every recipe sentence manually reread.
3. **Evidence contracts:** human/mouse system separation; no mouse row receives human timing; empty evidence renders "not established"; reject duplicate/dangling IDs, unsafe URLs, unsupported endpoint assertions and species mismatches.
4. **Comparison arithmetic:** null/partial/equal/signed cases; bounds; string coercion, zero, NaN/Infinity and unknown keys rejected; results never stored as evidence and never change division, storyboard, flow or oxygen values.
5. **Controllers:** single state owner; system/category compatibility; intentional resets with status; listener cleanup; idempotent disposal; safe rendering; null hours stay blank.
6. **Scenario:** `/4` input-only round trip including mouse system, recipe-relevant method selection, hypothetical durations and treedome theme; defensive clones; strict older migrations preserve inputs and warn; reject extra fields in old schemas, incompatible selections, invalid environment, forged repair-success/cancer/organ-completion outputs; invalid import retains all state; injected commit failure attempts rollback.
7. **Rendering:** lab parity before/after extraction; deterministic Treedome geometry; readable bench/construct; repeated theme switches do not grow owned object/material/texture counts; teardown once; late equipment completion safe; WebGL failure leaves recipes, text evidence, theme selection and imports usable; theme never alters `sample()` or independent model results.
8. **Browser:** desktop and 390 px; keyboard-only navigation of selectors, recipe cards and theme control; reduced motion; visible adverse findings; no page errors or horizontal overflow; actual `/4` download; strict `/1`–`/3` imports; no-WebGL, blocked-asset and blocked-worker; root and Pages-style subpath. Keep each connected-tool batch under its timeout; log not-run cases distinctly.
9. **Final:** `npm test`, `npm run check`, `npm run verify:release`, asset hashes, source re-resolution, claims scan, `git diff --check`; read every new/edited file and the full tracked+untracked diff; record actual counts, interpreter and not-run cases. Existing 66 tests and 16 gate IDs must not be weakened. Acceptance never includes laboratory execution, guaranteed acceleration or any biological validation claim.

[Implementation Order]

1. Present this plan; wait for explicit implementation confirmation; reconfirm sole writer and environment.
2. Revise `/workspace/bioprinting-workbench/AGENTS.md` to the owner's revised recipe boundary (first implementation edit), preserving every other rule.
3. Open and verify primary Methods sections (Halliwell, Bhat, Kurashima full text; additional sources only if needed); record readable sections and extractable parameters in `docs/method-recipes-audit.json`.
4. Write failing tests, then implement `repair-research.js` (systems, method comparison, adverse evidence) with mouse ES claims only after their full-text audit.
5. Write failing tests, then implement `method-recipes.js` recipe cards strictly from verified parameters.
6. Implement `planning-comparison.js` with contract tests.
7. Add the `/4` fixture, strict migrations and scenario tests before UI integration.
8. Build `repair-research-ui.js` and `method-recipes-ui.js`; integrate under `cell-learning-ui` with a single state owner; keep hypothetical inputs visually separate from literature findings.
9. Extract neutral room context into `environment.js` with parity/lifecycle tests; then add the original Treedome-inspired procedural setting and attribution; keep lab default and camera/equipment compatibility.
10. Integrate theme and learning state into `app.js` restore/diagnostics; add rollback, no-WebGL and independence checks; do not change worker/model equations or gate IDs.
11. Update documentation, source ledger, audit files, release-verification contract and the matching `0.8.0-dev` marker for the accepted local implementation.
12. Execute all unit/syntax/source/claims/asset/diff and bounded browser checks; inspect neutral and Treedome screenshots; record actual results and remaining evidence gaps.
13. Present the complete local diff and limitations; stop before staging, commit, push or publication. Any release request is a separate approval.

**Acceptance:** the workbench shows cited, actionable published-method reference recipes with verified parameters and adverse evidence; users can compare human/mouse method evidence, compute hypothetical time differences, explore the fictional Treedome setting, and restore `/1`–`/4` scenarios. No content claims recipes accelerate organ timelines, guarantee safe DNA repair, or direct treatment of any person or animal.

---

## Archive — prior 0.7 hardening and learning plan, preserved verbatim

The previous document body follows unchanged, including its older four-milestone archive. Its historic plan-only status/baselines do not describe the already implemented current working tree; the new plan above governs the next task.

[Overview]

Audit and harden the unpublished workbench, prepare an explicitly authorized release, and add evidence-separated learning tools for cell division, genome stability, culture locations, and the barriers to whole-organ engineering.

## Current scope and authority — November 1, 2026

The owner requested all three workstreams and coverage of mesenchymal stromal cells (MSCs), endothelial cells, fibroblasts, pluripotent stem cells including iPSCs, and liver-relevant cells. The long-term aspiration includes entire organs and body parts, even over years. This iteration makes that aspiration inspectable as research questions; it does not implement an organ fabrication protocol or claim that elapsed time can produce a functional liver. A seven-year horizon is an owner-selected hypothetical, not an estimated liver-production time.

**Plan only.** Sole-editor ownership was reconfirmed by the owner in this conversation. Only this document may be edited now. Implementation, commit, push, release creation and publication are distinct approval gates. The earlier approved four-milestone plan is preserved verbatim below the archive divider; it describes work already implemented locally, not new work to repeat. Its original SHA-256 was `6def5457594f0f8363c4a521bf756b1b24a9e7ee2768d077cc767ef6a9e105be`; a scratch backup is `/tmp/bioprint-previous-implementation_plan.md`.

## Investigated baseline

- Repository `/workspace/bioprinting-workbench`, HEAD `08af88f`, substantial tracked modifications and untracked implementation files. Do not reset, clean, regenerate GLBs, or overwrite them from HEAD. Process listings include other application/agent services but do not establish another writer; the owner's sole-editor confirmation is the authority, not a process-name inference.
- Browser-native JavaScript ES modules, HTML/CSS, Node built-in tests, Blender Python, vendored Three.js 0.187.0. No TypeScript, framework, package dependencies, build pipeline or local `.github` workflow directory. Maintain those conventions.
- Current implementation: pure PCG/oxygen/fit/flow modules, worker/client, event-driven analysis UI, strict scenario /2 with warned/reset /1 migration, four independently loaded equipment GLBs. Keep oxygen, flow and growth independent.
- Stage 0 remains a scripted linear expansion in `sample()`; playback advances storyboard units, not biological time. `createLab().update()` reveals a bounded set of dish-cell icons. Do not relabel this as a cell-cycle simulation.
- `createAnalysisUI()` owns field/fit/file generations; `createAnalysisClient().invalidate()` drops pending replies but does not stop synchronous work inside the worker. This distinction matters for repeated grid-33 requests and disposal tests.
- `createScenario()` validates through private `normalize()`; `applyScenario()` updates multiple DOM/controller states and starts recomputation. Validation before mutation exists, but asynchronous selection/import races and application-time exceptions need additional tests.
- Version inconsistency: `/workspace/bioprinting-workbench/package.json` says 0.3.0; HTML footer says v0.6-dev. README mixes historical procedural-equipment descriptions with a local-extension appendix. Correct in release preparation, not by implying publication occurred.
- Read-only Pages API inspection: legacy branch publication from `main`, path `/`, at the owner's existing Pages site. Thus pushing `main` can publish automatically. No push is allowed merely because release preparation or a local commit is approved. Recheck remote configuration immediately before any authorized release.
- Baseline rerun: 51 tests passed, 29 modules syntax-checked, `git diff --check` passed; explicit exit markers are in `/tmp/bioprint-next-plan-baseline.txt`. Shell integration sometimes reports unknown command completion; these recorded markers, not shell-tool status, establish these results. Existing preview was opened and inspected. Browser behavior in `docs/VERIFICATION.md` is prior agent evidence, not a newly rerun browser audit.
- No TODO/FIXME-driven backlog was found in the inspected authored source/docs. Existing claims scan has one reviewed HIGH disclosure false positive; never report it as clean or weaken the disclosure to silence it.

## Product boundaries and scientific content

1. Keep the current five-stage storyboard, eight procedure steps, 16 check IDs, equipment and mathematical solvers intact. New teaching panels are independent and remain usable without WebGL or workers. Do not add new gates to old check IDs.
2. Provide distinct labels for **single-cell cycle duration**, **population doubling time**, **time in culture**, **passage count**, **differentiation/maturation**, and **organ construction**. They are not interchangeable. Never turn a literature interval into an incubation instruction or use passage number as a fixed number of divisions.
3. Explain locations at two scales: DNA replication occurs in the nucleus during S phase; division includes mitosis and cytokinesis. Cultures reside in vessels housed in controlled culture equipment; later construct studies may use culture/perfusion chambers. The printer assembles material; it does not establish cell identity or repair DNA. The microscope observes; it does not continuously maintain a culture. These factual educational sentences need primary/official source support before shipping. No temperatures, gas fractions, feeding schedules, seeding densities, additive doses or handling instructions.
4. Address the chemical question directly: cellular repair/checkpoint machinery is not a generic chemical coating. A primary PSC study reports reduced replication-associated damage with nucleoside supplementation in the studied cultures. That does not demonstrate universal repair of existing mutations, elimination of selected mutant clones, prevention of cancer, or safety of a graft. Present the study, endpoints and limits, without recipes, vendor selection, dosing or a 'repair' control. Do not recommend checkpoint suppression, forced growth, immortalization or gene edits.
5. Explain genome damage, inherited variants, culture selection, senescence and residual pluripotent-cell concerns as distinct issues. Cancer risk is not calculated from division speed or a slider; a damage-marker decrease is not a cancer-risk estimate. Evidence cards describe what assays can and cannot observe without offering assay protocols, pass/fail thresholds, self-certification or a transplant checklist.
6. Include liver cell-role cards: hepatocytes/hepatocyte-like derivatives, cholangiocytes, sinusoidal endothelium, stromal/stellate/portal-fibroblast contexts, and resident immune-cell context. MSCs are not automatically hepatocytes; a generic endothelial cell is not automatically a liver sinusoidal endothelial cell. Mark absent timing evidence as unknown. Do not extrapolate an iPSC expansion rate to its differentiated derivatives.
7. Whole-organ panel: distinguish a tissue patch, organoid, assembloid, decellularized scaffold and complete functional organ; map blood supply, bile drainage, multiple cell identities, architecture/zonation, transport, mechanical support, maturity, immune interactions and long-term stability as open dependencies. Other organs/body parts appear as explicitly unevaluated aspirations, not assumed extensions of a liver model. No organ mass target, manufacture date, probability of success, completion percentage or readiness score.
8. Optional seven-year user horizon is only a research-planning annotation. It never drives exponential proliferation, the storyboard, oxygen demand, flow or a biological countdown. Waiting alone is not modeled as resolving any dependency.

## Sources investigated and evidence gates

Identifier checks were run with `/workspace/.claude/skills/citation-check/scripts/refcheck.py` using the working Python runtime. Eight initial DOIs and one additional DOI resolved: nine total, zero NOT_FOUND, no registry flags. No expected-title comparison was supplied, so do not call these nine title MATCH results. Results: `/tmp/bioprint-next-plan-refcheck.json` and `/tmp/bioprint-next-plan-ipsc-ref.json`. Resolution is separate from claim support. Do not replace the existing source ledger during planning.

- Bhat et al., DOI `10.1038/s41598-021-83088-1`, PMC7873235, Figure 4 caption/results: reported BM-MSC population doubling times span approximately 22–46 hours in the caption's comparison, with an exception. The Results also report different cumulative P4–P5 summaries; these endpoints must not be conflated. This is a study observation, not a universal MSC interval or culture schedule. If numeric display conflicts with the repository's existing parameter boundary, publish the qualitative variability card only; never weaken `/workspace/bioprinting-workbench/AGENTS.md` silently.
- Beekhuizen and van Furth, DOI `10.1159/000159048`, PMID 7517703: abstract reports method-dependent endothelial cell-cycle estimates, with macrovascular and microvascular differences. Full text was not inspected; do not ship numeric timing from this abstract under the project's open-access full-text policy. Bibliographic correction: journal issue is **1994**, while the publisher/Crossref reports a September 23, 2008 online date. Preserve both fields rather than calling it a 2008 experiment.
- Sturm et al., DOI `10.1080/15592294.2019.1626651`, proposed full-text location PMC6691995: identifier resolved, but full-text retrieval encountered a browser challenge. Claim support remains unreviewed. Reopen and verify endpoint/section before using any fibroblast timing or senescence statement from this source. No universal fibroblast lifespan or seven-year projection is established by this investigation.
- Ghule et al., DOI `10.1002/jcp.22440`, PMC3045197, compares the abbreviated iPSC cell cycle. Full text was fetched; no exact duration is accepted into the implementation contract yet. Wilson et al., DOI `10.1080/15384101.2016.1203492`, is a supplementary replication/lineage source candidate with identifier resolution only, not a verified rate source. Missing extractable evidence must render 'not established from the reviewed source', not a guessed default.
- Halliwell et al., DOI `10.1016/j.stemcr.2020.04.004`, PMC7355123: Summary, Results and Figure 3 support the bounded replication-stress/nucleoside statement above. No cancer-prevention endpoint or additive recipe is introduced.
- Merkle et al., DOI `10.1038/nature22312`, PMC5427175: Results/Figure 3 support culture-associated expansion of TP53-mutant subpopulations. Use this to distinguish selection from simply counting DNA-copy events, not to infer that every culture becomes malignant.
- Hendriks et al., DOI `10.1038/s41467-024-48550-4`, identifier resolved; full-text claim support remains unreviewed. Do not use a title as support for liver production timing.
- Yuan et al., DOI `10.1038/s41586-025-09884-1`, PMID 41407857: online December 17, 2025; journal issue February 2026. The opened PubMed record describes periportal liver assembloids, not an entire manufactured liver. Publisher and linked PMC12893922 full-text retrieval encountered access challenges; Discussion-specific limitations remain unreviewed and must be checked before attribution. Record model/species/endpoint separately, including any mouse result. The reviewed record does not establish a seven-year whole-liver timeline.

Before implementation content acceptance, capture a short paraphrase plus section/figure locator and at most a short licensed excerpt in a claim ledger. Exclude actionable parameters even when the paper contains them. Unknowns are acceptable deliverables; exact universal timing and whole-organ construction duration are not promised. Published durations are read-only observations, never presets for operation. Recheck primary literature at implementation/release time; this is a bounded investigation, not a comprehensive field review or a claim to identify the latest result.

[Types]

Use plain validated JavaScript records and JSDoc; no TypeScript migration. All validators reject unknown keys, non-plain records, invalid enums, overlong strings, nonfinite arithmetic and unsafe URLs. Use existing `finite`, `text`, `assertAllowedKeys`, `validateSource`, `SCENARIO_BYTES` and `MEASUREMENT_BYTES` rather than inventing parallel parsing.

### Evidence records (static authored content, not scenario data)

- `CellTypeId`: `msc | endothelial | fibroblast | ipsc | esc | hepatocyte | cholangiocyte | liver-sinusoidal-endothelial | liver-stromal | liver-immune`.
- `EvidenceSource`: `{ id, doi, title, journalYear, onlineDate: string|null, url, fullTextUrl: string|null, identifierStatus: 'resolved'|'unreachable'|'unresolved', supportStatus: 'reviewed'|'unreviewed', reviewedOn: string|null, reviewKind: 'agent-source-reading', limitations: string[] }`. Require an actual date for reviewed status; no expert-review claim.
- `EvidenceClaim`: `{ id, sourceId, cellTypeIds: CellTypeId[], species: 'human'|'mouse'|'other', modelContext, statement, locator, supportStatus, limitations: string[] }`. IDs <=128 chars, prose <=2000, arrays <=32, unique IDs and resolvable references; HTTP(S) only, no credentials. Authored content uses `textContent` and created anchor elements, never imported HTML.
- `TimingObservation`: `{ id, claimId, cellTypeId, metric: 'cell-cycle'|'population-doubling'|'culture-observation', hours: { min, max }|null, valueKind: 'point'|'reported-range'|'not-established', statistic: string|null, context, limitations: string[] }`. Hours positive finite and ordered; `not-established` requires null, not zero; point requires equal bounds. Do not pool donor/condition ranges or call min/max a confidence interval. No value may ship as reviewed without a full-text locator and verified endpoint. Time observations never automatically populate arithmetic controls.
- `CellProfile`: `{ id: CellTypeId, label, roles: string[], cultureLocation, claimIds: string[], timingIds: string[], uncertainties: string[] }`. Location prose is conceptual, not equipment instructions.
- `OrganBarrier`: `{ id, label, context: 'general'|'liver', claimIds: string[], missingEvidence: string[], dependencyIds: string[], status: 'not-modeled' }`. Reject cycles/dangling dependencies. No 'ready', 'safe' or probability state.

### Optional independent arithmetic explorer

- `DivisionSettings`: `{ model: 'idealized-relative-doubling', doublings: number, hypotheticalDoublingHours: number|null }`; doublings finite [0,40]; optional time finite [1,1000] hours. These limits are UI/computational bounds, explicitly not biological ranges. Default `{ model: 'idealized-relative-doubling', doublings: 0, hypotheticalDoublingHours: null }`.
- `DivisionResult`: `{ model, relativePopulation: number, doublings: number, hypotheticalElapsedHours: number|null, parameterOrigin: 'synthetic-user-assumption', notice }`; `relativePopulation = 2 ** doublings`, optional elapsed = doublings * hypotheticalDoublingHours. Fractional doublings represent a population-level idealization, not fractional mitosis. No absolute cell counts, cancer score, death-rate estimate, culture capacity or organ-completion field. No biological/literature default time and no automatic application of evidence timings.
- `LearningState`: `{ selectedCellType: CellTypeId, division: DivisionSettings, researchHorizonYears: number|null }`, horizon finite [0,20], default null. Accept seven as an annotation only; no horizon-to-growth calculation.
- Scenario `/3`: same canonical /2 fields plus required `learning: LearningState`. Preserve seed/model and existing analyses/datasets shapes; outputs/evidence text remain excluded. `/2` migration adds default learning inputs and a warning; `/1` retains current reset/warning semantics then adds defaults. Unknown future schemas reject. Imported selections do not certify evidence or laboratory completion.

### Release records

`ReleaseVerification`: JSON `{ schema: 'bioprinting-workbench/release-verification/1', generatedAt, targetVersion, candidateCommit: string|null, checks: [{ name, status: 'pass'|'fail'|'not-run', command, evidencePath, notes }], knownLimitations: string[] }`. File paths must not leak credentials or absolute private user directories into a public artifact. A reviewed scanner exception is explicit notes, never transformed into a passing clean scan. No deployment status inferred from local checks.

[Files]

All paths below are absolute; modifications happen only after implementation approval.

### New runtime files

- `/workspace/bioprinting-workbench/src/cell-evidence.js`: immutable source/claim/profile/timing data plus reference integrity checks and lookup APIs. Keep scientific content out of renderer/numerical modules.
- `/workspace/bioprinting-workbench/src/cell-division.js`: pure independent bounded arithmetic and learning-state validation/defaults.
- `/workspace/bioprinting-workbench/src/cell-learning-ui.js`: event-driven, accessible evidence/timing/location/genome-stability panels, arithmetic controls and horizon annotation; explicit separation of citations and hypothetical inputs.
- `/workspace/bioprinting-workbench/src/organ-research.js`: authored liver/general barrier graph and validation; informational outputs only.
- `/workspace/bioprinting-workbench/src/learning.css`: responsive learning panels; use existing design tokens/layout conventions. No new canvas/WebGL dependency.

### New verification/docs files

- `/workspace/bioprinting-workbench/tests/cell-evidence.test.js`, `/workspace/bioprinting-workbench/tests/cell-division.test.js`, `/workspace/bioprinting-workbench/tests/organ-research.test.js`, `/workspace/bioprinting-workbench/tests/release.test.js`: pure and artifact-contract tests.
- `/workspace/bioprinting-workbench/tests/fixtures/scenario-v3.json`: synthetic canonical inputs; retain `/workspace/bioprinting-workbench/tests/fixtures/scenario-v2.json` as migration evidence.
- `/workspace/bioprinting-workbench/scripts/browser-failures.js`: bounded independent browser cases for no-WebGL, blocked assets/workers, input races, reduced motion and subpaths. Export/runner form follows existing smoke script; no test-library dependency.
- `/workspace/bioprinting-workbench/scripts/verify-release.mjs`: read-only local verification and allowlisted static artifact inventory; no git mutation, version bump, upload or deploy. Optional explicit `--out` writes a report only. Invoke from repository root without installing packages.
- `/workspace/bioprinting-workbench/docs/CELL_DIVISION.md`, `/workspace/bioprinting-workbench/docs/GENOME_STABILITY.md`, `/workspace/bioprinting-workbench/docs/ORGAN_RESEARCH.md`: definitions, evidence/context, chemical-question answer, model equations and limitations.
- `/workspace/bioprinting-workbench/docs/cell-evidence-audit.json`: claim-level locators and identifier evidence; preserve `/workspace/bioprinting-workbench/docs/citation-check.json` historical results.
- `/workspace/bioprinting-workbench/docs/RELEASE.md`: authorization boundaries, branch-Pages publication behavior, candidate inventory, local commands, manual review, rollback requiring separate permission and post-deployment verification.
- `/workspace/bioprinting-workbench/CHANGELOG.md`: distinguish already-implemented four milestones from subsequent hardening/learning work; unpublished labels until actually released.

### Existing files to modify

- `/workspace/bioprinting-workbench/src/analysis-client.js`, `/workspace/bioprinting-workbench/src/analysis-ui.js`: fixes only for reproduced stale-file/fit, malformed-reply, timeout, disposal and restore races; keep workers optional, failures visible and unrelated models usable.
- `/workspace/bioprinting-workbench/src/analysis-worker.js`: validate request envelope before destructuring potentially malformed input; preserve bounded cache ownership and explicit failure replies. Do not claim invalidation interrupts computation; do not redesign into a worker pool without measured need and revised approval.
- `/workspace/bioprinting-workbench/src/equipment.js`: regression-driven late-disposal/invalid-root safeguards, idempotent cleanup and truthful diagnostics; no new assets or geometry required.
- `/workspace/bioprinting-workbench/src/scenario.js`: /3 canonical validation/migrations, preserve /1 and /2 parsing, omit derived/evidence outputs. Learning validation must complete before any live state replacement.
- `/workspace/bioprinting-workbench/src/app.js`: integrate learning controller, include learning inputs in `scenarioState()` and `applyScenario()`, pause on restore, invalidate prior file operations as soon as replacement begins, expose bounded diagnostics for tests. Keep numerical/content work out of frame loop. Extract scenario preparation/commit helpers for testability rather than adding another monolithic event path.
- `/workspace/bioprinting-workbench/src/model.js`: clarify scripted-vs-independent growth wording only; leave `sample()` equations, `snapshot()` legacy shape and six parameter definitions unchanged.
- `/workspace/bioprinting-workbench/src/procedure.js`: add bounded genome-stability/cell-identity unknowns and source context without changing check IDs, total checks or unlock behavior.
- `/workspace/bioprinting-workbench/index.html`: add stylesheet and semantic sections/labels/tables; static core limits survive JS failure; dedicated links to docs. Keep original AI disclosure visible and do not inflate the organ-building headline into a scientific claim.
- `/workspace/bioprinting-workbench/package.json`: add `verify:release`; reconcile local development version with HTML only after selecting a candidate. Proposed integrated version is 0.7.0-dev until release approval; do not retroactively label unpublished intermediate milestones as published.
- `/workspace/bioprinting-workbench/scripts/browser-smoke.js`: split into bounded cases and emit per-case completion rather than one approximately 57-second opaque run; support configurable base URL including project subpaths; update /3 checks while testing /2 import. Explicit timeout remains a failure unless persisted case evidence is recovered and reported accurately.
- `/workspace/bioprinting-workbench/tests/analysis-client.test.js`, `/workspace/bioprinting-workbench/tests/scenario.test.js`, `/workspace/bioprinting-workbench/tests/equipment.test.js`, `/workspace/bioprinting-workbench/tests/validation.test.js`, `/workspace/bioprinting-workbench/tests/procedure.test.js`: expand adverse-path coverage and migration/gating invariants.
- `/workspace/bioprinting-workbench/README.md`, `/workspace/bioprinting-workbench/docs/{SOURCES,METHODS,PROCEDURE,ROADMAP,SCENARIOS,VERIFICATION}.md`: reconcile current architecture, evidence and versions; distinguish source reading, arithmetic verification and expert review. Regenerate `/workspace/bioprinting-workbench/docs/preview.png` only when the final UI is implemented and browser-verified.
- `/workspace/bioprinting-workbench/assets/authoring_common.py` and `/workspace/bioprinting-workbench/tests/blender_authoring_check.py`: inspect exporter return status (`CANCELLED` is not success) and shared-data sentinel coverage before release; change helpers only if regression demonstrates a defect. Do not run current test casually: it regenerates GLBs/manifest in place. Use an approved isolated scratch copy/session for authoring audits.

No deletions/moves, vendor upgrades, new GLBs, new npm lockfile, new release/deploy workflow, Docker changes or AGENTS policy changes are planned. `/workspace/bioprinting-workbench/src/{oxygen,numerics,oxygen3d,flow,calibration,calibration3d}.js` retain their equations unless an audit reproduces a defect; any discovered algorithm change needs its own explicit evidence/tests and plan amendment.

[Functions]

### New functions

- `validateEvidenceCatalog(catalog): EvidenceCatalog` in `/workspace/bioprinting-workbench/src/cell-evidence.js`: validate IDs, bounds, reviewed/null states, source links and timing claims; return copied canonical records.
- `getCellProfile(id): CellProfile`, `getTimingObservations(id): TimingObservation[]`, `getClaimsForCell(id): EvidenceClaim[]` in the same file: strict ID lookup, copied readonly-style output, no network access or implied timing inference.
- `defaultLearningState(): LearningState`, `validateDivisionSettings(raw): DivisionSettings`, `validateLearningState(raw): LearningState`, `evaluateRelativeDivision(raw): DivisionResult` in `/workspace/bioprinting-workbench/src/cell-division.js`: canonical inputs and finite arithmetic, no connection to cell profiles, solvers or storyboard.
- `validateOrganBarriers(raw): OrganBarrier[]`, `getOrganResearchSummary(context = 'liver'): { barriers: OrganBarrier[], notice: string }` in `/workspace/bioprinting-workbench/src/organ-research.js`: graph integrity and qualitative missing evidence, never a score.
- `createCellLearningUI({ elements, onStateChange = () => {} }): { getState(), setState(state), diagnostics(), dispose() }` in `/workspace/bioprinting-workbench/src/cell-learning-ui.js`: listeners registered once, stable DOM updates on input only, numeric errors retain canonical state, no raw HTML/source fetching; disposal removes owned listeners.
- `prepareScenarioApplication(scenario): PreparedScenario` in `/workspace/bioprinting-workbench/src/app.js`: validate new/existing learning, slab-derived arithmetic and view/control state before mutation. Pure preparation delegates to existing validators. `commitScenarioApplication(prepared): void` applies a validated snapshot, clears obsolete pending operations, synchronizes controllers, then schedules recomputation. If a synchronous application failure is reproduced, restore prior canonical state and show an honest recomputation error; never advertise atomicity without testing it.
- `migrateScenarioV2(raw): { scenario, warnings, migratedFrom }` in `/workspace/bioprinting-workbench/src/scenario.js`: validate against a private retained /2 validator, then add defaults. Never reinterpret unknown /2 fields as /3.
- `collectReleaseInventory(root): ReleaseInventory`, `verifyRelease(root, { targetVersion }): ReleaseVerification` in `/workspace/bioprinting-workbench/scripts/verify-release.mjs`: bounded project-relative paths, source/asset/version checks, no shell interpolation from data, read-only defaults, nonzero exit for failures. Public artifact includes no `.git`, `.env`, scratch reports or credentials.

### Modified functions/methods

- `createAnalysisClient()`: test/validate reply envelope and status; error/timeout rejects and clears all pending promises; disposal is idempotent; late events cannot resolve canceled work. Preserve existing public API and injectable worker factory. Add an injectable timeout configuration only if required for deterministic timer tests, bounded to a finite positive integer.
- `createAnalysisUI()` nested `runFit`, `setInput`, `setState`, file callbacks: snapshot request inputs; invalidate a file generation when a new selection starts, not only when it finishes; clear obsolete success/actions on errors. Separate field and dataset versions; no auto-application on restore.
- Worker `globalThis.onmessage`: validate nullable/primitive envelope before reading fields; error path must not throw another destructuring error. Uncorrelated malformed requests must not fabricate a valid request ID.
- `validateEquipmentAsset`, `loadEquipmentAsset`, `disposeRoot`: malformed/null root, late completion after disposal, multiply called dispose and external-reference behavior covered with fixtures; invalid asset never hides fallback.
- `SCENARIO_SCHEMA`, private `normalize`, `defaultAnalyses`, `createScenario`, `parseScenario`, `serializeScenario`, `migrateScenarioV1`: /3 learning state added without changing analysis semantics; retain a strict /2 contract for migration and exact /1 reset behavior.
- `scenarioState`, `applyScenario`, `importScenarioFile`, global diagnostics in `/workspace/bioprinting-workbench/src/app.js`: learning state and validated preparation/commit, newest-intent file ordering, restore paused, truthful migration/status text, derived outputs recomputed.
- `sample()` and `createLab().update()` are explicitly **not** connected to division arithmetic or years. No new cell-division animation required in this iteration.
- `export_owned_scene(scene, path, exporter=None)`: if a test confirms cancellation is reported as success, require `FINISHED` and preserve scene restoration on cancellation/exception; do not alter foreign selection/mode or existing collision policy.

No functions removed; preserve existing exported signatures except the documented expanded scenario contract. Retain all current procedure helper APIs and numerical reference interfaces.

[Classes]

No new, modified or removed application classes. Follow pure functions and closure-based controllers already used by the project. Do not subclass Three.js, create a global store, or introduce a framework. Existing worker, DOM and vendored Three.js classes remain unchanged.

[Dependencies]

No new runtime/npm/Python packages or version changes to vendored software. Continue Node built-in `node:test`, filesystem/crypto/child_process for local verification, and the existing connected Playwright for browser checks. Python's standard library and installed Blender are optional authoring verification tools, not runtime requirements. The working environment has an existing Python runtime at `/home/vscode/.cache/venvs/courselab/bin/python`; document fallback honestly, do not assume system `python3` is repaired. Citation verification and claims review are development tasks; do not ship API calls or credentials. No paid model generation or external asset services.

[Testing]

## Hardening first

- Add deterministic unit tests for worker timeout/error/messageerror/postMessage exception/malformed response, independent solve/fit supersession, stale reply after dispose and multiple dispose calls. Use controllable fake workers/timers, not a 30-second real timeout.
- Test worker envelope null/primitive/missing payload/unknown kind without importing a DOM or hanging a worker. Cache must remain bounded and cached arrays must not be detached.
- Browser races: two files where first resolves last; example/clear/restore during file read; settings changed during fit; new scenario during solve; oversized/invalid files retain the previous canonical state. Missing worker may prevent recomputation, never evidence access or scenario input restoration.
- Tests for late GLB, invalid root/transforms, blocked single asset, reveal while loading, disposal before load and duplicate disposal; inspect printhead continuity and all four independent fallbacks.
- Preserve analytical slab/box/manufactured/refinement/flux/network tests; add explicit nonconverged-state assertions if the audit finds that UI or apply action wrongly treats a failure as valid.
- Blender scratch checks: foreign scenes/active selection/mode, shared object/data references, object-name collisions, canceled export and forced exceptions. Do not overwrite production assets merely to run a sentinel.

## New features and state

- Evidence tests: every cell type has a profile, source-linked claims and explicit timing-known/unknown state; all numeric observations have reviewed full-text locators; no cross-species or cell-cycle/doubling substitutions; bibliographic date exceptions tested. No dangerous URL schemes or HTML injection. Claim wording tests are advisory; human/source review is still needed.
- Arithmetic tests: 0 doublings -> relative 1; 1 -> 2; fractional/40 bounds finite; null time remains unknown; invalid NaN/infinity/negative/out-of-range/extra keys reject. Evidence selections never set hypothetical time. Seven-year horizon never changes arithmetic, stages, oxygen or flow. No absolute organ yield or cancer field appears.
- Barrier tests: no cycles/dangling IDs; unknown status cannot become completion by increasing horizon; liver-specific and general contexts remain distinct.
- /3 canonical round-trip copies inputs only; /2 adds defaults/warnings without losing analyses/gates/datasets; /1 still resets unavailable IDs/data; mismatched model/seed, unsupported fields/future schema, stale or forged derived outputs reject before UI replacement. Imported source prose never becomes HTML. Keep 1 MiB scenario and 256 KiB measurement caps.
- Browser check all cell profiles, timing unknowns, repair-study limitations, long-horizon annotation, keyboard use, focus, status errors, /3 and old migration imports, no-WebGL/no-worker, 390px and 1440px layouts and Pages-style subpath. Test reduced motion and avoid adding unsolicited animation. No Firefox/Safari/accessibility-conformance claims without actual checks.

## Release acceptance

Run `npm test`, `npm run check`, `npm run verify:release`, Python syntax compilation without repository bytecode writes, asset/hash checks, `git diff --check`, source verification and claims review. Review tracked **and untracked** source; `git diff --stat` alone omits new files. Compare exported scenario and asset hashes to the candidate inventory. Inspect full preview at readable scale, not just a compressed thumbnail. Split browser cases so each finishes within tool limits and records actual pass/fail output; a timeout is not silently a pass.

Document actual test counts, dates, commands and not-run cases in `/workspace/bioprinting-workbench/docs/VERIFICATION.md`. Preserve the existing HIGH disclosure false positive with its reviewed explanation if it recurs; a scanner exception is not independent scientific review. Do not fabricate domain review or owner-performed experiments. Release readiness here means software/artifact readiness only.

After **separate publication approval**, recheck Pages source branch, review exact staged file list and candidate diff, choose final version, commit/push only within permission, then verify deployed revision, four assets, worker, evidence panels, /3 download/restore and migrated /2 at the real project subpath. Keep a recorded last-known-good revision; reverting/redeploying is also a publication action requiring permission. Never publish a repository-root directory wholesale without reviewing exposed files.

[Implementation Order]

1. Owner reviews this plan and explicitly authorizes implementation; confirm sole writer and current guidance/status again. No commit/push/publication implied.
2. Preserve the full existing tracked/untracked implementation, record content inventory and baseline evidence; reproduce and prioritize audit findings before editing. Current 51 passing tests are baseline, not proof of absent races.
3. Add failing regression cases for worker/file/restore/asset failure paths; implement narrowly scoped hardening fixes and rerun old numerical/gating tests. Keep a reviewed fix list distinguishing reproduced bugs from optional improvements.
4. Complete claim/source ledger with primary full-text locators. Resolve missing iPSC/ESC/endothelial/hepatocyte timing as evidence or explicitly unknown. Do not block qualitative teaching on a universal rate that cannot be established. Approve observational-only duration wording against repository policy before adding numeric cards.
5. Implement evidence/profile/barrier pure modules and tests; add finite relative-doubling arithmetic with null biological time default. No growth-to-cancer or growth-to-organ coupling.
6. Define scenario /3, strict /2 migration and retained /1 migration; create fixtures/tests before UI integration. Preserve original walkthrough IDs/gates and input-only serialization.
7. Implement accessible event-driven learning panels, chemical-question explanation, culture-location mapping and liver/general research barriers. Add research-horizon annotation without timelines or a success meter.
8. Integrate controller state into scenario prepare/commit and diagnostics; test imports, asynchronous races and failure isolation. Keep frame-loop equations and numerical modules unchanged.
9. Update documentation/source audit/roadmap and reconcile README/history/versions. Add read-only release verification and explicit branch-Pages publication warnings; no automatic deployment workflow.
10. Run full unit/syntax/asset/Python/claims/source/diff checks and bounded browser cases; inspect screenshots and regenerate final preview. Record actual results and remaining unknowns; any unsupported scientific claim is removed or marked unreviewed, not guessed.
11. Present local implementation diff, evidence and candidate release notes to owner. Stop here unless commit and publication scopes are explicitly authorized; if only code implementation was approved, leave changes local.
12. Only within later authorization, perform reviewed commit/version/publication steps and verify actual deployed candidate. Do not describe previous v0.3 as changed before confirmed deployment.

**Completion criteria:** existing models and fallbacks remain correct; every requested cell category has honest evidence/unknowns; where division occurs and why timing varies are explained; the chemical question is answered without a repair recipe or cancer guarantee; a seven-year aspiration cannot become a biological prediction; /1–/3 restoration behaves as documented; no release occurs without explicit permission.

---

## Archive — previous approved four-milestone plan (implemented locally, not published)

The complete original document body follows unchanged. Its old baseline and approval language are historical; the current plan above governs subsequent work.

[Overview]

Extend Bioprinting Workbench with isolated Blender-authored equipment, a verified dimensionless 3D oxygen model and transparent fitting, a conservation-checked resistance-network solver, and safe versioned scenario import/export.

## Scope and investigated baseline

Owner decision on November 1, 2026: **all four milestones**. Implement as independently verifiable increments, not one rewrite. This document supersedes the untracked plan for already-delivered v0.2. It authorizes no implementation, Blender changes, commits, or publication until the owner explicitly approves.

Repository: `/workspace/bioprinting-workbench`; baseline `08af88f`, version `0.3.0`. Browser-native JavaScript ES modules, HTML/CSS, Blender Python, no framework, TypeScript, build pipeline, or npm dependencies. Three.js 0.187.0 and GLTFLoader are already vendored and licensed. Baseline verified during planning: **33 tests pass**, `npm run check` and `git diff --check` pass on Node 24.18.1; log `/tmp/bioprint-planning-baseline.txt`. No TODO/FIXME markers found in project JS/Python/CSS. Only the untracked plan existed before planning.

Architecture and constraints confirmed:
- `src/model.js`: six storyboard parameters, deterministic scaffold/sample functions, legacy `snapshot()` schema `bioprinting-workbench/1`.
- `src/procedure.js`: eight cited steps, 16 checks, five stages, default gating and free exploration. Exported summary omits completed check IDs, preventing faithful restoration.
- `src/oxygen.js`: independent analytical 1D slab. Preserve its API/reference tests.
- `src/calibration.js`: calibration-input/1 center/boundary pairs and analytical scalar slab fit. Keep separate from new 3D fitting.
- `src/scene.js`: Three.js resources, nested geometry helpers, one static printer GLB, procedural animated head/scaffold/cells/rotor/tracers. Other static equipment requires explicit grouping before replacement.
- `src/app.js`: DOM/event wiring and a render call every animation frame. Never put numerical solves, graph rebuilding, or file parsing in this loop.
- `assets/author_bioprinter.py`: helpers currently create objects through operators in the user's active scene before relinking. Export scene restoration alone does **not** establish that the user scene was untouched. Correct authoring and qualify historical documentation.

## Proposed boundaries

Use pure numerical/validation modules, an explicit module-worker lifecycle, and event-driven analysis UI. Keep the current lab, slab, and procedure usable when WebGL, a worker, or an asset fails. All new calculations remain **dimensionless mathematical teaching models**. No real dataset has been supplied; user provenance declarations are not independent verification.

3D oxygen uses a homogeneous normalized box, not tissue geometry extracted from the scaffold. Flow uses a linear resistance graph, not CFD or living vessels. Do not couple flow to oxygen boundaries or population to consumption. The existing perfusion slider may explicitly drive a synthetic normalized network pressure difference, never physical pump pressure. Tracer speed remains illustrative. No SI output, measured equipment scale, biological thresholds, safety conclusions, procedural lab settings, surgical guidance, patient data, vendor CAD, analytics, upload services, or paid generation.

Preserve hobby framing, AI attribution, citations, visible unknowns, recipient-label equivalence, gating and procedural fallbacks. Magnified second viewport, vascular cross-sections, alternative biological workflows, a general topology editor, physical calibration, and coupled transport are outside these four milestones.

[Types]

All types are plain JavaScript objects with JSDoc, canonical validators, and tests. Numerical arrays use Float64Array internally, never as trusted JSON inputs. Errors identify field paths. Never merge arbitrary parsed objects into state.

## Shared validation

- `SourceInfo = { citation: string, url?: string, accessedDate: string }`: citation trimmed 1–2,000 characters; optional absolute HTTP(S) URL <=2,048 characters; real calendar YYYY-MM-DD verified by component round-trip, not Date.parse alone. Source metadata does not prove review.
- `DataKind = 'synthetic' | 'user-declared-measured' | 'unspecified'`. Legacy files default to unspecified. Never infer measured status from a citation.
- Maximum JSON: scenario 1 MiB, standalone measurements 256 KiB. Check File.size before reading and UTF-8 length in parsers. Explicit structural traversal, bounded arrays/strings, reject unsupported structural keys, unsafe URLs and schema versions. Render user strings via textContent. No imported asset/worker URLs or scripts.

## Equipment

- `EquipmentId = 'bioprinter' | 'incubator' | 'microscope' | 'perfusion-chamber'`.
- `EquipmentAssetSpec = { id, url, nodePrefix, requiredNodes: string[], maxBytes }`, fixed trusted module-relative URLs, never scenario-controlled.
- `EquipmentAssetState = { status: 'loading' | 'loaded' | 'fallback', reason: null | 'request-failed' | 'invalid-asset' }`.
- Lifecycle handle: `{ ready: Promise<void>, setReveal(boolean), diagnostics(), dispose() }`. Attach validated GLB before hiding only its static fallback. Apply latest reveal state after late load. Independent asset failures do not hide other equipment.
- Manifest records hashes, bytes, triangle/material counts, required nodes, bounds, generator version, original/agent-run provenance and arbitrary illustrative scene-unit convention.

## Oxygen 3D

- `Oxygen3DSettings = { model: 'steady-3d-box-constant-consumption', demand: number in [0,2], resolution: 9 | 17 | 25 | 33, boundaryMode: 'all-faces' | 'slab-x' }`. Defaults: demand=1, resolution=17, all-faces. Resolution 33 can remain verification-only if performance requires.
- Domain [-1,1]^3; diffusivity 1; supplied concentration 1. All-faces fixes all six faces. Slab-x fixes x faces and imposes zero normal flux on y/z faces.
- Cell-centered finite volumes: h=2/n; coordinate -1+(i+0.5)h; flattened index i+n*(j+n*k). Solve `-laplacian(w)=1`, homogeneous Dirichlet on supplied faces and no-flux elsewhere; recover `c=1-q*w`. Interior coefficient 1/h², Dirichlet face coefficient 2/h², no-flux face contributes zero.
- `Oxygen3DResult = { settings, values: Float64Array, center, min, max, iterations, residualInfinity, relativeResidual, converged, netBoundaryInflux, totalConsumption, balanceError, inDomain, units: 'dimensionless', parameterOrigin: 'synthetic-controls' | 'explicit-fit-application' }`.
- Cache at most three unit-demand bases by model/resolution/boundary mode. Never confuse numerical convergence with nonnegative model admissibility; never clip negative calculated values.
- `OxygenSlice = { axis: 'x' | 'y' | 'z', index: integer [0,n-1], coordinate, width: n, height: n, values: Float64Array }`. Fixed visualization scale [0,1], explicit out-of-range indicators, numerical text/table fallback. Slice changes do not re-solve.

## Fitting

- Preserve calibration-input/1 slab format, optionally extending with dataKind. Existing files continue parsing and retain existing q estimate semantics.
- New `bioprinting-workbench/calibration-input/2`: `{ schema, model: 'steady-3d-box-constant-consumption', dataKind, source: SourceInfo, units: 'dimensionless-ratio', domain: { min: [-1,-1,-1], max: [1,1,1], boundaryMode }, measurements: [{ id, position: [x,y,z], concentration, boundary }] }`.
- 1–100 points; unique trimmed IDs <=128 characters; positions finite in [-1,1]; concentration >=0; boundary >0; derived ratios finite. Ratios >1 remain visible incompatible evidence, not silently clamped. No coordinate/unit conversion.
- `Oxygen3DFit = { model, n, q: number | null, residualRMSE, residuals: [{ id, observedRatio, predictedRatio, residual }], sensitivityNormSquared, identifiable, inDomain, resolution, boundaryMode, converged, source, dataKind, assumptionNotice }`.
- Fit demand only with fixed diffusivity/domain/boundaries: b_i=w(position_i), r_i=concentration/boundary, `q=sum[b_i*(1-r_i)]/sum[b_i²]`. If denominator <=1e-12, identifiable=false and q=null. Interpolate trilinearly with zero-valued Dirichlet boundary planes and constant extension at no-flux faces; document edge/corner treatment.
- Report unconstrained estimates and residuals; no uncertainty interval fabricated from one point. Boundary-mode mismatch/unconverged basis refuses fitting. Applying q requires an explicit button and identifiable, converged, in-domain fit. Applying it does not establish tissue validation.

## Flow

- `FlowNetwork = { model: 'dimensionless-linear-resistance-network', nodes: [{ id, position: [x,y,z], boundaryPressure?: number }], edges: [{ id, from, to, resistance, channelId?: string }] }`.
- Limits: 1–64 nodes, 0–128 edges, unique IDs <=64 characters, positions in [-2,2], pressures in [-10,10], resistances in [1e-6,1e6], all finite. Reject self-edges/missing endpoints; allow distinct parallel edges. Every connected component needs a fixed-pressure node; never silently ground an unanchored component.
- `FlowSettings = { enabled: boolean, pressureDrive: number [0,1], branchResistances: [number,number,number] }`; defaults true, 0.6, [1,1,1]. Factory builds four stable nodes (fixed inlet, inlet manifold, outlet manifold, fixed outlet) and five edges (one inlet resistance-1 edge, three branch edges, one outlet resistance-1 edge).
- `FlowResult = { status: 'solved' | 'disabled' | 'invalid' | 'numerical-failure', nodePressures: [{ id, pressure }], edgeFlows: [{ id, flow }], boundaryFlows: [{ id, outwardFlow }], maxInteriorResidual, globalBalanceError, units: 'dimensionless', message }`.
- Signed edge flow `(p_from-p_to)/R`; interior net sums zero. Boundary outwardFlow is flow leaving the network; sum over boundaries zero. Disabled channels produce an explicit disabled result rather than a singular solve. Residual failure/ill-conditioning is visible, not successful output.

## Scenarios

`ScenarioV2 = { schema: 'bioprinting-workbench/2', model: 'synthetic-dimensionless-storyboard', seed: 42, parameters, time, procedure: { mode: 'gated' | 'free', completedChecks: string[] }, view: { camera: 'lab' | 'construct' | 'top', reveal: boolean }, analyses: { slab: { demand }, oxygen3d: { settings, parameterOrigin }, flow: FlowSettings }, datasets: { slab: CalibrationInputV1 | null, oxygen3d: CalibrationInputV2 | null }, limitations: string }`.

- Export canonical inputs and bounded datasets, not renderer objects, fields, typed arrays, fits or purported measured outputs. Recompute derived results after import. Imported limitations are replaced by trusted application wording.
- Existing parameters use model.validate(); time finite [0,4.999]; seed 42 only until geometry supports arbitrary seeds. Procedure IDs unique and known. Reject inaccessible gated timestamps rather than silently claiming full restoration. Imported checks are self-reported walkthrough progress, not biological QC.
- `ScenarioImportResult = { scenario, warnings: string[], migratedFrom: null | 'bioprinting-workbench/1' }`.
- Legacy /1 exports: validate required model/seed/parameters/time; ignore only documented derived fields (state, oxygenTeachingModel, summary procedure, fit-only calibration). Restore no checks: counts cannot reconstruct IDs. Reset gated time to 0, mention original timestamp in warning, retain valid legacy slab demand, default new analyses/view/datasets. Do not invent raw measurements from fit summaries.
- Import is atomic: parse/validate first, then pause, invalidate pending work, replace state, synchronize controls/gates/view, recompute. Invalid file leaves all prior state unchanged. Normalize redundant flow enabled/drive from canonical channels/perfusion or reject conflicting /2 values; never preserve contradictory controls.

## Worker protocol

Requests `{ requestId: positive integer, kind: 'oxygen-solve' | 'oxygen-fit', payload }`; replies `{ requestId, kind, status: 'ok' | 'error', result?, error?: { name, message } }`. Validate again in worker, cap grid/iterations, latest-request-wins separately for solve/fit. Dataset clears/scenario imports invalidate prior generations. Never transfer and detach a cached basis. Worker failure leaves slab, flow, storyboard, import/export and explanations usable, with honest 3D-unavailable status rather than a blocking main-thread fallback.

[Files]

## New files (absolute paths)

- `/workspace/bioprinting-workbench/assets/authoring_common.py`: owned-scene/data-API geometry and safe export helpers.
- `/workspace/bioprinting-workbench/assets/author_incubator.py`, `/workspace/bioprinting-workbench/assets/author_microscope.py`, `/workspace/bioprinting-workbench/assets/author_perfusion_chamber.py`: reproducible generic static equipment.
- `/workspace/bioprinting-workbench/assets/incubator.glb`, `/workspace/bioprinting-workbench/assets/microscope.glb`, `/workspace/bioprinting-workbench/assets/perfusion_chamber.glb`: generated embedded assets; target each <=350 KiB and all four GLBs <=1.5 MiB. Review/document any overrun.
- `/workspace/bioprinting-workbench/assets/manifest.json`: verified asset integrity/provenance/bounds/budgets.
- `/workspace/bioprinting-workbench/src/equipment.js`: shared asynchronous GLB validation/fallback lifecycle.
- `/workspace/bioprinting-workbench/src/validation.js`: bounded JSON and provenance helpers.
- `/workspace/bioprinting-workbench/src/numerics.js`: bounded diagonally preconditioned conjugate-gradient solver.
- `/workspace/bioprinting-workbench/src/oxygen3d.js`: finite-volume box, unit basis, interpolation/slices/flux.
- `/workspace/bioprinting-workbench/src/calibration3d.js`: /2 measurement parser, scalar demand fit, synthetic example.
- `/workspace/bioprinting-workbench/src/flow.js`: graph validation, teaching topology and conservation-checked solver.
- `/workspace/bioprinting-workbench/src/scenario.js`: /2 canonical format and /1 migration.
- `/workspace/bioprinting-workbench/src/analysis-worker.js`, `/workspace/bioprinting-workbench/src/analysis-client.js`: worker and request/error/staleness lifecycle.
- `/workspace/bioprinting-workbench/src/analysis-ui.js`: analysis event wiring, heatmap, network SVG and numerical fallback outside frame loop.
- `/workspace/bioprinting-workbench/tests/validation.test.js`, `/workspace/bioprinting-workbench/tests/numerics.test.js`, `/workspace/bioprinting-workbench/tests/equipment.test.js`, `/workspace/bioprinting-workbench/tests/oxygen3d.test.js`, `/workspace/bioprinting-workbench/tests/calibration3d.test.js`, `/workspace/bioprinting-workbench/tests/flow.test.js`, `/workspace/bioprinting-workbench/tests/scenario.test.js`, `/workspace/bioprinting-workbench/tests/analysis-client.test.js`: pure Node tests; inject loaders/workers instead of requiring WebGL.
- `/workspace/bioprinting-workbench/tests/browser-checks.mjs`: repeatable browser acceptance using a confirmed existing Playwright installation; otherwise execute equivalent checks through connected tools and record runner limitation, without hidden installs.
- `/workspace/bioprinting-workbench/tests/fixtures/scenario-v1.json`, `/workspace/bioprinting-workbench/tests/fixtures/scenario-v2.json`, `/workspace/bioprinting-workbench/tests/fixtures/oxygen3d-synthetic.json`: labeled software fixtures, not research data.
- `/workspace/bioprinting-workbench/tests/blender_authoring_check.py`: sentinel-scene invariance, rerun and export leakage checks.
- `/workspace/bioprinting-workbench/scripts/check-syntax.mjs`: enumerate project JS/MJS and invoke Node checks, excluding vendor/generated files.
- `/workspace/bioprinting-workbench/docs/FLOW.md`, `/workspace/bioprinting-workbench/docs/SCENARIOS.md`: equations, formats, migrations and limitations.

## Existing modifications

- `/workspace/bioprinting-workbench/assets/author_bioprinter.py`: safe helpers; preserve entry point/static-only printhead boundary. Re-export `/workspace/bioprinting-workbench/assets/bioprinter.glb` after isolation tests. Correct binary executable mode to 0644 if still set.
- `/workspace/bioprinting-workbench/src/scene.js`: explicit static mount groups, shared loading, dynamic preservation, branch-relative animation, equipment/flow diagnostics and cleanup.
- `/workspace/bioprinting-workbench/src/app.js`: canonical state, async analysis, /2 export, atomic import, control/view synchronization; no expensive analysis in frame().
- `/workspace/bioprinting-workbench/src/calibration.js`: shared size/date/ID/provenance validation, finite derived arithmetic, optional dataKind, unchanged slab formula and legacy input support.
- `/workspace/bioprinting-workbench/src/procedure.js`: exported procedure-state validator; no changes to gating rules or cited prose.
- `/workspace/bioprinting-workbench/index.html`: scenario import/status; separate 3D oxygen, fit and network panels; fixed legend/slices/tables; truthful missing-model wording. Keep footer disclosure on a stable separate line from version to reduce false-positive removal warnings.
- `/workspace/bioprinting-workbench/src/analysis.css`: responsive panels, heatmap, legend/status/table styling. `/workspace/bioprinting-workbench/src/styles.css`: only necessary header wrapping changes, no unrelated reformat.
- `/workspace/bioprinting-workbench/package.json`: comprehensive syntax script, staged version bumps only when verified (proposed 0.4 equipment, 0.5 analyses, 0.6 scenarios); no new lockfile without dependencies.
- `/workspace/bioprinting-workbench/tests/assets.test.js`, `/workspace/bioprinting-workbench/tests/calibration.test.js`, `/workspace/bioprinting-workbench/tests/model.test.js`, `/workspace/bioprinting-workbench/tests/procedure.test.js`: expanded integrity/validation/regressions. Preserve all existing 1D tests.
- `/workspace/bioprinting-workbench/README.md`, `/workspace/bioprinting-workbench/docs/ASSETS.md`, `/workspace/bioprinting-workbench/docs/METHODS.md`, `/workspace/bioprinting-workbench/docs/OXYGEN.md`, `/workspace/bioprinting-workbench/docs/CALIBRATION.md`, `/workspace/bioprinting-workbench/docs/SOURCES.md`, `/workspace/bioprinting-workbench/docs/ROADMAP.md`, `/workspace/bioprinting-workbench/docs/VERIFICATION.md`: actual capabilities, model boundaries, provenance, authoring caveat and executed checks. `/workspace/bioprinting-workbench/docs/preview.png`: inspected real render.

No files deleted/moved; no changes to sibling projects, workspace infrastructure, safety boundaries or vendored Three.js. Keep model.js snapshot and oxygen.js APIs intact.

[Functions]

## New functions

`/workspace/bioprinting-workbench/src/validation.js`:
- `parseBoundedJson(text,maxBytes)`: size/JSON/root validation.
- `assertPlainRecord(value,path)`, `assertAllowedKeys(value,keys,path)`, `validateSource(source)`, `validateDataKind(value,fallback='unspecified')`: normalize safe schema fields.

`/workspace/bioprinting-workbench/src/numerics.js`:
- `solvePCG({apply,diagonal,rhs,tolerance=1e-10,maxIterations=5000})`: deterministic zero-initialized SPD solver, <=33^3 unknowns. Return values, iterations, residuals and convergence; explicit zero RHS, invalid diagonal, curvature breakdown and exhaustion. Recompute true residual before success.

`/workspace/bioprinting-workbench/src/equipment.js`:
- `validateEquipmentAsset(root,spec)`: namespaces, required meshes, finite bounds/transforms.
- `loadEquipmentAsset({spec,parent,fallback,load,reveal})`: validated attach transaction, latest reveal, fallback/error/disposal.
- `createEquipmentAssets(specs,mounts,{load})`: independent aggregate lifecycle/diagnostics; injected GLTFLoader adapter.

`/workspace/bioprinting-workbench/src/oxygen3d.js`:
- `validateOxygen3DSettings(raw)`: canonical bounds.
- `buildBoxOperator(settings)`: stencil application, diagonal, RHS and boundary geometry.
- `solveOxygenBasis(settings)`: unit-demand solve with PCG diagnostics.
- `solveOxygen3D(settings,basis=null)`: c=1-q*w, field/flux/domain diagnostics; reject mismatched basis.
- `sampleOxygenBasis(basis,position)`: documented boundary-aware trilinear interpolation.
- `extractOxygenSlice(result,axis,index)`: immutable presentation slice.

`/workspace/bioprinting-workbench/src/calibration3d.js`:
- `parseOxygen3DMeasurements(text)`: /2 only; separate slab parser.
- `fitOxygen3DDemand(input,basis)`: one-parameter estimate, residuals, sensitivity/domain checks.
- `oxygen3DExample()`: explicitly synthetic off-grid points with documented generating model/settings.

`/workspace/bioprinting-workbench/src/flow.js`:
- `validateFlowNetwork(raw)`, `validateFlowSettings(raw)`: canonical graph/settings.
- `createTeachingNetwork(settings)`: stable four-node/five-edge topology.
- `solveFlowNetwork(network)`: connected components, fixed-pressure elimination, reduced weighted graph Laplacian solve, edge flows and conservation. All-fixed components require no unknown solve.

`/workspace/bioprinting-workbench/src/scenario.js`:
- `createScenario(state)`: select/deep-copy canonical inputs with trusted limitations.
- `parseScenario(text)`: bounded dispatch and validation.
- `migrateScenarioV1(raw)`: reset unavailable progress/datasets with explicit warnings.
- `serializeScenario(state)`: canonical /2 JSON, no derived fields.

`/workspace/bioprinting-workbench/src/analysis-client.js`:
- `createAnalysisClient({workerFactory})`: returns `{request(kind,payload),invalidate(kind),dispose()}`; IDs, independent generations, startup/runtime failure handling and termination.

`/workspace/bioprinting-workbench/src/analysis-ui.js`:
- `createAnalysisUI({elements,client,onStateChange})`: returns `{setState(state),getState(),diagnostics(),dispose()}`.
- Internal `drawOxygenSlice(slice,canvas,legend)`, `showFit(fit)`, `drawFlowNetwork(network,result)`: fixed-scale Canvas2D/SVG and accessible numeric alternatives; no WebGL dependency.

## Modified functions and handlers

- `createLab(canvas)` in `/workspace/bioprinting-workbench/src/scene.js`: isolate static equipment groups before loading. Keep dish cells, construct, pump rotor, tubing and labels outside replacements. Preserve transforms/cameras; add `setFlowResult(result)` and `dispose()`.
- Nested `update(s,p,reveal,clock)`: late-loaded glass visibility, channel/zero-flow tracer stop, branch-relative animation only; no solving here. diagnostics() adds equipment status and solver-linked animation label, retaining printerAsset as a compatibility alias.
- `drawOxygen()` in `/workspace/bioprinting-workbench/src/app.js`: preserve analytical slab, capture demand in canonical state. New 3D analysis remains separate.
- Export handler: serializeScenario(), preserve Blob URL cleanup. New `importScenarioFile(file)` and `applyScenario(scenario)`: full validation before any state replacement, pause/invalidate/synchronize/recompute transaction.
- `render(clock)` / `frame(now)`: cheap storyboard work only. Analysis computes on relevant changes/explicit solve; slice changes only redraw.
- `parseCalibrationInput(text)` / `fitSlabDemand(input)` in `/workspace/bioprinting-workbench/src/calibration.js`: stricter validation, finite ratio/variance checks, unchanged formulas and declared provenance.
- New `validateProcedureState(raw)` in `/workspace/bioprinting-workbench/src/procedure.js`: known unique check IDs/mode. Existing clampTime()/isStageUnlocked() definitions unchanged.
- `snapshot(time,p)` in `/workspace/bioprinting-workbench/src/model.js` remains legacy diagnostic helper; do not overload it with datasets or UI state.

## Python authoring

`/workspace/bioprinting-workbench/assets/authoring_common.py`: `create_owned_scene(name)`, `material(scene,name,...)`, `box(scene,name,dims,loc,material,bevel=0.02)`, `cylinder(scene,name,radius,depth,loc,material,axis='Z',vertices=32)`, `export_owned_scene(scene,path)`, `summarize_asset(path)`.

Use bpy.data/bmesh, not mesh/transform operators acting in foreign context. Namespace owned meshes/materials. Refuse deletion of owned objects linked to a foreign scene; clean only unshared owned data. Capture scene/mode/selection/active object and foreign invariants before operations. Prefer scoped context override for export; restore in finally on success/failure. Never force a user's edit object into another mode. If safe live export cannot be established, fail safely and generate in background. No .blend save.

Each author script exposes `build_asset(output_path=None)` and guarded main entry; resolve common helper from __file__ for CLI/text execution. Owned namespaces: BioWorkbench_Bioprinter/Printer_, BioWorkbench_Incubator/Incubator_, BioWorkbench_Microscope/Microscope_, BioWorkbench_PerfusionChamber/Chamber_. Assets use illustrative scene units, not measured meters. No public functions removed; replace only inline printer loading with shared equipment lifecycle.

[Classes]

No new application classes, inheritance, framework or TypeScript. Preserve pure functions/plain objects and closure-based lifecycle factories. Existing Three.js objects remain library instances; no subclassing. Workers/loaders have explicit cleanup, not new global singletons.

[Dependencies]

- No new runtime packages. Keep local Three.js 0.187.0, existing GLTFLoader imports and MIT license unchanged.
- Blender uses installed/connected version 5.1.2, bpy/bmesh and built-in glTF exporter. Confirm installed API/export behavior when implementation begins; no asset service or downloaded/vendor mesh.
- Native module worker URL via `new URL('./analysis-worker.js',import.meta.url)` for Pages subpaths; Float64Array arithmetic and Canvas2D/SVG presentation.
- Node 24/node:test. Browser testing through existing connected Playwright tools; do not silently install packages. Verify reusable local runner availability first.
- Static HTTP hosting, no backend/CDN/service worker/build pipeline. Follow project reservation/container guidance; do not add Docker access. Current absolute repository path is `/workspace/bioprinting-workbench`; in a project-only container repository root is `/workspace`.
- Implementation must verify numerical discretization independently through analytical/manufactured tests and check platform behavior against installed primary documentation as needed. No new research facts or biological parameter values are asserted by this plan.

[Testing]

## Automated tests

Preserve 33 baseline tests; record new counts only after execution. Project-wide JS/MJS syntax checks include worker/scripts/tests. Python compile checks outside Blender must not import bpy. Run diff whitespace and guardrail checks.

1. **Validation/scenarios:** malformed/oversize JSON, null/arrays, unknown versions/keys, impossible dates, duplicate IDs, NaN/overflow arithmetic, prototype payloads, unsafe URL, mislabeled models/boundaries, unknown checks. Canonical export/import/export equality; no mutation on failure; reject gated inaccessible timestamps and conflicting flow/storyboard controls. /1 migration warnings/reset without fabricated data. Retain synthetic/unspecified/user-declared provenance; recompute derived results. Recipient labels never change numerical outputs.
2. **Numerics/oxygen:** zero RHS, diagonal/coupled SPD fixtures, invalid diagonal, exhaustion/breakdown and true residual. q=0 gives c=1. Slab-x agrees with analytical `1-q*(1-x²)/2` at cell centers. All-faces symmetry; manufactured smooth solution with known forcing using an internal test seam (not JSON). Refinements n=9,17,33 show approximately second-order error reduction; report actual rates. Boundary influx versus integrated consumption q*8. Standard normalized fixtures target residual/balance <=1e-8; conditioning-related tolerance changes need explanation, not silent relaxation. Negative concentrations remain flagged, not clipped.
3. **Fitting:** exact same-grid q recovery <=1e-8, noisy RMSE, off-grid/refined observations isolate interpolation/discretization error, zero boundary sensitivity unidentifiable, interior points informative, boundary-mode mismatch rejects, nonconverged basis refuses fit, out-of-domain q visible/apply disabled. Explicit application required; no invented confidence/biology claims.
4. **Flow:** single edge/series/parallel analytical solutions, equal pressure, sign reversal, unequal branches, anchored disconnected components, unanchored errors, all-fixed nodes, invalid endpoints/IDs/resistances, disabled channels. Well-conditioned fixtures target analytical error and scale-aware node/global residual <=1e-9. Ill-conditioned failures are explicit.
5. **Assets:** iterate complete GLB chunks; v2 header/length/alignment/BIN/accessor bounds; embedded buffers/images only; recursive namespaces, required nodes, finite bounds/transforms, triangle/material/byte budgets, SHA-256 manifest. No foreign objects/animated printhead/rotor/tracers in assets. Mock late/success/error/invalid loads and reveal/disposal; never hide fallback before validation/attachment.
6. **Worker:** stale responses after changing settings, clearing datasets or scenario import; independent fit/field IDs; startup/runtime/message errors; dispose and cache buffer ownership. Frame updates never request solves.
7. **Blender:** foreign sentinel scene with objects/materials/mode/selection snapshots. Generate each asset twice; foreign invariants unchanged, owned data counts stable, no leaked nodes or .blend save. Force export failure and verify restoration. If live mode cannot pass safely, use background and document limitation; never retroactively assert v0.3 scene isolation.

## Browser acceptance and inspected screenshots

- Success/individual blocked asset requests, compatibility diagnostics, correct mount/orientation/bench placement and main cameras. Inspect screenshots, not only load flags.
- Verify actual moving printhead position during deposition; scaffold rebuild/count, cells, rotor, tubing and chamber construct still work. Reveal checked before delayed GLB arrival remains correct.
- Default gates, checkbox progression, playback gate stop, free mode/restart, timeline and cameras remain functional.
- 3D solve/fit does not freeze playback; slices/axis coordinates/fixed legend/residuals/balance visible. Changed inputs mark stale/pending results honestly. Worker failure leaves core app/slab/flow usable.
- Network outputs explicitly dimensionless; zero drive/channels-off stop tracers; unequal resistance changes relative branch animation after successful solve; no stale success after numerical failure.
- Both measurement formats, scenario round-trip, /1 warning/reset, malformed files and size limits. No source URL fetch, DOM injection, partial restore or stale worker overwrites.
- Headless Chromium real WebGL and forced unavailable WebGL; numerical panels usable without WebGL. Desktop 1440px and mobile 390px no overflow; labels/focus/keyboard/status/table accessible. Test Pages-style subpath worker/asset URLs. No Safari/Firefox or physical-device claims without running them.
- Record solve latency, draw calls/geometries/textures and asset bytes on the same browser versus baseline; no device-independent FPS promise. Keep resolution 33 verification-only if needed rather than silently changing requested resolution.

## Review/release

Claims scan is advisory plus manual review; preserve AI disclosure and limitation wording, resolve every finding. Cite/verify any new factual research claim from primary sources before publication; do not attribute synthetic equations/bounds to biology papers. Update docs with actual executed results and untested areas. Never disable hooks by default. Keep this plan untracked unless requested. Before authorized publication inspect staged diff, run full tests/checks/scan/diff checks, then verify deployed revision and live worker/asset/import behavior. Planning approval alone does not authorize publishing.

[Implementation Order]

1. Obtain explicit implementation approval; re-check Git status, single-agent reservation, guidance/tool versions and baseline. Preserve unrelated changes.
2. Shared validation/tests, finite slab arithmetic, optional provenance and procedure-state validator without changing equations/gating.
3. Safe Blender helpers and sentinel tests first; qualify historical isolation wording; refactor printer authoring, regenerate only after safety verification.
4. Author incubator (cabinet/inner door/shelves/handle/unnumbered display), inverted microscope (base/stage/illumination support/objectives beneath stage/controls), chamber (base/clear cover/fittings). No copied vendor detail or actionable displays. Export independently and verify manifest/budgets.
5. Shared loader and explicit static groups; integrate one equipment asset at a time; check dynamic content/reveal/fallback/cameras/screenshots. Complete equipment milestone, proposed 0.4.0.
6. PCG/finite-volume box with analytical/manufactured/refinement/conservation tests before heatmap UI; keep slab untouched.
7. 3D measurement schema/scalar fit and degeneracy/provenance tests; worker/client/cache/staleness/failure lifecycle.
8. Resistance network with analytical/conservation tests; then default branch mapping and explicitly illustrative tracer ratios. Keep oxygen uncoupled.
9. Event-driven analysis panels, responsive legends/numeric fallback and explicit fit application. Verify no-WebGL/no-worker paths and measured performance; complete analysis milestone, proposed 0.5.0.
10. Scenario /2 canonical contract and /1 migration fixtures; atomic UI import/export, paused playback, synchronized view/controls/gates, invalidated pending work and recomputation.
11. Full browser regression, screenshot inspection/preview, equations/schema examples/source ledger and executed verification; integrated milestone proposed 0.6.0.
12. Full tests/syntax/Python/guardrails/diff review; report evidence and gaps. Only with release authorization commit/push verified increments and confirm Pages/live behavior; otherwise leave reviewed local changes without publication.

**Approval gate:** no implementation begins until the owner confirms. Real-unit calibration, coupled flow/oxygen, experimental execution and biological suitability remain out of scope after software acceptance.