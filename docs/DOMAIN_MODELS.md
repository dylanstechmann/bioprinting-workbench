# Domain models and run provenance (Phase B)

Personal hobby/learning project, AI-assisted. Everything here is software contract metadata
for synthetic, hypothetical and idealized teaching models. A unit label, quantity record or
SHA-256 digest is not a biological measurement, validation claim, viability threshold or
transplant-readiness score. Published-source identifiers describe where a formula or a
context band was cited from; they never upgrade a computed value to "literature" or
"reviewed". User-declared measurements stay labelled unverified by construction.

## Registry (`src/domain-models.js`)

Seven independent models are registered, version 1, `couplingPolicy: independent`:

| id | native evaluator | quantity origin | notes |
| --- | --- | --- | --- |
| `storyboard` | `src/model.js` `sample` | synthetic | dimensionless scripted timeline; time clamps to [0, 4.999] |
| `slab-oxygen` | `src/oxygen.js` `oxygenProfile` | synthetic | steady 1D slab; odd points in [3, 1001] |
| `box-oxygen` | `src/oxygen3d.js` `solveOxygen3D` | synthetic | numeric field; non-converged = numerical-failure, out-of-range = out-of-domain |
| `flow-resistance` | `src/flow.js` `solveFlowNetwork` | synthetic | dimensionless network; native numerical-failure maps through |
| `nozzle-shear` | `src/nozzle-shear.js` `evaluateNozzleShear` | hypothetical | explicit density parameter pins the native optional; laminar flag -> out-of-domain |
| `vascular-supply` | `src/vascular-supply.js` `evaluateVascularSupply` | hypothetical | Krogh reference; a null radius at the 10 mm cap is a succeeded result with a missingReason |
| `relative-division` | `src/cell-division.js` `evaluateRelativeDivision` | synthetic | 2^doublings arithmetic; null hours stay null with a reason |

Cross-reference (`src/cross-reference.js`) is deliberately **not** a registered model: it is an
explicit hypothetical mapping adapter over nozzle-shear and vascular-supply, pinned by its own
identity tests. Tissue atlas, hardware and recipe catalogs are reference content, not runnable
models. There is no plugin or dynamic registration API.

Units are an exact allowlist (`MODEL_UNITS`): `1` (dimensionless/normalized), `count`, `Pa`,
`Pa*s`, `um`, `mm3/s`, `mm/s`, `1/s`, `m2/s`, `mol/m3`, `mol/(m3*s)`, `1/mm2`, `kg/m3`, `h`,
`relative-population`. **No implicit conversion exists anywhere.** A quantity must state its
exact unit; interval uncertainty must use the same unit and enclose the value.

`Quantity = {value, unit, origin, sourceIds, uncertainty, missingReason}` with origins
`synthetic | hypothetical | user-declared-measured | literature | derived`. Null values require
a specific nonempty `missingReason`; there are no JSON-null silent substitutions. Derived
quantities require run provenance; literature quantities require resolvable source IDs.

## Adapters (`src/model-adapters.js`)

`evaluateDomainModel(id, inputs, {runId})` validates a complete input envelope, calls the
native evaluator exactly once with defensive copies and returns a defensive copy of the exact
native result (typed arrays copied). Tests pin identity against direct calls
(`tests/model-adapters.test.js`); invalid inputs surface the native errors; classification
helpers map native flags to `succeeded | out-of-domain | numerical-failure` without coercion.
Caller inputs are never mutated (pinned with deep-frozen inputs).

## Run provenance (`src/model-provenance.js`)

`ModelRun` records (`bioprinting-workbench/model-run/1`) carry `inputSnapshot` +
`inputSha256` (digest of canonical JSON bytes of the complete adapter inputs) and
`implementationSha256` from the dependency manifest, or `provenanceStatus: incomplete` with a
null digest. A digest attests **byte identity only** — never scientific validity. Failed and
cancelled runs carry empty outputs plus a diagnostic reason; output quantities always carry
`derived` origin (they cannot upgrade review level).

Canonical JSON (`sorted-json-lf/1`): recursively sorted object keys (UTF-16 code units), array
order retained, JSON.stringify leaf formatting (`-0` becomes `0`), UTF-8 with exactly one
trailing LF. Rejected: undefined, BigInt, functions, symbols, accessors, non-enumerable or
dangerous keys (`__proto__`/`prototype`/`constructor`), sparse arrays, exotic prototypes,
nonfinite numbers, lone surrogates, typed arrays, cycles (shared noncyclic references are
fine), > 32 nesting, > 100k nodes, > 1 MiB. This is a project-specific format, not an RFC
canonicalization claim. Cross-language exchange hashes **exact producer bytes**; Python/JS
float formatting is not assumed identical.

## Implementation manifest (`assets/model-provenance.json`)

Built by `npm run provenance:build` (`scripts/build-model-provenance.mjs`): for each model,
the static relative-import closure of `src/model-adapters.js` + the evaluator entry is hashed
per file (exact bytes). Because the adapter module is a shared root, every model's closure is
conservatively large (it includes catalog and validation dependencies); this is deliberate —
an underhashed digest would be worse than none. Unsupported import forms (dynamic import,
template/bare specifiers, traversal, missing files) fail closed.

`npm run provenance:check` is read-only and fails on any drift. `npm run verify:release`
refuses stale manifests and excludes the three named development-history planning archives
from the public candidate inventory. After editing any source file in the closure, rebuild the
manifest before the final verification battery.
