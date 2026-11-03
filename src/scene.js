import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { random, scaffold } from './model.js';
import { EQUIPMENT_SPECS, createEquipmentAssets } from './equipment.js';
import { createEnvironment } from './environment.js';
import { getQualityPreset } from './visual-quality.js';
import { CAMERA_LIMITS, getCameraPose } from './camera-rig.js';
import { fitCameraToBounds } from './camera-rig.js';
import { createMagnifiedViewport } from './magnified-viewport.js';
import { createScientificViews } from './scientific-views.js';
import { createScientificOverlays } from './scientific-overlays.js';
import { disposeObjectResources } from './scene-resources.js';

export function createLab(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentTexture = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environment = environmentTexture;
  pmrem.dispose();
  scene.environmentIntensity = .38;
  const prefersReducedMotion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  const environment = createEnvironment({ THREE, scene, reducedMotion: prefersReducedMotion });
  environment.setEnvironment('lab');
  const camera = new THREE.PerspectiveCamera(CAMERA_LIMITS.fovDegrees, 1, CAMERA_LIMITS.near, CAMERA_LIMITS.far);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.minDistance = CAMERA_LIMITS.minDistance;
  controls.maxDistance = CAMERA_LIMITS.defaultMaxDistance;
  controls.maxPolarAngle = Math.PI * .49;
  let userOrbited = false;
  controls.addEventListener('start', () => { userOrbited = true; });
  scene.add(new THREE.HemisphereLight('#eef8ff', '#3f4b46', .8));
  const sun = new THREE.DirectionalLight('#fff5e7', 2.8);
  sun.position.set(-4, 12, 7); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 10, bottom: -10 });
  sun.shadow.bias = -.00025; sun.shadow.normalBias = .015; scene.add(sun);
  let quality = 'balanced', disposed = false, renderedFrames = 0;
  function setQuality(id) {
    const preset = getQualityPreset(id);
    quality = preset.id;
    const shadowsChanged = renderer.shadowMap.enabled !== preset.shadows;
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, preset.pixelRatioCap));
    renderer.shadowMap.enabled = preset.shadows;
    if (shadowsChanged) scene.traverse(object => { for (const material of [].concat(object.material || [])) material.needsUpdate = true; });
    if (sun.shadow.mapSize.x !== preset.shadowMapSize) {
      sun.shadow.map?.dispose(); sun.shadow.map = null;
      sun.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
    }
    renderer.shadowMap.needsUpdate = true;
  }
  setQuality(quality);
  const fill = new THREE.DirectionalLight('#bfe4ea', .7); fill.position.set(6, 5, -5); scene.add(fill);
  function proceduralTexture(kind) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const ctx = c.getContext('2d'), rng = random(kind === 'brushed' ? 120 : kind === 'speckle' ? 121 : 122);
    if (kind === 'speckle') {
      ctx.fillStyle = '#f0f2ea'; ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 1100; i++) { ctx.fillStyle = `rgba(${130 + rng() * 50 | 0},${145 + rng() * 35 | 0},${130 + rng() * 35 | 0},${.04 + rng() * .09})`; ctx.beginPath(); ctx.arc(rng() * 256, rng() * 256, .4 + rng() * 1.7, 0, 7); ctx.fill(); }
    } else if (kind === 'brushed') {
      ctx.fillStyle = '#c3ccc7'; ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 260; i++) { const y = rng() * 256; ctx.strokeStyle = `rgba(255,255,255,${rng() * .08})`; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke(); ctx.strokeStyle = `rgba(55,66,60,${rng() * .06})`; ctx.beginPath(); ctx.moveTo(0, y + .7); ctx.lineTo(256, y + .7); ctx.stroke(); }
    } else {
      ctx.fillStyle = '#dce4dc'; ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = 'rgba(116,132,120,.4)'; ctx.lineWidth = 1.5;
      for (let i = 0; i <= 256; i += 64) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke(); }
    }
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return tex;
  }
  const brushedTex = proceduralTexture('brushed');
  const mat = (color, metalness = 0, roughness = .45, opacity = 1) => new THREE.MeshStandardMaterial({ color, metalness, roughness, transparent: opacity < 1, opacity, depthWrite: opacity === 1 });
  const physical = (color, opts = {}) => new THREE.MeshPhysicalMaterial({ color, metalness: opts.metalness ?? 0, roughness: opts.roughness ?? .45, transparent: (opts.opacity ?? 1) < 1, opacity: opts.opacity ?? 1, depthWrite: (opts.opacity ?? 1) === 1, clearcoat: opts.clearcoat ?? 0, clearcoatRoughness: opts.clearcoatRoughness ?? .3, transmission: opts.transmission ?? 0, thickness: opts.thickness ?? 0, ior: opts.ior ?? 1.45, map: opts.map ?? null });
  const white = physical('#e4ebe8', { metalness: .08, clearcoat: .35, clearcoatRoughness: .3 });
  const metal = physical('#b6c1bb', { metalness: .8, roughness: .3, map: brushedTex });
  const dark = mat('#344b49', .35), teal = mat('#397d77', .15), glass = mat('#b2d6cf', .1, .12, .13), pink = mat('#e7a5b5', 0, .26, .62);
  const enclosureGlass = physical('#dcefe9', { transmission: .92, roughness: .05, metalness: 0, thickness: .06, ior: 1.45 });
  const mesh = (g, m, pos, parent = scene) => { const o = new THREE.Mesh(g, m); o.position.set(...pos); o.castShadow = m.opacity === 1; o.receiveShadow = true; parent.add(o); return o; };
  const box = (size, pos, m, parent, radius = 0) => mesh(radius > 0 ? new RoundedBoxGeometry(size[0], size[1], size[2], 2, Math.min(radius, Math.min(size[0], size[1], size[2]) / 2 - 1e-3)) : new THREE.BoxGeometry(...size), m, pos, parent);
  const cyl = (r, h, pos, m, parent, r2 = r) => mesh(new THREE.CylinderGeometry(r, r2, h, 40), m, pos, parent);
  const tube = (points, r, m, parent = scene) => {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const o = mesh(new THREE.TubeGeometry(curve, 40, r, 8, false), m, [0, 0, 0], parent);
    o.userData.curve = curve; return o;
  };
  const rod = (a, b, r, m, parent) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), d = end.clone().sub(start);
    const o = cyl(r, d.length(), start.clone().add(end).multiplyScalar(.5).toArray(), m, parent);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return o;
  };
  function label(text, pos, width = 1.8, parent = scene, color = '#37584d') {
    const c = document.createElement('canvas'); c.width = 512; c.height = 96;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#f5f8f1'; ctx.fillRect(0, 0, 512, 96); ctx.fillStyle = color;
    ctx.font = '600 31px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, 256, 59);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, toneMapped: false })); sprite.position.set(...pos); sprite.scale.set(width, width * 96 / 512, 1); parent.add(sprite); return sprite;
  }
  // Architectural context now lives in src/environment.js (lab parity preserved).
  // Incubator.
  const incubator = new THREE.Group(); incubator.position.set(-6, 0, -1.8); scene.add(incubator);
  box([2.25, 3.4, 1.9], [0, 1.6, 0], white, incubator, .07);
  box([1.95, 2.65, .12], [0, 1.48, 1], metal, incubator);
  box([1.65, 2.3, .03], [0, 1.5, 1.08], mat('#3e6760', .4, .25), incubator);
  for (const y of [.6, 1.2, 1.8, 2.4]) box([1.6, .03, .04], [0, y, 1.12], metal, incubator);
  box([.08, 1.7, .1], [.78, 1.5, 1.18], dark, incubator);
  const incubatorFallback = [...incubator.children];
  label('CULTURE INCUBATOR', [0, 3.04, 1.08], 1.8, incubator);
  label('CELL EXPANSION', [-5.4, .02, 2.7], 2.2);
  // Dishes with translucent walls and medium.
  function dish(x, z, radius = .72) {
    cyl(radius, .055, [x, .04, z], glass);
    const wall = mesh(new THREE.CylinderGeometry(radius, radius, .18, 64, 1, true), glass, [x, .14, z]); wall.material.side = THREE.DoubleSide;
    cyl(radius * .94, .035, [x, .09, z], pink);
    const rim = mesh(new THREE.TorusGeometry(radius, .024, 8, 64), glass, [x, .24, z]); rim.rotation.x = Math.PI / 2;
  }
  dish(-5.7, .7); dish(-4.1, 1.4, .57);
  const microscopeStart = new Set(scene.children);
  // Inverted microscope silhouette with stage, objectives and eyepieces.
  box([1.4, .15, 1.6], [-3.8, .06, -1.5], white);
  box([.38, 1.3, .55], [-3.8, .75, -2], white);
  box([1.3, .12, 1.1], [-3.8, .8, -1.4], dark);
  cyl(.24, .55, [-3.8, .39, -1.35], metal);
  const arm = rod([-3.8, 1.3, -2], [-3.8, 1.85, -1.4], .23, white);
  arm.name = 'microscope-arm';
  for (const x of [-4.02, -3.6]) rod([x, 1.7, -1.5], [x, 2, -.95], .12, dark);
  for (const x of [-4.04, -3.56]) {
    const knob = cyl(.15, .08, [x, .64, -1.98], dark); knob.rotation.z = Math.PI / 2;
  }
  for (let i = 0; i < 3; i++) cyl(.07, .24, [-4 + i * .19, .63, -1.35], metal);
  cyl(.2, .1, [-3.8, .9, -1.4], glass); label('INVERTED MICROSCOPE', [-3.8, .15, -.32], 1.9);
  const microscopeFallback = scene.children.filter(o => !microscopeStart.has(o) && !o.isSprite);
  const microscopeMount = new THREE.Group(); microscopeMount.position.set(-3.8, 0, -1.5); scene.add(microscopeMount);
  // Printer, transparent doors, rails, cartridge and build platform.
  const printer = new THREE.Group(); printer.position.set(.1, 0, -.6); scene.add(printer);
  box([3.7, .27, 3.4], [0, .07, 0], white, printer, .05);
  box([3.7, .38, 3.4], [0, 3.25, 0], white, printer, .05);
  box([3.6, 2.9, .14], [0, 1.7, -1.65], white, printer);
  box([3.3, .09, .06], [0, 2.95, 1.64], dark, printer);
  for (let x = -1.1; x <= 1.1; x += .22) box([.12, .018, .02], [x, 3.03, 1.68], metal, printer);
  for (const x of [-1.72, 1.72]) for (const z of [-1.55, 1.55]) box([.13, 3, .13], [x, 1.65, z], white, printer);
  const enclosure = new THREE.Group(); printer.add(enclosure);
  for (const x of [-1.78, 1.78]) box([.02, 2.85, 3], [x, 1.7, 0], enclosureGlass, enclosure);
  box([3.4, 2.85, .02], [0, 1.7, 1.57], enclosureGlass, enclosure);
  enclosure.children.forEach(o => { o.castShadow = false; });
  box([.06, .5, .07], [1.5, 1.6, 1.64], metal, enclosure);
  for (const z of [-.8, .9]) rod([-1.5, 2.7, z], [1.5, 2.7, z], .045, metal, printer);
  box([2.9, .12, 2.9], [0, .25, 0], metal, printer);
  for (const x of [-1.35, 1.35]) for (const z of [-1.35, 1.35]) cyl(.055, .025, [x, .325, z], dark, printer);
  label('EXTRUSION / VIRTUAL', [0, 3.25, 1.74], 2.45, printer);
  box([.8, .25, .03], [0, .08, 1.73], dark, printer);
  box([.55, .12, .035], [0, .09, 1.75], teal, printer);
  const head = new THREE.Group(); printer.add(head);
  box([.5, .35, .5], [0, 2.7, 0], dark, head);
  cyl(.15, .65, [0, 2.2, 0], glass, head);
  cyl(.1, .45, [0, 2.14, 0], pink, head);
  cyl(.15, .08, [0, 2.55, 0], teal, head);
  for (let y = 1.98; y <= 2.4; y += .1) box([.12, .012, .015], [.08, y, .13], dark, head);
  cyl(.1, .3, [0, 1.73, 0], metal, head, .025);
  label('ENCLOSED BIOPRINTER', [.1, .03, 2.05], 2.6);
  const staticPrinterParts = printer.children.filter(o => o !== head && !o.isSprite);
  // Perfusion circuit: closed geometric tubing loop, not a fluid solver.
  const pumpStart = new Set(scene.children);
  box([1.45, .65, 1.3], [4.8, .3, -.9], white, scene, .06);
  const rotor = cyl(.43, .12, [4.8, .7, -.9], dark);
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; cyl(.09, .07, [4.8 + Math.cos(a) * .28, .79, -.9 + Math.sin(a) * .28], metal); }
  const pumpFallback = scene.children.filter(o => !pumpStart.has(o));
  const pumpMount = new THREE.Group(); pumpMount.position.set(4.8, .03, -.9); scene.add(pumpMount);
  label('PERISTALTIC PUMP', [4.8, .22, .0], 1.75);
  cyl(.48, 1.25, [6.6, .65, -1.9], glass); cyl(.46, .7, [6.6, .4, -1.9], pink); cyl(.49, .12, [6.6, 1.32, -1.9], teal);
  label('RESERVOIR', [6.6, 1.7, -1.9], 1.4);
  const chamberStart = new Set(scene.children);
  box([2.3, .18, 2.3], [4.5, .12, 1.8], white);
  box([2, .65, 2], [4.5, .5, 1.8], glass);
  const chamberFallback = scene.children.filter(o => !chamberStart.has(o));
  const chamberMount = new THREE.Group(); chamberMount.position.set(4.5, .03, 1.8); scene.add(chamberMount);
  label('PERFUSION CHAMBER', [4.5, .05, 3], 2.2);
  tube([[6.6, 1.4, -1.9], [6.7, 1.9, -.9], [5.4, .9, -.9], [4.8, .9, -.9], [3.5, .25, .2], [3.4, .45, 1.8]], .035, pink);
  tube([[5.6, .45, 1.8], [6.3, .2, 1.4], [7, .3, -.6], [6.6, 1.4, -1.9]], .035, glass);
  const loader = new GLTFLoader();
  const equipment = createEquipmentAssets(EQUIPMENT_SPECS, {
    bioprinter: { parent: printer, fallback: staticPrinterParts },
    incubator: { parent: incubator, fallback: incubatorFallback },
    microscope: { parent: microscopeMount, fallback: microscopeFallback },
    'perfusion-chamber': { parent: chamberMount, fallback: chamberFallback },
    'perfusion-pump': { parent: pumpMount, fallback: pumpFallback },
  }, { load: url => loader.loadAsync(url) });
  // Refit the lab overview once real equipment replaces procedural fallbacks, unless the user is orbiting.
  equipment.ready.then(() => { if (!disposed && !userOrbited && currentView === 'lab') view('lab'); }).catch(() => {});
  let flowResult = null;
  // Tissue model re-parented by stage. Cell coordinates have a fixed seed.
  const construct = new THREE.Group(); scene.add(construct);
  const fibers = new THREE.Group(), cells = new THREE.Group(), vessels = new THREE.Group();
  construct.add(fibers, cells, vessels);
  const tissueMaterial = mat('#c28ca4', 0, .5, .43);
  const matrix = box([2.5, .65, 2.5], [0, .48, 0], tissueMaterial, construct);
  const cellMaterial = physical('#a86497', { roughness: .36, opacity: .72, clearcoat: .25 }), nucleusMaterial = mat('#583c70');
  const cellGeometry = new THREE.SphereGeometry(.06, 12, 8), nucleusGeometry = new THREE.SphereGeometry(.024, 8, 6);
  const cellInstances = new THREE.InstancedMesh(cellGeometry, cellMaterial, 360), nucleusInstances = new THREE.InstancedMesh(nucleusGeometry, nucleusMaterial, 360);
  cellInstances.instanceMatrix.setUsage(THREE.DynamicDrawUsage); nucleusInstances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  cells.add(nucleusInstances, cellInstances);
  const dishCells = new THREE.InstancedMesh(cellGeometry, cellMaterial, 140);
  dishCells.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(dishCells);
  const rng = random(42), positions = [], dishPositions = [];
  for (let i = 0; i < 360; i++) positions.push([(rng() - .5) * 2.4, .16 + rng() * .6, (rng() - .5) * 2.4]);
  for (let i = 0; i < 140; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * .64;
    dishPositions.push([-5.7 + Math.cos(a) * r, .12, .7 + Math.sin(a) * r]);
  }
  const instanceTransform = new THREE.Object3D();
  const tracers = [];
  for (const z of [-.68, 0, .68]) {
    const points = [[-1.48, .47, z], [-.7, .48, z + .1], [.2, .46, z - .1], [1.48, .47, z]];
    const v = tube(points, .075, mat('#b64d57', 0, .32, .8), vessels);
    for (let i = 0; i < 9; i++) tracers.push({ curve: v.userData.curve, channelId: `branch-${[-.68, 0, .68].indexOf(z)}`, phase: i / 9 });
  }
  const tracerInstances = new THREE.InstancedMesh(new THREE.SphereGeometry(.045, 8, 6), mat('#58c8b9'), tracers.length);
  tracerInstances.instanceMatrix.setUsage(THREE.DynamicDrawUsage); vessels.add(tracerInstances);
  tube([[-1.48, .47, -.68], [-1.6, .47, 0], [-1.48, .47, .68]], .09, mat('#b64d57'), vessels);
  tube([[1.48, .47, -.68], [1.6, .47, 0], [1.48, .47, .68]], .09, mat('#b64d57'), vessels);
  // Abstract recipient patch intentionally avoids anatomical/procedural instruction.
  const recipient = new THREE.Group(); recipient.position.set(0, .35, -.4); scene.add(recipient);
  box([4.4, .35, 3.7], [0, -.23, 0], mat('#c28b83'), recipient);
  box([4.4, .09, 3.7], [0, 0, 0], mat('#deb0a0'), recipient);
  label('HYPOTHETICAL RECIPIENT INTERFACE', [0, .15, 2.3], 3.8, recipient, '#92544f');
  const fiberMaterial = mat('#e8c2a0', .05, .5);
  let lineData = [], lastKey = '', currentStage = 0, currentView = 'lab', lastAspect = 0;
  const previousConstructPosition = new THREE.Vector3(), cameraShift = new THREE.Vector3();
  function disposeChildren(group) { while (group.children.length) { const c = group.children[0]; c.geometry?.dispose(); group.remove(c); } }
  function rebuild(p) {
    const key = `${p.layers}:${p.spacing}`; if (key === lastKey) return; lastKey = key;
    disposeChildren(fibers); lineData = scaffold(p);
    for (const line of lineData) rod(line.a, line.b, .04, fiberMaterial, fibers);
  }
  function expandVisibleBounds(box, object) {
    if (!object.visible) return;
    if (object.isMesh) box.expandByObject(object);
    for (const child of object.children) expandVisibleBounds(box, child);
  }
  /** Visible illustrative artwork only; the room/dome background and floating labels stay out of bounds. */
  function labArtworkBounds() {
    const box = new THREE.Box3();
    const background = environment.root();
    for (const child of scene.children) {
      if (child === background || !child.visible) continue;
      expandVisibleBounds(box, child);
    }
    if (box.isEmpty()) return null;
    return { min: box.min.toArray(), max: box.max.toArray() };
  }
  function view(name) {
    if (disposed) return;
    const aspect = canvas.clientHeight > 0 ? canvas.clientWidth / canvas.clientHeight : 1;
    const pose = getCameraPose(name, { stage: currentStage, constructPosition: construct.position.toArray(), aspect, bounds: name === 'lab' ? labArtworkBounds() : null });
    controls.target.fromArray(pose.target);
    camera.position.fromArray(pose.target).add(new THREE.Vector3(...pose.offset));
    currentView = name; previousConstructPosition.copy(construct.position);
    controls.maxDistance = Math.max(CAMERA_LIMITS.defaultMaxDistance, Math.hypot(...pose.offset) * 1.05);
    controls.update();
  }
  function update(s, p, reveal, clock) {
    if (disposed) return 0;
    if (presentationScale !== 'laboratory') return 0;
    if (prefersReducedMotion) clock = 0;
    const stageChanged = currentStage !== s.stage;
    environment.update(clock);
    rebuild(p); currentStage = s.stage;
    const visibleCount = Math.floor(lineData.length * s.printed);
    fibers.children.forEach((o, i) => { o.visible = i < visibleCount; });
    construct.visible = s.stage > 0;
    construct.position.set(s.stage === 3 ? 4.5 : .1, s.stage === 3 ? .25 : .35, s.stage === 3 ? 1.8 : -.6);
    construct.scale.setScalar(s.stage === 3 ? .63 : 1);
    if (s.stage === 4) construct.position.y = .45 + (1 - s.integration) * 1.3;
    if (currentView === 'lab') previousConstructPosition.copy(construct.position);
    else if (stageChanged) view(currentView);
    else {
      cameraShift.copy(construct.position).sub(previousConstructPosition);
      camera.position.add(cameraShift); controls.target.add(cameraShift); previousConstructPosition.copy(construct.position);
    }
    recipient.visible = s.stage === 4; printer.visible = s.stage !== 4;
    cells.visible = s.stage >= 2;
    const cellCount = Math.floor(360 * s.occupancy);
    cellInstances.count = cellCount; nucleusInstances.count = cellCount;
    if (cells.visible) {
      for (let i = 0; i < cellCount; i++) {
        const [x, y, z] = positions[i], snapped = Math.round(z / p.spacing) * p.spacing;
        instanceTransform.position.set(x, .15 + Math.min(p.layers - 1, Math.floor(y / .11)) * .11 + .04, z + (snapped - z) * Math.min(1, s.occupancy));
        instanceTransform.scale.set(1, 1, 1); instanceTransform.updateMatrix();
        cellInstances.setMatrixAt(i, instanceTransform.matrix); nucleusInstances.setMatrixAt(i, instanceTransform.matrix);
      }
      cellInstances.instanceMatrix.needsUpdate = true; nucleusInstances.instanceMatrix.needsUpdate = true;
    }
    dishCells.count = Math.floor(140 * s.expansion * p.population);
    for (let i = 0; i < dishCells.count; i++) {
      instanceTransform.position.set(...dishPositions[i]); instanceTransform.scale.set(.45, .14, .45); instanceTransform.updateMatrix();
      dishCells.setMatrixAt(i, instanceTransform.matrix);
    }
    dishCells.instanceMatrix.needsUpdate = true;
    matrix.visible = s.stage >= 2 && !reveal; matrix.scale.y = Math.max(.02, s.occupancy);
    vessels.visible = s.stage >= 3 && p.channels;
    let tracerCount = 0;
    for (const t of tracers) {
      const flow = flowResult?.status === 'solved' ? Math.abs(flowResult.edgeFlows.find(e => e.id === t.channelId)?.flow || 0) : flowResult ? 0 : s.flow;
      if (s.flow <= 0 || flow <= 0) continue;
      instanceTransform.position.copy(t.curve.getPoint((t.phase + clock * flow * .6) % 1)); instanceTransform.scale.set(1, 1, 1); instanceTransform.updateMatrix();
      tracerInstances.setMatrixAt(tracerCount++, instanceTransform.matrix);
    }
    tracerInstances.count = tracerCount; tracerInstances.instanceMatrix.needsUpdate = true;
    enclosure.visible = !reveal && equipment.diagnostics().bioprinter.status !== 'loaded';
    equipment.setReveal(reveal);
    const line = lineData[Math.min(visibleCount, lineData.length - 1)];
    if (line && s.stage === 1) { head.position.set(line.a[0] + (line.b[0] - line.a[0]) * ((s.progress * lineData.length) % 1), line.a[1] - 1.2, line.a[2] + (line.b[2] - line.a[2]) * ((s.progress * lineData.length) % 1)); }
    else head.position.set(1.25, .1, -1.1);
    rotor.rotation.y = clock * s.flow;
    return visibleCount;
  }
  function draw() {
    if (disposed) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const aspect = w / h;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) renderer.setSize(w, h, false);
    if (Math.abs(aspect - lastAspect) > 1e-6) {
      camera.aspect = aspect; camera.updateProjectionMatrix();
      if (lastAspect) view(currentView);
      lastAspect = aspect;
    }
    hideLabForPresentation();
    controls.update(); renderer.render(scene, camera);
    magnifiedViewport.renderInset();
    renderedFrames++;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    environment.dispose(); equipment.dispose();
    presentationOverlays.dispose(); presentation.dispose();
    magnifiedViewport.dispose();
    disposeObjectResources(scene);
    environmentTexture.dispose(); scene.environment = null;
    sun.shadow.map?.dispose(); sun.shadow.map = null;
    controls.dispose(); renderer.renderLists.dispose(); renderer.dispose();
  }
  const presentation = createScientificViews({ THREE, parent: scene });
  const presentationOverlays = createScientificOverlays({ THREE, parent: presentation.group });
  const constructBounds = () => {
    const box = new THREE.Box3().setFromObject(construct);
    if (box.isEmpty()) return { min: [-1, 0, -1], max: [1, 1.2, 1] };
    return { min: box.min.toArray(), max: box.max.toArray() };
  };
  const magnifiedViewport = createMagnifiedViewport({ THREE, renderer, scene, getBounds: constructBounds, getQuality: () => quality });
  let presentationScale = 'laboratory';
  const hiddenLabObjects = new Map();
  function hideLabForPresentation() {
    if (presentationScale === 'laboratory') return;
    for (const child of scene.children) {
      if (child === presentation.group || child.isLight || child === camera) continue;
      if (child.visible) { hiddenLabObjects.set(child, child.visible); child.visible = false; }
    }
  }
  function setPresentationScale(scale) {
    const spec = presentation.setScale(scale);
    presentationScale = scale;
    if (scale === 'laboratory') {
      for (const [child, visible] of hiddenLabObjects) child.visible = visible;
      hiddenLabObjects.clear();
      view(currentView);
    } else {
      hideLabForPresentation();
      const aspect = canvas.clientHeight > 0 ? canvas.clientWidth / canvas.clientHeight : 1;
      const pose = fitCameraToBounds(presentation.bounds(), { aspect, fovDegrees: CAMERA_LIMITS.fovDegrees, padding: 1.2 });
      controls.target.fromArray(pose.target);
      camera.position.fromArray(pose.target).add(new THREE.Vector3(...pose.offset));
      controls.maxDistance = Math.max(CAMERA_LIMITS.defaultMaxDistance, Math.hypot(...pose.offset) * 1.05);
      controls.update();
    }
    return spec;
  }
  view('lab');
  return { update, draw, view, setQuality, presentation: { setScale: setPresentationScale, setOverlay: (id, data) => presentationOverlays.setOverlay(id, data), clearOverlays: () => presentationOverlays.clear(), legend: () => presentationOverlays.getLegend(), scale: () => presentationScale }, setEnvironment: id => environment.setEnvironment(id), setMagnified: on => magnifiedViewport.setEnabled(on), setFlowResult(result) { flowResult = result; }, dispose, diagnostics: () => ({ webgl: true, disposed, renderedFrames, quality, pixelRatio: renderer.getPixelRatio(), shadowMapSize: sun.shadow.mapSize.x, reducedMotion: prefersReducedMotion, stage: currentStage, cameraMode: currentView, cameraPosition: camera.position.toArray(), cameraTarget: controls.target.toArray(), presentationScale, activeOverlays: presentationOverlays.active(), instances: { constructCells: 360, dishCells: 140, tracers: tracers.length }, filamentCount: lineData.length, geometries: renderer.info.memory.geometries, calls: renderer.info.render.calls, environment: environment.diagnostics(), textures: renderer.info.memory.textures, printerAsset: ({ loading: 'procedural', loaded: 'glb-loaded', fallback: 'procedural-fallback' })[equipment.diagnostics().bioprinter.status], equipment: equipment.diagnostics(), printheadPosition: head.position.toArray(), tracerModel: flowResult ? 'network-relative-illustration' : 'scripted', magnified: magnifiedViewport.diagnostics() }) };
}
