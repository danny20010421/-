/* 大廳圖示：統一的金色線條 SVG 圖示（取代表情符號，各裝置顯示一致） */
(function () {
  const I = {
    news: '<path d="M3.5 10v4h3l7 4.5v-13L6.5 10z"/><path d="M16.5 9.2a4 4 0 0 1 0 5.6"/><path d="M19 6.8a7.5 7.5 0 0 1 0 10.4"/>',
    bounty: '<path d="M7 3.5h10.5a2 2 0 0 1 2 2V18a2.5 2.5 0 0 1-2.5 2.5H9A2.5 2.5 0 0 1 6.5 18V5"/><path d="M7 3.5A2.5 2.5 0 0 0 4.5 6v2h2"/><path d="M10 9h6.5M10 12h6.5M10 15h4"/>',
    event: '<path d="M5.5 21V3.5"/><path d="M5.5 4h12l-2.5 4 2.5 4h-12"/><circle cx="5.5" cy="21" r=".6"/>',
    login: '<rect x="4" y="5" width="16" height="15.5" rx="2"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/><path d="m9.5 15 1.8 1.8 3.5-3.6"/>',
    trophy: '<path d="M8 4h8v5.5a4 4 0 0 1-8 0z"/><path d="M8 6H5.2a3 3 0 0 0 3.2 4.3M16 6h2.8a3 3 0 0 1-3.2 4.3"/><path d="M12 13.5V17M9 20.5h6M10 17h4"/>',
    map: '<path d="M3.5 6.5 9 4.5l6 2 5.5-2v13l-5.5 2-6-2-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/><path d="m11 10.5 2 2m0-2-2 2"/>',
    crew: '<circle cx="12" cy="10" r="3.2"/><path d="M5.5 8h13"/><path d="M8.2 7.6c.5-2.6 7.1-2.6 7.6 0"/><path d="M5 20.5c1.1-3.6 4-5.2 7-5.2s5.9 1.6 7 5.2"/>',
    bag: '<path d="M6 8.5h12l-1 12H7z"/><path d="M9 8.5V6.5a3 3 0 0 1 6 0v2"/><path d="M9.5 12.5h5"/>',
    guild: '<circle cx="12" cy="5" r="2"/><path d="M12 7v13.5"/><path d="M8.5 10.5h7"/><path d="M5 14a7 7 0 0 0 14 0"/><path d="m5 14-1.6 1.6M19 14l1.6 1.6"/>',
    sword: '<path d="M4.5 4.5 15 15M15 15l1.5-1.5 4 4-1.5 1.5-4-4z"/><path d="M19.5 4.5 9 15M9 15l-1.5-1.5-4 4 1.5 1.5 4-4z"/>',
    summon: '<circle cx="12" cy="13" r="6.5"/><path d="M12 2.5v2.5"/><path d="m12 9.6 1.1 2.3 2.4 1.1-2.4 1.1L12 16.4l-1.1-2.3L8.5 13l2.4-1.1z"/>',
    shop: '<rect x="4" y="9.5" width="16" height="10" rx="1.5"/><path d="M4 9.5a8 4.5 0 0 1 16 0"/><path d="M4 13.5h16"/><rect x="10.5" y="12" width="3" height="3" rx=".6"/>',
    friends: '<circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.4"/><path d="M3.5 19.5c.8-3.1 3-4.6 5.5-4.6s4.7 1.5 5.5 4.6"/><path d="M15 15.2c2.2-.6 4.5.6 5.5 3.6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.6"/><path d="M12 2.6v2.8M12 18.6v2.8M2.6 12h2.8M18.6 12h2.8M5.4 5.4l2 2M16.6 16.6l2 2M5.4 18.6l2-2M16.6 7.4l2-2"/>',
    wheel: '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.8"/><path d="M12 1.8v4.4M12 17.8v4.4M1.8 12h4.4M17.8 12h4.4M4.8 4.8l3 3M16.2 16.2l3 3M4.8 19.2l3-3M16.2 7.8l3-3"/>'
  };
  function paint(root) { (root || document).querySelectorAll('.l2-svg[data-ic]').forEach(el => { if (el.dataset.done) return; const p = I[el.dataset.ic]; if (!p) return; el.dataset.done = 1; el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`; }); }
  window.paintLobbyIcons = paint;
  window.addEventListener('DOMContentLoaded', () => paint());
})();
