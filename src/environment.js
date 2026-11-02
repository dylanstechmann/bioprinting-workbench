/** Original procedural environments. The fictional theme is fan-inspired and unofficial; no third-party or show assets are used. */
export const ENVIRONMENT_IDS = ['lab', 'treedome'];
const FICTION_ATTRIBUTION = 'Original fan-inspired artwork. The Treedome theme references the fictional Sandy Cheeks setting from SpongeBob SquarePants (Nickelodeon). Unofficial, not affiliated with or endorsed by the creators; no show frames, models, music or logos are used; the theme supplies no biological parameters.';
export function getEnvironmentSpecs() {
  return structuredClone([
    { id: 'lab', label: 'Laboratory', description: 'Neutral procedural laboratory room hosting the same bench, equipment and construct in every theme.', attribution: 'Original procedural artwork; no third-party environment assets.', fictional: false, presetBounds: { center: [0, 0.7, 0], radius: 30 } },
    { id: 'treedome', label: 'Treedome (fictional, fan-inspired)', description: 'Original procedural underwater dome: sandy floor, a tree with a small treehouse room, grass tufts and drifting bubbles. Presentation only.', attribution: FICTION_ATTRIBUTION, fictional: true, presetBounds: { center: [0, 0.7, 0], radius: 30 } },
  ]);
}
export function validateEnvironmentId(id) { if (!ENVIRONMENT_IDS.includes(id)) throw new RangeError('Unknown environment'); return id; }

export function createEnvironment({ THREE, scene, reducedMotion = false }) {
  if (!THREE || !scene) throw new TypeError('createEnvironment needs THREE and a parent scene');
  const geometries = [], materials = [], textures = [], objects = [];
  let current = null, group = null, bubbles = [], disposed = false;
  const hasDocument = typeof document !== 'undefined';
  function canvasTexture(painter) {
    if (!hasDocument) return null;
    const c = document.createElement('canvas'); c.width = c.height = 256;
    painter(c.getContext('2d'));
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    textures.push(tex); return tex;
  }
  const physical = (color, opts = {}) => {
    const m = new THREE.MeshPhysicalMaterial({ color, metalness: opts.metalness ?? 0, roughness: opts.roughness ?? .45, transparent: (opts.opacity ?? 1) < 1, opacity: opts.opacity ?? 1, depthWrite: (opts.opacity ?? 1) === 1, clearcoat: opts.clearcoat ?? 0, clearcoatRoughness: opts.clearcoatRoughness ?? .3, map: opts.map ?? null });
    materials.push(m); return m;
  };
  const standard = (color, opts = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, metalness: opts.metalness ?? 0, roughness: opts.roughness ?? .8, map: opts.map ?? null, transparent: (opts.opacity ?? 1) < 1, opacity: opts.opacity ?? 1, side: opts.side ?? THREE.FrontSide });
    materials.push(m); return m;
  };
  function mesh(geometry, material, pos, parent) {
    geometries.push(geometry);
    const o = new THREE.Mesh(geometry, material);
    if (pos) o.position.set(...pos);
    o.castShadow = material.opacity === 1; o.receiveShadow = true;
    (parent ?? group).add(o); objects.push(o); return o;
  }
  const boxMesh = (size, pos, material, parent) => mesh(new THREE.BoxGeometry(...size), material, pos, parent);
  const cylMesh = (r, h, pos, material, parent, r2 = r) => mesh(new THREE.CylinderGeometry(r, r2, h, 40), material, pos, parent);
  // Extracted from the pre-0.8 scene room; identical geometry, materials and layout for lab parity.
  function buildLabContext(parent) {
    const floorTex = canvasTexture(ctx => {
      ctx.fillStyle = '#dce4dc'; ctx.fillRect(0, 0, 256, 256); ctx.strokeStyle = 'rgba(116,132,120,.4)'; ctx.lineWidth = 1.5;
      for (let i = 0; i <= 256; i += 64) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke(); }
    });
    if (floorTex) floorTex.repeat.set(24, 24);
    const speckleTex = canvasTexture(ctx => {
      ctx.fillStyle = '#f0f2ea'; ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 1100; i++) { ctx.fillStyle = `rgba(${130 + Math.random() * 50 | 0},${145 + Math.random() * 35 | 0},${130 + Math.random() * 35 | 0},${.04 + Math.random() * .09})`; ctx.beginPath(); ctx.arc(Math.random() * 256, Math.random() * 256, .4 + Math.random() * 1.7, 0, 7); ctx.fill(); }
    });
    if (speckleTex) speckleTex.repeat.set(5, 2.5);
    const brushedTex = canvasTexture(ctx => {
      ctx.fillStyle = '#c3ccc7'; ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 260; i++) { const y = Math.random() * 256; ctx.strokeStyle = `rgba(255,255,255,${Math.random() * .08})`; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke(); ctx.strokeStyle = `rgba(55,66,60,${Math.random() * .06})`; ctx.beginPath(); ctx.moveTo(0, y + .7); ctx.lineTo(256, y + .7); ctx.stroke(); }
    });
    const white = physical('#eef0e9', { metalness: .08, clearcoat: .4, clearcoatRoughness: .3 });
    const metal = physical('#b6c1bb', { metalness: .8, roughness: .3, map: brushedTex });
    const mat = (color, metalness = 0, roughness = .45, opacity = 1) => standard(color, { metalness, roughness, opacity });
    boxMesh([60, .15, 60], [0, -2.1, 0], physical('#eef2ec', { map: floorTex, roughness: .85, metalness: .02 }));
    boxMesh([16, .25, 7], [0, -.3, 0], physical('#c8d0ca', { roughness: .6, metalness: .15, clearcoat: .2 }));
    boxMesh([16.1, .08, 7.1], [0, -.13, 0], physical('#f4f6ef', { map: speckleTex, roughness: .5, metalness: .05, clearcoat: .18 }));
    for (const x of [-7, 0, 7]) for (const z of [-2.7, 2.7]) boxMesh([.16, 1.65, .16], [x, -1.2, z], metal);
    boxMesh([16, 4, .15], [0, 1.7, -3.6], mat('#d8e2d8'));
    boxMesh([16, .08, .7], [0, 3.3, -3.35], white);
    for (let x = -7; x <= 7; x += 2) boxMesh([1.6, .02, .1], [x, 3.24, -3], mat('#faffea'));
    boxMesh([15.9, .08, .12], [0, .1, -3.35], metal);
    for (let x = -6.4; x <= 6.4; x += 3.2) {
      boxMesh([2.85, 1.3, .06], [x, -1.18, 2.75], white);
      boxMesh([.8, .035, .07], [x, -.78, 2.8], metal);
    }
    for (const x of [-7, -3, 1, 5]) {
      boxMesh([.55, .42, .05], [x, .65, -3.48], white);
      for (const dx of [-.14, .14]) boxMesh([.08, .12, .02], [x + dx, .65, -3.44], mat('#344b49', .35));
    }
    return { background: '#e0e8e3', fog: ['#e0e8e3', 22, 55] };
  }
  // Original fan-inspired Treedome: deterministic procedural geometry only, no show assets.
  function buildTreedomeContext(parent) {
    const sandTex = canvasTexture(ctx => {
      ctx.fillStyle = '#e8d9b0'; ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 1600; i++) { ctx.fillStyle = `rgba(${190 + Math.random() * 50 | 0},${170 + Math.random() * 40 | 0},${120 + Math.random() * 40 | 0},${.06 + Math.random() * .12})`; ctx.beginPath(); ctx.arc(Math.random() * 256, Math.random() * 256, .4 + Math.random() * 1.4, 0, 7); ctx.fill(); }
    });
    if (sandTex) sandTex.repeat.set(18, 18);
    const glass = physical('#bfe8f2', { opacity: .16, roughness: .05, metalness: 0 });
    glass.side = THREE.DoubleSide;
    const shell = mesh(new THREE.SphereGeometry(24, 48, 32), glass, [0, -1.5, 0], parent);
    shell.castShadow = false;
    const rim = mesh(new THREE.TorusGeometry(24, .32, 12, 64), physical('#7fa8b5', { metalness: .6, roughness: .35 }), [0, -1.5, 0], parent);
    rim.rotation.x = Math.PI / 2;
    boxMesh([80, .4, 80], [0, -2.25, 0], standard('#e8d9b0', { map: sandTex, roughness: .95 }));
    // Tree with treehouse room, off to the side of the working area.
    const trunk = standard('#7a5a3d', { roughness: .8 });
    cylMesh(.5, 7, [-12, 1.25, -7.5], trunk, parent, .75);
    cylMesh(.14, 3.4, [-11.3, 4.6, -7.1], trunk, parent);
    const leaf = standard('#4c8a4f', { roughness: .7 });
    for (const [x, y, z, r] of [[-12, 7.6, -7.5, 2.6], [-13.6, 6.6, -8.2, 1.7], [-10.6, 6.4, -6.8, 1.6], [-12, 8.9, -8.4, 1.3]]) mesh(new THREE.IcosahedronGeometry(r, 1), leaf, [x, y, z], parent);
    boxMesh([2.1, 2, 2.1], [-11.3, 3.9, -7.1], standard('#c9a86d', { roughness: .75 }), parent);
    for (let i = 0; i < 6; i++) boxMesh([.5, .05, .05], [-11.3, 2.2 + i * .28, -6.0], trunk, parent);
    // Deterministic grass tufts and rocks inside the dome, clear of the bench area.
    let seed = 9;
    const rand = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    const grass = standard('#6da55f', { roughness: .85 });
    const rock = standard('#9b8d7b', { roughness: .9 });
    for (let i = 0; i < 90; i++) {
      const a = rand() * Math.PI * 2, r = 4 + rand() * 18;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x) < 9.5 && z > -4.5 && z < 4.5) continue;
      if (i % 6 === 0) mesh(new THREE.IcosahedronGeometry(.18 + rand() * .22, 0), rock, [x, -1.95, z], parent);
      else cylMesh(.05 + rand() * .04, .3 + rand() * .35, [x, -1.85, z], grass, parent, .001);
    }
    // Drifting bubbles for the underwater feel; static under reduced motion.
    const bubbleMat = physical('#d9f2fa', { opacity: .3, roughness: .1, metalness: 0 });
    for (let i = 0; i < 14; i++) {
      const a = rand() * Math.PI * 2, r = 6 + rand() * 15;
      const o = mesh(new THREE.SphereGeometry(.1 + rand() * .18, 10, 8), bubbleMat, [Math.cos(a) * r, -1.8, Math.sin(a) * r], parent);
      o.castShadow = false;
      bubbles.push({ object: o, baseY: o.position.y, speed: .25 + rand() * .5, range: 4 + rand() * 5 });
    }
    return { background: '#8fc7dd', fog: ['#8fc7dd', 26, 62] };
  }
  function disposeOwnedResources() {
    if (group) { scene.remove(group); group = null; }
    bubbles = [];
    for (const g of geometries.splice(0)) g.dispose();
    for (const m of materials.splice(0)) m.dispose();
    for (const t of textures.splice(0)) t.dispose();
    objects.splice(0);
  }
  function setEnvironment(id) {
    if (disposed) throw new Error('Environment disposed');
    validateEnvironmentId(id);
    disposeOwnedResources();
    group = new THREE.Group(); scene.add(group); objects.push(group);
    const look = id === 'lab' ? buildLabContext(group) : buildTreedomeContext(group);
    scene.background = new THREE.Color(look.background);
    scene.fog = new THREE.Fog(look.fog[0], look.fog[1], look.fog[2]);
    current = id;
  }
  function update(clock = 0, opts = {}) {
    if (disposed || current !== 'treedome' || (opts.reducedMotion ?? reducedMotion)) return;
    for (const b of bubbles) b.object.position.y = b.baseY + ((b.baseY + clock * b.speed) % b.range) - b.range / 2;
  }
  function diagnostics() { return { id: current, ownedObjects: objects.length, ownedGeometries: geometries.length, ownedMaterials: materials.length, ownedTextures: textures.length, reducedMotion: !!reducedMotion, fictional: current === 'treedome' }; }
  function dispose() { if (!disposed) { disposeOwnedResources(); scene.background = null; scene.fog = null; current = null; disposed = true; } }
  return { setEnvironment, update, diagnostics, dispose };
}