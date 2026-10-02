/* 懸賞金交易所（畫面與交易）。行情計算在 js/exchange_head.js：全服同步、可重現。玩家自己的資料（持股、成交、已實現損益、每日投入額度）存在 SAVE.data.mkt。 */
(function () {
  const G = window.__MKT_ENGINE, { STOCKS, BASIC, CATS, etfParts, snapshot, tradeDay, sessionStart, nowTick, twClock, isOpen, fmt, r2, TICKS_DAY, BAR, TICK, FEE, TAX } = G;
  const M = () => SAVE.data.mkt, X = () => G.view();
  let sel = 'straw', view = 'line', tab = 'market', cat = 'all', timer = null, banner = null, qty = 1, seenNews = null;
  function init() {
    if (SAVE.data.mkt && SAVE.data.mkt.v === 4) return;
    /* 舊版市場（v3 以前，每台裝置各自計算）：持股依當時價格換回寶藏幣，改用全服同步的新市場 */
    const o = SAVE.data.mkt; let back = 0;
    if (o && o.hold) Object.entries(o.hold).forEach(([id, h]) => { const S = o.s && o.s[id]; if (S && h.q) back += Math.floor(S.px * h.q); });
    if (back > 0) { SAVE.data.tokens += back; setTimeout(() => toast(`交易所改為全服同步行情：舊持股已依市價換回 ${back} 枚寶藏幣`, 'gold'), 600); }
    SAVE.data.mkt = { v: 4, hold: {}, trades: [], realized: (o && o.realized) || 0, used: null }; SAVE.save();
  }
  /* 推進行情＝重新計算目前時刻的全服行情；有新新聞就跳出橫幅 */
  function advance(live) {
    const v = snapshot(); const top = v.news[0];
    if (live && top && seenNews && top.key !== seenNews && v.news.findIndex(n => n.key === seenNews) > 0) showBanner(top);
    if (top) seenNews = top.key;
  }

  /* ---------- 交易 ---------- */
  const price = id => X().s[id].px;
  /* 每日投入上限：200 ＋ 航海等級 × 10 枚寶藏幣（以交易日計，賣出不會增加額度） */
  const dailyCap = () => 200 + (typeof acctLevelInfo === 'function' ? acctLevelInfo().lv : 1) * 10;
  const usedToday = () => (M().used && M().used.day === X().day) ? M().used.n : 0;
  function log(kind, id, q, amt) { const m = M(); m.trades.unshift({ k: kind, id, q, amt, px: price(id), at: Date.now() }); if (m.trades.length > 40) m.trades.length = 40; }
  function buy(id, q) {
    if (window.timeLocked && timeLocked()) { toast('裝置時間異常，交易所暫停交易'); return; }
    if (!isOpen()) { toast('目前休市中（台灣時間每天 05:00 開盤、隔天 04:00 收盤）'); return; }
    q = Math.floor(q); if (q <= 0) return; const cost = Math.ceil(price(id) * q * (1 + FEE));
    const cap = dailyCap(), used = usedToday(); if (used + cost > cap) { toast(`今天的投入上限是 ${cap} 枚（已用 ${used} 枚），保護召喚用的寶藏幣`); return; }
    if (SAVE.data.tokens < cost) { toast(`寶藏幣不足：需要 ${cost} 枚`); return; }
    const h = M().hold[id] = M().hold[id] || { q: 0, cost: 0 }; SAVE.data.tokens -= cost; h.cost += cost; h.q += q; const U = M().used = M().used && M().used.day === X().day ? M().used : { day: X().day, n: 0 }; U.n += cost;
    log('買進', id, q, cost); SFX.play('coin'); coins(); SAVE.save(); render(); toast(`買進 ${STOCKS.find(s => s.id === id).name} ${q} 股，花費 ${cost} 枚寶藏幣`, 'gold');
  }
  function sell(id, q) {
    if (window.timeLocked && timeLocked()) { toast('裝置時間異常，交易所暫停交易'); return; }
    if (!isOpen()) { toast('目前休市中（台灣時間每天 05:00 開盤、隔天 04:00 收盤）'); return; }
    const h = M().hold[id]; if (!h || !h.q) return; q = Math.min(h.q, Math.floor(q)); if (q <= 0) return;
    const get = Math.floor(price(id) * q * (1 - FEE - TAX)), basis = h.cost * q / h.q; h.cost -= basis; h.q -= q; if (!h.q) delete M().hold[id];
    M().realized = (M().realized || 0) + (get - basis); SAVE.data.tokens += get; log('賣出', id, q, get); SFX.play('coin'); coins(); SAVE.save(); render(); toast(`賣出 ${STOCKS.find(s => s.id === id).name} ${q} 股，拿回 ${get} 枚寶藏幣`, 'gold');
  }
  const holdValue = () => Object.entries(M().hold).reduce((a, [id, h]) => a + h.q * price(id), 0);
  const holdCost = () => Object.values(M().hold).reduce((a, h) => a + h.cost, 0);
  function indexVal() { const m = M(); let a = 0, b = 0; BASIC.forEach(s => { a += X().s[s.id].px / s.base; b += X().s[s.id].prev / s.base; }); return { v: a / BASIC.length * 1000, c: (a - b) / b }; }

  /* ---------- 畫面 ---------- */
  const chg = id => { const S = X().s[id]; return (S.px - S.prev) / S.prev; };
  const cls = x => x > 0 ? 'up' : x < 0 ? 'dn' : '';
  const sgn = x => (x > 0 ? '+' : '') + (x * 100).toFixed(2) + '%';
  function emblem(s, size) { const c = s.cap && CHARACTERS[s.cap]; return `<span class="mk-emb" style="--ec:${s.color};width:${size}px;height:${size}px">${c ? `<img src="${typeof charArt === 'function' ? charArt(s.cap, 'avatar') : c.avatar}" alt="">` : `<b>${s.mark || s.name[0]}</b>`}</span>`; }
  function spark(arr, w = 64, h = 22) { if (!arr || arr.length < 2) return '<span class="mk-spark"></span>'; const mn = Math.min(...arr), mx = Math.max(...arr), up = arr[arr.length - 1] >= arr[0];
    return `<svg class="mk-spark" viewBox="0 0 ${w} ${h}"><polyline fill="none" stroke="${up ? '#ff5a5a' : '#3fd07a'}" stroke-width="1.6" points="${arr.map((v, i) => `${(i / (arr.length - 1) * w).toFixed(1)},${(h - 2 - (mx === mn ? .5 : (v - mn) / (mx - mn)) * (h - 4)).toFixed(1)}`).join(' ')}"/></svg>`; }
  function statusText() { const t = Date.now(), k = nowTick(t);
    if (k >= TICKS_DAY) { const nxt = sessionStart(tradeDay(t + 3600e3)), m = Math.max(1, Math.ceil((nxt - t) / 60000)); return `休市中（台灣時間 04:00～05:00）・${m} 分鐘後開盤`; }
    const left = Math.ceil((sessionStart(tradeDay(t)) + TICKS_DAY * TICK - t) / 60000); return `開盤中・台灣 ${twClock(t)}・距收盤 ${Math.floor(left / 60)} 小時 ${left % 60} 分`; }

  function render() {
    const root = $('xcBody'); if (!root) return; const m = M(), s = STOCKS.find(x => x.id === sel), S = X().s[sel], ix = indexVal(), open = isOpen();
    const hv = holdValue(), hc = holdCost(), h = m.hold[sel];
    const maxBuy = Math.max(0, Math.floor(Math.min(SAVE.data.tokens, dailyCap() - usedToday()) / (S.px * (1 + FEE)))), maxSell = h ? h.q : 0, qmax = Math.max(1, maxBuy, maxSell); qty = Math.min(Math.max(1, qty), qmax);
    root.innerHTML = `
      <div class="mk-top"><div class="mk-idx"><small>偉大航路指數</small><b class="${cls(ix.c)}">${fmt(ix.v)}</b><em class="${cls(ix.c)}">${sgn(ix.c)}</em></div>
        <div class="mk-st ${open ? 'on' : ''}"><i></i>${statusText()}</div>
        <div class="mk-wallet"><small>寶藏幣・今日可投入</small><b>${SAVE.data.tokens.toLocaleString()}</b><em>${Math.max(0, dailyCap() - usedToday())} / ${dailyCap()}</em></div>
        <div class="mk-wallet"><small>持股市值</small><b>${fmt(hv)}</b><em class="${cls(hv - hc)}">${hc ? sgn((hv - hc) / hc) : ''}</em></div></div>
      <nav class="mk-tabs">${[['market', '行情'], ['chart', '走勢・交易'], ['hold', '我的持股'], ['news', '新聞']].map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}</nav>
      <div class="mk-grid tab-${tab}">
        <section class="mk-list"><div class="mk-cats" role="tablist">${CATS.map(([k, n]) => `<button class="${cat === k ? 'on' : ''}" data-cat="${k}">${n}</button>`).join('')}</div>${STOCKS.filter(x => cat === 'all' || (cat === 'hold' ? m.hold[x.id] : x.cat === cat)).map(x => { const XX = X().s[x.id], c = chg(x.id); return `<button class="mk-row ${x.id === sel ? 'on' : ''}" data-sel="${x.id}">${emblem(x, 34)}<span class="mk-nm"><b>${x.name}</b><small>${x.code}${m.hold[x.id] ? `・持有 ${m.hold[x.id].q}` : ''}</small></span>${spark(XX.min.length > 2 ? XX.min.slice(-60) : XX.days.slice(-20).map(d => d[3]))}<span class="mk-px ${cls(c)}"><b>${fmt(XX.px)}</b><small>${sgn(c)}</small></span></button>`; }).join('') || '<p class="mk-empty" style="padding:12px">這個分類目前沒有標的。</p>'}</section>
        <section class="mk-main">
          <header class="mk-head">${emblem(s, 46)}<div class="mk-hn"><h3>${s.name} <small>${s.code}・${(CATS.find(c => c[0] === s.cat) || ['', ''])[1]}</small></h3>${s.etf ? `<p class="mk-etf">成分：${etfParts(s).map(id => STOCKS.find(z => z.id === id).name).slice(0, 8).join('、')}${etfParts(s).length > 8 ? ` 等 ${etfParts(s).length} 檔` : ''}</p>` : ''}<div class="mk-big ${cls(chg(sel))}"><b>${fmt(S.px)}</b><span>${S.px - S.prev >= 0 ? '▲' : '▼'} ${fmt(Math.abs(S.px - S.prev))}（${sgn(chg(sel))}）</span></div></div>
            <dl class="mk-ohlc"><div><dt>開盤</dt><dd>${fmt(S.open)}</dd></div><div><dt>最高</dt><dd class="up">${fmt(S.hi)}</dd></div><div><dt>最低</dt><dd class="dn">${fmt(S.lo)}</dd></div><div><dt>昨收</dt><dd>${fmt(S.prev)}</dd></div></dl></header>
          <div class="mk-cv"><div class="mk-vt"><button class="${view === 'line' ? 'on' : ''}" data-view="line">分時</button><button class="${view === 'k' ? 'on' : ''}" data-view="k">日K</button></div><canvas id="mkChart"></canvas></div>
          <div class="mk-trade">${!open ? `<p class="mk-closed">休市中：台灣時間每天 05:00 開盤、隔天 04:00 收盤，休市時只能看盤。</p>` : ''}
            <div class="mk-qty"><span>數量</span><input type="range" id="mkQty" min="1" max="${qmax}" value="${qty}"><b id="mkQtyV">${qty}</b> 股</div>
            <p class="mk-est" id="mkEst"></p>
            <div class="mk-bs"><button class="mk-buy" id="mkBuy" ${open && maxBuy ? '' : 'disabled'}>買進<small>最多 ${maxBuy} 股</small></button><button class="mk-sell" id="mkSell" ${open && maxSell ? '' : 'disabled'}>賣出<small>持有 ${maxSell} 股</small></button></div>
            ${h ? `<p class="mk-mine">持有 ${h.q} 股・均價 ${fmt(h.cost / h.q)}・未實現損益 <b class="${cls(h.q * S.px - h.cost)}">${(h.q * S.px - h.cost >= 0 ? '+' : '') + fmt(h.q * S.px - h.cost)}</b></p>` : ''}
          </div>
        </section>
        <section class="mk-side">
          <div class="mk-hold"><h4>我的持股</h4>${Object.keys(m.hold).length ? `<table><tr><th>標的</th><th>股數</th><th>均價</th><th>現價</th><th>損益</th></tr>${Object.entries(m.hold).map(([id, hh]) => { const x = STOCKS.find(z => z.id === id), pl = hh.q * price(id) - hh.cost; return `<tr data-sel="${id}"><td>${x.name}</td><td>${hh.q}</td><td>${fmt(hh.cost / hh.q)}</td><td>${fmt(price(id))}</td><td class="${cls(pl)}">${(pl >= 0 ? '+' : '') + fmt(pl)}<br><small>${sgn(pl / hh.cost)}</small></td></tr>`; }).join('')}</table>` : '<p class="mk-empty">還沒有持股。挑一個看好的海賊團買進吧！</p>'}
            <p class="mk-real">已實現損益：<b class="${cls(m.realized || 0)}">${((m.realized || 0) >= 0 ? '+' : '') + Math.round(m.realized || 0).toLocaleString()}</b> 寶藏幣</p>
            ${m.trades.length ? `<details><summary>最近成交</summary>${m.trades.slice(0, 12).map(t => `<p><span class="${t.k === '買進' ? 'up' : 'dn'}">${t.k}</span> ${STOCKS.find(z => z.id === t.id).name} ${t.q} 股 @${fmt(t.px)}・${t.amt} 枚</p>`).join('')}</details>` : ''}</div>
          <div class="mk-news"><h4>即時新聞</h4>${X().news.slice(0, 18).map(n => `<p class="${n.clar ? 'clar' : n.up ? 'up' : 'dn'}" ${n.id ? `data-sel="${n.id}"` : ''}><time>${twClock(n.at)}</time>${n.clar ? '🔎 ' : n.macro ? '🌐 ' : n.up ? '📈 ' : '📉 '}${n.t}</p>`).join('') || '<p class="mk-empty">開盤後會陸續出現新聞。</p>'}</div>
        </section>
      </div>
      <p class="mk-note">交易時間：台灣時間每天 05:00 開盤、隔天 04:00 收盤（04:00～05:00 休市），盤中每 5 秒跳價。手續費 0.1425%、賣出另收 0.3% 交易稅；漲跌停 ±10%；紅漲綠跌。新聞約每 2 小時一則，會帶動接下來 5～20 分鐘的股價，少數是假消息，之後會被澄清並反轉。ETF 依成分股計算；期貨對國際快訊特別敏感。行情由台灣時間統一計算，所有裝置、所有玩家看到的價格與新聞都相同；新聞依各組織的原作設定撰寫。</p>`;
    root.querySelectorAll('[data-sel]').forEach(b => b.onclick = () => { sel = b.dataset.sel; if (innerWidth <= 860) tab = 'chart'; render(); });
    root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; render(); });
    root.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { cat = b.dataset.cat; render(); });
    root.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { view = b.dataset.view; render(); });
    const qi = $('mkQty'), est = () => { qty = +qi.value; $('mkQtyV').textContent = qty; $('mkEst').textContent = `買進約 ${Math.ceil(S.px * qty * (1 + FEE)).toLocaleString()} 枚・賣出約可得 ${Math.floor(S.px * Math.min(qty, maxSell) * (1 - FEE - TAX)).toLocaleString()} 枚`; };
    qi.oninput = est; est();
    $('mkBuy').onclick = () => buy(sel, Math.min(qty, maxBuy)); $('mkSell').onclick = () => sell(sel, Math.min(qty, maxSell));
    drawChart();
  }
  function drawChart() {
    const cv = $('mkChart'); if (!cv || !cv.offsetParent) return; const box = cv.parentElement.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1), W = Math.max(200, box.width), H = Math.max(160, box.height - 4);
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; const g = cv.getContext('2d'); g.scale(dpr, dpr); g.clearRect(0, 0, W, H);
    const S = X().s[sel], pad = { l: 8, r: 58, t: 26, b: 18 }, cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
    g.font = '11px system-ui'; g.fillStyle = 'rgba(200,214,230,.7)';
    const grid = (hi, lo, y) => { g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1; for (let i = 0; i <= 4; i++) { const yy = pad.t + ch * i / 4; g.beginPath(); g.moveTo(pad.l, yy); g.lineTo(pad.l + cw, yy); g.stroke(); g.fillText(fmt(hi - (hi - lo) * i / 4), pad.l + cw + 6, yy + 4); } };
    if (view === 'line') {
      const pts = S.min.length ? S.min.concat(S.px) : [S.prev, S.px], lo = Math.min(S.prev * .98, ...pts), hi = Math.max(S.prev * 1.02, ...pts), full = TICKS_DAY / BAR;
      const y = v => pad.t + (1 - (v - lo) / (hi - lo)) * ch, x = i => pad.l + Math.min(1, i / full) * cw;
      grid(hi, lo);
      g.setLineDash([4, 4]); g.strokeStyle = 'rgba(255,220,120,.6)'; g.beginPath(); g.moveTo(pad.l, y(S.prev)); g.lineTo(pad.l + cw, y(S.prev)); g.stroke(); g.setLineDash([]);
      const up = S.px >= S.prev, col = up ? '#ff5a5a' : '#3fd07a', grd = g.createLinearGradient(0, pad.t, 0, pad.t + ch); grd.addColorStop(0, up ? 'rgba(255,90,90,.35)' : 'rgba(63,208,122,.35)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.beginPath(); pts.forEach((v, i) => i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v))); g.strokeStyle = col; g.lineWidth = 2; g.stroke();
      g.lineTo(x(pts.length - 1), pad.t + ch); g.lineTo(x(0), pad.t + ch); g.closePath(); g.fillStyle = grd; g.fill();
      const lx = x(pts.length - 1), ly = y(S.px); g.fillStyle = col; g.beginPath(); g.arc(lx, ly, 4, 0, 7); g.fill(); g.globalAlpha = .3; g.beginPath(); g.arc(lx, ly, 9, 0, 7); g.fill(); g.globalAlpha = 1;
      g.fillStyle = 'rgba(200,214,230,.7)'; const ax = cw < 380 ? [['05:00', 0], ['12:00', 7], ['19:00', 14], ['04:00', 23]] : [['05:00', 0], ['11:00', 6], ['17:00', 12], ['23:00', 18], ['04:00', 23]]; ax.forEach(([t, hh], i) => g.fillText(t, pad.l + cw * hh / 23 - (i === ax.length - 1 ? 30 : 0), H - 4));
      g.fillText('分時走勢（每 5 分鐘一點）・虛線為昨收', pad.l, 14);
    } else {
      const d = S.days.slice(-40).concat([[S.open, S.hi, S.lo, S.px]]), lo = Math.min(...d.map(k => k[2])), hi = Math.max(...d.map(k => k[1])), y = v => pad.t + (1 - (v - lo) / (hi - lo || 1)) * ch, bw = cw / d.length;
      grid(hi, lo);
      d.forEach((k, i) => { const [o, hh, l, c] = k, up = c >= o, cx = pad.l + bw * i + bw / 2; g.strokeStyle = g.fillStyle = up ? '#ff5a5a' : '#3fd07a'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, y(hh)); g.lineTo(cx, y(l)); g.stroke(); g.fillRect(cx - bw * .32, y(Math.max(o, c)), bw * .64, Math.max(1, Math.abs(y(o) - y(c)))); });
      g.fillStyle = 'rgba(200,214,230,.7)'; g.fillText('日K（最近 40 天＋今天）', pad.l, 14);
    }
  }
  function showBanner(n) {
    if (currentScreen !== 'exchangeScreen') return; const el = $('mkBanner'); if (!el) return;
    el.className = 'mk-banner show ' + (n.clar ? 'clar' : n.up ? 'up' : 'dn'); el.innerHTML = `<b>${n.clar ? '澄清' : n.macro ? '國際快訊' : '突發新聞'}</b><span>${n.t}</span>`;
    clearTimeout(banner); banner = setTimeout(() => el.classList.remove('show'), 5200);
    el.onclick = () => { if (n.id) { sel = n.id; tab = 'chart'; render(); } el.classList.remove('show'); };
  }
  function loop() { advance(true); if (currentScreen === 'exchangeScreen') { const ae = document.activeElement; if (!ae || ae.id !== 'mkQty') render(); } SAVE.save(); }

  /* 第一次進入：三步驟教學 */
  function tutorial() { if (SAVE.data.mktTut) return; const steps = [['① 挑標的', '左邊（手機在「行情」分頁）是 37 檔海賊團、海軍、國家、ETF 與期貨。上方分類可以切換，紅色是上漲、綠色是下跌。'], ['② 看走勢・聽新聞', '中間是走勢圖，每 5 秒跳一次價。上方滑出「突發新聞」時，該標的接下來幾分鐘會明顯漲跌。所有玩家看到的行情都相同，可以一起討論；少數是假消息，之後會被澄清並反轉。'], ['③ 買進・賣出', `拉數量滑桿，按紅色「買進」或綠色「賣出」。每天最多投入 ${dailyCap()} 枚寶藏幣（航海等級越高越多），賣出的寶藏幣隨時可以拿去召喚。`]]; let i = 0;
    const box = document.createElement('div'); box.className = 'dl-wrap'; const draw = () => { box.innerHTML = `<div class="dl-card mk-tut"><img src="assets/ui/exchange_logo.webp?v=59" alt=""><h3>${steps[i][0]}</h3><p>${steps[i][1]}</p><div class="mk-tut-dots">${steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div><button class="btn-gold big" id="mkTutNext">${i < steps.length - 1 ? '下一步' : '開始交易'}</button></div>`; box.querySelector('#mkTutNext').onclick = () => { if (++i >= steps.length) { SAVE.data.mktTut = true; SAVE.save(); box.remove(); } else draw(); }; }; draw(); document.body.appendChild(box); }
  window.openExchange = function () { init(); advance(); showScreen('exchangeScreen'); render(); tutorial(); clearInterval(timer); timer = setInterval(() => { if (currentScreen !== 'exchangeScreen') { clearInterval(timer); timer = null; return; } loop(); }, TICK); };
  window.addEventListener('DOMContentLoaded', () => { const b = $('xcBack'); if (b) b.onclick = () => openModes(); addEventListener('resize', () => { if (currentScreen === 'exchangeScreen') drawChart(); }); });
  window.mkSummary = () => { try { init(); advance(); const ix = indexVal(); return `指數 ${fmt(ix.v)}（${sgn(ix.c)}）`; } catch (e) { return ''; } };
  window.__mk = { advance, buy, sell, M, X, STOCKS, isOpen, render, snapshot };
})();
