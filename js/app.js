/* 主程式：存檔、畫面切換、劇情任務、對話、扭蛋、公告 */
function $(id) { return document.getElementById(id); }
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ---------- 存檔 ---------- */
const SAVE = {
  key: 'op_voyage_save_v2',
  data: null,
  load() {
    let d = null; try { d = JSON.parse(localStorage.getItem(this.key) || 'null'); } catch (e) { }
    if (!d) d = { tokens: GAME_SETTINGS.startTokens, inventory: { potion_s: 2, pp_s: 1 }, chapters: {}, player: 'luffy', pulls: 0, pity: 0 };
    CHAPTERS.forEach(c => { d.chapters[c.id] = Object.assign({ step: 0, collected: [], defeated: [], talked: [], roster: null, cleared: false, rewarded: [] }, d.chapters[c.id] || {}); if (d.chapters[c.id].step > c.steps.length) d.chapters[c.id].step = c.steps.length; });
    d.berry = d.berry || 0; d.roster = d.roster || {}; if (!Array.isArray(d.lineup)) d.lineup = d.player && d.roster[d.player] ? [d.player] : []; d.lineup = d.lineup.filter(id => d.roster[id]).slice(0, GAME_SETTINGS.lineupMax); if (d.lineup.length) d.player = d.lineup[0]; d.inventory = d.inventory || {};
    if (!d.roster) { d.roster = {}; if (CHAPTERS.some(c => d.chapters[c.id].step > 0 || d.chapters[c.id].cleared) && CHARACTERS[d.player]) d.roster[d.player] = { lv: 40, exp: 0 }; }
    if (d.player && !d.roster[d.player]) d.player = Object.keys(d.roster)[0] || 'luffy';
    this.data = d; return d;
  },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { } }
};
const DAILY_KEY = 'op_rpg_daily_characters_v1';
function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

/* ---------- 共用 UI ---------- */
let toastT = null;
function toast(msg, kind) { const el = $('toast'); el.textContent = msg; el.className = 'toast show ' + (kind || ''); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2200); }
function openModal(id) { const _m = document.getElementById(id); if (_m) _m.querySelectorAll('.modal-card,.cx-detail,.cx-grid').forEach(e => e.scrollTop = 0); $(id).classList.add('show'); }
function closeModal(id) { $(id).classList.remove('show'); }
function confirmBox(title, text, ok, fn) { $('cfTitle').textContent = title; $('cfText').textContent = text; $('cfOk').textContent = ok || '確定'; $('cfOk').onclick = () => { closeModal('confirmModal'); fn(); }; openModal('confirmModal'); }
const SCREENS = ['loginScreen', 'modeScreen', 'runnerScreen', 'towerScreen', 'chapterScreen', 'worldScreen', 'battleScreen', 'gachaScreen'];
let currentScreen = 'loginScreen';
function showScreen(id) {
  document.querySelectorAll('.sk-tip.show').forEach(t => t.classList.remove('show'));
  SCREENS.forEach(k => $(k).classList.toggle('hidden', k !== id)); currentScreen = id;
  const v = $('loginVideo'); if (id === 'loginScreen') { v.play && v.play().catch(() => { }); } else v.pause && v.pause();
  if (id === 'worldScreen') { WORLD && WORLD.start(); } else if (WORLD) WORLD.stop();
  const song = { loginScreen: 'title', modeScreen: 'map', chapterScreen: 'map', gachaScreen: 'gacha', worldScreen: CH ? CH.id : 'map' }[id];
  if (song) AUDIO.playSong(song); else if (id === 'runnerScreen' || id === 'towerScreen') AUDIO.stopSong();
  AUDIO.ambient(id === 'runnerScreen' ? 'seawind' : id === 'towerScreen' ? 'dungeon' : id === 'worldScreen' && CH ? ({ alabasta: 'wind', skypiea: 'wind' }[CH.id] || 'sea') : null);
}
function syncSound() { const off = AUDIO.pref.muted; document.querySelectorAll('[data-snd]').forEach(b => { b.classList.toggle('off', off); b.setAttribute('aria-pressed', String(!off)); }); $('soundBtn').textContent = '音樂：' + (off ? '關' : '開'); }
function toggleSound() { AUDIO.setPref({ muted: !AUDIO.pref.muted }); AUDIO.unlock(); syncSound(); }
/* 紅點提醒：有可以領的東西時，在對應按鈕上顯示 */
function updateDots() {
  try {
    const d = SAVE.data, hub = (!d.freeDraw && Object.keys(d.roster).length > 0) || (typeof bounties === 'function' && bounties().some(b => b.prog >= b.goal && !b.claimed));
    const tr = typeof TREASURE !== 'undefined' && (TREASURE.pieces.some(p => d.chapters[p.chapter].cleared && !((d.treasure || {}).found || []).includes(p.chapter)) || (((d.treasure || {}).found || []).length >= TREASURE.pieces.length && !(d.treasure || {}).done));
    const crew = ['exp_s', 'exp_m', 'exp_l'].some(k => d.inventory[k] > 0) || (d.training || []).some(t => Date.now() >= t.end);
    const set = (sel, on) => document.querySelectorAll(sel).forEach(el => el.classList.toggle('has-dot', !!on));
    set('#gachaBtnMap,#gachaBtnWorld,[data-dock=hub]', hub); set('#treasureBtnMap', tr); set('#trainBtnMap', (d.training || []).some(t => Date.now() >= t.end)); set('[data-dock=crew],#swapChar', crew); set('#hubTabs [data-hub=bounty]', typeof bounties === 'function' && bounties().some(b => b.prog >= b.goal && !b.claimed));
    set('.m-menu', hub || tr);
  } catch (e) { }
}
function coins() { updateDots(); ['coinTop', 'coinWorld', 'coinGacha'].forEach(i => { const el = $(i); if (el) el.textContent = SAVE.data.tokens; }); document.querySelectorAll('.berryVal').forEach(el => el.textContent = (SAVE.data.berry || 0).toLocaleString()); document.querySelectorAll('.coinVal').forEach(el => el.textContent = SAVE.data.tokens); }
function addBerry(n) { if (!n) return; SAVE.data.berry = (SAVE.data.berry || 0) + n; SAVE.save(); coins(); document.querySelectorAll('.coin.berry').forEach(el => { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }); }
/* 陣容：最多 GAME_SETTINGS.lineupMax 人，第一位是先鋒（也是在島上行走的角色） */
function syncLeader() { const L = SAVE.data.lineup; if (L.length) SAVE.data.player = L[0]; SAVE.save(); }
function inLineup(id) { return SAVE.data.lineup.includes(id); }
function lineupAdd(id, front) { const L = SAVE.data.lineup; if (L.includes(id)) { if (front) { L.splice(L.indexOf(id), 1); L.unshift(id); } } else { if (L.length >= GAME_SETTINGS.lineupMax) L.pop(); front ? L.unshift(id) : L.push(id); } syncLeader(); }
function lineupRemove(id) { const L = SAVE.data.lineup; if (L.length <= 1) return false; L.splice(L.indexOf(id), 1); syncLeader(); return true; }
function addTokens(n, why) { if (!n) return; SFX.play('coin'); SAVE.data.tokens += n; SAVE.save(); coins(); toast(`獲得寶藏幣 ×${n}${why ? '・' + why : ''}`, 'gold'); ['coinTop', 'coinWorld', 'coinGacha'].forEach(i => { const el = $(i) && $(i).parentElement; if (el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } }); }
const ICONS = {
  potion: '<path d="M26 8h12v10l10 16a14 14 0 0 1-12 22h-8A14 14 0 0 1 16 34l10-16z" fill="var(--c)"/><path d="M24 6h16v6H24z" fill="#8a6240"/><path d="M20 38h24a10 10 0 0 1-10 12h-4a10 10 0 0 1-10-12z" fill="#fff" opacity=".35"/>',
  flask: '<path d="M27 8h10v14l14 22a8 8 0 0 1-7 12H20a8 8 0 0 1-7-12l14-22z" fill="var(--c)"/><path d="M25 6h14v5H25z" fill="#8a6240"/><circle cx="28" cy="44" r="3" fill="#fff" opacity=".5"/><circle cx="36" cy="38" r="2" fill="#fff" opacity=".5"/>',
  herb: '<path d="M32 56V26" stroke="#4a7a2e" stroke-width="3"/><path d="M32 30C20 28 14 18 16 8c10 2 16 10 16 22zM32 36c10-2 16-10 16-20-10 2-16 8-16 20z" fill="var(--c)"/>',
  fruit: '<circle cx="32" cy="36" r="18" fill="var(--c)"/><path d="M32 18c0-6 4-10 8-10" stroke="#5a3d27" stroke-width="3" fill="none"/><path d="M34 16c6-6 14-4 16 0-6 4-12 4-16 0z" fill="#4f8f3a"/><circle cx="25" cy="30" r="4" fill="#fff" opacity=".4"/>',
  scroll: '<rect x="14" y="16" width="36" height="32" rx="3" fill="#efe2c0"/><rect x="10" y="12" width="44" height="8" rx="4" fill="var(--c)"/><rect x="10" y="44" width="44" height="8" rx="4" fill="var(--c)"/><path d="M20 26h24M20 32h18M20 38h22" stroke="#8a6240" stroke-width="2"/>',
  meat: '<path d="M14 40c-4-12 6-26 20-26s22 12 18 22-18 16-28 12z" fill="var(--c)"/><path d="M20 38c-2-8 4-16 14-16" stroke="#fff" stroke-width="3" opacity=".35" fill="none"/><rect x="40" y="38" width="16" height="6" rx="3" fill="#f4ead2" transform="rotate(30 48 41)"/><circle cx="56" cy="48" r="4" fill="#f4ead2"/>',
  book: '<rect x="14" y="10" width="36" height="44" rx="3" fill="var(--c)"/><rect x="18" y="10" width="4" height="44" fill="#000" opacity=".25"/><rect x="26" y="20" width="18" height="4" rx="2" fill="#fff" opacity=".7"/><rect x="26" y="28" width="14" height="3" rx="1.5" fill="#fff" opacity=".5"/><path d="M32 38l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z" fill="#ffe7a0"/>',
  feather: '<path d="M46 8C28 12 16 30 18 52l6-4c2-18 10-30 22-40z" fill="var(--c)"/><path d="M18 52L40 18" stroke="#b8433a" stroke-width="2"/><path d="M22 40l-6-2M26 32l-8-4M30 25l-6-5" stroke="#fff" stroke-width="2" opacity=".5"/>'
};
function itemIcon(it) { return `<svg class="ico" viewBox="0 0 64 64" style="--c:${it.color}">${ICONS[it.icon] || ICONS.potion}</svg>`; }

/* ---------- 登入與公告 ---------- */
const NEWS_KEY = 'op_rpg_news_v2';
function loadNews() { try { const n = JSON.parse(localStorage.getItem(NEWS_KEY) || 'null'); if (Array.isArray(n) && n.length) return n; } catch (e) { } return DEFAULT_NEWS.slice(); }
let newsFilter = '全部';
const NEWS_OPEN_KEY = 'op_news_open';
function setNewsOpen(open) { const b = document.querySelector('.news-board'); if (open && b.classList.contains('collapsed')) setTimeout(renderNewsBoard, 0); b.classList.toggle('collapsed', !open); $('newsToggle').setAttribute('aria-expanded', String(open)); localStorage.setItem(NEWS_OPEN_KEY, open ? '1' : '0'); }
function renderNewsBoard() {
  const news = loadNews(); $('newsCount').textContent = news.length ? `${news.length} 則` : ''; const tags = ['全部', ...new Set(news.map(n => n.tag))];
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

/* ---------- 船員與培養 ---------- */
function owned(id) { return !!(SAVE.data.roster || {})[id]; }
function crewLv(id) { return owned(id) ? SAVE.data.roster[id].lv : 1; }
function addCrew(id, lv) { if (owned(id)) return false; SAVE.data.roster[id] = { lv: Math.min(MAX_LV, lv || 1), exp: 0 }; SAVE.save(); return true; }
/* 增加經驗，回傳升級資訊 */
/* noShare：經驗書、海軍本部傳承只給指定角色；戰鬥與任務則分享給未上陣的船員 */
function gainExp(id, n, silent, noShare) {
  const r = SAVE.data.roster[id]; if (!r || !n) return null;
  if (!silent && !noShare) Object.keys(SAVE.data.roster).forEach(o => { if (o !== id && !SAVE.data.lineup.includes(o) && SAVE.data.roster[o].lv < MAX_LV) gainExp(o, Math.round(n * GAME_SETTINGS.shareExp), true); });
  const from = r.lv, unlocked = []; r.exp += n;
  while (r.lv < MAX_LV && r.exp >= expNeed(r.lv)) { r.exp -= expNeed(r.lv); r.lv++; const si = SKILL_UNLOCK.indexOf(r.lv); if (si >= 0 && CHARACTERS[id].skills[si]) unlocked.push(CHARACTERS[id].skills[si].name); }
  if (r.lv >= MAX_LV) r.exp = 0;
  SAVE.save();
  const tierUp = tierOf(r.lv) > tierOf(from);
  if (r.lv > from && !silent) { SFX.play('rare'); toast(`${CHARACTERS[id].name} 升到 LV ${r.lv}！${unlocked.length ? '學會「' + unlocked.join('」「') + '」' : ''}`, 'gold'); }
  return { from, to: r.lv, unlocked, tierUp, gained: n };
}
function expText(res) { if (!res) return ''; let t = `經驗 +${res.gained}`; if (res.to > res.from) t += `，升到 <b>LV ${res.to}</b>`; if (res.tierUp) t += `，晉升「${TIERS[tierOf(res.to)].name}」`; if (res.unlocked.length) t += `，學會「${res.unlocked.join('」「')}」`; return t; }
function tierBadge(lv) { const t = TIERS[tierOf(lv)]; return `<span class="tier" style="--c:${t.color}">${t.name}</span>`; }
function charSource(id) { const ch = CHAPTERS.find(c => c.boss === id), ob = CHAR_OBTAIN[id] || {}, rate = ob.bossFirst ?? ob.boss ?? GAME_SETTINGS.bossJoinFirst; if (ob.npcOnly) return ob.npc || 'NPC（無法取得）'; if (ob.reward) return ob.npc || '劇情獎勵'; return [STARTERS.includes(id) ? '入門船員' : null, ob.npc ? `登場：${ob.npc}` : null, `懸賞處召喚（每抽 ${Math.round(GAME_SETTINGS.charRate * 1000) / 10}%）`, ch && rate > 0 ? `擊敗「${ch.name}」BOSS：首次 ${Math.round(rate * 100)}%、重複 ${Math.round((ob.bossRepeat ?? ob.boss ?? GAME_SETTINGS.bossJoinRepeat) * 100)}% 機率加入` : ch ? `「${ch.name}」BOSS（戰勝無法取得）` : null].filter(Boolean).join('、'); }

/* 首次遊玩：選擇入門船員 */
let pickChar = null, crewMode = 'crew';
function openStarter() {
  crewMode = 'starter'; pickChar = pickChar && STARTERS.includes(pickChar) ? pickChar : STARTERS[0];
  $('charTitle').textContent = '你的入門船員';
  $('quotaNote').innerHTML = '初登場的魯夫、索隆、香吉士會一起以 <b>LV 1</b> 加入並上陣。先選一位當<b>先鋒</b>，戰鬥時可以隨時換人。打贏敵人、完成任務、使用經驗書就能升級、學會新技能。之後還能在拉霸機免費召喚一位 <b>LV 100</b> 船員！';
  renderCrew(); $('charConfirm').textContent = '由他擔任先鋒'; $('charConfirm').style.display = ''; openModal('charModal');
}
function openCrew() {
  crewMode = 'crew'; pickChar = SAVE.data.player;
  $('charTitle').textContent = '角色背包';
  $('quotaNote').innerHTML = `已擁有 <b>${Object.keys(SAVE.data.roster).length}/${CHARACTER_ORDER.length}</b> 位船員，陣容 <b>${SAVE.data.lineup.length}/${GAME_SETTINGS.lineupMax}</b>。陣容裡的船員會在戰鬥中出戰並拿到全部經驗；第一位是先鋒。`;
  $('charConfirm').style.display = 'none'; renderCrew(); openModal('charModal');
}
let expPanelOpen = false; const bookQty = {};
/* 預覽使用經驗後會到幾級 */
function previewLv(id, add) { const r = SAVE.data.roster[id]; if (!r) return 1; let lv = r.lv, exp = r.exp + add; while (lv < MAX_LV && exp >= expNeed(lv)) { exp -= expNeed(lv); lv++; } return lv; }
/* 陣容列：拖曳或左右箭頭排出戰順序 */
function renderLineupBar() {
  const bar = $('lineupBar'); if (!bar) return;
  if (crewMode !== 'crew') { bar.classList.add('hidden'); return; } bar.classList.remove('hidden');
  const L = SAVE.data.lineup, max = GAME_SETTINGS.lineupMax;
  bar.innerHTML = `<b class="lb-title">出戰順序</b>` + Array.from({ length: max }, (_, i) => { const id = L[i]; if (!id) return `<div class="lb-slot empty"><span>${i + 1}</span><em>空位</em></div>`; const c = CHARACTERS[id];
    return `<div class="lb-slot" draggable="true" data-i="${i}"><span>${i + 1}</span><img src="${c.avatar}" alt=""><div><b>${c.name}</b><small>LV ${crewLv(id)}${i === 0 ? '・先鋒' : ''}</small></div><div class="lb-mv"><button data-mv="-1" data-i="${i}" aria-label="往前" ${i === 0 ? 'disabled' : ''}>◀</button><button data-mv="1" data-i="${i}" aria-label="往後" ${i >= L.length - 1 ? 'disabled' : ''}>▶</button></div></div>`; }).join('') + `<small class="lb-hint">拖曳或按箭頭調整順序，第 1 位是先鋒</small>`;
  const move = (from, to) => { if (to < 0 || to >= L.length || from === to) return; const [x] = L.splice(from, 1); L.splice(to, 0, x); syncLeader(); renderCrew(); if (currentScreen === 'chapterScreen') openChart(selChapter); };
  bar.querySelectorAll('[data-mv]').forEach(b => b.onclick = (e) => { e.stopPropagation(); const i = +b.dataset.i; move(i, i + +b.dataset.mv); });
  let dragFrom = null;
  bar.querySelectorAll('.lb-slot[draggable]').forEach(s => {
    s.ondragstart = (e) => { dragFrom = +s.dataset.i; s.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; };
    s.ondragend = () => s.classList.remove('drag');
    s.ondragover = (e) => { e.preventDefault(); s.classList.add('over'); };
    s.ondragleave = () => s.classList.remove('over');
    s.ondrop = (e) => { e.preventDefault(); s.classList.remove('over'); if (dragFrom != null) move(dragFrom, +s.dataset.i); dragFrom = null; };
    s.onclick = () => { pickChar = L[+s.dataset.i]; renderCrew(); };
  });
}
function renderCrew() {
  const list = crewMode === 'starter' ? STARTERS : CHARACTER_ORDER;
  $('charGrid').innerHTML = list.map(id => { const c = CHARACTERS[id], own = owned(id) || crewMode === 'starter', lv = crewMode === 'starter' ? 1 : crewLv(id);
    return `<button class="char ${id === pickChar ? 'on' : ''} ${own ? '' : 'locked'}" data-id="${id}" aria-pressed="${id === pickChar}"><img src="${c.image}" alt="" loading="lazy"><span class="rar c-rar r-${(typeof CHAR_RARITY !== 'undefined' && CHAR_RARITY[id]) || 'R'}">${(typeof CHAR_RARITY !== 'undefined' && CHAR_RARITY[id]) || 'R'}</span>${own ? `<span class="c-lv" style="--c:${TIERS[tierOf(lv)].color}">LV ${lv}</span>` : '<span class="c-tags"><span class="c-badge off">未獲得</span></span>'}<span class="c-name">${c.name}</span></button>`; }).join('');
  $('charGrid').querySelectorAll('.char').forEach(b => { b.onclick = () => { pickChar = b.dataset.id; renderCrew(); }; const k = SAVE.data.lineup.indexOf(b.dataset.id); if (crewMode === 'crew' && k >= 0) b.querySelector('.c-name').insertAdjacentHTML('beforebegin', `<span class="c-tags"><span class="c-team">${k === 0 ? '先鋒' : '陣容 ' + (k + 1)}</span></span>`); });
  const c = CHARACTERS[pickChar], own = owned(pickChar), lv = crewMode === 'starter' ? 1 : crewLv(pickChar), L = lvStats(c, lv), r = SAVE.data.roster[pickChar];
  const expPct = r && lv < MAX_LV ? Math.min(100, r.exp / expNeed(lv) * 100) : 100;
  const skills = c.skills.map((s, i) => { const need = SKILL_UNLOCK[i] || 1, ok = lv >= need; return `<li class="${ok ? '' : 'lock'} ${s.ultimate ? 'ult' : ''}"><b>${s.name}</b><span>${ok ? s.desc : `LV ${need} 解鎖`}</span></li>`; }).join('');
  const BOOKS = ['exp_s', 'exp_m', 'exp_l'], haveBooks = BOOKS.some(k => SAVE.data.inventory[k] > 0);
  const books = crewMode === 'crew' && own ? `<details class="exp-panel" ${expPanelOpen ? 'open' : ''}><summary>使用經驗道具<small>${haveBooks ? BOOKS.filter(k => SAVE.data.inventory[k] > 0).map(k => `${ITEMS[k].name}×${SAVE.data.inventory[k]}`).join('、') : '目前沒有經驗書，可在懸賞處取得'}</small></summary>
    ${BOOKS.map(k => { const n = SAVE.data.inventory[k] || 0, q = Math.min(n, bookQty[k] || 1), pv = previewLv(pickChar, ITEMS[k].effect.exp * q); return `<div class="exp-row ${n ? '' : 'off'}" data-row="${k}">${itemIcon(ITEMS[k])}<div class="er-name"><b>${ITEMS[k].name}</b><small>每本 +${ITEMS[k].effect.exp.toLocaleString()} 經驗・持有 ${n}</small></div>
      <div class="stepper"><button data-q="-1" aria-label="減少" ${n ? '' : 'disabled'}>−</button><output>${n ? q : 0}</output><button data-q="1" aria-label="增加" ${n ? '' : 'disabled'}>＋</button><button data-q="max" ${n ? '' : 'disabled'}>全部</button></div>
      <span class="er-prev">${n ? (pv > lv ? `LV ${lv} → <b>LV ${pv}</b>` : `LV ${lv}`) : ''}</span><button class="btn-gold sm" data-use="${k}" ${n && lv < MAX_LV ? '' : 'disabled'}>使用</button></div>`; }).join('')}
  </details>` : '';
  $('charDetail').innerHTML = `<img src="${c.avatar}" alt=""><div class="cd-main">
    <h3><span class="cno">No.${String(c.no || 0).padStart(3, '0')}</span>${c.name}<small>${c.title}</small></h3>
    ${own ? `<p class="cd-src">取得：${charSource(pickChar)}</p>` : ''}
    <div class="cd-row"><div class="pl-types">${c.types.map(t => `<span class="type" style="--t:${TYPE_COLORS[t] || '#888'}">${t}</span>`).join('')}</div>${own || crewMode === 'starter' ? tierBadge(lv) : ''}</div>
    <p>${c.desc}</p>
    ${own || crewMode === 'starter' ? `<div class="cd-exp"><span>LV ${lv}</span><div class="bar"><i style="width:${expPct}%"></i></div><small>${lv >= MAX_LV ? '已達最高等級' : r ? `${r.exp}/${expNeed(lv)}` : `0/${expNeed(1)}`}</small></div>
    <dl><div><dt>體力</dt><dd>${L.hp}</dd></div><div><dt>速度</dt><dd>${L.spd}</dd></div><div><dt>傷害倍率</dt><dd>×${L.dmg.toFixed(2)}</dd></div><div><dt>技能次數</dt><dd>${L.ppAdj ? L.ppAdj : '滿'}</dd></div></dl>` : `<p class="cd-src">取得方式：${charSource(pickChar)}</p>`}
    <ul class="cd-skills">${skills}</ul>
    ${crewMode === 'crew' && own ? `<div class="cd-actions">${inLineup(pickChar) ? `<span class="cd-cap">陣容第 ${SAVE.data.lineup.indexOf(pickChar) + 1} 位${SAVE.data.lineup[0] === pickChar ? '・先鋒' : ''}</span>${SAVE.data.lineup[0] !== pickChar ? '<button class="btn-gold" id="setLead">設為先鋒</button>' : ''}<button class="btn-ghost" id="lnOut" ${SAVE.data.lineup.length <= 1 ? 'disabled' : ''}>移出陣容</button>` : `<button class="btn-primary" id="lnIn">${SAVE.data.lineup.length >= GAME_SETTINGS.lineupMax ? '加入陣容（替換最後一位）' : '加入陣容'}</button>`}${books}</div>` : ''}
  </div>`;
  const reCrew = () => { renderCrew(); if (currentScreen === 'chapterScreen') openChart(selChapter); };
  const bi = $('lnIn'); if (bi) bi.onclick = () => { lineupAdd(pickChar); toast(`${c.name} 加入陣容`); reCrew(); };
  const bo = $('lnOut'); if (bo) bo.onclick = () => { if (lineupRemove(pickChar)) { toast(`${c.name} 移出陣容`); reCrew(); } };
  const bl = $('setLead'); if (bl) bl.onclick = () => { lineupAdd(pickChar, true); toast(`${c.name} 成為先鋒`); reCrew(); };
  const ep = $('charDetail').querySelector('.exp-panel'); if (ep) ep.ontoggle = () => { expPanelOpen = ep.open; };
  $('charDetail').querySelectorAll('.exp-row').forEach(row => { const k = row.dataset.row, n = SAVE.data.inventory[k] || 0;
    row.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { const v = b.dataset.q; bookQty[k] = v === 'max' ? n : Math.max(1, Math.min(n, (bookQty[k] || 1) + +v)); renderCrew(); });
    const u = row.querySelector('[data-use]'); if (u) u.onclick = () => { const q = Math.min(n, bookQty[k] || 1); if (!q) return; if (crewLv(pickChar) >= MAX_LV) { toast('已經是最高等級了'); return; } SAVE.data.inventory[k] -= q; SAVE.save(); bookQty[k] = 1; gainExp(pickChar, ITEMS[k].effect.exp * q, false, true); renderCrew(); }; });
  renderLineupBar();
}
function confirmStarter() {
  STARTERS.forEach(id => addCrew(id, 1)); SAVE.data.lineup = [pickChar, ...STARTERS.filter(x => x !== pickChar)].slice(0, GAME_SETTINGS.lineupMax); syncLeader(); closeModal('charModal');
  toast(`三位初登場船員都上陣了！由${CHARACTERS[pickChar].name}擔任先鋒`, 'gold');
  openGacha('modeScreen'); setTimeout(openSlot, 700);
}
function loginInfo() { if (window.refreshAvatar) refreshAvatar(); const d = SAVE.data, cl = CHAPTERS.filter(c => d.chapters[c.id].cleared).length, n = Object.keys(d.roster).length; $('loginSaveInfo').textContent = n ? `歡迎回來，船長。船員 ${n} 位・航海進度 ${cl}/${CHAPTERS.length}・貝里 ${(d.berry || 0).toLocaleString()}` : '第一次出航？初登場的草帽三人組已經在港口等你了。'; $('startBtn').textContent = n ? '繼續航海' : '揚帆出航'; }
function startGame() { if (!Object.keys(SAVE.data.roster).length) openStarter(); else openModes(); }

/* ---------- 篇章海圖 ---------- */
const NODE_POS_WIDE = [[8, 74], [20, 40], [32, 72], [44, 34], [56, 68], [68, 30], [80, 64], [92, 32]], NODE_POS_TALL = [[28, 94], [72, 81.5], [28, 69], [72, 56.5], [28, 44], [72, 31.5], [28, 19], [72, 6.5]];
let NODE_POS = NODE_POS_WIDE;
let selChapter = null;
function chapterUnlocked(i) { if (i === 0 || GAME_SETTINGS.unlockAll) return true; const pc = CHAPTERS[i - 1], ps = SAVE.data.chapters[pc.id]; return ps.cleared || (!pc.boss && ps.step >= pc.steps.length - 1); }
function openChart(focus) {
  coins(); const d = SAVE.data, pc = CHARACTERS[d.player];
  NODE_POS = innerWidth < 860 ? NODE_POS_TALL : NODE_POS_WIDE;
  const plv = crewLv(d.player);
  $('captainChip').innerHTML = `<img src="${pc.avatar}" alt=""><div><b><span class="cn">${pc.name}</span><em>LV ${plv}</em></b><small>${TIERS[tierOf(plv)].name}</small></div><button class="btn-ghost sm" id="swapChar">船員</button>`;
  $('swapChar').onclick = openCrew;
  const path = NODE_POS.map(([x, y], i) => `${i ? 'L' : 'M'}${x * 10} ${y * 6}`).join(' ');
  const doneIdx = CHAPTERS.findIndex(c => !d.chapters[c.id].cleared);
  const donePath = NODE_POS.slice(0, (doneIdx < 0 ? CHAPTERS.length : doneIdx) + 1).map(([x, y], i) => `${i ? 'L' : 'M'}${x * 10} ${y * 6}`).join(' ');
  $('chartRoute').innerHTML = `<path d="${path}" class="route-all"/><path d="${donePath}" class="route-done"/>`;
  $('chartNodes').innerHTML = CHAPTERS.map((c, i) => { const st = d.chapters[c.id], un = chapterUnlocked(i); return `<button class="node ${st.cleared ? 'cleared' : ''} ${un ? '' : 'locked'}" data-id="${c.id}" style="left:${NODE_POS[i][0]}%;top:${NODE_POS[i][1]}%"><span class="node-art" style="background-image:url('${c.art}')"></span><span class="node-name">${c.name}</span>${st.cleared ? '<i class="node-flag" aria-label="已完成"></i>' : ''}</button>`; }).join('');
  $('chartNodes').querySelectorAll('.node').forEach(b => b.onclick = () => selectChapter(b.dataset.id));
  const def = focus || (selChapter && CHAPTERS.find(c => c.id === selChapter) ? selChapter : (CHAPTERS[doneIdx < 0 ? 0 : doneIdx] || CHAPTERS[0]).id);
  selectChapter(def); showScreen('chapterScreen');
  if (innerWidth <= 860) setTimeout(() => { const n = document.querySelector('#chartNodes .node.on'), ch = document.querySelector('#chapterScreen .chart'); if (n && ch) ch.scrollTop = Math.max(0, n.offsetTop - ch.clientHeight / 2); }, 30);
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
      ${c.rhythm ? `<p class="arc-rhythm">${c.rhythm}</p>` : ''}
      <div class="arc-boss">${boss ? `<img src="${boss.avatar}" alt="">` : '<span class="boss-unk" aria-hidden="true">?</span>'}<div><small>篇章 BOSS・LV ${ENEMY_LEVEL[id] + BOSS_LEVEL_BONUS}</small><b>${c.bossTitle}</b></div><span class="arc-lv">敵人 LV ${ENEMY_LEVEL[id]}</span></div>
      <div class="arc-prog"><div class="bar"><i style="width:${done / total * 100}%"></i></div><span>${un ? (st.cleared ? '已完成' : `任務 ${done}/${total}：${next}`) : `完成「${CHAPTERS[i - 1].name}」後解鎖`}</span></div>
      <div class="arc-actions">${un ? `<button class="btn-primary big" id="sailBtn">${st.cleared ? '再次登島' : st.step ? '繼續冒險' : '出航'}</button>${st.cleared ? '<button class="btn-ghost" id="replayBtn">重玩劇情</button>' : ''}` : '<button class="btn-primary big" disabled>尚未解鎖</button>'}</div>
    </div>`;
  const sail = $('sailBtn'); if (sail) sail.onclick = () => enterChapter(id);
  const rp = $('replayBtn'); if (rp) rp.onclick = () => confirmBox('重玩劇情？', '任務進度會從頭開始，敵人重新出現。已領過的寶藏幣不會重複發放。', '重玩', () => { Object.assign(st, { step: 0, collected: [], defeated: [], talked: [], roster: null }); SAVE.save(); enterChapter(id); });
  const card = $('arcCard'); card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
}

/* ---------- 3D 世界與劇情 ---------- */
let WORLD = null, CH = null, TIMED = null, CHAIN = null;
const ENEMY_SPOTS = [[-32, -24], [30, -30], [-8, -18], [-46, 22], [44, 18]];
const SPOTS = () => (CH && CH.layout && CH.layout.spots) || ENEMY_SPOTS;
function chState() { return SAVE.data.chapters[CH.id]; }
function curStep() { const st = chState(); return st.cleared && st.step >= CH.steps.length ? null : CH.steps[Math.min(st.step, CH.steps.length - 1)]; }
/* 敵人等級：開啟等級同步時，陣容太強會讓敵人跟著變強 */
function enemyLvFor(boss) { const up = boss ? ((CHAPTER_DIFFICULTY[CH.id] || {}).bossLvUp || 0) : 0, base = Math.min(MAX_LV, (ENEMY_LEVEL[CH.id] || 1) + (boss ? BOSS_LEVEL_BONUS + up : 0)); if (!GAME_SETTINGS.levelSync) return base; const top = Math.max(1, ...SAVE.data.lineup.map(crewLv)); return Math.min(MAX_LV, Math.max(base, top + (boss ? 5 : -(GAME_SETTINGS.syncGap || 6)))); }
let RACE = null, ESC = false;
function treasurePiece() { return (typeof TREASURE !== 'undefined') ? TREASURE.pieces.find(p => p.chapter === CH.id) : null; }
function treasureFound() { SAVE.data.treasure = SAVE.data.treasure || { found: [], done: false }; return SAVE.data.treasure.found; }
function huntActive() { const tp = treasurePiece(), st = chState(); return !!(tp && st.cleared && st.step >= CH.steps.length && !treasureFound().includes(tp.chapter)); }
function digKey() { const s = curStep(); if (s && s.type === 'dig') return CH.id + ':step' + chState().step; if (huntActive()) return CH.id + ':treasure'; return null; }
function digInfo() { const s = curStep(); if (s && s.type === 'dig') return { center: s.area, radius: s.radius || 20 }; const tp = treasurePiece(); return tp ? { center: tp.center, radius: tp.radius || 22 } : null; }
/* 藏寶點：第一次需要時才決定，避開建築與海面 */
function digSpot() {
  const key = digKey(); if (!key || !WORLD || WORLD.chapter !== CH) return null; SAVE.data.digs = SAVE.data.digs || {};
  if (!SAVE.data.digs[key]) { const inf = digInfo(); let x = inf.center[0], z = inf.center[1];
    for (let g = 0; g < 80; g++) { const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * inf.radius, tx = inf.center[0] + Math.cos(a) * d, tz = inf.center[1] + Math.sin(a) * d; if (WORLD.scene.H(tx, tz) < 1 || WORLD.scene.obstacles.some(o => Math.hypot(tx - o[0], tz - o[1]) < o[2] + 2.5)) continue; x = tx; z = tz; break; }
    SAVE.data.digs[key] = { x, z, marks: [] }; SAVE.save(); }
  return SAVE.data.digs[key];
}
function heatOf(d) { return d < 8 ? ['滾燙', 100, '#ff4a3a'] : d < 15 ? ['很熱', 78, '#ff8a3a'] : d < 25 ? ['溫熱', 55, '#ffd26c'] : d < 40 ? ['微涼', 32, '#8fd8ff'] : ['冰冷', 12, '#6f8fb0']; }
/* 寶箱：每座島 3 個，位置第一次登島時決定，開過就不會再出現 */
const CHEST_COUNT = 3;
function chestState() {
  SAVE.data.chests = SAVE.data.chests || {}; let c = SAVE.data.chests[CH.id];
  if (!c || !c.spots || c.spots.length < CHEST_COUNT) { if (!WORLD || WORLD.chapter !== CH) return null;
    const S = WORLD.scene, spots = [], L = CH.layout || {}, far = (x, z) => Math.hypot(x - CH.spawn[0], z - CH.spawn[1]) > 25;
    for (let g = 0; g < 600 && spots.length < CHEST_COUNT; g++) { const a = Math.random() * 6.283, d = 18 + Math.random() * 58, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (S.H(x, z) < 1.2 || !far(x, z) || S.obstacles.some(o => Math.hypot(x - o[0], z - o[1]) < o[2] + 2) || spots.some(s => Math.hypot(s[0] - x, s[1] - z) < 25) || CH.npcs.some(n => Math.hypot(n.pos[0] - x, n.pos[1] - z) < 6) || Math.hypot(x - CH.bossPos[0], z - CH.bossPos[1]) < 18 || SPOTS().some(q => Math.hypot(q[0] - x, q[1] - z) < 14)) continue;
      spots.push([Math.round(x), Math.round(z), Math.random() * 6.28]); }
    c = SAVE.data.chests[CH.id] = { spots, opened: [] }; SAVE.save(); }
  return c;
}
function openChest(ch) {
  const c = chestState(); if (!c || c.opened.includes(ch.idx)) return;
  c.opened.push(ch.idx); const ord = (CHAPTER_DIFFICULTY[CH.id] || {}).order || 1, berry = Math.round((300 + Math.random() * 900) * ord / 10) * 10, got = [`貝里 ${berry.toLocaleString()}`];
  addBerry(berry); const r = Math.random();
  if (r < .25) { addTokens(1, '寶箱'); got.push('寶藏幣 ×1'); } else if (r < .5) { SAVE.data.inventory.exp_s = (SAVE.data.inventory.exp_s || 0) + 1; got.push('小經驗書 ×1'); } else if (r < .7) { SAVE.data.inventory.pot_s = (SAVE.data.inventory.pot_s || 0) + 1; got.push('小回復藥水 ×1'); }
  if (c.opened.length >= c.spots.length) { addTokens(2, '寶箱全開'); got.push('全部寶箱獎勵：寶藏幣 ×2'); }
  SAVE.save(); track('chests'); SFX.play('rare'); toast(`打開寶箱：${got.join('、')}`, 'gold'); refreshWorld();
}
function worldState() {
  const st = chState(), step = curStep(), pid = SAVE.data.player;
  st.talked = st.talked || [];
  if (!st.roster || st.roster.some(id => STARTERS.includes(id) || CH.npcs.some(n => n.id === id) || id === CH.boss || (CH.exclude || []).includes(id))) { const pool = CHARACTER_ORDER.filter(id => id !== CH.boss && id !== pid && !STARTERS.includes(id) && !CH.npcs.some(n => n.id === id) && !(CH.exclude || []).includes(id)); for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[pool[i], pool[j]] = [pool[j], pool[i]]; } st.roster = pool.slice(0, 3); SAVE.save(); }
  if (step && step.type === 'gauntlet' && st.roster.filter(id => !st.defeated.includes(id)).length < step.count) { st.defeated = []; SAVE.save(); }
  const enemies = st.roster.map((id, i) => ({ id, x: SPOTS()[i][0], z: SPOTS()[i][1], boss: false, lv: enemyLvFor(false) })).filter(e => !st.defeated.includes(e.id));
  if (step && CH.boss && step.type !== 'stealth') enemies.push({ id: CH.boss, x: CH.bossPos[0], z: CH.bossPos[1], boss: true, lv: enemyLvFor(true) });
  const items = step && (step.type === 'collect' || step.type === 'timedCollect') ? step.spots.map((p, i) => ({ idx: i, x: p[0], z: p[1], icon: step.icon, label: step.item })).filter(it => !st.collected.includes(it.idx)) : [];
  const bossUnlocked = st.cleared || CH.steps.slice(0, st.step).some(s => s.unlockBoss);
  let target = null, beacon = null, guards = [], escort = null;
  if (step) {
    if ((step.type === 'talk' || step.type === 'choice') && step.npc) target = { type: 'npc', ids: [step.npc] };
    if (step.type === 'talkAll') target = { type: 'npc', ids: step.npcs.filter(id => !st.talked.includes(id)) };
    if (step.type === 'boss') target = { type: 'boss' };
    if (step.type === 'goto') { beacon = { x: step.pos[0], z: step.pos[1], r: step.r || 7, label: step.label }; target = { type: 'goto' }; }
    if (step.type === 'race') { const i = RACE ? RACE.idx : 0, pt = step.points[Math.min(i, step.points.length - 1)]; beacon = { x: pt[0], z: pt[1], r: 5, label: `檢查點 ${i + 1}/${step.points.length}` }; target = { type: 'goto' }; }
    if (step.type === 'stealth') { beacon = { x: step.goal[0], z: step.goal[1], r: step.r || 6, label: step.label }; guards = step.guards; target = { type: 'goto' }; }
    if (step.type === 'escort') { if (ESC) { escort = { id: step.npc, to: step.to, r: step.r || 7 }; beacon = { x: step.to[0], z: step.to[1], r: 0, label: step.label }; } else target = { type: 'npc', ids: [step.npc] }; }
  }
  const key = digKey(), dg = key && SAVE.data.digs && SAVE.data.digs[key];
  const clear = [...SPOTS().map(p => [p[0], p[1], 7]), [CH.spawn[0], CH.spawn[1], 12], [CH.bossPos[0], CH.bossPos[1], 16], ...CH.npcs.map(n => [n.pos[0], n.pos[1], 5])];
  CH.steps.forEach(s => { (s.spots || []).forEach(p => clear.push([p[0], p[1], 5])); (s.points || []).forEach(p => clear.push([p[0], p[1], 6])); [s.pos, s.goal, s.to, s.start].forEach(p => { if (p) clear.push([p[0], p[1], 8]); }); (s.guards || []).forEach(g => g.path.forEach(p => clear.push([p[0], p[1], 4]))); });
  const cs = chestState(), chests = cs ? cs.spots.map((q, i) => ({ idx: i, x: q[0], z: q[1], face: q[2] || 0, opened: cs.opened.includes(i) })) : [];
  return { enemies, items, bossUnlocked, target, beacon, clear, guards, escort, canDig: !!key, digMarks: dg ? dg.marks : [], chests };
}
function enterChapter(id) {
  CH = CHAPTERS.find(c => c.id === id); TIMED = null; CHAIN = null; RACE = null; ESC = false; $('loading').classList.add('show');
  setTimeout(() => {
    try {
      if (!WORLD) WORLD = new World({ canvas: $('worldCanvas'), labels: $('worldLabels'), minimap: $('minimap'), callbacks: { onInteract, onPickup, onNear, onReach, onSpotted, onEscortDone, onDig } });
      WORLD.load(CH, SAVE.data.player, worldState());
    } catch (err) { $('loading').classList.remove('show'); console.error(err); toast('這台裝置無法開啟 3D 場景（WebGL 不可用）', 'warn'); return; }
    $('wChapter').textContent = CH.name; $('wChapterSub').textContent = CH.subtitle; coins();
    stepStarted(); refreshWorld(); onNear(null); hideDialog(); $('clearOverlay').classList.remove('show');
    showScreen('worldScreen'); $('loading').classList.remove('show'); if (window.prewarmPortraits) prewarmPortraits(CH.npcs.map(n => n.look));
    const st = chState();
    if (st.step === 0 && !st.cleared) setTimeout(() => say([...(CH.prologue || [[null, `${CH.name}・${CH.subtitle}`], [null, CH.blurb]]), [null, '頭上有「!」的人有事找你，任務欄會告訴你下一步。']], autoStep), 500);
    else if (huntActive()) { const tp = treasurePiece(); setTimeout(() => say([[null, `主線「${TREASURE.title}」`], [null, `這座島上藏著「${tp.name}」。${tp.hint}`], [null, '跟著探測器的溫度走，在最熱的地方按「挖掘」。']]), 500); }
    else autoStep();
    $('wHelp').classList.remove('fade'); setTimeout(() => $('wHelp').classList.add('fade'), 6000);
  }, 40);
}
function refreshWorld() { WORLD.setState(worldState()); renderQuest(); onNear(WORLD._near || null); }
/* 某些任務一開始就要啟動：計時、無 NPC 的選擇題 */
function stepStarted() { const s = curStep(); TIMED = s && s.type === 'timedCollect' ? { left: s.seconds } : null; RACE = s && s.type === 'race' ? { idx: 0, left: s.seconds } : null; ESC = false; }
function autoStep() { const s = curStep(); if (s && s.type === 'choice' && !s.npc) setTimeout(() => { if (!dialogOpen) runChoice(s); }, 500); }
setInterval(() => {
  if (currentScreen !== 'worldScreen' || !WORLD || !CH) return;
  // 寶藏探測器
  const det = document.querySelector('.detector'); if (det && WORLD.canDig) { const d = digSpot(); if (d) { const h = heatOf(Math.hypot(WORLD.p.x - d.x, WORLD.p.z - d.z)); det.querySelector('i').style.width = h[1] + '%'; det.querySelector('i').style.background = h[2]; det.querySelector('b').textContent = h[0]; } }
  if (WORLD.paused || dialogOpen) return;
  const el = document.querySelector('.q-timer');
  if (TIMED) { TIMED.left -= .25; if (el) { el.textContent = Math.max(0, Math.ceil(TIMED.left)) + ' 秒'; el.classList.toggle('hurry', TIMED.left < 15); }
    if (TIMED.left <= 0) { const st = chState(), s = curStep(); st.collected = []; SAVE.save(); TIMED.left = s.seconds; refreshWorld(); SFX.play('sand'); toast('沙暴把袋子全都埋回去了！重新找一次', 'warn'); } }
  if (RACE) { RACE.left -= .25; if (el) { el.textContent = Math.max(0, Math.ceil(RACE.left)) + ' 秒'; el.classList.toggle('hurry', RACE.left < 10); }
    if (RACE.left <= 0) { const s = curStep(); RACE = { idx: 0, left: s.seconds }; refreshWorld(); SFX.play('miss'); toast('時間到了！從第一個檢查點重新開始', 'warn'); } }
}, 250);
/* 任務欄：點標題可收合成一行（參考賽爾號右上角的任務提示） */
function bindQuestMini() { const q = $('questBox'), h = q.querySelector('h3'); const go = $('qGo'); if (go) go.onclick = e => { e.stopPropagation(); if (!WORLD || !WORLD.guidePoint()) { toast('這個任務沒有固定的目標位置'); return; } WORLD.autoGuide(true); toast('自動前往目標中（移動或點地面即可取消）'); }; q.classList.toggle('mini', localStorage.getItem('op_q_mini') === '1'); if (h && !h.dataset.b) { h.dataset.b = 1; h.setAttribute('role', 'button'); h.setAttribute('tabindex', '0'); h.title = '點一下收合／展開'; h.onclick = () => { const m = !q.classList.contains('mini'); q.classList.toggle('mini', m); localStorage.setItem('op_q_mini', m ? '1' : '0'); }; } }
function chestTag() { const c = chestState(); return c ? `<small class="q-chest" title="這座島的寶箱">📦 ${c.opened.length}/${c.spots.length}</small>` : ''; }
function renderQuest() {
  const st = chState(), total = CH.steps.length, s = curStep();
  const detector = '<div class="detector"><span>探測器</span><div class="bar"><i></i></div><b>—</b></div>';
  if (!s) {
    if (huntActive()) { const tp = treasurePiece(); $('questBox').innerHTML = `<h3><span><em class="q-kind k-main">主線</em>${TREASURE.title}</span>${tp.name}</h3><p>${tp.hint}</p>${detector}<small class="q-hint">走到探測器最熱的地方，按「挖掘」。</small>`; }
    else $('questBox').innerHTML = `<h3>${CH.name}</h3><div class="q-foot">${chestTag()}</div><p class="q-done">篇章已完成。${treasurePiece() && treasureFound().includes(CH.id) ? '這座島的歷史本文也已經找到了。' : ''}可以和居民聊天，或回海圖前往下一座島。</p>`;
    return;
  }
  let prog = '';
  if (s.type === 'collect' || s.type === 'timedCollect') prog = `<span class="q-count">${st.collected.length}/${s.count}</span>`;
  if (s.type === 'defeat') prog = `<span class="q-count">${Math.min(st.defeated.length, s.count)}/${s.count}</span>`;
  if (s.type === 'talkAll') prog = `<span class="q-count">${s.npcs.filter(id => st.talked.includes(id)).length}/${s.npcs.length}</span>`;
  if (s.type === 'gauntlet') prog = `<span class="q-count">${CHAIN ? CHAIN.wins.length : 0}/${s.count}</span>`;
  if (s.type === 'race') prog = `<span class="q-count">${RACE ? RACE.idx : 0}/${s.points.length}</span>`;
  if (s.type === 'escort') prog = `<span class="q-count">${ESC ? '護送中' : '尚未開始'}</span>`;
  const timer = s.type === 'timedCollect' ? `<b class="q-timer">${Math.ceil(TIMED ? TIMED.left : s.seconds)} 秒</b>` : s.type === 'race' ? `<b class="q-timer">${Math.ceil(RACE ? RACE.left : s.seconds)} 秒</b>` : '';
  const kind = { talk: '對話', talkAll: '打聽', goto: '前往', collect: '收集', timedCollect: '限時', defeat: '擊敗', gauntlet: '連戰', choice: '抉擇', boss: 'BOSS', race: '限時', stealth: '潛入', escort: '護送', dig: '探測' }[s.type];
  $('questBox').innerHTML = `<h3><span><em class="q-kind k-${s.type}">${kind}</em>任務 ${st.step + 1}/${total}</span>${s.title}</h3><p>${s.desc} ${prog}</p>${timer}${s.type === 'dig' ? detector : ''}<div class="q-foot">${chestTag()}${s.reward ? `<small class="q-rew"><i class="coin-ico"></i>×${s.reward}</small>` : ''}${s.type !== 'dig' ? '<button class="q-go" id="qGo">➤ 自動前往</button>' : ''}</div>`;
  const q = $('questBox'); q.classList.remove('flash'); void q.offsetWidth; q.classList.add('flash');
  bindQuestMini();
}
function completeStep() {
  const st = chState(), idx = st.step, s = CH.steps[idx];
  if (!st.rewarded.includes(idx)) { st.rewarded.push(idx); addBerry(80 * ((CHAPTER_DIFFICULTY[CH.id] || {}).order || 1)); addTokens(s.reward, s.title); gainExp(SAVE.data.player, (s.reward || 1) * 50 + ENEMY_LEVEL[CH.id] * 4); }
  st.step++; SAVE.save(); track('steps'); SFX.play('quest'); stepStarted(); CHAIN = null;
  if (s.unlockBoss) setTimeout(() => toast('BOSS 的屏障解除了', 'gold'), 500);
  const nx = CH.steps[st.step];
  if (nx && nx.type === 'defeat' && st.defeated.length >= nx.count) { setTimeout(completeStep, 600); }
  if (WORLD) refreshWorld();
  autoStep();
}
function onNear(n) {
  const b = $('actBtn');
  if (!n) { if (WORLD && WORLD.canDig) { b.innerHTML = '<small>E</small>挖掘'; b.classList.remove('fight'); b.classList.add('show', 'dig'); } else b.classList.remove('show', 'dig'); return; }
  b.classList.remove('dig');
  b.innerHTML = n.kind === 'chest' ? '<small>E</small>打開寶箱' : n.kind === 'npc' ? `<small>E</small>對話・${esc(n.name)}` : `<small>E</small>${n.boss ? '挑戰 BOSS' : '挑戰'}・${esc(CHARACTERS[n.id].name)}`;
  b.classList.toggle('fight', n.kind !== 'npc' && n.kind !== 'chest'); b.classList.add('show');
}
function onSpotted() {
  const s = curStep(); if (!s || s.type !== 'stealth' || dialogOpen) return;
  SFX.play('miss'); WORLD.r.flash = .35; setTimeout(() => { if (WORLD) WORLD.r.flash = 0; }, 180);
  WORLD.p.x = s.start[0]; WORLD.p.z = s.start[1]; WORLD.p.target = null;
  toast('被巡邏的人發現了！被趕回起點，重新潛入', 'warn');
}
function onEscortDone() { const s = curStep(); if (!s || s.type !== 'escort') return; ESC = false; say(s.lines || [], completeStep); }
function onDig(x, z) {
  const key = digKey(), d = digSpot(); if (!key || !d || dialogOpen) return;
  const dist = Math.hypot(x - d.x, z - d.z); track('digs');
  if (dist < 4.5) {
    SFX.play('rare'); delete SAVE.data.digs[key]; SAVE.save();
    const s = curStep();
    if (s && s.type === 'dig') { say(s.lines || [[null, `挖到了${s.item || '寶物'}！`]], completeStep); return; }
    const tp = treasurePiece(); treasureFound().push(tp.chapter); SAVE.save(); addTokens(3, '歷史本文'); addBerry(3000);
    say([...tp.lines, [null, `主線進度：${treasureFound().length}/${TREASURE.pieces.length}${treasureFound().length >= TREASURE.pieces.length ? '。所有歷史本文都找到了！打開海圖上的「寶藏日誌」，前往最終之島。' : '。其他島嶼上還有剩下的歷史本文。'}`]], () => { refreshWorld(); });
    return;
  }
  d.marks.push([x, z]); if (d.marks.length > 30) d.marks.shift(); SAVE.save(); WORLD.digMarks = d.marks;
  SFX.play('sand'); toast(`什麼都沒有……探測器顯示「${heatOf(dist)[0]}」`);
}

function onPickup(it) {
  const st = chState(), s = curStep(); if (!s || (s.type !== 'collect' && s.type !== 'timedCollect')) return;
  if (!st.collected.includes(it.idx)) { st.collected.push(it.idx); track('pickups'); } SAVE.save();
  SFX.play('pickup'); toast(`撿到${s.item}（${st.collected.length}/${s.count}）`);
  if (st.collected.length >= s.count) { TIMED = null; say([[null, `${s.item}都找齊了！`]], () => completeStep()); }
  else renderQuest();
}
function onReach() {
  const s = curStep(); if (!s || dialogOpen) return;
  if (s.type === 'goto') { WORLD.setState({ ...worldState(), beacon: null }); SFX.play('quest'); if (s.lines && s.lines.length) say(s.lines, completeStep); else completeStep(); return; }
  if (s.type === 'race' && RACE) { RACE.idx++; SFX.play('pickup'); if (RACE.idx >= s.points.length) { RACE = null; WORLD.setState({ ...worldState(), beacon: null }); say(s.lines || [[null, '全部檢查點都通過了！']], completeStep); } else { toast(`通過檢查點 ${RACE.idx}/${s.points.length}`); refreshWorld(); } return; }
  if (s.type === 'stealth') { WORLD.setState({ ...worldState(), beacon: null, guards: [] }); SFX.play('quest'); say(s.lines || [[null, '成功潛入了！']], completeStep); return; }
}
function runChoice(s) {
  let qi = 0; const who = s.npc || null;
  const ask = () => { const q = s.questions[qi]; say([[who, q.q]], null, q.options.map(o => ({ label: o.label, fn: () => { if (o.correct) { SFX.play('pickup'); say([[who, q.right]], () => { qi++; if (qi < s.questions.length) ask(); else completeStep(); }); } else { SFX.play('miss'); say([[who, q.wrong]], ask); } } }))); };
  if (s.lines && s.lines.length) say(s.lines, ask); else ask();
}
function onInteract(n) {
  if (n.kind === 'chest') { openChest(n); return; }
  if (dialogOpen) return;
  const st = chState(), s = curStep();
  if (n.kind === 'npc') {
    if (s && s.type === 'escort' && s.npc === n.id && !ESC) { say(s.startLines || [], () => { ESC = true; refreshWorld(); toast(`護送開始：帶${n.name}到「${s.label}」`, 'gold'); }); return; }
    if (s && s.type === 'talk' && s.npc === n.id) { say(s.lines, completeStep); return; }
    if (s && s.type === 'choice' && s.npc === n.id) { runChoice(s); return; }
    if (s && s.type === 'talkAll' && s.npcs.includes(n.id) && !st.talked.includes(n.id)) {
      say(s.lines[n.id], () => { st.talked.push(n.id); SAVE.save(); SFX.play('pickup'); if (s.npcs.every(id => st.talked.includes(id))) completeStep(); else { refreshWorld(); toast(`已打聽 ${s.npcs.filter(id => st.talked.includes(id)).length}/${s.npcs.length}`); } });
      return;
    }
    const hint = s ? `（目前任務：${s.title}）` : '';
    const pool = n.chat && n.chat.length ? n.chat : ['路上小心，航海者。'];
    say([[n.id, pool[Math.floor(Math.random() * pool.length)] + (hint && Math.random() < .5 ? ' ' + hint : '')]]);
    return;
  }
  const lines = ENCOUNTER_LINES[n.id] || ['來吧！'];
  const intro = n.boss ? [['@' + n.id, lines[0]], ['@' + n.id, lines[1] || lines[0]]] : [['@' + n.id, lines[Math.floor(Math.random() * lines.length)]]];
  if (s && s.type === 'gauntlet' && !n.boss) intro.push([null, `連戰開始！要連續擊敗 ${s.count} 名對手，中途體力不會回復。`]);
  say(intro, null, [{ label: n.boss ? '開始 BOSS 戰' : '開始對戰', primary: true, fn: () => beginFight(n) }, { label: '先離開', fn: () => { } }]);
}
function beginFight(n, carryHp) {
  WORLD.paused = true;
  const s = curStep(); if (s && s.type === 'gauntlet' && !n.boss && !CHAIN) CHAIN = { wins: [] };
  startBattle({
    playerId: SAVE.data.player, team: SAVE.data.lineup.map(id => ({ id, lv: crewLv(id), hp: carryHp ? carryHp[id] : undefined })), enemyId: n.id, chapterId: CH.id, isBoss: n.boss, enemyLv: enemyLvFor(n.boss),
    onEnd: (r) => onBattleEnd(r, n),
    onLeave: () => { showScreen('worldScreen'); if (pendingClear) AUDIO.stopSong(); WORLD.paused = false; refreshWorld(); coins(); if (pendingClear) { const pc = pendingClear; pendingClear = null; setTimeout(() => showClear(pc), 350); } }
  });
}
let pendingClear = null;
function onBattleEnd(r) {
  const st = chState(), s = curStep(), msgs = [];
  if (r.win) { track('wins'); if (r.isBoss) track('bossWins'); }
  if (r.win) { const elv = enemyLvFor(r.isBoss), amt = Math.round((30 + elv * 6) * (r.isBoss ? 3 : 1)), lead = SAVE.data.lineup[0] || SAVE.data.player; const ex = gainExp(lead, amt); SAVE.data.lineup.filter(id => id !== lead).forEach(id => gainExp(id, Math.round(amt * (1 - GAME_SETTINGS.shareExp)), true)); if (ex) msgs.push(expText(ex) + (SAVE.data.lineup.length > 1 ? '（陣容全員）' : '')); const bry = Math.round((40 + elv * 8) * (r.isBoss ? 4 : 1)); addBerry(bry); msgs.push(`貝里 +${bry.toLocaleString()}`); }
  if (s && s.type === 'gauntlet' && !r.isBoss && CHAIN) {
    if (!r.win) { CHAIN = null; renderQuest(); return { message: '連戰中斷了。整理好狀態，再從第一場開始。' }; }
    CHAIN.wins.push(r.enemyId);
    if (CHAIN.wins.length < s.count) {
      const next = st.roster.find(id => !st.defeated.includes(id) && !CHAIN.wins.includes(id));
      const hp = Object.fromEntries(battle.team.map(f => [f.id, f.hp]));
      msgs.push(`連戰 ${CHAIN.wins.length}/${s.count}！下一位對手已經衝上來了。`);
      return { message: msgs.join('<br>'), next: { label: '迎戰下一位', fn: () => { const i = st.roster.indexOf(next); beginFight({ id: next, x: SPOTS()[i][0], z: SPOTS()[i][1], boss: false, kind: 'enemy' }, hp); } } };
    }
    CHAIN.wins.forEach(id => { if (!st.defeated.includes(id)) st.defeated.push(id); }); SAVE.save();
    const b = SAVE.data.tokens; completeStep(); msgs.push(`連戰突破！任務完成：${s.title}（寶藏幣 +${SAVE.data.tokens - b}）`); return { message: msgs.join('<br>') };
  }
  if (!r.win) return {};
  if (r.isBoss) {
    if (s && s.type === 'boss') { window.__tbcNext = true; const before = SAVE.data.tokens; const first = !st.cleared; st.cleared = true; completeStep(); if (first) { SAVE.data.tokens += GAME_SETTINGS.clearBonus; msgs.push(`首次通關獎勵：寶藏幣 ×${GAME_SETTINGS.clearBonus}`); Object.entries(CHAR_OBTAIN).forEach(([cid, o]) => { if (o.reward === CH.id && !owned(cid)) { addCrew(cid, 10); msgs.push(`<b>${CHARACTERS[cid].name}</b> 加入了角色背包！（LV 10）`); } }); } SAVE.save(); coins(); const got = SAVE.data.tokens - before; if (got) msgs.unshift(`這一戰共得到寶藏幣 ×${got}`); { const bid = CH.boss, ob = CHAR_OBTAIN[bid] || {}, rate = first ? (ob.bossFirst ?? ob.boss ?? GAME_SETTINGS.bossJoinFirst) : (ob.bossRepeat ?? ob.boss ?? GAME_SETTINGS.bossJoinRepeat), again = ob.boss != null ? ob.boss : GAME_SETTINGS.bossJoinRepeat; if (!owned(bid) && rate <= 0) msgs.push(`${CHARACTERS[bid].name} 無法透過戰鬥取得，只能在懸賞處召喚。`); else if (!owned(bid)) { if (Math.random() < rate) { addCrew(bid, GAME_SETTINGS.bossJoinLv); msgs.push(`<b>${CHARACTERS[bid].name}</b> 被你的實力打動，加入了角色背包！（LV ${GAME_SETTINGS.bossJoinLv}）`); } else msgs.push(`${CHARACTERS[bid].name} 這次沒有加入。再次擊敗時仍有 ${Math.round(again * 100)}% 機率加入。`); } } pendingClear = { first }; }
  } else {
    if (!st.defeated.includes(r.enemyId)) st.defeated.push(r.enemyId); SAVE.save();
    if (s && s.type === 'defeat') { if (st.defeated.length >= s.count) { const b = SAVE.data.tokens; completeStep(); msgs.push(`任務完成：${s.title}（寶藏幣 +${SAVE.data.tokens - b}）`); } else msgs.push(`任務進度：${st.defeated.length}/${s.count}`); }
  }
  return { message: msgs.join('<br>') };
}
function showClear(pc) {
  if (CH.epilogue && CH.epilogue.length && !pc.epiDone) { pc.epiDone = true; say(CH.epilogue, () => showClear(pc)); return; }
  AUDIO.jingle('clear', CH.id);
  const i = CHAPTERS.findIndex(c => c.id === CH.id), next = CHAPTERS[i + 1];
  $('clearTitle').textContent = `${CH.name} 完成`;
  $('clearDesc').innerHTML = `${CH.bossTitle}被擊敗了，這座島恢復了平靜。${next ? `<br>新的航路已經打開：<b>${next.name}</b>。` : '<br>你走完了整條偉大航路。'}<br>別忘了去懸賞處換道具。`;
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
/* 「」裡的關鍵字標色（賽爾號式重點提示） */
function dlgHL(t) { return esc(t).replace(/「([^」]{1,14})」/g, '「<em class="kw">$1</em>」'); }
function nextLine() {
  if (typing) { clearInterval(typing.h); $('dlgText').innerHTML = dlgHL(typing.full); typing = null; if (!dlgQueue.length && dlgChoices) showChoices(); return; }
  if (!dlgQueue.length) { if (dlgChoices) return; hideDialog(); const f = dlgDone; dlgDone = null; f && f(); return; }
  const [who, text] = dlgQueue.shift(), f = faceFor(who);
  $('dlgFace').innerHTML = f.html; $('dlgFace').classList.toggle('foe', !!f.foe);
  $('dlgName').innerHTML = esc(f.name) + (f.role ? `<small>${esc(f.role)}</small>` : '');
  $('dlgChoices').innerHTML = ''; $('dlgNext').style.visibility = 'visible';
  const el = $('dlgText'); el.textContent = ''; let i = 0; const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { el.innerHTML = dlgHL(text); if (!dlgQueue.length && dlgChoices) showChoices(); return; }
  typing = { full: text, h: setInterval(() => { i += 1; el.textContent = text.slice(0, i); if (i % 3 === 0) SFX.play('blip'); if (i >= text.length) { clearInterval(typing.h); el.innerHTML = dlgHL(text); typing = null; if (!dlgQueue.length && dlgChoices) showChoices(); } }, 26) };
}
function showChoices() {
  $('dlgNext').style.visibility = 'hidden';
  $('dlgChoices').innerHTML = dlgChoices.map((c, i) => `<button class="${c.primary ? 'btn-primary' : 'btn-ghost'}" data-i="${i}">${c.label}</button>`).join('');
  $('dlgChoices').querySelectorAll('button').forEach(b => b.onclick = (e) => { e.stopPropagation(); const c = dlgChoices[+b.dataset.i]; dlgChoices = null; hideDialog(); c.fn(); });
}
/* 對話收合：縮成底部小膠囊，不擋畫面 */
function setDialogMin(on) { const d = $('dialog'); if (!d) return; d.classList.toggle('min', !!on); const n = $('dlgName'); $('dlgPillName').textContent = n && n.firstChild ? (n.firstChild.textContent || '').trim() : ''; }
window.addEventListener('DOMContentLoaded', () => { const m = $('dlgMin'), p = $('dlgPill'); if (m) m.addEventListener('click', e => { e.stopPropagation(); setDialogMin(true); }); if (p) p.addEventListener('click', e => { e.stopPropagation(); setDialogMin(false); }); });
function hideDialog() { setDialogMin(false); dialogOpen = false; $('dialog').classList.remove('show'); if (WORLD && currentScreen === 'worldScreen') WORLD.paused = false; }

/* ---------- 懸賞處 ---------- */
let gachaReturn = 'chapterScreen', gachaBusy = false;
function openGacha(ret) {
  gachaReturn = typeof ret === 'string' ? ret : currentScreen === 'gachaScreen' ? gachaReturn : currentScreen; coins();
  $('rateTable').innerHTML = '<caption>出現機率</caption>' + `<tr><th><span class="rar c-rar r-CHAR">船員</span></th><td>${Math.round(GACHA_CHAR_RATE * 100)}%</td><td>尚未擁有的角色（LV ${GACHA_CHAR_LV} 加入）</td></tr>` + Object.entries(RARITY).map(([k, r]) => `<tr><th><span class="rar r-${k}">${k}</span></th><td>${Math.round(r.rate * (1 - GACHA_CHAR_RATE) * 100)}%</td><td>${Object.values(ITEMS).filter(i => i.rarity === k).map(i => i.name).join('、')}</td></tr>`).join('');
  const caps = $('mCaps'); if (!caps.children.length) { const cols = ['#e8553b', '#3fb6c9', '#ffd26c', '#b58cff', '#6fd08c', '#f4f7f2']; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; let placed = 0, guard = 0; while (placed < 30 && guard++ < 4000) { const x = 8 + rnd() * 84, y = 40 + rnd() * 52; if (Math.hypot(x - 50, y - 50) > 40) continue; const s = document.createElement('i'); s.style.cssText = `--c:${cols[placed % cols.length]};left:${x - 7}%;top:${y - 7}%;--r:${Math.round(rnd() * 360)}deg;z-index:${Math.round(y)}`; caps.appendChild(s); placed++; } }
  updateGachaBtns(); showScreen('gachaScreen'); if (typeof switchHub === 'function') switchHub('summon');
}
function updateGachaBtns() {
  const t = SAVE.data.tokens; $('pull1').disabled = t < GACHA_COST.single || gachaBusy; $('pull10').disabled = t < GACHA_COST.ten || gachaBusy;
  const free = !SAVE.data.freeDraw && Object.keys(SAVE.data.roster).length > 0;
  $('freeBox').classList.toggle('hidden', !free); $('pullFree').disabled = gachaBusy;
  $('gEmpty').textContent = t < 1 && !free ? '寶藏幣不夠了。回到篇章推進劇情任務就能再拿到。' : '';
  $('pull1').querySelector('small').textContent = `${GACHA_COST.single} 枚寶藏幣`; $('pull10').querySelector('small').textContent = `${GACHA_COST.ten} 枚・保底 SR 以上`;
}
/* 不會出現在扭蛋與拉霸的角色：NPC 與劇情獎勵角色 */
const NOT_IN_GACHA = id => { const o = CHAR_OBTAIN[id] || {}; return !!(o.npcOnly || o.reward); };
const unownedChars = () => CHARACTER_ORDER.filter(id => !owned(id) && !NOT_IN_GACHA(id));
const gachaChars = () => CHARACTER_ORDER.filter(id => !NOT_IN_GACHA(id));
const DUP_EXP = 6000;
/* 機率為絕對值：船員 charRate＋N／R／SR／SSR 合計 100% */
function rollOne(minR) {
  let r = Math.random();
  if (!minR && r < GAME_SETTINGS.charRate) { const pool = gachaChars(); return { char: pool[Math.floor(Math.random() * pool.length)], lv: GAME_SETTINGS.charLv }; }
  const order = ['N', 'R', 'SR', 'SSR']; let rar = 'N', acc = minR ? 0 : GAME_SETTINGS.charRate; if (minR) r = Math.random() * order.reduce((t, k) => t + RARITY[k].rate, 0);
  for (const k of order) { acc += RARITY[k].rate; if (r < acc) { rar = k; break; } }
  if (minR && order.indexOf(rar) < order.indexOf(minR)) rar = Math.random() < .9 ? 'SR' : 'SSR';
  const pool = Object.entries(ITEMS).filter(([, i]) => i.rarity === rar); return { item: pool[Math.floor(Math.random() * pool.length)][0] };
}
const rarOf = (x) => x.char ? 'SSR' : ITEMS[x.item].rarity;
async function playMachine(best) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, W = ms => wait(reduce ? Math.min(ms, 120) : ms);
  const m = $('machine'); $('mDrop').className = 'm-drop r-' + best;
  // ① 轉動搖桿 ② 扭蛋翻滾
  m.classList.remove('drop'); m.classList.add('spin', 'crank'); SFX.play('crank'); const ck = setInterval(() => SFX.play('blip'), 160);
  await spinCapsules(reduce ? 200 : 1500); clearInterval(ck); SFX.play('crank');
  // ③ 一顆扭蛋掉進出口並彈跳
  m.classList.remove('spin', 'crank'); m.classList.add('drop'); SFX.play('pop'); await W(1000); m.classList.remove('drop');
  // ④ 扭蛋飛到畫面中央，依稀有度搖晃次數不同
  const op = $('gOpen'), shakes = { N: 1, R: 2, SR: 3, SSR: 3 }[best] || 1;
  op.className = 'g-open show enter r-' + best; await W(520);
  for (let k = 0; k < shakes; k++) { op.className = 'g-open show shake r-' + best; SFX.play('pop'); await W(420); op.className = 'g-open show r-' + best + (k === shakes - 1 && ['SR', 'SSR'].includes(best) ? ' glow' : ''); await W(160); }
  // ⑤ 打開：閃光、光芒、稀有時噴金幣
  op.className = 'g-open show open r-' + best; SFX.play(['SR', 'SSR'].includes(best) ? 'rare' : 'pop');
  if (['SR', 'SSR'].includes(best)) coinBurst($('gCoinBurst'), best === 'SSR' ? 70 : 36);
  await W(best === 'SSR' ? 1000 : 650); op.className = 'g-open';
}
function showResults(res, title) {
  $('gResTitle').textContent = title;
  $('gResGrid').className = 'g-res-grid ' + (res.length > 1 ? 'ten' : 'one');
  setTimeout(() => { if (res.some(r => r.char || ['SSR'].includes(rarOf(r)))) coinBurst($('gResBurst'), 40); }, 400);
  $('gResGrid').innerHTML = res.map((x, i) => {
    if (x.char) { const c = CHARACTERS[x.char]; return `<div class="g-cap r-SSR char" style="--d:${i * 90}ms"><span class="rar c-rar r-${CHAR_RARITY[x.char] || 'SSR'}">${CHAR_RARITY[x.char] || 'SSR'}</span><span class="c-tags"><span class="c-badge">${x.dup ? '重複' : '新船員'}</span></span><img src="${c.image}" alt=""><b>${c.name}</b><small>${x.dup ? `已擁有・轉為經驗 +${DUP_EXP.toLocaleString()}` : `LV ${x.lv}・${TIERS[tierOf(x.lv)].name}`}</small>${x.setCap ? `<button class="btn-gold sm" data-cap="${x.char}">加入陣容並設為先鋒</button>` : ''}</div>`; }
    const it = ITEMS[x.item]; return `<div class="g-cap r-${it.rarity}" style="--d:${i * 90}ms"><span class="rar r-${it.rarity}">${it.rarity}</span>${itemIcon(it)}<b>${it.name}</b><small>${it.desc}</small></div>`;
  }).join('');
  $('gResGrid').querySelectorAll('[data-cap]').forEach(b => b.onclick = () => { SAVE.data.player = b.dataset.cap; lineupAdd(b.dataset.cap, true); b.textContent = '已設為先鋒'; b.disabled = true; toast(`${CHARACTERS[b.dataset.cap].name} 成為先鋒`, 'gold'); });
  $('gResult').classList.add('show'); gachaBusy = false; updateGachaBtns();
}
function grant(res) { res.forEach(x => { if (x.char) { if (owned(x.char)) { x.dup = true; gainExp(x.char, DUP_EXP, true, true); } else addCrew(x.char, x.lv); } else SAVE.data.inventory[x.item] = (SAVE.data.inventory[x.item] || 0) + 1; }); SAVE.save(); }
async function pull(n) {
  const cost = n === 10 ? GACHA_COST.ten : GACHA_COST.single; if (gachaBusy || SAVE.data.tokens < cost) return;
  gachaBusy = true; SAVE.data.tokens -= cost; coins(); updateGachaBtns();
  const res = []; for (let i = 0; i < n; i++) res.push(rollOne());
  if (n === 10 && !res.some(x => ['SR', 'SSR'].includes(rarOf(x)))) res[9] = rollOne('SR');
  grant(res); SAVE.data.pulls += n; SAVE.save();
  const best = res.map(rarOf).sort((a, b) => ['N', 'R', 'SR', 'SSR'].indexOf(b) - ['N', 'R', 'SR', 'SSR'].indexOf(a))[0];
  await playMachine(best);
  showResults(res, n === 10 ? '十連結果' : res[0].char ? '新船員加入！' : '獲得道具');
}
async function pullFree() {
  if (gachaBusy || SAVE.data.freeDraw) return; const pool = unownedChars(); if (!pool.length) return;
  gachaBusy = true; SAVE.data.freeDraw = true; updateGachaBtns();
  const x = { char: pool[Math.floor(Math.random() * pool.length)], lv: MAX_LV, setCap: true };
  grant([x]); await playMachine('SSR'); showResults([x], '新手召喚：LV 100 船員加入！');
}
/* 扭蛋翻滾：在玻璃球上用畫布畫出會彈跳碰撞的扭蛋（不再旋轉複製圖片，避免割裂感） */
function spinCapsules(ms) {
  return new Promise(res => {
    const cv = $('gCv'); if (!cv) return setTimeout(res, ms);
    const box = cv.parentElement.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1), W = box.width, H = box.height;
    cv.width = W * dpr; cv.height = H * dpr; const cx = cv.getContext('2d'); cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const R = W * .4, C = [W / 2, H * .54], r = W * .07, COL = ['#e8553b', '#3fb6c9', '#ffd26c', '#b58cff', '#6fd08c', '#ff8a4a', '#5f8fff'];
    const caps = Array.from({ length: 15 }, (_, i) => { const a = Math.random() * Math.PI, d = Math.random() * R * .6; return { x: C[0] + Math.cos(a) * d * (Math.random() < .5 ? -1 : 1), y: C[1] + R * .35 - Math.random() * R * .4, vx: 0, vy: 0, a: Math.random() * 6.28, va: 0, c: COL[i % COL.length], s: .85 + Math.random() * .3 }; });
    const t0 = performance.now(); let last = t0, kick = 0; cv.classList.add('on');
    const frame = now => {
      const dt = Math.min(.033, (now - last) / 1000), el = now - t0, power = el < ms * .8 ? 1 : Math.max(0, 1 - (el - ms * .8) / (ms * .2)); last = now; kick -= dt;
      if (kick <= 0 && power > .05) { kick = .11; caps.forEach(c => { if (c.y > C[1]) { const ang = Math.atan2(c.y - C[1], c.x - C[0]) + Math.PI / 2; c.vx += Math.cos(ang) * 260 * power + (Math.random() - .5) * 120 * power; c.vy -= (180 + Math.random() * 260) * power; c.va += (Math.random() - .5) * 18 * power; } }); }
      caps.forEach(c => { c.vy += 900 * dt; c.vx *= .995; c.x += c.vx * dt; c.y += c.vy * dt; c.a += c.va * dt; c.va *= .98;
        const dx = c.x - C[0], dy = c.y - C[1], d = Math.hypot(dx, dy), lim = R - r * c.s; if (d > lim) { const nx = dx / d, ny = dy / d, vn = c.vx * nx + c.vy * ny; c.x = C[0] + nx * lim; c.y = C[1] + ny * lim; if (vn > 0) { c.vx -= 1.6 * vn * nx; c.vy -= 1.6 * vn * ny; c.vx *= .9; c.vy *= .9; } } });
      for (let i = 0; i < caps.length; i++) for (let k = i + 1; k < caps.length; k++) { const A = caps[i], B = caps[k], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || .01, m = r * (A.s + B.s) * .95; if (d < m) { const push = (m - d) / 2, nx = dx / d, ny = dy / d; A.x -= nx * push; A.y -= ny * push; B.x += nx * push; B.y += ny * push; const rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny; if (rv < 0) { A.vx += rv * nx * .5; A.vy += rv * ny * .5; B.vx -= rv * nx * .5; B.vy -= rv * ny * .5; } } }
      cx.clearRect(0, 0, W, H);
      const g = cx.createRadialGradient(C[0], C[1], R * .2, C[0], C[1], R * 1.02); g.addColorStop(0, 'rgba(40,22,8,.42)'); g.addColorStop(.85, 'rgba(40,22,8,.3)'); g.addColorStop(1, 'rgba(40,22,8,0)'); cx.fillStyle = g; cx.beginPath(); cx.arc(C[0], C[1], R * 1.02, 0, 6.29); cx.fill();
      caps.slice().sort((p, q) => p.y - q.y).forEach(c => { const rr = r * c.s; cx.save(); cx.translate(c.x, c.y); cx.rotate(c.a);
        cx.beginPath(); cx.arc(0, 0, rr, Math.PI, 0); cx.closePath(); const gt = cx.createLinearGradient(0, -rr, 0, 0); gt.addColorStop(0, c.c); gt.addColorStop(1, c.c); cx.fillStyle = gt; cx.fill();
        cx.beginPath(); cx.arc(0, 0, rr, 0, Math.PI); cx.closePath(); cx.fillStyle = '#f6f1e4'; cx.fill();
        cx.rotate(-c.a); const sh = cx.createRadialGradient(-rr * .35, -rr * .4, rr * .1, 0, 0, rr); sh.addColorStop(0, 'rgba(255,255,255,.55)'); sh.addColorStop(.45, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.35)'); cx.fillStyle = sh; cx.beginPath(); cx.arc(0, 0, rr, 0, 6.29); cx.fill(); cx.rotate(c.a);
        cx.lineWidth = Math.max(1, rr * .09); cx.strokeStyle = 'rgba(40,24,10,.85)'; cx.beginPath(); cx.arc(0, 0, rr, 0, 6.29); cx.stroke(); cx.beginPath(); cx.moveTo(-rr, 0); cx.lineTo(rr, 0); cx.stroke(); cx.restore(); });
      if (el < ms) requestAnimationFrame(frame); else { cv.classList.remove('on'); setTimeout(() => cx.clearRect(0, 0, W, H), 350); res(); }
    };
    requestAnimationFrame(frame);
  });
}
function openBag() {
  const inv = SAVE.data.inventory, ids = Object.keys(ITEMS).filter(id => inv[id] > 0);
  $('bagList').innerHTML = ids.length ? ids.map(id => { const it = ITEMS[id]; return `<div class="bagItem static r-${it.rarity}">${itemIcon(it)}<span class="bi-name">${it.name}<small>${it.desc}</small></span><b>×${inv[id]}</b></div>`; }).join('') : '<div class="bagEmpty">背包是空的。完成劇情任務拿到寶藏幣，就能到懸賞處抽道具。</div>';
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
  $('startBtn').onclick = startGame; $('adminBtn').onclick = openAdmin; bindAdmin(); $('pullFree').onclick = pullFree; $('charConfirm').onclick = () => { if (crewMode === 'starter') confirmStarter(); };
  $('newsOpenBtn').onclick = () => openNews(); $('newsMoreBtn').onclick = () => openNews(); $('newsEditBtn').onclick = openNewsEditor;
  $('soundBtn').onclick = toggleSound; document.querySelectorAll('[data-snd]').forEach(b => b.onclick = toggleSound); syncSound();
  document.addEventListener('click', e => { if (e.target.closest('.btn-primary,.btn-gold,.btn-ghost,.node,.char,.chipbtn,.cmd-btn,.icon-btn')) SFX.play('click'); });
  $('chBackBtn').onclick = () => openModes();
  $('wBackBtn').onclick = () => openChart(CH && CH.id);
  ['gachaBtnMap', 'gachaBtnWorld'].forEach(i => $(i).onclick = () => openGacha());
  ['bagBtnMap', 'bagBtnWorld', 'bagBtnGacha'].forEach(i => $(i).onclick = openBag);
  $('gBackBtn').onclick = () => { if (gachaReturn === 'worldScreen') { showScreen('worldScreen'); coins(); } else if (gachaReturn === 'modeScreen') openModes(); else if (gachaReturn === 'towerScreen') openTower(); else openChart(); };
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
/* ---------- 新手拉霸（免費 LV100 召喚） ---------- */
const SLOT_H = 110; let slotBusy = false;
function slotStrip(el, ids) { el.innerHTML = ids.map(id => `<div class="cell"><img src="${CHARACTERS[id].avatar}" alt=""></div>`).join(''); el.style.transform = 'translateY(0)'; }
function openSlot() {
  if (SAVE.data.freeDraw) { toast('新手拉霸已經使用過了'); return; }
  const pool = unownedChars(); if (!pool.length) { toast('所有船員都已經到齊了！'); return; }
  $('slotResult').innerHTML = ''; $('slotSpin').style.display = ''; $('slotSpin').disabled = false; $('slotModal').querySelector('.slot').classList.remove('win');
  [0, 1, 2].forEach(r => slotStrip($('reel' + r), [0, 1, 2].map(k => pool[(k + r * 2) % pool.length])));
  openModal('slotModal');
}
/* 噴金幣：從中央往上噴出後落下 */
function coinBurst(host, n) {
  if (!host) return; const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; if (reduce) n = Math.min(n, 12);
  const r = host.getBoundingClientRect(), cx = r.width / 2, cy = r.height * .55;
  for (let i = 0; i < n; i++) { const c = document.createElement('i'); c.className = 'coin-fly'; host.appendChild(c);
    const a = -Math.PI / 2 + (Math.random() - .5) * 2.2, v = 260 + Math.random() * 360, dx = Math.cos(a) * v, up = Math.sin(a) * v, s = .6 + Math.random() * .7, rot = (Math.random() - .5) * 1080, dur = 1300 + Math.random() * 700;
    c.style.left = cx + 'px'; c.style.top = cy + 'px';
    c.animate([{ transform: `translate(-50%,-50%) scale(${s * .3}) rotateY(0deg)`, opacity: 1 }, { transform: `translate(calc(-50% + ${dx * .55}px), calc(-50% + ${up * .55}px)) scale(${s}) rotateY(${rot * .5}deg)`, opacity: 1, offset: .35 }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${up * .2 + 420}px)) scale(${s}) rotateY(${rot}deg)`, opacity: 0 }], { duration: dur, delay: i * 12, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' }).onfinish = () => c.remove(); }
}
async function spinSlot() {
  if (slotBusy || SAVE.data.freeDraw) return; const pool = unownedChars(); if (!pool.length) return;
  slotBusy = true; $('slotSpin').disabled = true; const lever = $('slotLever'); lever.classList.remove('pull'); void lever.offsetWidth; lever.classList.add('pull');
  const target = pool[Math.floor(Math.random() * pool.length)], N = 28, CH_ = ($('reel0').querySelector('.cell') || {}).offsetHeight || SLOT_H;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tick = setInterval(() => SFX.play('blip'), 90);
  const anims = [0, 1, 2].map(r => { const ids = []; for (let i = 0; i < N; i++) ids.push(pool[Math.floor(Math.random() * pool.length)]); ids[N - 2] = target; const el = $('reel' + r); slotStrip(el, ids);
    const end = -(N - 3) * CH_, dur = reduce ? 300 : 1700 + r * 650;
    el.animate([{ filter: 'blur(0)' }, { filter: 'blur(3px)', offset: .15 }, { filter: 'blur(3px)', offset: .7 }, { filter: 'blur(0)' }], { duration: dur, delay: r * 120, fill: 'forwards' });
    return el.animate([{ transform: 'translateY(0)', easing: 'cubic-bezier(.45,0,.9,.6)' }, { transform: `translateY(${end * .18}px)`, offset: .18 }, { transform: `translateY(${end - 14}px)`, offset: .9, easing: 'ease-out' }, { transform: `translateY(${end}px)` }], { duration: dur, delay: r * 120, fill: 'forwards' }).finished.then(() => { SFX.play('punch'); const c = el.children[N - 2]; if (c) c.classList.add('hit'); }); });
  await Promise.all(anims); clearInterval(tick);
  SAVE.data.freeDraw = true; addCrew(target, MAX_LV); SAVE.save(); SFX.play('rare'); AUDIO.sfx('ult');
  $('slotModal').querySelector('.slot').classList.add('win'); $('slotSpin').style.display = 'none';
  coinBurst($('coinBurst'), 60); SFX.play('coin'); setTimeout(() => SFX.play('coin'), 180);
  const c = CHARACTERS[target], full = SAVE.data.lineup.length >= GAME_SETTINGS.lineupMax;
  $('slotResult').innerHTML = `<div class="sr-card"><img src="${c.image}" alt=""><div><small>JACKPOT</small><h3>${c.name}<em>${c.title}</em></h3><p>LV 100・${TIERS[tierOf(MAX_LV)].name}，已放進角色背包。要讓他上陣嗎？</p>
    <div class="sr-actions"><button class="btn-gold" data-sl="lead">上陣並設為先鋒</button><button class="btn-primary" data-sl="add">${full ? '上陣（替換最後一位）' : '加入陣容'}</button><button class="btn-ghost" data-sl="bag">先放在背包</button></div></div></div>`;
  $('slotResult').querySelectorAll('[data-sl]').forEach(b => b.onclick = () => { const k = b.dataset.sl; if (k === 'lead') lineupAdd(target, true); if (k === 'add') lineupAdd(target); toast(k === 'bag' ? `${c.name} 在角色背包等你` : `${c.name} 上陣了！`, 'gold'); closeModal('slotModal'); updateGachaBtns(); });
  slotBusy = false; updateGachaBtns();
}
pullFree = openSlot;

/* ---------- 商店 ---------- */
window.addEventListener('DOMContentLoaded', () => { $('slotSpin').onclick = spinSlot; $('slotLever').onclick = spinSlot; });
window.addEventListener('DOMContentLoaded', boot);
window.addEventListener('DOMContentLoaded', () => { if (window.__adminReset) setTimeout(() => toast('偵測到舊版本的後台設定，已自動停用並備份，遊戲改用最新的劇情與角色資料', 'warn'), 1200); });
/* 公告板：可展開／收合（手機預設收合） */
window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem(NEWS_OPEN_KEY); setNewsOpen(saved ? saved === '1' : innerWidth > 860);
  $('newsToggle').onclick = () => setNewsOpen(document.querySelector('.news-board').classList.contains('collapsed'));
  // 手機選單：把頂部列的文字按鈕收進「選單」
  document.querySelectorAll('.topbar-right').forEach(tr => {
    const btns = [...tr.querySelectorAll('.btn-ghost,.btn-gold')]; if (btns.length < 2) return;
    const m = document.createElement('button'); m.className = 'icon-btn m-menu'; m.setAttribute('aria-label', '選單'); m.textContent = '☰'; tr.appendChild(m);
    m.onclick = () => { const snd = tr.querySelector('[data-snd]'); $('menuGrid').innerHTML = btns.map((b, i) => `<button class="${b.classList.contains('btn-gold') ? 'btn-gold' : 'btn-ghost'}" data-i="${i}">${b.textContent}</button>`).join('') + (snd ? `<button class="btn-ghost" data-snd-m>音樂：${AUDIO.pref.muted ? '關' : '開'}</button>` : '');
      $('menuGrid').querySelectorAll('[data-i]').forEach(x => x.onclick = () => { closeSheet(); btns[+x.dataset.i].click(); });
      const sm = $('menuGrid').querySelector('[data-snd-m]'); if (sm) sm.onclick = () => { toggleSound(); sm.textContent = '音樂：' + (AUDIO.pref.muted ? '關' : '開'); };
      $('menuSheet').classList.add('show'); };
  });
  $('menuClose').onclick = closeSheet; $('menuSheet').onclick = e => { if (e.target.id === 'menuSheet') closeSheet(); };
});
function closeSheet() { $('menuSheet').classList.remove('show'); }
/* 切到背景時暫停 3D 與音樂，回來再繼續 */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (WORLD && WORLD.running) { WORLD._wasRunning = true; WORLD.stop(); } AUDIO.suspend && AUDIO.suspend(); }
  else { if (WORLD && WORLD._wasRunning && currentScreen === 'worldScreen') { WORLD._wasRunning = false; WORLD.start(); } AUDIO.resume && AUDIO.resume(); }
});
let _rz; window.addEventListener('resize', () => { clearTimeout(_rz); _rz = setTimeout(() => { if (currentScreen === 'chapterScreen') openChart(selChapter); }, 200); });
