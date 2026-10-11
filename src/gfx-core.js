// ============================================================
//  Grafik-Kern: Renderer, Materialien, Rig, Ausrüstung, Monster
// ============================================================
const RT = { renderer: null, composer: null, renderPass: null, bloom: null, host: null, view: null, ro: null, w: 1, h: 1, quality: 'high' };

function initRenderer() {
  const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.domElement.className = 'gl';
  RT.renderer = r;
  RT.composer = new EffectComposer(r);
  RT.renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
  RT.composer.addPass(RT.renderPass);
  RT.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.55, 0.85);
  RT.composer.addPass(RT.bloom);
  RT.composer.addPass(new OutputPass());
  RT.ro = new ResizeObserver(() => resizeGL());
  setQuality(S?.settings?.quality || 'high');
}
function setQuality(q) {
  RT.quality = q;
  const r = RT.renderer; if (!r) return;
  r.setPixelRatio(q === 'high' ? Math.min(window.devicePixelRatio || 1, 2) : 1);
  r.shadowMap.enabled = q === 'high';
  RT.bloom.enabled = q === 'high';
  r.domElement.dataset.q = q;
  // Materialien müssen bei Schatten-Umschaltung neu kompiliert werden
  for (const v of Object.values(VIEWS)) v?.scene?.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  resizeGL();
}
function mountView(view, host) {
  if (RT.host !== host) {
    RT.ro.disconnect();
    host.prepend(RT.renderer.domElement);
    RT.ro.observe(host);
    RT.host = host;
  }
  RT.view = view;
  RT.renderPass.scene = view.scene;
  RT.renderPass.camera = view.camera;
  if (view.bloom) { RT.bloom.strength = view.bloom[0]; RT.bloom.radius = view.bloom[1]; RT.bloom.threshold = view.bloom[2]; }
  resizeGL();
}
function resizeGL() {
  if (!RT.host) return;
  const w = RT.host.clientWidth, h = RT.host.clientHeight;
  if (!w || !h) return;
  RT.w = w; RT.h = h;
  RT.renderer.setSize(w, h, false);
  RT.composer.setPixelRatio(RT.renderer.getPixelRatio());
  RT.composer.setSize(w, h);
  if (RT.view) { RT.view.camera.aspect = w / h; RT.view.onResize?.(w, h); RT.view.camera.updateProjectionMatrix(); }
}
function projectToHost(v3, out = {}) {
  const v = v3.clone().project(RT.view.camera);
  out.x = (v.x * 0.5 + 0.5) * RT.w; out.y = (-v.y * 0.5 + 0.5) * RT.h; out.vis = v.z < 1;
  return out;
}

// ---------- Materialien & Geometrie ----------
const matCache = new Map();
function M(color, o = {}) {
  const key = `${color}|${o.m || 0}|${o.r ?? 0.8}|${o.e || 0}|${o.ei || 1}|${o.op || 1}|${o.smooth ? 1 : 0}|${o.vc ? 1 : 0}|${o.ds ? 1 : 0}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color, roughness: o.r ?? 0.8, metalness: o.m || 0, flatShading: !o.smooth,
      emissive: o.e || 0x000000, emissiveIntensity: o.ei || 1,
      transparent: (o.op ?? 1) < 1, opacity: o.op ?? 1, vertexColors: !!o.vc,
      side: o.ds ? THREE.DoubleSide : THREE.FrontSide,
    });
    m.userData.shared = true;
    matCache.set(key, m);
  }
  return m;
}
function glowM(color, ei = 2) { return M(color, { e: color, ei, r: 0.4 }); }
function shade(hex, f) {
  const c = new THREE.Color(hex); c.multiplyScalar(f); return c.getHex();
}
const G = {
  sphere: (r, w = 10, h = 8, ...a) => new THREE.SphereGeometry(r, w, h, ...a),
  half: (r, w = 10, h = 5) => new THREE.SphereGeometry(r, w, h, 0, Math.PI * 2, 0, Math.PI / 2),
  box: (x, y, z) => new THREE.BoxGeometry(x, y, z),
  cyl: (rt, rb, h, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s),
  cone: (r, h, s = 8) => new THREE.ConeGeometry(r, h, s),
  cap: (r, l, s = 8) => new THREE.CapsuleGeometry(r, l, 3, s),
  tor: (r, t, rs = 6, ts = 14, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, rs, ts, arc),
  oct: (r) => new THREE.OctahedronGeometry(r, 0),
  dod: (r) => new THREE.DodecahedronGeometry(r, 0),
  ico: (r, d = 0) => new THREE.IcosahedronGeometry(r, d),
};
function mesh(geo, mat, x = 0, y = 0, z = 0, parent = null, shadow = true) {
  const o = new THREE.Mesh(geo, mat);
  o.position.set(x, y, z);
  o.castShadow = shadow; o.receiveShadow = shadow;
  if (parent) parent.add(o);
  return o;
}
function grp(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); if (parent) parent.add(g); return g; }
// zufällig verbeulte Felsform ohne Lücken (gleiche Position → gleicher Versatz)
function rockGeo(r, amt = 0.25, detail = 0, seed = 1) {
  const g = new THREE.IcosahedronGeometry(r, detail);
  const p = g.attributes.position;
  const h = (x, y, z) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed * 4.13) * 43758.5453; return s - Math.floor(s); };
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + (h(+x.toFixed(3), +y.toFixed(3), +z.toFixed(3)) - 0.5) * 2 * amt;
    p.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals();
  return g;
}
function disposeTree(obj) {
  obj.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { if (!m.userData?.shared) m.dispose(); }); }
  });
}
// weiche runde Partikeltextur
let _dotTex = null;
function dotTexture() {
  if (_dotTex) return _dotTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  _dotTex = new THREE.CanvasTexture(c); _dotTex.colorSpace = THREE.SRGBColorSpace;
  return _dotTex;
}
// Partikelfeld: Glühwürmchen, Funken, Schnee, Sterne
function makeParticles(o) {
  const n = o.count, pos = new Float32Array(n * 3), vel = [];
  const [ax, ay, az] = o.area, [cx, cy, cz] = o.center || [0, 0, 0];
  for (let i = 0; i < n; i++) {
    pos[i * 3] = cx + rand(-ax, ax); pos[i * 3 + 1] = cy + rand(0, ay); pos[i * 3 + 2] = cz + rand(-az, az);
    vel.push([rand(-1, 1) * (o.jx || 0.1), o.vy ? rand(o.vy[0], o.vy[1]) : 0, rand(-1, 1) * (o.jz || 0.1), Math.random() * 6.28]);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: o.color, size: o.size, map: dotTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: o.opacity ?? 0.9 });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  pts.userData.update = (dt, t, scroll = 0) => {
    for (let i = 0; i < n; i++) {
      const v = vel[i];
      let x = pos[i * 3] + (v[0] * Math.sin(t * 0.7 + v[3]) - scroll) * dt;
      let y = pos[i * 3 + 1] + v[1] * dt;
      let z = pos[i * 3 + 2] + v[2] * Math.cos(t * 0.6 + v[3]) * dt;
      if (x < cx - ax) x += ax * 2; if (x > cx + ax) x -= ax * 2;
      if (y > cy + ay) y = cy; if (y < cy) y = cy + ay;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    }
    geo.attributes.position.needsUpdate = true;
    if (o.twinkle) mat.opacity = (o.opacity ?? 0.9) * (0.75 + 0.25 * Math.sin(t * 3));
  };
  return pts;
}
// Flamme (Fackel, Kohlebecken)
function makeFire(parent, x, y, z, s = 1, light = true, col = 0xff8a2a) {
  const g = grp(parent, x, y, z);
  const outer = mesh(G.cone(0.12 * s, 0.34 * s, 6), glowM(col, 3.2), 0, 0.12 * s, 0, g, false);
  const inner = mesh(G.cone(0.07 * s, 0.22 * s, 5), glowM(0xffe08a, 4), 0, 0.09 * s, 0, g, false);
  let L = null;
  if (light) { L = new THREE.PointLight(col, 6 * s, 6 * s, 1.6); L.position.y = 0.3 * s; g.add(L); }
  const seed = Math.random() * 10;
  g.userData.update = (dt, t) => {
    const f = 0.85 + 0.15 * Math.sin(t * 17 + seed) * Math.sin(t * 7.3 + seed * 2);
    outer.scale.set(1, f * 1.05, 1); inner.scale.set(1, 1.1 - f * 0.2, 1);
    outer.rotation.y = t * 2 + seed;
    if (L) L.intensity = 6 * s * (0.8 + 0.3 * f);
  };
  return g;
}

// ---------- Charakter-Rig ----------
function buildRig(o) {
  const d = Object.assign({ skin: 0xe0a882, cloth: 0x3f5f7a, pants: 0x4b3b2d, shoe: 0x3a2a1e, legLen: 0.42, limb: 1, torsoW: 1, headR: 0.25, armLen: 0.44 }, o);
  const root = new THREE.Group();
  const body = grp(root);
  const hips = grp(body, 0, d.legLen + 0.04, 0);
  const legs = [];
  for (const s of [-1, 1]) {
    const pivot = grp(hips, s * 0.15 * d.torsoW, 0, 0);
    mesh(G.cap(0.11 * d.limb, Math.max(0.04, d.legLen - 0.24)), M(d.pants), 0, -d.legLen * 0.45, 0, pivot);
    const foot = grp(pivot, 0, -d.legLen + 0.06, 0.02);
    const shoe = mesh(G.box(0.2 * d.limb, 0.13, 0.3), M(d.shoe), 0, 0, 0.05, foot);
    legs.push({ pivot, foot, shoe });
  }
  const torso = grp(hips);
  const chest = mesh(G.sphere(0.34, 10, 8), M(d.cloth), 0, 0.3, 0, torso);
  chest.scale.set(d.torsoW, 1.12, 0.82);
  const belt = mesh(G.cyl(0.32, 0.33, 0.09, 10), M(0x3a2618, { r: 0.7 }), 0, 0.07, 0, torso);
  belt.scale.set(d.torsoW, 1, 0.84);
  mesh(G.box(0.11, 0.09, 0.04), M(0xc9a24a, { m: 0.8, r: 0.35 }), 0, 0.07, 0.28, torso);
  const neck = grp(torso, 0, 0.62, 0);
  const head = grp(neck, 0, d.headR * 0.78, 0);
  const skull = mesh(G.sphere(d.headR, 10, 8), M(d.skin), 0, 0, 0, head);
  const eyeM = d.eyeGlow ? glowM(d.eyeGlow, 3) : M(0x1a1410, { r: 0.3 });
  const eyes = [];
  for (const s of [-1, 1]) eyes.push(mesh(G.sphere(0.034 * (d.eyeScale || 1), 6, 5), eyeM, s * 0.085 * d.headR / 0.25, 0.03, d.headR * 0.9, head, false));
  const arms = {};
  for (const s of [-1, 1]) {
    const pivot = grp(torso, s * 0.37 * d.torsoW, 0.5, 0);
    mesh(G.sphere(0.12 * d.limb, 8, 6), M(d.cloth), 0, 0, 0, pivot);
    mesh(G.cap(0.088 * d.limb, Math.max(0.05, d.armLen - 0.22)), M(d.armSkin ? d.skin : d.cloth), 0, -d.armLen * 0.45, 0, pivot);
    const hand = grp(pivot, 0, -d.armLen, 0);
    mesh(G.sphere(0.095 * d.limb, 8, 6), M(d.skin), 0, 0, 0, hand);
    const mount = grp(hand, 0, -0.02, 0.02);
    arms[s < 0 ? 'R' : 'L'] = { pivot, hand, mount };
  }
  const rig = { type: 'rig', root, body, hips, torso, chest, neck, head, skull, legs, arms, eyes, d, equip: [], anim: { mode: 'idle', t: 0, dur: 1, phase: 0 } };
  return rig;
}

// Bewegungsablauf (prozedural)
const easeOut = x => 1 - Math.pow(1 - x, 3);
const easeIn = x => x * x;
const lerp = (a, b, t) => a + (b - a) * t;
function playAnim(ent, mode, dur = 0.5) { ent.anim.mode = mode; ent.anim.t = 0; ent.anim.dur = dur; }
function poseRig(rig, dt, time) {
  const a = rig.anim; a.t += dt;
  const { R, L } = rig.arms;
  let leg = 0, bob = Math.sin(time * 2.4 + (rig.seed || 0)) * 0.012, tX = 0, tY = 0, lunge = 0;
  let rX = -0.35 + Math.sin(time * 2.4) * 0.04, rZ = -0.14, lX = -0.45, lZ = 0.16, wrist = 0, fall = 0, drop = 0;
  if (a.mode === 'walk') {
    a.phase += dt * 10;
    leg = Math.sin(a.phase) * 0.75; bob = Math.abs(Math.sin(a.phase)) * 0.05;
    rX += leg * 0.35; lX -= leg * 0.45; tY = Math.sin(a.phase) * 0.06;
  } else if (a.mode === 'attack' || a.mode === 'stab') {
    const p = Math.min(1, a.t / a.dur);
    const wind = a.mode === 'stab' ? 0.35 : 0.42, hit = a.mode === 'stab' ? 0.55 : 0.6;
    const up = a.mode === 'stab' ? 0.9 : 2.5, down = a.mode === 'stab' ? -1.5 : -1.15;
    if (p < wind) { const k = easeOut(p / wind); rX = lerp(-0.35, up, k); tY = 0.35 * k; tX = -0.08 * k; wrist = 0.4 * k; }
    else if (p < hit) { const k = easeIn((p - wind) / (hit - wind)); rX = lerp(up, down, k); tY = lerp(0.35, -0.3, k); tX = lerp(-0.08, 0.16, k); lunge = 0.22 * k; wrist = lerp(0.4, -0.9, k); }
    else { const k = easeOut((p - hit) / (1 - hit)); rX = lerp(down, -0.35, k); tY = lerp(-0.3, 0, k); tX = lerp(0.16, 0, k); lunge = 0.22 * (1 - k); wrist = lerp(-0.9, 0, k); }
    if (p >= 1) a.mode = 'idle';
  } else if (a.mode === 'cast') {
    const p = Math.min(1, a.t / a.dur);
    const k = p < 0.5 ? easeOut(p / 0.5) : 1 - easeOut((p - 0.5) / 0.5);
    rX = lerp(-0.35, -1.6, k); lX = lerp(-0.45, -1.4, k); tX = -0.05 * k;
    if (p >= 1) a.mode = 'idle';
  } else if (a.mode === 'hit') {
    const p = Math.min(1, a.t / a.dur);
    tX = -0.28 * (1 - p); lunge = -0.12 * (1 - p);
    if (p >= 1) a.mode = 'idle';
  } else if (a.mode === 'cheer') {
    const p = Math.min(1, a.t / a.dur);
    const k = Math.sin(p * Math.PI);
    rX = lerp(-0.35, -2.8, k); bob += 0.12 * k;
    if (p >= 1) a.mode = 'idle';
  } else if (a.mode === 'die' || a.mode === 'dead') {
    const p = Math.min(1, a.t / a.dur);
    fall = easeIn(p); drop = 0; rX = lerp(-0.35, -1.2, p); lX = lerp(-0.45, -1.2, p);
    if (p >= 1) a.mode = 'dead';
  }
  rig.legs[0].pivot.rotation.x = leg; rig.legs[1].pivot.rotation.x = -leg;
  R.pivot.rotation.x = rX; R.pivot.rotation.z = rZ;
  L.pivot.rotation.x = lX; L.pivot.rotation.z = lZ;
  R.hand.rotation.x = wrist;
  rig.torso.rotation.x = tX; rig.torso.rotation.y = tY;
  rig.body.position.y = bob - drop; rig.body.position.z = lunge;
  rig.body.rotation.x = -fall * Math.PI / 2 * 0.95;
  if (rig.spin) rig.spin(dt, time);
}

// ---------- Ausrüstungsmodelle ----------
function itemMats(it) {
  const m = itemMaterial(it), R = RARITIES[it.rarity];
  const main = M(m.c, { m: m.m, r: m.r });
  const dark = M(shade(m.c, 0.55), { m: m.m * 0.8, r: Math.min(1, m.r + 0.15) });
  const trim = it.rarity >= 3 ? M(R.col, { m: 0.6, r: 0.3, e: R.col, ei: 0.7 })
    : it.rarity >= 1 ? M(R.col, { m: 0.65, r: 0.35 }) : M(0x6a5640, { r: 0.85, m: 0.2 });
  const glowCol = m.e || (it.rarity >= 3 ? R.col : null);
  const glow = glowCol ? glowM(glowCol, it.rarity >= 4 ? 3 : 2.2) : null;
  const grip = M(0x3b2618, { r: 0.9 });
  const gem = BASES[it.base].mat === 'gem' ? M(m.c, { m: 0.2, r: 0.12, e: m.e, ei: 1.4 }) : glowM(glowCol || R.col, 1.6);
  return { main, dark, trim, glow, grip, gem, m };
}
// Waffen sind entlang +Y gebaut, Griff im Ursprung
function eqWeapon(it) {
  const g = new THREE.Group(), k = itemMats(it), b = it.base;
  if (b === 'sword' || b === 'dagger') {
    const s = b === 'dagger' ? 0.62 : 1;
    mesh(G.cyl(0.035, 0.035, 0.22, 6), k.grip, 0, 0, 0, g);
    mesh(G.sphere(0.05, 6, 5), k.trim, 0, -0.13, 0, g);
    mesh(G.box(0.32 * s + 0.04, 0.05, 0.07), k.trim, 0, 0.12, 0, g);
    const blade = mesh(G.box(0.095 * s + 0.02, 0.72 * s, 0.026), k.main, 0, 0.14 + 0.36 * s, 0, g);
    const tip = mesh(G.cone(0.075 * s + 0.01, 0.16 * s, 4), k.main, 0, 0.14 + 0.72 * s + 0.08 * s, 0, g);
    tip.rotation.y = Math.PI / 4; tip.scale.z = 0.3;
    if (k.glow) mesh(G.box(0.022, 0.6 * s, 0.032), k.glow, 0, 0.16 + 0.34 * s, 0, g, false);
    blade.scale.x = 1;
  } else if (b === 'axe') {
    mesh(G.cyl(0.035, 0.042, 1.0, 6), k.grip, 0, 0.32, 0, g);
    mesh(G.cyl(0.05, 0.05, 0.08, 6), k.trim, 0, 0.7, 0, g);
    const sh = new THREE.Shape();
    sh.moveTo(0, -0.08); sh.quadraticCurveTo(0.18, -0.12, 0.3, -0.24); sh.quadraticCurveTo(0.38, 0, 0.3, 0.24);
    sh.quadraticCurveTo(0.18, 0.12, 0, 0.08); sh.lineTo(0, -0.08);
    const ag = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1, curveSegments: 6 });
    mesh(ag, k.main, 0.02, 0.72, -0.025, g);
    const back = mesh(G.cone(0.05, 0.16, 4), k.dark, -0.08, 0.72, 0, g); back.rotation.z = Math.PI / 2;
    if (k.glow) { const e = mesh(G.tor(0.26, 0.012, 4, 10, 1.2), k.glow, 0.06, 0.72, 0, g, false); e.rotation.z = -0.6; }
  } else if (b === 'hammer') {
    mesh(G.cyl(0.035, 0.045, 0.95, 6), k.grip, 0, 0.3, 0, g);
    mesh(G.box(0.38, 0.22, 0.22), k.main, 0, 0.82, 0, g);
    mesh(G.box(0.08, 0.26, 0.26), k.trim, 0.11, 0.82, 0, g);
    mesh(G.box(0.08, 0.26, 0.26), k.trim, -0.11, 0.82, 0, g);
    mesh(G.cone(0.06, 0.12, 4), k.dark, 0, 0.98, 0, g);
    if (k.glow) { mesh(G.box(0.2, 0.06, 0.23), k.glow, 0, 0.82, 0, g, false); }
  } else if (b === 'staff') {
    mesh(G.cyl(0.03, 0.042, 1.45, 6), k.main, 0, 0.32, 0, g);
    mesh(G.cyl(0.05, 0.05, 0.1, 6), k.trim, 0, 0.98, 0, g);
    for (let i = 0; i < 3; i++) {
      const c = mesh(G.cone(0.03, 0.22, 4), k.trim, 0, 1.12, 0, g);
      c.position.x = Math.cos(i * 2.094) * 0.07; c.position.z = Math.sin(i * 2.094) * 0.07;
      c.rotation.z = -Math.cos(i * 2.094) * 0.35; c.rotation.x = Math.sin(i * 2.094) * 0.35;
    }
    const orbCol = it.rarity >= 1 ? RARITIES[it.rarity].col : 0x8fd8ff;
    const orb = mesh(G.ico(0.09, 1), glowM(k.m.e || orbCol, 2.6), 0, 1.15, 0, g, false);
    g.userData.spin = orb;
  }
  return g;
}
function eqOffhand(it) {
  const g = new THREE.Group(), k = itemMats(it), b = it.base;
  if (b === 'shield' || b === 'buckler') {
    const r = b === 'shield' ? 0.34 : 0.2;
    const disc = mesh(G.cyl(r, r, 0.06, 12), b === 'shield' ? k.main : k.main, 0, 0, 0, g); disc.rotation.x = Math.PI / 2;
    const rim = mesh(G.tor(r, 0.03, 5, 18), k.trim, 0, 0, 0.0, g);
    mesh(G.sphere(r * 0.25, 8, 6), k.trim, 0, 0, 0.04, g);
    if (b === 'shield') {
      for (let i = 0; i < 4; i++) { const s = mesh(G.box(0.04, r * 1.5, 0.02), k.dark, 0, 0, 0.035, g); s.rotation.z = i * Math.PI / 4; }
    }
    if (k.glow) { const gl = mesh(G.tor(r * 0.55, 0.018, 4, 16), k.glow, 0, 0, 0.04, g, false); }
    rim.rotation.z = 0;
  } else if (b === 'orb') {
    const gem = mesh(G.oct(0.13), k.gem, 0, 0.22, 0, g, false);
    const ring = mesh(G.tor(0.18, 0.012, 4, 20), k.trim, 0, 0.22, 0, g, false);
    ring.rotation.x = Math.PI / 2.4;
    g.userData.spin = gem; g.userData.spin2 = ring;
  }
  return g;
}
function eqHead(it, headR = 0.25) {
  const g = new THREE.Group(), k = itemMats(it), b = it.base, s = headR / 0.25;
  if (b === 'helm') {
    const dome = mesh(G.half(0.285 * s, 10, 5), k.main, 0, 0.02 * s, 0, g);
    mesh(G.tor(0.285 * s, 0.035 * s, 5, 16), k.trim, 0, 0.03 * s, 0, g).rotation.x = Math.PI / 2;
    mesh(G.box(0.045 * s, 0.2 * s, 0.04 * s), k.trim, 0, -0.04 * s, 0.28 * s, g);
    if (it.tier >= 1 || it.rarity >= 2) {
      for (const sd of [-1, 1]) {
        const h = mesh(G.cone(0.055 * s, 0.32 * s, 5), M(0xe8dcc0, { r: 0.6 }), sd * 0.3 * s, 0.14 * s, 0, g);
        h.rotation.z = -sd * 1.0;
      }
    }
    if (it.rarity >= 2) { const c = mesh(G.box(0.05 * s, 0.12 * s, 0.34 * s), k.trim, 0, 0.3 * s, -0.02 * s, g); }
    if (k.glow) mesh(G.oct(0.04 * s), k.glow, 0, 0.12 * s, 0.27 * s, g, false);
    dome.scale.set(1, 1.05, 1);
  } else if (b === 'hood') {
    const h = mesh(G.sphere(0.3 * s, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.62), k.main, 0, 0.02 * s, -0.03 * s, g);
    h.material = M(k.m.c, { r: 0.95, ds: true });
    const tip = mesh(G.cone(0.14 * s, 0.32 * s, 7), k.main, 0, 0.12 * s, -0.28 * s, g); tip.rotation.x = -2.1;
    mesh(G.tor(0.29 * s, 0.028 * s, 4, 16, Math.PI), k.trim, 0, 0.02 * s, 0.0, g).rotation.set(-0.3, 0, 0);
    if (k.glow) mesh(G.oct(0.035 * s), k.glow, 0, 0.18 * s, 0.24 * s, g, false);
  } else if (b === 'circlet') {
    const t = mesh(G.tor(0.262 * s, 0.022 * s, 4, 18), M(0xd9b44a, { m: 0.85, r: 0.3 }), 0, 0.07 * s, 0, g); t.rotation.x = Math.PI / 2 - 0.12;
    mesh(G.oct(0.06 * s), k.gem, 0, 0.12 * s, 0.25 * s, g, false);
  }
  return g;
}
function eqChest(it, torsoW = 1) {
  const g = new THREE.Group(), k = itemMats(it), b = it.base;
  if (b === 'plate') {
    const shell = mesh(G.sphere(0.365, 10, 8), k.main, 0, 0.31, 0.01, g); shell.scale.set(torsoW, 1.1, 0.86);
    for (const s of [-1, 1]) {
      const p = mesh(G.half(0.17, 8, 4), k.main, s * 0.39 * torsoW, 0.53, 0, g); p.rotation.z = -s * 0.35; p.scale.set(1.15, 0.9, 1.1);
      mesh(G.tor(0.16, 0.025, 4, 12), k.trim, s * 0.39 * torsoW, 0.5, 0, g).rotation.set(Math.PI / 2, -s * 0.35, 0);
    }
    const band = mesh(G.cyl(0.355, 0.36, 0.06, 10), k.trim, 0, 0.42, 0.01, g); band.scale.set(torsoW, 1, 0.87);
    if (k.glow) mesh(G.oct(0.06), k.glow, 0, 0.32, 0.31, g, false);
  } else if (b === 'jerkin') {
    const shell = mesh(G.sphere(0.36, 10, 8), k.main, 0, 0.3, 0, g); shell.scale.set(torsoW, 1.1, 0.85);
    const strap = mesh(G.box(0.07, 0.75, 0.04), k.dark, 0, 0.3, 0.3, g); strap.rotation.z = 0.6;
    mesh(G.cyl(0.22, 0.26, 0.08, 10), k.dark, 0, 0.6, 0, g);
    for (const s of [-1, 1]) mesh(G.sphere(0.14, 7, 5), k.main, s * 0.37 * torsoW, 0.5, 0, g);
    mesh(G.box(0.06, 0.06, 0.03), k.trim, 0.12, 0.42, 0.29, g);
    if (k.glow) mesh(G.oct(0.045), k.glow, 0, 0.36, 0.3, g, false);
  } else if (b === 'robe') {
    const shell = mesh(G.sphere(0.36, 10, 8), k.main, 0, 0.3, 0, g); shell.scale.set(torsoW, 1.1, 0.85);
    const skirt = mesh(G.cyl(0.33, 0.45, 0.42, 10, 1), k.main, 0, -0.14, 0, g); skirt.scale.z = 0.85;
    const hem = mesh(G.tor(0.45, 0.025, 4, 18), k.trim, 0, -0.35, 0, g); hem.rotation.x = Math.PI / 2; hem.scale.y = 0.85;
    const col = mesh(G.tor(0.2, 0.04, 4, 14), k.trim, 0, 0.6, 0, g); col.rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) mesh(G.sphere(0.135, 7, 5), k.main, s * 0.37 * torsoW, 0.5, 0, g);
    if (k.glow) mesh(G.box(0.05, 0.5, 0.03), k.glow, 0, 0.1, 0.31, g, false);
  }
  return g;
}
function eqFoot(it) {
  const g = new THREE.Group(), k = itemMats(it);
  if (it.base === 'boots') {
    mesh(G.box(0.23, 0.17, 0.33), k.main, 0, 0.01, 0.05, g);
    mesh(G.cyl(0.13, 0.14, 0.14, 8), k.main, 0, 0.12, 0, g);
    mesh(G.cyl(0.145, 0.145, 0.04, 8), k.trim, 0, 0.19, 0, g);
    if (k.glow) mesh(G.box(0.03, 0.05, 0.05), k.glow, 0, 0.06, 0.22, g, false);
  } else {
    mesh(G.box(0.21, 0.14, 0.32), k.main, 0, 0, 0.05, g);
    mesh(G.cyl(0.12, 0.12, 0.1, 8), k.dark, 0, 0.1, 0, g);
    mesh(G.box(0.22, 0.03, 0.06), k.trim, 0, 0.04, 0.14, g);
  }
  return g;
}
function eqAmulet(it) {
  const g = new THREE.Group(), k = itemMats(it);
  const t = mesh(G.tor(0.17, 0.01, 3, 18, Math.PI), M(0xd9b44a, { m: 0.85, r: 0.3 }), 0, 0, 0, g, false); t.rotation.z = Math.PI;
  mesh(G.oct(0.055), k.gem, 0, -0.18, 0.01, g, false);
  mesh(G.tor(0.05, 0.01, 3, 10), M(0xd9b44a, { m: 0.85, r: 0.3 }), 0, -0.18, 0, g, false);
  return g;
}

// Held mit Ausrüstung bekleiden
function dressRig(rig, eq) {
  for (const o of rig.equip) { o.removeFromParent(); o.traverse(c => c.geometry?.dispose()); }
  rig.equip = [];
  const add = (parent, obj) => { parent.add(obj); rig.equip.push(obj); return obj; };
  rig.spinners = [];
  if (eq.weapon) {
    const w = add(rig.arms.R.mount, eqWeapon(eq.weapon));
    w.rotation.x = 1.6;
    if (w.userData.spin) rig.spinners.push(w.userData.spin);
  }
  if (eq.offhand) {
    const o = add(rig.arms.L.mount, eqOffhand(eq.offhand));
    if (eq.offhand.base === 'orb') { o.position.set(0.05, 0.05, 0.1); rig.spinners.push(o.userData.spin, o.userData.spin2); }
    else { o.position.set(0.1, 0.02, 0.12); o.rotation.y = 0.65; }
  }
  if (eq.head) { add(rig.head, eqHead(eq.head, rig.d.headR)); }
  if (rig.hair) rig.hair.visible = !eq.head || eq.head.base === 'circlet';
  if (eq.chest) add(rig.torso, eqChest(eq.chest, rig.d.torsoW));
  for (const l of rig.legs) {
    l.shoe.visible = !eq.feet;
    if (eq.feet) add(l.foot, eqFoot(eq.feet));
  }
  if (eq.amulet) { const a = add(rig.torso, eqAmulet(eq.amulet)); a.position.set(0, 0.64, 0.12); a.rotation.x = 0.35; }
  rig.spin = (dt, t) => { for (const s of rig.spinners) if (s) { s.rotation.y += dt * 1.6; s.position.y += Math.sin(t * 2.2) * 0.0008; } };
}

function buildHero() {
  const rig = buildRig({ skin: 0xe8b38c, cloth: 0x41617c, pants: 0x4b3b2d, shoe: 0x3a2a1e, legLen: 0.42, torsoW: 1.08, headR: 0.25, armLen: 0.45 });
  const h = rig.head;
  const hairC = 0xb5582a;
  rig.hair = mesh(G.sphere(0.262, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58), M(hairC), 0, 0.02, -0.02, h);
  const beard = mesh(G.cone(0.19, 0.44, 8), M(hairC), 0, -0.31, 0.13, h); beard.rotation.x = Math.PI + 0.3;
  beard.scale.set(1.15, 1, 0.7);
  for (const s of [-1, 1]) {
    const m = mesh(G.sphere(0.065, 7, 5), M(hairC), s * 0.065, -0.085, 0.215, h); m.scale.set(1.35, 0.55, 0.7); m.rotation.z = s * 0.35;
    const br = mesh(G.box(0.09, 0.025, 0.03), M(0x8a3e1c), s * 0.085, 0.09, 0.225, h); br.rotation.z = -s * 0.2;
  }
  mesh(G.sphere(0.06, 7, 5), M(0xd99b74), 0, -0.01, 0.245, h);
  mesh(G.sphere(0.035, 6, 5), M(0xd9b44a, { m: 0.8, r: 0.3 }), 0, -0.55, 0.26, h);
  rig.seed = 0;
  return rig;
}

// ---------- Monster ----------
function cloneMats(root) {
  const mats = [];
  root.traverse(o => {
    if (o.isMesh) { o.material = o.material.clone(); o.material.userData = { e0: o.material.emissive.getHex(), ei0: o.material.emissiveIntensity }; mats.push(o.material); }
  });
  return mats;
}
function buildMonster(mon) {
  const M_ = mon.M; let ent;
  if (M_.model === 'humanoid') ent = buildHumanoidMob(M_.look);
  else if (M_.model === 'blob') ent = buildBlob(M_);
  else if (M_.model === 'shroom') ent = buildShroom();
  else if (M_.model === 'golem') ent = buildGolem(M_);
  else ent = buildWisp(M_);
  const sc = mon.boss ? (M_.model === 'humanoid' ? 1.85 : M_.model === 'golem' ? 1.45 : 1.9) : 1;
  ent.root.scale.setScalar(sc);
  ent.height = (ent.height || 1.5) * sc;
  ent.reach = (ent.reach || 0.6) * sc;
  if (mon.boss) {
    const ring = mesh(G.tor(0.9, 0.03, 4, 32), glowM(M_.glow || 0xff6a3a, 2.5), 0, 0.03, 0, ent.root, false);
    ring.rotation.x = Math.PI / 2; ring.scale.setScalar(1 / sc * 1.4);
    ent.ring = ring;
  }
  ent.mats = cloneMats(ent.root);
  ent.flash = 0;
  ent.anim = ent.anim || { mode: 'idle', t: 0, dur: 1, phase: 0 };
  ent.seed = Math.random() * 10;
  return ent;
}
function buildHumanoidMob(look) {
  let rig;
  if (look === 'goblin') {
    rig = buildRig({ skin: 0x7ab35a, cloth: 0x5b4632, pants: 0x3d3226, legLen: 0.36, torsoW: 0.82, headR: 0.25, armLen: 0.44, armSkin: true, eyeGlow: 0xffd84a });
    for (const s of [-1, 1]) { const e = mesh(G.cone(0.08, 0.3, 5), M(0x7ab35a), s * 0.28, 0.06, -0.02, rig.head); e.rotation.z = s * 1.25; e.scale.z = 0.4; }
    mesh(G.cone(0.05, 0.16, 5), M(0x6a9c4c), 0, -0.02, 0.27, rig.head).rotation.x = Math.PI / 2;
    const w = eqWeapon({ base: 'dagger', tier: 1, rarity: 0, slot: 'weapon' }); rig.arms.R.mount.add(w); w.rotation.x = 1.6;
  } else if (look === 'kobold') {
    rig = buildRig({ skin: 0x9a8670, cloth: 0x8a5a2a, pants: 0x4a3626, legLen: 0.38, torsoW: 0.9, headR: 0.24, armLen: 0.44, armSkin: true, eyeGlow: 0xff9a3a });
    mesh(G.half(0.27, 10, 5), M(0xc9a23a, { m: 0.5, r: 0.5 }), 0, 0.03, 0, rig.head);
    mesh(G.cyl(0.035, 0.035, 0.1, 6), M(0xf2e6c8), 0, 0.3, 0.12, rig.head);
    makeFire(rig.head, 0, 0.35, 0.12, 0.35, false);
    mesh(G.cone(0.06, 0.18, 5), M(0x8a7660), 0, -0.02, 0.27, rig.head).rotation.x = Math.PI / 2;
    const pk = new THREE.Group();
    mesh(G.cyl(0.03, 0.035, 0.85, 6), M(0x5a3a22), 0, 0.3, 0, pk);
    const hd = mesh(G.tor(0.26, 0.035, 4, 10, Math.PI * 0.8), M(0x7f8891, { m: 0.7, r: 0.5 }), 0, 0.5, 0, pk); hd.rotation.z = Math.PI * 0.1;
    rig.arms.R.mount.add(pk); pk.rotation.x = 1.6;
  } else if (look === 'skeleton') {
    rig = buildRig({ skin: 0xe6dfcb, cloth: 0xd2cab4, pants: 0xd2cab4, shoe: 0xbfb7a2, legLen: 0.48, limb: 0.6, torsoW: 0.82, headR: 0.24, armLen: 0.5, armSkin: true, eyeGlow: 0x6fe8ff });
    rig.chest.scale.set(0.7, 1.0, 0.6);
    for (let i = 0; i < 3; i++) { const r = mesh(G.tor(0.2 - i * 0.02, 0.025, 4, 12), M(0xe6dfcb), 0, 0.4 - i * 0.1, 0, rig.torso); r.rotation.x = Math.PI / 2; }
    mesh(G.box(0.2, 0.08, 0.14), M(0xe6dfcb), 0, -0.16, 0.1, rig.head);
    const helm = eqHead({ base: 'helm', tier: 1, rarity: 0, slot: 'head' }, 0.24); rig.head.add(helm);
    const w = eqWeapon({ base: 'sword', tier: 1, rarity: 0, slot: 'weapon' }); rig.arms.R.mount.add(w); w.rotation.x = 1.6;
    const sh = eqOffhand({ base: 'buckler', tier: 0, rarity: 0, slot: 'offhand' }); rig.arms.L.mount.add(sh); sh.position.set(0.1, 0, 0.1); sh.rotation.y = 0.65;
  } else if (look === 'troll') {
    rig = buildRig({ skin: 0x7d9466, cloth: 0x4c5c33, pants: 0x5d4a33, shoe: 0x4a3a26, legLen: 0.5, limb: 1.45, torsoW: 1.35, headR: 0.24, armLen: 0.66, armSkin: true, eyeGlow: 0xffb84a });
    rig.neck.position.y = 0.55; rig.neck.position.z = 0.12;
    for (const s of [-1, 1]) {
      mesh(G.cone(0.035, 0.14, 5), M(0xf2e8d0), s * 0.08, -0.12, 0.22, rig.head);
      mesh(rockGeo(0.16, 0.3, 0, s + 3), M(0x4f7a3a), s * 0.42, 0.64, 0, rig.torso);
    }
    mesh(G.sphere(0.07, 6, 5), M(0x6a8256), 0, 0.0, 0.26, rig.head);
    const club = new THREE.Group();
    mesh(G.cyl(0.13, 0.05, 1.0, 7), M(0x6b4a2a), 0, 0.45, 0, club);
    for (let i = 0; i < 5; i++) { const sp = mesh(G.cone(0.035, 0.12, 4), M(0x9a9a9a, { m: 0.5 }), Math.cos(i * 1.3) * 0.12, 0.6 + i * 0.07, Math.sin(i * 1.3) * 0.12, club); sp.rotation.z = -Math.cos(i * 1.3) * 1.5; sp.rotation.x = Math.sin(i * 1.3) * 1.5; }
    rig.arms.R.mount.add(club); club.rotation.x = 1.6;
  } else if (look === 'giant') {
    rig = buildRig({ skin: 0xa9cbe0, cloth: 0x7a6650, pants: 0x5a4a3a, shoe: 0x4a3a2a, legLen: 0.5, limb: 1.4, torsoW: 1.3, headR: 0.25, armLen: 0.64, armSkin: true, eyeGlow: 0x9fe8ff });
    const beard = mesh(G.cone(0.2, 0.5, 8), M(0xf2f6fa), 0, -0.24, 0.12, rig.head); beard.rotation.x = Math.PI + 0.25; beard.scale.z = 0.7;
    mesh(G.sphere(0.27, 9, 7, 0, Math.PI * 2, 0, Math.PI * 0.5), M(0xf2f6fa), 0, 0.02, -0.02, rig.head);
    for (const s of [-1, 1]) mesh(G.sphere(0.2, 7, 5), M(0xe8e0d0), s * 0.42, 0.6, 0, rig.torso);
    const club = new THREE.Group();
    mesh(G.cyl(0.05, 0.05, 0.9, 6), M(0x5a4030), 0, 0.3, 0, club);
    mesh(G.oct(0.22), M(0xbfe8ff, { e: 0x5fc8ff, ei: 1.2, r: 0.1, m: 0.2 }), 0, 0.85, 0, club, false).scale.set(0.8, 1.4, 0.8);
    rig.arms.R.mount.add(club); club.rotation.x = 1.6;
  } else { // shade
    rig = buildRig({ skin: 0x3a2e52, cloth: 0x231b36, pants: 0x1a1428, shoe: 0x140f20, legLen: 0.38, torsoW: 0.85, headR: 0.24, armLen: 0.46, armSkin: true, eyeGlow: 0xd08cff, eyeScale: 1.3 });
    mesh(G.cone(0.3, 0.5, 8), M(0x231b36, { ds: true }), 0, 0.08, -0.04, rig.head).scale.z = 0.9;
    const w = eqWeapon({ base: 'dagger', tier: 5, rarity: 3, slot: 'weapon' }); rig.arms.R.mount.add(w); w.rotation.x = 1.6;
  }
  rig.height = 0.9 + rig.d.legLen + rig.d.headR * 2.2;
  rig.reach = 0.45 * rig.d.torsoW;
  return rig;
}
function buildBlob(M_) {
  const root = new THREE.Group(), body = grp(root);
  const m = M_.glow ? M(M_.color, { e: M_.glow, ei: 0.35, r: 0.35 }) : M(M_.color, { r: 0.35, m: 0.05 });
  const blob = mesh(G.sphere(0.52, 12, 9), m, 0, 0.42, 0, body); blob.scale.set(1, 0.82, 1);
  if (M_.glow) mesh(G.ico(0.2, 0), glowM(M_.glow, 2.4), 0, 0.42, 0, body, false);
  for (const s of [-1, 1]) {
    mesh(G.sphere(0.1, 8, 6), M(0xf8f4ea, { r: 0.3 }), s * 0.17, 0.58, 0.4, body);
    mesh(G.sphere(0.05, 6, 5), M(0x161210, { r: 0.2 }), s * 0.17, 0.58, 0.48, body, false);
  }
  mesh(G.tor(0.08, 0.02, 4, 8, Math.PI), M(0x2a1a14), 0, 0.42, 0.47, body, false).rotation.z = Math.PI;
  for (let i = 0; i < 4; i++) mesh(G.sphere(0.06 + Math.random() * 0.04, 6, 5), m, Math.cos(i * 1.6) * 0.4, 0.1, Math.sin(i * 1.6) * 0.4, body);
  return { type: 'blob', root, body, main: blob, height: 0.95, reach: 0.5, anim: { mode: 'idle', t: 0, dur: 1 } };
}
function buildShroom() {
  const root = new THREE.Group(), body = grp(root);
  mesh(G.cyl(0.2, 0.26, 0.55, 9), M(0xf0e2c4, { r: 0.7 }), 0, 0.42, 0, body);
  const cap = mesh(G.half(0.5, 12, 5), M(0xc9483a, { r: 0.55 }), 0, 0.66, 0, body); cap.scale.set(1, 0.75, 1);
  mesh(G.cyl(0.5, 0.5, 0.04, 12), M(0xe6d2b0), 0, 0.66, 0, body);
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9, r = 0.22 + (i % 2) * 0.12;
    mesh(G.sphere(0.06, 6, 4), M(0xfaf2e2), Math.cos(a) * r, 0.66 + Math.sqrt(Math.max(0, 0.25 - r * r)) * 0.75, Math.sin(a) * r, body, false).scale.y = 0.5;
  }
  for (const s of [-1, 1]) {
    mesh(G.sphere(0.05, 6, 5), M(0x161210), s * 0.09, 0.48, 0.21, body, false);
    mesh(G.sphere(0.07, 6, 5), M(0xf0e2c4), s * 0.12, 0.08, 0.06, body);
  }
  return { type: 'blob', root, body, main: cap, height: 1.1, reach: 0.45, anim: { mode: 'idle', t: 0, dur: 1 } };
}
function buildGolem(M_) {
  const root = new THREE.Group(), body = grp(root);
  const rm = M(M_.color, { r: 0.9 });
  const torso = mesh(rockGeo(0.55, 0.22, 0, 7), rm, 0, 1.05, 0, body); torso.scale.set(1.1, 1, 0.85);
  const head = mesh(rockGeo(0.24, 0.2, 0, 2), rm, 0, 1.62, 0.18, body);
  const eyeM = glowM(M_.glow || 0xffd27a, 3);
  for (const s of [-1, 1]) mesh(G.box(0.07, 0.04, 0.04), eyeM, s * 0.09, 1.64, 0.4, body, false);
  const arms = {};
  for (const s of [-1, 1]) {
    const pivot = grp(body, s * 0.62, 1.3, 0);
    mesh(rockGeo(0.2, 0.25, 0, s + 5), rm, 0, -0.05, 0, pivot);
    mesh(rockGeo(0.17, 0.25, 0, s + 9), rm, 0, -0.4, 0.04, pivot);
    mesh(rockGeo(0.24, 0.2, 0, s + 11), rm, 0, -0.78, 0.08, pivot);
    arms[s < 0 ? 'R' : 'L'] = { pivot };
  }
  const legs = [];
  for (const s of [-1, 1]) {
    const pivot = grp(body, s * 0.28, 0.55, 0);
    mesh(rockGeo(0.22, 0.2, 0, s + 13), rm, 0, -0.3, 0, pivot);
    legs.push({ pivot });
  }
  if (M_.glow) {
    for (let i = 0; i < 6; i++) {
      const c = mesh(G.cone(0.08, 0.36 + Math.random() * 0.2, 5), glowM(M_.glow, 1.8), rand(-0.35, 0.35), 1.35 + rand(0, 0.2), -0.32 - rand(0, 0.1), body, false);
      c.rotation.set(-0.6 + rand(-0.3, 0.3), 0, rand(-0.6, 0.6));
    }
    mesh(G.oct(0.12), glowM(M_.glow, 3), 0, 1.1, 0.46, body, false);
  }
  return { type: 'golem', root, body, arms, legs, height: 1.9, reach: 0.7, anim: { mode: 'idle', t: 0, dur: 1 } };
}
function buildWisp(M_) {
  const root = new THREE.Group(), body = grp(root, 0, 1.0, 0);
  mesh(G.ico(0.24, 1), glowM(M_.glow, 2.6), 0, 0, 0, body, false);
  const shell = mesh(G.ico(0.4, 0), M(M_.color, { op: 0.35, r: 0.1, e: M_.glow, ei: 0.4 }), 0, 0, 0, body, false);
  const shards = [];
  for (let i = 0; i < 5; i++) { const s = mesh(G.oct(0.08), M(M_.color, { e: M_.glow, ei: 0.8, r: 0.2 }), 0, 0, 0, body, false); shards.push(s); }
  for (const s of [-1, 1]) mesh(G.sphere(0.05, 6, 5), M(0x0e1a24), s * 0.09, 0.05, 0.36, body, false);
  return { type: 'wisp', root, body, shell, shards, height: 1.5, reach: 0.4, anim: { mode: 'idle', t: 0, dur: 1 } };
}
// Bewegung für alle Monster
function poseMonster(e, dt, time) {
  if (e.type === 'rig') { poseRig(e, dt, time); }
  else {
    const a = e.anim; a.t += dt;
    const p = Math.min(1, a.t / a.dur);
    let sx = 1, sy = 1, lunge = 0, y = 0, fall = 0;
    const idleB = Math.sin(time * 3 + e.seed);
    if (e.type === 'blob') { sy = 1 + idleB * 0.05; sx = 1 - idleB * 0.03; }
    if (e.type === 'wisp') { y = Math.sin(time * 2 + e.seed) * 0.12; e.shell.rotation.y += dt; e.shell.rotation.x += dt * 0.6; e.shards.forEach((s, i) => { const an = time * 2 + i * 1.256; s.position.set(Math.cos(an) * 0.6, Math.sin(an * 1.3) * 0.25, Math.sin(an) * 0.6); s.rotation.y += dt * 3; }); }
    if (e.type === 'golem') { y = idleB * 0.02; }
    let armR = 0, armL = 0, leg = 0;
    if (a.mode === 'attack') {
      if (p < 0.45) { const k = easeOut(p / 0.45); sy = 1 - 0.18 * k; sx = 1 + 0.12 * k; lunge = -0.12 * k; armR = 2.2 * k; }
      else if (p < 0.6) { const k = (p - 0.45) / 0.15; sy = lerp(0.82, 1.18, k); sx = lerp(1.12, 0.9, k); lunge = lerp(-0.12, 0.45, k); armR = lerp(2.2, -1.2, k); }
      else { const k = easeOut((p - 0.6) / 0.4); sy = lerp(1.18, 1, k); sx = lerp(0.9, 1, k); lunge = lerp(0.45, 0, k); armR = lerp(-1.2, 0, k); }
      if (p >= 1) a.mode = 'idle';
    } else if (a.mode === 'hit') { lunge = -0.15 * (1 - p); sy = 1 - 0.1 * (1 - p); if (p >= 1) a.mode = 'idle'; }
    else if (a.mode === 'walk') { a.phase = (a.phase || 0) + dt * 8; leg = Math.sin(a.phase) * 0.5; y += Math.abs(Math.sin(a.phase)) * 0.06; }
    else if (a.mode === 'die' || a.mode === 'dead') { fall = easeIn(p); sy = 1 - 0.85 * fall; sx = 1 + 0.4 * fall; if (p >= 1) a.mode = 'dead'; }
    e.body.scale.set(sx, sy, sx);
    e.body.position.z = lunge;
    e.body.position.y = (e.type === 'wisp' ? 1.0 : 0) + y - (e.type === 'wisp' ? fall * 0.8 : 0);
    if (e.arms) { e.arms.R.pivot.rotation.x = armR; e.arms.L.pivot.rotation.x = Math.sin(time * 2 + e.seed) * 0.08; }
    if (e.legs) { e.legs[0].pivot.rotation.x = leg; e.legs[1].pivot.rotation.x = -leg; }
  }
  // Trefferblitz
  if (e.mats) {
    if (e.flash > 0) e.flash = Math.max(0, e.flash - dt * 5);
    for (const m of e.mats) {
      if (e.flash > 0) { m.emissive.setHex(0xffffff); m.emissiveIntensity = e.flash * 1.4; }
      else { m.emissive.setHex(m.userData.e0); m.emissiveIntensity = m.userData.ei0; }
    }
  }
  if (e.ring) e.ring.rotation.z += dt * 0.6;
}
