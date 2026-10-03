/* 皇帝領海挑戰：四皇（白鬍子、BIG MOM、凱多、紅髮）。
   第一階段：連續擊敗旗下全部隊長（體力與技能次數延續，中途不能離開）；第二階段：連續擊敗兩個分身；第三階段：挑戰真身。
   通關第三階段後，該位四皇加入船隊（四皇已移出召喚池，只能從這裡取得）。
   隊長名單：原作幹部還沒做成角色前，先用現有角色補上（依 seed 固定，不會每次都換）。 */
const EMPEROR_DOMAIN = {
  teamSize: 5,          /* 皇帝領海可以派出的人數 */
  trueHp: 12000,        /* 真身體力 */
  ultCap: 3,            /* 分身的奧義最多使用次數（其他技能無限） */
  joinLv: 50,            /* 加入時的等級 */
  captainLv: 86,         /* 第一階段隊長等級 */
  cloneLv: 95,           /* 第二階段分身等級 */
  firstReward: { tokens: 30, berry: 30000 }, /* 首次擊敗真身 */
  replayReward: { berry: 8000 },             /* 重複挑戰真身 */
  phaseReward: { tokens: 5, berry: 5000 },   /* 首次通過第一、二階段 */
  list: [
    { id: 'whitebeard', crew: '白鬍子海賊團', color: '#5ab0e0', captains: ['marco', 'ace'], fill: 6, sea: '新世界・白鬍子的領海', quote: '咕啦啦啦……來吧，小鬼們！' },
    { id: 'bigmom', crew: 'BIG MOM 海賊團', color: '#e85a9a', captains: ['katakuri'], fill: 7, sea: '萬國・托特蘭', quote: '瑪嘛嘛嘛！你想要的，是生命還是點心？' },
    { id: 'kaido', crew: '百獸海賊團', color: '#5a6a8a', captains: [], fill: 8, sea: '和之國・鬼之島', quote: '烏囉囉囉……讓我享受一場像樣的戰鬥吧！' },
    { id: 'shanks', crew: '紅髮海賊團', color: '#c8322b', captains: [], fill: 8, sea: '艾爾巴夫外海', quote: '……要打的話，我也不會手下留情。' }
  ]
};
(function () {
  const E = EMPEROR_DOMAIN, BG = 'assets/ui/emperor_bg.webp?v=63';
  let sel = E.list[0].id, RUN = null;
  const state = () => { const d = SAVE.data.emperor = SAVE.data.emperor || {}; E.list.forEach(x => { d[x.id] = d[x.id] || { phase: 1, clears: 0 }; }); return d; };
  const EMP = new Set(E.list.map(x => x.id));
  /* 隊長補位：以皇帝 id 當 seed，固定挑出同一批角色 */
  function captainsOf(x) {
    const taken = new Set(E.list.flatMap(e => e.captains)); const pool = CHARACTER_ORDER.filter(id => !EMP.has(id) && !taken.has(id) && id !== 'imu' && !STARTERS.includes(id) && !x.captains.includes(id) && !((CHAR_OBTAIN[id] || {}).npcOnly) && ['SR', 'SSR', 'UR', 'UR+'].includes((typeof CHAR_RARITY !== 'undefined' && CHAR_RARITY[id]) || 'SR')); /* 隊長只從 SR 以上挑選 */ let seed = [...x.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 2147483647 || 1; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    const a = pool.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return [...x.captains, ...a.slice(0, x.fill)];
  }
  function stagesOf(x, phase) {
    const C = CHARACTERS[x.id];
    if (phase === 1) return captainsOf(x).map((id, i) => ({ id, lv: E.captainLv + i, mod: { hp: 1.6, atk: 1, def: 1, title: `${x.crew}・隊長` }, boss: false }));
    if (phase === 2) return [1, 2].map(k => ({ id: x.id, lv: E.cloneLv, mod: { hp: .7, dmg: .85, infPP: true, ultCap: E.ultCap, name: `${C.name}（分身 ${k}）`, title: '皇帝的分身' }, boss: false }));
    return [{ id: x.id, lv: MAX_LV, mod: { hpFixed: E.trueHp, allUp: 1, infPP: true, name: C.name, title: `${x.crew}・真身` }, boss: true }];
  }
  const PHASE_NAME = ['', '第一階段・隊長連戰', '第二階段・皇帝的分身', '第三階段・皇帝真身'];
  const PHASE_DESC = ['', '連續擊敗旗下 8 位隊長。體力與技能次數會延續到下一場，中途撤退或戰敗就要從頭開始。', '連續擊敗兩個分身（體力 70%）：技能次數無限，奧義最多 3 次。中途撤退或戰敗就要從頭開始。', '挑戰四皇真身：體力 12,000、開場全能力 +1、所有技能次數無限，倒下後會復活一次。擊敗後，這位四皇加入你的船隊。'];

  const team = () => { const d = SAVE.data; let t = (d.emperorTeam || []).filter(id => owned(id)); if (!t.length) t = (d.lineup || []).slice(); return t.slice(0, E.teamSize); };
  let picking = null;
  function renderPick() {
    const sel = picking; $('epMain').innerHTML = `<h3 class="ep-pick-h">選擇皇帝領海的出戰船員（最多 ${E.teamSize} 位，依點選順序出場）</h3>
      <div class="ep-pick">${CHARACTER_ORDER.filter(id => owned(id)).map(id => { const k = sel.indexOf(id); return `<button data-p="${id}" class="${k >= 0 ? 'on' : ''}"><img src="${charArt(id, 'avatar')}" alt="">${k >= 0 ? `<i>${k + 1}</i>` : ''}<em>LV ${crewLv(id)}</em><span>${CHARACTERS[id].name}</span></button>`; }).join('')}</div>
      <div class="ep-pick-btns"><button class="btn-ghost" id="epPickCancel">取消</button><button class="btn-gold" id="epPickOk" ${sel.length ? '' : 'disabled'}>確定（${sel.length}/${E.teamSize}）</button></div>`;
    $('epMain').querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const id = b.dataset.p, k = sel.indexOf(id); if (k >= 0) sel.splice(k, 1); else if (sel.length < E.teamSize) sel.push(id); else toast(`最多 ${E.teamSize} 位`); renderPick(); });
    $('epPickCancel').onclick = () => { picking = null; render(); }; $('epPickOk').onclick = () => { SAVE.data.emperorTeam = sel.slice(); SAVE.save(); picking = null; render(); };
  }
  function render() {
    const S = state(), x = E.list.find(e => e.id === sel), st = S[x.id], C = CHARACTERS[x.id], done = st.phase > 3;
    $('epList').innerHTML = E.list.map(e => { const s = S[e.id], c = CHARACTERS[e.id]; return `<button class="ep-card ${e.id === sel ? 'on' : ''} ${s.phase > 3 ? 'done' : ''}" data-id="${e.id}" style="--ec:${e.color}"><img src="${c.avatar}" alt=""><span><b>${c.name}</b><small>${e.crew}</small><i class="ep-pips">${[1, 2, 3].map(p => `<em class="${s.phase > p ? 'ok' : s.phase === p ? 'now' : ''}"></em>`).join('')}</i></span>${owned(e.id) ? '<i class="ep-own">已加入</i>' : ''}</button>`; }).join('');
    $('epList').querySelectorAll('[data-id]').forEach(b => b.onclick = () => { sel = b.dataset.id; render(); });
    const ph = Math.min(3, st.phase), stages = stagesOf(x, ph);
    $('epMain').innerHTML = `<div class="ep-hero" style="--ec:${x.color}"><img src="${C.image}" alt="${C.name}"><div class="ep-hero-txt"><small>${x.sea}</small><h3>${C.name}<span class="rar c-rar r-UR+">UR+</span></h3><p>「${x.quote}」</p></div></div>
      <ol class="ep-phases">${[1, 2, 3].map(p => `<li class="${st.phase > p ? 'ok' : st.phase === p ? 'now' : 'lock'}"><b>${PHASE_NAME[p]}</b><small>${PHASE_DESC[p]}</small><span class="ep-foes">${stagesOf(x, p).map(s => `<img src="${CHARACTERS[s.id].avatar}" alt="" title="${(s.mod && s.mod.name) || CHARACTERS[s.id].name}・LV ${s.lv}">`).join('')}</span></li>`).join('')}</ol>
      <p class="ep-note">${done ? `🏆 已擊敗 ${C.name} 真身 ${st.clears} 次。可以重複挑戰真身（獎勵：貝里 ${E.replayReward.berry.toLocaleString()}）。` : `目前：<b>${PHASE_NAME[ph]}</b>（${stages.length} 場）・建議等級 LV 81 以上（霸王色會讓 LV80 以下的角色直接倒下）`}</p>
      <p class="ep-team">皇帝領海陣容（${team().length}/${E.teamSize}）：${team().map(id => `<img src="${charArt(id, 'avatar')}" alt="${CHARACTERS[id].name}" title="${CHARACTERS[id].name}・LV ${crewLv(id)}">`).join('')}<button class="btn-ghost sm" id="epCrew">選擇 ${E.teamSize} 位出戰</button></p>
      <button class="btn-gold big" id="epGo">${done ? '重複挑戰真身' : `開始${PHASE_NAME[ph]}`}</button>`;
    $('epGo').onclick = () => begin(x, ph); $('epCrew').onclick = () => { picking = team(); renderPick(); };
  }
  function begin(x, ph) {
    const T = team(); if (!T.length) { toast('請先選擇出戰船員'); return; }
    if (T.some(id => typeof isTraining === 'function' && isTraining(id))) { toast('皇帝領海陣容中有船員正在訓練營'); return; }
    RUN = { x, ph, stages: stagesOf(x, ph), i: 0, team: T.map(id => ({ id, lv: crewLv(id) })) }; fight();
  }
  function fight() {
    const R = RUN, s = R.stages[R.i];
    startBattle({ team: R.team, enemyId: s.id, enemyLv: s.lv, enemyMod: s.mod, bg: BG, chapterId: 'emperor', isBoss: s.boss, revives: s.boss ? 1 : 0,
      onEnd: r => end(r), onLeave: () => openEmperor() });
    if (R.stages.length > 1) log(`皇帝領海：${PHASE_NAME[R.ph]} 第 ${R.i + 1}/${R.stages.length} 場`);
  }
  function end(r) {
    const R = RUN; if (!R) return {}; const S = state(), st = S[R.x.id], C = CHARACTERS[R.x.id];
    if (!r.win) { RUN = null; return { message: `${r.fled ? '撤退' : '戰敗'}了……${PHASE_NAME[R.ph]}要從第一場重新開始。`, alt: { label: '返回皇帝領海', fn: () => openEmperor() } }; }
    track('wins'); if (r.isBoss) track('bossWins');
    if (R.i < R.stages.length - 1) {
      R.team = teamSnapshot().map((t, k) => ({ ...t, lv: R.team[k].lv })); if (battle && battle.__nextFoeStun === 'R') window.__carryStun = true;
      R.i++; const nx = R.stages[R.i];
      return { message: `第 ${R.i}/${R.stages.length} 場勝利！體力與技能次數會延續。<br>下一位：<b>${(nx.mod && nx.mod.name) || CHARACTERS[nx.id].name}</b>（LV ${nx.lv}）`, next: { label: '迎戰下一位', fn: () => fight() } };
    }
    RUN = null; const msgs = [`🏆 ${PHASE_NAME[R.ph]} 突破！`];
    team().forEach(id => gainExp(id, 600 + R.ph * 400, true));
    if (R.ph < 3) { if (st.phase === R.ph) { st.phase++; addTokens(E.phaseReward.tokens, '皇帝領海'); addBerry(E.phaseReward.berry); msgs.push(`獲得 寶藏幣 ×${E.phaseReward.tokens}、貝里 ${E.phaseReward.berry.toLocaleString()}`); } msgs.push(`下一階段：${PHASE_NAME[R.ph + 1]}`); }
    else { const first = !st.clears; st.clears = (st.clears || 0) + 1; st.phase = 4;
      if (first) { addTokens(E.firstReward.tokens, '皇帝領海'); addBerry(E.firstReward.berry); msgs.push(`首次擊敗真身：寶藏幣 ×${E.firstReward.tokens}、貝里 ${E.firstReward.berry.toLocaleString()}`); }
      else { addBerry(E.replayReward.berry); msgs.push(`貝里 +${E.replayReward.berry.toLocaleString()}`); }
      if (!owned(R.x.id)) { addCrew(R.x.id, E.joinLv); msgs.push(`👑 <b>${C.name}</b> 認同了你的實力，加入船隊！（UR+・LV ${E.joinLv}）`); const jid = R.x.id; setTimeout(() => window.showRewards && showRewards({ title: '四皇加入！', sub: `${C.name} 認同了你的實力` }, [{ char: jid }]), 900); }
      }
    SAVE.save(); coins(); if (window.checkTitles) checkTitles(false);
    return { message: msgs.join('<br>'), next: { label: '返回皇帝領海', fn: () => openEmperor() } };
  }
  let solo = false;
  /* openEmperor(id)：只顯示這位四皇的挑戰（從四皇展示頁進入）；不帶 id 時維持目前的顯示方式 */
  window.openEmperor = function (id) { if (id) { sel = id; solo = true; } state(); if (typeof coins === 'function') coins(); render(); $('emperorScreen').classList.toggle('ep-solo', solo); showScreen('emperorScreen'); AUDIO.playSong && AUDIO.playSong('boss'); };
  window.emperorSolo = () => solo;
  window.emperorSummary = () => { try { const S = state(); const n = E.list.filter(e => S[e.id].clears).length; return n ? `已擊敗 ${n}/4 位四皇` : '尚未挑戰'; } catch (e) { return ''; } };
  window.addEventListener('DOMContentLoaded', () => { if (typeof SCREENS !== 'undefined' && !SCREENS.includes('emperorScreen')) SCREENS.push('emperorScreen'); const b = $('epBack'); if (b) b.onclick = () => openModes(); });
})();
