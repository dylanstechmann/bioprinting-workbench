import { assertAllowedKeys, text } from './validation.js';
import { getEvidenceCatalog } from './cell-evidence.js';

const definitions = [
  ['identity', 'Cell identities and maturity', 'general', [], ['Identity and function cannot be inferred from relative population.']],
  ['stability', 'Genome stability and culture selection', 'general', ['identity'], ['No division-speed-to-cancer calculation or cancer-free certification.']],
  ['architecture', 'Spatial architecture and mechanical support', 'general', ['identity'], ['The displayed lattice is geometry, not established tissue architecture or mechanics.']],
  ['transport', 'Blood supply and transport', 'general', ['architecture'], ['Independent oxygen/flow references do not establish living vasculature or coupled tissue transport.']],
  ['biliary', 'Biliary drainage and liver organization', 'liver', ['architecture', 'identity'], ['The cited periportal assembloid is not a complete liver or proof of organ-scale bile drainage.']],
  ['immune', 'Immune and stromal interactions', 'liver', ['identity'], ['The cited model lacks immune and other mesenchymal populations and portal vasculature.']],
  ['long-term', 'Long-term maintenance and function', 'general', ['stability', 'transport'], ['A research horizon does not establish durability or functional organ construction.']],
];
const barriers = definitions.map(([id, label, context, dependencyIds, missingEvidence]) => ({ id, label, context, claimIds: context === 'liver' ? ['liver-assembloid', 'liver-gaps'] : id === 'stability' ? ['replication-stress', 'culture-selection'] : ['copy-genome'], missingEvidence, dependencyIds, status: 'not-modeled' }));

export function validateOrganBarriers(raw) {
  if (!Array.isArray(raw) || !raw.length || raw.length > 32) throw new RangeError('Invalid barrier list');
  const ids = new Set(), claims = new Set(getEvidenceCatalog().claims.map(c => c.id));
  for (const b of raw) {
    assertAllowedKeys(b, ['id','label','context','claimIds','missingEvidence','dependencyIds','status']);
    text(b.id, 128, 'barrier.id'); text(b.label, 2000, 'barrier.label');
    if (ids.has(b.id) || !['general','liver'].includes(b.context) || b.status !== 'not-modeled') throw new RangeError('Invalid barrier ID/status');
    ids.add(b.id);
    for (const field of ['claimIds','missingEvidence','dependencyIds']) {
      if (!Array.isArray(b[field]) || b[field].length > 32 || new Set(b[field]).size !== b[field].length) throw new RangeError('Invalid barrier references');
      b[field].forEach(v => text(v, 2000, field));
    }
    if (!b.missingEvidence.length || !b.claimIds.length || b.claimIds.some(id => !claims.has(id))) throw new RangeError('Missing barrier evidence');
  }
  const visited = new Set(), visiting = new Set(), byId = new Map(raw.map(b => [b.id, b]));
  function visit(id) {
    if (!ids.has(id)) throw new RangeError('Dangling barrier dependency');
    if (visiting.has(id)) throw new RangeError('Cyclic barrier dependencies');
    if (visited.has(id)) return;
    visiting.add(id); byId.get(id).dependencyIds.forEach(visit); visiting.delete(id); visited.add(id);
  }
  raw.forEach(b => visit(b.id)); return structuredClone(raw);
}
const canonical = validateOrganBarriers(barriers);
export function getOrganResearchSummary(context = 'liver') {
  if (!['general','liver'].includes(context)) throw new RangeError('Unsupported organ context');
  return { barriers: structuredClone(canonical.filter(b => b.context === 'general' || b.context === context)), notice: 'Research questions, not a validated manufacturing pathway, readiness checklist or completion score. A tissue patch, organoid, assembloid, decellularized scaffold and complete functional organ are different objects. Other organs and body parts are unevaluated aspirations here. No whole-organ construction duration is established.' };
}