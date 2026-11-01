# Bounded next milestones

The first release is a usable geometric/storyboard prototype, not a biological simulator.

Delivered in v0.2 (2026-11-01): the gated, cited virtual procedure walkthrough; the local
measurement import for the oxygen slab (nothing calibrated by default); PMREM environment
lighting, procedural canvas textures, physical materials and rounded equipment geometry.

Delivered in v0.3 (2026-11-01): the Blender-authored bioprinter body
(`assets/bioprinter.glb` + reproducible `assets/author_bioprinter.py`) with GLB loading,
procedural fallback and an animated procedural printhead.

- Extend the Blender asset set to the incubator, microscope and perfusion chamber;
  add a separate magnified construct viewport and explanatory vascular cross-sections.
- Fit the slab (and later a 3D oxygen model) to owner-supplied measurements with units,
  convergence tests and explicit synthetic-vs-measured parameter provenance.
- Add a network-flow solver with conservation checks before displaying physical flow values.
- Model scaffold-first seeding and cell-laden printing as separate selectable workflows.
- Teach endothelial lining and host-vessel connection as evidence gaps, not automatic transitions.
- Add importable versioned scenarios, keyboard camera controls and performance presets.
- Obtain independent domain review before making stronger scientific teaching claims.

No milestone implies experimental execution, clinical use or animal-use readiness.