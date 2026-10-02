/* 懸賞金交易所 v4：全服同步的行情。
   股價不再由每台裝置各自擲亂數，而是「台灣時間＋固定種子」算出來的：同一時刻，所有裝置、所有帳號看到的價格與新聞完全相同。
   計算只用加減乘除與整數雜湊（不用 log／exp／cos），iPhone、Android、電腦算出的數字會一模一樣。
   行情模型：開盤跳空、早盤與尾盤波動較大（U 型）、每檔有會慢慢漂移的「合理價」形成數週的趨勢、偶爾出現高波動日；新聞造成跳動，假新聞稍後被澄清並反轉。
   新聞依各海賊團／組織的原作設定撰寫，不會出現與原作立場矛盾的事件。 */
(function () {
  const TICK = 5000, TZ = 8 * 3600e3, OPEN_H = 5, SESSION_H = 23, TICKS_DAY = SESSION_H * 3600 * 1000 / TICK, BAR = 60, NBAR = TICKS_DAY / BAR, LIMIT = .10;
  const FEE = .001425, TAX = .003, EPOCH = '2026-08-01', ENGINE_SEED = 'op-voyage-exchange-v4';
  const CATS = [['all', '全部'], ['hold', '持有'], ['yonko', '四皇股'], ['pirate', '海賊股'], ['navy', '海軍股'], ['tenryu', '天龍股'], ['nation', '國家股'], ['etf', 'ETF'], ['fut', '期貨']];
  const STOCKS = [
    { id: 'straw', cat: 'yonko', name: '草帽一夥', code: 'Y001', cap: 'luffy', base: 18, vol: 1.2, color: '#e8a33a' },
    { id: 'redhair', cat: 'yonko', name: '紅髮海賊團', code: 'Y002', cap: 'shanks', base: 42, vol: .8, color: '#c8322b' },
    { id: 'bb', cat: 'yonko', name: '黑鬍子海賊團', code: 'Y003', cap: 'blackbeard', base: 35, vol: 1.5, color: '#4a3a6a' },
    { id: 'cross', cat: 'yonko', name: '十字公會', code: 'Y004', cap: 'buggy', base: 14, vol: 1.6, color: '#3a7ac8' },
    { id: 'bigmom', cat: 'pirate', name: 'BIG MOM 海賊團', code: 'P101', cap: 'bigmom', base: 38, vol: 1, color: '#e85a9a' },
    { id: 'beasts', cat: 'pirate', name: '百獸海賊團', code: 'P102', cap: 'kaido', base: 30, vol: 1.1, color: '#5a6a8a' },
    { id: 'whitebeard', cat: 'pirate', name: '白鬍子海賊團', code: 'P103', cap: 'whitebeard', base: 26, vol: .9, color: '#5ab0e0' },
    { id: 'kuja', cat: 'pirate', name: '九蛇海賊團', code: 'P104', cap: 'hancock', base: 22, vol: .9, color: '#d84a7a' },
    { id: 'heart', cat: 'pirate', name: '紅心海賊團', code: 'P105', cap: 'law', base: 12, vol: 1.3, color: '#e8c83a' },
    { id: 'kid', cat: 'pirate', name: '基德海賊團', code: 'P106', cap: 'kid', base: 9, vol: 1.5, color: '#c84a3a' },
    { id: 'thriller', cat: 'pirate', name: '恐怖三桅帆船', code: 'P107', cap: 'moria', base: 6, vol: 1.4, color: '#7a4ab8' },
    { id: 'baroque', cat: 'pirate', name: '巴洛克工作社', code: 'P108', cap: 'crocodile', base: 8, vol: 1.2, color: '#c8a05a' },
    { id: 'newfish', cat: 'pirate', name: '新魚人海賊團', code: 'P109', cap: 'hody', base: 5, vol: 1.7, color: '#2a8aa0' },
    { id: 'doflamingo', cat: 'pirate', name: '唐吉訶德家族', code: 'P110', cap: 'doflamingo', base: 24, vol: 1.3, color: '#e070b0' },
    { id: 'navy', cat: 'navy', name: '海軍本部', code: 'N201', cap: 'akainu', base: 48, vol: .6, color: '#3a6ab0' },
    { id: 'garpco', cat: 'navy', name: '卡普艦隊', code: 'N202', cap: 'garp_mf', base: 26, vol: .7, color: '#5a8ad0' },
    { id: 'cp9', cat: 'navy', name: 'CP9', code: 'N203', cap: 'lucci', base: 20, vol: .9, color: '#2a2a3a' },
    { id: 'impel', cat: 'navy', name: '推進城', code: 'N204', cap: 'magellan', base: 15, vol: .8, color: '#6a2a4a' },
    { id: 'gov', cat: 'tenryu', name: '世界政府', code: 'T301', cap: 'imu', base: 60, vol: .5, color: '#8a7a5a' },
    { id: 'tenryu', cat: 'tenryu', name: '天龍人聖地瑪莉喬亞', code: 'T302', mark: '天', base: 72, vol: .45, color: '#d8b84a' },
    { id: 'press', cat: 'tenryu', name: '世界經濟新聞社', code: 'T303', cap: 'morgans', base: 16, vol: 1, color: '#d8c8a0' },
    { id: 'alabasta', cat: 'nation', name: '阿拉巴斯坦王國', code: 'K401', cap: 'vivi', base: 19, vol: .7, color: '#d8a84a' },
    { id: 'ryugu', cat: 'nation', name: '龍宮王國', code: 'K402', cap: 'shirahoshi', base: 17, vol: .7, color: '#4ab0d8' },
    { id: 'wano', cat: 'nation', name: '和之國', code: 'K403', cap: 'yamato', base: 21, vol: .8, color: '#c84a4a' },
    { id: 'skypiea', cat: 'nation', name: '空島', code: 'K404', cap: 'enel', base: 11, vol: .9, color: '#8ad0f0' },
    { id: 'elbaf', cat: 'nation', name: '艾爾巴夫', code: 'K405', cap: 'loki', base: 23, vol: .8, color: '#7a9a5a' },
    { id: 'dressrosa', cat: 'nation', name: '德雷斯羅薩', code: 'K406', cap: 'sugar', base: 13, vol: 1, color: '#e88a4a' },
    { id: 'gold', cat: 'fut', name: '寶藏金期貨', code: 'F701', mark: '金', base: 50, vol: .7, color: '#e8c84a' },
    { id: 'seastone', cat: 'fut', name: '海樓石期貨', code: 'F702', mark: '石', base: 33, vol: .9, color: '#6a8a9a' },
    { id: 'devilfruit', cat: 'fut', name: '惡魔果實期貨', code: 'F703', mark: '果', base: 80, vol: 1.8, color: '#9a4ad8' },
    { id: 'meat', cat: 'fut', name: '帶骨肉期貨', code: 'F704', mark: '肉', base: 4, vol: 1.2, color: '#c87a4a' },
    { id: 'cola', cat: 'fut', name: '可樂燃料期貨', code: 'F705', mark: '可', base: 7, vol: 1.1, color: '#4a2a1a' },
    { id: 'etf_yonko', cat: 'etf', name: '四皇 ETF', code: 'E501', mark: '四', base: 30, color: '#e8b64a', etf: ['straw', 'redhair', 'bb', 'cross'] },
    { id: 'etf_worst', cat: 'etf', name: '最惡世代 ETF', code: 'E502', mark: '惡', base: 12, color: '#c84a6a', etf: ['straw', 'heart', 'kid', 'bb'] },
    { id: 'etf_navy', cat: 'etf', name: '海軍 ETF', code: 'E503', mark: '軍', base: 25, color: '#3a6ab0', etf: ['navy', 'garpco', 'cp9', 'impel'] },
    { id: 'etf_nation', cat: 'etf', name: '列國 ETF', code: 'E504', mark: '國', base: 18, color: '#7a9a5a', etf: ['alabasta', 'ryugu', 'wano', 'skypiea', 'elbaf', 'dressrosa'] },
    { id: 'etf_all', cat: 'etf', name: '偉大航路 30', code: 'E500', mark: '30', base: 20, color: '#e8d8b0', etf: 'ALL' }
  ];
  const BASIC = STOCKS.filter(s => !s.etf), etfParts = s => s.etf === 'ALL' ? BASIC.map(x => x.id) : s.etf;

  /* ---------- 新聞：每個組織各自依原作設定撰寫（up＝利多、dn＝利空） ---------- */
  const NEWS = {
    straw: { up: ['草帽一夥抵達巨人之國艾爾巴夫，與巨人族戰士結下友誼', '「草帽大船團」七支船隊響應船長號召，在新世界集結', '千陽號完成改造，佛朗基宣稱「可樂燃料效率超級提升」', '魯夫在和之國擊敗凱多後，懸賞金正式公告為 30 億貝里', '魚人島表態支持草帽一夥，白星公主送上大批補給'], dn: ['海軍大將黃猿率艦隊追擊，千陽號緊急撤離蛋頭島', '五老星將草帽魯夫列為最高等級威脅', '目擊者稱索隆又迷路了，船隊出航時間延後', '黑鬍子海賊團放話要搶奪草帽一夥的路標歷史本文', '娜美警告：船上的伙食費已經超支，香吉士陷入苦戰'] },
    redhair: { up: ['紅髮傑克斯在艾爾巴夫外海一擊擊退基德海賊團', '紅髮海賊團舉辦盛大宴會，各地海賊前來致意', '本·貝克曼的戰術被評為新世界最難攻破的防線', '紅髮海賊團的領海內航線安全，商船保險費下降', '紅髮宣布：「拿走一個寶藏前，先過我這關。」領海全面平靜'], dn: ['傳出紅髮曾與五老星會面，市場揣測不安', '紅髮海賊團長年不參與搶奪寶藏，分析師質疑成長動能', '黑鬍子海賊團偷襲紅髮領海外圍的補給島', '世界經濟新聞報追蹤紅髮過去的「神之谷」身世傳聞', '紅髮海賊團幹部全員出航，大本營防守出現空檔'] },
    bb: { up: ['黑鬍子海賊團在蜂巢島開設「海賊學校」，招生人數暴增', '黑鬍子海賊團再奪一顆惡魔果實，戰力評估上修', '黑鬍子海賊團在溫納島擊敗紅心海賊團', '前海軍大將青雉以第 10 船船長身分活動，海軍震動', '蜂巢島的地下市場交易熱絡，黑鬍子收入創新高'], dn: ['海軍英雄卡普突襲蜂巢島，救走人質克比', '黑鬍子海賊團內部爭奪惡魔果實，幹部關係緊張', '紅髮海賊團警告黑鬍子別靠近自己的領海', '蜂巢島的海賊學校傳出逃學潮', '海軍將黑鬍子海賊團列為「能力者狩獵」的頭號目標'] },
    cross: { up: ['十字公會對海軍將官發出懸賞，賞金獵人蜂擁加入', '鷹眼與克洛克達爾坐鎮，十字公會戰力受肯定', '巴基被誤認為頂級大人物，十字公會聲勢再漲', '十字公會的懸賞海報賣到斷貨', '十字公會在卡拉庫里島的據點完成擴建'], dn: ['克洛克達爾與鷹眼對巴基的領導「非常不滿」', '海軍對十字公會發動反懸賞行動', '巴基一聽到要出海就想逃跑，部下士氣低落', '十字公會的賞金獵人誤抓自己人，公信力受損', '鷹眼傳出又回到庫萊加納島閉關'] },
    bigmom: { up: ['萬國托特蘭的點心出口量創新高', 'BIG MOM 海賊團與各國簽下點心進貢新合約', '夏洛特家族的婚宴邀請函發往全世界', '卡塔庫栗率隊鎮守托特蘭，領海秩序穩定', '萬國的「靈魂果實」家臣數量持續增加'], dn: ['BIG MOM 的「食煩」發作，萬國多座島嶼受災', '和之國一戰後 BIG MOM 下落不明，股東恐慌', '多座島嶼拒絕繳納點心進貢', '夏洛特家族內部爭奪接班權', '婚宴被闖入的消息再次被翻出，聲譽受損'] },
    beasts: { up: ['百獸海賊團殘黨在新世界重新集結', '百獸海賊團的兵器工廠仍持續運作', '分析師：百獸海賊團的「飛六胞」戰力被低估', '鬼之島舊部招募新的「真打」', 'SMILE 庫存傳出仍在黑市流通'], dn: ['凱多在和之國敗北，百獸海賊團全面瓦解', '和之國宣布「開國」，百獸海賊團失去最大據點', 'SMILE 工廠停擺，人造果實供應中斷', '前大看板傳出被海軍逮捕', '百獸海賊團殘黨互相爭奪地盤'] },
    whitebeard: { up: ['馬爾科守護斯芬克斯島，白鬍子故鄉秩序穩定', '前白鬍子海賊團隊長們重新聯絡', '「白鬍子的兒子們」在新世界獲得廣泛尊敬', '白鬍子的故鄉斯芬克斯島獲得大批捐助', '前隊長以涅亞的事蹟傳開，舊部士氣大振'], dn: ['頂上戰爭後白鬍子海賊團勢力大幅縮小', '白鬍子海賊團舊領海被黑鬍子海賊團侵占', '冒牌「白鬍子二世」在各地招搖撞騙', '舊部對是否向黑鬍子復仇意見分歧', '白鬍子的大刀被運往海軍本部展示'] },
    kuja: { up: ['女兒國亞馬遜百合的九蛇戰士驍勇善戰，領海安全', '女帝漢庫克的美貌在世界會議引發話題', '九蛇海賊團從遠征歸來，帶回大量寶物', '凪之帶的天然屏障讓女兒國遠離戰火', '九蛇海賊團與草帽一夥的友好關係受到關注'], dn: ['七武海制度廢除，女兒國面臨海軍與黑鬍子的威脅', '黑鬍子海賊團傳出覬覦女帝的能力', '海軍艦隊在凪之帶附近集結', '漢庫克拒絕出席會議，與世界政府關係緊張', '女兒國的遠征船遭遇海王類，暫停出航'] },
    heart: { up: ['羅率領紅心海賊團在和之國立下大功', '黃色潛水艇「北極探險號」順利完成深海航行', '紅心海賊團的醫療技術被各國港口爭相延請', '羅的「手術果實」覺醒傳聞讓市場看好', '紅心海賊團的懸賞總額上修'], dn: ['紅心海賊團在溫納島敗給黑鬍子海賊團', '羅的潛水艇遭擊沉後下落不明', '紅心海賊團船員失散在各地', '海軍追捕紅心海賊團，航線受阻', '羅與草帽一夥的同盟正式解散'] },
    kid: { up: ['基德海賊團在和之國與魯夫、羅並肩作戰', '基德的磁力能力覺醒，戰力評估大增', '基德海賊團宣布要奪取艾爾巴夫的路標', '基拉的鐮刀技術被讚為新世界一流', '基德海賊團的機械工房完成新船'], dn: ['基德海賊團在艾爾巴夫外海被紅髮一擊擊潰', '基德海賊團的船被巨人族擊沉', '基德的懸賞金遭市場質疑「被高估」', '基德與草帽一夥爭奪同一個目標，市場擔憂衝突', '基德海賊團船員大量受傷，暫停航行'] },
    thriller: { up: ['恐怖三桅帆船的殭屍軍團完成重新編組', '佩羅娜的可愛周邊商品熱賣', '莫莉亞宣布要建立新的殭屍大軍', '魔之三角地帶的霧讓海軍難以接近', '霍古巴克的殭屍研究再有突破'], dn: ['莫莉亞在恐怖三桅帆船被打倒，殭屍全部失去影子', '七武海制度廢除，莫莉亞遭海軍追捕', '莫莉亞前往蜂巢島向黑鬍子復仇失敗', '殭屍們一照到陽光就失去戰力', '佩羅娜離開恐怖三桅帆船，人氣出走'] },
    baroque: { up: ['巴洛克工作社前特工轉投十字公會，人脈仍在', 'Mr.3 的蠟燭技術被評為逃獄必備', '前巴洛克工作社成員在各地開設賭場', '克洛克達爾重出江湖的傳聞讓舊部振奮', '巴洛克工作社的代號制度被其他組織模仿'], dn: ['阿拉巴斯坦政變計畫失敗，巴洛克工作社解散', '前特工多人遭海軍逮捕', '「舞粉」事件曝光，巴洛克工作社聲譽掃地', '前社長克洛克達爾另起爐灶，舊部群龍無首', '雨宴賭場被阿拉巴斯坦王國查封'] },
    newfish: { up: ['新魚人海賊團殘黨在深海重新集結', '「能量鋼彈」黑市交易再度出現', '荷帝的仇恨論述在部分魚人之間流傳', '新魚人海賊團招募大批新兵', '分析師：深海勢力不容小覷'], dn: ['荷帝·瓊斯在魚人島敗北，新魚人海賊團瓦解', '龍宮王國全面取締能量鋼彈', '白星公主呼籲魚人與人類和平共處，獲得廣大支持', '新魚人海賊團成員被移送推進城', '能量鋼彈的副作用曝光，市場恐慌'] },
    doflamingo: { up: ['唐吉訶德家族的地下交易網仍在運作', '「Joker」的人脈被傳仍能左右地下世界', '多佛朗明哥在推進城 LEVEL 6 依然掌握情報', '唐吉訶德家族殘黨重整旗鼓', 'SMILE 黑市價格暴漲'], dn: ['多佛朗明哥在德雷斯羅薩敗北，被押送推進城', '砂糖昏倒，德雷斯羅薩的玩具全部變回人類', 'SMILE 工廠被摧毀，凱多的訂單全部中斷', '德雷斯羅薩王位歸還力克王族', '唐吉訶德家族幹部全員被捕'] },
    navy: { up: ['海軍本部完成新世界巡邏艦隊擴編', '海軍元帥赤犬宣布「絕對的正義」新方針', 'SWORD 小隊成功救出被俘的將官', '海軍新兵器在測試中表現優異', '海軍本部遷到新世界後，防衛能力受肯定'], dn: ['蛋頭島事件後，海軍內部對任務方針出現分歧', '十字公會對海軍將官發出懸賞，海兵人心惶惶', '前大將青雉加入黑鬍子海賊團，海軍戰力外流', '海軍在多場戰役中損失軍艦', '卡普在蜂巢島失聯，海軍士氣低落'] },
    garpco: { up: ['海軍英雄卡普在蜂巢島救出克比', '卡普的拳骨流星群再次登上頭條', 'SWORD 成員克比、海爾梅波表現亮眼', '卡普艦隊招募志願兵人數創新高', '卡普的老戰友們表態支持'], dn: ['卡普在蜂巢島與青雉交戰後下落不明', '卡普抗命出航，遭海軍高層究責', '卡普艦隊的軍艦在蜂巢島受損', '卡普的孫子魯夫懸賞再創新高，卡普處境尷尬', '卡普艦隊行動被認定違反軍令'] },
    cp9: { up: ['CP0 路奇升任要職，諜報網持續擴張', '世界政府諜報機關成功截獲重要情報', '六式訓練營新進特務素質大幅提升', 'CP 部隊在蛋頭島執行任務', '諜報機關取得新型科學裝備'], dn: ['司法島事件被翻出，CP9 聲譽再受打擊', 'CP0 在蛋頭島的任務未能完成', '特務身分曝光，諜報網受損', '路奇在蛋頭島負傷', 'CP 部隊內部對五老星命令產生質疑'] },
    impel: { up: ['推進城完成修復，戒備等級提高', '監獄長麥哲倫重回崗位', '推進城收押多名大海賊，「無法逃脫」的神話延續', '推進城新增 LEVEL 6 看守人力', '推進城的毒防禦系統升級'], dn: ['推進城再傳越獄事件', '黑鬍子當年大鬧推進城的影像外流', 'LEVEL 6 囚犯被黑鬍子帶走的事件仍是陰影', '推進城人手不足，獄卒罷工傳聞', '麥哲倫腹瀉請假，戒備出現空窗'] },
    gov: { up: ['世界會議（雷佛里）圓滿落幕，加盟國關係穩定', '世界政府宣布新的海上秩序方案', '五老星親自出面穩定局勢', '世界政府與加盟國簽訂新的天上金協議', '加盟國數量維持穩定'], dn: ['貝加龐克的全球廣播震撼世界，政府信任度下降', '「空白的一百年」相關傳聞擴散', '加盟國對天上金負擔怨聲載道', '革命軍在多國掀起起義', '世界政府被指控掩蓋歷史真相'] },
    tenryu: { up: ['聖地瑪莉喬亞的天上金如期入庫', '天龍人特權再度獲得世界政府保障', '瑪莉喬亞的奴隸市場收入上升（遭各國批評）', '神之騎士團加強聖地守備', '天龍人家族的資產評估上修'], dn: ['革命軍突襲瑪莉喬亞的消息震驚全世界', '天龍人在香波地群島遭襲擊的舊聞被翻出', '多國要求取消天上金', '天龍人特權遭各國王族公開質疑', '聖地的奴隸起義傳聞擴散'] },
    press: { up: ['摩甘茲獨家報導蛋頭島全球廣播，報紙銷量暴增', '世界經濟新聞報的號外被搶購一空', '新聞社取得四皇最新動向的獨家照片', '摩甘茲宣布擴大送報海鷗隊', '新聞社的懸賞海報印刷訂單大增'], dn: ['世界政府施壓新聞社刪除報導', '新聞社被指控捏造新聞', '摩甘茲遭不明人士威脅', '送報海鷗在暴風中大量失聯', '多國禁止販售世界經濟新聞報'] },
    alabasta: { up: ['阿拉巴斯坦降下豐沛的雨水，農作豐收', '薇薇王女推動國家重建，國民支持度高', '阿拉巴斯坦的觀光業恢復', '沙漠綠化計畫成效良好', '阿拉巴斯坦與周邊國家簽訂貿易協定'], dn: ['柯布拉國王在世界會議期間遇害的消息傳出', '薇薇王女下落成謎，國內動盪', '沙暴侵襲首都阿爾巴那', '阿拉巴斯坦被捲入世界政府的陰謀傳聞', '旱災再度威脅阿拉巴斯坦'] },
    ryugu: { up: ['白星公主推動魚人與人類的和平', '龍宮王國將移居地上的請願再度獲得支持', '魚人島與草帽一夥的友好關係帶動觀光', '龍宮王國寶庫清點完畢，財政穩健', '魚人島的珊瑚產業出口增加'], dn: ['荷帝事件的餘波讓魚人島人心不安', '魚人島的珊瑚天然氣供應出現問題', '海軍加強深海巡邏，魚人島往來減少', '四皇的保護旗號變更，魚人島擔憂安全', '移居地上的計畫遭世界政府擱置'] },
    wano: { up: ['和之國「開國」，對外貿易全面展開', '光月桃之助登基為將軍，國內安定', '和之國的刀劍與酒出口熱賣', '花之都重建完成，觀光客湧入', '大和護送將軍巡視全國'], dn: ['和之國開國後遭外國勢力覬覦', '鬼之島的殘骸清理工程延宕', '百獸海賊團殘黨在和之國作亂', '和之國的武器外流黑市', '海軍以「調查」名義靠近和之國'] },
    skypiea: { up: ['空島與香朵拉族和解，雲上貿易興盛', '空島的貝殼出口量創新高', '黃金鐘的鐘聲響徹空島，觀光熱潮', '空島的雲道交通升級', '天使島居民生活回到正軌'], dn: ['空島傳出新的「神」覬覦權力', '雲層異常，空島航線一度中斷', '青海的海賊大量湧入空島', '香朵拉的黃金被盜', '空島的貝殼走私被查獲'] },
    elbaf: { up: ['艾爾巴夫的巨人族戰士與草帽一夥建立友誼', '巨人國的寶樹亞當木材出口熱銷', '巨人族戰士加入「草帽大船團」', '艾爾巴夫的祭典吸引大批旅客', '洛基王子的傳說成為話題'], dn: ['艾爾巴夫外海爆發海賊衝突', '神之騎士團被目擊出現在艾爾巴夫', '巨人族內部對外國人的態度分歧', '洛基王子被囚禁的舊事引發爭議', '艾爾巴夫的寶樹傳出遭破壞'] },
    dressrosa: { up: ['德雷斯羅薩的玩具全部變回人類，國家迎來新生', '力克王族重新登上王位，國民一片歡騰', '德雷斯羅薩的鬥技場重新開幕', '花田與香水產業恢復出口', '德雷斯羅薩與草帽一夥建立友好關係'], dn: ['德雷斯羅薩的重建費用龐大', '唐吉訶德家族殘黨仍在國內潛伏', '多佛朗明哥的「鳥籠」造成大量建築損毀', '德雷斯羅薩的國民仍對過去十年心有餘悸', '海軍被指控長年對德雷斯羅薩的真相視而不見'] },
    gold: { up: ['空島的黃金鐘帶動黃金收藏熱潮', '新世界寶藏傳聞讓黃金需求上升', '天上金入庫在即，黃金需求增加', '黃金城格蘭特索羅的交易量暴增', '各國央行增加寶藏金儲備'], dn: ['大量海賊寶藏流入市場，金價走弱', '黃金城發生騷動，交易暫停', '寶藏金的鑑定詐騙案頻傳', '天上金暫停徵收的傳聞讓金價下跌', '海軍查扣大批走私黃金'] },
    seastone: { up: ['海軍大量採購海樓石手銬', '推進城擴建帶動海樓石需求', '貝加龐克的海樓石研究傳出新用途', '「能力者狩獵」盛行，海樓石武器熱賣', '海樓石礦脈開採量減少，供給吃緊'], dn: ['新的海樓石礦脈被發現', '海樓石走私案遭破獲，庫存流入市場', '海軍預算刪減，採購延後', '能力者數量減少，海樓石需求下滑', '海樓石加工技術外流'] },
    devilfruit: { up: ['黑鬍子海賊團大舉收購惡魔果實', '傳說中的動物系幻獸種現身黑市', '惡魔果實拍賣會在香波地群島舉行', '「能力者狩獵」使惡魔果實稀缺', '貝加龐克的果實研究帶動收藏熱'], dn: ['SMILE 人造果實大量流出，市場混亂', '惡魔果實鑑定騙局頻傳', '海軍大量查扣惡魔果實', '「惡魔果實會在能力者死後重生」的研究讓價格波動', '拍賣會遭天龍人強行收購後取消'] },
    meat: { up: ['草帽一夥在各地宴會大量採購帶骨肉', '海王類捕獲量下降，肉價上漲', '萬國的宴會帶動肉品需求', '和之國開國，帶骨肉出口大增', '巨人族的宴會訂購了一整船的帶骨肉'], dn: ['海王類大量出沒，漁獲過剩', '魯夫暫時不在港口，肉品需求下降', '冷藏技術普及，肉品供過於求', '帶骨肉的「骨頭」被傳是假的', '宴會季結束，肉價回落'] },
    cola: { up: ['千陽號的可樂燃料需求增加', '佛朗基推出新型可樂引擎', '水之七島的造船廠大量採購可樂', '「風來砲」測試帶動可樂燃料需求', '可樂產地遭遇乾旱，供給吃緊'], dn: ['新的蒸汽動力船讓可樂燃料需求下降', '可樂產量大增，價格回落', '可樂燃料的爆炸意外引發安全疑慮', '水之七島的造船訂單減少', '海軍禁止可樂燃料船進入港口'] }
  };
  const MACRO = { up: ['世界會議（雷佛里）圓滿落幕，海上貿易熱絡', '偉大航路天候穩定，各地航線順利', '新世界傳出「ONE PIECE」的新線索，市場一片樂觀'], dn: ['世界政府宣布海上戒嚴，市場恐慌', '貝加龐克的全球廣播預言「海平面上升」，海運股重挫', '巨大海嘯襲擊新世界，航運停擺'] };

  /* ---------- 確定性的亂數（整數雜湊；各平台結果相同） ---------- */
  const hash = str => { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const rng = key => { let a = hash(ENGINE_SEED + '|' + key) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  /* 近似常態：4 個均勻亂數相加（平均 0、標準差 1），2% 機率出現 3 倍的極端波動（肥尾） */
  const gz = R => { const z = (R() + R() + R() + R() - 2) * 1.7320508075688772; return R() < .02 ? z * 3 : z; };
  const r2 = x => Math.round(x * 100) / 100;
  const fmt = x => (Math.round(x * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const tradeDay = t => { const d = new Date(t + TZ - OPEN_H * 3600e3); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`; };
  const sessionStart = day => { const [y, mo, d] = day.split('-').map(Number); return Date.UTC(y, mo - 1, d, OPEN_H, 0, 0) - TZ; };
  const dayIdx = day => Math.round((sessionStart(day) - sessionStart(EPOCH)) / 864e5);
  const dayOf = i => tradeDay(sessionStart(EPOCH) + i * 864e5 + 3600e3);
  const nowTick = t => Math.max(-1, Math.min(TICKS_DAY, Math.floor((t - sessionStart(tradeDay(t))) / TICK)));
  const twClock = t => { const d = new Date(t + TZ); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
  const isOpen = (t = Date.now()) => { const k = nowTick(t); return k >= 0 && k < TICKS_DAY; };
  const SHAPE = Array.from({ length: NBAR }, (_, k) => { const x = (2 * k + 1) / NBAR - 1; return .72 + .9 * x * x; });
  const SIG_BAR = .0601929265 /* 1 ÷ √276 */, THETA = .00025;

  /* ---------- 一天的行情（由前一天收盤推出） ---------- */
  function newsOfDay(day, carry) {
    const R = rng(day + '|news'), n = 8 + Math.floor(R() * 4), out = [];
    carry.forEach(c => out.push({ ...c, tick: 0, bar: 0, clar: true, t: `開盤前澄清：「${c.src}」為不實消息` }));
    for (let i = 0; i < n; i++) {
      const tick = 600 + Math.floor((TICKS_DAY - 1200) * (i + R()) / n), bar = Math.floor(tick / BAR), up = R() < .5;
      if (R() < .07) { const L = up ? MACRO.up : MACRO.dn; out.push({ tick, bar, up, macro: true, t: L[Math.floor(R() * L.length)], mag: .008 + R() * .02, spread: 1 + Math.floor(R() * 3) }); continue; }
      const s = BASIC[Math.floor(R() * BASIC.length)], L = NEWS[s.id][up ? 'up' : 'dn'], t = L[Math.floor(R() * L.length)], mag = (.012 + R() * .033) * (s.vol > 1.2 ? 1.2 : 1), fake = R() < .12;
      const ev = { tick, bar, up, id: s.id, t, mag, spread: 1 + Math.floor(R() * 4), fake };
      out.push(ev);
      if (fake) { const ct = tick + 60 + Math.floor(R() * 540); if (ct < TICKS_DAY - BAR) out.push({ tick: ct, bar: Math.floor(ct / BAR), up: !up, id: s.id, t: `澄清：「${t}」為不實消息`, mag: mag * 1.1, spread: 1 + Math.floor(R() * 2), clar: true }); else ev.carry = true; }
    }
    return out.sort((a, b) => a.tick - b.tick);
  }
  function simDay(i, prevDay, full) {
    const day = dayOf(i), carry = (prevDay && prevDay.carry) || [], news = newsOfDay(day, carry), impact = {}, tot = {};
    const add = (id, bar, mag, spread) => { tot[id] = (tot[id] || 0) + mag; if (!full) return; const A = impact[id] = impact[id] || new Float64Array(NBAR); for (let k = 0; k < spread && bar + k < NBAR; k++) A[bar + k] += mag / spread; };
    const gaps = {}; news.forEach(n => {
      if (n.tick === 0 && n.clar) { gaps[n.id] = (gaps[n.id] || 0) + (n.up ? 1 : -1) * n.mag; return; }
      if (n.macro) BASIC.forEach(s => { const sg = (s.cat === 'navy' || s.cat === 'tenryu') ? -1 : s.cat === 'fut' ? ((hash(day + s.id + n.tick) & 1) ? 1 : -1) : 1; add(s.id, n.bar, (n.up ? 1 : -1) * sg * n.mag * (.6 + (hash(s.id + day) % 100) / 125), n.spread); });
      else add(n.id, n.bar, (n.up ? 1 : -1) * n.mag, n.spread);
    });
    const st = {};
    BASIC.forEach(s => {
      /* 日線：開盤跳空、當日報酬（雜訊＋新聞＋向合理價回歸），全部用加減乘除 */
      const R = rng(day + '|' + s.id + '|d'), P = prevDay ? prevDay.st[s.id] : { c: s.base, fair: s.base }, prev = P.c;
      let fair = P.fair * (1 + gz(R) * .008); fair = Math.max(s.base * .55, Math.min(s.base * 1.8, fair));
      const vday = R() < .08 ? 1.8 : .7 + R() * .6, sd = .012 * s.vol * vday, lo = Math.max(.05, prev * (1 - LIMIT)), hi = prev * (1 + LIMIT);
      const o = r2(Math.max(lo, Math.min(hi, prev * (1 + gz(R) * .004 * s.vol * vday + (gaps[s.id] || 0)))));
      const ret = gz(R) * sd + (tot[s.id] || 0) + .06 * (fair / o - 1), c = r2(Math.max(lo, Math.min(hi, o * (1 + ret)))), u1 = R(), u2 = R();
      let h = r2(Math.min(hi, Math.max(o, c) * (1 + (.15 + u1) * sd * .9))), l = r2(Math.max(lo, Math.min(o, c) * (1 - (.15 + u2) * sd * .9))), bars = null;
      if (full) { /* 分時：隨機漫步＋新聞跳動，再用「橋接」修正讓終點剛好落在收盤價 */
        const Rb = rng(day + '|' + s.id + '|b'), A = impact[s.id], W = new Float64Array(NBAR + 1), sig = sd * SIG_BAR, tgt = c / o - 1; bars = new Float64Array(NBAR + 1);
        for (let k = 0; k < NBAR; k++) W[k + 1] = W[k] + sig * SHAPE[k] * gz(Rb) + (A ? A[k] : 0);
        const raw = new Float64Array(NBAR + 1); let pmx = -1e9, pmn = 1e9; for (let k = 0; k <= NBAR; k++) { raw[k] = o * (1 + W[k] + k / NBAR * (tgt - W[NBAR])); if (raw[k] > pmx) pmx = raw[k]; if (raw[k] < pmn) pmn = raw[k]; }
        /* 把分時的最高／最低點等比例對齊到當日的高低點：日 K 與分時一致，而且每台裝置都相同 */
        const top = Math.max(o, c), bot = Math.min(o, c), su = pmx > top ? (h - top) / (pmx - top) : 0, sl = pmn < bot ? (bot - l) / (bot - pmn) : 0;
        for (let k = 0; k <= NBAR; k++) { let v = raw[k]; if (v > top) v = top + (v - top) * su; else if (v < bot) v = bot - (bot - v) * sl; bars[k] = k === NBAR ? c : k === 0 ? o : r2(Math.max(l, Math.min(h, v))); }
      }
      st[s.id] = { prev, o, h, l, c, fair, bars };
    });
    STOCKS.filter(s => s.etf).forEach(s => {
      const parts = etfParts(s), prev = prevDay ? prevDay.st[s.id].c : s.base, at = k => { let a = 0; parts.forEach(id => { const x = st[id]; a += (k < 0 ? x.o : k === NBAR + 1 ? x.c : x.bars[k]) / x.prev; }); return r2(Math.max(.05, prev * a / parts.length)); };
      const o = at(-1), c = at(NBAR + 1); let h = Math.max(o, c), l = Math.min(o, c), bars = null;
      { let ah = 0, al = 0; parts.forEach(id => { ah += st[id].h / st[id].prev; al += st[id].l / st[id].prev; }); h = Math.max(h, r2(prev * (1 + (ah / parts.length - 1) * .6))); l = Math.min(l, r2(prev * (1 + (al / parts.length - 1) * .6))); }
      if (full) { bars = new Float64Array(NBAR + 1); for (let k = 0; k <= NBAR; k++) bars[k] = Math.max(l, Math.min(h, at(k))); }
      st[s.id] = { prev, o, h, l, c, fair: prev, bars };
    });
    return { i, day, st, news, carry: news.filter(n => n.carry).map(n => ({ id: n.id, up: !n.up, mag: n.mag * 1.1, src: n.t })) };
  }
  /* 日線快取：只保留每天的開高低收，當天與前一天保留完整分時 */
  const CACHE = { upto: -1, last: null, prevFull: null, ohlc: {} };
  function ensure(i) {
    if (i < 0) i = 0;
    if (CACHE.upto > i) { CACHE.upto = -1; CACHE.last = null; CACHE.ohlc = {}; }
    while (CACHE.upto < i) { const d = simDay(CACHE.upto + 1, CACHE.last, CACHE.upto + 1 >= i - 1); CACHE.prevFull = CACHE.last; CACHE.last = d; CACHE.upto++; STOCKS.forEach(s => { const x = d.st[s.id]; (CACHE.ohlc[s.id] = CACHE.ohlc[s.id] || []).push([x.o, x.h, x.l, x.c]); if (CACHE.ohlc[s.id].length > 120) CACHE.ohlc[s.id].shift(); }); }
    return CACHE.last;
  }
  /* 某時刻的價格：在 5 分鐘的節點之間插值，再加上確定性的微小抖動 */
  function pxAt(D, id, k) {
    const x = D.st[id]; if (k < 0) return x.o; if (k >= TICKS_DAY) return x.c;
    const b = Math.floor(k / BAR), f = (k % BAR) / BAR, a = x.bars[b], c = x.bars[b + 1], j = ((hash(D.day + id + k) % 2001) - 1000) / 1000;
    const base = a + (c - a) * f, w = f * (1 - f) * 4, lim = x.prev * LIMIT;
    return r2(Math.max(x.l, Math.min(x.h, Math.max(x.prev - lim, Math.min(x.prev + lim, base * (1 + j * .0012 * w))))));
  }
  /* 對外的「市場畫面」：給下面的交易與畫面程式使用 */
  let VIEW = null;
  function snapshot(t = Date.now()) {
    const day = tradeDay(t), i = Math.max(0, dayIdx(day)), D = ensure(i), k = nowTick(t), kk = Math.max(0, Math.min(TICKS_DAY, k)), bNow = Math.floor(kk / BAR);
    const s = {}; STOCKS.forEach(z => { const x = D.st[z.id], px = pxAt(D, z.id, kk), mins = Array.from(x.bars.subarray(0, Math.min(NBAR, bNow) + 1)); let hi = x.o, lo = x.o; mins.forEach(v => { if (v > hi) hi = v; if (v < lo) lo = v; }); hi = Math.max(hi, px); lo = Math.min(lo, px);
      s[z.id] = { px, prev: x.prev, open: x.o, hi, lo, min: mins, days: (CACHE.ohlc[z.id] || []).slice(0, -1) }; });
    const P = CACHE.prevFull, fmtN = (n, d) => ({ id: n.id, t: n.t, up: n.up, macro: !!n.macro, clar: !!n.clar, at: sessionStart(d) + n.tick * TICK, key: d + ':' + n.tick + ':' + (n.id || 'm') });
    const news = [...D.news.filter(n => n.tick <= kk).map(n => fmtN(n, D.day)).reverse(), ...(P ? P.news.map(n => fmtN(n, P.day)).reverse() : [])].slice(0, 40);
    VIEW = { day, tick: k, s, news }; return VIEW;
  }
  window.__MKT_ENGINE = { STOCKS, BASIC, CATS, etfParts, snapshot, tradeDay, sessionStart, nowTick, twClock, isOpen, fmt, r2, TICKS_DAY, BAR, NBAR, TICK, FEE, TAX, LIMIT, view: () => VIEW || snapshot() };
})();
