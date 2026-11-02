# Scene environments: laboratory and Treedome

Both themes are original procedural artwork authored in code (`src/environment.js`).
No third-party or show assets, frames, music, dialogue or logos are used. The theme
changes presentation only: it supplies no biological parameters, never alters `sample()`,
oxygen, flow or storyboard values, and does not change equipment, gates or the construct.

## Laboratory (default)

The neutral lab room (floor, bench, wall, service panel, cabinets and fixtures) was
extracted from the pre-0.8 scene with identical geometry, materials and layout; scene
background and fog match the previous build. Theme data: `{ id: 'lab', fictional: false }`.

## Treedome (fictional, fan-inspired)

An original procedural underwater dome: sandy floor, a glass dome shell with a rim, a
tree with a small treehouse room and ladder rungs, deterministic grass tufts and rocks,
and drifting bubbles that stay static under `prefers-reduced-motion`.

**Attribution.** This theme references the fictional Sandy Cheeks setting from
*SpongeBob SquarePants* (Nickelodeon). It is unofficial, fan-made educational artwork,
not affiliated with or endorsed by the creators. The fictional character and setting are
presentation references only — Sandy is not squirrel-biology evidence and SpongeBob is
not a specified sponge cell line. Theme data: `{ id: 'treedome', fictional: true }`.

## Ownership and lifecycle

The environment module owns exactly its context group, geometries, materials and canvas
textures; it never disposes shared bench, equipment or construct objects. Switching
themes disposes the previous theme's owned resources and rebuilds, so repeated switches
do not grow object/material/texture counts (verified in `tests/environment.test.js` with
a stubbed renderer). Teardown is idempotent; use after dispose throws. Diagnostics report
the active theme and owned-resource counts separately from scientific state.

`src/scene.js` delegates to the environment module (`setEnvironment`), keeps every camera
preset and equipment mount unchanged, and restores the selected theme when a scenario is
imported (`view.environment` in scenario schema `/4`, defaulting to `lab` in `/3` and
older migrations). Theme selection remains usable without WebGL.