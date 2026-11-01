# Bioprinting Workbench

A personal hobby and learning project with AI-assisted development: a browser-based,
interactive 3D tissue-engineering lab with original procedural equipment and a synthetic,
inspectable scaffold-to-graft storyboard. Agent-built; not independently scientifically reviewed.

![Interactive scaffold and perfusion concept](docs/preview.png)

## Run locally

From `/workspace/bioprinting-workbench`:

```sh
python3 -B -m http.server 8096 --bind 127.0.0.1
```

Open **http://localhost:8096** in a modern WebGL2-capable browser. No install, build,
API key, account or external asset service is needed. Do not open `index.html` through
`file://`: browser module security requires an HTTP server. Python is only a static
file server, not a simulation backend. The app can also be hosted at a subdirectory.

## Explore

1. **Expand:** a seeded synthetic cell population in culture dishes, with an incubator
   and inverted microscope on the bench.
2. **Print:** layer-by-layer alternating scaffold filaments in an enclosed extrusion printer.
3. **Organize:** scripted cell occupancy and an illustrative tissue matrix.
4. **Perfuse:** designed channels, tracer motion, reservoir, pump and perfusion chamber.
5. **Integration:** hypothetical placement against an abstract recipient patch, not surgery.

Orbit/pan/zoom, switch camera presets, scrub or play the sequence, reveal the scaffold,
change design variables, disable channels, and export a reproducible JSON scenario.
Human/animal context labels do not change the biology or make species-specific predictions.

**This is not biologically calibrated, a wet-lab protocol, a transplant-readiness tool,
or guidance for treating a person or animal.** Cells, channels and tissue are intentionally
magnified; there is no physical unit conversion or biological timescale. Cell expansion,
adhesion and matrix appearance are scripted. Designed channels are not established
functional blood vessels. Recipient integration, immune response, oxygen transport,
fluid mechanics and tissue function are not simulated. No real cells, animals, people,
equipment, patient records or experimental measurements are connected.

## Architecture and verification

- `src/model.js`: pure deterministic state, bounded dimensionless inputs and JSON export.
- `src/scene.js`: Three.js lab, scaffold geometry and illustrative animation.
- `src/app.js`: controls and playback; all stage views use the same sampled state.
- `tests/model.test.js`: Node's built-in test runner; no package installation required.
- `vendor/three/`: pinned Three.js 0.187.0 runtime and OrbitControls, MIT license retained.

```sh
npm test
npm run check
```

See [methods](docs/METHODS.md), [sources](docs/SOURCES.md),
[assets and Blender/CAD extension path](docs/ASSETS.md) and [roadmap](docs/ROADMAP.md).
This first release prioritizes coherent interactive equipment and inspectable geometry;
it is a real-time illustrative 3D scene, not a photorealistic or physically validated digital twin.

## Research and software credits

Scientific context: Kolesky et al., *Three-dimensional bioprinting of thick vascularized
tissues* (2016), DOI: 10.1073/pnas.1521342113; Grigoryan et al., *Multivascular networks
and functional intravascular topologies within biocompatible hydrogels* (2019),
DOI: 10.1126/science.aav9750. These are different workflows, not reproduced experiments.
CELLINK's official BIO X material informed generic equipment vocabulary, not exact CAD,
vendor endorsement, settings or a purchase recommendation. No paper figures were copied.
Three.js is credited under its bundled MIT license; no research datasets were used.

Read-only architectural inspiration: the research/evidence boundaries in `regen-workbench`,
the procedural pipette bench in `uniStemCourseSimulators`, and deterministic state/view
separation in the IEEE robot's Mule Dynamics Studio and Pocket Pal CAD viewer. Their code
and data were not copied, merged, changed, or presented as new work here.

Original project source is MIT licensed. Scientific ideas and third-party software retain
their original attribution; no independent scientific review or physical validation is implied.