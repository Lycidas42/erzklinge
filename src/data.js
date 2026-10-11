// ============================================================
//  Erzklinge – Daten, Regeln, Formeln (ohne Grafik)
// ============================================================
const SAVE_KEY = 'erzklinge-save-v1';
const OFFLINE_CAP = 8 * 3600; // Sekunden
const INV_MAX = 30;

const ATTR_KEYS = ['str', 'dex', 'int', 'vit'];
const ATTRS = {
  str: { name: 'Stärke', short: 'STÄ', prim: 'Angriffsschaden', sec: 'Rüstung' },
  dex: { name: 'Geschicklichkeit', short: 'GES', prim: 'Angriffstempo', sec: 'Kritische Treffer' },
  int: { name: 'Intelligenz', short: 'INT', prim: 'Magieschaden', sec: 'Mana' },
  vit: { name: 'Vitalität', short: 'VIT', prim: 'Leben', sec: 'Lebensregeneration' },
};

const SLOTS = [
  { id: 'head', name: 'Kopf' },
  { id: 'amulet', name: 'Hals' },
  { id: 'chest', name: 'Brust' },
  { id: 'weapon', name: 'Waffe' },
  { id: 'offhand', name: 'Neben\u00adhand' },
  { id: 'feet', name: 'Füße' },
];
const SLOT_NAME = Object.fromEntries(SLOTS.map(s => [s.id, s.name]));

const RARITIES = [
  { id: 'common', name: 'Gewöhnlich', affixes: 0, mult: 1.0, value: 1, weight: 60, col: 0xd4cfc4 },
  { id: 'magic', name: 'Magisch', affixes: 1, mult: 1.1, value: 2, weight: 28, col: 0x7fb2ff },
  { id: 'rare', name: 'Selten', affixes: 2, mult: 1.22, value: 4, weight: 9, col: 0xf4cd57 },
  { id: 'epic', name: 'Episch', affixes: 3, mult: 1.38, value: 9, weight: 2.6, col: 0xc99bff },
  { id: 'legendary', name: 'Legendär', affixes: 4, mult: 1.6, value: 20, weight: 0.4, col: 0xff9147 },
];

// Materialstufen nach Gegenstandsstufe
const TIER_LEVELS = [1, 8, 16, 26, 38, 52];
const MATERIALS = {
  metal: [
    { n: 'Bronze', c: 0xb27b3f, m: 0.75, r: 0.42 },
    { n: 'Eisen', c: 0x7f8891, m: 0.7, r: 0.5 },
    { n: 'Stahl', c: 0xc9d1d9, m: 0.85, r: 0.3 },
    { n: 'Glutstahl', c: 0x4d3530, m: 0.7, r: 0.4, e: 0xff5a14 },
    { n: 'Mithril', c: 0xa8dcef, m: 0.9, r: 0.22, e: 0x2c8fc0 },
    { n: 'Sternenerz', c: 0xe9d28b, m: 0.95, r: 0.2, e: 0x9a6cff },
  ],
  wood: [
    { n: 'Eichen', c: 0x7a5232, m: 0, r: 0.85 },
    { n: 'Eschen', c: 0xa98559, m: 0, r: 0.8 },
    { n: 'Eiben', c: 0x8d3f2a, m: 0, r: 0.75 },
    { n: 'Ebenholz', c: 0x2b2522, m: 0.1, r: 0.55 },
    { n: 'Glutholz', c: 0x5a2a1a, m: 0, r: 0.6, e: 0xff7a2a },
    { n: 'Weltenholz', c: 0xd9e3c4, m: 0.1, r: 0.5, e: 0x7fffd0 },
  ],
  cloth: [
    { n: 'Leinen', c: 0xcbb994, m: 0, r: 0.95 },
    { n: 'Woll', c: 0x5d6e8a, m: 0, r: 0.95 },
    { n: 'Seiden', c: 0x7c3550, m: 0, r: 0.6 },
    { n: 'Glutseiden', c: 0x8a2c16, m: 0, r: 0.55, e: 0xff6a20 },
    { n: 'Mondseiden', c: 0x2f4f86, m: 0.1, r: 0.45, e: 0x88b8ff },
    { n: 'Sternengarn', c: 0x34205c, m: 0.2, r: 0.4, e: 0xc08cff },
  ],
  leather: [
    { n: 'Rohleder', c: 0x8a5a36, m: 0, r: 0.9 },
    { n: 'Gerbleder', c: 0x6b3f22, m: 0, r: 0.8 },
    { n: 'Wildleder', c: 0x9b7a4c, m: 0, r: 0.95 },
    { n: 'Schattenleder', c: 0x2f2a30, m: 0.1, r: 0.6 },
    { n: 'Wyrmleder', c: 0x2f5a46, m: 0.2, r: 0.5, e: 0x3fd69a },
    { n: 'Drachenleder', c: 0x7a1e1a, m: 0.25, r: 0.45, e: 0xff5040 },
  ],
  gem: [
    { n: 'Quarz', c: 0xf2dce8, m: 0.1, r: 0.15, e: 0xffd6ec },
    { n: 'Bernstein', c: 0xe39a2a, m: 0.1, r: 0.2, e: 0xffa030 },
    { n: 'Saphir', c: 0x2f62d8, m: 0.1, r: 0.15, e: 0x4f8cff },
    { n: 'Rubin', c: 0xc8203a, m: 0.1, r: 0.15, e: 0xff3050 },
    { n: 'Mondstein', c: 0xcfe9ff, m: 0.2, r: 0.1, e: 0x9fdcff },
    { n: 'Sternsplitter', c: 0x9b6cff, m: 0.3, r: 0.1, e: 0xb98cff },
  ],
};

const BASES = {
  sword:   { slot: 'weapon',  stem: 'schwert',     type: 'Schwert',      mat: 'metal',   req: 'str', dmg: [4, 7],  spd: 1.15 },
  axe:     { slot: 'weapon',  stem: 'axt',         type: 'Axt',          mat: 'metal',   req: 'str', dmg: [6, 10], spd: 0.92 },
  hammer:  { slot: 'weapon',  stem: 'hammer',      type: 'Kriegshammer', mat: 'metal',   req: 'str', dmg: [9, 14], spd: 0.74 },
  dagger:  { slot: 'weapon',  stem: 'dolch',       type: 'Dolch',        mat: 'metal',   req: 'dex', dmg: [3, 5],  spd: 1.6, crit: 3 },
  staff:   { slot: 'weapon',  stem: 'stab',        type: 'Runenstab',    mat: 'wood',    req: 'int', dmg: [2, 4],  spd: 1.0, magic: [5, 8] },
  shield:  { slot: 'offhand', stem: 'schild',      type: 'Rundschild',   mat: 'metal',   req: 'str', armor: 6 },
  buckler: { slot: 'offhand', stem: 'faustschild', type: 'Faustschild',  mat: 'leather', req: 'dex', armor: 3, crit: 2 },
  orb:     { slot: 'offhand', stem: 'rune',        type: 'Runenstein',   mat: 'gem',     req: 'int', armor: 1, magicFlat: 2 },
  helm:    { slot: 'head',    stem: 'helm',        type: 'Helm',         mat: 'metal',   req: 'str', armor: 4 },
  hood:    { slot: 'head',    stem: 'kapuze',      type: 'Kapuze',       mat: 'cloth',   req: 'dex', armor: 2 },
  circlet: { slot: 'head',    stem: 'reif',        type: 'Stirnreif',    mat: 'gem',     req: 'int', armor: 1 },
  plate:   { slot: 'chest',   stem: 'harnisch',    type: 'Harnisch',     mat: 'metal',   req: 'str', armor: 9 },
  jerkin:  { slot: 'chest',   stem: 'wams',        type: 'Wams',         mat: 'leather', req: 'dex', armor: 5 },
  robe:    { slot: 'chest',   stem: 'robe',        type: 'Robe',         mat: 'cloth',   req: 'int', armor: 3 },
  boots:   { slot: 'feet',    stem: 'stiefel',     type: 'Stiefel',      mat: 'metal',   req: 'str', armor: 3 },
  shoes:   { slot: 'feet',    stem: 'schuhe',      type: 'Schuhe',       mat: 'leather', req: 'dex', armor: 2 },
  amulet:  { slot: 'amulet',  stem: 'amulett',     type: 'Amulett',      mat: 'gem',     req: null,  armor: 0 },
};
const BASE_IDS = Object.keys(BASES);

const AFFIXES = {
  str:   { suffix: 'des Ochsen',      roll: l => 1 + l * 0.45, fmt: v => `+${v} Stärke` },
  dex:   { suffix: 'des Luchses',     roll: l => 1 + l * 0.45, fmt: v => `+${v} Geschicklichkeit` },
  int:   { suffix: 'der Eule',        roll: l => 1 + l * 0.45, fmt: v => `+${v} Intelligenz` },
  vit:   { suffix: 'des Bären',       roll: l => 1 + l * 0.45, fmt: v => `+${v} Vitalität` },
  crit:  { suffix: 'der Präzision',   roll: l => 1 + l * 0.07, fmt: v => `+${fmtNum(v, 1)} % Kritische Trefferchance`, dec: 1 },
  aspd:  { suffix: 'der Eile',        roll: l => 3 + l * 0.22, fmt: v => `+${v} % Angriffstempo` },
  life:  { suffix: 'des Lebens',      roll: l => 8 + l * 4.5,  fmt: v => `+${v} Leben` },
  armor: { suffix: 'des Wächters',    roll: l => 2 + l * 0.9,  fmt: v => `+${v} Rüstung` },
  magic: { suffix: 'der Runen',       roll: l => 1 + l * 0.6,  fmt: v => `+${v} Magieschaden` },
  regen: { suffix: 'der Erneuerung',  roll: l => 0.3 + l * 0.06, fmt: v => `+${fmtNum(v, 1)} Leben/s`, dec: 1 },
};
const AFFIX_IDS = Object.keys(AFFIXES);

const LEGEND_NAMES = ['Ahnenstolz', 'Glutherz', 'Bergkönigs Zorn', 'Tiefenruf', 'Runenwacht', 'Sternenamboss',
  'Grollbart', 'Erzseele', 'Hallenhüter', 'Funkenschlag', 'Steinschwur', 'Letzter Hammer'];

// ---------- Zonen & Monster ----------
const ZONES = [
  { id: 'moos',  name: 'Moosgrund',      sub: 'Nebelwald am Bergfuß',     lvl: 1,  mobs: ['slime', 'shroom', 'goblin'],      boss: 'troll' },
  { id: 'glut',  name: 'Glutstollen',    sub: 'Verlassene Zwergenmine',   lvl: 10, mobs: ['emberslime', 'kobold', 'golem'],  boss: 'magmagolem' },
  { id: 'frost', name: 'Frostkamm',      sub: 'Eisige Passhöhe',          lvl: 20, mobs: ['skeleton', 'wisp', 'icegolem'],   boss: 'giant' },
  { id: 'stern', name: 'Sternenschlund', sub: 'Riss unter der Welt',      lvl: 32, mobs: ['voidslime', 'shade', 'crystal'],  boss: 'colossus' },
];
const STAGES = 10;

const MOBS = {
  slime:      { name: 'Moosschleim',      model: 'blob',     color: 0x7bc24f, hp: 0.8, dmg: 0.8, spd: 0.8, arm: 0.6 },
  shroom:     { name: 'Pilzling',         model: 'shroom',   color: 0xc9543c, hp: 1.0, dmg: 1.0, spd: 1.0, arm: 1.0 },
  goblin:     { name: 'Goblin-Späher',    model: 'humanoid', look: 'goblin', hp: 0.85, dmg: 1.1, spd: 1.3, arm: 0.8 },
  troll:      { name: 'Grimmholz, der Moostroll', model: 'humanoid', look: 'troll', hp: 5.0, dmg: 1.7, spd: 0.75, arm: 1.5, boss: true },
  emberslime: { name: 'Glutschleim',      model: 'blob',     color: 0xff7a2a, glow: 0xff5a10, hp: 0.8, dmg: 1.0, spd: 0.9, arm: 0.7 },
  kobold:     { name: 'Kobold-Hauer',     model: 'humanoid', look: 'kobold', hp: 1.0, dmg: 1.1, spd: 1.1, arm: 1.0 },
  golem:      { name: 'Steinwächter',     model: 'golem',    color: 0x6e655c, hp: 1.5, dmg: 0.9, spd: 0.7, arm: 1.6 },
  magmagolem: { name: 'Ignar, der Glutgolem', model: 'golem', color: 0x6a4a3e, glow: 0xff5a14, hp: 5.5, dmg: 1.6, spd: 0.7, arm: 2.0, boss: true },
  skeleton:   { name: 'Skelettkrieger',   model: 'humanoid', look: 'skeleton', hp: 0.9, dmg: 1.2, spd: 1.1, arm: 0.9 },
  wisp:       { name: 'Frostirrlicht',    model: 'wisp',     color: 0x9fe4ff, glow: 0x6fd0ff, hp: 0.7, dmg: 1.3, spd: 1.25, arm: 0.5 },
  icegolem:   { name: 'Eisbrocken',       model: 'golem',    color: 0xbfe2f2, glow: 0x7fd4ff, hp: 1.5, dmg: 0.9, spd: 0.7, arm: 1.7 },
  giant:      { name: 'Hrimgar, der Frostriese', model: 'humanoid', look: 'giant', hp: 5.5, dmg: 1.8, spd: 0.7, arm: 1.6, boss: true },
  voidslime:  { name: 'Leerenschleim',    model: 'blob',     color: 0x7a4ad8, glow: 0xa86bff, hp: 0.9, dmg: 1.0, spd: 0.9, arm: 0.8 },
  shade:      { name: 'Schattenkobold',   model: 'humanoid', look: 'shade', hp: 0.85, dmg: 1.3, spd: 1.3, arm: 0.8 },
  crystal:    { name: 'Kristallwächter',  model: 'golem',    color: 0x5e4c92, glow: 0xc08cff, hp: 1.6, dmg: 1.0, spd: 0.7, arm: 1.8 },
  colossus:   { name: 'Vael, der Sternenkoloss', model: 'golem', color: 0x54467e, glow: 0xb98cff, hp: 6.0, dmg: 1.8, spd: 0.65, arm: 2.2, boss: true },
};

// ---------- Hilfsfunktionen ----------
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const nf0 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
function fmtNum(v, dec = 0) {
  if (dec === 1) return nf1.format(v);
  if (Math.abs(v) >= 1e6) return nf1.format(v / 1e6) + ' Mio.';
  return nf0.format(Math.round(v));
}
function fmtTime(s) {
  s = Math.max(0, Math.ceil(s));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60), r = s % 60;
  if (m < 60) return `${m}:${String(r).padStart(2, '0')} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}

// ---------- Spielstand ----------
let S = null; // globaler Spielstand

function newGame() {
  const s = {
    v: 1, name: 'Brokk', level: 1, xp: 0, gold: 30, points: 0,
    attrs: { str: 5, dex: 5, int: 5, vit: 5 },
    trained: { str: 0, dex: 0, int: 0, vit: 0 },
    eq: { head: null, amulet: null, chest: null, weapon: null, offhand: null, feet: null },
    inv: [], hp: 1e9,
    training: { attr: 'str', prog: 0 },
    arena: { zone: 0, stage: 1, auto: true, best: [1, 0, 0, 0], cleared: [false, false, false, false] },
    shop: { items: [], next: 0 },
    stats: { kills: 0, bossKills: 0, deaths: 0, itemsFound: 0 },
    lastSeen: Date.now(), uid: 1,
    settings: { quality: 'high' },
  };
  S = s;
  const w = genItem(1, { base: 'sword', rarity: 0 });
  w.name = 'Rostiges Schwert'; w.dmg = [3, 5]; w.req = { lvl: 1, attr: null, val: 0 };
  const c = genItem(1, { base: 'jerkin', rarity: 0 });
  c.name = 'Flickwams'; c.armor = 3; c.req = { lvl: 1, attr: null, val: 0 };
  s.eq.weapon = w; s.eq.chest = c;
  s.inv.push(genItem(2, { base: 'shield', rarity: 0 }));
  s.hp = computeStats().maxHp;
  return s;
}

// ---------- Gegenstände ----------
function tierFor(ilvl) { let t = 0; TIER_LEVELS.forEach((l, i) => { if (ilvl >= l) t = i; }); return t; }
function rollRarity(boost = 0, min = 0) {
  const ws = RARITIES.map((r, i) => (i < min ? 0 : r.weight * Math.pow(1 + boost, i)));
  let t = Math.random() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < ws.length; i++) { t -= ws[i]; if (t <= 0) return i; }
  return min;
}
function itemMaterial(it) { return MATERIALS[BASES[it.base].mat][it.tier]; }

function genItem(ilvl, o = {}) {
  ilvl = Math.max(1, Math.round(ilvl));
  const baseId = o.base || (o.slot ? pick(BASE_IDS.filter(b => BASES[b].slot === o.slot)) : pick(BASE_IDS));
  const b = BASES[baseId];
  const rarity = o.rarity ?? rollRarity(o.boost || 0, o.minRarity || 0);
  const R = RARITIES[rarity];
  const tier = tierFor(ilvl);
  const scale = (1 + ilvl * 0.13) * R.mult;
  const it = { uid: S ? S.uid++ : Math.floor(Math.random() * 1e9), base: baseId, slot: b.slot, ilvl, tier, rarity, affixes: [] };
  if (b.dmg) {
    const v = rand(0.92, 1.08);
    it.dmg = [Math.max(1, Math.round(b.dmg[0] * scale * v)), Math.max(2, Math.round(b.dmg[1] * scale * v))];
    it.spd = b.spd;
  }
  if (b.magic) it.magic = [Math.round(b.magic[0] * scale), Math.round(b.magic[1] * scale)];
  if (b.armor) it.armor = Math.round(b.armor * (1 + ilvl * 0.12) * R.mult * rand(0.9, 1.1));
  if (b.crit) it.crit = b.crit;
  if (b.magicFlat) it.magicFlat = Math.round(b.magicFlat * scale);
  // Affixe
  const pool = AFFIX_IDS.slice();
  for (let i = 0; i < R.affixes; i++) {
    const id = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const A = AFFIXES[id];
    let v = A.roll(ilvl) * rand(0.75, 1.15) * (1 + rarity * 0.06);
    v = A.dec ? Math.round(v * 10) / 10 : Math.max(1, Math.round(v));
    it.affixes.push({ id, v });
  }
  // Anforderungen
  it.req = { lvl: Math.max(1, Math.floor(ilvl * 0.9)), attr: b.req, val: b.req ? Math.floor(4 + ilvl * 1.3) : 0 };
  // Name
  const mat = MATERIALS[b.mat][tier];
  const compound = mat.n + b.stem;
  if (rarity === 4) it.name = pick(LEGEND_NAMES);
  else if (rarity >= 1 && it.affixes.length) it.name = `${compound} ${AFFIXES[it.affixes[0].id].suffix}`;
  else it.name = compound;
  it.typeLine = compound;
  it.value = Math.floor(4 * Math.pow(1.13, ilvl) * R.value);
  return it;
}
function itemTypeName(it) { return BASES[it.base].type; }
function sellPrice(it) { return it.value; }
function buyPrice(it) { return it.value * 4; }

// ---------- Werte ----------
function attrTotals(eq = S.eq, skipSlot = null) {
  const t = {};
  for (const k of ATTR_KEYS) t[k] = S.attrs[k] + S.trained[k];
  for (const sl in eq) {
    if (sl === skipSlot) continue;
    const it = eq[sl]; if (!it) continue;
    for (const a of it.affixes) if (t[a.id] !== undefined) t[a.id] += a.v;
  }
  return t;
}
function affixSum(eq, id) {
  let s = 0; for (const sl in eq) { const it = eq[sl]; if (it) for (const a of it.affixes) if (a.id === id) s += a.v; }
  return s;
}
function computeStats(eq = S.eq) {
  const A = attrTotals(eq);
  const w = eq.weapon || { dmg: [1, 3], spd: 1.0 };
  const lvl = S.level;
  const strMul = 1 + A.str * 0.025;
  const dmgMin = w.dmg[0] * strMul, dmgMax = w.dmg[1] * strMul;
  const intMul = 1 + A.int * 0.03;
  let mMin = 0, mMax = 0;
  if (w.magic) { mMin += w.magic[0]; mMax += w.magic[1]; }
  const flatMagic = affixSum(eq, 'magic') + (eq.offhand?.magicFlat || 0);
  mMin = (mMin + flatMagic) * intMul + A.int * 0.15;
  mMax = (mMax + flatMagic) * intMul + A.int * 0.15;
  const aspd = Math.min(4, (w.spd || 1) * (1 + A.dex * 0.012 + affixSum(eq, 'aspd') / 100));
  const crit = Math.min(75, 5 + A.dex * 0.25 + affixSum(eq, 'crit') + (w.crit || 0) + (eq.offhand?.crit || 0));
  const critMult = 1.5 + A.dex * 0.002;
  let armor = A.str * 0.4 + affixSum(eq, 'armor');
  for (const sl in eq) if (eq[sl]?.armor) armor += eq[sl].armor;
  const maxHp = 60 + A.vit * 12 + lvl * 6 + affixSum(eq, 'life');
  const regen = A.vit * 0.15 + lvl * 0.05 + affixSum(eq, 'regen');
  const mana = 30 + A.int * 4;
  const avgHit = (dmgMin + dmgMax) / 2 + (mMin + mMax) / 2;
  const dps = avgHit * aspd * (1 + crit / 100 * (critMult - 1));
  return { A, dmgMin, dmgMax, mMin, mMax, aspd, crit, critMult, armor, maxHp, regen, mana, dps };
}
function mitigation(armor, atkLvl) { return Math.min(0.8, armor / (armor + 40 + atkLvl * 8)); }

function canEquip(it) {
  const issues = [];
  if (S.level < it.req.lvl) issues.push(`Stufe ${it.req.lvl}`);
  if (it.req.attr) {
    const A = attrTotals(S.eq, it.slot);
    if (A[it.req.attr] < it.req.val) issues.push(`${ATTRS[it.req.attr].name} ${it.req.val}`);
  }
  return { ok: issues.length === 0, issues };
}

// ---------- Erfahrung ----------
function xpNeed(l) { return Math.floor(40 * Math.pow(1.2, l - 1) + 20 * l); }
function gainXp(x) {
  S.xp += x; let ups = 0;
  while (S.xp >= xpNeed(S.level)) { S.xp -= xpNeed(S.level); S.level++; S.points += 5; ups++; }
  if (ups) { S.hp = computeStats().maxHp; }
  return ups;
}

// ---------- Monster ----------
function makeMonster(zi, stage) {
  const z = ZONES[zi];
  const boss = stage >= STAGES;
  const kind = boss ? z.boss : pick(z.mobs);
  const M = MOBS[kind];
  const L = z.lvl + stage - 1;
  const g = Math.pow(1.17, L - 1);
  const hp = Math.round(30 * g * M.hp);
  return {
    kind, name: M.name, boss, level: L, M,
    maxHp: hp, hp,
    dmg: 4 * Math.pow(1.14, L - 1) * M.dmg,
    aspd: 0.95 * M.spd,
    armor: 2 * L * M.arm,
    xp: Math.round(8 * Math.pow(1.15, L - 1) * (boss ? 8 : 1) * (0.8 + M.hp * 0.2)),
    gold: Math.round(3 * Math.pow(1.14, L - 1) * (boss ? 10 : 1) * rand(0.85, 1.15)),
  };
}

// Schaden eines Spielerangriffs
function rollPlayerHit(st, mon) {
  const crit = Math.random() * 100 < st.crit;
  let phys = rand(st.dmgMin, st.dmgMax), mag = rand(st.mMin, st.mMax);
  if (crit) { phys *= st.critMult; mag *= st.critMult; }
  const red = mitigation(mon.armor, S.level);
  return { dmg: Math.max(1, phys * (1 - red) + mag * (1 - red * 0.5)), crit, magic: mag > phys * 0.5 };
}
function rollMonsterHit(st, mon) {
  const raw = mon.dmg * rand(0.85, 1.15);
  return Math.max(1, raw * (1 - mitigation(st.armor, mon.level)));
}

// Beute nach Sieg
function rollLoot(mon) {
  const drops = [];
  if (mon.boss) {
    drops.push(genItem(mon.level + 1, { minRarity: 2, boost: 0.6 }));
    if (Math.random() < 0.5) drops.push(genItem(mon.level, { minRarity: 1 }));
  } else if (Math.random() < 0.2) {
    drops.push(genItem(mon.level + (Math.random() < 0.3 ? 1 : 0), { boost: 0.1 }));
  }
  return drops;
}
function addToInventory(it) {
  if (S.inv.length >= INV_MAX) { S.gold += sellPrice(it); return false; }
  S.inv.push(it); S.stats.itemsFound++; return true;
}

// ---------- Training ----------
function trainDuration(attr) {
  const v = S.attrs[attr] + S.trained[attr];
  return 6 + 0.55 * Math.pow(v, 1.3);
}
function advanceTraining(sec) {
  const T = S.training; let gained = 0;
  if (!T.attr) return 0;
  T.prog += sec;
  let guard = 0;
  while (T.prog >= trainDuration(T.attr) && guard++ < 10000) {
    T.prog -= trainDuration(T.attr);
    S.trained[T.attr]++; gained++;
  }
  return gained;
}

// ---------- Shop ----------
function refreshShop(force = false) {
  const now = Date.now();
  if (!force && S.shop.items.length && now < S.shop.next) return false;
  const items = [];
  const slots = ['weapon', 'chest', 'head', 'offhand', 'feet', 'amulet'];
  for (let i = 0; i < 6; i++) items.push(genItem(S.level + randi(0, 2), { slot: slots[i], boost: 0.5, minRarity: i < 2 ? 1 : 0 }));
  S.shop.items = items;
  S.shop.next = now + 10 * 60 * 1000;
  return true;
}
function rerollCost() { return 15 + S.level * 10; }

// ---------- Offline-Fortschritt ----------
function offlineProgress(sec) {
  sec = Math.min(sec, OFFLINE_CAP);
  if (sec < 30) return null;
  const sum = { sec, train: { attr: S.training.attr, gained: 0 }, kills: 0, xp: 0, gold: 0, items: 0, levels: 0 };
  sum.train.gained = advanceTraining(sec);
  // Arena grob abschätzen: durchschnittliches Monster der aktuellen Stufe
  const st = computeStats();
  const z = S.arena.zone, stg = S.arena.stage;
  const mon = makeMonster(z, stg);
  const red = mitigation(mon.armor, S.level);
  const pDps = Math.max(0.5, st.dps * (1 - red * 0.9));
  const tKill = mon.maxHp / pDps;
  const mDps = mon.dmg * mon.aspd * (1 - mitigation(st.armor, mon.level));
  const tDie = st.maxHp / Math.max(0.01, mDps - st.regen);
  if (tKill < tDie || mDps <= st.regen) {
    const cycle = tKill + 3.2;
    const kills = Math.floor(sec / cycle * 0.8);
    sum.kills = kills;
    sum.xp = kills * mon.xp;
    sum.gold = kills * mon.gold;
    S.gold += sum.gold;
    sum.levels = gainXp(sum.xp);
    S.stats.kills += kills; if (mon.boss) S.stats.bossKills += kills;
    const nItems = Math.min(8, Math.round(kills * (mon.boss ? 1.4 : 0.2)));
    for (let i = 0; i < nItems; i++) { const it = genItem(mon.level, { boost: 0.1, minRarity: mon.boss ? 1 : 0 }); if (addToInventory(it)) sum.items++; }
  }
  S.hp = computeStats().maxHp;
  return sum;
}

// ---------- Speichern ----------
function save() {
  if (!S) return;
  S.lastSeen = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* Speicher nicht verfügbar */ }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.v !== 1) return null;
    return s;
  } catch (e) { return null; }
}
function wipeSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }
