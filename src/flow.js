import { assertAllowedKeys, finite, text } from './validation.js';
import { solvePCG } from './numerics.js';
export const FLOW_MODEL = 'dimensionless-linear-resistance-network';
export function validateFlowSettings(raw) {
  assertAllowedKeys(raw, ['enabled', 'pressureDrive', 'branchResistances'], 'flow');
  if (typeof raw.enabled !== 'boolean' || !Array.isArray(raw.branchResistances) || raw.branchResistances.length !== 3) throw new TypeError('Invalid flow controls');
  return { enabled: raw.enabled, pressureDrive: finite(raw.pressureDrive, 0, 1, 'pressureDrive'), branchResistances: raw.branchResistances.map(r => finite(r, 1e-6, 1e6, 'resistance')) };
}
export function validateFlowNetwork(raw) {
  assertAllowedKeys(raw, ['model', 'nodes', 'edges']);
  if (raw.model !== FLOW_MODEL || !Array.isArray(raw.nodes) || !raw.nodes.length || raw.nodes.length > 64 || !Array.isArray(raw.edges) || raw.edges.length > 128) throw new RangeError('Invalid flow graph bounds');
  const ids = new Set(), edgeIds = new Set();
  const nodes = raw.nodes.map(node => {
    assertAllowedKeys(node, ['id', 'position', 'boundaryPressure'], 'node');
    const id = text(node.id, 64, 'node.id');
    if (ids.has(id)) throw new RangeError('Duplicate node'); ids.add(id);
    if (!Array.isArray(node.position) || node.position.length !== 3) throw new TypeError('Invalid node position');
    const result = { id, position: node.position.map(x => finite(x, -2, 2, 'node.position')) };
    if (node.boundaryPressure !== undefined) result.boundaryPressure = finite(node.boundaryPressure, -10, 10, 'boundaryPressure');
    return result;
  });
  const edges = raw.edges.map(edge => {
    assertAllowedKeys(edge, ['id', 'from', 'to', 'resistance', 'channelId'], 'edge');
    const id = text(edge.id, 64, 'edge.id');
    if (edgeIds.has(id) || !ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to) throw new RangeError('Invalid edge IDs/endpoints'); edgeIds.add(id);
    const result = { id, from: edge.from, to: edge.to, resistance: finite(edge.resistance, 1e-6, 1e6, 'resistance') };
    if (edge.channelId !== undefined) result.channelId = text(edge.channelId, 64, 'channelId');
    return result;
  });
  return { model: FLOW_MODEL, nodes, edges };
}
export function createTeachingNetwork(raw) {
  const settings = validateFlowSettings(raw);
  return { model: FLOW_MODEL, nodes: [
    { id: 'inlet', position: [-1.8, 0, 0], boundaryPressure: settings.enabled ? settings.pressureDrive : 0 },
    { id: 'left', position: [-1.2, 0, 0] }, { id: 'right', position: [1.2, 0, 0] },
    { id: 'outlet', position: [1.8, 0, 0], boundaryPressure: 0 },
  ], edges: [{ id: 'feed', from: 'inlet', to: 'left', resistance: 1 }, ...settings.branchResistances.map((resistance, i) => ({ id: `branch-${i}`, from: 'left', to: 'right', resistance, channelId: `branch-${i}` })), { id: 'return', from: 'right', to: 'outlet', resistance: 1 }] };
}
export function solveFlowNetwork(raw) {
  const network = validateFlowNetwork(raw), byId = new Map(network.nodes.map(n => [n.id, n])), visited = new Set();
  for (const node of network.nodes) if (!visited.has(node.id)) {
    const pending = [node.id]; let anchored = false;
    while (pending.length) { const id = pending.pop(); if (visited.has(id)) continue; visited.add(id); anchored ||= byId.get(id).boundaryPressure !== undefined; for (const edge of network.edges) { if (edge.from === id) pending.push(edge.to); if (edge.to === id) pending.push(edge.from); } }
    if (!anchored) throw new RangeError('Unanchored flow component');
  }
  const unknown = network.nodes.filter(n => n.boundaryPressure === undefined), index = new Map(unknown.map((n, i) => [n.id, i]));
  const diagonal = new Float64Array(unknown.length), rhs = new Float64Array(unknown.length), matrix = Array.from({ length: unknown.length }, () => new Float64Array(unknown.length));
  for (const edge of network.edges) for (const [a, b] of [[edge.from, edge.to], [edge.to, edge.from]]) if (index.has(a)) {
    const i = index.get(a), g = 1 / edge.resistance; matrix[i][i] += g; diagonal[i] += g;
    if (index.has(b)) matrix[i][index.get(b)] -= g; else rhs[i] += g * byId.get(b).boundaryPressure;
  }
  const solution = unknown.length ? solvePCG({ diagonal, rhs, tolerance: 1e-12, apply(x, out) { matrix.forEach((row, i) => { out[i] = row.reduce((s, a, j) => s + a * x[j], 0); }); } }) : { values: [], converged: true };
  const pressures = new Map(network.nodes.map(n => [n.id, n.boundaryPressure ?? solution.values[index.get(n.id)]])), net = new Map(network.nodes.map(n => [n.id, 0]));
  const edgeFlows = network.edges.map(e => { const flow = (pressures.get(e.from) - pressures.get(e.to)) / e.resistance; net.set(e.from, net.get(e.from) + flow); net.set(e.to, net.get(e.to) - flow); return { id: e.id, flow }; });
  const boundaryFlows = network.nodes.filter(n => n.boundaryPressure !== undefined).map(n => ({ id: n.id, outwardFlow: -net.get(n.id) }));
  const maxInteriorResidual = Math.max(0, ...unknown.map(n => Math.abs(net.get(n.id)))), globalBalanceError = Math.abs(boundaryFlows.reduce((s, n) => s + n.outwardFlow, 0));
  const scale = Math.max(1, ...edgeFlows.map(e => Math.abs(e.flow))), ok = solution.converged && maxInteriorResidual <= 1e-9 * scale && globalBalanceError <= 1e-9 * scale;
  return { status: ok ? 'solved' : 'numerical-failure', nodePressures: [...pressures].map(([id, pressure]) => ({ id, pressure })), edgeFlows, boundaryFlows, maxInteriorResidual, globalBalanceError, units: 'dimensionless', message: ok ? 'Idealized resistance network; not CFD or living vessel function.' : 'Numerical residual checks failed.' };
}