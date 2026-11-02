# Asset provenance and Blender/CAD extension path

All lab equipment, tissue markers, scaffold and abstract recipient geometry is original
procedural source in `src/scene.js` or the Blender scripts described below. The visual
goal is recognizable material and equipment vocabulary rather than an exact device or
anatomical replica. No external model generation, paid service, vendor mesh, patient
anatomy, paper figure or texture was used.

The locally bundled Three.js 0.187.0 files were taken unchanged from the existing course
frontend's installed package. Its MIT license is retained at `vendor/three/LICENSE`.
Runtime imports are fully local. The original source of the dependency is
https://github.com/mrdoob/three.js .

## Blender-authored bioprinter body (v0.3)

The historical v0.3 `assets/bioprinter.glb` (~230 KB, 39 meshes, 6 PBR materials, embedded buffers) is an
original asset authored in the owner's Blender 5.1.2 via the Blender MCP connection by the
coding agent on 2026-11-01. It was built in a separate Blender scene
(`BioWorkbench_Bioprinter`); no `.blend` file was saved. Historical correction: object
operators ran in the active scene before relinking. The earlier claim that selection
and active-object state stayed untouched was not substantiated. An initial export mistakenly included the active scene's content;
this was caught from the export log, fixed by activating only the asset scene during
export and restoring afterwards, and the corrected GLB was verified to contain only
`Printer_*` nodes (no foreign scene content).

**Regenerate:** run `assets/author_bioprinter.py` inside Blender (Text Editor → Run
Script) or `blender --background --python assets/author_bioprinter.py`. It rebuilds the
asset scene idempotently and writes `bioprinter.glb` beside the script. The script is the
canonical source of the geometry; the GLB is a generated artifact committed for the
static site.

**How the browser uses it:** `src/scene.js` loads the GLB with the vendored
`GLTFLoader` (`vendor/three/loaders/GLTFLoader.js` plus `vendor/three/utils/`), hides the
procedural static housing on success, and keeps the **animated printhead procedural** so
deposition still moves. If the GLB request fails or while it loads, the procedural
printer remains in use (`diagnostics().graphics.printerAsset` reports `procedural`,
`glb-loaded` or `procedural-fallback`). "Reveal scaffold" hides the GLB's `*Glass*` nodes.

## Original next steps (implemented below)

- Author the incubator, inverted microscope and perfusion chamber the same way (separate
  scenes, one GLB each, named parts, export-only-own-scene).
- Keep equipment dimensions in scene units and magnified cellular visuals separate.
- Keep GLBs small (bevels applied, no textures required) and verify browser cost.
## Current four-asset authoring path (unpublished working tree)

Printer, incubator, inverted microscope and perfusion chamber are original AI-assisted
artwork in arbitrary illustrative units, not measured commercial equipment. See
`assets/manifest.json` for actual byte counts, triangles, bounds and SHA-256 hashes.
Scripts use `authoring_common.py`, creating meshes without object operators, and
only rebuild scenes carrying their ownership marker. Foreign/shared scenes are
not deleted. Run in Object mode; other modes fail before generation. Legacy v0.3
scenes are not automatically adopted. No source citations or user URLs are fetched.

The browser validates required nodes/bounds before hiding each procedural fallback.
Labels, animated printhead, dishes, tubing, tracers and tissue remain procedural.
Reveal state is applied even when a GLB arrives late. Each asset has independent
loading/loaded/fallback diagnostics. No optimization or measured-realism claim is made.

Agent-run Blender checks generated each asset twice, compared foreign-scene object,
material, selection and active-object fingerprints, verified stable object/mesh/material
counts on rerun, and forced export failures to check scene restoration. The old v0.3
asset scene was retained under a legacy name to avoid name collisions; it was not
deleted, and the unrelated active scene/.blend was not saved. Object/data names can
collide in other Blender sessions; use a fresh session for canonical named exports.

Budgets: 350 KiB per asset and 1.5 MiB total. Current combined GLBs are 366,168 bytes.
This is a software artwork check, not equipment accuracy or human review.
