// Phase C overlays: explicitly separate presentation overlays over the multiscale views.
// Slice fields render only on their normalized-box proxy (never painted onto scaffold
// geometry), network overlays carry the dimensionless notice, and shear/supply entries are
// labelled reference panels, not calibrated tissue fields. Textures are bounded to 256x256,
// at most four overlays are active, and every created resource is owned and disposed here.
export const OVERLAY_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'box-oxygen-slice', modelId: 'box-oxygen', representation: 'model-field', unit: '1',
    legend: 'Dimensionless box-oxygen slice field. Not tissue oxygen, not a viability map.',
    coordinateSpace: 'normalized-box', requiresRun: true,
  }),
  Object.freeze({
    id: 'slab-profile', modelId: 'slab-oxygen', representation: 'model-field', unit: '1',
    legend: 'Dimensionless 1D slab profile on an illustrative strip. Not a measured gradient.',
    coordinateSpace: 'illustrative', requiresRun: true,
  }),
  Object.freeze({
    id: 'flow-network', modelId: 'flow-resistance', representation: 'network', unit: '1',
    legend: 'Dimensionless resistance-network flows. Not CFD, not living vessel function.',
    coordinateSpace: 'network', requiresRun: true,
  }),
  Object.freeze({
    id: 'nozzle-shear-reference', modelId: 'nozzle-shear', representation: 'reference-panel', unit: 'Pa',
    legend: 'Hypothetical wall-shear reference panel. Not a print setting, not a safety verdict.',
    coordinateSpace: 'illustrative', requiresRun: true,
  }),
  Object.freeze({
    id: 'vascular-supply-reference', modelId: 'vascular-supply', representation: 'reference-panel', unit: 'um',
    legend: 'Idealized supply-distance reference panel. Not a viability threshold.',
    coordinateSpace: 'illustrative', requiresRun: true,
  }),
]);

export const MAX_ACTIVE_OVERLAYS = 4;
export const MAX_OVERLAY_TEXTURE_SIDE = 256;

export function getOverlayDefinitions() {
  return OVERLAY_DEFINITIONS.map(d => ({ ...d }));
}
export function getOverlayDefinition(id) {
  const found = OVERLAY_DEFINITIONS.find(d => d.id === id);
  if (!found) throw new RangeError(`Unknown overlay: ${String(id)}`);
  return { ...found };
}

function boundedTextureData(data) {
  const { values, width, height } = data || {};
  if (!values || typeof values.length !== 'number') throw new TypeError('Overlay field data needs values');
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) throw new RangeError('Overlay field needs integer dimensions');
  if (width > MAX_OVERLAY_TEXTURE_SIDE || height > MAX_OVERLAY_TEXTURE_SIDE) throw new RangeError(`Overlay textures are capped at ${MAX_OVERLAY_TEXTURE_SIDE}x${MAX_OVERLAY_TEXTURE_SIDE}`);
  if (values.length !== width * height) throw new RangeError('Overlay field values do not match dimensions');
  return { values: Float64Array.from(values), width, height };
}
/** createScientificOverlays owns everything it creates under `parent`. */
export function createScientificOverlays({ THREE, parent, registry = OVERLAY_DEFINITIONS }) {
  if (!THREE || !parent) throw new TypeError('THREE and parent are required');
  const active = new Map(); // id -> {definition, object, resources}
  function destroy(entry) {
    parent.remove(entry.object);
    for (const resource of entry.resources) resource?.dispose?.();
  }
  return {
    setOverlay(id, data) {
      const definition = registry.find(d => d.id === id);
      if (!definition) throw new RangeError(`Unknown overlay: ${String(id)}`);
      if (data === null) {
        const existing = active.get(id);
        if (existing) { destroy(existing); active.delete(id); }
        return;
      }
      if (data === undefined) throw new TypeError('Overlay data must be an object or null to clear');
      if (!active.has(id) && active.size >= MAX_ACTIVE_OVERLAYS) throw new RangeError(`At most ${MAX_ACTIVE_OVERLAYS} overlays may be active`);
      const resources = [];
      let object;
      if (definition.representation === 'model-field' && definition.coordinateSpace === 'normalized-box') {
        const field = boundedTextureData(data.field || data);
        const texture = new THREE.DataTexture(new Float64Array(field.values), field.width, field.height);
        resources.push(texture);
        const geometry = new THREE.PlaneGeometry(1.6, 1.6);
        resources.push(geometry);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.85 });
        resources.push(material);
        object = new THREE.Mesh(geometry, material);
        object.position.set(0, 1.2, 0);
      } else if (definition.representation === 'model-field') {
        const field = boundedTextureData(data.field || data);
        const geometry = new THREE.PlaneGeometry(1.8, 0.9);
        resources.push(geometry);
        const material = new THREE.MeshBasicMaterial({ color: 0x267b72, transparent: true, opacity: 0.6 });
        resources.push(material);
        object = new THREE.Mesh(geometry, material);
        object.position.set(0, 1.1, 0);
      } else if (definition.representation === 'network') {
        const edges = Array.isArray(data.edges) ? data.edges.slice(0, 256) : [];
        const points = [];
        for (const edge of edges) {
          const from = edge?.from, to = edge?.to;
          if (!Array.isArray(from) || !Array.isArray(to) || from.length !== 3 || to.length !== 3) throw new TypeError('Network overlay edges need 3-vector from/to');
          if ([...from, ...to].some(v => typeof v !== 'number' || !Number.isFinite(v))) throw new RangeError('Network overlay coordinates must be finite');
          points.push(from[0], from[1], from[2], to[0], to[1], to[2]);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        resources.push(geometry);
        const material = new THREE.LineBasicMaterial({ color: 0x2f7d8c });
        resources.push(material);
        object = new THREE.LineSegments(geometry, material);
      } else {
        const geometry = new THREE.BoxGeometry(0.8, 0.5, 0.06);
        resources.push(geometry);
        const material = new THREE.MeshStandardMaterial({ color: 0xe7d9a8, roughness: 0.8 });
        resources.push(material);
        object = new THREE.Mesh(geometry, material);
        object.position.set(0, 1.15, 0);
      }
      object.userData.overlayId = id;
      parent.add(object);
      const previous = active.get(id);
      if (previous) destroy(previous);
      active.set(id, { definition, object, resources });
    },
    clear() {
      for (const entry of active.values()) destroy(entry);
      active.clear();
    },
    getLegend() {
      return [...active.values()].map(({ definition }) => ({ id: definition.id, unit: definition.unit, legend: definition.legend, coordinateSpace: definition.coordinateSpace }));
    },
    active: () => [...active.keys()],
    dispose() { this.clear(); },
  };
}
