/* 對戰畫面：流程、介面、技能動畫、道具使用 */
let battle = null;
const STRUGGLE = { name: '奮力一擊', type: 'attack', pp: 99, maxPP: 99, power: 40, accuracy: 100, desc: '技能次數用光時的最後手段。', anima: 'punch', effect: {} };
const BATTLE_ANIM = { icefang: 'blue', hakke: 'purple', kagamiyama: 'blue', onigiri: 'green', shishi: 'green', sanzen: 'green', ashura: 'red', collier: 'gold', diable: 'red', skywalk: 'gold', ifrit: 'blue', darkpull: 'purple', quake: 'purple', release: 'purple', limbs: 'purple', demonflower: 'purple', poseidon: 'blue', seaking: 'blue', summonsea: 'blue', punch: 'red', snake: 'red', barrage: 'red', beam: 'blue', hammer: 'blue', world: 'blue', thunderfive: 'blue', lightning: 'blue', flash: 'blue', judgment: 'blue', sandslash: 'gold', sandtrap: 'gold', sandtriple: 'gold', sandstorm: 'gold', dry: 'gold', darkpull: 'gold', quake: 'gold', darkcopy: 'gold', release: 'gold' };

function startBattle(opts) {
  const { playerId, enemyId, chapterId, isBoss, onEnd } = opts;
  const spec = opts.team && opts.team.length ? opts.team : [{ id: playerId, lv: opts.playerLv || MAX_LV, hp: opts.playerHp }];
  const team = spec.map(t => { const f = buildFighter(t.id, t.lv || MAX_LV); f.status.revive = 0; if (t.hp != null) f.hp = Math.max(0, Math.min(f.maxHp, Math.round(t.hp))); return f; });
  let pi = team.findIndex(f => f.hp > 0); if (pi < 0) { pi = 0; team[0].hp = 1; }
  const p = team[pi];
  const e = applyChapterDifficulty(buildFighter(enemyId, opts.enemyLv || MAX_LV), chapterId, isBoss);
  if (battle) clearInterval(battle.timerHandle);
  battle = { team, pi, mustSwitch: false, player: p, enemy: e, round: 1, timer: 20, timerHandle: null, isBusy: false, gameOver: false, isBoss, bossRevivesUsed: 0, chapterId, onEnd, itemsUsed: 0, opts, difficulty: CHAPTER_DIFFICULTY[chapterId] || CHAPTER_DIFFICULTY.east };
  const ch = CHAPTERS.find(c => c.id === chapterId);
  $('bBg').style.backgroundImage = `url("${ch ? ch.art : ''}")`;
  $('bLogList').innerHTML = ''; $('bResult').classList.remove('show'); closeDrawers(); $('bFL').classList.remove('down', 'hit'); $('bFR').classList.remove('down', 'hit');
  ['L', 'R'].forEach(s => { const c = s === 'L' ? p : e; $('bImg' + s).src = c.image; $('bAv' + s).src = c.avatar; $('bName' + s).textContent = c.name; $('bTitle' + s).textContent = c.title; $('bTypes' + s).innerHTML = c.types.map(t => `<span class="type" style="--t:${TYPE_COLORS[t] || '#888'}">${t}</span>`).join(''); $('bF' + s).style.setProperty('--sc', c.scale || .9); });
  $('bPlateR').classList.toggle('boss', !!isBoss);
  $('bLvR').textContent = (isBoss ? 'BOSS ' : '') + 'LV ' + e.level; $('bLvL').textContent = 'LV ' + p.level;
  renderHUD(true); renderSkills(); renderBag(); renderTeam();
  showScreen('battleScreen'); FXE.clear();
  AUDIO.playSong(isBoss ? 'boss' : 'battle'); AUDIO.ambient(null);
  // 入場動畫
  ['L', 'R'].forEach(s => { const el = $('bF' + s); el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); });
  log(`對戰開始：${p.name} 對上 ${e.name}`);
  if (isBoss) log(`BOSS 戰：敵方全能力額外 +${battle.difficulty.bossStages}，倒下後會復活 ${(battle.opts.revives ?? battle.difficulty.revives ?? GAME_SETTINGS.bossRevives)} 次。`);
  battle.isBusy = true; renderSkills();
  banner(isBoss ? 'BOSS 戰' : '對戰開始', isBoss ? 'boss' : '');
  setTimeout(() => { if (battle && !battle.gameOver) beginTurn(); }, 1100);
}

/* ---------- 陣容與換人 ---------- */
function renderTeam() {
  const b = battle, root = $('bTeam'); if (!b || !root) return;
  root.classList.toggle('hidden', b.team.length < 2); $('battleScreen').classList.toggle('must-switch', !!b.mustSwitch);
  root.innerHTML = b.team.map((f, i) => `<button class="tm ${i === b.pi ? 'on' : ''} ${f.hp <= 0 ? 'ko' : ''}" data-i="${i}" title="${f.name}・LV ${f.level}${f.hp <= 0 ? '（倒下）' : ''}"><img src="${f.avatar}" alt=""><em>LV ${f.level}</em><i style="width:${Math.max(0, f.hp / f.maxHp * 100)}%"></i></button>`).join('');
  root.querySelectorAll('.tm').forEach(t => t.onclick = () => requestSwitch(+t.dataset.i));
}
function doSwitch(i) {
  const b = battle, f = b.team[i]; b.pi = i; b.player = f;
  $('bImgL').src = f.image; $('bAvL').src = f.avatar; $('bNameL').textContent = f.name; $('bTitleL').textContent = f.title; $('bLvL').textContent = 'LV ' + f.level;
  $('bTypesL').innerHTML = f.types.map(t => `<span class="type" style="--t:${TYPE_COLORS[t] || '#888'}">${t}</span>`).join('');
  const el = $('bFL'); el.style.setProperty('--sc', f.scale || .9); el.classList.remove('down', 'hit', 'enter'); void el.offsetWidth; el.classList.add('enter');
  log(`${f.name} 上場了！`, 'me'); banner(f.name + ' 出戰', 'me'); SFX.play('whoosh');
  renderHUD(true); renderSkills(); renderTeam();
}
function requestSwitch(i) {
  const b = battle; if (!b || b.gameOver) return; const f = b.team[i];
  if (i === b.pi || !f || f.hp <= 0) return;
  if (b.mustSwitch) { b.mustSwitch = false; doSwitch(i); b.round++; setTimeout(() => { if (battle && !battle.gameOver) beginTurn(); }, 700); return; }
  if (b.isBusy) return;
  b.isBusy = true; clearInterval(b.timerHandle); closeDrawers(); renderSkills();
  track('switches');
  resolveRound({ kind: 'switch', to: i }, pickEnemySkill());
}

/* ---------- 介面繪製 ---------- */
function renderHUD(instant) {
  if (!battle) return;
  ['L', 'R'].forEach(s => {
    const c = s === 'L' ? battle.player : battle.enemy, pct = Math.max(0, c.hp / c.maxHp * 100);
    const fill = $('bHp' + s), ghost = $('bHpG' + s);
    fill.style.width = pct + '%'; fill.dataset.low = pct < 25 ? '2' : pct < 50 ? '1' : '0';
    if (instant) { ghost.style.transition = 'none'; ghost.style.width = pct + '%'; void ghost.offsetWidth; ghost.style.transition = ''; }
    else if (parseFloat(ghost.style.width || '100') < pct) ghost.style.width = pct + '%';
    else setTimeout(() => { ghost.style.width = pct + '%'; }, 380);
    $('bHpT' + s).innerHTML = `<b>${Math.max(0, Math.round(c.hp))}</b> / ${c.maxHp}`;
    const sh = c.status.shield > 0; $('bShield' + s).style.width = sh ? Math.min(100, c.status.shield / c.maxHp * 100) + '%' : '0';
    $('bStat' + s).innerHTML = statusChips(c);
  });
}
function statusChips(c) {
  const a = [], st = c.status, b = c.buffs;
  const chip = (t, k, tip) => a.push(`<span class="chip ${k}"${tip ? ` title="${tip}"` : ''}>${t}</span>`);
  [['atk', '攻', '傷害', 10], ['def', '防', '防禦', 10], ['spd', '速', '速度', 5]].forEach(([k, n, full, p]) => { if (b[k]) chip(`${n}${b[k] > 0 ? '+' : ''}${b[k]}`, b[k] > 0 ? 'up' : 'down', `${full} ${b[k] > 0 ? '+' : ''}${b[k] * p}%`); });
  Object.keys(ABN).forEach(k => { if (st[k] > 0) chip(`${ABN[k].icon}${ABN[k].name} ${st[k]}`, 'bad', ABN[k].desc); });
  if (st.dots.length) chip(st.dots.map(d => d.label).join('・'), 'bad', '持續傷害');
  if (st.attackFail > 0) chip('失效 ' + st.attackFail, 'bad', '攻擊有機率失效');
  if (st.skillNullify > 0) chip('效果無效 ' + st.skillNullify, 'bad');
  if (st.buffBlock > 0) chip('強化封鎖 ' + st.buffBlock, 'bad');
  if (st.damageDealtReductionTurns > 0 && st.damageDealtReductionValue > 0) chip('輸出 -' + Math.round(st.damageDealtReductionValue * 100) + '%', 'bad');
  if (st.shield > 0) chip('護盾 ' + Math.round(st.shield), 'good');
  if (st.immunePermanent) chip('永久免疫', 'good'); else if (st.immune > 0) chip('免疫異常 ' + st.immune, 'good');
  if (st.regen > 0) chip('回復 ' + st.regen, 'good');
  if (st.fullRestoreTurns > 0) chip('回滿 ' + st.fullRestoreTurns, 'good');
  if (st.reflect > 0) chip('反彈 ×' + (st.reflectMultiplier || 1), 'good');
  if (st.dodge > 0) chip('閃避', 'good');
  if (st.priority > 0) chip('先制', 'good');
  if (st.damageMultTurns > 0 && st.damageMultValue > 1) chip('傷害 ×' + st.damageMultValue, 'up');
  if (st.executeBuffTurns > 0 && st.executeBuffChance > 0) chip('秒殺 ' + Math.round(st.executeBuffChance * 100) + '%', 'up');
  if (st.damageReductionTurns > 0 && st.damageReductionValue > 0) chip('減傷 ' + Math.round(st.damageReductionValue * 100) + '%', 'good');
  if (st.nextAttackMultTurns > 0 && st.nextAttackMultValue > 1) chip('下擊 ×' + st.nextAttackMultValue, 'up');
  if (st.spdMulTurns > 0 && st.spdMul > 1) chip('速度 ×' + st.spdMul, 'up');
  if (st.hitDouble > 0) chip('次數×2 ' + st.hitDouble, 'up', '技能攻擊次數加倍');
  if (st.revive > 0) chip('不死鳥', 'good');
  return a.join('');
}
function renderSkills() {
  if (!battle) return;
  const root = $('bSkills'); const p = battle.player;
  const none = p.skills.every(s => s.pp <= 0);
  root.innerHTML = p.skills.map((s, i) => {
    if (s.locked) return `<div class="skill locked"><span class="sk-top"><kbd>${i + 1}</kbd><span class="sk-kind">未解鎖</span></span><span class="sk-name">${s.name}</span><span class="sk-desc">LV ${s.locked} 解鎖</span></div>`;
    const pct = Math.min(100, s.pp / Math.max(1, s.maxPP) * 100);
    const dis = battle.isBusy || s.pp <= 0 || battle.gameOver || battle.mustSwitch;
    const tags = (s.tags || []).map(t => `<span class="tag ${t[1]}">${t[0]}</span>`).join('');
    const kind = s.ultimate ? '奧義' : s.type === 'attack' ? '攻擊' : '輔助';
    return `<button class="skill ${s.ultimate ? 'ult' : s.type}" data-i="${i}" ${dis ? 'disabled' : ''} title="${esc(s.desc)}">
      <span class="sk-top"><kbd>${i + 1}</kbd><span class="sk-kind">${kind}</span><span class="sk-pow">${s.power ? '威力 ' + s.power : ''}</span></span>
      <span class="sk-name">${s.name}</span>
      <span class="sk-desc">${s.desc}</span>
      <span class="sk-tags">${tags}</span>
      <span class="sk-pp"><i style="width:${pct}%"></i><em>${s.pp}/${s.maxPP}</em></span>
    </button>`;
  }).join('');
  if (none && !battle.gameOver) root.insertAdjacentHTML('beforeend', `<button class="skill struggle" data-i="-1" ${battle.isBusy ? 'disabled' : ''}><span class="sk-top"><kbd>!</kbd><span class="sk-kind">絕境</span></span><span class="sk-name">${STRUGGLE.name}</span><span class="sk-desc">${STRUGGLE.desc}</span></button>`);
  root.querySelectorAll('button.skill').forEach(b => b.onclick = () => selectSkill(+b.dataset.i));
  const left = GAME_SETTINGS.itemsPerBattle - battle.itemsUsed;
  $('bItemBtn').disabled = battle.isBusy || battle.gameOver || battle.mustSwitch || left <= 0;
  $('bItemCount').textContent = `${left}/${GAME_SETTINGS.itemsPerBattle}`;
}
function renderBag() {
  const inv = SAVE.data.inventory; const ids = Object.keys(ITEMS).filter(id => inv[id] > 0 && !ITEMS[id].effect.exp);
  const left = battle ? GAME_SETTINGS.itemsPerBattle - battle.itemsUsed : 0;
  $('bBagList').innerHTML = ids.length ? ids.map(id => { const it = ITEMS[id]; return `<button class="bagItem r-${it.rarity}" data-id="${id}" ${left <= 0 ? 'disabled' : ''}>${itemIcon(it)}<span class="bi-name">${it.name}<small>${it.desc}</small></span><b>×${inv[id]}</b></button>`; }).join('')
    : `<div class="bagEmpty">背包是空的。完成劇情任務拿到寶藏幣，就能到扭蛋機抽道具。</div>`;
  $('bBagList').querySelectorAll('.bagItem').forEach(b => b.onclick = () => useItem(b.dataset.id));
  $('bBagNote').textContent = `本場還能使用 ${left} 次道具，使用道具會佔用本回合行動。`;
}
function closeDrawers() { $('bBag').classList.remove('show'); $('bLog').classList.remove('show'); }

/* ---------- 回合流程 ---------- */
function beginTurn() {
  if (!battle || battle.gameOver) return;
  battle.isBusy = false; renderSkills(); renderHUD();
  $('bRound').textContent = battle.round;
  battle.timer = GAME_SETTINGS.turnSeconds; setTimer();
  clearInterval(battle.timerHandle);
  battle.timerHandle = setInterval(() => {
    if (!battle || battle.isBusy) return;
    battle.timer--; setTimer();
    if (battle.timer <= 0) { clearInterval(battle.timerHandle); const idx = battle.player.skills.findIndex(s => s.pp > 0); log('時間到，自動使用第一個可用技能。'); selectSkill(idx, true); }
  }, 1000);
}
function setTimer() {
  const t = battle.timer, max = GAME_SETTINGS.turnSeconds; $('bTimer').textContent = t;
  $('bRing').style.strokeDashoffset = (1 - t / max) * 163.4; $('bTimerWrap').classList.toggle('hurry', t <= 5);
}
function selectSkill(idx, auto) {
  if (!battle || battle.isBusy || battle.gameOver) return;
  const s = idx === -1 ? STRUGGLE : battle.player.skills[idx]; if (!s || s.pp <= 0) return;
  battle.isBusy = true; clearInterval(battle.timerHandle); closeDrawers(); renderSkills();
  resolveRound({ kind: 'skill', idx }, pickEnemySkill());
}
function useItem(id) {
  if (!battle || battle.isBusy || battle.gameOver) return;
  if (!(SAVE.data.inventory[id] > 0) || battle.itemsUsed >= GAME_SETTINGS.itemsPerBattle) return;
  battle.isBusy = true; clearInterval(battle.timerHandle); closeDrawers();
  SAVE.data.inventory[id]--; SAVE.save(); battle.itemsUsed++; renderSkills(); renderBag();
  resolveRound({ kind: 'item', id }, pickEnemySkill());
}
async function resolveRound(pAct, eIdx) {
  let order;
  if (pAct.kind === 'item' || pAct.kind === 'switch') order = [['P', pAct], ['E', eIdx]];
  else { const pf = effectiveSpeed(battle.player) >= effectiveSpeed(battle.enemy); order = pf ? [['P', pAct.idx], ['E', eIdx]] : [['E', eIdx], ['P', pAct.idx]]; }
  for (let i = 0; i < 2; i++) {
    const [side, a] = order[i];
    if (side === 'P' && typeof a === 'object') { if (a.kind === 'switch') { doSwitch(a.to); await wait(650); } else await applyItem(a.id); } else await executeAction(side, a);
    if (checkBattleEnd()) return;
    await wait(220);
  }
  endTurnStatus(battle.player); endTurnStatus(battle.enemy); renderHUD();
  if (checkBattleEnd()) return;
  battle.round++; beginTurn();
}
async function applyItem(id) {
  const it = ITEMS[id], p = battle.player, ef = it.effect;
  track('items'); log(`${p.name} 使用了「${it.name}」`); banner(it.name, 'item'); SFX.play('buff');
  const fw = $('bFL'); fw.classList.add('cast'); spawnSupport('L', true); await wait(420); fw.classList.remove('cast');
  if (ef.healRatio) { const heal = Math.min(p.maxHp - p.hp, Math.round(p.maxHp * ef.healRatio)); p.hp += heal; if (heal > 0) showHeal('L', heal); }
  if (ef.cleanse) { clearAbnormal(p); clearNegativeStages(p); log('異常狀態與負面能力全部清除。'); }
  if (ef.ppAll) { p.skills.forEach(s => { if (!(s.effect && s.effect.noRestore) && !s.locked) s.pp += ef.ppAll; }); log(`所有技能使用次數 +${ef.ppAll}`); }
  if (ef.ppUlt) { p.skills.forEach(s => { if (s.ultimate && !(s.effect && s.effect.noRestore) && !s.locked) s.pp += ef.ppUlt; }); }
  if (ef.atkUp) { p.buffs.atk = clamp(p.buffs.atk + ef.atkUp, -6, 6); log(`攻擊能力 +${ef.atkUp}`); }
  if (ef.shieldRatio) { const sh = Math.round(p.maxHp * ef.shieldRatio); p.status.shield += sh; log(`獲得 ${sh} 點護盾`); }
  if (ef.revive) { p.status.revive = ef.revive; log('不死鳥之羽守護著你。'); }
  renderHUD(); renderSkills(); await wait(520);
}
async function executeAction(side, idx) {
  const actor = side === 'P' ? battle.player : battle.enemy, target = side === 'P' ? battle.enemy : battle.player;
  const skill = idx === -1 ? STRUGGLE : actor.skills[idx]; if (actor.hp <= 0 || !skill || skill.pp <= 0) return;
  const S = side === 'P' ? 'L' : 'R', T = side === 'P' ? 'R' : 'L', wrap = $('bF' + S);
  const unstoppable = !!(skill.effect && skill.effect.unstoppable);
  const cc = !unstoppable && CC_KEYS.find(k => actor.status[k] > 0);
  if (cc) { actor.status[cc]--; log(`${actor.name} 陷入${ABN[cc].name}，這回合無法使用技能`); floatText(S, ABN[cc].name, 'status'); await wait(650); return; }
  if (!unstoppable && actor.status.skipAttack > 0) { actor.status.skipAttack--; log(`${actor.name} 本回合無法攻擊`); floatText(S, '封鎖', 'status'); await wait(600); return; }
  if (!unstoppable && actor.status.attackFail > 0 && chance(actor.status.attackFailChance)) { actor.status.attackFail--; log(`${actor.name} 的攻擊失效了`); floatText(S, '失效', 'status'); await wait(600); return; }
  if (actor.status.attackFail > 0) actor.status.attackFail--;
  if (side === 'P') { track('skills'); if (skill.ultimate) track('ults'); }
  if (skill !== STRUGGLE) skill.pp--; actor.status.lastSkill = skill.name; renderSkills(); renderHUD();
  log(`${actor.name} 使用「${skill.name}」`, side === 'P' ? 'me' : 'foe');
  if (skill.ultimate) { SFX.play('ult'); await cutIn(actor, skill, side); }
  else banner(skill.name, side === 'P' ? 'me' : 'foe');
  wrap.classList.add('cast');
  await playChoreo(side, actor, idx, skill);
  wrap.classList.remove('cast');
  if (Math.random() * 100 > skill.accuracy) { log(`${actor.name} 的招式落空`); floatText(T, 'MISS', 'miss'); await wait(420); return; }
  const blocked = actor.status.skillNullify > 0; if (blocked) log(`${actor.name} 的附加效果被封印，只保留傷害`);
  if (target.status.dodge > 0 && skill.type === 'attack') { target.status.dodge--; log(`${target.name} 閃避了攻擊`); floatText(T, '閃避', 'miss'); renderHUD(); await wait(600); return; }
  const reflected = target.status.reflect > 0 && skill.type === 'attack';
  const result = computeSkillOutcome(actor, target, skill, blocked);
  if (reflected) {
    const mult = target.status.reflectMultiplier || 1; target.status.reflect = 0;
    log(`${target.name} 把傷害 ${mult} 倍反彈回去`); floatText(T, '反彈', 'status');
    applyDamage(actor, Math.max(1, Math.round(result.damage * mult)), S);
    if (target.status.reflectNegative && !blocked) applyReflectedNegativeEffects(skill, target, actor);
    target.status.reflectMultiplier = 1; target.status.reflectNegative = false;
    triggerImpact(S, 'gold'); renderHUD(); renderSkills(); await wait(700); return;
  }
  if (result.damage > 0) applyDamage(target, result.damage, T, result.meta);
  if (!blocked) applySkillEffects(actor, target, skill, result);
  if (result.damage > 0) triggerImpact(T, BATTLE_ANIM[skill.anima] || 'red', result.damage > target.maxHp * .25);
  renderHUD(); renderSkills(); await wait(640);
}
function checkBattleEnd() {
  const b = battle;
  if (b.enemy.hp <= 0 && b.isBoss && b.bossRevivesUsed < (battle.opts.revives ?? battle.difficulty.revives ?? GAME_SETTINGS.bossRevives)) {
    b.bossRevivesUsed++; b.enemy.hp = b.enemy.maxHp; const st = b.enemy.status; st.freeze = 0; st.petrify = 0; st.skipAttack = 0; st.attackFail = 0; st.dots = []; st.skillNullify = 0;
    log(`${b.enemy.name} 再次站了起來，體力全滿`); banner('BOSS 復活', 'boss'); spawnSupport('R', false); renderHUD(true); return false;
  }
  if (b.player.hp <= 0 && b.player.status.revive > 0) {
    const r = b.player.status.revive; b.player.status.revive = 0; b.player.hp = Math.round(b.player.maxHp * r);
    log('不死鳥之羽燃燒，你以一半體力復活了！'); banner('不死鳥復活', 'item'); spawnSupport('L', true); renderHUD(); return false;
  }
  if (b.player.hp <= 0 && b.enemy.hp > 0 && b.team.some(f => f.hp > 0)) {
    b.player.hp = 0; $('bFL').classList.add('down'); log(`${b.player.name} 倒下了！`, 'foe');
    b.mustSwitch = true; b.isBusy = false; clearInterval(b.timerHandle); banner('選擇下一位船員', 'foe'); renderHUD(); renderSkills(); renderTeam(); return true;
  }
  if (b.player.hp <= 0 || b.enemy.hp <= 0) { finishBattle(b.player.hp > 0); return true; }
  return false;
}
function finishBattle(win, fled) {
  const b = battle; b.gameOver = true; b.isBusy = false; clearInterval(b.timerHandle); renderSkills();
  const loser = win ? 'R' : 'L'; if (!fled) $('bF' + loser).classList.add('down');
  if (!fled) AUDIO.jingle(win ? 'victory' : 'defeat'); else AUDIO.stopSong();
  setTimeout(() => {
    const res = b.onEnd ? b.onEnd({ win, fled, enemyId: b.enemy.id, isBoss: b.isBoss, rounds: b.round, team: b.team.map(f => ({ id: f.id, hp: f.hp })) }) : {};
    $('bResTitle').textContent = fled ? '撤退' : win ? '勝利' : '戰敗';
    $('bResult').className = 'b-result show ' + (fled ? 'fled' : win ? 'win' : 'lose');
    $('bResImg').src = win ? b.player.image : b.enemy.image;
    const lines = [];
    if (fled) lines.push('你離開了戰場，敵人還在原地等你。');
    else if (win) { lines.push(`${b.enemy.name} 被擊敗了，共 ${b.round} 回合。`); if (res && res.message) lines.push(res.message); }
    else lines.push(`${b.enemy.name} 還站著。補充道具、換個打法再來。`);
    $('bResDesc').innerHTML = lines.map(l => `<p>${l}</p>`).join('');
    $('bRetry').style.display = win || (res && res.next) ? 'none' : '';
    b.nextFn = res && res.next ? res.next.fn : null; $('bBack').textContent = res && res.next ? res.next.label : '回到島上';
  }, fled ? 0 : 900);
}

/* ---------- 視覺效果 ---------- */
function log(t, who) {
  const li = document.createElement('li'); li.textContent = t; if (who) li.className = who;
  const list = $('bLogList'); list.prepend(li); while (list.children.length > 40) list.lastChild.remove();
  const tk = $('bTicker'); tk.textContent = t; tk.classList.remove('pop'); void tk.offsetWidth; tk.classList.add('pop');
}
function wait(ms) { return new Promise(r => setTimeout(r, ms / (window.BSPEED || 1))); }
function showFx(text) { floatText(null, text, 'status'); }
function banner(text, kind) { const el = $('bBanner'); el.textContent = text; el.className = 'b-banner ' + (kind || ''); void el.offsetWidth; el.classList.add('show'); }
function fighterPoint(side) {
  // 以版面位置計算（忽略進場、突進等位移動畫），確保特效打在角色身上
  const f = $('bF' + side), img = $('bImg' + side), ar = $('bArena');
  const sc = parseFloat(getComputedStyle(f).getPropertyValue('--sc')) || 1;
  const h = img.offsetHeight * sc;
  return { x: f.offsetLeft + img.offsetLeft + img.offsetWidth / 2, y: f.offsetTop + img.offsetTop + img.offsetHeight - h * .5, w: ar.clientWidth, h: ar.clientHeight };
}
function floatText(side, text, kind) {
  const layer = $('bDmg'); const el = document.createElement('div'); el.className = 'dmg ' + kind; el.textContent = text;
  const p = side ? fighterPoint(side) : { x: $('bArena').clientWidth / 2, y: $('bArena').clientHeight * .4 };
  el.style.left = (p.x + rand(-26, 26)) + 'px'; el.style.top = (p.y - 40 + rand(-16, 10)) + 'px'; layer.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}
function showDamage(side, amount) { const big = amount > (side === 'L' ? battle.player.maxHp : battle.enemy.maxHp) * .25; floatText(side, '-' + Math.round(amount), 'hit' + (big ? ' big' : '')); }
let _healT = 0;
function showHeal(side, amount) { floatText(side, '+' + Math.round(amount), 'heal'); if (performance.now() - _healT > 400) { _healT = performance.now(); SFX.play('heal'); } }
function shake() { const a = $('battleScreen'); a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake'); }
function triggerImpact(side, theme, big) { SFX.play(big ? 'heavy' : 'hit'); const w = $('bF' + side); w.classList.remove('hit'); void w.offsetWidth; w.classList.add('hit'); setTimeout(() => w.classList.remove('hit'), 520); hitFX(side, theme, big); }
function spawnImpact(side, theme) { const p = fighterPoint(side); place('impactFx ' + (theme === 'blue' ? 'blue' : theme === 'gold' ? 'gold' : ''), p.x - 80, p.y - 80); if (theme === 'blue') place('iceBurst', p.x - 90, p.y - 90); }
function spawnSupport(side, blue) { const p = fighterPoint(side); place('supportFx ' + (blue ? 'blue' : ''), p.x - 85, p.y - 85); }
function place(cls, x, y, w, h, vars, life) { const el = document.createElement('div'); el.className = cls; el.style.left = x + 'px'; el.style.top = y + 'px'; if (w) el.style.width = w + 'px'; if (h) el.style.height = h + 'px'; if (vars) for (const k in vars) el.style.setProperty(k, vars[k]); $('bFx').appendChild(el); setTimeout(() => el.remove(), life || 1000); return el; }
function spawnPetals(cx, cy, n) { for (let i = 0; i < n; i++) setTimeout(() => place('petalFx', cx, cy, 0, 0, { '--px': rand(-180, 180) + 'px', '--py': rand(-130, 130) + 'px' }, 1400), i * 18); }
function spawnShockRings(x, y, n) { for (let i = 0; i < n; i++) setTimeout(() => place('shockRingFx', x - 75, y - 75, 0, 0, null, 1100), i * 110); }
function spawnBlackHole(x, y, n) { for (let i = 0; i < n; i++) setTimeout(() => place('blackHoleFx', x - 115 + i * 18, y - 115 + i * 8, 0, 0, null, 950), i * 90); }
function spawnSeaWave(fx, tx, y) { place('seaWaveFx', fx - 110, y - 45, 0, 0, { '--wx': (tx - fx) + 'px' }, 1100); }
function spawnSeaKing(fx, tx, y) { place('seaKingFx', fx - 130, y - 65, 0, 0, { '--kx': (tx - fx) + 'px' }, 1150); }
function spawnWingFx(x, y) { place('wingFx', x - 90, y - 60); }
function spawnHandBurst(x, y) { place('handBurstFx', x - 100, y - 75, 0, 0, null, 820); }
function spawnDemonAura(x, y) { place('demonAuraFx', x - 125, y - 125, 0, 0, null, 1250); }
function spawnSparks(x, y, n) { for (let i = 0; i < n; i++) place('sparkParticle', x, y, 0, 0, { '--sx': rand(-150, 150) + 'px', '--sy': rand(-120, 120) + 'px' }, 900); }
function spawnLightning(x, y) { place('lightningFx', x - 80, y - 80, 0, 0, null, 500); }
function playSkillAnimation(side, skill) {
  const from = fighterPoint(side === 'P' ? 'L' : 'R'), to = fighterPoint(side === 'P' ? 'R' : 'L');
  const fromX = from.x, toX = to.x, y = (from.y + to.y) / 2;
  const punch = () => place('punchFx', fromX - 45, y - 45, 0, 0, { '--tx': (toX - fromX) + 'px', '--ty': '0px' }, 900);
  const barrage = () => { for (let i = 0; i < 5; i++) setTimeout(() => place('punchFx', fromX - 45, y - 45 + (i - 2) * 10, 0, 0, { '--tx': (toX - fromX) + 'px', '--ty': '0px' }, 900), i * 80); };
  const beam = () => { const el = place('beamFx', Math.min(fromX, toX), y - 8, 0, 0, { '--w': Math.abs(toX - fromX) + 'px' }, 900); if (toX < fromX) el.style.transform = 'scaleX(-1)'; spawnLightning(toX, y); };
  const slash = () => place('slashFx', Math.min(fromX, toX), y - 8, 0, 0, { '--tx': Math.abs(toX - fromX) + 'px' }, 900);
  const sand = () => place('sandFx', toX - 90, y - 90);
  const dark = () => place('darkFx', toX - 90, y - 90);
  const quake = () => { place('quakeFx', toX - 100, y + 20); dark(); };
  const support = (blue) => place('supportFx ' + (blue ? 'blue' : ''), fromX - 85, y - 85);
  switch (skill.anima) {
    case 'punch': case 'snake': punch(); break; case 'barrage': barrage(); break; case 'beam': beam(); break;
    case 'hammer': slash(); spawnLightning(toX, y); break;
    case 'world': for (let i = 0; i < 10; i++) setTimeout(() => { slash(); spawnLightning(toX + (i % 2 ? 18 : -18), y + ((i % 5) - 2) * 9); }, i * 62); break;
    case 'thunderfive': for (let i = 0; i < 5; i++) setTimeout(() => { slash(); spawnLightning(toX, y + (i - 2) * 10); }, i * 90); break;
    case 'heal': support(false); break; case 'awaken': support(true); spawnSparks(fromX, y, 20); break;
    case 'lightning': spawnLightning(toX, y); spawnLightning(toX - 40, y + 20); spawnLightning(toX + 20, y - 10); break;
    case 'flash': beam(); support(true); break; case 'judgment': spawnLightning(toX, y - 40); spawnLightning(toX - 20, y + 10); support(true); break;
    case 'sandslash': slash(); sand(); break; case 'sandtrap': sand(); support(false); break;
    case 'sandtriple': for (let i = 0; i < 3; i++) setTimeout(() => { slash(); sand(); }, i * 100); break;
    case 'sandstorm': sand(); sand(); place('sandFx', toX - 120, y - 110, 220, 220); break;
    case 'dry': dark(); sand(); break; case 'darkpull': dark(); spawnBlackHole(toX, y, 3); spawnSparks(toX, y, 18); break;
    case 'quake': quake(); spawnShockRings(toX, y, 4); spawnSparks(toX, y, 26); break;
    case 'darkcopy': dark(); spawnBlackHole(fromX, y, 2); support(true); break;
    case 'release': dark(); quake(); spawnShockRings(toX, y, 5); spawnSparks(toX, y, 30); break;
    case 'poseidon': spawnSeaWave(fromX, toX, y); spawnSeaKing(fromX, toX, y); spawnSparks(toX, y, 28); break;
    case 'voice': spawnSeaWave(fromX, fromX, y); support(true); spawnShockRings(fromX, y, 2); break;
    case 'summonsea': spawnSeaKing(fromX, toX, y); support(true); break;
    case 'seaking': spawnSeaWave(fromX, toX, y); spawnSeaKing(fromX, toX, y); setTimeout(() => spawnSeaKing(fromX, toX, y - 40), 120); spawnShockRings(toX, y, 5); break;
    case 'limbs': for (let i = 0; i < 8; i++) setTimeout(() => spawnHandBurst(toX + rand(-60, 60), y + rand(-45, 45)), i * 55); spawnPetals(toX, y, 22); break;
    case 'wings': spawnWingFx(fromX, y); support(true); break; case 'petals': spawnPetals(fromX, y, 36); support(true); break;
    case 'demonflower': spawnDemonAura(toX, y); spawnPetals(toX, y, 48); spawnHandBurst(toX, y); spawnShockRings(toX, y, 4); break;
    case 'gigante': spawnDemonAura(fromX, y); spawnWingFx(fromX, y); spawnPetals(fromX, y, 40); support(true); break;
    case 'transform': support(true); spawnLightning(fromX, y); break;
    default: punch();
  }
}
function cutIn(actor, skill, side) {
  return new Promise(res => {
    const el = $('bCutin'); $('bCutImg').src = actor.image; $('bCutName').textContent = skill.name; $('bCutWho').textContent = actor.name;
    el.className = 'b-cutin ' + (side === 'P' ? 'me' : 'foe'); void el.offsetWidth; el.classList.add('show');
    setTimeout(() => { el.classList.remove('show'); res(); }, 1250);
  });
}

function bindBattle() {
  $('bItemBtn').onclick = () => { if (!battle || battle.isBusy) return; renderBag(); $('bLog').classList.remove('show'); $('bBag').classList.toggle('show'); };
  $('bLogBtn').onclick = () => { $('bBag').classList.remove('show'); $('bLog').classList.toggle('show'); };
  document.querySelectorAll('[data-close-drawer]').forEach(b => b.onclick = closeDrawers);
  $('bFleeBtn').onclick = () => { if (!battle || battle.gameOver) return; if (battle.isBusy && !battle.mustSwitch) return; confirmBox('要撤退嗎？', '撤退後這場戰鬥不算勝負，敵人會留在原地。', '撤退', () => finishBattle(false, true)); };
  $('bRetry').onclick = () => { const o = battle.opts; $('bFL').classList.remove('down'); $('bFR').classList.remove('down'); startBattle(o); };
  $('bBack').onclick = () => { if (!battle) return; if (battle.nextFn) { const f = battle.nextFn; battle.nextFn = null; f(); return; } if (battle.opts.onLeave) battle.opts.onLeave(); };
  window.addEventListener('keydown', e => {
    if ($('battleScreen').classList.contains('hidden') || !battle) return;
    if (/^[1-5]$/.test(e.key)) selectSkill(+e.key - 1);
    if (e.key.toLowerCase() === 'i') $('bItemBtn').click();
    if (e.key.toLowerCase() === 'l') $('bLogBtn').click();
    if (e.key === 'Escape') closeDrawers();
  });
}
