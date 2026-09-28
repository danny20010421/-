/* 戰鬥規則核心：沿用原版的技能效果與傷害公式 */
function deepClone(o){return JSON.parse(JSON.stringify(o))}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function rand(a,b){return a+Math.random()*(b-a)}
function chance(p){return Math.random()<p}
function weightedChoice(items){const total=items.reduce((s,it)=>s+it[0],0);let r=Math.random()*total;for(const [w,v] of items){r-=w;if(r<=0)return v}return items[0][1]}
function buildFighter(id,lv){
  const base=deepClone(CHARACTERS[id]);
  lv=lv||MAX_LV; const L=lvStats(base,lv); base.level=lv; base.maxHp=L.hp; base.baseSpeed=L.spd; base.dmgMul=L.dmg; base.atk=L.atk; base.def=L.def;
  base.skills.forEach((s,i)=>{const need=SKILL_UNLOCK[i]||1; if(lv<need){s.locked=need;s.pp=0;s.maxPP=0}else if(s.maxPP>0){s.maxPP=skillPP(s,lv,L.ppAdj);s.pp=s.maxPP}});
  base.hp=base.maxHp;
  base.buffs={atk:0,def:0,spd:0};
  base.status={freeze:0,petrify:0,immune:0,immunePermanent:false,regen:0,regenRatio:0,fullRestoreTurns:0,dots:[],reflect:0,reflectMultiplier:1,reflectNegative:false,priority:0,attackFail:0,attackFailChance:0,skipAttack:0,skillNullify:0,shield:0,dodge:0,damageMultTurns:0,damageMultValue:1,damageReductionTurns:0,damageReductionValue:0,damageDealtReductionTurns:0,damageDealtReductionValue:0,nextAttackMultTurns:0,nextAttackMultValue:1,buffBlock:0,awaken:'',frostBoostTurns:0,allyBoostPer:0,lastSkill:'',executeBuffTurns:0,executeBuffChance:0,clutchHealThreshold:0,clutchHealCharges:0,weak:0,weakMin:1.2,weakMax:1.5,burn:0,paralyze:0,fatigue:0,fear:0,armorBreak:0,hitDouble:0};
  base.team=[{filled:true,name:base.name,avatar:base.avatar,active:true,fainted:false}];
  for(let i=0;i<5;i++) base.team.push({filled:false,name:'待加入角色 '+(i+2),avatar:'',active:false,fainted:false});
  return base;
}
function applyChapterDifficulty(fighter,chapterId,isBoss){
 const d=CHAPTER_DIFFICULTY[chapterId]||CHAPTER_DIFFICULTY.east;
 fighter.maxHp=Math.round(fighter.maxHp*d.hp*(isBoss?d.bossHp:1));
 fighter.hp=fighter.maxHp;
 fighter.buffs.atk=clamp((fighter.buffs.atk||0)+d.atk+(isBoss?d.bossStages:0),-6,6);
 fighter.buffs.def=clamp((fighter.buffs.def||0)+d.def+(isBoss?d.bossStages:0),-6,6);
 fighter.buffs.spd=clamp((fighter.buffs.spd||0)+d.spd+(isBoss?d.bossStages:0),-6,6);
 fighter.difficulty=d;
 fighter.isBossUnit=!!isBoss;
 fighter.skills.forEach((s,i)=>{
   if(s.locked)return;
   if(s.effect&&s.effect.noRestore)return;
   if(d.order>=3 && s.pp>0){s.pp+=1; s.maxPP+=1;}
   if(d.order>=5 && s.ultimate && s.pp>0){s.pp+=1; s.maxPP+=1;}
 });
 return fighter;
}
/* 能力階級：攻擊每階 ±10% 傷害、防禦每階 ±10% 受到的傷害、速度每階 ±5%，上下限 ±6 */
function atkMul(s){s=clamp(s,-6,6);return Math.max(0.1,1+s*(GAME_SETTINGS.atkStep??0.10))}
function defTake(s){s=clamp(s,-6,6);return Math.max(0.1,1-s*(GAME_SETTINGS.defStep??0.10))}
function spdMul(s){s=clamp(s,-6,6);return Math.max(0.1,1+s*(GAME_SETTINGS.spdStep??0.05))}
function stageMult(s){return atkMul(s)}
function effectiveSpeed(c){return c.baseSpeed*spdMul(c.buffs.spd)*(c.status.spdMulTurns>0?c.status.spdMul||1:1)*(c.status.freeze>0?1-(GAME_SETTINGS.freezeSlow??0.25):1)*(c.status.priority>0?999:1)}
/* 異常狀態 */
const ABN={freeze:{name:'冰凍',icon:'❄️',desc:'每回合扣 2% 體力，速度減慢'},fatigue:{name:'疲憊',icon:'😮‍💨',desc:'無法使用技能'},weak:{name:'虛弱',icon:'🩸',desc:'造成的傷害下降、受到的傷害上升'},paralyze:{name:'麻痺',icon:'⚡',desc:'無法使用技能'},fear:{name:'恐懼',icon:'😱',desc:'無法使用技能'},burn:{name:'燒傷',icon:'🔥',desc:'每回合扣 4% 體力'},petrify:{name:'固化',icon:'🪨',desc:'無法使用技能'},armorBreak:{name:'破防',icon:'💔',desc:'受到的傷害 +5%'}};
const CC_KEYS=['petrify','paralyze','fatigue','fear'];
function hitsOf(actor,n){return actor.status&&actor.status.hitDouble>0?n*2:n}
/* 屬性相剋：任一屬性克制對方任一屬性 → 克制；對方克制自己 → 微弱 */
function typeMult(a,t){if(!GAME_SETTINGS.typeEffect||typeof TYPE_CHART==='undefined')return 1;const beats=(x,y)=>x.types.some(u=>(TYPE_CHART[u]||[]).some(v=>y.types.includes(v)));const up=beats(a,t),down=beats(t,a);return up&&!down?(GAME_SETTINGS.typeUp||1.25):down&&!up?(GAME_SETTINGS.typeDown||0.8):1}
function immuneTo(c){return c.status.immune>0||c.status.immunePermanent}
function inflict(t,kind,turns,force){if(!force&&immuneTo(t)){log(`🛡️ ${t.name} 免疫了${ABN[kind].name}！`);return false}t.status[kind]=Math.max(t.status[kind]||0,turns||1);log(`${ABN[kind].icon} ${t.name} 陷入${ABN[kind].name}（${ABN[kind].desc}）！`);return true}
function clearAbnormal(c){Object.keys(ABN).forEach(k=>c.status[k]=0);c.status.attackFail=0;c.status.dots=[];c.status.skillNullify=0;c.status.skipAttack=0}
function clearNegativeStages(c){['atk','def','spd'].forEach(k=>{if(c.buffs[k]<0)c.buffs[k]=0})}
function pickEnemySkill(){const actor=battle.enemy,target=battle.player;const usable=actor.skills.map((s,i)=>({s,i})).filter(x=>x.s.pp>0&&!(x.s.effect&&x.s.effect.reviveAlly));if(!usable.length)return -1;const low=actor.hp/actor.maxHp,tLow=target.hp/target.maxHp;switch(actor.skills.length>=5?actor.id:''){case 'luffy': if(low<.5&&actor.skills[4].pp>0&&actor.status.damageMultTurns===0)return 4;if(low<.55&&actor.skills[2].pp>0&&actor.status.regen===0)return 2;break;case 'loki': if(low<.5&&actor.skills[4].pp>0&&actor.status.damageMultTurns===0)return 4;if(target.status.damageMultTurns>0&&actor.skills[3].pp>0)return 3;break;case 'crocodile': if(actor.skills[4].pp>0&&low<.55)return 4;if(actor.skills[1].pp>0&&target.status.fatigue===0)return 1;break;case 'blackbeard': if(actor.skills[4].pp>0&&low<.5)return 4;if(actor.skills[3].pp>0&&target.hp/target.maxHp<.55)return 3;break;case 'enel': if(actor.skills[4].pp>0&&actor.status.damageMultTurns===0&&low<.65)return 4;if(actor.skills[1].pp>0&&low<.45)return 1;if(actor.skills[3].pp>0&&Math.random()<.25)return 3;break}
 const diff=(battle&&battle.difficulty)||CHAPTER_DIFFICULTY.east; const weighted=[];
 usable.forEach(x=>{let w=1;if(x.s.ultimate)w*=0.70+0.18*diff.ai;if(x.s.type==='support'&&low>.85)w*=0.55+0.20*diff.ai;if(x.s.name.includes('震動')||x.s.name.includes('放電'))w*=1.05+0.10*diff.ai;if(diff.order>=4&&x.s.ultimate)w*=1.2;if(diff.order>=5&&x.s.type==='support')w*=1.12;weighted.push([w,x.i])});
 // 強化 AI：對手殘血時優先高傷害攻擊；自己殘血時優先回復／護盾；難度越高越常開奧義
 const hurt=s=>s.type==='attack'?(s.power||0)+((s.effect&&(s.effect.randomMultiplierRange||s.effect.variableMultipliers||s.effect.multiHitNormal||s.effect.jackpotChance))?120:0):0;
 const heals=s=>s.effect&&(s.effect.healRatio||s.effect.fullHeal||s.effect.healRange||s.effect.selfShieldCurrentHpRatio||s.effect.selfShieldMaxHpRatio||s.effect.regenTurns);
 weighted.forEach(w=>{const s=actor.skills[w[1]];if(tLow<.35&&s.type==='attack')w[0]*=1+hurt(s)/100*diff.ai;if(low<.35&&heals(s))w[0]*=2.2*diff.ai;if(s.ultimate)w[0]*=0.8+diff.ai*.4;});
 return weightedChoice(weighted)}
function safeCopiedSkill(target){
  const harmfulToSelfKeys=['selfDamageRatio','selfHpCost','selfDebuff','selfFreeze','selfPetrify'];
  const candidates=target.skills.filter(s=>{
    if(s.pp<=0)return false;
    const ef=s.effect||{};
    return !harmfulToSelfKeys.some(k=>ef[k]);
  });
  return candidates.length?candidates[Math.floor(Math.random()*candidates.length)]:null;
}
function copiedSkillDamage(actor,target,picked){
  if(!picked)return {damage:0,picked:null};
  if(picked.type==='attack'){
    const ef=picked.effect||{};
    if(ef.randomPower){const fake={type:'attack',power:Math.floor(rand(ef.randomPower[0],ef.randomPower[1]))};return {damage:calcAttackDamage(actor,target,fake),picked};}
    if(ef.fixedLightHits){let d=0;for(let i=0;i<ef.fixedLightHits[0];i++)d+=Math.max(1,Math.floor(target.maxHp*ef.fixedLightHits[1]));return {damage:d,picked};}
    if(ef.currentHpCut)return {damage:Math.max(1,Math.floor(target.hp*ef.currentHpCut)),picked};
    if(ef.randomMultiplierRange){const fake={type:'attack',power:picked.power||90,effect:{forceMultiplier:rand(ef.randomMultiplierRange[0],ef.randomMultiplierRange[1])}};return {damage:calcAttackDamage(actor,target,fake),picked};}
    return {damage:calcAttackDamage(actor,target,{type:'attack',power:picked.power||90,effect:ef}),picked};
  }
  return {damage:0,picked};
}
function computeSkillOutcome(actor,target,skill,blockedEffects){
 const ef=skill.effect||{}; let damage=0; let meta={};
 if(actor.status.executeBuffTurns>0 && skill.type==='attack' && chance(actor.status.executeBuffChance||0)){log('⚡ 覺醒之力直接秒殺對手！');return {damage:target.hp,meta:{executeBuff:true}};}
 if(ef.copyOpponentSkillSafe){
   const picked=safeCopiedSkill(target);
   if(!picked){log('🌀 沒有可安全奪取的技能，闇穴道失效。');return {damage:0,meta:{copiedFail:true}};}
   const r=copiedSkillDamage(actor,target,picked);log(`🌀 闇穴道奪取了「${picked.name}」！`);return {damage:r.damage,meta:{copied:picked.name,copiedSkill:picked}};
 }
 if(ef.lostHpDamageMult){damage=Math.max(1,Math.round((target.maxHp-target.hp)*ef.lostHpDamageMult));return {damage,meta};}
 if(ef.enemyCurrentHpCut){damage+=Math.max(1,Math.floor(target.hp*ef.enemyCurrentHpCut));return {damage,meta};}
 if(ef.currentHpCut){damage+=Math.max(1,Math.floor(target.hp*ef.currentHpCut));return {damage,meta};}
 if(ef.damageFromSelfCurrentHpRatio){damage=Math.max(1,Math.floor(actor.hp*ef.damageFromSelfCurrentHpRatio));return {damage,meta};}
 if(ef.chanceHalfHpCut&&chance(ef.chanceHalfHpCut)){damage+=Math.max(1,Math.floor(target.hp*0.5));log(`💥 ${ef.halfCutLabel||'沙漠寶刀'}造成巨額削血！`);return {damage,meta:{halfCut:true}};}
 if(ef.randomPercentHits){const[count0,min,max,useCurrent]=ef.randomPercentHits;const count=hitsOf(actor,count0);for(let i=0;i<count;i++){const ratio=rand(min,max);const base=useCurrent?target.hp:target.maxHp;damage+=Math.max(1,Math.floor(base*ratio));}return {damage,meta};}
 if(ef.randomHitCount){const count=hitsOf(actor,Math.floor(rand(ef.randomHitCount[0],ef.randomHitCount[1]+1)));const perHit=ef.perHitPower||8;for(let i=0;i<count;i++)damage+=Math.max(1,Math.floor(perHit*atkMul(actor.buffs.atk)*defTake(target.buffs.def)));log(`🌸 連續繁衍攻擊 ${count} 次！`);return {damage,meta:{hitCount:count}};}
 if(ef.fixedLightHits){const[count0,ratio]=ef.fixedLightHits;const count=hitsOf(actor,count0);for(let i=0;i<count;i++)damage+=Math.max(1,Math.floor(target.maxHp*ratio));return {damage,meta};}
 if(ef.drainCurrentHpRange){damage=Math.max(1,Math.floor(target.hp*rand(ef.drainCurrentHpRange[0],ef.drainCurrentHpRange[1])));return {damage,meta:{drain:damage}};}
 if(ef.drainMaxHp){damage=Math.max(1,Math.floor(target.maxHp*ef.drainMaxHp));return {damage,meta:{drain:damage}};}
 if(ef.randomPower){const fake={type:'attack',power:Math.floor(rand(ef.randomPower[0],ef.randomPower[1]))};damage=calcAttackDamage(actor,target,fake);return {damage,meta};}
 if(ef.variableMultipliers){let mult=weightedChoice(ef.variableMultipliers.map(([p,m])=>[p,m]));if(Array.isArray(mult))mult=Math.round(rand(mult[0],mult[1])*10)/10;const fake={type:'attack',power:skill.power,effect:{forceMultiplier:mult}};damage=calcAttackDamage(actor,target,fake);log(`🌋 震動倍率 x${mult}！`);return {damage,meta};}
 if(ef.randomMultiplierRange){if(ef.executeChance&&chance(ef.executeChance)){log(`😈 ${skill.name}直接秒殺！`);return {damage:target.hp,meta:{execute:true}};}const mult=rand(ef.randomMultiplierRange[0],ef.randomMultiplierRange[1]);damage=calcAttackDamage(actor,target,{type:'attack',power:skill.power||100,effect:{forceMultiplier:mult}});log(`💥 ${skill.name} 倍率 x${mult.toFixed(1)}！`);if(ef.ignoreShield)log('🗡️ 無視護盾！');return {damage,meta:{ignoreShield:!!ef.ignoreShield,lifesteal:ef.lifestealAll?Math.min(damage,target.hp):0}};}
 if(ef.executeChance){
   if(chance(ef.executeChance)){damage=target.hp;log('⚡ 技能直接命中弱點！');return {damage,meta:{execute:true}};}
   if(ef.fallbackPower){damage=calcAttackDamage(actor,target,{type:'attack',power:ef.fallbackPower});return {damage,meta:{fallbackHealRatio:ef.fallbackHealRatio||0}};}
   if(ef.fallbackSkill){const fallback=actor.skills.find(s=>s.name===ef.fallbackSkill)||actor.skills[0];for(let i=0;i<(ef.fallbackTimes||1);i++)damage+=computeSkillOutcome(actor,target,deepClone(fallback),blockedEffects).damage;log('⚡ 秒殺未觸發，轉為追加技能！');return {damage,meta:{fallback:true}};}
 }
 if(ef.multiHitNormal){const[a,b]=ef.multiHitNormal;const n=hitsOf(actor,a+Math.floor(Math.random()*(b-a+1)));let ice=0;for(let i=0;i<n;i++){if(ef.perHitExecute&&chance(ef.perHitExecute)){log(`🦈 第 ${i+1} 擊直接秒殺！`);return {damage:target.hp+(target.status.shield||0),meta:{execute:true,hitCount:i+1}}}damage+=calcAttackDamage(actor,target,{type:'attack',power:ef.perHitPower||skill.power||45});if(ef.extraIceChance&&chance(ef.extraIceChance)){damage+=Math.max(1,Math.floor(target.maxHp*(ef.extraIceRatio||0.06)));ice++;}}
   if(ef.bonusSelfHpRatio){const x=Math.max(1,Math.floor(actor.hp*ef.bonusSelfHpRatio));damage+=x;log(`⚡ 追加自身體力 ${Math.round(ef.bonusSelfHpRatio*100)}% 的附加傷害 ${x}！`)}
   log(`👊 連續打擊 ${n} 次${ice?`，其中 ${ice} 次附加冰凍傷害`:''}！`);return {damage,meta:{hitCount:n,ice,lifesteal:ef.lifesteal?Math.floor(damage*ef.lifesteal):0}};}
 if(ef.fixedLightHitsRange){const[[a,b],r]=ef.fixedLightHitsRange;const n=hitsOf(actor,a+Math.floor(Math.random()*(b-a+1)));for(let i=0;i<n;i++)damage+=Math.max(1,Math.floor(target.maxHp*r));log(`💥 強力攻擊 ${n} 次，累積 ${Math.round(n*r*100)}% 最大體力！`);return {damage,meta:{hitCount:n}};}
 if(ef.jackpotChance){const big=chance(ef.jackpotChance);if(!big&&ef.elseHits){const[a,b]=ef.elseHits;const n=hitsOf(actor,a+Math.floor(Math.random()*(b-a+1)));for(let i=0;i<n;i++)damage+=calcAttackDamage(actor,target,{type:'attack',power:ef.perHitPower||30});log(`👊 普通攻擊 ${n} 次！`);return {damage,meta:{hitCount:n}};}damage=calcAttackDamage(actor,target,{type:'attack',power:skill.power||100,effect:{forceMultiplier:big?(ef.jackpotMult||10):1}});if(big)log(`💥 ${skill.name}打出 ${ef.jackpotMult||10} 倍傷害！`);return {damage,meta:{jackpot:big}};}
 if(skill.type==='attack'){damage=calcAttackDamage(actor,target,skill);return {damage,meta};}
 return {damage:0,meta};
}
function calcAttackDamage(actor,target,skill){let power=skill.power||90;let mult=(actor.status.weak>0?1-(GAME_SETTINGS.weakDealt??0.15):1)*atkMul(actor.buffs.atk)*defTake(target.buffs.def)*((actor.dmgMul||1)/(target.dmgMul||1))*typeMult(actor,target)*(1-Math.min(.25,(target.def||0)/6000));if(skill.effect&&skill.effect.critBoost&&chance(skill.effect.critBoost)){mult*=skill.effect.critMult;log('💥 造成爆發傷害！')}if(skill.effect&&skill.effect.forceMultiplier)mult*=skill.effect.forceMultiplier;if(actor.status.damageMultTurns>0)mult*=actor.status.damageMultValue;if(actor.status.damageDealtReductionTurns>0)mult*=Math.max(0,1-actor.status.damageDealtReductionValue);if(actor.status.nextAttackMultTurns>0)mult*=actor.status.nextAttackMultValue;if(actor.status.awaken==='nika'){const team=(typeof battle!=='undefined'&&battle&&battle.team&&battle.team.includes(actor))?battle.team:[];const alive=team.filter(f=>f!==actor&&f.hp>0).length;if(actor.status.allyAliveBoost&&alive>0)mult*=1+actor.status.allyAliveBoost;else if(actor.status.allyBoostPer)mult*=(1+alive*actor.status.allyBoostPer)}if(actor.status.awaken==='nidhogg'&&actor.status.frostBoostTurns>0){const extra=Math.max(1,Math.floor(target.maxHp*0.04));power+=extra;if(target.status.immune<=0&&chance(0.4))target.status.freeze=Math.max(target.status.freeze,1)}const variance=rand(.92,1.08);return Math.max(1,Math.floor(power*mult*variance*(actor.dmgMul||1)))}
function applySkillEffects(actor,target,skill,result){
 const ef=skill.effect||{};
 if(ef.healRatio){const heal=Math.floor(actor.maxHp*ef.healRatio);actor.hp=Math.min(actor.maxHp,actor.hp+heal);showHeal(actor===battle.player?'L':'R',heal);log(`💚 ${actor.name} 恢復 ${heal} HP。`)}if(result.meta&&result.meta.fallbackHealRatio){const heal=Math.floor(actor.maxHp*result.meta.fallbackHealRatio);actor.hp=Math.min(actor.maxHp,actor.hp+heal);showHeal(actor===battle.player?'L':'R',heal);log(`💚 ${actor.name} 因波賽頓未秒殺而恢復 ${heal} HP。`)}if(ef.regenTurns){actor.status.regen=ef.regenTurns; actor.status.regenRatio=ef.regenRatio; actor.status.immune=Math.max(actor.status.immune,ef.immuneTurns||0); log(`💚 ${actor.name} 進入持續回復狀態！`)}
 if(ef.fullRestoreTurns){actor.status.fullRestoreTurns=Math.max(actor.status.fullRestoreTurns, ef.fullRestoreTurns); log(`✨ ${actor.name} 接下來將持續恢復至滿血！`)}
 if(ef.selfPriority){actor.status.priority=ef.selfPriority; log(`⚡ ${actor.name} 下回合將先制！`)}
 if(ef.attackFailTurns){target.status.attackFail=ef.attackFailTurns; target.status.attackFailChance=ef.attackFailChance; if(target.status.immune<=0&&!target.status.immunePermanent) log(`🔒 ${target.name} 接下來有攻擊失效判定！`)}
 if(ef.fullHeal){const recovered=actor.maxHp-actor.hp; actor.hp=actor.maxHp; if(recovered>0)showHeal(actor===battle.player?'L':'R',recovered); log(`✨ ${actor.name} 完全恢復了體力！`)}
 if(ef.statUpAll && actor.status.buffBlock<=0){actor.buffs.atk=clamp(actor.buffs.atk+ef.statUpAll,-6,6); actor.buffs.def=clamp(actor.buffs.def+ef.statUpAll,-6,6); actor.buffs.spd=clamp(actor.buffs.spd+ef.statUpAll,-6,6); log(`📈 ${actor.name} 的全能力提升了！`)}
 if(ef.selfBuffAtk&&actor.status.buffBlock<=0){actor.buffs.atk=clamp(actor.buffs.atk+ef.selfBuffAtk,-6,6)}
 if(ef.selfBuffDef&&actor.status.buffBlock<=0){actor.buffs.def=clamp(actor.buffs.def+ef.selfBuffDef,-6,6)}
 if(ef.selfBuffSpd&&actor.status.buffBlock<=0){actor.buffs.spd=clamp(actor.buffs.spd+ef.selfBuffSpd,-6,6)}
 if(ef.dotChance&&target.status.immune<=0&&!target.status.immunePermanent&&chance(ef.dotChance)){target.status.dots.push({turns:ef.dotTurns,ratio:ef.dotRatio,label:ef.dotLabel});log(`🩸 ${target.name} 陷入${ef.dotLabel}！`)}
 if(ef.randomPPDown){const pool=target.skills.filter(s=>s.pp>0); if(pool.length){const chosen=pool[Math.floor(Math.random()*pool.length)]; chosen.pp=Math.max(0,chosen.pp-ef.randomPPDown); log(`🕳️ ${target.name} 的「${chosen.name}」PP -${ef.randomPPDown}！`)}}
 if(ef.nextAttackMult){actor.status.nextAttackMultValue=ef.nextAttackMult; actor.status.nextAttackMultTurns=ef.nextAttackMultTurns||1}
 if(ef.damageMultTurns){actor.status.damageMultTurns=ef.damageMultTurns; actor.status.damageMultValue=ef.damageMultValue||2}
 if(ef.executeBuffTurns){actor.status.executeBuffTurns=ef.executeBuffTurns; actor.status.executeBuffChance=ef.executeBuffChance||0; log(`☠️ ${actor.name} 進入秒殺威壓狀態！`)}
 if(ef.damageReductionTurns){actor.status.damageReductionTurns=ef.damageReductionTurns; actor.status.damageReductionValue=ef.damageReductionValue||0}
 if(ef.dodgeTurns){actor.status.dodge=Math.max(actor.status.dodge,ef.dodgeTurns);log(`🪽 ${actor.name} 將閃避下一次攻擊！`)}
 if(ef.decoys){actor.status.decoys=(actor.status.decoys||0)+ef.decoys;log(`🎖️ ${ef.decoys} 名海軍小兵趕到，擋在 ${actor.name} 前面！`)}
 if(ef.eruption){if(battle.eruption&&battle.eruption.owner.hp>0)log('🌋 火山已經在噴發中。');else{battle.eruption={owner:actor};log(`🌋 ${actor.name} 引發火山噴發！整個戰場陷入熔岩之中！`)}}
 if(ef.perHitBurn&&result&&result.meta&&result.meta.hitCount){const p=1-Math.pow(1-ef.perHitBurn,result.meta.hitCount);if(chance(p)&&inflict(target,'burn',3))log(`🔥 流星火山的熔岩讓 ${target.name} 燒傷了！`)}if(ef.reflectTurns){actor.status.reflect=ef.reflectTurns; actor.status.reflectMultiplier=ef.reflectMultiplier||1; actor.status.reflectNegative=!!ef.reflectNegative; log(`🛡️ ${actor.name} 展開反彈護盾！`)}
 if(ef.skipAttackChance){if(chance(ef.skipAttackChance))inflict(target,ef.ccKind||'paralyze',ef.skipAttackTurns||1)}else if(ef.skipAttackTurns){inflict(target,ef.ccKind||'paralyze',ef.skipAttackTurns)}
 ['burn','fear','fatigue','paralyze','armorBreak'].forEach(k=>{if(ef[k+'Chance']&&chance(ef[k+'Chance']))inflict(target,k,ef[k+'Turns']||(k==='burn'||k==='armorBreak'?3:1))});
 if(ef.dotTurns&&!ef.dotChance&&target.status.immune<=0&&!target.status.immunePermanent){target.status.dots.push({turns:ef.dotTurns,ratio:ef.dotRatio,label:ef.dotLabel}); log(`☠️ ${target.name} 陷入${ef.dotLabel}！`)}
 if(ef.dotSequence&&target.status.immune<=0&&!target.status.immunePermanent){target.status.dots.push({turns:ef.dotSequence.length,sequence:ef.dotSequence,label:ef.dotLabel,index:0}); log(`🌪️ ${target.name} 陷入${ef.dotLabel}！`)}
 if(ef.clearBuffs){target.buffs.atk=0; target.buffs.def=0; target.buffs.spd=0; log(`🌀 ${target.name} 的能力提升被清除！`)}
 if(ef.clearSelfDebuffs){clearAbnormal(actor);clearNegativeStages(actor);log(`✨ ${actor.name} 清除了自身的異常狀態與負面能力！`)}
 if(ef.freezeChance&&chance(ef.freezeChance))inflict(target,'freeze',ef.freezeTurns||2);
 if(ef.petrifyChance&&chance(ef.petrifyChance))inflict(target,'petrify',ef.petrifyTurns||1);
 if(ef.nullifyEnemySkillTurns){target.status.skillNullify=ef.nullifyEnemySkillTurns; log(`🚫 ${target.name} 接下來技能附加效果將失效！`)}
 if(ef.selfShieldCurrentHpRatio){const shield=Math.max(1,Math.floor(actor.hp*ef.selfShieldCurrentHpRatio)); actor.status.shield+=shield; log(`🛡️ ${actor.name} 獲得 ${shield} 點護盾！`)}
 if(ef.enemyDamageReductionTurns){target.status.damageDealtReductionTurns=Math.max(target.status.damageDealtReductionTurns,ef.enemyDamageReductionTurns);target.status.damageDealtReductionValue=Math.max(target.status.damageDealtReductionValue,ef.enemyDamageReductionValue||0.5);log(`🌺 ${target.name} 的傷害輸出降低 ${Math.round((ef.enemyDamageReductionValue||0.5)*100)}%！`)}if(ef.clutchHealCharges){actor.status.clutchHealThreshold=ef.clutchHealThreshold||0.10;actor.status.clutchHealCharges=Math.max(actor.status.clutchHealCharges,ef.clutchHealCharges);log(`🌺 ${actor.name} 獲得一次瀕死回滿效果！`)}if(ef.buffBlockTurns){target.status.buffBlock=Math.max(target.status.buffBlock,ef.buffBlockTurns); log(`🔐 ${target.name} 的能力提升被封鎖！`)}
 if(ef.weakChance&&chance(ef.weakChance)&&inflict(target,'weak',ef.weakTurns||2)){target.status.weakMin=(ef.weakRange||[1.2,1.5])[0];target.status.weakMax=(ef.weakRange||[1.2,1.5])[1]}
 if(ef.selfShieldMaxHpRatio){const sh=Math.floor(actor.maxHp*ef.selfShieldMaxHpRatio);actor.status.shield+=sh;log(`🛡️ ${actor.name} 獲得 ${sh} 點護盾！`)}
 if(ef.freezeForce)inflict(target,'freeze',ef.freezeForce,true);
 if(ef.transferDebuffs){const A=actor.status,T=target.status;let moved=0;[...Object.keys(ABN),'skipAttack','skillNullify','buffBlock'].forEach(k=>{if(A[k]>0){T[k]=Math.max(T[k],A[k]);A[k]=0;moved++}});if(A.weak===0&&T.weak>0){T.weakMin=T.weakMin||1.2;T.weakMax=T.weakMax||1.5}if(A.attackFail>0){T.attackFail=Math.max(T.attackFail,A.attackFail);T.attackFailChance=Math.max(T.attackFailChance,A.attackFailChance||0.5);A.attackFail=0;moved++}if(A.dots.length){T.dots.push(...A.dots.map(d=>({...d})));A.dots=[];moved++}if(A.damageDealtReductionTurns>0){T.damageDealtReductionTurns=A.damageDealtReductionTurns;T.damageDealtReductionValue=A.damageDealtReductionValue;A.damageDealtReductionTurns=0;A.damageDealtReductionValue=0;moved++}['atk','def','spd'].forEach(k=>{if(actor.buffs[k]<0){target.buffs[k]=clamp(target.buffs[k]+actor.buffs[k],-6,6);actor.buffs[k]=0;moved++}});log(moved?`🏹 ${actor.name} 把負面效果全部轉移給 ${target.name}！`:`🏹 ${actor.name} 身上沒有負面效果可以轉移。`)}
 if(ef.healRange){const heal=Math.floor(actor.maxHp*rand(ef.healRange[0],ef.healRange[1]));actor.hp=Math.min(actor.maxHp,actor.hp+heal);showHeal(actor===battle.player?'L':'R',heal);log(`💚 ${actor.name} 回復 ${heal} 體力。`)}
 if(result.meta&&result.meta.lifesteal){const heal=result.meta.lifesteal;actor.hp=Math.min(actor.maxHp,actor.hp+heal);showHeal(actor===battle.player?'L':'R',heal);log(`🩸 ${actor.name} 把傷害轉為回復 ${heal} 體力！`)}
 if(ef.ccOr){const o=ef.ccOr;if(chance(o.chance)&&inflict(target,o.kind,o.turns||1)){}else if(o.elseStat&&chance(o.elseChance||0)&&target.status.buffBlock<=0){target.buffs[o.elseStat]=clamp(target.buffs[o.elseStat]+(o.elseAmount||-1),-6,6);log(`📉 ${target.name} 的${{atk:'攻擊',def:'防禦',spd:'速度'}[o.elseStat]} ${o.elseAmount||-1}！`)}}
 if(ef.copyReplace){const slot=actor.skills.indexOf(skill);const pool=target.skills.slice(0,4).map((s,j)=>({s,j})).filter(x=>x.s&&!x.s.locked&&x.s.maxPP>0&&!(x.s.effect&&x.s.effect.copyReplace));
   if(slot>=0&&pool.length){const pk=pool[Math.floor(Math.random()*pool.length)];const cp=deepClone(pk.s);cp.copiedFrom={id:pk.s.copiedFrom?pk.s.copiedFrom.id:target.id,idx:pk.s.copiedFrom?pk.s.copiedFrom.idx:pk.j};cp.pp=cp.maxPP;actor.skills[slot]=cp;log(`🌀 ${actor.name} 複製了「${cp.name}」！這個技能已經變成「${cp.name}」。`)}
   else log(`🌀 沒有可以複製的技能。`)}
 if(ef.reviveAlly){const team=(battle&&battle.team&&battle.team.includes(actor))?battle.team:null;const dead=team?team.filter(f=>f!==actor&&f.hp<=0):[];
   if(!dead.length)log(`🌊 ${actor.name} 呼喚著夥伴……但沒有倒下的隊友需要復活。`);
   else{const r=dead[0];r.hp=Math.round(r.maxHp*ef.reviveAlly);clearAbnormal(r);log(`🌊 ${r.name} 聽見了呼喚，以 ${Math.round(ef.reviveAlly*100)}% 體力復活了！`);
     if(chance(ef.reviveSelfDeath||0)){actor.hp=0;log(`💧 ${actor.name} 耗盡了力量，倒下了……`)}else{actor.status.shield+=ef.reviveShield||1000;log(`🛡️ ${actor.name} 獲得 ${ef.reviveShield||1000} 點護盾！`)}
     if(typeof renderTeam==='function')renderTeam()}}
 if(ef.speedMulRange){actor.status.spdMul=Math.round(rand(ef.speedMulRange[0],ef.speedMulRange[1])*100)/100;actor.status.spdMulTurns=ef.speedMulTurns||3;log(`💨 ${actor.name} 的速度變為 ${actor.status.spdMul} 倍！`)}
 if(ef.hitDoubleTurns){actor.status.hitDouble=Math.max(actor.status.hitDouble,ef.hitDoubleTurns);log(`⚡ ${actor.name} 接下來 2 回合技能的攻擊次數加倍！`)}
 if(ef.immunePermanent){actor.status.immunePermanent=true; actor.status.immune=999; log(`🛡️ ${actor.name} 在戰鬥結束前免疫全部異常！`)}
 if(ef.awaken==='nika'){actor.status.awaken='nika'; actor.status.allyBoostPer=ef.allyBoostPer||0; actor.status.allyAliveBoost=ef.allyAliveBoost||0}
 else if(ef.awaken==='nidhogg'){actor.status.awaken='nidhogg'; actor.status.frostBoostTurns=ef.frostBoostTurns||2}
 if(result.meta&&result.meta.drain){actor.hp=Math.min(actor.maxHp,actor.hp+result.meta.drain); showHeal(actor===battle.player?'L':'R',result.meta.drain); log(`吸收了 ${result.meta.drain} 點體力！`)}
 if(ef.enemyCurrentHpCut){log(`💀 ${target.name} 被直接削去大量體力！`)}
 if(ef.damageReductionTurns){log(`🛡️ ${actor.name} 進入減傷型態！`)}
 if(ef.damageMultTurns&&skill.name==='二億伏特·雷神'){log('⚡ 艾涅爾化身雷神型態！')}
 if(ef.damageMultTurns&&skill.name==='沙漠向日葵'){log('🌞 克洛克達爾蓄勢待發，下回合傷害提升！')}
 if(ef.copyOpponentSkillAfter){const picked=safeCopiedSkill(target);if(picked){const r=copiedSkillDamage(actor,target,picked);log(`🕳️ ${actor.name} 追加奪取「${picked.name}」！`);if(r.damage>0)applyDamage(target,r.damage,target===battle.player?'L':'R');}else log('🕳️ 沒有可安全追加的對手技能。');}if(actor.status.buffBlock>0){/* blocked by skill */}
 if(target.status.buffBlock>0&&ef.statUpAll){log(`但 ${target.name} 的能力提升受封鎖。`)}
}
function applyReflectedNegativeEffects(skill,source,dest){
 const ef=skill.effect||{};
 if(dest.status.immune>0||dest.status.immunePermanent) return;
 if(ef.skipAttackTurns){dest.status[ef.ccKind||'paralyze']=Math.max(dest.status[ef.ccKind||'paralyze'], ef.skipAttackTurns); log(`↩️ ${dest.name} 反遭${ABN[ef.ccKind||'paralyze'].name}！`)}
 if(ef.attackFailTurns){dest.status.attackFail=Math.max(dest.status.attackFail, ef.attackFailTurns); dest.status.attackFailChance=ef.attackFailChance||0.5; log(`↩️ ${dest.name} 反遭攻擊失效效果！`)}
 if(ef.dotTurns){dest.status.dots.push({turns:ef.dotTurns,ratio:ef.dotRatio,label:'反彈'+(ef.dotLabel||'持續傷害')}); log(`↩️ ${dest.name} 反遭持續傷害！`)}
 if(ef.dotSequence){dest.status.dots.push({turns:ef.dotSequence.length,sequence:ef.dotSequence,label:'反彈持續傷害',index:0}); log(`↩️ ${dest.name} 反遭持續傷害！`)}
 if(ef.freezeChance&&chance(ef.freezeChance)){dest.status.freeze=Math.max(dest.status.freeze,ef.freezeTurns||2); log(`↩️ ${dest.name} 反被冰凍！`)}
 if(ef.petrifyChance&&chance(ef.petrifyChance)){dest.status.petrify=Math.max(dest.status.petrify,ef.petrifyTurns||1); log(`↩️ ${dest.name} 反被固化！`)}
 if(ef.nullifyEnemySkillTurns){dest.status.skillNullify=Math.max(dest.status.skillNullify,ef.nullifyEnemySkillTurns); log(`↩️ ${dest.name} 的技能效果被封印！`)}
 if(ef.randomPPDown){const pool=dest.skills.filter(s=>s.pp>0); if(pool.length){const chosen=pool[Math.floor(Math.random()*pool.length)]; chosen.pp=Math.max(0,chosen.pp-ef.randomPPDown); log(`↩️ ${dest.name} 的「${chosen.name}」PP 被反彈削減！`)}}
 if(ef.clearBuffs){dest.buffs.atk=0; dest.buffs.def=0; dest.buffs.spd=0; log(`↩️ ${dest.name} 的能力提升被反彈清除！`)}
 if(ef.buffBlockTurns){dest.status.buffBlock=Math.max(dest.status.buffBlock, ef.buffBlockTurns); log(`↩️ ${dest.name} 的能力提升被反彈封鎖！`)}
}
function applyDamage(target,amount,side,opts){let final=amount;if(target.status.armorBreak>0)final=Math.round(final*(1+(GAME_SETTINGS.armorBreak??0.05)));if(target.status.weak>0)final=Math.floor(final*rand(target.status.weakMin||1.2,target.status.weakMax||1.5));if(target.status.damageReductionTurns>0)final=Math.max(1,Math.floor(final*(1-target.status.damageReductionValue)));if(target.status.decoys>0&&final>0){target.status.decoys--;log(`🎖️ 海軍小兵替 ${target.name} 擋下了攻擊！（剩 ${target.status.decoys} 名）`);showFx('BLOCK');renderHUD();return}let absorbed=0;if(target.status.shield>0&&!(opts&&opts.ignoreShield)){absorbed=Math.min(target.status.shield,final);target.status.shield-=absorbed;final-=absorbed;if(absorbed>0)log(`🛡️ 護盾吸收了 ${absorbed} 點傷害！`)}if(final>0){target.hp=Math.max(0,target.hp-final);showDamage(side,final,side==='L'?'#ff8888':'#8fe8ff')}if(target.hp>0&&target.status.clutchHealCharges>0&&target.hp/target.maxHp<=(target.status.clutchHealThreshold||0.10)){target.status.clutchHealCharges--;const heal=target.maxHp-target.hp;target.hp=target.maxHp;showHeal(side,heal);log(`🌺 ${target.name} 觸發巨大人形保護，瞬間回滿血！`)}if(absorbed>0&&final<=0)showFx('BLOCK');renderHUD()}
function endTurnStatus(c){
 const side=c===battle.player?'L':'R';
 const E=battle.eruption; if(E&&c.hp>0){ if(E.owner.hp<=0){battle.eruption=null;log('🌋 火山噴發的熔岩冷卻了。');} else { const ownerSide=battle.team.includes(E.owner)?'L':'R'; if(c===E.owner){const h=Math.floor(c.maxHp*(0.05+Math.random()*0.03));c.hp=Math.min(c.maxHp,c.hp+h);showHeal(side,h);log(`🌋 ${c.name} 吸收熔岩，恢復 ${h} HP。`);} else if(side!==ownerSide){const d=Math.max(1,Math.floor(c.maxHp*0.10));c.hp=Math.max(0,c.hp-d);showDamage(side,d,'#ff6a3a');log(`🌋 ${c.name} 被熔岩灼燒，損失 ${d} HP！`);} } }
 if(c.status.regen>0&&c.hp>0){const heal=Math.floor(c.maxHp*c.status.regenRatio); c.hp=Math.min(c.maxHp,c.hp+heal); showHeal(side,heal); log(`💚 ${c.name} 回復 ${heal} HP。`); c.status.regen--;}
 const remainingDots=[];
 c.status.dots.forEach(dot=>{if(c.hp<=0)return; let ratio=dot.ratio; if(dot.sequence){const [a,b]=dot.sequence[dot.index]||[0,0]; ratio=rand(a,b); dot.index++;} const dmg=Math.max(1,Math.floor(c.maxHp*ratio)); c.hp=Math.max(0,c.hp-dmg); showDamage(side,dmg,'#ffd34d'); log(`☠️ ${c.name} 受到${dot.label} ${dmg} 點傷害！`); dot.turns--; if(dot.turns>0) remainingDots.push(dot);});
 c.status.dots=remainingDots;
 [['freeze',GAME_SETTINGS.freezeDot??0.02],['burn',GAME_SETTINGS.burnDot??0.04]].forEach(([k,r])=>{if(c.status[k]>0&&c.hp>0){const d=Math.max(1,Math.floor(c.maxHp*r));c.hp=Math.max(0,c.hp-d);showDamage(side,d);log(`${ABN[k].icon} ${c.name} 受到${ABN[k].name}傷害 ${d}。`);c.status[k]--}});
 if(c.status.armorBreak>0)c.status.armorBreak--;
 if(c.status.hitDouble>0)c.status.hitDouble--;
 if(c.status.spdMulTurns>0){c.status.spdMulTurns--;if(c.status.spdMulTurns<=0)c.status.spdMul=1}
 if(c.status.fullRestoreTurns>0&&c.hp>0){const heal=Math.max(0,c.maxHp-c.hp); c.hp=c.maxHp; if(heal>0)showHeal(side,heal); log(`✨ ${c.name} 恢復至滿血狀態！`); c.status.fullRestoreTurns--;}
 if(!c.status.immunePermanent && c.status.immune>0)c.status.immune--;
 if(c.status.priority>0)c.status.priority--;
 if(c.status.damageMultTurns>0){c.status.damageMultTurns--; if(c.status.damageMultTurns<=0)c.status.damageMultValue=1}
 if(c.status.executeBuffTurns>0){c.status.executeBuffTurns--; if(c.status.executeBuffTurns<=0)c.status.executeBuffChance=0}
 if(c.status.damageReductionTurns>0){c.status.damageReductionTurns--; if(c.status.damageReductionTurns<=0)c.status.damageReductionValue=0}if(c.status.damageDealtReductionTurns>0){c.status.damageDealtReductionTurns--;if(c.status.damageDealtReductionTurns<=0)c.status.damageDealtReductionValue=0}
 if(c.status.nextAttackMultTurns>0){c.status.nextAttackMultTurns--;}
 if(c.status.nextAttackMultTurns<=0)c.status.nextAttackMultValue=1;
 if(c.status.buffBlock>0)c.status.buffBlock--;
 if(c.status.weak>0)c.status.weak--;
 if(c.status.skillNullify>0)c.status.skillNullify--;
 if(c.status.frostBoostTurns>0)c.status.frostBoostTurns--;
 if(c.status.frostBoostTurns<=0&&c.status.awaken==='nidhogg')c.status.awaken='';
}
