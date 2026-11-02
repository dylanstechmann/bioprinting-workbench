# Measurement import for the oxygen slab

## Additional normalized 3D point format

The separate 3D panel accepts `bioprinting-workbench/calibration-input/2` with
model `steady-3d-box-constant-consumption`, units `dimensionless-ratio`, source
metadata, dataKind, normalized domain min [-1,-1,-1]/max [1,1,1], boundaryMode
`all-faces` or `slab-x`, and 1–100 unique `{id,position,concentration,boundary}` points.
See `tests/fixtures/oxygen3d-synthetic.json` for a fully labeled synthetic example.
Concentration is nonnegative and boundary strictly positive. No SI conversion or
mapping from measurements to real tissue geometry is performed.

For b_i = interpolated unit-demand solution w at each point and r_i = measured
ratio, least squares gives q = sum[b_i(1-r_i)]/sum[b_i²]. Domain, diffusivity and
boundaries stay fixed; fitting them all would confound this scalar estimate.
Trilinear interpolation uses zero padding on supplied faces and constant extension
at no-flux faces. Boundary-only observations can be unidentifiable (denominator
<=1e-12). Unconstrained estimates outside [0,2] remain visible but cannot be applied.
Applying an admissible estimate is always explicit, never automatic.

Residual RMSE is in ratio units; neither residuals nor a close fit establish tissue
validation. No uncertainty interval is invented. Provenance values are synthetic,
user-declared-measured (unverified), or unspecified. Legacy slab files default to
unspecified; the built-in examples are synthetic. Both parsers limit input to
256 KiB, validate real calendar dates/HTTP(S) URLs, and reject arithmetic overflow.

## Existing slab format (still supported)

**Status: nothing is calibrated by default.** This project bundles no measurement dataset,
and no construct in the simulator is fitted to any tissue. The import exists so the owner
can later supply their own measured pairs and see a transparent estimate under the slab
model's assumptions. Files are read locally in the browser; nothing is uploaded, stored or
fetched from the network.

## Input schema

```json
{
  "schema": "bioprinting-workbench/calibration-input/1",
  "source": { "citation": "Your cited source for these measurements", "url": "https://…", "accessedDate": "YYYY-MM-DD" },
  "units": "dimensionless-ratio",
  "measurements": [ { "id": "sample-a", "center": 0.42, "boundary": 1.01 } ]
}
```

- `schema` and `units` must match the literals above (center/boundary concentration ratio;
  no SI unit conversion is performed or implied).
- `source.citation` is required and must be a real citation you are responsible for;
  `accessedDate` must be a valid `YYYY-MM-DD` date.
- `measurements`: 1–100 entries, each with a non-empty `id` and finite positive `center`
  and `boundary` values measured under comparable conditions.

## What the fit does

For each pair, `q_i = 2 × (1 − center/boundary)`. The reported estimate is the mean `q`
over all pairs, with the residual standard deviation across pairs, the min/max per-pair
estimates, and the pair count. An estimate outside `[0, 2]` is flagged as outside the
model domain: the slab assumptions do not hold for those values.

## What the fit is not

- It is bound to the steady 1D slab assumptions (uniform consumption, equal unit
  concentration at both faces) described in [OXYGEN.md](OXYGEN.md).
- It is **not** a tissue measurement, viability result, oxygenation measurement, or safety
  result, and it does not make the 3D construct calibrated.
- It carries no clinical, animal-use or transplant-readiness meaning.
- The synthetic example shipped behind the "Load synthetic example" button is explicitly
  labeled as synthetic and is not a measurement.

The in-app readout, the `calibration` section of exported scenario JSON, and the
`bioprintingWorkbench.diagnostics().calibration` status all state the assumption-bound
notice alongside the numbers.
