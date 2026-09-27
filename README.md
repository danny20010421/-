# 海賊王｜RPG遊戲

參考賽爾號玩法的海賊王對戰遊戲。純前端靜態網站，不需要後端，可直接放上 GitHub Pages。

## 部署到 GitHub Pages

**方法一：自動部署（推薦）**
1. 在 GitHub 建立新的 repository（例如 `op-voyage`），設為 Public。
2. 把這個資料夾所有檔案上傳到 repository 根目錄（包含隱藏的 `.github/` 與 `.nojekyll`）。
   - 網頁上傳：repository 頁面 → Add file → Upload files，把整個資料夾內容拖進去。
   - 或用指令：
     ```
     git init && git add . && git commit -m "first voyage"
     git branch -M main
     git remote add origin https://github.com/你的帳號/op-voyage.git
     git push -u origin main
     ```
3. 到 **Settings → Pages → Build and deployment**，Source 選 **GitHub Actions**。
4. 等 Actions 分頁的 workflow 跑完（約 1 分鐘），網址會是 `https://你的帳號.github.io/op-voyage/`。

**方法二：分支部署**
Settings → Pages → Source 選 **Deploy from a branch**，Branch 選 `main` / `(root)`。

> 網頁上傳時如果看不到 `.github` 資料夾，用方法二即可，效果相同。

## 玩法
- **登入頁**：循環動畫背景、船上告示（可分類瀏覽、可管理）。
- **海圖**：五座篇章島嶼依序解鎖，完成前一章才能出航到下一章。
- **3D 島嶼**：WASD／方向鍵移動，拖曳旋轉視角，滾輪縮放，點地面自動前往，E／空白鍵互動；手機有虛擬搖桿與互動按鈕。
- **劇情任務**：每章 5 步（對話 → 收集 → 擊敗挑戰者 → 解除屏障 → BOSS），每步發放寶藏幣，首次通關另加 3 枚。
- **扭蛋機**：1 枚抽 1 次、9 枚抽 10 次（十連保底 SR 以上）。道具在對戰中按「道具」使用，每場最多 3 次，使用會佔用當回合行動。
- **對戰**：1–5 快速選技能、I 開背包、L 開紀錄。每位角色的每招技能都有專屬動畫。
- **音樂音效**：登入、海圖、五個篇章、一般戰鬥、BOSS 戰、扭蛋機各有原創配樂，另有環境音與技能音效（Web Audio 即時合成，不需音檔）。瀏覽器規定要先點一下畫面才會開始播放；右上角 ♪ 可開關。
- **管理後台**：登入頁「管理後台」，可調整戰鬥規則、角色數值與技能、各篇章 BOSS 與難度、劇情對白、扭蛋機率，並可匯出／匯入設定。

## 自訂內容
| 想改的東西 | 檔案 |
| --- | --- |
| 角色數值、技能 | 管理後台，或 `js/data.js` 的 `CHARACTERS` |
| 篇章劇情、NPC 對話、任務獎勵、BOSS | 管理後台，或 `js/data.js` 的 `CHAPTERS` |
| 技能動畫 | `js/fx.js` 的 `CHOREO` |
| 配樂與音效 | `js/audio.js` |
| 扭蛋道具與機率 | `js/data.js` 的 `ITEMS`、`RARITY` |
| 所有玩家看到的預設公告 | `js/data.js` 的 `DEFAULT_NEWS` |
| 篇章封面圖 | 換掉 `assets/chapters/*.webp`（檔名不變即可） |
| 3D 場景 | `js/scenes.js` |

## 注意
- 存檔、公告與後台設定都保存在各自瀏覽器的 localStorage，不同裝置不會同步。要讓所有玩家套用同一份設定，請在後台匯出後，把數值改進 `js/data.js`。
- 3D 場景使用自製 WebGL 引擎，不依賴外部 CDN；只有字型從 Google Fonts 載入，連不到時會自動改用系統字型。
