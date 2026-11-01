import { DEFAULTS, STAGES, sample, snapshot } from './model.js';
import { createLab } from './scene.js';

const $ = id => document.getElementById(id);
let parameters = { ...DEFAULTS }, time = 0, playing = false, last = 0, lab = null;
let exportUrl;
const stageButtons = STAGES.map((stage, index) => {
  const b = document.createElement('button'); b.innerHTML = `<span class="stage-number">0${index + 1}</span>${stage.short}`;
  b.setAttribute('aria-label', stage.title); b.addEventListener('click', () => { time = index + .001; pause(); render(); });
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
$('timeline').addEventListener('input', () => { time = Number($('timeline').value); pause(); render(); });
$('play').addEventListener('click', () => { if (time >= 4.999) time = 0; playing = !playing; $('play').textContent = playing ? 'Pause sequence' : 'Play sequence'; });
$('reset').addEventListener('click', () => { time = 0; pause(); render(); });
$('cutaway').addEventListener('change', render);
document.querySelectorAll('[data-camera]').forEach(b => b.addEventListener('click', () => { lab?.view(b.dataset.camera); $('view-label').textContent = `${b.textContent.toUpperCase()} VIEW`; }));
$('export').addEventListener('click', () => {
  if (exportUrl) URL.revokeObjectURL(exportUrl);
  exportUrl = URL.createObjectURL(new Blob([JSON.stringify(snapshot(time, parameters), null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = exportUrl; a.download = 'bioprinting-scenario.json'; a.click();
});
function render(clock = 0) {
  // Event objects are not animation times.
  if (typeof clock !== 'number') clock = 0;
  const s = sample(time, parameters), stage = STAGES[s.stage];
  for (const key of ['spacing', 'layers', 'population', 'perfusion']) $('' + key + '-value').textContent = key === 'layers' ? parameters[key] : parameters[key].toFixed(2);
  stageButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === s.stage)));
  $('scene-title').textContent = stage.title; $('stage-title').textContent = stage.title; $('description').textContent = stage.description; $('equipment').textContent = stage.equipment;
  $('timeline').value = time; $('phase').textContent = `0${s.stage + 1} / 05`;
  $('occupancy').textContent = `${Math.round(s.occupancy * 100)}%`;
  $('warning').textContent = s.stage === 4 ? `${parameters.recipient === 'human' ? 'Human' : 'Animal'} context only. Integration is not simulated or established.` : s.stage === 3 ? parameters.channels ? 'Designed channels ≠ functional blood vessels.' : 'Channels disabled: no illustrative perfusion.' : 'Synthetic progression · no biological timescale.';
  $('filaments').textContent = lab ? lab.update(s, parameters, $('cutaway').checked, clock) : '—';
}
document.addEventListener('visibilitychange', () => { last = 0; });
function frame(now) {
  const dt = last ? Math.min((now - last) / 1000, .1) : 0; last = now;
  if (playing && !document.hidden) { time = Math.min(4.999, time + dt / 9); if (time >= 4.999) pause(); }
  render(now / 1000); lab?.draw(); requestAnimationFrame(frame);
}
globalThis.bioprintingWorkbench = { diagnostics: () => ({ ...snapshot(time, parameters), playing, graphics: lab?.diagnostics() ?? { webgl: false } }) };
render(); requestAnimationFrame(frame);