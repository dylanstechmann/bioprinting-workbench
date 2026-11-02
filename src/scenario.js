import { DEFAULTS, validate } from './model.js';
import { validateProcedureState, clampTime, createProcedureState } from './procedure.js';
import { parseCalibrationInput } from './calibration.js';
import { parseOxygen3DMeasurements } from './calibration3d.js';
import { OXYGEN_DEFAULTS, validateOxygen3DSettings } from './oxygen3d.js';
import { validateFlowSettings } from './flow.js';
import { parseBoundedJson, assertAllowedKeys, finite, SCENARIO_BYTES } from './validation.js';
import { defaultLearningState, validateLearningState } from './cell-division.js';
import { defaultCellSystemId } from './repair-research.js';
import { defaultPlanningComparison } from './planning-comparison.js';
import { defaultExpansionTheory } from './acceleration-theory.js';
import { defaultLongevityPerspective } from './longevity-theory.js';
import { defaultApplicationsPerspective } from './applications.js';
import { defaultResearchProgram } from './research-program.js';
import { validateEnvironmentId } from './environment.js';
export const SCENARIO_SCHEMA = 'bioprinting-workbench/7';
const MODEL = 'synthetic-dimensionless-storyboard';
const LIMITATIONS = 'Synthetic dimensionless teaching models; user provenance unverified. No biological validation, viability, clinical, animal-use or transplant-safety inference. Published-method recipe cards are cited research descriptions, not treatment instructions or validated protocols.';
export function defaultAnalyses(parameters = DEFAULTS) {
  return { slab: { demand: 1 }, oxygen3d: { settings: { ...OXYGEN_DEFAULTS }, parameterOrigin: 'synthetic-controls' }, flow: { enabled: parameters.channels, pressureDrive: parameters.perfusion, branchResistances: [1,1,1] } };
}
export function createScenario(state) {
  return normalize({ schema: SCENARIO_SCHEMA, model: MODEL, seed: 42, parameters: state.parameters, time: state.time, procedure: state.procedure, view: state.view, analyses: state.analyses, datasets: state.datasets, learning: state.learning ?? defaultLearningState(), limitations: LIMITATIONS });
}
function normalize(raw) {
  assertAllowedKeys(raw, ['schema','model','seed','parameters','time','procedure','view','analyses','datasets','learning','limitations']);
  if (raw.schema !== SCENARIO_SCHEMA || raw.model !== MODEL || raw.seed !== 42) throw new RangeError('Unsupported scenario model/schema/seed');
  assertAllowedKeys(raw.parameters, Object.keys(DEFAULTS), 'parameters');
  const parameters = { ...validate(raw.parameters) }, time = finite(raw.time, 0, 4.999, 'time'), procedure = validateProcedureState(raw.procedure);
  if (Math.abs(clampTime(procedure, time) - time) > 1e-9) throw new RangeError('Scenario timestamp is inaccessible under its walkthrough gates');
  assertAllowedKeys(raw.view, ['camera','reveal','environment'], 'view');
  if (!['lab','construct','top'].includes(raw.view.camera) || typeof raw.view.reveal !== 'boolean') throw new RangeError('Invalid scenario view');
  validateEnvironmentId(raw.view.environment);
  assertAllowedKeys(raw.analyses, ['slab','oxygen3d','flow'], 'analyses');
  assertAllowedKeys(raw.analyses.slab, ['demand'], 'slab');
  assertAllowedKeys(raw.analyses.oxygen3d, ['settings','parameterOrigin'], 'oxygen3d');
  const oxygen3d = { settings: validateOxygen3DSettings(raw.analyses.oxygen3d.settings), parameterOrigin: raw.analyses.oxygen3d.parameterOrigin };
  if (!['synthetic-controls','explicit-fit-application'].includes(oxygen3d.parameterOrigin)) throw new RangeError('Invalid parameter origin');
  const flow = validateFlowSettings(raw.analyses.flow);
  if (flow.enabled !== parameters.channels || flow.pressureDrive !== parameters.perfusion) throw new RangeError('Flow controls conflict with storyboard controls');
  assertAllowedKeys(raw.datasets, ['slab','oxygen3d'], 'datasets');
  const datasets = { slab: raw.datasets.slab === null ? null : parseCalibrationInput(JSON.stringify(raw.datasets.slab)), oxygen3d: raw.datasets.oxygen3d === null ? null : parseOxygen3DMeasurements(JSON.stringify(raw.datasets.oxygen3d)) };
  if (datasets.oxygen3d && datasets.oxygen3d.domain.boundaryMode !== oxygen3d.settings.boundaryMode) throw new RangeError('Dataset and oxygen boundary modes conflict');
  if (oxygen3d.parameterOrigin === 'explicit-fit-application' && !datasets.oxygen3d) throw new RangeError('Applied-fit provenance requires its input dataset');
  return { schema: SCENARIO_SCHEMA, model: MODEL, seed: 42, parameters, time, procedure, view: { ...raw.view }, analyses: { slab: { demand: finite(raw.analyses.slab.demand,0,2,'slab.demand') }, oxygen3d, flow }, datasets, learning: validateLearningState(raw.learning), limitations: LIMITATIONS };
}
export function migrateScenarioV3(raw) {
  assertAllowedKeys(raw, ['schema','model','seed','parameters','time','procedure','view','analyses','datasets','learning','limitations']);
  if (raw.schema !== 'bioprinting-workbench/3') throw new RangeError('Expected version 3');
  assertAllowedKeys(raw.learning, ['selectedCellType','division','researchHorizonYears'], 'learning');
  assertAllowedKeys(raw.view, ['camera','reveal'], 'view');
  const scenario = normalize({ ...raw, schema: SCENARIO_SCHEMA, learning: { selectedCellType: raw.learning.selectedCellType, selectedCellSystemId: defaultCellSystemId(raw.learning.selectedCellType), selectedMethodId: null, division: raw.learning.division, researchHorizonYears: raw.learning.researchHorizonYears, planningComparison: defaultPlanningComparison(), expansionTheory: defaultExpansionTheory(), longevityPerspective: defaultLongevityPerspective(), applicationsPerspective: defaultApplicationsPerspective(), researchProgram: defaultResearchProgram() }, view: { ...raw.view, environment: 'lab' } });
  return { scenario, warnings: ['Version 3 inputs restored; species-separated cell-system, method, hypothetical-comparison, longevity-perspective, applications and research-program inputs initialized to defaults; environment set to laboratory. Derived results are recomputed, not restored.'], migratedFrom: raw.schema };
}
export function migrateScenarioV4(raw) {
  assertAllowedKeys(raw, ['schema','model','seed','parameters','time','procedure','view','analyses','datasets','learning','limitations']);
  if (raw.schema !== 'bioprinting-workbench/4') throw new RangeError('Expected version 4');
  assertAllowedKeys(raw.learning, ['selectedCellType','selectedCellSystemId','selectedMethodId','division','researchHorizonYears','planningComparison','expansionTheory'], 'learning');
  const scenario = normalize({ ...raw, schema: SCENARIO_SCHEMA, learning: { ...raw.learning, longevityPerspective: defaultLongevityPerspective(), applicationsPerspective: defaultApplicationsPerspective(), researchProgram: defaultResearchProgram() } });
  return { scenario, warnings: ['Version 4 inputs restored; hypothetical longevity-perspective, applications and research-program inputs initialized to defaults. Derived results are recomputed, not restored.'], migratedFrom: raw.schema };
}
export function migrateScenarioV5(raw) {
  assertAllowedKeys(raw, ['schema','model','seed','parameters','time','procedure','view','analyses','datasets','learning','limitations']);
  if (raw.schema !== 'bioprinting-workbench/5') throw new RangeError('Expected version 5');
  assertAllowedKeys(raw.learning, ['selectedCellType','selectedCellSystemId','selectedMethodId','division','researchHorizonYears','planningComparison','expansionTheory','longevityPerspective'], 'learning');
  const scenario = normalize({ ...raw, schema: SCENARIO_SCHEMA, learning: { ...raw.learning, applicationsPerspective: defaultApplicationsPerspective(), researchProgram: defaultResearchProgram() } });
  return { scenario, warnings: ['Version 5 inputs restored; hypothetical applications-comparison and research-program inputs initialized to defaults. Derived results are recomputed, not restored.'], migratedFrom: raw.schema };
}
export function migrateScenarioV6(raw) {
  assertAllowedKeys(raw, ['schema','model','seed','parameters','time','procedure','view','analyses','datasets','learning','limitations']);
  if (raw.schema !== 'bioprinting-workbench/6') throw new RangeError('Expected version 6');
  assertAllowedKeys(raw.learning, ['selectedCellType','selectedCellSystemId','selectedMethodId','division','researchHorizonYears','planningComparison','expansionTheory','longevityPerspective','applicationsPerspective'], 'learning');
  const scenario = normalize({ ...raw, schema: SCENARIO_SCHEMA, learning: { ...raw.learning, researchProgram: defaultResearchProgram() } });
  return { scenario, warnings: ['Version 6 inputs restored; research-program selection initialized to defaults. Derived results are recomputed, not restored.'], migratedFrom: raw.schema };
}
export function migrateScenarioV2(raw) {
  assertAllowedKeys(raw, ['schema','model','seed','parameters','time','procedure','view','analyses','datasets','limitations']);
  if (raw.schema !== 'bioprinting-workbench/2') throw new RangeError('Expected version 2');
  const base = defaultLearningState();
  const upgraded = migrateScenarioV3({ ...raw, schema: 'bioprinting-workbench/3', learning: { selectedCellType: base.selectedCellType, division: base.division, researchHorizonYears: base.researchHorizonYears } });
  return { scenario: upgraded.scenario, warnings: ['Version 2 inputs restored; learning inputs initialized to defaults.', ...upgraded.warnings], migratedFrom: raw.schema };
}
export function migrateScenarioV1(raw) {
  assertAllowedKeys(raw, ['schema','model','seed','parameters','time','state','limitations','oxygenTeachingModel','procedure','calibration']);
  if (raw.schema !== 'bioprinting-workbench/1' || raw.model !== MODEL || raw.seed !== 42) throw new RangeError('Unsupported legacy model/seed');
  assertAllowedKeys(raw.parameters, Object.keys(DEFAULTS), 'parameters');
  const parameters = { ...validate(raw.parameters) }; finite(raw.time, 0, 4.999, 'legacy.time');
  const analyses = defaultAnalyses(parameters);
  if (raw.oxygenTeachingModel?.demand !== undefined) analyses.slab.demand = finite(raw.oxygenTeachingModel.demand,0,2,'legacy.demand');
  return { scenario: createScenario({ parameters, time: 0, procedure: createProcedureState(), view: { camera:'lab',reveal:false,environment:'lab' }, analyses, datasets: { slab:null,oxygen3d:null } }), warnings: [`Legacy time ${raw.time} reset to 0 with gated walkthrough. Completed check IDs and raw datasets were not exported; summaries cannot restore them.`], migratedFrom: 'bioprinting-workbench/1' };
}
export function parseScenario(value) {
  const raw = parseBoundedJson(value, SCENARIO_BYTES);
  if (raw.schema === 'bioprinting-workbench/1') return migrateScenarioV1(raw);
  if (raw.schema === 'bioprinting-workbench/2') return migrateScenarioV2(raw);
  if (raw.schema === 'bioprinting-workbench/3') return migrateScenarioV3(raw);
  if (raw.schema === 'bioprinting-workbench/4') return migrateScenarioV4(raw);
  if (raw.schema === 'bioprinting-workbench/5') return migrateScenarioV5(raw);
  if (raw.schema === 'bioprinting-workbench/6') return migrateScenarioV6(raw);
  return { scenario: normalize(raw), warnings: [], migratedFrom: null };
}
export function serializeScenario(state) { return JSON.stringify(createScenario(state), null, 2); }