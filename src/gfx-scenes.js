// ============================================================
//  Szenen: Heldenhalle (Start/Charakter), Arena, Trainingshof
// ============================================================
const VIEWS = { showcase: null, arena: null, training: null };

function addStdLights(scene, o) {
  const hemi = new THREE.HemisphereLight(o.sky, o.ground, o.hemi);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(o.key, o.keyI);
  key.position.set(...(o.keyPos || [-4, 8, 6]));
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  const sc = key.shadow.camera; sc.left = -9; sc.right = 9; sc.top = 7; sc.bottom = -4; sc.near = 1; sc.far = 30;
  key.shadow.bias = -0.0008; key.shadow.normalBias = 0.02;
  scene.add(key);
  if (o.rim) { const rim = new THREE.DirectionalLight(o.rim, o.rimI || 1); rim.position.set(3, 4, -6); scene.add(rim); }
  return { hemi, key };
}
function gradientBackdrop(scene, top, bottom, z = -30, w = 140, h = 60, y = 10) {
  const geo = new THREE.PlaneGeometry(w, h, 1, 8);
  const cols = []; const ct = new THREE.Color(top), cb = new THREE.Color(bottom), c = new THREE.Color();
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = (p.getY(i) + h / 2) / h; c.copy(cb).lerp(ct, Math.pow(k, 0.8)); cols.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const m = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, depthWrite: false });
  const o = new THREE.Mesh(geo, m); o.position.set(0, y, z); o.renderOrder = -1;
  scene.add(o); return o;
}

// ---------- Heldenhalle ----------
function buildShowcase() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x10151c);
  scene.fog = new THREE.Fog(0x10151c, 7, 18);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  addStdLights(scene, { sky: 0xb4c6e4, ground: 0x2a2420, hemi: 1.0, key: 0xfff0dc, keyI: 2.2, keyPos: [-3, 6, 5], rim: 0x7fa8ff, rimI: 2.2 });
  gradientBackdrop(scene, 0x0c1118, 0x2a2420, -14, 60, 30, 6);
  // Boden
  const floor = mesh(G.cyl(9, 9, 0.2, 24), M(0x2a2826, { r: 0.95 }), 0, -0.1, 0, scene);
  floor.receiveShadow = true;
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2;
    const t = mesh(G.box(1.1, 0.04, 0.6), M(i % 2 ? 0x34302c : 0x2e2b28, { r: 0.95 }), Math.cos(a) * 2.6, 0.01, Math.sin(a) * 2.6, scene);
    t.rotation.y = -a;
  }
  // Sockel mit Runenring
  mesh(G.cyl(1.0, 1.15, 0.28, 6), M(0x4a4640, { r: 0.85 }), 0, 0.14, 0, scene);
  mesh(G.cyl(0.92, 0.92, 0.04, 6), M(0x5a554e, { r: 0.8 }), 0, 0.3, 0, scene);
  const rune = mesh(G.tor(0.82, 0.014, 4, 48), glowM(0xffa84a, 1.6), 0, 0.33, 0, scene, false); rune.rotation.x = Math.PI / 2;
  const runes = [];
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + Math.PI / 6;
    const r = mesh(G.box(0.1, 0.02, 0.04), glowM(0xffc06a, 2.4), Math.cos(a) * 0.98, 0.21, Math.sin(a) * 0.98, scene, false);
    r.rotation.y = -a; runes.push(r);
  }
  // Säulen & Kohlebecken
  const updaters = [];
  for (const s of [-1, 1]) {
    const px = s * 2.6, pz = -1.9;
    mesh(G.cyl(0.32, 0.38, 3.6, 8), M(0x3d3a36, { r: 0.9 }), px, 1.8, pz, scene);
    mesh(G.box(0.95, 0.25, 0.95), M(0x47433d), px, 3.65, pz, scene);
    mesh(G.box(0.9, 0.22, 0.9), M(0x47433d), px, 0.11, pz, scene);
    mesh(G.cyl(0.32, 0.18, 0.28, 8), M(0x3a2e24, { m: 0.6, r: 0.5 }), s * 1.8, 1.1, -1.3, scene);
    mesh(G.cyl(0.06, 0.1, 1.0, 6), M(0x2e2620, { m: 0.6 }), s * 1.8, 0.5, -1.3, scene);
    updaters.push(makeFire(scene, s * 1.8, 1.22, -1.3, 0.85, true).userData.update);
    // Banner
    const ban = mesh(G.box(0.7, 1.5, 0.03), M(s < 0 ? 0x6b2a22 : 0x24476b, { r: 0.95 }), px, 2.6, pz + 0.38, scene);
    mesh(G.oct(0.13), glowM(0xffc06a, 1.2), px, 2.75, pz + 0.41, scene, false);
    mesh(G.cyl(0.03, 0.03, 0.9, 6), M(0x6a5640), px, 3.36, pz + 0.38, scene).rotation.z = Math.PI / 2;
    ban.userData.s = s;
  }
  // Rückwand aus Steinblöcken
  for (let row = 0; row < 7; row++) for (let col = -7; col <= 7; col++) {
    const b = mesh(G.box(0.95, 0.55, 0.4), M([0x2c2a28, 0x302d2a, 0x282624][(row * 3 + col + 30) % 3], { r: 0.95 }), col * 1.0 + (row % 2) * 0.5, 0.28 + row * 0.58, -3.2, scene);
    b.castShadow = false;
  }
  const embers = makeParticles({ count: 60, area: [3.2, 3.2, 1.6], center: [0, 0.3, -0.6], color: 0xffa04a, size: 0.06, vy: [0.15, 0.45], jx: 0.25 });
  scene.add(embers);

  const hero = buildHero();
  hero.root.position.y = 0.32;
  scene.add(hero.root);
  const view = {
    scene, camera, hero, rotY: 0.35, velY: 0, dragging: false, bloom: [0.55, 0.55, 0.85],
    onResize(w, h) {
      const asp = w / h;
      const dist = asp < 0.9 ? 5.6 / Math.max(0.55, asp) * 0.82 : 4.6;
      camera.position.set(0, 1.35, dist); camera.lookAt(0, 0.95, 0);
      camera.fov = 30;
    },
    update(dt, t) {
      if (!this.dragging) { this.rotY += this.velY * dt; this.velY *= Math.pow(0.04, dt); }
      hero.root.rotation.y = this.rotY;
      poseRig(hero, dt, t);
      rune.material.emissiveIntensity = 1.4 + Math.sin(t * 1.5) * 0.4;
      runes.forEach((r, i) => r.position.y = 0.21 + Math.sin(t * 2 + i) * 0.01);
      updaters.forEach(u => u(dt, t));
      embers.userData.update(dt, t);
    },
  };
  return view;
}
function bindRotate(host, view) {
  let lx = 0, lt = 0;
  host.addEventListener('pointerdown', e => {
    if (e.target.closest('.slot,button')) return;
    view.dragging = true; lx = e.clientX; lt = performance.now(); host.setPointerCapture(e.pointerId); host.classList.add('grabbing');
  });
  host.addEventListener('pointermove', e => {
    if (!view.dragging) return;
    const dx = e.clientX - lx, now = performance.now();
    view.rotY += dx * 0.012; view.velY = dx * 0.012 / Math.max(0.008, (now - lt) / 1000);
    lx = e.clientX; lt = now;
  });
  const end = () => { view.dragging = false; host.classList.remove('grabbing'); };
  host.addEventListener('pointerup', end); host.addEventListener('pointercancel', end);
}

// ---------- Arena ----------
const ZONE_LOOK = {
  moos:  { bg: 0x1d3436, top: 0x0f1e26, fog: [0x2a4846, 12, 36], sky: 0x9cc7c0, ground: 0x2a2a1a, hemi: 1.05, key: 0xffe0b0, keyI: 1.9, rim: 0x7fb7ff, rimI: 1.2, g1: 0x3c5a2c, g2: 0x557a3a, path: 0x77684a, bloom: [0.6, 0.5, 0.85] },
  glut:  { bg: 0x1a0d09, top: 0x0a0605, fog: [0x2a130b, 10, 30], sky: 0x6a4436, ground: 0x1a0a05, hemi: 0.75, key: 0xffb070, keyI: 1.4, rim: 0xff6a2a, rimI: 0.8, g1: 0x2c2422, g2: 0x3a302a, path: 0x4a3a30, bloom: [0.5, 0.45, 0.88] },
  frost: { bg: 0xa9c2d6, top: 0x5a7fa6, fog: [0xbcd2e2, 12, 40], sky: 0xdbe9f7, ground: 0x6a7a8a, hemi: 1.15, key: 0xfff2e0, keyI: 1.7, rim: 0x9fd0ff, rimI: 0.8, g1: 0xd8e5f0, g2: 0xc2d4e4, path: 0xaabccc, bloom: [0.35, 0.4, 1.3] },
  stern: { bg: 0x150f2a, top: 0x07050f, fog: [0x1e1538, 10, 34], sky: 0x7a6ab8, ground: 0x150f25, hemi: 0.9, key: 0xd4c4ff, keyI: 1.3, rim: 0xb07cff, rimI: 1.4, g1: 0x2a2442, g2: 0x352d52, path: 0x433a62, bloom: [0.6, 0.5, 0.85] },
};
const SPAN = 32, FAR_SPAN = 72;
function buildArena(zi) {
  const z = ZONES[zi], L = ZONE_LOOK[z.id];
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(L.bg);
  scene.fog = new THREE.Fog(...L.fog);
  const camera = new THREE.PerspectiveCamera(34, 2, 0.1, 120);
  addStdLights(scene, { sky: L.sky, ground: L.ground, hemi: L.hemi, key: L.key, keyI: L.keyI, rim: L.rim, rimI: L.rimI, keyPos: [-5, 9, 7] });
  gradientBackdrop(scene, L.top, L.bg, -40, 220, 70, 14);
  const movers = [];   // scrollende Objekte {obj, span, speed}
  const updaters = [];
  const addMover = (obj, span = SPAN, k = 1) => { scene.add(obj); movers.push({ obj, span, k }); return obj; };

  // Boden in zwei Kacheln
  for (let i = 0; i < 2; i++) {
    const geo = new THREE.PlaneGeometry(SPAN, 18, 40, 18);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, cols = [], c = new THREE.Color();
    for (let v = 0; v < p.count; v++) {
      const x = p.getX(v), zz = p.getZ(v);
      const edge = Math.abs(x) > SPAN / 2 - 0.01;
      const h = Math.sin(x * 1.3 + zz * 0.7 + i) * 0.04 + Math.sin(x * 0.4 - zz * 1.9) * 0.05;
      p.setY(v, edge ? 0 : (zz < -3 ? h + (-3 - zz) * 0.06 : h));
      const pathK = Math.max(0, 1 - Math.abs(zz - 0.2) / 1.4);
      c.setHex(Math.random() < 0.5 ? L.g1 : L.g2).lerp(new THREE.Color(L.path), pathK * 0.85);
      cols.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    const g = new THREE.Mesh(geo, M(0xffffff, { vc: true, r: 0.95 }));
    g.receiveShadow = true; g.position.set(i * SPAN, 0, -2.5);
    addMover(g, SPAN * 2);
  }
  // Themen-Requisiten
  const R = (a, b) => rand(a, b);
  const place = (fn, n, zr, span = SPAN, opts = {}) => {
    for (let i = 0; i < n; i++) {
      const o = fn(i); o.position.x = -span / 2 + (i + R(0.1, 0.9)) * span / n; o.position.z = R(zr[0], zr[1]);
      if (opts.y) o.position.y = opts.y(); addMover(o, span);
    }
  };
  const tree = (dark, snow) => () => {
    const g = new THREE.Group(), s = R(0.8, 1.5);
    mesh(G.cyl(0.08 * s, 0.13 * s, 1.0 * s, 6), M(0x4a3424), 0, 0.5 * s, 0, g);
    for (let k = 0; k < 3; k++) {
      mesh(G.cone((0.75 - k * 0.18) * s, 0.9 * s, 7), M(dark), 0, (1.0 + k * 0.55) * s, 0, g).rotation.y = k;
      if (snow) mesh(G.cone((0.5 - k * 0.13) * s, 0.42 * s, 7), M(0xf2f6fa), 0, (1.32 + k * 0.55) * s, 0, g).rotation.y = k;
    }
    g.rotation.y = R(0, 6); return g;
  };
  const rock = (col, top) => () => {
    const g = new THREE.Group(), s = R(0.35, 1.1);
    const r = mesh(rockGeo(s, 0.3, 0, Math.random() * 99), M(col, { r: 0.92 }), 0, s * 0.35, 0, g); r.scale.y = R(0.6, 0.9);
    if (top) { const t = mesh(rockGeo(s * 0.9, 0.2, 0, Math.random() * 99), M(top, { r: 0.95 }), 0, s * 0.55, 0, g); t.scale.set(1, 0.3, 1); }
    g.rotation.y = R(0, 6); return g;
  };
  const small = (col, top) => () => {
    const g = new THREE.Group(), s = R(0.15, 0.32);
    const r = mesh(rockGeo(s, 0.3, 0, Math.random() * 99), M(col, { r: 0.92 }), 0, s * 0.2, 0, g); r.scale.y = 0.55;
    if (top) { const t = mesh(rockGeo(s * 0.85, 0.2, 0, Math.random() * 99), M(top, { r: 0.95 }), 0, s * 0.38, 0, g); t.scale.set(1, 0.3, 1); }
    return g;
  };
  const glowShroom = () => {
    const g = new THREE.Group(), s = R(0.5, 1.4);
    mesh(G.cyl(0.07 * s, 0.1 * s, 0.7 * s, 6), M(0xd8ccb0), 0, 0.35 * s, 0, g);
    const cap = mesh(G.half(0.32 * s, 9, 4), M(0x2f8f86, { e: 0x4fe8d0, ei: 1.1 }), 0, 0.68 * s, 0, g, false); cap.scale.y = 0.6;
    return g;
  };
  const crystal = (col, glow) => () => {
    const g = new THREE.Group(), n = randi(2, 4);
    for (let k = 0; k < n; k++) { const c = mesh(G.cone(R(0.08, 0.2), R(0.5, 1.3), 5), M(col, { e: glow, ei: 1.3, r: 0.2, m: 0.2 }), R(-0.25, 0.25), 0.3, R(-0.2, 0.2), g, false); c.rotation.set(R(-0.4, 0.4), 0, R(-0.4, 0.4)); c.position.y = c.geometry.parameters.height * 0.4; }
    return g;
  };
  const lantern = () => {
    const g = new THREE.Group();
    mesh(G.cyl(0.05, 0.07, 1.8, 6), M(0x3a2a1e), 0, 0.9, 0, g);
    mesh(G.box(0.5, 0.05, 0.05), M(0x3a2a1e), 0.2, 1.75, 0, g);
    mesh(G.box(0.16, 0.22, 0.16), M(0x2a2420, { m: 0.6 }), 0.4, 1.55, 0, g);
    mesh(G.box(0.1, 0.14, 0.1), glowM(0xffc06a, 3), 0.4, 1.55, 0, g, false);
    const l = new THREE.PointLight(0xffb060, 4, 6, 1.6); l.position.set(0.4, 1.55, 0.2); g.add(l);
    return g;
  };
  const support = () => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) mesh(G.box(0.22, 3.2, 0.22), M(0x5a3a24), s * 1.4, 1.6, 0, g);
    mesh(G.box(3.3, 0.25, 0.28), M(0x5a3a24), 0, 3.2, 0, g);
    g.userData.fire = makeFire(g, -1.4, 2.25, 0.2, 0.9, true);
    mesh(G.box(0.1, 0.4, 0.1), M(0x3a2a1e), -1.4, 2.05, 0.18, g);
    return g;
  };
  const lavaCrack = () => {
    const g = new THREE.Group();
    const c = mesh(G.box(R(1.2, 3), 0.02, R(0.06, 0.14)), glowM(0xff5a10, 1.8), 0, 0.02, 0, g, false); c.rotation.y = R(-0.4, 0.4);
    return g;
  };
  const pillar = () => {
    const g = new THREE.Group(), h = R(1.5, 3.5);
    mesh(G.cyl(0.35, 0.42, h, 7), M(0x3a3456, { r: 0.9 }), 0, h / 2, 0, g);
    mesh(G.box(1.0, 0.25, 1.0), M(0x433c62), 0, h, 0, g).rotation.y = 0.3;
    return g;
  };
  const floatRock = () => {
    const g = new THREE.Group(), s = R(0.3, 0.9);
    const r = mesh(rockGeo(s, 0.3, 0, Math.random() * 99), M(0x3a3156, { r: 0.9 }), 0, 0, 0, g);
    mesh(G.cone(s * 0.4, s * 1.2, 5), glowM(0xb98cff, 1.4), 0, -s * 0.7, 0, g, false).rotation.x = Math.PI;
    g.userData.float = R(0, 6); g.userData.baseY = R(2.2, 4.5); g.position.y = g.userData.baseY;
    return g;
  };
  const mountain = (col, snow) => () => {
    const g = new THREE.Group(), h = R(8, 16);
    const m = mesh(G.cone(R(5, 9), h, 6), M(col, { r: 0.95 }), 0, h / 2 - 1, 0, g, false); m.rotation.y = R(0, 6);
    if (snow) { const t = mesh(G.cone(R(2, 2.8), h * 0.32, 6), M(0xf4f8fc), 0, h * 0.84 - 1, 0, g, false); t.rotation.y = m.rotation.y; }
    return g;
  };
  let particles;
  if (z.id === 'moos') {
    place(mountain(0x1c3030, false), 9, [-26, -20], FAR_SPAN);
    place(tree(0x234a35), 16, [-10, -5]);
    place(tree(0x2c5a3c), 8, [-4.5, -3]);
    place(rock(0x5a5a52, 0x4f7a3a), 8, [-3, -1.8]);
    place(glowShroom, 7, [-2.6, -1.6]);
    place(lantern, 2, [-1.8, -1.6]);
    place(small(0x4a4a44, 0x4f7a3a), 7, [2.2, 3.2]);
    particles = makeParticles({ count: 70, area: [10, 3, 4], center: [0, 0.3, -1.5], color: 0xd8ff8a, size: 0.09, vy: [-0.1, 0.12], jx: 0.4, jz: 0.3, twinkle: true });
  } else if (z.id === 'glut') {
    place(rock(0x241a16), 14, [-9, -5.5]);
    place(crystal(0xff8a3a, 0xff5a10), 7, [-4.2, -2.6]);
    place(support, 4, [-1.9, -1.7]);
    place(lavaCrack, 8, [-2.8, -1.6]);
    place(small(0x2a201c), 7, [2.2, 3.2]);
    // Schienen
    for (let i = 0; i < 2; i++) {
      const rail = new THREE.Group();
      for (const s of [-1, 1]) mesh(G.box(SPAN, 0.05, 0.06), M(0x6a6a70, { m: 0.8, r: 0.4 }), 0, 0.06, -1.0 + s * 0.35, rail);
      for (let k = 0; k < 26; k++) mesh(G.box(0.14, 0.05, 1.0), M(0x4a3020), -SPAN / 2 + k * (SPAN / 26), 0.03, -1.0, rail);
      rail.position.x = i * SPAN; addMover(rail, SPAN * 2);
    }
    // Stalaktiten
    place(() => { const g = new THREE.Group(); const c = mesh(G.cone(R(0.3, 0.8), R(1.5, 4), 5), M(0x241a16), 0, 0, 0, g, false); c.rotation.x = Math.PI; return g; }, 14, [-8, -3], SPAN, { y: () => R(6.5, 8) });
    particles = makeParticles({ count: 90, area: [10, 5, 4], center: [0, 0, -1.5], color: 0xff8a3a, size: 0.07, vy: [0.3, 0.9], jx: 0.2 });
  } else if (z.id === 'frost') {
    place(mountain(0x8aa2bc, true), 8, [-30, -22], FAR_SPAN);
    place(tree(0x2a4a42, true), 14, [-10, -5]);
    place(rock(0x8a98a8, 0xf2f6fa), 9, [-3.2, -1.8]);
    place(crystal(0xbfe8ff, 0x6fd0ff), 6, [-2.8, -1.9]);
    place(small(0x7a8898, 0xf2f6fa), 7, [2.2, 3.2]);
    particles = makeParticles({ count: 180, area: [10, 7, 5], center: [0, 0, -1], color: 0xffffff, size: 0.07, vy: [-0.9, -0.4], jx: 0.4, jz: 0.2, opacity: 0.85 });
  } else {
    const planet = mesh(G.sphere(6, 24, 16), M(0x6a4ab8, { e: 0x7a4adf, ei: 0.6, smooth: true }), 18, 14, -38, scene, false);
    mesh(G.tor(9, 0.25, 4, 48), glowM(0xc9a8ff, 1.2), 18, 14, -38, scene, false).rotation.set(1.2, 0.2, 0.3);
    place(floatRock, 10, [-9, -4]);
    place(pillar, 6, [-4.5, -2.8]);
    place(crystal(0x8a5ad8, 0xb98cff), 8, [-2.6, -1.8]);
    place(small(0x2a2442), 7, [2.2, 3.2]);
    particles = makeParticles({ count: 120, area: [12, 9, 6], center: [0, 0, -5], color: 0xd8c8ff, size: 0.06, vy: [-0.05, 0.05], jx: 0.1, twinkle: true });
  }
  scene.add(particles);
  scene.traverse(o => { if (o.userData?.fire) updaters.push(o.userData.fire.userData.update); });

  // Held
  const view = {
    scene, camera, movers, updaters, particles, zone: zi, bloom: L.bloom, hero: null, mon: null,
    heroX: -1.9, scroll: 0, fx: [], shake: 0,
    onResize(w, h) {
      const asp = w / h, half = Math.tan(THREE.MathUtils.degToRad(17));
      const need = asp < 1.2 ? 3.3 : 4.8;
      const dist = clamp(need / (half * asp), 7.0, 18);
      camera.position.set(-0.6, 1.2 + dist * 0.16, dist); camera.lookAt(-0.6, 1.0, 0);
      this.camX = -0.6;
    },
    update(dt, t) {
      const sp = this.scroll;
      for (const m of movers) {
        const o = m.obj; o.position.x -= sp * dt;
        if (o.position.x < -m.span / 2) o.position.x += m.span;
        if (o.userData.float !== undefined) o.position.y = o.userData.baseY + Math.sin(t + o.userData.float) * 0.2;
      }
      updaters.forEach(u => u(dt, t));
      particles.userData.update(dt, t, sp);
      if (this.hero) poseRig(this.hero, dt, t);
      if (this.mon) poseMonster(this.mon, dt, t);
      updateFx(this, dt);
      if (this.shake > 0) { this.shake = Math.max(0, this.shake - dt * 3); camera.position.x = this.camX + (Math.random() - 0.5) * this.shake * 0.25; }
    },
  };
  return view;
}
function arenaSetHero(view) {
  if (view.hero) { view.scene.remove(view.hero.root); disposeTree(view.hero.root); }
  const h = buildHero(); dressRig(h, S.eq); h.mats = cloneMats(h.root); h.flash = 0;
  h.root.position.set(view.heroX, 0, 0.2); h.root.rotation.y = 1.0;
  view.scene.add(h.root); view.hero = h;
}
function arenaSetMonster(view, mon) {
  if (view.mon) { view.scene.remove(view.mon.root); disposeTree(view.mon.root); view.mon = null; }
  if (!mon) return null;
  const e = buildMonster(mon);
  e.root.position.set(9, 0, 0.2); e.root.rotation.y = -1.0;
  view.scene.add(e.root); view.mon = e;
  return e;
}
function flashRig(e) { e.flash = 1; }

// Effekte: Funken, Hieb-Bögen, Ringe
const fxGeo = { spark: null, arc: null, ring: null };
function spawnSparks(view, pos, col, n = 10, spd = 3) {
  fxGeo.spark ||= new THREE.OctahedronGeometry(0.045, 0);
  const m = new THREE.MeshBasicMaterial({ color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < n; i++) {
    const o = new THREE.Mesh(fxGeo.spark, m); o.position.copy(pos);
    const v = new THREE.Vector3(rand(-1, 1), rand(0.2, 1.4), rand(-0.6, 0.6)).normalize().multiplyScalar(rand(0.5, 1) * spd);
    view.scene.add(o); view.fx.push({ o, v, life: rand(0.35, 0.6), max: 0.6, grav: 6, mat: m });
  }
}
function spawnArc(view, pos, col, flip = false) {
  fxGeo.arc ||= new THREE.TorusGeometry(0.55, 0.05, 3, 20, Math.PI * 0.7);
  const m = new THREE.MeshBasicMaterial({ color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 });
  const o = new THREE.Mesh(fxGeo.arc, m); o.position.copy(pos);
  o.rotation.set(0, flip ? Math.PI : 0, rand(-0.6, 0.2));
  view.scene.add(o); view.fx.push({ o, v: null, life: 0.22, max: 0.22, grow: 1.6, mat: m });
}
function spawnRing(view, pos, col, life = 1.0, size = 1) {
  fxGeo.ring ||= new THREE.TorusGeometry(0.6, 0.04, 4, 32);
  const m = new THREE.MeshBasicMaterial({ color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const o = new THREE.Mesh(fxGeo.ring, m); o.position.copy(pos); o.rotation.x = Math.PI / 2; o.scale.setScalar(size);
  view.scene.add(o); view.fx.push({ o, v: new THREE.Vector3(0, 1.2, 0), life, max: life, grow: 1.2, mat: m });
}
function updateFx(view, dt) {
  for (let i = view.fx.length - 1; i >= 0; i--) {
    const f = view.fx[i]; f.life -= dt;
    if (f.v) { f.o.position.addScaledVector(f.v, dt); if (f.grav) f.v.y -= f.grav * dt; }
    if (f.grow) f.o.scale.multiplyScalar(1 + f.grow * dt);
    f.mat.opacity = Math.max(0, f.life / f.max);
    if (f.life <= 0) { view.scene.remove(f.o); f.mat.dispose(); view.fx.splice(i, 1); }
  }
}

// ---------- Trainingshof ----------
function buildTraining() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x161210);
  scene.fog = new THREE.Fog(0x161210, 8, 20);
  const camera = new THREE.PerspectiveCamera(34, 2, 0.1, 60);
  addStdLights(scene, { sky: 0xbfb0a0, ground: 0x2a2018, hemi: 0.75, key: 0xffd9a8, keyI: 1.7, keyPos: [-3, 7, 5], rim: 0x7fa0ff, rimI: 0.7 });
  // Dielenboden
  for (let i = 0; i < 16; i++) {
    const p = mesh(G.box(12, 0.12, 0.42), M([0x6b4a30, 0x5f4029, 0x765236][i % 3], { r: 0.9 }), 0, -0.06, -4 + i * 0.44, scene);
    p.castShadow = false;
  }
  // Rückwand
  for (let row = 0; row < 6; row++) for (let col = -7; col <= 7; col++) {
    const b = mesh(G.box(0.95, 0.6, 0.45), M([0x46403a, 0x4d4640, 0x3f3a35][(row + col + 30) % 3], { r: 0.95 }), col + (row % 2) * 0.5, 0.3 + row * 0.62, -3.4, scene);
    b.castShadow = false;
  }
  mesh(G.box(14, 0.3, 0.6), M(0x4a3020), 0, 3.85, -3.2, scene);
  // Waffenständer
  const rack = grp(scene, -2.6, 0, -2.7);
  mesh(G.box(2.2, 0.12, 0.3), M(0x5a3a24), 0, 0.3, 0, rack);
  mesh(G.box(2.2, 0.12, 0.3), M(0x5a3a24), 0, 1.6, 0, rack);
  for (const s of [-1, 1]) mesh(G.box(0.12, 1.8, 0.3), M(0x5a3a24), s * 1.05, 0.9, 0, rack);
  ['sword', 'axe', 'hammer', 'staff', 'dagger'].forEach((b, i) => {
    const w = eqWeapon({ base: b, tier: Math.min(5, i), rarity: i === 3 ? 2 : 0, slot: 'weapon' });
    w.position.set(-0.8 + i * 0.4, 0.38, 0.12); w.rotation.z = (i - 2) * 0.04; rack.add(w);
  });
  // Fackeln
  const updaters = [];
  for (const x of [-4.4, 0.6, 4.4]) {
    mesh(G.box(0.12, 0.45, 0.12), M(0x3a2a1e), x, 2.15, -3.05, scene);
    updaters.push(makeFire(scene, x, 2.4, -3.0, 1, true).userData.update);
  }
  // Banner
  for (const [x, c] of [[-1.2, 0x6b2a22], [2.4, 0x24476b]]) {
    mesh(G.box(0.8, 1.6, 0.03), M(c, { r: 0.95 }), x, 2.7, -3.1, scene);
    mesh(G.oct(0.15), glowM(0xffc06a, 1.1), x, 2.85, -3.07, scene, false);
  }
  // Fässer und Kisten
  for (const [x, z] of [[3.6, -2.4], [4.2, -2.0]]) {
    mesh(G.cyl(0.32, 0.32, 0.8, 10), M(0x6b4a30), x, 0.4, z, scene);
    for (const y of [0.15, 0.65]) mesh(G.cyl(0.335, 0.335, 0.06, 10), M(0x3a3a3e, { m: 0.6 }), x, y, z, scene);
  }
  mesh(G.box(0.7, 0.7, 0.7), M(0x7a5a3a), 3.2, 0.35, -1.4, scene).rotation.y = 0.4;
  // Zielscheibe
  const tg = grp(scene, 2.6, 0, -2.6);
  for (const s of [-1, 1]) mesh(G.cyl(0.04, 0.04, 1.5, 5), M(0x5a3a24), s * 0.35, 0.75, -0.15, tg).rotation.x = 0.2;
  [[0.55, 0xe8dcc0], [0.42, 0xb8302a], [0.28, 0xe8dcc0], [0.14, 0xb8302a]].forEach(([r, c], i) => {
    const d = mesh(G.cyl(r, r, 0.06, 18), M(c), 0, 1.25, 0.01 * i, tg); d.rotation.x = Math.PI / 2;
  });
  // Trainingspuppe
  const dummy = grp(scene, 1.15, 0, 0.2);
  const wob = grp(dummy);
  mesh(G.cyl(0.07, 0.08, 1.6, 6), M(0x6b4a2a), 0, 0.8, 0, wob);
  mesh(G.cyl(0.36, 0.42, 0.1, 8), M(0x4a3020), 0, 0.05, 0, dummy);
  const sack = mesh(G.sphere(0.32, 9, 7), M(0xc8a874, { r: 1 }), 0, 1.1, 0, wob); sack.scale.set(1, 1.3, 0.9);
  mesh(G.tor(0.3, 0.03, 4, 12), M(0x6b4a2a), 0, 0.85, 0, wob).rotation.x = Math.PI / 2;
  mesh(G.tor(0.31, 0.03, 4, 12), M(0x6b4a2a), 0, 1.35, 0, wob).rotation.x = Math.PI / 2;
  mesh(G.sphere(0.21, 8, 6), M(0xc8a874, { r: 1 }), 0, 1.7, 0, wob);
  mesh(G.box(1.2, 0.09, 0.09), M(0x6b4a2a), 0, 1.4, 0, wob);
  for (const s of [-1, 1]) mesh(G.sphere(0.09, 6, 5), M(0xc8a874), s * 0.6, 1.4, 0, wob);
  mesh(G.box(0.16, 0.03, 0.02), M(0x3a2a1e), 0, 1.72, 0.2, wob);
  const embers = makeParticles({ count: 30, area: [5, 3, 1.5], center: [0, 0.3, -2.4], color: 0xffa04a, size: 0.05, vy: [0.2, 0.5], jx: 0.2 });
  scene.add(embers);

  const hero = buildHero();
  hero.root.position.set(-0.15, 0, 0.25); hero.root.rotation.y = 1.25;
  scene.add(hero.root);
  const view = {
    scene, camera, hero, dummy, wob, fx: [], wobV: 0, wobA: 0, bloom: [0.5, 0.5, 0.85],
    onResize(w, h) {
      const asp = w / h, half = Math.tan(THREE.MathUtils.degToRad(17));
      const dist = clamp(2.9 / (half * asp), 5.2, 14);
      camera.position.set(0.4, 1.0 + dist * 0.18, dist); camera.lookAt(0.4, 0.95, 0);
    },
    hit(power = 1) {
      this.wobV -= 4.5 * power;
      spawnSparks(this, new THREE.Vector3(1.0, 1.2, 0.35), 0xffd08a, 8, 2.2);
    },
    update(dt, t) {
      // Federpendel für die Puppe
      this.wobV += (-this.wobA * 40 - this.wobV * 4) * dt;
      this.wobA += this.wobV * dt;
      wob.rotation.z = this.wobA * 0.4;
      poseRig(hero, dt, t);
      updaters.forEach(u => u(dt, t));
      embers.userData.update(dt, t);
      updateFx(this, dt);
    },
  };
  return view;
}

// ---------- Item-Vorschaubilder ----------
const THUMB = { r: null, scene: null, cam: null, cache: new Map() };
function initThumbs() {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(160, 160, false);
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15;
  THUMB.r = r;
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a2a20, 1.4));
  const k = new THREE.DirectionalLight(0xffe4c4, 2.4); k.position.set(-2, 3, 4); sc.add(k);
  const rim = new THREE.DirectionalLight(0x8fb0ff, 1.6); rim.position.set(3, 1, -3); sc.add(rim);
  THUMB.scene = sc;
  THUMB.cam = new THREE.PerspectiveCamera(28, 1, 0.01, 50);
}
function thumbKey(it) { return `${it.base}|${it.tier}|${it.rarity}`; }
function itemThumb(it) {
  const key = thumbKey(it);
  if (THUMB.cache.has(key)) return THUMB.cache.get(key);
  if (!THUMB.r) { try { initThumbs(); } catch (e) { return ''; } }
  const g = new THREE.Group();
  let obj;
  if (it.slot === 'weapon') { obj = eqWeapon(it); obj.rotation.z = -0.78; obj.rotation.y = 0.3; }
  else if (it.slot === 'offhand') { obj = eqOffhand(it); obj.rotation.y = it.base === 'orb' ? 0 : 0.45; }
  else if (it.slot === 'head') { obj = eqHead(it); obj.rotation.y = 0.55; obj.rotation.x = 0.15; }
  else if (it.slot === 'chest') { obj = eqChest(it); obj.rotation.y = 0.5; }
  else if (it.slot === 'feet') { obj = new THREE.Group(); const a = eqFoot(it), b = eqFoot(it); a.position.x = -0.15; b.position.set(0.15, 0, -0.05); obj.add(a, b); obj.rotation.y = 0.6; obj.rotation.x = 0.25; }
  else { obj = eqAmulet(it); obj.rotation.y = 0.3; }
  g.add(obj); THUMB.scene.add(g);
  const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
  const rad = Math.max(sz.x, sz.y, sz.z) * 0.62;
  const dist = rad / Math.tan(THREE.MathUtils.degToRad(14));
  THUMB.cam.position.set(c.x, c.y + rad * 0.15, c.z + dist); THUMB.cam.lookAt(c);
  THUMB.r.render(THUMB.scene, THUMB.cam);
  const url = THUMB.r.domElement.toDataURL('image/png');
  THUMB.scene.remove(g); g.traverse(o => o.geometry?.dispose());
  THUMB.cache.set(key, url);
  return url;
}
