/* 遊戲資料：角色（沿用原版數值）、篇章劇情、道具、公告 */
const CHARACTERS = {
 luffy:{id:'luffy', name:'魯夫', title:'太陽神候補', types:['火','格鬥'], image:'assets/chars/luffy.webp', avatar:'assets/chars/luffy_face.webp', scale:.82, worldScale:.86, maxHp:1260, baseSpeed:118, desc:'近身爆發、高機率爆擊與覺醒後的持續壓制。', ultimateBg:'assets/chars/luffy.webp', ai:'aggressive', skills:[
  {name:'橡膠手槍', type:'attack', pp:15, maxPP:15, power:95, accuracy:100, desc:'60% 機率造成 2.5 倍傷害。', tags:[['爆發','red']], anima:'punch', effect:{critBoost:0.6, critMult:2.5}},
  {name:'橡膠火箭砲', type:'attack', pp:10, maxPP:10, power:0, accuracy:100, desc:'連續 5 次，每次造成對方最大 HP 1%～10% 傷害。', tags:[['五連擊','blue']], anima:'barrage', effect:{randomPercentHits:[5,0.01,0.10,false]}},
  {name:'解放的鼓動', type:'support', pp:5, maxPP:5, power:0, accuracy:100, desc:'3 回合每回合回 20%，並免疫異常。', tags:[['回復','green'],['免疫','gold']], anima:'heal', effect:{regenTurns:3, regenRatio:0.20, immuneTurns:3}},
  {name:'大蛇人', type:'attack', pp:6, maxPP:6, power:0, accuracy:100, desc:'扣當前 10% HP，下回合先制，並讓對手 2 回合有 50% 失敗率。', tags:[['先制','blue'],['封招','gold']], anima:'snake', effect:{currentHpCut:0.10, selfPriority:1, attackFailTurns:2, attackFailChance:0.5}},
  {name:'太陽神尼卡覺醒', type:'support', pp:2, maxPP:2, power:0, accuracy:100, desc:'全能力 +1、全回復，2 回合傷害加倍。每多 1 位夥伴再加 2.5%。', tags:[['覺醒','gold']], anima:'awaken', ultimate:true, effect:{awaken:'nika', fullHeal:true, statUpAll:1, damageMultTurns:2, damageMultValue:2, allyBoostPer:0.025}}
 ]},
 luffy0:{id:'luffy0', name:'初登場魯夫', title:'草帽小子', types:['格鬥'], image:'assets/chars/luffy0.webp', avatar:'assets/chars/luffy0_face.webp', scale:.86, worldScale:.86, maxHp:1180, baseSpeed:112, desc:'剛從風車村出海的橡膠人，靠伸縮自如的拳腳和不服輸的鬥志戰鬥。', ultimateBg:'assets/chars/luffy0.webp', ai:'aggressive', skills:[
  {name:'橡膠手槍', type:'attack', pp:15, maxPP:15, power:90, accuracy:100, desc:'伸長手臂的直拳，25% 機率造成 1.8 倍傷害。', tags:[['爆發','red']], anima:'punch', effect:{critBoost:0.25, critMult:1.8}},
  {name:'橡膠鞭', type:'attack', pp:12, maxPP:12, power:100, accuracy:95, desc:'甩出伸長的腿橫掃，25% 機率使對手麻痺 1 回合。', tags:[['麻痺','gold']], anima:'whip', effect:{skipAttackChance:0.25, skipAttackTurns:1}},
  {name:'橡膠加特林', type:'attack', pp:8, maxPP:8, power:0, accuracy:100, desc:'連續出拳 6 次，每次造成對手最大體力 1%～5% 傷害。', tags:[['六連擊','blue']], anima:'barrage', effect:{randomPercentHits:[6,0.01,0.05,false]}},
  {name:'橡膠風船', type:'support', pp:5, maxPP:5, power:0, accuracy:100, desc:'把身體吹成氣球，下一次受到的攻擊以 1.5 倍反彈，並回復 10% 體力。', tags:[['反彈','gold'],['回復','green']], anima:'balloon', effect:{reflectTurns:1, reflectMultiplier:1.5, healRatio:0.10}},
  {name:'橡膠巨人斧', type:'attack', pp:2, maxPP:2, power:100, accuracy:100, desc:'把腳伸到高空再劈落，造成 3.5 倍傷害，50% 機率使對手恐懼 1 回合。', tags:[['重擊','red'],['恐懼','gold']], anima:'axe', ultimate:true, effect:{forceMultiplier:3.5, skipAttackChance:0.5, skipAttackTurns:1, ccKind:'fear'}}
 ]},
 zoro:{id:'zoro', name:'初登場索隆', title:'三刀流劍士', types:['劍','格鬥'], image:'assets/chars/zoro.webp', avatar:'assets/chars/zoro_face.webp', scale:.9, worldScale:.9, maxHp:1340, baseSpeed:108, desc:'三把刀的斬擊、流血與霸氣纏繞的一擊必殺。', ultimateBg:'assets/chars/zoro.webp', ai:'aggressive', skills:[
  {name:'三刀流 鬼斬', type:'attack', pp:15, maxPP:15, power:100, accuracy:100, desc:'三刀交叉斬擊，30% 機率造成 2 倍傷害。', tags:[['斬擊','red']], anima:'onigiri', effect:{critBoost:0.3, critMult:2}},
  {name:'一刀流居合 獅子歌歌', type:'attack', pp:10, maxPP:10, power:90, accuracy:100, desc:'瞬間拔刀斬，50% 機率使對手流血 3 回合（每回合 6%）。', tags:[['居合','blue'],['流血','red']], anima:'shishi', effect:{dotChance:0.5, dotTurns:3, dotRatio:0.06, dotLabel:'流血'}},
  {name:'霸氣纏繞', type:'support', pp:6, maxPP:6, power:0, accuracy:100, desc:'刀身纏上武裝色霸氣：攻擊 +2，下回合傷害 1.5 倍。', tags:[['強化','gold']], anima:'haki', effect:{selfBuffAtk:2, nextAttackMult:1.5, nextAttackMultTurns:2}},
  {name:'三刀流 三千世界', type:'attack', pp:5, maxPP:5, power:130, accuracy:92, desc:'旋轉的刀刃斬出三千道斬擊，40% 使對手虛弱 2 回合。', tags:[['大招','red'],['虛弱','gold']], anima:'sanzen', effect:{weakChance:0.4, weakTurns:2, weakRange:[1.2,1.4]}},
  {name:'九刀流 阿修羅', type:'attack', pp:2, maxPP:2, power:0, accuracy:100, desc:'化身三頭六臂的鬼神，連斬 9 次（每次最大體力 2%～5%），之後 2 回合傷害加倍。', tags:[['覺醒','gold'],['九連斬','red']], anima:'ashura', ultimate:true, effect:{randomPercentHits:[9,0.02,0.05,false], damageMultTurns:2, damageMultValue:2}}
 ]},
 sanji:{id:'sanji', name:'初登場香吉士', title:'黑足', types:['火','格鬥'], image:'assets/chars/sanji.webp', avatar:'assets/chars/sanji_face.webp', scale:.9, worldScale:.9, maxHp:1280, baseSpeed:122, desc:'只用腳的踢技、燃燒的惡魔風腳，還有能回復體力的料理。', ultimateBg:'assets/chars/sanji.webp', ai:'aggressive', skills:[
  {name:'首肉踢', type:'attack', pp:15, maxPP:15, power:92, accuracy:100, desc:'瞄準頸部的迴旋踢，40% 機率使對手疲憊 1 回合。', tags:[['踢技','red'],['疲憊','gold']], anima:'collier', effect:{skipAttackChance:0.4, skipAttackTurns:1, ccKind:'fatigue'}},
  {name:'惡魔風腳 畫龍點睛', type:'attack', pp:10, maxPP:10, power:110, accuracy:100, desc:'燃燒的腳踢出火焰，使對手燒傷 3 回合（每回合扣 4% 體力）。', tags:[['火焰','red'],['燒傷','gold']], anima:'diable', effect:{burnChance:1, burnTurns:3}},
  {name:'特製海賊便當', type:'support', pp:5, maxPP:5, power:0, accuracy:100, desc:'一流廚師的料理：恢復 35% 體力並清除自身負面效果。', tags:[['回復','green'],['淨化','green']], anima:'cook', effect:{healRatio:0.35, clearSelfDebuffs:true}},
  {name:'空中步行 連踢', type:'attack', pp:6, maxPP:6, power:0, accuracy:100, desc:'踩著空氣連續踢擊 4 次，每次造成對手當前體力 4%～9%，並提升速度 +1。', tags:[['四連擊','blue'],['加速','green']], anima:'skywalk', effect:{randomPercentHits:[4,0.04,0.09,true], selfBuffSpd:1}},
  {name:'魔神風腳', type:'attack', pp:2, maxPP:2, power:160, accuracy:100, desc:'藍色火焰纏身的全力一踢，60% 使對手燒傷 3 回合，之後 2 回合傷害加倍、速度 +2。', tags:[['覺醒','gold'],['藍焰','blue']], anima:'ifrit', ultimate:true, effect:{damageMultTurns:2, damageMultValue:2, selfBuffSpd:2, burnChance:0.6, burnTurns:3}}
 ]},
 loki:{id:'loki', name:'洛基', title:'雷霆巨斧戰士', types:['雷電','冰'], image:'assets/chars/loki.webp', avatar:'assets/chars/loki_face.webp', scale:1.03, worldScale:1.08, maxHp:1560, baseSpeed:96, desc:'高耐久、極強控場與尼德霍格覺醒壓制。', ultimateBg:'assets/chars/loki.webp', ai:'control', skills:[
  {name:'雷電噴吐', type:'attack', pp:10, maxPP:10, power:108, accuracy:95, desc:'命中後附加 5 回合每回合 10% 持續傷害。', tags:[['感電','blue']], anima:'beam', effect:{dotTurns:5, dotRatio:0.10, dotLabel:'雷電爆蝕'}},
  {name:'鐵雷', type:'attack', pp:10, maxPP:10, power:108, accuracy:100, desc:'60% 機率造成 3 倍傷害並使對手麻痺 1 回合，30% 使對手破防 3 回合。', tags:[['重槌','red'],['麻痺','gold']], anima:'hammer', effect:{critBoost:0.6, critMult:3, skipAttackChance:0.6, skipAttackTurns:1, armorBreakChance:0.3, armorBreakTurns:3}},
  {name:'原初世界', type:'attack', pp:5, maxPP:5, power:0, accuracy:100, desc:'清除對方全部強化與自身異常，50% 使對手冰凍 2 回合（每回合扣 2%、速度下降），並連續攻擊 10 次，接下來兩回合傷害加倍。', tags:[['清強化','gold'],['冰凍','blue'],['十連擊','red']], anima:'world', effect:{clearBuffs:true, clearSelfDebuffs:true, freezeChance:0.5, freezeTurns:2, fixedLightHits:[10,0.02], damageMultTurns:2, damageMultValue:2}},
  {name:'鐵雷五矢', type:'attack', pp:4, maxPP:4, power:0, accuracy:100, desc:'連續攻擊 5 次，並使對方麻痺 1 回合；傷害與負面效果 2 倍反彈。', tags:[['五連擊','blue'],['反彈','gold']], anima:'thunderfive', effect:{fixedLightHits:[5,0.04], reflectTurns:1, reflectMultiplier:2, reflectNegative:true, skipAttackTurns:1}},
  {name:'尼德霍格覺醒', type:'support', pp:2, maxPP:2, power:0, accuracy:100, desc:'全能力 +2，連續兩回合恢復滿血，接下來兩回合傷害 5 倍且 20% 機率直接秒殺，附加冰凍傷害並永久免疫異常。', tags:[['覺醒','gold']], anima:'awaken', ultimate:true, effect:{awaken:'nidhogg', fullHeal:true, fullRestoreTurns:2, statUpAll:2, damageMultTurns:2, damageMultValue:5, executeBuffTurns:2, executeBuffChance:0.20, frostBoostTurns:2, immunePermanent:true}}
 ]},
 crocodile:{id:'crocodile' , name:'沙·克洛克達爾', title:'砂暴霸主', types:['沙','格鬥'], image:'assets/chars/crocodile.webp', avatar:'assets/chars/crocodile_face.webp', scale:.9, worldScale:.92, maxHp:1320, baseSpeed:100, desc:'砂刃、乾涸吸收與持續沙塵暴壓制。', ultimateBg:'assets/chars/crocodile.webp', ai:'sand', skills:[
  {name:'沙漠寶刀', type:'attack', pp:12, maxPP:12, power:92, accuracy:100, desc:'20% 機率直接減少對方當前 50% 血量，否則為普通攻擊。', tags:[['斬擊','red'],['削血','gold']], anima:'sandslash', effect:{chanceHalfHpCut:0.2}},
  {name:'沙漠向日葵', type:'support', pp:6, maxPP:6, power:0, accuracy:100, desc:'使對方疲憊 1 回合（無法使用技能），並隨機扣除一個技能次數 1；自己下回合傷害 1.5 倍。', tags:[['封鎖','gold'],['強化','green']], anima:'sandtrap', effect:{skipAttackTurns:1, ccKind:'fatigue', randomPPDown:1, nextAttackMult:1.5, nextAttackMultTurns:2}},
  {name:'金剛寶刀', type:'attack', pp:8, maxPP:8, power:0, accuracy:100, desc:'連續攻擊 3 次，每次造成對手當前 HP 1%～15% 傷害。', tags:[['三連擊','blue']], anima:'sandtriple', effect:{randomPercentHits:[3,0.01,0.15,true]}},
  {name:'侵蝕輪迴 / 乾涸', type:'attack', pp:5, maxPP:5, power:0, accuracy:100, desc:'吸取對手部分血量，自己攻防各 +2，並有 50% 機率使對手固化 1 回合。', tags:[['吸取','green'],['固化','gold']], anima:'dry', effect:{drainCurrentHpRange:[0.12,0.22], selfBuffAtk:2, selfBuffDef:2, petrifyChance:0.5, petrifyTurns:1}},
  {name:'沙嵐（沙塵暴）', type:'attack', pp:2, maxPP:2, power:100, accuracy:100, desc:'普通攻擊後，5 回合依序造成 5%、6%、7%、8%、最後 10%～20% 持續傷害。', tags:[['沙暴','gold']], anima:'sandstorm', ultimate:true, effect:{dotSequence:[[0.05,0.05],[0.06,0.06],[0.07,0.07],[0.08,0.08],[0.10,0.20]], dotLabel:'沙塵暴'}}
 ]},
 blackbeard:{id:'blackbeard', name:'馬歇爾·D·汀奇', title:'黑暗震震', types:['闇','格鬥'], image:'assets/chars/blackbeard.webp', avatar:'assets/chars/blackbeard_face.webp', scale:.92, worldScale:.95, maxHp:1460, baseSpeed:88, desc:'黑暗引力、震震爆發、技能奪取與護盾反打。', ultimateBg:'assets/chars/blackbeard.webp', ai:'dark', skills:[
  {name:'引力吸入', type:'attack', pp:7, maxPP:7, power:96, accuracy:100, desc:'持續吸取對方血量，使對方能力提升失效；50% 機率使對方恐懼 2 回合，並持續扣除 10% 血量。', tags:[['吸收','green'],['封鎖','gold']], anima:'darkpull', effect:{drainMaxHp:0.10, clearBuffs:true, buffBlockTurns:2, skipAttackChance:0.5, skipAttackTurns:2, ccKind:'fear', dotTurns:2, dotRatio:0.10, dotLabel:'黑暗侵蝕'}},
  {name:'引發震動', type:'attack', pp:5, maxPP:5, power:100, accuracy:100, desc:'30%傷害2.5倍、30%傷害5倍、20%傷害10倍、10%傷害20倍，其餘為普通震動傷害。', tags:[['震震','red']], anima:'quake', effect:{variableMultipliers:[[0.3,2.5],[0.3,5],[0.2,10],[0.1,20],[0.1,1]]}},
  {name:'闇穴道', type:'attack', pp:5, maxPP:5, power:0, accuracy:100, desc:'隨機奪取對方其中一個可安全使用的攻擊技能並反打；若會造成自身傷害或負面效果則該次無效。', tags:[['技能奪取','blue']], anima:'darkcopy', effect:{copyOpponentSkillSafe:true}},
  {name:'解放', type:'attack', pp:4, maxPP:4, power:0, accuracy:100, desc:'給予對手已損失血量2.5倍傷害，並獲得自身當前體力10%的護盾。', tags:[['終結','gold'],['護盾','green']], anima:'release', effect:{lostHpDamageMult:2.5, selfShieldCurrentHpRatio:0.10}},
  {name:'假裝認輸', type:'support', pp:2, maxPP:2, power:0, accuracy:100, desc:'全能力+1、恢復全部血量，接下來兩回合傷害加倍；對方直接扣除50%當前血量，並追加使用對方一個安全技能。', tags:[['覺醒','gold']], anima:'awaken', ultimate:true, effect:{statUpAll:1, fullHeal:true, damageMultTurns:2, damageMultValue:2, enemyCurrentHpCut:0.50, copyOpponentSkillAfter:true}}
 ]},
 enel:{id:'enel', name:'艾涅爾', title:'雷神', types:['雷電','神'], image:'assets/chars/enel.webp', avatar:'assets/chars/enel_face.webp', scale:.9, worldScale:.92, maxHp:1280, baseSpeed:124, desc:'神速雷擊、秒殺機率與雷神型態。', ultimateBg:'assets/chars/enel.webp', ai:'lightning', skills:[
  {name:'放電', type:'attack', pp:15, maxPP:15, power:0, accuracy:100, desc:'隨機放出 100～2000 萬伏特雷擊傷害。', tags:[['雷擊','blue']], anima:'lightning', effect:{randomPower:[70,300]}},
  {name:'電療', type:'support', pp:4, maxPP:4, power:0, accuracy:100, desc:'恢復全部血量，並使對手麻痺 1 回合（無法使用技能）。', tags:[['回滿','green'],['麻痺','gold']], anima:'heal', effect:{fullHeal:true, skipAttackTurns:1}},
  {name:'電光', type:'attack', pp:8, maxPP:8, power:112, accuracy:100, desc:'消除對手全部能力提升，清除自身全部負面效果，並給予光熱傷害。', tags:[['清強化','gold'],['淨化','green']], anima:'flash', effect:{clearBuffs:true, clearSelfDebuffs:true}},
  {name:'神之制裁', type:'attack', pp:3, maxPP:3, power:0, accuracy:100, desc:'10% 機率直接秒殺，否則自動施放一次放電。', tags:[['制裁','gold']], anima:'judgment', effect:{executeChance:0.10, fallbackSkill:'放電'}},
  {name:'二億伏特·雷神', type:'support', pp:2, maxPP:2, power:0, accuracy:100, desc:'進入巨大雷神戰鬥型態，接下來 2 回合傷害 5 倍，並減免 30% 所受傷害。', tags:[['雷神化','gold']], anima:'transform', ultimate:true, effect:{damageMultTurns:2, damageMultValue:5, damageReductionTurns:2, damageReductionValue:0.30}}
 ]},
 shirahoshi:{id:'shirahoshi', name:'白星', title:'海王波賽頓', types:['海王','神'], image:'assets/chars/shirahoshi.webp', avatar:'assets/chars/shirahoshi_face.webp', scale:.88, worldScale:.92, maxHp:1360, baseSpeed:96, desc:'高恢復、高護盾與海王類超大型爆發。', ultimateBg:'assets/chars/shirahoshi.webp', ai:'support', skills:[
  {name:'波賽頓', type:'attack', pp:10, maxPP:10, power:90, accuracy:100, desc:'5%直接秒殺；未秒殺則恢復5%血量並進行一次打擊。', tags:[['海王','blue'],['秒殺','gold']], anima:'poseidon', effect:{executeChance:0.05, fallbackHealRatio:0.05, fallbackPower:90}},
  {name:'聽見萬物的聲音', type:'support', pp:5, maxPP:5, power:0, accuracy:100, desc:'無視任何負面狀態皆可使用；使對手技能效果失效、恢復自身50%血量、清除對手能力提升與自身負面效果。', tags:[['必中使用','gold'],['淨化','green']], anima:'voice', effect:{unstoppable:true, healRatio:0.50, clearBuffs:true, clearSelfDebuffs:true, nullifyEnemySkillTurns:1}},
  {name:'召喚', type:'attack', pp:6, maxPP:6, power:0, accuracy:100, desc:'獲得自身當前體力1/2的護盾，並造成自身當前體力1/4的傷害。', tags:[['護盾','green']], anima:'summonsea', effect:{damageFromSelfCurrentHpRatio:0.25, selfShieldCurrentHpRatio:0.50}},
  {name:'命令海王類', type:'attack', pp:3, maxPP:3, power:100, accuracy:100, desc:'指揮超大型海王類造成10倍傷害，並獲得自身當前體力2倍護盾。', tags:[['海王類','blue'],['10倍','red']], anima:'seaking', effect:{forceMultiplier:10, selfShieldCurrentHpRatio:2.0}}
 ]},
 yamato:{id:'yamato', name:'大和', title:'光月御田的繼承者', types:['冰','神'], image:'assets/chars/yamato.webp', avatar:'assets/chars/yamato_face.webp', scale:.96, worldScale:.95, maxHp:1420, baseSpeed:114, desc:'纏繞霸氣的狼牙棒連打，與冰雪之神「大口真神」的守護。', ultimateBg:'assets/chars/yamato.webp', ai:'control', skills:[
  {name:'無侍冰牙', type:'attack', pp:15, maxPP:15, power:45, accuracy:100, desc:'對敵人普通攻擊 2～5 次，每次有 20% 機率附加冰凍傷害。', tags:[['連擊','blue'],['冰凍','blue']], anima:'icefang', effect:{multiHitNormal:[2,5], perHitPower:45, extraIceChance:0.2, extraIceRatio:0.06}},
  {name:'雷鳴八卦', type:'attack', pp:8, maxPP:8, power:110, accuracy:100, desc:'纏繞霸氣的狼牙棒高速突進，10% 機率打出 10 倍傷害；50% 使對手虛弱 2 回合（受到 1.2～1.5 倍傷害）。', tags:[['突進','red'],['虛弱','gold']], anima:'hakke', effect:{jackpotChance:0.1, jackpotMult:10, weakChance:0.5, weakTurns:2, weakRange:[1.2,1.5]}},
  {name:'鳴鏑', type:'support', pp:5, maxPP:5, power:0, accuracy:100, desc:'全能力 +1，下回合攻擊威力翻倍，並把自身所有負面效果與負面能力轉移給對手。', tags:[['強化','green'],['轉移','gold']], anima:'narukabura', effect:{statUpAll:1, nextAttackMult:2, nextAttackMultTurns:2, transferDebuffs:true}},
  {name:'鏡山', type:'attack', pp:5, maxPP:5, power:80, accuracy:100, desc:'獲得自身體力 50% 的護盾，3 回合內每回合回復 15% 體力，並對敵人普通攻擊一次。', tags:[['護盾','green'],['回復','green']], anima:'kagamiyama', effect:{selfShieldCurrentHpRatio:0.5, regenTurns:3, regenRatio:0.15}},
  {name:'大口真神形態', type:'support', pp:2, maxPP:2, power:0, accuracy:100, desc:'體力全滿，獲得最大體力 100% 的護盾，強制使對手冰凍 2 回合（每回合扣 2%、速度下降），下回合攻擊威力翻倍。', tags:[['覺醒','gold'],['冰凍','blue']], anima:'okuchi', ultimate:true, effect:{fullHeal:true, selfShieldMaxHpRatio:1, freezeForce:2, nextAttackMult:2, nextAttackMultTurns:2}}
 ]},
 robin:{id:'robin', name:'妮可·羅賓', title:'惡魔之子', types:['花花','格鬥'], image:'assets/chars/robin.webp', avatar:'assets/chars/robin_face.webp', scale:.90, worldScale:.92, maxHp:1280, baseSpeed:110, desc:'超多段攻擊、閃避、反彈與惡魔開花高倍率爆發。', ultimateBg:'assets/chars/robin.webp', ai:'control', skills:[
  {name:'繁衍肢體', type:'attack', pp:12, maxPP:12, power:0, accuracy:100, desc:'隨機進行1～100次普通攻擊。', tags:[['多段','blue']], anima:'limbs', effect:{randomHitCount:[1,100], perHitPower:10}},
  {name:'幻之翼', type:'support', pp:6, maxPP:6, power:0, accuracy:100, desc:'下回合躲避對方攻擊，並恢復10%血量。', tags:[['閃避','green']], anima:'wings', effect:{dodgeTurns:1, healRatio:0.10}},
  {name:'百花繚亂', type:'support', pp:5, maxPP:5, power:0, accuracy:100, desc:'反彈下一次敵人攻擊，並以2倍傷害返還。', tags:[['反彈','gold']], anima:'petals', effect:{reflectTurns:1, reflectMultiplier:2}},
  {name:'惡魔開花', type:'attack', pp:4, maxPP:4, power:100, accuracy:100, desc:'隨機造成10～100倍傷害，並有3%機率直接秒殺。', tags:[['惡魔','red'],['高倍率','gold']], anima:'demonflower', effect:{randomMultiplierRange:[10,100], executeChance:0.03}},
  {name:'萬紫千紅·巨大人形', type:'support', pp:2, maxPP:2, power:0, accuracy:100, desc:'威攝對手，使其接下來3回合傷害降低50%；若羅賓遭高額傷害後血量低於10%，立即回滿血一次。', tags:[['威攝','gold'],['瀕死回滿','green']], anima:'gigante', ultimate:true, effect:{enemyDamageReductionTurns:3, enemyDamageReductionValue:0.50, clutchHealThreshold:0.10, clutchHealCharges:1}}
 ]}

};
const CHARACTER_ORDER = ['luffy0','zoro','sanji','luffy','yamato','robin','shirahoshi','crocodile','enel','blackbeard','loki'];
const STARTERS = ['luffy0','zoro','sanji'];
const TYPE_COLORS = {'劍':'#7fb08a','火':'#e8553b','格鬥':'#c9973a','雷電':'#6fc3ff','冰':'#9fe6ff','沙':'#d9b064','闇':'#8a5cd6','神':'#f3d36b','海王':'#3fb6c9','花花':'#ef7fa8'};

/* 篇章：依漫畫時序排列。任務類型：talk 對話／talkAll 打聽多人／goto 前往地點／collect 收集／timedCollect 限時收集／
   defeat 擊敗／gauntlet 連戰（體力不回復）／choice 選擇題／boss。對白依原作情節改寫。 */
const CHAPTERS = [
 { id:'east', name:'東海篇', subtitle:'風車村的出航之日', art:'assets/chapters/east.webp', boss:'luffy', bossTitle:'戴草帽的少年',
   blurb:'十年前，紅髮香克斯把草帽託付給一個少年。今天，那個少年要從風車村出海了，而他想在出發前找個強者試試身手。',
   rhythm:'輕快的入門篇章：跑腿、聊天，再來一場送行之戰。',
   env:{sky:'#9fd6f5', fog:'#bfe3f6', ground:'#6c7f4a', sun:[0.55,0.9,0.35], fogR:[70,230]},
   spawn:[0,52], bossPos:[0,-58],
   npcs:[
    {id:'makino', name:'瑪琪諾', role:'港口酒館老闆娘', look:'makino', pos:[-10,40]},
    {id:'mayor', name:'村長', role:'風車村村長', look:'mayor', pos:[18,26]},
    {id:'roux', name:'紅髮海賊團的船員', role:'留下來喝一杯的老海賊', look:'crew', pos:[-24,18], chat:['老大把那頂帽子交出去的時候，我就知道這小子會出海。','近海霸主？那傢伙十年前就被老大一眼瞪跑了。']},
    {id:'kid', name:'村裡的孩子', role:'魯夫的小跟班', look:'kid', pos:[8,48], chat:['魯夫說他要找到一個大祕寶！','他每天都在岬角對著海揍空氣，好奇怪。']}
   ],
   steps:[
    {type:'talk', npc:'makino', title:'港口酒館', desc:'到酒館門口找瑪琪諾。', reward:1, lines:[
      ['makino','你是剛靠岸的航海者嗎？今天村子有點吵，魯夫終於要出海了。'],
      ['makino','那孩子從小就在我店裡喊著要當海賊王。可是他的小船上……除了草帽，什麼都沒帶。'],
      ['makino','他最愛吃肉了。能幫我把準備好的肉找回來嗎？剛才被海鷗叼走，掉在村子各處了。']]},
    {type:'collect', title:'出航用的肉', desc:'找回被海鷗叼走的 3 塊肉。', item:'出航用的肉', icon:'meat', count:3, spots:[[34,30],[-40,6],[22,-12]], reward:2},
    {type:'talk', npc:'mayor', title:'村長的嘆氣', desc:'把肉交給村長，請他轉交。', reward:2, unlockBoss:true, lines:[
      ['mayor','哼，又一個想當海賊的笨蛋。從那個紅髮的傢伙來過之後，這村子就沒安寧過。'],
      ['mayor','……不過，那小子是認真的。他在岬角等著，說出海前要跟一個真正的強者交手。'],
      ['mayor','去吧。打贏他，或者被他打飛，都算是替他送行了。']]},
    {type:'boss', title:'岬角的送行之戰', desc:'前往北方岬角，和戴草帽的少年交手。', reward:5}
   ]},
 { id:'alabasta', name:'阿拉巴斯坦篇', subtitle:'被偷走的雨', art:'assets/chapters/alabasta.webp', boss:'crocodile', bossTitle:'王下七武海 沙鱷魚',
   blurb:'三年沒有下雨，綠洲一座座乾涸，叛亂軍即將與王國軍開戰。人們把他當成英雄，沒人知道乾旱正是他一手造成的。',
   rhythm:'和時間賽跑：沙暴來襲前找回證據，再潛入敵人的大本營。',
   env:{sky:'#f2cf94', fog:'#efd3a4', ground:'#a27b45', sun:[0.4,0.95,0.2], fogR:[60,210]},
   spawn:[0,55], bossPos:[0,-60],
   npcs:[
    {id:'toto', name:'托托', role:'在尤巴挖井的老人', look:'toto', pos:[-18,30]},
    {id:'vivi', name:'薇薇', role:'阿拉巴斯坦公主', look:'vivi', pos:[12,40]},
    {id:'koza', name:'寇沙', role:'叛亂軍首領', look:'koza', pos:[26,12], chat:['國王偷走了雨，我們只能拿起武器。','……如果你說的是真的，那我們一直在跟誰打仗？']},
    {id:'kid', name:'尤巴的孩子', role:'綠洲的孩子', look:'kid', pos:[-6,50], chat:['爺爺每天都在挖，他說水一定還在沙子底下。']}
   ],
   steps:[
    {type:'talk', npc:'toto', title:'乾涸的尤巴', desc:'和在沙中挖井的托托說話。', reward:1, lines:[
      ['toto','旅人啊……尤巴被沙暴埋了，可我不相信這片土地會背叛我們。'],
      ['toto','最近常看到奇怪的人在夜裡往空中撒粉，隔天別的城市就下雨了。他們丟下了幾個袋子在沙丘間。'],
      ['toto','糟了，沙暴又要來了！趁袋子還沒被沙埋住，快去把它們挖出來！']]},
    {type:'timedCollect', title:'沙暴前的證據', desc:'沙暴來襲前，找回 3 袋能偷走雨水的「舞粉」。', item:'舞粉袋', icon:'sack', count:3, seconds:75, spots:[[-38,-4],[40,-10],[4,10]], reward:3},
    {type:'goto', title:'潛入雨地', desc:'循著舞粉的去向，前往東邊的賭場「雨宴」。', pos:[42,-26], r:7, label:'雨宴', reward:1, lines:[
      [null,'賭場地下傳出鱷魚的低吼。牆上掛著一張寫滿代號的名單。'],
      [null,'Mr.0……巴洛克工作社的老闆，就是克洛克達爾。他的特工發現你了！']]},
    {type:'defeat', title:'巴洛克工作社', desc:'擊退追上來的 2 位特工。', count:2, reward:3},
    {type:'talk', npc:'vivi', title:'公主的決心', desc:'把真相告訴薇薇公主。', reward:1, unlockBoss:true, lines:[
      ['vivi','偷走雨的不是父王，是巴洛克工作社……是被人民當成英雄的克洛克達爾。'],
      ['vivi','叛亂軍和王國軍就要在阿爾巴那開戰了。我要去阻止大家流血。'],
      ['vivi','拜託你，擋住那個男人！']]},
    {type:'boss', title:'阿爾巴那的決戰', desc:'前往王宮前廣場，擊敗克洛克達爾。', reward:5}
   ]},
 { id:'skypiea', name:'空島篇', subtitle:'神之國的鐘聲', art:'assets/chapters/skypiea.webp', boss:'enel', bossTitle:'自稱為神的男人',
   blurb:'在一萬公尺高的空島，聽得見所有聲音的男人自稱為神。四百年前沉默的黃金鐘，正等著再次響起。',
   rhythm:'先學會空島的規矩，再撐過神官的連續試煉。',
   env:{sky:'#bfe4ff', fog:'#e2f2ff', ground:'#c8d7e8', sun:[0.35,1.0,0.5], fogR:[80,260]},
   spawn:[0,55], bossPos:[0,-62],
   npcs:[
    {id:'conis', name:'柯妮絲', role:'天使島的少女', look:'conis', pos:[-14,40]},
    {id:'ganfall', name:'甘·福爾', role:'前任之神・空之騎士', look:'ganfall', pos:[16,30]},
    {id:'wiper', name:'懷帕', role:'香迪亞戰士', look:'wiper', pos:[-28,12], chat:['這片大地是我們祖先的故鄉，四百年來我們只想回家。','黃金鐘響起的那天，大戰士卡爾格拉的約定才算完成。']},
    {id:'pagaya', name:'帕加亞', role:'柯妮絲的父親', look:'pagaya', pos:[6,50], chat:['貝殼是空島的寶物，能存下聲音、風，甚至衝擊。','小聲點，神聽得見一切。']}
   ],
   steps:[
    {type:'choice', npc:'conis', title:'空島的規矩', desc:'聽柯妮絲說明空島，回答她的問題。', reward:2, lines:[
      ['conis','歡迎來到天使島……對不起，我得小聲說話，神‧艾涅爾能聽見整座島的聲音。'],
      ['conis','在這裡生活，得先懂得空島的東西。我考考你吧？']],
     questions:[
      {q:'空島上能儲存聲音、風、甚至衝擊的貝殼叫做什麼？', options:[{label:'貝（Dial）', correct:true},{label:'海樓石'},{label:'電話蟲'}], right:'答對了！貝是空島人的生活必需品。', wrong:'不對喔，那是青海的東西。再想想？'},
      {q:'神‧艾涅爾為什麼能聽見整座島的聲音？', options:[{label:'他在島上裝了電話蟲'},{label:'他擁有能感知聲音的「心綱」', correct:true},{label:'因為他的耳朵很大'}], right:'沒錯……所以大家都不敢說真心話。', wrong:'嘻……才不是呢。再想想看。'}]},
    {type:'collect', title:'香朵拉的黃金', desc:'在雲上遺跡找到 3 塊黃金碎片。', item:'香朵拉黃金', icon:'gold', count:3, spots:[[-36,-8],[36,-2],[0,14]], reward:2},
    {type:'gauntlet', title:'神官的連續試煉', desc:'連續擊敗 2 位神官，中途體力不會回復。輸掉要從頭再來。', count:2, reward:4},
    {type:'talk', npc:'ganfall', title:'前任之神', desc:'向甘·福爾報告。', reward:1, unlockBoss:true, lines:[
      ['ganfall','你撐過了試煉……那個男人六年前奪走了我的國家，現在又要把它毀掉。'],
      ['ganfall','他打造的方舟準備升空，要把空島所有的地面都劈成碎片。'],
      ['ganfall','雲門已經打開。記住，他的雷再快，也有他看不見的東西。']]},
    {type:'boss', title:'神之社的審判', desc:'登上神之社，擊敗艾涅爾。', reward:5}
   ]},
 { id:'enies', name:'司法島篇', subtitle:'向世界政府宣戰', art:'assets/chapters/enies.webp', boss:'robin', bossTitle:'不願被救的考古學家',
   blurb:'為了保護同伴，羅賓獨自走進了世界政府的司法島。她說她不想再被救了，可所有人都知道，那不是她的真心話。',
   rhythm:'一路強攻：連續突破正門，衝上司法之塔，對她喊出真心話。',
   env:{sky:'#a8c8e8', fog:'#c9dcee', ground:'#8a8f86', sun:[0.4,0.9,0.4], fogR:[70,230]},
   spawn:[0,55], bossPos:[0,-60],
   npcs:[
    {id:'franky', name:'佛朗基', role:'改造人・水之七島的船匠', look:'franky', pos:[-12,40]},
    {id:'kokoro', name:'可可羅婆婆', role:'海列車站長', look:'kokoro', pos:[16,34], chat:['喝喝喝！海列車可是冒著暴風浪把你們送來的。','司法島從來沒有被人攻破過……在今天之前。']},
    {id:'sogeking', name:'戴面具的狙擊手', role:'自稱來自狙擊之島的英雄', look:'sogeking', pos:[-26,14], chat:['我、我可不是誰的同伴！我是狙擊王！','我在八千人的島上……總之，我會掩護你的。']}
   ],
   steps:[
    {type:'talk', npc:'franky', title:'搶回同伴', desc:'和佛朗基商量攻島計畫。', reward:1, lines:[
      ['franky','超——！你也是來搶人的？那女人被政府帶走，全是因為她想保護別人。'],
      ['franky','正門的守衛一個接一個衝上來，停下來喘氣就完了。'],
      ['franky','一口氣殺進去吧！我在後面替你擋著！']]},
    {type:'gauntlet', title:'突破正門', desc:'連續擊敗 2 名守衛，途中體力不會回復。', count:2, reward:4},
    {type:'goto', title:'衝向司法之塔', desc:'穿過審判所，跑到司法之塔前的高台。', pos:[0,-34], r:8, label:'司法之塔前', reward:1, lines:[
      [null,'高塔上站著羅賓。她看見你們，臉色一下子變了。'],
      [null,'「為什麼要來！我不是說過，不要再管我了嗎！」']]},
    {type:'choice', npc:null, title:'說出真心話', desc:'對塔上的羅賓喊話。', reward:2, unlockBoss:true, lines:[],
     questions:[
      {q:'你要對羅賓喊出什麼？', options:[{label:'「妳說得對，我們回去了。」'},{label:'「只要妳說想活下去，我們就一定救妳！」', correct:true},{label:'「政府比較可怕，算了吧。」'}], right:'羅賓的肩膀在發抖。她想開口，卻先舉起了手——「那就先證明你們有那個本事！」', wrong:'這不是你真正想說的話。再喊一次。'}]},
    {type:'boss', title:'司法之塔的淚水', desc:'和想趕走大家的羅賓交手，讓她說出真心話。', reward:5}
   ]},
 { id:'dark', name:'黑暗海域', subtitle:'班納羅島的黑火', art:'assets/chapters/dark.webp', boss:'blackbeard', bossTitle:'黑鬍子 馬歇爾·D·汀奇',
   blurb:'他殺了自己的同伴，奪走傳說中的惡魔果實，逃出白鬍子海賊團。追著他的火拳，最後在這座島上追上了他。',
   rhythm:'推理調查：四處打聽目擊證詞，拼出黑鬍子的去向。',
   env:{sky:'#2a1d44', fog:'#231a39', ground:'#2c2440', sun:[0.3,0.8,0.5], fogR:[35,160]},
   spawn:[0,55], bossPos:[0,-60],
   npcs:[
    {id:'ace', name:'艾斯', role:'白鬍子海賊團二番隊隊長', look:'ace', pos:[-12,40]},
    {id:'elder', name:'島上的老人', role:'班納羅島居民', look:'elder', pos:[18,30]},
    {id:'girl', name:'逃難的少女', role:'被燒毀城鎮的孩子', look:'girl', pos:[-26,8]},
    {id:'fisher', name:'漁夫', role:'港口的倖存者', look:'fisher', pos:[30,4]}
   ],
   steps:[
    {type:'talk', npc:'ace', title:'追擊者', desc:'和追到島上的艾斯說話。', reward:1, lines:[
      ['ace','你也是來找他的？我叫艾斯。汀奇殺了我的隊員薩奇，那是船上最不能犯的罪。'],
      ['ace','身為隊長，我得親手把他帶回去。可這霧太濃了。'],
      ['ace','島上還有倖存的人，去問問他們看到了什麼。']]},
    {type:'talkAll', npcs:['elder','girl','fisher'], title:'倖存者的證詞', desc:'向島上 3 位倖存者打聽黑鬍子的下落。', reward:3, lines:{
      elder:[['elder','那傢伙一笑，房子就像被吸進黑洞一樣消失了。'],['elder','被他碰到的人，身上的果實能力會失效。']],
      girl:[['girl','我看到一個很胖的人，一邊吃派一邊說「時代要變了」……'],['girl','他往北邊的廢墟走了。']],
      fisher:[['fisher','他的船員說，要拿火拳的人頭去換七武海的位子。'],['fisher','他是故意在這裡等艾斯的！']]}},
    {type:'defeat', title:'霧中的伏兵', desc:'擊敗 2 位在霧裡伏擊的對手。', count:2, reward:3},
    {type:'goto', title:'廢墟入口', desc:'前往北方的廢墟入口與艾斯會合。', pos:[0,-38], r:8, label:'廢墟入口', reward:1, unlockBoss:true, lines:[
      ['ace','你來了。他就在裡面，笑得很開心。'],
      ['ace','別被他的黑暗抓住。……這是我的戰鬥，但我不介意多一個幫手。']]},
    {type:'boss', title:'廢墟中的黑暗', desc:'擊敗黑鬍子。', reward:5}
   ]},
 { id:'fishman', name:'魚人島篇', subtitle:'海底一萬公尺的哭泣公主', art:'assets/chapters/fishman.webp', boss:'shirahoshi', bossTitle:'暴走的海之力',
   blurb:'陽光透過樹根照進海底的魚人島。躲在硬殼塔十年的公主一哭，整片海的海王類都會回應她。',
   rhythm:'海底探索：沒有連戰，只有尋找與傾聽，最後平息暴走的海王類。',
   env:{sky:'#5fc4dc', fog:'#1f7f9f', ground:'#9a8a6a', sun:[0.2,1.0,0.3], fogR:[25,150]},
   spawn:[0,55], bossPos:[0,-60],
   npcs:[
    {id:'camie', name:'凱米', role:'章魚燒店的人魚', look:'camie', pos:[-12,40]},
    {id:'jinbe', name:'甚平', role:'前七武海・魚人空手道高手', look:'jinbe', pos:[20,26]},
    {id:'neptune', name:'尼普頓國王', role:'龍宮王國國王', look:'neptune', pos:[-28,10]},
    {id:'shyarly', name:'夏莉', role:'人魚咖啡廳的占卜師', look:'shyarly', pos:[8,48], chat:['我看見了……一團火焰，正在吞噬這座島。','預言從不說謊，只是人們不願意聽。']}
   ],
   steps:[
    {type:'talk', npc:'camie', title:'海底的樂園', desc:'和人魚凱米打招呼。', reward:1, lines:[
      ['camie','哇！是人類！你是怎麼游下來的？這裡可是海底一萬公尺喔！'],
      ['camie','魚人島的陽光全靠陽光樹伊布的樹根送下來。帶你去看看吧！']]},
    {type:'goto', title:'陽光樹伊布', desc:'游到島中央的陽光樹根部。', pos:[-34,-20], r:8, label:'陽光樹伊布', reward:1, lines:[
      [null,'樹根把海面的陽光一路送進海底，在沙地上灑下晃動的光斑。'],
      [null,'遠處傳來啜泣聲……海王類的影子在光斑外盤旋。']]},
    {type:'talkAll', npcs:['jinbe','neptune'], title:'公主的祕密', desc:'向甚平與尼普頓國王打聽哭聲的來源。', reward:2, lines:{
      jinbe:[['jinbe','那是白星公主。她被一個叫范德‧戴肯的男人糾纏了十年，只能躲在硬殼塔。'],['jinbe','她的聲音能呼喚海王類。這份力量，連她自己都控制不了。']],
      neptune:[['neptune','咩哈哈……那孩子今天被逼得太緊了，一哭起來，海王類全都聚過來了。'],['neptune','龍宮城附近有她最喜歡的珍珠。帶給她，也許能讓她安心。']]}},
    {type:'collect', title:'公主的珍珠', desc:'在珊瑚礁間找到 3 顆珍珠。', item:'珍珠', icon:'pearl', count:3, spots:[[36,-6],[-8,8],[42,24]], reward:2, unlockBoss:true},
    {type:'boss', title:'平息海王類', desc:'前往龍宮城前，平息暴走的海之力。', reward:5}
   ]},
 { id:'wano', name:'和之國篇', subtitle:'火祭之夜的鬼之島', art:'assets/chapters/wano.webp', boss:'yamato', bossTitle:'自稱光月御田的少女',
   blurb:'鎖國的武士之國，被百獸凱多統治了二十年。光月御田留下的話說：二十年後，九名武士將會歸來。',
   rhythm:'最長的篇章：幫助村民、召集同志、突破百獸海賊團，在火祭之夜渡海。',
   env:{sky:'#f0b8a0', fog:'#e8c0b0', ground:'#5f6b3a', sun:[0.5,0.8,0.3], fogR:[60,220]},
   spawn:[0,56], bossPos:[0,-62],
   npcs:[
    {id:'tama', name:'阿玉', role:'兔丼的小女忍者', look:'tama', pos:[-10,42]},
    {id:'kinemon', name:'錦衛門', role:'光月家的武士', look:'kinemon', pos:[20,30]},
    {id:'hiyori', name:'日和', role:'花之都的花魁', look:'hiyori', pos:[-30,14]},
    {id:'denjiro', name:'傳次郎', role:'潛伏二十年的武士', look:'denjiro', pos:[32,6]},
    {id:'kawamatsu', name:'河松', role:'河童武士', look:'kawamatsu', pos:[-38,-12]}
   ],
   steps:[
    {type:'talk', npc:'tama', title:'兔丼的孩子', desc:'和餓著肚子的阿玉說話。', reward:1, lines:[
      ['tama','你、你是外國人嗎？……阿玉沒事，阿玉只是有點餓。'],
      ['tama','兔丼的河被工廠的毒水污染了，米都種不出來。'],
      ['tama','山上還長著一些黍，做成黍糰子的話，大家就能吃飽了！']]},
    {type:'collect', title:'黍糰子的材料', desc:'在山坡上採集 3 束黍。', item:'黍', icon:'grain', count:3, spots:[[-40,-26],[38,-20],[10,-4]], reward:2},
    {type:'talk', npc:'kinemon', title:'光月家的武士', desc:'和錦衛門商量討伐計畫。', reward:1, lines:[
      ['kinemon','在下錦衛門。二十年前，主公光月御田被凱多處決，我們穿越時空來到了今天。'],
      ['kinemon','火祭之夜，凱多會在鬼之島開宴，那是唯一的機會。'],
      ['kinemon','散落各地的同志腳踝上都有「月牙」記號。請幫在下找到他們！']]},
    {type:'talkAll', npcs:['hiyori','denjiro','kawamatsu'], title:'月牙的同志', desc:'找到腳踝上刻著月牙的 3 位同志。', reward:3, lines:{
      hiyori:[['hiyori','你是錦衛門派來的？……我是光月日和，二十年來一直以花魁的身分等待這一天。'],['hiyori','我會帶著父親的刀，前往鬼之島。']],
      denjiro:[['denjiro','噓……在下在大蛇身邊忍了二十年，就是為了這一晚。'],['denjiro','火祭之夜，在下的人會在渡口接應。']],
      kawamatsu:[['kawamatsu','啊嚼……這條魚真好吃。你說月牙？呵呵，在下從沒忘記過。'],['kawamatsu','在監獄裡關了二十年，刀還是一樣利。']]}},
    {type:'defeat', title:'百獸海賊團的真打', desc:'擊退擋路的 2 名敵人。', count:2, reward:3},
    {type:'goto', title:'火祭之夜', desc:'前往北方渡口，準備渡海到鬼之島。', pos:[0,-40], r:8, label:'鬼之島渡口', reward:1, unlockBoss:true, lines:[
      [null,'煙火照亮了夜空。渡口邊站著一個頭上長角的少女，手裡握著狼牙棒。'],
      ['@yamato','我是光月御田！……不，我想成為御田。你就是那個會打倒凱多的人嗎？'],
      ['@yamato','在跟你一起去鬼之島之前，讓我親手確認你的覺悟！']]},
    {type:'boss', title:'渡口的試煉', desc:'和大和交手，證明你的覺悟。', reward:6}
   ]},
 { id:'giant', name:'巨人篇', subtitle:'艾爾巴夫的詛咒王子', art:'assets/chapters/giant.webp', boss:'loki', bossTitle:'詛咒王子 洛基',
   blurb:'戰士之國艾爾巴夫，寶樹亞當撐起了整片天空。王子洛基被鎖鏈困在樹下，巨人們說，他是這個國家的詛咒。',
   rhythm:'戰士之國的試煉：先打一場決鬥，再贏得巨人們的認可。',
   env:{sky:'#a9d8c8', fog:'#b9dccd', ground:'#3f5a2c', sun:[0.5,0.9,0.3], fogR:[60,220]},
   spawn:[0,58], bossPos:[0,-62],
   npcs:[
    {id:'dorry', name:'多利', role:'巨兵海賊團船長', look:'dorry', pos:[-16,38]},
    {id:'hajrudin', name:'哈吉爾汀', role:'新巨兵海賊團船長', look:'hajrudin', pos:[20,26]},
    {id:'brogy', name:'布洛基', role:'巨兵海賊團船長', look:'brogy', pos:[-4,48]}
   ],
   steps:[
    {type:'talk', npc:'dorry', title:'戰士之國', desc:'和巨人多利說話。', reward:1, lines:[
      ['dorry','葛基基基！是從海上來的小戰士啊。歡迎來到艾爾巴夫。'],
      ['dorry','在這裡，戰士用決鬥說話。先讓大家看看你的實力吧！']]},
    {type:'defeat', title:'戰士的決鬥', desc:'在森林中擊敗 1 位挑戰者。', count:1, reward:2},
    {type:'collect', title:'寶樹之果', desc:'採集 3 顆寶樹亞當的果實，獻給巨人們。', item:'寶樹之果', icon:'fruit', count:3, spots:[[-42,-6],[40,-8],[2,12]], reward:2},
    {type:'talkAll', npcs:['brogy','hajrudin'], title:'巨人們的認可', desc:'讓布洛基與哈吉爾汀認可你。', reward:2, unlockBoss:true, lines:{
      brogy:[['brogy','嘎巴巴巴！好吃的果實！我和多利在小花園決鬥了一百年，看人很準的。'],['brogy','你是真正的戰士。']],
      hajrudin:[['hajrudin','你想見洛基？那傢伙被鎖在寶樹底下，大家都說他是詛咒。'],['hajrudin','可最近鎖鏈一直在響……去吧，我替你解開外圍的封印。']]}},
    {type:'boss', title:'寶樹下的王子', desc:'前往寶樹亞當，擊敗洛基。', reward:6}
   ]}
];

const CHAPTER_DIFFICULTY = {
 east:{order:1,label:'新手',stars:1,hp:1.00,atk:0,def:0,spd:0,bossHp:1.15,bossStages:1,ai:0.82},
 alabasta:{order:2,label:'普通',stars:2,hp:1.10,atk:1,def:0,spd:0,bossHp:1.20,bossStages:1,ai:0.88},
 skypiea:{order:3,label:'普通',stars:2,hp:1.18,atk:1,def:1,spd:0,bossHp:1.22,bossStages:1,ai:0.94},
 enies:{order:4,label:'困難',stars:3,hp:1.26,atk:1,def:1,spd:1,bossHp:1.25,bossStages:1,ai:1.00},
 dark:{order:5,label:'困難',stars:3,hp:1.34,atk:2,def:1,spd:1,bossHp:1.28,bossStages:1,ai:1.04},
 fishman:{order:6,label:'極難',stars:4,hp:1.42,atk:2,def:1,spd:1,bossHp:1.30,bossStages:1,ai:1.08},
 wano:{order:7,label:'極難',stars:4,hp:1.50,atk:2,def:2,spd:1,bossHp:1.32,bossStages:1,ai:1.12},
 giant:{order:8,label:'傳說',stars:5,hp:1.60,atk:2,def:2,spd:2,bossHp:1.35,bossStages:1,ai:1.18}
};
const GAME_SETTINGS = {turnSeconds:20, stageStep:0.20, bossRevives:1, itemsPerBattle:3, startTokens:5, clearBonus:3, dailyLimit:2, unlockAll:false, charRate:0.03, charLv:20, shareExp:0.3, bossJoinFirst:0.5, bossJoinRepeat:0.2, bossJoinLv:20, lineupMax:3, atkStep:0.10, defStep:0.10, spdStep:0.05, freezeDot:0.02, burnDot:0.04, freezeSlow:0.25, weakDealt:0.15, armorBreak:0.05};

const ENCOUNTER_LINES = {
 luffy0:['我是要成為海賊王的男人！來打一場吧！','你很強嗎？那就讓我試試看！'],
 luffy:['嘿！你看起來很強嘛，跟我打一場！','我要成為海賊王，所以不會輸給你！'],
 loki:['渺小的東西，也敢來看被詛咒的王子？','這條鎖鏈困不住我，你也一樣。'],
 crocodile:['英雄？那不過是讓蠢貨聽話的稱號。','在沙漠裡，連你的血都會被曬乾。'],
 blackbeard:['澤哈哈哈！運氣真好，又一個送上門的！','時代要變了，擋路的全都吞掉！'],
 enel:['凡人啊，你的心跳聲，神都聽得一清二楚。','跪下吧，否則雷會替我審判你。'],
 shirahoshi:['對、對不起……可是我不能讓你過去！','海王類們，請借我一點勇氣。'],
 robin:['我想知道的歷史，不會讓任何人擋住。','開花吧。'],
 zoro:['我不會再輸給任何人了。','拔刀吧。'],
 sanji:['對女士以外的傢伙，我可不會手下留情。','抽根菸的時間，就能解決你。'],
 yamato:['我是光月御田！你就是那個會打倒凱多的人嗎？','讓我看看你的覺悟吧！']
};

/* 扭蛋道具：rarity N/R/SR/SSR */
const ITEMS = {
 potion_s:{name:'小回復藥水', rarity:'N', icon:'potion', color:'#6fd08c', desc:'恢復 25% 最大體力。', effect:{healRatio:0.25}},
 herb:{name:'淨化香草', rarity:'N', icon:'herb', color:'#9ad66b', desc:'清除自身所有異常狀態（冰凍、燒傷、麻痺、恐懼等）。', effect:{cleanse:true}},
 potion_l:{name:'大回復藥水', rarity:'R', icon:'potion', color:'#3fb6c9', desc:'恢復 60% 最大體力。', effect:{healRatio:0.60}},
 pp_s:{name:'技能補充劑', rarity:'R', icon:'flask', color:'#6fa8ff', desc:'所有技能使用次數 +2。', effect:{ppAll:2}},
 haki:{name:'霸氣藥劑', rarity:'R', icon:'flask', color:'#e8553b', desc:'攻擊能力 +2 階。', effect:{atkUp:2}},
 shield:{name:'鐵壁果實', rarity:'SR', icon:'fruit', color:'#c9973a', desc:'獲得 35% 最大體力的護盾。', effect:{shieldRatio:0.35}},
 tome:{name:'奧義秘卷', rarity:'SR', icon:'scroll', color:'#b58cff', desc:'奧義技能使用次數 +1，其餘技能 +1。', effect:{ppUlt:1, ppAll:1}},
 meat:{name:'海賊大肉', rarity:'SSR', icon:'meat', color:'#ff9a4a', desc:'體力全滿，並清除所有異常狀態與負面能力。', effect:{healRatio:1, cleanse:true}},
 exp_s:{name:'小經驗書', rarity:'N', icon:'book', color:'#9fd6f5', desc:'在船員畫面使用，角色經驗 +300。', effect:{exp:300}},
 exp_m:{name:'航海日誌', rarity:'R', icon:'book', color:'#5fb8ff', desc:'在船員畫面使用，角色經驗 +1500。', effect:{exp:1500}},
 exp_l:{name:'羅格鎮的傳說', rarity:'SR', icon:'book', color:'#c58bff', desc:'在船員畫面使用，角色經驗 +6000。', effect:{exp:6000}},
 feather:{name:'不死鳥之羽', rarity:'SSR', icon:'feather', color:'#ffd26c', desc:'本場戰鬥倒下時，以 50% 體力復活一次。', effect:{revive:0.5}}
};
const RARITY = {
 N:{rate:0.55, label:'N', color:'#9fb3c4'},
 R:{rate:0.30, label:'R', color:'#5fb8ff'},
 SR:{rate:0.12, label:'SR', color:'#c58bff'},
 SSR:{rate:0.03, label:'SSR', color:'#ffcf5a'}
};
const GACHA_COST = {single:1, ten:9};

const DEFAULT_NEWS = [
 {id:'n6', date:'2026-09-28', tag:'更新', title:'航海日誌 3.0：船員培養與陣容戰鬥', body:'新玩家會得到 LV1 的初登場魯夫、索隆、香吉士。最多 3 人上陣，戰鬥中可以換人，出戰者倒下時換下一位。打贏敵人、推進劇情都能拿到經驗與貝里。'},
 {id:'n5', date:'2026-09-28', tag:'活動', title:'新手拉霸：免費召喚 LV100 船員', body:'第一次出航的船長可以在懸賞處免費拉一次拉霸，三格對齊的船員會以 LV100 加入角色背包。'},
 {id:'n4', date:'2026-09-28', tag:'公告', title:'懸賞處與海軍本部開放', body:'懸賞處可以召喚、接懸賞任務賺貝里、在商店購買道具。不需要的船員可以交給海軍本部換貝里或經驗，交出後無法反悔。'},
 {id:'n3', date:'2026-09-28', tag:'調整', title:'異常狀態與能力階級規則', body:'攻擊、防禦每階 ±10%，速度每階 ±5%，上下限 ±6。異常狀態包含冰凍、燒傷、虛弱、破防，以及會讓角色無法使用技能的疲憊、麻痺、恐懼、固化。'},
 {id:'n2', date:'2026-09-27', tag:'更新', title:'新篇章：司法島、魚人島、和之國', body:'偉大航路擴充到 8 座島嶼，每章的任務節奏都不同。和之國篇的渡口，大和正在等你。'}
];

/* ---------- 角色培養 ---------- */
const MAX_LV = 100;
const TIERS = [
 {min:1, name:'見習海賊', color:'#9fb3c4'}, {min:20, name:'超新星', color:'#6fd08c'}, {min:40, name:'七武海級', color:'#5fb8ff'},
 {min:60, name:'大將級', color:'#c58bff'}, {min:80, name:'四皇級', color:'#ff9a4a'}, {min:100, name:'海賊王級', color:'#ffcf5a'}
];
const SKILL_UNLOCK = [1, 10, 30, 40, 60];
const ENEMY_LEVEL = {east:5, alabasta:14, skypiea:24, enies:34, dark:45, fishman:56, wano:68, giant:82};
const BOSS_LEVEL_BONUS = 6;
const GACHA_CHAR_RATE = 0.03, GACHA_CHAR_LV = 20;
function expNeed(lv) { return Math.round(20 + lv * 6 + lv * lv * 0.1); }
/* 技能次數：LV1 起為原設 -3，LV30 +1，LV60 +2，LV100 恢復原設上限（至少 1 次） */
function ppDeltaAt(lv) { return lv >= MAX_LV ? 0 : lv >= 60 ? -1 : lv >= 30 ? -2 : -3; }
function tierOf(lv) { let t = 0; TIERS.forEach((x, i) => { if (lv >= x.min) t = i; }); return t; }
function lvStats(c, lv) {
  const k = lv / MAX_LV, t = tierOf(lv);
  return { hp: Math.round(c.maxHp * (0.40 + 0.60 * Math.pow(k, 0.9))), spd: Math.round(c.baseSpeed * (0.8 + 0.2 * k)), dmg: +(0.45 + 0.55 * k).toFixed(3), ppAdj: lv >= 100 ? 0 : lv >= 60 ? -1 : lv >= 30 ? -2 : -3 };
}

/* 商店：用貝里購買（貝里由戰鬥與任務取得） */
const SHOP = [
 {id:'potion_s', price:300}, {id:'herb', price:300}, {id:'potion_l', price:900}, {id:'pp_s', price:800},
 {id:'haki', price:1000}, {id:'exp_s', price:500}, {id:'exp_m', price:2200}
];
