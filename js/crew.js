/* 角色背包：我的船員（只列已獲得）、角色圖鑑、訓練營 */
(function () {
  const RAR_COLOR = { R: '#5fb8ff', SR: '#c58bff', SSR: '#ffcf5a' };
  const rarOf = id => (typeof CHAR_RARITY !== 'undefined' && CHAR_RARITY[id]) || 'R';
  const noOf = id => 'No.' + String(CHARACTERS[id].no || 0).padStart(3, '0');
  const ownedIds = () => CHARACTER_ORDER.filter(owned);
  let crewTab = 'crew', trainPick = null, revealAll = false;

  /* ---------- 訓練營資料 ---------- */
  const training = () => (SAVE.data.training = SAVE.data.training || []);
  window.isTraining = id => training().some(t => t.id === id);
  const planOf = id => TRAIN_PLANS.find(p => p.id === id);
  const fmt = ms => { ms = Math.max(0, ms); const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h} 小時 ${String(m).padStart(2, '0')} 分` : `${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`; };

  /* 訓練中的角色不能上陣 */
  const _add = window.lineupAdd;
  window.lineupAdd = function (id, front) { if (isTraining(id)) { toast(`${CHARACTERS[id].name} 正在訓練營，訓練結束前不能出戰`, 'warn'); return; } return _add.apply(this, arguments); };

  function startTraining(slot, id, planId) {
    const p = planOf(planId); if (!p || isTraining(id) || training().length >= TRAIN_SLOTS) return;
    if (crewLv(id) >= MAX_LV) { toast('已經是最高等級，不需要訓練'); return; }
    if (inLineup(id)) { if (SAVE.data.lineup.length <= 1) { toast('陣容至少要留一位船員，請先讓其他船員上陣', 'warn'); return; } lineupRemove(id); }
    const now = Date.now(); training().push({ id, plan: p.id, start: now, end: now + p.min * 60000, exp: p.exp }); SAVE.save();
    SFX.play('buff'); toast(`${CHARACTERS[id].name} 開始 ${p.label} 的訓練`, 'gold'); trainPick = null; render(); if (currentScreen === 'chapterScreen') openChart(selChapter);
  }
  function claimTraining(i) {
    const t = training()[i]; if (!t || Date.now() < t.end) return;
    training().splice(i, 1); SAVE.save(); const r = gainExp(t.id, t.exp, false, true);
    SFX.play('rare'); if (r && r.to === r.from) toast(`${CHARACTERS[t.id].name} 完成訓練，經驗 +${t.exp.toLocaleString()}`, 'gold'); render(); coins();
  }
  /* 付貝里立即完成：剩餘每分鐘 15 貝里，最少 50 */
  const rushCost = t => Math.max(50, Math.ceil(Math.max(0, t.end - Date.now()) / 60000) * 15);
  function rushTraining(i) {
    const t = training()[i]; if (!t || Date.now() >= t.end) return; const cost = rushCost(t);
    if ((SAVE.data.berry || 0) < cost) { toast(`貝里不足，需要 ${cost.toLocaleString()} 貝里`, 'warn'); return; }
    confirmBox('立即完成訓練？', `花費 <b>${cost.toLocaleString()} 貝里</b>，${CHARACTERS[t.id].name} 會馬上結束訓練，可以直接領取經驗。`, '立即完成', () => { SAVE.data.berry -= cost; t.end = Date.now() - 1; t.notified = true; SAVE.save(); coins(); SFX.play('coin'); render(); });
  }
  function cancelTraining(i) {
    const t = training()[i]; if (!t) return;
    confirmBox('中止訓練？', `${CHARACTERS[t.id].name} 會立刻回到背包，這次訓練<b>不會獲得任何經驗</b>。`, '中止訓練', () => { training().splice(i, 1); SAVE.save(); render(); });
  }

  /* ---------- 開啟 ---------- */
  window.openCrew = function (tab, opts) {
    crewMode = 'crew'; crewTab = tab || 'crew'; trainPick = null; revealAll = !!(opts && opts.reveal); $('charModal').classList.toggle('reveal', revealAll);
    const ids = ownedIds(); if (!owned(pickChar) || !pickChar) pickChar = owned(SAVE.data.player) ? SAVE.data.player : ids[0];
    $('charTitle').textContent = revealAll ? '角色介紹' : '角色背包'; $('charConfirm').style.display = 'none';
    $('charModal').classList.add('crew-v2'); openModal('charModal'); render();
  };
  const _old = window.renderCrew;
  window.renderCrew = function () { if (crewMode !== 'crew') { $('charModal').classList.remove('crew-v2'); return _old.apply(this, arguments); } render(); };

  function render() {
    const tabs = [['crew', '我的船員'], ['codex', '角色圖鑑'], ['train', '訓練營']];
    const ready = training().filter(t => Date.now() >= t.end).length;
    $('crewTabs').innerHTML = tabs.map(([k, l]) => `<button class="${k === crewTab ? 'on' : ''}" data-k="${k}" role="tab" aria-selected="${k === crewTab}">${l}${k === 'train' && ready ? `<i class="cx-badge">${ready}</i>` : k === 'train' ? `<small>${training().length}/${TRAIN_SLOTS}</small>` : k === 'codex' ? `<small>${ownedIds().length}/${CHARACTER_ORDER.length}</small>` : ''}</button>`).join('');
    $('crewTabs').querySelectorAll('button').forEach(b => b.onclick = () => { crewTab = b.dataset.k; trainPick = null; render(); const mc = document.querySelector('#charModal .modal-card'); if (mc) mc.scrollTop = 0; });
    ['crew', 'codex', 'train'].forEach(k => $('cxPane_' + k).classList.toggle('hidden', k !== crewTab));
    if (crewTab === 'crew') renderMine(); else if (crewTab === 'codex') renderCodex(); else renderTrain();
  }

  /* ---------- 共用：角色卡 ---------- */
  function card(id, opts) {
    const c = CHARACTERS[id], own = owned(id), lv = own ? crewLv(id) : 0, r = rarOf(id), k = SAVE.data.lineup.indexOf(id), tr = isTraining(id);
    const tags = [k === 0 ? '<span class="c-team">先鋒</span>' : k > 0 ? `<span class="c-team">陣容 ${k + 1}</span>` : '', tr ? '<span class="c-badge train">訓練中</span>' : '', opts.codex && !own && !revealAll ? '<span class="c-badge off">未獲得</span>' : ''].join('');
    return `<button class="char ${opts.on ? 'on' : ''} ${opts.codex && !own && !revealAll ? 'sil' : ''}" data-id="${id}" aria-pressed="${!!opts.on}"><img src="${c.image}" alt="" loading="lazy"><span class="rar c-rar r-${r}">${r}</span>${own ? `<span class="c-lv" style="--c:${TIERS[tierOf(lv)].color}">LV ${lv}</span>` : `<span class="c-lv cno-tag">${noOf(id)}</span>`}${tags ? `<span class="c-tags">${tags}</span>` : ''}<span class="c-name">${c.name}</span></button>`;
  }
  function statTiles(c, lv) {
    const L = lvStats(c, lv), items = [['體力', L.hp, L.hp / 2100], ['速度', L.spd, L.spd / 150], ['傷害倍率', '×' + L.dmg.toFixed(2), L.dmg / 1], ['技能次數', L.ppAdj ? L.ppAdj : '滿', (L.ppAdj + 3) / 3]];
    return `<div class="cx-stats">${items.map(([k, v, p]) => `<div><dt>${k}</dt><dd>${v}</dd><i style="width:${Math.max(6, Math.min(100, p * 100))}%"></i></div>`).join('')}</div>`;
  }
  function skillCards(c, lv, own) {
    const L = lvStats(c, lv);
    return `<ol class="cx-skills">${c.skills.map((s, i) => { const need = SKILL_UNLOCK[i] || 1, ok = own && lv >= need, pp = Math.max(1, s.maxPP + L.ppAdj);
      return `<li class="sk ${ok ? '' : 'lock'} ${s.ultimate ? 'ult' : ''}"><div class="sk-top"><span class="sk-no">${i + 1}</span><b>${s.name}</b><em class="sk-type ${s.type}">${s.ultimate ? '奧義' : s.type === 'attack' ? '攻擊' : '輔助'}</em></div>
        <div class="sk-meta"><span>威力 <b>${s.power || '—'}</b></span><span>命中 <b>${s.accuracy}</b></span><span>次數 <b>${own ? pp : s.maxPP}/${s.maxPP}</b></span></div>
        <p>${s.desc}</p>${(s.tags || []).length ? `<div class="sk-tags">${s.tags.map(([t, cl]) => `<span class="tag ${cl}">${t}</span>`).join('')}</div>` : ''}
        ${ok ? '' : `<div class="sk-lock">🔒 LV ${need} 解鎖</div>`}</li>`; }).join('')}</ol>`;
  }

  /* ---------- 我的船員 ---------- */
  let rightTab = 'info';
  function tile(id, sel) { const ch = CHARACTERS[id], lv = crewLv(id), tr = isTraining(id), k = SAVE.data.lineup.indexOf(id);
    return `<button class="sb-tile ${sel ? 'on' : ''}" data-id="${id}" style="--rc:${RAR_COLOR[rarOf(id)]}"><img src="${ch.avatar}" alt=""><em>LV.${lv}</em>${k === 0 ? '<i class="sb-lead">先鋒</i>' : ''}${tr ? '<i class="sb-tr">訓練中</i>' : ''}<span>${ch.name}</span></button>`; }
  function renderMine() {
    const ids = ownedIds(); if (!owned(pickChar)) pickChar = ids[0];
    const L = SAVE.data.lineup, max = GAME_SETTINGS.lineupMax, bench = ids.filter(id => !L.includes(id));
    const id = pickChar, c = CHARACTERS[id], lv = crewLv(id), r = SAVE.data.roster[id], need = expNeed(lv), S = lvStats(c, lv), tr = training().find(t => t.id === id), k = L.indexOf(id);
    const pct = lv >= MAX_LV ? 100 : Math.min(100, r.exp / need * 100);
    const slots = Array.from({ length: max }, (_, i) => L[i] ? tile(L[i], L[i] === id).replace('class="sb-tile', `data-slot="${i}" class="sb-tile slot`) : `<div class="sb-tile empty"><span>空位 ${i + 1}</span></div>`).join('');
    const skills = c.skills.map((s, i) => { const need2 = SKILL_UNLOCK[i] || 1, ok = lv >= need2, pp = Math.max(1, s.maxPP + S.ppAdj);
      return `<div class="sb-sk ${ok ? '' : 'lock'} ${s.ultimate ? 'ult' : ''}" title="${esc(s.desc)}"><b>${s.ultimate ? '★ ' : ''}${s.name}</b><span>威力 ${s.power || '—'}</span><span>次數 ${ok ? pp : 0}/${s.maxPP}</span>${ok ? '' : `<i>LV ${need2} 解鎖</i>`}<p>${s.desc}</p></div>`; }).join('');
    const BOOKS = ['exp_s', 'exp_m', 'exp_l'];
    const books = BOOKS.map(b => { const n = SAVE.data.inventory[b] || 0, q = Math.min(n, bookQty[b] || 1), pv = previewLv(id, ITEMS[b].effect.exp * q); return `<div class="exp-row ${n ? '' : 'off'}" data-row="${b}">${itemIcon(ITEMS[b])}<div class="er-name"><b>${ITEMS[b].name}</b><small>每本 +${ITEMS[b].effect.exp.toLocaleString()}・持有 ${n}</small></div>
        <div class="stepper"><button data-q="-1" aria-label="減少" ${n ? '' : 'disabled'}>−</button><output>${n ? q : 0}</output><button data-q="1" aria-label="增加" ${n ? '' : 'disabled'}>＋</button><button data-q="max" ${n ? '' : 'disabled'}>全部</button></div>
        <span class="er-prev">${n ? (pv > lv ? `LV ${lv} → <b>LV ${pv}</b>` : `LV ${lv}`) : ''}</span><button class="btn-gold sm" data-use="${b}" ${n && lv < MAX_LV ? '' : 'disabled'}>使用</button></div>`; }).join('');
    const act = tr ? `<span class="sb-state">訓練中・剩 <b data-end="${tr.end}">${fmt(tr.end - Date.now())}</b></span>`
      : k >= 0 ? `${k ? '<button class="btn-gold" data-act="lead">設為先鋒</button>' : '<span class="sb-state">先鋒</span>'}<button class="btn-ghost" data-act="out" ${L.length <= 1 ? 'disabled' : ''}>下陣</button>`
        : `<button class="btn-primary" data-act="in">${L.length >= max ? '上陣（替換最後一位）' : '上陣'}</button>`;
    $('cxPane_crew').innerHTML = `<div class="sb">
      <aside class="sb-left"><h4>出戰陣容 <small>${L.length}/${max}</small></h4><div class="sb-slots">${slots}</div>
        <h4>待命船員 <small>${bench.length}</small></h4><div class="sb-bench">${bench.map(x => tile(x, x === id)).join('') || '<p class="sb-none">沒有待命的船員</p>'}</div></aside>
      <section class="sb-stage" style="--rc:${RAR_COLOR[rarOf(id)]}"><div class="sb-plat"></div><img src="${c.image}" alt="${c.name}"><div class="sb-acts">${act}</div></section>
      <aside class="sb-right">
        <div class="sb-head"><span class="rar c-rar r-${rarOf(id)}">${rarOf(id)}</span><h3>${c.name}<small>${c.title}</small></h3></div>
        <div class="sb-types">${c.types.map(t => `<span class="type" style="--t:${TYPE_COLORS[t] || '#888'}">${t}</span>`).join('')}${tierBadge(lv)}</div>
        <div class="sb-lv"><b>LV ${lv}</b><div class="bar"><i style="width:${pct}%"></i></div><small>${lv >= MAX_LV ? '已達最高等級' : `${r.exp.toLocaleString()} / ${need.toLocaleString()}`}</small></div>
        <nav class="sb-tabs" role="tablist"><button data-rt="info" class="${rightTab === 'info' ? 'on' : ''}">訊息</button><button data-rt="grow" class="${rightTab === 'grow' ? 'on' : ''}">培養</button><button data-rt="train">訓練場</button></nav>
        ${rightTab === 'grow' ? `<div class="sb-grow">${lv < MAX_LV ? books : '<p class="sb-none">已達最高等級，不需要經驗道具。</p>'}</div>` : `
        <dl class="sb-stats"><div><dt>⚔ 攻擊力</dt><dd>${S.atk}</dd></div><div><dt>🛡 防禦力</dt><dd>${S.def}</dd></div><div><dt>💨 速度</dt><dd>${S.spd}</dd></div><div><dt>❤ 體力</dt><dd>${S.hp}</dd></div></dl>
        <div class="sb-skills">${skills}</div>`}
      </aside></div>`;
    const P = $('cxPane_crew');
    P.querySelectorAll('.sb-tile[data-id]').forEach(b => b.onclick = () => { pickChar = b.dataset.id; renderMine(); });
    P.querySelectorAll('[data-rt]').forEach(b => b.onclick = () => { if (b.dataset.rt === 'train') { crewTab = 'train'; trainPick = isTraining(id) || lv >= MAX_LV ? null : { slot: training().length, id }; render(); return; } rightTab = b.dataset.rt; renderMine(); });
    P.querySelectorAll('[data-act]').forEach(b => b.onclick = () => { const a = b.dataset.act; if (a === 'in') lineupAdd(id); if (a === 'out') lineupRemove(id); if (a === 'lead') lineupAdd(id, true); renderMine(); if (currentScreen === 'chapterScreen') openChart(selChapter); });
    P.querySelectorAll('.exp-row').forEach(row => { const b = row.dataset.row, n = SAVE.data.inventory[b] || 0;
      row.querySelectorAll('[data-q]').forEach(x => x.onclick = () => { const v = x.dataset.q; bookQty[b] = v === 'max' ? n : Math.max(1, Math.min(n, (bookQty[b] || 1) + +v)); renderMine(); });
      const u = row.querySelector('[data-use]'); if (u) u.onclick = () => { const q = Math.min(n, bookQty[b] || 1); if (!q || crewLv(id) >= MAX_LV) return; SAVE.data.inventory[b] -= q; SAVE.save(); bookQty[b] = 1; gainExp(id, ITEMS[b].effect.exp * q, false, true); renderMine(); coins(); }; });
  }
  /* ---------- 角色圖鑑 ---------- */
  let codexPick = null;
  function renderCodex() {
    const all = CHARACTER_ORDER, got = all.filter(owned).length; if (!codexPick) codexPick = all[0];
    $('cxCodexNote').innerHTML = `收集進度 <b>${got}/${all.length}</b><span class="cx-cbar"><i style="width:${got / all.length * 100}%"></i></span>`;
    $('cxCodexGrid').innerHTML = all.map(id => card(id, { codex: true, on: id === codexPick })).join('');
    $('cxCodexGrid').querySelectorAll('.char').forEach(b => b.onclick = () => { codexPick = b.dataset.id; renderCodex(); if (innerWidth <= 860) $('cxCodexDetail').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    const id = codexPick, c = CHARACTERS[id], own = owned(id);
    $('cxCodexDetail').innerHTML = `<div class="cx-hero" style="--rc:${RAR_COLOR[rarOf(id)]}">
        <div class="cx-art ${own || revealAll ? '' : 'sil'}"><img src="${c.image}" alt=""><span class="rar c-rar r-${rarOf(id)}">${rarOf(id)}</span><span class="cx-no">${noOf(id)}</span></div>
        <div class="cx-head"><h3>${c.name}<small>${c.title}</small></h3>
          <div class="cx-row"><div class="pl-types">${c.types.map(t => `<span class="type" style="--t:${TYPE_COLORS[t] || '#888'}">${t}</span>`).join('')}</div>${own ? `<span class="cx-own">已獲得・LV ${crewLv(id)}</span>` : '<span class="cx-own off">尚未獲得</span>'}</div>
          <p class="cx-desc">${c.desc}</p>
          <div class="cx-src"><b>取得方式</b><span>${charSource(id)}</span></div>
          ${statTiles(c, MAX_LV).replace('cx-stats', 'cx-stats max')}<small class="cx-note">能力為 LV 100 時的數值</small>
          ${own ? `<div class="cx-actions"><button class="btn-primary" data-open="${id}">在我的船員中查看</button></div>` : ''}
        </div></div>
      <h4 class="cx-h">技能一覽</h4>${skillCards(c, MAX_LV, false).replace(/<div class="sk-lock">[^<]*<\/div>/g, '').replace(/class="sk lock/g, 'class="sk')}`;
    const o = $('cxCodexDetail').querySelector('[data-open]'); if (o) o.onclick = () => { pickChar = o.dataset.open; crewTab = 'crew'; render(); };
  }

  /* ---------- 訓練營 ---------- */
  function renderTrain() {
    const T = training(), now = Date.now();
    $('cxTrainNote').innerHTML = `把船員放進訓練營，時間到就能領取經驗。<b>訓練中的船員不能出戰</b>，中途中止不會獲得經驗。最多同時 ${TRAIN_SLOTS} 位。`;
    $('cxPlans').innerHTML = TRAIN_PLANS.map(p => `<div><b>${p.label}</b><span>經驗 +${p.exp.toLocaleString()}</span></div>`).join('');
    let html = '';
    for (let i = 0; i < TRAIN_SLOTS; i++) { const t = T[i];
      if (t) { const c = CHARACTERS[t.id], p = planOf(t.plan), done = now >= t.end, pct = Math.min(100, (now - t.start) / (t.end - t.start) * 100), pv = previewLv(t.id, t.exp);
        html += `<div class="tc-slot ${done ? 'done' : ''}"><img src="${c.avatar}" alt=""><div class="tc-info"><b>${c.name}<small>LV ${crewLv(t.id)}${pv > crewLv(t.id) ? ` → LV ${pv}` : ''}</small></b><span>${p.label}・經驗 +${t.exp.toLocaleString()}</span>
          <div class="bar"><i style="width:${pct}%"></i></div><small class="tc-left">${done ? '訓練完成！' : `剩下 <b data-end="${t.end}">${fmt(t.end - now)}</b>`}</small></div>
          ${done ? `<button class="btn-gold" data-claim="${i}">領取經驗</button>` : `<div class="tc-btns"><button class="btn-gold sm" data-rush="${i}">立即完成・${rushCost(t).toLocaleString()} 貝里</button><button class="btn-ghost sm" data-cancel="${i}">中止</button></div>`}</div>`; }
      else html += `<div class="tc-slot empty"><div class="tc-empty">空位 ${i + 1}</div><button class="btn-primary" data-pick="${i}">放入船員</button></div>`; }
    $('cxSlots').innerHTML = html;
    $('cxSlots').querySelectorAll('[data-claim]').forEach(b => b.onclick = () => claimTraining(+b.dataset.claim));
    $('cxSlots').querySelectorAll('[data-cancel]').forEach(b => b.onclick = () => cancelTraining(+b.dataset.cancel));
    $('cxSlots').querySelectorAll('[data-rush]').forEach(b => b.onclick = () => rushTraining(+b.dataset.rush));
    $('cxSlots').querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { trainPick = { slot: +b.dataset.pick, id: null }; renderTrain(); });
    // 選角與方案
    const P = $('cxPicker');
    if (!trainPick) { P.classList.add('hidden'); return; } P.classList.remove('hidden');
    const cand = ownedIds().filter(id => !isTraining(id) && crewLv(id) < MAX_LV);
    if (trainPick.id && !cand.includes(trainPick.id)) trainPick.id = null;
    P.innerHTML = `<h4 class="cx-h">① 選擇要訓練的船員</h4>${cand.length ? `<div class="char-grid tc-cands">${cand.map(id => card(id, { on: id === trainPick.id })).join('')}</div>` : '<p class="cx-note">沒有可以訓練的船員（都在訓練中或已滿級）。</p>'}
      ${trainPick.id ? `<h4 class="cx-h">② 選擇訓練方案</h4>${inLineup(trainPick.id) ? `<p class="cx-warn">${CHARACTERS[trainPick.id].name} 目前在陣容中，開始訓練後會移出陣容。${SAVE.data.lineup.length <= 1 ? '<b>但陣容只剩他一位，請先讓其他船員上陣。</b>' : ''}</p>` : ''}
        <div class="tc-plans">${TRAIN_PLANS.map(p => { const pv = previewLv(trainPick.id, p.exp), lv = crewLv(trainPick.id); return `<button class="tc-plan" data-plan="${p.id}"><b>${p.label}</b><span>經驗 +${p.exp.toLocaleString()}</span><small>LV ${lv} → <em>LV ${pv}</em></small></button>`; }).join('')}</div>` : ''}
      <button class="btn-ghost" id="cxPickCancel">取消</button>`;
    P.querySelectorAll('.tc-cands .char').forEach(b => b.onclick = () => { trainPick.id = b.dataset.id; renderTrain(); });
    P.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => startTraining(trainPick.slot, trainPick.id, b.dataset.plan));
    $('cxPickCancel').onclick = () => { trainPick = null; renderTrain(); };
  }
  /* 倒數更新 */
  setInterval(() => {
    if (!$('charModal').classList.contains('show') || crewMode !== 'crew') return;
    let finished = false; document.querySelectorAll('#charModal [data-end]').forEach(el => { const left = +el.dataset.end - Date.now(); el.textContent = fmt(left); if (left <= 0) finished = true; });
    if (finished) render();
  }, 1000);
  /* 訓練完成時的紅點與提示 */
  setInterval(() => { const T = training(), now = Date.now(); T.forEach(t => { if (now >= t.end && !t.notified) { t.notified = true; SAVE.save(); toast(`${CHARACTERS[t.id].name} 的訓練完成了！到角色背包的訓練營領取經驗`, 'gold'); if (typeof coins === 'function') coins(); } }); }, 5000);

  window.addEventListener('DOMContentLoaded', () => {
    const b = $('trainBtnMap'); if (b) b.onclick = () => openCrew('train');
  });
})();
