/* v89：稀有度八階（UR＞SSR＞SR＞RRR＞RR＞R＞U＞C，UR+ 仍在最上面）、新角色（克比三版本、甚平、錦衛門、懷帕、瑪琪諾）、既有角色等級調整。 */
(function () {
  const V = 89, img = id => `assets/chars/${id}.webp?v=${V}`, face = id => `assets/chars/${id}_face.webp?v=${V}`;
  const S = (name, type, pp, power, desc, tags, anima, effect, ult) => Object.assign({ name, type, pp, maxPP: pp, power, accuracy: 100, desc, tags, anima, effect: effect || {} }, ult ? { ultimate: true } : {});
  const C = (id, o, skills) => { CHARACTERS[id] = Object.assign({ id, image: img(id), avatar: face(id), ultimateBg: img(id), scale: .85, worldScale: .9, ai: 'balanced' }, o, { skills }); if (!CHARACTER_ORDER.includes(id)) CHARACTER_ORDER.push(id); };

  /* ---------- 新角色 ---------- */
  C('coby0', { no: 115, name: '初登場克比', title: '想當海軍的少年', types: ['格鬥'], maxHp: 820, baseSpeed: 90, battleScale: .4, ai: 'balanced',
    desc: '被亞爾麗塔逼著在海賊船上做了兩年雜工的少年。遇見魯夫之後，終於鼓起勇氣說出「我要成為海軍」。' }, [
    S('木棍揮擊', 'attack', 15, 70, '握緊木棍拚命揮下，20% 機率造成 1.6 倍傷害。', [['爆發', 'red']], 'punch', { critBoost: .2, critMult: 1.6 }),
    S('拚命逃跑', 'support', 6, 0, '用打雜練出來的腳力逃開：閃避下一次攻擊，速度 +1。', [['閃避', 'blue'], ['強化', 'gold']], 'skywalk', { dodgeTurns: 1, selfBuffSpd: 1 }),
    S('我要成為海軍！', 'support', 3, 0, '對著自己大喊出夢想：回復 30% 體力、攻擊 +1，並清除自身的負面狀態。', [['回復', 'green'], ['強化', 'gold']], 'voice', { healRatio: .3, selfBuffAtk: 1, clearSelfDebuffs: true })
  ]);
  C('koby_mf', { no: 116, name: '克比（頂上戰爭）', title: '海軍見習生', types: ['格鬥'], maxHp: 1150, baseSpeed: 104, battleScale: .6, ai: 'balanced',
    desc: '在卡普手下接受特訓的海軍見習生。頂上戰爭的最後，他站到赤犬面前大喊「請停止戰鬥」，用一句話改變了戰場。' }, [
    S('剃', 'attack', 15, 95, '用六式「剃」高速踏地衝到對手面前出拳，15% 機率使對手麻痺 1 回合。', [['麻痺', 'gold']], 'rokushiki', { skipAttackChance: .15, skipAttackTurns: 1 }),
    S('拳骨', 'attack', 10, 130, '卡普親傳的拳骨，25% 機率使對手暈眩 1 回合。', [['暈眩', 'gold']], 'shigan', { skipAttackChance: .25, skipAttackTurns: 1, ccKind: 'paralyze' }),
    S('見聞色霸氣', 'support', 6, 0, '聽見戰場上所有人的聲音：閃避接下來 1 次攻擊，速度 +1，下一次攻擊必定暴擊（1.5 倍）。', [['閃避', 'blue'], ['強化', 'gold']], 'haki', { dodgeTurns: 1, selfBuffSpd: 1, critBoost: 1, critMult: 1.5 }),
    S('請停止戰鬥！', 'support', 2, 0, '用盡全身的勇氣大喊：70% 使對手恐懼 1 回合，對手全能力 -1，自身回復 20% 體力。', [['恐懼', 'gold'], ['弱化', 'red'], ['回復', 'green']], 'voice', { fearChance: .7, fearTurns: 1, enemyAllDown: 1, healRatio: .2 }, true)
  ]);
  C('koby_hc', { no: 117, name: '克比（蜂巢島）', title: '海軍上校・SWORD', types: ['格鬥'], maxHp: 1500, baseSpeed: 114, battleScale: .65, ai: 'aggressive',
    desc: '被稱為「英雄」的海軍上校，也是秘密部隊 SWORD 的一員。被黑鬍子海賊團抓到蜂巢島，靠著自己的拳頭與卡普的救援突破重圍。' }, [
    S('剃・連拳', 'attack', 15, 0, '以「剃」連續突進出拳 2～4 次，每次威力 60。', [['連擊', 'red']], 'barrage', { multiHitNormal: [2, 4], perHitPower: 60 }),
    S('月步', 'support', 6, 0, '踢著空氣在天上奔跑：閃避下一次攻擊、速度 +1，下一次攻擊傷害 1.5 倍。', [['閃避', 'blue'], ['強化', 'gold']], 'skywalk', { dodgeTurns: 1, selfBuffSpd: 1, nextAttackMult: 1.5, nextAttackMultTurns: 2 }),
    S('見聞色・預知', 'support', 4, 0, '聽見對手下一步的「聲音」：接下來 2 次攻擊全部閃避。', [['閃避', 'blue']], 'haki', { dodgeTurns: 2 }),
    S('武裝色・鐵拳', 'attack', 8, 150, '包覆武裝色霸氣的直拳，無視護盾；30% 機率使對手破防 2 回合。', [['破防', 'red'], ['無視護盾', 'blue']], 'shigan', { ignoreShield: true, armorBreakChance: .3, armorBreakTurns: 2 }),
    S('正直拳骨', 'attack', 2, 200, '「正直」的霸氣拳骨（Honesty Impact）：無視護盾，30% 機率造成 2.5 倍傷害，40% 使對手暈眩 1 回合。', [['奧義', 'gold'], ['暈眩', 'gold']], 'shigan', { ignoreShield: true, critBoost: .3, critMult: 2.5, stunChance: .4, stunTurns: 1 }, true)
  ]);
  C('jinbe', { no: 118, name: '甚平', title: '海俠・前王下七武海', types: ['格鬥'], maxHp: 1950, baseSpeed: 98, battleScale: .9, ai: 'aggressive',
    desc: '魚人空手道的高手，被稱為「海俠」的前王下七武海。為了救艾斯捨棄了七武海的稱號，後來成為草帽海賊團的舵手。爆發攻擊型角色。' }, [
    S('擊水', 'attack', 15, 0, '把水滴當成子彈彈出，攻擊 3～5 次，每次威力 45。', [['連擊', 'red']], 'barrage', { multiHitNormal: [3, 5], perHitPower: 45 }),
    S('唐草瓦正拳', 'attack', 10, 160, '透過空氣中的水分把衝擊傳進對手體內：無視護盾，35% 機率造成 2 倍傷害。', [['爆發', 'red'], ['無視護盾', 'blue']], 'shigan', { ignoreShield: true, critBoost: .35, critMult: 2 }),
    S('武賴貫', 'attack', 8, 190, '把大量海水凝成水塊砸向對手，50% 機率使對手破防 2 回合。', [['破防', 'red']], 'poseidon', { armorBreakChance: .5, armorBreakTurns: 2 }),
    S('鬼瓦正拳', 'attack', 6, 240, '魚人空手道的奧秘，全力正拳：30% 機率造成 2.2 倍傷害，30% 使對手暈眩 1 回合。', [['爆發', 'red'], ['暈眩', 'gold']], 'shigan', { critBoost: .3, critMult: 2.2, skipAttackChance: .3, skipAttackTurns: 1, ccKind: 'paralyze' }),
    S('海流過肩摔', 'attack', 2, 200, '抓住海流的力量把對手整個摔出去，造成 4～7 倍傷害，50% 使對手恐懼 1 回合。', [['奧義', 'gold'], ['恐懼', 'gold']], 'kaifu', { randomMultiplierRange: [4, 7], fearChance: .5, fearTurns: 1 }, true)
  ]);
  C('kinemon', { no: 119, name: '錦衛門', title: '赤鞘九俠・狐火流', types: ['格鬥', '超能'], maxHp: 1300, baseSpeed: 100, battleScale: .65, ai: 'balanced',
    desc: '光月家的家臣、赤鞘九俠之首。狐火流的劍士，能斬斷火焰；吃了服服果實，可以把任何東西變成衣服。' }, [
    S('狐火流・焰裂', 'attack', 12, 120, '斬開火焰、把火焰收進刀中再劈出，40% 使對手燒傷 2 回合。', [['燒傷', 'red']], 'sanzen', { burnChance: .4, burnTurns: 2 }),
    S('狐火流・斬火', 'support', 5, 0, '斬斷迎面而來的火焰與攻擊：接下來 2 回合受到的傷害 -40%。', [['減傷', 'blue']], 'shishi', { damageReductionTurns: 2, damageReductionValue: .4 }),
    S('服服果實・變裝術', 'support', 4, 0, '用服服果實把身邊的東西變成衣服、喬裝成別人：出現 1 個替身承受攻擊，速度 +1。', [['替身', 'blue'], ['強化', 'gold']], 'transform', { decoys: 1, selfBuffSpd: 1 }),
    S('狐火流・燃燒斬', 'attack', 3, 210, '燃起狐火的必殺一刀：無視護盾，必定使對手燒傷 3 回合。', [['奧義', 'gold'], ['燒傷', 'red']], 'ifrit', { ignoreShield: true, burnChance: 1, burnTurns: 3 }, true)
  ]);
  C('wiper', { no: 120, name: '懷帕', title: '香迪亞的戰士', types: ['格鬥'], maxHp: 1250, baseSpeed: 106, battleScale: .6, ai: 'aggressive',
    desc: '香迪亞族的戰士，為了奪回祖先的土地，四百年來族人一直在戰鬥。滑著噴射滑板，扛著燃燒火箭筒，必要時會使出傷害自己的「排擊貝」。' }, [
    S('燃燒火箭筒', 'attack', 10, 140, '扛起火箭筒噴出火焰，40% 使對手燒傷 2 回合。', [['燒傷', 'red']], 'karyu', { burnChance: .4, burnTurns: 2 }),
    S('衝擊貝', 'support', 5, 0, '用衝擊貝吸收衝擊：下一次受到的攻擊以 1.5 倍反彈。', [['反彈', 'gold']], 'release', { reflectTurns: 1, reflectMultiplier: 1.5 }),
    S('排擊貝', 'attack', 2, 320, '衝擊貝的十倍威力，連自己的身體也會受傷：無視護盾造成巨大傷害，自身接下來 3 回合每回合失去 8% 體力。', [['奧義', 'gold'], ['無視護盾', 'blue']], 'quake', { ignoreShield: true, selfDot: [3, .08] }, true)
  ]);
  C('makino', { no: 121, name: '瑪琪諾', title: '風車村的酒館老闆娘', types: ['超能'], maxHp: 760, baseSpeed: 84, battleScale: .4, ai: 'support',
    desc: '風車村「PARTYS BAR」的老闆娘。從魯夫小時候就一直照顧他，也是紅髮海賊團在東海最信任的朋友。' }, [
    S('托盤敲擊', 'attack', 12, 60, '用酒館的托盤敲下去，20% 使對手暈眩 1 回合。', [['暈眩', 'gold']], 'punch', { skipAttackChance: .2, skipAttackTurns: 1, ccKind: 'paralyze' }),
    S('老闆娘的招待', 'support', 4, 0, '端上一盤熱騰騰的料理：回復 35% 體力，接下來 2 回合每回合再回復 5%。', [['回復', 'green']], 'cook', { healRatio: .35, regenTurns: 2, regenRatio: .05 })
  ]);

  /* 卡片裁切焦點（立繪是橫幅或臉不在上方時） */
  Object.assign(CHARACTERS.whitebeard, { cardPos: '50% 14%' }); if (CHARACTERS.jinbe) CHARACTERS.jinbe.cardPos = '52% 26%'; if (CHARACTERS.wiper) CHARACTERS.wiper.cardPos = '58% 20%'; if (CHARACTERS.coby0) CHARACTERS.coby0.cardPos = '46% 14%';
  /* ---------- 稀有度 ---------- */
  Object.assign(CHAR_RARITY, { coby0: 'C', koby_mf: 'RR', koby_hc: 'SR', jinbe: 'SSR', kinemon: 'RR', wiper: 'RR', makino: 'C',
    robin: 'SSR', mayor: 'C', marine: 'C', vergo: 'R', york: 'RRR' });
  window.RAR_ORDER = ['C', 'U', 'R', 'RR', 'RRR', 'SR', 'SSR', 'UR', 'UR+'];
  if (GAME_SETTINGS.rarityScale) Object.assign(GAME_SETTINGS.rarityScale, { C: 1.1, U: 1.15, RR: 1.2, RRR: 1.15 });
  if (typeof SELL_VALUE !== 'undefined') { Object.assign(SELL_VALUE.berry, { C: 800, U: 1200, RR: 3000, RRR: 4500 }); Object.assign(SELL_VALUE.exp, { C: 600, U: 900, RR: 2200, RRR: 3300 }); }
  /* 一般召喚池加入 C 級（瑪琪諾）：只多加 C 的份額，UR／SSR／SR 的實際出率不變 */
  if (typeof CHAR_RATE_BY_RARITY !== 'undefined') { CHAR_RATE_BY_RARITY.C = .008; GAME_SETTINGS.charRate = +(GAME_SETTINGS.charRate + .008).toFixed(4); if (typeof RARITY !== 'undefined' && RARITY.N) RARITY.N.rate = +(RARITY.N.rate - .008).toFixed(4); }

  /* ---------- 取得方式 ---------- */
  Object.assign(CHAR_OBTAIN, {
    coby0: { boss: 0, reward: 'east', npc: '東海篇 NPC・通關後免費加入' }, koby_mf: { boss: 0, reward: 'marineford', npc: '頂上戰爭篇 NPC・通關後免費加入' },
    kinemon: { boss: 0, reward: 'wano', npc: '和之國篇 NPC・通關後免費加入' }, wiper: { boss: 0, reward: 'skypiea', npc: '空島篇 NPC・通關後免費加入' },
    koby_hc: { boss: 0, npc: '蜂巢島篇 NPC（僅能從懸賞召喚取得）' }, jinbe: { boss: 0, npc: '頂上戰爭篇 NPC・前七武海（僅能從懸賞召喚取得）' }, makino: { boss: 0, npc: '風車村 NPC（一般召喚池）' }
  });
  /* 已經通關的玩家：補發這次新增的通關獎勵角色 */
  window.addEventListener('DOMContentLoaded', () => setTimeout(() => { try { const d = SAVE.data, got = []; Object.entries(CHAR_OBTAIN).forEach(([cid, o]) => { if (!['east', 'marineford', 'wano', 'skypiea'].includes(o.reward)) return; const st = d.chapters && d.chapters[o.reward]; if (st && st.cleared && !owned(cid)) { addCrew(cid, 10); got.push({ char: cid }); } });
    if (got.length) { SAVE.save(); if (window.queueWelcome) queueWelcome(got); } } catch (e) { } }, 2500));

  /* 圖鑑順序：放在相關角色旁邊 */
  const after = (a, ids) => { ids.forEach(id => { const k = CHARACTER_ORDER.indexOf(id); if (k >= 0) CHARACTER_ORDER.splice(k, 1); }); const i = CHARACTER_ORDER.indexOf(a); CHARACTER_ORDER.splice(i < 0 ? CHARACTER_ORDER.length : i + 1, 0, ...ids); };
  after('luffy0', ['coby0', 'makino']); after('garp_mf', ['koby_mf', 'jinbe']); after('garp_hc', ['koby_hc']); after('yamato', ['kinemon']); after('enel', ['wiper']);
})();
