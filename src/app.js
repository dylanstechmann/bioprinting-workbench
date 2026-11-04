import { DEFAULTS, STAGES, sample, snapshot } from './model.js';
import { createLab } from './scene.js';
import { PROCEDURE_STEPS, createProcedureState, toggleCheck, stepProgress, isStageUnlocked, unlockedStages, clampTime, setMode, procedureSummary, nextGate } from './procedure.js';
import { NO_CALIBRATION, fitSlabDemand, calibrationExample } from './calibration.js';
import { createAnalysisUI } from './analysis-ui.js';
import { createScientificViewUI } from './scientific-view-ui.js';
import { createModelExplorationUI } from './model-exploration-ui.js';
import { createExplorationClient } from './exploration-client.js';
import { createResearchCockpitUI } from './research-cockpit-ui.js';
import { oxygenProfile } from './oxygen.js';
import { createTeachingNetwork } from './flow.js';
import { createNozzleShearUI } from './nozzle-shear-ui.js';
import { createVascularSupplyUI } from './vascular-supply-ui.js';
import { renderCrossSections } from './vascular-cross-sections.js';
import { createCrossReferenceUI } from './cross-reference-ui.js';
import { serializeScenario, parseScenario, defaultAnalyses } from './scenario.js';
import { SCENARIO_BYTES, MEASUREMENT_BYTES } from './validation.js';
import { createCellLearningUI } from './cell-learning-ui.js';
import { getEnvironmentSpecs } from './environment.js';
import { createWorkspaceShell } from './workspace-shell.js';
import { shouldAdvanceFrame, shouldDrawFrame } from './frame-policy.js';
import { applyScenarioTransaction } from './scenario-application.js';
import { createConvergenceStudyUI } from './convergence-study-ui.js';
import { captureSlabMeasurement } from './slab-measurement.js';
import { sweepBaseInputs } from './sweep-presets.js';
import { createRunRegistry } from './run-records.js';
import { serializeStudyArtifact } from './convergence-study.js';
import { createHypothesisWorkspace } from './hypothesis-workspace.js';
import { createResearchDraftUI } from './research-draft-ui.js';

const $ = id => document.getElementById(id);
let parameters = { ...DEFAULTS }, time = 0, playing = false, last = 0, lab = null;
let exportUrl;
let procedureState = createProcedureState();
let calibration = { ...NO_CALIBRATION };
let cameraView = 'lab', environmentTheme = 'lab', analysisUI = null;
let importGeneration = 0, calibrationGeneration = 0;
let crossRefUI = null, activeWorkspaceArea = 'studio', workspaceShell = null;
let presentationUI = null, refreshScientificOverlays = () => {};
const learningUI = createCellLearningUI({ elements: $ });
// Bounded in-memory capture of native fit/model/sweep/study work for inspectable history and
// explicit exchange export. Nothing here is auto-applied, uploaded or validated scientifically.
const runRegistry = createRunRegistry();
let sweepRunCounter = 0, studyRunCounter = 0;
function captureRun(partial) {
  const { record, evicted } = runRegistry.add(partial);
  if (evicted) console.info(`Run registry is bounded; ${evicted.id} aged out of the retained history.`);
  return record;
}
function drawOxygen() {
  const result = oxygenProfile(Number($('demand').value));
  $('demand-value').textContent = result.demand.toFixed(2);
  $('oxygen-center').textContent = result.center.toFixed(2);
  $('oxygen-line').setAttribute('points', result.profile.map(p => `${20 + 360 * (p.x + 1) / 2},${110 - 90 * p.concentration}`).join(' '));
  $('oxygen-graph').setAttribute('aria-label', `Illustrative oxygen profile. Dimensionless center concentration ${result.center.toFixed(2)}, boundary concentration 1.`);
  refreshScientificOverlays();
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
const qualitySelect = $('render-quality');
qualitySelect.disabled = !lab;
qualitySelect.addEventListener('change', () => {
  lab?.setQuality(qualitySelect.value);
  if (presentationUI) presentationUI.setState({ ...presentationUI.getState(), quality: qualitySelect.value });
});
if (lab) {
  presentationUI = createScientificViewUI({
    elements: $,
    onStateChange: state => {
      try {
        lab.presentation.setScale(state.scale);
        lab.presentation.setRepresentation(state.representation);
        lab.presentation.setCutPlane(state.cutPlane);
        lab.presentation.setMotion(state.motion);
        lab.setQuality(state.quality);
        qualitySelect.value = state.quality;
        lab.presentation.clearOverlays();
        for (const id of state.overlayIds) {
          const fieldSnapshot = analysisUI?.getFieldSnapshot?.();
          if (id === 'box-oxygen-slice') {
            if (!fieldSnapshot?.snapshot) continue;
            const n = fieldSnapshot.snapshot.settings.resolution, k = Math.floor(n / 2);
            const values = Float64Array.from({ length: n * n }, (_, i) => fieldSnapshot.snapshot.values[i + n * n * k]);
            lab.presentation.setOverlay(id, { values, width: n, height: n });
          } else if (id === 'slab-profile') {
            const profile = oxygenProfile(Number($('demand').value), 33).profile.map(point => point.concentration);
            lab.presentation.setOverlay(id, { values: Float64Array.from(profile), width: 33, height: 1 });
          } else if (id === 'flow-network') {
            const net = createTeachingNetwork(analysisUI?.getState?.().flow ?? { enabled: true, pressureDrive: .6, branchResistances: [1, 1, 1] });
            const byId = new Map(net.nodes.map(node => [node.id, node.position]));
            lab.presentation.setOverlay(id, { edges: net.edges.map(edge => ({ from: byId.get(edge.from), to: byId.get(edge.to) })) });
          } else {
            lab.presentation.setOverlay(id, { marker: true });
          }
        }
        $('presentation-selection').textContent = state.overlayIds.length ? `Overlays active: ${state.overlayIds.join(', ')}. Legends state each layer's limits.` : '';
      } catch (error) {
        $('presentation-selection').textContent = error.message;
      }
    },
  });
  refreshScientificOverlays = () => {
    const state = presentationUI.getState();
    for (const id of state.overlayIds) {
      if (id === 'box-oxygen-slice') {
        const snapshot = analysisUI?.getFieldSnapshot?.().snapshot;
        if (!snapshot) { lab.presentation.setOverlay(id, null); continue; }
        const n = snapshot.settings.resolution, k = Math.floor(n / 2);
        lab.presentation.setOverlay(id, { values: snapshot.values.slice(n * n * k, n * n * (k + 1)), width: n, height: n });
      } else if (id === 'slab-profile') {
        lab.presentation.setOverlay(id, { values: oxygenProfile(Number($('demand').value), 33).profile.map(p => p.concentration), width: 33, height: 1 });
      }
    }
  };
}
createModelExplorationUI({
  elements: $,
  client: createExplorationClient(),
  getInputs: () => {
    const modelId = $('sweep-model')?.value || 'slab-oxygen';
    // The live demand slider stays the slab base value it always was; other models use only
    // their synthetic presets. Axis values override base inputs per enumerated point.
    return {
      modelId,
      baseInputs: sweepBaseInputs(modelId, modelId === 'slab-oxygen' ? { demand: Number($('demand').value) } : {}),
    };
  },
  onRun: result => {
    sweepRunCounter++;
    captureRun({
      id: `sweep-${result.spec.modelId}-${sweepRunCounter}`, kind: 'sweep-run', modelId: result.spec.modelId,
      status: result.status, createdAt: new Date().toISOString(),
      payload: { spec: result.spec, summary: result.summary, points: result.points },
      artifactFileName: `sweep-${result.spec.modelId}-${sweepRunCounter}.json`,
    });
  },
});
const hypothesisWorkspace = createHypothesisWorkspace();
const researchCockpit = createResearchCockpitUI({ elements: $, runRegistry, workspace: hypothesisWorkspace });
createResearchDraftUI({
  elements: $,
  workspace: hypothesisWorkspace,
  onChange: ({ hypotheses, queries }) => {
    // Drafts replace same-id records; imported records are preserved beside them. Generated
    // query plans replace same-id plans and never execute anything.
    const current = researchCockpit.getState();
    const draftIds = new Set(hypotheses.map(card => card.id));
    const owned = new Set(queries.map(query => query.id));
    researchCockpit.setState({
      ...current,
      hypotheses: [...hypotheses, ...current.hypotheses.filter(card => !draftIds.has(card.id))],
      queries: [...current.queries.filter(query => !owned.has(query.id)), ...queries],
    });
  },
});
for (const key of ['spacing', 'layers', 'population', 'perfusion', 'channels', 'recipient']) {
  $(key).addEventListener('input', () => {
    parameters[key] = key === 'channels' ? $(key).checked : key === 'recipient' ? $(key).value : Number($(key).value);
    crossRefUI?.refresh();
    render();
  });
}
$('timeline').addEventListener('input', () => { time = clampTime(procedureState, Number($('timeline').value)); pause(); render(); });
$('play').addEventListener('click', () => { if (time >= 4.999) time = 0; playing = !playing; $('play').textContent = playing ? 'Pause sequence' : 'Play sequence'; });
$('reset').addEventListener('click', () => { time = 0; pause(); render(); });
$('cutaway').addEventListener('change', render);
function updateCameraButtons() {
  document.querySelectorAll('[data-camera]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.camera === cameraView)));
}
document.querySelectorAll('[data-camera]').forEach(b => b.addEventListener('click', () => { cameraView = b.dataset.camera; lab?.view(cameraView); $('view-label').textContent = b.textContent.toUpperCase(); updateCameraButtons(); }));
updateCameraButtons();
const environmentAttribution = id => getEnvironmentSpecs().find(s => s.id === id)?.attribution || '';
$('environment').addEventListener('change', event => { environmentTheme = event.target.value; lab?.setEnvironment(environmentTheme); $('environment-attribution').textContent = environmentAttribution(environmentTheme); });
$('environment-attribution').textContent = environmentAttribution('lab');
$('magnify-construct').addEventListener('change', event => { lab?.setMagnified(event.target.checked); $('magnifier-frame').hidden = !event.target.checked || !lab; });
renderCrossSections($('vascular-cross-sections'));
function scenarioState() {
  const analysis = analysisUI?.getState();
  return { parameters, time, procedure: procedureState, view: { camera: cameraView, reveal: $('cutaway').checked, environment: environmentTheme }, analyses: { ...(analysis ? { oxygen3d: analysis.oxygen3d, flow: { ...analysis.flow, enabled: parameters.channels, pressureDrive: parameters.perfusion } } : defaultAnalyses(parameters)), nozzleShear: nozzleUI.getState(), vascularSupply: vascularUI.getState(), crossReference: crossRefUI.getState(), slab: { demand: Number($('demand').value) } }, datasets: { slab: calibration.status === 'loaded' ? calibration.input : null, oxygen3d: analysis?.dataset || null }, learning: learningUI.getState() };
}
$('export').addEventListener('click', () => {
  if (exportUrl) URL.revokeObjectURL(exportUrl);
  exportUrl = URL.createObjectURL(new Blob([serializeScenario(scenarioState())], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = exportUrl; a.download = 'bioprinting-scenario.json'; a.click();
});
// ---- Procedure walkthrough, gated progression and local calibration import ----
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
  const gate = nextGate(procedureState);
  gateMessage.textContent = procedureState.mode === 'free' ? 'Free exploration: all stages unlocked.' : gate ? `Complete ${gate.remainingChecks.length} checkpoint${gate.remainingChecks.length === 1 ? '' : 's'} in "${STAGES[gate.stage - 1].short}" to unlock "${STAGES[gate.stage].short}".` : 'All stages unlocked.';
  $('free-exploration').checked = procedureState.mode === 'free';
}
function showCalibration(errorMessage) {
  $('calibration-provenance').textContent = JSON.stringify(calibration.provenance ?? {
    dataset: null, fitRun: null, notice: 'No original-byte provenance captured; restored scenarios do not attest imported bytes.' }, null, 2);
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
  calibration = { ...NO_CALIBRATION }; showCalibration();
  const demand = Number($('demand').value), importedAt = new Date().toISOString();
  try {
    if (file.size > MEASUREMENT_BYTES) throw new RangeError('Measurement file exceeds 256 KiB');
    const next = await captureSlabMeasurement({ rawBytes: new Uint8Array(await file.arrayBuffer()), id: `slab-${current}`, demand, importedAt });
    if (current !== calibrationGeneration) return;
    calibration = next; showCalibration();
    if (next.provenance?.fitRun) {
      captureRun({ id: `slab-fit-${current}`, kind: 'fit-run', modelId: 'slab-oxygen', status: next.provenance.fitRun.status,
        createdAt: next.provenance.fitRun.finishedAt, payload: next.provenance.fitRun, datasetRecordId: next.provenance.fitRun.datasetId });
    }
  }
  catch (error) { if (current === calibrationGeneration) showCalibration(error.message); }
  event.target.value = ''; render();
});
$('load-example').addEventListener('click', async () => {
  const current = ++calibrationGeneration;
  calibration = { ...NO_CALIBRATION }; showCalibration();
  try {
    const next = await captureSlabMeasurement({ rawBytes: new TextEncoder().encode(calibrationExample()), id: `slab-${current}`,
      demand: Number($('demand').value), importedAt: new Date().toISOString() });
    if (current === calibrationGeneration) {
      calibration = next; showCalibration();
      if (next.provenance?.fitRun) {
        captureRun({ id: `slab-fit-${current}`, kind: 'fit-run', modelId: 'slab-oxygen', status: next.provenance.fitRun.status,
          createdAt: next.provenance.fitRun.finishedAt, payload: next.provenance.fitRun, datasetRecordId: next.provenance.fitRun.datasetId });
      }
    }
  } catch (error) { if (current === calibrationGeneration) showCalibration(error.message); }
});
$('clear-calibration').addEventListener('click', () => { calibrationGeneration++; calibration = { ...NO_CALIBRATION }; showCalibration(); });
showCalibration();
analysisUI = createAnalysisUI({ elements: $, onFlow: result => lab?.setFlowResult(result), onFieldChange: () => refreshScientificOverlays(),
  onFitRun: record => captureRun({
    id: `box-${record.id}${record.application ? '-applied' : ''}`, kind: 'fit-run', modelId: 'box-oxygen', status: record.status,
    createdAt: record.application ? record.application.appliedAt : record.finishedAt,
    payload: record, datasetRecordId: record.datasetId,
  }) });
createConvergenceStudyUI({ elements: $, getSettings: () => analysisUI.getState().oxygen3d.settings,
  onRun: result => {
    studyRunCounter++;
    const createdAt = new Date().toISOString();
    captureRun({
      id: `study-box-oxygen-${studyRunCounter}`, kind: 'study-run', modelId: 'box-oxygen', status: result.status,
      createdAt, payload: serializeStudyArtifact(result, { createdAt }),
      artifactFileName: `study-box-oxygen-${studyRunCounter}.json`,
    });
  } });
const nozzleUI = createNozzleShearUI({ elements: $, onStateChange: () => crossRefUI?.refresh() });
const vascularUI = createVascularSupplyUI({ elements: $, onStateChange: () => crossRefUI?.refresh() });
crossRefUI = createCrossReferenceUI({ elements: $, onStateChange: () => {}, getStoryboard: () => ({ ...parameters }), getNozzle: () => nozzleUI.getState(), getVascular: () => vascularUI.getState() });
workspaceShell = createWorkspaceShell({ root: document, onAreaChange: area => { activeWorkspaceArea = area; if (area !== 'studio' && playing) pause(); } });
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
  updateCameraButtons();
  environmentTheme = scenario.view.environment; $('environment').value = environmentTheme; lab?.setEnvironment(environmentTheme); $('environment-attribution').textContent = environmentAttribution(environmentTheme);
  learningUI.setState(scenario.learning);
  analysisUI.setState({ ...scenario.analyses, dataset: scenario.datasets.oxygen3d }); nozzleUI.setState(scenario.analyses.nozzleShear); vascularUI.setState(scenario.analyses.vascularSupply); crossRefUI.setState(scenario.analyses.crossReference); showCalibration(); render();
}
function applyScenario(scenario) {
  return applyScenarioTransaction(scenario, {
    snapshot: () => JSON.parse(serializeScenario(scenarioState())),
    prepare: prepareScenarioApplication,
    commit: commitScenarioApplication,
  });
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
    $('scenario-status').textContent = imported.warnings.join(' ') || 'Scenario inputs, learning selections and self-reported walkthrough progress restored. Derived analyses recomputed; provenance remains unverified.';
  } catch (error) {
    if (current !== importGeneration) return;
    $('scenario-status').textContent = error.rollbackFailed
      ? `Import failed and the previous state could not be fully restored. Reload to recover a consistent state. ${error.message}`
      : `Not imported; previous state retained. ${error.message}`;
  }
}
$('scenario-file').addEventListener('change', event => { const file = event.target.files[0]; if (file) importScenarioFile(file); event.target.value = ''; });
let sceneClock = 0;
function updateScene(clock = sceneClock) {
  sceneClock = clock;
  const s = sample(time, parameters);
  $('filaments').textContent = lab ? lab.update(s, parameters, $('cutaway').checked, clock) : '—';
  return s;
}
function updateTimeDisplay(s) {
  $('timeline').value = time;
  $('phase').textContent = `0${s.stage + 1} / 05`;
}
function render() {
  const s = sample(time, parameters), stage = STAGES[s.stage];
  analysisUI?.setFlowControls(parameters.channels, parameters.perfusion);
  for (const key of ['spacing', 'layers', 'population', 'perfusion']) $('' + key + '-value').textContent = key === 'layers' ? parameters[key] : parameters[key].toFixed(2);
  const unlocked = unlockedStages(procedureState);
  let highestUnlocked = 0; for (let i = 0; i < 5 && unlocked[i]; i++) highestUnlocked = i;
  stageButtons.forEach((b, i) => { b.setAttribute('aria-pressed', String(i === s.stage)); b.disabled = !unlocked[i]; b.setAttribute('aria-disabled', String(!unlocked[i])); b.classList.toggle('locked', !unlocked[i]); });
  $('timeline').max = String(highestUnlocked + .999);
  updateWalkthrough();
  $('scene-title').textContent = stage.title; $('stage-title').textContent = stage.title; $('description').textContent = stage.description; $('equipment').textContent = stage.equipment;
  updateTimeDisplay(s);
  $('occupancy').textContent = `${Math.round(s.occupancy * 100)}%`;
  $('warning').textContent = s.stage === 4 ? `${parameters.recipient === 'human' ? 'Human' : 'Animal'} context only. Integration is not simulated or established.` : s.stage === 3 ? parameters.channels ? 'Designed channels ≠ functional blood vessels.' : 'Channels disabled: no illustrative perfusion.' : 'Synthetic progression · no biological timescale.';
  updateScene();
}
document.addEventListener('visibilitychange', () => { last = 0; });
function frame(now) {
  const dt = last ? Math.min((now - last) / 1000, .1) : 0; last = now;
  const frameState = { playing, documentHidden: document.hidden, activeArea: activeWorkspaceArea, webglAvailable: !!lab };
  const previousStage = Math.floor(time);
  if (shouldAdvanceFrame(frameState)) {
    const next = clampTime(procedureState, time + dt / 9);
    if (next <= time + 1e-9) pause();
    time = next;
  }
  const currentStage = Math.floor(time);
  if (currentStage !== previousStage) render();
  else {
    if (playing) updateTimeDisplay(sample(time, parameters));
    if (shouldDrawFrame(frameState)) updateScene(now / 1000);
  }
  if (shouldDrawFrame(frameState)) lab?.draw();
  requestAnimationFrame(frame);
}
globalThis.bioprintingWorkbench = { exportScenario: () => JSON.parse(serializeScenario(scenarioState())), diagnostics: () => ({ ...snapshot(time, parameters), playing, workspace: workspaceShell?.getState() ?? { activeArea: 'studio', activeResearchCardId: null }, procedure: procedureSummary(procedureState), calibration: calibration.status === 'loaded' ? { status: 'loaded', q: calibration.fit.q, n: calibration.fit.n } : { status: calibration.status }, analyses: analysisUI?.diagnostics(), learning: learningUI.diagnostics(), graphics: lab?.diagnostics() ?? { webgl: false, environment: environmentTheme } }) };
render(); requestAnimationFrame(frame);