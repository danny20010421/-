/* 關卡挑戰・困難模式：通關劇情後解鎖。不走島上劇情，直接連續挑戰該篇章的戰鬥（體力與技能次數延續）。
   評星：★1 通關；★2 全程沒有船員倒下；★3 總回合數在限制內。每顆星首次達成各有獎勵（HARD_MODE.rewards，可自行修改）。 */
const HARD_MODE = {
  lvUp: 15,            /* 敵人等級加成 */
  hp: 1.35,            /* 敵人體力倍率 */
  stages: 1,           /* 敵人攻防速額外階級 */
  maxFights: 5,        /* 每篇最多幾場 */
  roundsPerFight: 7,   /* ★3：總回合數 ≤ 場數 × 這個數字 */
  rewards: {           /* 每顆星首次達成的獎勵（之後可以換成你想送的東西） */
    1: { tokens: 5, berry: 5000 },
    2: { items: { sweep: 3 }, berry: 5000 },
    3: { tokens: 10, items: { exp_l: 1 } }
  }
};
(function () {
  const H = HARD_MODE;
  const st = () => (SAVE.data.hard = SAVE.data.hard || {});
  const starsOf = id => (st()[id] && st()[id].stars) || 0;
  /* 這一篇的戰鬥清單：對決＋BOSS，再用篇章的小兵補到上限（依篇章固定挑選） */
  function fightsOf(c) {
    const duels = c.steps.filter(s => s.type === 'duel').map(s => ({ id: s.enemy, boss: false })), boss = { id: c.boss, boss: true };
    const ex = new Set([c.boss, 'imu', ...duels.map(d => d.id), ...STARTERS, ...(c.exclude || [])]);
    const pool = CHARACTER_ORDER.filter(id => !ex.has(id) && !((CHAR_OBTAIN[id] || {}).npcOnly) && !((CHAR_OBTAIN[id] || {}).reward === '_emperor'));
    let seed = [...c.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 11) % 2147483647 || 1; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const minions = Math.max(1, Math.min(3, H.maxFights - duels.length - 1));
    return [...pool.slice(0, minions).map(id => ({ id, boss: false })), ...duels.slice(0, H.maxFights - 1 - minions), boss];
  }
  const lvOf = (c, f) => Math.min(MAX_LV, (ENEMY_LEVEL[c.id] || 30) + H.lvUp + (f.boss ? BOSS_LEVEL_BONUS + ((CHAPTER_DIFFICULTY[c.id] || {}).bossLvUp || 0) : 0));
  const rewardText = R => [R.tokens ? `寶藏幣 ×${R.tokens}` : '', R.berry ? `貝里 ${R.berry.toLocaleString()}` : '', ...Object.entries(R.items || {}).map(([k, n]) => `${ITEMS[k] ? ITEMS[k].name : k} ×${n}`)].filter(Boolean).join('、');
  const starRow = n => `<span class="hm-stars">${[1, 2, 3].map(k => `<i class="${k <= n ? 'on' : ''}">★</i>`).join('')}</span>`;
  let RUN = null;
  function block(c) {
    const fs = fightsOf(c), n = starsOf(c.id), lim = fs.length * H.roundsPerFight;
    return `<div class="hm-box"><div class="hm-head"><b>困難模式</b>${starRow(n)}</div>
      <p class="hm-foes">${fs.map(f => `<img src="${CHARACTERS[f.id].avatar}" alt="" title="${CHARACTERS[f.id].name}・LV ${lvOf(c, f)}" class="${f.boss ? 'boss' : ''}">`).join('<i>›</i>')}</p>
      <ul class="hm-rules"><li class="${n >= 1 ? 'ok' : ''}">★ 連續擊敗 ${fs.length} 場（體力延續）<small>${rewardText(H.rewards[1])}</small></li><li class="${n >= 2 ? 'ok' : ''}">★★ 全程沒有船員倒下<small>${rewardText(H.rewards[2])}</small></li><li class="${n >= 3 ? 'ok' : ''}">★★★ 總回合數 ${lim} 以內<small>${rewardText(H.rewards[3])}</small></li></ul>
      <button class="btn-gold" id="hmGo">挑戰困難模式</button></div>`;
  }
  function begin(c) {
    if (SAVE.data.lineup.some(id => typeof isTraining === 'function' && isTraining(id))) { toast('出戰陣容中有船員正在訓練營'); return; }
    RUN = { c, fs: fightsOf(c), i: 0, rounds: 0, ko: false, team: SAVE.data.lineup.map(id => ({ id, lv: crewLv(id) })) }; fight();
  }
  function fight() {
    const R = RUN, f = R.fs[R.i];
    startBattle({ team: R.team, enemyId: f.id, enemyLv: lvOf(R.c, f), enemyMod: { hp: H.hp, atk: H.stages, def: H.stages, spd: H.stages }, chapterId: R.c.id, isBoss: f.boss, onEnd: r => end(r), onLeave: () => openChart(R.c.id) });
    log(`困難模式：${R.c.name} 第 ${R.i + 1}/${R.fs.length} 場`);
  }
  function end(r) {
    const R = RUN; if (!R) return {}; R.rounds += r.rounds || 0; if ((r.team || []).some(t => t.hp <= 0)) R.ko = true;
    if (!r.win) { RUN = null; return { message: '困難模式挑戰失敗……調整陣容、升級船員後再來吧！', alt: { label: '返回海圖', fn: () => openChart(R.c.id) } }; }
    track('wins'); if (r.isBoss) track('bossWins');
    if (R.i < R.fs.length - 1) { R.team = teamSnapshot().map((t, k) => ({ ...t, lv: R.team[k].lv })); R.i++; const nx = R.fs[R.i];
      return { message: `第 ${R.i}/${R.fs.length} 場勝利！（累計 ${R.rounds} 回合）<br>下一位：<b>${CHARACTERS[nx.id].name}</b>${nx.boss ? '（BOSS）' : ''}`, next: { label: '迎戰下一位', fn: () => fight() } }; }
    RUN = null; const lim = R.fs.length * H.roundsPerFight, got = 1 + (R.ko ? 0 : 1) + (R.rounds <= lim ? 1 : 0);
    const S = st()[R.c.id] = st()[R.c.id] || { stars: 0, best: 0 }, prev = S.stars, msgs = [`困難模式通關！共 ${R.rounds} 回合 ${starRow(got)}`];
    /* 星星分開計算：同一顆星只要達成過一次就保留 */
    const earned = new Set(S.got || []); earned.add(1); if (!R.ko) earned.add(2); if (R.rounds <= lim) earned.add(3);
    [1, 2, 3].forEach(k => { if (earned.has(k) && !(S.got || []).includes(k)) { const Rw = H.rewards[k]; if (Rw.tokens) addTokens(Rw.tokens, '困難模式'); if (Rw.berry) addBerry(Rw.berry); Object.entries(Rw.items || {}).forEach(([it, n]) => { SAVE.data.inventory[it] = (SAVE.data.inventory[it] || 0) + n; }); msgs.push(`${'★'.repeat(k)} 首次達成：${rewardText(Rw)}`); } });
    S.got = [...earned].sort(); S.stars = Math.max(prev, S.got.length); S.best = S.best ? Math.min(S.best, R.rounds) : R.rounds;
    SAVE.data.lineup.forEach(id => gainExp(id, 300 + (ENEMY_LEVEL[R.c.id] || 30) * 8, true)); SAVE.save(); coins();
    if (R.ko) msgs.push('<small>有船員倒下，★★ 未達成</small>'); if (R.rounds > lim) msgs.push(`<small>超過 ${lim} 回合，★★★ 未達成</small>`);
    return { message: msgs.join('<br>'), next: { label: '返回海圖', fn: () => openChart(R.c.id) } };
  }
  /* 在海圖的篇章卡片加上困難模式區塊；海圖節點顯示星數 */
  const _sel = selectChapter;
  selectChapter = function (id) {
    _sel(id); const c = CHAPTERS.find(x => x.id === id), cs = SAVE.data.chapters[id];
    if (c && cs && cs.cleared) { const box = document.createElement('div'); box.innerHTML = block(c); const host = $('arcCard').querySelector('.arc-body') || $('arcCard'); host.appendChild(box.firstElementChild); $('hmGo').onclick = () => begin(c); }
  };
  const _oc = openChart;
  openChart = function (focus) { _oc(focus); document.querySelectorAll('#chartNodes .node').forEach(n => { const k = starsOf(n.dataset.id); if (k) { const s = document.createElement('i'); s.className = 'node-hm'; s.textContent = '★'.repeat(k); n.appendChild(s); } }); };
  window.hardStars = starsOf;
})();
