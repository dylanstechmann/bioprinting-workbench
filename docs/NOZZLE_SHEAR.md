# Nozzle shear reference model

Personal learning project, AI-assisted. This is a teaching reference calculation with cited
open-access context. It is not CFD, not a laboratory protocol, not a print setting and not
advice for any person or animal.

## What the module does

The workbench's Print stage has always said that rheology, printability windows and cell-damage
fluid mechanics are not modeled. This module adds the one piece of that physics which can be
stated honestly and analytically: **wall shear stress in an idealized steady laminar cylindrical
capillary**, positioned against verbatim-quoted open-access simulation values and restated
in-vitro viability context.

Inputs (hypothetical teaching values):

- nozzle inner diameter, 60-600 µm (roughly 30G to a wide-bore tip);
- volumetric flow, 0.001-100 mm³/s;
- viscosity mode: a hypothetical constant viscosity, or the **cited power-law fit** for Cellink
  bioink at 37 °C reported by Gómez-Blanco et al. 2023 (their Equation (I):
  μ = 87.906 · γ̇⁻⁰⁷⁹², i.e. consistency index K = 87.906 Pa·sⁿ with flow index n = 0.208).

Physics (textbook idealizations, all stated in the UI):

- mean velocity U = Q/(πr²) with r = d/2;
- Newtonian wall shear rate γ̇_w = 4Q/(πr³) = 8U/d;
- Newtonian wall shear τ_w = μγ̇_w = 8μU/d = 32μQ/(πd³);
- power-law branch: the standard Rabinowitsch correction for pipe flow,
  γ̇_w,corr = ((3n+1)/(4n)) · 4Q/(πr³), τ_w = K · γ̇_w,corrⁿ, apparent μ = τ_w/γ̇_w,corr;
- Reynolds number Re = ρUd/μ with a **fixed hypothetical density of 1000 kg/m³**; when
  Re exceeds 2300 the module flags that the laminar idealization does not hold and the number
  should be treated as illustrative only.

The analytic identities are pinned by tests: 4μQ/(πr³) ≡ 8μU/d ≡ 32μQ/(πd³), and with
K = μ and n = 1 the power-law branch reduces exactly to the Newtonian branch.

## The honest idealization gap

At the cited study's piston-driven input (0.4 mm nozzle, 10 mm³/s, their fitted Cellink
rheology) the reference calculation gives τ_w ≈ 468 Pa. Their CFD, which models the real
contraction geometry and drop formation, reports 362.85-383.24 Pa for piston-driven and
242.16-455.43 Pa across both drive modes. The ~20% gap between the idealized capillary and the
CFD is exactly the physics the idealization omits (entrance effects, the conical contraction,
transient drop formation). The module states this as context, **not** as a reproduction of
their result, and pins the comparison in a test so the honest gap stays honest.

## The evidence layer

Every context number on the panel is a verbatim quote from the fetched open-access paper
(Gómez-Blanco JC, Pagador JB, Galván-Chacón VP, Sánchez-Peralta LF, Matamoros M, Marcos A,
Sánchez-Margallo FM. *Computational simulation-based comparative analysis of standard 3D
printing and conical nozzles for pneumatic and piston-driven bioprinting.* Int J Bioprint
2023;9(4):730. doi:10.18063/ijb.730, CC-BY, full text open at PMC10261129):

- their CFD wall shear values (455.43/242.16 Pa pneumatic, 362.85/383.24 Pa piston);
- their statement that the maximum of all their simulations, 455.43 Pa, is more than ten
  times lower than the threshold proposed by Blaeser et al.;
- the viability context bands **as restated by that paper** for the Blaeser work: below 5 kPa
  described with viability up to 96%, 5-10 kPa with 91%, above 10 kPa with 76%;
- their restatements of other groups' low-shear values (Liu et al. 30/180/300 Pa; Müller et al.
  ~160 Pa across 22-30G tips);
- the fitted rheology and inlet conditions actually simulated.

The Blaeser and Liu studies themselves are **not open-access and were not fetched**: those
claims are stored with basis `secondhand-restatement`, and the catalog validator rejects any
such claim unless its limitations say so. Verbatim quotes, locators and the source DOI are
mirrored in `docs/nozzle-shear-audit.json` and tested for equality with the runtime catalog.
Quotes are transcribed from the PMC reading view with inline math in linear form.

## What this module does not do

- It predicts nothing: band placement is a label against restated context, not a viability
  forecast, a safety verdict or a damage threshold for any cell type, species or exposure time.
- It is not coupled to the storyboard construct, the oxygen box or the flow network (all four
  models remain deliberately independent).
- It models no cell response, no shear history along the real contraction, no crosslinking, no
temperature dependence beyond the cited fit, no viscoelasticity and no particulate phase.
- Nothing here selects or recommends a nozzle, a pressure, a flow or a material.

## Scenario persistence

The inputs persist under `analyses.nozzleShear` in scenario schema `bioprinting-workbench/10`
(settings plus a parameter origin that must be consistent with the viscosity mode).
Version 9 and older files migrate with the nozzle-shear design inputs initialized to defaults,
with a warning that says so. See [SCENARIOS.md](SCENARIOS.md).
