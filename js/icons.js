/* 道具圖示：統一風格的立體插畫（深色描邊、漸層、高光） */
(function () {
  let uid = 0;
  const OL = '#1a1410';
  function lighten(hex, k) { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255, f = v => Math.round(Math.min(255, Math.max(0, v + (k > 0 ? (255 - v) * k : v * k)))); return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join(''); }
  const grad = (id, c1, c2, vert) => `<linearGradient id="${id}" x1="0" y1="0" x2="${vert ? 0 : 1}" y2="${vert ? 1 : 1}"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`;
  const DRAW = {
    book(c, R, id) {
      const cover = R === 'SR' ? '#7a3fc0' : R === 'R' ? '#8a5a2e' : '#2f78c8', trim = '#f3c969';
      const emblem = R === 'SR'
        ? `<circle cx="34" cy="30" r="8" fill="${trim}" stroke="${OL}" stroke-width="1.5"/><circle cx="31" cy="29" r="1.8" fill="${OL}"/><circle cx="37" cy="29" r="1.8" fill="${OL}"/><path d="M31 34h6" stroke="${OL}" stroke-width="1.5"/><path d="M24 40l20-18M24 22l20 18" stroke="${trim}" stroke-width="2.4" stroke-linecap="round"/>`
        : R === 'R'
          ? `<circle cx="34" cy="31" r="9" fill="none" stroke="${trim}" stroke-width="2.4"/><path d="M34 23l3 8-3 8-3-8z" fill="${trim}" stroke="${OL}" stroke-width="1"/><circle cx="34" cy="31" r="1.6" fill="${OL}"/>`
          : `<path d="M34 20l3.2 6.6 7.2 1-5.2 5 1.3 7.2L34 36.4l-6.5 3.4 1.3-7.2-5.2-5 7.2-1z" fill="${trim}" stroke="${OL}" stroke-width="1.4" stroke-linejoin="round"/>`;
      return `<defs>${grad(id + 'a', lighten(cover, .25), lighten(cover, -.35), true)}${grad(id + 'p', '#fffaf0', '#e6dcc4', true)}</defs>
        <path d="M14 14h36a4 4 0 0 1 4 4v34a4 4 0 0 1-4 4H14z" fill="url(#${id}p)" stroke="${OL}" stroke-width="2"/>
        <path d="M16 55h36M16 52h36" stroke="#cbbf9f" stroke-width="1.2"/>
        <path d="M10 10h38a4 4 0 0 1 4 4v36a4 4 0 0 1-4 4H10a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3z" fill="url(#${id}a)" stroke="${OL}" stroke-width="2.4"/>
        <path d="M13 10v44" stroke="${lighten(cover, -.5)}" stroke-width="3"/><path d="M17 14h31M17 50h31" stroke="${trim}" stroke-width="1.6" opacity=".9"/>
        <rect x="19" y="17" width="30" height="30" rx="4" fill="none" stroke="${trim}" stroke-width="1.6" opacity=".85"/>${emblem}
        <path d="M12 12h10l-8 30z" fill="#fff" opacity=".18"/>`;
    },
    potion(c, R, id) {
      return `<defs><radialGradient id="${id}l" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="${lighten(c, .55)}"/><stop offset=".6" stop-color="${c}"/><stop offset="1" stop-color="${lighten(c, -.45)}"/></radialGradient></defs>
        <path d="M26 6h12v12l0 0a18 18 0 1 1-12 0z" fill="#d9ecf5" fill-opacity=".35" stroke="${OL}" stroke-width="2.4"/>
        <path d="M17 36a15 15 0 1 0 30 0c0-2-.4-3.8-1-5.5H18c-.6 1.7-1 3.5-1 5.5z" fill="url(#${id}l)"/>
        <circle cx="26" cy="42" r="2" fill="#fff" opacity=".7"/><circle cx="36" cy="38" r="1.4" fill="#fff" opacity=".6"/><circle cx="31" cy="47" r="1.1" fill="#fff" opacity=".5"/>
        <path d="M24 3h16v6H24z" fill="#a8743f" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/><path d="M26 18h12" stroke="${OL}" stroke-width="2"/>
        <path d="M20 30c1-6 5-9 8-10" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".7"/>`;
    },
    flask(c, R, id) {
      return `<defs>${grad(id + 'l', lighten(c, .3), lighten(c, -.35), true)}</defs>
        <path d="M24 5h16v4h-2v14l12 24a6 6 0 0 1-5.4 8.6H19.4A6 6 0 0 1 14 47l12-24V9h-2z" fill="#e6f4fa" fill-opacity=".3" stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"/>
        <path d="M20 36h24l6 11a6 6 0 0 1-5.4 8.6H19.4A6 6 0 0 1 14 47z" fill="url(#${id}l)"/>
        <path d="M22 44l3-3 3 3 3-3 3 3 3-3 3 3" stroke="#fff" stroke-width="1.6" fill="none" opacity=".45"/>
        <rect x="23" y="2" width="18" height="6" rx="2" fill="#6b4a2f" stroke="${OL}" stroke-width="2"/>
        <rect x="24" y="24" width="16" height="7" rx="1.5" fill="#f4ead2" stroke="${OL}" stroke-width="1.4"/><path d="M27 27.5h10" stroke="${c}" stroke-width="2"/>
        <path d="M28 12v10" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>`;
    },
    herb(c, R, id) {
      return `<defs>${grad(id + 'g', lighten(c, .3), lighten(c, -.4), true)}</defs>
        <path d="M32 56V30" stroke="#5a7a2a" stroke-width="3" stroke-linecap="round"/>
        <path d="M32 34C18 34 10 22 12 10c12 0 20 10 20 24z" fill="url(#${id}g)" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M32 30c14 0 22-10 20-22-12 0-20 8-20 22z" fill="url(#${id}g)" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M32 42c-9 0-15-6-15-14 8 0 15 6 15 14zM32 40c9 0 14-5 14-13-8 0-14 5-14 13z" fill="${lighten(c, -.15)}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M14 12c6 4 12 10 16 20M50 10c-6 4-12 10-16 18" stroke="${lighten(c, .5)}" stroke-width="1.4" fill="none"/>
        <path d="M26 50h12l-2 6h-8z" fill="#c8322b" stroke="${OL}" stroke-width="1.8"/>`;
    },
    fruit(c, R, id) {
      return `<defs><radialGradient id="${id}f" cx=".35" cy=".35" r=".75"><stop offset="0" stop-color="${lighten(c, .5)}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${lighten(c, -.5)}"/></radialGradient></defs>
        <path d="M32 14c12 0 20 8 20 20s-9 22-20 22-20-10-20-22 8-20 20-20z" fill="url(#${id}f)" stroke="${OL}" stroke-width="2.4"/>
        <path d="M22 28c4-4 10-2 10 2s-6 5-6 2 3-3 4-1M36 38c4-4 10-2 10 2s-6 5-6 2 3-3 4-1M22 44c3-3 8-2 8 1s-5 4-5 1" stroke="${lighten(c, -.55)}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <path d="M32 14c-1-4 0-8 4-10" stroke="#5a3a1a" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M34 8c6-4 12-2 14 2-6 3-10 2-14-2z" fill="#6fae3a" stroke="${OL}" stroke-width="1.8"/>
        <ellipse cx="24" cy="24" rx="5" ry="3" fill="#fff" opacity=".45" transform="rotate(-30 24 24)"/>`;
    },
    scroll(c, R, id) {
      return `<defs>${grad(id + 'p', '#fff6dc', '#e2cfa0', true)}</defs>
        <path d="M14 14h36v36H14z" fill="url(#${id}p)" stroke="${OL}" stroke-width="2.2"/>
        <path d="M20 22h24M20 28h24M20 34h18M20 40h22" stroke="#9a8460" stroke-width="1.6"/>
        <rect x="8" y="8" width="48" height="8" rx="4" fill="${lighten(c, -.2)}" stroke="${OL}" stroke-width="2.2"/><rect x="8" y="48" width="48" height="8" rx="4" fill="${lighten(c, -.2)}" stroke="${OL}" stroke-width="2.2"/>
        <circle cx="8" cy="12" r="3" fill="#f3c969" stroke="${OL}" stroke-width="1.6"/><circle cx="56" cy="12" r="3" fill="#f3c969" stroke="${OL}" stroke-width="1.6"/><circle cx="8" cy="52" r="3" fill="#f3c969" stroke="${OL}" stroke-width="1.6"/><circle cx="56" cy="52" r="3" fill="#f3c969" stroke="${OL}" stroke-width="1.6"/>
        <circle cx="42" cy="40" r="6" fill="#c8322b" stroke="${OL}" stroke-width="1.8"/><path d="M39 40l2 2 4-4" stroke="#ffd26c" stroke-width="1.6" fill="none"/>`;
    },
    meat(c, R, id) {
      return `<defs><radialGradient id="${id}m" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#e8804a"/><stop offset=".65" stop-color="#b8502a"/><stop offset="1" stop-color="#7a2e14"/></radialGradient></defs>
        <path d="M40 40l12 12" stroke="#f4ead2" stroke-width="7" stroke-linecap="round"/><path d="M40 40l12 12" stroke="${OL}" stroke-width="9" stroke-linecap="round" opacity=".0"/>
        <circle cx="53" cy="49" r="4" fill="#fffaf0" stroke="${OL}" stroke-width="2"/><circle cx="49" cy="54" r="4" fill="#fffaf0" stroke="${OL}" stroke-width="2"/>
        <path d="M44 42c-6 10-20 12-30 4S6 22 16 14s24-8 30 0 6 18-2 28z" fill="url(#${id}m)" stroke="${OL}" stroke-width="2.4"/>
        <path d="M18 18c6-5 14-5 20 0" stroke="#ffb07a" stroke-width="3" stroke-linecap="round" fill="none" opacity=".75"/>
        <path d="M16 34c4 4 10 6 16 4" stroke="#7a2e14" stroke-width="2" fill="none"/>`;
    },
    feather(c, R, id) {
      return `<defs>${grad(id + 'f', '#fff3c4', '#ff9a3a', true)}${grad(id + 'b', '#bff0ff', '#3f8fe0', false)}</defs>
        <path d="M50 8C26 12 14 30 16 52c16-4 30-18 34-44z" fill="url(#${id}b)" stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"/>
        <path d="M46 14C30 20 22 32 20 46c10-6 20-16 26-32z" fill="url(#${id}f)" opacity=".9"/>
        <path d="M48 10L14 56" stroke="${OL}" stroke-width="2.2" stroke-linecap="round"/><path d="M46 14L16 52" stroke="#fffaf0" stroke-width="1.2"/>
        <path d="M22 44l-6 2M26 38l-7 1M31 31l-7 0M36 25l-7-1" stroke="${OL}" stroke-width="1.2" opacity=".5"/>`;
    }
  };
  const RGLOW = { N: '#9fb3c4', R: '#5fb8ff', SR: '#c58bff', SSR: '#ffcf5a' };
  window.itemIcon = function (it) {
    if (it.img) return `<img class="ico ico2 ico-img r-${it.rarity}" src="${it.img}" alt="" draggable="false">`; /* 有專屬插圖的道具直接用圖片 */
    const id = 'ic' + (uid++), fn = DRAW[it.icon] || DRAW.potion;
    return `<svg class="ico ico2 r-${it.rarity}" viewBox="0 0 64 64" style="--g:${RGLOW[it.rarity] || '#9fb3c4'}" aria-hidden="true">${fn(it.color || '#6fd08c', it.rarity, id)}</svg>`;
  };
})();
