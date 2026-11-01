// Dimensionless, synthetic teaching model. These constants are not biological estimates.
export const STAGES = [
  { title: 'Cell expansion', short: 'Expand', equipment: 'Culture dish · incubator · inverted microscope', description: 'A synthetic cell population increases in a culture dish. Real expansion requires cell identity, contamination, phenotype and variability checks; none are simulated here.' },
  { title: 'Scaffold deposition', short: 'Print', equipment: 'Enclosed extrusion bioprinter · cartridge · build plate', description: 'Alternating filaments form a porous scaffold. Scaffold-first seeding is illustrated; cell-laden bioink printing is a different workflow. This is a geometric toolpath, not a printer program.' },
  { title: 'Cell organization', short: 'Organize', equipment: 'Seeded scaffold · culture chamber', description: 'Cells progressively occupy scaffold-adjacent positions and an illustrative matrix appears. The motion is scripted, not a prediction of adhesion, differentiation or self-organization.' },
  { title: 'Vascular & perfusion concept', short: 'Perfuse', equipment: 'Perfusion chamber · reservoir · peristaltic pump · tubing', description: 'Designed channels carry tracer particles. Channels are not automatically blood vessels: endothelial lining, barrier function, flow stability and host connection remain separate questions.' },
  { title: 'Hypothetical graft integration', short: 'Integration', equipment: 'Abstract recipient tissue · conceptual graft interface', description: 'The construct is juxtaposed with a generic recipient tissue patch. No surgery, immune compatibility, healing, functional integration or transplant safety is simulated. Human and animal labels provide context only.' },
];
export const DEFAULTS = Object.freeze({ spacing: 0.36, layers: 6, population: 0.6, perfusion: 0.6, channels: true, recipient: 'animal' });
export function validate(p) {
  for (const [key, min, max] of [['spacing', .24, .6], ['layers', 3, 9], ['population', .1, 1], ['perfusion', 0, 1]]) {
    if (!Number.isFinite(p[key]) || p[key] < min || p[key] > max) throw new RangeError(`Invalid ${key}`);
  }
  if (!Number.isInteger(p.layers)) throw new RangeError('Layers must be an integer');
  if (typeof p.channels !== 'boolean' || !['animal', 'human'].includes(p.recipient)) throw new TypeError('Invalid scenario');
  return p;
}
export function random(seed = 42) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; };
}
export function scaffold(p) {
  validate(p);
  const lines = [];
  for (let layer = 0; layer < p.layers; layer++) {
    for (let cross = -1.25; cross <= 1.251; cross += p.spacing) {
      const y = .15 + layer * .11;
      lines.push({ a: layer % 2 ? [cross, y, -1.25] : [-1.25, y, cross], b: layer % 2 ? [cross, y, 1.25] : [1.25, y, cross], layer });
    }
  }
  return lines;
}
export function sample(time, p = DEFAULTS) {
  validate(p);
  if (!Number.isFinite(time)) throw new TypeError('Time must be finite');
  const t = Math.max(0, Math.min(4.999, time)), stage = Math.floor(t), progress = t - stage;
  const expansion = stage === 0 ? .12 + .88 * progress : 1;
  const occupancy = p.population * (stage < 2 ? 0 : stage === 2 ? progress : 1);
  return { stage, progress, expansion, occupancy, printed: stage === 0 ? 0 : stage === 1 ? progress : 1, flow: stage >= 3 && p.channels ? p.perfusion : 0, integration: stage === 4 ? progress : 0 };
}
export function snapshot(time, p) {
  return { schema: 'bioprinting-workbench/1', model: 'synthetic-dimensionless-storyboard', seed: 42, parameters: { ...validate(p) }, time, state: sample(time, p), limitations: 'Not biologically calibrated. No transplant safety, clinical or animal-use inference. No experimental protocol.' };
}