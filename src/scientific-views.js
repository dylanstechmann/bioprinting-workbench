// Phase C multiscale views: one presentation-root group beside the lab equipment in the same
// renderer/context. Each scale is framed independently and is a discrete representational
// transition — never a continuous physical zoom and never a new biological claim. Cell view
// uses schematic geometry with an explicit unknown scale; tissue-context is an abstract patch,
// not an organ reconstruction.
import { PRESENTATION_SCALES } from './scientific-view-state.js';

export function presentationSpec(scale) {
  switch (scale) {
    case 'construct':
      return {
        label: 'Construct',
        notice: 'Framed scaffold presentation with stage-independent geometry. Filament layout is illustrative toolpath artwork, not a printer program.',
        bounds: { min: [-1.7, -0.1, -1.7], max: [1.7, 1.9, 1.7] },
      };
    case 'cell':
      return {
        label: 'Cell',
        notice: 'Schematic cell-scale presentation. The physical size of this view is UNKNOWN: the storyboard carries no cell-diameter measurement, and none is invented here.',
        bounds: { min: [-1.1, 0, -1.1], max: [1.1, 1.6, 1.1] },
      };
    case 'tissue-context':
      return {
        label: 'Tissue context',
        notice: 'Abstract recipient-tissue patch beside the construct. No organ reconstruction, immune compatibility, healing or integration is simulated.',
        bounds: { min: [-2.2, -0.1, -1.4], max: [2.2, 1.7, 1.4] },
      };
    case 'laboratory':
      return {
        label: 'Laboratory',
        notice: 'The reviewed laboratory scene. Presentation overlays remain explicitly separate from the equipment.',
        bounds: null,
      };
    default:
      throw new RangeError(`Unknown presentation scale: ${String(scale)}`);
  }
}

function buildGroup(THREE, scale) {
  const group = new THREE.Group();
  group.name = `presentation-${scale}`;
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ color: 0x22323a }));
  backdrop.rotation.x = -Math.PI / 2;
  backdrop.position.y = -0.02;
  group.add(backdrop);
  if (scale === 'construct') {
    const scaffoldMat = new THREE.MeshStandardMaterial({ color: 0xd7e2da, roughness: 0.7 });
    for (let layer = 0; layer < 6; layer++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 0.12), scaffoldMat);
      bar.position.set(0, 0.2 + layer * 0.22, -1 + (layer % 2 ? 0.5 : 0));
      if (layer % 2) bar.rotation.y = Math.PI / 2;
      bar.userData.illustration = true;
      group.add(bar);
    }
  } else if (scale === 'cell') {
    const cellMat = new THREE.MeshStandardMaterial({ color: 0xc04473, roughness: 0.5 });
    for (let i = 0; i < 7; i++) {
      const cell = new THREE.Mesh(new THREE.SphereGeometry(0.16 + (i % 3) * 0.03, 12, 10), cellMat);
      cell.position.set(Math.cos(i * 1.7) * 0.45, 0.5 + (i % 3) * 0.22, Math.sin(i * 1.7) * 0.45);
      cell.userData.illustration = true;
      group.add(cell);
    }
  } else if (scale === 'tissue-context') {
    const patch = new THREE.Mesh(new THREE.BoxGeometry(4, 0.35, 1.8), new THREE.MeshStandardMaterial({ color: 0xe7d9c2, roughness: 0.85 }));
    patch.position.y = 0.18;
    patch.userData.illustration = true;
    group.add(patch);
    const construct = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1), new THREE.MeshStandardMaterial({ color: 0xbfd8cf, roughness: 0.6 }));
    construct.position.y = 0.62;
    construct.userData.illustration = true;
    group.add(construct);
  }
  // The model-field representation swaps illustration meshes for this bounds frame; overlays
  // remain the only field data and never ride on the illustration.
  const bounds = presentationSpec(scale).bounds;
  if (bounds) {
    const size = bounds.max.map((value, axis) => value - bounds.min[axis]);
    const center = bounds.max.map((value, axis) => (value + bounds.min[axis]) / 2);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshBasicMaterial({ color: 0x3a6df0, wireframe: true }));
    frame.position.set(...center);
    frame.visible = false;
    frame.userData.fieldFrame = true;
    group.add(frame);
  }
  return group;
}

/** createScientificViews owns its groups under `parent`; dispose removes and disposes them.
 * The renderer/context stays the caller's single WebGL owner. */
export function createScientificViews({ THREE, parent }) {
  if (!THREE || !parent) throw new TypeError('THREE and parent are required');
  const root = new THREE.Group();
  root.name = 'presentation-root';
  const groups = new Map();
  for (const scale of PRESENTATION_SCALES) {
    if (scale === 'laboratory') continue;
    const group = buildGroup(THREE, scale);
    group.visible = false;
    groups.set(scale, group);
    root.add(group);
  }
  parent.add(root);
  let current = 'laboratory';
  let representation = 'illustration';
  let cutPlane = null;
  let motion = 'system';
  function ownedMaterials() {
    const materials = [];
    root.traverse(object => {
      for (const material of [].concat(object.material || [])) if (material) materials.push(material);
    });
    return materials;
  }
  return {
    group: root,
    scale: () => current,
    setScale(scale) {
      const spec = presentationSpec(scale); // throws on unknown scales
      current = scale;
      for (const [id, group] of groups) group.visible = id === scale;
      root.visible = scale !== 'laboratory';
      return spec;
    },
    bounds() {
      return presentationSpec(current).bounds;
    },
    setRepresentation(next) {
      if (next !== 'illustration' && next !== 'model-field') throw new RangeError('Unknown representation');
      representation = next;
      root.traverse(object => {
        if (object.userData?.illustration) object.visible = next === 'illustration';
        if (object.userData?.fieldFrame) object.visible = next === 'model-field';
      });
    },
    setCutPlane(plane) {
      let normalized = null;
      if (plane !== null) {
        if (!plane || typeof plane !== 'object' || Array.isArray(plane)) throw new TypeError('cutPlane must be an object or null');
        if (!['x', 'y', 'z'].includes(plane.axis)) throw new RangeError('cutPlane.axis unsupported');
        if (typeof plane.fraction !== 'number' || !Number.isFinite(plane.fraction) || plane.fraction < 0 || plane.fraction > 1) throw new RangeError('cutPlane.fraction must be in [0, 1]');
        normalized = { axis: plane.axis, fraction: plane.fraction };
      }
      const bounds = presentationSpec(current).bounds ?? { min: [-2, -2, -2], max: [2, 2, 2] };
      const axisIndex = normalized ? ['x', 'y', 'z'].indexOf(normalized.axis) : 0;
      const position = normalized ? bounds.min[axisIndex] + normalized.fraction * (bounds.max[axisIndex] - bounds.min[axisIndex]) : 0;
      const normals = { x: [-1, 0, 0], y: [0, -1, 0], z: [0, 0, -1] };
      const clip = normalized ? new THREE.Plane(new THREE.Vector3(...normals[normalized.axis]), position) : null;
      // Transactional: any failure restores every touched material to its previous planes and
      // keeps the last successful cut-plane state; the original error is rethrown.
      const touched = [];
      try {
        for (const material of ownedMaterials()) {
          touched.push([material, material.clippingPlanes ?? null]);
          material.clippingPlanes = clip ? [clip] : null;
        }
      } catch (error) {
        for (const [material, previous] of touched.reverse()) {
          try { material.clippingPlanes = previous; } catch { /* best-effort restore; the original failure is reported */ }
        }
        throw error;
      }
      cutPlane = normalized;
    },
    setMotion(next) {
      if (next !== 'system' && next !== 'reduced') throw new RangeError('Unknown motion mode');
      motion = next;
    },
    diagnostics() {
      return { scale: current, representation, cutPlane: cutPlane ? { ...cutPlane } : null, motion };
    },
    update() { /* static presentation geometry; animation stays a scene concern */ },
    dispose() {
      for (const group of groups.values()) {
        group.traverse(object => {
          object.geometry?.dispose?.();
          for (const material of [].concat(object.material || [])) {
            for (const value of Object.values(material)) value?.dispose?.();
            material.dispose?.();
          }
        });
      }
      parent.remove(root);
      groups.clear();
    },
  };
}
