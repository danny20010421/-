# 瀏覽器自動測試

需要 Python 3 與 Playwright（`pip install playwright && playwright install chromium`）。在專案根目錄執行：

| 指令 | 內容 |
|---|---|
| `node tests/check-data.mjs` | 資料檢查：角色、篇章、技能、圖片路徑 |
| `python3 tests/e2e/shot.py @工作.json` | 通用執行器：開啟遊戲、執行一段 JS、截圖，回報結果與錯誤（截圖存在 tests/e2e/shots/） |
| 搭配 `smoke.js` | 全畫面巡檢：所有畫面開一次、所有角色的每一招各算一次 |
| 搭配 `flow.js` | 流程測試：皇帝領海三階段、困難模式評星、勇者之塔第 200 層 |
| 搭配 `audit.js` | 版面量測：觸控範圍太小、按鈕重疊、字級過小 |
| `python3 tests/e2e/sweep.py all phone,small,desk` | 多尺寸截圖（桌機、筆電、平板、手機、小手機、橫式） |
| `python3 tests/e2e/livetest3.py` | 三個分頁模擬兩位玩家 3 對 3 即時對戰＋一位觀戰（使用模擬 Firebase：fakefb3.js） |
| `python3 tests/e2e/guildtest.py` | 兩位玩家建立／加入船團、留言、挑戰船團 BOSS |
| `python3 tests/e2e/hdshot.py '[{...}]'` | 3D 場景樣板截圖（無顯示卡時自動用軟體繪圖） |

工作檔格式：`[{"name":"截圖名","js":"setup.js 內容 + 要測的程式","vp":[寬,高],"mobile":true,"wait":毫秒}]`。
`setup.js` 會建立一個測試用存檔（解鎖全部、加入角色、略過新手教學）。

**每次發版前**至少跑：資料檢查、smoke、flow，以及有改到的畫面的多尺寸截圖。
