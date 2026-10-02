/* v63 戰鬥擴充：暈眩、護盾無效、真實傷害、霸王色、老爹光環、神避、冰河時期等新效果。
   以包裝原本函式的方式加入，原本角色的技能完全不受影響。載入順序：battle.js 之後。 */
(function () {
  /* 新篇章難度 */
  Object.assign(CHAPTER_DIFFICULTY, {
    thriller: { order: 4, label: '困難', stars: 3, hp: 1.52, atk: 2, def: 1, spd: 1, bossHp: 1.45, bossStages: 2, ai: 1.16, revives: 1, bossLvUp: 16 },
    dressrosa: { order: 6, label: '極難', stars: 3, hp: 1.65, atk: 2, def: 2, spd: 1, bossHp: 1.52, bossStages: 2, ai: 1.22, revives: 2, bossLvUp: 19 },
    emperor: { order: 9, label: '皇帝', stars: 5, hp: 1, atk: 0, def: 0, spd: 0, bossHp: 1, bossStages: 0, ai: 1.35, revives: 0, bossLvUp: 0 },
    pvp: { order: 1, label: '對戰', stars: 0, hp: 1, atk: 0, def: 0, spd: 0, bossHp: 1, bossStages: 0, ai: 1.3, revives: 0, bossLvUp: 0 },
    egghead: { order: 9, label: '地獄', stars: 4, hp: 1.9, atk: 3, def: 2, spd: 2, bossHp: 1.62, bossStages: 2, ai: 1.32, revives: 2, bossLvUp: 23 }
  });
  ABN.stun = { name: '暈眩', icon: '💫', desc: '無法使用技能' }; if (!CC_KEYS.includes('stun')) CC_KEYS.push('stun');
  VOID_PCT_KEYS.push('selfLostHpDamage');
  const RANK = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4, 'UR+': 5 };
  const rarOf = f => (typeof CHAR_RARITY !== 'undefined' && CHAR_RARITY[f.id]) || 'SSR';
  const sideOf = f => (battle && f === battle.enemy) ? 'R' : 'L';
  const isBossTarget = t => battle && battle.isBoss && t === battle.enemy && !t.voidImmune;
  const binom = (n, p) => { let k = 0; for (let i = 0; i < n; i++) if (Math.random() < p) k++; return k; };

  /* ---------- 傷害計算 ---------- */
  const _cso = computeSkillOutcome;
  computeSkillOutcome = function (actor, target, skill, blocked) {
    if (!skill || skill.__ext) return _cso(actor, target, skill, blocked);
    const ef = skill.effect || {};
    /* 霸王色：控場為主，弱者直接倒下 */
    if (ef.haoshoku) {
      if (target.voidImmune) return { damage: 0, meta: { haoshoku: true } };
      const weak = RANK[rarOf(target)] <= 1 || (target.level || 100) <= 80;
      if (weak) {
        if (isBossTarget(target)) { const d = calcAttackDamage(actor, target, { type: 'attack', power: 100, effect: { forceMultiplier: 3 } }); log(`👑 ${target.name} 撐住了霸王色，改為受到 3 倍傷害！`); return { damage: d, meta: { haoshoku: true, bossExec: true } }; }
        log(`👑 霸王色的威壓讓 ${target.name} 當場失去意識！`); return { damage: target.hp, meta: { haoshoku: true, execute: true, ignoreShield: true } };
      }
      return { damage: 0, meta: { haoshoku: true } };
    }
    /* 痛苦泡泡：依自身已損失體力造成傷害 */
    if (ef.selfLostHpDamage) {
      if (target.voidImmune) { log(`👑 ${target.name} 不受比例傷害影響！`); return { damage: 0, meta: {} }; }
      const [m, cap] = ef.selfLostHpDamage; let d = Math.max(1, Math.round((actor.maxHp - actor.hp) * m)); d = Math.min(d, Math.floor(target.maxHp * cap));
      if (isBossTarget(target)) d = Math.min(d, Math.floor(target.maxHp * (GAME_SETTINGS.bossPctCap ?? .15)));
      log(`💢 ${actor.name} 把承受過的痛苦打了回去！`); return { damage: d, meta: {} };
    }
    if (ef.shieldBreak && target.status.shield > 0 && !target.voidImmune) { log(`🌊 震動穿透！${target.name} 的護盾失效了！`); target.status.shield = 0; target.status.tempShield = 0; }
    const frozen = (target.status.freeze || 0) > 0, hpR = target.hp / target.maxHp, selfR = actor.hp / actor.maxHp;
    const r = _cso(actor, target, { ...skill, __ext: true }, blocked); r.meta = r.meta || {};
    if (r.damage > 0 && !r.meta.execute && !r.meta.executeBuff) {
      if (ef.hpAboveBonus && hpR > ef.hpAboveBonus[0]) { const [a, b] = ef.hpAboveBonus[1], m = Math.round((a + Math.random() * (b - a)) * 10) / 10; r.damage = Math.floor(r.damage * m); log(`💥 對手體力充沛，威力 ×${m}！`); }
      if (ef.frozenBonusMult && frozen) { const [a, b] = ef.frozenBonusMult, m = Math.round((a + Math.random() * (b - a)) * 10) / 10; r.damage = Math.floor(r.damage * m); log(`❄️ 對手已被冰凍，傷害 ×${m}！`); }
      if (ef.selfHpAboveExtra && selfR > ef.selfHpAboveExtra[0]) { const [, [a, b], pw] = ef.selfHpAboveExtra, n = a + Math.floor(Math.random() * (b - a + 1)); let x = 0; for (let i = 0; i < n; i++) x += calcAttackDamage(actor, target, { type: 'attack', power: pw }); r.damage += x; r.meta.hitCount = (r.meta.hitCount || 0) + n; log(`⚔️ 氣勢正盛，追加 ${n} 次斬擊！`); }
      if (ef.trueHitChance && target.status.shield > 0) { const n = r.meta.hitCount || 1, k = binom(n, ef.trueHitChance); if (k) { r.meta.trueDamage = Math.floor(r.damage * k / n); log(`🗡️ ${k} 次斬擊穿過了護盾！`); } }
      /* 老爹光環：首次攻擊 1～5 倍 */
      if (actor.__dad && actor.__dad.first && skill.type === 'attack') { actor.__dad.first = false; const m = Math.round((1 + Math.random() * 4) * 10) / 10; r.damage = Math.floor(r.damage * m); log(`🌊 老爹的意志！首次攻擊 ×${m}！`); }
      /* 神避之後的吸血 */
      if (actor.status.kamuLs > 0) { const ls = Math.floor(r.damage * (.05 + Math.random() * .1)); r.meta.lifesteal = (r.meta.lifesteal || 0) + ls; }
    }
    if (ef.kamusari && r.damage > 0) { const ls = Math.floor(Math.min(r.damage, target.hp + (target.status.shield || 0)) * (.05 + Math.random() * .1)); r.meta.lifesteal = (r.meta.lifesteal || 0) + ls; }
    return r;
  };

  /* ---------- 傷害套用：真實傷害、老爹光環的受傷加成與保命 ---------- */
  const _ad = applyDamage;
  applyDamage = function (target, amount, side, opts) {
    if (target.status && target.status.dadOwner) amount = Math.round(amount * 1.03);
    const tru = opts && opts.trueDamage > 0 && target.status.shield > 0 ? Math.min(amount, opts.trueDamage) : 0;
    if (tru) { _ad(target, tru, side, { ...opts, ignoreShield: true, trueDamage: 0 }); amount -= tru; }
    if (amount > 0) _ad(target, amount, side, opts);
    if (target.hp <= 0 && target.__dad && target.__dad.guts) { target.__dad.guts = false; target.hp = 1; log(`🌊 老爹守護著 ${target.name}！撐住了致命一擊，剩下 1 體力！`); if (typeof floatText === 'function') floatText(side, '撐住', 'status'); renderHUD(); }
  };

  /* ---------- 附加效果 ---------- */
  const _ase = applySkillEffects;
  applySkillEffects = function (actor, target, skill, result) {
    _ase(actor, target, skill, result);
    if (skill.__voidFx) return; const ef = skill.effect || {};
    if (ef.restoreAllPP) { actor.skills.forEach(s => { if (s !== skill && !s.locked) s.pp = s.maxPP; }); log(`🔄 ${actor.name} 的其他技能次數全部恢復！`); if (typeof renderSkills === 'function' && actor === battle.player) renderSkills(); }
    if (ef.immuneTurns && !ef.regenTurns) { actor.status.immune = Math.max(actor.status.immune || 0, ef.immuneTurns); log(`🛡️ ${actor.name} ${ef.immuneTurns} 回合內免疫異常狀態！`); }
    if (ef.stunChance && target.hp > 0 && Math.random() < ef.stunChance) inflict(target, 'stun', ef.stunTurns || 1);
    if (ef.haoshoku) haoshoku(actor, target);
    if (ef.dadAura) dadAura(actor);
    if (ef.kamusari) {
      actor.status.kamuLs = 2; log(`🩸 ${actor.name} 接下來 2 回合造成的傷害會轉為體力！`);
      if (target.hp > 0 && Math.random() < .3) { inflict(target, 'stun', 1); if (inflict(target, 'weak', 2)) { target.status.weakMin = 1.2; target.status.weakMax = 1.5; } inflict(target, 'fear', 1); }
      if (target.hp <= 0) { target.status.stun = Math.max(target.status.stun || 0, 1); battle.__nextFoeStun = sideOf(target); log('💫 神避的餘威：下一位出場的對手會暈眩 1 回合！'); }
    }
    if (ef.iceAge) { const [t, ratio] = ef.iceAge; battle.iceAge = { owner: actor, left: t, ratio }; actor.status.damageReductionTurns = Math.max(actor.status.damageReductionTurns || 0, t); actor.status.damageReductionValue = Math.max(actor.status.damageReductionValue || 0, .2); log(`🧊 冰河時期！整片戰場都結冰了！`); }
  };
  function revertForm(t) {
    let did = false; const st = t.status;
    if (st.formTurns > 0) { st.formTurns = 0; did = true; }
    if (st.phoenix > 0) { st.phoenix = 0; st.counterChance = 0; if (st.phoenixSpd) { t.buffs.spd = clamp(t.buffs.spd - st.phoenixSpd, -6, 6); st.phoenixSpd = 0; } did = true; }
    if (st.awaken) { st.awaken = ''; st.frostBoostTurns = 0; st.allyBoostPer = 0; st.allyAliveBoost = 0; st.damageMultTurns = 0; st.damageMultValue = 1; did = true; }
    if (did && t.baseImage) { t.image = t.baseImage; t.visMul = 1; t.mirror = false; if (typeof refreshFighterImage === 'function') refreshFighterImage(t); }
    return did;
  }
  function haoshoku(actor, target) {
    clearAbnormal(actor); clearNegativeStages(actor); log(`👑 ${actor.name} 的霸王色霸氣席捲戰場！自身負面狀態全部消除。`);
    if (target.voidImmune || target.hp <= 0) return;
    ['atk', 'def', 'spd'].forEach(k => { target.buffs[k] = clamp(target.buffs[k] - 2, -6, 6); }); log(`👑 ${target.name} 全能力 -2！`);
    if (revertForm(target)) log(`👑 ${target.name} 的變身被強制解除了！`);
    if (inflict(target, 'weak', 1, true)) { target.status.weakMin = 1.2; target.status.weakMax = 1.5; }
    if (RANK[rarOf(target)] <= 2) { target.status.skipAttack = Math.max(target.status.skipAttack || 0, 1); log(`👑 ${target.name} 被震懾得無法攻擊 1 回合！`); }
  }
  function grantDad(f) { if (!f || f.__dad || f.hp <= 0) return; f.__dad = { first: true, guts: true }; ['atk', 'def', 'spd'].forEach(k => { f.buffs[k] = clamp(f.buffs[k] + 1, -6, 6); }); log(`🌊 ${f.name} 感受到老爹的意志：全能力 +1！`); }
  window.grantDad = grantDad;
  function dadAura(actor) {
    actor.status.dadOwner = true; log(`🌊 「你們都是我的兒子！」白鬍子的意志籠罩全隊！`);
    if (actor === battle.enemy) grantDad(actor); else { battle.dadTeam = true; battle.team.forEach(f => { if (f === battle.player) grantDad(f); else if (f.hp > 0) f.__dadPending = true; }); }
  }

  /* ---------- 換人：光環與神避的暈眩 ---------- */
  const _sw = doSwitch;
  doSwitch = function (i) {
    _sw(i); const f = battle.player;
    if (f.__dadPending) { f.__dadPending = false; grantDad(f); }
    if (battle.__nextFoeStun === 'L') { battle.__nextFoeStun = null; inflict(f, 'stun', 1, true); }
    renderHUD();
  };

  /* ---------- 回合結束：老爹回復、神避吸血倒數、冰河時期 ---------- */
  const _ets = endTurnStatus;
  endTurnStatus = function (c) {
    _ets(c); if (!battle || !c) return;
    if (c.status.dadOwner && c.hp > 0 && healOk(c)) { const h = Math.max(1, Math.floor(c.maxHp * .05)); c.hp = Math.min(c.maxHp, c.hp + h); showHeal(sideOf(c), h); log(`🌊 ${c.name} 回復 ${h} 體力`); }
    if (c.status.kamuLs > 0) c.status.kamuLs--;
    const I = battle.iceAge;
    if (I) {
      if (I.owner.hp <= 0) { battle.iceAge = null; log('🧊 冰河融化了。'); return; }
      const ownerSide = battle.team.includes(I.owner) ? 'L' : 'R', side = sideOf(c);
      if (c === I.owner) { if (--I.left <= 0) { battle.iceAge = null; log('🧊 冰河時期結束，冰原開始融化。'); } }
      else if (side !== ownerSide && c.hp > 0 && !c.voidImmune) { let d = Math.max(1, Math.floor(c.maxHp * I.ratio)); c.hp = Math.max(0, c.hp - d); showDamage(side, d, '#9fe6ff'); log(`🧊 ${c.name} 被冰河凍傷，損失 ${d} 體力！`); if (c.hp > 0) inflict(c, 'freeze', 1); }
    }
  };

  /* ---------- 開戰：連戰時把「神避」的暈眩帶到下一場；支援帶入技能次數 ---------- */
  const _sb = startBattle;
  startBattle = function (opts) {
    _sb(opts);
    /* 玩家對戰：對手也套用稀有度體質，雙方條件相同 */ if (opts && opts.pvp) { applyRarityScale(battle.enemy); $('bLvR').textContent = 'LV ' + battle.enemy.level; renderHUD(true); }
    if (opts && opts.enemyMod) { const e = battle.enemy, M = opts.enemyMod; if (M.hp) { e.maxHp = Math.round(e.maxHp * M.hp); e.hp = e.maxHp; } if (M.dmg) e.dmgMul *= M.dmg; if (M.hpFixed) { e.maxHp = M.hpFixed; e.hp = e.maxHp; } if (M.infPP) e.skills.forEach(s => { if (s.locked) return; const n = s.ultimate && M.ultCap ? M.ultCap : 99; s.pp = s.maxPP = n; }); if (M.allUp) ['atk', 'def', 'spd'].forEach(k => { e.buffs[k] = clamp(e.buffs[k] + M.allUp, -6, 6); }); ['atk', 'def', 'spd'].forEach(k => { if (M[k]) e.buffs[k] = clamp(e.buffs[k] + M[k], -6, 6); }); if (M.name) e.name = M.name; if (M.title) e.title = M.title; if (M.lv) e.level = M.lv; $('bNameR').textContent = e.name; $('bTitleR').textContent = e.title; renderHUD(true); }
    if (opts && opts.team) opts.team.forEach((t, i) => { const f = battle.team[i]; if (f && Array.isArray(t.pp)) f.skills.forEach((s, k) => { if (t.pp[k] != null && !s.locked) s.pp = Math.max(0, Math.min(s.maxPP, t.pp[k])); }); });
    if (window.__carryStun) { window.__carryStun = false; inflict(battle.enemy, 'stun', 1, true); }
    renderSkills();
  };
  /* 戰鬥結束時把技能次數一起回報，讓連戰模式可以延續 */
  window.teamSnapshot = () => battle ? battle.team.map(f => ({ id: f.id, hp: f.hp, pp: f.skills.map(s => s.pp) })) : [];
})();
