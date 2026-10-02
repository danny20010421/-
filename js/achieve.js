/* 成就：把「冒險／收藏／經濟」三條主線串在一起。每條線的成就獎勵，都是另一條線需要的資源：
   冒險 → 寶藏幣（拿去召喚）；收藏 → 貝里與掃蕩卷（拿去培養與推進）；經濟 → 抽獎券與選擇卷（拿去收藏）。 */
(function () {
  const d = () => SAVE.data, st = () => d().stats || {};
  const cleared = () => CHAPTERS.filter(c => (d().chapters[c.id] || {}).cleared).length;
  const crew = () => Object.keys(d().roster || {}).length;
  const ur = () => Object.keys(d().roster || {}).filter(id => CHAR_RARITY[id] === 'UR').length;
  const skins = () => ((d().skins || {}).owned || []).length;
  const sets = () => COLLECTION_SETS.filter(S => S.members.every(id => (d().roster || {})[id])).length;
  const poneg = () => ((d().treasure || {}).found || []).length;
  const maxLv = () => Math.max(1, ...Object.values(d().roster || {}).map(r => r.lv || 1));
  const profit = () => Math.max(0, Math.round(((d().mkt || {}).realized) || 0));
  const LINES = {
    adv: { name: '冒險', color: '#e8b64a', reward: '寶藏幣', items: [
      ['adv1', '第一座島', '通關 1 個篇章', () => cleared(), 1, { tokens: 5 }], ['adv2', '偉大航路前半段', '通關 5 個篇章', () => cleared(), 5, { tokens: 15 }], ['adv3', '航向新世界', `通關全部 ${CHAPTERS.length} 個篇章`, () => cleared(), CHAPTERS.length, { tokens: 40 }],
      ['adv4', '身經百戰', '戰鬥勝利 100 場', () => st().wins || 0, 100, { tokens: 10 }], ['adv5', '千場傳說', '戰鬥勝利 1000 場', () => st().wins || 0, 1000, { tokens: 30 }],
      ['adv6', '登塔者', '勇者之塔最高到達第 30 層', () => (d().tower || {}).best || 0, 30, { tokens: 15 }], ['adv7', '塔頂之人', '勇者之塔最高到達第 100 層', () => (d().tower || {}).best || 0, 100, { tokens: 40 }],
      ['adv8', '王座挑戰者', '虛空王座累積傷害 100 萬', () => (d().throne || {}).best || 0, 1e6, { tokens: 20 }], ['adv9', '划向遠方', '奪寶大冒險跑到 3000 公尺', () => (d().runner || {}).best || 0, 3000, { tokens: 10 }] ] },
    col: { name: '收藏', color: '#ff7ad9', reward: '貝里・掃蕩卷', items: [
      ['col1', '招募夥伴', '擁有 5 位船員', crew, 5, { berry: 5000, sweep: 3 }], ['col2', '大船團', '擁有 15 位船員', crew, 15, { berry: 20000, sweep: 5 }], ['col3', '海上霸主', '擁有 30 位船員', crew, 30, { berry: 50000, sweep: 10 }],
      ['col4', '傳說級', '擁有 3 位 UR 船員', ur, 3, { berry: 20000, sweep: 5 }], ['col5', '換裝達人', '擁有 3 款皮膚', skins, 3, { berry: 10000, sweep: 3 }],
      ['col6', '羈絆', '開通 3 組圖鑑羈絆', sets, 3, { berry: 15000, sweep: 5 }], ['col7', '歷史的解讀者', '解讀 3 塊歷史本文', poneg, 3, { berry: 20000, sweep: 5 }], ['col8', '登峰造極', '任一船員達到 LV 100', maxLv, 100, { berry: 30000, sweep: 10 }] ] },
    eco: { name: '經濟', color: '#5fe09a', reward: '抽獎券・選擇卷', items: [
      ['eco1', '第一筆獲利', '交易所累積已實現獲利 100 枚寶藏幣', profit, 100, { tickets: 3 }], ['eco2', '大海賊投資家', '交易所累積已實現獲利 1000 枚寶藏幣', profit, 1000, { tickets: 10, skinTicket: 1 }],
      ['eco3', '召喚師', '累積召喚 100 次', () => d().pulls || 0, 100, { tickets: 5 }], ['eco4', '懸賞獵人', '領取懸賞獎勵 30 次', () => st().bounty || 0, 30, { tickets: 5 }],
      ['eco5', '每日航海', '七日登入累積領取 14 次', () => d().loginTotal || 0, 14, { tickets: 5 }], ['eco6', '掃蕩專家', '掃蕩 50 場戰鬥', () => st().sweeps || 0, 50, { tickets: 3 }] ] }
  };
  const A = () => (d().achieve = d().achieve || { got: [] });
  function grant(rw) { const out = [];
    if (rw.tokens) { addTokens(rw.tokens, '成就'); out.push(`寶藏幣 ×${rw.tokens}`); }
    if (rw.berry) { addBerry(rw.berry); out.push(`貝里 ${rw.berry.toLocaleString()}`); }
    if (rw.sweep) { d().inventory.sweep = (d().inventory.sweep || 0) + rw.sweep; out.push(`掃蕩卷 ×${rw.sweep}`); }
    if (rw.skinTicket) { d().inventory.skin_ticket = (d().inventory.skin_ticket || 0) + rw.skinTicket; out.push(`限定皮膚選擇卷 ×${rw.skinTicket}`); }
    if (rw.tickets) { try { eventState().tickets += rw.tickets; out.push(`活動抽獎券 ×${rw.tickets}`); } catch (e) { addTokens(rw.tickets, '成就'); out.push(`寶藏幣 ×${rw.tickets}`); } }
    SAVE.save(); coins(); return out; }
  const all = () => Object.values(LINES).flatMap(L => L.items);
  window.achieveClaimable = () => all().filter(([id, , , f, goal]) => !A().got.includes(id) && f() >= goal).length;
  window.openAchievements = function (line) {
    line = line || 'adv'; const L = LINES[line];
    const box = document.querySelector('.ach-wrap') || document.body.appendChild(Object.assign(document.createElement('div'), { className: 'dl-wrap ach-wrap' }));
    const rows = L.items.map(([id, name, desc, f, goal, rw]) => { const v = f(), done = v >= goal, got = A().got.includes(id), pct = Math.min(100, v / goal * 100);
      return `<div class="ach-row ${got ? 'got' : done ? 'ready' : ''}"><div><b>${name}</b><small>${desc}</small><span class="ach-bar"><i style="width:${pct}%;background:${L.color}"></i></span><em>${Math.min(v, goal).toLocaleString()} / ${goal.toLocaleString()}</em></div><button class="${done && !got ? 'btn-gold' : 'btn-ghost'} sm" data-ach="${id}" ${done && !got ? '' : 'disabled'}>${got ? '已領取' : done ? '領取' : '未達成'}</button></div>`; }).join('');
    const cnt = k => LINES[k].items.filter(([id, , , f, goal]) => !A().got.includes(id) && f() >= goal).length;
    box.innerHTML = `<div class="dl-card ach-card"><header><h3>成就</h3><button class="icon-btn sm" data-x aria-label="關閉">×</button></header>
      <p class="dl-sub">三條主線互相支援：冒險的獎勵拿去召喚、收藏的獎勵拿去培養、經濟的獎勵拿去收藏。</p>
      <nav class="ach-tabs">${Object.entries(LINES).map(([k, X]) => `<button class="${k === line ? 'on' : ''}" data-line="${k}" style="--lc:${X.color}">${X.name}<small>獎勵：${X.reward}</small>${cnt(k) ? `<i>${cnt(k)}</i>` : ''}</button>`).join('')}</nav>
      <div class="ach-list">${rows}</div></div>`;
    if (window.fixIcons) fixIcons(box);
    box.querySelector('[data-x]').onclick = () => box.remove(); box.onclick = e => { if (e.target === box) box.remove(); };
    box.querySelectorAll('[data-line]').forEach(b => b.onclick = () => openAchievements(b.dataset.line));
    box.querySelectorAll('[data-ach]:not([disabled])').forEach(b => b.onclick = () => { const it = all().find(x => x[0] === b.dataset.ach); if (!it || A().got.includes(it[0])) return; A().got.push(it[0]); const got = grant(it[5]); SFX.play('rare'); toast(`成就「${it[1]}」：${got.join('、')}`, 'gold'); openAchievements(line); if (window.renderLobby) renderLobby(); });
  };
})();
