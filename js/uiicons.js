/* 圓形按鈕的符號改用 SVG 圖示：文字符號在不同裝置的字型裡高度不一，會偏上或偏下；
   SVG 以固定的 24×24 畫布繪製，放在按鈕正中央，所有裝置都能垂直水平置中。 */
(function () {
  const P = {
    back: '<path d="M14.5 5 8 12l6.5 7" />',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />',
    menu: '<path d="M5 7h14M5 12h14M5 17h14" />',
    mail: '<rect x="4" y="6.5" width="16" height="11" rx="1.6" /><path d="M4.6 7.2 12 13l7.4-5.8" />',
    music: '<path d="M9 17.5V6.8l9-2v10.6" /><circle cx="7" cy="17.5" r="2.2" /><circle cx="16" cy="15.4" r="2.2" />'
  };
  const MAP = { '‹': 'back', '×': 'close', '✕': 'close', '✖': 'close', '☰': 'menu', '≡': 'menu', '✉': 'mail', '♪': 'music', '♫': 'music' };
  const svg = k => `<svg class="ico-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${P[k]}</svg>`;
  function fix(el) {
    if (!el || el.dataset.ico) return; const t = (el.textContent || '').trim(), k = MAP[t];
    if (!k) return; el.dataset.ico = k; el.innerHTML = svg(k); el.classList.add('ico-btn');
  }
  const SEL = '.icon-btn, .hn-menu, [data-close], .m-menu, #lbMail';
  function scan(root) { (root || document).querySelectorAll(SEL).forEach(fix); }
  window.fixIcons = scan;
  window.addEventListener('DOMContentLoaded', () => {
    scan();
    new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(n => { if (n.nodeType !== 1) return; if (n.matches && n.matches(SEL)) fix(n); if (n.querySelectorAll) scan(n); }); }).observe(document.body, { childList: true, subtree: true });
  });
})();
