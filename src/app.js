import { DEFAULTS, STAGES, sample, snapshot } from './model.js';
import { createLab } from './scene.js';
import { oxygenProfile } from './oxygen.js';
import { PROCEDURE_STEPS, createProcedureState, toggleCheck, stepProgress, isStageUnlocked, unlockedStages, clampTime, setMode, procedureSummary, nextGate } from './procedure.js';
import { NO_CALIBRATION, parseCalibrationInput, fitSlabDemand, calibrationExample } from './calibration.js';

const $ = id => document.getElementById(id);
let parameters = { ...DEFAULTS }, time = 0, playing = false, last = 0, lab = null;
let exportUrl;
let procedureState = createProcedureState();
let calibration = { ...NO_CALIBRATION };
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
document.querySelectorAll('[data-camera]').forEach(b => b.addEventListener('click', () => { lab?.view(b.dataset.camera); $('view-label').textContent = `${b.textContent.toUpperCase()} VIEW`; }));
$('export').addEventListener('click', () => {
  if (exportUrl) URL.revokeObjectURL(exportUrl);
  const exported = { ...snapshot(time, parameters), oxygenTeachingModel: oxygenProfile(Number($('demand').value)), procedure: procedureSummary(procedureState), calibration: calibration.status === 'loaded' ? { status: 'loaded', source: calibration.input.source, fit: calibration.fit } : { status: calibration.status } };
  exportUrl = URL.createObjectURL(new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' }));
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
  line('residual std of per-pair estimates', fit.residualStd.toFixed(3));
  if (!fit.inDomain) { const warn = document.createElement('p'); warn.className = 'calibration-warning'; warn.textContent = 'Estimate falls outside the model domain [0, 2]; the slab assumptions do not hold for these values.'; box.append(warn); }
  const notice = document.createElement('p'); notice.className = 'micro'; notice.textContent = `${fit.assumptionNotice} Source: ${fit.sourceCitation}`; box.append(notice);
}
$('calibration-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try { const input = parseCalibrationInput(await file.text()); calibration = { status: 'loaded', input, fit: fitSlabDemand(input) }; showCalibration(); }
  catch (error) { calibration = { ...NO_CALIBRATION }; showCalibration(error.message); }
  event.target.value = ''; render();
});
$('load-example').addEventListener('click', () => { try { const input = parseCalibrationInput(calibrationExample()); calibration = { status: 'loaded', input, fit: fitSlabDemand(input) }; } catch (error) { calibration = { ...NO_CALIBRATION }; } showCalibration(); });
$('clear-calibration').addEventListener('click', () => { calibration = { ...NO_CALIBRATION }; showCalibration(); });
showCalibration();
function render(clock = 0) {
  // Event objects are not animation times.
  if (typeof clock !== 'number') clock = 0;
  const s = sample(time, parameters), stage = STAGES[s.stage];
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
globalThis.bioprintingWorkbench = { diagnostics: () => ({ ...snapshot(time, parameters), playing, procedure: procedureSummary(procedureState), calibration: calibration.status === 'loaded' ? { status: 'loaded', q: calibration.fit.q, n: calibration.fit.n } : { status: calibration.status }, graphics: lab?.diagnostics() ?? { webgl: false } }) };
render(); requestAnimationFrame(frame);