/* 奪寶大冒險：左右槳交替划船的跑酷小遊戲 */
(function () {
  const ZONES = [
    { at: 0, name: '東海', water: '#2f8fcf', water2: '#1f6fa8', bank: '#e6cf94', bank2: '#c9ad6a', sky: '#9fd6f5', deco: 'palm' },
    { at: 800, name: '偉大航路', water: '#1f8a9a', water2: '#12606e', bank: '#8a7a5a', bank2: '#6a5a40', sky: '#7fc4c9', deco: 'rock' },
    { at: 2000, name: '新世界', water: '#2a3f7a', water2: '#1a2754', bank: '#4a3a5a', bank2: '#2e2440', sky: '#5a3a7a', deco: 'crystal' },
    { at: 4000, name: '暴風海域', water: '#223048', water2: '#121a2a', bank: '#3a3a40', bank2: '#22222a', sky: '#2a2f40', deco: 'rock', storm: true }
  ];
  const LANES = [-0.72, 0, 0.72];
  let cv, cx, W, H, dpr, G = null, raf = 0, keysBound = false;

  const lerp = (a, b, t) => a + (b - a) * t;
  function hexMix(a, b, t) { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`; }
  function zoneAt(d) { let i = 0; for (let k = 0; k < ZONES.length; k++) if (d >= ZONES[k].at) i = k; const Z = ZONES[i], N = ZONES[i + 1]; const t = N ? Math.max(0, Math.min(1, (d - (N.at - 120)) / 120)) : 0; return { i, Z, N, t }; }
  function col(key, d) { const z = zoneAt(d); return z.N && z.t > 0 ? hexMix(z.Z[key], z.N[key], z.t) : z.Z[key]; }

  function resize() { const r = cv.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  const riverL = () => W < 600 ? W * .05 : W * .16, riverR = () => W < 600 ? W * .95 : W * .84;
  const laneX = x => { const L = riverL(), R = riverR(); return (L + R) / 2 + x * (R - L) * .42; };
  const PPM = () => H / 55;                 // 每公尺像素
  const boatY = () => H * .76;

  function newGame() {
    G = { dist: 0, v: 0, x: 0, tx: 0, hearts: 3, coins: 0, inv: 0, combo: 0, last: 0, lastSide: null, objs: [], nextObs: 25, nextCoin: 12, nextDeco: 0, decos: [], t: 0, oarL: 0, oarR: 0, over: false, started: false, flash: 0, rain: [] };
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
      if (z >= 1 && r < .15) o = { k: 'ship', lane: Math.random() < .5 ? -.36 : .36, w: .95 };
      else if (z >= 2 && r < .3) o = { k: 'king', lane: LANES[(Math.random() * 3) | 0], w: .5 };
      else if (r < .45) o = { k: 'whirl', lane: LANES[(Math.random() * 3) | 0], w: .42, soft: true };
      else if (r < .7) o = { k: 'barrel', lane: LANES[(Math.random() * 3) | 0], w: .3 };
      else o = { k: 'rock', lane: LANES[(Math.random() * 3) | 0], w: .4 };
      o.at = G.nextObs; G.objs.push(o);
      if (d > 600 && Math.random() < .25 + lv * .35) { const o2 = { k: 'rock', lane: LANES.filter(x => Math.abs(x - o.lane) > .5)[(Math.random() * 2) | 0] ?? 0, w: .38, at: G.nextObs + 1.5 }; G.objs.push(o2); }
      G.nextObs += Math.max(8, 26 - d / 180) * (.8 + Math.random() * .5);
    }
    while (G.nextCoin < d + 60) { const lane = LANES[(Math.random() * 3) | 0], n = 5 + ((Math.random() * 4) | 0); for (let i = 0; i < n; i++) G.objs.push({ k: 'coin', lane, w: .22, at: G.nextCoin + i * 2.2 }); G.nextCoin += n * 2.2 + 10 + Math.random() * 14; }
    while (G.nextDeco < d + 70) { G.decos.push({ at: G.nextDeco, side: Math.random() < .5 ? -1 : 1, s: .7 + Math.random() * .6, off: Math.random() }); G.nextDeco += 4 + Math.random() * 6; }
    G.objs = G.objs.filter(o => o.at > d - 12 && !o.gone); G.decos = G.decos.filter(o => o.at > d - 14);
  }

  function update(dt) {
    G.t += dt; if (!G.started || G.over) return;
    const cap = 24 + Math.min(12, G.dist / 450);
    G.v = Math.max(0, Math.min(cap, G.v * (1 - .5 * dt) - .6 * dt));
    G.dist += G.v * dt; G.x = lerp(G.x, G.tx, Math.min(1, dt * 5)); G.tx *= (1 - .15 * dt);
    G.oarL = Math.max(0, G.oarL - dt * 3); G.oarR = Math.max(0, G.oarR - dt * 3); G.inv = Math.max(0, G.inv - dt); G.flash = Math.max(0, G.flash - dt * 2);
    spawn();
    for (const o of G.objs) { if (o.gone) continue; const dz = o.at - G.dist; if (dz < 1.2 && dz > -1.2 && Math.abs(o.lane - G.x) < (o.w + .34) / 2) {
      if (o.k === 'coin') { o.gone = true; G.coins++; SFX.play('coin'); }
      else if (o.soft) { if (!o.hitOnce) { o.hitOnce = true; G.v *= .45; SFX.play('water'); toast('被漩渦捲住了，速度下降！'); } }
      else if (G.inv <= 0) { G.hearts--; G.inv = 1.4; G.v *= .35; G.flash = 1; SFX.play('hit'); if (navigator.vibrate) navigator.vibrate(80); if (G.hearts <= 0) end(); } } }
    $('rnDist').textContent = Math.floor(G.dist) + ' m'; $('rnCoins').textContent = G.coins;
    $('rnBar').style.width = Math.min(100, G.v / cap * 100) + '%';
    $('rnHearts').innerHTML = [0, 1, 2].map(i => `<i class="${i < G.hearts ? 'on' : ''}">♥</i>`).join('');
  }

  /* ---------- 繪製 ---------- */
  function draw() {
    const d = G.dist, L = riverL(), R = riverR(), ppm = PPM(), by = boatY();
    const persp = y => .55 + .45 * Math.max(0, Math.min(1.1, y / H));
    // 天空與兩岸
    cx.fillStyle = col('sky', d); cx.fillRect(0, 0, W, H);
    cx.fillStyle = col('bank', d); cx.fillRect(0, 0, L + 6, H); cx.fillRect(R - 6, 0, W - R + 6, H);
    cx.fillStyle = col('bank2', d); for (let y = -((d * ppm) % 40); y < H; y += 40) { cx.fillRect(0, y, L * .3, 18); cx.fillRect(R + (W - R) * .7, y + 20, (W - R) * .3, 18); }
    // 水面
    const wg = cx.createLinearGradient(0, 0, 0, H); wg.addColorStop(0, col('water2', d)); wg.addColorStop(1, col('water', d)); cx.fillStyle = wg; cx.fillRect(L, 0, R - L, H);
    cx.strokeStyle = 'rgba(255,255,255,.18)'; cx.lineWidth = 2;
    for (let y = -((d * ppm * 1.0) % 34); y < H; y += 34) { cx.beginPath(); for (let x = L; x <= R; x += 12) { const yy = y + Math.sin(x * .05 + G.t * 2 + y * .02) * 3; x === L ? cx.moveTo(x, yy) : cx.lineTo(x, yy); } cx.stroke(); }
    cx.fillStyle = 'rgba(255,255,255,.35)'; cx.fillRect(L, 0, 5, H); cx.fillRect(R - 5, 0, 5, H);
    // 岸邊裝飾
    const z = zoneAt(d).Z;
    for (const o of G.decos) { const y = by - (o.at - d) * ppm; if (y < -60 || y > H + 60) continue; const s = persp(y) * o.s, x = o.side < 0 ? L * (.35 + o.off * .4) : R + (W - R) * (.25 + o.off * .4); decor(z.deco, x, y, s); }
    // 物件（由遠到近）
    const list = G.objs.filter(o => !o.gone).map(o => ({ o, y: by - (o.at - d) * ppm })).filter(q => q.y > -80 && q.y < H + 80).sort((a, b) => a.y - b.y);
    for (const { o, y } of list) { const s = persp(y), x = laneX(o.lane), w = (R - L) * .42 * o.w * s; obj(o, x, y, w, s); }
    // 船
    boat(laneX(G.x), by, (R - L) * .16, (G.tx - G.x) * .5);
    // 暴風雨與受傷閃光
    if (z.storm || zoneAt(d).i >= 3) { cx.strokeStyle = 'rgba(200,220,255,.35)'; cx.lineWidth = 1.2; cx.beginPath(); for (const r of G.rain) { const x = (r[0] * W + G.t * 60) % W, y = (r[1] * H + G.t * 700) % H; cx.moveTo(x, y); cx.lineTo(x - 5, y + 14); } cx.stroke(); if (Math.random() < .004) G.flash = .6; }
    if (G.flash > 0) { cx.fillStyle = `rgba(255,255,255,${G.flash * .35})`; cx.fillRect(0, 0, W, H); }
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
    if (o.k === 'coin') { const r = w * .5, sq = Math.abs(Math.cos(G.t * 5 + o.at)); cx.fillStyle = '#ffd26c'; cx.strokeStyle = '#8a5a0a'; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(0, 0, r * Math.max(.25, sq), r, 0, 0, 6.29); cx.fill(); cx.stroke(); }
    else if (o.k === 'rock') { cx.fillStyle = 'rgba(0,0,0,.2)'; cx.beginPath(); cx.ellipse(0, w * .15, w * .55, w * .2, 0, 0, 6.29); cx.fill(); cx.fillStyle = '#6b6457'; cx.beginPath(); cx.moveTo(-w * .5, 0); cx.lineTo(-w * .3, -w * .5); cx.lineTo(w * .1, -w * .65); cx.lineTo(w * .5, -w * .2); cx.lineTo(w * .45, 0); cx.fill(); cx.fillStyle = '#8a8272'; cx.beginPath(); cx.moveTo(-w * .3, -w * .5); cx.lineTo(w * .1, -w * .65); cx.lineTo(0, -w * .3); cx.fill(); cx.strokeStyle = 'rgba(255,255,255,.6)'; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(0, 0, w * .6, w * .15, 0, 0, 6.29); cx.stroke(); }
    else if (o.k === 'barrel') { cx.fillStyle = '#8a5a2e'; cx.fillRect(-w * .35, -w * .5, w * .7, w * .6); cx.fillStyle = '#3a3a3a'; cx.fillRect(-w * .37, -w * .38, w * .74, w * .08); cx.fillRect(-w * .37, -w * .12, w * .74, w * .08); cx.fillStyle = '#c8322b'; cx.font = `${w * .3}px sans-serif`; cx.textAlign = 'center'; cx.fillText('☠', 0, -w * .18); }
    else if (o.k === 'whirl') { cx.rotate(G.t * 3); cx.strokeStyle = 'rgba(220,245,255,.8)'; cx.lineWidth = 3; for (let i = 0; i < 3; i++) { cx.beginPath(); cx.arc(0, 0, w * (.2 + i * .15), i, i + 4); cx.stroke(); } }
    else if (o.k === 'ship') { cx.fillStyle = '#f4f2ea'; cx.fillRect(-w * .45, -w * .55, w * .9, w * .4); cx.fillStyle = '#3f6fa3'; cx.fillRect(-w * .5, -w * .18, w, w * .22); cx.fillStyle = '#1f4f7a'; cx.fillRect(-w * .5, 0, w, w * .06); cx.fillStyle = '#fff'; cx.fillRect(-w * .05, -w * .95, w * .1, w * .45); cx.fillStyle = '#3f6fa3'; cx.font = `bold ${w * .16}px sans-serif`; cx.textAlign = 'center'; cx.fillText('MARINE', 0, -w * .3); }
    else if (o.k === 'king') { const sw = Math.sin(G.t * 3 + o.at) * w * .1; cx.fillStyle = '#3f8a6a'; cx.beginPath(); cx.ellipse(sw, -w * .3, w * .28, w * .45, 0, 0, 6.29); cx.fill(); cx.fillStyle = '#9fd6a0'; cx.beginPath(); cx.ellipse(sw, -w * .25, w * .14, w * .32, 0, 0, 6.29); cx.fill(); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(sw - w * .1, -w * .6, w * .06, 0, 6.29); cx.arc(sw + w * .1, -w * .6, w * .06, 0, 6.29); cx.fill(); cx.fillStyle = '#c8322b'; cx.beginPath(); cx.arc(sw - w * .1, -w * .6, w * .03, 0, 6.29); cx.arc(sw + w * .1, -w * .6, w * .03, 0, 6.29); cx.fill(); cx.strokeStyle = 'rgba(255,255,255,.6)'; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(0, 0, w * .5, w * .12, 0, 0, 6.29); cx.stroke(); }
    cx.restore();
  }
  function boat(x, y, w, tilt) {
    cx.save(); cx.translate(x, y); cx.rotate(tilt * .5);
    if (G.inv > 0 && Math.floor(G.t * 12) % 2) cx.globalAlpha = .5;
    cx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 1; i < 5; i++) { cx.beginPath(); cx.ellipse(0, w * (.5 + i * .35), w * (.3 + i * .08), w * .07, 0, 0, 6.29); cx.fill(); }
    const oar = (side, k) => { cx.save(); cx.translate(side * w * .45, w * .05); cx.rotate(side * (.5 - k * 1.1)); cx.fillStyle = '#6b4a2f'; cx.fillRect(-2, 0, 4, w * .75); cx.fillStyle = '#8a5a2e'; cx.fillRect(-6, w * .62, 12, w * .22); cx.restore(); };
    oar(-1, G.oarL); oar(1, G.oarR);
    cx.fillStyle = '#8a5a2e'; cx.strokeStyle = '#3a220a'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(0, -w * .75); cx.quadraticCurveTo(w * .45, -w * .2, w * .38, w * .5); cx.lineTo(-w * .38, w * .5); cx.quadraticCurveTo(-w * .45, -w * .2, 0, -w * .75); cx.fill(); cx.stroke();
    cx.fillStyle = '#c9a06a'; cx.beginPath(); cx.ellipse(0, w * .05, w * .26, w * .45, 0, 0, 6.29); cx.fill();
    cx.fillStyle = '#f4f2ea'; cx.fillRect(-w * .32, -w * .45, w * .64, w * .42); cx.strokeStyle = '#3a220a'; cx.strokeRect(-w * .32, -w * .45, w * .64, w * .42);
    cx.fillStyle = '#1b1b1b'; cx.beginPath(); cx.arc(0, -w * .26, w * .1, 0, 6.29); cx.fill(); cx.fillStyle = '#e8c170'; cx.beginPath(); cx.ellipse(0, -w * .34, w * .16, w * .04, 0, 0, 6.29); cx.fill(); cx.fillStyle = '#c8322b'; cx.fillRect(-w * .1, -w * .37, w * .2, w * .025);
    cx.restore();
  }

  function loop(ts) { if (currentScreen !== 'runnerScreen') { raf = 0; return; } const now = ts / 1000; const dt = Math.min(.05, now - (G.lastTs || now)); G.lastTs = now; update(dt); draw(); raf = requestAnimationFrame(loop); }

  function panel(html) { const p = $('rnPanel'); p.innerHTML = html; p.classList.add('show'); }
  function startPanel() {
    const r = SAVE.data.runner || {};
    panel(`<div class="rn-card"><h2>奪寶大冒險</h2>
      <p class="rn-lead">左右槳<b>交替</b>划船就會加速，節奏越穩連擊越高。<br>划左槳船會往左、划右槳往右，閃開礁石與軍艦，沿途搶金幣！</p>
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
    R.best = Math.max(R.best || 0, dist); R.total = (R.total || 0) + dist; R.tok.n += Math.max(0, tok); SAVE.save();
    addBerry(berry); if (tok > 0) addTokens(tok, '奪寶大冒險'); if (window.checkTitles) checkTitles(false);
    SFX.play(rec ? 'rare' : 'miss');
    setTimeout(() => panel(`<div class="rn-card"><h2>${rec ? '新紀錄！' : '航行結束'}</h2>
      <div class="rn-res"><div><small>航行距離</small><b>${dist} m</b></div><div><small>金幣</small><b>${G.coins}</b></div><div><small>抵達海域</small><b>${zoneAt(dist).Z.name}</b></div></div>
      <p class="rn-reward">獲得 <b>${berry.toLocaleString()} 貝里</b>${tok > 0 ? `・<b>寶藏幣 ×${tok}</b>` : ''}${R.tok.n >= 5 ? '<br><small>今天的寶藏幣獎勵已經拿滿了</small>' : ''}</p>
      <div class="rn-btns"><button class="btn-primary big" id="rnGo">再航行一次</button><button class="btn-ghost" id="rnQuit">返回</button></div></div>`), 700);
    setTimeout(() => { $('rnGo').onclick = () => { $('rnPanel').classList.remove('show'); newGame(); G.started = true; G.last = performance.now() / 1000; }; $('rnQuit').onclick = () => openModes(); }, 720);
  }
  window.openRunner = function () {
    cv = $('rnCv'); cx = cv.getContext('2d'); showScreen('runnerScreen'); resize(); newGame(); startPanel();
    if (!raf) raf = requestAnimationFrame(loop);
    if (!keysBound) { keysBound = true;
      window.addEventListener('resize', () => { if (currentScreen === 'runnerScreen') resize(); });
      window.addEventListener('keydown', e => { if (currentScreen !== 'runnerScreen' || e.repeat) return; const k = e.key.toLowerCase(); if (k === 'arrowleft' || k === 'a') { e.preventDefault(); stroke('L'); } if (k === 'arrowright' || k === 'd') { e.preventDefault(); stroke('R'); } });
      const tap = (el, s) => el.addEventListener('pointerdown', e => { e.preventDefault(); stroke(s); });
      tap($('rnL'), 'L'); tap($('rnR'), 'R');
      cv.addEventListener('pointerdown', e => { const r = cv.getBoundingClientRect(); stroke(e.clientX - r.left < r.width / 2 ? 'L' : 'R'); });
      $('rnBack').onclick = () => { if (G && G.started && !G.over) { confirmBox('結束航行？', '這次航行的距離與金幣會照常結算。', '結束', () => end()); } else openModes(); };
    }
  };
})();
