# Idealized oxygen slab: mathematical reference, not calibration

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