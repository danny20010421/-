/* 奧義（第 5 招）動畫補齊：還沒有專屬編排的角色，依能力類型套用主題動畫，並喊出招式名。
   載入順序：fx_choreo.js 之後。已經有專屬編排的角色不會被覆蓋。 */
(function () {
  const R = FXE.R;
  const say = (A, at, name, c1, c2, size) => X.text(at.x, at.y - 170, name, { size: size || 64, color: c1 || '#ffffff', color2: c2 || '#c9973a' });
  /* 主題動畫：A＝雙方座標，o＝顏色設定，n＝招式名 */
  const T = {
    /* 巨大化／變身：光柱、光環、煙霧 */
    giant: async (A, o, n) => { SFX.play('ult'); X.tint(o.bg || '#2a1a0a', 1.2, .35); moveFighter(A.S, 'float'); X.rays(A.f.x, A.f.y - 40, { r: 460, n: 22, c1: o.c1 }); X.puffs(A.f.x, A.f.y + 40, { n: 18, rad: 200, life: 1.3, color: o.smoke || '#ffffff' }); for (let i = 0; i < 3; i++) setTimeout(() => X.ring(A.f.x, A.f.y, { r1: 280, color: o.c1, w: 8, life: .7 }), i * 220); await sleep(650); say(A, A.f, n, o.t1, o.t2, 60); await sleep(350); if (o.hit) { moveFighter(A.S, 'dash'); await sleep(260); SFX.play('explode'); shake(); X.burst(A.t.x, A.t.y, { r: 200, color: o.c1 }); X.cracks(A.t.x, A.t.y + 40, { n: 10, len: 260, color: o.c2 }); } },
    /* 黑暗、影子、毒：漩渦吞噬 */
    dark: async (A, o, n) => { SFX.play('dark'); X.tint(o.bg || '#1a0820', 1.3, .45); X.vortex(A.t.x, A.t.y, { r: 170, color: o.c1, core: '#0a0010', rim: o.c2, arms: 6, spin: 10, life: 1 }); X.particles({ x: A.t.x, y: A.t.y, n: 50, spd: [60, 240], life: [.8, 1.3], size: [5, 10], colors: [o.c1, o.c2], shape: 'smoke', toward: { x: A.t.x, y: A.t.y }, pull: 5 }); await sleep(700); SFX.play('heavy'); shake(); X.flash(o.c2, .25, .6); X.ring(A.t.x, A.t.y, { r1: 300, color: o.c2, w: 12, life: .6 }); say(A, A.t, n, o.t1 || '#f0e0ff', o.t2 || o.c1); await sleep(250); },
    /* 踢擊／愛心：一道光束貫穿 */
    kick: async (A, o, n) => { SFX.play('ult'); X.tint(o.bg || '#3a0a20', 1, .3); X.particles({ x: A.f.x, y: A.f.y, n: 36, spd: [40, 160], life: [.8, 1.2], size: [8, 14], colors: [o.c1, o.c2, '#ffffff'], shape: 'petal' }); moveFighter(A.S, 'dash'); afterimage(A.S); await sleep(300); SFX.play('heavy'); X.beam(A.f.x, A.t.y - 10, A.t.x + A.d * 160, A.t.y - 10, { w: 30, c1: '#ffffff', c2: o.c1, life: .45 }); X.burst(A.t.x, A.t.y, { r: 170, color: o.c1 }); shake(); say(A, A.t, n, o.t1 || '#ffe8f2', o.t2 || o.c1); await sleep(300); },
    /* 領域：大圓頂＋連斬 */
    room: async (A, o, n) => { SFX.play('ult'); X.shield((A.f.x + A.t.x) / 2, A.f.y, { r: Math.abs(A.t.x - A.f.x) * .75 + 120, edge: o.c1, life: 1.4 }); await sleep(450); for (let i = 0; i < 6; i++) setTimeout(() => { SFX.play('slash'); X.slash(A.t.x + R(-40, 40), A.t.y + R(-50, 40), { a: R(-3, 3), span: 1.4, r: 120, color: o.c2, life: .25 }); }, i * 90); await sleep(560); say(A, A.t, n, o.t1 || '#e8f6ff', o.t2 || o.c1); },
    /* 劍豪：橫跨畫面的巨大斬擊 */
    sword: async (A, o, n) => { SFX.play('ult'); X.flash('#ffffff', .4, .9); X.tint(o.bg || '#0a0a14', 1, .4); moveFighter(A.S, 'dash'); afterimage(A.S); X.speedLines(A.t.x, A.t.y, { life: .6 }); await sleep(320); SFX.play('slash'); X.slash(A.t.x, A.t.y, { a: -.3, span: .7, r: 420, w: 60, color: o.c1, flat: .12, life: .6 }); X.slash(A.t.x, A.t.y, { a: -.3, span: .7, r: 380, w: 22, color: '#ffffff', flat: .12, life: .5 }); await sleep(160); X.cracks(A.t.x, A.t.y + 40, { n: 12, len: 320, color: o.c2 }); shake(); say(A, A.t, n, o.t1, o.t2 || o.c2, 66); await sleep(300); },
    /* 絲線：從天而降的線 */
    threads: async (A, o, n) => { SFX.play('ult'); X.tint('#2a0a2a', 1.2, .35); for (let i = 0; i < 14; i++) setTimeout(() => { X.beam(A.t.x + R(-260, 260), -20, A.t.x + R(-60, 60), A.t.y + R(-60, 40), { w: 3, c1: '#ffffff', c2: o.c1, life: .5 }); if (i % 3 === 0) SFX.play('slash'); }, i * 50); await sleep(720); X.ring(A.t.x, A.t.y, { r0: 320, r1: 40, color: o.c1, w: 6, life: .6 }); SFX.play('heavy'); shake(); say(A, A.t, n, '#ffe8f6', o.c1); await sleep(300); },
    /* 肉球：壓縮氣團後爆開 */
    paw: async (A, o, n) => { SFX.play('ult'); moveFighter(A.S, 'float'); X.glow(A.f.x + A.d * 60, A.f.y - 30, { color: o.c1, r: 160, life: .9, hold: true }); for (let i = 0; i < 3; i++) setTimeout(() => X.ring(A.f.x + A.d * 60, A.f.y - 30, { r0: 200, r1: 30, color: o.c1, w: 8, life: .4 }), i * 160); await sleep(650); SFX.play('explode'); X.flash('#ffffff', .3, .8); X.burst(A.t.x, A.t.y, { r: 240, color: o.c1 }); X.ring(A.t.x, A.t.y, { r1: 380, color: o.c2, w: 18, life: .7 }); shake(); say(A, A.t, n, o.t1 || '#e8f0ff', o.t2 || o.c2); await sleep(300); },
    /* 岩漿／火焰 */
    fire: async (A, o, n) => { SFX.play('ult'); X.tint(o.bg || '#3a0a00', 1.2, .4); X.flames(A.f.x, A.f.y, { n: 80, jx: 80, colors: [o.c1, o.c2, '#ffe0a0'] }); await sleep(380); moveFighter(A.S, 'lunge'); X.pillar(A.t.x, A.t.y, { w: 150, color: o.c1, life: .9 }); X.flames(A.t.x, A.t.y, { n: 90, jx: 110, colors: [o.c1, o.c2, '#ffd26c'] }); SFX.play('explode'); shake(); X.cracks(A.t.x, A.t.y + 50, { n: 10, len: 240, color: o.c2 }); say(A, A.t, n, o.t1 || '#fff0d8', o.t2 || o.c2); await sleep(450); },
    /* 光：無數光束射向對手 */
    light: async (A, o, n) => { SFX.play('ult'); X.flash('#fffbe0', .5, .9); X.rays(A.f.x, A.f.y - 40, { r: 520, n: 28, c1: 'rgba(255,240,170,.95)' }); await sleep(300); for (let i = 0; i < 12; i++) setTimeout(() => { X.beam(A.f.x + A.d * 30, A.f.y - 40 + R(-40, 40), A.t.x + R(-40, 40), A.t.y + R(-60, 50), { w: 8, c1: '#ffffff', c2: o.c1, life: .25 }); if (i % 3 === 0) SFX.play('hit'); }, i * 50); await sleep(650); X.burst(A.t.x, A.t.y, { r: 200, color: o.c1 }); shake(); say(A, A.t, n, '#fffbe8', o.c2 || '#c9973a'); await sleep(250); },
    /* 冰：整片結凍 */
    ice: async (A, o, n) => { SFX.play('ult'); X.tint('#0a2a4a', 1.3, .45); X.particles({ x: (A.f.x + A.t.x) / 2, y: A.t.y, n: 70, spd: [80, 260], life: [.9, 1.4], size: [4, 9], colors: ['#ffffff', o.c1, o.c2], shape: 'spark', add: true }); X.wave(A.f.x, A.t.x + A.d * 200, A.t.y + 60, { color: o.c1, life: .9 }); await sleep(500); X.spikes(A.t.x, A.t.y + 60, { color: o.c1, n: 9, life: 1 }); X.pillar(A.t.x, A.t.y, { w: 140, color: o.c2, life: .9 }); SFX.play('heavy'); shake(); say(A, A.t, n, '#e8faff', o.c2); await sleep(450); },
    /* 拳頭：霸氣重拳 */
    fist: async (A, o, n) => { SFX.play('ult'); moveFighter(A.S, 'dash'); afterimage(A.S); X.speedLines(A.t.x, A.t.y, { life: .5 }); await sleep(300); SFX.play('explode'); X.flash('#ffffff', .3, .8); X.arm(A.t.x - A.d * 160, A.t.y - 20, A.t.x, A.t.y - 10, { life: .3, skin: o.skin || '#2a2a3a', sleeve: o.c2, fist: 34 }); X.burst(A.t.x, A.t.y, { r: 230, color: o.c1 }); X.ring(A.t.x, A.t.y, { r1: 360, color: o.c1, w: 16, life: .6 }); X.cracks(A.t.x, A.t.y + 40, { n: 12, len: 300 }); shake(); say(A, A.t, n, '#ffffff', o.c2, 60); await sleep(350); },
    /* 震動：空氣裂開 */
    quake: async (A, o, n) => { SFX.play('ult'); X.flash('#ffffff', .45, .9); moveFighter(A.S, 'stomp'); for (let i = 0; i < 4; i++) setTimeout(() => { SFX.play('heavy'); X.ring(A.f.x + A.d * 80, A.f.y, { r1: 420, color: i % 2 ? '#ffffff' : o.c1, w: 12, life: .6 }); X.cracks((A.f.x + A.t.x) / 2 + R(-80, 80), A.f.y + R(-80, 40), { n: 10, len: 300, color: '#ffffff' }); shake(); }, i * 200); await sleep(900); say(A, A.f, n, '#ffffff', o.c2 || '#3a7ac8', 70); await sleep(300); },
    /* 鳥／獸：翅膀與火焰 */
    beast: async (A, o, n) => { SFX.play('ult'); X.tint(o.bg || '#0a1a3a', 1.1, .35); X.wings(A.f.x, A.f.y - 30, { color: o.c1, life: 1.2 }); X.flames(A.f.x, A.f.y, { n: 70, jx: 90, colors: [o.c1, o.c2, '#ffffff'] }); for (let i = 0; i < 3; i++) setTimeout(() => X.ring(A.f.x, A.f.y, { r1: 260, color: o.c1, life: .6 }), i * 200); await sleep(900); say(A, A.f, n, '#ffffff', o.c2); if (o.hit) { moveFighter(A.S, 'dash'); await sleep(260); SFX.play('explode'); X.claws(A.t.x, A.t.y, { color: o.c1 }); shake(); } await sleep(200); },
    /* 嘉年華：彩色紙花 */
    party: async (A, o, n) => { SFX.play('ult'); X.particles({ x: A.f.x, y: A.f.y - 60, n: 90, spd: [120, 360], ang: [-2.8, -.3], life: [1, 1.6], size: [6, 11], colors: ['#ff5a5a', '#ffd34a', '#5ad0ff', '#9aff6a', '#ff9ae0'], shape: 'petal', g: 260 }); for (let i = 0; i < 3; i++) setTimeout(() => { SFX.play('drum'); X.ring(A.f.x, A.f.y, { r1: 240, color: ['#ff5a5a', '#ffd34a', '#5ad0ff'][i], life: .6 }); }, i * 220); await sleep(700); say(A, A.f, n, '#ffffff', '#c8322b'); await sleep(300); },
    /* 治癒／守護 */
    heal: async (A, o, n) => { SFX.play('heal'); moveFighter(A.S, 'float'); X.glow(A.f.x, A.f.y, { color: o.c1, r: 260, life: 1.2, hold: true }); X.particles({ x: A.f.x, y: A.f.y + 60, n: 46, spd: [40, 150], ang: [-2.5, -.6], life: [.9, 1.3], size: [4, 9], colors: [o.c1, '#ffffff'], add: true }); for (let i = 0; i < 3; i++) setTimeout(() => X.ring(A.f.x, A.f.y, { r1: 220, color: o.c1, life: .6 }), i * 200); X.shield(A.f.x, A.f.y, { r: 170, edge: o.c2, life: 1.1 }); say(A, A.f, n, '#eafff0', o.c2); await sleep(1000); },
    /* 雷：落雷 */
    thunder: async (A, o, n) => { SFX.play('ult'); X.tint('#0a0a2a', 1.1, .45); for (let i = 0; i < 6; i++) setTimeout(() => { SFX.play('hit'); X.bolt(A.t.x + R(-80, 80), -20, A.t.x + R(-20, 20), A.t.y, { color: o.c1, w: 10, amp: 30, life: .3 }); }, i * 90); await sleep(620); X.flash('#ffffff', .4, .8); X.burst(A.t.x, A.t.y, { r: 200, color: o.c1 }); shake(); say(A, A.t, n, '#fffbe0', o.c2); await sleep(300); },
    /* 玩具化：粉紅光點包圍對手 */
    toy: async (A, o, n) => { SFX.play('buff'); X.particles({ x: A.t.x, y: A.t.y, n: 60, spd: [20, 120], life: [.9, 1.4], size: [4, 8], colors: ['#ff9ae0', '#ffd34a', '#ffffff'], shape: 'spark', add: true }); X.puffs(A.t.x, A.t.y, { n: 14, rad: 140, life: 1, color: '#ffd0f0' }); for (let i = 0; i < 3; i++) setTimeout(() => X.ring(A.t.x, A.t.y, { r0: 220, r1: 40, color: '#ff9ae0', life: .5 }), i * 200); await sleep(800); say(A, A.t, n, '#fff0fa', '#e05aa8'); await sleep(250); },
    /* 召喚：援軍登場 */
    call: async (A, o, n) => { SFX.play('buff'); [-1, 1].forEach(k => X.puffs(A.f.x + k * 120, A.f.y + 40, { n: 10, rad: 90, life: .9, color: '#ffffff' })); for (let i = 0; i < 2; i++) setTimeout(() => X.ring(A.f.x, A.f.y, { r1: 200, color: o.c1, life: .5 }), i * 200); await sleep(600); say(A, A.f, n, '#ffffff', o.c2); await sleep(250); }
  };
  /* 角色 → 主題與配色 */
  const ULT = {
    franky: ['giant', { c1: '#7ad0ff', c2: '#3a7ac8', t1: '#e8f6ff', t2: '#2a6ab0', hit: true }],
    moria: ['dark', { c1: '#7a4ab8', c2: '#c58bff' }], perona: ['dark', { c1: '#e090d0', c2: '#ffffff', t1: '#ffe8fa', t2: '#b04a90' }], imu: ['dark', { c1: '#3a0a3a', c2: '#ff3a5a', bg: '#0a0008', t1: '#ffe0e0', t2: '#8a0a1a' }], magellan: ['dark', { c1: '#8a1a3a', c2: '#c03a8a', t1: '#ffe0f0', t2: '#6a0a2a' }],
    hancock: ['kick', { c1: '#ff5a9a', c2: '#ffb0d0' }],
    law: ['room', { c1: '#7ad0ff', c2: '#e8f6ff', t2: '#2a6ab0' }],
    mihawk: ['sword', { c1: '#2a2a3a', c2: '#5a6a8a', t1: '#ffffff', t2: '#1a1a2a' }], shanks: ['sword', { c1: '#c8322b', c2: '#ff7a5a', t1: '#fff0e8', t2: '#8a0a0a' }],
    doflamingo: ['threads', { c1: '#ff5aa8', c2: '#c03a8a' }],
    kuma: ['paw', { c1: '#9ad0ff', c2: '#5a8ad0' }], kuma_eh: ['paw', { c1: '#c8e8ff', c2: '#ff5a5a', t2: '#8a0a0a' }],
    akainu: ['fire', { c1: '#ff3a1a', c2: '#ff8a2a', bg: '#3a0800' }], ace: ['fire', { c1: '#ff7a1a', c2: '#ffb03a' }], vegapunk: ['fire', { c1: '#ff9a3a', c2: '#ffd26c', bg: '#2a1a00', t2: '#c86a0a' }], bigmom: ['fire', { c1: '#ff4a3a', c2: '#ffd26c', bg: '#3a0a14', t2: '#c8322b' }],
    kizaru: ['light', { c1: '#ffe070', c2: '#c9973a' }],
    aokiji: ['ice', { c1: '#9fe6ff', c2: '#3a8ad0' }], monet: ['ice', { c1: '#e8f6ff', c2: '#7ab8e0' }],
    garp_mf: ['fist', { c1: '#ffffff', c2: '#3a6ab0' }], garp_hc: ['fist', { c1: '#9ad0ff', c2: '#2a4a8a' }], vergo: ['fist', { c1: '#3a3a5a', c2: '#5a3a8a' }], morgan: ['fist', { c1: '#c8c8d8', c2: '#3a6ab0', skin: '#8a8a9a' }], morgans: ['fist', { c1: '#ffe0a0', c2: '#8a6a3a', skin: '#f0d8a0' }], katakuri: ['fist', { c1: '#ffe8f0', c2: '#c03a6a', skin: '#e8d0c0' }],
    whitebeard: ['quake', { c1: '#bfe8ff', c2: '#3a7ac8' }],
    catarina: ['beast', { c1: '#ffb0d0', c2: '#c03a8a', bg: '#2a0a20', hit: true }], marco: ['beast', { c1: '#5ad0ff', c2: '#ffd26c' }], lordcoast: ['beast', { c1: '#3a8ab0', c2: '#9fe6ff', bg: '#04182a', hit: true }],
    buggy: ['party', {}],
    vivi: ['heal', { c1: '#7ad0ff', c2: '#2a8ab0' }], mayor: ['heal', { c1: '#ffd26c', c2: '#c9973a' }],
    kid: ['thunder', { c1: '#ff7a5a', c2: '#c8322b' }], york: ['thunder', { c1: '#ffd34a', c2: '#c9973a' }],
    sugar: ['toy', {}], marine: ['call', { c1: '#7ad0ff', c2: '#2a6ab0' }]
  };
  Object.entries(ULT).forEach(([id, [k, o]]) => {
    const c = CHARACTERS[id]; if (!c || !T[k]) return; const i = c.skills.length >= 5 ? 4 : c.skills.length - 1; CHOREO[id] = CHOREO[id] || [];
    if (CHOREO[id][i]) return; const name = c.skills[i].name;
    CHOREO[id][i] = async A => { try { await T[k](A, o, name); } catch (e) { console.warn(e); } };
  });
  window.ULT_FX = { T, ULT };

  /* ---------- 一般招式（第 1～4 招）：沒有專屬編排的角色，依招式動作（anima）播放對應特效並喊出招式名 ---------- */
  const TYPE_COL = { '火': ['#ff7a2a', '#ffd26c'], '冰': ['#9fe6ff', '#3a8ad0'], '雷電': ['#ffe070', '#c9973a'], '闇': ['#a05ad8', '#3a0a4a'], '水': ['#5ab0e0', '#e8f6ff'], '獸': ['#e0a060', '#8a5a2a'], '超能': ['#ff7ad9', '#7a3ab8'], '格鬥': ['#ffffff', '#c9973a'] };
  const colOf = id => { const c = CHARACTERS[id]; return (c && TYPE_COL[c.types[0]]) || ['#ffffff', '#c9973a']; };
  const tag = (A, at, n, c, sz) => X.text(at.x, at.y - 150, n, { size: sz || 50, color: '#ffffff', color2: c[1] });
  const hitFx = (A, c) => { X.burst(A.t.x, A.t.y, { r: 120, color: c[0] }); X.particles({ x: A.t.x, y: A.t.y, n: 14, spd: [120, 320], life: [.2, .45], size: [3, 6], colors: ['#ffffff', c[0]], shape: 'spark', add: true }); };
  const G = {
    punch: async (A, c, n) => { moveFighter(A.S, 'dash'); SFX.play('whoosh'); await sleep(260); SFX.play('punch'); hitFx(A, c); tag(A, A.t, n, c); },
    barrage: async (A, c, n) => { moveFighter(A.S, 'dash'); await sleep(240); for (let i = 0; i < 6; i++) setTimeout(() => { SFX.play(i % 2 ? 'hit' : 'punch'); X.burst(A.t.x + R(-40, 40), A.t.y + R(-50, 40), { r: 70, color: c[0], life: .2 }); }, i * 60); tag(A, A.t, n, c); await sleep(400); },
    shigan: async (A, c, n) => { moveFighter(A.S, 'dash'); afterimage(A.S); await sleep(240); for (let i = 0; i < 5; i++) setTimeout(() => { SFX.play('hit'); X.beam(A.t.x - A.d * 90, A.t.y + R(-50, 40), A.t.x + R(-20, 20), A.t.y + R(-50, 40), { w: 5, c1: '#ffffff', c2: c[0], life: .18 }); }, i * 55); tag(A, A.t, n, c); await sleep(330); },
    slash: async (A, c, n) => { moveFighter(A.S, 'dash'); SFX.play('whoosh'); await sleep(260); SFX.play('slash'); X.slash(A.t.x, A.t.y, { a: -2.4, span: 1.8, r: 130, color: c[0] }); X.slash(A.t.x, A.t.y, { a: .7, span: 1.8, r: 120, color: '#ffffff', ccw: true }); tag(A, A.t, n, c); },
    whip: async (A, c, n) => { moveFighter(A.S, 'stretch'); SFX.play('whoosh'); X.slash(A.t.x, A.t.y + 20, { r: 160, a: A.d > 0 ? -2.6 : -.6, span: 2.2, color: c[0], w: 14, life: .35 }); await sleep(220); SFX.play('hit'); hitFx(A, c); tag(A, A.t, n, c); },
    haki: async (A, c, n, sp) => { SFX.play(sp ? 'buff' : 'dark'); moveFighter(A.S, sp ? 'float' : 'lunge'); X.ring(A.f.x, A.f.y, { r1: 230, color: '#1a1a2a', w: 14, life: .5 }); X.ring(A.f.x, A.f.y, { r1: 200, color: c[0], w: 6, life: .5 }); if (!sp) { await sleep(260); X.flash('#000000', .25, .4); hitFx(A, c); tag(A, A.t, n, c); } else { tag(A, A.f, n, c); await sleep(600); } },
    dash: async (A, c, n) => { moveFighter(A.S, 'dash'); afterimage(A.S); X.speedLines(A.t.x, A.t.y, { life: .45 }); await sleep(260); SFX.play('heavy'); hitFx(A, c); tag(A, A.t, n, c); },
    bolt: async (A, c, n) => { SFX.play('hit'); for (let i = 0; i < 3; i++) setTimeout(() => X.bolt(A.f.x, A.f.y - 60, A.t.x + R(-30, 30), A.t.y + R(-40, 30), { color: c[0], w: 8, life: .25 }), i * 80); await sleep(300); hitFx(A, c); tag(A, A.t, n, c); },
    wave: async (A, c, n) => { SFX.play('whoosh'); X.wave(A.f.x, A.t.x + A.d * 120, A.t.y + 50, { color: c[0], life: .7 }); await sleep(380); SFX.play('heavy'); hitFx(A, c); tag(A, A.t, n, c); },
    dark: async (A, c, n) => { SFX.play('dark'); X.vortex(A.t.x, A.t.y, { r: 110, color: c[0], core: '#0a0010', rim: c[1], arms: 5, spin: 10, life: .6 }); await sleep(420); hitFx(A, c); tag(A, A.t, n, c); },
    voice: async (A, c, n) => { SFX.play('buff'); for (let i = 0; i < 3; i++) setTimeout(() => X.ring(A.f.x + A.d * 40, A.f.y - 20, { r1: 300, color: c[0], w: 6, life: .5 }), i * 120); await sleep(400); tag(A, A.t, n, c); },
    heal: async (A, c, n) => { SFX.play('heal'); moveFighter(A.S, 'float'); X.glow(A.f.x, A.f.y, { color: '#9dffb8', r: 200, life: .9, hold: true }); X.particles({ x: A.f.x, y: A.f.y + 50, n: 26, spd: [40, 130], ang: [-2.4, -.7], life: [.7, 1.1], size: [4, 8], colors: ['#9dffb8', '#ffffff'], add: true }); tag(A, A.f, n, ['#fff', '#2fae5a']); await sleep(750); },
    guard: async (A, c, n) => { SFX.play('buff'); moveFighter(A.S, 'float'); X.shield(A.f.x, A.f.y + 10, { r: 150, edge: c[0], life: 1 }); tag(A, A.f, n, c); await sleep(700); },
    quake: async (A, c, n) => { SFX.play('heavy'); moveFighter(A.S, 'stomp'); X.ring(A.f.x + A.d * 60, A.f.y, { r1: 320, color: '#ffffff', w: 10, life: .5 }); await sleep(260); X.cracks(A.t.x, A.t.y + 30, { n: 8, len: 220 }); shake(); hitFx(A, c); tag(A, A.t, n, c); },
    wings: async (A, c, n, sp) => { SFX.play('whoosh'); X.wings(A.f.x, A.f.y - 30, { color: c[0], life: .8 }); X.puffs(A.f.x, A.f.y + 30, { n: 10, rad: 120, life: .8, color: '#ffffff' }); if (!sp) { moveFighter(A.S, 'dash'); await sleep(280); hitFx(A, c); tag(A, A.t, n, c); } else { tag(A, A.f, n, c); await sleep(600); } },
    fire: async (A, c, n) => { SFX.play('whoosh'); X.flames(A.t.x, A.t.y, { n: 50, jx: 70, colors: ['#ff7a2a', '#ffd26c', c[0]] }); await sleep(380); SFX.play('explode'); X.burst(A.t.x, A.t.y, { r: 140, color: '#ff8a3a' }); tag(A, A.t, n, ['#fff', '#c84a0a']); },
    light: async (A, c, n) => { X.flash('#fffbe0', .25, .5); X.beam(A.f.x + A.d * 30, A.f.y - 30, A.t.x, A.t.y, { w: 12, c1: '#ffffff', c2: '#ffe070', life: .3 }); await sleep(220); SFX.play('hit'); hitFx(A, ['#ffe070', '#c9973a']); tag(A, A.t, n, ['#fff', '#c9973a']); },
    ice: async (A, c, n) => { SFX.play('whoosh'); X.particles({ x: A.t.x, y: A.t.y, n: 30, spd: [60, 200], life: [.6, 1], size: [4, 8], colors: ['#ffffff', '#9fe6ff'], shape: 'spark', add: true }); await sleep(300); X.spikes(A.t.x, A.t.y + 50, { color: '#9fe6ff', n: 6, life: .7 }); SFX.play('heavy'); tag(A, A.t, n, ['#fff', '#3a8ad0']); },
    storm: async (A, c, n) => { SFX.play('whoosh'); X.tornado(A.t.x, A.t.y, { color: c[0], life: .8 }); await sleep(450); hitFx(A, c); tag(A, A.t, n, c); },
    petals: async (A, c, n) => { SFX.play('buff'); X.particles({ x: A.t.x, y: A.t.y, n: 36, spd: [40, 160], life: [.7, 1.1], size: [6, 10], colors: ['#ff9ac2', '#ffffff', c[0]], shape: 'petal' }); await sleep(420); hitFx(A, c); tag(A, A.t, n, c); }
  };
  const ANIMA_FX = { punch: 'punch', barrage: 'barrage', shigan: 'shigan', onigiri: 'slash', sanzen: 'slash', shishi: 'slash', sandslash: 'slash', whip: 'whip', haki: 'haki', skywalk: 'dash', raimei: 'bolt', lightning: 'bolt', kaifu: 'wave', poseidon: 'wave', summonsea: 'wave', naraku: 'dark', darkpull: 'dark', darkcopy: 'dark', voice: 'voice', cook: 'heal', heal: 'heal', kagamiyama: 'guard', balloon: 'guard', quake: 'quake', wings: 'wings', karyu: 'fire', ifrit: 'fire', flash: 'light', icefang: 'ice', okuchi: 'ice', vortex: 'storm', shuryu: 'storm', petals: 'petals' };
  const _pc = playChoreo;
  window.playChoreo = async function (side, actor, idx, skill) {
    const src = skill && skill.copiedFrom ? skill.copiedFrom : { id: actor.id, idx };
    if ((src.idx >= 0 && CHOREO[src.id] && CHOREO[src.id][src.idx]) || !skill) return _pc.apply(this, arguments);
    const k = ANIMA_FX[skill.anima] || (skill.type === 'support' ? 'guard' : 'punch'), fn = G[k];
    FXE.ensure(); const S = side === 'P' ? 'L' : 'R', T2 = side === 'P' ? 'R' : 'L', A = { S, T: T2, f: fighterPoint(S), t: fighterPoint(T2), d: S === 'L' ? 1 : -1 };
    try { await fn(A, colOf(actor.id), skill.name, skill.type === 'support'); } catch (e) { console.warn(e); }
  };
  window.ANIMA_FX = ANIMA_FX;
})();
