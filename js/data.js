/* 遊戲資料：角色（沿用原版數值）、篇章劇情、道具、公告 */
const CHARACTERS = {
 luffy:{id:'luffy', name:'魯夫', title:'太陽神候補', types:['火','格鬥'], image:'assets/chars/luffy.webp', avatar:'assets/chars/luffy_face.webp', scale:.82, worldScale:.86, maxHp:1260, baseSpeed:118, desc:'近身爆發、高機率爆擊與覺醒後的持續壓制。', ultimateBg:'assets/chars/luffy.webp', ai:'aggressive', skills:[
  {name:'橡膠手槍', type:'attack', pp:15, maxPP:15, power:95, accuracy:100, desc:'60% 機率造成 2.5 倍傷害。', tags:[['爆發','red']], anima:'punch', effect:{critBoost:0.6, critMult:2.5}},
  {name:'橡膠火箭砲', type:'attack', pp:10, maxPP:10, power:0, accuracy:100, desc:'連續 5 次，每次造成對方最大 HP 1%～10% 傷害。', tags:[['五連擊','blue']], anima:'barrage', effect:{randomPercentHits:[5,0.01,0.10,false]}},
  {name:'解放的鼓動', type:'support', pp:5, maxPP:5, power:0, accuracy:100, desc:'3 回合每回合回 20%，並免疫異常。', tags:[['回復','green'],['免疫','gold']], anima:'heal', effect:{regenTurns:3, regenRatio:0.20, immuneTurns:3}},
  {name:'大蛇人', type:'attack', pp:6, maxPP:6, power:0, accuracy:100, desc:'扣當前 10% HP，下回合先制，並讓對手 2 回合有 50% 失敗率。', tags:[['先制','blue'],['封招','gold']], anima:'snake', effect:{currentHpCut:0.10, selfPriority:1, attackFailTurns:2, attackFailChance:0.5}},
  {name:'太陽神尼卡覺醒', type:'support', pp:2, maxPP:2, power:0, accuracy:100, desc:'全能力 +1、全回復，2 回合傷害加倍。每多 1 位夥伴再加 2.5%。', tags:[['覺醒','gold']], anima:'awaken', ultimate:true, effect:{awaken:'nika', fullHeal:true, statUpAll:1, damageMultTurns:2, damageMultValue:2, allyBoostPer:0.025}}
 ]},
 loki:{id:'loki', name:'洛基', title:'雷霆巨斧戰士', types:['雷電','冰'], image:'assets/chars/loki.webp', avatar:'assets/chars/loki_face.webp', scale:1.03, worldScale:1.08, maxHp:1560, baseSpeed:96, desc:'高耐久、極強控場與尼德霍格覺醒壓制。', ultimateBg:'assets/chars/loki.webp', ai:'control', skills:[
  {name:'雷電噴吐', type:'attack', pp:10, maxPP:10, power:108, accuracy:95, desc:'命中後附加 5 回合每回合 10% 持續傷害。', tags:[['感電','blue']], anima:'beam', effect:{dotTurns:5, dotRatio:0.10, dotLabel:'雷電爆蝕'}},
  {name:'鐵雷', type:'attack', pp:10, maxPP:10, power:108, accuracy:100, desc:'60% 機率造成 3 倍傷害，並讓對手暈眩 1 回合。', tags:[['重槌','red'],['暈眩','gold']], anima:'hammer', effect:{critBoost:0.6, critMult:3, skipAttackChance:0.6, skipAttackTurns:1}},
  {name:'原初世界', type:'attack', pp:5, maxPP:5, power:0, accuracy:100, desc:'清除對方全部強化與自身異常，50% 冰凍對手，並連續攻擊 10 次，接下來兩回合傷害加倍。', tags:[['清強化','gold'],['冰凍','blue'],['十連擊','red']], anima:'world', effect:{clearBuffs:true, clearSelfDebuffs:true, freezeChance:0.5, fixedLightHits:[10,0.02], damageMultTurns:2, damageMultValue:2}},
  {name:'鐵雷五矢', type:'attack', pp:4, maxPP:4, power:0, accuracy:100, desc:'連續攻擊 5 次，並使對方下回合攻擊無效；傷害與負面效果 2 倍反彈。', tags:[['五連擊','blue'],['反彈','gold']], anima:'thunderfive', effect:{fixedLightHits:[5,0.04], reflectTurns:1, reflectMultiplier:2, reflectNegative:true, skipAttackTurns:1}},
  {name:'尼德霍格覺醒', type:'support', pp:2, maxPP:2, power:0, accuracy:100, desc:'全能力 +2，連續兩回合恢復滿血，接下來兩回合傷害 5 倍且 20% 機率直接秒殺，附加冰凍傷害並永久免疫異常。', tags:[['覺醒','gold']], anima:'awaken', ultimate:true, effect:{awaken:'nidhogg', fullHeal:true, fullRestoreTurns:2, statUpAll:2, damageMultTurns:2, damageMultValue:5, executeBuffTurns:2, executeBuffChance:0.20, frostBoostTurns:2, immunePermanent:true}}
 ]},
 crocodile:{id:'crocodile' , name:'沙·克洛克達爾', title:'砂暴霸主', types:['沙','格鬥'], image:'assets/chars/crocodile.webp', avatar:'assets/chars/crocodile_face.webp', scale:.9, worldScale:.92, maxHp:1320, baseSpeed:100, desc:'砂刃、乾涸吸收與持續沙塵暴壓制。', ultimateBg:'assets/chars/crocodile.webp', ai:'sand', skills:[
  {name:'沙漠寶刀', type:'attack', pp:12, maxPP:12, power:92, accuracy:100, desc:'20% 機率直接減少對方當前 50% 血量，否則為普通攻擊。', tags:[['斬擊','red'],['削血','gold']], anima:'sandslash', effect:{chanceHalfHpCut:0.2}},
  {name:'沙漠向日葵', type:'support', pp:6, maxPP:6, power:0, accuracy:100, desc:'對方下回合無法攻擊，並隨機扣除一個技能 PP 1；自己下回合傷害 1.5 倍。', tags:[['封鎖','gold'],['強化','green']], anima:'sandtrap', effect:{skipAttackTurns:1, randomPPDown:1, nextAttackMult:1.5, nextAttackMultTurns:1}},
  {name:'金剛寶刀', type:'attack', pp:8, maxPP:8, power:0, accuracy:100, desc:'連續攻擊 3 次，每次造成對手當前 HP 1%～15% 傷害。', tags:[['三連擊','blue']], anima:'sandtriple', effect:{randomPercentHits:[3,0.01,0.15,true]}},
  {name:'侵蝕輪迴 / 乾涸', type:'attack', pp:5, maxPP:5, power:0, accuracy:100, desc:'吸取對手部分血量，自己攻防各 +2，並有 50% 機率使對手固化 2 回合。', tags:[['吸取','green'],['固化','gold']], anima:'dry', effect:{drainCurrentHpRange:[0.12,0.22], selfBuffAtk:2, selfBuffDef:2, petrifyChance:0.5, petrifyTurns:2}},
  {name:'沙嵐（沙塵暴）', type:'attack', pp:2, maxPP:2, power:100, accuracy:100, desc:'普通攻擊後，5 回合依序造成 5%、6%、7%、8%、最後 10%～20% 持續傷害。', tags:[['沙暴','gold']], anima:'sandstorm', ultimate:true, effect:{dotSequence:[[0.05,0.05],[0.06,0.06],[0.07,0.07],[0.08,0.08],[0.10,0.20]], dotLabel:'沙塵暴'}}
 ]},
 blackbeard:{id:'blackbeard', name:'馬歇爾·D·汀奇', title:'黑暗震震', types:['闇','格鬥'], image:'assets/chars/blackbeard.webp', avatar:'assets/chars/blackbeard_face.webp', scale:.92, worldScale:.95, maxHp:1460, baseSpeed:88, desc:'黑暗引力、震震爆發、技能奪取與護盾反打。', ultimateBg:'assets/chars/blackbeard.webp', ai:'dark', skills:[
  {name:'引力吸入', type:'attack', pp:7, maxPP:7, power:96, accuracy:100, desc:'持續吸取對方血量，使對方能力提升失效；50%機率兩回合無法攻擊，並持續扣除10%血量。', tags:[['吸收','green'],['封鎖','gold']], anima:'darkpull', effect:{drainMaxHp:0.10, clearBuffs:true, buffBlockTurns:2, skipAttackChance:0.5, skipAttackTurns:2, dotTurns:2, dotRatio:0.10, dotLabel:'黑暗侵蝕'}},
  {name:'引發震動', type:'attack', pp:5, maxPP:5, power:100, accuracy:100, desc:'30%傷害2.5倍、30%傷害5倍、20%傷害10倍、10%傷害20倍，其餘為普通震動傷害。', tags:[['震震','red']], anima:'quake', effect:{variableMultipliers:[[0.3,2.5],[0.3,5],[0.2,10],[0.1,20],[0.1,1]]}},
  {name:'闇穴道', type:'attack', pp:5, maxPP:5, power:0, accuracy:100, desc:'隨機奪取對方其中一個可安全使用的攻擊技能並反打；若會造成自身傷害或負面效果則該次無效。', tags:[['技能奪取','blue']], anima:'darkcopy', effect:{copyOpponentSkillSafe:true}},
  {name:'解放', type:'attack', pp:4, maxPP:4, power:0, accuracy:100, desc:'給予對手已損失血量2.5倍傷害，並獲得自身當前體力10%的護盾。', tags:[['終結','gold'],['護盾','green']], anima:'release', effect:{lostHpDamageMult:2.5, selfShieldCurrentHpRatio:0.10}},
  {name:'假裝認輸', type:'support', pp:2, maxPP:2, power:0, accuracy:100, desc:'全能力+1、恢復全部血量，接下來兩回合傷害加倍；對方直接扣除50%當前血量，並追加使用對方一個安全技能。', tags:[['覺醒','gold']], anima:'awaken', ultimate:true, effect:{statUpAll:1, fullHeal:true, damageMultTurns:2, damageMultValue:2, enemyCurrentHpCut:0.50, copyOpponentSkillAfter:true}}
 ]},
 enel:{id:'enel', name:'艾涅爾', title:'雷神', types:['雷電','神'], image:'assets/chars/enel.webp', avatar:'assets/chars/enel_face.webp', scale:.9, worldScale:.92, maxHp:1280, baseSpeed:124, desc:'神速雷擊、秒殺機率與雷神型態。', ultimateBg:'assets/chars/enel.webp', ai:'lightning', skills:[
  {name:'放電', type:'attack', pp:15, maxPP:15, power:0, accuracy:100, desc:'隨機放出 100～2000 萬伏特雷擊傷害。', tags:[['雷擊','blue']], anima:'lightning', effect:{randomPower:[70,300]}},
  {name:'電療', type:'support', pp:4, maxPP:4, power:0, accuracy:100, desc:'恢復全部血量，並使對手麻痺 1 回合無法行動。', tags:[['回滿','green'],['麻痺','gold']], anima:'heal', effect:{fullHeal:true, skipAttackTurns:1}},
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
 robin:{id:'robin', name:'妮可·羅賓', title:'惡魔之子', types:['花花','格鬥'], image:'assets/chars/robin.webp', avatar:'assets/chars/robin_face.webp', scale:.90, worldScale:.92, maxHp:1280, baseSpeed:110, desc:'超多段攻擊、閃避、反彈與惡魔開花高倍率爆發。', ultimateBg:'assets/chars/robin.webp', ai:'control', skills:[
  {name:'繁衍肢體', type:'attack', pp:12, maxPP:12, power:0, accuracy:100, desc:'隨機進行1～100次普通攻擊。', tags:[['多段','blue']], anima:'limbs', effect:{randomHitCount:[1,100], perHitPower:10}},
  {name:'幻之翼', type:'support', pp:6, maxPP:6, power:0, accuracy:100, desc:'下回合躲避對方攻擊，並恢復10%血量。', tags:[['閃避','green']], anima:'wings', effect:{dodgeTurns:1, healRatio:0.10}},
  {name:'百花繚亂', type:'support', pp:5, maxPP:5, power:0, accuracy:100, desc:'反彈下一次敵人攻擊，並以2倍傷害返還。', tags:[['反彈','gold']], anima:'petals', effect:{reflectTurns:1, reflectMultiplier:2}},
  {name:'惡魔開花', type:'attack', pp:4, maxPP:4, power:100, accuracy:100, desc:'隨機造成10～100倍傷害，並有3%機率直接秒殺。', tags:[['惡魔','red'],['高倍率','gold']], anima:'demonflower', effect:{randomMultiplierRange:[10,100], executeChance:0.03}},
  {name:'萬紫千紅·巨大人形', type:'support', pp:2, maxPP:2, power:0, accuracy:100, desc:'威攝對手，使其接下來3回合傷害降低50%；若羅賓遭高額傷害後血量低於10%，立即回滿血一次。', tags:[['威攝','gold'],['瀕死回滿','green']], anima:'gigante', ultimate:true, effect:{enemyDamageReductionTurns:3, enemyDamageReductionValue:0.50, clutchHealThreshold:0.10, clutchHealCharges:1}}
 ]}

};
const CHARACTER_ORDER = ['luffy','loki','crocodile','blackbeard','enel','shirahoshi','robin'];
const TYPE_COLORS = {'火':'#e8553b','格鬥':'#c9973a','雷電':'#6fc3ff','冰':'#9fe6ff','沙':'#d9b064','闇':'#8a5cd6','神':'#f3d36b','海王':'#3fb6c9','花花':'#ef7fa8'};

/* 篇章：想換成官方篇章圖，只要把圖放到 assets/chapters/ 並改 art 路徑即可 */
const CHAPTERS = [
 { id:'east', name:'東海篇', subtitle:'風車村的漂流巨人', art:'assets/chapters/east.webp', boss:'loki', bossTitle:'漂流的雷霆巨人',
   blurb:'一場怪異的雷暴把巨人沖上風車村的岬角，港口的船一艘接一艘被劈碎。',
   env:{sky:'#9fd6f5', fog:'#bfe3f6', ground:'#6c7f4a', sun:[0.55,0.9,0.35], fogR:[70,230]},
   spawn:[0,52], bossPos:[0,-58],
   npcs:[
    {id:'chief', name:'村長 老錨', role:'風車村村長', look:'elder', pos:[-10,40]},
    {id:'smith', name:'造船匠 鐵釘', role:'港口造船匠', look:'worker', pos:[18,26]},
    {id:'girl', name:'酒館的瑪琳', role:'酒館老闆娘', look:'lady', pos:[-24,18], chat:['最近雷聲大得連酒杯都在跳。','你要出海？先把肚子填飽再說。']},
    {id:'kid', name:'小帆', role:'想當海賊的孩子', look:'kid', pos:[8,48], chat:['我以後也要有自己的船！','岬角那邊的閃電好像會說話……']}
   ],
   steps:[
    {type:'talk', npc:'chief', title:'拜訪村長', desc:'到村子中央找村長老錨了解狀況。', reward:1, lines:[
      ['chief','你就是新來的航海者？來得正好。三天前一場怪雷把巨人沖上了北邊岬角。'],
      ['chief','他醒來後就不停揮舞那把雷錘，港口已經有四艘船被劈成柴火。'],
      ['chief','前任航海士留下的海圖被暴風吹散在海灘上，拼起來才找得到通往岬角的淺灘。拜託你了。']]},
    {type:'collect', title:'尋找海圖碎片', desc:'在海灘與碼頭附近撿回 3 片海圖碎片。', item:'海圖碎片', icon:'map', count:3, spots:[[34,30],[-40,6],[22,-12]], reward:2},
    {type:'defeat', title:'擊退挑戰者', desc:'港口有人趁亂鬧事，擊敗其中 2 位。', count:2, reward:3},
    {type:'talk', npc:'smith', title:'修好淺灘木橋', desc:'把海圖交給造船匠鐵釘。', reward:1, unlockBoss:true, lines:[
      ['smith','海圖拼好了？讓我看看……原來淺灘在這裡。'],
      ['smith','我連夜把木橋接上，你可以直接走到岬角。巨人身邊的雷光屏障也會跟著消失。'],
      ['smith','別硬拚他的雷錘，撐到他露出破綻再反擊。']]},
    {type:'boss', title:'挑戰岬角的巨人', desc:'前往北方岬角，擊敗雷霆巨人。', reward:5}
   ]},
 { id:'alabasta', name:'阿拉巴斯坦篇', subtitle:'乾涸的王國', art:'assets/chapters/alabasta.webp', boss:'crocodile', bossTitle:'砂暴霸主',
   blurb:'整整三年沒有下雨，綠洲一座接一座消失，王宮前卻有人在操縱沙暴。',
   env:{sky:'#f2cf94', fog:'#efd3a4', ground:'#a27b45', sun:[0.4,0.95,0.2], fogR:[60,210]},
   spawn:[0,55], bossPos:[0,-60],
   npcs:[
    {id:'leader', name:'反抗軍 卡札', role:'反抗軍隊長', look:'warrior', pos:[12,40]},
    {id:'granny', name:'綠洲婆婆', role:'守著最後的水井', look:'elder', pos:[-18,30]},
    {id:'merchant', name:'商隊的哈桑', role:'駱駝商人', look:'worker', pos:[26,12], chat:['往北的路都被沙埋了，我已經繞了三天。','王宮那邊的天空總是黃濛濛的。']},
    {id:'boy', name:'送水少年', role:'村裡的孩子', look:'kid', pos:[-6,50], chat:['只要一杯水，媽媽就能好起來了。']}
   ],
   steps:[
    {type:'talk', npc:'granny', title:'綠洲的請託', desc:'和綠洲婆婆說話。', reward:1, lines:[
      ['granny','旅人……這口井也快見底了。'],
      ['granny','商隊逃走時丟下了幾個水袋，就埋在沙丘裡。先把它們帶回來給孩子們吧。']]},
    {type:'collect', title:'找回水袋', desc:'在沙丘間找到 3 個水袋。', item:'水袋', icon:'water', count:3, spots:[[-38,-4],[40,-10],[4,10]], reward:2},
    {type:'defeat', title:'擊退沙漠刺客', desc:'有人在暗處埋伏反抗軍，擊敗 2 位對手。', count:2, reward:3},
    {type:'talk', npc:'leader', title:'與反抗軍會合', desc:'向反抗軍隊長卡札報告。', reward:1, unlockBoss:true, lines:[
      ['leader','是你幫了綠洲？謝了，這份人情反抗軍記住了。'],
      ['leader','乾旱不是天災，是有人拿沙暴在吸乾整個國家。那傢伙就站在王宮前的廣場上。'],
      ['leader','我們的人會拖住外圍，王宮大門交給你。']]},
    {type:'boss', title:'王宮前的決戰', desc:'前往王宮廣場，擊敗砂暴霸主。', reward:5}
   ]},
 { id:'skypiea', name:'空島篇', subtitle:'雲端上的審判', art:'assets/chapters/skypiea.webp', boss:'enel', bossTitle:'自稱為神的雷霆',
   blurb:'一萬公尺高的雲海上，有人自稱為神，用雷聲審判每一個說出反對的人。',
   env:{sky:'#bfe4ff', fog:'#e2f2ff', ground:'#c8d7e8', sun:[0.35,1.0,0.5], fogR:[80,260]},
   spawn:[0,55], bossPos:[0,-62],
   npcs:[
    {id:'elder', name:'雲島長老', role:'天使島的長老', look:'elder', pos:[-14,40]},
    {id:'guard', name:'雲之守衛', role:'雲海巡邏隊', look:'warrior', pos:[16,30]},
    {id:'singer', name:'雲上歌手', role:'吟遊詩人', look:'lady', pos:[-28,12], chat:['在這裡，說錯一句話雷就會落下來。','所以大家都學會了用歌聲說話。']},
    {id:'kid', name:'抱著雲朵的孩子', role:'天使島居民', look:'kid', pos:[6,50], chat:['你是從青海來的嗎？下面真的有地面？']}
   ],
   steps:[
    {type:'talk', npc:'elder', title:'來自青海的客人', desc:'拜見雲島長老。', reward:1, lines:[
      ['elder','能從青海爬上來的人，好久不見了。'],
      ['elder','島上的雷雲貝殼能吸收雷聲。只要收集三枚，神殿的雷就傷不到你太深。']]},
    {type:'collect', title:'收集雷雲貝殼', desc:'在雲海浮島上找到 3 枚雷雲貝殼。', item:'雷雲貝殼', icon:'shell', count:3, spots:[[-36,-8],[36,-2],[0,14]], reward:2},
    {type:'defeat', title:'通過神官試煉', desc:'擊敗 2 位在雲端巡守的對手。', count:2, reward:3},
    {type:'talk', npc:'guard', title:'打開雲之門', desc:'請雲之守衛開啟通往神殿的雲門。', reward:1, unlockBoss:true, lines:[
      ['guard','你真的通過試煉了……那我也不怕了。'],
      ['guard','雲門已經打開。記住，他的雷再快，也有喘息的時候。']]},
    {type:'boss', title:'神之社的審判', desc:'登上神之社，擊敗自稱為神的男人。', reward:5}
   ]},
 { id:'dark', name:'黑暗海域', subtitle:'沉沒的燈塔', art:'assets/chapters/dark.webp', boss:'blackbeard', bossTitle:'吞噬黑暗的海賊',
   blurb:'燈塔熄滅之後，這片海域就只剩下黑色的霧，和一陣陣令人作嘔的震動。',
   env:{sky:'#2a1d44', fog:'#231a39', ground:'#2c2440', sun:[0.3,0.8,0.5], fogR:[35,160]},
   spawn:[0,55], bossPos:[0,-60],
   npcs:[
    {id:'keeper', name:'守燈人 老霧', role:'燈塔最後的守燈人', look:'elder', pos:[-12,40]},
    {id:'sailor', name:'逃亡的水手', role:'被擊沉船隻的倖存者', look:'worker', pos:[18,30]},
    {id:'ghost', name:'迷路的少女', role:'不知從哪來的孩子', look:'lady', pos:[-26,8], chat:['霧裡有人在笑……你聽見了嗎？']}
   ],
   steps:[
    {type:'talk', npc:'keeper', title:'熄滅的燈塔', desc:'向守燈人老霧打聽燈塔的事。', reward:1, lines:[
      ['keeper','燈塔熄了七天。沒有光，船就會一艘一艘撞上暗礁。'],
      ['keeper','燈芯散落在礁岩間，能找回三根，我就能再點亮它。']]},
    {type:'collect', title:'找回燈芯', desc:'在礁岩間找回 3 根燈芯。', item:'燈芯', icon:'flame', count:3, spots:[[-40,-6],[38,-14],[6,6]], reward:2},
    {type:'defeat', title:'霧中的敵人', desc:'擊敗 2 位潛伏在霧中的對手。', count:2, reward:3},
    {type:'talk', npc:'sailor', title:'倖存者的證言', desc:'聽逃亡的水手說出真相。', reward:1, unlockBoss:true, lines:[
      ['sailor','燈塔亮了……我終於看清楚了。把我們的船吞下去的，是一團會笑的黑暗。'],
      ['sailor','他就在北邊的破碎要塞。有光在，他的黑暗屏障就撐不住了。']]},
    {type:'boss', title:'破碎要塞的黑暗', desc:'前往破碎要塞，擊敗吞噬黑暗的海賊。', reward:5}
   ]},
 { id:'giant', name:'巨人篇', subtitle:'神木之國的試煉', art:'assets/chapters/giant.webp', boss:'loki', bossTitle:'被封印的王子',
   blurb:'在巨人之國，只有通過神木試煉的戰士，才有資格和被封印的王子交手。',
   env:{sky:'#a9d8c8', fog:'#b9dccd', ground:'#3f5a2c', sun:[0.5,0.9,0.3], fogR:[60,220]},
   spawn:[0,58], bossPos:[0,-62],
   npcs:[
    {id:'elder', name:'巨人長老', role:'神木的守護者', look:'giant', pos:[-16,38]},
    {id:'warrior', name:'年輕戰士 布隆', role:'巨人族戰士', look:'giant', pos:[20,26]},
    {id:'scholar', name:'旅行學者', role:'研究巨人文化的人', look:'worker', pos:[-4,48], chat:['巨人的一天，比我們的三天還長。','這裡的每一片葉子都比我的船帆還大。']}
   ],
   steps:[
    {type:'talk', npc:'elder', title:'長老的考驗', desc:'和巨人長老交談。', reward:1, lines:[
      ['elder','小小的戰士，你的腳步聲比螞蟻還輕，膽子倒是很大。'],
      ['elder','神木結出的果實能讓戰士恢復力量。帶三顆回來，證明你能在這片森林活下去。']]},
    {type:'collect', title:'採集神木果實', desc:'在森林中採集 3 顆神木果實。', item:'神木果實', icon:'fruit', count:3, spots:[[-42,-6],[40,-8],[2,12]], reward:2},
    {type:'defeat', title:'戰士的證明', desc:'擊敗 2 位在森林中等待的對手。', count:2, reward:3},
    {type:'talk', npc:'warrior', title:'解開封印', desc:'和年輕戰士布隆一起前往神木。', reward:1, unlockBoss:true, lines:[
      ['warrior','長老認可你了！那我也沒什麼好擋的。'],
      ['warrior','王子被封印在神木底下，已經醒了。屏障解開之後，他不會手下留情。']]},
    {type:'boss', title:'神木下的王子', desc:'前往神木，擊敗被封印的王子。', reward:5}
   ]}
];
const CLEAR_BONUS = 3;
const START_TOKENS = 5;

const CHAPTER_DIFFICULTY = {
 east:{order:1,label:'新手',stars:1,hp:1.00,atk:0,def:0,spd:0,bossHp:1.15,bossStages:1,ai:0.82},
 alabasta:{order:2,label:'普通',stars:2,hp:1.10,atk:1,def:0,spd:0,bossHp:1.20,bossStages:1,ai:0.90},
 skypiea:{order:3,label:'困難',stars:3,hp:1.22,atk:1,def:1,spd:1,bossHp:1.25,bossStages:1,ai:1.00},
 dark:{order:4,label:'極難',stars:4,hp:1.38,atk:2,def:1,spd:1,bossHp:1.30,bossStages:1,ai:1.08},
 giant:{order:5,label:'傳說',stars:5,hp:1.58,atk:2,def:2,spd:2,bossHp:1.35,bossStages:1,ai:1.16}
};
const GAME_SETTINGS = {turnSeconds:20, stageStep:0.20, bossRevives:1, itemsPerBattle:3};

const ENCOUNTER_LINES = {
 luffy:['嘿！你看起來很強嘛，來打一場！','我可是要成為海賊王的男人！'],
 loki:['渺小的東西，也敢擋在我面前？','雷錘會替我回答你。'],
 crocodile:['沙子會吞掉一切，包括你的骨頭。','在這片沙漠，我就是規則。'],
 blackbeard:['澤哈哈哈！運氣不錯嘛，撞上我了！','人的夢想是不會結束的！'],
 enel:['凡人啊，你的心跳聲吵到神了。','跪下，或者被審判。'],
 shirahoshi:['對、對不起……可是我不能讓你過去！','海王類們，請借我力量。'],
 robin:['你想知道的事，我都可以讓你看見。','開花吧。']
};

/* 扭蛋道具：rarity N/R/SR/SSR */
const ITEMS = {
 potion_s:{name:'小回復藥水', rarity:'N', icon:'potion', color:'#6fd08c', desc:'恢復 25% 最大體力。', effect:{healRatio:0.25}},
 herb:{name:'淨化香草', rarity:'N', icon:'herb', color:'#9ad66b', desc:'清除自身冰凍、固化、封鎖與持續傷害。', effect:{cleanse:true}},
 potion_l:{name:'大回復藥水', rarity:'R', icon:'potion', color:'#3fb6c9', desc:'恢復 60% 最大體力。', effect:{healRatio:0.60}},
 pp_s:{name:'技能補充劑', rarity:'R', icon:'flask', color:'#6fa8ff', desc:'所有技能使用次數 +2。', effect:{ppAll:2}},
 haki:{name:'霸氣藥劑', rarity:'R', icon:'flask', color:'#e8553b', desc:'攻擊能力 +2 階。', effect:{atkUp:2}},
 shield:{name:'鐵壁果實', rarity:'SR', icon:'fruit', color:'#c9973a', desc:'獲得 35% 最大體力的護盾。', effect:{shieldRatio:0.35}},
 tome:{name:'奧義秘卷', rarity:'SR', icon:'scroll', color:'#b58cff', desc:'奧義技能使用次數 +1，其餘技能 +1。', effect:{ppUlt:1, ppAll:1}},
 meat:{name:'海賊大肉', rarity:'SSR', icon:'meat', color:'#ff9a4a', desc:'體力全滿並清除所有負面狀態。', effect:{healRatio:1, cleanse:true}},
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
 {id:'n1', date:'2026-09-28', tag:'更新', title:'航海日誌 2.0：3D 篇章探索上線', body:'五個篇章都有了自己的 3D 島嶼。可以自由走動、和村民聊天、撿拾任務道具，最後挑戰篇章 BOSS。'},
 {id:'n2', date:'2026-09-28', tag:'活動', title:'寶藏扭蛋機開張', body:'完成劇情任務可以獲得寶藏幣，一枚抽一次、九枚抽十次，十連保底 SR 以上。抽到的道具可以直接帶進對戰。'},
 {id:'n3', date:'2026-09-27', tag:'公告', title:'每日角色登錄規則', body:'每位船長一天最多登錄兩位不同角色，已登錄的角色當天可以重複出航。'},
 {id:'n4', date:'2026-09-25', tag:'調整', title:'對戰介面全面改版', body:'新的技能面板會標示威力、命中與剩餘次數；奧義技能發動時會有專屬特寫。'}
];
