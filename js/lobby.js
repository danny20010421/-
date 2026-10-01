/* 遊戲大廳：取代原本的「選擇你的冒險」。中央是目前的船長，左邊是公告、每日懸賞與出戰陣容，
   右邊是限定活動與商店類入口，下方是養成功能，右下角是「模式選擇」與主要的「關卡挑戰」按鈕。 */
(function () {
  let evIdx = 0, evTimer = null;
  const rarOf = id => (typeof CHAR_RARITY !== 'undefined' && CHAR_RARITY[id]) || 'R';
  const nextChapter = () => { const d = SAVE.data, i = CHAPTERS.findIndex(c => !(d.chapters[c.id] || {}).cleared); return i < 0 ? null : CHAPTERS[i]; };

  function renderLobby() {
    if (!$('lobby')) return;
    const d = SAVE.data, pid = [(d.lineup || [])[0], d.player].find(x => x && CHARACTERS[x] && owned(x)) || CHARACTER_ORDER[0], c = CHARACTERS[pid], r = rarOf(pid);
    /* 背景：目前進行中的島嶼 */
    const ch = nextChapter() || CHAPTERS[CHAPTERS.length - 1];
    if (!$('lbBg').getAttribute('src')) $('lbBg').src = 'assets/ui/lobby_bg.webp?v=43';
    /* 中央船長 */
    const hero = $('lbHeroImg'); if (hero.dataset.id !== pid + '|' + charArt(pid)) { hero.dataset.id = pid + '|' + charArt(pid); hero.classList.remove('in'); hero.onload = () => hero.classList.add('in'); hero.src = charArt(pid); if (hero.complete && hero.naturalWidth) requestAnimationFrame(() => hero.classList.add('in')); }
    $('lobby').style.setProperty('--hero', (typeof RAR_COLOR !== 'undefined' && RAR_COLOR[r]) || '#ffcf5a');
    $('lbPlate').innerHTML = `<span class="rar c-rar r-${r}">${r}</span><b>${c.name}</b><small>${c.title || ''}・LV ${crewLv(pid)}</small><span class="lbp-types">${c.types.map(t => `<i style="--tc:${TYPE_COLORS[t] || '#999'}">${t}</i>`).join('')}</span><button class="lbp-swap" id="lbSwap">更換船長 ›</button>`;
    $('lbSwap').onclick = () => openCrew('crew');
    /* 出戰陣容 */
    $('lbTeam').innerHTML = '<span class="lbt-h"><i aria-hidden="true">☸</i><b>出戰陣容</b><em class="lb-chev" aria-hidden="true">›</em></span>' + ((d.lineup || []).length ? '' : '<button class="lbt-empty" id="lbTeamSet">尚未編組，點這裡安排出戰船員 ›</button>') + (d.lineup || []).map(id => `<button class="lbt-av" data-id="${id}" title="${CHARACTERS[id].name}"><img src="${charArt(id, 'avatar')}" alt="${CHARACTERS[id].name}"><em>Lv.${crewLv(id)}</em></button>`).join('');
    $('lbTeam').querySelectorAll('.lbt-av,#lbTeamSet').forEach(b => b.onclick = () => openCrew('crew'));
    /* 公告 */
    try { const n = loadNews()[0]; $('lbNewsTitle').textContent = n ? n.title : '目前沒有公告'; } catch (e) { $('lbNewsTitle').textContent = ''; }
    /* 每日懸賞 */
    if (typeof bounties === 'function') { const B = bounties(), done = B.filter(b => b.prog >= b.goal).length; $('lbBountyTxt').textContent = `${done}/${B.length} 完成`; $('lbBountyBar').style.width = (B.length ? done / B.length * 100 : 0) + '%'; $('lbBounty').classList.toggle('has-dot', B.some(b => b.prog >= b.goal && !b.claimed)); }
    /* 主要按鈕：下一座島 */
    const st = ch && d.chapters[ch.id];
    $('lbGoSub').textContent = nextChapter() ? `${ch.name}・任務 ${Math.min(st ? st.step : 0, ch.steps.length)}/${ch.steps.length}` : `${CHAPTERS.length} 座島嶼已全數通關`;
    renderEvent();
    renderProfile();
    const L = SAVE.data.login || { day: 0 }, lc = typeof loginClaimable === 'function' && loginClaimable(); $('lbLoginTxt').textContent = lc ? `第 ${L.day + 1} 天獎勵可領取` : `今天已領取・明天第 ${(L.day % 7) + 1} 天`; $('lbLogin').classList.toggle('has-dot', !!lc);
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
  /* 航海等級：依戰鬥、任務、召喚、通關篇章與船員培養累積的航海經驗計算 */
  function acctLevel() { const d = SAVE.data, st = d.stats || {}, cleared = CHAPTERS.filter(c => (d.chapters[c.id] || {}).cleared).length, crewLv_ = Object.values(d.roster || {}).reduce((a, r) => a + (r.lv || 1), 0);
    const xp = (st.wins || 0) * 15 + (st.steps || 0) * 80 + (d.pulls || 0) * 4 + cleared * 600 + crewLv_ * 6, lv = Math.min(99, 1 + Math.floor(Math.sqrt(xp / 40))), base = 40 * (lv - 1) ** 2, next = 40 * lv ** 2;
    return { lv, pct: lv >= 99 ? 1 : Math.max(0, Math.min(1, (xp - base) / (next - base))) }; }
  function renderProfile() {
    const chip = $('profileChip'); if (!chip || currentScreen !== 'modeScreen') return; const d = SAVE.data, p = d.profile || {}, pid = [(d.lineup || [])[0], d.player].find(x => x && CHARACTERS[x] && owned(x)) || CHARACTER_ORDER[0], A = acctLevel();
    const title = (TITLES.find(t => t.id === p.title) || TITLES[0]).name, id = p.id || '';
    chip.classList.add('lb-prof'); chip.innerHTML = `<span class="lbpf-av"><img src="${charArt(pid, 'avatar')}" alt=""><em>Lv.${A.lv}</em></span><span class="lbpf-txt"><b>${esc(p.name || '草帽新人')}<i aria-hidden="true">👑</i></b><small><em>${title}</em><span class="lbpf-id">ID ${id}<span class="lbpf-cp" role="button" tabindex="0" aria-label="複製 ID">⧉</span></span></small><span class="lbpf-xp"><i style="width:${(A.pct * 100).toFixed(1)}%"></i></span></span>`;
    const cp = chip.querySelector('.lbpf-cp'); cp.onclick = e => { e.stopPropagation(); try { navigator.clipboard.writeText(String(id)); toast('已複製玩家 ID'); } catch (er) { toast('ID：' + id); } };
    /* 貨幣旁的「＋」：貝里與寶藏幣都可以在道具商店補充 */
    document.querySelectorAll('#modeScreen .topbar .coin').forEach(c => { if (!c.querySelector('.lb-plus')) { const b = document.createElement('button'); b.className = 'lb-plus'; b.setAttribute('aria-label', '前往商店'); b.textContent = '+'; b.onclick = e => { e.stopPropagation(); hub('shop'); }; c.appendChild(b); } });
    const bell = $('lbBell'); if (bell) bell.classList.toggle('has-dot', typeof bounties === 'function' && bounties().some(b => b.prog >= b.goal && !b.claimed));
  }
  const ACT = {
    gacha: () => hub('summon'), shop: () => hub('shop'), navy: () => hub('navy'), bounty: () => hub('bounty'),
    treasure: () => openTreasure(), titles: () => openProfile(), friends: () => toast('好友功能敬請期待！'), settings: () => { const mm = document.querySelector('#modeScreen .m-menu'); if (mm) mm.click(); else toast('設定可以在右上角選單中找到'); }, bag: () => openBag(), crew: () => openCrew('crew'), train: () => openCrew('train'), codex: () => openCrew('codex')
  };

  /* 跨過午夜時，大廳的懸賞進度自動換成新的一天 */
  let lastDay = null; setInterval(() => { const d = typeof today === 'function' ? today() : ''; if (lastDay && d !== lastDay && currentScreen === 'modeScreen') renderLobby(); lastDay = d; }, 30000);
  window.renderLobby = renderLobby;
  window.addEventListener('DOMContentLoaded', () => {
    if (!$('lobby')) return;
    document.querySelectorAll('[data-lb]').forEach(b => b.onclick = () => { const f = ACT[b.dataset.lb]; if (f) f(); });
    $('lbHero').onclick = () => openCrew('crew');
    $('lbNews').onclick = () => openNews(); $('lbMail').onclick = () => openNews(); if ($('lbBell')) $('lbBell').onclick = () => hub('bounty');
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
    /* 存檔一有變動（更換先鋒、上下陣、升級）就立即更新大廳 */
    let rq = 0; const sv = SAVE.save.bind(SAVE); SAVE.save = function () { const r = sv.apply(this, arguments); if (currentScreen === 'modeScreen' && !rq) rq = requestAnimationFrame(() => { rq = 0; renderLobby(); }); return r; };
    const om = window.openModes; if (om) window.openModes = function () { const r = om.apply(this, arguments); renderLobby(); return r; };
  });
})();
