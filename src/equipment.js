export const EQUIPMENT_SPECS = [
  ['bioprinter', 'bioprinter', 'Printer_', ['Printer_Base', 'Printer_BuildPlate', 'Printer_Glass_Door']],
  ['incubator', 'incubator', 'Incubator_', ['Incubator_Base', 'Incubator_Glass_Door']],
  ['microscope', 'microscope', 'Microscope_', ['Microscope_Base', 'Microscope_Stage']],
  ['perfusion-chamber', 'perfusion_chamber', 'Chamber_', ['Chamber_Base', 'Chamber_Glass_Lid']],
].map(([id, file, nodePrefix, requiredNodes]) => ({ id, url: new URL(`../assets/${file}.glb`, import.meta.url).href, nodePrefix, requiredNodes }));

export function validateEquipmentAsset(root, spec) {
  if (!root || typeof root.traverse !== 'function') throw new Error('Invalid asset root');
  const names = new Set();
  root.traverse(o => {
    if (!o.isMesh) return;
    if (!o.name.startsWith(spec.nodePrefix)) throw new Error('Unexpected asset namespace');
    names.add(o.name);
    if (![...o.position.toArray(), ...o.scale.toArray(), ...o.quaternion.toArray()].every(Number.isFinite)) throw new Error('Invalid asset transform');
    o.geometry.computeBoundingBox();
    const bounds = [...o.geometry.boundingBox.min.toArray(), ...o.geometry.boundingBox.max.toArray()];
    if (bounds.some(x => !Number.isFinite(x) || Math.abs(x) > 20)) throw new Error('Invalid equipment bounds');
  });
  if (spec.requiredNodes.some(name => !names.has(name))) throw new Error('Missing equipment parts');
}
function disposeRoot(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(o => { if (o.geometry) geometries.add(o.geometry); for (const m of [].concat(o.material || [])) materials.add(m); });
  for (const m of materials) for (const value of Object.values(m)) if (value?.isTexture) textures.add(value);
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
}
export function loadEquipmentAsset({ spec, parent, fallback, load, reveal = false }) {
  let state = { status: 'loading', reason: null }, root, disposed = false;
  const glass = [];
  const ready = Promise.resolve().then(() => load(spec.url)).then(gltf => {
    root = gltf?.scene;
    if (!root || typeof root.traverse !== 'function') { root = null; throw new Error('Invalid asset root'); }
    if (disposed) { disposeRoot(root); root = null; return; }
    try { validateEquipmentAsset(root, spec); } catch (error) { disposeRoot(root); root = null; state = { status: 'fallback', reason: 'invalid-asset' }; return; }
    root.traverse(o => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = !o.name.includes('Glass'); if (o.name.includes('Glass')) { glass.push(o); o.visible = !reveal; } } });
    parent.add(root); fallback.forEach(o => { o.visible = false; });
    state = { status: 'loaded', reason: null };
  }).catch(() => { if (!disposed) state = { status: 'fallback', reason: 'request-failed' }; });
  return { ready, setReveal(value) { reveal = value; glass.forEach(o => { o.visible = !value; }); }, diagnostics: () => ({ ...state }), dispose() { disposed = true; if (root) { parent.remove(root); disposeRoot(root); root = null; } fallback.forEach(o => { o.visible = true; }); } };
}
export function createEquipmentAssets(specs, mounts, { load }) {
  const handles = specs.map(spec => [spec.id, loadEquipmentAsset({ spec, ...mounts[spec.id], load })]);
  return { ready: Promise.all(handles.map(([, h]) => h.ready)), setReveal(value) { handles.forEach(([, h]) => h.setReveal(value)); }, diagnostics: () => Object.fromEntries(handles.map(([id, h]) => [id, h.diagnostics()])), dispose() { handles.forEach(([, h]) => h.dispose()); } };
}