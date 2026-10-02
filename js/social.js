/* 好友與對戰（第一階段：非同步對戰）
   Firestore 結構：
   - players/{uid}：公開名片（帳號名稱、遊戲名稱、8 位數 ID、航海等級、稱號、防守陣容、戰績），登入的玩家都看得到，只有本人能改。
   - usernames/{小寫帳號名稱}：帳號名稱 → uid／信箱（登入與搜尋用，名稱不會重複）。
   - friendships/{較小uid_較大uid}：members、requester、status（pending／accepted）。
   - duels/{自動 ID}：挑戰紀錄（attacker、defender、勝負、回合數），只有雙方看得到。
   非同步對戰：挑戰好友的「防守陣容」（對方上次同步時的出戰陣容），由電腦操作，三位依序上場，體力與技能次數延續。 */
const PVP = {
  bg: 'assets/chapters/marineford.webp?v=44',  /* 好友對戰的背景（勝敗都沒有獎勵） */
  giftBerry: 500,     /* 好友禮物：每份貝里 */
  giftDailyClaim: 10  /* 每天最多領幾份禮物 */
};
(function () {
  const C = () => CLOUD, F = () => CLOUD.fb(), U = () => CLOUD.user();
  let tab = 'friends', panel = null, me = null, friends = [], reqIn = [], reqOut = [], found = null, hist = [], gifts = [], sentToday = new Set(), detail = null, msg = '', loading = false, RUN = null;
  const twDay = () => { const d = new Date(Date.now() + 8 * 3600e3); return d.toISOString().slice(0, 10); };
  const st = () => (SAVE.data.pvp = SAVE.data.pvp || { wins: 0, losses: 0, day: '', dayWins: 0 });
  const esc3 = s => (typeof esc === 'function' ? esc(s) : String(s));
  const fidOf = (a, b) => [a, b].sort().join('_');
  const avatar = (id, skin) => { const S = skin && typeof SKINS !== 'undefined' && SKINS[skin]; return S && S.avatar ? S.avatar : (CHARACTERS[id] ? CHARACTERS[id].avatar : ''); };
  const fmtD = t => { const d = new Date(t || 0); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

  /* ---------- 名片 ---------- */
  function cardData(username) {
    const P = playerProfile(), d = SAVE.data, lv = typeof acctLevelInfo === 'function' ? acctLevelInfo().lv : 1, sk = (d.skins && d.skins.equip) || {}, S = st();
    const team = (d.lineup || []).filter(id => CHARACTERS[id]).map(id => ({ id, lv: crewLv(id), skin: sk[id] || null }));
    const tt = (TITLES.find(t => t.id === P.title) || TITLES[0]).name;
    return { uid: U().uid, username, nameKey: C().nameKey(username), name: P.name, bio: String(P.bio || '').slice(0, 40), pid: P.id, lv, title: tt, avatar: team[0] ? team[0].id : 'luffy0', team, power: team.reduce((a, t) => a + t.lv, 0), wins: S.wins, losses: S.losses, updatedAt: Date.now() };
  }
  async function syncCard() { if (!U() || !me) return; const c = cardData(me); await F().db.collection('players').doc(U().uid).set(c, { merge: true }); }
  /* 確認登入與帳號名稱 */
  async function ensure() {
    if (!U()) return false; if (me) return true;
    let n = await C().myName();
    if (n) { try { const r = F().db.collection('usernames').doc(C().nameKey(n)), d = await r.get(); if (!d.exists || d.data().uid !== U().uid) n = null; else if ('email' in d.data()) await r.set({ uid: U().uid, name: d.data().name }); /* 舊版留下的信箱欄位：清掉 */ } catch (e) { n = null; } }
    me = n; if (me) await syncCard(); return !!me;
  }

  /* ---------- 好友 ---------- */
  async function loadAll() {
    const uid = U().uid, db = F().db; loading = true; render();
    try {
      const q = await db.collection('friendships').where('members', 'array-contains', uid).get(), rows = q.docs.map(x => ({ fid: x.id, ...x.data() }));
      const others = [...new Set(rows.map(r => r.members.find(m => m !== uid)))], cards = {};
      await Promise.all(others.map(async o => { try { const d = await db.collection('players').doc(o).get(); if (d.exists) cards[o] = d.data(); } catch (e) { } }));
      const withCard = r => ({ ...r, other: r.members.find(m => m !== uid), card: cards[r.members.find(m => m !== uid)] || null });
      friends = rows.filter(r => r.status === 'accepted').map(withCard); reqIn = rows.filter(r => r.status === 'pending' && r.requester !== uid).map(withCard); reqOut = rows.filter(r => r.status === 'pending' && r.requester === uid).map(withCard);
      const [a, b] = await Promise.all([db.collection('duels').where('attacker', '==', uid).get(), db.collection('duels').where('defender', '==', uid).get()]);
      hist = [...a.docs, ...b.docs].map(x => x.data()).sort((x, y) => (y.at || 0) - (x.at || 0)).slice(0, 30);
      const [g1, g2] = await Promise.all([db.collection('gifts').where('to', '==', uid).where('claimed', '==', false).get(), db.collection('gifts').where('from', '==', uid).where('day', '==', twDay()).get()]);
      gifts = g1.docs.map(x => ({ id: x.id, ...x.data() })); sentToday = new Set(g2.docs.map(x => x.data().to));
    } catch (e) { msg = C().errText(e); }
    loading = false; render(); dot();
  }
  async function search(q) {
    q = String(q || '').trim(); found = null; if (!q) return; const db = F().db; msg = '搜尋中…'; render();
    try {
      let card = null;
      if (/^\d{8}$/.test(q)) { const r = await db.collection('players').where('pid', '==', q).limit(1).get(); if (!r.empty) card = r.docs[0].data(); }
      if (!card) { const n = await db.collection('usernames').doc(C().nameKey(q)).get(); if (n.exists) { const d = await db.collection('players').doc(n.data().uid).get(); if (d.exists) card = d.data(); } }
      found = card; msg = card ? '' : '找不到這位玩家（對方需要先登入並開啟過「好友」）';
    } catch (e) { msg = C().errText(e); }
    render();
  }
  async function request(o) {
    const uid = U().uid; if (o === uid) { msg = '不能加自己為好友'; render(); return; }
    if ([...friends, ...reqIn, ...reqOut].some(r => r.other === o)) { msg = '你們已經是好友，或邀請還在等待中'; render(); return; }
    try { await F().db.collection('friendships').doc(fidOf(uid, o)).set({ members: [uid, o].sort(), requester: uid, status: 'pending', at: Date.now() }); toast('好友邀請已送出', 'gold'); await loadAll(); } catch (e) { msg = C().errText(e); render(); }
  }
  async function accept(fid) { try { await F().db.collection('friendships').doc(fid).update({ status: 'accepted', at: Date.now() }); toast('已成為好友！', 'gold'); await loadAll(); } catch (e) { msg = C().errText(e); render(); } }
  async function remove(fid, text) { const go = async () => { try { await F().db.collection('friendships').doc(fid).delete(); await loadAll(); } catch (e) { msg = C().errText(e); render(); } }; if (typeof confirmBox === 'function') confirmBox(text || '刪除好友？', '之後可以再重新加回來。', '確定', go); else go(); }

  /* ---------- 好友禮物：每天可以送每位好友一份，對方領取得到貝里 ---------- */
  async function sendGift(o, oName) { const uid = U().uid, day = twDay(); try { await F().db.collection('gifts').doc(`${uid}_${o}_${day}`).set({ from: uid, to: o, fromName: me, toName: oName || '', day, claimed: false, at: Date.now() }); sentToday.add(o); toast(`已送禮物給 ${oName || '好友'}`, 'gold'); render(); } catch (e) { msg = C().errText(e); render(); } }
  async function claimGift(id) { const S = st(), today = twDay(); if (S.giftDay !== today) { S.giftDay = today; S.giftN = 0; } if (S.giftN >= PVP.giftDailyClaim) { toast(`今天已經領了 ${PVP.giftDailyClaim} 份禮物，明天再來`); return; }
    try { await F().db.collection('gifts').doc(id).update({ claimed: true }); S.giftN++; addBerry(PVP.giftBerry); SAVE.save(); coins(); gifts = gifts.filter(g => g.id !== id); toast(`收下禮物：貝里 +${PVP.giftBerry}`, 'gold'); render(); dot(); } catch (e) { msg = C().errText(e); render(); } }
  async function claimAll() { for (const g of gifts.slice()) { const S = st(); if (S.giftDay === twDay() && S.giftN >= PVP.giftDailyClaim) break; await claimGift(g.id); } }
  async function saveBio(v) { const P = playerProfile(); P.bio = String(v || '').slice(0, 40); SAVE.save(); await syncCard(); toast('簽名已更新', 'gold'); }

  /* ---------- 非同步對戰 ---------- */
  function challenge(card) {
    if (!card || !(card.team || []).length) { toast('對方還沒有設定防守陣容'); return; }
    if (SAVE.data.lineup.some(id => typeof isTraining === 'function' && isTraining(id))) { toast('出戰陣容中有船員正在訓練營'); return; }
    close(); RUN = { card, i: 0, rounds: 0, team: SAVE.data.lineup.map(id => ({ id, lv: crewLv(id) })) }; fight();
  }
  function fight() {
    const R = RUN, f = R.card.team[R.i];
    startBattle({ team: R.team, enemyId: f.id, enemyLv: f.lv, enemySkin: f.skin || null, pvp: true, bg: PVP.bg, chapterId: 'pvp', isBoss: false, revives: 0,
      enemyMod: { title: `${R.card.username} 的船員（${R.i + 1}/${R.card.team.length}）` }, onEnd: r => end(r), onLeave: () => { openModes(); open('friends'); } });
    log(`好友對戰：挑戰 ${R.card.username} 的防守陣容 第 ${R.i + 1}/${R.card.team.length} 位`);
  }
  function end(r) {
    const R = RUN; if (!R) return {}; R.rounds += r.rounds || 0;
    if (r.win && R.i < R.card.team.length - 1) { R.team = teamSnapshot().map((t, k) => ({ ...t, lv: R.team[k].lv })); R.i++; const nx = R.card.team[R.i];
      return { message: `擊敗第 ${R.i} 位！體力與技能次數會延續。<br>下一位：<b>${CHARACTERS[nx.id].name}</b>（LV ${nx.lv}）`, next: { label: '迎戰下一位', fn: () => fight() } }; }
    RUN = null; const S = st(), win = !!r.win;
    const msgs = [win ? `🏆 擊敗了 ${esc3(R.card.username)} 的防守陣容！（${R.rounds} 回合）` : `敗給了 ${esc3(R.card.username)} 的防守陣容……`, '<small>好友對戰沒有獎勵，結果會記在雙方的對戰紀錄</small>'];
    if (win) S.wins++; else S.losses++; SAVE.save();
    if (U()) F().db.collection('duels').add({ attacker: U().uid, defender: R.card.uid, attackerName: me || '', defenderName: R.card.username, win, rounds: R.rounds, at: Date.now(), team: SAVE.data.lineup.slice(0, 3) }).then(syncCard).catch(() => { });
    return { message: msgs.join('<br>'), next: { label: '返回好友', fn: () => { openModes(); open('friends'); } } };
  }

  /* ---------- 介面 ---------- */
  const TABS = [['friends', '好友'], ['add', '加好友'], ['req', '邀請・禮物'], ['hist', '對戰紀錄'], ['me', '我的帳號']];
  const reqCount = () => reqIn.length + gifts.length + (typeof LIVE !== 'undefined' ? LIVE.invites().length : 0);
  function teamRow(t) { return `<span class="sc-team">${(t || []).map(x => `<img src="${avatar(x.id, x.skin)}" alt="" title="${CHARACTERS[x.id] ? CHARACTERS[x.id].name : ''}・LV ${x.lv}"><em>${x.lv}</em>`).join('')}</span>`; }
  function personRow(c, actions) { if (!c) return `<li class="sc-p"><span class="sc-who"><b>（玩家資料讀取中）</b></span>${actions}</li>`;
    return `<li class="sc-p"><img class="sc-av" src="${avatar(c.avatar)}" alt=""><span class="sc-who"><b>${esc3(c.username)}</b><small>${esc3(c.name || '')}・Lv.${c.lv || 1}・${esc3(c.title || '')}</small>${c.bio ? `<small class="sc-bio">「${esc3(c.bio)}」</small>` : ''}${teamRow(c.team)}<small class="sc-rec">戰績 ${c.wins || 0} 勝 ${c.losses || 0} 敗</small></span><span class="sc-act">${actions}</span></li>`; }
  function body() {
    if (!U()) return `<div class="sc-empty"><p>好友與對戰需要先登入帳號（Google 或帳號密碼）。</p><button class="btn-gold big" data-a="login">登入／註冊</button></div>`;
    if (!me) return `<div class="sc-empty"><p>設定一個<b>帳號名稱</b>，好友就能用這個名稱找到你（2～12 個中英文、數字或底線，設定後不能修改）。</p><input id="scName" maxlength="12" placeholder="帳號名稱"><button class="btn-gold" data-a="setname">確定</button></div>`;
    if (tab === 'friends') return friends.length ? `<ul class="sc-list">${friends.map(f => personRow(f.card, `<button class="btn-gold sm" data-live="${f.other}">即時對戰</button><button class="btn-ghost sm" data-ch="${f.other}">挑戰防守</button><button class="btn-ghost sm" data-gift="${f.other}" ${sentToday.has(f.other) ? 'disabled' : ''}>${sentToday.has(f.other) ? '今天已送禮' : '🎁 送禮'}</button><button class="btn-ghost sm sc-x" data-del="${f.fid}" aria-label="刪除好友">刪除</button>`)).join('')}</ul><p class="sc-hint">即時對戰：邀請好友 1 對 1 同時出招；挑戰防守：和好友的出戰陣容打電腦對戰。兩種都沒有獎勵。送禮：每天可以送每位好友一份（對方領取得到貝里 ${PVP.giftBerry}）。</p>` : `<p class="sc-hint">還沒有好友。到「加好友」用帳號名稱或 8 位數 ID 搜尋吧！</p>`;
    if (tab === 'add') return `<div class="sc-search"><input id="scQ" placeholder="帳號名稱或 8 位數玩家 ID"><button class="btn-gold" data-a="search">搜尋</button></div>${found ? `<ul class="sc-list">${personRow(found, found.uid === U().uid ? '<small>這是你自己</small>' : friends.some(f => f.other === found.uid) ? '<small>已經是好友</small>' : [...reqIn, ...reqOut].some(f => f.other === found.uid) ? '<small>邀請等待中</small>' : `<button class="btn-gold sm" data-req="${found.uid}">加為好友</button>`)}</ul>` : ''}<p class="sc-hint">你的帳號名稱：<b>${esc3(me)}</b>・玩家 ID：<b>${esc3(playerProfile().id)}</b></p>`;
    if (tab === 'req') { const lv = typeof LIVE !== 'undefined' ? LIVE.invites() : [];
      return `${typeof LIVE !== 'undefined' && LIVE.active() ? '<button class="btn-gold sc-back" data-a="liveback">⚔️ 回到進行中的即時對戰</button>' : ''}<h4 class="sc-h">即時對戰邀請</h4>${lv.length ? `<ul class="sc-list">${lv.map(x => `<li class="sc-p"><span class="sc-who"><b>${esc3(x.hostName)}</b><small>邀請你 1 對 1 即時對戰</small></span><span class="sc-act"><button class="btn-gold sm" data-lacc="${x.id}">接受</button><button class="btn-ghost sm" data-ldec="${x.id}">婉拒</button></span></li>`).join('')}</ul>` : '<p class="sc-hint">沒有即時對戰邀請。</p>'}
      <h4 class="sc-h">收到的禮物</h4>${gifts.length ? `<ul class="sc-list">${gifts.map(g => `<li class="sc-p"><span class="sc-who"><b>🎁 ${esc3(g.fromName || '好友')}</b><small>${esc3(g.day)} 送來的禮物・貝里 ${PVP.giftBerry}</small></span><span class="sc-act"><button class="btn-gold sm" data-claim="${g.id}">領取</button></span></li>`).join('')}</ul>${gifts.length > 1 ? '<button class="btn-ghost sm" data-a="claimall">全部領取</button>' : ''}<p class="sc-hint">每天最多領 ${PVP.giftDailyClaim} 份。</p>` : '<p class="sc-hint">沒有新的禮物。</p>'}
      <h4 class="sc-h">收到的好友邀請</h4>${reqIn.length ? `<ul class="sc-list">${reqIn.map(f => personRow(f.card, `<button class="btn-gold sm" data-acc="${f.fid}">接受</button><button class="btn-ghost sm" data-del="${f.fid}" data-t="拒絕邀請？">拒絕</button>`)).join('')}</ul>` : '<p class="sc-hint">沒有新的邀請。</p>'}
      <h4 class="sc-h">送出的邀請</h4>${reqOut.length ? `<ul class="sc-list">${reqOut.map(f => personRow(f.card, `<small>等待回覆</small><button class="btn-ghost sm" data-del="${f.fid}" data-t="取消邀請？">取消</button>`)).join('')}</ul>` : '<p class="sc-hint">沒有等待中的邀請。</p>'}`; }
    if (tab === 'hist') return hist.length ? `<ul class="sc-hist">${hist.map(h => { const att = h.attacker === U().uid, won = att ? h.win : !h.win; return `<li class="${won ? 'w' : 'l'}"><b>${won ? '勝' : '敗'}</b><span>${att ? `你挑戰了 ${esc3(h.defenderName)}` : `${esc3(h.attackerName)} 挑戰了你的防守陣容`}<small>${fmtD(h.at)}・${h.rounds || 0} 回合</small></span></li>`; }).join('')}</ul>` : '<p class="sc-hint">還沒有對戰紀錄。</p>';
    const c = cardData(me), u = U(), prov = (u.providerData || []).map(p => p.providerId).includes('password') || !(u.providerData || []).length ? 'password' : 'google';
    return `<ul class="sc-list">${personRow(c, '')}</ul>
      <div class="sc-acc"><label>簽名<small>顯示在名片上，最多 40 字</small><span class="sc-search"><input id="scBio" maxlength="40" value="${esc3(playerProfile().bio || '')}" placeholder="例如：目標是成為海賊王！"><button class="btn-ghost" data-a="bio">儲存</button></span></label>
        <dl class="cl-info"><div><dt>帳號名稱</dt><dd>${esc3(me)}</dd></div><div><dt>玩家 ID</dt><dd>${esc3(playerProfile().id)}</dd></div><div><dt>登入信箱</dt><dd class="sc-mail">${esc3(u.email || '—')}</dd></div><div><dt>戰績</dt><dd>${c.wins} 勝 ${c.losses} 敗</dd></div></dl>
        <p class="sc-hint">好友挑戰你時，對上的是你的<b>防守陣容</b>＝目前的出戰陣容（最多 3 位）。調整出戰陣容後按「更新防守陣容」。</p>
        <div class="sc-row"><button class="btn-gold" data-a="sync">更新防守陣容</button><button class="btn-ghost" data-a="cloud">雲端存檔</button>${prov === 'password' && u.email ? '<button class="btn-ghost" data-a="pw">修改密碼</button>' : ''}<button class="btn-ghost" data-a="logout">登出</button></div></div>`;
  }
  function render() {
    if (!panel || !panel.isConnected) return;
    panel.innerHTML = `<div class="dl-card sc-card"><header><h3>👥 好友與對戰</h3><button class="icon-btn sm" data-x aria-label="關閉">×</button></header>
      ${U() && me ? `<nav class="sc-tabs">${TABS.map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${n}${k === 'req' && reqCount() ? `<i class="sc-dot">${reqCount()}</i>` : ''}</button>`).join('')}</nav>` : ''}
      <div class="sc-body">${loading ? '<p class="sc-hint">讀取中…</p>' : body()}</div>${msg ? `<p class="cl-status">${esc3(msg)}</p>` : ''}</div>`;
    const q = s => panel.querySelector(s), on = (s, f) => panel.querySelectorAll(s).forEach(b => b.onclick = () => f(b));
    q('[data-x]').onclick = close;
    on('[data-tab]', b => { tab = b.dataset.tab; msg = ''; render(); });
    on('[data-a=login]', () => { close(); openCloud(); }); on('[data-a=cloud]', () => { close(); openCloud(); });
    on('[data-a=setname]', async () => { const v = (q('#scName') || {}).value || ''; msg = '設定中…'; render(); try { await C().setName(v); me = v.trim(); await syncCard(); msg = ''; await loadAll(); } catch (e) { msg = C().errText(e); render(); } });
    on('[data-a=search]', () => search((q('#scQ') || {}).value)); const si = q('#scQ'); if (si) si.onkeydown = e => { if (e.key === 'Enter') search(si.value); };
    on('[data-req]', b => request(b.dataset.req)); on('[data-acc]', b => accept(b.dataset.acc)); on('[data-del]', b => remove(b.dataset.del, b.dataset.t));
    on('[data-ch]', b => { const f = friends.find(x => x.other === b.dataset.ch); challenge(f && f.card); });
    on('[data-live]', b => { const f = friends.find(x => x.other === b.dataset.live); if (f && f.card) { close(); LIVE.invite(f.card, me); } });
    on('[data-gift]', b => { const f = friends.find(x => x.other === b.dataset.gift); sendGift(b.dataset.gift, f && f.card ? f.card.username : ''); });
    on('[data-claim]', b => claimGift(b.dataset.claim)); on('[data-a=claimall]', claimAll);
    on('[data-lacc]', b => { close(); LIVE.accept(b.dataset.lacc); }); on('[data-ldec]', b => { LIVE.decline(b.dataset.ldec); setTimeout(render, 300); });
    on('[data-a=liveback]', () => { close(); LIVE.open(); });
    on('[data-a=bio]', () => saveBio((q('#scBio') || {}).value).catch(e => { msg = C().errText(e); render(); }));
    on('[data-a=pw]', async () => { const u = U(); if (u && u.email) { await C().resetPw(u.email); msg = `修改密碼的連結已寄到 ${u.email}`; render(); } });
    on('[data-a=logout]', () => { if (typeof confirmBox === 'function') confirmBox('登出？', '登出後存檔只保留在這台裝置，好友功能需要重新登入。', '登出', () => { C().logout(); render(); }); else C().logout(); });
    on('[data-a=sync]', async () => { try { await syncCard(); toast('防守陣容已更新', 'gold'); } catch (e) { msg = C().errText(e); render(); } });
  }
  async function open(t) {
    if (t) tab = t; if (!panel) { panel = document.createElement('div'); panel.className = 'dl-wrap sc-wrap'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '好友與對戰'); panel.onclick = e => { if (e.target === panel) close(); }; }
    document.body.appendChild(panel); msg = ''; render();
    try { await C().sdk(); } catch (e) { msg = C().errText(e); render(); return; }
    if (U()) { loading = true; render(); try { await ensure(); } catch (e) { msg = C().errText(e); } loading = false; render(); if (me) loadAll(); }
  }
  function close() { if (panel) panel.remove(); }
  /* 大廳「好友」按鈕的紅點：有新的好友邀請 */
  function dot() { const b = document.querySelector('[data-lb=friends]'); if (b) b.classList.toggle('has-dot', reqCount() > 0); if (panel && panel.isConnected && tab === 'req') render(); }
  window.socialRefreshDot = dot;
  window.openSocial = open;
  window.addEventListener('DOMContentLoaded', () => {
    if (typeof CLOUD === 'undefined') return;
    CLOUD.onUser(async u => { if (!u) { me = null; friends = []; reqIn = []; reqOut = []; hist = []; dot(); render(); return; } try { if (await ensure()) loadAll(); } catch (e) { } });
    setInterval(() => { if (U() && me && document.visibilityState === 'visible') syncCard().catch(() => { }); }, 5 * 60000);
  });
})();
