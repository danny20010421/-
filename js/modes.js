/* 模式首頁（奪寶大冒險／關卡挑戰／勇者之塔）、玩家資料、稱號 */
(function () {
  /* ---------- 玩家資料 ---------- */
  function profile() {
    const d = SAVE.data; d.profile = d.profile || {};
    const p = d.profile;
    if (!p.id) p.id = String(10000000 + Math.floor(Math.random() * 89999999));
    if (!p.joined) p.joined = new Date().toISOString();
    if (!p.name) p.name = '草帽新人';
    p.titles = p.titles || ['rookie']; if (!p.title) p.title = 'rookie';
    return p;
  }
  window.playerProfile = profile;
  const titleName = id => (TITLES.find(t => t.id === id) || TITLES[0]).name;
  /* 依目前進度頒發稱號 */
  function checkTitles(silent) {
    const p = profile(), d = SAVE.data, got = [];
    const give = id => { if (!p.titles.includes(id)) { p.titles.push(id); got.push(id); } };
    CHAPTERS.forEach(c => { if (d.chapters[c.id] && d.chapters[c.id].cleared) give('ch_' + c.id); });
    const tw = (d.tower || {}).best || 0; if (tw >= 10) give('tower10'); if (tw >= 50) give('tower50'); if (tw >= 120) give('tower120'); if (tw >= 250) give('tower250');
    { const em = d.emperor || {}, n = Object.values(em).filter(x => x && x.clears).length; if (n >= 1) give('emperor1'); if (n >= 4) give('emperor4'); }
    const rb = (d.runner || {}).best || 0; if (rb >= 500) give('run500'); if (rb >= 2000) give('run2000'); if (rb >= 5000) give('run5000');
    if ((d.treasure || {}).done) give('laughtale');
    const th = d.throne || {}; if ((th.runs || []).length || th.best) give('void1'); if ((th.best || 0) >= 1000000) give('void1m');
    /* 圖鑑套組與收集里程碑（NPC 不計） */
    if (typeof setsDone === 'function') setsDone().forEach(S => give(S.title));
    const obt = CHARACTER_ORDER.filter(id => !(CHAR_OBTAIN[id] || {}).npcOnly), gotN = obt.filter(owned).length;
    if (gotN >= 5) give('col5'); if (gotN >= 10) give('col10'); if (gotN >= 15) give('col15'); if (obt.length && gotN >= obt.length) give('colAll');
    if (got.length) { SAVE.save(); if (!silent) got.forEach((id, i) => setTimeout(() => { SFX.play('rare'); toast(`獲得稱號「${titleName(id)}」！可在玩家資料中更換`, 'gold'); }, i * 900)); }
    return got;
  }
  window.checkTitles = checkTitles;

  function chipHTML() {
    const p = profile(), d = SAVE.data, c = CHARACTERS[d.player] || CHARACTERS[STARTERS[0]];
    return `<img src="${c.avatar}" alt=""><span><b>${esc(p.name)}</b><small><em>${titleName(p.title)}</em>・ID ${p.id}</small></span>`;
  }
  function openProfile() {
    const p = profile(), d = SAVE.data, c = CHARACTERS[d.player] || CHARACTERS[STARTERS[0]], owned_ = Object.keys(d.roster).length;
    const cleared = CHAPTERS.filter(x => d.chapters[x.id] && d.chapters[x.id].cleared).length;
    const joined = new Date(p.joined), jd = `${joined.getFullYear()}/${joined.getMonth() + 1}/${joined.getDate()}`;
    $('pfBody').innerHTML = `<div class="pf-top">
        <div class="pf-av"><img src="${c.avatar}" alt=""><small>船長</small></div>
        <div class="pf-info">
          <div class="pf-title-badge">${titleName(p.title)}</div>
          <label class="pf-name"><input id="pfName" maxlength="12" value="${esc(p.name)}" aria-label="玩家名稱"><button class="btn-gold sm" id="pfSave">儲存</button></label>
          <p>🗓 登船時間：${jd}</p><p>🪪 ID：${p.id}</p>
        </div></div>
      <div class="pf-grid">
        <div><small>船員收集</small><b>${owned_}/${CHARACTER_ORDER.length}</b></div>
        <div><small>通關篇章</small><b>${cleared}/${CHAPTERS.length}</b></div>
        <div><small>勇者之塔</small><b>${(d.tower || {}).best || 0} 層</b></div>
        <div><small>最遠航行</small><b>${(d.runner || {}).best || 0} m</b></div>
      </div>
      <h4 class="cx-h">稱號 <small>${p.titles.length}/${TITLES.length}</small></h4>
      <div class="pf-titles">${TITLES.map(t => { const has = p.titles.includes(t.id); return `<button class="pf-t ${has ? '' : 'lock'} ${p.title === t.id ? 'on' : ''}" data-t="${t.id}" ${has ? '' : 'disabled'} title="${t.how}"><b>${t.name}</b><small>${has ? (p.title === t.id ? '使用中' : '點擊使用') : t.how}</small></button>`; }).join('')}</div>
      <div class="pf-actions"><button class="btn-primary" id="pfCodex">角色圖鑑</button><button class="btn-ghost" id="pfCrew">角色背包</button></div>`;
    $('pfSave').onclick = () => { const v = $('pfName').value.trim().slice(0, 12); if (!v) { toast('名稱不能是空白'); return; } p.name = v; SAVE.save(); toast('名稱已更新', 'gold'); refresh(); };
    $('pfBody').querySelectorAll('[data-t]').forEach(b => b.onclick = () => { p.title = b.dataset.t; SAVE.save(); openProfile(); refresh(); });
    $('pfCodex').onclick = () => { closeModal('profileModal'); openCrew('codex'); };
    $('pfCrew').onclick = () => { closeModal('profileModal'); openCrew(); };
    openModal('profileModal');
  }
  window.openProfile = openProfile;

  function refresh() {
    const d = SAVE.data, chip = $('profileChip'); if (chip) chip.innerHTML = chipHTML();
    document.querySelectorAll('.coinVal').forEach(e => e.textContent = d.tokens);
    const rb = (d.runner || {}).best || 0, tw = (d.tower || {}).floor || 1, cl = CHAPTERS.filter(x => d.chapters[x.id] && d.chapters[x.id].cleared).length;
    if ($('mdRunBest')) $('mdRunBest').textContent = rb ? `最遠 ${rb} m` : '尚未挑戰';
    if ($('mdStageProg')) $('mdStageProg').textContent = `通關 ${cl}/${CHAPTERS.length}`;
    if ($('mdEmpProg') && window.emperorSummary) $('mdEmpProg').textContent = emperorSummary(); if ($('mdThroneBest')) $('mdThroneBest').textContent = (d.throne && d.throne.best) ? `最高傷害 ${d.throne.best.toLocaleString()}` : '尚未挑戰'; if ($('mdXcBest')) $('mdXcBest').textContent = typeof mkSummary === 'function' ? mkSummary() : '';
    if ($('mdTowerProg')) $('mdTowerProg').textContent = `目前第 ${Math.min(TOWER.floors, tw)} 層`;
  }
  window.openModes = function () { profile(); checkTitles(false); if (typeof coins === 'function') coins(); refresh(); showScreen('modeScreen'); };

  window.addEventListener('DOMContentLoaded', () => {
    $('profileChip').onclick = openProfile;
    $('mdBackBtn').onclick = () => { if (typeof loginInfo === 'function') loginInfo(); showScreen('loginScreen'); };
    $('mdCrewBtn').onclick = () => openCrew();
    $('mdHubBtn').onclick = () => openGacha('modeScreen');
    document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { const m = b.dataset.mode; if (m === 'stage') openChart(); if (m === 'run') openRunner(); if (m === 'tower') openTower(); if (m === 'throne') openThrone(); if (m === 'emperor') openEmperor(); if (m === 'exchange') openExchange(); });
  });
})();
