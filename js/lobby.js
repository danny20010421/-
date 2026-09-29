/* 遊戲大廳：取代原本的「選擇你的冒險」。中央是目前的船長，左邊是公告、每日懸賞與出戰陣容，
   右邊是限定活動與商店類入口，下方是養成功能，右下角是「模式選擇」與主要的「關卡挑戰」按鈕。 */
(function () {
  let evIdx = 0, evTimer = null;
  const rarOf = id => (typeof CHAR_RARITY !== 'undefined' && CHAR_RARITY[id]) || 'R';
  const nextChapter = () => { const d = SAVE.data, i = CHAPTERS.findIndex(c => !(d.chapters[c.id] || {}).cleared); return i < 0 ? null : CHAPTERS[i]; };

  function renderLobby() {
    if (!$('lobby')) return;
    const d = SAVE.data, pid = d.player && CHARACTERS[d.player] ? d.player : (d.lineup || [])[0] || CHARACTER_ORDER[0], c = CHARACTERS[pid], r = rarOf(pid);
    /* 背景：目前進行中的島嶼 */
    const ch = nextChapter() || CHAPTERS[CHAPTERS.length - 1];
    if (!$('lbBg').getAttribute('src')) $('lbBg').src = 'assets/ui/lobby_bg.webp?v=43';
    /* 中央船長 */
    const hero = $('lbHeroImg'); if (hero.dataset.id !== pid) { hero.dataset.id = pid; hero.classList.remove('in'); hero.src = c.image; hero.onload = () => hero.classList.add('in'); }
    $('lobby').style.setProperty('--hero', (typeof RAR_COLOR !== 'undefined' && RAR_COLOR[r]) || '#ffcf5a');
    $('lbPlate').innerHTML = `<span class="rar c-rar r-${r}">${r}</span><b>${c.name}</b><small>${c.title || ''}・LV ${crewLv(pid)}</small><span class="lbp-types">${c.types.map(t => `<i style="--tc:${TYPE_COLORS[t] || '#999'}">${t}</i>`).join('')}</span><button class="lbp-swap" id="lbSwap">更換船長</button>`;
    $('lbSwap').onclick = () => openCrew('crew');
    /* 出戰陣容 */
    $('lbTeam').innerHTML = '<small>出戰陣容</small>' + ((d.lineup || []).length ? '' : '<button class="lbt-empty" id="lbTeamSet">尚未編組，點這裡安排出戰船員 ›</button>') + (d.lineup || []).map(id => `<button class="lbt-av" data-id="${id}" title="${CHARACTERS[id].name}"><img src="${CHARACTERS[id].avatar}" alt="${CHARACTERS[id].name}"><em>LV ${crewLv(id)}</em></button>`).join('');
    $('lbTeam').querySelectorAll('.lbt-av,#lbTeamSet').forEach(b => b.onclick = () => openCrew('crew'));
    /* 公告 */
    try { const n = loadNews()[0]; $('lbNewsTitle').textContent = n ? n.title : '目前沒有公告'; } catch (e) { $('lbNewsTitle').textContent = ''; }
    /* 每日懸賞 */
    if (typeof bounties === 'function') { const B = bounties(), done = B.filter(b => b.prog >= b.goal).length; $('lbBountyTxt').textContent = `${done}/${B.length} 完成`; $('lbBountyBar').style.width = (B.length ? done / B.length * 100 : 0) + '%'; $('lbBounty').classList.toggle('has-dot', B.some(b => b.prog >= b.goal && !b.claimed)); }
    /* 主要按鈕：下一座島 */
    const st = ch && d.chapters[ch.id];
    $('lbGoSub').textContent = nextChapter() ? `${ch.name}・任務 ${Math.min(st ? st.step : 0, ch.steps.length)}/${ch.steps.length}` : '八座島嶼已全數通關';
    renderEvent();
    if (!evTimer) evTimer = setInterval(() => { if (currentScreen === 'modeScreen' && (typeof EVENT_POOLS !== 'undefined') && EVENT_POOLS.length > 1) { evIdx = (evIdx + 1) % EVENT_POOLS.length; renderEvent(true); } }, 5000);
  }
  function renderEvent(anim) {
    if (typeof EVENT_POOLS === 'undefined' || !EVENT_POOLS.length) { $('lbEvent').hidden = true; return; }
    const P = EVENT_POOLS[evIdx % EVENT_POOLS.length], img = $('lbEventImg');
    if (anim) { img.classList.remove('in'); void img.offsetWidth; }
    img.src = P.banner; img.classList.add('in'); $('lbEventName').textContent = P.tab;
    $('lbEvent').dataset.pool = P.id;
  }
  function openModesSheet(on) { const s = $('lbModes'); s.classList.toggle('show', on); s.setAttribute('aria-hidden', String(!on)); }
  function hub(tab) { openGacha('modeScreen'); if (tab && typeof switchHub === 'function') switchHub(tab); }
  const ACT = {
    gacha: () => hub('summon'), shop: () => hub('shop'), navy: () => hub('navy'), bounty: () => hub('bounty'),
    treasure: () => openTreasure(), bag: () => openBag(), crew: () => openCrew('crew'), train: () => openCrew('train'), codex: () => openCrew('codex')
  };

  window.renderLobby = renderLobby;
  window.addEventListener('DOMContentLoaded', () => {
    if (!$('lobby')) return;
    document.querySelectorAll('[data-lb]').forEach(b => b.onclick = () => { const f = ACT[b.dataset.lb]; if (f) f(); });
    $('lbHero').onclick = () => openCrew('crew');
    $('lbNews').onclick = () => openNews(); $('lbMail').onclick = () => openNews();
    $('lbBounty').onclick = () => hub('bounty');
    $('lbGo').onclick = () => openChart();
    $('lbModesBtn').onclick = () => openModesSheet(true);
    $('lbModesClose').onclick = () => openModesSheet(false);
    $('lbModes').onclick = e => { if (e.target === $('lbModes')) openModesSheet(false); };
    document.querySelectorAll('#lbModes [data-mode]').forEach(b => b.addEventListener('click', () => openModesSheet(false)));
    $('lbEvent').onclick = () => { const id = $('lbEvent').dataset.pool; openGacha('modeScreen'); requestAnimationFrame(() => requestAnimationFrame(() => { const t = document.querySelector(`#poolTabs [data-pool="ev:${id}"]`); if (t) t.click(); })); };
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('lbModes').classList.contains('show')) openModesSheet(false); });
    /* 每次回到大廳時更新 */
    /* 關閉船員／背包等視窗後，大廳立即反映變更（例如更換船長） */
    const cm = window.closeModal; if (typeof cm === 'function') window.closeModal = function () { const r = cm.apply(this, arguments); if (currentScreen === 'modeScreen') renderLobby(); return r; };
    const om = window.openModes; if (om) window.openModes = function () { const r = om.apply(this, arguments); renderLobby(); return r; };
  });
})();
