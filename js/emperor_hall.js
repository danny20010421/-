/* 皇帝領海・四皇展示頁：四位皇帝以直立大幅立繪並列，選擇一位才進入他專屬的挑戰頁。 */
(function () {
  const SEA = { whitebeard: '新世界・白鬍子的領海', bigmom: '新世界・萬國托特蘭', kaido: '新世界・和之國', shanks: '新世界・紅髮的領海' };
  const MARK = { whitebeard: '白', bigmom: '母', kaido: '獸', shanks: '紅' };
  let el = null;
  function phaseOf(id) { const S = (SAVE.data.emperor || {})[id] || {}; return S.phase || 1; }
  function open() {
    const sh = document.getElementById('lbModes'); if (sh) { sh.classList.remove('show'); sh.setAttribute('aria-hidden', 'true'); }
    if (!el) { el = document.createElement('div'); el.className = 'eh-wrap'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '皇帝領海・四皇'); }
    const L = (typeof EMPEROR_DOMAIN !== 'undefined' ? EMPEROR_DOMAIN.list : []);
    el.innerHTML = `<div class="eh-bg" aria-hidden="true"></div>
      <header class="eh-head"><button class="icon-btn" data-x aria-label="回到大廳">‹</button><img src="assets/ui/emperor_logo.webp?v=78" alt=""><div><h2>皇帝領海</h2><small>選擇要挑戰的四皇</small></div></header>
      <div class="eh-row">${L.map((e, k) => { const c = CHARACTERS[e.id], ph = phaseOf(e.id), done = ph > 3, own = typeof owned === 'function' && owned(e.id);
        return `<button class="eh-card ${done ? 'done' : ''}" data-id="${e.id}" style="--ec:${e.color};--d:${k * .08}s">
          <span class="eh-art"><img src="${charArt(e.id)}" alt="${c.name}"></span>
          <span class="eh-mark" aria-hidden="true">${MARK[e.id] || c.name[0]}</span>
          <span class="eh-stars">${[1, 2, 3].map(p => `<i class="${ph > p ? 'on' : ''}"></i>`).join('')}</span>
          <span class="eh-info"><small>${SEA[e.id] || e.crew}</small><b>${c.name}</b><em>${e.crew}</em><span class="eh-st">${done ? (own ? '👑 已加入船隊' : '已征服') : ph > 1 ? `第 ${ph} 階段挑戰中` : '尚未挑戰'}</span></span>
        </button>`; }).join('')}</div>
      <p class="eh-foot">每位四皇都要突破三個階段：隊長連戰 → 皇帝的分身 → 皇帝真身</p>`;
    document.body.appendChild(el); if (window.fixIcons) fixIcons(el);
    el.querySelector('[data-x]').onclick = () => { close(); if (typeof openModes === 'function') openModes(); };
    el.querySelectorAll('[data-id]').forEach(b => b.onclick = () => { if (window.SFX) SFX.play('rare'); b.classList.add('pick'); setTimeout(() => { close(); openEmperor(b.dataset.id); }, 380); });
    if (window.AUDIO && AUDIO.playSong) AUDIO.playSong('boss');
  }
  function close() { if (el) el.remove(); }
  window.openEmperorHall = open;
  window.addEventListener('DOMContentLoaded', () => {
    /* 冒險裡的「皇帝領海」也先進展示頁 */
    document.querySelectorAll('[data-mode=emperor]').forEach(b => b.addEventListener('click', e => { e.stopImmediatePropagation(); open(); }, true));
    const b = document.getElementById('epBack'); if (b) b.onclick = () => { if (window.emperorSolo && emperorSolo()) { open(); } else openModes(); };
  });
})();
