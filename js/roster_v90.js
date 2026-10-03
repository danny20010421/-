/* v90：布魯克、阿玉、多利、寇沙。 */
(function () {
  const V = 90, img = id => `assets/chars/${id}.webp?v=${V}`, face = id => `assets/chars/${id}_face.webp?v=${V}`;
  const S = (name, type, pp, power, desc, tags, anima, effect, ult) => Object.assign({ name, type, pp, maxPP: pp, power, accuracy: 100, desc, tags, anima, effect: effect || {} }, ult ? { ultimate: true } : {});
  const C = (id, o, skills) => { CHARACTERS[id] = Object.assign({ id, image: img(id), avatar: face(id), ultimateBg: img(id), scale: .85, worldScale: .9, ai: 'balanced' }, o, { skills }); if (!CHARACTER_ORDER.includes(id)) CHARACTER_ORDER.push(id); };

  C('brook', { no: 122, name: '布魯克', title: '靈魂之王', types: ['超能', '冰'], maxHp: 1750, baseSpeed: 122, battleScale: 1.35, ai: 'aggressive', cardPos: '50% 50%',
    desc: '黃泉果實能力者，死後靈魂回到身體、以骷髏之姿復活的音樂家劍士。冥界的寒氣與靈魂之力讓他被稱為「靈魂之王」。' }, [
    S('靈魂歡歌', 'support', 4, 0, '演奏靈魂之歌：35% 機率使下回合攻擊傷害 3～20 倍；對手 25% 機率攻擊無效 1 回合；接下來 2 回合造成的傷害有 15～20% 回復到自己身上。', [['強化', 'gold'], ['吸血', 'green'], ['致盲', 'gold']], 'voice', { nextAttackMult: [3, 20], nextAttackMultTurns: 2, nextAttackMultChance: .35, attackFailChance: .25, attackFailTurns: 1, nextLifestealRange: [.15, .2], nextLifestealTurns: 2 }),
    S('催眠曲', 'attack', 6, 0, '演奏讓人沉睡的曲子：使對手麻痺 1 回合、解除對手的能力提升，並吸取對手目前體力的 1～8%。', [['麻痺', 'gold'], ['解除強化', 'blue'], ['吸取', 'green']], 'voice', { skipAttackChance: 1, skipAttackTurns: 1, ccKind: 'paralyze', clearBuffs: true, drainCurrentHpRange: [.01, .08] }),
    S('飛空斬擊', 'attack', 12, 130, '以極快的拔刀把斬擊送向遠方（鼻歌三丁・矢筈斬），30% 機率造成 1.8 倍傷害。', [['爆發', 'red']], 'sanzen', { critBoost: .3, critMult: 1.8 }),
    S('魂之喪劍', 'attack', 8, 160, '注入冥界寒氣的一劍（靈魂之喪劍），40% 使對手冰凍 1 回合。', [['冰凍', 'blue']], 'icefang', { freezeChance: .4, freezeTurns: 1 }),
    S('黃泉之力', 'attack', 1, 0, '解放黃泉的力量：3 回合內閃避所有攻擊並免疫異常狀態，恢復全部體力、全能力 +1，接著斬擊 2～30 次（每次威力 22）；25% 使對手冰凍（凍傷），並使對手全能力 -1。使用次數 1，只能用藥水恢復一次。', [['奧義', 'gold'], ['無敵', 'blue'], ['回復', 'green']], 'sanzen', { dodgeTurns: 3, immuneTurns: 3, fullHeal: true, statUpAll: 1, multiHitNormal: [2, 30], perHitPower: 22, freezeChance: .25, freezeTurns: 1, enemyAllDown: 1, restoreOnce: true }, true)
  ]);
  C('tama', { no: 123, name: '阿玉', title: '黍團子的女孩', types: ['超能'], maxHp: 700, baseSpeed: 92, battleScale: .3, ai: 'support', cardPos: '50% 18%',
    desc: '住在和之國兔丼的女孩，一直等著艾斯回來帶她出海。吃了黍黍果實，給動物吃下她做的黍團子，動物就會聽她的話。' }, [
    S('黍團子', 'support', 4, 0, '把黍團子丟給對手：60% 使對手聽話、1 回合無法攻擊，並使對手攻擊 -1。', [['控場', 'blue'], ['弱化', 'red']], 'cook', { skipAttackChance: .6, skipAttackTurns: 1, enemyAtkDownChance: [[1, 1], 1, 2] }),
    S('狛千代，上！', 'attack', 12, 85, '呼喚大山犬狛千代衝撞對手，25% 使對手恐懼 1 回合。', [['恐懼', 'gold']], 'punch', { fearChance: .25, fearTurns: 1 })
  ]);
  C('dorry', { no: 124, name: '多利', title: '青鬼', types: ['格鬥'], maxHp: 1800, baseSpeed: 92, battleScale: 1.8, faceLeft: true, ai: 'aggressive', cardPos: '50% 12%',
    desc: '艾爾巴夫的巨人戰士「青鬼」多利。和赤鬼布洛基在小花園島決鬥了整整一百年，是艾爾巴夫戰士榮耀的化身。' }, [
    S('巨劍劈砍', 'attack', 15, 140, '揮下巨人的大劍，20% 機率造成 1.8 倍傷害。', [['爆發', 'red']], 'gigante', { critBoost: .2, critMult: 1.8 }),
    S('巨盾格擋', 'support', 6, 0, '舉起巨大的圓盾：接下來 2 回合受到的傷害 -50%，並把受到傷害的 30% 反彈給對手。', [['減傷', 'blue'], ['反傷', 'gold']], 'haki', { damageReductionTurns: 2, damageReductionValue: .5, thornTurns: 2, thornRatio: .3 }),
    S('艾爾巴夫的戰吼', 'support', 4, 0, '巨人戰士的怒吼響徹戰場：攻擊 +2，40% 使對手恐懼 1 回合。', [['強化', 'gold'], ['恐懼', 'gold']], 'voice', { selfBuffAtk: 2, fearChance: .4, fearTurns: 1 }),
    S('百年決鬥', 'attack', 8, 0, '一百年來從未停下的連續劍擊，攻擊 2～5 次（每次威力 70），30% 使對手破防 2 回合。', [['連擊', 'red'], ['破防', 'red']], 'barrage', { multiHitNormal: [2, 5], perHitPower: 70, armorBreakChance: .3, armorBreakTurns: 2 }),
    S('霸國', 'attack', 2, 200, '全能力 +1，揮舞巨劍與巨斧放出巨大的衝擊波——威力足以貫穿吞島怪獸的腹部，連衝擊產生的氣流都能粉碎巨物：造成 4～8 倍傷害，無視並擊破護盾。', [['奧義', 'gold'], ['破盾', 'blue']], 'quake', { statUpAll: 1, randomMultiplierRange: [4, 8], ignoreShield: true, shieldBreak: true }, true)
  ]);
  C('koza', { no: 125, name: '寇沙', title: '叛亂軍首領', types: ['格鬥'], maxHp: 1200, baseSpeed: 104, battleScale: .75, ai: 'balanced', cardPos: '52% 10%',
    desc: '阿拉巴斯坦叛亂軍的首領，薇薇的兒時玩伴。為了在乾旱中活下去而拿起武器，最後與薇薇一起阻止了戰爭。' }, [
    S('叛亂軍之劍', 'attack', 14, 110, '扛起長劍劈下，30% 使對手流血 2 回合（每回合 5%）。', [['流血', 'red']], 'sandslash', { dotChance: .3, dotTurns: 2, dotRatio: .05, dotLabel: '流血' }),
    S('守護這個國家', 'support', 5, 0, '為了國家而戰的覺悟：攻擊 +1、防禦 +1，回復 15% 體力。', [['強化', 'gold'], ['回復', 'green']], 'voice', { selfBuffAtk: 1, selfBuffDef: 1, healRatio: .15 }),
    S('綠洲的誓言', 'attack', 2, 190, '想起和薇薇在尤巴許下的約定，全力一擊：30% 機率造成 2 倍傷害，30% 使對手恐懼 1 回合。', [['奧義', 'gold'], ['恐懼', 'gold']], 'sandslash', { critBoost: .3, critMult: 2, fearChance: .3, fearTurns: 1 }, true)
  ]);
  Object.assign(CHAR_RARITY, { brook: 'SSR', tama: 'C', dorry: 'SR', koza: 'RR' });
  Object.assign(CHAR_OBTAIN, {
    brook: { boss: 0, eventOnly: true, npc: '僅能用碎片兌換（限定活動，目前沒有開放中的活動）' },
    tama: { boss: 0, reward: 'wano', npc: '和之國篇 NPC・通關後免費加入' },
    dorry: { boss: 0, eventOnly: true, npc: '巨人篇 NPC・僅能從限定抽獎池取得（目前沒有開放中的活動）' },
    koza: { boss: 0, reward: 'alabasta', npc: '阿拉巴斯坦篇 NPC・通關後免費加入' }
  });
  /* 已經通關的玩家：補發這次新增的通關獎勵角色 */
  window.addEventListener('DOMContentLoaded', () => setTimeout(() => { try { const d = SAVE.data, got = []; [['tama', 'wano'], ['koza', 'alabasta']].forEach(([cid, ch]) => { const st = d.chapters && d.chapters[ch]; if (st && st.cleared && !owned(cid)) { addCrew(cid, 10); got.push({ char: cid }); } });
    if (got.length) { SAVE.save(); if (window.queueWelcome) queueWelcome(got); } } catch (e) { } }, 2500));
  const after = (a, ids) => { ids.forEach(id => { const k = CHARACTER_ORDER.indexOf(id); if (k >= 0) CHARACTER_ORDER.splice(k, 1); }); const i = CHARACTER_ORDER.indexOf(a); CHARACTER_ORDER.splice(i < 0 ? CHARACTER_ORDER.length : i + 1, 0, ...ids); };
  after('moria', ['brook']); after('kinemon', ['tama']); after('loki', ['dorry']); after('vivi', ['koza']);
})();
