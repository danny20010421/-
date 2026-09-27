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
 { id:'east', name:'東海篇', subtitle:'風車村的出航之日', art:'assets/chapters/east.webp', boss:'luffy', bossTitle:'戴草帽的少年',
   blurb:'十年前，紅髮香克斯把草帽託付給一個少年。今天，那個少年要從風車村出海了，而他想在出發前找個強者試試身手。',
   env:{sky:'#9fd6f5', fog:'#bfe3f6', ground:'#6c7f4a', sun:[0.55,0.9,0.35], fogR:[70,230]},
   spawn:[0,52], bossPos:[0,-58],
   npcs:[
    {id:'makino', name:'瑪琪諾', role:'港口酒館老闆娘', look:'lady', pos:[-10,40]},
    {id:'mayor', name:'村長', role:'風車村村長', look:'elder', pos:[18,26]},
    {id:'roux', name:'紅髮海賊團的船員', role:'留下來喝一杯的老海賊', look:'warrior', pos:[-24,18], chat:['老大把那頂帽子交出去的時候，我就知道這小子會出海。','近海霸主？那傢伙十年前就被老大一眼瞪跑了。']},
    {id:'kid', name:'村裡的孩子', role:'魯夫的小跟班', look:'kid', pos:[8,48], chat:['魯夫說他要找到一個大祕寶！','他每天都在岬角對著海揍空氣，好奇怪。']}
   ],
   steps:[
    {type:'talk', npc:'makino', title:'港口酒館', desc:'到酒館門口找瑪琪諾。', reward:1, lines:[
      ['makino','你是剛靠岸的航海者嗎？今天村子有點吵，魯夫終於要出海了。'],
      ['makino','那孩子從小就在我店裡喊著要當海賊王。可是他的小船上……除了草帽，什麼都沒帶。'],
      ['makino','他最愛吃肉了。能幫我把準備好的肉找回來嗎？剛才被海鷗叼走，掉在村子各處了。']]},
    {type:'collect', title:'出航用的肉', desc:'找回被海鷗叼走的 3 塊肉。', item:'出航用的肉', icon:'meat', count:3, spots:[[34,30],[-40,6],[22,-12]], reward:2},
    {type:'defeat', title:'港口的挑戰者', desc:'聽說草帽少年要出海，各路強者跑來港口湊熱鬧。擊敗其中 2 位。', count:2, reward:3},
    {type:'talk', npc:'mayor', title:'村長的嘆氣', desc:'把肉交給村長，請他轉交。', reward:1, unlockBoss:true, lines:[
      ['mayor','哼，又一個想當海賊的笨蛋。從那個紅髮的傢伙來過之後，這村子就沒安寧過。'],
      ['mayor','……不過，那小子是認真的。他在岬角等著，說出海前要跟一個真正的強者交手。'],
      ['mayor','去吧。打贏他，或者被他打飛，都算是替他送行了。']]},
    {type:'boss', title:'岬角的送行之戰', desc:'前往北方岬角，和戴草帽的少年交手。', reward:5}
   ]},
 { id:'alabasta', name:'阿拉巴斯坦篇', subtitle:'被偷走的雨', art:'assets/chapters/alabasta.webp', boss:'crocodile', bossTitle:'王下七武海 沙鱷魚',
   blurb:'三年沒有下雨，綠洲一座座乾涸，叛亂軍即將與王國軍開戰。人們把他當成英雄，沒人知道乾旱正是他一手造成的。',
   env:{sky:'#f2cf94', fog:'#efd3a4', ground:'#a27b45', sun:[0.4,0.95,0.2], fogR:[60,210]},
   spawn:[0,55], bossPos:[0,-60],
   npcs:[
    {id:'toto', name:'托托', role:'在尤巴挖井的老人', look:'elder', pos:[-18,30]},
    {id:'vivi', name:'薇薇', role:'阿拉巴斯坦公主', look:'lady', pos:[12,40]},
    {id:'koza', name:'寇沙', role:'叛亂軍首領', look:'warrior', pos:[26,12], chat:['國王偷走了雨，我們只能拿起武器。','……如果你說的是真的，那我們一直在跟誰打仗？']},
    {id:'kid', name:'尤巴的孩子', role:'綠洲的孩子', look:'kid', pos:[-6,50], chat:['爺爺每天都在挖，他說水一定還在沙子底下。']}
   ],
   steps:[
    {type:'talk', npc:'toto', title:'乾涸的尤巴', desc:'和在沙中挖井的托托說話。', reward:1, lines:[
      ['toto','旅人啊……尤巴被沙暴埋了，可我不相信這片土地會背叛我們。'],
      ['toto','只是這乾旱太奇怪。最近常看到奇怪的人在夜裡往空中撒粉，隔天別的城市就下雨了。'],
      ['toto','他們丟下了幾個袋子，就在沙丘間。拜託你把它們找來，讓公主看看。']]},
    {type:'collect', title:'舞粉的證據', desc:'在沙丘間找到 3 袋可以偷走雨水的「舞粉」。', item:'舞粉袋', icon:'sack', count:3, spots:[[-38,-4],[40,-10],[4,10]], reward:2},
    {type:'defeat', title:'巴洛克工作社', desc:'祕密犯罪組織的特工在追捕知情者，擊敗 2 位。', count:2, reward:3},
    {type:'talk', npc:'vivi', title:'公主的決心', desc:'把舞粉交給薇薇公主。', reward:1, unlockBoss:true, lines:[
      ['vivi','這是……舞粉。原來偷走雨的不是父王，是巴洛克工作社。'],
      ['vivi','他們的老大 Mr.0，就是被人民當成英雄的克洛克達爾。他想讓國家內戰，好奪走王位。'],
      ['vivi','叛亂軍和王國軍就要在阿爾巴那開戰了。拜託你，擋住他！']]},
    {type:'boss', title:'阿爾巴那的決戰', desc:'前往王宮前廣場，擊敗克洛克達爾。', reward:5}
   ]},
 { id:'skypiea', name:'空島篇', subtitle:'神之國的鐘聲', art:'assets/chapters/skypiea.webp', boss:'enel', bossTitle:'自稱為神的男人',
   blurb:'在一萬公尺高的空島，聽得見所有聲音的男人自稱為神。四百年前沉默的黃金鐘，正等著再次響起。',
   env:{sky:'#bfe4ff', fog:'#e2f2ff', ground:'#c8d7e8', sun:[0.35,1.0,0.5], fogR:[80,260]},
   spawn:[0,55], bossPos:[0,-62],
   npcs:[
    {id:'conis', name:'柯妮絲', role:'天使島的少女', look:'lady', pos:[-14,40]},
    {id:'ganfall', name:'甘·福爾', role:'前任之神・空之騎士', look:'elder', pos:[16,30]},
    {id:'wiper', name:'懷帕', role:'香迪亞戰士', look:'warrior', pos:[-28,12], chat:['這片大地是我們祖先的故鄉，四百年來我們只想回家。','黃金鐘響起的那天，大戰士卡爾格拉的約定才算完成。']},
    {id:'pagaya', name:'帕加亞', role:'柯妮絲的父親', look:'worker', pos:[6,50], chat:['貝殼是空島的寶物，能存下聲音、風，甚至衝擊。','小聲點，神聽得見一切。']}
   ],
   steps:[
    {type:'talk', npc:'conis', title:'青海來的客人', desc:'和天使島的柯妮絲說話。', reward:1, lines:[
      ['conis','歡迎來到天使島……對不起，我得小聲說話。'],
      ['conis','神‧艾涅爾能聽見整座島的聲音。說出反對他的話，雷就會落下來。'],
      ['conis','傳說神之島上埋著香朵拉的黃金。如果能找回來，也許就能讓黃金鐘再響一次。']]},
    {type:'collect', title:'香朵拉的黃金', desc:'在雲上遺跡找到 3 塊黃金碎片。', item:'香朵拉黃金', icon:'gold', count:3, spots:[[-36,-8],[36,-2],[0,14]], reward:2},
    {type:'defeat', title:'神官的試煉', desc:'艾涅爾手下的神官守著神之島，擊敗 2 位。', count:2, reward:3},
    {type:'talk', npc:'ganfall', title:'前任之神', desc:'向甘·福爾報告。', reward:1, unlockBoss:true, lines:[
      ['ganfall','你找到了黃金……那個男人六年前奪走了我的國家，現在又要把它毀掉。'],
      ['ganfall','他打造的方舟準備升空，要把空島所有的地面都劈成碎片。'],
      ['ganfall','雲門我已經打開。記住，他的雷再快，也有他看不見的東西。']]},
    {type:'boss', title:'神之社的審判', desc:'登上神之社，擊敗艾涅爾。', reward:5}
   ]},
 { id:'dark', name:'黑暗海域', subtitle:'班納羅島的黑火', art:'assets/chapters/dark.webp', boss:'blackbeard', bossTitle:'黑鬍子 馬歇爾·D·汀奇',
   blurb:'他殺了自己的同伴，奪走傳說中的惡魔果實，逃出白鬍子海賊團。追著他的火拳，最後在這座島上追上了他。',
   env:{sky:'#2a1d44', fog:'#231a39', ground:'#2c2440', sun:[0.3,0.8,0.5], fogR:[35,160]},
   spawn:[0,55], bossPos:[0,-60],
   npcs:[
    {id:'ace', name:'艾斯', role:'白鬍子海賊團二番隊隊長', look:'warrior', pos:[-12,40]},
    {id:'elder', name:'島上的老人', role:'班納羅島居民', look:'elder', pos:[18,30]},
    {id:'girl', name:'逃難的少女', role:'被燒毀城鎮的孩子', look:'lady', pos:[-26,8], chat:['那個人一邊笑一邊把房子吞進黑暗裡……']}
   ],
   steps:[
    {type:'talk', npc:'ace', title:'追擊者', desc:'和追到島上的艾斯說話。', reward:1, lines:[
      ['ace','你也是來找他的？我叫艾斯。汀奇殺了我的隊員，那是船上最不能犯的罪。'],
      ['ace','身為隊長，我得親手把他帶回去。可這霧太濃了，他的蹤跡很難找。'],
      ['ace','他的手下一路丟下了通緝令和航海紀錄，幫我找回三份。']]},
    {type:'collect', title:'黑鬍子的蹤跡', desc:'在焦黑的礁岩間找到 3 份線索。', item:'黑鬍子的線索', icon:'paper', count:3, spots:[[-40,-6],[38,-14],[6,6]], reward:2},
    {type:'defeat', title:'霧中的敵人', desc:'擊敗 2 位在霧裡伏擊的對手。', count:2, reward:3},
    {type:'talk', npc:'elder', title:'倖存者的證言', desc:'聽島上的老人說出他看到的事。', reward:1, unlockBoss:true, lines:[
      ['elder','他往北邊的廢墟去了。那傢伙的黑暗……連火都吞得進去。'],
      ['elder','被他碰到的人，身上的果實能力會消失。小心，千萬別被他抓住。'],
      ['elder','艾斯已經先去了。拜託你，也去幫他。']]},
    {type:'boss', title:'廢墟中的黑暗', desc:'前往北方廢墟，擊敗黑鬍子。', reward:5}
   ]},
 { id:'giant', name:'巨人篇', subtitle:'艾爾巴夫的詛咒王子', art:'assets/chapters/giant.webp', boss:'loki', bossTitle:'詛咒王子 洛基',
   blurb:'戰士之國艾爾巴夫，寶樹亞當撐起了整片天空。王子洛基被鎖鏈困在樹下，巨人們說，他是這個國家的詛咒。',
   env:{sky:'#a9d8c8', fog:'#b9dccd', ground:'#3f5a2c', sun:[0.5,0.9,0.3], fogR:[60,220]},
   spawn:[0,58], bossPos:[0,-62],
   npcs:[
    {id:'dorry', name:'多利', role:'巨兵海賊團船長', look:'giant', pos:[-16,38]},
    {id:'hajrudin', name:'哈吉爾汀', role:'新巨兵海賊團船長', look:'giant', pos:[20,26]},
    {id:'brogy', name:'布洛基', role:'巨兵海賊團船長', look:'giant', pos:[-4,48], chat:['我和多利在小花園決鬥了一百年，勝負還沒分出來！','嘎巴巴巴！小小的戰士，你的膽子倒不小！']}
   ],
   steps:[
    {type:'talk', npc:'dorry', title:'戰士之國', desc:'和巨人多利說話。', reward:1, lines:[
      ['dorry','葛基基基！是從海上來的小戰士啊。歡迎來到艾爾巴夫。'],
      ['dorry','在這裡，只有展現驕傲的人才會被當成戰士。寶樹亞當結的果實，是給戰士的禮物。'],
      ['dorry','去森林裡帶三顆回來，讓大家看看你的本事。']]},
    {type:'collect', title:'寶樹之果', desc:'在森林中採集 3 顆寶樹亞當的果實。', item:'寶樹之果', icon:'fruit', count:3, spots:[[-42,-6],[40,-8],[2,12]], reward:2},
    {type:'defeat', title:'戰士的證明', desc:'擊敗 2 位在森林中等待的對手。', count:2, reward:3},
    {type:'talk', npc:'hajrudin', title:'被鎖住的王子', desc:'和哈吉爾汀談談洛基的事。', reward:1, unlockBoss:true, lines:[
      ['hajrudin','你想見洛基？那傢伙犯下了不可原諒的罪，被鎖在寶樹底下。'],
      ['hajrudin','可是最近鎖鏈一直在響。傳說中的力量，好像要醒過來了。'],
      ['hajrudin','如果你真是戰士，就去確認吧。我會替你解開外圍的封印。']]},
    {type:'boss', title:'寶樹下的王子', desc:'前往寶樹亞當，擊敗洛基。', reward:5}
   ]}
];

const CHAPTER_DIFFICULTY = {
 east:{order:1,label:'新手',stars:1,hp:1.00,atk:0,def:0,spd:0,bossHp:1.15,bossStages:1,ai:0.82},
 alabasta:{order:2,label:'普通',stars:2,hp:1.10,atk:1,def:0,spd:0,bossHp:1.20,bossStages:1,ai:0.90},
 skypiea:{order:3,label:'困難',stars:3,hp:1.22,atk:1,def:1,spd:1,bossHp:1.25,bossStages:1,ai:1.00},
 dark:{order:4,label:'極難',stars:4,hp:1.38,atk:2,def:1,spd:1,bossHp:1.30,bossStages:1,ai:1.08},
 giant:{order:5,label:'傳說',stars:5,hp:1.58,atk:2,def:2,spd:2,bossHp:1.35,bossStages:1,ai:1.16}
};
const GAME_SETTINGS = {turnSeconds:20, stageStep:0.20, bossRevives:1, itemsPerBattle:3, startTokens:5, clearBonus:3, dailyLimit:2, unlockAll:false};

const ENCOUNTER_LINES = {
 luffy:['嘿！你看起來很強嘛，跟我打一場！','我要成為海賊王，所以不會輸給你！'],
 loki:['渺小的東西，也敢來看被詛咒的王子？','這條鎖鏈困不住我，你也一樣。'],
 crocodile:['英雄？那不過是讓蠢貨聽話的稱號。','在沙漠裡，連你的血都會被曬乾。'],
 blackbeard:['澤哈哈哈！運氣真好，又一個送上門的！','時代要變了，擋路的全都吞掉！'],
 enel:['凡人啊，你的心跳聲，神都聽得一清二楚。','跪下吧，否則雷會替我審判你。'],
 shirahoshi:['對、對不起……可是我不能讓你過去！','海王類們，請借我一點勇氣。'],
 robin:['我想知道的歷史，不會讓任何人擋住。','開花吧。']
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
