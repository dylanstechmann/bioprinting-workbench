# The 200-micron wall: an idealized oxygen-supply reference

The workbench's second physics-anchored teaching model after nozzle shear (0.18). Every
frontier target in the tissue atlas names perfusion as its barrier, and the classic teaching
statement is the oxygen diffusion limit: cells die for lack of oxygen and nutrients beyond
roughly 100-200 micrometers from the nearest vessel. This module computes that distance from
first principles in an idealized form, with your hypothetical inputs, and shows the cited band
beside the result as context. It is a teaching reference, never a viability prediction.

## The model

Steady Krogh cylinder: a single perfused channel of radius r0 inside tissue that consumes oxygen
at a constant zero-order rate M with uniform diffusivity D, inlet (wall) concentration C0, and no
flow resistance or cell type. The concentration profile on [r0, R] is
C(r) = C0 + M/(4D) (r^2 - r0^2) - (M R^2 / 2D) ln(r/r0), with C(r0) = C0 and zero slope at R.
The supply-limiting radius R_crit is where C touches zero:
R^2 (2 ln(R/r0) - 1) + r0^2 = 4 D C0 / M, solved by bisection. The planar comparison thickness is
L = sqrt(2 D C0 / M); the idealized minimum channel density for full supply is 1/(pi R_crit^2).
If consumption is too small to starve the tissue within the 10 mm cap, the result says
"not limiting at this scale in this idealization" rather than inventing a number.

Pinned worked example (also a test): D = 1e-9 m2/s, C0 = 0.13 mol/m3, M = 1e-2 mol/(m3 s)
gives L = 161 um, inside the cited band; the cylindrical idealization supplies farther than the
planar one, and tests verify the boundary conditions and the bisection root numerically.

## The evidence layer

Four open-access sources fetched 2026-11-02, quoted verbatim in
`docs/vascular-supply-audit.json` with locators and source ids, tested for equality with the
runtime catalog:

- Mansouri & Leipzig 2021, Biophys Rev (Melville) 2021, doi:10.1063/5.0048837 (PMC10903443) -
  the Fickian constitutive basis and the necrotic-core modeling conclusion.
- Seymour et al. 2022, Biofabrication, doi:10.1088/1758-5090/ac4fb5 (PMC8988885) - the printed
  resolution gap (extrusion reaches 100-300 um channels well, capillaries 10-50 um poorly) and
  the three requirements for in-vivo vascular function.
- Yeo et al. 2023, Biofabrication, doi:10.1088/1758-5090/ad0b3f (PMC10658349) - the 100-200 um
  teaching band restated verbatim, and the honest anastomosis uncertainty.
- Zhang et al. 2025, Acta Biomater, doi:10.1016/j.actbio.2025.06.006 (PMC12277018) - a second
  independent restatement of the band and a current mesoscale printing demonstration.

The band shown in results is claim data, not a constant: the catalog requires at least two
independent band-anchor claims that agree exactly, or it refuses to display an unstable band.
The two band quotes are reviews restating earlier work ([93], [2] inside the quotes); they are
teaching context, never a threshold this module enforces or a prediction for any cell.

## What this module does not do

- No flow, pressure, shear or resistance; no cell type, species or tissue specificity.
- No viability, survival or damage claim at any distance; the band is context, not a threshold.
- No coupling to the storyboard, oxygen, flow or nozzle-shear models; it changes no other value.
- It does not model endothelialization, sprouting, hierarchy or host anastomosis - the fetched
  sources say those are exactly the unsolved parts, and the module says so beside every result.

## Scenario persistence

Settings persist as `analyses.vascularSupply` in scenario schema `bioprinting-workbench/12`
(hypothetical-controls origin only in v1). Version 11 and older files migrate with the design
inputs initialized to defaults and a warning that says so.
