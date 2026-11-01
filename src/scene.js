import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { random, scaffold } from './model.js';

export function createLab(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e0e8e3');
  scene.fog = new THREE.Fog('#e0e8e3', 22, 55);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  pmrem.dispose();
  scene.environmentIntensity = .45;
  const camera = new THREE.PerspectiveCamera(38, 1, .05, 100);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.minDistance = 2.5;
  controls.maxDistance = 29;
  controls.maxPolarAngle = Math.PI * .49;
  scene.add(new THREE.HemisphereLight('#ffffff', '#8a9686', 1.9));
  const sun = new THREE.DirectionalLight('#fff7e9', 3.6);
  sun.position.set(-4, 12, 7); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 10, bottom: -10 });
  sun.shadow.bias = -.0005; scene.add(sun);
  const fill = new THREE.DirectionalLight('#d8eff1', 1.5); fill.position.set(6, 5, -5); scene.add(fill);
  function proceduralTexture(kind) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const ctx = c.getContext('2d');
    if (kind === 'speckle') {
      ctx.fillStyle = '#f0f2ea'; ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 1100; i++) { ctx.fillStyle = `rgba(${130 + Math.random() * 50 | 0},${145 + Math.random() * 35 | 0},${130 + Math.random() * 35 | 0},${.04 + Math.random() * .09})`; ctx.beginPath(); ctx.arc(Math.random() * 256, Math.random() * 256, .4 + Math.random() * 1.7, 0, 7); ctx.fill(); }
    } else if (kind === 'brushed') {
      ctx.fillStyle = '#c3ccc7'; ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 260; i++) { const y = Math.random() * 256; ctx.strokeStyle = `rgba(255,255,255,${Math.random() * .08})`; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke(); ctx.strokeStyle = `rgba(55,66,60,${Math.random() * .06})`; ctx.beginPath(); ctx.moveTo(0, y + .7); ctx.lineTo(256, y + .7); ctx.stroke(); }
    } else {
      ctx.fillStyle = '#dce4dc'; ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = 'rgba(116,132,120,.4)'; ctx.lineWidth = 1.5;
      for (let i = 0; i <= 256; i += 64) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke(); }
    }
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return tex;
  }
  const speckleTex = proceduralTexture('speckle'); speckleTex.repeat.set(5, 2.5);
  const brushedTex = proceduralTexture('brushed');
  const floorTex = proceduralTexture('floor-grid'); floorTex.repeat.set(24, 24);
  const mat = (color, metalness = 0, roughness = .45, opacity = 1) => new THREE.MeshStandardMaterial({ color, metalness, roughness, transparent: opacity < 1, opacity, depthWrite: opacity === 1 });
  const physical = (color, opts = {}) => new THREE.MeshPhysicalMaterial({ color, metalness: opts.metalness ?? 0, roughness: opts.roughness ?? .45, transparent: (opts.opacity ?? 1) < 1, opacity: opts.opacity ?? 1, depthWrite: (opts.opacity ?? 1) === 1, clearcoat: opts.clearcoat ?? 0, clearcoatRoughness: opts.clearcoatRoughness ?? .3, transmission: opts.transmission ?? 0, thickness: opts.thickness ?? 0, ior: opts.ior ?? 1.45, map: opts.map ?? null });
  const white = physical('#eef0e9', { metalness: .08, clearcoat: .4, clearcoatRoughness: .3 });
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
    ctx.font = '500 27px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, 256, 58);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex })); sprite.position.set(...pos); sprite.scale.set(width, width * 96 / 512, 1); parent.add(sprite); return sprite;
  }
  // Architectural context and original generic lab furniture.
  box([60, .15, 60], [0, -2.1, 0], physical('#eef2ec', { map: floorTex, roughness: .85, metalness: .02 }));
  box([16, .25, 7], [0, -.3, 0], physical('#c8d0ca', { roughness: .6, metalness: .15, clearcoat: .2 }));
  box([16.1, .08, 7.1], [0, -.13, 0], physical('#f4f6ef', { map: speckleTex, roughness: .5, metalness: .05, clearcoat: .18 }));
  for (const x of [-7, 0, 7]) for (const z of [-2.7, 2.7]) box([.16, 1.65, .16], [x, -1.2, z], metal);
  box([16, 4, .15], [0, 1.7, -3.6], mat('#d8e2d8'));
  box([16, .08, .7], [0, 3.3, -3.35], white);
  for (let x = -7; x <= 7; x += 2) box([1.6, .02, .1], [x, 3.24, -3], mat('#faffea'));
  // Generic service panel, splashback and cabinet faces add material scale cues.
  box([15.9, .08, .12], [0, .1, -3.35], metal);
  for (let x = -6.4; x <= 6.4; x += 3.2) {
    box([2.85, 1.3, .06], [x, -1.18, 2.75], white);
    box([.8, .035, .07], [x, -.78, 2.8], metal);
  }
  for (const x of [-7, -3, 1, 5]) {
    box([.55, .42, .05], [x, .65, -3.48], white);
    for (const dx of [-.14, .14]) box([.08, .12, .02], [x + dx, .65, -3.44], dark);
  }
  // Incubator.
  const incubator = new THREE.Group(); incubator.position.set(-6, 0, -1.8); scene.add(incubator);
  box([2.25, 3.4, 1.9], [0, 1.6, 0], white, incubator, .07);
  box([1.95, 2.65, .12], [0, 1.48, 1], metal, incubator);
  box([1.65, 2.3, .03], [0, 1.5, 1.08], mat('#3e6760', .4, .25), incubator);
  for (const y of [.6, 1.2, 1.8, 2.4]) box([1.6, .03, .04], [0, y, 1.12], metal, incubator);
  box([.08, 1.7, .1], [.78, 1.5, 1.18], dark, incubator);
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
  // Blender-authored static printer body (assets/author_bioprinter.py). The
  // procedural housing stays as the fallback and while loading; the animated
  // printhead always remains procedural so deposition still moves it.
  let assetStatus = 'procedural';
  const staticPrinterParts = printer.children.filter(o => o !== head);
  const glbGlass = [];
  new GLTFLoader().load('./assets/bioprinter.glb', gltf => {
    gltf.scene.traverse(o => {
      if (!o.isMesh) return;
      o.receiveShadow = true;
      o.castShadow = true;
      if (o.name.includes('Glass')) { o.castShadow = false; glbGlass.push(o); }
    });
    staticPrinterParts.forEach(o => { o.visible = false; });
    printer.add(gltf.scene);
    assetStatus = 'glb-loaded';
  }, undefined, () => { assetStatus = 'procedural-fallback'; });
  // Perfusion circuit: closed geometric tubing loop, not a fluid solver.
  box([1.45, .65, 1.3], [4.8, .3, -.9], white, scene, .06);
  const rotor = cyl(.43, .12, [4.8, .7, -.9], dark);
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; cyl(.09, .07, [4.8 + Math.cos(a) * .28, .79, -.9 + Math.sin(a) * .28], metal); }
  label('PERISTALTIC PUMP', [4.8, .22, .0], 1.75);
  cyl(.48, 1.25, [6.6, .65, -1.9], glass); cyl(.46, .7, [6.6, .4, -1.9], pink); cyl(.49, .12, [6.6, 1.32, -1.9], teal);
  label('RESERVOIR', [6.6, 1.7, -1.9], 1.4);
  box([2.3, .18, 2.3], [4.5, .12, 1.8], white);
  box([2, .65, 2], [4.5, .5, 1.8], glass);
  label('PERFUSION CHAMBER', [4.5, .05, 3], 2.2);
  tube([[6.6, 1.4, -1.9], [6.7, 1.9, -.9], [5.4, .9, -.9], [4.8, .9, -.9], [3.5, .25, .2], [3.4, .45, 1.8]], .035, pink);
  tube([[5.6, .45, 1.8], [6.3, .2, 1.4], [7, .3, -.6], [6.6, 1.4, -1.9]], .035, glass);
  // Tissue model re-parented by stage. Cell coordinates have a fixed seed.
  const construct = new THREE.Group(); scene.add(construct);
  const fibers = new THREE.Group(), cells = new THREE.Group(), vessels = new THREE.Group();
  construct.add(fibers, cells, vessels);
  const tissueMaterial = mat('#c28ca4', 0, .5, .43);
  const matrix = box([2.5, .65, 2.5], [0, .48, 0], tissueMaterial, construct);
  const cellMaterial = mat('#a56798', 0, .43), nucleusMaterial = mat('#694777');
  const cellGeometry = new THREE.SphereGeometry(.052, 10, 8), nucleusGeometry = new THREE.SphereGeometry(.023, 8, 6);
  const rng = random(42), positions = [];
  for (let i = 0; i < 360; i++) {
    const pos = [(rng() - .5) * 2.4, .16 + rng() * .6, (rng() - .5) * 2.4]; positions.push(pos);
    mesh(cellGeometry, cellMaterial, pos, cells); mesh(nucleusGeometry, nucleusMaterial, pos, cells);
  }
  const dishCells = new THREE.Group(); scene.add(dishCells);
  for (let i = 0; i < 140; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * .64;
    const o = mesh(cellGeometry, cellMaterial, [-5.7 + Math.cos(a) * r, .12, .7 + Math.sin(a) * r], dishCells); o.scale.set(.45, .14, .45);
  }
  const tracers = [];
  for (const z of [-.68, 0, .68]) {
    const points = [[-1.48, .47, z], [-.7, .48, z + .1], [.2, .46, z - .1], [1.48, .47, z]];
    const v = tube(points, .075, mat('#b64d57', 0, .32, .8), vessels);
    for (let i = 0; i < 9; i++) tracers.push({ object: mesh(new THREE.SphereGeometry(.04, 8, 6), mat('#6bd5c6'), [0, 0, 0], vessels), curve: v.userData.curve, phase: i / 9 });
  }
  tube([[-1.48, .47, -.68], [-1.6, .47, 0], [-1.48, .47, .68]], .09, mat('#b64d57'), vessels);
  tube([[1.48, .47, -.68], [1.6, .47, 0], [1.48, .47, .68]], .09, mat('#b64d57'), vessels);
  // Abstract recipient patch intentionally avoids anatomical/procedural instruction.
  const recipient = new THREE.Group(); recipient.position.set(0, .35, -.4); scene.add(recipient);
  box([4.4, .35, 3.7], [0, -.23, 0], mat('#c28b83'), recipient);
  box([4.4, .09, 3.7], [0, 0, 0], mat('#deb0a0'), recipient);
  label('HYPOTHETICAL RECIPIENT INTERFACE', [0, .15, 2.3], 3.8, recipient, '#92544f');
  const fiberMaterial = mat('#e8c2a0', .05, .5);
  let lineData = [], lastKey = '', currentStage = 0;
  function disposeChildren(group) { while (group.children.length) { const c = group.children[0]; c.geometry?.dispose(); group.remove(c); } }
  function rebuild(p) {
    const key = `${p.layers}:${p.spacing}`; if (key === lastKey) return; lastKey = key;
    disposeChildren(fibers); lineData = scaffold(p);
    for (const line of lineData) rod(line.a, line.b, .04, fiberMaterial, fibers);
  }
  function view(name) {
    if (name === 'lab') { camera.position.set(14, 11, 17); controls.target.set(0, .7, 0); }
    else {
      const target = construct.position.clone().add(new THREE.Vector3(0, .3, 0));
      if (name === 'top') camera.position.copy(target).add(new THREE.Vector3(.01, 8, .01));
      else camera.position.copy(target).add(new THREE.Vector3(4.5, 3.5, 5));
      controls.target.copy(target);
    }
    controls.update();
  }
  function update(s, p, reveal, clock) {
    rebuild(p); currentStage = s.stage;
    const visibleCount = Math.floor(lineData.length * s.printed);
    fibers.children.forEach((o, i) => { o.visible = i < visibleCount; });
    construct.visible = s.stage > 0;
    construct.position.set(s.stage === 3 ? 4.5 : .1, s.stage === 3 ? .25 : .35, s.stage === 3 ? 1.8 : -.6);
    construct.scale.setScalar(s.stage === 3 ? .63 : 1);
    if (s.stage === 4) construct.position.y = .45 + (1 - s.integration) * 1.3;
    recipient.visible = s.stage === 4; printer.visible = s.stage !== 4;
    cells.visible = s.stage >= 2;
    cells.children.forEach((o, i) => {
      const idx = Math.floor(i / 2); o.visible = idx < Math.floor(360 * s.occupancy);
      if (o.visible) { const [x, y, z] = positions[idx]; const snapped = Math.round(z / p.spacing) * p.spacing;
        o.position.set(x, .15 + Math.min(p.layers - 1, Math.floor(y / .11)) * .11 + .04, z + (snapped - z) * Math.min(1, s.occupancy)); }
    });
    dishCells.children.forEach((o, i) => { o.visible = i < 140 * s.expansion * p.population; });
    matrix.visible = s.stage >= 2 && !reveal; matrix.scale.y = Math.max(.02, s.occupancy);
    vessels.visible = s.stage >= 3 && p.channels;
    tracers.forEach(t => { t.object.visible = s.flow > 0; t.object.position.copy(t.curve.getPoint((t.phase + clock * s.flow * .2) % 1)); });
    enclosure.visible = !reveal && assetStatus !== 'glb-loaded';
    glbGlass.forEach(o => { o.visible = !reveal; });
    const line = lineData[Math.min(visibleCount, lineData.length - 1)];
    if (line && s.stage === 1) { head.position.set(line.a[0] + (line.b[0] - line.a[0]) * ((s.progress * lineData.length) % 1), line.a[1] - 1.2, line.a[2] + (line.b[2] - line.a[2]) * ((s.progress * lineData.length) % 1)); }
    else head.position.set(1.25, .1, -1.1);
    rotor.rotation.y = clock * s.flow;
    return visibleCount;
  }
  function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    controls.update(); renderer.render(scene, camera);
  }
  view('lab');
  return { update, draw, view, diagnostics: () => ({ webgl: true, stage: currentStage, filamentCount: lineData.length, geometries: renderer.info.memory.geometries, calls: renderer.info.render.calls, environment: 'room-pmrem', textures: renderer.info.memory.textures, printerAsset: assetStatus }) };
}