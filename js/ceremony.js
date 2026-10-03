/* 獲得儀式：通關篇章、四皇加入等時候，用「恭喜獲得」畫面一張張翻開獲得的船員與道具（有光芒、音效、依稀有度變色）。
   篇章結算會自動比對「進島前」與「通關時」的差異，把這趟航程得到的新船員、寶藏幣、貝里與道具全部列出。 */
(function () {
  const RC = r => (typeof RAR_COLOR !== 'undefined' && RAR_COLOR[r]) || '#ffd34a', rarOf = id => (typeof CHAR_RARITY !== 'undefined' && CHAR_RARITY[id]) || 'R';
  let snap = null;
  function take(id) { const d = SAVE.data; snap = { id, roster: Object.keys(d.roster || {}), tokens: d.tokens || 0, berry: d.berry || 0, inv: { ...(d.inventory || {}) }, skins: Object.keys((d.skins && d.skins.owned) || {}) }; }
  function gains() {
    if (!snap) return []; const d = SAVE.data, G = [];
    Object.keys(d.roster || {}).filter(k => !snap.roster.includes(k) && CHARACTERS[k]).forEach(k => G.push({ char: k }));
    if ((d.tokens || 0) > snap.tokens) G.push({ name: '寶藏幣', count: d.tokens - snap.tokens, emoji: '🪙', rar: 'SR' });
    if ((d.berry || 0) > snap.berry) G.push({ name: '貝里', count: d.berry - snap.berry, emoji: '💰', rar: 'R' });
    Object.entries(d.inventory || {}).forEach(([k, n]) => { const dn = n - (snap.inv[k] || 0); if (dn > 0 && ITEMS[k]) G.push({ item: k, count: dn }); });
    return G;
  }
  /* list：[{char}｜{item,count}｜{name,count,emoji,rar}] */
  function show(opt, list, done) {
    opt = opt || {}; if (!list || !list.length) { if (done) done(); return; }
    const chars = list.filter(x => x.char), rest = list.filter(x => !x.char);
    const box = document.createElement('div'); box.className = 'cer-wrap'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', opt.title || '恭喜獲得');
    const cardOf = (g, i) => { if (g.char) { const c = CHARACTERS[g.char], r = rarOf(g.char); return `<div class="cer-char" style="--rc:${RC(r)};--d:${.25 + i * .18}s"><span class="cer-rays"></span><img src="${charArt(g.char)}" alt=""><span class="cer-cn"><i class="rar c-rar r-${r}">${r}</i><b>${c.name}</b><small>加入船隊！</small></span></div>`; }
      const it = g.item ? ITEMS[g.item] : null, r = it ? (it.rarity || 'R') : g.rar || 'R';
      return `<div class="cer-item" style="--rc:${RC(r)};--d:${.35 + (chars.length + i) * .1}s"><span class="cer-ic">${it ? itemIcon(it) : `<em>${g.emoji || '🎁'}</em>`}</span><b>${it ? it.name : g.name}</b><small>×${(g.count || 1).toLocaleString()}</small></div>`; };
    box.innerHTML = `<div class="cer-card"><div class="cer-burst" aria-hidden="true"></div><h2 class="cer-title">${opt.title || '恭喜獲得'}</h2>${opt.sub ? `<p class="cer-sub">${opt.sub}</p>` : ''}
      ${chars.length ? `<div class="cer-chars">${chars.map(cardOf).join('')}</div>` : ''}${rest.length ? `<div class="cer-items">${rest.map((g, i) => cardOf(g, i)).join('')}</div>` : ''}
      <button class="btn-gold big cer-ok">確定</button></div>`;
    document.body.appendChild(box); if (window.fixIcons) fixIcons(box);
    try { SFX.play(chars.length ? 'ult' : 'rare'); setTimeout(() => SFX.play('rare'), 400); } catch (e) { }
    const ok = () => { box.classList.add('out'); setTimeout(() => { box.remove(); if (done) done(); }, 250); };
    box.querySelector('.cer-ok').onclick = ok;
  }
  window.showRewards = show;
  window.addEventListener('DOMContentLoaded', () => {
    /* 進島時記下目前的狀態 */
    if (typeof enterChapter === 'function') { const _e = enterChapter; window.enterChapter = function (id) { if (!snap || snap.id !== id) take(id); return _e.apply(this, arguments); }; }
    /* 篇章結算：尾聲之後、通關畫面之前，先顯示這趟航程的收穫 */
    if (typeof showClear === 'function') { const _s = showClear; window.showClear = function (pc) {
      const epiPending = CH && CH.epilogue && CH.epilogue.length && !pc.epiDone;
      if (!epiPending && !pc._cer) { pc._cer = true; const G = gains(); snap = null; if (G.length) { show({ title: '航海收穫', sub: `${CH.name} 完成！這趟航程獲得了：` }, G, () => _s(pc)); return; } }
      return _s.apply(this, arguments); }; }
  });
})();
