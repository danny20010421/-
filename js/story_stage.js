/* 劇情演出舞台（v86）：對話時把立繪搬上舞台——說話的人亮起放大、聽的人變暗，進場有滑入動畫、待機會呼吸；旁白時立繪退場、畫面加上電影黑邊。
   台詞格式向下相容：[說話者, 台詞] 照舊；可加第三個欄位做演出 { fx:'shake'|'flash'|'speed', emo:'!'|'?'|'💢'|'💦'|'♪'|'…' }。
   說話者可以是 NPC 代號（有對應立繪的會自動換成立繪，例如 law_n → 羅）、'@角色代號'（船員或敵人），或 null（旁白）。 */
(function () {
  /* NPC 代號 → 立繪角色（只列確定是同一人的，避免像「村裡的孩子」被誤認成尤斯塔斯·基德） */
  const MAP = { brogy: 'brogy', brook: 'brook', tama: 'tama', dorry: 'dorry', koza: 'koza', coby_e: 'coby0', koby: c => (c === 'dark' ? 'koby_hc' : 'koby_mf'), jinbe: 'jinbe', kinemon: 'kinemon', wiper: 'wiper', makino: 'makino', law_n: 'law', vegapunk_n: 'vegapunk', kuma_n: 'kuma', franky_n: 'franky', franky: 'franky', morgan_n: 'morgan', perona_n: 'perona', aokiji_n: 'aokiji', catarina_n: 'catarina', york_n: 'york', sugar_n: 'sugar', robin: 'robin', vivi: 'vivi', mayor: 'mayor', yamato: 'yamato', shirahoshi: 'shirahoshi', loki_n: 'loki', shanks_n: 'shanks', garp: c => (c === 'dark' ? 'garp_hc' : 'garp_mf') };
  function speakerArt(who, chId) {
    if (!who) return null; if (who[0] === '@') { const k = who.slice(1); return CHARACTERS[k] && CHARACTERS[k].image ? k : null; }
    let k = MAP[who]; if (typeof k === 'function') k = k(chId || (typeof CH !== 'undefined' && CH ? CH.id : '')); return k && CHARACTERS[k] && CHARACTERS[k].image ? k : null;
  }
  window.speakerArt = speakerArt;
  let el = null, left = null, right = null, cur = { l: null, r: null };
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ensure() {
    if (el) return; el = document.createElement('div'); el.className = 'vn-stage'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<i class="vn-bar t"></i><i class="vn-bar b"></i><div class="vn-slot l"><img alt=""><b class="vn-emo"></b></div><div class="vn-slot r"><img alt=""><b class="vn-emo"></b></div><i class="vn-flash"></i><i class="vn-speed"></i>';
    (document.getElementById('worldScreen') || document.body).appendChild(el); left = el.querySelector('.vn-slot.l'); right = el.querySelector('.vn-slot.r');
  }
  function put(slot, key, side) {
    const img = slot.querySelector('img'); if (cur[side] === key) return; cur[side] = key;
    if (!key) { slot.classList.remove('on', 'in'); return; }
    img.src = charArt(key); slot.dataset.k = key; slot.classList.remove('in'); void slot.offsetWidth; slot.classList.add('on', 'in');
    const v = (typeof CHAR_VIS !== 'undefined' && CHAR_VIS[key]) || null; slot.style.setProperty('--vs', v && v.scale ? Math.min(1.25, Math.max(.75, v.scale)) : 1);
  }
  function captain() { return (typeof WORLD !== 'undefined' && WORLD && WORLD.playerId && CHARACTERS[WORLD.playerId] && CHARACTERS[WORLD.playerId].image) ? WORLD.playerId : null; }
  /* 依這一句決定舞台 */
  function stage(line) {
    ensure(); const [who, , opt] = line, o = opt || {}, chId = typeof CH !== 'undefined' && CH ? CH.id : '', art = speakerArt(who, chId), cap = captain();
    el.classList.add('show'); el.classList.toggle('narr', !who); document.body.classList.add('vn-on');
    if (!who) { left.classList.remove('talk'); right.classList.remove('talk'); }
    else if (art) {
      const crew = who[0] === '@' && typeof owned === 'function' && owned(art);
      if (art === cap || crew) { put(left, art, 'l'); left.classList.add('talk'); right.classList.remove('talk'); }
      else { put(right, art, 'r'); right.classList.add('talk'); if (!cur.l && cap) put(left, cap, 'l'); left.classList.remove('talk'); }
    } else { /* 沒有立繪的 NPC：右側退場，隊長在左側聆聽 */ put(right, null, 'r'); if (cap && !cur.l) put(left, cap, 'l'); left.classList.remove('talk'); right.classList.remove('talk'); }
    const tgt = right.classList.contains('talk') ? right : left.classList.contains('talk') ? left : null;
    el.querySelectorAll('.vn-emo').forEach(e => { e.textContent = ''; e.classList.remove('pop'); });
    if (o.emo && tgt) { const e = tgt.querySelector('.vn-emo'); e.textContent = o.emo; void e.offsetWidth; e.classList.add('pop'); }
    if (!reduce()) { if (o.fx === 'shake') { const d = document.getElementById('dialog'); [el, d].forEach(x => { if (!x) return; x.classList.remove('vn-shake'); void x.offsetWidth; x.classList.add('vn-shake'); }); try { SFX.play('hit'); } catch (e) { } }
      if (o.fx === 'flash') { const f = el.querySelector('.vn-flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
      el.querySelector('.vn-speed').classList.toggle('go', o.fx === 'speed'); }
  }
  function clear() { document.body.classList.remove('vn-on'); if (!el) return; el.classList.remove('show', 'narr'); cur = { l: null, r: null }; [left, right].forEach(s => s.classList.remove('on', 'in', 'talk')); el.querySelector('.vn-speed').classList.remove('go'); }
  window.vnStageClear = clear;
  window.addEventListener('DOMContentLoaded', () => {
    if (typeof nextLine !== 'function') return;
    const _n = nextLine; window.nextLine = function () { if (!typing && dlgQueue.length && localStorage.getItem('op_vn') !== '0') { try { stage(dlgQueue[0]); } catch (e) { } } return _n.apply(this, arguments); };
    if (typeof hideDialog === 'function') { const _h = hideDialog; window.hideDialog = function () { clear(); return _h.apply(this, arguments); }; }
    /* 擊敗、連戰、蒐集類任務完成時，播放該任務的劇情對話（原本只有 talk、goto、race 等任務會播） */
    if (typeof completeStep === 'function' && typeof curStep === 'function') { const _c = completeStep; window.completeStep = function () { const s = curStep(); const r = _c.apply(this, arguments);
      if (s && ['defeat', 'gauntlet', 'collect', 'timedCollect'].includes(s.type) && Array.isArray(s.lines) && s.lines.length) setTimeout(() => { if (!dialogOpen && typeof say === 'function') say(s.lines); }, 1100); return r; }; }
    /* 對話框的小頭像：有立繪的 NPC 改用角色頭像 */
    if (typeof faceFor === 'function') { const _f = faceFor; window.faceFor = function (who) { const r = _f(who); const k = who && who[0] !== '@' ? speakerArt(who) : null; if (k && CHARACTERS[k].avatar) r.html = `<img src="${CHARACTERS[k].avatar}" alt="">`; return r; }; }
  });
})();
