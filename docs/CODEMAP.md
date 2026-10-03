# 程式地圖（CODEMAP）

參考 [AOCI-CODE](https://github.com/aoci-spec/aoci-code) 的「一檔一行」格式，讓任何人或 AI 開發助手在動手前先看懂整個專案。
**每次修改檔案的職責、依賴或對外介面時，同一個版本內一併更新這裡。**

格式：`檔案: F:負責什麼 | R:要一起看的檔案 | A:別人依賴的對外介面 | S:從程式碼看不出來、但絕對不能弄錯的事`

## 載入順序（index.html）
資料 → 引擎 → 主程式 → 擴充（後載入的檔案用「包裝函式」覆寫前面的全域函式，順序不能任意調換）。
`data.js → data_ext.js → story_ext.js → engine3d.js → landmarks.js → scenes.js → world.js →（模組）e3three.js → battle_core.js → battle.js → ext_effects.js → fx*.js → app.js → 其他模式與系統`

## 資料
- `js/data.js`: F:角色、篇章劇情、道具、難度等核心資料 | R:data_ext.js,story_ext.js | A:CHARACTERS,CHARACTER_ORDER,CHAPTERS,CHAPTER_DIFFICULTY,ITEMS,DATA_VERSION | S:改劇情或角色資料要把 DATA_VERSION 加一，否則後台舊設定會覆蓋新內容
- `js/data_ext.js`: F:v63 起的資料擴充（新角色、新篇章、四皇、立繪縮放 VIS、公告） | R:data.js,hub.js | A:CHARACTERS 的新增欄位,DEFAULT_NEWS | S:立繪縮放以 VIS 表為準，後台「立繪調整」的本機設定優先於這裡
- `js/story_ext.js`: F:為 13 篇章補對話、序章、尾聲與支線 | R:data.js | A:- | S:只能「加對話」不能增減任務步驟，否則舊存檔的任務進度會錯位

## 戰鬥
- `js/battle_core.js`: F:傷害公式、技能效果、狀態、難度套用 | R:battle.js,ext_effects.js | A:buildFighter,applyDamage,applySkillEffects,computeSkillOutcome,endTurnStatus,applyRarityScale | S:即時對戰（live.js）在主機上直接呼叫這些函式計算回合，函式不能依賴畫面元素
- `js/battle.js`: F:戰鬥畫面流程、HUD、出招順序 | R:battle_core.js,seer.js,fx_choreo.js | A:startBattle,battle(全域),STRUGGLE | S:battle 是 let 全域，即時對戰計算時會暫時替換它
- `js/ext_effects.js`: F:v63 新效果（暈眩、霸王色、老爹、神避、冰河時期、恢復全技能次數）與 enemyMod 擴充 | R:battle_core.js,emperor.js | A:CHAPTER_DIFFICULTY.emperor/pvp,grantDad | S:用包裝函式擴充，不改舊角色行為
- `js/fx.js`、`js/fx_choreo.js`、`js/fx_ult.js`: F:特效引擎、角色專屬編排、其餘角色的奧義與一般招式主題特效 | R:battle.js | A:X,CHOREO,playChoreo | S:X.text 會自動縮字並限制在畫面內；新增專屬編排時 fx_ult 不會覆蓋

## 登島 3D
- `js/engine3d.js`: F:舊版輕量 WebGL 引擎與幾何建構器 Builder | R:scenes.js | A:E3.Renderer,E3.Builder,E3.M | S:Builder.box 的 y 是底部不是中心
- `js/e3three.js`: F:Three.js 版渲染器，介面與 E3.Renderer 相同，13 座島共用 | R:engine3d.js,world.js,vendor/three | A:R3（取代 E3.Renderer）,setIsland | S:設定 op_r3=0 或不支援 WebGL2 時退回舊引擎；水面、天空不畫舊網格
- `js/scenes.js`: F:各島地形、建築、植被、NPC 造型（npcMesh／LOOKS） | R:landmarks.js,data.js | A:SCENES.buildScene,SCENES.npcMesh | S:建築與道具要避開 layout.path、NPC 位置與任務地點；東海篇為正式版
- `js/landmarks.js`: F:各島原作地標，自動找空地放置 | R:scenes.js | A:LANDMARKS.build | S:放置時同時加入碰撞清單 O
- `js/world.js`: F:探索、移動、鏡頭、NPC 互動、小地圖 | R:scenes.js,app.js | A:World | S:只透過 renderer 介面繪圖，換引擎不用改這裡
- `js/hd3/east3.js` + `sample_east.html`: F:東海 3D 場景樣板（獨立頁面） | R:vendor/three | A:- | S:只是樣板，不影響正式關卡

## 大廳與介面
- `js/lobby.js` + `css/lobby2.css`: F:大廳（左側圖示、限定召喚、主線航路、出戰陣容、皇帝領海徽章、下方導覽列） | R:lobbyicons.js,settings.js(GUIDE) | A:renderLobby,lobbySyncLayout | S:左右面板的位置依實際量到的頂部列高度（--l2tb）與限定召喚卡底部（--l2eb）；遵守 8px 網格與同列等高置中
- `js/settings.js`: F:設定頁與新手教學 | R:lobby.js | A:openSettings,GUIDE | S:教學只能捲動可捲動的容器，不能捲整個頁面
- `js/ceremony.js`: F:「恭喜獲得」儀式畫面與篇章收穫結算 | R:app.js | A:showRewards | S:進島時記錄快照，通關時比對差異
- `js/daily.js`: F:七日之約、每日補給、掃蕩、匯出存檔 | A:openLogin,loginClaimable
- `js/crew.js`: F:船員背包（個人頁、圖鑑、碎片、訓練營）

## 模式
- `js/emperor.js` + `js/emperor_hall.js`: F:皇帝領海規則與四皇展示頁 | A:EMPEROR_DOMAIN,openEmperor(id),openEmperorHall | S:openEmperor(id) 進入單一四皇模式，返回會回到展示頁
- `js/tower.js`、`js/throne.js`、`js/runner.js`、`js/hardmode.js`、`js/exchange*.js`、`js/treasure.js`、`js/weekly.js`、`js/achieve.js`: 各模式與活動

## 多人
- `js/cloud.js`: F:Firebase 帳號（Google、信箱）與雲端存檔 | A:CLOUD | S:登入只用信箱；usernames 不存信箱；舊存檔覆蓋前一定先詢問
- `js/social.js`: F:好友、留言、送禮、排行榜、非同步對戰 | A:openSocial | S:好友對戰沒有獎勵
- `js/live.js`: F:即時對戰 1v1／3v3 與觀戰 | A:LIVE | S:邀請方是主機，所有回合由主機計算後寫回房間
- `js/guild.js`: F:船團、船團 BOSS、留言板 | A:openGuild,GUILD_CFG
- `firestore.rules`: F:Firestore 安全規則 | S:新增集合時一定要更新，並提醒使用者重新發布

## 測試
- `tests/check-data.mjs`: 資料檢查（node 執行）
- `tests/e2e/`: 瀏覽器自動測試（見 tests/e2e/README.md）
