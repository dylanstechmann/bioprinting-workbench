# Dimensionless resistance-network teaching model

Personal learning project, AI-assisted and agent-tested; not independently scientifically reviewed.

`src/flow.js` computes signed flow `Q=(p_from-p_to)/R`. At interior nodes,
the algebraic sum of outgoing flows is zero. Fixed boundary pressures reduce the
weighted graph Laplacian to an SPD system, solved with diagonal-preconditioned
conjugate gradients. Every connected component must contain a fixed-pressure node.
Invalid topology throws; failed numerical residual checks return numerical-failure.
Boundary outward flow means flow leaving the graph, so inlet values are negative.

The UI uses four nodes and five edges: fixed inlet → inlet manifold, three parallel
branches → outlet manifold, and an outlet edge → fixed outlet. Inlet/outlet edge
resistances are 1. Branch resistances are adjustable. The existing illustrative-flow
slider supplies a normalized pressure drive in [0,1], not a pump operating setting.
Channels off produces a disabled result. Zero drive produces zero flow.

All quantities are dimensionless. This is not CFD, a physical pump calibration,
a velocity field, endothelial function, or living vascular function. The displayed
curves illustrate branch-relative flow only; their geometry does not determine R.
Oxygen, scaffold geometry, population and recipient labels are not coupled to flow.

Software tests compare analytical series/parallel circuits, reversed flow, zero
drive, anchored boundaries, topology rejection, and node/global conservation.
These checks do not constitute biological validation.