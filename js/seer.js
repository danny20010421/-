/* 參考賽爾號的介面設計：
   抵達標題、角色旁的情境互動泡泡、大立繪對話、電話蟲助手、底部功能列、
   戰鬥轉場、屬性相剋提示、「你的回合」、自動戰鬥與加速、勝利畫面 */
(function () {
  const getW = () => (typeof WORLD !== 'undefined' ? WORLD : null), getCH = () => (typeof CH !== 'undefined' ? CH : null);
  const EN = { east: 'EAST BLUE', alabasta: 'ALABASTA', skypiea: 'SKYPIEA', enies: 'ENIES LOBBY', dark: 'HACHINOSU', fishman: 'FISH-MAN ISLAND', wano: 'WANO COUNTRY', giant: 'ELBAPH' };

  /* ---------- 抵達標題 ---------- */
  function showArrival() {
    const el = $('arrival'); if (!el || !getCH()) return;
    el.innerHTML = `<b>${esc(CH.name.replace(/篇$/, ''))}</b><i></i><span>${EN[CH.id] || ''}・DESTINATION REACHED</span><small>${esc(CH.subtitle)}</small>`;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  }
  const _enter = window.enterChapter;
  window.enterChapter = function () { const r = _enter.apply(this, arguments); setTimeout(showArrival, 200); return r; };

  /* ---------- 情境互動泡泡（角色右側） ---------- */
  const ICO = { talk: '💬', fight: '⚔', boss: '☠', dig: '⛏' };
  let bubKey = '', bubOpts = [];
  function scanBubbles() {
    const W = getW();
    if (currentScreen !== 'worldScreen' || !W || !W.running || W.paused || dialogOpen) return setBubbles([]);
    const p = W.p, opts = [];
    W.npcs.forEach(n => { const d = Math.hypot(n.x - p.x, n.z - p.z); if (d < 4.2 + SCENES.lookScale(n.look) * 1.2) opts.push({ d, key: 'n' + n.id, icon: 'talk', label: n.name, sub: '對話', fn: () => onInteract(n) }); });
    W.enemies.forEach(e => { const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < 6.5) opts.push({ d, key: 'e' + e.id, icon: e.boss ? 'boss' : 'fight', label: CHARACTERS[e.id].name, sub: e.boss ? '挑戰 BOSS' : '挑戰', boss: e.boss, fn: () => onInteract(e) }); });
    (W.chests || []).forEach(c => { if (c.opened) return; const d = Math.hypot(c.x - p.x, c.z - p.z); if (d < 4) opts.push({ d, key: 'c' + c.idx, icon: 'dig', label: '寶箱', sub: '打開', fn: () => onInteract(c) }); });
    if (W.canDig) opts.push({ d: 0, key: 'dig', icon: 'dig', label: '挖掘', sub: '調查', fn: () => W.interact() });
    opts.sort((a, b) => a.d - b.d); setBubbles(opts.slice(0, 4));
  }
  function setBubbles(opts) {
    const key = opts.map(o => o.key).join('|'); bubOpts = opts; const el = $('actBubbles'); if (!el) return;
    if (key === bubKey) return; bubKey = key;
    el.innerHTML = opts.map((o, i) => `<button class="bub ${o.icon}" data-i="${i}" style="--d:${i * 50}ms"><i>${ICO[o.icon]}</i><span><small>${o.sub}</small>${esc(o.label)}</span>${i === 0 ? '<kbd>E</kbd>' : ''}</button>`).join('');
    el.querySelectorAll('.bub').forEach(b => b.onclick = (e) => { e.stopPropagation(); const o = bubOpts[+b.dataset.i]; if (o) { SFX.play('click'); o.fn(); } });
  }
  function placeBubbles() {
    const W = getW(), el = $('actBubbles');
    if (el && W && W.running && bubOpts.length) { const s = W.r.project(W.p.x, W.p.y + 3.2, W.p.z); if (s) { const maxX = innerWidth - el.offsetWidth - (innerWidth < 860 ? 84 : 16); el.style.transform = `translate(${Math.round(Math.max(8, Math.min(s.x + 46, maxX)))}px,${Math.round(s.y - 60)}px)`; } }
    requestAnimationFrame(placeBubbles);
  }
  setInterval(scanBubbles, 220); requestAnimationFrame(placeBubbles);

  /* ---------- NPC 半身立繪：用離屏渲染器把 3D 模型拍成大頭照 ---------- */
  const PORTRAIT = {}; let pr = null, pc = null;
  /* 進島後在空閒時預先拍好 NPC 大頭照，避免第一次對話時卡頓 */
  window.prewarmPortraits = function (looks) { const todo = [...new Set(looks)].filter(l => !PORTRAIT[l]); const step = () => { const l = todo.shift(); if (!l) return; try { npcPortrait(l); } catch (e) { } (window.requestIdleCallback || (f => setTimeout(f, 120)))(step, { timeout: 600 }); }; setTimeout(step, 800); };
  function npcPortrait(look) {
    if (PORTRAIT[look]) return PORTRAIT[look];
    try {
      if (!pr) { pc = document.createElement('canvas'); pc.width = 360; pc.height = 440; pr = new E3.Renderer(pc); }
      const gl = pr.gl; pc.width = 360; pc.height = 440; gl.viewport(0, 0, 360, 440); pr.aspect = 360 / 440; pr.dpr = 1;
      const base = (getW() && getW().r.env) || null; if (base) pr.env = Object.assign({}, base, { fog: [.06, .13, .2], fogR: [900, 1000] });
      const sc = SCENES.lookScale(look), mesh = SCENES.npcMesh(pr, look);
      const hy = 2.9 * sc; pr.setCamera([1.1 * sc, hy + .15 * sc, 3.6 * sc], [0, hy - .35 * sc, 0], .62);
      pr.begin(); pr.draw(mesh, M3.trs(0, 0, 0, .35, 1), { mat: 2 }); pr.free && pr.free(mesh);
      // 透明背景：把背景色去掉
      const px = new Uint8Array(360 * 440 * 4); gl.readPixels(0, 0, 360, 440, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const out = document.createElement('canvas'); out.width = 360; out.height = 440; const cx = out.getContext('2d'), img = cx.createImageData(360, 440);
      const bg = [px[0], px[1], px[2]];
      for (let y = 0; y < 440; y++) for (let x = 0; x < 360; x++) { const s = ((439 - y) * 360 + x) * 4, d = (y * 360 + x) * 4; const isBg = Math.abs(px[s] - bg[0]) + Math.abs(px[s + 1] - bg[1]) + Math.abs(px[s + 2] - bg[2]) < 10; img.data[d] = px[s]; img.data[d + 1] = px[s + 1]; img.data[d + 2] = px[s + 2]; img.data[d + 3] = isBg ? 0 : 255; }
      cx.putImageData(img, 0, 0); PORTRAIT[look] = out.toDataURL('image/png');
    } catch (e) { console.warn('portrait', e); PORTRAIT[look] = ''; }
    return PORTRAIT[look];
  }
  const M3 = E3.M;

  /* ---------- 電話蟲助手 ---------- */
  const DENDEN = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><ellipse cx="60" cy="100" rx="48" ry="10" fill="#000" opacity=".25"/><path d="M14 96 Q10 70 34 66 L96 70 Q112 74 106 96 Z" fill="#f2c58a" stroke="#5a3a1a" stroke-width="3"/><circle cx="70" cy="58" r="30" fill="#5fae5a" stroke="#2f5a2a" stroke-width="3"/><path d="M70 58 m-18 0 a18 18 0 1 1 18 18 a11 11 0 1 1 -11 -11" fill="none" stroke="#2f5a2a" stroke-width="4"/><rect x="58" y="40" width="24" height="10" rx="4" fill="#e8e8e8" stroke="#555" stroke-width="2"/><path d="M26 70 L22 44 M36 68 L38 42" stroke="#5a3a1a" stroke-width="4" stroke-linecap="round"/><circle cx="22" cy="42" r="6" fill="#fff" stroke="#5a3a1a" stroke-width="3"/><circle cx="38" cy="40" r="6" fill="#fff" stroke="#5a3a1a" stroke-width="3"/><circle cx="23" cy="43" r="2.5" fill="#222"/><circle cx="39" cy="41" r="2.5" fill="#222"/><path d="M20 84 Q30 90 40 84" stroke="#5a3a1a" stroke-width="3" fill="none"/></svg>')}`;
  function hintText() {
    const s = curStep(), st = chState(); if (!s) return st.cleared ? ['噗嚕嚕……這座島的事件已經解決了。可以回海圖前往下一座島，或留下來打小兵練等級喔。'] : ['噗嚕嚕……'];
    const tip = { talk: '找頭上有「!」的人說話。', talkAll: '把名單上的人都問過一遍。', goto: '跟著地圖上的★和光柱走就到了。', collect: `還差 ${s.count - (st.collected || []).length} 個，地上會發光的就是。`, timedCollect: '要在時間內撿完！撿第一個時開始計時。', defeat: `還要打倒 ${Math.max(0, s.count - (st.defeated || []).length)} 名敵人。`, keys: `打倒島上的敵人搶鑰匙，還差 ${Math.max(0, s.count - (st.keys || 0))} 把。`, gauntlet: '連戰中體力不會回復，先補好再開打。', choice: '仔細想想對方真正想聽的是什麼。', boss: 'BOSS 在島的最北邊。陣容排好、道具帶足再挑戰！' }[s.type] || '';
    const lv = crewLv(SAVE.data.lineup[0] || SAVE.data.player), elv = ENEMY_LEVEL[CH.id] || 1;
    const warn = lv < elv - 3 ? `對了，這座島的敵人大約 LV ${elv}，你的先鋒才 LV ${lv}，先去練一下等級比較安全。` : '';
    return [`噗嚕嚕……這裡是航海電話蟲。目前的任務是「${s.title}」：${s.desc}`, tip, warn].filter(Boolean);
  }
  const _face = window.faceFor; let lastWho = null;
  window.faceFor = function (who) {
    lastWho = who;
    if (who === 'denden') return { name: '電話蟲', html: `<img src="${DENDEN}" alt="">`, role: '航海助手' };
    return _face(who);
  };
  function bustFor(who) {
    if (who === 'denden') return { src: DENDEN, cls: 'dd' };
    if (who && who[0] === '@') { const c = CHARACTERS[who.slice(1)]; return c ? { src: c.image, cls: 'art' } : null; }
    if (who && getCH()) { const n = getCH().npcs.find(x => x.id === who); if (n) { const u = npcPortrait(n.look); return u ? { src: u, cls: 'npc' } : null; } }
    return null;
  }
  const _next = window.nextLine;
  window.nextLine = function () {
    const before = dlgQueue.length; _next.apply(this, arguments);
    if (dlgQueue.length < before || (before === 0 && dialogOpen)) {
      const b = bustFor(lastWho), el = $('dlgBust'), dlg = $('dialog');
      dlg.classList.toggle('narr', !lastWho); dlg.classList.toggle('has-bust', !!b);
      if (b) { if (el.dataset.src !== b.src) { el.dataset.src = b.src; el.innerHTML = `<img src="${b.src}" alt="">`; el.classList.remove('in'); void el.offsetWidth; } el.className = 'dlg-bust in ' + b.cls; }
      else { el.className = 'dlg-bust'; el.dataset.src = ''; }
    }
  };
  function callDenden() { if (dialogOpen || currentScreen !== 'worldScreen') return; SFX.play('blip'); say(hintText().map(t => ['denden', t])); }

  /* ---------- 戰鬥：轉場、相剋、你的回合、自動與加速、勝利 ---------- */
  window.BSPEED = +localStorage.getItem('op_bspeed') || 1;
  function typeLabel(m) { return m > 1 ? `<b class="up">克制 ×${m}</b>` : m < 1 ? `<b class="down">微弱 ×${m}</b>` : '<b>普通 ×1</b>'; }
  function renderTypeBar() {
    const el = $('bTypeBar'); if (!el || !battle) return;
    const a = typeMult(battle.player, battle.enemy), d = typeMult(battle.enemy, battle.player);
    const alive = battle.team.filter(f => f.hp > 0).length;
    el.innerHTML = `${typeLabel(a)}<i class="arr r">›››</i><span class="tb-mid">我方 ${alive}/${battle.team.length}</span><i class="arr l">‹‹‹</i>${typeLabel(d)}`;
    if (window.layoutBattleHud) requestAnimationFrame(layoutBattleHud);
  }
  const _hud = window.renderHUD; window.renderHUD = function () { const r = _hud.apply(this, arguments); renderTypeBar(); return r; };
  const _start = window.startBattle;
  window.startBattle = function (opts) {
    const r = _start.apply(this, arguments);
    const t = $('bTrans'), p = battle.player, e = battle.enemy;
    t.innerHTML = `<div class="bt-side l"><img src="${p.avatar}" alt=""><b>${esc(p.name)}</b></div><div class="bt-vs">VS</div><div class="bt-side r"><img src="${e.avatar}" alt=""><b>${esc(e.name)}</b></div>`;
    t.classList.remove('show'); void t.offsetWidth; t.classList.add('show'); SFX.play('whoosh');
    setTimeout(() => t.classList.remove('show'), 1050);
    syncBattleBtns(); renderTypeBar(); return r;
  };
  function autoPick() {
    const p = battle.player, hp = p.hp / p.maxHp;
    const us = p.skills.map((s, i) => ({ s, i })).filter(x => !x.s.locked && x.s.pp > 0 && !(x.s.effect && x.s.effect.reviveAlly && !battle.team.some(f => f !== p && f.hp <= 0)));
    if (!us.length) return -1;
    let best = us[0], bs = -1;
    us.forEach(x => { const s = x.s, ef = s.effect || {}; let sc = Math.random() * .4; if (s.ultimate) sc += 2; if (s.type === 'attack') sc += 1 + (s.power || 80) / 250; else sc += (ef.healRatio || ef.fullHeal || ef.healRange || ef.regenTurns) ? (hp < .5 ? 2.6 : .2) : .8; if (ef.reviveAlly) sc += 3; if (sc > bs) { bs = sc; best = x; } });
    return best.i;
  }
  const _begin = window.beginTurn;
  window.beginTurn = function () {
    const r = _begin.apply(this, arguments);
    if (!battle || battle.gameOver) return r;
    if (battle.mustSwitch) return r;
    const yt = $('bYourTurn'); yt.classList.remove('show'); void yt.offsetWidth; yt.classList.add('show');
    return r;
  };
  /* 自動戰鬥：獨立輪詢，涵蓋一般回合與倒下換人 */
  let autoPending = false;
  setInterval(() => {
    if (typeof battle === 'undefined' || !battle || !battle.auto || battle.gameOver || autoPending || currentScreen !== 'battleScreen') return;
    if (battle.mustSwitch) { const i = battle.team.findIndex(f => f.hp > 0); if (i >= 0) { autoPending = true; setTimeout(() => { autoPending = false; if (battle && battle.mustSwitch) requestSwitch(i); }, 450 / BSPEED); } return; }
    if (!battle.isBusy) { autoPending = true; setTimeout(() => { autoPending = false; if (battle && battle.auto && !battle.isBusy && !battle.gameOver && !battle.mustSwitch) selectSkill(autoPick(), true); }, 550 / BSPEED); }
  }, 200);
  function syncBattleBtns() {
    const a = $('bAutoBtn'), s = $('bSpdBtn'); if (!a) return;
    a.classList.toggle('on', !!(battle && battle.auto)); a.setAttribute('aria-pressed', String(!!(battle && battle.auto)));
    s.textContent = '×' + BSPEED; s.classList.toggle('on', BSPEED > 1);
  }
  const _finish = window.finishBattle;
  window.finishBattle = function (win, fled) {
    const b = battle, r = _finish.apply(this, arguments);
    if (win && !fled && b) {
      const v = $('bVictory'), team = b.team.slice(0, 6);
      v.innerHTML = `<div class="vt-strips">${team.map((f, i) => `<div class="vt-strip ${f.hp <= 0 ? 'down' : ''}" style="--i:${i}"><img src="${f.image}" alt=""><span>LV ${f.level}</span></div>`).join('')}</div><div class="vt-emblem"><b>勝利</b><small>VICTORY</small></div>`;
      v.classList.remove('show'); void v.offsetWidth; v.classList.add('show');
      const hide = () => v.classList.remove('show'); v.onclick = hide; setTimeout(hide, 2100);
    }
    return r;
  };

  /* ---------- 綁定 ---------- */
  window.addEventListener('DOMContentLoaded', () => {
    // 世界：電話蟲、底部功能列
    const dd = $('denden'); if (dd) { dd.innerHTML = `<img src="${DENDEN}" alt="">`; dd.onclick = callDenden; }
    const dock = $('wDock'); if (dock) dock.querySelectorAll('[data-dock]').forEach(b => b.onclick = () => { const k = b.dataset.dock; SFX.play('click');
      if (k === 'crew') openCrew(); else if (k === 'bag') openBag(); else if (k === 'hub') openHub('summon'); else if (k === 'navy') openHub('navy'); else if (k === 'chart') $('wBackBtn').click(); });
    window.addEventListener('keydown', e => { if (currentScreen === 'worldScreen' && e.key.toLowerCase() === 'h') callDenden(); });
    // 戰鬥：自動、加速
    const ab = $('bAutoBtn'); if (ab) ab.onclick = () => { if (!battle || battle.gameOver) return; battle.auto = !battle.auto; syncBattleBtns(); toast(battle.auto ? '自動戰鬥：開' : '自動戰鬥：關'); };
    const sb = $('bSpdBtn'); if (sb) sb.onclick = () => { window.BSPEED = BSPEED === 1 ? 2 : BSPEED === 2 ? 3 : 1; localStorage.setItem('op_bspeed', BSPEED); syncBattleBtns(); };
  });
})();
