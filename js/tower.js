/* 勇者之塔：250 層，每 10 層一位 BOSS，每層都有獎勵；第 100 層以後敵人等級封頂，改以體力與傷害倍率持續變強 */
(function () {
  const TIER = ['east', 'alabasta', 'skypiea', 'enies', 'fishman', 'wano', 'dark', 'giant'];
  const state = () => { SAVE.data.tower = SAVE.data.tower || { floor: 1, best: 0 }; return SAVE.data.tower; };
  const isBoss = f => f % 10 === 0;
  /* 一般樓層：把全部角色打亂成一輪輪出場，相鄰兩層不重複，同一位角色約隔一整輪才會再出現 */
  let SEQ = null;
  function buildSeq() {
    const pool = CHARACTER_ORDER.filter(id => !TOWER.bosses.includes(id) || !['imu'].includes(id)).filter(id => id !== 'imu' && !((CHAR_OBTAIN[id] || {}).npcOnly && id !== 'marine' && id !== 'mayor')); /* NPC 專屬角色（如摩甘茲）不會出現在勇者之塔 */
    let seed = 20260928; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const seq = []; while (seq.length < TOWER.floors) { const a = pool.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } if (seq.length && a[0] === seq[seq.length - 1]) a.push(a.shift()); seq.push(...a); }
    return seq;
  }
  function foeOf(f) {
    if (isBoss(f)) return TOWER.bosses[(f / 10 - 1) % TOWER.bosses.length];
    SEQ = SEQ || buildSeq(); let k = 0; for (let x = 1; x < f; x++) if (!isBoss(x)) k++;
    let id = SEQ[k % SEQ.length]; const prevBoss = isBoss(f - 1) ? TOWER.bosses[(f - 1) / 10 - 1] : null, nextBoss = isBoss(f + 1) ? TOWER.bosses[(f + 1) / 10 - 1] : null;
    if (id === prevBoss || id === nextBoss) id = SEQ[(k + 1) % SEQ.length];
    return id;
  }
  const skinOf = f => (TOWER.bossSkin || {})[f] || null;
  /* 第 1 層 LV25，每層 +0.75，BOSS 層再 +4，上限 LV100 */
  const lvOf = f => Math.min(MAX_LV, Math.round(25 + (f - 1) * .75 + (isBoss(f) ? 4 : 0)));
  /* 第 100 層以上：每層體力 +1.2%、傷害 +0.4%，每 50 層攻防各 +1（250 層約體力 2.8 倍、傷害 1.6 倍） */
  const modOf = f => { const k = Math.max(0, f - 100), st = Math.min(3, Math.floor(k / 50)); return { hp: 1 + k * .012, dmg: 1 + k * .004, atk: st, def: st }; };
  let sel = null;
  const replayOf = r => ({ berry: Math.round(r.berry * .3), items: {}, tokens: 0 });
  const chapterOf = f => TIER[Math.min(TIER.length - 1, Math.floor((f - 1) / 15))];
  function rewardOf(f) {
    const r = { berry: 60 + f * 15, items: {}, tokens: 0 };
    if (f % 5 === 0) r.items.exp_s = 1;
    if (isBoss(f)) { r.tokens = 10; r.items.exp_m = 1; }
    if (f === 50 || f === 100) { r.items.exp_l = 1; r.tokens += 50; }
    if (f === 120) { r.items.exp_l = 3; r.tokens = 2000; }
    if (f % 50 === 0 && f > 100) { r.items.exp_l = (r.items.exp_l || 0) + 2; r.tokens += 100; }
    if (f === 200) { r.items.exp_l = 3; r.tokens = 500; }
    if (f === 250) { r.items.exp_l = 5; r.tokens = 3000; }
    return r;
  }
  const rewardText = r => [`貝里 ${r.berry.toLocaleString()}`, r.tokens ? `寶藏幣 ×${r.tokens}` : '', ...Object.entries(r.items).map(([k, n]) => `${ITEMS[k].name} ×${n}`)].filter(Boolean).join('、');

  function render() {
    const s = state(), cur = Math.min(TOWER.floors, s.floor), done = s.floor > TOWER.floors;
    $('twSub').textContent = done ? `已登頂 ${TOWER.floors} 層！` : `目前第 ${cur} 層・最高紀錄 ${s.best} 層`;
    if (sel == null || sel > cur || (done && sel > TOWER.floors)) sel = done ? TOWER.floors : cur;
    const rows = [];
    for (let f = Math.min(TOWER.floors, cur + 2); f >= 1; f--) {
      const st = f < s.floor ? 'clear' : f === cur && !done ? 'now' : 'lock', c = { ...CHARACTERS[foeOf(f)], ...(skinOf(f) ? { avatar: SKINS[skinOf(f)].avatar, name: SKINS[skinOf(f)].name } : {}) };
      rows.push(`<li class="tw-f ${st} ${isBoss(f) ? 'boss' : ''} ${f === sel ? 'sel' : ''}" data-f="${f}" ${st !== 'lock' ? 'role="button" tabindex="0"' : ''}><span class="tw-no">${f}</span><img src="${c.avatar}" alt=""><span class="tw-n"><b>${isBoss(f) ? 'BOSS・' : ''}${c.name}</b><small>LV ${lvOf(f)}${f > 100 ? ` ＋${Math.round((modOf(f).hp - 1) * 100)}%` : ''}</small></span><i class="tw-st">${st === 'clear' ? (f === sel ? '重複挑戰' : '✓ 可重打') : st === 'now' ? '挑戰中' : '🔒'}</i></li>`);
    }
    $('twFloors').innerHTML = rows.join('');
    $('twFloors').querySelectorAll('.tw-f.clear,.tw-f.now').forEach(li => { const pick = () => { sel = +li.dataset.f; render(); }; li.onclick = pick; li.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }; });
    requestAnimationFrame(() => { const el = $('twFloors').querySelector('.tw-f.sel'); if (el) el.scrollIntoView({ block: 'center' }); });
    const f = sel, replay = f < s.floor, c = { ...CHARACTERS[foeOf(f)], ...(skinOf(f) ? { image: SKINS[skinOf(f)].image, name: SKINS[skinOf(f)].name } : {}) }, r = rewardOf(f), L = lvStats(CHARACTERS[foeOf(f)], lvOf(f));
    $('twPanel').innerHTML = (done ? `<p class="tw-top">🏆 已登頂 ${TOWER.floors} 層！點左側任一層可以重複挑戰。</p>` : '') +
      `<div class="tw-foe ${isBoss(f) ? 'boss' : ''}"><div class="tw-art"><img src="${c.image}" alt=""></div>
        <div class="tw-info"><small>第 ${f} 層${isBoss(f) ? '・BOSS 層' : ''}</small><h3>${c.name}</h3><p class="tw-lv">LV ${lvOf(f)}・${c.title}${f > 100 ? `<br><small>塔頂強化：體力 ×${modOf(f).hp.toFixed(2)}、傷害 ×${modOf(f).dmg.toFixed(2)}${modOf(f).atk ? `、攻防 +${modOf(f).atk}` : ''}</small>` : ''}</p>
        <div class="tw-stats"><span>體力 <b>${Math.round(L.hp * modOf(f).hp)}</b></span><span>攻擊 <b>${L.atk}</b></span><span>防禦 <b>${L.def}</b></span><span>速度 <b>${L.spd}</b></span></div>
        <p class="tw-rew">${replay ? `重複挑戰獎勵：<b>${rewardText(replayOf(r))}・陣容經驗 ${Math.round((40 + f * 12) / 2)}</b><br><small>首次通關獎勵已領取，重複挑戰不影響目前樓層</small>` : `過關獎勵：<b>${rewardText(r)}</b>`}</p>
        <p class="tw-team">出戰陣容：${SAVE.data.lineup.map(id => `<img src="${CHARACTERS[id].avatar}" alt="${CHARACTERS[id].name}" title="${CHARACTERS[id].name}">`).join('')}</p>
        <button class="btn-primary big" id="twGo">${replay ? '重複挑戰' : '挑戰'}第 ${f} 層</button></div></div>`;
    const go = $('twGo'); if (go) go.onclick = () => fight(f);
  }
  function fight(f) {
    const s = state();
    startBattle({ team: SAVE.data.lineup.map(id => ({ id, lv: crewLv(id) })), enemyId: foeOf(f), enemySkin: skinOf(f), enemyLv: lvOf(f), bg: 'assets/ui/tower_bg.webp?v=23', chapterId: chapterOf(f), isBoss: isBoss(f), revives: isBoss(f) ? (f > 150 ? 2 : 1) : 0, enemyMod: f > 100 ? modOf(f) : null,
      onEnd: r => {
        if (!r.win) return { message: `第 ${f} 層挑戰失敗。調整陣容、升級船員後再來挑戰吧！` };
        track('wins'); track('towerWins'); if (isBoss(f)) track('bossWins');
        if (f < s.floor) { const rr = replayOf(rewardOf(f)), ex = Math.round((40 + f * 12) / 2); addBerry(rr.berry); SAVE.data.lineup.forEach(id => gainExp(id, ex, true)); SAVE.save(); if (window.checkTitles) checkTitles(false);
          return { message: `重複挑戰第 ${f} 層成功！<br>獲得 貝里 ${rr.berry.toLocaleString()}・陣容經驗 ${ex}`, next: { label: '再挑戰一次', fn: () => fight(f) }, alt: { label: '返回勇者之塔', fn: () => openTower(true) } }; }
        const first = f > (s.best || 0), rw = rewardOf(f);
        s.floor = f + 1; s.best = Math.max(s.best || 0, f); sel = null; SAVE.save();
        const lines = [`突破第 ${f} 層！`];
        if (first) { addBerry(rw.berry); if (rw.tokens) addTokens(rw.tokens, '勇者之塔'); Object.entries(rw.items).forEach(([k, n]) => { SAVE.data.inventory[k] = (SAVE.data.inventory[k] || 0) + n; }); SAVE.data.lineup.forEach(id => gainExp(id, 40 + f * 12, true)); SAVE.save(); lines.push(`獲得 ${rewardText(rw)}`); }
        if (window.checkTitles) checkTitles(false);
        return { message: lines.join('<br>'), next: f < TOWER.floors ? { label: `繼續挑戰（第 ${f + 1} 層）`, fn: () => fight(f + 1) } : { label: '返回船上', fn: () => openModes() }, alt: f < TOWER.floors ? { label: '返回船上', fn: () => openModes() } : null };
      },
      onLeave: () => openTower() });
  }
  window.openTower = function (keepSel) { if (keepSel !== true) sel = null; if (typeof coins === 'function') coins(); render(); showScreen('towerScreen'); };
  window.addEventListener('DOMContentLoaded', () => { $('twBack').onclick = () => openModes(); $('twCrew').onclick = () => openCrew(); });
})();
