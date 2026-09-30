/* 奪寶大冒險：左右槳交替划船的跑酷小遊戲 */
(function () {
  const ZONES = [
    { at: 0, name: '東海', water: '#2f8fcf', water2: '#1f6fa8', bank: '#e6cf94', bank2: '#c9ad6a', sky: '#9fd6f5', deco: 'palm' },
    { at: 800, name: '偉大航路', water: '#1f8a9a', water2: '#12606e', bank: '#8a7a5a', bank2: '#6a5a40', sky: '#7fc4c9', deco: 'rock' },
    { at: 2000, name: '新世界', water: '#2a3f7a', water2: '#1a2754', bank: '#4a3a5a', bank2: '#2e2440', sky: '#5a3a7a', deco: 'crystal' },
    { at: 4000, name: '暴風海域', water: '#223048', water2: '#121a2a', bank: '#3a3a40', bank2: '#22222a', sky: '#2a2f40', deco: 'rock', storm: true }
  ];
  const LANES = [-0.72, 0, 0.72];
  let cv, cx, W, H, dpr, G = null, raf = 0, keysBound = false, WAVE = null;
  const IMG = {}; ['ship', 'rock', 'coin', 'ball', 'marine_ship', 'vortex', 'seamonster', 'arrow_up', 'chest'].forEach(k => { const im = new Image(); im.src = `assets/runner/${k}.webp?v=41`; IMG[k] = im; });
  const ready = k => IMG[k] && IMG[k].complete && IMG[k].naturalWidth;
  /* 預先畫好兩張可平鋪的浪紋，捲動時互相疊加產生真實的海面 */
  function makeWave(seed, crest, alpha) { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); let s = seed; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < crest; i++) { const x = rnd() * 256, y = rnd() * 256, w = 10 + rnd() * 34, a = alpha * (.4 + rnd() * .6); g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = 1 + rnd() * 1.6; g.beginPath(); for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) { g.moveTo(x + dx - w / 2, y + dy); g.quadraticCurveTo(x + dx, y + dy - 3 - rnd() * 3, x + dx + w / 2, y + dy); } g.stroke(); }
    for (let i = 0; i < crest / 2; i++) { const x = rnd() * 256, y = rnd() * 256, rr = 8 + rnd() * 20; g.fillStyle = `rgba(0,20,50,${alpha * .5})`; for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) { g.beginPath(); g.ellipse(x + dx, y + dy, rr * 1.8, rr * .5, 0, 0, 6.29); g.fill(); } }
    return c; }

  const lerp = (a, b, t) => a + (b - a) * t;
  function hexMix(a, b, t) { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`; }
  function zoneAt(d) { let i = 0; for (let k = 0; k < ZONES.length; k++) if (d >= ZONES[k].at) i = k; const Z = ZONES[i], N = ZONES[i + 1]; const t = N ? Math.max(0, Math.min(1, (d - (N.at - 120)) / 120)) : 0; return { i, Z, N, t }; }
  function col(key, d) { const z = zoneAt(d); return z.N && z.t > 0 ? hexMix(z.Z[key], z.N[key], z.t) : z.Z[key]; }

  function resize() { const r = cv.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  const playW = () => Math.min(W, 820), riverL = () => (W - playW()) / 2, riverR = () => (W + playW()) / 2;
  const laneX = x => W / 2 + x * playW() * .36;
  const PPM = () => H / 55;                 // 每公尺像素
  const boatY = () => H * .76;

  function newGame() {
    G = { shots: [], fx: [], foam: [], caps: [], shake: 0, dist: 0, v: 0, x: 0, tx: 0, hearts: 3, coins: 0, inv: 0, combo: 0, last: 0, lastSide: null, objs: [], nextObs: 25, nextCoin: 12, nextDeco: 0, decos: [], t: 0, oarL: 0, oarR: 0, over: false, started: false, flash: 0, rain: [] };
    for (let i = 0; i < 60; i++) G.rain.push([Math.random(), Math.random()]);
  }
  /* 划槳：左右交替＝加速＋連擊；同一邊連划＝慢慢前進；左槳往左、右槳往右 */
  function stroke(side) {
    if (!G || G.over) return; if (!G.started) return;
    const now = performance.now() / 1000, gap = now - G.last;
    let fb = '';
    if (G.lastSide && G.lastSide !== side && gap > .16 && gap < .8) { G.combo++; G.v += 2.1 + Math.min(G.combo, 25) * .09; fb = gap > .26 && gap < .55 ? '完美節奏！' : '好！'; }
    else if (G.lastSide === side && gap < .8) { G.combo = 0; G.v += .55; fb = '換邊划！'; }
    else { G.combo = Math.max(0, G.combo - 1); G.v += 1.4; }
    G.tx = Math.max(-1, Math.min(1, G.tx + (side === 'L' ? -.36 : .36)));
    G.last = now; G.lastSide = side; if (side === 'L') G.oarL = 1; else G.oarR = 1;
    SFX.play('whoosh'); $('rnCombo').textContent = G.combo >= 3 ? `${fb} ×${G.combo}` : fb;
    $('rnRhythm').classList.remove('pulse'); void $('rnRhythm').offsetWidth; $('rnRhythm').classList.add('pulse');
  }

  function spawn() {
    const d = G.dist, lv = Math.min(1, d / 5000);
    while (G.nextObs < d + 60) {
      const z = zoneAt(G.nextObs).i, r = Math.random(); let o;
      const far = G.nextObs >= 2000;
      if (z >= 1 && r < (far ? .06 : .15)) o = { k: 'ship', lane: LANES[(Math.random() * 3) | 0], w: .46 };
      else if (z >= 2 && r < .3) o = { k: 'king', lane: LANES[(Math.random() * 3) | 0], w: .5 };
      else if (r < .45) { o = { k: 'whirl', lane: LANES[(Math.random() * 3) | 0], w: .42, soft: true }; if (far && Math.random() < .5) o.drift = { base: o.lane, amp: .45 + Math.random() * .2, sp: 1 + Math.random() * .8, ph: Math.random() * 6.28 }; }
      else if (r < .7) o = { k: 'barrel', lane: LANES[(Math.random() * 3) | 0], w: .32, glow: Math.random() < .1 };
      else o = { k: 'rock', lane: LANES[(Math.random() * 3) | 0], w: .4 };
      o.at = G.nextObs; G.objs.push(o);
      if (d > 600 && Math.random() < .25 + lv * .35) { const o2 = { k: 'rock', lane: LANES.filter(x => Math.abs(x - o.lane) > .5)[(Math.random() * 2) | 0] ?? 0, w: .38, at: G.nextObs + 1.5 }; G.objs.push(o2); }
      G.nextObs += Math.max(8, 26 - d / 180) * (.8 + Math.random() * .5);
    }
    while (G.nextCoin < d + 60) { const lane = LANES[(Math.random() * 3) | 0], n = 5 + ((Math.random() * 4) | 0); for (let i = 0; i < n; i++) G.objs.push({ k: 'coin', lane, w: .15, at: G.nextCoin + i * 4.6 }); G.nextCoin += n * 4.6 + 12 + Math.random() * 14; }
    /* 箭頭道具：隨機出現，吃到後飛越 300 公尺 */
    if (G.nextArrow == null) G.nextArrow = 350 + Math.random() * 300;
    while (G.nextArrow < d + 60) { G.objs.push({ k: 'arrow', lane: LANES[(Math.random() * 3) | 0], w: .3, at: G.nextArrow }); G.nextArrow += 450 + Math.random() * 450; }
    /* 落地安全區：前後 25 公尺內不會有陷阱 */
    if (G.safe) { const [a, b] = G.safe; G.objs = G.objs.filter(o => !(o.at >= a && o.at <= b && !['coin', 'arrow'].includes(o.k))); if (d > b) G.safe = null; }
    while (G.nextDeco < d + 70) { G.decos.push({ at: G.nextDeco, side: Math.random() < .5 ? -1 : 1, s: .7 + Math.random() * .6, off: Math.random() }); G.nextDeco += 4 + Math.random() * 6; }
    G.objs = G.objs.filter(o => o.at > d - 12 && !o.gone); G.decos = G.decos.filter(o => o.at > d - 14);
  }

  function hurt(n, msg) {
    if (G.over) return; G.hearts = Math.max(0, G.hearts - n); G.flash = 1; G.shake = n >= 1 ? 1 : .5; SFX.play(n >= 1 ? 'explode' : 'punch'); if (navigator.vibrate) navigator.vibrate(n >= 1 ? [60, 40, 90] : 50);
    for (let i = 0; i < (n >= 1 ? 26 : 12); i++) { const a = Math.random() * 6.28, sp = 60 + Math.random() * 220; G.fx.push({ x: laneX(G.x), y: boatY(), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: .6 + Math.random() * .5, c: n >= 1 ? (Math.random() < .5 ? '#ffb347' : '#fff3c4') : '#7fe0a0' }); }
    if (msg) toast(msg, 'warn'); if (G.hearts <= 0) end();
  }
  function warn(t) { const el = $('rnWarn'); if (!el) return; el.textContent = t; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
  function milestone(t) { const el = $('rnMile'); if (!el) return; el.textContent = t; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
  function update(dt) {
    G.t += dt; if (!G.started || G.over) return;
    const cap = 24 + Math.min(12, G.dist / 450);
    G.v = Math.max(0, Math.min(cap, G.v * (1 - .5 * dt) - .6 * dt));
    if (G.fly) { G.fly.t += dt; const k = Math.min(1, G.fly.t / G.fly.dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; G.dist = G.fly.from + (G.fly.to - G.fly.from) * e; if (k >= 1) { G.fly = null; G.inv = Math.max(G.inv, .8); SFX.play('water'); G.shake = .4; } }
    else G.dist += G.v * dt;
    G.x = lerp(G.x, G.tx, Math.min(1, dt * 5)); G.tx *= (1 - .15 * dt);
    [[2500, 'm2500'], [5000, 'm5000']].forEach(([m, key]) => { if (!G[key] && G.dist >= m) { G[key] = true; G.coins *= 2; SFX.play('rare'); milestone(`突破 ${m} 公尺！目前錢幣 ×2`); } });
    G.oarL = Math.max(0, G.oarL - dt * 3); G.oarR = Math.max(0, G.oarR - dt * 3); G.inv = Math.max(0, G.inv - dt); G.flash = Math.max(0, G.flash - dt * 2);
    spawn();
    for (const o of G.objs) {
      if (o.drift) o.lane = Math.max(-.9, Math.min(.9, o.drift.base + Math.sin(G.t * o.drift.sp + o.drift.ph) * o.drift.amp));
      if (o.k === 'shell') o.at -= o.vel * dt;
      if (o.k === 'ship' && !o.fired && G.dist >= 1200 && !G.fly) { const dz = o.at - G.dist; if (dz < 35 && dz > 18) { o.fired = true; G.objs.push({ k: 'shell', lane: Math.max(-.9, Math.min(.9, G.x)), w: .22, at: o.at - 1.5, vel: 16 }); SFX.play('punch'); warn('⚠ 軍艦開砲了！快左右閃開！'); } }
    }
    if (!G.fly) for (const o of G.objs) { if (o.gone) continue; const dz = o.at - G.dist; if (dz < 1.2 && dz > -1.2 && Math.abs(o.lane - G.x) < (o.w + .34) / 2) {
      if (o.k === 'coin') { o.gone = true; G.coins++; SFX.play('coin'); }
    else if (o.k === 'arrow') { o.gone = true; const to = G.dist + 300; G.fly = { from: G.dist, to, t: 0, dur: 2.2 }; G.safe = [to - 5, to + 25]; G.objs = G.objs.filter(x => !(x.at >= to - 5 && x.at <= to + 25 && !['coin', 'arrow'].includes(x.k))); SFX.play('rare'); milestone('箭頭加速！飛越 300 公尺！'); }
      else if (o.k === 'shell') { if (G.inv <= 0) { o.gone = true; G.inv = 1.4; hurt(1, '被軍艦的砲彈擊中了！'); } }
    else if (o.k === 'barrel' && o.glow) { o.gone = true; SFX.play('rare'); if (G.hearts < 3) { G.hearts = Math.min(3, G.hearts + 1); milestone('發光的寶箱！生命 +1'); } else { G.coins += 10; milestone('發光的寶箱！生命已滿，改得錢幣 +10'); } for (let i = 0; i < 18; i++) G.fx.push({ x: laneX(G.x), y: boatY() - 20, vx: (Math.random() - .5) * 260, vy: -120 - Math.random() * 200, life: .9, c: i % 2 ? '#ffe27a' : '#fff6c8' }); }
    else if (o.k === 'barrel') { if (G.inv <= 0) { o.gone = true; G.inv = 1.4; G.v *= .5; for (let i = 0; i < 14; i++) G.fx.push({ x: laneX(G.x), y: boatY() - 20, vx: (Math.random() - .5) * 240, vy: -80 - Math.random() * 160, life: .8, c: i % 2 ? '#8a5a2e' : '#c8a060' }); hurt(1, '撞上了寶箱！扣 1 命'); } }
    else if (o.k === 'king') { if (G.inv <= 0) { G.inv = 1.4; G.v *= .5; hurt(.5, '被海怪咬了一口！扣半顆心'); } }
      else if (o.soft) { if (!o.hitOnce) { o.hitOnce = true; G.v *= .45; SFX.play('water'); toast('被漩渦捲住了，速度下降！'); } }
      else if (G.inv <= 0) { G.inv = 1.6; G.v *= .4; o.gone = o.k !== 'ship'; const side = Math.random() < .5 ? -1 : 1; G.shots.push({ t: 0, sx: side < 0 ? -40 : W + 40, sy: boatY() - H * .45 }); SFX.play('punch'); toast('撞上了！敵人的砲彈飛過來了！', 'warn'); } } }
    for (const s of G.shots) { s.t += dt; if (s.t >= .6 && !s.hit) { s.hit = true; hurt(1); } }
    G.shots = G.shots.filter(s => s.t < .9); G.shake = Math.max(0, G.shake - dt * 3);
    G.fx.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; }); G.fx = G.fx.filter(p => p.life > 0);
    const sp = G.v * PPM() * dt; G.foam.forEach(f => { f.y += sp; f.x += f.vx * dt; f.life -= dt; }); G.foam = G.foam.filter(f => f.life > 0 && f.y < H + 20);
    if (G.v > 1) for (let i = 0; i < 2; i++) G.foam.push({ x: laneX(G.x) + (Math.random() - .5) * playW() * .08, y: boatY() + playW() * .12, vx: (Math.random() - .5) * 40, life: 1.2 + Math.random(), r: 2 + Math.random() * 3 });
    G.caps.forEach(c => { c.y += sp * .92; c.life -= dt; }); G.caps = G.caps.filter(c => c.life > 0 && c.y < H + 20); if (Math.random() < dt * 6) G.caps.push({ x: Math.random() * W, y: Math.random() * H * .8, life: 1.5 + Math.random() * 1.5, w: 10 + Math.random() * 26 });
    $('rnDist').textContent = Math.floor(G.dist) + ' m'; $('rnCoins').textContent = G.coins;
    $('rnBar').style.width = Math.min(100, G.v / cap * 100) + '%';
    $('rnHearts').innerHTML = [0, 1, 2].map(i => `<i class="${G.hearts >= i + 1 ? 'on' : G.hearts >= i + .5 ? 'half' : ''}">♥</i>`).join('');
  }

  /* ---------- 繪製 ---------- */
  function draw() {
    const d = G.dist, ppm = PPM(), by = boatY(), L = riverL(), R = riverR();
    const persp = y => .6 + .4 * Math.max(0, Math.min(1.1, y / H));
    cx.save(); if (G.shake > 0) cx.translate((Math.random() - .5) * 14 * G.shake, (Math.random() - .5) * 14 * G.shake);
    // 深海底色（依海域變化）
    const wg = cx.createLinearGradient(0, 0, 0, H); wg.addColorStop(0, col('water2', d)); wg.addColorStop(.6, col('water', d)); wg.addColorStop(1, col('water2', d)); cx.fillStyle = wg; cx.fillRect(-20, -20, W + 40, H + 40);
    // 三層浪紋：速度不同形成深度
    if (!WAVE) WAVE = [makeWave(7, 90, .18), makeWave(31, 60, .28), makeWave(97, 40, .4)];
    [[0, .55, 1.4, .7], [1, .8, 1, 1], [2, 1, .8, 1.3]].forEach(([k, spd, sc, a]) => { const pat = cx.createPattern(WAVE[k], 'repeat'); const oy = (d * ppm * spd) % (256 * sc), ox = Math.sin(G.t * .3 + k) * 30; cx.save(); cx.globalAlpha = a; cx.translate(ox, oy); cx.scale(sc, sc); cx.fillStyle = pat; cx.fillRect(-256, -256, W / sc + 512, H / sc + 512); cx.restore(); });
    // 波光
    cx.save(); cx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 18; i++) { const x = (Math.sin(i * 12.9 + G.t * .4) * .5 + .5) * W, y = ((i * 97 + d * ppm * .9) % (H + 80)) - 40, r = 30 + (i % 5) * 14; const gg = cx.createRadialGradient(x, y, 0, x, y, r); gg.addColorStop(0, 'rgba(180,230,255,.10)'); gg.addColorStop(1, 'rgba(180,230,255,0)'); cx.fillStyle = gg; cx.fillRect(x - r, y - r, r * 2, r * 2); } cx.restore();
    // 白浪
    for (const c of G.caps) { const a = Math.min(1, c.life) * .5; cx.strokeStyle = `rgba(255,255,255,${a})`; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(c.x - c.w / 2, c.y); cx.quadraticCurveTo(c.x, c.y - 5, c.x + c.w / 2, c.y); cx.stroke(); }
    // 航道邊界（淡淡的浪線，提示可移動範圍）
    if (W > 860) { cx.fillStyle = 'rgba(0,10,30,.18)'; cx.fillRect(0, 0, L, H); cx.fillRect(R, 0, W - R, H); }
    // 航跡
    for (const f of G.foam) { cx.fillStyle = `rgba(255,255,255,${Math.min(.7, f.life * .5)})`; cx.beginPath(); cx.arc(f.x, f.y, f.r * (1.6 - f.life * .3), 0, 6.29); cx.fill(); }
    // 物件（由遠到近）
    const list = G.objs.filter(o => !o.gone).map(o => ({ o, y: by - (o.at - d) * ppm })).filter(q => q.y > -90 && q.y < H + 90).sort((a, b) => a.y - b.y);
    for (const { o, y } of list) { const s = persp(y), x = laneX(o.lane), w = playW() * .36 * o.w * s; obj(o, x, y, w, s); }
    boat(laneX(G.x), by, playW() * .2, (G.tx - G.x) * .5);
    // 砲彈：從側邊劃出拋物線飛向船
    for (const s of G.shots) { if (s.hit) continue; const k = Math.min(1, s.t / .6), tx = laneX(G.x), x = s.sx + (tx - s.sx) * k, y = s.sy + (by - s.sy) * k - Math.sin(k * Math.PI) * H * .18, sz = playW() * (.07 + .05 * Math.sin(k * Math.PI));
      cx.fillStyle = 'rgba(0,0,0,.25)'; cx.beginPath(); cx.ellipse(s.sx + (tx - s.sx) * k, s.sy + (by - s.sy) * k + 10, sz * .5, sz * .2, 0, 0, 6.29); cx.fill();
      cx.save(); cx.translate(x, y); cx.rotate(s.t * 12); if (ready('ball')) cx.drawImage(IMG.ball, -sz / 2, -sz / 2, sz, sz); else { cx.fillStyle = '#6a1a2a'; cx.beginPath(); cx.arc(0, 0, sz / 2, 0, 6.29); cx.fill(); } cx.restore(); }
    // 爆炸火花
    for (const p of G.fx) { cx.globalAlpha = Math.min(1, p.life * 1.5); cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, 3 + p.life * 4, 0, 6.29); cx.fill(); } cx.globalAlpha = 1;
    const z = zoneAt(d).Z;
    if (z.storm || zoneAt(d).i >= 3) { cx.strokeStyle = 'rgba(200,220,255,.35)'; cx.lineWidth = 1.2; cx.beginPath(); for (const rr of G.rain) { const x = (rr[0] * W + G.t * 60) % W, y = (rr[1] * H + G.t * 700) % H; cx.moveTo(x, y); cx.lineTo(x - 5, y + 14); } cx.stroke(); if (Math.random() < .004) G.flash = .6; }
    cx.restore();
    if (G.flash > 0) { cx.fillStyle = `rgba(255,240,220,${G.flash * .4})`; cx.fillRect(0, 0, W, H); }
  }
  function decor(kind, x, y, s) {
    cx.save(); cx.translate(x, y); cx.scale(s, s);
    if (kind === 'palm') { cx.fillStyle = '#8a5a2e'; cx.fillRect(-3, -40, 6, 40); cx.fillStyle = '#3f9a4a'; for (let i = 0; i < 5; i++) { cx.beginPath(); cx.ellipse(Math.cos(i * 1.26) * 14, -42 + Math.sin(i * 1.26) * 6, 16, 5, i * 1.26, 0, 6.29); cx.fill(); } }
    else if (kind === 'crystal') { cx.fillStyle = '#9a6ae0'; cx.beginPath(); cx.moveTo(0, -34); cx.lineTo(10, 0); cx.lineTo(-10, 0); cx.fill(); cx.fillStyle = '#c9a0ff'; cx.beginPath(); cx.moveTo(-8, -18); cx.lineTo(-2, 0); cx.lineTo(-14, 0); cx.fill(); }
    else { cx.fillStyle = '#6b6457'; cx.beginPath(); cx.ellipse(0, -8, 18, 12, 0, 0, 6.29); cx.fill(); cx.fillStyle = '#8a8272'; cx.beginPath(); cx.ellipse(-4, -12, 8, 5, 0, 0, 6.29); cx.fill(); }
    cx.restore();
  }
  function obj(o, x, y, w, s) {
    cx.save(); cx.translate(x, y);
    if (o.k === 'coin') { const r = w * .55, sq = Math.cos(G.t * 4 + o.at * .7); cx.fillStyle = 'rgba(0,0,0,.22)'; cx.beginPath(); cx.ellipse(0, r * .9, r * .7, r * .2, 0, 0, 6.29); cx.fill(); cx.scale(Math.max(.08, Math.abs(sq)), 1); if (ready('coin')) { if (sq < 0) cx.filter = 'brightness(.8)'; cx.drawImage(IMG.coin, -r, -r, r * 2, r * 2); cx.filter = 'none'; } else { cx.fillStyle = '#ffd26c'; cx.beginPath(); cx.arc(0, 0, r, 0, 6.29); cx.fill(); } }
    else if (o.k === 'rock' && ready('rock')) { const s2 = w * 1.9, bob = Math.sin(G.t * 2 + o.at) * 1.5; cx.strokeStyle = 'rgba(255,255,255,.55)'; cx.lineWidth = 3; cx.beginPath(); cx.ellipse(0, s2 * .12, s2 * .42, s2 * .16, 0, 0, 6.29); cx.stroke(); cx.drawImage(IMG.rock, -s2 / 2, -s2 * .62 + bob, s2, s2 * IMG.rock.naturalHeight / IMG.rock.naturalWidth); }
    else if (o.k === 'rock') { cx.fillStyle = 'rgba(0,0,0,.2)'; cx.beginPath(); cx.ellipse(0, w * .15, w * .55, w * .2, 0, 0, 6.29); cx.fill(); cx.fillStyle = '#6b6457'; cx.beginPath(); cx.moveTo(-w * .5, 0); cx.lineTo(-w * .3, -w * .5); cx.lineTo(w * .1, -w * .65); cx.lineTo(w * .5, -w * .2); cx.lineTo(w * .45, 0); cx.fill(); cx.fillStyle = '#8a8272'; cx.beginPath(); cx.moveTo(-w * .3, -w * .5); cx.lineTo(w * .1, -w * .65); cx.lineTo(0, -w * .3); cx.fill(); cx.strokeStyle = 'rgba(255,255,255,.6)'; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(0, 0, w * .6, w * .15, 0, 0, 6.29); cx.stroke(); }
    else if (o.k === 'shell') { const sz = w * 2.2; cx.fillStyle = 'rgba(0,0,0,.25)'; cx.beginPath(); cx.ellipse(0, sz * .5, sz * .45, sz * .15, 0, 0, 6.29); cx.fill(); cx.strokeStyle = 'rgba(255,200,120,.55)'; cx.lineWidth = sz * .35; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(0, -sz * 1.6); cx.lineTo(0, -sz * .3); cx.stroke(); cx.rotate(G.t * 10); if (ready('ball')) cx.drawImage(IMG.ball, -sz / 2, -sz / 2, sz, sz); else { cx.fillStyle = '#6a1a2a'; cx.beginPath(); cx.arc(0, 0, sz / 2, 0, 6.29); cx.fill(); } }
    else if (o.k === 'arrow' && ready('arrow_up')) { const s2 = w * 2.4, bob = Math.sin(G.t * 4 + o.at) * s2 * .08, g = cx.createRadialGradient(0, bob, 0, 0, bob, s2 * .8); g.addColorStop(0, 'rgba(255,220,100,.55)'); g.addColorStop(1, 'rgba(255,220,100,0)'); cx.fillStyle = g; cx.beginPath(); cx.arc(0, bob, s2 * .8, 0, 6.29); cx.fill(); const ih = s2 * IMG.arrow_up.naturalHeight / IMG.arrow_up.naturalWidth; cx.drawImage(IMG.arrow_up, -s2 / 2, -ih / 2 + bob, s2, ih); }
    else if (o.k === 'arrow') { const s2 = w * 2.2, bob = Math.sin(G.t * 4 + o.at) * s2 * .08; cx.translate(0, bob); const g = cx.createRadialGradient(0, 0, 0, 0, 0, s2); g.addColorStop(0, 'rgba(255,230,120,.8)'); g.addColorStop(1, 'rgba(255,230,120,0)'); cx.fillStyle = g; cx.beginPath(); cx.arc(0, 0, s2, 0, 6.29); cx.fill();
      cx.fillStyle = '#ffd24a'; cx.strokeStyle = '#8a5a0a'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(0, -s2 * .7); cx.lineTo(s2 * .5, -s2 * .1); cx.lineTo(s2 * .2, -s2 * .1); cx.lineTo(s2 * .2, s2 * .6); cx.lineTo(-s2 * .2, s2 * .6); cx.lineTo(-s2 * .2, -s2 * .1); cx.lineTo(-s2 * .5, -s2 * .1); cx.closePath(); cx.fill(); cx.stroke(); }
    else if (o.k === 'barrel' && ready('chest')) { const s2 = w * 2, ih = s2 * IMG.chest.naturalHeight / IMG.chest.naturalWidth, bob = Math.sin(G.t * 2.2 + o.at) * s2 * .03;
      if (o.glow) { const pu = .75 + Math.sin(G.t * 5 + o.at) * .25, g = cx.createRadialGradient(0, -ih * .35, 0, 0, -ih * .35, s2 * .95); g.addColorStop(0, `rgba(255,240,150,${.95 * pu})`); g.addColorStop(.45, `rgba(255,205,80,${.55 * pu})`); g.addColorStop(1, 'rgba(255,200,80,0)'); cx.fillStyle = g; cx.beginPath(); cx.arc(0, -ih * .35, s2 * .95, 0, 6.29); cx.fill();
        cx.save(); cx.globalCompositeOperation = 'lighter'; cx.fillStyle = 'rgba(255,240,170,.9)'; for (let i = 0; i < 5; i++) { const a = G.t * 1.5 + i * 1.26, rr = s2 * (.45 + .1 * Math.sin(G.t * 3 + i)); cx.beginPath(); cx.arc(Math.cos(a) * rr, -ih * .4 + Math.sin(a) * rr * .5, 2 + (i % 2) * 1.5, 0, 6.29); cx.fill(); } cx.restore(); }
      cx.strokeStyle = 'rgba(255,255,255,.5)'; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(0, 0, s2 * .45, s2 * .12, 0, 0, 6.29); cx.stroke();
      if (o.glow) { cx.filter = 'brightness(1.35) saturate(1.25)'; cx.shadowColor = 'rgba(255,220,90,.95)'; cx.shadowBlur = 22 + Math.sin(G.t * 5) * 8; } cx.drawImage(IMG.chest, -s2 / 2, -ih * .82 + bob, s2, ih); cx.filter = 'none'; cx.shadowBlur = 0;
      }
    else if (o.k === 'barrel') { cx.fillStyle = '#8a5a2e'; cx.fillRect(-w * .35, -w * .5, w * .7, w * .6); cx.fillStyle = '#3a3a3a'; cx.fillRect(-w * .37, -w * .38, w * .74, w * .08); cx.fillRect(-w * .37, -w * .12, w * .74, w * .08); cx.fillStyle = '#c8322b'; cx.font = `${w * .3}px sans-serif`; cx.textAlign = 'center'; cx.fillText('☠', 0, -w * .18); }
    else if (o.k === 'whirl' && ready('vortex')) { const s2 = w * 2.6; cx.rotate(-G.t * 1.8); cx.globalAlpha = .92; cx.drawImage(IMG.vortex, -s2 / 2, -s2 / 2, s2, s2); cx.globalAlpha = 1; }
    else if (o.k === 'whirl') { cx.rotate(G.t * 3); cx.strokeStyle = 'rgba(220,245,255,.8)'; cx.lineWidth = 3; for (let i = 0; i < 3; i++) { cx.beginPath(); cx.arc(0, 0, w * (.2 + i * .15), i, i + 4); cx.stroke(); } }
    else if (o.k === 'ship' && ready('marine_ship')) { const iw = w * 1.3, ih = iw * IMG.marine_ship.naturalHeight / IMG.marine_ship.naturalWidth, bob = Math.sin(G.t * 1.6 + o.at) * 2; cx.fillStyle = 'rgba(255,255,255,.35)'; cx.beginPath(); cx.ellipse(0, ih * .12, iw * .5, ih * .18, 0, 0, 6.29); cx.fill(); cx.drawImage(IMG.marine_ship, -iw / 2, -ih * .78 + bob, iw, ih); }
    else if (o.k === 'ship') { cx.fillStyle = '#f4f2ea'; cx.fillRect(-w * .45, -w * .55, w * .9, w * .4); cx.fillStyle = '#3f6fa3'; cx.fillRect(-w * .5, -w * .18, w, w * .22); cx.fillStyle = '#1f4f7a'; cx.fillRect(-w * .5, 0, w, w * .06); cx.fillStyle = '#fff'; cx.fillRect(-w * .05, -w * .95, w * .1, w * .45); cx.fillStyle = '#3f6fa3'; cx.font = `bold ${w * .16}px sans-serif`; cx.textAlign = 'center'; cx.fillText('MARINE', 0, -w * .3); }
    else if (o.k === 'king' && ready('seamonster')) { const iw = w * 1.6, ih = iw * IMG.seamonster.naturalHeight / IMG.seamonster.naturalWidth, sw = Math.sin(G.t * 2.2 + o.at) * iw * .05; cx.strokeStyle = 'rgba(255,255,255,.5)'; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(0, 0, iw * .45, iw * .14, 0, 0, 6.29); cx.stroke(); cx.drawImage(IMG.seamonster, -iw / 2 + sw, -ih * .82, iw, ih); }
    else if (o.k === 'king') { const sw = Math.sin(G.t * 3 + o.at) * w * .1; cx.fillStyle = '#3f8a6a'; cx.beginPath(); cx.ellipse(sw, -w * .3, w * .28, w * .45, 0, 0, 6.29); cx.fill(); cx.fillStyle = '#9fd6a0'; cx.beginPath(); cx.ellipse(sw, -w * .25, w * .14, w * .32, 0, 0, 6.29); cx.fill(); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(sw - w * .1, -w * .6, w * .06, 0, 6.29); cx.arc(sw + w * .1, -w * .6, w * .06, 0, 6.29); cx.fill(); cx.fillStyle = '#c8322b'; cx.beginPath(); cx.arc(sw - w * .1, -w * .6, w * .03, 0, 6.29); cx.arc(sw + w * .1, -w * .6, w * .03, 0, 6.29); cx.fill(); cx.strokeStyle = 'rgba(255,255,255,.6)'; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(0, 0, w * .5, w * .12, 0, 0, 6.29); cx.stroke(); }
    cx.restore();
  }
  function boat(x, y, w, tilt) {
    const fk = G.fly ? Math.min(1, G.fly.t / G.fly.dur) : 0, lift = G.fly ? Math.sin(fk * Math.PI) : 0;
    if (lift > 0) { cx.fillStyle = `rgba(0,20,40,${.35 - lift * .2})`; cx.beginPath(); cx.ellipse(x, y + 10, w * (.4 - lift * .15), w * (.6 - lift * .2), 0, 0, 6.29); cx.fill();
      cx.strokeStyle = 'rgba(255,255,255,.6)'; cx.lineWidth = 2; for (let i = 0; i < 8; i++) { const lx = x + (Math.random() - .5) * w * 2.4, ly = y - Math.random() * w * 2; cx.beginPath(); cx.moveTo(lx, ly); cx.lineTo(lx, ly + 30 + Math.random() * 40); cx.stroke(); } }
    cx.save(); cx.translate(x, y - lift * w * .9); cx.scale(1 + lift * .6, 1 + lift * .6); cx.rotate(tilt * .45);
    if (G.inv > 0 && Math.floor(G.t * 12) % 2) cx.globalAlpha = .55;
    const h = ready('ship') ? w * IMG.ship.naturalHeight / IMG.ship.naturalWidth : w * 1.4;
    const oar = (side, k) => { cx.save(); cx.translate(side * w * .34, h * .12); cx.rotate(side * (.35 - k * 1.1)); cx.fillStyle = '#6b4a2f'; cx.fillRect(-2, 0, 4, w * .6); cx.fillStyle = '#8a5a2e'; cx.fillRect(-6, w * .5, 12, w * .18); cx.restore(); };
    oar(-1, G.oarL); oar(1, G.oarR);
    cx.fillStyle = 'rgba(0,20,40,.3)'; cx.beginPath(); cx.ellipse(6, 8, w * .38, h * .46, 0, 0, 6.29); cx.fill();
    if (ready('ship')) cx.drawImage(IMG.ship, -w / 2, -h / 2, w, h); else { cx.fillStyle = '#8a5a2e'; cx.fillRect(-w * .3, -h * .45, w * .6, h * .9); }
    cx.restore();
  }


  function loop(ts) { if (currentScreen !== 'runnerScreen') { raf = 0; return; } const now = ts / 1000; const dt = Math.min(.05, now - (G.lastTs || now)); G.lastTs = now; update(dt); draw(); raf = requestAnimationFrame(loop); }

  function panel(html) { const p = $('rnPanel'); p.innerHTML = html; p.classList.add('show'); }
  function startPanel() {
    const r = SAVE.data.runner || {};
    panel(`<div class="rn-card"><h2>奪寶大冒險</h2>
      <p class="rn-lead">左右槳<b>交替</b>划船就會加速，節奏越穩連擊越高。<br>划左槳船會往左、划右槳往右，閃開礁石與軍艦，沿途搶金幣！</p>
      <ul class="rn-rules"><li>➤ 箭頭道具：船會飛越 300 公尺，落地點前後 25 公尺內沒有陷阱</li><li>🐉 海怪：撞到扣半顆心</li><li>💣 1200 公尺後：海軍軍艦會開砲，自己閃開</li><li>🌀 2000 公尺後：軍艦變少，但漩渦可能左右移動</li><li>🏆 到達 2500、5000 公尺：當下的錢幣各翻倍一次，可以繼續航行</li></ul>
      <div class="rn-keys"><span><kbd>←</kbd><kbd>A</kbd> 左槳</span><span><kbd>→</kbd><kbd>D</kbd> 右槳</span><span>手機：點左右大按鈕</span></div>
      <p class="rn-best">最遠紀錄：<b>${r.best || 0} m</b>　累計航行：${Math.floor(r.total || 0)} m</p>
      <div class="rn-btns"><button class="btn-primary big" id="rnGo">開始航行</button><button class="btn-ghost" id="rnQuit">返回</button></div></div>`);
    $('rnGo').onclick = () => { $('rnPanel').classList.remove('show'); newGame(); G.started = true; G.last = performance.now() / 1000; toast('交替按左右槳，開始划船！'); };
    $('rnQuit').onclick = () => openModes();
  }
  function end() {
    G.over = true; const d = SAVE.data; d.runner = d.runner || { best: 0, total: 0 }; const R = d.runner, dist = Math.floor(G.dist), rec = dist > (R.best || 0);
    const today = new Date().toDateString(); if (!R.tok || R.tok.day !== today) R.tok = { day: today, n: 0 };
    const berry = G.coins * 10 + Math.floor(dist / 4), tok = Math.min(Math.floor(dist / 1500), 5 - R.tok.n);
    R.best = Math.max(R.best || 0, dist); R.total = (R.total || 0) + dist; track('runDist', dist); R.tok.n += Math.max(0, tok); SAVE.save();
    addBerry(berry); if (tok > 0) addTokens(tok, '奪寶大冒險'); if (window.checkTitles) checkTitles(false);
    SFX.play(rec ? 'rare' : 'miss');
    setTimeout(() => panel(`<div class="rn-card"><h2>${rec ? '新紀錄！' : '航行結束'}</h2>
      <div class="rn-res"><div><small>航行距離</small><b>${dist} m</b></div><div><small>金幣</small><b>${G.coins}</b></div><div><small>抵達海域</small><b>${zoneAt(dist).Z.name}</b></div></div>
      <p class="rn-reward">獲得 <b>${berry.toLocaleString()} 貝里</b>${tok > 0 ? `・<b>寶藏幣 ×${tok}</b>` : ''}${R.tok.n >= 5 ? '<br><small>今天的寶藏幣獎勵已經拿滿了</small>' : ''}</p>
      <div class="rn-btns"><button class="btn-primary big" id="rnGo">再航行一次</button><button class="btn-ghost" id="rnQuit">返回</button></div></div>`), 700);
    setTimeout(() => { $('rnGo').onclick = () => { $('rnPanel').classList.remove('show'); newGame(); G.started = true; G.last = performance.now() / 1000; }; $('rnQuit').onclick = () => openModes(); }, 720);
  }
  window.__rnDebug = () => G; window.__rnStep = (dt, n) => { for (let i = 0; i < (n || 1); i++) update(dt); }; /* 測試用 */
  window.__runnerState = () => G; /* 除錯用：讀取目前的遊戲狀態 */
  window.openRunner = function () {
    cv = $('rnCv'); cx = cv.getContext('2d'); showScreen('runnerScreen'); resize(); newGame(); startPanel();
    if (!raf) raf = requestAnimationFrame(loop);
    if (!keysBound) { keysBound = true;
      window.addEventListener('resize', () => { if (currentScreen === 'runnerScreen') resize(); });
      window.addEventListener('keydown', e => { if (currentScreen !== 'runnerScreen' || e.repeat) return; const k = e.key.toLowerCase(); if (k === 'arrowleft' || k === 'a') { e.preventDefault(); stroke('L'); } if (k === 'arrowright' || k === 'd') { e.preventDefault(); stroke('R'); } });
      const tap = (el, s) => el.addEventListener('pointerdown', e => { e.preventDefault(); stroke(s); });
      tap($('rnL'), 'L'); tap($('rnR'), 'R');
      /* iOS：快速連點會被 Safari 當成「雙擊放大」，這裡直接擋掉觸控的預設行為（不影響划槳判定） */
      [$('rnL'), $('rnR'), cv].forEach(el => { el.addEventListener('touchstart', e => e.preventDefault(), { passive: false }); el.addEventListener('touchend', e => e.preventDefault(), { passive: false }); });
      $('runnerScreen').addEventListener('touchmove', e => { if (e.touches.length > 1 || e.target === cv) e.preventDefault(); }, { passive: false });
      cv.addEventListener('pointerdown', e => { const r = cv.getBoundingClientRect(); stroke(e.clientX - r.left < r.width / 2 ? 'L' : 'R'); });
      $('rnBack').onclick = () => { if (G && G.started && !G.over) { confirmBox('結束航行？', '這次航行的距離與金幣會照常結算。', '結束', () => end()); } else openModes(); };
    }
  };
})();
