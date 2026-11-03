import { DEFAULTS, STAGES, sample, snapshot } from './model.js';
import { createLab } from './scene.js';
import { oxygenProfile } from './oxygen.js';
import { PROCEDURE_STEPS, createProcedureState, toggleCheck, stepProgress, isStageUnlocked, unlockedStages, clampTime, setMode, procedureSummary, nextGate } from './procedure.js';
import { NO_CALIBRATION, parseCalibrationInput, fitSlabDemand, calibrationExample } from './calibration.js';
import { createAnalysisUI } from './analysis-ui.js';
import { createNozzleShearUI } from './nozzle-shear-ui.js';
import { createVascularSupplyUI } from './vascular-supply-ui.js';
import { serializeScenario, parseScenario, defaultAnalyses } from './scenario.js';
import { SCENARIO_BYTES, MEASUREMENT_BYTES } from './validation.js';
import { createCellLearningUI } from './cell-learning-ui.js';
import { getEnvironmentSpecs } from './environment.js';

const $ = id => document.getElementById(id);
let parameters = { ...DEFAULTS }, time = 0, playing = false, last = 0, lab = null;
let exportUrl;
let procedureState = createProcedureState();
let calibration = { ...NO_CALIBRATION };
let cameraView = 'lab', environmentTheme = 'lab', analysisUI = null;
let importGeneration = 0, calibrationGeneration = 0;
const learningUI = createCellLearningUI({ elements: $ });
function drawOxygen() {
  const result = oxygenProfile(Number($('demand').value));
  $('demand-value').textContent = result.demand.toFixed(2);
  $('oxygen-center').textContent = result.center.toFixed(2);
  $('oxygen-line').setAttribute('points', result.profile.map(p => `${20 + 360 * (p.x + 1) / 2},${110 - 90 * p.concentration}`).join(' '));
  $('oxygen-graph').setAttribute('aria-label', `Illustrative oxygen profile. Dimensionless center concentration ${result.center.toFixed(2)}, boundary concentration 1.`);
}
$('demand').addEventListener('input', drawOxygen);
drawOxygen();
const stageButtons = STAGES.map((stage, index) => {
  const b = document.createElement('button'); b.innerHTML = `<span class="stage-number">0${index + 1}</span>${stage.short}`;
  b.setAttribute('aria-label', stage.title); b.addEventListener('click', () => { if (!isStageUnlocked(procedureState, index)) return; time = clampTime(procedureState, index + .001); pause(); render(); });
  $('stages').append(b); return b;
});
function pause() { playing = false; $('play').textContent = 'Play sequence'; }
try { lab = createLab($('scene')); }
catch (error) { $('webgl-error').hidden = false; $('webgl-error').textContent = `3D rendering is unavailable (${error.message}). You can still explore every stage, adjust the synthetic model and export a scenario. Try a WebGL2-capable browser with hardware acceleration.`; }
for (const key of ['spacing', 'layers', 'population', 'perfusion', 'channels', 'recipient']) {
  $(key).addEventListener('input', () => {
    parameters[key] = key === 'channels' ? $(key).checked : key === 'recipient' ? $(key).value : Number($(key).value);
    render();
  });
}
$('timeline').addEventListener('input', () => { time = clampTime(procedureState, Number($('timeline').value)); pause(); render(); });
$('play').addEventListener('click', () => { if (time >= 4.999) time = 0; playing = !playing; $('play').textContent = playing ? 'Pause sequence' : 'Play sequence'; });
$('reset').addEventListener('click', () => { time = 0; pause(); render(); });
$('cutaway').addEventListener('change', render);
document.querySelectorAll('[data-camera]').forEach(b => b.addEventListener('click', () => { cameraView = b.dataset.camera; lab?.view(cameraView); $('view-label').textContent = `${b.textContent.toUpperCase()} VIEW`; }));
const environmentAttribution = id => getEnvironmentSpecs().find(s => s.id === id)?.attribution || '';
$('environment').addEventListener('change', event => { environmentTheme = event.target.value; lab?.setEnvironment(environmentTheme); $('environment-attribution').textContent = environmentAttribution(environmentTheme); });
$('environment-attribution').textContent = environmentAttribution('lab');
function scenarioState() {
  const analysis = analysisUI?.getState();
  return { parameters, time, procedure: procedureState, view: { camera: cameraView, reveal: $('cutaway').checked, environment: environmentTheme }, analyses: { ...(analysis ? { oxygen3d: analysis.oxygen3d, flow: { ...analysis.flow, enabled: parameters.channels, pressureDrive: parameters.perfusion } } : defaultAnalyses(parameters)), nozzleShear: nozzleUI.getState(), vascularSupply: vascularUI.getState(), slab: { demand: Number($('demand').value) } }, datasets: { slab: calibration.status === 'loaded' ? calibration.input : null, oxygen3d: analysis?.dataset || null }, learning: learningUI.getState() };
}
$('export').addEventListener('click', () => {
  if (exportUrl) URL.revokeObjectURL(exportUrl);
  exportUrl = URL.createObjectURL(new Blob([serializeScenario(scenarioState())], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = exportUrl; a.download = 'bioprinting-scenario.json'; a.click();
});
// ---- Procedure walkthrough, gated progression and local calibration import ----
const gateChips = STAGES.map((stage, index) => { const chip = document.createElement('span'); chip.className = 'gate-chip'; chip.title = stage.title; $('gate-strip').append(chip); return chip; });
const gateMessage = document.createElement('span'); gateMessage.className = 'gate-message'; $('gate-strip').append(gateMessage);
const gateControls = document.createElement('span'); gateControls.className = 'gate-controls';
gateControls.innerHTML = '<label class="gate-toggle"><input id="free-exploration" type="checkbox"> Free exploration</label>';
const restartButton = document.createElement('button'); restartButton.id = 'restart-walkthrough'; restartButton.type = 'button'; restartButton.textContent = 'Restart walkthrough';
gateControls.append(restartButton); $('gate-strip').append(gateControls);
restartButton.addEventListener('click', () => { procedureState = setMode(createProcedureState(), procedureState.mode); time = 0; pause(); render(); });
$('free-exploration').addEventListener('change', event => { procedureState = setMode(procedureState, event.target.checked ? 'free' : 'gated'); time = clampTime(procedureState, time); render(); });
const stepCards = PROCEDURE_STEPS.map(step => {
  const li = document.createElement('li'); li.className = 'procedure-step';
  const head = document.createElement('div'); head.className = 'step-head';
  const badge = document.createElement('span'); badge.className = 'step-stage'; badge.textContent = `Stage ${step.stage + 1}`;
  const title = document.createElement('strong'); title.textContent = step.title;
  const view = document.createElement('button'); view.type = 'button'; view.className = 'step-view'; view.textContent = 'View in simulator';
  view.addEventListener('click', () => { if (!isStageUnlocked(procedureState, step.stage)) return; time = clampTime(procedureState, step.stage + .001); pause(); render(); document.getElementById('viewport').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  head.append(badge, title, view); li.append(head);
  const purpose = document.createElement('p'); purpose.className = 'step-purpose'; purpose.textContent = step.purpose; li.append(purpose);
  const basis = document.createElement('p'); basis.className = 'step-basis';
  step.publishedBasis.forEach((b, i) => { if (i) basis.append(' · '); const a = document.createElement('a'); a.href = b.url; a.target = '_blank'; a.rel = 'noreferrer'; a.textContent = b.label; basis.append(a); });
  const note = document.createElement('span'); note.className = 'step-note'; note.textContent = ` ${step.publishedBasis.map(b => b.note).join(' ')}`; basis.append(note); li.append(basis);
  const checks = document.createElement('div'); checks.className = 'step-checks';
  const inputs = step.virtualChecks.map(check => {
    const label = document.createElement('label'); label.className = 'step-check';
    const input = document.createElement('input'); input.type = 'checkbox'; input.dataset.checkId = check.id;
    input.addEventListener('change', () => { procedureState = toggleCheck(procedureState, check.id); render(); });
    label.append(input, ` ${check.label}`); checks.append(label); return input;
  });
  li.append(checks);
  const unknowns = document.createElement('p'); unknowns.className = 'step-unknowns'; unknowns.textContent = `Not established here: ${step.unknowns.join(' ')}`; li.append(unknowns);
  $('procedure-steps').append(li); return { li, inputs, view, step };
});
let lastProcedureKey = '';
function updateWalkthrough() {
  const key = JSON.stringify([procedureState.mode, procedureState.completedChecks]);
  if (key === lastProcedureKey) return; lastProcedureKey = key;
  const unlocked = unlockedStages(procedureState);
  stepCards.forEach(({ li, inputs, view, step }) => {
    inputs.forEach(input => { input.checked = procedureState.completedChecks.includes(input.dataset.checkId); });
    const progress = stepProgress(procedureState, step);
    li.classList.toggle('step-complete', progress === 1);
    view.disabled = !unlocked[step.stage];
    li.classList.toggle('step-locked', !unlocked[step.stage]);
  });
  const summary = procedureSummary(procedureState);
  $('procedure-progress').textContent = `${summary.checksComplete}/${summary.checks} checkpoints · ${summary.stepsComplete}/${summary.steps} steps`;
  gateChips.forEach((chip, i) => { const open = unlocked[i]; chip.className = `gate-chip ${open ? 'unlocked' : 'locked'}`; chip.textContent = `${open ? '✓' : '🔒'} ${STAGES[i].short}`; });
  const gate = nextGate(procedureState);
  gateMessage.textContent = procedureState.mode === 'free' ? 'Free exploration: all stages unlocked.' : gate ? `Complete ${gate.remainingChecks.length} checkpoint${gate.remainingChecks.length === 1 ? '' : 's'} in "${STAGES[gate.stage - 1].short}" to unlock "${STAGES[gate.stage].short}".` : 'All stages unlocked.';
  $('free-exploration').checked = procedureState.mode === 'free';
}
function showCalibration(errorMessage) {
  const box = $('calibration-result');
  box.replaceChildren();
  if (errorMessage) { box.className = 'calibration-result error'; box.textContent = errorMessage; return; }
  if (calibration.status === 'no-dataset') { box.className = 'calibration-result'; box.textContent = NO_CALIBRATION.message; return; }
  box.className = 'calibration-result loaded';
  const fit = calibration.fit;
  const line = (label, value) => { const row = document.createElement('p'); const strong = document.createElement('strong'); strong.textContent = value; const span = document.createElement('span'); span.textContent = label; row.append(strong, span); box.append(row); };
  line('dimensionless demand estimate q (assumption-bound)', fit.q.toFixed(3));
  line('measurement pairs (n)', String(fit.n));
  line('data provenance (unverified declaration)', fit.dataKind);
  line('residual std of per-pair estimates', fit.residualStd.toFixed(3));
  if (!fit.inDomain) { const warn = document.createElement('p'); warn.className = 'calibration-warning'; warn.textContent = 'Estimate falls outside the model domain [0, 2]; the slab assumptions do not hold for these values.'; box.append(warn); }
  const notice = document.createElement('p'); notice.className = 'micro'; notice.textContent = `${fit.assumptionNotice} Source: ${fit.sourceCitation}`; box.append(notice);
}
$('calibration-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  const current = ++calibrationGeneration;
  try { if (file.size > MEASUREMENT_BYTES) throw new RangeError('Measurement file exceeds 256 KiB'); const input = parseCalibrationInput(await file.text()); if (current !== calibrationGeneration) return; calibration = { status: 'loaded', input, fit: fitSlabDemand(input) }; showCalibration(); }
  catch (error) { if (current === calibrationGeneration) showCalibration(error.message); }
  event.target.value = ''; render();
});
$('load-example').addEventListener('click', () => { calibrationGeneration++; const input = parseCalibrationInput(calibrationExample()); calibration = { status: 'loaded', input, fit: fitSlabDemand(input) }; showCalibration(); });
$('clear-calibration').addEventListener('click', () => { calibrationGeneration++; calibration = { ...NO_CALIBRATION }; showCalibration(); });
showCalibration();
analysisUI = createAnalysisUI({ elements: $, onFlow: result => lab?.setFlowResult(result) });
const nozzleUI = createNozzleShearUI({ elements: $, onStateChange: () => {} });
const vascularUI = createVascularSupplyUI({ elements: $, onStateChange: () => {} });
analysisUI.setState({ ...defaultAnalyses(parameters), dataset: null });
function prepareScenarioApplication(raw) {
  const scenario = parseScenario(JSON.stringify(raw)).scenario;
  const nextCalibration = scenario.datasets.slab ? { status: 'loaded', input: scenario.datasets.slab, fit: fitSlabDemand(scenario.datasets.slab) } : { ...NO_CALIBRATION };
  return { scenario, nextCalibration };
}
function commitScenarioApplication({ scenario, nextCalibration }) {
  calibrationGeneration++; pause(); parameters = { ...scenario.parameters }; time = scenario.time; procedureState = scenario.procedure; calibration = nextCalibration;
  for (const key of Object.keys(parameters)) { if (key === 'channels') $(key).checked = parameters[key]; else $(key).value = parameters[key]; }
  $('demand').value = scenario.analyses.slab.demand; drawOxygen();
  $('cutaway').checked = scenario.view.reveal; cameraView = scenario.view.camera; lab?.view(cameraView); $('view-label').textContent = `${cameraView.toUpperCase()} VIEW`;
  environmentTheme = scenario.view.environment; $('environment').value = environmentTheme; lab?.setEnvironment(environmentTheme); $('environment-attribution').textContent = environmentAttribution(environmentTheme);
  learningUI.setState(scenario.learning);
  analysisUI.setState({ ...scenario.analyses, dataset: scenario.datasets.oxygen3d }); nozzleUI.setState(scenario.analyses.nozzleShear); vascularUI.setState(scenario.analyses.vascularSupply); showCalibration(); render();
}
function applyScenario(scenario) {
  const prepared = prepareScenarioApplication(scenario);
  const previous = prepareScenarioApplication(JSON.parse(serializeScenario(scenarioState())));
  try { commitScenarioApplication(prepared); }
  catch (error) { commitScenarioApplication(previous); throw error; }
}
async function importScenarioFile(file) {
  const current = ++importGeneration;
  try {
    if (file.size > SCENARIO_BYTES) throw new RangeError('Scenario exceeds 1 MiB');
    const imported = parseScenario(await file.text());
    if (current !== importGeneration) return;
    // Validate derived slab arithmetic before committing any UI state.
    if (imported.scenario.datasets.slab) fitSlabDemand(imported.scenario.datasets.slab);
    applyScenario(imported.scenario);
    $('scenario-status').textContent = imported.warnings.join(' ') || 'Version 4 inputs, learning selections and self-reported walkthrough progress restored. Derived analyses recomputed; provenance remains unverified.';
  } catch (error) { if (current === importGeneration) $('scenario-status').textContent = `Not imported; previous state retained. ${error.message}`; }
}
$('scenario-file').addEventListener('change', event => { const file = event.target.files[0]; if (file) importScenarioFile(file); event.target.value = ''; });
function render(clock = 0) {
  // Event objects are not animation times.
  if (typeof clock !== 'number') clock = 0;
  const s = sample(time, parameters), stage = STAGES[s.stage];
  analysisUI?.setFlowControls(parameters.channels, parameters.perfusion);
  for (const key of ['spacing', 'layers', 'population', 'perfusion']) $('' + key + '-value').textContent = key === 'layers' ? parameters[key] : parameters[key].toFixed(2);
  const unlocked = unlockedStages(procedureState);
  let highestUnlocked = 0; for (let i = 0; i < 5 && unlocked[i]; i++) highestUnlocked = i;
  stageButtons.forEach((b, i) => { b.setAttribute('aria-pressed', String(i === s.stage)); b.disabled = !unlocked[i]; b.setAttribute('aria-disabled', String(!unlocked[i])); b.classList.toggle('locked', !unlocked[i]); });
  $('timeline').max = String(highestUnlocked + .999);
  updateWalkthrough();
  $('scene-title').textContent = stage.title; $('stage-title').textContent = stage.title; $('description').textContent = stage.description; $('equipment').textContent = stage.equipment;
  $('timeline').value = time; $('phase').textContent = `0${s.stage + 1} / 05`;
  $('occupancy').textContent = `${Math.round(s.occupancy * 100)}%`;
  $('warning').textContent = s.stage === 4 ? `${parameters.recipient === 'human' ? 'Human' : 'Animal'} context only. Integration is not simulated or established.` : s.stage === 3 ? parameters.channels ? 'Designed channels ≠ functional blood vessels.' : 'Channels disabled: no illustrative perfusion.' : 'Synthetic progression · no biological timescale.';
  $('filaments').textContent = lab ? lab.update(s, parameters, $('cutaway').checked, clock) : '—';
}
document.addEventListener('visibilitychange', () => { last = 0; });
function frame(now) {
  const dt = last ? Math.min((now - last) / 1000, .1) : 0; last = now;
  if (playing && !document.hidden) { const next = clampTime(procedureState, time + dt / 9); if (next <= time + 1e-9) pause(); time = next; }
  render(now / 1000); lab?.draw(); requestAnimationFrame(frame);
}
globalThis.bioprintingWorkbench = { exportScenario: () => JSON.parse(serializeScenario(scenarioState())), diagnostics: () => ({ ...snapshot(time, parameters), playing, procedure: procedureSummary(procedureState), calibration: calibration.status === 'loaded' ? { status: 'loaded', q: calibration.fit.q, n: calibration.fit.n } : { status: calibration.status }, analyses: analysisUI?.diagnostics(), learning: learningUI.diagnostics(), graphics: lab?.diagnostics() ?? { webgl: false, environment: environmentTheme } }) };
render(); requestAnimationFrame(frame);