/* 每日系統：七日登入獎勵、每天補給掃蕩卷、通關掃蕩、定期提醒匯出存檔 */
(function () {
  const inv = () => (SAVE.data.inventory = SAVE.data.inventory || {});

  /* ---------- 匯出存檔（大廳提醒與選單共用） ---------- */
  function exportSave() {
    const blob = new Blob([JSON.stringify({ game: 'op_voyage', v: DATA_VERSION, at: new Date().toISOString(), save: SAVE.data })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `偉大航路存檔_${today()}.json`; document.body.appendChild(a); a.click(); a.remove();
    SAVE.data.lastExport = Date.now(); SAVE.save(); toast('已匯出存檔，請妥善保存這個檔案', 'gold');
  }
  window.exportSave = exportSave;

  /* ---------- 每天補給掃蕩卷 ---------- */
  function dailySweep() {
    if (window.timeLocked && timeLocked()) return 0;
    const d = SAVE.data, day = today(); if (d.sweepDay === day) return 0;
    d.sweepDay = day; const n = GAME_SETTINGS.sweepDaily || 5; inv().sweep = (inv().sweep || 0) + n; SAVE.save(); return n;
  }

  /* ---------- 七日登入 ---------- */
  function loginState() { return (SAVE.data.login = SAVE.data.login || { day: 0, last: '' }); }
  function canClaim() { return !(window.timeLocked && timeLocked()) && loginState().last !== today(); }
  function grantReward(R) {
    const out = [];
    if (R.berry) { addBerry(R.berry); out.push(`貝里 ${R.berry.toLocaleString()}`); }
    if (R.tokens) { addTokens(R.tokens, '七日登入'); out.push(`寶藏幣 ×${R.tokens}`); }
    if (R.items) Object.entries(R.items).forEach(([k, n]) => { inv()[k] = (inv()[k] || 0) + n; out.push(`${ITEMS[k].name} ×${n}`); });
    if (R.tickets) { try { const E = eventState(); E.tickets += R.tickets; out.push(`活動抽獎券 ×${R.tickets}`); } catch (e) { addTokens(1, '七日登入'); out.push('寶藏幣 ×1'); } }
    SAVE.save(); coins(); return out;
  }
  function openLogin(auto) {
    const L = loginState(), ok = canClaim();
    const icon = R => R.items ? (() => { const k = Object.keys(R.items)[0]; return ITEMS[k] ? itemIcon(ITEMS[k]) : '<em>🎁</em>'; })() : R.tickets ? '<em>🎟</em>' : R.tokens ? '<em>🪙</em>' : '<em>💰</em>';
    const box = document.createElement('div'); box.className = 'dl-wrap lg7-wrap'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', '七日登入獎勵');
    box.innerHTML = `<div class="lg7"><button class="icon-btn sm lg7-x" data-x aria-label="關閉">×</button>
      <header class="lg7-head"><img src="assets/ui/login_reward.webp?v=48" alt=""><div><h3><span>七</span>日之約</h3><p>每天登入領一次，第 7 天領完後重新開始。${ok ? '' : '<br><b>今天已經領過了，明天 00:00 再來！</b>'}</p></div></header>
      <ol class="lg7-row">${LOGIN_REWARDS.map((R, i) => { const st = i < L.day ? 'got' : i === L.day ? (ok ? 'now' : 'next') : ''; return `<li class="lg7-day ${st} ${R.big || i === LOGIN_REWARDS.length - 1 ? 'big' : ''}" style="--d:${i * .06}s"><span class="lg7-n">${R.day}</span><span class="lg7-ic">${icon(R)}</span><b>${R.label}</b>${st === 'got' ? '<span class="lg7-ok" aria-label="已領取">✔</span>' : ''}${st === 'now' ? '<span class="lg7-now">今日可領</span>' : st === 'next' ? '<span class="lg7-nx">明天</span>' : ''}</li>`; }).join('')}</ol>
      <div class="lg7-foot"><small>已累積登入 ${SAVE.data.loginTotal || 0} 天</small><button class="btn-gold big" id="dlClaim" ${ok ? '' : 'disabled'}>${ok ? `領取第 ${L.day + 1} 天獎勵` : '明天再來'}</button></div></div>`;
    document.body.appendChild(box); if (window.fixIcons) fixIcons(box);
    const close = () => box.remove();
    box.querySelector('[data-x]').onclick = close; box.onclick = e => { if (e.target === box) close(); };
    const c = box.querySelector('#dlClaim'); if (ok) c.onclick = () => {
      const R = LOGIN_REWARDS[L.day], got = grantReward(R); L.last = today(); L.day = (L.day + 1) % LOGIN_REWARDS.length; SAVE.data.loginTotal = (SAVE.data.loginTotal || 0) + 1; SAVE.save();
      close(); if (window.renderLobby) renderLobby();
      const list = []; if (R.berry) list.push({ name: '貝里', count: R.berry, emoji: '💰' }); if (R.tokens) list.push({ name: '寶藏幣', count: R.tokens, emoji: '🪙', rar: 'SR' }); if (R.items) Object.entries(R.items).forEach(([k, n]) => list.push({ item: k, count: n })); if (R.tickets) list.push({ name: '活動抽獎券', count: R.tickets, emoji: '🎟', rar: 'SSR' });
      if (window.showRewards) showRewards({ title: '恭喜獲得', sub: `七日登入・第 ${R.day} 天` }, list); else toast(`登入獎勵：${got.join('、')}`, 'gold');
    };
  }
  window.openLogin = openLogin; window.loginClaimable = canClaim;

  /* ---------- 通關掃蕩：篇章裡有幾場戰鬥（一般戰、連戰、奪鑰、對決、BOSS），掃蕩一次就需要幾張 ---------- */
  function sweepBattles(c) { const out = { fights: 0, bosses: 0 }; c.steps.forEach(s => { if (['defeat', 'gauntlet', 'keys'].includes(s.type)) out.fights += s.count || 1; if (s.type === 'duel' || s.type === 'boss') out.bosses += 1; }); out.total = out.fights + out.bosses; return out; }
  window.sweepCost = id => sweepBattles(CHAPTERS.find(x => x.id === id)).total;
  function sweepChapter(id, runs) {
    const c = CHAPTERS.find(x => x.id === id), st = SAVE.data.chapters[id]; if (!c || !st.cleared) return;
    const B = sweepBattles(c), need = B.total * runs, have = inv().sweep || 0;
    if (have < need) { toast(`掃蕩卷不足：需要 ${need} 張，目前 ${have} 張（每天 00:00 補給 5 張，懸賞召喚也抽得到）`); return; }
    inv().sweep = have - need;
    const elv = ENEMY_LEVEL[id] || 1, lineup = SAVE.data.lineup || [], lead = lineup[0] || SAVE.data.player;
    let berry = 0, exp = 0; const drops = {};
    for (let k = 0; k < runs; k++) {
      /* 一般戰鬥：一場的獎勵；BOSS 與對決：三倍獎勵 */
      const units = B.fights + B.bosses * 3; berry += Math.round((80 + elv * 10) * units); exp += Math.round((30 + elv * 6) * units);
      for (let f = 0; f < B.total; f++) { const r = Math.random(); if (r < .5) { const x = rollOne(r < .06 ? 'SR' : undefined); if (x.item && !ITEMS[x.item].effect.sweep) drops[x.item] = (drops[x.item] || 0) + 1; } }
    }
    addBerry(berry); if (lead) gainExp(lead, exp, true); lineup.filter(x => x !== lead).forEach(x => gainExp(x, Math.round(exp * (1 - GAME_SETTINGS.shareExp)), true));
    Object.entries(drops).forEach(([k, n]) => { inv()[k] = (inv()[k] || 0) + n; });
    track('wins', B.total * runs); track('sweeps', B.total * runs); SAVE.save(); coins();
    const lines = [`掃蕩「${c.name}」×${runs}（共 ${B.total * runs} 場戰鬥，其中 BOSS ${B.bosses * runs} 場），使用掃蕩卷 ${need} 張`, `貝里 +${berry.toLocaleString()}`, `出戰陣容經驗 +${exp.toLocaleString()}（先鋒全額，其他人 ${Math.round((1 - GAME_SETTINGS.shareExp) * 100)}%）`, Object.keys(drops).length ? '掉落：' + Object.entries(drops).map(([k, n]) => `${ITEMS[k].name} ×${n}`).join('、') : '這次沒有掉落道具', `剩餘掃蕩卷：${inv().sweep}`];
    SFX.play('quest'); storyCard('掃蕩完成', lines, '好', () => { if (typeof selectChapter === 'function') selectChapter(id); });
  }
  window.sweepChapter = sweepChapter;

  /* ---------- 進入大廳時：補給、登入獎勵、匯出提醒 ---------- */
  function onLobby() {
    /* 新版本加入的「通關獎勵角色」，已通關的玩家直接補發 */
    try { Object.entries(CHAR_OBTAIN).forEach(([cid, o]) => { if (o.reward && SAVE.data.chapters[o.reward] && SAVE.data.chapters[o.reward].cleared && !owned(cid)) { addCrew(cid, 10); setTimeout(() => toast(`通關獎勵補發：${CHARACTERS[cid].name} 加入了你的船隊！`, 'gold'), 1200); } }); } catch (e) { }
    try { grantCombos(); } catch (e) { }
    try { grantSkins().forEach(k => setTimeout(() => toast(`獲得皮膚「${SKINS[k].name}」！可在角色背包裝備`, 'gold'), 1400)); } catch (e) { }
    const n = dailySweep(); if (n) setTimeout(() => toast(`每日補給：掃蕩卷 ×${n}`, 'gold'), 600);
    if (canClaim() && !openLogin._shownDay) { openLogin._shownDay = today(); setTimeout(() => { if (currentScreen === 'modeScreen' && !document.querySelector('.dl-wrap')) openLogin(true); }, 900); }
    const d = SAVE.data, last = d.lastExport || 0, played = (d.pulls || 0) + CHAPTERS.filter(c => d.chapters[c.id].step > 0).length;
    const bar = $('lbBackup'); if (bar) bar.hidden = !(played > 2 && Date.now() - last > 7 * 864e5);
  }
  window.addEventListener('DOMContentLoaded', () => {
    const om = window.openModes; if (om) window.openModes = function () { const r = om.apply(this, arguments); try { onLobby(); } catch (e) { } return r; };
    const lb = $('lbLogin'); if (lb) lb.onclick = () => openLogin(false);
    const bk = $('lbBackupBtn'); if (bk) bk.onclick = exportSave;
    /* 盡量讓瀏覽器把存檔標記為「持久保存」，降低被自動清除的機會 */
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }
    /* 跨裝置：iOS Safari 的兩指縮放與雙擊放大會打斷遊戲操作，全站關閉（文字大小仍可用系統設定調整） */
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
    document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
    /* 可安裝的網頁 App（加入主畫面）：離線可玩、第二次開啟更快，iOS 也較不會清除存檔 */
    try { if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js', { scope: './' }); } catch (e) { }
    /* 省流量：行動網路很慢或開啟「省數據」時，登入頁改用靜態圖，不下載影片 */
    try { const c = navigator.connection; if (c && (c.saveData || /(^|-)2g|3g/.test(c.effectiveType || ''))) { const v = $('loginVideo'); if (v) { v.pause(); v.querySelectorAll('source').forEach(s => s.remove()); v.removeAttribute('autoplay'); v.load(); } } } catch (e) { }
  });
})();
