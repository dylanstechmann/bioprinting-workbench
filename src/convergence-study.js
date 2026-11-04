import { solveOxygen3D, validateOxygen3DSettings } from './oxygen3d.js';
import { assertAllowedKeys } from './validation.js';

export function validateConvergenceStudySpec(raw) {
  assertAllowedKeys(raw, ['modelId', 'settings', 'resolutions'], 'convergence');
  if (raw.modelId !== 'box-oxygen') throw new RangeError('Convergence supports box-oxygen only');
  const settings = validateOxygen3DSettings(raw.settings);
  if (!Array.isArray(raw.resolutions) || raw.resolutions.length < 2 || raw.resolutions.length > 4 ||
      new Set(raw.resolutions).size !== raw.resolutions.length ||
      raw.resolutions.some(n => ![9, 17, 25, 33].includes(n))) throw new RangeError('Select 2–4 distinct supported resolutions');
  return { modelId: raw.modelId, settings, resolutions: [...raw.resolutions].sort((a, b) => a - b) };
}

export function compareRefinements(samples, reference) {
  return samples.slice(1).map((fine, index) => {
    const coarse = samples[index];
    let observedOrder = null;
    if (reference === 'analytic-slab-x' && coarse.converged && fine.converged && coarse.errorInfinity > 0 && fine.errorInfinity > 0) {
      const order = Math.log(coarse.errorInfinity / fine.errorInfinity) / Math.log(coarse.h / fine.h);
      if (Number.isFinite(order)) observedOrder = order;
    }
    return { coarse: coarse.resolution, fine: fine.resolution, centerDelta: Math.abs(fine.center - coarse.center), observedOrder };
  });
}

/** Compose the existing cell-centred solver. Grid differences are not exact errors.
 * Worker termination is required to interrupt a synchronous native solve. */
export async function runConvergenceStudy(raw, { solve = solveOxygen3D, signal, onProgress = () => {} } = {}) {
  const spec = validateConvergenceStudySpec(raw);
  const reference = spec.settings.boundaryMode === 'slab-x' ? 'analytic-slab-x' : 'grid-comparison';
  const samples = [];
  const checkCancelled = () => { if (signal?.aborted) throw new DOMException('Study cancelled', 'AbortError'); };
  for (const resolution of spec.resolutions) {
    checkCancelled();
    const result = await solve({ ...spec.settings, resolution });
    checkCancelled();
    const h = 2 / resolution;
    let errorInfinity = null;
    if (reference === 'analytic-slab-x') {
      errorInfinity = 0;
      for (let index = 0; index < result.values.length; index++) {
        const x = -1 + (index % resolution + 0.5) * h;
        const exact = 1 - spec.settings.demand * (1 - x * x) / 2;
        errorInfinity = Math.max(errorInfinity, Math.abs(result.values[index] - exact));
      }
    }
    samples.push({ resolution, h, center: result.center, min: result.min, max: result.max,
      residualInfinity: result.residualInfinity, balanceError: result.balanceError,
      converged: result.converged, inDomain: result.inDomain, errorInfinity });
    onProgress({ completed: samples.length, total: spec.resolutions.length });
  }
  return { spec, samples, comparisons: compareRefinements(samples, reference), reference,
    status: samples.every(s => s.converged) ? 'succeeded' : 'numerical-failure',
    notices: ['Dimensionless numerical study, not biological validation.',
      reference === 'grid-comparison' ? 'All-faces comparisons report grid differences, not exact errors or observed order.' : 'Analytic slab profile evaluated at cell centres.'] };
}

/** Immutable, inspectable export of one completed study. Analytic fields stay null where no
 * analytic reference exists; nothing is interpolated or back-filled. */
export function serializeStudyArtifact(result, { createdAt }) {
  if (!result || typeof result !== 'object' || !result.spec || !Array.isArray(result.samples) || !Array.isArray(result.comparisons)) {
    throw new TypeError('serializeStudyArtifact needs a completed study result');
  }
  if (typeof createdAt !== 'string' || !Number.isFinite(Date.parse(createdAt))) throw new TypeError('Study artifact createdAt must be an ISO instant');
  return {
    schema: 'bioprinting-workbench/convergence-study-artifact/1',
    createdAt,
    modelId: result.spec.modelId,
    boundary: result.spec.settings.boundaryMode,
    reference: result.reference,
    settings: structuredClone(result.spec.settings),
    resolutions: [...result.spec.resolutions],
    samples: result.samples.map(sample => ({
      resolution: sample.resolution, center: sample.center, residualInfinity: sample.residualInfinity,
      balanceError: sample.balanceError, errorInfinity: sample.errorInfinity ?? null, converged: sample.converged,
    })),
    comparisons: result.comparisons.map(comparison => ({
      coarse: comparison.coarse, fine: comparison.fine, centerDelta: comparison.centerDelta,
      observedOrder: comparison.observedOrder ?? null,
    })),
    notices: [...result.notices],
    status: result.status,
  };
}