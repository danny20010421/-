/* 首頁：導覽列、公告時鐘、遊戲特色、角色介紹、社區、客服中心、設定、船長頭像 */
(function () {
  const pad = n => String(n).padStart(2, '0');
  function tick() { const el = $('newsClock'); if (!el) return; const d = new Date(); el.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; el.dateTime = d.toISOString(); }
  function homePanel(title, html, after) { $('homeTitle').textContent = title; $('homeBody').innerHTML = html; openModal('homeModal'); if (after) after($('homeBody')); }

  const FEATURES = [
    ['🏝️', `${CHAPTERS.length} 座傳說之島`, `從東海的風車村到艾爾巴夫，依原作時間線展開 ${CHAPTERS.length} 個篇章：頂上戰爭、蛋糕島、和之國……每座島的地形、路線、支線與小 BOSS 都不同。`],
    ['⚔️', '回合制對戰', '12 種屬性相剋、異常狀態、能力階級、羈絆加成與奧義。最多 3 人陣容，倒下時換人接力；洛基、馬爾科、莫莉亞等角色還會在戰鬥中變身。'],
    ['⚓', '船員收藏與培養', `${Object.keys(CHARACTERS).length} 位角色、R／SR／SSR／UR 稀有度與圖鑑羈絆；用經驗書、訓練營與掃蕩培養陣容，還能替角色換上不同的皮膚立繪。`],
    ['🎰', '懸賞處', '一般召喚（150 抽保底）與限定活動池、每日與高級懸賞、道具商店；重複的船員可以交給海軍本部換貝里。'],
    ['🗺️', '拉夫德魯之路', '在寶藏日誌裡解讀各島的歷史本文石碑，集齊之後挑戰最終之島的三連戰。'],
    ['📜', '原作劇情', '依原作改寫的劇情任務：潛入、護送、限時路線、奪鑰、推理、小 BOSS 對決與支線，還有序章與尾聲。'],
    ['🎁', '每日冒險', '七日登入獎勵、每日懸賞、掃蕩卷補給，還有奪寶大冒險、勇者之塔與虛空王座等挑戰模式。']
  ];
  function features() { homePanel('遊戲特色', `<div class="feat-grid">${FEATURES.map(f => `<article class="feat"><i aria-hidden="true">${f[0]}</i><h3>${f[1]}</h3><p>${f[2]}</p></article>`).join('')}</div><div class="home-cta"><button class="btn-primary big" data-go="start">揚帆出航</button></div>`, b => { b.querySelector('[data-go=start]').onclick = () => { closeModal('homeModal'); $('startBtn').click(); }; }); }
  function community() {
    const url = location.href.split('#')[0], text = '一起來玩《海賊王 偉大航路》！', enc = encodeURIComponent;
    homePanel('社區', `<p class="home-lead">邀請朋友一起出航，分享你的陣容與冒險。</p><div class="share-grid">
      <button class="share" data-share="copy"><i>🔗</i><b>複製遊戲連結</b><small>貼到任何地方分享</small></button>
      <a class="share line" href="https://social-plugins.line.me/lineit/share?url=${enc(url)}" target="_blank" rel="noopener"><i>💬</i><b>分享到 LINE</b><small>傳給好友或群組</small></a>
      <a class="share fb" href="https://www.facebook.com/sharer/sharer.php?u=${enc(url)}" target="_blank" rel="noopener"><i>📘</i><b>分享到 Facebook</b><small>發佈到動態</small></a>
      <a class="share x" href="https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}" target="_blank" rel="noopener"><i>✖️</i><b>分享到 X</b><small>發一則推文</small></a></div>`,
      b => { b.querySelector('[data-share=copy]').onclick = () => { (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('已複製遊戲連結', 'gold')).catch(() => prompt('複製這個連結：', url)); }; });
  }
  const FAQ = [
    ['我的進度存在哪裡？', '進度存在這台裝置的瀏覽器裡，不需要登入。清除瀏覽器資料會讓進度消失，建議定期用下方的「匯出存檔」備份。'],
    ['換手機或電腦，要怎麼延續進度？', '在舊裝置按「匯出存檔」下載檔案，傳到新裝置後，在這裡按「匯入存檔」選擇那個檔案。'],
    ['找不到任務目標怎麼辦？', '任務欄的「➤ 自動前往」會帶你走過去；目標不在畫面內時，畫面邊緣會有方向箭頭。也可以按電話蟲（H 鍵）詢問下一步。'],
    ['畫面卡頓或手機發燙？', '到「設定」把畫質切換成「省電」，3D 場景會降低解析度。'],
    ['BOSS 太強打不過？', '先打小兵、完成任務升級，把船員放進訓練營，或到懸賞處商店購買回復道具。陣容換上屬性相剋的船員也很有幫助。'],
    ['更新後畫面怪怪的？', '按「重新整理並更新」，會重新下載最新版本的遊戲檔案。']
  ];
  function support() {
    homePanel('客服中心', `<div class="faq">${FAQ.map((f, i) => `<details ${i === 0 ? 'open' : ''}><summary>${f[0]}</summary><p>${f[1]}</p></details>`).join('')}</div>
      <div class="sup-actions"><button class="btn-gold" data-s="export">匯出存檔</button><label class="btn-ghost file-btn">匯入存檔<input type="file" accept="application/json" data-s="import" hidden></label><button class="btn-ghost" data-s="reload">重新整理並更新</button></div>`,
      b => {
        b.querySelector('[data-s=export]').onclick = () => { const blob = new Blob([JSON.stringify({ game: 'op_voyage', v: DATA_VERSION, at: new Date().toISOString(), save: SAVE.data })], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `偉大航路存檔_${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('已下載存檔檔案', 'gold'); };
        b.querySelector('[data-s=import]').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { const d = JSON.parse(t); if (!d || d.game !== 'op_voyage' || !d.save) throw 0; confirmBox('匯入存檔？', '目前這台裝置上的進度會被取代，無法復原。', '匯入', () => { localStorage.setItem(SAVE.key, JSON.stringify(d.save)); SAVE.load(); toast('存檔已匯入', 'gold'); closeModal('homeModal'); if (typeof loginInfo === 'function') loginInfo(); refreshAvatar(); }); }).catch(() => toast('這不是有效的存檔檔案', 'warn')); };
        b.querySelector('[data-s=reload]').onclick = () => { location.href = location.pathname + '?r=' + Date.now(); };
      });
  }
  function settings() {
    if (typeof openSettings === 'function') return openSettings();
    const P = AUDIO.pref, low = localStorage.getItem('op_gfx') === 'low';
    homePanel('設定', `<div class="set-list">
      <label class="set-row"><span><b>音樂與音效</b><small>關閉後完全靜音</small></span><input type="checkbox" class="sw" data-k="on" ${P.muted ? '' : 'checked'}></label>
      <label class="set-row"><span><b>音樂音量</b></span><input type="range" min="0" max="1" step="0.05" value="${P.music}" data-k="music"></label>
      <label class="set-row"><span><b>音效音量</b></span><input type="range" min="0" max="1" step="0.05" value="${P.sfx}" data-k="sfx"></label>
      <div class="set-row"><span><b>畫質</b><small>省電模式會降低 3D 解析度，手機發燙時使用（重新進入島嶼後生效）</small></span><div class="seg" role="radiogroup"><button data-g="high" class="${low ? '' : 'on'}">高畫質</button><button data-g="low" class="${low ? 'on' : ''}">省電</button></div></div>
      <div class="set-row"><span><b>雲端存檔</b><small>用 Google 帳號在不同裝置之間接續進度</small></span><button class="btn-gold sm" onclick="openCloud()">開啟</button></div>
      <label class="set-row"><span><b>首頁公告預設展開</b></span><input type="checkbox" class="sw" data-k="news" ${localStorage.getItem('op_news_open') !== '0' ? 'checked' : ''}></label>
    </div>`, b => {
      b.querySelector('[data-k=on]').onchange = e => { AUDIO.setPref({ muted: !e.target.checked }); if (typeof syncSound === 'function') syncSound(); };
      b.querySelectorAll('input[type=range]').forEach(r => r.oninput = () => AUDIO.setPref({ [r.dataset.k]: +r.value }));
      b.querySelectorAll('[data-g]').forEach(x => x.onclick = () => { localStorage.setItem('op_gfx', x.dataset.g); b.querySelectorAll('[data-g]').forEach(y => y.classList.toggle('on', y === x)); if (window.WORLD && WORLD.r) { WORLD.r.maxDpr = x.dataset.g === 'low' ? .75 : Math.min(devicePixelRatio || 1, 1.6); WORLD.r.dpr = Math.min(WORLD.r.dpr, WORLD.r.maxDpr); } toast(x.dataset.g === 'low' ? '已切換為省電畫質' : '已切換為高畫質'); });
      b.querySelector('[data-k=news]').onchange = e => { if (typeof setNewsOpen === 'function') setNewsOpen(e.target.checked); };
    });
  }
  function chars() { if (typeof openCrew === 'function') openCrew('codex', { reveal: true }); }
  function refreshAvatar() {
    const img = $('homeAvatarImg'); if (!img) return; const id = SAVE.data && SAVE.data.player && SAVE.data.roster && SAVE.data.roster[SAVE.data.player] ? SAVE.data.player : null;
    img.src = id ? CHARACTERS[id].avatar : 'assets/ui/denden.webp'; if ($('homeAvatar')) $('homeAvatar').title = id ? `船長：${CHARACTERS[id].name}` : '尚未出航';
  }
  window.refreshAvatar = refreshAvatar;
  const ACT = { home: () => { }, features, chars, community, support };
  function go(k) { document.querySelectorAll('#homeNav [data-home]').forEach(b => b.classList.toggle('on', b.dataset.home === k)); (ACT[k] || ACT.home)(); if (k !== 'home') setTimeout(() => document.querySelectorAll('#homeNav [data-home]').forEach(b => b.classList.toggle('on', b.dataset.home === 'home')), 400); }
  window.addEventListener('DOMContentLoaded', () => {
    tick(); setInterval(tick, 1000); refreshAvatar();
    document.querySelectorAll('#homeNav [data-home]').forEach(b => b.onclick = () => go(b.dataset.home));
    $('homeSettings').onclick = settings;
    if ($('homeAvatar')) $('homeAvatar').onclick = () => { if (Object.keys(SAVE.data.roster || {}).length) openCrew(); else toast('先按「揚帆出航」選擇你的船員吧！'); };
    $('homeMenuBtn').onclick = () => {
      const items = [['home', '首頁'], ['features', '遊戲特色'], ['chars', '角色介紹'], ['community', '社區'], ['support', '客服中心'], ['settings', '設定']];
      $('menuGrid').innerHTML = items.map(([k, l]) => `<button class="btn-ghost" data-k="${k}">${l}</button>`).join('');
      $('menuGrid').querySelectorAll('[data-k]').forEach(b => b.onclick = () => { closeSheet(); b.dataset.k === 'settings' ? settings() : go(b.dataset.k); });
      $('menuSheet').classList.add('show');
    };
  });
})();
