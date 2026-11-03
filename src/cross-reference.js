// The cross-reference: what would the storyboard knobs imply under YOUR guessed scales?
// This module performs no physics of its own. It re-parameterizes the audited nozzle-shear and
// Krogh evaluators with mapped copies of their settings and must return exactly what those
// evaluators return when called directly (identity, pinned by tests). The persisted records are
// never mutated (pinned by tests). The dimensionless slab/oxygen3d/flow models are deliberately
// not mapped: they take owner measurements, not invented scales. No viability, damage or
// outcome claim is made anywhere in this view.
import { assertAllowedKeys, finite } from './validation.js';
import { evaluateNozzleShear } from './nozzle-shear.js';
import { evaluateVascularSupply } from './vascular-supply.js';

export const CROSS_REFERENCE_NOTICES = Object.freeze([
  'Every number in this view comes from your own hypothetical mapping scales. The scales are guesses, not measurements, and the mapped outputs inherit every limitation of the two idealized references.',
  'This is a teaching juxtaposition, not a physical coupling: the storyboard, nozzle-shear, vascular-supply, slab, oxygen3d and flow models remain independent, and this view changes no other record in the scenario.',
  'The dimensionless models (slab, oxygen3d, flow network) are deliberately not mapped because they take owner-supplied measurements, not invented unit scales.',
  'No viability, cell-damage, survival or outcome prediction is made at any mapped value; shear and supply distances are model outputs only.',
]);

export function validateCrossReferenceSettings(raw) {
  assertAllowedKeys(raw, ['flowScaleMm3PerS', 'radiusScaleUm', 'consumptionScaleMolPerM3S', 'layerScaleUm'], 'crossReference.settings');
  return {
    flowScaleMm3PerS: finite(raw.flowScaleMm3PerS, 0.001, 100, 'flowScaleMm3PerS'),
    radiusScaleUm: finite(raw.radiusScaleUm, 10, 2000, 'radiusScaleUm'),
    consumptionScaleMolPerM3S: finite(raw.consumptionScaleMolPerM3S, 1e-6, 1e-1, 'consumptionScaleMolPerM3S'),
    layerScaleUm: finite(raw.layerScaleUm, 1, 500, 'layerScaleUm'),
  };
}
export function defaultCrossReference() {
  return { enabled: false, parameterOrigin: 'hypothetical-controls', settings: { flowScaleMm3PerS: 10, radiusScaleUm: 500, consumptionScaleMolPerM3S: 1e-2, layerScaleUm: 100 } };
}
export function validateCrossReferenceRecord(raw) {
  assertAllowedKeys(raw, ['enabled', 'parameterOrigin', 'settings'], 'crossReference');
  if (typeof raw.enabled !== 'boolean') throw new TypeError('enabled must be a boolean');
  if (raw.parameterOrigin !== 'hypothetical-controls') throw new RangeError('Unknown cross-reference parameter origin');
  return { enabled: raw.enabled, parameterOrigin: raw.parameterOrigin, settings: validateCrossReferenceSettings(raw.settings) };
}
export function evaluateCrossReference(record, nozzleShearRecord, vascularSupplyRecord, storyboard) {
  const validated = validateCrossReferenceRecord(record);
  if (!validated.enabled) return { status: 'disabled', notices: [...CROSS_REFERENCE_NOTICES] };
  if (!storyboard || !Number.isFinite(storyboard.perfusion) || !Number.isFinite(storyboard.spacing) || !Number.isFinite(storyboard.population) || !Number.isInteger(storyboard.layers)) throw new TypeError('A validated storyboard is required');
  const mapped = {
    flowMm3PerS: storyboard.perfusion * validated.settings.flowScaleMm3PerS,
    channelRadiusUm: (storyboard.spacing * validated.settings.radiusScaleUm) / 2,
    consumptionMolPerM3S: storyboard.population * validated.settings.consumptionScaleMolPerM3S,
    constructThicknessUm: storyboard.layers * validated.settings.layerScaleUm,
  };
  const shear = evaluateNozzleShear({ ...nozzleShearRecord.settings, flowMm3PerS: mapped.flowMm3PerS });
  const supply = evaluateVascularSupply({ settings: { ...vascularSupplyRecord.settings, channelRadiusUm: mapped.channelRadiusUm, consumptionM_molPerM3S: mapped.consumptionMolPerM3S }, parameterOrigin: vascularSupplyRecord.parameterOrigin });
  const thicknessVsPlanarUm = supply.computed.kroghCriticalRadiusUm === null ? null : mapped.constructThicknessUm - supply.computed.planarLimitUm;
  const thicknessVsKroghUm = supply.computed.kroghCriticalRadiusUm === null ? null : mapped.constructThicknessUm - supply.computed.kroghCriticalRadiusUm;
  const verdicts = [];
  if (thicknessVsPlanarUm !== null) verdicts.push(thicknessVsPlanarUm > 0
    ? `Under your scales, the mapped construct thickness exceeds the mapped planar supply distance by ${thicknessVsPlanarUm.toFixed(0)} um in this idealization.`
    : `Under your scales, the mapped construct thickness stays within the mapped planar supply distance by ${(-thicknessVsPlanarUm).toFixed(0)} um in this idealization.`);
  if (thicknessVsKroghUm !== null) verdicts.push(thicknessVsKroghUm > 0
    ? `Against the mapped single-channel Krogh radius, the mapped thickness exceeds it by ${thicknessVsKroghUm.toFixed(0)} um in this idealization; real networks are hierarchical and are not modeled here.`
    : `Against the mapped single-channel Krogh radius, the mapped thickness stays within it by ${(-thicknessVsKroghUm).toFixed(0)} um in this idealization; real networks are hierarchical and are not modeled here.`);
  if (thicknessVsKroghUm === null) verdicts.push('Under your scales, the mapped consumption leaves the Krogh idealization not supply-limited within its 10 mm cap, so no thickness comparison is computed; this is a model outcome, not a feasibility statement.');
  return {
    status: 'mapped',
    mapped,
    shear: { tauPa: shear.wallShearStressPa, reynolds: shear.reynoldsNumber, laminar: shear.laminarAssumptionHolds, viscosityMode: nozzleShearRecord.settings.viscosityMode },
    supply: { kroghCriticalRadiusUm: supply.computed.kroghCriticalRadiusUm, planarLimitUm: supply.computed.planarLimitUm, bandUm: supply.bandContext.bandUm },
    teaching: { thicknessVsPlanarUm, thicknessVsKroghUm, verdicts },
    notices: [...CROSS_REFERENCE_NOTICES],
  };
}
