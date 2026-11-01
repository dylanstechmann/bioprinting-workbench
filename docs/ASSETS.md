# Asset provenance and Blender/CAD extension path

All lab equipment, tissue markers, scaffold and abstract recipient geometry is original
procedural source in `src/scene.js`, except the bioprinter body described below. The visual
goal is recognizable material and equipment vocabulary rather than an exact device or
anatomical replica. No external model generation, paid service, vendor mesh, patient
anatomy, paper figure or texture was used.

The locally bundled Three.js 0.187.0 files were taken unchanged from the existing course
frontend's installed package. Its MIT license is retained at `vendor/three/LICENSE`.
Runtime imports are fully local. The original source of the dependency is
https://github.com/mrdoob/three.js .

## Blender-authored bioprinter body (v0.3)

`assets/bioprinter.glb` (~230 KB, 39 meshes, 6 PBR materials, embedded buffers) is an
original asset authored in the owner's Blender 5.1.2 via the Blender MCP connection by the
coding agent on 2026-11-01. It was built in a separate Blender scene
(`BioWorkbench_Bioprinter`); the user's existing Blender scene was not modified and no
`.blend` file was saved. An initial export mistakenly included the active scene's content;
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

## Next asset steps

- Author the incubator, inverted microscope and perfusion chamber the same way (separate
  scenes, one GLB each, named parts, export-only-own-scene).
- Keep equipment dimensions in scene units and magnified cellular visuals separate.
- Keep GLBs small (bevels applied, no textures required) and verify browser cost.