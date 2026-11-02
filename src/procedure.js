// Educational walkthrough of published tissue-engineering workflows, mapped to the five
// simulation stages. Factual workflow statements are attributed to cited open-access
// sources; actionable lab parameters stay in those sources. Nothing here directs any
// activity toward a person or animal; in-vivo findings appear only as research description.
// Pure data + helpers: no DOM, no storage, no side effects.

export const PROCEDURE_STEPS = [
  {
    id: 'expand-culture', order: 1, stage: 0,
    title: 'Isolate and expand cells in culture',
    purpose: 'Published vascularized-tissue work begins from cultured human cell stocks before any construct is assembled.',
    publishedBasis: [{ label: 'Kolesky et al. 2016', doi: '10.1073/pnas.1521342113', url: 'https://doi.org/10.1073/pnas.1521342113', note: 'The printed thick human tissues integrated multiple cell types, including human mesenchymal stem cells, expanded in culture before printing.' }],
    virtualChecks: [
      { id: 'expand-population', label: 'Set the relative cell population control and watch the dish population rise during Cell expansion.' },
      { id: 'expand-bench', label: 'Identify the incubator, culture dishes and inverted microscope on the virtual bench.' }],
    unknowns: ['Cell identity, sterility and contamination testing are not simulated.', 'Passage limits, donor variability, genome stability, residual pluripotent cells and phenotype stability remain unmeasured here. Division speed is not a cancer-risk assessment.'],
  },
  {
    id: 'prepare-materials', order: 2, stage: 1,
    title: 'Prepare matrix material and printhead',
    purpose: 'A biocompatible matrix is selected and loaded into a cartridge so printed filaments hold their shape.',
    publishedBasis: [
      { label: 'Kolesky et al. 2016', doi: '10.1073/pnas.1521342113', url: 'https://doi.org/10.1073/pnas.1521342113', note: 'Printed tissues combined an engineered extracellular matrix with embedded vasculature in one multimaterial bioprinting process.' },
      { label: 'CELLINK BIO X product page', doi: null, url: 'https://www.cellink.com/bioprinting/bio-x-3d-bioprinter/', note: 'Enclosed printers with interchangeable cartridges and printheads supply the generic equipment vocabulary illustrated here.' }],
    virtualChecks: [
      { id: 'prepare-spacing', label: 'Choose a filament spacing and layer count in the design panel.' },
      { id: 'prepare-cartridge', label: 'Find the cartridge and nozzle on the printhead in the printer view.' }],
    unknowns: ['Material rheology, crosslinking behavior, sterility and printability windows are not modeled.'],
  },
  {
    id: 'print-scaffold', order: 3, stage: 1,
    title: 'Deposit scaffold filaments layer by layer',
    purpose: 'Alternating filaments build a porous lattice whose geometry responds to the design controls.',
    publishedBasis: [{ label: 'Kolesky et al. 2016', doi: '10.1073/pnas.1521342113', url: 'https://doi.org/10.1073/pnas.1521342113', note: 'Multimaterial 3D bioprinting produced thick (>1 cm) human tissues with programmed architecture.' }],
    virtualChecks: [
      { id: 'print-run', label: 'Play or scrub the Scaffold deposition stage and watch the head trace the toolpath.' },
      { id: 'print-geometry', label: 'Change spacing or layer count and confirm the lattice rebuilds.' }],
    unknowns: ['Nozzle clogging, filament collapse, resolution limits and crosslink timing are not simulated.'],
  },
  {
    id: 'seed-organize', order: 4, stage: 2,
    title: 'Seed cells onto the scaffold',
    purpose: 'Cells take up positions around the filaments while an illustrative matrix appears - a scripted visualization, not a growth model.',
    publishedBasis: [{ label: 'Kolesky et al. 2016', doi: '10.1073/pnas.1521342113', url: 'https://doi.org/10.1073/pnas.1521342113', note: 'Printed tissues integrated parenchyma, stroma and endothelium, with multiple cell types organized within the matrix.' }],
    virtualChecks: [
      { id: 'seed-occupancy', label: 'Watch the scripted occupancy readout rise during Cell organization.' },
      { id: 'seed-matrix', label: 'Toggle Reveal scaffold to compare cell positions against the translucent matrix.' }],
    unknowns: ['Adhesion, proliferation, migration and differentiation are not predicted here.'],
  },
  {
    id: 'form-channels', order: 5, stage: 3,
    title: 'Form designed perfusable channels',
    purpose: 'Engineered channels provide a perfusion path; making them is separate from showing they behave like vessels.',
    publishedBasis: [
      { label: 'Kolesky et al. 2016', doi: '10.1073/pnas.1521342113', url: 'https://doi.org/10.1073/pnas.1521342113', note: 'Embedded vasculature was printed within thick tissues and made perfusable.' },
      { label: 'Grigoryan et al. 2019', doi: '10.1126/science.aav9750', url: 'https://doi.org/10.1126/science.aav9750', note: 'Projection stereolithography with biocompatible photoabsorber additives produced entangled multivascular networks from space-filling mathematical topologies.' }],
    virtualChecks: [
      { id: 'channels-toggle', label: 'Switch Include designed channels off and on and watch the tracer stop and resume.' },
      { id: 'channels-geometry', label: 'Inspect the channel entry manifolds in the perfusion chamber view.' }],
    unknowns: ['Endothelial lining, barrier function and leak tightness are not modeled.'],
  },
  {
    id: 'start-perfusion', order: 6, stage: 3,
    title: 'Begin illustrative perfusion',
    purpose: 'A closed virtual circuit moves tracer through the channels at a chosen illustrative rate.',
    publishedBasis: [
      { label: 'Kolesky et al. 2016', doi: '10.1073/pnas.1521342113', url: 'https://doi.org/10.1073/pnas.1521342113', note: 'Printed tissues were actively perfused with growth factors for over six weeks, supporting in-situ differentiation of human mesenchymal stem cells.' },
      { label: 'Grigoryan et al. 2019', doi: '10.1126/science.aav9750', url: 'https://doi.org/10.1126/science.aav9750', note: 'Human red blood cells were flowed and oxygenated through printed vascular topologies in vitro.' }],
    virtualChecks: [
      { id: 'perfusion-rate', label: 'Adjust the illustrative flow control and watch the tracer speed change.' },
      { id: 'perfusion-circuit', label: 'Trace the reservoir, peristaltic pump and perfusion chamber circuit on the bench.' }],
    unknowns: ['Pressure, shear stress, mass transport and oxygenation are not computed.'],
  },
  {
    id: 'characterize-construct', order: 7, stage: 4,
    title: 'Characterize the construct first',
    purpose: 'Before any translational question, a lab measures identity, mechanics and function; the virtual review panel lists these as open.',
    publishedBasis: [{ label: 'Kolesky et al. 2016', doi: '10.1073/pnas.1521342113', url: 'https://doi.org/10.1073/pnas.1521342113', note: 'Long-duration perfusion with lineage differentiation illustrates the kind of functional evidence published work reports.' }],
    virtualChecks: [
      { id: 'char-export', label: 'Export the scenario JSON and review the recorded parameters and limitations.' },
      { id: 'char-review', label: 'Read the research review panel listing unmeasured properties.' }],
    unknowns: ['Mechanical properties, cellular function and viability are not measured by this simulator.'],
  },
  {
    id: 'integration-context', order: 8, stage: 4,
    title: 'Treat host integration as an open question',
    purpose: 'Whether a construct connects to a recipient circulation and survives is unresolved; the walkthrough stops at the question.',
    publishedBasis: [{ label: 'Grigoryan et al. 2019', doi: '10.1126/science.aav9750', url: 'https://doi.org/10.1126/science.aav9750', note: 'Structured biodegradable hydrogel carriers were deployed in a rodent model of chronic liver injury, illustrating early in-vivo research in this field.' }],
    virtualChecks: [
      { id: 'context-label', label: 'Switch the recipient context label and confirm the model state values do not change.' },
      { id: 'context-warning', label: 'Read the on-screen notice that integration is not simulated or established.' }],
    unknowns: ['Anastomosis, immune response, adverse effects and long-term outcomes are not simulated.', 'No transplant readiness is assessed by this walkthrough.'],
  },
];
const CHECK_INDEX = new Map(PROCEDURE_STEPS.flatMap(s => s.virtualChecks.map(c => [c.id, { ...c, stage: s.stage }])));

export function procedureForStage(stage) {
  if (!Number.isInteger(stage) || stage < 0 || stage > 4) throw new RangeError('Stage must be an integer 0-4');
  return PROCEDURE_STEPS.filter(s => s.stage === stage);
}

export function validateProcedureState(raw) {
  if (!raw || !['gated', 'free'].includes(raw.mode) || !Array.isArray(raw.completedChecks) || raw.completedChecks.length > CHECK_INDEX.size) throw new TypeError('Invalid procedure state');
  if (Object.keys(raw).some(key => !['mode', 'completedChecks'].includes(key))) throw new TypeError('Unsupported procedure field');
  const checks = raw.completedChecks;
  if (new Set(checks).size !== checks.length || checks.some(id => !CHECK_INDEX.has(id))) throw new RangeError('Unknown or duplicate check IDs');
  return { mode: raw.mode, completedChecks: [...checks] };
}
export function createProcedureState() {
  return { completedChecks: [], mode: 'gated' };
}

export function toggleCheck(state, checkId) {
  if (!CHECK_INDEX.has(checkId)) throw new RangeError(`Unknown check: ${checkId}`);
  const has = state.completedChecks.includes(checkId);
  return { ...state, completedChecks: has ? state.completedChecks.filter(c => c !== checkId) : [...state.completedChecks, checkId] };
}

export function stepProgress(state, step) {
  const total = step.virtualChecks.length;
  if (total === 0) return 1;
  const done = step.virtualChecks.filter(c => state.completedChecks.includes(c.id)).length;
  return done / total;
}

export function isStageUnlocked(state, stage) {
  if (!Number.isInteger(stage) || stage < 0 || stage > 4) throw new RangeError('Stage must be an integer 0-4');
  if (state.mode === 'free') return true;
  if (stage === 0) return true;
  const needed = PROCEDURE_STEPS.filter(s => s.stage < stage).flatMap(s => s.virtualChecks.map(c => c.id));
  return needed.every(id => state.completedChecks.includes(id));
}

export function unlockedStages(state) {
  return [0, 1, 2, 3, 4].map(stage => isStageUnlocked(state, stage));
}

export function clampTime(state, time) {
  if (!Number.isFinite(time)) throw new TypeError('Time must be finite');
  if (state.mode === 'free') return Math.max(0, Math.min(4.999, time));
  let highest = 0;
  const unlocked = unlockedStages(state);
  for (let i = 0; i < 5 && unlocked[i]; i++) highest = i;
  return Math.max(0, Math.min(highest + .999, time));
}

export function setMode(state, mode) {
  if (mode !== 'gated' && mode !== 'free') throw new TypeError('Mode must be "gated" or "free"');
  return { ...state, mode };
}

export function procedureSummary(state) {
  const checks = PROCEDURE_STEPS.flatMap(s => s.virtualChecks);
  const checksComplete = state.completedChecks.filter(id => CHECK_INDEX.has(id)).length;
  return {
    steps: PROCEDURE_STEPS.length,
    stepsComplete: PROCEDURE_STEPS.filter(s => stepProgress(state, s) === 1).length,
    checks: checks.length, checksComplete,
    mode: state.mode, unlockedStages: unlockedStages(state),
  };
}

export function nextGate(state) {
  if (state.mode === 'free') return null;
  const unlocked = unlockedStages(state);
  const stage = unlocked.findIndex(value => !value);
  if (stage === -1) return null;
  const remainingChecks = PROCEDURE_STEPS.filter(s => s.stage < stage).flatMap(s => s.virtualChecks).filter(c => !state.completedChecks.includes(c.id));
  return { stage, remainingChecks };
}
