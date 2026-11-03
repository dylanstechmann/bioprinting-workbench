# The cross-reference: storyboard knobs x the audited references, under your scales

The workbench's models were deliberately uncoupled: the storyboard is dimensionless, the
nozzle-shear and Krogh references take physical units, and nothing translated between them.
This view closes that gap the only honest way - as a read-only juxtaposition you enable and
parameterize with your own guessed scales. It performs no physics of its own.

## The contract

- **Identity:** the view re-parameterizes mapped copies of the two audited evaluators and must
  return exactly what they return when called directly with the mapped inputs. This is pinned
  by tests across multiple scale combinations (tauPa, Reynolds, laminar flag, Krogh radius,
  planar limit, band - all equal).
- **Non-mutation:** the persisted nozzle-shear and vascular-supply records are never touched;
  tests deep-compare them before and after.
- **Your scales, your guesses:** perfusion drive x flow scale maps to nozzle flow; filament
  spacing x diameter scale / 2 maps to channel radius; relative population x consumption scale
  maps to oxygen demand; layer count x layer scale maps to construct thickness. All four scales
  are hypothetical inputs bounded to [0.001, 100] mm3/s, [10, 2000] um, [1e-6, 1e-1] mol/(m3 s)
  and [1, 500] um.
- **Errors propagate, never get patched:** if a mapped input falls outside a reference's own
  validator (for example a tiny spacing scale mapping the channel radius below the Krogh
  minimum), the upstream validation error surfaces. The view invents no clamps or fallbacks.
- **Not mapped, on purpose:** the dimensionless slab, oxygen3d and flow-network models take
  owner-supplied measurements, not invented unit scales, so they stay out of this view and the
  panel says so.

## What it shows

With the mapping enabled, the panel juxtaposes: the mapped flow and the wall shear it implies
at your nozzle settings; the mapped channel radius and the Krogh critical radius it implies at
your tissue settings; the mapped consumption and construct thickness; and two teaching
comparisons - mapped thickness versus the mapped planar supply distance, and versus the mapped
single-channel Krogh radius - each stated as an outcome under your scales in this idealization.
When the mapped consumption leaves the Krogh idealization not supply-limited within its 10 mm
cap, the view says so and computes no thickness verdict. No viability, damage or outcome claim
is made at any mapped value.

## Scenario persistence

The mapping persists as analyses.crossReference in scenario schema
bioprinting-workbench/13, disabled by default (the independence is the default state).
Version 12 and older files migrate with the mapping initialized to defaults and a warning
that says so. The storyboard itself is not stored in this record - the view reads the live
scenario parameters.
