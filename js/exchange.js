/* 懸賞金交易所 v2：用寶藏幣買賣「海賊團股票」。
   每天 09:00 開盤、22:00 收盤（裝置時間），盤中每 5 秒跳一次價；漲跌停 ±10%；紅漲綠跌。
   新聞只是事件提示：利多／利空會在接下來幾十秒帶動股價，少數是假消息，之後會出現「澄清」讓股價反轉。
   沒有結束時間——離開遊戲時市場照樣在動，下次打開會自動補算錯過的行情。 */
(function () {
  const TICK = 5000, TZ = 8 * 3600e3, OPEN_H = 5, SESSION_H = 23, TICKS_DAY = SESSION_H * 3600 * 1000 / TICK, BAR = 60, LIMIT = .10; /* 台灣時間 05:00 開盤、隔天 04:00 收盤；分時圖每 5 分鐘一點 */
  const FEE = .001425, TAX = .003, MAX_CATCHUP_DAYS = 45;
  /* 投資標的（劇情不影響股價，只是名稱）；cat＝類股，cap＝代表圖示的角色頭像，etf＝成分股 */
  const CATS = [['all', '全部'], ['hold', '持有'], ['yonko', '四皇股'], ['pirate', '海賊股'], ['navy', '海軍股'], ['tenryu', '天龍股'], ['nation', '國家股'], ['etf', 'ETF'], ['fut', '期貨']];
  const STOCKS = [
    { id: 'straw', cat: 'yonko', name: '草帽一夥', code: 'Y001', cap: 'luffy', base: 18, vol: 1.2, color: '#e8a33a' },
    { id: 'redhair', cat: 'yonko', name: '紅髮海賊團', code: 'Y002', mark: '紅', base: 42, vol: .8, color: '#c8322b' },
    { id: 'bb', cat: 'yonko', name: '黑鬍子海賊團', code: 'Y003', cap: 'blackbeard', base: 35, vol: 1.5, color: '#4a3a6a' },
    { id: 'cross', cat: 'yonko', name: '十字公會', code: 'Y004', cap: 'buggy', base: 14, vol: 1.6, color: '#3a7ac8' },
    { id: 'bigmom', cat: 'pirate', name: 'BIG MOM 海賊團', code: 'P101', cap: 'bigmom', base: 38, vol: 1, color: '#e85a9a' },
    { id: 'beasts', cat: 'pirate', name: '百獸海賊團', code: 'P102', cap: 'kaido', base: 30, vol: 1.1, color: '#5a6a8a' },
    { id: 'whitebeard', cat: 'pirate', name: '白鬍子海賊團', code: 'P103', cap: 'marco', base: 26, vol: .9, color: '#5ab0e0' },
    { id: 'kuja', cat: 'pirate', name: '九蛇海賊團', code: 'P104', cap: 'hancock', base: 22, vol: .9, color: '#d84a7a' },
    { id: 'heart', cat: 'pirate', name: '紅心海賊團', code: 'P105', cap: 'law', base: 12, vol: 1.3, color: '#e8c83a' },
    { id: 'kid', cat: 'pirate', name: '基德海賊團', code: 'P106', cap: 'kid', base: 9, vol: 1.5, color: '#c84a3a' },
    { id: 'thriller', cat: 'pirate', name: '恐怖三桅帆船', code: 'P107', cap: 'moria', base: 6, vol: 1.4, color: '#7a4ab8' },
    { id: 'baroque', cat: 'pirate', name: '巴洛克工作社', code: 'P108', cap: 'crocodile', base: 8, vol: 1.2, color: '#c8a05a' },
    { id: 'newfish', cat: 'pirate', name: '新魚人海賊團', code: 'P109', cap: 'hody', base: 5, vol: 1.7, color: '#2a8aa0' },
    { id: 'doflamingo', cat: 'pirate', name: '唐吉訶德家族', code: 'P110', mark: '唐', base: 24, vol: 1.3, color: '#e070b0' },
    { id: 'navy', cat: 'navy', name: '海軍本部', code: 'N201', cap: 'akainu', base: 48, vol: .6, color: '#3a6ab0' },
    { id: 'garpco', cat: 'navy', name: '卡普艦隊', code: 'N202', cap: 'garp_mf', base: 26, vol: .7, color: '#5a8ad0' },
    { id: 'cp9', cat: 'navy', name: 'CP9', code: 'N203', cap: 'lucci', base: 20, vol: .9, color: '#2a2a3a' },
    { id: 'impel', cat: 'navy', name: '推進城', code: 'N204', cap: 'magellan', base: 15, vol: .8, color: '#6a2a4a' },
    { id: 'gov', cat: 'tenryu', name: '世界政府', code: 'T301', cap: 'imu', base: 60, vol: .5, color: '#8a7a5a' },
    { id: 'tenryu', cat: 'tenryu', name: '天龍人聖地瑪莉喬亞', code: 'T302', mark: '天', base: 72, vol: .45, color: '#d8b84a' },
    { id: 'press', cat: 'tenryu', name: '世界經濟新聞社', code: 'T303', cap: 'morgans', base: 16, vol: 1, color: '#d8c8a0' },
    { id: 'alabasta', cat: 'nation', name: '阿拉巴斯坦王國', code: 'K401', cap: 'vivi', base: 19, vol: .7, color: '#d8a84a' },
    { id: 'ryugu', cat: 'nation', name: '龍宮王國', code: 'K402', cap: 'shirahoshi', base: 17, vol: .7, color: '#4ab0d8' },
    { id: 'wano', cat: 'nation', name: '和之國', code: 'K403', cap: 'yamato', base: 21, vol: .8, color: '#c84a4a' },
    { id: 'skypiea', cat: 'nation', name: '空島', code: 'K404', cap: 'enel', base: 11, vol: .9, color: '#8ad0f0' },
    { id: 'elbaf', cat: 'nation', name: '艾爾巴夫', code: 'K405', cap: 'loki', base: 23, vol: .8, color: '#7a9a5a' },
    { id: 'dressrosa', cat: 'nation', name: '德雷斯羅薩', code: 'K406', mark: '德', base: 13, vol: 1, color: '#e88a4a' },
    { id: 'gold', cat: 'fut', name: '寶藏金期貨', code: 'F701', mark: '金', base: 50, vol: .7, color: '#e8c84a' },
    { id: 'seastone', cat: 'fut', name: '海樓石期貨', code: 'F702', mark: '石', base: 33, vol: .9, color: '#6a8a9a' },
    { id: 'devilfruit', cat: 'fut', name: '惡魔果實期貨', code: 'F703', mark: '果', base: 80, vol: 1.8, color: '#9a4ad8' },
    { id: 'meat', cat: 'fut', name: '帶骨肉期貨', code: 'F704', mark: '肉', base: 4, vol: 1.2, color: '#c87a4a' },
    { id: 'cola', cat: 'fut', name: '可樂燃料期貨', code: 'F705', mark: '可', base: 7, vol: 1.1, color: '#4a2a1a' },
    { id: 'etf_yonko', cat: 'etf', name: '四皇 ETF', code: 'E501', mark: '四', base: 30, color: '#e8b64a', etf: ['straw', 'redhair', 'bb', 'cross'] },
    { id: 'etf_worst', cat: 'etf', name: '最惡世代 ETF', code: 'E502', mark: '惡', base: 12, color: '#c84a6a', etf: ['straw', 'heart', 'kid', 'bb'] },
    { id: 'etf_navy', cat: 'etf', name: '海軍 ETF', code: 'E503', mark: '軍', base: 25, color: '#3a6ab0', etf: ['navy', 'garpco', 'cp9', 'impel'] },
    { id: 'etf_nation', cat: 'etf', name: '列國 ETF', code: 'E504', mark: '國', base: 18, color: '#7a9a5a', etf: ['alabasta', 'ryugu', 'wano', 'skypiea', 'elbaf', 'dressrosa'] },
    { id: 'etf_all', cat: 'etf', name: '偉大航路 30', code: 'E500', mark: '30', base: 20, color: '#e8d8b0', etf: 'ALL' }
  ];
  const BASIC = STOCKS.filter(s => !s.etf), etfParts = s => s.etf === 'ALL' ? BASIC.map(x => x.id) : s.etf;
  const PLACES = ['東海', '阿拉巴斯坦', '空島', '司法島', '馬林福特', '魚人島', '蛋糕島', '和之國', '蜂巢島', '艾爾巴夫', '香波地群島', '水之七島', '德雷斯羅薩', '佐烏', '蛋頭島', '新世界', '偉大航路前半段', '無風帶', '頂上戰爭遺址', '推進城外海'];
  /* 新聞樣板：組織 × 樣板 × 地點 × 對手 × 數字，可組合出上萬種事件（遠超過 1500 種） */
  const UP = ['{o}在{p}擊退海軍艦隊，聲勢大漲', '{o}在{p}挖到古代寶藏，估值上看 {n} 億貝里', '{o}宣布與{r}結盟，雙方共享航路', '{o}旗下船員懸賞金集體調升', '{o}於{p}設立新據點，貿易量創新高', '{o}在{p}的宴會吸引上千名海賊加入', '{o}成功奪下{p}的海上霸權', '分析師：{o}下季掠奪收入可望成長 {n}%', '{o}與{p}的商會簽下 {n} 年護航合約', '{o}擊敗{r}，在{p}一戰成名', '{o}的船匠完成新型戰艦，航速提升 {n}%', '{o}在{p}找到永久指針', '世界經濟新聞：{o}本月最受矚目', '{o}獲得{p}居民支持，補給無虞', '{o}的戰鬥人員實力被評為新世界前段班', '{o}在{p}的地下交易所大賺一筆', '傳說中的寶藏地圖落入{o}手中', '{o}招募到 {n} 名新船員', '{o}在{p}成功救出被俘同伴', '{o}的懸賞總額突破 {n} 億貝里'];
  const DOWN = ['{o}在{p}遭海軍大將伏擊，損失慘重', '{o}與{r}在{p}爆發衝突，戰況不利', '{o}的主力船在{p}的暴風中觸礁', '{o}傳出內鬨，幹部出走', '{o}在{p}的據點被世界政府查封', '{o}的補給線在{p}被切斷', '分析師：{o}下季收入恐衰退 {n}%', '{o}遭{r}偷襲，寶藏被搶走', '{o}的船長在{p}下落不明', '{o}在{p}的宴會發生意外，聲譽受損', '{o}被傳積欠{p}商會 {n} 億貝里', '{o}的船員在{p}被大量逮捕', '天龍人震怒：{o}被列為重點打擊對象', '{o}的航海士失蹤，航線停擺', '{o}在{p}遭遇海王類，船隊受創', '{o}的武器庫在{p}爆炸', '{o}遭新聞社踢爆假帳', '{o}在{p}的地盤被{r}奪走', '{o}被迫撤出{p}', '{o}的懸賞總額遭下修 {n}%'];
  const MACRO_UP = ['世界會議落幕，海上貿易全面熱絡', '偉大航路天候穩定，各海賊團出航順利', '新世界傳出大寶藏線索，市場一片樂觀'];
  const MACRO_DOWN = ['海軍發布大規模掃蕩令，海賊股全面重挫', '世界政府宣布海上戒嚴，市場恐慌', '巨大風暴襲擊偉大航路，航運停擺'];
  const R = Math.random, pick = a => a[Math.floor(R() * a.length)], rint = (a, b) => a + Math.floor(R() * (b - a + 1));
  const gauss = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const r2 = x => Math.round(x * 100) / 100, fmt = x => (Math.round(x * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  /* 交易日：以台灣時間計算，05:00 以前算前一個交易日 */
  const tradeDay = t => { const d = new Date(t + TZ - OPEN_H * 3600e3); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`; };
  const sessionStart = day => { const [y, mo, d] = day.split('-').map(Number); return Date.UTC(y, mo - 1, d, OPEN_H, 0, 0) - TZ; };
  const nowTick = t => Math.max(-1, Math.min(TICKS_DAY, Math.floor((t - sessionStart(tradeDay(t))) / TICK)));
  const twClock = t => { const d = new Date(t + TZ); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
  const isOpen = (t = Date.now()) => { const k = nowTick(t); return k >= 0 && k < TICKS_DAY; };
  const M = () => SAVE.data.mkt;
  let sel = 'straw', view = 'line', tab = 'market', cat = 'all', timer = null, banner = null, qty = 1, live = false;

  /* ---------- 市場狀態 ---------- */
  function init() {
    if (SAVE.data.mkt && SAVE.data.mkt.v === 3) return;
    /* 舊版市場（v2）：持股依當時價格全數換回寶藏幣後，開設新市場 */
    if (SAVE.data.mkt && SAVE.data.mkt.hold) { const o = SAVE.data.mkt; let back = 0; Object.entries(o.hold).forEach(([id, h]) => { const S = o.s && o.s[id]; if (S) back += Math.floor(S.px * h.q); }); if (back > 0) { SAVE.data.tokens += back; setTimeout(() => toast(`交易所改版：舊持股已依市價換回 ${back} 枚寶藏幣`, 'gold'), 600); } }
    const st = {};
    STOCKS.forEach(s => { const p = r2(s.base * (.85 + R() * .3)); st[s.id] = { px: p, prev: p, open: p, hi: p, lo: p, min: [], days: [], mom: [] }; });
    SAVE.data.mkt = { v: 3, day: tradeDay(Date.now()), tick: -1, s: st, hold: {}, trades: [], news: [], pending: [], realized: 0 };
    seedHistory(); SAVE.save();
  }
  /* 初次建立：先生成 30 天的歷史日 K，讓圖表一開始就有東西看 */
  function seedHistory() {
    const m = M(); STOCKS.forEach(s => { const S = m.s[s.id]; let p = S.px; const arr = [];
      for (let i = 0; i < 30; i++) { const o = p, ret = gauss() * .025 * (s.vol || .8), c = Math.max(.5, o * (1 + Math.max(-LIMIT, Math.min(LIMIT, ret)))); arr.push([r2(o), r2(Math.max(o, c) * (1 + R() * .015 * (s.vol || .8))), r2(Math.min(o, c) * (1 - R() * .015 * (s.vol || .8))), r2(c)]); p = c; }
      S.days = arr; S.px = S.prev = S.open = S.hi = S.lo = r2(p); S.min = [S.px]; });
  }
  function push(m, id, total, n) { m.s[id].mom.push({ per: total / n, left: n }); }
  function addNews(m, n, quiet) { n.at = n.at || (m.tick >= 0 ? sessionStart(m.day) + m.tick * TICK : Date.now()); n.day = m.day; m.news.unshift(n); if (m.news.length > 60) m.news.length = 60; if (!quiet) showBanner(n); }
  function newsEvent(m, quiet) {
    const macro = R() < .06, fake = !macro && R() < .12, up = R() < .5;
    if (macro) { const t = pick(up ? MACRO_UP : MACRO_DOWN); BASIC.forEach(s => { const sign = (s.cat === 'navy' || s.cat === 'tenryu') ? -1 : s.cat === 'fut' ? (R() < .5 ? 1 : -1) : 1; push(m, s.id, (up ? 1 : -1) * sign * (1 + R() * 2.5) / 100, rint(6, 18)); }); addNews(m, { t, up, macro: true }, quiet); return; }
    const s = pick(BASIC), rv = pick(BASIC.filter(x => x.id !== s.id)), mag = (1.5 + R() * 4.5) / 100 * (s.vol > 1.2 ? 1.25 : 1);
    const text = pick(up ? UP : DOWN).replace('{o}', s.name).replace('{r}', rv.name).replace('{p}', pick(PLACES)).replace('{n}', rint(3, 60));
    push(m, s.id, (up ? 1 : -1) * mag, rint(6, 24));
    if (fake) m.pending.push({ id: s.id, up: !up, mag: mag * 1.1, at: m.tick + rint(60, 600), day: m.day, text });
    addNews(m, { id: s.id, t: text, up }, quiet);
  }
  /* 每 5 秒一跳：隨機漫步＋新聞動能，限制在漲跌停內 */
  function step(m, n = 1) {
    const t0 = m.tick; m.tick += n; const bar = Math.floor(m.tick / BAR) > Math.floor(t0 / BAR) || m.tick % BAR === 0;
    if (R() < n / 1440) newsEvent(m, !live); /* 約每 2 小時一則 */
    m.pending = m.pending.filter(p => { if (p.day === m.day && m.tick >= p.at) { push(m, p.id, (p.up ? 1 : -1) * p.mag, rint(6, 14)); addNews(m, { id: p.id, t: `澄清：「${p.text}」為不實消息`, up: p.up, clar: true }, !live); return false; } return true; });
    BASIC.forEach(s => { const S = m.s[s.id]; let r = gauss() * .00025 * s.vol * Math.sqrt(n) + Math.log(s.base / S.px) * .000012 * n; /* 無長期漂移，價格遠離基準價時會慢慢拉回 */
      S.mom = S.mom.filter(x => { const k = Math.min(n, x.left); r += x.per * k; x.left -= k; return x.left > 0; });
      const p = Math.max(S.prev * (1 - LIMIT), Math.min(S.prev * (1 + LIMIT), S.px * (1 + r))); S.px = r2(Math.max(.05, p)); S.hi = Math.max(S.hi, S.px); S.lo = Math.min(S.lo, S.px);
      if (bar) S.min.push(S.px); });
    etfStep(m, bar);
  }
  /* ETF：成分股相對昨收的平均漲跌 */
  function etfStep(m, bar) { STOCKS.filter(s => s.etf).forEach(s => { const S = m.s[s.id], parts = etfParts(s), r = parts.reduce((a, id) => a + m.s[id].px / m.s[id].prev, 0) / parts.length; S.px = r2(Math.max(.05, S.prev * r)); S.hi = Math.max(S.hi, S.px); S.lo = Math.min(S.lo, S.px); if (bar) S.min.push(S.px); }); }
  function closeDay(m) { STOCKS.forEach(s => { const S = m.s[s.id]; S.days.push([S.open, r2(S.hi), r2(S.lo), S.px]); if (S.days.length > 90) S.days.shift(); }); }
  function openDay(m, dayStr) {
    m.day = dayStr; m.tick = -1;
    /* 隔夜：還沒澄清的假消息在開盤前揭穿，形成跳空 */
    const gaps = {}; m.pending.forEach(p => { gaps[p.id] = (gaps[p.id] || 0) + (p.up ? 1 : -1) * p.mag; m.news.unshift({ id: p.id, t: `開盤前澄清：「${p.text}」為不實消息`, up: p.up, clar: true, at: Date.now(), day: dayStr }); }); m.pending = [];
    BASIC.forEach(s => { const S = m.s[s.id], g = Math.max(-LIMIT, Math.min(LIMIT, (gaps[s.id] || 0) + gauss() * .006 * s.vol)); S.prev = S.px; S.px = S.open = S.hi = S.lo = r2(S.prev * (1 + g)); S.min = [S.px]; S.mom = []; });
    STOCKS.filter(s => s.etf).forEach(s => { const S = m.s[s.id], parts = etfParts(s), r = parts.reduce((a, id) => a + m.s[id].px / m.s[id].prev, 0) / parts.length; S.prev = S.px; S.px = S.open = S.hi = S.lo = r2(S.prev * r); S.min = [S.px]; S.mom = []; });
  }
  /* 補算錯過的行情：整天沒開過就用「日線」快速推進，今天再逐跳模擬 */
  function advance(t = Date.now()) {
    if (window.timeLocked && timeLocked()) return; /* 時間異常時不推進行情，避免快轉 */
    const m = M(), today = tradeDay(t);
    if (m.day !== today) {
      if (m.tick >= 0) { while (m.tick < TICKS_DAY - 1) step(m, Math.min(12, TICKS_DAY - 1 - m.tick)); closeDay(m); }
      const last = sessionStart(m.day), cur = sessionStart(today); const gap = Math.min(MAX_CATCHUP_DAYS, Math.max(0, Math.round((cur - last) / 864e5) - 1));
      for (let i = 0; i < gap; i++) { const rr = {}; STOCKS.forEach(s => { const S = m.s[s.id], o = S.px, ret = s.etf ? etfParts(s).reduce((a, id) => a + rr[id], 0) / etfParts(s).length : Math.max(-LIMIT, Math.min(LIMIT, gauss() * .022 * s.vol)), c = r2(Math.max(.05, o * (1 + ret))); rr[s.id] = ret; S.days.push([o, r2(Math.max(o, c) * (1 + R() * .012)), r2(Math.min(o, c) * (1 - R() * .012)), c]); if (S.days.length > 90) S.days.shift(); S.px = c; }); }
      openDay(m, today);
    }
    const k = nowTick(t), target = Math.min(k, TICKS_DAY - 1);
    if (k >= 0) while (m.tick < target) step(m, target - m.tick > 120 ? 12 : 1);
  }

  /* ---------- 交易 ---------- */
  const price = id => M().s[id].px;
  /* 每日投入上限：200 ＋ 航海等級 × 10 枚寶藏幣（以交易日計，賣出不會增加額度） */
  const dailyCap = () => 200 + (typeof acctLevelInfo === 'function' ? acctLevelInfo().lv : 1) * 10;
  const usedToday = () => (M().used && M().used.day === M().day) ? M().used.n : 0;
  function log(kind, id, q, amt) { const m = M(); m.trades.unshift({ k: kind, id, q, amt, px: price(id), at: Date.now() }); if (m.trades.length > 40) m.trades.length = 40; }
  function buy(id, q) {
    if (window.timeLocked && timeLocked()) { toast('裝置時間異常，交易所暫停交易'); return; }
    if (!isOpen()) { toast('目前休市中（台灣時間每天 05:00 開盤、隔天 04:00 收盤）'); return; }
    q = Math.floor(q); if (q <= 0) return; const cost = Math.ceil(price(id) * q * (1 + FEE));
    const cap = dailyCap(), used = usedToday(); if (used + cost > cap) { toast(`今天的投入上限是 ${cap} 枚（已用 ${used} 枚），保護召喚用的寶藏幣`); return; }
    if (SAVE.data.tokens < cost) { toast(`寶藏幣不足：需要 ${cost} 枚`); return; }
    const h = M().hold[id] = M().hold[id] || { q: 0, cost: 0 }; SAVE.data.tokens -= cost; h.cost += cost; h.q += q; const U = M().used = M().used && M().used.day === M().day ? M().used : { day: M().day, n: 0 }; U.n += cost;
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
  function indexVal() { const m = M(); let a = 0, b = 0; BASIC.forEach(s => { a += m.s[s.id].px / s.base; b += m.s[s.id].prev / s.base; }); return { v: a / BASIC.length * 1000, c: (a - b) / b }; }

  /* ---------- 畫面 ---------- */
  const chg = id => { const S = M().s[id]; return (S.px - S.prev) / S.prev; };
  const cls = x => x > 0 ? 'up' : x < 0 ? 'dn' : '';
  const sgn = x => (x > 0 ? '+' : '') + (x * 100).toFixed(2) + '%';
  function emblem(s, size) { const c = s.cap && CHARACTERS[s.cap]; return `<span class="mk-emb" style="--ec:${s.color};width:${size}px;height:${size}px">${c ? `<img src="${typeof charArt === 'function' ? charArt(s.cap, 'avatar') : c.avatar}" alt="">` : `<b>${s.mark || s.name[0]}</b>`}</span>`; }
  function spark(arr, w = 64, h = 22) { if (!arr || arr.length < 2) return '<span class="mk-spark"></span>'; const mn = Math.min(...arr), mx = Math.max(...arr), up = arr[arr.length - 1] >= arr[0];
    return `<svg class="mk-spark" viewBox="0 0 ${w} ${h}"><polyline fill="none" stroke="${up ? '#ff5a5a' : '#3fd07a'}" stroke-width="1.6" points="${arr.map((v, i) => `${(i / (arr.length - 1) * w).toFixed(1)},${(h - 2 - (mx === mn ? .5 : (v - mn) / (mx - mn)) * (h - 4)).toFixed(1)}`).join(' ')}"/></svg>`; }
  function statusText() { const t = Date.now(), k = nowTick(t);
    if (k >= TICKS_DAY) { const nxt = sessionStart(tradeDay(t + 3600e3)), m = Math.max(1, Math.ceil((nxt - t) / 60000)); return `休市中（台灣時間 04:00～05:00）・${m} 分鐘後開盤`; }
    const left = Math.ceil((sessionStart(tradeDay(t)) + TICKS_DAY * TICK - t) / 60000); return `開盤中・台灣 ${twClock(t)}・距收盤 ${Math.floor(left / 60)} 小時 ${left % 60} 分`; }

  function render() {
    const root = $('xcBody'); if (!root) return; const m = M(), s = STOCKS.find(x => x.id === sel), S = m.s[sel], ix = indexVal(), open = isOpen();
    const hv = holdValue(), hc = holdCost(), h = m.hold[sel];
    const maxBuy = Math.max(0, Math.floor(Math.min(SAVE.data.tokens, dailyCap() - usedToday()) / (S.px * (1 + FEE)))), maxSell = h ? h.q : 0, qmax = Math.max(1, maxBuy, maxSell); qty = Math.min(Math.max(1, qty), qmax);
    root.innerHTML = `
      <div class="mk-top"><div class="mk-idx"><small>偉大航路指數</small><b class="${cls(ix.c)}">${fmt(ix.v)}</b><em class="${cls(ix.c)}">${sgn(ix.c)}</em></div>
        <div class="mk-st ${open ? 'on' : ''}"><i></i>${statusText()}</div>
        <div class="mk-wallet"><small>寶藏幣・今日可投入</small><b>${SAVE.data.tokens.toLocaleString()}</b><em>${Math.max(0, dailyCap() - usedToday())} / ${dailyCap()}</em></div>
        <div class="mk-wallet"><small>持股市值</small><b>${fmt(hv)}</b><em class="${cls(hv - hc)}">${hc ? sgn((hv - hc) / hc) : ''}</em></div></div>
      <nav class="mk-tabs">${[['market', '行情'], ['chart', '走勢・交易'], ['hold', '我的持股'], ['news', '新聞']].map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}</nav>
      <div class="mk-grid tab-${tab}">
        <section class="mk-list"><div class="mk-cats" role="tablist">${CATS.map(([k, n]) => `<button class="${cat === k ? 'on' : ''}" data-cat="${k}">${n}</button>`).join('')}</div>${STOCKS.filter(x => cat === 'all' || (cat === 'hold' ? m.hold[x.id] : x.cat === cat)).map(x => { const X = m.s[x.id], c = chg(x.id); return `<button class="mk-row ${x.id === sel ? 'on' : ''}" data-sel="${x.id}">${emblem(x, 34)}<span class="mk-nm"><b>${x.name}</b><small>${x.code}${m.hold[x.id] ? `・持有 ${m.hold[x.id].q}` : ''}</small></span>${spark(X.min.length > 2 ? X.min.slice(-60) : X.days.slice(-20).map(d => d[3]))}<span class="mk-px ${cls(c)}"><b>${fmt(X.px)}</b><small>${sgn(c)}</small></span></button>`; }).join('') || '<p class="mk-empty" style="padding:12px">這個分類目前沒有標的。</p>'}</section>
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
          <div class="mk-news"><h4>即時新聞</h4>${m.news.slice(0, 18).map(n => `<p class="${n.clar ? 'clar' : n.up ? 'up' : 'dn'}" ${n.id ? `data-sel="${n.id}"` : ''}><time>${new Date(n.at).toTimeString().slice(0, 5)}</time>${n.clar ? '🔎 ' : n.macro ? '🌐 ' : n.up ? '📈 ' : '📉 '}${n.t}</p>`).join('') || '<p class="mk-empty">開盤後會陸續出現新聞。</p>'}</div>
        </section>
      </div>
      <p class="mk-note">交易時間：台灣時間每天 05:00 開盤、隔天 04:00 收盤（04:00～05:00 休市），盤中每 5 秒跳價。手續費 0.1425%、賣出另收 0.3% 交易稅；漲跌停 ±10%；紅漲綠跌。新聞約每 2 小時一則，會帶動接下來幾十秒的股價，少數是假消息，之後會被澄清並反轉。ETF 依成分股計算；期貨對國際快訊特別敏感。本交易所與原作劇情無關。</p>`;
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
    const S = M().s[sel], pad = { l: 8, r: 58, t: 26, b: 18 }, cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
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
  function loop() { live = true; advance(); live = false; if (currentScreen === 'exchangeScreen') { const ae = document.activeElement; if (!ae || ae.id !== 'mkQty') render(); } SAVE.save(); }

  /* 第一次進入：三步驟教學 */
  function tutorial() { if (SAVE.data.mktTut) return; const steps = [['① 挑標的', '左邊（手機在「行情」分頁）是 37 檔海賊團、海軍、國家、ETF 與期貨。上方分類可以切換，紅色是上漲、綠色是下跌。'], ['② 看走勢・聽新聞', '中間是走勢圖，每 5 秒跳一次價。上方滑出「突發新聞」時，該標的接下來幾十秒會明顯漲跌；少數是假消息，之後會被澄清並反轉。'], ['③ 買進・賣出', `拉數量滑桿，按紅色「買進」或綠色「賣出」。每天最多投入 ${dailyCap()} 枚寶藏幣（航海等級越高越多），賣出的寶藏幣隨時可以拿去召喚。`]]; let i = 0;
    const box = document.createElement('div'); box.className = 'dl-wrap'; const draw = () => { box.innerHTML = `<div class="dl-card mk-tut"><img src="assets/ui/exchange_logo.webp?v=59" alt=""><h3>${steps[i][0]}</h3><p>${steps[i][1]}</p><div class="mk-tut-dots">${steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div><button class="btn-gold big" id="mkTutNext">${i < steps.length - 1 ? '下一步' : '開始交易'}</button></div>`; box.querySelector('#mkTutNext').onclick = () => { if (++i >= steps.length) { SAVE.data.mktTut = true; SAVE.save(); box.remove(); } else draw(); }; }; draw(); document.body.appendChild(box); }
  window.openExchange = function () { init(); advance(); showScreen('exchangeScreen'); render(); tutorial(); clearInterval(timer); timer = setInterval(() => { if (currentScreen !== 'exchangeScreen') { clearInterval(timer); timer = null; return; } loop(); }, TICK); };
  window.addEventListener('DOMContentLoaded', () => { const b = $('xcBack'); if (b) b.onclick = () => openModes(); addEventListener('resize', () => { if (currentScreen === 'exchangeScreen') drawChart(); }); });
  window.mkSummary = () => { try { if (!SAVE.data.mkt) return '尚未進場'; advance(); const ix = indexVal(); return `指數 ${fmt(ix.v)}（${sgn(ix.c)}）`; } catch (e) { return ''; } };
  window.__mk = { advance, step: () => { live = true; step(M()); live = false; }, buy, sell, M, STOCKS, isOpen, newsEvent: () => newsEvent(M(), false), render };
})();
