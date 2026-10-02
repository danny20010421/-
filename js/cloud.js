/* 雲端存檔：Firebase（Google 登入＋Firestore）。
   - 只有玩家打開「雲端存檔」或之前登入過時，才會從 gstatic.com 下載 Firebase 程式，平常不影響載入速度。
   - 存檔放在 Firestore 的 saves/{使用者 ID}，安全規則只允許本人讀寫。
   - 防止舊存檔蓋掉新存檔：每台裝置記住「上次同步時雲端的時間」。開啟遊戲時先比對，雲端在別台裝置更新過就先詢問，不會自動上傳。
   - 自動上傳：登入後，存檔有變動時最多每 60 秒上傳一次；切到背景時也會上傳。 */
const CLOUD_CONFIG = {
  enabled: true,
  sdk: '10.12.2',
  firebase: {
    apiKey: 'AIzaSyAGkjIcLiVXRYVPWeVRkrpVFOZJH_O9RTk',
    authDomain: 'op-uc2026.firebaseapp.com',
    projectId: 'op-uc2026',
    storageBucket: 'op-uc2026.firebasestorage.app',
    messagingSenderId: '496185856301',
    appId: '1:496185856301:web:ebbb1ab6517858a6c543a4'
  }
};
const CLOUD = (function () {
  const LS = { on: 'op_cloud_on', last: 'op_cloud_last', auto: 'op_cloud_auto', dev: 'op_device_id' };
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, put = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { } };
  const deviceId = (() => { let d = get(LS.dev); if (!d) { d = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); put(LS.dev, d); } return d; })();
  const sum = str => { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); };
  const fmtT = t => { if (!t) return '—'; const d = new Date(t); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const esc2 = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hooks = []; let mode = 'google', form = {}; let fb = null, user = null, busy = false, checked = false, dirty = false, lastUp = 0, status = '', remoteInfo = null, panel = null;
  const say = (m, kind) => { status = m; render(); if (kind && typeof toast === 'function') toast(m, kind === 'ok' ? 'gold' : undefined); };

  /* ---------- 存檔打包 ---------- */
  function stamp() { if (typeof SAVE === 'undefined' || !SAVE.data) return; const m = SAVE.data.meta = SAVE.data.meta || {}; m.updatedAt = Date.now(); m.device = deviceId; m.dataVersion = typeof DATA_VERSION !== 'undefined' ? DATA_VERSION : 0; }
  /* 檢查碼不含 meta（更新時間），內容相同就視為一致 */
  const bodyOf = d => JSON.stringify(d), contentSum = d => { const { meta, ...rest } = d || {}; return sum(JSON.stringify(rest)); };
  function pack() { const body = bodyOf(SAVE.data); return { body, sum: sum(body), csum: contentSum(SAVE.data), updatedAt: (SAVE.data.meta && SAVE.data.meta.updatedAt) || Date.now(), device: deviceId, v: typeof DATA_VERSION !== 'undefined' ? DATA_VERSION : 0, size: body.length }; }
  function unpack(p) { if (!p || typeof p.body !== 'string') throw new Error('雲端沒有存檔'); if (sum(p.body) !== p.sum) throw new Error('雲端存檔檢查碼不符，可能已損毀'); return JSON.parse(p.body); }
  const summary = d => { try { const n = Object.keys(d.roster || {}).length, cl = (typeof CHAPTERS !== 'undefined' ? CHAPTERS : []).filter(c => d.chapters && d.chapters[c.id] && d.chapters[c.id].cleared).length; return `船員 ${n} 位・篇章 ${cl} 章・寶藏幣 ${(d.tokens || 0).toLocaleString()}・貝里 ${(d.berry || 0).toLocaleString()}`; } catch (e) { return ''; } };

  /* ---------- Firebase 載入 ---------- */
  const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = res; s.onerror = () => rej(new Error('無法下載 Firebase（請確認網路連線）')); document.head.appendChild(s); });
  let loading = null;
  function sdk() { return loading || (loading = (async () => {
    if (!window.firebase || !window.firebase.firestore) { const b = `https://www.gstatic.com/firebasejs/${CLOUD_CONFIG.sdk}/`; await loadScript(b + 'firebase-app-compat.js'); await loadScript(b + 'firebase-auth-compat.js'); await loadScript(b + 'firebase-firestore-compat.js'); }
    const F = window.firebase; if (!(F.apps && F.apps.length)) F.initializeApp(CLOUD_CONFIG.firebase);
    fb = { F, auth: F.auth(), db: F.firestore() }; try { await fb.auth.setPersistence(F.auth.Auth.Persistence.LOCAL); } catch (e) { }
    fb.auth.onAuthStateChanged(u => { user = u || null; if (user) { put(LS.on, '1'); if (!checked) check(false); } render(); hooks.forEach(f => { try { f(user); } catch (e) { } }); });
    try { await fb.auth.getRedirectResult(); } catch (e) { say(errText(e)); }
    return fb; })().catch(e => { loading = null; throw e; })); }
  function errText(e) { const c = (e && e.code) || ''; return { 'auth/email-already-in-use': '這個信箱已經註冊過了，請直接登入', 'auth/invalid-email': '信箱格式不正確', 'auth/weak-password': '密碼至少要 6 個字', 'auth/wrong-password': '信箱或密碼錯誤', 'auth/user-not-found': '信箱或密碼錯誤', 'auth/invalid-credential': '信箱或密碼錯誤', 'auth/invalid-login-credentials': '信箱或密碼錯誤', 'auth/too-many-requests': '嘗試太多次，請稍後再試', 'auth/operation-not-allowed': 'Firebase 尚未開啟「電子郵件／密碼」登入方式', 'name-taken': '這個帳號名稱已經有人使用', 'name-invalid': '帳號名稱只能用 2～12 個中英文、數字或底線', 'name-missing': '找不到這個帳號名稱', 'auth/popup-closed-by-user': '登入視窗被關閉了', 'auth/cancelled-popup-request': '登入已取消', 'auth/unauthorized-domain': '這個網址還沒加入 Firebase 的「授權網域」', 'auth/network-request-failed': '網路連線失敗', 'permission-denied': '沒有權限：請確認 Firestore 的安全規則已經發布', 'unavailable': '雲端暫時連不上，請稍後再試' }[c] || (e && e.message) || '發生錯誤'; }
  const ref = () => fb.db.collection('saves').doc(user.uid);

  /* ---------- 登入／登出 ---------- */
  async function login() {
    if (busy) return; busy = true; say('正在開啟 Google 登入…');
    try { await sdk(); const P = new fb.F.auth.GoogleAuthProvider(); P.setCustomParameters({ prompt: 'select_account' });
      try { await fb.auth.signInWithPopup(P); }
      catch (e) { if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(e.code)) { say('改用整頁登入…'); await fb.auth.signInWithRedirect(P); return; } throw e; }
    } catch (e) { say(errText(e), 'err'); } finally { busy = false; render(); }
  }
  /* ---------- 帳號密碼（真實信箱＋自訂帳號名稱） ---------- */
  const NAME_RE = /^[A-Za-z0-9_\u4e00-\u9fff]{2,12}$/, nameKey = n => String(n || '').trim().toLowerCase();
  const fail = code => { const e = new Error(code); e.code = code; throw e; };
  /* 只用信箱登入：帳號名稱只用來加好友，名稱對照表裡不存信箱 */
  async function emailOf(v) { v = String(v || '').trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) fail('auth/invalid-email'); await sdk(); return v; }
  /* 帳號名稱登記：交易確保不重複 */
  async function claimName(name, uid, email) { if (!NAME_RE.test(name)) fail('name-invalid'); const r = fb.db.collection('usernames').doc(nameKey(name));
    await fb.db.runTransaction(async t => { const d = await t.get(r); if (d.exists && d.data().uid !== uid) fail('name-taken'); if (!d.exists) t.set(r, { uid, name }); }); }
  async function register(name, email, pw) {
    if (busy) return; busy = true; say('正在建立帳號…');
    try { await sdk(); name = String(name || '').trim(); if (!NAME_RE.test(name)) fail('name-invalid');
      const pre = await fb.db.collection('usernames').doc(nameKey(name)).get(); if (pre.exists) fail('name-taken');
      const cr = await fb.auth.createUserWithEmailAndPassword(email.trim(), pw);
      try { await claimName(name, cr.user.uid, email.trim()); await cr.user.updateProfile({ displayName: name }); } catch (e) { try { await cr.user.delete(); } catch (x) { } throw e; }
      if (typeof playerProfile === 'function') { const P = playerProfile(); P.account = name; SAVE.save(); }
      try { await cr.user.sendEmailVerification(); } catch (e) { }
      say(`帳號「${name}」建立完成！`, 'ok');
    } catch (e) { say(errText(e), 'err'); } finally { busy = false; render(); }
  }
  async function loginPw(id, pw) { if (busy) return; busy = true; say('登入中…'); try { const em = await emailOf(id); await fb.auth.signInWithEmailAndPassword(em, pw); } catch (e) { say(errText(e), 'err'); } finally { busy = false; render(); } }
  async function resetPw(id) { if (busy) return; busy = true; try { const em = await emailOf(id); await fb.auth.sendPasswordResetEmail(em); say(`如果 ${em} 有註冊過，重設密碼的信已經寄出，請點信中的連結設定新密碼（也請檢查垃圾郵件）`, 'ok'); } catch (e) { say(errText(e), 'err'); } finally { busy = false; render(); } }
  /* Google 登入的玩家：好友系統需要一個帳號名稱 */
  async function setName(name) { await sdk(); if (!user) fail('auth'); await claimName(String(name || '').trim(), user.uid, user.email || ''); await user.updateProfile({ displayName: name }); if (typeof playerProfile === 'function') { const P = playerProfile(); P.account = name; SAVE.save(); } }
  async function myName() { await sdk(); if (!user) return null; try { const d = await fb.db.collection('players').doc(user.uid).get(); if (d.exists && d.data().username) return d.data().username; } catch (e) { } const P = typeof playerProfile === 'function' ? playerProfile() : {}; return P.account || null; }
  async function logout() { try { if (dirty && checked) await upload(true); await sdk(); await fb.auth.signOut(); } catch (e) { } user = null; checked = false; remoteInfo = null; put(LS.on, null); put(LS.last, null); say('已登出，存檔只保留在這台裝置'); }

  /* ---------- 比對、上傳、下載 ---------- */
  async function readRemote() { const s = await ref().get(); return s.exists ? s.data() : null; }
  /* 開啟遊戲或登入時：先看雲端，再決定要上傳還是詢問 */
  async function check(manual) {
    if (!user || busy) return; busy = true; say('正在比對雲端存檔…'); let next = null;
    try {
      const R = await readRemote(), last = +(get(LS.last) || 0); remoteInfo = R ? { at: R.updatedAt, device: R.device } : null;
      if (!R) { checked = true; next = () => upload(true); }
      else if (R.csum && R.csum === contentSum(SAVE.data)) { checked = true; put(LS.last, String(R.updatedAt)); say('雲端與這台裝置的存檔一致'); }
      /* 雲端在上次同步之後被別台裝置更新過 → 一定要問 */
      else if (R.updatedAt > last && R.device !== deviceId) next = () => ask(R);
      else { checked = true; next = async () => { await upload(true); if (manual) say('已把這台裝置的存檔上傳到雲端', 'ok'); }; }
    } catch (e) { say(errText(e), manual ? 'err' : null); } finally { busy = false; render(); }
    if (next) await next();
  }
  async function upload(force) {
    if (!user || !checked || busy) return; if (!force && !dirty) return;
    busy = true;
    try { const p = pack(); if (p.size > 900000) throw new Error('存檔太大（超過 900KB），無法上傳');
      await ref().set({ ...p, summary: summary(SAVE.data), at: fb.F.firestore.FieldValue.serverTimestamp() });
      put(LS.last, String(p.updatedAt)); dirty = false; lastUp = Date.now(); remoteInfo = { at: p.updatedAt, device: deviceId }; status = `已同步到雲端（${fmtT(lastUp)}）`;
    } catch (e) { status = errText(e); if (force && typeof toast === 'function') toast(status); } finally { busy = false; render(); }
  }
  async function download() { if (!user) return; try { const R = await readRemote(); if (!R) { say('雲端還沒有存檔', 'err'); return; } apply(R); } catch (e) { say(errText(e), 'err'); } }
  function apply(R) {
    let d; try { d = unpack(R); } catch (e) { say(e.message, 'err'); return; }
    try { localStorage.setItem('op_voyage_save_before_cloud', JSON.stringify(SAVE.data)); } catch (e) { }
    SAVE.data = d; SAVE.__noStamp = true; SAVE.save(); SAVE.__noStamp = false; put(LS.last, String(R.updatedAt)); dirty = false; checked = true;
    if (typeof toast === 'function') toast('已載入雲端存檔，重新整理中…', 'gold'); setTimeout(() => location.reload(), 900);
  }
  /* 雲端與這台裝置不同時，讓玩家選 */
  function ask(R) {
    document.querySelectorAll('.cl-ask').forEach(x => x.remove());
    let rd = null; try { rd = unpack(R); } catch (e) { }
    const box = document.createElement('div'); box.className = 'dl-wrap cl-ask'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', '雲端有不同的存檔');
    box.innerHTML = `<div class="dl-card cl-card"><header><h3>雲端有不同的存檔</h3></header>
      <p class="dl-sub">雲端的存檔在其他裝置更新過。請選擇要保留哪一份，被取代的那份會在這台裝置留下備份。</p>
      <div class="cl-cmp"><div class="cl-opt"><b>☁️ 雲端存檔</b><small>更新：${fmtT(R.updatedAt)}</small><small>${rd ? summary(rd) : ''}</small><button class="btn-gold" data-c="cloud">載入雲端存檔</button></div>
      <div class="cl-opt"><b>📱 這台裝置</b><small>更新：${fmtT(SAVE.data.meta && SAVE.data.meta.updatedAt)}</small><small>${summary(SAVE.data)}</small><button class="btn-ghost" data-c="local">用這台覆蓋雲端</button></div></div>
      <button class="btn-ghost sm cl-later" data-c="later">先不要同步</button></div>`;
    document.body.appendChild(box);
    box.querySelector('[data-c=cloud]').onclick = () => { box.remove(); apply(R); };
    box.querySelector('[data-c=local]').onclick = () => { box.remove(); const go = () => { checked = true; upload(true).then(() => say('已用這台裝置的存檔覆蓋雲端', 'ok')); }; if (typeof confirmBox === 'function') confirmBox('用這台裝置覆蓋雲端？', '雲端上其他裝置的進度會被取代。', '覆蓋', go); else go(); };
    box.querySelector('[data-c=later]').onclick = () => { box.remove(); checked = false; say('暫停同步：雲端與這台裝置不同，尚未處理'); };
    say('雲端與這台裝置的存檔不同，等待選擇');
  }

  /* ---------- 介面 ---------- */
  function open() {
    if (!panel) { panel = document.createElement('div'); panel.className = 'dl-wrap cl-wrap'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '雲端存檔'); panel.onclick = e => { if (e.target === panel) close(); }; }
    document.body.appendChild(panel); render();
    if (get(LS.on) && !fb) sdk().catch(e => say(errText(e)));
  }
  function close() { if (panel) panel.remove(); }
  function render() {
    if (!panel || !panel.isConnected) return; const auto = get(LS.auto) !== '0';
    panel.innerHTML = `<div class="dl-card cl-card"><header><h3>☁️ 雲端存檔</h3><button class="icon-btn sm" data-x aria-label="關閉">×</button></header>
      ${user ? `<div class="cl-user">${user.photoURL ? `<img src="${esc2(user.photoURL)}" alt="" referrerpolicy="no-referrer">` : ''}<span><b>${esc2(user.displayName || 'Google 帳號')}</b><small>${esc2(user.email || '')}</small></span></div>
        <dl class="cl-info"><div><dt>這台裝置</dt><dd>${fmtT(SAVE.data.meta && SAVE.data.meta.updatedAt)}</dd></div><div><dt>雲端</dt><dd>${remoteInfo ? fmtT(remoteInfo.at) + (remoteInfo.device === deviceId ? '（這台）' : '（其他裝置）') : checked ? '尚無存檔' : '—'}</dd></div></dl>
        <div class="cl-btns"><button class="btn-gold" data-a="sync" ${busy ? 'disabled' : ''}>立即同步</button><button class="btn-ghost" data-a="down" ${busy ? 'disabled' : ''}>從雲端載入</button></div>
        <label class="set-row cl-auto"><span><b>自動同步</b><small>存檔有變動時每 60 秒上傳一次</small></span><input type="checkbox" class="sw" data-a="auto" ${auto ? 'checked' : ''}></label>
        <button class="btn-ghost sm cl-out" data-a="out">登出</button>`
      : `<div class="cl-tabs" role="tablist"><button class="${mode === 'google' ? 'on' : ''}" data-m="google">Google 登入</button><button class="${mode === 'login' ? 'on' : ''}" data-m="login">信箱登入</button><button class="${mode === 'reg' ? 'on' : ''}" data-m="reg">註冊</button></div>
        ${mode === 'google' ? `<p class="dl-sub">用 Google 帳號登入，就能在手機、平板、電腦之間接續遊戲進度。存檔只有你自己看得到。</p><button class="btn-gold big cl-in" data-a="in" ${busy ? 'disabled' : ''}>使用 Google 登入</button>`
        : mode === 'login' ? `<div class="cl-form"><label>電子郵件<input id="clId" type="email" autocomplete="email" value="${esc2(form.id || '')}"></label><label>密碼<input id="clPw" type="password" autocomplete="current-password"></label>
            <button class="btn-gold big cl-in" data-a="pwin" ${busy ? 'disabled' : ''}>登入</button><button class="btn-ghost sm" data-a="forgot">忘記密碼？寄重設信到這個信箱</button></div>`
        : `<div class="cl-form"><label>帳號名稱<small>2～12 個中英文、數字或底線；只用來讓好友找到你，登入請用信箱</small><input id="clName" autocomplete="nickname" maxlength="12" value="${esc2(form.name || '')}"></label><label>電子郵件<small>請填真實信箱，忘記密碼時會寄重設信到這裡</small><input id="clEmail" type="email" autocomplete="email" value="${esc2(form.email || '')}"></label><label>密碼<small>至少 6 個字</small><input id="clPw" type="password" autocomplete="new-password"></label><label>再輸入一次密碼<input id="clPw2" type="password" autocomplete="new-password"></label>
            <button class="btn-gold big cl-in" data-a="reg" ${busy ? 'disabled' : ''}>建立帳號</button></div>`}
        <p class="cl-note">登入後若雲端已有其他裝置的存檔，會先讓你選擇要保留哪一份，不會直接覆蓋。</p>`}
      ${status ? `<p class="cl-status">${esc2(status)}</p>` : ''}</div>`;
    panel.querySelector('[data-x]').onclick = close;
    const on = (k, f) => { const b = panel.querySelector(`[data-a=${k}]`); if (b) b.onclick = f; };
    on('in', login); on('out', logout);
    panel.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; status = ''; render(); });
    const v = id => { const e = panel.querySelector('#' + id); return e ? e.value : ''; }, keep = () => { form = { id: v('clId') || form.id, name: v('clName') || form.name, email: v('clEmail') || form.email }; };
    on('pwin', () => { keep(); if (!v('clId') || !v('clPw')) return say('請輸入信箱與密碼'); loginPw(v('clId'), v('clPw')); });
    on('forgot', () => { keep(); if (!v('clId')) return say('請先在上方輸入註冊時的信箱'); resetPw(v('clId')); });
    on('reg', () => { keep(); if (v('clPw') !== v('clPw2')) return say('兩次輸入的密碼不一樣'); if (!v('clName') || !v('clEmail') || !v('clPw')) return say('請把欄位填完整'); register(v('clName'), v('clEmail'), v('clPw')); });
    panel.querySelectorAll('.cl-form input').forEach(i => i.onkeydown = e => { if (e.key === 'Enter') { const b = panel.querySelector('.cl-form .btn-gold'); if (b) b.click(); } });
    on('down', () => typeof confirmBox === 'function' ? confirmBox('從雲端載入？', '這台裝置目前的進度會被雲端存檔取代（會留一份備份）。', '載入', download) : download());
    on('sync', () => checked ? upload(true).then(() => say('已同步到雲端', 'ok')) : check(true));
    const a = panel.querySelector('[data-a=auto]'); if (a) a.onchange = () => put(LS.auto, a.checked ? '1' : '0');
  }

  /* ---------- 自動同步 ---------- */
  if (typeof SAVE !== 'undefined' && SAVE.save && !SAVE.__cloudWrapped) { const _s = SAVE.save.bind(SAVE); SAVE.save = function () { try { if (!SAVE.__noStamp) { stamp(); dirty = true; } } catch (e) { } return _s.apply(this, arguments); }; SAVE.__cloudWrapped = true; }
  function tick() { if (user && checked && dirty && get(LS.auto) !== '0' && Date.now() - lastUp > 60000) upload(false); }
  window.addEventListener('DOMContentLoaded', () => {
    if (!CLOUD_CONFIG.enabled) return;
    setInterval(tick, 15000);
    document.addEventListener('visibilitychange', () => { if (document.hidden && user && checked && dirty && get(LS.auto) !== '0') upload(false); });
    /* 之前登入過：背景載入 Firebase、恢復登入並比對雲端 */
    if (get(LS.on)) setTimeout(() => sdk().catch(() => { }), 2500);
  });
  return { open, close, login, logout, upload, download, check, deviceId, pack, unpack, ready: () => !!user, status: () => user ? `已登入：${user.email || ''}` : '尚未登入', _state: () => ({ user: !!user, checked, dirty, busy, status }), sdk, resetPw, fb: () => fb, user: () => user, onUser: f => { hooks.push(f); if (user) f(user); }, setName, myName, nameKey, NAME_RE, errText };
})();
window.openCloud = () => CLOUD.open();
