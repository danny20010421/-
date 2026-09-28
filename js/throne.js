/* 登上虛空王座：派出三位船員挑戰伊姆完全體，比拚單次累積傷害（每次挑戰重新計算） */
(function () {
  const HP = 99999999, KEEP = 10;
  let pick = [];
  const state = () => { SAVE.data.throne = SAVE.data.throne || { best: 0, runs: [] }; return SAVE.data.throne; };
  const fmtDate = t => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

  function render() {
    const T = state(), skin = SKINS.imu_true;
    $('thBoss').innerHTML = `<div class="th-art"><img src="${skin.image}" alt="伊姆完全體"></div>
      <h3>伊姆（完全體）<small>虛空王座</small></h3>
      <ul class="th-traits"><li>體力 <b>${HP.toLocaleString()}</b></li><li>技能次數無限</li><li>不受比例傷害與秒殺</li><li>不受任何負面效果</li></ul>
      <div class="th-best"><small>我的最高傷害</small><b>${(T.best || 0).toLocaleString()}</b></div>
      <p class="th-note">每次挑戰都從 0 開始計算；我方三位船員全部倒下或撤退時結算。依體力百分比造成傷害的招式對完全體無效。</p>`;
    const ids = CHARACTER_ORDER.filter(owned);
    pick = pick.filter(id => owned(id)).slice(0, 3);
    $('thCount').textContent = `${pick.length}/3`;
    $('thGrid').innerHTML = ids.map(id => { const c = CHARACTERS[id], k = pick.indexOf(id); return `<button class="th-c ${k >= 0 ? 'on' : ''} ${isTraining && isTraining(id) ? 'busy' : ''}" data-id="${id}" ${isTraining && isTraining(id) ? 'disabled title="訓練中"' : ''}><img src="${c.avatar}" alt=""><em>LV ${crewLv(id)}</em>${k >= 0 ? `<i>${k + 1}</i>` : ''}<span>${c.name}</span></button>`; }).join('');
    $('thGrid').querySelectorAll('[data-id]').forEach(b => b.onclick = () => { const id = b.dataset.id, k = pick.indexOf(id); if (k >= 0) pick.splice(k, 1); else if (pick.length < 3) pick.push(id); else toast('最多選擇 3 位船員'); render(); });
    $('thGo').disabled = pick.length < 1; $('thGo').textContent = pick.length < 3 && pick.length ? `登上王座（${pick.length} 位）` : '登上王座';
    const runs = T.runs || [];
    $('thRank').innerHTML = runs.length ? runs.map((r, i) => `<li class="${i < 3 ? 'top' + (i + 1) : ''} ${r.at === T.lastAt ? 'me' : ''}"><span class="rk">${i + 1}</span><span class="rt"><b>${r.dmg.toLocaleString()}</b><small>${esc(r.name)}・${fmtDate(r.at)}</small></span><span class="rtm">${r.team.map(id => CHARACTERS[id] ? `<img src="${CHARACTERS[id].avatar}" alt="${CHARACTERS[id].name}" title="${CHARACTERS[id].name}">` : '').join('')}</span></li>`).join('') : '<li class="empty">還沒有挑戰紀錄</li>';
  }
  function record(dmg, team) {
    const T = state(), p = typeof playerProfile === 'function' ? playerProfile() : { name: '海賊' }, at = Date.now();
    const prev = T.best || 0; T.best = Math.max(prev, dmg); T.lastAt = at;
    T.runs = [...(T.runs || []), { dmg, team, name: p.name, at }].sort((a, b) => b.dmg - a.dmg).slice(0, KEEP);
    SAVE.save(); const rank = T.runs.findIndex(r => r.at === at) + 1;
    return { newBest: dmg > prev, rank };
  }
  /* 獎勵：每 200 傷害 1 貝里（上限 30,000）；每 100 萬傷害 1 寶藏幣（單次 5、每日 10）；首次挑戰 +1。伊姆完全體不會被打倒 */
  function reward(dmg, won) {
    const T = state(), today = new Date().toDateString(); if (!T.tok || T.tok.day !== today) T.tok = { day: today, n: 0 };
    const first = !T.played; T.played = true;
    const berry = Math.min(30000, Math.floor(dmg / 200)); let tok = Math.min(5, Math.floor(dmg / 1000000), Math.max(0, 10 - T.tok.n)); T.tok.n += tok;
    if (first) tok += 1;
    SAVE.save(); if (berry) addBerry(berry); if (tok) addTokens(tok, '虛空王座'); if (window.checkTitles) checkTitles(false);
    return `獲得 <b>${berry.toLocaleString()} 貝里</b>${tok ? `・<b>寶藏幣 ×${tok}</b>` : ''}${first ? '（含首次挑戰獎勵）' : ''}${T.tok.n >= 10 ? '<br><small>今天的寶藏幣獎勵已經拿滿了</small>' : ''}`;
  }
  function go() {
    if (!pick.length) return; const team = pick.slice();
    startBattle({ team: team.map(id => ({ id, lv: crewLv(id) })), enemyId: 'imu', enemySkin: 'imu_true', enemyLv: MAX_LV, chapterId: 'giant', isBoss: false, revives: 0, throne: true, bg: 'assets/ui/throne_bg.webp?v=28',
      onEnd: r => { if (battle.__thRes) return battle.__thRes; const dmg = battle.voidDamage || 0, R = record(dmg, team);
        const Rw = reward(dmg, battle.enemy.hp <= 0);
        return battle.__thRes = { title: '挑戰結束', always: true, message: `本次累積傷害：<b class="th-res">${dmg.toLocaleString()}</b><br>${R.newBest ? '🏆 新的個人最高紀錄！' : `個人最高：${state().best.toLocaleString()}`}${R.rank ? `・本機排行第 ${R.rank} 名` : ''}<br>${Rw}`, next: { label: '再次挑戰', fn: () => go() }, alt: { label: '返回王座大廳', fn: () => openThrone() } }; },
      onLeave: () => openThrone() });
  }
  window.openThrone = function () { if (!pick.length) pick = SAVE.data.lineup.filter(owned).slice(0, 3); render(); showScreen('throneScreen'); };
  window.addEventListener('DOMContentLoaded', () => { $('thBack').onclick = () => openModes(); $('thGo').onclick = go; });
})();
