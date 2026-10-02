/* 遊戲管理後台：不用改程式碼即可調整數值、BOSS、劇情與扭蛋 */
const ADMIN_KEY = 'op_voyage_admin_v2';
const ADMIN_BASE = {
  characters: JSON.parse(JSON.stringify(CHARACTERS)),
  chapters: JSON.parse(JSON.stringify(CHAPTERS)),
  difficulty: JSON.parse(JSON.stringify(CHAPTER_DIFFICULTY)),
  settings: JSON.parse(JSON.stringify(GAME_SETTINGS)),
  rarity: JSON.parse(JSON.stringify(RARITY)),
  cost: JSON.parse(JSON.stringify(GACHA_COST))
};
function adminLoad() {
  let c; try { c = JSON.parse(localStorage.getItem(ADMIN_KEY) || '{}') || {}; } catch (e) { c = {}; }
  // 舊版本的後台設定會把新劇情、新技能蓋回去：備份後停用
  if (Object.keys(c).length && c.dataVersion !== DATA_VERSION) {
    try { localStorage.setItem(ADMIN_KEY + '_backup_v' + (c.dataVersion || 'old'), JSON.stringify(c)); } catch (e) { }
    localStorage.removeItem(ADMIN_KEY); window.__adminReset = true; return {};
  }
  return c;
}
function adminApply(cfg) {
  cfg = cfg || {};
  const B = JSON.parse(JSON.stringify(ADMIN_BASE));
  Object.keys(GAME_SETTINGS).forEach(k => delete GAME_SETTINGS[k]); Object.assign(GAME_SETTINGS, B.settings, cfg.settings || {});
  Object.keys(B.characters).forEach(id => {
    const c = B.characters[id], o = (cfg.characters || {})[id] || {};
    ['name', 'title', 'maxHp', 'baseSpeed', 'scale', 'desc'].forEach(k => { if (o[k] !== undefined && o[k] !== '') c[k] = o[k]; });
    (o.skills || []).forEach((s, i) => { if (c.skills[i] && s) { Object.assign(c.skills[i], s); if (s.maxPP !== undefined) c.skills[i].pp = s.maxPP; } });
    CHARACTERS[id] = c;
  });
  Object.keys(B.difficulty).forEach(id => { CHAPTER_DIFFICULTY[id] = Object.assign(B.difficulty[id], (cfg.difficulty || {})[id] || {}); });
  const chs = B.chapters.map(ch => { const o = (cfg.chapters || {})[ch.id]; return o ? Object.assign(ch, o) : ch; });
  CHAPTERS.splice(0, CHAPTERS.length, ...chs);
  Object.keys(B.rarity).forEach(k => { RARITY[k] = Object.assign(B.rarity[k], ((cfg.rarity || {})[k]) || {}); });
  Object.assign(GACHA_COST, B.cost, cfg.cost || {});
}
adminApply(adminLoad());

/* ---------- 介面 ---------- */
let ADM = null, admChar = 'luffy', admChapter = 'east';
function openAdmin() { ADM = adminLoad(); renderAdmin(); openModal('adminModal'); }
const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
function field(label, name, value, type, extra) {
  return `<label class="af"><span>${label}</span><input name="${name}" type="${type || 'number'}" value="${esc(value)}" ${extra || ''}></label>`;
}
function renderAdmin(tab) {
  tab = tab || document.querySelector('#adminNav .on')?.dataset.tab || 'general';
  document.querySelectorAll('#adminNav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const P = $('adminPane'); const S = GAME_SETTINGS;
  if (tab === 'visual') { renderVisualAdmin(P); $('adminStatus').textContent = ''; return; }
  if (tab === 'general') {
    P.innerHTML = `<h3>基本規則</h3><p class="an">存檔後立即套用到下一場戰鬥與下一次登島。</p><div class="agrid">
      ${field('每回合選技秒數', 'turnSeconds', S.turnSeconds, 'number', 'min="5" max="120"')}
      ${field('BOSS 復活次數', 'bossRevives', S.bossRevives, 'number', 'min="0" max="5"')}
      ${field('每場可用道具次數', 'itemsPerBattle', S.itemsPerBattle, 'number', 'min="0" max="20"')}
      ${field('新玩家初始寶藏幣', 'startTokens', S.startTokens, 'number', 'min="0"')}
      ${field('首次通關獎勵寶藏幣', 'clearBonus', S.clearBonus, 'number', 'min="0"')}
      ${field('替補船員分享經驗比例', 'shareExp', S.shareExp, 'number', 'step="0.05" min="0" max="1"')}
      ${field('攻擊每階增減（0.10 = 10%）', 'atkStep', S.atkStep, 'number', 'step="0.01" min="0" max="0.5"')}
      ${field('防禦每階增減', 'defStep', S.defStep, 'number', 'step="0.01" min="0" max="0.5"')}
      ${field('速度每階增減', 'spdStep', S.spdStep, 'number', 'step="0.01" min="0" max="0.5"')}
      ${field('冰凍每回合扣血', 'freezeDot', S.freezeDot, 'number', 'step="0.01" min="0" max="0.5"')}
      ${field('冰凍速度下降', 'freezeSlow', S.freezeSlow, 'number', 'step="0.05" min="0" max="0.9"')}
      ${field('燒傷每回合扣血', 'burnDot', S.burnDot, 'number', 'step="0.01" min="0" max="0.5"')}
      ${field('虛弱時傷害下降', 'weakDealt', S.weakDealt, 'number', 'step="0.05" min="0" max="0.9"')}
      ${field('破防時受傷增加', 'armorBreak', S.armorBreak, 'number', 'step="0.01" min="0" max="1"')}
      ${field('首殺 BOSS 加入機率', 'bossJoinFirst', S.bossJoinFirst, 'number', 'step="0.05" min="0" max="1"')}
      ${field('重複擊敗 BOSS 加入機率', 'bossJoinRepeat', S.bossJoinRepeat, 'number', 'step="0.05" min="0" max="1"')}
      ${field('BOSS 加入時的等級', 'bossJoinLv', S.bossJoinLv, 'number', 'min="1" max="100"')}
      ${field('屬性克制倍率（1 = 關閉）', 'typeUp', S.typeUp, 'number', 'step="0.05" min="1" max="3"')}
      ${field('屬性微弱倍率（1 = 關閉）', 'typeDown', S.typeDown, 'number', 'step="0.05" min="0.1" max="1"')}
      <label class="af check"><input name="unlockAll" type="checkbox" ${S.unlockAll ? 'checked' : ''}><span>全部篇章直接開放（不需依序解鎖）</span></label>
    </div>`;
  } else if (tab === 'chars') {
    const c = CHARACTERS[admChar];
    P.innerHTML = `<h3>角色與技能</h3><div class="arow">${CHARACTER_ORDER.map(id => `<button class="chipbtn ${id === admChar ? 'on' : ''}" data-char="${id}"><img src="${CHARACTERS[id].avatar}" alt="">${CHARACTERS[id].name}</button>`).join('')}</div>
      <div class="agrid">${field('名稱', 'name', c.name, 'text')}${field('稱號', 'title', c.title, 'text')}${field('最大體力', 'maxHp', c.maxHp)}${field('速度', 'baseSpeed', c.baseSpeed)}${field('對戰圖片縮放', 'scale', c.scale, 'number', 'step="0.01"')}</div>
      <label class="af wide"><span>角色介紹</span><input name="desc" type="text" value="${esc(c.desc)}"></label>
      <div class="askills">${c.skills.map((s, i) => `<fieldset data-skill="${i}"><legend>技能 ${i + 1}${s.ultimate ? '・奧義' : ''}</legend>
        <div class="agrid four">${field('名稱', 'sname', s.name, 'text')}${field('使用次數', 'maxPP', s.maxPP)}${field('威力', 'power', s.power)}${field('命中率', 'accuracy', s.accuracy)}</div>
        <label class="af wide"><span>說明</span><input name="sdesc" type="text" value="${esc(s.desc)}"></label>
        <label class="af wide"><span>效果（JSON，進階）</span><textarea name="effect" rows="2" spellcheck="false">${esc(JSON.stringify(s.effect || {}))}</textarea></label>
      </fieldset>`).join('')}</div>`;
    P.querySelectorAll('[data-char]').forEach(b => b.onclick = () => { collectAdmin(); admChar = b.dataset.char; renderAdmin('chars'); });
  } else if (tab === 'chapters') {
    P.innerHTML = `<h3>篇章、BOSS 與難度</h3><p class="an">難度倍率會套用在該篇章所有敵人身上；BOSS 另外乘上 BOSS 倍率。</p>` + CHAPTERS.map(ch => { const d = CHAPTER_DIFFICULTY[ch.id]; return `<fieldset data-chapter="${ch.id}"><legend>${ch.name}</legend>
      <div class="agrid four">${field('篇章名稱', 'cname', ch.name, 'text')}${field('副標題', 'subtitle', ch.subtitle, 'text')}
      <label class="af"><span>篇章 BOSS</span><select name="boss"><option value="" ${!ch.boss ? 'selected' : ''}>（暫無 BOSS）</option>${CHARACTER_ORDER.map(id => `<option value="${id}" ${id === ch.boss ? 'selected' : ''}>${CHARACTERS[id].name}</option>`).join('')}</select></label>
      ${field('BOSS 稱號', 'bossTitle', ch.bossTitle, 'text')}</div>
      <div class="agrid seven">${field('體力倍率', 'hp', d.hp, 'number', 'step="0.01"')}${field('攻擊階', 'atk', d.atk)}${field('防禦階', 'def', d.def)}${field('速度階', 'spd', d.spd)}${field('BOSS 體力倍率', 'bossHp', d.bossHp, 'number', 'step="0.01"')}${field('BOSS 額外階', 'bossStages', d.bossStages)}${field('AI 積極度', 'ai', d.ai, 'number', 'step="0.01"')}</div>
      <div class="agrid five">${ch.steps.map((s, i) => field(`任務 ${i + 1} 獎勵`, 'rew' + i, s.reward)).join('')}</div></fieldset>`; }).join('');
  } else if (tab === 'story') {
    const ch = CHAPTERS.find(c => c.id === admChapter);
    P.innerHTML = `<h3>劇情與對話</h3><p class="an">可以修改篇章介紹、NPC 名字與閒聊、每一步任務的說明與對白。對白格式為 ["NPC 代號","內容"]。</p>
      <div class="arow">${CHAPTERS.map(c => `<button class="chipbtn ${c.id === admChapter ? 'on' : ''}" data-ch="${c.id}">${c.name}</button>`).join('')}</div>
      <label class="af wide"><span>篇章介紹</span><textarea name="blurb" rows="2">${esc(ch.blurb)}</textarea></label>
      <label class="af wide"><span>NPC（JSON）</span><textarea name="npcs" rows="8" spellcheck="false">${esc(JSON.stringify(ch.npcs, null, 1))}</textarea></label>
      <label class="af wide"><span>任務步驟（JSON）</span><textarea name="steps" rows="14" spellcheck="false">${esc(JSON.stringify(ch.steps, null, 1))}</textarea></label>`;
    P.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { if (collectAdmin()) { admChapter = b.dataset.ch; renderAdmin('story'); } });
  } else if (tab === 'gacha') {
    P.innerHTML = `<h3>扭蛋機</h3><p class="an">機率會自動換算成總和 100%。</p><div class="agrid four">${Object.keys(RARITY).map(k => field(`${k} 機率（%）`, 'rate_' + k, Math.round(RARITY[k].rate * 1000) / 10, 'number', 'step="0.1" min="0"')).join('')}</div>
      <div class="agrid">${field('單抽花費', 'single', GACHA_COST.single)}${field('十連花費', 'ten', GACHA_COST.ten)}${field('每抽出現角色機率（%）', 'charRate', Math.round(GAME_SETTINGS.charRate * 1000) / 10, 'number', 'step="0.1" min="0" max="100"')}${field('抽到角色的等級', 'charLv', GAME_SETTINGS.charLv, 'number', 'min="1" max="100"')}</div>`;
  } else if (tab === 'news') {
    P.innerHTML = `<h3>公告</h3><p class="an">公告編輯器會另外開啟。</p><button class="btn-primary" id="admNews">開啟公告編輯器</button>`;
    $('admNews').onclick = () => { closeModal('adminModal'); openNewsEditor(); };
  } else if (tab === 'tools') {
    P.innerHTML = `<h3>備份與測試工具</h3><div class="atools">
      <button class="btn-ghost" data-t="export">匯出後台設定</button>
      <label class="btn-ghost filebtn">匯入後台設定<input type="file" accept="application/json" id="admImport"></label>
      <button class="btn-ghost" data-t="tokens">給自己 10 枚寶藏幣</button>
      <button class="btn-ghost" data-t="tokens1000">獲得 1000 枚寶藏幣</button>
      <span class="adm-get"><select id="admGetChar">${CHARACTER_ORDER.map(id => `<option value="${id}">${CHARACTERS[id].name}${owned(id) ? '（已擁有）' : ''}</option>`).join('')}</select><button class="btn-ghost" data-t="getChar">馬上獲得此角色</button></span>
      <span class="adm-get"><select id="admGetSkin">${Object.entries(SKINS).filter(([k, s]) => !s.soon).map(([k, s]) => `<option value="${k}">${CHARACTERS[s.char].name}・${s.name}</option>`).join('')}</select><button class="btn-ghost" data-t="getSkin">馬上獲得此皮膚</button></span>
      <button class="btn-ghost" data-t="unlock">標記全部篇章已通關</button>
      <button class="btn-ghost" data-t="lvup">目前船長 +10 級</button>
      <button class="btn-ghost" data-t="allchars">獲得全部角色（LV 50）</button>
      <button class="btn-ghost" data-t="freedraw">重置新手免費召喚</button>
      <button class="btn-ghost danger" data-t="resetSave">清除遊戲進度</button>
      <button class="btn-ghost danger" data-t="resetAdmin">後台設定恢復預設</button></div>`;
    P.querySelectorAll('[data-t]').forEach(b => b.onclick = () => adminTool(b.dataset.t));
    $('admImport').onchange = (e) => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { const c = JSON.parse(t); c.dataVersion = DATA_VERSION; localStorage.setItem(ADMIN_KEY, JSON.stringify(c)); adminApply(c); ADM = c; renderAdmin('tools'); toast('後台設定已匯入'); } catch (err) { toast('檔案格式不正確，請選擇匯出的 JSON 檔', 'warn'); } }); };
  }
  $('adminStatus').textContent = '';
}
function collectAdmin() {
  const P = $('adminPane'), tab = document.querySelector('#adminNav .on').dataset.tab, v = (n, root) => (root || P).querySelector(`[name="${n}"]`);
  try {
    if (tab === 'general') {
      ADM.settings = Object.assign(ADM.settings || {}, {}); ['turnSeconds', 'bossRevives', 'itemsPerBattle', 'startTokens', 'clearBonus', 'shareExp', 'atkStep', 'defStep', 'spdStep', 'freezeDot', 'freezeSlow', 'burnDot', 'weakDealt', 'armorBreak', 'bossJoinFirst', 'bossJoinRepeat', 'bossJoinLv', 'typeUp', 'typeDown'].forEach(k => ADM.settings[k] = num(v(k).value, GAME_SETTINGS[k]));
      ADM.settings.unlockAll = v('unlockAll').checked;
    } else if (tab === 'chars') {
      ADM.characters = ADM.characters || {}; const o = { name: v('name').value.trim(), title: v('title').value.trim(), maxHp: num(v('maxHp').value), baseSpeed: num(v('baseSpeed').value), scale: num(v('scale').value), desc: v('desc').value, skills: [] };
      P.querySelectorAll('[data-skill]').forEach(fs => { const i = +fs.dataset.skill; let ef; try { ef = JSON.parse(v('effect', fs).value || '{}'); } catch (e) { throw new Error(`技能 ${i + 1} 的效果 JSON 格式錯誤`); } o.skills[i] = { name: v('sname', fs).value, maxPP: num(v('maxPP', fs).value), power: num(v('power', fs).value), accuracy: num(v('accuracy', fs).value), desc: v('sdesc', fs).value, effect: ef }; });
      ADM.characters[admChar] = o;
    } else if (tab === 'chapters') {
      ADM.chapters = ADM.chapters || {}; ADM.difficulty = ADM.difficulty || {};
      P.querySelectorAll('[data-chapter]').forEach(fs => { const id = fs.dataset.chapter, ch = CHAPTERS.find(c => c.id === id); const steps = JSON.parse(JSON.stringify(ch.steps)); steps.forEach((s, i) => s.reward = num(v('rew' + i, fs).value, s.reward));
        ADM.chapters[id] = Object.assign(ADM.chapters[id] || {}, { name: v('cname', fs).value, subtitle: v('subtitle', fs).value, boss: v('boss', fs).value || null, bossTitle: v('bossTitle', fs).value, steps });
        const d = {}; ['hp', 'atk', 'def', 'spd', 'bossHp', 'bossStages', 'ai'].forEach(k => d[k] = num(v(k, fs).value, CHAPTER_DIFFICULTY[id][k])); ADM.difficulty[id] = d; });
    } else if (tab === 'story') {
      let npcs, steps; try { npcs = JSON.parse(v('npcs').value); steps = JSON.parse(v('steps').value); } catch (e) { throw new Error('劇情 JSON 格式錯誤，請檢查括號與引號'); }
      if (!Array.isArray(npcs) || !Array.isArray(steps) || !steps.length) throw new Error('NPC 與任務步驟都必須是清單');
      ADM.chapters = ADM.chapters || {}; ADM.chapters[admChapter] = Object.assign(ADM.chapters[admChapter] || {}, { blurb: v('blurb').value, npcs, steps });
    } else if (tab === 'gacha') {
      const rates = {}; let tot = 0; Object.keys(RARITY).forEach(k => { rates[k] = Math.max(0, num(v('rate_' + k).value, 0)); tot += rates[k]; });
      if (tot <= 0) throw new Error('機率總和必須大於 0');
      ADM.rarity = {}; Object.keys(rates).forEach(k => ADM.rarity[k] = { rate: rates[k] / tot }); ADM.cost = { single: Math.max(0, num(v('single').value, 1)), ten: Math.max(0, num(v('ten').value, 9)) }; ADM.settings = Object.assign(ADM.settings || {}, { charRate: Math.min(1, Math.max(0, num(v('charRate').value, 3) / 100)), charLv: Math.min(100, Math.max(1, num(v('charLv').value, 20))) });
    }
    return true;
  } catch (e) { $('adminStatus').textContent = e.message; $('adminStatus').className = 'astatus err'; return false; }
}
function saveAdmin() {
  if (!collectAdmin()) return;
  ADM.dataVersion = DATA_VERSION; localStorage.setItem(ADMIN_KEY, JSON.stringify(ADM)); adminApply(ADM);
  $('adminStatus').textContent = '已儲存並套用'; $('adminStatus').className = 'astatus ok'; SFX.play('coin');
  if (currentScreen === 'chapterScreen') openChart(selChapter);
  const t = document.querySelector('#adminNav .on').dataset.tab; renderAdmin(t); $('adminStatus').textContent = '已儲存並套用'; $('adminStatus').className = 'astatus ok';
}
function adminTool(t) {
  if (t === 'tokens1000') { SAVE.data.tokens += 1000; SAVE.save(); coins(); toast('獲得 1000 枚寶藏幣', 'gold'); return; }
  if (t === 'getChar') { const id = $('admGetChar').value; if (owned(id)) { toast(`${CHARACTERS[id].name} 已經在船上了`); return; } addCrew(id, 50); toast(`${CHARACTERS[id].name} 加入了船隊（LV 50）`, 'gold'); renderAdmin('tools'); return; }
  if (t === 'getSkin') { const k = $('admGetSkin').value, S = SAVE.data.skins = SAVE.data.skins || { owned: [], equip: {} }; S.owned = S.owned || []; if (S.owned.includes(k)) { toast('已經擁有這款皮膚'); return; } S.owned.push(k); SAVE.save(); toast(`獲得皮膚「${SKINS[k].name}」`, 'gold'); return; }
  if (t === 'export') { const blob = new Blob([JSON.stringify(adminLoad(), null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'op_admin_config.json'; a.click(); }
  if (t === 'tokens') { addTokens(10, '後台發放'); }
  if (t === 'unlock') { CHAPTERS.forEach(c => SAVE.data.chapters[c.id].cleared = true); SAVE.save(); toast('全部篇章已標記通關'); }
  if (t === 'lvup') { const r = SAVE.data.roster[SAVE.data.player]; if (r) { r.lv = Math.min(MAX_LV, r.lv + 10); r.exp = 0; SAVE.save(); toast(`${CHARACTERS[SAVE.data.player].name} 升到 LV ${r.lv}`); } }
  if (t === 'allchars') { CHARACTER_ORDER.forEach(id => addCrew(id, 50)); toast('已獲得全部角色'); }
  if (t === 'freedraw') { SAVE.data.freeDraw = false; SAVE.save(); toast('新手免費召喚已重置'); }
  if (t === 'resetSave') confirmBox('清除遊戲進度？', '寶藏幣、背包與篇章進度都會歸零，無法復原。', '清除', () => { localStorage.removeItem(SAVE.key); SAVE.load(); coins(); loginInfo(); toast('遊戲進度已清除'); });
  if (t === 'resetAdmin') confirmBox('恢復預設設定？', '所有後台修改（數值、BOSS、劇情、扭蛋）都會還原。', '恢復', () => { localStorage.removeItem(ADMIN_KEY); ADM = {}; adminApply({}); renderAdmin('tools'); toast('後台設定已恢復預設'); });
}
function bindAdmin() {
  $('adminNav').querySelectorAll('button').forEach(b => b.onclick = () => { if (collectAdmin()) renderAdmin(b.dataset.tab); });
  $('adminSave').onclick = saveAdmin;
  $('adminCancel').onclick = () => { ADM = adminLoad(); renderAdmin(); $('adminStatus').textContent = '已放棄未儲存的修改'; $('adminStatus').className = 'astatus'; };
}
