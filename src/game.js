// ============================================================
//  Oberfläche & Spielablauf
// ============================================================
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SV = 'viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"';
const ICONS = {
  home: `<svg ${SV}><path d="M7 23 24 9l17 14"/><path d="M12 20v19h24V20"/><path d="M20 39V29a4 4 0 0 1 8 0v10"/></svg>`,
  arena: `<svg ${SV}><path d="M10 9l20 20"/><path d="M25 33l8-8"/><path d="M31 31l7 7"/><path d="M38 9 18 29"/><path d="M15 25l8 8"/><path d="M17 31l-7 7"/></svg>`,
  train: `<svg ${SV}><circle cx="24" cy="10" r="5"/><path d="M24 15v26"/><path d="M11 22h26"/><ellipse cx="24" cy="25" rx="6" ry="8"/><path d="M15 42h18"/></svg>`,
  char: `<svg ${SV}><path d="M11 31a13 13 0 0 1 26 0v6H11z"/><path d="M24 26v14"/><path d="M11 25 5 15"/><path d="M37 25l6-10"/><path d="M11 31h26"/></svg>`,
  shop: `<svg ${SV}><path d="M18 15h12l-3 6c7 3 11 9 11 14 0 5-4 7-14 7s-14-2-14-7c0-5 4-11 11-14z"/><path d="M20 21h8"/><circle cx="24" cy="33" r="4"/></svg>`,
  forge: `<svg ${SV}><path d="M7 15h25c0 5 4 8 9 8H31l-2 6h3v6H15v-6h3l-2-6c-6 0-9-3-9-8z"/></svg>`,
  skills: `<svg ${SV}><path d="M24 6l4.5 11.5L40 19l-9 8 3 12-10-6.5L14 39l3-12-9-8 11.5-1.5z"/></svg>`,
  skull: `<svg ${SV}><path d="M12 24a12 12 0 0 1 24 0v6l-4 3v5H16v-5l-4-3z"/><circle cx="19" cy="25" r="3"/><circle cx="29" cy="25" r="3"/><path d="M22 38v-3M26 38v-3"/></svg>`,
  hourglass: `<svg ${SV}><path d="M14 7h20M14 41h20"/><path d="M16 7c0 9 16 9 16 17S16 33 16 41"/><path d="M32 7c0 9-16 9-16 17s16 9 16 17"/></svg>`,
};
const TABS = [
  { id: 'home', name: 'Halle', icon: 'home' },
  { id: 'arena', name: 'Arena', icon: 'arena' },
  { id: 'train', name: 'Training', icon: 'train' },
  { id: 'char', name: 'Charakter', icon: 'char' },
  { id: 'shop', name: 'Kontor', icon: 'shop' },
];

let STATS = null;
let CUR = 'home';
let gfxOK = false;
let T = 0;
const coinHTML = '<span class="coin" aria-hidden="true"></span>';
const priceHTML = v => `<span class="price num">${coinHTML}${fmtNum(v)}</span>`;

// ---------- Meldungen & Überlagerung ----------
function toast(html, cls = '', ms = 3400) {
  const box = $('#toasts');
  const el = document.createElement('div'); el.className = `toast ${cls}`; el.innerHTML = html;
  box.prepend(el);
  while (box.children.length > 4) box.lastChild.remove();
  setTimeout(() => el.remove(), ms);
}
function openSheet(html, onBind) {
  closeSheet();
  const w = document.createElement('div'); w.className = 'sheet-wrap';
  w.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  w.addEventListener('click', e => { if (e.target === w || e.target.closest('[data-close]')) closeSheet(); });
  $('#sheet-root').append(w);
  onBind?.(w);
  w.querySelector('button')?.focus();
}
function closeSheet() { $('#sheet-root').innerHTML = ''; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

// ---------- Gegenstände anzeigen ----------
function itemLines(it) {
  const L = [];
  if (it.dmg) L.push(`<li class="main">Schaden <b>${it.dmg[0]}–${it.dmg[1]}</b></li>`, `<li class="main">Angriffe pro Sekunde <b>${fmtNum(it.spd, 1)}</b></li>`);
  if (it.magic) L.push(`<li class="main">Magieschaden <b>${it.magic[0]}–${it.magic[1]}</b></li>`);
  if (it.armor) L.push(`<li class="main">Rüstung <b>${it.armor}</b></li>`);
  if (it.crit) L.push(`<li class="main">Kritische Trefferchance <b>+${it.crit} %</b></li>`);
  if (it.magicFlat) L.push(`<li class="main">Magieschaden <b>+${it.magicFlat}</b></li>`);
  for (const a of it.affixes) L.push(`<li class="aff">${AFFIXES[a.id].fmt(a.v)}</li>`);
  return L.join('');
}
function reqHTML(it) {
  const parts = [];
  const lvOk = S.level >= it.req.lvl;
  parts.push(`<span class="${lvOk ? '' : 'bad'}">Stufe ${it.req.lvl}</span>`);
  if (it.req.attr) {
    const have = attrTotals(S.eq, it.slot)[it.req.attr];
    parts.push(`<span class="${have >= it.req.val ? '' : 'bad'}">${ATTRS[it.req.attr].name} ${it.req.val}</span>`);
  }
  return `Benötigt: ${parts.join(' · ')}`;
}
function itemCard(it, tag = '') {
  const R = RARITIES[it.rarity];
  return `<div class="icard" data-r="${it.rarity}">
    ${tag ? `<div class="tag">${tag}</div>` : ''}
    <div class="top"><img alt="" src="${itemThumb(it)}"><div><div class="nm">${esc(it.name)}</div><div class="ty">${R.name} · ${esc(it.typeLine)} · Gegenstandsstufe ${it.ilvl}</div></div></div>
    <ul>${itemLines(it)}</ul>
    <div class="req">${reqHTML(it)}</div>
  </div>`;
}
const DELTA_KEYS = [
  ['dps', 'Schaden/s', 1], ['maxHp', 'Leben', 0], ['armor', 'Rüstung', 0], ['aspd', 'Angriffe/s', 2],
  ['crit', 'Kritisch %', 1], ['regen', 'Leben/s', 1], ['mana', 'Mana', 0],
];
function deltaHTML(it) {
  const s1 = computeStats(), s2 = computeStats({ ...S.eq, [it.slot]: it });
  const rows = [];
  for (const [k, n, d] of DELTA_KEYS) {
    const df = s2[k] - s1[k];
    if (Math.abs(df) < (d === 2 ? 0.005 : 0.05)) continue;
    const v = d === 2 ? df.toFixed(2).replace('.', ',') : d === 1 ? fmtNum(df, 1) : fmtNum(df);
    rows.push(`<div><span class="dim">${n}</span><b class="${df > 0 ? 'good' : 'bad'}">${df > 0 ? '+' : ''}${v}</b></div>`);
  }
  for (const a of ATTR_KEYS) {
    const df = s2.A[a] - s1.A[a];
    if (df) rows.push(`<div><span class="dim">${ATTRS[a].name}</span><b class="${df > 0 ? 'good' : 'bad'}">${df > 0 ? '+' : ''}${df}</b></div>`);
  }
  return rows.length ? `<div class="delta">${rows.join('')}</div>` : '<div class="mute">Keine Änderung der Werte.</div>';
}
function itemScore(eq) { const s = computeStats(eq); return s.dps * 1.0 + s.maxHp * 0.12 + s.armor * 0.5; }
function isUpgrade(it) {
  if (!canEquip(it).ok) return false;
  return itemScore({ ...S.eq, [it.slot]: it }) > itemScore(S.eq) * 1.005;
}
function openItemSheet(it, ctx) {
  const cur = S.eq[it.slot];
  const can = canEquip(it);
  let body = '';
  if (ctx === 'eq') {
    body = itemCard(it, `Angelegt · ${SLOT_NAME[it.slot]}`);
  } else {
    body = `<div class="cmp">${itemCard(it, ctx === 'shop' ? 'Angebot' : 'Ausgewählt')}${cur ? itemCard(cur, 'Angelegt') : `<div class="icard"><div class="tag">Angelegt</div><div class="mute">${SLOT_NAME[it.slot]}: nichts angelegt</div></div>`}</div>
      <div><div class="label">Wenn du es anlegst</div>${deltaHTML(it)}</div>`;
  }
  const acts = [];
  if (ctx === 'inv') {
    acts.push(`<button class="btn" data-act="sell">Verkaufen ${priceHTML(sellPrice(it))}</button>`);
    acts.push(`<button class="btn primary" data-act="equip" ${can.ok ? '' : 'disabled'}>${can.ok ? 'Anlegen' : 'Anforderungen fehlen'}</button>`);
  } else if (ctx === 'eq') {
    acts.push(`<button class="btn" data-act="unequip">Ablegen</button>`);
  } else if (ctx === 'shop') {
    const afford = S.gold >= buyPrice(it), room = S.inv.length < INV_MAX;
    acts.push(`<button class="btn primary" data-act="buy" ${afford && room ? '' : 'disabled'}>${!room ? 'Inventar voll' : `Kaufen ${priceHTML(buyPrice(it))}`}</button>`);
  }
  acts.unshift('<button class="btn ghost" data-close>Schließen</button>');
  openSheet(`<h3 class="r${it.rarity}">${esc(it.name)}</h3>${body}<div class="actions">${acts.join('')}</div>`, w => {
    w.querySelector('[data-act="equip"]')?.addEventListener('click', () => { equip(it); closeSheet(); });
    w.querySelector('[data-act="sell"]')?.addEventListener('click', () => { sellItem(it); closeSheet(); });
    w.querySelector('[data-act="unequip"]')?.addEventListener('click', () => { unequip(it.slot); closeSheet(); });
    w.querySelector('[data-act="buy"]')?.addEventListener('click', () => { buyItem(it); closeSheet(); });
  });
}

// ---------- Aktionen ----------
function onEquipChanged() {
  STATS = computeStats();
  S.hp = Math.min(S.hp, STATS.maxHp);
  if (gfxOK) {
    dressRig(VIEWS.showcase.hero, S.eq);
    dressRig(VIEWS.training.hero, S.eq);
    const wasDead = AR.phase === 'dead';
    arenaSetHero(VIEWS.arena);
    if (wasDead) playAnim(VIEWS.arena.hero, 'dead', 0.01);
    else if (AR.phase === 'walk') playAnim(VIEWS.arena.hero, 'walk', 1);
  }
  refresh(); save();
}
function equip(it) {
  const c = canEquip(it);
  if (!c.ok) { toast(`Dafür fehlt dir: <b>${c.issues.join(', ')}</b>`, 'bad'); return; }
  const idx = S.inv.indexOf(it);
  const old = S.eq[it.slot];
  S.eq[it.slot] = it;
  if (idx >= 0) S.inv.splice(idx, 1);
  if (old) S.inv.splice(Math.max(0, idx), 0, old);
  onEquipChanged();
  if (gfxOK && CUR !== 'arena') playAnim(VIEWS.showcase.hero, 'cheer', 0.9);
}
function unequip(slot) {
  if (!S.eq[slot]) return;
  if (S.inv.length >= INV_MAX) { toast('Dein Inventar ist voll. Verkaufe zuerst etwas.', 'bad'); return; }
  S.inv.push(S.eq[slot]); S.eq[slot] = null;
  onEquipChanged();
}
function sellItem(it) {
  const i = S.inv.indexOf(it); if (i < 0) return;
  S.inv.splice(i, 1); S.gold += sellPrice(it);
  toast(`<b>${esc(it.name)}</b> verkauft für ${priceHTML(sellPrice(it))}`);
  refresh(); save();
}
function sellCommon() {
  const c = S.inv.filter(i => i.rarity === 0 && !isUpgrade(i));
  if (!c.length) { toast('Keine gewöhnlichen Gegenstände zum Verkaufen.'); return; }
  const sum = c.reduce((a, i) => a + sellPrice(i), 0);
  S.inv = S.inv.filter(i => !c.includes(i)); S.gold += sum;
  toast(`${c.length} Gegenstände verkauft für ${priceHTML(sum)}`);
  refresh(); save();
}
function buyItem(it) {
  const p = buyPrice(it);
  if (S.gold < p || S.inv.length >= INV_MAX) return;
  S.gold -= p; S.inv.push(it);
  S.shop.items = S.shop.items.filter(x => x !== it);
  toast(`<b class="r${it.rarity}">${esc(it.name)}</b> gekauft. Du findest es im Inventar.`, 'ember');
  refresh(); save();
}
function sortInv() {
  const order = SLOTS.map(s => s.id);
  S.inv.sort((a, b) => order.indexOf(a.slot) - order.indexOf(b.slot) || b.rarity - a.rarity || b.ilvl - a.ilvl);
  refresh();
}
function spendPoint(a, n = 1) {
  n = Math.min(n, S.points); if (n <= 0) return;
  S.points -= n; S.attrs[a] += n;
  const before = STATS.maxHp; STATS = computeStats();
  if (STATS.maxHp > before) S.hp += STATS.maxHp - before;
  refresh(); save();
}
function editName(btn) {
  const inp = document.createElement('input');
  inp.className = 'hero-name-input'; inp.value = S.name; inp.maxLength = 16; inp.id = btn.id + '-input';
  btn.replaceWith(inp); inp.focus(); inp.select();
  const done = () => { S.name = inp.value.trim().slice(0, 16) || S.name; inp.replaceWith(btn); refresh(); save(); };
  inp.addEventListener('blur', done, { once: true });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
}

// ---------- Bildschirmwechsel ----------
function go(id) {
  if (!TABS.find(t => t.id === id)) id = 'home';
  CUR = id;
  $$('.screen').forEach(s => s.hidden = s.dataset.screen !== id);
  $$('.tab').forEach(t => t.setAttribute('aria-current', t.dataset.go === id ? 'page' : 'false'));
  $('#main').scrollTop = 0;
  if (gfxOK) {
    if (id === 'home') mountView(VIEWS.showcase, $('#stage-home'));
    else if (id === 'char') mountView(VIEWS.showcase, $('#stage-char'));
    else if (id === 'arena') mountView(VIEWS.arena, $('#stage-arena'));
    else if (id === 'train') mountView(VIEWS.training, $('#stage-train'));
    else RT.view = null;
  }
  refresh();
}

// ---------- Rendern ----------
function renderHud() {
  $('#hud-lvl').textContent = S.level;
  $('#hud-name').textContent = S.name;
  $('#hud-gold').textContent = fmtNum(S.gold);
  const need = xpNeed(S.level);
  $('#hud-xp > i').style.width = `${Math.min(100, S.xp / need * 100)}%`;
  $('#hud-xp-t').textContent = `${fmtNum(S.xp)} / ${fmtNum(need)} EP`;
  $('#hud-hp-t').textContent = `${fmtNum(S.hp)} / ${fmtNum(STATS.maxHp)} Leben`;
  const dot = $('.tab[data-go="char"] .dot');
  dot.hidden = !S.points; dot.textContent = S.points;
}
function dollHTML() {
  const col = ids => `<div class="col">${ids.map(id => {
    const it = S.eq[id];
    return it ? `<button class="slot" data-slot="${id}" data-r="${it.rarity}" title="${esc(it.name)}"><img alt="${esc(it.name)}" src="${itemThumb(it)}"></button>`
      : `<button class="slot" data-slot="${id}" title="${SLOT_NAME[id]}: leer"><span class="empty">${SLOT_NAME[id]}</span></button>`;
  }).join('')}</div>`;
  return col(['head', 'amulet', 'chest']) + col(['weapon', 'offhand', 'feet']);
}
function attrCardsHTML() {
  return ATTR_KEYS.map(a => {
    const base = S.attrs[a], tr = S.trained[a], tot = STATS.A[a], gear = tot - base - tr;
    const bits = [];
    if (tr) bits.push(`+${tr} Training`); if (gear) bits.push(`+${gear} Ausrüstung`);
    return `<div class="attr" data-a="${a}"><div class="k">${ATTRS[a].name}</div><div class="v">${tot}</div><div class="bonus">${bits.join(' · ') || 'Grundwert'}</div></div>`;
  }).join('');
}
function statRows(rows) { return rows.map(([k, v]) => `<div><dt>${k}</dt><b>${v}</b></div>`).join(''); }
function renderHome() {
  $('#home-name').textContent = S.name;
  $('#home-lvl').textContent = `Stufe ${S.level}`;
  const hp = $('#home-points'); hp.hidden = !S.points; hp.textContent = `${S.points} Punkte verteilen`;
  $('[data-doll="home"]').innerHTML = dollHTML();
  $('#home-attrs').innerHTML = attrCardsHTML();
  $('#home-stats').innerHTML = statRows([
    ['Schaden pro Sekunde', fmtNum(STATS.dps, 1)], ['Leben', fmtNum(STATS.maxHp)],
    ['Rüstung', fmtNum(STATS.armor)], ['Angriffe pro Sekunde', fmtNum(STATS.aspd, 1)],
    ['Kritische Treffer', `${fmtNum(STATS.crit, 1)} %`], ['Mana', fmtNum(STATS.mana)],
  ]);
  const z = ZONES[S.arena.zone];
  const tr = S.training.attr;
  $('#home-activity').innerHTML = `
    <div class="act"><div class="ico">${ICONS.arena}</div><div class="t">${z.name} · Stufe ${S.arena.stage} von ${STAGES}</div><div class="s">${S.arena.auto ? 'Rückt automatisch vor' : 'Hält die aktuelle Stufe'} · ${fmtNum(S.stats.kills)} Siege bisher</div></div>
    <div class="act"><div class="ico">${ICONS.train}</div><div class="t">${tr ? `${ATTRS[tr].name} wird trainiert` : 'Kein Training aktiv'}</div><div class="s" id="home-train-s"></div></div>`;
}
function renderTiles() {
  const tiles = [
    ['arena', 'Arena', 'Zonen, Monster, Bosse'], ['train', 'Trainingshof', 'Attribute steigern'],
    ['char', 'Charakterbogen', 'Inventar & Werte'], ['shop', 'Grimas Kontor', 'Kaufen & verkaufen'],
    ['forge', 'Schmiede', 'Bald verfügbar', true], ['skills', 'Fertigkeiten', 'Bald verfügbar', true],
  ];
  $('#home-tiles').innerHTML = tiles.map(([id, n, s, lock]) => `<button class="tile" ${lock ? 'disabled' : `data-go="${id === 'train' ? 'train' : id}"`}>${ICONS[id === 'train' ? 'train' : id]}<b>${n}</b><small>${s}</small>${id === 'char' && S.points ? `<span class="chip ember badge num">${S.points}</span>` : ''}</button>`).join('');
}
function renderChar() {
  $('#char-name').textContent = S.name;
  $('#char-lvl').textContent = `Stufe ${S.level}`;
  $('[data-doll="char"]').innerHTML = dollHTML();
  $('#char-points').textContent = `${S.points} ${S.points === 1 ? 'Punkt' : 'Punkte'} frei`;
  $('#char-points').classList.toggle('ember', S.points > 0);
  $('#alloc').innerHTML = ATTR_KEYS.map(a => `<div class="alloc-row" data-a="${a}">
      <div><div class="n">${ATTRS[a].name}</div><div class="d">${ATTRS[a].prim} · ${ATTRS[a].sec}</div></div>
      <div class="v">${STATS.A[a]}</div>
      <button class="plus" data-plus="${a}" ${S.points ? '' : 'disabled'} aria-label="${ATTRS[a].name} erhöhen" title="Klick: +1 · Umschalt-Klick: +5">+</button>
    </div>`).join('');
  const s = STATS;
  const z = ZONES[S.arena.zone], mlv = z.lvl + S.arena.stage - 1;
  $('#details').innerHTML = `<table>
    <tr class="sec"><th colspan="2">Angriff</th></tr>
    <tr><th>Waffenschaden</th><td>${fmtNum(s.dmgMin)}–${fmtNum(s.dmgMax)}</td></tr>
    <tr><th>Magieschaden je Treffer</th><td>${fmtNum(s.mMin)}–${fmtNum(s.mMax)}</td></tr>
    <tr><th>Angriffe pro Sekunde</th><td>${fmtNum(s.aspd, 1)}</td></tr>
    <tr><th>Kritische Trefferchance</th><td>${fmtNum(s.crit, 1)} %</td></tr>
    <tr><th>Kritischer Schaden</th><td>${fmtNum(s.critMult * 100)} %</td></tr>
    <tr><th>Schaden pro Sekunde</th><td>${fmtNum(s.dps, 1)}</td></tr>
    <tr class="sec"><th colspan="2">Verteidigung</th></tr>
    <tr><th>Leben</th><td>${fmtNum(s.maxHp)}</td></tr>
    <tr><th>Lebensregeneration</th><td>${fmtNum(s.regen, 1)} / s</td></tr>
    <tr><th>Rüstung</th><td>${fmtNum(s.armor)}</td></tr>
    <tr><th>Schadensminderung (Gegner Stufe ${mlv})</th><td>${fmtNum(mitigation(s.armor, mlv) * 100, 1)} %</td></tr>
    <tr class="sec"><th colspan="2">Magie</th></tr>
    <tr><th>Mana</th><td>${fmtNum(s.mana)}</td></tr>
    <tr class="sec"><th colspan="2">Chronik</th></tr>
    <tr><th>Besiegte Gegner</th><td>${fmtNum(S.stats.kills)}</td></tr>
    <tr><th>Besiegte Bosse</th><td>${fmtNum(S.stats.bossKills)}</td></tr>
    <tr><th>Niederlagen</th><td>${fmtNum(S.stats.deaths)}</td></tr>
  </table>`;
  $('#inv-count').textContent = `${S.inv.length} / ${INV_MAX}`;
  const cells = S.inv.map((it, i) => {
    const can = canEquip(it).ok;
    return `<button class="inv-cell" data-inv="${i}" data-r="${it.rarity}" title="${esc(it.name)}"><img alt="${esc(it.name)}" src="${itemThumb(it)}"><span class="lv num">${it.ilvl}</span>${isUpgrade(it) ? '<span class="up">▲</span>' : ''}${can ? '' : '<span class="no"></span>'}</button>`;
  });
  for (let i = S.inv.length; i < Math.max(INV_MAX, S.inv.length); i++) cells.push('<div class="inv-cell empty" aria-hidden="true"></div>');
  $('#inv-grid').innerHTML = cells.join('');
}
function renderArenaPanel() {
  const z = ZONES[S.arena.zone], zi = S.arena.zone;
  $('#az-name').textContent = z.name; $('#az-sub').textContent = z.sub;
  $('#az-lvl').textContent = `Gegnerstufe ${z.lvl}–${z.lvl + STAGES - 1}`;
  const best = S.arena.best[zi];
  let pips = '';
  for (let s = 1; s <= STAGES; s++) {
    const cls = ['pip']; if (s === STAGES) cls.push('boss');
    if (s === S.arena.stage) cls.push('cur'); else if (s < best || (s === STAGES && S.arena.cleared[zi])) cls.push('done');
    const locked = s > best;
    if (locked) cls.push('locked');
    pips += `<button class="${cls.join(' ')}" data-stage="${s}" ${locked ? 'disabled' : ''} aria-label="Stufe ${s}${s === STAGES ? ' (Boss)' : ''}">${s === STAGES ? ICONS.skull : s}</button>`;
  }
  $('#az-track').innerHTML = pips;
  $('#mode-auto').setAttribute('aria-pressed', S.arena.auto);
  $('#mode-hold').setAttribute('aria-pressed', !S.arena.auto);
  $('#mode-note').textContent = S.arena.auto
    ? 'Nach jedem Sieg geht es eine Stufe weiter. Nach einer Niederlage fällst du eine Stufe zurück und hältst sie.'
    : `Du kämpfst wiederholt auf Stufe ${S.arena.stage}. Gut, um vor dem Boss Erfahrung und Beute zu sammeln.`;
  $('#zones').innerHTML = ZONES.map((zz, i) => {
    const unlocked = i === 0 || S.arena.cleared[i - 1];
    const st = S.arena.cleared[i] ? 'Gemeistert' : unlocked ? `Fortschritt ${Math.max(0, S.arena.best[i] - 1)} / ${STAGES}` : `Gesperrt: Boss von ${ZONES[i - 1].name} besiegen`;
    return `<button class="zone ${i === zi ? 'on' : ''}" data-z="${zz.id}" data-zone="${i}" ${unlocked ? '' : 'disabled'}>
      <div><div class="zn">${zz.name}</div><div class="zs">${zz.sub}</div></div>
      <div class="zl num">Stufe ${zz.lvl}–${zz.lvl + STAGES - 1} · ${st}</div></button>`;
  }).join('');
  renderArenaStats();
  renderLog();
}
function renderArenaStats() {
  const s = STATS, mlv = AR.mon ? AR.mon.level : ZONES[S.arena.zone].lvl;
  $('#arena-stats').innerHTML = statRows([
    ['Schaden pro Sekunde', fmtNum(s.dps, 1)], ['Leben', fmtNum(s.maxHp)],
    ['Rüstung', `${fmtNum(s.armor)} (−${fmtNum(mitigation(s.armor, mlv) * 100)} %)`], ['Angriffe pro Sekunde', fmtNum(s.aspd, 1)],
    ['Kritische Treffer', `${fmtNum(s.crit, 1)} %`], ['Regeneration', `${fmtNum(s.regen, 1)} / s`],
  ]);
}
function renderLog() { $('#arena-log').innerHTML = AR.log.map(l => `<div>${l}</div>`).join('') || '<div>Noch keine Kämpfe.</div>'; }
function renderTrain() {
  $('#train-cards').innerHTML = ATTR_KEYS.map(a => {
    const on = S.training.attr === a;
    const v = S.attrs[a] + S.trained[a];
    return `<div class="tcard ${on ? 'on' : ''}" data-a="${a}">
      <div class="hd"><span class="n">${ATTRS[a].name}</span><span class="v">${v}</span></div>
      <div class="fx">Steigert ${ATTRS[a].prim}, außerdem ${ATTRS[a].sec}.</div>
      <div class="time num">Nächster Punkt: ${fmtTime(trainDuration(a))} Training${S.trained[a] ? ` · bisher +${S.trained[a]}` : ''}</div>
      <button class="btn ${on ? '' : 'primary'}" data-train="${a}" ${on ? 'disabled' : ''}>${on ? 'Wird trainiert' : 'Trainieren'}</button>
    </div>`;
  }).join('');
}
function renderShop() {
  refreshShop();
  $('#offers').innerHTML = S.shop.items.map((it, i) => {
    const afford = S.gold >= buyPrice(it);
    return `<div class="offer">${itemCard(it, SLOT_NAME[it.slot])}<button class="btn ${afford ? 'primary' : ''}" data-offer="${i}">Ansehen · ${priceHTML(buyPrice(it))}</button></div>`;
  }).join('') || '<div class="panel mute">Ausverkauft. Neue Ware kommt bald.</div>';
  $('#shop-reroll').innerHTML = `Neue Ware · ${priceHTML(rerollCost())}`;
  $('#shop-reroll').disabled = S.gold < rerollCost();
  $('#sell-count').textContent = `${S.inv.length} / ${INV_MAX}`;
  $('#sell-list').innerHTML = S.inv.map((it, i) => `<div class="sell-row">
      <img alt="" src="${itemThumb(it)}"><div style="min-width:0"><div class="nm r${it.rarity}">${esc(it.name)}</div><div class="ty">${esc(it.typeLine)} · Stufe ${it.ilvl}${isUpgrade(it) ? ' · <span class="good">Verbesserung</span>' : ''}</div></div>
      ${priceHTML(sellPrice(it))}<button class="btn small" data-sell="${i}">Verkaufen</button></div>`).join('') || '<div class="mute">Dein Inventar ist leer.</div>';
  $('#q-high').setAttribute('aria-pressed', S.settings.quality === 'high');
  $('#q-low').setAttribute('aria-pressed', S.settings.quality !== 'high');
}
function refresh() {
  STATS = computeStats();
  renderHud();
  if (CUR === 'home') { renderHome(); renderTiles(); }
  else if (CUR === 'char') renderChar();
  else if (CUR === 'arena') renderArenaPanel();
  else if (CUR === 'train') renderTrain();
  else if (CUR === 'shop') renderShop();
  uiTick(0, true);
}
// Kleine Aktualisierungen pro Bild
let uiAcc = 0;
function uiTick(dt, force = false) {
  uiAcc += dt; if (!force && uiAcc < 0.1) return; uiAcc = 0;
  const hpPct = clamp(S.hp / STATS.maxHp * 100, 0, 100);
  $('#hud-hp-t').textContent = `${fmtNum(Math.max(0, S.hp))} / ${fmtNum(STATS.maxHp)} Leben`;
  const tr = S.training.attr;
  const trTxt = tr ? `${fmtTime(trainDuration(tr) - S.training.prog)} bis +1 ${ATTRS[tr].name}` : 'Wähle im Trainingshof ein Attribut.';
  if (CUR === 'arena') {
    $('#ap-name').textContent = S.name; $('#ap-sub').textContent = `Stufe ${S.level}`;
    $('#ap-hp > i').style.width = `${hpPct}%`;
    $('#ap-hp .lbl').textContent = `${fmtNum(Math.max(0, S.hp))} / ${fmtNum(STATS.maxHp)}`;
    const m = AR.mon;
    $('#ap-mon').classList.toggle('boss', !!m?.boss);
    $('#am-name').innerHTML = m ? `${m.boss ? '<span class="boss-tag">Boss</span>' : ''}${esc(m.name)}` : '–';
    $('#am-sub').textContent = m ? `Stufe ${m.level} · ${fmtNum(m.dmg * m.aspd, 1)} Schaden/s` : '';
    $('#am-hp > i').style.width = m ? `${clamp(m.hp / m.maxHp * 100, 0, 100)}%` : '0%';
    $('#am-hp .lbl').textContent = m ? `${fmtNum(Math.max(0, m.hp))} / ${fmtNum(m.maxHp)}` : '';
    $('#arena-status').textContent = { walk: 'Unterwegs zum nächsten Gegner', fight: 'Kampf', won: 'Sieg', dead: 'Besiegt · gleich geht es weiter' }[AR.phase];
  } else if (CUR === 'train') {
    $('#tr-name').textContent = tr ? `${ATTRS[tr].name} · ${S.attrs[tr] + S.trained[tr]}` : 'Kein Training';
    $('#tr-sub').textContent = trTxt;
    const p = tr ? S.training.prog / trainDuration(tr) * 100 : 0;
    $('#tr-bar > i').style.width = `${clamp(p, 0, 100)}%`;
    $('#tr-bar .lbl').textContent = tr ? `${Math.floor(p)} %` : '';
  } else if (CUR === 'home') {
    const el = $('#home-train-s'); if (el) el.textContent = trTxt;
  } else if (CUR === 'shop') {
    $('#shop-timer').textContent = `Neue Ware in ${fmtTime((S.shop.next - Date.now()) / 1000)}`;
    if (Date.now() >= S.shop.next) { refreshShop(); renderShop(); }
  }
}

// ---------- Arena-Ablauf ----------
const AR = { phase: 'walk', mon: null, pT: 0, mT: 0, timer: 0, pending: [], log: [] };
function arenaLog(html) { AR.log.unshift(html); AR.log.length = Math.min(AR.log.length, 30); if (CUR === 'arena') renderLog(); }
function floater(layer, x, y, text, cls = '') {
  if (!layer || !gfxOK) return;
  const d = document.createElement('div'); d.className = `floater ${cls}`; d.textContent = text;
  d.style.left = `${x + rand(-14, 14)}px`; d.style.top = `${y + rand(-8, 8)}px`;
  layer.append(d); setTimeout(() => d.remove(), 1900);
}
function floatAt(ent, h, text, cls) {
  if (CUR !== 'arena' || !ent || !gfxOK) return;
  const p = projectToHost(ent.root.position.clone().add(new THREE.Vector3(0, h, 0)));
  floater($('#arena-fx'), p.x, p.y, text, cls);
}
function showBanner(big, small = '', ms = 2000) {
  const b = $('#arena-banner'); b.querySelector('.big').textContent = big; b.querySelector('.small').textContent = small;
  b.classList.add('show'); clearTimeout(showBanner.t); showBanner.t = setTimeout(() => b.classList.remove('show'), ms);
}
function spawnMonster() {
  AR.mon = makeMonster(S.arena.zone, S.arena.stage);
  AR.phase = 'walk'; AR.pending = [];
  if (gfxOK) {
    const V = VIEWS.arena;
    const e = arenaSetMonster(V, AR.mon);
    playAnim(e, 'idle', 1);
    if (V.hero && AR.phase === 'walk') playAnim(V.hero, 'walk', 1);
  } else AR.walk = 2.2;
  if (AR.mon.boss && CUR === 'arena') showBanner(AR.mon.name, 'Bosskampf', 2400);
}
function setStage(s) {
  S.arena.stage = clamp(s, 1, S.arena.best[S.arena.zone] || 1);
  if (gfxOK && VIEWS.arena.hero) playAnim(VIEWS.arena.hero, 'walk', 1);
  spawnMonster(); refresh(); save();
}
function setZone(zi) {
  if (zi !== 0 && !S.arena.cleared[zi - 1]) return;
  S.arena.zone = zi; S.arena.best[zi] = Math.max(1, S.arena.best[zi] || 0);
  S.arena.stage = Math.min(S.arena.best[zi], S.arena.stage > 0 && zi === S.arena.zone ? 1 : 1);
  if (gfxOK) {
    const old = VIEWS.arena;
    VIEWS.arena = buildArena(zi);
    arenaSetHero(VIEWS.arena);
    if (CUR === 'arena') mountView(VIEWS.arena, $('#stage-arena'));
    old.scene.traverse(o => { if (o.isLight && o.dispose) o.dispose(); });
    disposeTree(old.scene);
  }
  spawnMonster(); refresh(); save();
}
function arenaTick(dt) {
  const st = STATS, V = gfxOK ? VIEWS.arena : null;
  if (AR.phase !== 'dead') S.hp = Math.min(st.maxHp, S.hp + st.regen * dt * (AR.phase === 'fight' ? 1 : 4));
  if (!AR.mon) spawnMonster();
  const mon = AR.mon;
  // verzögerte Treffer abarbeiten
  for (let i = AR.pending.length - 1; i >= 0; i--) {
    const p = AR.pending[i]; p.t -= dt;
    if (p.t <= 0) { AR.pending.splice(i, 1); if (AR.phase === 'fight') p.fn(); }
  }
  if (AR.phase === 'walk') {
    const speed = 2.6;
    if (V) {
      V.scroll = speed;
      const e = V.mon;
      if (e) {
        e.root.position.x -= speed * dt;
        const contact = V.heroX + 0.95 + e.reach;
        if (e.root.position.x <= contact) { e.root.position.x = contact; startFight(); }
      }
    } else { AR.walk -= dt; if (AR.walk <= 0) startFight(); }
  } else if (AR.phase === 'fight') {
    if (V) V.scroll = 0;
    AR.pT -= dt; AR.mT -= dt;
    if (AR.pT <= 0) {
      AR.pT += 1 / st.aspd;
      const dur = clamp(0.95 / st.aspd, 0.28, 0.6);
      if (V?.hero) playAnim(V.hero, STATS.aspd > 1.5 ? 'stab' : 'attack', dur);
      AR.pending.push({ t: dur * 0.55, fn: playerStrikes });
    }
    if (AR.mT <= 0) {
      AR.mT += 1 / mon.aspd;
      const dur = clamp(0.9 / mon.aspd, 0.35, 0.8);
      if (V?.mon) playAnim(V.mon, 'attack', dur);
      AR.pending.push({ t: dur * 0.55, fn: monsterStrikes });
    }
  } else if (AR.phase === 'won') {
    if (V) V.scroll = 0;
    AR.timer -= dt;
    if (AR.timer <= 0) {
      if (S.arena.auto && S.arena.stage < STAGES) S.arena.stage++;
      spawnMonster();
      if (CUR === 'arena') renderArenaPanel(); else if (CUR === 'home') renderHome();
    }
  } else if (AR.phase === 'dead') {
    if (V) V.scroll = 0;
    AR.timer -= dt;
    if (AR.timer <= 0) {
      S.hp = st.maxHp;
      S.arena.stage = Math.max(1, S.arena.stage - 1);
      S.arena.auto = false;
      if (V?.hero) playAnim(V.hero, 'walk', 1);
      spawnMonster();
      toast(`Zurück auf Stufe ${S.arena.stage}. Vorrücken ist pausiert, bis du es wieder einschaltest.`, 'bad', 5000);
      refresh();
    }
  }
}
function startFight() {
  AR.phase = 'fight';
  AR.pT = 0.25; AR.mT = 0.55;
  if (gfxOK && VIEWS.arena.hero) playAnim(VIEWS.arena.hero, 'idle', 1);
  if (CUR === 'arena') renderArenaStats();
}
function playerStrikes() {
  const mon = AR.mon; if (!mon || mon.hp <= 0) return;
  const h = rollPlayerHit(STATS, mon);
  mon.hp -= h.dmg;
  const V = gfxOK ? VIEWS.arena : null;
  if (V?.mon) {
    const e = V.mon; flashRig(e);
    if (e.anim.mode !== 'attack') playAnim(e, 'hit', 0.28);
    const pos = e.root.position.clone().add(new THREE.Vector3(-e.reach * 0.6, e.height * 0.55, 0.3));
    spawnSparks(V, pos, h.magic ? 0x9fb8ff : 0xffc27a, h.crit ? 16 : 8, h.crit ? 4 : 3);
    spawnArc(V, pos, h.crit ? 0xffd27a : 0xffffff);
    if (h.crit) V.shake = 0.6;
    floatAt(e, e.height * 0.95, fmtNum(h.dmg), h.crit ? 'crit' : h.magic ? 'mag' : '');
  }
  if (mon.hp <= 0) monsterDies();
}
function monsterStrikes() {
  const mon = AR.mon; if (!mon || mon.hp <= 0 || S.hp <= 0) return;
  const d = rollMonsterHit(STATS, mon);
  S.hp -= d;
  const V = gfxOK ? VIEWS.arena : null;
  if (V?.hero) {
    flashRig(V.hero);
    if (V.hero.anim.mode !== 'attack' && V.hero.anim.mode !== 'stab') playAnim(V.hero, 'hit', 0.25);
    spawnSparks(V, V.hero.root.position.clone().add(new THREE.Vector3(0.3, 0.9, 0.3)), 0xff6a5a, 6, 2.4);
    floatAt(V.hero, 1.55, `−${fmtNum(d)}`, 'taken');
  }
  if (S.hp <= 0) playerDies();
}
function monsterDies() {
  const mon = AR.mon, V = gfxOK ? VIEWS.arena : null;
  AR.phase = 'won'; AR.timer = mon.boss ? 2.4 : 1.1; AR.pending = [];
  if (V?.mon) { playAnim(V.mon, 'die', 0.6); spawnSparks(V, V.mon.root.position.clone().add(new THREE.Vector3(0, 0.6, 0.2)), 0xffe2a8, 14, 3); }
  S.gold += mon.gold;
  S.stats.kills++; if (mon.boss) S.stats.bossKills++;
  const zi = S.arena.zone;
  if (mon.boss) {
    if (!S.arena.cleared[zi]) {
      S.arena.cleared[zi] = true;
      if (ZONES[zi + 1]) { S.arena.best[zi + 1] = Math.max(1, S.arena.best[zi + 1] || 0); toast(`<b>${ZONES[zi + 1].name}</b> ist jetzt zugänglich.`, 'ember', 6000); }
      if (CUR === 'arena') showBanner('Zone gemeistert', `${mon.name} ist gefallen`, 3000);
    }
    S.arena.auto = false;
  } else {
    S.arena.best[zi] = Math.max(S.arena.best[zi], Math.min(STAGES, S.arena.stage + 1));
  }
  if (V?.mon) {
    floatAt(V.mon, V.mon.height * 0.6, `+${fmtNum(mon.gold)} Gold`, 'gold');
    setTimeout(() => floatAt(VIEWS.arena.hero, 1.9, `+${fmtNum(mon.xp)} EP`, 'xp'), 200);
  }
  const ups = gainXp(mon.xp);
  const loot = rollLoot(mon);
  const got = [];
  for (const it of loot) {
    if (addToInventory(it)) {
      got.push(`<b class="r${it.rarity}">${esc(it.name)}</b>`);
      if (it.rarity >= 2) toast(`Beute: <b class="r${it.rarity}">${esc(it.name)}</b>`, `r${it.rarity}`);
      if (V?.mon) setTimeout(() => floatAt(V.mon, V.mon.height * 0.3, it.name, `loot r${it.rarity}`), 400);
    } else toast(`Inventar voll: <b>${esc(it.name)}</b> automatisch verkauft.`, 'bad');
  }
  arenaLog(`<b>${esc(mon.name)}</b> besiegt · +${fmtNum(mon.xp)} EP · +${fmtNum(mon.gold)} Gold${got.length ? ' · ' + got.join(', ') : ''}`);
  if (ups) onLevelUp(ups);
  refresh();
}
function onLevelUp(ups) {
  STATS = computeStats(); S.hp = STATS.maxHp;
  toast(`<b>Stufe ${S.level}!</b> Du hast ${S.points} Attributpunkte zu verteilen.`, 'ember', 5000);
  if (gfxOK) {
    const V = VIEWS.arena;
    if (V.hero) { spawnRing(V, V.hero.root.position.clone().add(new THREE.Vector3(0, 0.1, 0)), 0xffc06a, 1.4, 1); spawnSparks(V, V.hero.root.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xffd88a, 20, 3); }
    floatAt(V.hero, 2.3, `Stufe ${S.level}`, 'lvl');
    playAnim(VIEWS.showcase.hero, 'cheer', 0.9);
  }
}
function playerDies() {
  AR.phase = 'dead'; AR.timer = 3.0; AR.pending = [];
  S.stats.deaths++;
  const V = gfxOK ? VIEWS.arena : null;
  if (V?.hero) playAnim(V.hero, 'die', 0.7);
  if (CUR === 'arena') showBanner('Besiegt', `${AR.mon.name} war zu stark`, 2600);
  arenaLog(`<b>Niederlage</b> gegen ${esc(AR.mon.name)} auf Stufe ${S.arena.stage}`);
}
function setAuto(on) { S.arena.auto = on; refresh(); save(); }

// ---------- Training ----------
let trainSwing = 0, lastClick = 0;
function trainTick(dt) {
  const g = advanceTraining(dt);
  if (g) {
    const a = S.training.attr;
    STATS = computeStats();
    toast(`<b>+${g} ${ATTRS[a].name}</b> durch Training (jetzt ${S.attrs[a] + S.trained[a]})`, '', 2600);
    if (gfxOK && CUR === 'train') { const V = VIEWS.training; spawnRing(V, V.hero.root.position.clone(), 0xffc06a, 1.2, 0.8); playAnim(V.hero, 'cheer', 0.8); }
    if (CUR === 'train') renderTrain(); else if (CUR === 'home') renderHome();
    renderHud();
  }
  if (gfxOK && CUR === 'train' && S.training.attr) {
    trainSwing -= dt;
    if (trainSwing <= 0) { trainSwing = 1.5; heroTrainAction(0.6); }
  }
}
function heroTrainAction(power) {
  const V = VIEWS.training, a = S.training.attr;
  if (a === 'int') {
    playAnim(V.hero, 'cast', 0.5);
    setTimeout(() => { spawnSparks(V, new THREE.Vector3(1.0, 1.25, 0.35), 0x8fb0ff, 10, 2.5); V.hit(power * 0.7); }, 220);
  } else {
    playAnim(V.hero, a === 'dex' ? 'stab' : 'attack', a === 'dex' ? 0.32 : 0.48);
    setTimeout(() => V.hit(power), a === 'dex' ? 170 : 270);
  }
}
function trainClick(e) {
  const a = S.training.attr; if (!a) { toast('Wähle zuerst ein Attribut zum Trainieren.'); return; }
  const now = performance.now(); if (now - lastClick < 90) return; lastClick = now;
  const bonus = Math.max(0.5, trainDuration(a) * 0.035);
  S.training.prog += bonus;
  if (gfxOK) {
    heroTrainAction(1); trainSwing = 1.2;
    const host = $('#stage-train'), r = host.getBoundingClientRect();
    const x = e?.clientX ? e.clientX - r.left : r.width * 0.6, y = e?.clientY ? e.clientY - r.top : r.height * 0.4;
    floater($('#train-fx'), x, y, `+${fmtNum(bonus, 1)} s`, 'gold');
  }
  trainTick(0);
}
function setTraining(a) { S.training.attr = a; S.training.prog = 0; refresh(); save(); }

// ---------- Ereignisse ----------
function bindUI() {
  $('#tabbar').innerHTML = TABS.map(t => `<button class="tab" data-go="${t.id}">${ICONS[t.icon]}<span>${t.name}</span>${t.id === 'char' ? '<span class="dot num" hidden></span>' : ''}</button>`).join('');
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]'); if (g) { go(g.dataset.go); return; }
    const sl = e.target.closest('.slot[data-slot]');
    if (sl) { const it = S.eq[sl.dataset.slot]; if (it) openItemSheet(it, 'eq'); else toast(`${SLOT_NAME[sl.dataset.slot]}: noch nichts angelegt. Im Charakterbogen findest du dein Inventar.`); return; }
    const inv = e.target.closest('[data-inv]'); if (inv) { const it = S.inv[+inv.dataset.inv]; if (it) openItemSheet(it, 'inv'); return; }
    const pl = e.target.closest('[data-plus]'); if (pl) { spendPoint(pl.dataset.plus, e.shiftKey ? 5 : 1); return; }
    const st = e.target.closest('[data-stage]'); if (st) { setStage(+st.dataset.stage); return; }
    const zn = e.target.closest('[data-zone]'); if (zn) { setZone(+zn.dataset.zone); return; }
    const tr = e.target.closest('[data-train]'); if (tr) { setTraining(tr.dataset.train); return; }
    const of = e.target.closest('[data-offer]'); if (of) { const it = S.shop.items[+of.dataset.offer]; if (it) openItemSheet(it, 'shop'); return; }
    const se = e.target.closest('[data-sell]'); if (se) { const it = S.inv[+se.dataset.sell]; if (it) sellItem(it); return; }
  });
  $('#mode-auto').addEventListener('click', () => setAuto(true));
  $('#mode-hold').addEventListener('click', () => setAuto(false));
  $('#home-name').addEventListener('click', e => editName(e.currentTarget));
  $('#char-name').addEventListener('click', e => editName(e.currentTarget));
  $('#inv-sort').addEventListener('click', sortInv);
  $('#inv-sellcommon').addEventListener('click', sellCommon);
  $('#shop-reroll').addEventListener('click', () => { if (S.gold < rerollCost()) return; S.gold -= rerollCost(); refreshShop(true); refresh(); save(); });
  $('#q-high').addEventListener('click', () => { S.settings.quality = 'high'; setQuality('high'); refresh(); save(); });
  $('#q-low').addEventListener('click', () => { S.settings.quality = 'low'; setQuality('low'); refresh(); save(); });
  $('#reset-game').addEventListener('click', () => openSheet(`<h3>Neues Spiel beginnen?</h3><p class="dim" style="margin:0">Dein Held, das Inventar und der Fortschritt in allen Zonen werden gelöscht.</p><div class="actions"><button class="btn ghost" data-close>Abbrechen</button><button class="btn primary" id="do-reset">Alles löschen und neu beginnen</button></div>`, w => {
    w.querySelector('#do-reset').addEventListener('click', () => { wipeSave(); newGame(); refreshShop(true); AR.log = []; AR.mon = null; STATS = computeStats(); onEquipChanged(); setZone(0); closeSheet(); go('home'); });
  }));
  const ts = $('#stage-train');
  ts.addEventListener('pointerdown', trainClick);
  ts.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); trainClick(null); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.addEventListener('pagehide', save);
}
function showWelcome(sum) {
  if (!sum) return;
  const rows = [];
  if (sum.train.gained) rows.push(`<div><span class="dim">Training</span><b class="good">+${sum.train.gained} ${ATTRS[sum.train.attr].name}</b></div>`);
  if (sum.kills) rows.push(`<div><span class="dim">Siege</span><b>${fmtNum(sum.kills)}</b></div>`, `<div><span class="dim">Erfahrung</span><b class="good">+${fmtNum(sum.xp)}</b></div>`, `<div><span class="dim">Gold</span><b class="good">+${fmtNum(sum.gold)}</b></div>`);
  if (sum.items) rows.push(`<div><span class="dim">Gegenstände</span><b>${sum.items}</b></div>`);
  if (sum.levels) rows.push(`<div><span class="dim">Stufenaufstiege</span><b class="good">+${sum.levels}</b></div>`);
  if (!rows.length) rows.push('<div><span class="dim">Diesmal</span><b>nichts Neues</b></div>');
  openSheet(`<h3>Willkommen zurück</h3><p class="dim" style="margin:0">Du warst ${fmtTime(sum.sec)} fort${sum.sec >= OFFLINE_CAP ? ' (höchstens 8 Stunden zählen)' : ''}. In der Zwischenzeit:</p><div class="delta">${rows.join('')}</div><div class="actions"><button class="btn primary" data-close>Weiter</button></div>`);
}

// ---------- Hauptschleife ----------
let last = 0, saveAcc = 0;
function loop(now) {
  requestAnimationFrame(loop);
  let dt = last ? (now - last) / 1000 : 0.016; last = now;
  if (dt > 30) { const sum = offlineProgress(dt); if (sum) { STATS = computeStats(); showWelcome(sum); refresh(); } dt = 0.016; }
  else if (dt > 0.25) { advanceTraining(dt - 0.1); dt = 0.1; }
  T += dt;
  arenaTick(dt);
  trainTick(dt);
  if (gfxOK && RT.view) {
    try { RT.view.update(dt, T); RT.composer.render(); } catch (err) { console.error(err); }
  }
  uiTick(dt);
  saveAcc += dt; if (saveAcc > 5) { saveAcc = 0; save(); }
}

function start(data) {
  const fromHot = data?.S;
  S = fromHot || load();
  let sum = null;
  if (!S) newGame();
  else if (!fromHot) sum = offlineProgress((Date.now() - (S.lastSeen || Date.now())) / 1000);
  S.settings ||= { quality: 'high' };
  refreshShop();
  STATS = computeStats();
  bindUI();
  try {
    initRenderer();
    VIEWS.showcase = buildShowcase();
    VIEWS.training = buildTraining();
    VIEWS.arena = buildArena(S.arena.zone);
    dressRig(VIEWS.showcase.hero, S.eq);
    dressRig(VIEWS.training.hero, S.eq);
    arenaSetHero(VIEWS.arena);
    bindRotate($('#stage-home'), VIEWS.showcase);
    bindRotate($('#stage-char'), VIEWS.showcase);
    gfxOK = true;
    $$('.stage .loading').forEach(l => l.remove());
  } catch (err) {
    console.error(err);
    $$('.stage .loading').forEach(l => l.textContent = 'Die 3D-Ansicht konnte nicht starten. Das Spiel läuft trotzdem.');
  }
  spawnMonster();
  const h = (location.hash || '').slice(1);
  go(['home', 'arena', 'train', 'char', 'shop'].includes(h) ? h : 'home');
  requestAnimationFrame(loop);
  if (sum) showWelcome(sum);
  save();
}
window.claude?.hot?.snapshot?.(() => ({ S: JSON.parse(JSON.stringify(S)) }));
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
