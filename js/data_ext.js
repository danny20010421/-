/* v63 資料擴充：新角色、新篇章（恐怖三桅帆船、蛋頭島、德雷斯羅薩）、蜂巢島篇改回原作、皇帝領海、勇者之塔 250 層。
   載入順序：緊接在 js/data.js 之後（app.js 之前），這樣海圖節點才會包含新篇章。 */
(function () {
  const V = 64, img = id => `assets/chars/${id}.webp?v=${V}`, face = id => `assets/chars/${id}_face.webp?v=${V}`;
  const S = (name, type, pp, power, desc, tags, anima, effect, ult) => Object.assign({ name, type, pp, maxPP: pp, power, accuracy: 100, desc, tags, anima, effect: effect || {} }, ult ? { ultimate: true } : {});
  const C = (id, o, skills) => { CHARACTERS[id] = Object.assign({ id, image: img(o.art || id), avatar: face(o.art || id), ultimateBg: img(o.art || id), scale: .9, worldScale: .95, ai: 'balanced' }, o, { skills }); delete CHARACTERS[id].art; };

  /* ================= 四皇（UR+，限皇帝領海挑戰獲得） ================= */
  C('whitebeard', { no: 50, name: '愛德華·紐蓋特', title: '四皇 白鬍子', types: ['超能', '格鬥'], maxHp: 2400, baseSpeed: 96, scale: 1.05, battleScale: 1.0, ai: 'aggressive',
    desc: '震震果實能力者，被稱為「世界最強的男人」。能讓空氣與大海產生裂痕，把船員全都當成自己的兒子。' }, [
    S('海闊天空', 'support', 3, 0, '全能力 +1，回復 20% 體力，下回合攻擊傷害提升 2～10 倍。', [['強化', 'gold'], ['回復', 'green']], 'shuryu', { statUpAll: 1, healRatio: .2, nextAttackMult: [2, 10], nextAttackMultTurns: 2 }),
    S('海震', 'attack', 5, 26, '對敵人進行 1～50 次震動衝擊波；若對手有護盾，護盾直接失效。', [['連擊', 'red'], ['破盾', 'blue']], 'quake', { multiHitNormal: [1, 50], perHitPower: 26, shieldBreak: true }),
    S('空震', 'attack', 5, 170, '強力衝擊 1～3 次，25% 使對手暈眩 1 回合，並附加破防 3 回合；對手體力高於 80% 時威力再提升 1.2～4 倍。', [['重擊', 'red'], ['暈眩', 'gold'], ['破防', 'blue']], 'quake', { multiHitNormal: [1, 3], perHitPower: 170, stunChance: .25, stunTurns: 1, armorBreakChance: 1, armorBreakTurns: 3, hpAboveBonus: [.8, [1.2, 4]] }),
    S('霸王色', 'support', 3, 0, '強制控場：對手全能力 -2；解除對手的變身；清除自身負面狀態；使對手虛弱 1 回合。對手稀有度 SR 以下時無法攻擊 1 回合；稀有度 R、或等級 LV80 以下時體力直接歸 0（BOSS 改為受到 3 倍傷害）。', [['霸王色', 'gold'], ['控場', 'blue']], 'haki', { haoshoku: true }),
    S('老爹', 'support', 1, 0, '只能使用 1 次（藥水無法補充）。出戰陣容全員出場時全能力 +1，首次攻擊必定 1～5 倍；全員第一次被打到瀕死時保證留下 1 體力。白鬍子之後每回合回復 5% 體力，但受到的傷害 +3%。', [['光環', 'gold'], ['保命', 'green']], 'awaken', { dadAura: true, noRestore: true }, true)
  ]);
  C('shanks', { no: 45, name: '紅髮傑克斯', title: '四皇 紅髮', types: ['格鬥', '超能'], maxHp: 2200, baseSpeed: 118, scale: .95, battleScale: 1.0, ai: 'aggressive',
    desc: '紅髮海賊團船長，把草帽交給魯夫的男人。擁有世界頂尖的霸王色霸氣與劍術。' }, [
    S('強者波動', 'attack', 6, 24, '對對手進行 1～50 次斬擊；若對手有護盾，每一擊有 20% 機率化為真實攻擊直接打中本體。', [['連擊', 'red'], ['真實', 'gold']], 'onigiri', { multiHitNormal: [1, 50], perHitPower: 24, trueHitChance: .2 }),
    S('強者對決', 'attack', 5, 30, '全能力 +1，回復 15% 體力，進行 1～30 次普通斬擊；自身體力高於 80% 時再追加 1～10 次。', [['強化', 'gold'], ['連擊', 'red']], 'sanzen', { statUpAll: 1, healRatio: .15, multiHitNormal: [1, 30], perHitPower: 30, selfHpAboveExtra: [.8, [1, 10], 30] }),
    S('給我一個面子', 'attack', 5, 160, '回復 20% 體力，強力攻擊 1～3 次，25% 使對手暈眩 1 回合，並使對手虛弱 2 回合。', [['回復', 'green'], ['暈眩', 'gold'], ['虛弱', 'gray']], 'haki', { healRatio: .2, multiHitNormal: [1, 3], perHitPower: 160, stunChance: .25, stunTurns: 1, weakChance: 1, weakTurns: 2 }),
    S('霸王色', 'support', 3, 0, '強制控場：對手全能力 -2；解除對手的變身；清除自身負面狀態；使對手虛弱 1 回合。對手稀有度 SR 以下時無法攻擊 1 回合；稀有度 R、或等級 LV80 以下時體力直接歸 0（BOSS 改為受到 3 倍傷害）。', [['霸王色', 'gold'], ['控場', 'blue']], 'haki', { haoshoku: true }),
    S('神避', 'attack', 1, 100, '只能使用 1 次（藥水無法補充）。造成 5～50 倍傷害（無視護盾），60% 直接秒殺（BOSS 改為 3 倍傷害）；30% 使對手暈眩、虛弱並恐懼。擊倒對手時，下一位出場的對手暈眩 1 回合。之後 2 回合，紅髮造成的傷害 5～15% 轉為自身體力。', [['神避', 'gold'], ['秒殺', 'red'], ['吸血', 'green']], 'ashura', { randomMultiplierRange: [5, 50], ignoreShield: true, executeChance: .6, kamusari: true, noRestore: true }, true)
  ]);
  /* 凱多、BIG MOM 升為 UR+：強化數值與技能，改為皇帝領海挑戰獲得 */
  { const K = CHARACTERS.kaido; K.maxHp = 2050; K.baseSpeed = 104; K.title = '四皇 百獸'; const ks = K.skills;
    Object.assign(ks[0], { power: 28, desc: '普通攻擊 1～30 次，50% 使對手麻痺 1 回合，造成傷害的 50% 轉為自身回復。' }); ks[0].effect.multiHitNormal = [1, 30]; ks[0].effect.perHitPower = 28;
    Object.assign(ks[1], { desc: '全能力 +1，清除自身負面狀態，下回合攻擊傷害 5～7 倍。' }); Object.assign(ks[1].effect, { nextAttackMult: [5, 7], clearSelfDebuffs: true });
    Object.assign(ks[2], { power: 130, desc: '12% 直接秒殺對手；否則 25% 打出 8 倍傷害，並 25% 使對手暈眩 1 回合。' }); Object.assign(ks[2].effect, { executeChance: .12, jackpotChance: .25, stunChance: .25, stunTurns: 1 });
    Object.assign(ks[3], { desc: '強力攻擊 3～6 次，每次造成對手最大體力 6%（可累積）；50% 使對手麻痺 1 回合，並附加破防 3 回合。' }); Object.assign(ks[3].effect, { fixedLightHitsRange: [[3, 6], .06], armorBreakChance: 1, armorBreakTurns: 3 });
    Object.assign(ks[4], { power: 32, desc: '次數 1 次（可用藥水補充）。3% 機率造成 100 倍傷害，否則普通攻擊 15～50 次；獲得等同自身當前體力的護盾，90% 使對手燒傷 3 回合。' }); Object.assign(ks[4].effect, { jackpotChance: .03, elseHits: [15, 50], perHitPower: 32, burnChance: .9 }); }
  { const B = CHARACTERS.bigmom; B.maxHp = 2600; B.baseSpeed = 88; B.title = '四皇 BIG MOM'; const bs = B.skills;
    Object.assign(bs[0], { power: 170, desc: '巨大火球大範圍焚燒敵人，造成強力傷害並燒傷對手 3 回合；對已燒傷的對手傷害 ×1.3。' }); Object.assign(bs[0].effect, { burnTurns: 3, burnedBonusMult: 1.3 });
    Object.assign(bs[1], { power: 165, desc: '強力雷電攻擊，35% 機率使對手暈眩 1 回合；接下來 2 回合對手的攻擊有 50% 機率落空。' }); delete bs[1].effect.skipAttackChance; delete bs[1].effect.skipAttackTurns; delete bs[1].effect.ccKind; Object.assign(bs[1].effect, { stunChance: .35, stunTurns: 1 });
    Object.assign(bs[2], { power: 190, desc: '恐怖的斬擊波；50% 機率額外扣除對手當前體力的 30%，並附加破防 2 回合。' }); Object.assign(bs[2].effect, { armorBreakChance: 1, armorBreakTurns: 2 });
    Object.assign(bs[3], { desc: '全能力 +1，清除對手的能力提升；接下來 3 回合受到的傷害 -20～40%，獲得當前體力 25% 的護盾，並 2 回合免疫異常狀態。' }); Object.assign(bs[3].effect, { selfShieldCurrentHpRatio: .25, immuneTurns: 2 });
    Object.assign(bs[4], { desc: '恢復全部體力，並隨機施放「普羅米修斯」「宙斯」「拿破崙」其中一招，威力為 2～6 倍。' }); bs[4].effect.randomSkillCast = { from: [0, 1, 2], mult: [2, 6] }; }

  /* ================= 王下七武海／海軍大將 ================= */
  C('doflamingo', { no: 26, name: '唐吉訶德·多佛朗明哥', title: '天夜叉', types: ['超能'], maxHp: 1650, baseSpeed: 116, scale: .9, statScale: 1.06, ai: 'control',
    desc: '線線果實能力者，王下七武海、德雷斯羅薩國王，地下世界的掮客「Joker」。能用絲線操縱他人、切斷一切。' }, [
    S('超過擊球', 'attack', 12, 135, '把絲線搓成灼熱的鞭子抽打對手，30% 使對手燒傷 2 回合。', [['燒傷', 'red']], 'whip', { burnChance: .3, burnTurns: 2 }),
    S('寄生線', 'support', 4, 0, '用絲線操縱對手的身體：對手 1 回合無法使用技能，攻擊 -1（2 回合）。', [['操縱', 'gold'], ['降攻', 'blue']], 'darkpull', { skipAttackTurns: 1, ccKind: 'paralyze', enemyAtkDownChance: [[1, 1], 1, 2] }),
    S('五色線', 'attack', 8, 42, '五指射出的絲線連斬 5 次，50% 使對手流血 3 回合（每回合 5%）。', [['五連擊', 'red'], ['流血', 'red']], 'sanzen', { multiHitNormal: [5, 5], perHitPower: 42, dotChance: .5, dotTurns: 3, dotRatio: .05, dotLabel: '流血' }),
    S('蜘蛛巢', 'support', 5, 0, '用絲線織出防護網：獲得最大體力 25% 的護盾，2 回合內受到攻擊時反彈 40% 傷害。', [['護盾', 'blue'], ['反彈', 'gold']], 'kagamiyama', { selfShieldMaxHpRatio: .25, thornTurns: 2, thornRatio: .4 }),
    S('鳥籠', 'attack', 2, 0, '用絲線把整座國家關進收縮的鳥籠：連續切割 4～8 次，每次造成對手最大體力 4%；對手全能力 -1，2 回合無法回復體力。', [['鳥籠', 'gold'], ['比例', 'red'], ['禁回復', 'gray']], 'naraku', { fixedLightHitsRange: [[4, 8], .04], enemyAllDown: 1, healBlockTurns: 2 }, true)
  ]);
  C('kuma', { no: 27, name: '巴索羅繆·大熊', title: '暴君', types: ['超能'], maxHp: 1950, baseSpeed: 90, scale: .95, statScale: 1.08, ai: 'defensive',
    desc: '肉球果實能力者，王下七武海。手掌的肉球能彈開一切，包括空氣、痛苦與疲勞。' }, [
    S('肉球砲', 'attack', 12, 36, '用肉球彈出壓縮的空氣，連續攻擊 3～8 次。', [['連擊', 'red']], 'shigan', { multiHitNormal: [3, 8], perHitPower: 36 }),
    S('彈開', 'support', 5, 0, '用肉球彈開下一次攻擊，以 1.5 倍傷害返還；並回復 10% 體力。', [['反彈', 'gold'], ['回復', 'green']], 'balloon', { reflectTurns: 1, reflectMultiplier: 1.5, healRatio: .1 }),
    S('痛苦泡泡', 'attack', 4, 0, '把自己承受過的痛苦彈成泡泡丟給對手：造成等同自身已損失體力的傷害（最多對手最大體力 40%），並清除自身負面狀態。', [['痛苦', 'gold'], ['淨化', 'green']], 'darkpull', { selfLostHpDamage: [1, .4], clearSelfDebuffs: true }),
    S('熊之衝擊', 'attack', 5, 160, '把空氣壓縮到極限後引爆，造成強力傷害，30% 使對手恐懼 1 回合。', [['強力', 'red'], ['恐懼', 'gold']], 'quake', { fearChance: .3, fearTurns: 1 }),
    S('什麼都沒有發生', 'attack', 2, 100, '把敵人全身的疲勞與痛苦一口氣彈出：造成 6～14 倍傷害，50% 使對手無法攻擊 1 回合。', [['倍率', 'red'], ['控場', 'gold']], 'release', { randomMultiplierRange: [6, 14], skipAttackChance: .5, skipAttackTurns: 1, ccKind: 'fatigue' }, true)
  ]);
  C('kuma_eh', { no: 28, name: '巴索羅繆·大熊（蛋頭島）', title: '解放戰士', types: ['超能', '獸'], maxHp: 2050, baseSpeed: 102, scale: 1.05, battleScale: 1.05, ai: 'aggressive',
    desc: '失去自我意識的大熊，為了保護女兒波妮，憑著記憶與意志橫越大海、衝上蛋頭島，一拳揍向五老星。' }, [
    S('肉球砲', 'attack', 12, 45, '用肉球彈出壓縮的空氣，連續攻擊 3～8 次。', [['連擊', 'red']], 'shigan', { multiHitNormal: [3, 8], perHitPower: 45 }),
    S('痛苦轉移', 'attack', 5, 0, '把累積的痛苦全部打回去：造成自身已損失體力 1.2 倍的傷害（最多對手最大體力 45%），並回復 15% 體力。', [['痛苦', 'gold'], ['回復', 'green']], 'darkpull', { selfLostHpDamage: [1.2, .45], healRatio: .15 }),
    S('父親的鐵拳', 'attack', 5, 210, '為了女兒揮出的一拳：造成極強傷害，附加破防 3 回合，50% 使對手恐懼 1 回合。', [['重擊', 'red'], ['破防', 'blue'], ['恐懼', 'gold']], 'punch', { armorBreakChance: 1, armorBreakTurns: 3, fearChance: .5, fearTurns: 1 }),
    S('彈飛記憶', 'support', 4, 0, '全能力 +1，清除自身負面狀態，閃避下一次攻擊。', [['強化', 'gold'], ['閃避', 'blue']], 'wings', { statUpAll: 1, clearSelfDebuffs: true, dodgeTurns: 1 }),
    S('解放之熊衝擊', 'attack', 1, 110, '次數 1 次（藥水無法補充）。造成 8～20 倍傷害（無視護盾），造成傷害的 30% 回復到自己身上。', [['解放', 'gold'], ['無視護盾', 'blue'], ['吸血', 'green']], 'awaken', { randomMultiplierRange: [8, 20], ignoreShield: true, lifestealPost: .3, noRestore: true }, true)
  ]);
  C('kizaru', { no: 33, name: '黃猿', title: '海軍大將', types: ['雷電'], maxHp: 1560, baseSpeed: 128, scale: .95, statScale: 1.28, ai: 'aggressive',
    desc: '閃閃果實能力者，海軍大將波魯薩利諾。以光速移動與踢擊，「速度就是重量」。' }, [
    S('八尺瓊勾玉', 'attack', 10, 28, '從雙手射出大量光彈，連續攻擊 6～12 次。', [['連擊', 'gold']], 'lightning', { multiHitNormal: [6, 12], perHitPower: 28 }),
    S('天叢雲劍', 'attack', 10, 140, '以光凝成的劍斬擊，50% 附加破防 3 回合。', [['斬擊', 'red'], ['破防', 'blue']], 'flash', { armorBreakChance: .5, armorBreakTurns: 3 }),
    S('光速踢', 'attack', 8, 125, '以光速踢擊，50% 機率造成 2.2 倍傷害。', [['光速', 'gold'], ['爆發', 'red']], 'skywalk', { critBoost: .5, critMult: 2.2 }),
    S('八咫鏡', 'support', 4, 0, '以光反射瞬間移動：閃避下一次攻擊，下回合先制，回復 15% 體力。', [['閃避', 'blue'], ['先制', 'gold'], ['回復', 'green']], 'wings', { dodgeTurns: 1, selfPriority: 1, healRatio: .15 }),
    S('閃光・天岩戶', 'attack', 2, 100, '全身化為刺眼的光芒爆發：造成 6～15 倍傷害；接下來 2 回合對手的攻擊有 50% 機率落空。', [['倍率', 'red'], ['致盲', 'gold']], 'flash', { randomMultiplierRange: [6, 15], attackFailTurns: 2, attackFailChance: .5 }, true)
  ]);
  C('aokiji', { no: 34, name: '青雉', title: '海軍大將', types: ['冰'], maxHp: 1640, baseSpeed: 106, scale: .95, battleScale: 1.15, statScale: 1.28, ai: 'control',
    desc: '冰凍果實能力者，前海軍大將庫山。頂上戰爭後離開海軍，後來加入黑鬍子海賊團，成為第 10 船船長。' }, [
    S('冰凍時刻', 'attack', 4, 90, '觸碰敵人的身體直接將其完全冰凍：對手冰凍 2 回合，60% 再固化 1 回合（無法使用技能）。', [['冰凍', 'blue'], ['固化', 'gray']], 'icefang', { freezeForce: 2, petrifyChance: .6, petrifyTurns: 1 }),
    S('冰刀', 'attack', 15, 55, '把冷氣化為鋒利的刀刃近身連斬 2～4 次，每一擊 25% 附加冰凍傷害（最大體力 5%）。', [['連擊', 'blue'], ['冰傷', 'blue']], 'icefang', { multiHitNormal: [2, 4], perHitPower: 55, extraIceChance: .25, extraIceRatio: .05 }),
    S('兩棘矛', 'attack', 8, 150, '遠距離射出冰之長矛，50% 使對手冰凍 2 回合；對已冰凍的對手傷害 1.5～2 倍。', [['強力', 'red'], ['冰凍', 'blue']], 'shigan', { freezeChance: .5, freezeTurns: 2, frozenBonusMult: [1.5, 2] }),
    S('暴雉嘴', 'attack', 5, 100, '放出巨大的冰之飛鳥衝擊：造成 3～6 倍傷害，40% 使對手冰凍 2 回合。', [['倍率', 'red'], ['冰凍', 'blue']], 'karyu', { randomMultiplierRange: [3, 6], freezeChance: .4, freezeTurns: 2 }),
    S('冰河時期', 'support', 1, 0, '只能使用一次（藥水無法補充）。最多 4 回合：整片戰場結冰，對方場上的角色每回合損失 6% 體力並被冰凍；青雉受到的傷害 -20%。對手換人後，下一位登場的角色依然受影響。', [['場地', 'blue'], ['持續', 'gold']], 'okuchi', { iceAge: [4, .06], noRestore: true }, true)
  ]);

  /* ================= 蛋頭島 ================= */
  C('vegapunk', { no: 109, name: '貝加龐克', title: '世上最聰明的人', types: ['超能'], maxHp: 1260, baseSpeed: 100, scale: .85, statScale: 1.05, ai: 'support',
    desc: '腦腦果實能力者，世界政府的天才科學家。把自己分成六個「衛星」，本體則是能無限儲存知識的大腦。' }, [
    S('雷射光線', 'attack', 12, 125, '發射科學武器的雷射，20% 使對手燒傷 2 回合。', [['雷射', 'red']], 'lightning', { burnChance: .2, burnTurns: 2 }),
    S('弱點解析', 'support', 5, 0, '分析對手的身體構造：對手防禦 -1～2（3 回合），並附加破防 3 回合。', [['解析', 'blue'], ['破防', 'blue']], 'flash', { enemyDefDownChance: [1, [1, 2], 3], armorBreakChance: 1, armorBreakTurns: 3 }),
    S('護盾發生器', 'support', 4, 0, '展開科學護盾：獲得最大體力 30% 的護盾。', [['護盾', 'blue']], 'kagamiyama', { selfShieldMaxHpRatio: .3 }),
    S('醫療艙', 'support', 4, 0, '回復 30% 體力，清除自身負面狀態與能力下降。', [['回復', 'green'], ['淨化', 'green']], 'heal', { healRatio: .3, clearSelfDebuffs: true }),
    S('母親之火', 'attack', 1, 100, '次數 1 次（藥水無法補充）。釋放母親之火的能量：造成 5～12 倍傷害，80% 使對手燒傷 3 回合。', [['倍率', 'red'], ['燒傷', 'red']], 'karyu', { randomMultiplierRange: [5, 12], burnChance: .8, burnTurns: 3, noRestore: true }, true)
  ]);
  C('york', { no: 110, name: '約克', title: '貝加龐克分身「貪欲」', types: ['超能'], maxHp: 1320, baseSpeed: 108, scale: .8, ai: 'aggressive',
    desc: '貝加龐克的六個衛星之一，負責「吃、睡、排泄」的貪欲。為了成為天龍人，背叛了本體。' }, [
    S('雷射踢', 'attack', 12, 130, '穿著科學長靴的踢擊，附帶雷射。', [['踢擊', 'red']], 'skywalk', {}),
    S('貪吃', 'support', 5, 0, '大吃一頓：回復 25% 體力，攻擊 +1。', [['回復', 'green'], ['強化', 'gold']], 'cook', { healRatio: .25, selfBuffAtk: 1 }),
    S('權限奪取', 'support', 4, 0, '用私藏的權限關閉對手的強化：清除對手全部回合制增益與能力提升。', [['清強化', 'blue']], 'darkcopy', { clearEnemyTimed: true, clearBuffs: true }),
    S('防禦程式', 'support', 4, 0, '接下來 2 回合受到的傷害 -35%，並 2 回合免疫異常狀態。', [['減傷', 'blue'], ['免疫', 'green']], 'kagamiyama', { damageReductionTurns: 2, damageReductionValue: .35, immuneTurns: 2 }),
    S('天龍人的召喚', 'attack', 2, 100, '透過電話蟲呼叫「五老星」：造成 4～10 倍傷害，60% 使對手恐懼 1 回合。', [['倍率', 'red'], ['恐懼', 'gold']], 'judgment', { randomMultiplierRange: [4, 10], fearChance: .6, fearTurns: 1 }, true)
  ]);

  /* ================= 唐吉訶德家族 ================= */
  C('sugar', { no: 112, name: '砂糖', title: '童樂女孩', types: ['超能'], maxHp: 1160, baseSpeed: 126, scale: .9, battleScale: .4, ai: 'control',
    desc: '童樂果實能力者，唐吉訶德家族幹部。被她碰到的人會變成玩具，而且所有人都會忘記那個人曾經存在。' }, [
    S('觸碰', 'attack', 15, 100, '輕輕一碰，30% 使對手虛弱 2 回合。', [['虛弱', 'gray']], 'punch', { weakChance: .3, weakTurns: 2 }),
    S('玩具化', 'support', 3, 0, '把對手變成玩具：60% 使對手固化 2 回合（無法使用技能）。', [['玩具化', 'gold'], ['固化', 'gray']], 'petals', { skipAttackChance: .6, skipAttackTurns: 2, ccKind: 'petrify' }),
    S('奴隸契約', 'support', 4, 0, '變成玩具的人必須服從契約：對手全能力 -1，並清除對手的能力提升。', [['契約', 'gold'], ['弱化', 'blue']], 'voice', { enemyAllDown: 1, clearBuffs: true }),
    S('吃葡萄', 'support', 5, 0, '吃一口最愛的葡萄冷靜下來：回復 25% 體力，速度 +1。', [['回復', 'green']], 'cook', { healRatio: .25, selfBuffSpd: 1 }),
    S('玩具之家', 'support', 2, 0, '玩具之家的主人：對手固化 2 回合、全能力 -2，3 回合內無法提升能力。', [['玩具化', 'gold'], ['封鎖', 'gray']], 'gigante', { skipAttackTurns: 2, ccKind: 'petrify', enemyAllDown: 2, buffBlockTurns: 3 }, true)
  ]);
  C('monet', { no: 113, name: '莫內', title: '雪女', types: ['冰'], maxHp: 1320, baseSpeed: 118, scale: .9, battleScale: .75, ai: 'control',
    desc: '雪雪果實能力者，唐吉訶德家族成員、凱薩·克勞恩的秘書。下半身是鳥腳、雙手是翅膀的鳥人，在龐克哈薩特守護 SAD 工廠。' }, [
    S('雪之羽', 'attack', 15, 40, '振翅捲起暴雪，連續攻擊 2～5 次，15% 使對手冰凍 2 回合。', [['連擊', 'blue'], ['冰凍', 'blue']], 'wings', { multiHitNormal: [2, 5], perHitPower: 40, freezeChance: .15, freezeTurns: 2 }),
    S('雪屋', 'support', 4, 0, '用雪堆起圓頂雪屋：獲得最大體力 25% 的護盾，閃避下一次攻擊。', [['護盾', 'blue'], ['閃避', 'blue']], 'kagamiyama', { selfShieldMaxHpRatio: .25, dodgeTurns: 1 }),
    S('雪兔', 'attack', 8, 36, '放出大量雪兔衝向對手，攻擊 3～6 次，每一擊 20% 附加冰凍傷害。', [['連擊', 'blue'], ['冰傷', 'blue']], 'icefang', { multiHitNormal: [3, 6], perHitPower: 36, extraIceChance: .2, extraIceRatio: .04 }),
    S('白色世界', 'support', 4, 0, '讓整片區域化為雪原：70% 使對手冰凍 2 回合，對手攻擊 -1（2 回合）。', [['冰凍', 'blue'], ['降攻', 'blue']], 'okuchi', { freezeChance: .7, freezeTurns: 2, enemyAtkDownChance: [[1, 1], 1, 2] }),
    S('雪女・暴風雪', 'attack', 2, 100, '化身暴風雪吞沒對手：造成 3～9 倍傷害，必定使對手冰凍 2 回合。', [['倍率', 'red'], ['冰凍', 'blue']], 'okuchi', { randomMultiplierRange: [3, 9], freezeChance: 1, freezeTurns: 2 }, true)
  ]);
  C('vergo', { no: 114, name: '威爾可', title: '紅心家族', types: ['格鬥'], maxHp: 1520, baseSpeed: 100, scale: .9, battleScale: .6, ai: 'aggressive',
    desc: '唐吉訶德家族的初代「紅心」，偽裝成海軍中將潛伏在 G-5。全身纏繞武裝色霸氣，臉上黏著食物也渾然不覺。' }, [
    S('竹棍打擊', 'attack', 15, 120, '用纏著霸氣的竹棍重擊，30% 機率造成 1.8 倍傷害。', [['爆發', 'red']], 'punch', { critBoost: .3, critMult: 1.8 }),
    S('鐵塊・全身霸氣', 'support', 6, 0, '全身覆蓋武裝色霸氣：防禦 +2，接下來 2 回合受到的傷害 -30%。', [['強化', 'gold'], ['減傷', 'blue']], 'haki', { selfBuffDef: 2, damageReductionTurns: 2, damageReductionValue: .3 }),
    S('指槍・竹', 'attack', 10, 40, '用竹棍連續突刺 3～6 次，30% 附加破防 3 回合。', [['連擊', 'red'], ['破防', 'blue']], 'shigan', { multiHitNormal: [3, 6], perHitPower: 40, armorBreakChance: .3, armorBreakTurns: 3 }),
    S('竹節棍連打', 'attack', 5, 100, '霸氣全開的連打：造成 2～4 倍傷害，30% 使對手麻痺 1 回合。', [['倍率', 'red'], ['麻痺', 'gold']], 'barrage', { randomMultiplierRange: [2, 4], paralyzeChance: .3, paralyzeTurns: 1 })
  ]);

  /* 圖鑑順序與取得方式 */
  const insertAfter = (after, ids) => { const i = CHARACTER_ORDER.indexOf(after); ids.forEach(id => { const k = CHARACTER_ORDER.indexOf(id); if (k >= 0) CHARACTER_ORDER.splice(k, 1); }); CHARACTER_ORDER.splice(i < 0 ? CHARACTER_ORDER.length : i + 1, 0, ...ids); };
  insertAfter('mihawk', ['doflamingo', 'kuma', 'kuma_eh']); insertAfter('akainu', ['kizaru', 'aokiji']); insertAfter('blackbeard', ['shanks', 'whitebeard']);
  insertAfter('perona', ['vegapunk', 'york', 'sugar', 'monet', 'vergo']);
  for (let i = RESERVED_NOS.length - 1; i >= 0; i--) if ([26, 27, 33, 34].includes(RESERVED_NOS[i].no)) RESERVED_NOS.splice(i, 1);
  Object.assign(CHAR_OBTAIN, {
    whitebeard: { boss: 0, reward: '_emperor', npc: '皇帝領海挑戰：擊敗白鬍子真身後加入（無法抽獎）' },
    shanks: { boss: 0, reward: '_emperor', npc: '皇帝領海挑戰：擊敗紅髮真身後加入（無法抽獎）' },
    kaido: { boss: 0, reward: '_emperor', npc: '皇帝領海挑戰：擊敗凱多真身後加入（無法抽獎）' },
    bigmom: { boss: 0, reward: '_emperor', npc: '皇帝領海挑戰：擊敗 BIG MOM 真身後加入（無法抽獎）' },
    doflamingo: { bossFirst: .05, bossRepeat: .08, npc: '德雷斯羅薩篇 BOSS' },
    kuma: { boss: 0, npc: '恐怖三桅帆船篇：支線對決' },
    kuma_eh: { boss: 0, npc: '蛋頭島篇登場' },
    kizaru: { boss: 0, npc: '蛋頭島篇 BOSS' },
    aokiji: { boss: 0, npc: '頂上戰爭篇 NPC・蜂巢島篇 BOSS（僅能從懸賞召喚取得）' },
    vegapunk: { boss: 0, reward: 'egghead', npc: '完成蛋頭島篇後免費加入' },
    york: { boss: 0, reward: '_duel', npc: '蛋頭島篇：對決勝利後加入' },
    sugar: { boss: 0, reward: '_duel', npc: '德雷斯羅薩篇：對決勝利後加入' },
    monet: { boss: 0, reward: '_side', npc: '德雷斯羅薩篇支線「SMILE 工廠的源頭」：對決勝利後加入' },
    vergo: { boss: 0, reward: '_side', npc: '德雷斯羅薩篇支線「G-5 的叛徒」：對決勝利後加入' }
  });
  SKINS.york_greed = { char: 'york', name: '貪欲的提線者', image: img('york_skin1'), avatar: face('york_skin1'), ticket: true, battleScale: .85, how: '限定皮膚選擇卷（奪寶大冒險首次突破 2000／3000／5000 公尺）' };

  /* 羈絆 */
  const set = id => COLLECTION_SETS.find(s => s.id === id);
  set('yonko').members.push('shanks', 'whitebeard'); set('shichi').members.push('doflamingo', 'kuma'); set('gov').members.push('kizaru', 'aokiji'); set('wb').members.unshift('whitebeard');
  COLLECTION_SETS.push({ id: 'donquixote', need: 2, title: 'set_donquixote', name: '唐吉訶德家族', members: ['doflamingo', 'sugar', 'monet', 'vergo'], bonus: { atk: 2 } },
    { id: 'egghead', need: 2, title: 'set_egghead', name: '未來島蛋頭島', members: ['vegapunk', 'york', 'kuma_eh'], bonus: { def: 2 } },
    { id: 'admirals', need: 2, title: 'set_admirals', name: '三大將', members: ['akainu', 'kizaru', 'aokiji'], bonus: { atk: 2 }, startBuff: { atk: 1 }, note: '同時在出戰陣容中：出場時攻擊 +1' });
  TITLES.push({ id: 'set_donquixote', name: '天夜叉的家族', how: '圖鑑套組「唐吉訶德家族」' }, { id: 'set_egghead', name: '未來的科學家', how: '圖鑑套組「未來島蛋頭島」' }, { id: 'set_admirals', name: '海軍最高戰力', how: '圖鑑套組「三大將」' },
    { id: 'ch_thriller', name: '找回影子的人', how: '完成恐怖三桅帆船篇' }, { id: 'ch_egghead', name: '未來島的逃脫者', how: '完成蛋頭島篇' }, { id: 'ch_dressrosa', name: '鳥籠的破壞者', how: '完成德雷斯羅薩篇' },
    { id: 'tower250', name: '塔之神', how: '勇者之塔登頂第 250 層' }, { id: 'emperor1', name: '皇帝的挑戰者', how: '皇帝領海：擊敗任一位四皇真身' }, { id: 'emperor4', name: '新世界的皇帝', how: '皇帝領海：擊敗全部四皇真身' });

  /* ================= 勇者之塔 250 層：伊姆改到 200、250 層 ================= */
  TOWER.floors = 250;
  TOWER.bosses = ['crocodile', 'enel', 'lucci', 'moria', 'hody', 'shirahoshi', 'robin', 'yamato', 'catarina', 'katakuri',
    'magellan', 'doflamingo', 'marco', 'kuma', 'law', 'kid', 'ace', 'garp_hc', 'kizaru', 'imu', 'aokiji', 'akainu', 'loki', 'blackbeard', 'imu'];
  TOWER.bossSkin = { 250: 'imu_true' };

  /* ================= 敵人等級（新篇章） ================= */
  Object.assign(ENEMY_LEVEL, { thriller: 40, dressrosa: 51, egghead: 76 });

  /* ================= 篇章 ================= */
  const L = (who, t) => [who, t];
  /* --- 蜂巢島篇：改回原作。卡普突襲時黑鬍子不在島上，擋在前面的是青雉 --- */
  { const D = CHAPTERS.find(c => c.id === 'dark'); delete D.canonTodo;
    D.boss = 'aokiji'; D.bossTitle = '黑鬍子海賊團第 10 船船長 青雉';
    D.blurb = '黑鬍子海賊團占據了傳說中的海賊島「蜂巢島」，在這裡開設海賊學校、收留亡命之徒。海軍上校克比被抓到這裡當作人質。';
    D.rhythm = '潛入海賊島：躲過巡邏、打聽情報、救出克比並護送他上船，最後擋住卡普的老學生——青雉。';
    D.prologue = [L(null, '蜂巢島・黑鬍子海賊團的海賊島'), L(null, '這座島曾是傳說中的「洛克斯海賊團」的據點，如今插滿了黑鬍子的旗子。'), L(null, '船長黑鬍子此刻不在島上——但島上留著好幾位船長級的幹部。'), L(null, '打破規矩、抗命出航的，是一個退休的老人——海軍英雄卡普。')];
    const g = D.steps.find(s => s.type === 'goto'); g.title = '港口前廣場'; g.desc = '前往北方的港口前廣場，替克比的船殺出一條路。';
    g.lines = [L(null, '廣場上的海水突然結成了冰。'), L(null, '一個身材高瘦、戴著眼罩的男人從冰霧中走出來。'), L('@aokiji', '……老師，好久不見。你也差不多該退休了吧。'), L('garp', '庫山……你這笨學生，竟然跑去當黑鬍子的手下！'), L('garp', '小子，先別管我。帶克比走——擋在路上的人，全部打倒！')];
    const d = D.steps.find(s => s.type === 'duel'); if (d) d.after = [L('catarina_n', '嘻……算你厲害。可是庫山先生可不是我這種程度喔。'), L(null, '蝶美化成一陣粉紅色的霧，消失在港口的另一端。')];
    const b = D.steps.find(s => s.type === 'boss'); b.title = '冰封的港口'; b.desc = '擊退青雉，讓克比的船平安離開蜂巢島。';
    D.epilogue = [L(null, '青雉的冰牆出現了裂痕，港口的出口打開了。'), L('koby', '卡普先生！快上船！'), L('garp', '……你們先走。我和這個不成材的學生，還有話沒說完。'), L(null, '船離開港口的那一刻，背後傳來天崩地裂的聲音——'), L(null, '那是一個老兵，給學生們上的最後一課。')];
    const bk = D.npcs.find(n => n.id === 'barkeep'); if (bk) bk.chat = ['在這座島上，誰拳頭硬誰就是規矩。', '黑鬍子船長不在？哼，他留下來的那幾個船長，一個比一個難纏。'];
  }
  /* --- 頂上戰爭篇：青雉以 NPC 登場 --- */
  { const M = CHAPTERS.find(c => c.id === 'marineford'); if (M && !M.npcs.some(n => n.id === 'aokiji_n')) M.npcs.push({ id: 'aokiji_n', name: '青雉', role: '海軍大將', look: 'koza', pos: [-20, -8], chat: ['……正義這種東西，會隨著站的位置改變。', '我不喜歡麻煩。可是今天，誰也別想通過這裡。'] }); }

  const THRILLER = { id: 'thriller', name: '恐怖三桅帆船篇', subtitle: '被偷走的影子', art: `assets/chapters/thriller.webp?v=${V}`, boss: 'moria', bossTitle: '王下七武海 月光·莫莉亞',
    blurb: '魔之三角地帶的濃霧中，漂著一艘像島一樣大的海賊船「恐怖三桅帆船」。七武海莫莉亞在這裡奪走航海者的影子，塞進殭屍裡當作自己的士兵。',
    rhythm: '在濃霧的島上找出被奪走影子的人、潛入霍古巴克的宅邸、擊敗幽靈公主，最後打倒影之王莫莉亞，在天亮前把影子還給大家。',
    env: { sky: '#3a3550', fog: '#4a4560', ground: '#3a3a30', sun: [.4, .5, .3], fogR: [40, 180] }, spawn: [0, 58], bossPos: [0, -60],
    npcs: [
      { id: 'lola', name: '蘿拉', role: '被奪走影子的女海賊', look: 'kokoro', pos: [-10, 46] },
      { id: 'brook', name: '布魯克', role: '帶著黑傘的骷髏劍士', look: 'elder', pos: [16, 40], chat: ['我在這片霧裡漂流了五十年……喲齁齁！', '影子被奪走的人，只要照到陽光就會消失。'] },
      { id: 'victim', name: '失去影子的船員', role: '躲在陰影裡的海賊', look: 'fisher', pos: [-30, -4] },
      { id: 'perona_n', name: '佩羅娜', role: '幽靈公主', look: 'hiyori', pos: [28, -20], chat: ['好可愛的東西都要歸我！其他的……就讓幽靈陪你玩吧。'] },
      { id: 'kuma_n', name: '巴索羅繆·大熊', role: '王下七武海', look: 'crew', pos: [-22, -44], chat: ['……如果去旅行的話，你想去哪裡？'] }
    ],
    steps: [
      { type: 'talk', npc: 'lola', title: '霧中的求救', desc: '和港口邊的蘿拉說話。', reward: 1, lines: [L('lola', '你也被這艘船吸進來了？聽好，千萬別在這裡睡著！'), L('lola', '我們一船的人，影子全被這艘船的主人——莫莉亞奪走了。'), L('lola', '沒有影子的人，只要被陽光照到就會化成灰。我們只能一直躲在霧裡……')] },
      { type: 'talkAll', npcs: ['brook', 'victim'], title: '影子的秘密', desc: '向布魯克和失去影子的船員打聽影子的下落。', reward: 2, lines: {
        brook: [L('brook', '莫莉亞把奪來的影子塞進屍體裡，造出聽他命令的殭屍。'), L('brook', '殭屍的嘴裡只要塞進鹽巴，影子就會離開，回到原本的主人身上。'), L('brook', '而只要打倒莫莉亞……所有的影子都會一起回來。')],
        victim: [L('victim', '那個醫生霍古巴克，把殭屍做得跟真的士兵一樣。'), L('victim', '宅邸裡到處都是巡邏的殭屍……千萬別被它們看到。')] } },
      { type: 'stealth', title: '潛入霍古巴克的宅邸', desc: '避開殭屍巡邏兵的視線（紅色區域），溜進宅邸深處。被發現會被趕回起點。', start: [0, 36], goal: [0, -20], r: 6, label: '宅邸深處',
        guards: [{ look: 'bbPirate', path: [[-14, 22], [14, 22], [14, 12], [-14, 12]], speed: 5, view: 9 }, { look: 'bbPirate', path: [[-10, 2], [-10, -10], [10, -10], [10, 2]], speed: 4.5, view: 9 }],
        reward: 3, lines: [L(null, '宅邸地下室排滿了被縫補過的巨大身體。'), L(null, '每一具殭屍的腳下，都拖著一道不屬於它的影子。')] },
      { type: 'collect', title: '驅散殭屍的鹽', desc: '在宅邸附近找回 3 袋鹽巴，殭屍吃到鹽就會吐出影子。', item: '鹽巴袋', icon: 'sack', count: 3, spots: [[-38, -4], [36, -10], [6, 14]], reward: 2 },
      { type: 'defeat', title: '殭屍將軍', desc: '擊退擋路的 2 名殭屍將軍。', count: 2, reward: 3 },
      { type: 'duel', npc: 'perona_n', enemy: 'perona', title: '幽靈公主', desc: '佩羅娜放出的消極幽靈擋住了去路。打倒她，才能前往莫莉亞的所在地。', reward: 3,
        lines: [L('perona_n', '你要去找莫莉亞大人？才不讓你過去呢！'), L('perona_n', '被我的消極幽靈穿過身體的人，都會變得一點鬥志也沒有喔～')],
        after: [L('perona_n', '可、可惡……你給我記住！'), L(null, '佩羅娜被一陣不知從哪來的衝擊彈飛，消失在霧裡。')] },
      { type: 'goto', title: '天亮前的甲板', desc: '前往北方的甲板，在天亮前追上莫莉亞。', pos: [0, -38], r: 8, label: '甲板', reward: 1, unlockBoss: true,
        lines: [L(null, '東方的天空已經開始泛白。'), L('@moria', '奇夏夏夏！只差一點點天就亮了，到時候你們的同伴都會變成灰！'), L('lola', '別讓他拖時間！打倒他，影子就會回來！')] },
      { type: 'boss', title: '影之王', desc: '在天亮前擊敗月光·莫莉亞，奪回所有人的影子。', reward: 5 }
    ],
    prologue: [L(null, '魔之三角地帶・終年不散的濃霧'), L(null, '一艘巨大得像島嶼的海賊船，從霧中緩緩靠近。'), L(null, '船上的殭屍沒有心跳，卻會說話、會戰鬥、會開玩笑。'), L(null, '它們全都拖著別人的影子。')],
    epilogue: [L(null, '莫莉亞倒下了。被奪走的影子像黑色的鳥群一樣飛回主人的腳下。'), L('lola', '我的影子……回來了！'), L('brook', '喲齁齁……五十年了，我終於可以再站在陽光下了。'), L(null, '然而，在大家歡呼的甲板一角，一個巨大的身影無聲地出現了——'), L('kuma_n', '……如果去旅行的話，你想去哪裡？')],
    layout: { spawn: [0, 58], boss: [0, -60], lobes: [[-48, -46, 18]], spots: [[-34, 6], [36, -10], [-22, -38]], path: [[0, 58], [0, 36], [0, 10], [-4, -22], [0, -60]] },
    sides: [{ id: 'nothing', npc: 'kuma_n', enemy: 'kuma', title: '支線：什麼都沒有發生', after: '影之王', reward: 3, berry: 3000,
      ask: [L('kuma_n', '……我接到了命令，要消滅草帽一夥。'), L('kuma_n', '但我可以給你們一個機會。')],
      lines: [L(null, '大熊摘下手套，掌心的肉球微微發光。'), L(null, '【對決】王下七武海・巴索羅繆·大熊！')],
      win: [L('kuma_n', '……你們的船長，有一群好夥伴。'), L(null, '大熊的身影消失了。甲板上只剩下一句話在風中飄著——「什麼都沒有發生」。')] }]
  };
  const EGGHEAD = { id: 'egghead', name: '蛋頭島篇', subtitle: '未來島的天才', art: `assets/chapters/egghead.webp?v=${V}`, boss: 'kizaru', bossTitle: '海軍大將 黃猿',
    blurb: '常年處在夏季的「未來島」蛋頭島，是天才科學家貝加龐克的研究所。世界政府認定他知道得太多，派出 CP0 與海軍大將黃猿前來「處理」他。',
    rhythm: '在未來島上找出貝加龐克的衛星、揪出背叛的分身、保護科學家們撤離，最後正面迎擊包圍全島的海軍大將。',
    env: { sky: '#8fd6f0', fog: '#c8eef8', ground: '#7ab88a', sun: [.7, .9, .4], fogR: [70, 230] }, spawn: [0, 58], bossPos: [0, -60],
    npcs: [
      { id: 'vegapunk_n', name: '貝加龐克', role: '世上最聰明的人', look: 'elder', pos: [-10, 46] },
      { id: 'shaka', name: '夏卡', role: '衛星「善」', look: 'pagaya', pos: [18, 42], chat: ['我是貝加龐克的「善」。本體正在逃亡，我們必須保護他。'] },
      { id: 'lilith', name: '莉莉絲', role: '衛星「惡」', look: 'girl', pos: [-30, -2], chat: ['嗚哇——海軍的軍艦把整座島都圍起來了！'] },
      { id: 'york_n', name: '約克', role: '衛星「貪欲」', look: 'conis', pos: [30, -18] },
      { id: 'bonney', name: '波妮', role: '大熊的女兒', look: 'girl', pos: [-24, -40], chat: ['老爸……我一定會把你找回來。'] }
    ],
    steps: [
      { type: 'talk', npc: 'vegapunk_n', title: '來自未來的求救', desc: '和貝加龐克說話。', reward: 1, lines: [L('vegapunk_n', '你就是來接應的人嗎？太好了，我正被政府追殺！'), L('vegapunk_n', '這座島上有我的六個分身——「衛星」。我把自己的人格分成了六份。'), L('vegapunk_n', '問題是……其中有一個人，把島上的情報洩漏給了政府。')] },
      { type: 'choice', npc: 'shaka', title: '天才的考題', desc: '回答夏卡的問題，證明你值得信任。', reward: 2, lines: [L('shaka', '在交出重要情報之前，我得先確認你的身分。')],
        questions: [{ q: '貝加龐克吃下的惡魔果實能力是？', options: [{ label: '腦腦果實：能無限儲存知識', correct: true }, { label: '閃閃果實：能化成光' }, { label: '肉球果實：能彈開一切' }], right: '正確。本體的大腦大到要另外存放在「龐克記錄」裡。', wrong: '不對。那是別人的能力。' },
          { q: '貝加龐克的六個衛星，哪一個代表「貪欲」？', options: [{ label: '夏卡' }, { label: '約克', correct: true }, { label: '莉莉絲' }], right: '……沒錯。而那也是我們最擔心的一個。', wrong: '不是喔。再想想看。' }] },
      { type: 'timedCollect', title: '撤離的資料', desc: '軍艦開砲前，收回 3 份研究資料。', item: '研究資料', icon: 'sack', count: 3, seconds: 70, spots: [[-38, -4], [40, -12], [6, 12]], reward: 3 },
      { type: 'duel', npc: 'york_n', enemy: 'york', joins: 'york', joinLv: 20, title: '貪欲的背叛', desc: '洩漏情報的人就是約克。她想用本體的命換一個天龍人的身分。', reward: 3,
        lines: [L('york_n', '我只是想要更多、更多而已。吃更多、睡更久……成為天龍人有什麼不對？'), L('york_n', '本體不在了，世界上的貝加龐克就只剩下我們了。')],
        after: [L('york_n', '……好吧好吧，我認輸。反正跟著你們也有東西吃。'), L(null, '約克被你押回了研究所，答應交出所有的權限。')] },
      { type: 'escort', npc: 'vegapunk_n', title: '護送科學家', desc: '護送貝加龐克前往南方的逃生艙。', to: [0, 40], r: 8, label: '逃生艙', reward: 3,
        startLines: [L('vegapunk_n', '我的腳程很慢，你得配合我！'), L('vegapunk_n', '只要撐到逃生艙，我就能把要告訴全世界的話傳出去。')],
        lines: [L('vegapunk_n', '到了……謝謝你。'), L(null, '天空突然被一道刺眼的光劃開。'), L('bonney', '有人朝這裡過來了！是海軍大將！')] },
      { type: 'defeat', title: 'CP0 的追兵', desc: '擊退追上來的 2 名特務。', count: 2, reward: 3 },
      { type: 'goto', title: '研究所前的廣場', desc: '前往北方的研究所廣場，擋住化成光降落的大將。', pos: [0, -38], r: 8, label: '研究所廣場', reward: 1, unlockBoss: true,
        lines: [L(null, '一道光柱落在廣場中央，光芒散去，一個穿著黃色條紋西裝的男人站了起來。'), L('@kizaru', '哎呀～這下可真是太麻煩了啊～'), L('@kizaru', '貝加龐克博士，老夫也不想這樣……但這是命令呢～'), L('bonney', '別讓他過去！')] },
      { type: 'boss', title: '光速的大將', desc: '擊敗海軍大將黃猿，替逃生艙爭取時間。', reward: 6 }
    ],
    prologue: [L(null, '新世界・未來島「蛋頭島」'), L(null, '島上一年四季都是夏天，空中漂著會發光的機械魚。'), L(null, '天才科學家貝加龐克在這裡創造了太多改變世界的發明。'), L(null, '也知道了太多——世界政府不想讓任何人知道的事。')],
    epilogue: [L(null, '黃猿退回了光中，逃生艙的艙門關上了。'), L('vegapunk_n', '全世界的人，請聽我說——'), L(null, '貝加龐克的聲音，透過島上所有的電話蟲傳向了全世界。'), L('bonney', '……老爸，你看到了嗎？'), L(null, '遠方的海平面上，一個巨大的身影正踩著海浪奔向蛋頭島。')],
    layout: { spawn: [0, 58], boss: [0, -62], lobes: [[46, 40, 18]], spots: [[-40, 22], [40, 20], [30, -36]], path: [[0, 58], [0, 30], [-2, 8], [2, -14], [0, -40], [0, -62]] }
  };
  const DRESSROSA = { id: 'dressrosa', name: '德雷斯羅薩篇', subtitle: '愛與熱情與玩具之國', art: `assets/chapters/dressrosa.webp?v=${V}`, boss: 'doflamingo', bossTitle: '王下七武海 唐吉訶德·多佛朗明哥',
    blurb: '花朵與玩具一起生活的熱情國度德雷斯羅薩，其實被國王多佛朗明哥掌控著。國民被變成玩具、被所有人遺忘；SMILE 工廠的人造惡魔果實，正源源不絕地賣給四皇凱多。',
    rhythm: '和羅聯手揭開國家的真相：潛入玩具之家、打倒能把人變成玩具的砂糖，最後衝進「鳥籠」中央擊敗天夜叉。支線「SMILE 工廠」帶你回到龐克哈薩特，追查 SMILE 原料的源頭。',
    env: { sky: '#f8c88a', fog: '#f4d8b0', ground: '#c8a070', sun: [.7, .9, .4], fogR: [70, 230] }, spawn: [-60, 28], bossPos: [0, -60],
    npcs: [
      { id: 'law_n', name: '羅', role: '紅心海賊團船長', look: 'kinemon', pos: [-48, 22] },
      { id: 'kyros', name: '單腳士兵', role: '錫製的玩具士兵', look: 'tama', pos: [-24, 10], chat: ['在這個國家，玩具和人類一起生活……可是玩具們全都記得自己原本是人。'] },
      { id: 'viola', name: '薇奧菈', role: '前王女', look: 'vivi', pos: [22, 24], chat: ['我的透視能力能看見整個國家……包括多佛朗明哥藏起來的東西。'] },
      { id: 'sugar_n', name: '砂糖', role: '唐吉訶德家族幹部', look: 'girl', pos: [30, -18] },
      { id: 'franky_n', name: '佛朗基', role: '潛入 SMILE 工廠中', look: 'franky', pos: [-36, -24], chat: ['工廠後面那座島上，有一整片 SMILE 果實的果園……超級糟糕的光景！'] }
    ],
    steps: [
      { type: 'talk', npc: 'law_n', title: '海賊同盟的計畫', desc: '和羅說話，聽他說明作戰計畫。', reward: 1, lines: [L('law_n', '目標是 SMILE 工廠。毀掉它，凱多的人造惡魔果實就斷了貨源。'), L('law_n', '凱多一定會找多佛朗明哥算帳——這就是我要的。'), L('law_n', '別小看這個國家。這裡的笑容……全是假的。')] },
      { type: 'talkAll', npcs: ['kyros', 'viola'], title: '被遺忘的人們', desc: '向單腳士兵和薇奧菈打聽這個國家的真相。', reward: 2, lines: {
        kyros: [L('kyros', '十年前，多佛朗明哥用絲線操縱前國王，讓他攻擊自己的國民。'), L('kyros', '之後他「拯救」了這個國家，成了英雄。而反抗的人……都被變成了玩具。'), L('kyros', '被變成玩具的人，連家人都會忘記他曾經存在。')],
        viola: [L('viola', '把人變成玩具的，是家族幹部砂糖。她住在玩具之家。'), L('viola', '只要砂糖失去意識，所有的玩具都會變回人類，記憶也會一起回來。')] } },
      { type: 'stealth', title: '潛入玩具之家', desc: '避開家族幹部的視線（紅色區域），溜進玩具之家。被發現會被趕回起點。', start: [-30, 18], goal: [30, -20], r: 6, label: '玩具之家',
        guards: [{ look: 'baroque', path: [[-10, 10], [10, 10], [10, 0], [-10, 0]], speed: 5, view: 9 }, { look: 'baroque', path: [[20, -4], [20, -16], [36, -16], [36, -4]], speed: 4.5, view: 9 }],
        reward: 3, lines: [L(null, '玩具之家的地下，一條運輸帶正把被變成玩具的人送往工廠工作。'), L(null, '房間中央，一個戴著王冠的小女孩一邊吃葡萄，一邊看著你笑了。')] },
      { type: 'duel', npc: 'sugar_n', enemy: 'sugar', joins: 'sugar', joinLv: 20, title: '童樂女孩', desc: '只要讓砂糖失去意識，整個國家的玩具都會變回人類！', reward: 4,
        lines: [L('sugar_n', '又來了一個想當英雄的人。'), L('sugar_n', '我只要碰你一下，你就會變成玩具，然後全世界都會忘記你喔。')],
        after: [L(null, '砂糖眼睛一翻，昏了過去。'), L(null, '整個國家同時響起了驚呼——玩具們一個接一個變回了人類，被遺忘的記憶湧回了每個人的腦海。'), L('kyros', '……我想起來了。我的名字是基羅斯！')] },
      { type: 'defeat', title: '家族的追兵', desc: '擊退追上來的 2 名家族成員。', count: 2, reward: 3 },
      { type: 'goto', title: '鳥籠', desc: '前往北方的王宮，阻止收縮的「鳥籠」。', pos: [0, -38], r: 8, label: '王宮', reward: 1, unlockBoss: true,
        lines: [L(null, '天空中出現了無數條絲線，把整座國家籠罩在一個巨大的鳥籠裡。'), L(null, '鳥籠正在一點一點地縮小，碰到的一切都被切成碎片。'), L('@doflamingo', '呋呋呋呋！既然被發現了，就從頭來過吧——把這個國家的人全都殺光！'), L('law_n', '一小時內打倒他，否則整個國家都會消失。')] },
      { type: 'boss', title: '天夜叉', desc: '擊敗唐吉訶德·多佛朗明哥，在鳥籠收縮之前解放德雷斯羅薩。', reward: 6 }
    ],
    prologue: [L(null, '新世界・愛與熱情與玩具之國「德雷斯羅薩」'), L(null, '花香、鬥牛、熱舞——還有會說話、會走路的玩具。'), L(null, '國王唐吉訶德·多佛朗明哥，同時也是地下世界的掮客「Joker」。'), L(null, '海賊同盟的目標，是藏在這個國家深處的 SMILE 工廠。')],
    epilogue: [L(null, '鳥籠的絲線一條條斷開，消失在藍天裡。'), L('law_n', '……結束了，柯拉先生。'), L('viola', '這個國家終於能真正地笑了。'), L(null, '王宮外，國民們抱著變回人類的家人哭成一團。'), L(null, 'SMILE 工廠停止了運轉——而這個消息，很快就會傳到四皇凱多的耳裡。')],
    layout: { spawn: [-60, 28], boss: [0, -60], lobes: [[-66, 30, 18]], spots: [[-24, -30], [26, 24], [46, -28]], path: [[-60, 28], [-36, 20], [-12, 4], [4, -24], [0, -60]] },
    sides: [
      { id: 'smile_monet', npc: 'law_n', enemy: 'monet', joins: 'monet', joinLv: 20, title: '支線：SMILE 工廠的源頭', bg: `assets/chapters/smile_factory.webp?v=${V}`, after: '童樂女孩', reward: 3, berry: 3000,
        ask: [L('law_n', 'SMILE 的原料叫 SAD，是在龐克哈薩特製造的。要聽聽那裡發生過的事嗎？')],
        lines: [L('law_n', '龐克哈薩特——一半是冰、一半是火的島。凱薩·克勞恩在那裡製造 SAD。'), L('law_n', '守在 SAD 工廠前面的，是他的秘書——雪女莫內。'), L(null, '你的眼前浮現出那座被大雪覆蓋的研究所——'), L(null, '【回憶之戰】龐克哈薩特・雪女莫內擋住了去路！')],
        win: [L('law_n', '……就是那一戰，我們才搶到了 SAD 的製造室。'), L('law_n', '莫內那傢伙，到最後都在為少主賣命。'), L(null, '回憶中的莫內收起了翅膀，向你點了點頭——她決定加入你的船隊。')] },
      { id: 'smile_vergo', npc: 'franky_n', enemy: 'vergo', joins: 'vergo', joinLv: 20, title: '支線：G-5 的叛徒', bg: `assets/chapters/smile_factory.webp?v=${V}`, after: '家族的追兵', reward: 3, berry: 3000,
        ask: [L('franky_n', '工廠的帳本上有個名字一直出現——「威爾可」。羅好像跟他有很深的仇……要我說給你聽嗎？')],
        lines: [L('franky_n', '那傢伙表面上是海軍 G-5 支部的中將，其實是唐吉訶德家族的初代「紅心」。'), L('franky_n', '在龐克哈薩特，羅一刀把他連同整座研究所的牆壁一起砍成兩半——超級帥氣！'), L(null, '【回憶之戰】龐克哈薩特・G-5 中將威爾可！')],
        win: [L('franky_n', '就算是那種全身霸氣的硬骨頭，也擋不住我們。'), L(null, '回憶中的威爾可沉默地扶正了臉上的竹輪——他願意跟著你走一段路。')] }
    ]
  };
  const ins = (afterId, ch) => { if (CHAPTERS.some(c => c.id === ch.id)) return; const i = CHAPTERS.findIndex(c => c.id === afterId); CHAPTERS.splice(i + 1, 0, ch); };
  ins('enies', THRILLER); ins('wano', DRESSROSA); ins('dark', EGGHEAD);
  /* 原作順序：魚人島 → 龐克哈薩特 → 德雷斯羅薩 → 蛋糕島 → 和之國 */
  { const i = CHAPTERS.findIndex(c => c.id === 'dressrosa'), D = CHAPTERS.splice(i, 1)[0], j = CHAPTERS.findIndex(c => c.id === 'fishman'); CHAPTERS.splice(j + 1, 0, D); }
  DEFAULT_NEWS.unshift({ id: 'd1002', date: '2026-10-02', tag: '更新', title: '10/02 大型更新：皇帝領海、三個新篇章', body: '・新模式「皇帝領海」：挑戰白鬍子、BIG MOM、凱多、紅髮（隊長連戰 → 分身 → 真身），擊敗後四皇加入船隊；四皇升為 UR+，不再出現在召喚池\n・新篇章：恐怖三桅帆船篇、德雷斯羅薩篇（支線「SMILE 工廠」）、蛋頭島篇；蜂巢島篇改回原作，BOSS 為青雉\n・新角色：紅髮、白鬍子、多佛朗明哥、大熊、大熊（蛋頭島）、黃猿、青雉、貝加龐克、約克、砂糖、莫內、威爾可；約克新皮膚\n・關卡挑戰新增困難模式（★1～★3 評星與獎勵）\n・勇者之塔擴充到 250 層，伊姆移到第 200、250 層\n・懸賞金交易所改為全服同步行情：所有裝置、所有玩家看到的價格與新聞都一樣；新聞依原作設定撰寫\n・手機版：大廳頂部、交易所版面、奪寶大冒險開始畫面修正' });
  DEFAULT_NEWS.unshift({ id: 'd1022', date: '2026-10-03', tag: '更新', title: '和之國新場景、布洛基立繪', body: '・和之國：爬上光月城天守閣、走過紅色太鼓橋與千本鳥居\n・布洛基正式立繪登場，多利與布洛基技能改為一攻一守\n・百年決鬥改為 1～100 連擊' });
  DEFAULT_NEWS.unshift({ id: 'd1022', date: '2026-10-03', tag: '更新', title: '蛋糕島新場景、圖鑑分區', body: '・蛋糕島篇：爬上四層的萬國蛋糕城堡、跳上杯子蛋糕\n・圖鑑依主角群、海軍、七武海、四皇團員、四皇、其他角色分區，還有更多神秘的 ？？？\n・布洛基正式立繪' });
  DEFAULT_NEWS.unshift({ id: 'd1021', date: '2026-10-03', tag: '更新', title: '赤鬼布洛基登場、圖鑑神秘編號', body: '・布洛基（SSR・赤鬼）加入限定抽獎池\n・多利升 SSR、洛基升 UR+\n・多利＋布洛基：羈絆「艾爾巴夫的雙鬼」減傷 +20%、傷害 +20%\n・圖鑑序號重新整理，留下神秘的 ？？？ 編號' });
  DEFAULT_NEWS.unshift({ id: 'd1020', date: '2026-10-03', tag: '更新', title: '皮膚圖鑑、德雷斯羅薩新場景', body: '・角色背包新增「皮膚圖鑑」\n・角色序號依登場篇章重新排列\n・德雷斯羅薩篇：爬上鬥技場看台與王宮台地、走進玩具之家' });
  DEFAULT_NEWS.unshift({ id: 'd1019', date: '2026-10-03', tag: '更新', title: '布魯克、阿玉、多利、寇沙登場', body: '・布魯克（SSR・靈魂之王）：碎片兌換\n・多利（SR・青鬼）：限定抽獎池\n・阿玉、寇沙：通關和之國篇、阿拉巴斯坦篇即可獲得\n・劇情立繪不再佔滿畫面' });
  DEFAULT_NEWS.unshift({ id: 'd1018', date: '2026-10-03', tag: '更新', title: '新船員登場：甚平、克比、錦衛門、懷帕、瑪琪諾', body: '・甚平（SSR）、克比（蜂巢島，SR）加入召喚\n・初登場克比、克比（頂上戰爭）、錦衛門、懷帕：通關對應篇章即可免費獲得\n・稀有度改為八階\n・奪寶大冒險 2200 公尺後難度固定，並提示前方的起飛箭頭與發光寶箱' });
  DEFAULT_NEWS.unshift({ id: 'd1017', date: '2026-10-03', tag: '更新', title: '魚人島新場景與細節版帆船', body: '・爬上三層的龍宮城、跳上珊瑚踏台、登上諾亞方舟\n・所有帆船改為細節版\n・跳躍鍵與電話蟲按鈕對齊' });
  DEFAULT_NEWS.unshift({ id: 'd1016', date: '2026-10-03', tag: '更新', title: '恐怖三桅帆船、頂上戰爭新場景', body: '・爬上恐怖三桅帆船的巨大桅杆、走空中棧道\n・頂上戰爭：爬上處刑台、海軍本部屋頂，走過冰封的海灣登上莫比迪克號' });
  DEFAULT_NEWS.unshift({ id: 'd1015', date: '2026-10-03', tag: '更新', title: '劇情大擴充與立繪演出', body: '・全篇章台詞增加到將近 1,500 句\n・對話時角色立繪會登上舞台演出\n・司法島篇：瀑布深淵、吊橋、可以爬的司法之塔\n・空白鍵跳躍、E 互動' });
  DEFAULT_NEWS.unshift({ id: 'd1014', date: '2026-10-03', tag: '更新', title: '大廳改版與四皇展示頁', body: '・全新大廳：下方導覽列加入「船團」，中間是「出航」\n・皇帝領海新增四皇展示頁\n・通關與領獎時的「恭喜獲得」畫面\n・七日登入、船員個人頁重新設計\n・白鬍子新立繪' });
  DEFAULT_NEWS.unshift({ id: 'd1013', date: '2026-10-03', tag: '更新', title: '東海篇正式版', body: '・風車村全面重做：瑪琪諾的酒館、村長家、老漁夫的小屋、碼頭與魯夫的小船、海軍據點與摩根像、小溪與木橋\n・瑪琪諾、村長、摩根、克比等 NPC 外觀更貼近原作' });
  DEFAULT_NEWS.unshift({ id: 'd1012', date: '2026-10-03', tag: '更新', title: '各島地標登場', body: '・13 座島加上原作地標：阿爾巴那宮殿、黃金鐘、司法之塔與正義之門、龍宮城、鬼之島、寶樹亞當……\n・煙囪冒煙、空中光點、小花等環境細節\n・NPC 造型更圓滑' });
  DEFAULT_NEWS.unshift({ id: 'd1011', date: '2026-10-03', tag: '更新', title: '全新 3D 島嶼畫面', body: '・13 座島換上新版 3D 畫面：卡通光影、即時陰影、草地、海面浪花、泛光\n・島上的民宅與樹木細節全面升級\n・可在設定中切換回舊畫面' });
  DEFAULT_NEWS.unshift({ id: 'd1010', date: '2026-10-03', tag: '更新', title: '劇情擴充與技能特效補齊', body: '・13 個篇章補上更多還原原作的對話、序章與尾聲\n・新增 6 個支線：索隆、羅賓、青雉、海王類、大和、路奇、紅髮\n・所有角色的一般招式都有特效與招式名' });
  DEFAULT_NEWS.unshift({ id: 'd1009', date: '2026-10-03', tag: '更新', title: '船團、3 對 3 即時對戰與觀戰', body: '・船團：和好友組隊，每週一起挑戰船團 BOSS，還有船團留言板\n・即時對戰新增 3 對 3（可換人）\n・好友對戰中可以觀戰\n・36 位角色補上奧義動畫，招式文字不再被畫面裁切' });
  DEFAULT_NEWS.unshift({ id: 'd1008', date: '2026-10-03', tag: '更新', title: '活動中心、新手教學與好友留言', body: '・活動中心：每週任務＋週末航海祭（週六日戰鬥經驗 ×2）\n・皇帝領海：可派 5 位出戰、8 位隊長連戰、真身體力 12,000\n・四皇奧義使用後恢復其他技能次數\n・新手教學與全新設定頁\n・好友留言、即時對戰表情與「再戰一場」' });
  DEFAULT_NEWS.unshift({ id: 'd1007', date: '2026-10-03', tag: '更新', title: '全球排行榜與畫面優化', body: '・好友面板新增「排行榜」：勇者之塔、虛空王座、船隊總等級、圖鑑收集\n・多位角色的戰鬥立繪大小與面向調整\n・手機大廳、按鈕觸控範圍、文字大小等視覺優化' });
  DEFAULT_NEWS.unshift({ id: 'd1006', date: '2026-10-02', tag: '更新', title: '即時對戰與好友禮物', body: '・即時對戰：邀請好友 1 對 1 同時出招，每回合 30 秒\n・好友禮物：每天可以送每位好友一份貝里\n・我的帳號：簽名、修改密碼、登出\n・登入改為只用信箱，帳號名稱只用來加好友\n・好友對戰（防守與即時）不再發放獎勵' });
  DEFAULT_NEWS.unshift({ id: 'd1005', date: '2026-10-02', tag: '更新', title: '好友系統與好友對戰', body: '・可以用「帳號名稱＋密碼」註冊登入（需填真實信箱，忘記密碼可寄重設信）\n・大廳「好友」：用帳號名稱或玩家 ID 加好友\n・好友對戰：挑戰好友的防守陣容，勝利可得貝里與寶藏幣\n・即時對戰製作中' });
  DEFAULT_NEWS.unshift({ id: 'd1004', date: '2026-10-02', tag: '更新', title: '雲端存檔上線', body: '・大廳下方「☁️ 雲端存檔」：用 Google 帳號登入，手機、平板、電腦之間接續進度\n・登入時若雲端有其他裝置的進度，會先讓你選擇要保留哪一份\n・自動同步：存檔有變動時每 60 秒上傳一次' });
  DEFAULT_NEWS.unshift({ id: 'd1003', date: '2026-10-02', tag: '更新', title: '10/02 新篇章插圖與各裝置排版修正', body: '・恐怖三桅帆船篇、德雷斯羅薩篇、蛋頭島篇換上正式插圖；SMILE 工廠支線有專屬戰鬥背景\n・手機、平板、桌機排版檢查：島上探索頂部、大廳貨幣列、模式選擇卡片排列、皇帝領海橫式版面\n・召喚機率表數字顯示修正' });
  /* 東海篇：斧手摩根改用專屬造型（金色短髮、鐵下巴、斧頭手、海軍大衣） */
  { const E = CHAPTERS.find(c => c.id === 'east'); const m = E && E.npcs.find(n => n.id === 'morgan_n'); if (m) m.look = 'morgan'; }
  /* 白鬍子新立繪 */ CHARACTERS.whitebeard.image = 'assets/chars/whitebeard.webp?v=78'; CHARACTERS.whitebeard.ultimateBg = CHARACTERS.whitebeard.image;
  /* 四皇的奧義：使用後恢復其他所有技能的次數 */
  ['whitebeard', 'shanks', 'kaido', 'bigmom'].forEach(id => { const u = CHARACTERS[id].skills[4]; u.effect.restoreAllPP = true; if (!/恢復其他所有技能/.test(u.desc)) u.desc += ' 使用後恢復其他所有技能的次數。'; });
  /* 立繪大小與面向（依玩家在「立繪調整」實測的數值寫入預設值，所有裝置一致） */
  const VIS = { aokiji: [1.65], whitebeard: [1.8], vegapunk: [.45, true], mayor: [.65, true], morgans: [.7], kuma: [1.35], kuma_eh: [1.9], lordcoast: [2.35], lucci: [.9], shanks: [1.4], vergo: [1], ace: [null, true], marine: [.65] };
  Object.entries(VIS).forEach(([id, [bs, face]]) => { const c = CHARACTERS[id]; if (!c) return; if (bs != null) c.battleScale = bs; if (face !== undefined) c.faceLeft = face; });
  { const pf = CHARACTERS.marco.skills[4].effect.phoenixForm; if (pf) pf.scale = 2.35; }
  window.__V63_DATA = true;
})();
