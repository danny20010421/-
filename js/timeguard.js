/* 時間偵測：裝置時間被調快或調慢時，暫停所有依時間計算的獎勵（七日登入、每日補給、懸賞領獎、交易所）。
   判斷方式：① 和 GitHub Pages 伺服器回應的時間比對（有網路時）② 遊戲中途時間突然跳動 ③ 時間比上次記錄的還早。 */
(function () {
  const TOL = 15 * 60e3; const TG = window.TIMEGUARD = { locked: false, reason: '', diff: 0 };
  const clock = () => (SAVE.data.clock = SAVE.data.clock || { max: 0 });
  function lock(reason, diff) {
    if (TG.locked && TG.reason === reason) return; TG.locked = true; TG.reason = reason; TG.diff = diff;
    const m = Math.round(Math.abs(diff) / 60000), txt = m >= 120 ? `${Math.round(m / 60)} 小時` : `${m} 分鐘`;
    const msg = reason === 'forward' ? `裝置時間比實際時間快了約 ${txt}` : reason === 'back' ? `裝置時間比實際時間慢了約 ${txt}，或被調回過去` : '遊戲進行中裝置時間突然跳動';
    setTimeout(() => { if (typeof confirmBox === 'function') confirmBox('偵測到裝置時間異常', `${msg}。七日登入、每日補給、懸賞領獎與懸賞金交易所會暫停，請把手機設為「自動設定日期與時間」後重新開啟遊戲。`, '我知道了', () => { }); else toast(msg); }, 800);
  }
  function unlock() { TG.locked = false; TG.reason = ''; }
  window.timeLocked = () => TG.locked;
  function localCheck() { const c = clock(), now = Date.now(); if (c.max && now < c.max - TOL) lock('back', now - c.max); else if (!TG.locked) { c.max = Math.max(c.max, now); SAVE.save(); } }
  function serverCheck() {
    if (!navigator.onLine || location.protocol === 'file:') return;
    fetch(location.href.split('#')[0], { method: 'HEAD', cache: 'no-store' }).then(r => { const sd = Date.parse(r.headers.get('Date') || ''); if (!sd) return; const off = Date.now() - sd;
      if (Math.abs(off) > TOL) lock(off > 0 ? 'forward' : 'back', off);
      else { unlock(); const c = clock(); c.max = Date.now(); SAVE.save(); } /* 伺服器時間正常：以實際時間為準 */ }).catch(() => { });
  }
  /* 遊戲中途：比對系統時間與單調時鐘的差，偵測中途調整時間 */
  let w0 = Date.now(), p0 = performance.now();
  /* 只把「時間倒退」當成異常；往前跳可能只是手機休眠，交給伺服器比對判斷 */
  setInterval(() => { const dw = Date.now() - w0, dp = performance.now() - p0; if (dw - dp < -TOL) lock('back', dw - dp); else if (dw - dp > TOL) serverCheck(); w0 = Date.now(); p0 = performance.now(); if (!TG.locked) { const c = clock(); c.max = Math.max(c.max, Date.now()); } }, 30000);
  window.addEventListener('DOMContentLoaded', () => { setTimeout(() => { try { localCheck(); serverCheck(); } catch (e) { } }, 1200); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { w0 = Date.now(); p0 = performance.now(); try { localCheck(); serverCheck(); } catch (e) { } } });
})();
