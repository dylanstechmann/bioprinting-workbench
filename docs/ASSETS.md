# Asset provenance and Blender/CAD extension path

All lab equipment, tissue markers, scaffold and abstract recipient geometry is original
procedural source in `src/scene.js`. The visual goal is recognizable material and equipment
vocabulary rather than an exact device or anatomical replica. No external model generation,
paid service, vendor mesh, patient anatomy, paper figure or texture was used.

The locally bundled Three.js 0.187.0 files (`three.module.js`, `three.core.js`,
`OrbitControls.js`) were taken unchanged from the existing course frontend's installed
package. Its MIT license is retained at `vendor/three/LICENSE`. Runtime imports are fully
local. The original source of the dependency is https://github.com/mrdoob/three.js .

## Future authored high-fidelity assets

Blender or CAD is optional, not required for this version. A future replacement workflow:

1. Author generic equipment separately, keeping scene groups and meaningful object names.
2. Declare units and dimensions for equipment; keep magnified cellular visuals separate.
3. Model bevels, fasteners, tubing connectors and device interfaces from permitted references.
4. Export glTF/GLB with embedded PBR materials and licensed textures; avoid large subdivision
   meshes and include a lower-detail variant. Review mobile GPU cost.
5. Add the matching Three.js GLTFLoader and dependencies locally with licenses and hashes.
6. Replace only an equipment group, preserving model-driven scaffold/cell state. Verify
   transform scale, camera framing, collisions if modeled, asset credits and browser loading.

GLB import is a planned extension, not a control implemented in v0.1. This version uses
shadows, translucent materials and procedural geometry, not scanned photorealistic assets.