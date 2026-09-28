/* 勇者之塔：120 層，每 10 層一位 BOSS，每層都有獎勵 */
(function () {
  const TIER = ['east', 'alabasta', 'skypiea', 'enies', 'dark', 'fishman', 'wano', 'giant'];
  const state = () => { SAVE.data.tower = SAVE.data.tower || { floor: 1, best: 0 }; return SAVE.data.tower; };
  const isBoss = f => f % 10 === 0;
  function foeOf(f) {
    if (isBoss(f)) return TOWER.bosses[(f / 10 - 1) % TOWER.bosses.length];
    const pool = CHARACTER_ORDER.filter(id => !STARTERS.includes(id)); return pool[(f * 7 + 3) % pool.length];
  }
  const lvOf = f => Math.min(MAX_LV, Math.round(6 + f * .85 + (isBoss(f) ? 4 : 0)));
  const chapterOf = f => TIER[Math.min(TIER.length - 1, Math.floor((f - 1) / 15))];
  function rewardOf(f) {
    const r = { berry: 60 + f * 15, items: {}, tokens: 0 };
    if (f % 5 === 0) r.items.exp_s = 1;
    if (isBoss(f)) { r.tokens = 2; r.items.exp_m = 1; }
    if (f === 50 || f === 100) { r.items.exp_l = 1; r.tokens += 5; }
    if (f === 120) { r.items.exp_l = 3; r.tokens += 20; }
    return r;
  }
  const rewardText = r => [`貝里 ${r.berry.toLocaleString()}`, r.tokens ? `寶藏幣 ×${r.tokens}` : '', ...Object.entries(r.items).map(([k, n]) => `${ITEMS[k].name} ×${n}`)].filter(Boolean).join('、');

  function render() {
    const s = state(), cur = Math.min(TOWER.floors, s.floor), done = s.floor > TOWER.floors;
    $('twSub').textContent = done ? '已登頂 120 層！' : `目前第 ${cur} 層・最高紀錄 ${s.best} 層`;
    const from = Math.max(1, Math.min(TOWER.floors - 11, cur - 3)), rows = [];
    for (let f = Math.min(TOWER.floors, from + 11); f >= from; f--) {
      const st = f < s.floor ? 'clear' : f === cur && !done ? 'now' : 'lock', c = CHARACTERS[foeOf(f)];
      rows.push(`<li class="tw-f ${st} ${isBoss(f) ? 'boss' : ''}" data-f="${f}"><span class="tw-no">${f}</span><img src="${c.avatar}" alt=""><span class="tw-n"><b>${isBoss(f) ? 'BOSS・' : ''}${c.name}</b><small>LV ${lvOf(f)}</small></span><i class="tw-st">${st === 'clear' ? '✓' : st === 'now' ? '挑戰中' : '🔒'}</i></li>`);
    }
    $('twFloors').innerHTML = rows.join('');
    const f = cur, c = CHARACTERS[foeOf(f)], r = rewardOf(f), L = lvStats(c, lvOf(f));
    $('twPanel').innerHTML = done ? `<div class="tw-done"><h3>🏆 登頂成功</h3><p>你已經打敗了勇者之塔的所有對手。</p><button class="btn-ghost" id="twReset">重新挑戰（不再給獎勵）</button></div>` :
      `<div class="tw-foe ${isBoss(f) ? 'boss' : ''}"><div class="tw-art"><img src="${c.image}" alt=""></div>
        <div class="tw-info"><small>第 ${f} 層${isBoss(f) ? '・BOSS 層' : ''}</small><h3>${c.name}</h3><p class="tw-lv">LV ${lvOf(f)}・${c.title}</p>
        <div class="tw-stats"><span>體力 <b>${L.hp}</b></span><span>攻擊 <b>${L.atk}</b></span><span>防禦 <b>${L.def}</b></span><span>速度 <b>${L.spd}</b></span></div>
        <p class="tw-rew">過關獎勵：<b>${rewardText(r)}</b></p>
        <p class="tw-team">出戰陣容：${SAVE.data.lineup.map(id => `<img src="${CHARACTERS[id].avatar}" alt="${CHARACTERS[id].name}" title="${CHARACTERS[id].name}">`).join('')}</p>
        <button class="btn-primary big" id="twGo">挑戰第 ${f} 層</button></div></div>`;
    const go = $('twGo'); if (go) go.onclick = () => fight(f);
    const rs = $('twReset'); if (rs) rs.onclick = () => { s.floor = 1; s.replay = true; SAVE.save(); render(); };
  }
  function fight(f) {
    const s = state();
    startBattle({ team: SAVE.data.lineup.map(id => ({ id, lv: crewLv(id) })), enemyId: foeOf(f), enemyLv: lvOf(f), chapterId: chapterOf(f), isBoss: isBoss(f), revives: isBoss(f) ? 1 : 0,
      onEnd: r => {
        if (!r.win) return { message: `第 ${f} 層挑戰失敗。調整陣容、升級船員後再來挑戰吧！` };
        track('wins'); if (isBoss(f)) track('bossWins');
        const first = f > (s.best || 0) && !s.replay, rw = rewardOf(f);
        s.floor = f + 1; s.best = Math.max(s.best || 0, f); SAVE.save();
        const lines = [`突破第 ${f} 層！`];
        if (first) { addBerry(rw.berry); if (rw.tokens) addTokens(rw.tokens, '勇者之塔'); Object.entries(rw.items).forEach(([k, n]) => { SAVE.data.inventory[k] = (SAVE.data.inventory[k] || 0) + n; }); SAVE.data.lineup.forEach(id => gainExp(id, 40 + f * 12, true)); SAVE.save(); lines.push(`獲得 ${rewardText(rw)}`); }
        if (window.checkTitles) checkTitles(false);
        return { message: lines.join('<br>'), next: f < TOWER.floors ? { label: `繼續挑戰第 ${f + 1} 層`, fn: () => fight(f + 1) } : null };
      },
      onLeave: () => openTower() });
  }
  window.openTower = function () { if (typeof coins === 'function') coins(); render(); showScreen('towerScreen'); };
  window.addEventListener('DOMContentLoaded', () => { $('twBack').onclick = () => openModes(); $('twCrew').onclick = () => openCrew(); });
})();
