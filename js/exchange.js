/* 摩甘茲的懸賞金交易所：讀報辨別假新聞，買賣海賊的懸賞金股票，10 天內讓資金翻倍。
   真新聞：收盤時照報導漲跌。假新聞：收盤時市場信以為真（照報導方向動一半），隔天開盤被揭穿，反向修正整個幅度。
   所以「搶進假利多」持有過夜一定虧；判斷真假才是賺錢的關鍵。 */
(function () {
  const DAYS = 10, START_CASH = 10000, VERIFY_COST = 200, FEE = .01;
  const BASE = { UR: 320, SSR: 220, SR: 140, R: 80 };
  const REPORTERS = [
    { id: 'r1', name: '老鷹・亞特拉斯', rel: .92 }, { id: 'r2', name: '海鷗・瑪莉', rel: .75 },
    { id: 'r3', name: '鵜鶘・波登', rel: .5 }, { id: 'r4', name: '烏鴉・卡洛', rel: .25 }
  ];
  const UP = ['{n}在{i}擊沉了海軍的軍艦！', '{n}擊敗了{o}，名聲傳遍偉大航路', '{n}被目擊與四皇勢力結盟', '{n}搶走了世界政府的運寶船', '{n}在{i}單挑整支艦隊並全身而退'];
  const DOWN = ['{n}在{i}遭海軍大將逮捕', '{n}被{o}打得慘敗', '{n}的船隊在{i}的風暴中解散', '{n}被傳已經退出大海賊時代', '{n}在{i}重傷倒下，下落不明'];
  const R = () => Math.random(), pick = a => a[Math.floor(R() * a.length)], rint = (a, b) => a + Math.floor(R() * (b - a + 1));
  const rar = id => (typeof CHAR_RARITY !== 'undefined' && CHAR_RARITY[id]) || 'SR';
  const X = () => (SAVE.data.exchange = SAVE.data.exchange || { best: 0, seasons: 0, rewardDay: '', rep: {} });
  const S = () => X().season;
  const fmt = n => Math.round(n).toLocaleString();

  function newSeason() {
    const pool = CHARACTER_ORDER.filter(id => !['marine', 'mayor', 'imu', 'morgans'].includes(id));
    const ids = []; while (ids.length < 6) { const id = pick(pool); if (!ids.includes(id)) ids.push(id); }
    X().season = { day: 1, cash: START_CASH, hold: {}, verified: false, stocks: ids.map(id => { const p = Math.round(BASE[rar(id)] * (.8 + R() * .4)); return { id, price: p, hist: [p] }; }), news: [], yesterday: [], pending: [] };
    makeNews(); SAVE.save();
  }
  function islands() { return CHAPTERS.map(c => c.name.replace(/篇$/, '')); }
  /* 每天 3～4 則頭條；約 35% 是假新聞；有時會出現「同一位海賊同一天在兩個地方」的矛盾 */
  function makeNews() {
    const s = S(), n = rint(3, 4), news = [], used = new Set();
    for (let k = 0; k < n; k++) {
      let st; do st = pick(s.stocks); while (used.has(st.id) && used.size < s.stocks.length); used.add(st.id);
      const rep = pick(REPORTERS), truth = R() < rep.rel * .9 + .05, up = R() < .5, mag = rint(18, 40) / 100;
      const other = pick(s.stocks.filter(x => x.id !== st.id)), isl = pick(islands());
      news.push({ id: st.id, up, mag, truth, rep: rep.id, isl, text: pick(up ? UP : DOWN).replace('{n}', CHARACTERS[st.id].name).replace('{o}', CHARACTERS[other.id].name).replace('{i}', isl), checked: false });
    }
    /* 矛盾線索：讓一則假新聞與某則真新聞指向同一位海賊、但地點不同 */
    if (R() < .45) { const t = news.find(x => x.truth); if (t) { const f = { ...t, truth: false, up: !t.up, mag: rint(12, 25) / 100, rep: pick(REPORTERS.filter(r => r.rel < .8)).id, checked: false }; f.isl = pick(islands().filter(i => i !== t.isl)); f.text = pick(f.up ? UP : DOWN).replace('{n}', CHARACTERS[t.id].name).replace('{o}', CHARACTERS[pick(s.stocks.filter(x => x.id !== t.id)).id].name).replace('{i}', f.isl); news.splice(rint(0, news.length), 0, f); } }
    s.news = news; s.verified = false;
  }
  const stock = id => S().stocks.find(x => x.id === id);
  function assets() { const s = S(); return s.cash + s.stocks.reduce((a, x) => a + (s.hold[x.id] || 0) * x.price, 0); }
  function repStat(id) { const r = X().rep[id] || { ok: 0, n: 0 }; return r; }

  function trade(id, qty) {
    const s = S(), st = stock(id); if (!st) return;
    if (qty > 0) { const cost = st.price * qty * (1 + FEE); if (cost > s.cash) { toast('交易資金不足'); return; } s.cash -= cost; s.hold[id] = (s.hold[id] || 0) + qty; }
    else { const have = s.hold[id] || 0, q = Math.min(have, -qty); if (!q) return; s.cash += st.price * q * (1 - FEE); s.hold[id] = have - q; }
    SFX.play('coin'); SAVE.save(); render();
  }
  function verify(i) {
    const s = S(), n = s.news[i]; if (!n || n.checked) return;
    if (s.verified) { toast('今天已經派過新聞鳥查證了'); return; }
    if (s.cash < VERIFY_COST) { toast('交易資金不足，無法查證'); return; }
    s.cash -= VERIFY_COST; s.verified = true; n.checked = true; SAVE.save(); SFX.play(n.truth ? 'pickup' : 'miss'); render();
  }
  /* 收盤：真新聞全幅、假新聞半幅（市場信以為真）；隔天開盤揭穿假新聞，反向修正全幅 */
  function closeDay() {
    const s = S(), moves = {};
    s.stocks.forEach(x => { moves[x.id] = (R() - .5) * .06; });
    s.news.forEach(n => { moves[n.id] += (n.up ? 1 : -1) * n.mag * (n.truth ? 1 : .5); });
    s.stocks.forEach(x => { x.price = Math.max(10, Math.round(x.price * (1 + moves[x.id]))); x.hist.push(x.price); });
    s.news.forEach(n => { const r = X().rep[n.rep] = X().rep[n.rep] || { ok: 0, n: 0 }; r.n++; if (n.truth) r.ok++; });
    s.yesterday = s.news.map(n => ({ text: n.text, truth: n.truth, rep: n.rep }));
    s.pending = s.news.filter(n => !n.truth).map(n => ({ id: n.id, up: n.up, mag: n.mag }));
    if (s.day >= DAYS) { finish(); return; }
    s.day++;
    /* 隔天開盤：揭穿昨天的假新聞 */
    s.pending.forEach(p => { const x = stock(p.id); x.price = Math.max(10, Math.round(x.price * (1 - (p.up ? 1 : -1) * p.mag))); x.hist[x.hist.length - 1] = x.price; });
    s.pending = []; makeNews(); SAVE.save(); SFX.play('quest'); render();
  }
  function finish() {
    const s = S(), total = assets(), pct = (total - START_CASH) / START_CASH, x = X(); x.seasons++;
    const isBest = total > (x.best || 0); if (isBest) x.best = Math.round(total);
    const first = x.rewardDay !== today(); let rw = [];
    if (first && pct > 0) {
      x.rewardDay = today(); const tok = Math.min(10, Math.max(1, Math.floor(pct * 10))), sw = pct >= .5 ? 3 : pct >= .2 ? 2 : 1, ber = Math.round(Math.min(30000, total - START_CASH));
      addTokens(tok, '懸賞金交易所'); addBerry(ber); SAVE.data.inventory.sweep = (SAVE.data.inventory.sweep || 0) + sw; rw = [`寶藏幣 ×${tok}`, `貝里 ${fmt(ber)}`, `掃蕩卷 ×${sw}`];
    }
    x.season = null; SAVE.save();
    const grade = pct >= 1 ? 'S' : pct >= .5 ? 'A' : pct >= .2 ? 'B' : pct >= 0 ? 'C' : 'D';
    storyCard(`第 ${x.seasons} 季結算・評價 ${grade}`, [`最終資產：${fmt(total)} 貝里（${pct >= 0 ? '+' : ''}${Math.round(pct * 100)}%）${isBest ? '・新紀錄！' : ''}`, rw.length ? '今日首次獲利獎勵：' + rw.join('、') : first ? '這一季沒有獲利，今天還可以再挑戰一次領獎。' : '今天的獎勵已經領過了，這一季只記錄成績。', '摩甘茲：「新聞就是我寫的劇本。看穿了，就是你的財富。」'], '回到交易所', () => render());
  }

  function spark(h) { const w = 90, ht = 26, mn = Math.min(...h), mx = Math.max(...h), sx = i => h.length < 2 ? w : i / (h.length - 1) * w, sy = v => ht - 2 - (mx === mn ? .5 : (v - mn) / (mx - mn)) * (ht - 4);
    const up = h[h.length - 1] >= h[0]; return `<svg class="xc-spark" viewBox="0 0 ${w} ${ht}" aria-hidden="true"><polyline fill="none" stroke="${up ? '#5fe09a' : '#ff6a6a'}" stroke-width="2" points="${h.map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(' ')}"/></svg>`; }
  function render() {
    const el = $('xcBody'); if (!el) return; const x = X(), s = x.season;
    if (!s) {
      el.innerHTML = `<div class="xc-intro"><img src="${CHARACTERS.morgans.avatar}" alt=""><div><h2>摩甘茲的懸賞金交易所</h2><p>世界經濟新聞社每天發布海賊的新聞——但其中有些是社長摩甘茲操作輿論的<b>假新聞</b>。讀報判斷真假，買賣海賊的懸賞金股票，在 ${DAYS} 天內讓 ${fmt(START_CASH)} 貝里的資金翻倍！</p>
        <ul><li><b>真新聞</b>：收盤時照報導漲跌。</li><li><b>假新聞</b>：收盤時市場信以為真（只動一半），<b>隔天開盤被揭穿</b>，反向修正整個幅度——追假利多持有過夜一定虧。</li><li><b>線索</b>：記者的可信度會隨歷史紀錄累積；同一位海賊同一天出現在兩個地方，其中一則一定是假的；每天可以花 ${VERIFY_COST} 貝里派新聞鳥查證一則。</li><li>每筆交易收 1% 手續費。每天第一次獲利結算可領寶藏幣、貝里與掃蕩卷。</li></ul>
        <p class="xc-best">最佳紀錄：<b>${fmt(x.best || 0)}</b> 貝里・已完成 ${x.seasons || 0} 季</p><button class="btn-gold big" id="xcStart">開始新的一季</button></div></div>`;
      $('xcStart').onclick = () => { newSeason(); render(); }; return;
    }
    const total = assets(), pct = (total - START_CASH) / START_CASH;
    el.innerHTML = `<div class="xc-top"><span>第 <b>${s.day}</b>/${DAYS} 天</span><span>資金 <b>${fmt(s.cash)}</b></span><span>總資產 <b class="${pct >= 0 ? 'up' : 'dn'}">${fmt(total)}（${pct >= 0 ? '+' : ''}${Math.round(pct * 100)}%）</b></span></div>
      <div class="xc-grid">
        <section class="xc-paper"><header><img src="${CHARACTERS.morgans.avatar}" alt=""><div><h3>世界經濟新聞報</h3><small>第 ${s.day} 期・查證 ${s.verified ? '今日已用' : `剩 1 次（${VERIFY_COST} 貝里）`}</small></div></header>
          ${s.news.map((n, i) => { const rp = REPORTERS.find(r => r.id === n.rep), st = repStat(n.rep); return `<article class="xc-news ${n.checked ? (n.truth ? 'true' : 'fake') : ''}"><p>${n.text}</p><footer><span>記者 ${rp.name}・過去 ${st.n ? `${st.ok}/${st.n} 屬實` : '尚無紀錄'}</span>${n.checked ? `<b>${n.truth ? '✓ 查證屬實' : '✗ 假新聞！'}</b>` : `<button class="btn-ghost sm" data-verify="${i}" ${s.verified ? 'disabled' : ''}>查證</button>`}</footer></article>`; }).join('')}
          ${s.yesterday.length ? `<details class="xc-yday"><summary>昨天的頭條真相</summary>${s.yesterday.map(n => `<p class="${n.truth ? 'true' : 'fake'}">${n.truth ? '✓' : '✗'} ${n.text}</p>`).join('')}</details>` : ''}
        </section>
        <section class="xc-market">${s.stocks.map(st => { const c = CHARACTERS[st.id], h = st.hist, ch = h.length > 1 ? (h[h.length - 1] - h[h.length - 2]) / h[h.length - 2] : 0, own = s.hold[st.id] || 0; return `<div class="xc-stock"><img src="${typeof charArt === 'function' ? charArt(st.id, 'avatar') : c.avatar}" alt=""><div class="xs-info"><b>${c.name}</b><span>${fmt(st.price)} <em class="${ch >= 0 ? 'up' : 'dn'}">${ch >= 0 ? '▲' : '▼'}${Math.abs(Math.round(ch * 100))}%</em></span><small>持有 ${own} 股${own ? `・市值 ${fmt(own * st.price)}` : ''}</small></div>${spark(h)}<div class="xs-btn"><button class="btn-gold sm" data-buy="${st.id}" data-q="1">買 1</button><button class="btn-gold sm" data-buy="${st.id}" data-q="5">買 5</button><button class="btn-ghost sm" data-sell="${st.id}" data-q="1" ${own ? '' : 'disabled'}>賣 1</button><button class="btn-ghost sm" data-sell="${st.id}" data-q="999" ${own ? '' : 'disabled'}>全賣</button></div></div>`; }).join('')}</section>
      </div>
      <div class="xc-foot"><button class="btn-primary big" id="xcClose">${s.day >= DAYS ? '最後收盤・結算' : '收盤，進入下一天'}</button></div>`;
    el.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => trade(b.dataset.buy, +b.dataset.q));
    el.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => trade(b.dataset.sell, -b.dataset.q));
    el.querySelectorAll('[data-verify]').forEach(b => b.onclick = () => verify(+b.dataset.verify));
    $('xcClose').onclick = () => confirmBox(s.day >= DAYS ? '最後收盤？' : '收盤？', s.day >= DAYS ? '持股會以收盤價全部換回資金並結算這一季。' : '今天的新聞會在收盤時影響股價，假新聞明天開盤就會被揭穿。', '收盤', closeDay);
  }
  window.openExchange = function () { showScreen('exchangeScreen'); render(); };
  window.addEventListener('DOMContentLoaded', () => { const b = $('xcBack'); if (b) b.onclick = () => openModes(); });
  /* 測試用 */
  window.__xc = { newSeason, closeDay, assets, S, trade, verify };
})();
