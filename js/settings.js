/* 設定頁（大廳「設定」與首頁「設定」共用）＋ 新手教學（大廳聚光燈導覽）。
   設定存在 localStorage：op_gfx（畫質）、op_motion（減少動態）、op_bspeed（預設戰鬥速度）、op_vibe（震動回饋）、op_live_pop（即時對戰邀請通知）、op_text（文字大小）。 */
const GAME_VERSION = 'v94';
(function () {
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };
  /* ---------- 套用設定 ---------- */
  function apply() {
    const B = document.documentElement;
    B.classList.toggle('q-low', get('op_gfx') === 'low');
    B.classList.toggle('reduce-motion', get('op_motion') === '1');
    B.classList.toggle('text-l', get('op_text') === 'l');
  }
  /* 震動回饋：自己的角色受到傷害、戰鬥勝敗時輕微震動（iPhone 的瀏覽器不支援震動） */
  const vibe = ms => { if (get('op_vibe') === '1' && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { } };
  window.gameVibe = vibe;
  window.addEventListener('DOMContentLoaded', () => {
    apply();
    if (typeof openModes === 'function') { const _om = openModes; window.openModes = function () { const r = _om.apply(this, arguments); setTimeout(() => GUIDE.maybe(), 800); return r; }; }
    if (typeof showDamage === 'function') { const _sd = showDamage; window.showDamage = function (side, n) { if (side === 'L' && typeof currentScreen !== 'undefined' && currentScreen === 'battleScreen') vibe(n > 500 ? 40 : 18); return _sd.apply(this, arguments); }; }
  });

  /* ---------- 設定頁 ---------- */
  let panel = null;
  function row(title, sub, ctl) { return `<div class="set-row"><span><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span>${ctl}</div>`; }
  const seg = (k, opts, cur) => `<div class="seg" role="radiogroup" data-seg="${k}">${opts.map(([v, n]) => `<button data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}" role="radio" aria-checked="${String(cur) === String(v)}">${n}</button>`).join('')}</div>`;
  const sw = (k, on) => `<input type="checkbox" class="sw" data-sw="${k}" ${on ? 'checked' : ''}>`;
  function render() {
    const P = AUDIO.pref, U = typeof CLOUD !== 'undefined' && CLOUD.user ? CLOUD.user() : null, prof = typeof playerProfile === 'function' ? playerProfile() : {};
    panel.innerHTML = `<div class="dl-card st-card"><header><h3>⚙️ 設定</h3><button class="icon-btn sm" data-x aria-label="關閉">×</button></header><div class="st-body">
      <h4>聲音</h4>${row('音樂與音效', '關閉後完全靜音', sw('sound', !P.muted))}${row('音樂音量', '', `<input type="range" min="0" max="1" step="0.05" value="${P.music}" data-vol="music" aria-label="音樂音量">`)}${row('音效音量', '', `<input type="range" min="0" max="1" step="0.05" value="${P.sfx}" data-vol="sfx" aria-label="音效音量">`)}
      <h4>畫面</h4>${row('畫質', '省電：降低 3D 解析度、關閉毛玻璃與大型光暈，手機發燙或卡頓時使用', seg('op_gfx', [['high', '高畫質'], ['low', '省電']], get('op_gfx') === 'low' ? 'low' : 'high'))}
        ${row('新版 3D 島嶼畫面', 'Three.js 卡通渲染：描邊、陰影、草地、海面、泛光（關閉後改回舊畫面，重新整理頁面後生效）', sw('op_r3', get('op_r3') !== '0'))}
        ${row('減少動態效果', '關閉大部分動畫與震動畫面，容易頭暈時使用', sw('op_motion', get('op_motion') === '1'))}
        ${row('文字大小', '放大說明、戰報與面板文字', seg('op_text', [['n', '標準'], ['l', '加大']], get('op_text') === 'l' ? 'l' : 'n'))}
      <h4>戰鬥</h4>${row('預設戰鬥速度', '戰鬥中也可以隨時切換', seg('op_bspeed', [[1, '×1'], [2, '×2'], [3, '×3']], +(get('op_bspeed') || 1)))}
        ${row('震動回饋', '受到傷害時震動（Android 支援；iPhone 瀏覽器不支援）', sw('op_vibe', get('op_vibe') === '1'))}
      <h4>好友與通知</h4>${row('即時對戰邀請通知', '好友邀請你對戰時，在任何畫面跳出提示', sw('op_live_pop', get('op_live_pop') !== '0'))}
        ${row('好友與對戰', U ? `已登入：${U.email || ''}` : '登入後可以加好友、留言、對戰', `<button class="btn-gold sm" data-go="social">開啟</button>`)}
        ${row('雲端存檔', '在手機、平板、電腦之間接續進度', `<button class="btn-ghost sm" data-go="cloud">開啟</button>`)}
      <h4>開發中</h4>${row('3D 場景樣板（東海・風車村）', 'Three.js 版新登島場景試作：卡通光影、即時陰影、細節民宅、起伏地形、海面、正午／黃昏／夜晚', `<a class="btn-gold sm" href="sample_east.html">開啟</a>`)}
      <h4>說明</h4>${row('新手教學', '重新觀看大廳導覽', `<button class="btn-ghost sm" data-go="guide">觀看</button>`)}
        ${row('取得最新版本', '更新後畫面怪怪的，或想確認是最新版時使用（存檔不受影響）', `<button class="btn-ghost sm" data-go="refresh">重新整理</button>`)}
        ${row('玩家 ID', prof.id || '—', `<button class="btn-ghost sm" data-go="copy">複製</button>`)}
        <p class="st-ver">偉大航路 ${GAME_VERSION}・資料版本 ${typeof DATA_VERSION !== 'undefined' ? DATA_VERSION : ''}</p></div></div>`;
    const q = s => panel.querySelectorAll(s);
    panel.querySelector('[data-x]').onclick = close;
    q('[data-sw=sound]').forEach(i => i.onchange = () => { AUDIO.setPref({ muted: !i.checked }); if (typeof syncSound === 'function') syncSound(); });
    q('[data-vol]').forEach(r => r.oninput = () => AUDIO.setPref({ [r.dataset.vol]: +r.value }));
    q('[data-sw]:not([data-sw=sound])').forEach(i => i.onchange = () => { put(i.dataset.sw, i.checked ? '1' : '0'); apply(); if (i.dataset.sw === 'op_vibe' && i.checked) vibe(30); });
    q('[data-seg]').forEach(g => g.querySelectorAll('button').forEach(b => b.onclick = () => {
      const k = g.dataset.seg, v = b.dataset.v; put(k, v); g.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
      if (k === 'op_bspeed') { window.BSPEED = +v; if (typeof syncBattleBtns === 'function') syncBattleBtns(); }
      if (k === 'op_gfx' && window.WORLD && WORLD.r) { WORLD.r.maxDpr = v === 'low' ? .75 : Math.min(devicePixelRatio || 1, 1.6); WORLD.r.dpr = Math.min(WORLD.r.dpr, WORLD.r.maxDpr); }
      apply();
    }));
    q('[data-go]').forEach(b => b.onclick = () => { const g = b.dataset.go;
      if (g === 'social') { close(); openSocial(); } else if (g === 'cloud') { close(); openCloud(); } else if (g === 'guide') { close(); if (typeof openModes === 'function' && currentScreen !== 'modeScreen') openModes(); setTimeout(() => GUIDE.start(true), 400); }
      else if (g === 'refresh') refresh(); else if (g === 'copy') { try { navigator.clipboard.writeText(prof.id); toast('已複製玩家 ID'); } catch (e) { toast(prof.id); } } });
  }
  async function refresh() { try { if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } if (navigator.serviceWorker) { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.update().catch(() => { }))); } } catch (e) { } toast('正在取得最新版本…', 'gold'); setTimeout(() => location.reload(), 500); }
  function open() { if (!panel) { panel = document.createElement('div'); panel.className = 'dl-wrap st-wrap'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '設定'); panel.onclick = e => { if (e.target === panel) close(); }; } document.body.appendChild(panel); render(); }
  function close() { if (panel) panel.remove(); }
  window.openSettings = open;
})();

/* ---------- 新手教學：大廳聚光燈導覽 ---------- */
const GUIDE = (function () {
  const STEPS = [
    { t: '歡迎來到偉大航路！', d: '這裡是大廳，所有冒險都從這裡出發。跟著導覽花一分鐘認識主要功能吧！' },
    { s: '#lbGo', t: '出航', d: '主線劇情：在海圖上選擇篇章，登島探索、完成任務、打倒 BOSS。通關後還能挑戰「困難模式」拿星星。' },
    { s: '#lbTeam', t: '出戰陣容', d: '戰鬥時最多 3 位船員依序上場。點這裡可以更換、調整順序，等級越高越強。' },
    { s: '#lbModesBtn', t: '冒險', d: '奪寶大冒險、勇者之塔（250 層）、懸賞金交易所、皇帝領海、虛空王座，都在這裡。' },
    { s: '#l2Emperor', t: '皇帝領海', d: '挑戰四皇：打贏隊長、分身與真身，四皇就會加入你的船隊。' },
    { s: '[data-lb=gacha]', t: '召喚', d: '用寶藏幣召喚新船員。左下角的限定召喚會定期輪替，集滿碎片也能換角色。' },
    { s: '#lbBounty', t: '每日懸賞與活動', d: '左側是公告、每日懸賞、活動中心、七日登入、成就與寶藏日誌，有紅點就代表有獎勵可領。' },
    { s: '[data-lb=guild]', t: '船團', d: '和好友組成船團，每週一起挑戰船團 BOSS，還有船團留言板。' },
    { s: '[data-lb=friends]', t: '好友', d: '登入帳號後可以加好友、留言、送禮、即時對戰與觀戰，還有全球排行榜。' },
    { s: '[data-lb=settings]', t: '設定', d: '音量、畫質、戰鬥速度、雲端存檔都在這裡；想再看一次導覽也可以從這裡開啟。祝你航海愉快！' }
  ];
  let i = 0, el = null;
  const done = () => { SAVE.data.guide = SAVE.data.guide || {}; return !!SAVE.data.guide.lobby; };
  function visible(sel) { const e = sel && document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 ? e : null; }
  function show() {
    while (i < STEPS.length && STEPS[i].s && !visible(STEPS[i].s)) i++;
    if (i >= STEPS.length) return finish();
    const S = STEPS[i], tgt = S.s ? visible(S.s) : null;
    /* 只捲動真的可以捲的容器（手機版大廳）；不要捲動整個頁面，否則桌機版畫面會被推開卡住 */
    if (tgt) { let sc = tgt.parentElement; while (sc && sc !== document.body) { const cs = getComputedStyle(sc); if (/(auto|scroll)/.test(cs.overflowY) && sc.scrollHeight > sc.clientHeight + 4) break; sc = sc.parentElement; }
      if (sc && sc !== document.body) { const r1 = tgt.getBoundingClientRect(), r0 = sc.getBoundingClientRect(); sc.scrollTop += (r1.top - r0.top) - (sc.clientHeight - r1.height) / 2; } }
    requestAnimationFrame(() => {
      if (!el) return; /* 導覽已結束（快速連點時） */
      const r = tgt ? tgt.getBoundingClientRect() : null, pad = 6, vw = innerWidth, vh = innerHeight;
      const hole = el.querySelector('.gd-hole'), card = el.querySelector('.gd-card');
      if (r) Object.assign(hole.style, { display: 'block', left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' }); else hole.style.display = 'none';
      card.innerHTML = `<small>${i + 1} / ${STEPS.length}</small><h3>${S.t}</h3><p>${S.d}</p><div class="gd-btns"><button class="btn-ghost sm" data-g="skip">略過導覽</button>${i ? '<button class="btn-ghost sm" data-g="prev">上一步</button>' : ''}<button class="btn-gold sm" data-g="next">${i === STEPS.length - 1 ? '開始冒險' : '下一步'}</button></div>`;
      el.classList.toggle('no-hole', !r);
      const ch = card.getBoundingClientRect().height || 180, below = r && r.bottom + ch + 24 < vh, top = !r ? (vh - ch) / 2 : below ? r.bottom + 14 : Math.max(10, r.top - ch - 14);
      Object.assign(card.style, { top: top + 'px', left: Math.max(10, Math.min(vw - Math.min(360, vw - 20) - 10, r ? r.left + r.width / 2 - 180 : (vw - 360) / 2)) + 'px' });
      card.querySelector('[data-g=next]').onclick = () => { i++; show(); };
      const pv = card.querySelector('[data-g=prev]'); if (pv) pv.onclick = () => { i = Math.max(0, i - 1); while (i > 0 && STEPS[i].s && !visible(STEPS[i].s)) i--; show(); };
      card.querySelector('[data-g=skip]').onclick = finish;
    });
  }
  function finish() { if (el) el.remove(); el = null; try { document.scrollingElement.scrollTop = 0; document.scrollingElement.scrollLeft = 0; document.querySelectorAll('.screen').forEach(x => { x.scrollTop = 0; x.scrollLeft = 0; }); } catch (e) { } SAVE.data.guide = SAVE.data.guide || {}; if (!SAVE.data.guide.lobby) { SAVE.data.guide.lobby = Date.now(); SAVE.save(); } }
  function start(force) {
    if (!force && done()) return; if (el) return; i = 0;
    el = document.createElement('div'); el.className = 'gd-wrap'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '新手教學');
    el.innerHTML = '<div class="gd-hole"></div><div class="gd-card"></div>'; document.body.appendChild(el); show();
    window.addEventListener('resize', () => el && show(), { once: true });
  }
  /* 第一次進入大廳：等登入獎勵等彈窗關閉後再開始 */
  function maybe() { if (done() || el) return; let n = 0; const t = setInterval(() => { n++; if (typeof currentScreen !== 'undefined' && currentScreen !== 'modeScreen') { clearInterval(t); return; } const busy = document.querySelector('.modal.show, .dl-wrap, .lv-screen'); if (!busy) { clearInterval(t); start(false); } else if (n > 120) clearInterval(t); }, 1000); }
  return { start, maybe, done };
})();
