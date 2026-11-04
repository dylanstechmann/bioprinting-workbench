import { fitSlabDemand } from './calibration.js';
import { createDatasetRecord, buildFitRun } from './measurement-provenance.js';

/** Capture imported bytes before parsing; this operation never changes model controls. */
export async function captureSlabMeasurement({ rawBytes, id, demand, importedAt, implementationSha256 = null }) {
  const dataset = await createDatasetRecord({ id: `dataset-${id}`, rawBytes, modelId: 'slab-oxygen', importedAt });
  const fit = fitSlabDemand(dataset.normalizedInput);
  const fitRun = await buildFitRun({ id: `fit-${id}`, dataset, settingsSnapshot: { demand },
    implementationSha256, startedAt: importedAt, finishedAt: new Date().toISOString() }, fit);
  return { status: 'loaded', input: dataset.normalizedInput, fit, provenance: { dataset, fitRun } };
}