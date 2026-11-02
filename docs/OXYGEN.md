# Independent oxygen references: mathematical models, not tissue validation

## Normalized 3D box

The added `src/oxygen3d.js` model is independent of the displayed scaffold, network
flow, cells and recipient. Domain [-1,1]^3, diffusivity 1, concentration 1 on either
all six faces or the x faces only (other faces no-flux). Constant consumption q is
a synthetic dimensionless input in [0,2], not a biological parameter range.

Solve `-laplacian(w)=1` with zero supplied-face values, then `c=1-q*w`.
The cell-centered finite-volume grid uses h=2/n and odd n=9,17,25,33;
neighbor coefficients are 1/h² and supplied-face diagonal contributions 2/h².
A diagonal-preconditioned conjugate-gradient solve reports the true residual,
iteration count, convergence, min/max and supplied boundary influx. Total demand
is 8q. Negative values are flagged, not clipped. The fixed heatmap scale is [0,1].

Worker jobs cache up to three unit-demand bases. Slices do not re-solve. Worker
failure leaves the analytical slab, graph and storyboard usable. Numerical checks
include zero demand, symmetry, boundary flux balance, analytical slab-x and a
manufactured smooth all-face solution. Refinement errors are in VERIFICATION.md.
Convergence means a discrete equation was solved, not tissue oxygen adequacy.

## Analytical 1D slab (unchanged)

This independent teaching model shows how diffusion and uniform consumption can create a
concentration gradient. It does not use the 3D scaffold geometry, channel control, flow,
population slider, biological measurements, or recipient context. No patient- or
animal-specific outcome, viability threshold, or transplant safety is calculated.

For a slab with normalized position `x ∈ [-1,1]`, unit concentration at both faces,
constant diffusivity and uniform zero-order consumption, the steady dimensionless
equation is `c''(x) = q`, `c(-1) = c(1) = 1`. Its closed-form solution is
`c(x) = 1 - q(1-x²)/2`; the center is `1-q/2`. The UI restricts synthetic demand `q`
to `[0,2]` so this simple solution remains nonnegative. This restriction is a mathematical
domain choice, not a physiological range. At q=2 the center reaches zero; it is not
an experimentally determined threshold. The constant-consumption assumption is not
valid at arbitrary concentrations. Real constructs may require concentration-dependent
consumption, heterogeneous cells, transient behavior, finite external transfer and
three-dimensional boundary conditions.

Verification: automated tests check symmetry, fixed boundaries, the zero-consumption
case, the analytic center, finite-difference curvature and integral boundary-flux balance.
Those checks verify this formula's implementation only. No data were fitted, no
independent tissue dataset was compared, and no physical calibration or biological
validation is claimed. The graph samples the equation at 41 points; changing sampling
resolution changes presentation rather than the analytical solution.

For research background on perfusable bioprinted human tissues, see Kolesky et al.
(2016), DOI 10.1073/pnas.1521342113. That publication is not the source of the chosen
dimensionless demand, boundary conditions, graph, or biological claims from this model.