/* v92：多利升 SSR（攻擊型）、洛基升 UR+（限定抽獎池）、新角色布洛基（SSR・赤鬼・防禦型，立繪準備中）、多利＋布洛基羈絆。 */
(function () {
  const PEND = 'assets/chars/brogy.webp?v=93', PFACE = 'assets/chars/brogy_face.webp?v=93';
  const S = (name, type, pp, power, desc, tags, anima, effect, ult) => Object.assign({ name, type, pp, maxPP: pp, power, accuracy: 100, desc, tags, anima, effect: effect || {} }, ult ? { ultimate: true } : {});
  /* --- 多利：SSR、攻擊型 --- */
  if (CHARACTERS.dorry) { const d = CHARACTERS.dorry; Object.assign(d, { maxHp: 1850, baseSpeed: 96, statScale: 1.05, desc: d.desc.replace(/。$/, '') + '。攻擊型角色：大劍的每一擊都帶著百年決鬥磨出來的力量。' });
    const sk = n => d.skills.find(x => x.name === n); if (sk('巨劍劈砍')) Object.assign(sk('巨劍劈砍'), { power: 165, desc: '揮下巨人的大劍，25% 機率造成 2 倍傷害。', effect: { critBoost: .25, critMult: 2 } });
    if (sk('百年決鬥')) Object.assign(sk('百年決鬥'), { desc: '一百年來從未停下的連續劍擊：攻擊 1～100 次（每次威力 6），之後 3 回合每回合攻擊 +1。', tags: [['百連擊', 'red'], ['強化', 'gold']], effect: { multiHitNormal: [1, 100], perHitPower: 6, rampAtkTurns: 3 } }); }
  CHAR_RARITY.dorry = 'SSR';
  /* --- 洛基：UR+、只能從限定抽獎池取得 --- */
  CHAR_RARITY.loki = 'UR+'; CHAR_OBTAIN.loki = Object.assign({}, CHAR_OBTAIN.loki || {}, { boss: 0, eventOnly: true, npc: '巨人篇・僅能從限定抽獎池取得（目前沒有開放中的活動）' });
  /* --- 布洛基：SSR、赤鬼、防禦型（技能與多利相似，偏重防守） --- */
  CHARACTERS.brogy = { id: 'brogy', name: '布洛基', title: '赤鬼', types: ['格鬥'], image: 'assets/chars/brogy.webp?v=93', avatar: 'assets/chars/brogy_face.webp?v=93', ultimateBg: 'assets/chars/brogy.webp?v=93', scale: .85, worldScale: .9, ai: 'balanced', maxHp: 2300, baseSpeed: 86, battleScale: 1.8, statScale: 1.05, cardPos: '50% 10%',
    desc: '艾爾巴夫的巨人戰士「赤鬼」布洛基，多利一百年的決鬥對手。揮舞巨斧、舉著大盾，是能扛住任何攻擊的防禦型戰士。技能和多利幾乎相同，多利偏攻擊、布洛基偏防守。',
    skills: [
      S('巨斧劈砍', 'attack', 15, 160, '揮下巨人的大斧：25% 機率造成 1.8 倍傷害，40% 使對手防禦 -1（2 回合），自身防禦 +1。', [['爆發', 'red'], ['降防', 'blue'], ['強化', 'gold']], 'gigante', { critBoost: .25, critMult: 1.8, enemyDefDownChance: [.4, [1, 1], 2], selfBuffDef: 1 }),
      S('巨盾格擋', 'support', 6, 0, '把大盾立在身前：接下來 2 回合受到的傷害 -60%，並把受到傷害的 40% 反彈給對手。', [['減傷', 'blue'], ['反傷', 'gold']], 'haki', { damageReductionTurns: 2, damageReductionValue: .6, thornTurns: 2, thornRatio: .4 }),
      S('艾爾巴夫的戰吼', 'support', 4, 0, '巨人戰士的怒吼：防禦 +2，回復 50% 體力，30% 使對手恐懼 1 回合。', [['強化', 'gold'], ['回復', 'green'], ['恐懼', 'gold']], 'voice', { selfBuffDef: 2, healRatio: .5, fearChance: .3, fearTurns: 1 }),
      S('百年決鬥', 'attack', 8, 0, '一百年來從未停下的斧擊：攻擊 1～100 次（每次威力 5），之後 3 回合每回合防禦 +1。', [['百連擊', 'red'], ['強化', 'gold']], 'barrage', { multiHitNormal: [1, 100], perHitPower: 5, rampDefTurns: 3 }),
      S('霸國', 'attack', 2, 180, '全能力 +1，和多利一起揮舞巨斧與巨劍放出的衝擊波：造成 3～6 倍傷害、無視並擊破護盾，之後 2 回合受到的傷害 -30%。', [['奧義', 'gold'], ['破盾', 'blue'], ['減傷', 'blue']], 'quake', { statUpAll: 1, randomMultiplierRange: [3, 6], ignoreShield: true, shieldBreak: true, damageReductionTurns: 2, damageReductionValue: .3 }, true)
    ] };
  if (!CHARACTER_ORDER.includes('brogy')) CHARACTER_ORDER.push('brogy');
  CHAR_RARITY.brogy = 'SSR'; CHAR_OBTAIN.brogy = { boss: 0, eventOnly: true, npc: '巨人篇 NPC・僅能從限定抽獎池取得（目前沒有開放中的活動）' };
  /* --- 羈絆：艾爾巴夫的雙鬼（同一個陣容中：受到傷害 -20%、造成傷害 +20%；不受一般羈絆的 10% 上限限制） --- */
  if (typeof COLLECTION_SETS !== 'undefined' && !COLLECTION_SETS.some(s => s.id === 'elbaf_oni')) COLLECTION_SETS.push({ id: 'elbaf_oni', need: 2, name: '艾爾巴夫的雙鬼', members: ['dorry', 'brogy'], bonus: { dr: 20, atk: 20 }, capFree: true });
  /* v94：立繪縮放與鏡射快速更正 */
  [['whitebeard', 2.1], ['shanks', .95], ['bigmom', 1.45], ['buggy', 1.1]].forEach(([id, v]) => { if (CHARACTERS[id]) CHARACTERS[id].battleScale = v; });
  if (CHARACTERS.monet) CHARACTERS.monet.faceLeft = !CHARACTERS.monet.faceLeft;
})();
