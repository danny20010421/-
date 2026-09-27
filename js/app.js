/* 主程式：存檔、畫面切換、劇情任務、對話、扭蛋、公告 */
function $(id) { return document.getElementById(id); }
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ---------- 存檔 ---------- */
const SAVE = {
  key: 'op_voyage_save_v2',
  data: null,
  load() {
    let d = null; try { d = JSON.parse(localStorage.getItem(this.key) || 'null'); } catch (e) { }
    if (!d) d = { tokens: START_TOKENS, inventory: { potion_s: 2, pp_s: 1 }, chapters: {}, player: 'luffy', pulls: 0, pity: 0 };
    CHAPTERS.forEach(c => { d.chapters[c.id] = Object.assign({ step: 0, collected: [], defeated: [], roster: null, cleared: false, rewarded: [] }, d.chapters[c.id] || {}); });
    d.inventory = d.inventory || {}; this.data = d; return d;
  },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { } }
};
const DAILY_KEY = 'op_rpg_daily_characters_v1', DAILY_LIMIT = 2;
function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function dailyUsage() { let d = { date: today(), ids: [] }; try { const p = JSON.parse(localStorage.getItem(DAILY_KEY) || 'null'); if (p && p.date === today() && Array.isArray(p.ids)) d = { date: p.date, ids: [...new Set(p.ids)].slice(0, DAILY_LIMIT) }; } catch (e) { } return d; }
function dailyRegister(id) { const d = dailyUsage(); if (d.ids.includes(id)) return true; if (d.ids.length >= DAILY_LIMIT) return false; d.ids.push(id); try { localStorage.setItem(DAILY_KEY, JSON.stringify(d)); } catch (e) { } return true; }

/* ---------- 共用 UI ---------- */
let toastT = null;
function toast(msg, kind) { const el = $('toast'); el.textContent = msg; el.className = 'toast show ' + (kind || ''); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2200); }
function openModal(id) { $(id).classList.add('show'); }
function closeModal(id) { $(id).classList.remove('show'); }
function confirmBox(title, text, ok, fn) { $('cfTitle').textContent = title; $('cfText').textContent = text; $('cfOk').textContent = ok || '確定'; $('cfOk').onclick = () => { closeModal('confirmModal'); fn(); }; openModal('confirmModal'); }
const SCREENS = ['loginScreen', 'chapterScreen', 'worldScreen', 'battleScreen', 'gachaScreen'];
let currentScreen = 'loginScreen';
function showScreen(id) {
  SCREENS.forEach(k => $(k).classList.toggle('hidden', k !== id)); currentScreen = id;
  const v = $('loginVideo'); if (id === 'loginScreen') { v.play && v.play().catch(() => { }); } else v.pause && v.pause();
  if (id === 'worldScreen') { WORLD && WORLD.start(); } else if (WORLD) WORLD.stop();
}
function coins() { ['coinTop', 'coinWorld', 'coinGacha'].forEach(i => { const el = $(i); if (el) el.textContent = SAVE.data.tokens; }); }
function addTokens(n, why) { if (!n) return; SAVE.data.tokens += n; SAVE.save(); coins(); toast(`獲得寶藏幣 ×${n}${why ? '・' + why : ''}`, 'gold'); ['coinTop', 'coinWorld', 'coinGacha'].forEach(i => { const el = $(i) && $(i).parentElement; if (el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } }); }
const ICONS = {
  potion: '<path d="M26 8h12v10l10 16a14 14 0 0 1-12 22h-8A14 14 0 0 1 16 34l10-16z" fill="var(--c)"/><path d="M24 6h16v6H24z" fill="#8a6240"/><path d="M20 38h24a10 10 0 0 1-10 12h-4a10 10 0 0 1-10-12z" fill="#fff" opacity=".35"/>',
  flask: '<path d="M27 8h10v14l14 22a8 8 0 0 1-7 12H20a8 8 0 0 1-7-12l14-22z" fill="var(--c)"/><path d="M25 6h14v5H25z" fill="#8a6240"/><circle cx="28" cy="44" r="3" fill="#fff" opacity=".5"/><circle cx="36" cy="38" r="2" fill="#fff" opacity=".5"/>',
  herb: '<path d="M32 56V26" stroke="#4a7a2e" stroke-width="3"/><path d="M32 30C20 28 14 18 16 8c10 2 16 10 16 22zM32 36c10-2 16-10 16-20-10 2-16 8-16 20z" fill="var(--c)"/>',
  fruit: '<circle cx="32" cy="36" r="18" fill="var(--c)"/><path d="M32 18c0-6 4-10 8-10" stroke="#5a3d27" stroke-width="3" fill="none"/><path d="M34 16c6-6 14-4 16 0-6 4-12 4-16 0z" fill="#4f8f3a"/><circle cx="25" cy="30" r="4" fill="#fff" opacity=".4"/>',
  scroll: '<rect x="14" y="16" width="36" height="32" rx="3" fill="#efe2c0"/><rect x="10" y="12" width="44" height="8" rx="4" fill="var(--c)"/><rect x="10" y="44" width="44" height="8" rx="4" fill="var(--c)"/><path d="M20 26h24M20 32h18M20 38h22" stroke="#8a6240" stroke-width="2"/>',
  meat: '<path d="M14 40c-4-12 6-26 20-26s22 12 18 22-18 16-28 12z" fill="var(--c)"/><path d="M20 38c-2-8 4-16 14-16" stroke="#fff" stroke-width="3" opacity=".35" fill="none"/><rect x="40" y="38" width="16" height="6" rx="3" fill="#f4ead2" transform="rotate(30 48 41)"/><circle cx="56" cy="48" r="4" fill="#f4ead2"/>',
  feather: '<path d="M46 8C28 12 16 30 18 52l6-4c2-18 10-30 22-40z" fill="var(--c)"/><path d="M18 52L40 18" stroke="#b8433a" stroke-width="2"/><path d="M22 40l-6-2M26 32l-8-4M30 25l-6-5" stroke="#fff" stroke-width="2" opacity=".5"/>'
};
function itemIcon(it) { return `<svg class="ico" viewBox="0 0 64 64" style="--c:${it.color}">${ICONS[it.icon] || ICONS.potion}</svg>`; }

/* ---------- 登入與公告 ---------- */
const NEWS_KEY = 'op_rpg_news_v2';
function loadNews() { try { const n = JSON.parse(localStorage.getItem(NEWS_KEY) || 'null'); if (Array.isArray(n) && n.length) return n; } catch (e) { } return DEFAULT_NEWS.slice(); }
let newsFilter = '全部';
function renderNewsBoard() {
  const news = loadNews(); const tags = ['全部', ...new Set(news.map(n => n.tag))];
  $('newsTabs').innerHTML = tags.map(t => `<button class="${t === newsFilter ? 'on' : ''}" data-t="${esc(t)}">${esc(t)}</button>`).join('');
  $('newsTabs').querySelectorAll('button').forEach(b => b.onclick = () => { newsFilter = b.dataset.t; renderNewsBoard(); });
  const list = news.filter(n => newsFilter === '全部' || n.tag === newsFilter).slice(0, 4);
  $('newsBoard').innerHTML = list.map((n, i) => `<li style="--i:${i}"><button data-id="${esc(n.id)}"><span class="nb-tag t-${esc(n.tag)}">${esc(n.tag)}</span><span class="nb-title">${esc(n.title)}</span><time>${esc(n.date.slice(5).replace('-', '/'))}</time></button></li>`).join('') || '<li class="nb-empty">這個分類目前沒有公告。</li>';
  $('newsBoard').querySelectorAll('button').forEach(b => b.onclick = () => openNews(b.dataset.id));
}
function openNews(focusId) {
  const news = loadNews();
  $('newsFull').innerHTML = news.map(n => `<article id="nf-${esc(n.id)}" class="${n.id === focusId ? 'focus' : ''}"><header><span class="nb-tag t-${esc(n.tag)}">${esc(n.tag)}</span><time>${esc(n.date)}</time></header><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p></article>`).join('');
  openModal('newsModal');
  if (focusId) setTimeout(() => { const el = document.getElementById('nf-' + focusId); el && el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 60);
}
function openNewsEditor() {
  closeModal('newsModal'); const news = loadNews();
  const row = (n) => `<div class="ne-row" data-id="${esc(n.id)}"><div class="ne-meta"><input type="date" value="${esc(n.date)}" aria-label="日期"><input value="${esc(n.tag)}" aria-label="分類" maxlength="6"><button class="icon-btn sm ne-del" aria-label="刪除">×</button></div><input class="ne-title" value="${esc(n.title)}" aria-label="標題"><textarea rows="2" aria-label="內文">${esc(n.body)}</textarea></div>`;
  $('newsEditList').innerHTML = news.map(row).join('');
  const bindDel = () => $('newsEditList').querySelectorAll('.ne-del').forEach(b => b.onclick = () => b.closest('.ne-row').remove());
  bindDel();
  $('newsAddBtn').onclick = () => { $('newsEditList').insertAdjacentHTML('afterbegin', row({ id: 'n' + Date.now(), date: today(), tag: '公告', title: '', body: '' })); bindDel(); };
  $('newsResetBtn').onclick = () => { localStorage.removeItem(NEWS_KEY); openNewsEditor(); toast('已恢復預設公告'); };
  $('newsSaveBtn').onclick = () => {
    const out = [...$('newsEditList').querySelectorAll('.ne-row')].map(r => { const i = r.querySelectorAll('input'); return { id: r.dataset.id, date: i[0].value || today(), tag: i[1].value.trim() || '公告', title: i[2].value.trim(), body: r.querySelector('textarea').value.trim() }; }).filter(n => n.title);
    out.sort((a, b) => b.date.localeCompare(a.date)); localStorage.setItem(NEWS_KEY, JSON.stringify(out)); renderNewsBoard(); closeModal('newsEditModal'); toast('公告已儲存');
  };
  openModal('newsEditModal');
}
function loginInfo() { const d = SAVE.data, cl = CHAPTERS.filter(c => d.chapters[c.id].cleared).length; $('loginSaveInfo').textContent = cl || d.pulls ? `航海進度 ${cl}/${CHAPTERS.length} 篇章・寶藏幣 ${d.tokens}` : '第一次出航？先選一位船長。'; }

/* ---------- 角色選擇 ---------- */
let pickChar = null;
function openCharModal() {
  pickChar = SAVE.data.player || 'luffy'; const u = dailyUsage();
  $('quotaNote').innerHTML = `每天最多登錄 ${DAILY_LIMIT} 位不同角色，今天已登錄 <b>${u.ids.length}/${DAILY_LIMIT}</b>${u.ids.length ? '：' + u.ids.map(i => CHARACTERS[i].name).join('、') : ''}。`;
  renderCharGrid(); openModal('charModal');
}
function renderCharGrid() {
  const u = dailyUsage();
  $('charGrid').innerHTML = CHARACTER_ORDER.map(id => { const c = CHARACTERS[id]; const locked = !u.ids.includes(id) && u.ids.length >= DAILY_LIMIT; return `<button class="char ${id === pickChar ? 'on' : ''} ${locked ? 'locked' : ''}" data-id="${id}" aria-pressed="${id === pickChar}"><img src="${c.image}" alt="" loading="lazy"><span class="c-name">${c.name}</span>${u.ids.includes(id) ? '<span class="c-badge">今日已登錄</span>' : locked ? '<span class="c-badge off">明天可用</span>' : ''}</button>`; }).join('');
  $('charGrid').querySelectorAll('.char').forEach(b => b.onclick = () => { pickChar = b.dataset.id; renderCharGrid(); });
  const c = CHARACTERS[pickChar];
  $('charDetail').innerHTML = `<img src="${c.avatar}" alt=""><div><h3>${c.name}<small>${c.title}</small></h3><div class="pl-types">${c.types.map(t => `<span class="type" style="--t:${TYPE_COLORS[t] || '#888'}">${t}</span>`).join('')}</div><p>${c.desc}</p><dl><div><dt>體力</dt><dd>${c.maxHp}</dd></div><div><dt>速度</dt><dd>${c.baseSpeed}</dd></div><div><dt>奧義</dt><dd>${(c.skills.find(s => s.ultimate) || c.skills[c.skills.length - 1]).name}</dd></div></dl></div>`;
}
function confirmChar() {
  if (!dailyRegister(pickChar)) { toast(`今天已登錄 ${DAILY_LIMIT} 位角色，請從已登錄的角色中選擇`, 'warn'); renderCharGrid(); return; }
  SAVE.data.player = pickChar; SAVE.save(); closeModal('charModal'); openChart();
}

/* ---------- 篇章海圖 ---------- */
const NODE_POS_WIDE = [[12, 70], [31, 38], [51, 64], [70, 30], [86, 58]], NODE_POS_TALL = [[24, 92], [72, 72], [28, 52], [72, 30], [32, 8]];
let NODE_POS = NODE_POS_WIDE;
let selChapter = null;
function chapterUnlocked(i) { return i === 0 || SAVE.data.chapters[CHAPTERS[i - 1].id].cleared; }
function openChart(focus) {
  coins(); const d = SAVE.data, pc = CHARACTERS[d.player];
  NODE_POS = innerWidth < 860 ? NODE_POS_TALL : NODE_POS_WIDE;
  $('captainChip').innerHTML = `<img src="${pc.avatar}" alt=""><div><b>${pc.name}</b><small>${pc.title}</small></div><button class="btn-ghost sm" id="swapChar">換角色</button>`;
  $('swapChar').onclick = openCharModal;
  const path = NODE_POS.map(([x, y], i) => `${i ? 'L' : 'M'}${x * 10} ${y * 6}`).join(' ');
  const doneIdx = CHAPTERS.findIndex(c => !d.chapters[c.id].cleared);
  const donePath = NODE_POS.slice(0, (doneIdx < 0 ? CHAPTERS.length : doneIdx) + 1).map(([x, y], i) => `${i ? 'L' : 'M'}${x * 10} ${y * 6}`).join(' ');
  $('chartRoute').innerHTML = `<path d="${path}" class="route-all"/><path d="${donePath}" class="route-done"/>`;
  $('chartNodes').innerHTML = CHAPTERS.map((c, i) => { const st = d.chapters[c.id], un = chapterUnlocked(i); return `<button class="node ${st.cleared ? 'cleared' : ''} ${un ? '' : 'locked'}" data-id="${c.id}" style="left:${NODE_POS[i][0]}%;top:${NODE_POS[i][1]}%"><span class="node-art" style="background-image:url('${c.art}')"></span><span class="node-name">${c.name}</span>${st.cleared ? '<i class="node-flag" aria-label="已完成"></i>' : ''}</button>`; }).join('');
  $('chartNodes').querySelectorAll('.node').forEach(b => b.onclick = () => selectChapter(b.dataset.id));
  const def = focus || (selChapter && CHAPTERS.find(c => c.id === selChapter) ? selChapter : (CHAPTERS[doneIdx < 0 ? 0 : doneIdx] || CHAPTERS[0]).id);
  selectChapter(def); showScreen('chapterScreen');
}
function selectChapter(id) {
  selChapter = id; const i = CHAPTERS.findIndex(c => c.id === id), c = CHAPTERS[i], st = SAVE.data.chapters[id], un = chapterUnlocked(i), diff = CHAPTER_DIFFICULTY[id], boss = CHARACTERS[c.boss];
  document.querySelectorAll('#chartNodes .node').forEach(n => n.classList.toggle('on', n.dataset.id === id));
  const total = c.steps.length, done = st.cleared ? total : st.step;
  const next = st.cleared ? '已完成，可以重玩或回來刷對戰。' : c.steps[st.step].title;
  $('arcCard').innerHTML = `<div class="arc-art" style="background-image:url('${c.art}')"></div>
    <div class="arc-body">
      <div class="arc-head"><h2>${c.name}</h2><span class="stars" aria-label="難度 ${diff.stars} 顆星">${'★'.repeat(diff.stars)}<i>${'★'.repeat(5 - diff.stars)}</i></span></div>
      <p class="arc-sub">${c.subtitle}</p>
      <p class="arc-blurb">${c.blurb}</p>
      <div class="arc-boss"><img src="${boss.avatar}" alt=""><div><small>篇章 BOSS</small><b>${c.bossTitle}</b></div></div>
      <div class="arc-prog"><div class="bar"><i style="width:${done / total * 100}%"></i></div><span>${un ? (st.cleared ? '已完成' : `任務 ${done}/${total}：${next}`) : `完成「${CHAPTERS[i - 1].name}」後解鎖`}</span></div>
      <div class="arc-actions">${un ? `<button class="btn-primary big" id="sailBtn">${st.cleared ? '再次登島' : st.step ? '繼續冒險' : '出航'}</button>${st.cleared ? '<button class="btn-ghost" id="replayBtn">重玩劇情</button>' : ''}` : '<button class="btn-primary big" disabled>尚未解鎖</button>'}</div>
    </div>`;
  const sail = $('sailBtn'); if (sail) sail.onclick = () => enterChapter(id);
  const rp = $('replayBtn'); if (rp) rp.onclick = () => confirmBox('重玩劇情？', '任務進度會從頭開始，敵人重新出現。已領過的寶藏幣不會重複發放。', '重玩', () => { Object.assign(st, { step: 0, collected: [], defeated: [], roster: null }); SAVE.save(); enterChapter(id); });
  const card = $('arcCard'); card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
}

/* ---------- 3D 世界與劇情 ---------- */
let WORLD = null, CH = null;
const ENEMY_SPOTS = [[-32, -24], [30, -30], [-8, -18], [-46, 22], [44, 18]];
function chState() { return SAVE.data.chapters[CH.id]; }
function worldState() {
  const st = chState(), step = CH.steps[Math.min(st.step, CH.steps.length - 1)], pid = SAVE.data.player;
  if (!st.roster) { const pool = CHARACTER_ORDER.filter(id => id !== CH.boss && id !== pid); for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[pool[i], pool[j]] = [pool[j], pool[i]]; } st.roster = pool.slice(0, 3); SAVE.save(); }
  const enemies = st.roster.map((id, i) => ({ id, x: ENEMY_SPOTS[i][0], z: ENEMY_SPOTS[i][1], boss: false })).filter(e => !st.defeated.includes(e.id));
  if (!(st.cleared && st.step >= CH.steps.length)) enemies.push({ id: CH.boss, x: CH.bossPos[0], z: CH.bossPos[1], boss: true });
  const collectStep = CH.steps.find(s => s.type === 'collect'); const ci = CH.steps.indexOf(collectStep);
  const items = st.step === ci ? collectStep.spots.map((p, i) => ({ idx: i, x: p[0], z: p[1], icon: collectStep.icon, label: collectStep.item })).filter(it => !st.collected.includes(it.idx)) : [];
  const bossUnlocked = st.cleared || CH.steps.slice(0, st.step).some(s => s.unlockBoss);
  let target = null;
  if (!(st.cleared && st.step >= CH.steps.length)) { if (step.type === 'talk') target = { type: 'npc', id: step.npc }; else if (step.type === 'boss') target = { type: 'boss' }; }
  const clear = [...ENEMY_SPOTS.map(p => [p[0], p[1], 7]), ...collectStep.spots.map(p => [p[0], p[1], 5]), ...CH.npcs.map(n => [n.pos[0], n.pos[1], 5])];
  return { enemies, items, bossUnlocked, target, clear };
}
function enterChapter(id) {
  CH = CHAPTERS.find(c => c.id === id); $('loading').classList.add('show');
  setTimeout(() => {
    try {
      if (!WORLD) WORLD = new World({ canvas: $('worldCanvas'), labels: $('worldLabels'), minimap: $('minimap'), callbacks: { onInteract, onPickup, onNear } });
      WORLD.load(CH, SAVE.data.player, worldState());
    } catch (err) { $('loading').classList.remove('show'); console.error(err); toast('這台裝置無法開啟 3D 場景（WebGL 不可用）', 'warn'); return; }
    $('wChapter').textContent = CH.name; $('wChapterSub').textContent = CH.subtitle; coins();
    renderQuest(); onNear(null); hideDialog(); $('clearOverlay').classList.remove('show');
    showScreen('worldScreen'); $('loading').classList.remove('show');
    const st = chState();
    if (st.step === 0 && !st.cleared) setTimeout(() => say([[null, `${CH.name}・${CH.subtitle}`], [null, CH.blurb], [null, '找到頭上有「!」的人說話，任務會一步一步帶你前進。']]), 500);
    $('wHelp').classList.remove('fade'); setTimeout(() => $('wHelp').classList.add('fade'), 6000);
  }, 40);
}
function refreshWorld() { WORLD.setState(worldState()); renderQuest(); }
function renderQuest() {
  const st = chState(); const total = CH.steps.length;
  if (st.cleared && st.step >= total) { $('questBox').innerHTML = `<h3>${CH.name}</h3><p class="q-done">篇章已完成。可以和居民聊天，或回海圖挑戰下一座島。</p>`; return; }
  const s = CH.steps[st.step]; let prog = '';
  if (s.type === 'collect') prog = `<span class="q-count">${st.collected.length}/${s.count}</span>`;
  if (s.type === 'defeat') prog = `<span class="q-count">${Math.min(st.defeated.length, s.count)}/${s.count}</span>`;
  $('questBox').innerHTML = `<h3><span>任務 ${st.step + 1}/${total}</span>${s.title}</h3><p>${s.desc} ${prog}</p>${s.reward ? `<small class="q-rew"><i class="coin-ico"></i>×${s.reward}</small>` : ''}`;
  const q = $('questBox'); q.classList.remove('flash'); void q.offsetWidth; q.classList.add('flash');
}
function completeStep() {
  const st = chState(), idx = st.step, s = CH.steps[idx];
  if (!st.rewarded.includes(idx)) { st.rewarded.push(idx); addTokens(s.reward, s.title); }
  st.step++; SAVE.save();
  const nx = CH.steps[st.step];
  if (nx && nx.type === 'defeat' && st.defeated.length >= nx.count) { setTimeout(completeStep, 600); }
  refreshWorld();
}
function onNear(n) {
  const b = $('actBtn');
  if (!n) { b.classList.remove('show'); return; }
  b.innerHTML = n.kind === 'npc' ? `<small>E</small>對話・${esc(n.name)}` : `<small>E</small>${n.boss ? '挑戰 BOSS' : '挑戰'}・${esc(CHARACTERS[n.id].name)}`;
  b.classList.toggle('fight', n.kind !== 'npc'); b.classList.add('show');
}
function onPickup(it) {
  const st = chState(), s = CH.steps[st.step]; if (!s || s.type !== 'collect') return;
  if (!st.collected.includes(it.idx)) st.collected.push(it.idx); SAVE.save();
  toast(`撿到${s.item}（${st.collected.length}/${s.count}）`);
  if (st.collected.length >= s.count) { completeStep(); say([[null, `${s.item}都找齊了！`], [null, `下一步：${CH.steps[st.step].title}`]]); }
  else renderQuest();
}
function onInteract(n) {
  if (dialogOpen) return;
  const st = chState(), s = CH.steps[st.step];
  if (n.kind === 'npc') {
    if (s && s.type === 'talk' && s.npc === n.id && !(st.cleared && st.step >= CH.steps.length)) {
      say(s.lines.map(([who, t]) => [who, t]), () => { const unlock = s.unlockBoss; completeStep(); if (unlock) { toast('BOSS 屏障解除了', 'gold'); } });
      return;
    }
    const hint = s && !(st.cleared && st.step >= CH.steps.length) ? `（目前任務：${s.title}）` : '';
    const pool = n.chat && n.chat.length ? n.chat : ['路上小心，航海者。'];
    say([[n.id, pool[Math.floor(Math.random() * pool.length)] + (hint && Math.random() < .5 ? ' ' + hint : '')]]);
    return;
  }
  // 敵人
  const c = CHARACTERS[n.id], lines = ENCOUNTER_LINES[n.id] || ['來吧！'];
  const intro = n.boss ? [['@' + n.id, lines[0]], ['@' + n.id, lines[1] || lines[0]]] : [['@' + n.id, lines[Math.floor(Math.random() * lines.length)]]];
  say(intro, null, [{ label: n.boss ? '開始 BOSS 戰' : '開始對戰', primary: true, fn: () => beginFight(n) }, { label: '先離開', fn: () => { } }]);
}
function beginFight(n) {
  WORLD.paused = true;
  startBattle({
    playerId: SAVE.data.player, enemyId: n.id, chapterId: CH.id, isBoss: n.boss,
    onEnd: (r) => onBattleEnd(r),
    onLeave: () => { showScreen('worldScreen'); WORLD.paused = false; refreshWorld(); coins(); if (pendingClear) { const pc = pendingClear; pendingClear = null; setTimeout(() => showClear(pc), 350); } }
  });
}
let pendingClear = null;
function onBattleEnd(r) {
  if (!r.win) return {};
  const st = chState(); const msgs = [];
  if (r.isBoss) {
    const s = CH.steps[st.step];
    if (s && s.type === 'boss') { const before = SAVE.data.tokens; const first = !st.cleared; st.cleared = true; completeStep(); if (first) { SAVE.data.tokens += CLEAR_BONUS; msgs.push(`首次通關獎勵：寶藏幣 ×${CLEAR_BONUS}`); } SAVE.save(); coins(); const got = SAVE.data.tokens - before; if (got) msgs.unshift(`這一戰共得到寶藏幣 ×${got}`); pendingClear = { first }; }
  } else {
    if (!st.defeated.includes(r.enemyId)) st.defeated.push(r.enemyId); SAVE.save();
    const s = CH.steps[st.step];
    if (s && s.type === 'defeat') { if (st.defeated.length >= s.count) { const b = SAVE.data.tokens; completeStep(); msgs.push(`任務完成：${s.title}（寶藏幣 +${SAVE.data.tokens - b}）`); } else msgs.push(`任務進度：${st.defeated.length}/${s.count}`); }
  }
  return { message: msgs.join('<br>') };
}
function showClear(pc) {
  const i = CHAPTERS.findIndex(c => c.id === CH.id), next = CHAPTERS[i + 1];
  $('clearTitle').textContent = `${CH.name} 完成`;
  $('clearDesc').innerHTML = `${CH.bossTitle}被擊敗了，這座島恢復了平靜。${next ? `<br>新的航路已經打開：<b>${next.name}</b>。` : '<br>你走完了整條偉大航路。'}<br>別忘了去扭蛋機換道具。`;
  $('clearOverlay').classList.add('show');
}

/* ---------- 對話 ---------- */
let dialogOpen = false, dlgQueue = [], dlgDone = null, dlgChoices = null, typing = null;
function faceFor(who) {
  if (who && who[0] === '@') { const c = CHARACTERS[who.slice(1)]; return { name: c.name, html: `<img src="${c.avatar}" alt="">`, foe: true }; }
  if (!who) return { name: '航海日誌', html: '<span class="dlg-emblem">⚓</span>' };
  const n = CH.npcs.find(x => x.id === who); return { name: n ? n.name : who, html: `<span class="dlg-emblem npc-${n ? n.look : ''}">${(n ? n.name.replace(/^.*\s/, '') : '?').slice(0, 1)}</span>`, role: n && n.role };
}
function say(lines, done, choices) { dlgQueue = lines.slice(); dlgDone = done || null; dlgChoices = choices || null; dialogOpen = true; if (WORLD) WORLD.paused = true; $('dialog').classList.add('show'); nextLine(); }
function nextLine() {
  if (typing) { clearInterval(typing.h); $('dlgText').textContent = typing.full; typing = null; if (!dlgQueue.length && dlgChoices) showChoices(); return; }
  if (!dlgQueue.length) { if (dlgChoices) return; hideDialog(); const f = dlgDone; dlgDone = null; f && f(); return; }
  const [who, text] = dlgQueue.shift(), f = faceFor(who);
  $('dlgFace').innerHTML = f.html; $('dlgFace').classList.toggle('foe', !!f.foe);
  $('dlgName').innerHTML = esc(f.name) + (f.role ? `<small>${esc(f.role)}</small>` : '');
  $('dlgChoices').innerHTML = ''; $('dlgNext').style.visibility = 'visible';
  const el = $('dlgText'); el.textContent = ''; let i = 0; const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { el.textContent = text; if (!dlgQueue.length && dlgChoices) showChoices(); return; }
  typing = { full: text, h: setInterval(() => { i += 1; el.textContent = text.slice(0, i); if (i >= text.length) { clearInterval(typing.h); typing = null; if (!dlgQueue.length && dlgChoices) showChoices(); } }, 26) };
}
function showChoices() {
  $('dlgNext').style.visibility = 'hidden';
  $('dlgChoices').innerHTML = dlgChoices.map((c, i) => `<button class="${c.primary ? 'btn-primary' : 'btn-ghost'}" data-i="${i}">${c.label}</button>`).join('');
  $('dlgChoices').querySelectorAll('button').forEach(b => b.onclick = (e) => { e.stopPropagation(); const c = dlgChoices[+b.dataset.i]; dlgChoices = null; hideDialog(); c.fn(); });
}
function hideDialog() { dialogOpen = false; $('dialog').classList.remove('show'); if (WORLD && currentScreen === 'worldScreen') WORLD.paused = false; }

/* ---------- 扭蛋機 ---------- */
let gachaReturn = 'chapterScreen', gachaBusy = false;
function openGacha() {
  gachaReturn = currentScreen === 'gachaScreen' ? gachaReturn : currentScreen; coins();
  $('rateTable').innerHTML = '<caption>出現機率</caption>' + Object.entries(RARITY).map(([k, r]) => `<tr><th><span class="rar r-${k}">${k}</span></th><td>${Math.round(r.rate * 100)}%</td><td>${Object.values(ITEMS).filter(i => i.rarity === k).map(i => i.name).join('、')}</td></tr>`).join('');
  const caps = $('mCaps'); if (!caps.children.length) { const cols = ['#e8553b', '#3fb6c9', '#ffd26c', '#b58cff', '#6fd08c', '#f4f7f2']; for (let i = 0; i < 22; i++) { const s = document.createElement('i'); s.style.cssText = `--c:${cols[i % cols.length]};left:${6 + (i * 37) % 78}%;top:${40 + ((i * 53) % 50)}%;--r:${(i * 47) % 360}deg`; caps.appendChild(s); } }
  updateGachaBtns(); showScreen('gachaScreen');
}
function updateGachaBtns() {
  const t = SAVE.data.tokens; $('pull1').disabled = t < GACHA_COST.single || gachaBusy; $('pull10').disabled = t < GACHA_COST.ten || gachaBusy;
  $('gEmpty').textContent = t < 1 ? '寶藏幣不夠了。回到篇章推進劇情任務就能再拿到。' : '';
}
function rollOne(minR) {
  const order = ['N', 'R', 'SR', 'SSR']; let r = Math.random(), rar = 'N', acc = 0;
  for (const k of order) { acc += RARITY[k].rate; if (r < acc) { rar = k; break; } }
  if (minR && order.indexOf(rar) < order.indexOf(minR)) rar = Math.random() < .9 ? 'SR' : 'SSR';
  const pool = Object.entries(ITEMS).filter(([, i]) => i.rarity === rar); return pool[Math.floor(Math.random() * pool.length)][0];
}
async function pull(n) {
  const cost = n === 10 ? GACHA_COST.ten : GACHA_COST.single; if (gachaBusy || SAVE.data.tokens < cost) return;
  gachaBusy = true; SAVE.data.tokens -= cost; coins(); updateGachaBtns();
  const res = []; for (let i = 0; i < n; i++) res.push(rollOne());
  if (n === 10 && !res.some(id => ['SR', 'SSR'].includes(ITEMS[id].rarity))) res[9] = rollOne('SR');
  res.forEach(id => { SAVE.data.inventory[id] = (SAVE.data.inventory[id] || 0) + 1; }); SAVE.data.pulls += n; SAVE.save();
  const best = res.map(id => ITEMS[id].rarity).sort((a, b) => ['N', 'R', 'SR', 'SSR'].indexOf(b) - ['N', 'R', 'SR', 'SSR'].indexOf(a))[0];
  const m = $('machine'); m.className = 'machine spin'; $('mDrop').className = 'm-drop r-' + best;
  await wait(matchMedia('(prefers-reduced-motion: reduce)').matches ? 200 : 1500);
  m.className = 'machine';
  $('gResTitle').textContent = n === 10 ? '十連結果' : '獲得道具';
  $('gResGrid').className = 'g-res-grid ' + (n === 10 ? 'ten' : 'one');
  $('gResGrid').innerHTML = res.map((id, i) => { const it = ITEMS[id]; return `<div class="g-cap r-${it.rarity}" style="--d:${i * 90}ms"><span class="rar r-${it.rarity}">${it.rarity}</span>${itemIcon(it)}<b>${it.name}</b><small>${it.desc}</small></div>`; }).join('');
  $('gResult').classList.add('show'); gachaBusy = false; updateGachaBtns();
}
function openBag() {
  const inv = SAVE.data.inventory, ids = Object.keys(ITEMS).filter(id => inv[id] > 0);
  $('bagList').innerHTML = ids.length ? ids.map(id => { const it = ITEMS[id]; return `<div class="bagItem static r-${it.rarity}">${itemIcon(it)}<span class="bi-name">${it.name}<small>${it.desc}</small></span><b>×${inv[id]}</b></div>`; }).join('') : '<div class="bagEmpty">背包是空的。完成劇情任務拿到寶藏幣，就能到扭蛋機抽道具。</div>';
  openModal('bagModal');
}

/* ---------- 搖桿 ---------- */
function bindJoystick() {
  const j = $('joy'), k = j.querySelector('i'); let id = null, cx = 0, cy = 0;
  j.addEventListener('pointerdown', e => { id = e.pointerId; j.setPointerCapture(id); const r = j.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; move(e); });
  const move = (e) => { if (e.pointerId !== id) return; let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy), m = 44; if (d > m) { dx = dx / d * m; dy = dy / d * m; } k.style.transform = `translate(${dx}px,${dy}px)`; WORLD && WORLD.setJoystick(dx / m, -dy / m); };
  j.addEventListener('pointermove', move);
  const end = (e) => { if (e.pointerId !== id) return; id = null; k.style.transform = ''; WORLD && WORLD.setJoystick(0, 0); };
  j.addEventListener('pointerup', end); j.addEventListener('pointercancel', end);
}

/* ---------- 啟動 ---------- */
function boot() {
  SAVE.load(); renderNewsBoard(); loginInfo(); coins(); bindBattle(); bindJoystick();
  document.querySelectorAll('.modal').forEach(m => { m.addEventListener('click', e => { if (e.target === m) m.classList.remove('show'); }); m.querySelectorAll('[data-close]').forEach(b => b.onclick = () => m.classList.remove('show')); });
  $('startBtn').onclick = openCharModal; $('charConfirm').onclick = confirmChar;
  $('newsOpenBtn').onclick = () => openNews(); $('newsMoreBtn').onclick = () => openNews(); $('newsEditBtn').onclick = openNewsEditor;
  $('soundBtn').onclick = () => { const v = $('loginVideo'); v.muted = !v.muted; $('soundBtn').textContent = '影片音效：' + (v.muted ? '關' : '開'); $('soundBtn').setAttribute('aria-pressed', String(!v.muted)); };
  $('chBackBtn').onclick = () => { loginInfo(); showScreen('loginScreen'); };
  $('wBackBtn').onclick = () => openChart(CH && CH.id);
  ['gachaBtnMap', 'gachaBtnWorld'].forEach(i => $(i).onclick = openGacha);
  ['bagBtnMap', 'bagBtnWorld', 'bagBtnGacha'].forEach(i => $(i).onclick = openBag);
  $('gBackBtn').onclick = () => { if (gachaReturn === 'worldScreen') { showScreen('worldScreen'); coins(); } else openChart(); };
  $('pull1').onclick = () => pull(1); $('pull10').onclick = () => pull(10); $('mCrank').onclick = () => pull(1);
  $('gResOk').onclick = () => $('gResult').classList.remove('show');
  $('actBtn').onclick = () => WORLD && WORLD.interact();
  $('dialog').onclick = () => nextLine();
  window.addEventListener('keydown', e => { if (dialogOpen && (e.key === ' ' || e.key === 'Enter' || e.key.toLowerCase() === 'e')) { e.preventDefault(); e.stopImmediatePropagation(); nextLine(); } if (e.key === 'Escape') document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')); }, true);
  $('clearStay').onclick = () => $('clearOverlay').classList.remove('show');
  $('clearGo').onclick = () => { $('clearOverlay').classList.remove('show'); openChart(); };
  // 預載角色圖
  CHARACTER_ORDER.forEach(id => { const i = new Image(); i.src = CHARACTERS[id].image; });
  showScreen('loginScreen');
}
window.addEventListener('DOMContentLoaded', boot);
let _rz; window.addEventListener('resize', () => { clearTimeout(_rz); _rz = setTimeout(() => { if (currentScreen === 'chapterScreen') openChart(selChapter); }, 200); });
