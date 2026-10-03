/* 各篇章 3D 場景：地形、建築、植被、可動物件與碰撞 */
(function (global) {
  'use strict';
  const { Builder, M, hex, shade, mix } = E3;

  function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  let CLEAR = [];
  const bad = (x, z) => CLEAR.some(c => Math.hypot(x - c[0], z - c[1]) < (c[2] || 6)) || (CUR_PATH && onPath(x, z, 4.5));
  const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };

  /* 各章路線：到路線折線的距離小於 w 就算在路上 */
  let CUR_PATH = null;
  function onPath(x, z, w) { const P2 = CUR_PATH; if (!P2) return Math.abs(x) < w && z > -54; for (let i = 0; i < P2.length - 1; i++) { const [ax, az] = P2[i], [bx, bz] = P2[i + 1], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); if (Math.hypot(x - ax - dx * t, z - az - dz * t) < w) return true; } return false; }
  /* 通用島嶼高度：陸地半徑 R，重要地點會被整平 */
  function makeHeight(opt) {
    const R = opt.R || 76, flats = opt.flats || [];
    return function (x, z) {
      const r = Math.hypot(x, z * (opt.squash || 1));
      const wob = Math.sin(Math.atan2(z, x) * 5 + 1.3) * 5 + Math.sin(Math.atan2(z, x) * 11) * 2.2;
      let land = 1 - sm(R - 12, R + 6, r + wob);
      for (const L of opt.lobes || []) { const d = Math.hypot(x - L[0], z - L[1]) + wob * .4; land = Math.max(land, 1 - sm(L[2] - 9, L[2] + 4, d)); }
      let hills = 1.6 + Math.sin(x * 0.07) * Math.cos(z * 0.06) * (opt.hill || 1.6) + Math.sin(x * 0.13 + z * 0.1) * 0.7 + (opt.bump ? opt.bump(x, z) : 0);
      for (const f of flats) { const d = Math.hypot(x - f[0], z - f[1]); const k = 1 - sm(f[2] * 0.6, f[2], d); hills = hills * (1 - k) + (f[3] == null ? 1.6 : f[3]) * k; }
      hills = Math.max(hills, 0.9);
      let h = land * hills - (1 - land) * 4;
      if (opt.sea === false) h = Math.max(h, hills * (0.5 + 0.5 * land) + (1 - land) * (opt.rim || 0));
      if (opt.carve) h = opt.carve(x, z, h);
      return h;
    };
  }

  /* ---------- 共用物件 ---------- */
  const CHIMNEYS = []; /* 煙囪位置（新版畫面會冒煙） */
  /* ===== 立體結構工具（v85）：可以走上去的地板、樓梯、橋，會擋人的牆，玩家走進去時會隱藏的屋頂 =====
     plats：{x0,z0,x1,z1,y0,y1,ax}（ax 為 'x' 或 'z' 時是斜坡／樓梯，高度從 y0 漸變到 y1；沒有 ax 就是平台，高度 y0）
     walls：{x0,z0,x1,z1,y0,y1}（玩家的身體高度與牆重疊時擋住）
     roofs：{b, x0,z0,x1,z1}（玩家站在範圍內時不畫，方便看到室內） */
  let ST = null;
  const K = {
    slab(b, x0, z0, x1, z1, top, col, thick, colTop) { thick = thick || .5; const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; b.box(cx, top - thick, cz, Math.abs(x1 - x0), thick, Math.abs(z1 - z0), col, 0); if (colTop) b.box(cx, top - .04, cz, Math.abs(x1 - x0) - .05, .06, Math.abs(z1 - z0) - .05, colTop, 0); ST.plats.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), y0: top, y1: top }); },
    /* 樓梯：沿 ax 方向從 (a 端, yA) 爬到 (b 端, yB) */
    stairs(b, x0, z0, x1, z1, yA, yB, ax, col, base) { const n = Math.max(2, Math.ceil(Math.abs(yB - yA) / .38)), lx = Math.min(x0, x1), hx = Math.max(x0, x1), lz = Math.min(z0, z1), hz = Math.max(z0, z1);
      for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, top = yA + (yB - yA) * t1, bot = base == null ? Math.min(yA, yB) - .5 : base;
        if (ax === 'x') { const a = x0 + (x1 - x0) * t0, c = x0 + (x1 - x0) * t1; b.box((a + c) / 2, bot, (lz + hz) / 2, Math.abs(c - a) + .02, top - bot, hz - lz, shade(col, .92 + (i % 2) * .08)); }
        else { const a = z0 + (z1 - z0) * t0, c = z0 + (z1 - z0) * t1; b.box((lx + hx) / 2, bot, (a + c) / 2, hx - lx, top - bot, Math.abs(c - a) + .02, shade(col, .92 + (i % 2) * .08)); } }
      ST.plats.push({ x0: lx, z0: lz, x1: hx, z1: hz, y0: ax === 'x' ? (x0 < x1 ? yA : yB) : (z0 < z1 ? yA : yB), y1: ax === 'x' ? (x0 < x1 ? yB : yA) : (z0 < z1 ? yB : yA), ax }); },
    /* 牆：沿 x 或 z 方向，gaps 是門洞 [起, 迄]（以牆的起點算距離） */
    wall(b, x0, z0, x1, z1, y0, h, col, gaps, th) { th = th || .4; const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0), L = alongX ? x1 - x0 : z1 - z0, sg = Math.sign(L) || 1, len = Math.abs(L); const cuts = [[0, len]];
      (gaps || []).forEach(([a, c]) => { for (let i = cuts.length - 1; i >= 0; i--) { const [p, q] = cuts[i]; if (c <= p || a >= q) continue; cuts.splice(i, 1, ...[[p, a], [c, q]].filter(([u, v]) => v - u > .05)); } });
      cuts.forEach(([p, q]) => { const a = p * sg, c = q * sg; if (alongX) { const cx = x0 + (a + c) / 2; b.box(cx, y0, z0, Math.abs(c - a), h, th, col); ST.walls.push({ x0: Math.min(x0 + a, x0 + c), x1: Math.max(x0 + a, x0 + c), z0: z0 - th / 2, z1: z0 + th / 2, y0, y1: y0 + h }); }
        else { const cz = z0 + (a + c) / 2; b.box(x0, y0, cz, th, h, Math.abs(c - a), col); ST.walls.push({ x0: x0 - th / 2, x1: x0 + th / 2, z0: Math.min(z0 + a, z0 + c), z1: Math.max(z0 + a, z0 + c), y0, y1: y0 + h }); } });
      (gaps || []).forEach(([a, c]) => { if (h > 2.6) { const m = ((a + c) / 2) * sg; if (alongX) b.box(x0 + m, y0 + 2.4, z0, Math.abs(c - a), h - 2.4, th, col); else b.box(x0, y0 + 2.4, z0 + m, th, h - 2.4, Math.abs(c - a), col); } }); },
    /* 欄杆（只有外觀＋低牆碰撞） */
    rail(b, x0, z0, x1, z1, y, col) { const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0), len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0), n = Math.max(2, Math.round(len / 1.6));
      for (let i = 0; i <= n; i++) { const t = i / n; b.box(x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t, .14, 1, .14, col); }
      if (alongX) b.box((x0 + x1) / 2, y + .9, z0, len, .1, .12, col); else b.box(x0, y + .9, (z0 + z1) / 2, .12, .1, len, col);
      ST.walls.push({ x0: Math.min(x0, x1) - .1, x1: Math.max(x0, x1) + .1, z0: Math.min(z0, z1) - .1, z1: Math.max(z0, z1) + .1, y0: y - .2, y1: y + 1 }); },
    /* 橋：平台＋木板外觀＋兩側繩索欄杆 */
    bridge(b, x0, z0, x1, z1, y, w, col, ropes) { const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0), len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0), n = Math.ceil(len / .9);
      for (let i = 0; i < n; i++) { const t = (i + .5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; b.box(x, y - .22, z, alongX ? len / n - .08 : w, .22, alongX ? w : len / n - .08, mix(col, '#ffffff', hash(i, 7) * .12)); }
      ST.plats.push({ x0: Math.min(x0, x1) - (alongX ? 0 : w / 2), x1: Math.max(x0, x1) + (alongX ? 0 : w / 2), z0: Math.min(z0, z1) - (alongX ? w / 2 : 0), z1: Math.max(z0, z1) + (alongX ? w / 2 : 0), y0: y, y1: y });
      if (ropes !== false) [-1, 1].forEach(sd => { const ox = alongX ? 0 : sd * w / 2, oz = alongX ? sd * w / 2 : 0; K.rail(b, x0 + ox, z0 + oz, x1 + ox, z1 + oz, y, ropes || '#6b4a2f'); }); },
    /* 外圍螺旋樓梯的高塔：核心是實心牆，樓梯沿著四邊往上繞，最上面是平台 */
    tower(b, cx, cz, y0, flights, rise, stone, core, coreH) { const C = [[1, 1], [-1, 1], [-1, -1], [1, -1]]; b.box(cx, y0 - .5, cz, 6, coreH || flights * rise + .6, 6, core); ST.walls.push({ x0: cx - 3, x1: cx + 3, z0: cz - 3, z1: cz + 3, y0: y0 - 1, y1: y0 + (coreH || flights * rise) });
      const cr = (k, lv) => { const [sx, sz] = C[k % 4]; K.slab(b, cx + sx * 3, cz + sz * 3, cx + sx * 5, cz + sz * 5, y0 + lv * rise + .05, stone, .5); };
      cr(0, 0); for (let f = 0; f < flights; f++) { const k = f % 4, [ax2, az2] = C[k], [bx2, bz2] = C[(k + 1) % 4], yA = y0 + f * rise + .05, yB = y0 + (f + 1) * rise + .05;
        if (az2 === bz2) K.stairs(b, cx + ax2 * 3, cz + az2 * 3, cx + bx2 * 3, cz + az2 * 5, yA, yB, 'x', stone, y0 - .5); else K.stairs(b, cx + ax2 * 3, cz + az2 * 3, cx + ax2 * 5, cz + bz2 * 3, yA, yB, 'z', stone, y0 - .5); cr(k + 1, f + 1); }
      return y0 + flights * rise + .05; },
    roof(x0, z0, x1, z1) { const rb = new Builder(); ST.roofs.push({ b: rb, x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1) }); return rb; },
    /* 兩層樓、可以進去的房子：一樓門口、室內樓梯、二樓地板與窗、可隱藏的屋頂 */
    house2(b, x, z, w, d, y, wall, roof, door) { const h = 3.6, x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2; door = door || 'z+';
      K.slab(b, x0, z0, x1, z1, y + .05, '#b8aca0', .4, '#c8a878');
      const dg = [[w / 2 - 1, w / 2 + 1]], dgz = [[d / 2 - 1, d / 2 + 1]], wg = (L) => [[L * .2, L * .2 + 1.1], [L * .7, L * .7 + 1.1]];
      K.wall(b, x0, z1, x1, z1, y, h * 2, wall, door === 'z+' ? dg : []); K.wall(b, x0, z0, x1, z0, y, h * 2, wall, door === 'z-' ? dg : []);
      K.wall(b, x0, z0, x0, z1, y, h * 2, wall, door === 'x-' ? dgz : []); K.wall(b, x1, z0, x1, z1, y, h * 2, wall, door === 'x+' ? dgz : []);
      /* 室內樓梯沿著左牆往後爬 */ K.stairs(b, x0 + .3, z1 - 1.2, x0 + 2, z0 + 3.2, y + .05, y + h, 'z', '#a87650');
      K.slab(b, x0 + .2, z0 + .2, x1 - .2, z0 + 3.2, y + h, '#9a6a44', .3, '#b58a5a'); K.slab(b, x0 + 2.1, z0 + 3.2, x1 - .2, z1 - .2, y + h, '#9a6a44', .3, '#b58a5a');
      K.rail(b, x0 + 2.1, z0 + 3.3, x0 + 2.1, z1 - .4, y + h, '#6b4a2f');
      [y + 1.4, y + h + 1.4].forEach(wy => [.3, .7].forEach(f => { b.box(x0 + w * f, wy, z1 + .03, 1, 1, .08, '#2c3e58'); b.box(x0 + w * f, wy, z0 - .03, 1, 1, .08, '#2c3e58'); }));
      const rb = K.roof(x0 - .4, z0 - .4, x1 + .4, z1 + .4); rb.box(x, y + h * 2, z, w + .8, .4, d + .8, shade(roof, .8)); rb.cyl(x, y + h * 2 + .4, z, Math.max(w, d) * .75, 0, 2.6, 4, roof, null, Math.PI / 4); }
  };
  const P = {
    tree(b, x, y, z, s, r, col) {
      /* 樹：樹幹＋一根側枝＋三團樹葉，輪廓更蓬鬆 */
      const c0 = col || mix('#3f8a3a', '#6fae44', r()), sd = (r() * 9999) | 0;
      b.cyl(x, y - .3, z, .5 * s, .3 * s, 3.4 * s, 7, '#6b4a2f'); b.cyl(x + .3 * s, y + 2.2 * s, z, .14 * s, .1 * s, 1.4 * s, 5, '#6b4a2f', null, 0, [.7 * s, .1 * s]);
      b.sphere(x, y + 4 * s, z, 2.1 * s, 10, c0, .9, .18, sd); b.sphere(x + 1.2 * s, y + 3.3 * s, z + .6 * s, 1.5 * s, 9, shade(c0, .94), .9, .2, sd + 1); b.sphere(x - 1.1 * s, y + 3.5 * s, z - .5 * s, 1.4 * s, 9, shade(c0, 1.05), .9, .2, sd + 2);
    },
    pine(b, x, y, z, s, col) {
      b.cyl(x, y - .3, z, .35 * s, .25 * s, 2 * s, 5, '#5b3d27');
      for (let i = 0; i < 3; i++) b.cyl(x, y + (1.4 + i * 1.5) * s, z, (2.4 - i * .6) * s, 0, 2.4 * s, 7, shade(col || '#2f6b3c', 1 - i * .06));
    },
    palm(b, x, y, z, s, r) {
      let px = x, pz = z, py = y - .3; const lean = r() * Math.PI * 2, dx = Math.cos(lean) * .35 * s, dz = Math.sin(lean) * .35 * s;
      for (let i = 0; i < 5; i++) { b.cyl(px, py, pz, .38 * s, .32 * s, 1.35 * s, 5, i % 2 ? '#8a6a3e' : '#7a5b33', null, 0, [dx, dz]); px += dx; pz += dz; py += 1.35 * s; }
      b.cyl(px, py - .3 * s, pz, 3.6 * s, 0, 1.1 * s, 7, '#4f8f3a', null, r());
      b.cyl(px, py - .9 * s, pz, 3.2 * s, 0, .8 * s, 6, '#3e7a30', null, r() + .4);
    },
    rock(b, x, y, z, s, r, col) { b.sphere(x, y + s * .3, z, s, 6, col || mix('#7b7f86', '#9aa0a6', r()), .75, .45, (r() * 9999) | 0); },
    house(b, x, y, z, w, d, h, wall, roof, ry) {
      /* 細節版民宅：石基、木骨架、門框與石階、窗框＋百葉窗＋花箱、階梯狀瓦片屋頂、屋脊、煙囪 */
      ry = ry || 0; const c = Math.cos(ry), s = Math.sin(ry), L = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c], beam = '#5e3e2a', shutter = ['#3f72b8', '#5a8a4a', '#b5543c', '#d8a03a'][Math.abs(Math.round(x * 3 + z)) % 4];
      b.box(x, y - .6, z, w + .34, 1.0, d + .34, '#a99d90', ry);
      b.box(x, y + .4, z, w, h - .4, d, wall, ry);
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, e]) => { const [px, pz] = L(a * w / 2, e * d / 2); b.box(px, y + .3, pz, .34, h - .2, .34, beam, ry); });
      b.box(x, y + h - .12, z, w + .12, .26, d + .12, beam, ry); b.box(x, y + h * .52, z, w + .08, .18, d + .08, beam, ry);
      { const [fx, fz] = L(0, d / 2 + .07); b.box(fx, y - .02, fz, 1.5, 2.45, .18, beam, ry); const [ex, ez] = L(0, d / 2 + .15); b.box(ex, y, ez, 1.08, 2.15, .1, '#8a5a38', ry); const [gx, gz] = L(0, d / 2 + .55); b.box(gx, y - .4, gz, 1.9, .42, .9, '#b4a898', ry); }
      const win = (lx, lz, back) => { const k = back ? -1 : 1, [ax, az] = L(lx, k * (d / 2 + .06)); b.box(ax, y + h * .3, az, 1.1, 1.0, .16, beam, ry); const [gx, gz] = L(lx, k * (d / 2 + .12)); b.box(gx, y + h * .3 + .12, gz, .78, .76, .08, '#2c3e58', ry);
        [-1, 1].forEach(q => { const [sx, sz] = L(lx + q * .74, k * (d / 2 + .1)); b.box(sx, y + h * .3, sz, .42, 1.0, .08, shutter, ry); });
        const [bx, bz] = L(lx, k * (d / 2 + .26)); b.box(bx, y + h * .3 - .3, bz, 1.12, .26, .3, '#8a5a38', ry); ['#ff6a8a', '#ffd34a', '#ffffff'].forEach((fc, q) => { const [px, pz] = L(lx - .32 + q * .32, k * (d / 2 + .28)); b.sphere(px, y + h * .3, pz, .16, 5, fc, 1, .2, q + 3); }); };
      if (w > 3.6) { win(-w * .3, d / 2); win(w * .3, d / 2); } win(0, d / 2, true);
      const over = .5, rh = h * .62, n = 6, hd = d / 2 + over;
      [-1, 1].forEach(sd => { for (let i = 0; i < n; i++) { const [rx, rz] = L(0, sd * hd * (1 - (i + .5) / n)); b.box(rx, y + h + rh * i / n - .04, rz, w + over * 2, rh / n + .14, hd / n * 1.18, shade(roof, .86 + (i % 2) * .12), ry); } });
      for (let i = 0; i < n - 1; i++) b.box(x, y + h + rh * i / n, z, w - .04, rh / n, d * (1 - (i + 1) / n) + .02, wall, ry);
      b.box(x, y + h + rh - .04, z, w + over * 2 + .12, .26, .5, shade(roof, .7), ry);
      { const [cx, cz] = L(w * .28, -d * .18); b.box(cx, y + h, cz, .8, rh + 1.2, .8, '#9a8e82', ry); b.box(cx, y + h + rh + 1.2, cz, 1, .2, 1, '#8a7e72', ry); CHIMNEYS.push([cx, y + h + rh + 1.5, cz]); }
    },
    fence(b, x0, z0, x1, z1, hf, col) {
      const n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) / 2.4)), ang = Math.atan2(x1 - x0, z1 - z0);
      for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; b.box(x, hf(x, z) - .2, z, .25, 1.4, .25, col); }
      for (let i = 0; i < n; i++) { const t = (i + .5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; b.box(x, hf(x, z) + .7, z, .14, .16, Math.hypot(x1 - x0, z1 - z0) / n, col, ang); }
    },
    ship(b, x, y, z, ry, s, sail) { return P.ship2(b, x, y, z, ry, s, { sail }); },
    /* 細節版帆船：弧形船身（分段收窄、船首上翹）、船舷木板與吃水線、砲門、欄杆、船尾樓與發光的窗、船首樓與船首斜桅、船首像、
       桅杆與帆桁、鼓起的帆（多片拼成弧面）、纜繩、海賊旗。回傳甲板高度與局部座標換算，方便呼叫端加上可以走的甲板。 */
    ship2(b, x, y, z, ry, s, o) {
      o = o || {}; s = s || 1; const Ln = (o.len || 14) * s, W = (o.w || 5) * s, Hh = 3 * s, c = Math.cos(ry || 0), sn = Math.sin(ry || 0);
      const L = (lx, lz) => [x + lx * c + lz * sn, z - lx * sn + lz * c], hull = o.hull || '#6e4426', hull2 = shade(hull, 1.18), deckC = o.deck || '#b88a58', trim = o.trim || '#e8dcc0', sailC = o.sail || '#f1ead8';
      const N = 16, prof = t => { const u = t * 2 - 1; return Math.max(.18, Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(u), u > 0 ? 2.2 : 4)))); }; /* 船首（+z）收得比船尾尖 */
      const deckY = y + Hh * .55;
      for (let i = 0; i < N; i++) { const t0 = i / N, t = (i + .5) / N, lz = -Ln / 2 + Ln * t, wv = W * prof(t), seg = Ln / N * 1.04, rise = Math.pow(Math.max(0, t - .7) / .3, 2) * .9 * s;
        const [px, pz] = L(0, lz); b.box(px, y - Hh * .55 + rise * .3, pz, wv * .62, Hh * .5, seg, shade(hull, .78), ry); b.box(px, y - Hh * .1 + rise * .5, pz, wv * .86, Hh * .38, seg, hull, ry); b.box(px, y + Hh * .22 + rise, pz, wv, Hh * .34, seg, hull2, ry);
        b.box(px, y - Hh * .2 + rise * .5, pz, wv * .9, .14 * s, seg, trim, ry); /* 吃水線上的飾條 */
        if (i > 2 && i < N - 3 && i % 2 === 0) [-1, 1].forEach(sd => { const [qx, qz] = L(sd * wv * .5, lz); b.box(qx, y + Hh * .02 + rise * .5, qz, .1 * s, .42 * s, .5 * s, '#1c1410', ry); }); /* 砲門 */
        if (i > 0 && i < N - 1) [-1, 1].forEach(sd => { const [qx, qz] = L(sd * wv * .46, lz); b.box(qx, deckY + rise, qz, .12 * s, .7 * s, .12 * s, shade(hull, .7), ry); }); /* 欄杆柱 */ }
      [-1, 1].forEach(sd => { for (let i = 1; i < N - 1; i++) { const t = (i + .5) / N, lz = -Ln / 2 + Ln * t, [qx, qz] = L(sd * W * prof(t) * .46, lz); b.box(qx, deckY + .62 * s + Math.pow(Math.max(0, t - .7) / .3, 2) * .9 * s, qz, .1 * s, .1 * s, Ln / N * 1.05, trim, ry); } });
      { const [dx, dz] = L(0, 0); b.box(dx, deckY - .12 * s, dz, W * .82, .14 * s, Ln * .9, deckC, ry); for (let k = -3; k <= 3; k++) { const [lx2, lz2] = L(k * W * .11, 0); b.box(lx2, deckY + .02 * s, lz2, .03 * s, .02, Ln * .86, shade(deckC, .8), ry); } }
      /* 船尾樓（-z）與窗 */ { const [ax, az] = L(0, -Ln * .38); b.box(ax, deckY, az, W * .7, 1.4 * s, Ln * .2, hull2, ry); b.box(ax, deckY + 1.4 * s, az, W * .76, .14 * s, Ln * .22, deckC, ry); for (let k = -1; k <= 1; k++) { const [wx, wz] = L(k * W * .2, -Ln * .485); b.box(wx, deckY + .4 * s, wz, .5 * s, .6 * s, .08 * s, '#ffcf6a', ry); } const [lx3, lz3] = L(0, -Ln * .5); b.cyl(lx3, deckY + 1.5 * s, lz3, .12 * s, .1 * s, .8 * s, 6, '#3a2a1a'); b.sphere(lx3, deckY + 2.4 * s, lz3, .22 * s, 6, '#ffcf6a'); }
      /* 船首樓與斜桅 */ { const [fx, fz] = L(0, Ln * .36); b.box(fx, deckY, fz, W * .5, .8 * s, Ln * .14, hull2, ry); const [bx2, bz2] = L(0, Ln * .52); b.cyl(bx2, deckY + .9 * s, bz2, .14 * s, .08 * s, Ln * .14, 6, '#5e3b22', null, 0, [sn * Ln * .12, c * Ln * .12]); }
      /* 船首像 */ { const [hx, hz] = L(0, Ln * .5 + .2 * s); if (o.head === 'whale') { b.sphere(hx, deckY - .4 * s, hz, 1.9 * s, 12, '#f4f2ea', .8); [-1, 1].forEach(sd => { const [ex, ez] = L(sd * .9 * s, Ln * .5 + 1.3 * s); b.sphere(ex, deckY + .1 * s, ez, .24 * s, 6, '#1a1a1a'); }); const [mx, mz] = L(0, Ln * .5 + 1.6 * s); b.box(mx, deckY - 1 * s, mz, 2 * s, .12 * s, .2 * s, '#3a2a2a', ry); }
        else if (o.head === 'sheep') { b.sphere(hx, deckY + .5 * s, hz, .9 * s, 10, '#f4ead8'); [-1, 1].forEach(sd => { const [ex, ez] = L(sd * .7 * s, Ln * .5); b.sphere(ex, deckY + .7 * s, ez, .35 * s, 6, '#e0c890'); }); }
        else if (o.head === 'lion') { b.sphere(hx, deckY + .6 * s, hz, 1.1 * s, 12, '#f0c040'); b.sphere(hx, deckY + .6 * s, hz, .8 * s, 10, '#f8d870'); }
        else b.sphere(hx, deckY + .2 * s, hz, .45 * s, 8, '#c9973a'); }
      /* 桅杆、帆桁、鼓起的帆、纜繩、旗 */
      const masts = o.masts || (Ln > 16 * s ? [-.18, .14] : [.02]), mh = (o.mastH || 11) * s;
      masts.forEach((mz, mi) => { const [mx, mzz] = L(0, Ln * mz); b.cyl(mx, deckY, mzz, .26 * s, .16 * s, mh, 8, '#5e3b22');
        [.42, .78].forEach((f, k) => { const yy = deckY + mh * f, yw = W * (k ? .62 : .82); const [yx, yz] = L(0, Ln * mz); b.box(yx, yy, yz, yw * 1.1, .14 * s, .14 * s, '#4a2f1a', ry);
          const sh = mh * (k ? .26 : .3), belly = [0, .18, .3, .18, 0]; for (let q = 0; q < 5; q++) { const lx2 = -yw * .5 + yw * (q + .5) / 5, [sx2, sz2] = L(lx2, Ln * mz + (belly[q] + .12) * s); b.box(sx2, yy - sh, sz2, yw / 5 * 1.04, sh, .08 * s, shade(sailC, .94 + belly[q] * .3), ry); } });
        [-1, 1].forEach(sd => { const [rx, rz] = L(sd * W * .44, Ln * mz - 1.5 * s); b.cyl(rx, deckY + .6 * s, rz, .03 * s, .03 * s, mh * .84, 4, '#8a7a5a', null, 0, [-sd * c * W * .4 + 0, sd * sn * W * .4]); });
        if (mi === masts.length - 1 || masts.length === 1) { const [tx, tz] = L(.9 * s, Ln * mz); b.box(tx, deckY + mh - .2 * s, tz, 1.8 * s, 1.2 * s, .06 * s, o.flag || '#1c1c22', ry); const [kx, kz] = L(.9 * s, Ln * mz + .04 * s); b.sphere(kx, deckY + mh + .4 * s, kz, .26 * s, 6, '#f4f2ea'); } });
      return { deckY, Ln, W, L };
    },
    torch(b, x, y, z) { b.cyl(x, y - .2, z, .18, .14, 2.2, 5, '#4a3222'); b.sphere(x, y + 2.3, z, .38, 6, '#ffb347'); },
    barrel(b, x, y, z, s) { s = s || 1; b.cyl(x, y - .1, z, .55 * s, .5 * s, 1.2 * s, 8, '#8a5a32', '#a8743f'); b.cyl(x, y + .25 * s, z, .57 * s, .57 * s, .08, 8, '#3a3a3a'); b.cyl(x, y + .8 * s, z, .56 * s, .56 * s, .08, 8, '#3a3a3a'); },
    crate(b, x, y, z, s, ry) { s = s || 1; b.box(x, y - .1, z, 1.1 * s, 1.1 * s, 1.1 * s, '#9a7045', ry); b.box(x, y + .35 * s, z, 1.14 * s, .12, 1.14 * s, '#6b4a2f', ry); },
    arena(b, x, y, z, R, stone, n) {
      for (let i = 0; i < (n || 10); i++) { const a = i / (n || 10) * Math.PI * 2; b.box(x + Math.cos(a) * R, y - .3, z + Math.sin(a) * R, 1.2, 2.6 + (i % 2) * 1.2, 1.2, stone, a); }
      b.cyl(x, y - .55, z, R - 1.5, R - 1.5, .6, 18, shade(stone, .85), shade(stone, 1.05));
    }
  };

  /* NPC：依原作外型設定的低多邊形人物 */
  const LOOKS = {
    makino: { skin: '#f6d2b0', hair: '#2f6a3a', hs: 'long', top: '#b8d4f0', sleeve: '#b8d4f0', bottom: '#b8322b', legs: 'skirt', hat: 'scarf', hatC: '#f2cc6a', eye: '#3a2a20', collar: '#d8e6f6', shoe: '#7a2a2a' }, /* 依官方立繪：深綠長髮、黃底花頭巾、藍條紋襯衫、紅長裙、酒紅靴 */
    morgan: { skin: '#e0b08a', hair: '#e8d070', hs: 'buzz', top: '#f4f2ea', bottom: '#3f6fa3', coat: '#f4f2ea', jaw: '#9aa0a6', axe: true, belt: '#3a3a3a', sc: 1.25, bigArms: true },
    mayor: { skin: '#e2b48a', hair: '#2a2a2a', hs: 'short', top: '#f2c63a', bottom: '#f4f2ea', pantStripe: '#c8322b', hat: 'bucket', hatC: '#f4f2ea', hatStripe: '#c8322b', glasses: 'round', glassC: '#c8a040', stache: '#5a4030', stubble: '#9a7a5a', collar: '#e8b830', sc: .92, cane: true },
    crew: { skin: '#d9a77c', hair: '#1b1b1b', hs: 'spiky', top: '#4a5b3a', bottom: '#2b2b2b', belly: true, hat: 'bandana', hatC: '#c8322b', sc: 1.1 },
    kid: { skin: '#f0c9a4', hair: '#3a2a1a', hs: 'short', top: '#e8b33b', bottom: '#355e8a', hat: 'cap', hatC: '#c8322b', sc: .72 },
    toto: { skin: '#b88a60', hair: '#e8e4dc', hs: 'bald', beard: '#e8e4dc', top: '#c9b27e', bottom: '#8a7a5a', glasses: 'sun', sc: 1.05 },
    vivi: { skin: '#f3d6bf', hair: '#5ab4e0', hs: 'pony', top: '#f4f0e0', bottom: '#c9973a', belt: '#8a6240' },
    koza: { skin: '#c8986c', hair: '#e8d8a8', hs: 'short', top: '#f4f2ea', bottom: '#6a5a4a', glasses: 'sun', cape: '#c9a06a' },
    conis: { skin: '#f7dcc6', hair: '#f2d36b', hs: 'long', top: '#ffffff', bottom: '#8ab4d8', legs: 'skirt', antenna: true, wings: true },
    ganfall: { skin: '#e8c29a', hair: '#e8e4dc', hs: 'short', beard: '#eeeae2', top: '#aab4c0', bottom: '#5a6270', cape: '#3f6fa3', hat: 'helmet', hatC: '#c9d6e6', lance: true },
    wiper: { skin: '#b88a60', hair: '#1b1b1b', hs: 'spiky', top: '#b88a60', bottom: '#2b3e59', hat: 'band', hatC: '#e8e4dc', stripes: '#e8e4dc' },
    pagaya: { skin: '#e8c29a', hair: '#e8e4dc', hs: 'bald', beard: '#eeeae2', top: '#3f6fa3', bottom: '#2b3e59', antenna: true, sc: .9 },
    ace: { skin: '#e0b08a', hair: '#1b1b1b', hs: 'spiky', top: '#e0b08a', bottom: '#2b2b2b', hat: 'cowboy', hatC: '#e8753a', beads: '#c8322b', belt: '#8a6240' },
    elder: { skin: '#e8c29a', hair: '#cfc8bb', hs: 'short', beard: '#e8e4dc', top: '#6a5a74', bottom: '#3b3444', sc: .95, cane: true },
    girl: { skin: '#f0c9a4', hair: '#6a3a2a', hs: 'pony', top: '#b8433a', bottom: '#6a2a26', legs: 'skirt', sc: .8 },
    fisher: { skin: '#c99a73', hair: '#3a2a1a', hs: 'short', top: '#3f6fa3', bottom: '#2b3e59', hat: 'cap', hatC: '#e8e4dc', belly: true, stubble: '#6a5040' },
    franky: { skin: '#e8b890', hair: '#4aa8e8', hs: 'pomp', top: '#e85a8a', bottom: '#3a6ad8', glasses: 'sun', sc: 1.2, bigArms: true },
    kokoro: { skin: '#e8c29a', hair: '#6a3a8a', hs: 'bun', top: '#c8322b', bottom: '#e8b33b', legs: 'skirt', belly: true },
    sogeking: { skin: '#b88a60', hair: '#1b1b1b', hs: 'afro', top: '#e8e4dc', bottom: '#8a6240', cape: '#c8322b', mask: '#e8c170' },
    camie: { skin: '#f3d6bf', hair: '#3fb6a0', hs: 'long', top: '#ffd26c', tail: '#e8753a', sc: .9 },
    jinbe: { skin: '#4a78a8', hair: '#1b1b1b', hs: 'topknot', top: '#e8753a', bottom: '#2b3e59', legs: 'kimono', belly: true, sc: 1.35 },
    neptune: { skin: '#e8b890', hair: '#e8e4dc', hs: 'long', beard: '#f4f2ea', top: '#c8322b', tail: '#3f6a3a', hat: 'crown', hatC: '#e8c170', sc: 1.9, belly: true },
    shyarly: { skin: '#e8c8b0', hair: '#3a6ad8', hs: 'long', top: '#1b1b22', tail: '#6a3a8a', sc: 1.05 },
    tama: { skin: '#f3d6bf', hair: '#1b1b1b', hs: 'bun', top: '#ef7fa8', bottom: '#c8322b', legs: 'kimono', sc: .72, pin: '#ffd26c' },
    kinemon: { skin: '#e0b08a', hair: '#8a3a1a', hs: 'topknot', beard: '#8a3a1a', top: '#6a3a8a', bottom: '#3a2a4a', legs: 'kimono', sword: true, belt: '#e8c170' },
    hiyori: { skin: '#f7dcc6', hair: '#3fb6a0', hs: 'bun', top: '#c8322b', bottom: '#8a1e2e', legs: 'kimono', pin: '#ffd26c', obi: '#e8c170' },
    denjiro: { skin: '#e0b08a', hair: '#1b1b1b', hs: 'topknot', top: '#2b2b3a', bottom: '#1b1b22', legs: 'kimono', sword: true, glasses: 'sun', obi: '#c8322b' },
    kawamatsu: { skin: '#6a9a4a', hair: '#6a9a4a', hs: 'bald', top: '#2b3e59', bottom: '#1f2e44', legs: 'kimono', hat: 'kappa', hatC: '#d9d4c8', sword: true, belly: true, sc: 1.15 },
    dorry: { skin: '#c68d62', hair: '#8a5a3a', hs: 'long', beard: '#8a5a3a', top: '#7d5a3a', bottom: '#4a3526', hat: 'horned', hatC: '#9aa0a6', sc: 2.3, belly: true },
    brogy: { skin: '#d49a6a', hair: '#e8b33b', hs: 'long', beard: '#e8b33b', top: '#5a4028', bottom: '#3a2a1a', hat: 'horned', hatC: '#c9973a', sc: 2.25 },
    robinNpc: { skin: '#e8c0a0', hair: '#1b1b22', hs: 'long', top: '#f4f2ea', bottom: '#6a3a8a', hat: 'cowboy', hatC: '#6a3a8a', cape: '#f4f2ea' },
    shirahoshiNpc: { skin: '#f7dcc6', hair: '#ff9ac2', hs: 'long', top: '#ffd26c', tail: '#ff8fb8', hat: 'crown', hatC: '#e8c170', sc: 2.3 },
    koby: { skin: '#f3d6bf', hair: '#ff9ac2', hs: 'short', top: '#f4f2ea', bottom: '#3f6fa3', belt: '#8a6240', glasses: 'round', glassC: '#3a3a40', eye: '#2a3a5a', sc: .95 },
    bbPirate: { skin: '#c99a73', hair: '#1b1b1b', hs: 'short', top: '#3a2a3a', bottom: '#2b2b2b', hat: 'bandana', hatC: '#1b1b1b', belt: '#8a6240', sword: true },
    guardFish: { skin: '#4a8aa8', hair: '#1b1b1b', hs: 'spiky', top: '#2b3e59', bottom: '#1f2e44', belt: '#c8322b', sword: true },
    baroque: { skin: '#e0b08a', hair: '#3a2a1a', hs: 'short', top: '#1b1b22', bottom: '#1b1b22', glasses: 'sun', hat: 'cap', hatC: '#1b1b22' },
    cp9guard: { skin: '#e0b08a', hair: '#1b1b1b', hs: 'short', top: '#f4f2ea', bottom: '#3a4a6a', hat: 'cap', hatC: '#f4f2ea', sword: true },
    garp: { skin: '#e0b08a', hair: '#e8e4dc', hs: 'short', beard: '#e8e4dc', top: '#f4f2ea', bottom: '#3f6fa3', cape: '#f4f2ea', belt: '#3a3a3a', sc: 1.2, bigArms: true },
    helmeppo: { skin: '#f0c9a4', hair: '#f2d36b', hs: 'short', top: '#f4f2ea', bottom: '#2b3e59', glasses: 'sun', belt: '#8a6240' },
    yamatoNpc: { skin: '#f3d6bf', hair: '#f4f7ff', hs: 'pony', top: '#f4f2ea', bottom: '#c8322b', legs: 'kimono', hat: 'horned', hatC: '#f4f7ff', obi: '#6a3a8a', sc: 1.12 },
    hajrudin: { skin: '#c68d62', hair: '#e8753a', hs: 'spiky', beard: '#e8753a', top: '#3a3a4a', bottom: '#2a2a33', hat: 'horned', hatC: '#6b7280', sc: 2.15, cape: '#7d1d18' }
  };
  const lookScale = (look) => (LOOKS[look] || {}).sc || 1;
  function npcMesh(renderer, look) {
    const L = Object.assign({ skin: '#e0b894', hair: '#333', hs: 'short', top: '#777', bottom: '#444', legs: 'pants' }, LOOKS[look] || {});
    const b = new Builder(), sk = L.skin, dark = shade(L.bottom, .7);
    // 下半身
    if (L.tail) { b.cyl(0, .1, 0, .55, .42, 1.1, 8, L.tail); b.cyl(0, -.2, .15, .42, .12, .5, 7, shade(L.tail, .85), null, 0, [0, .35]); b.box(0, -.25, .55, 1.1, .08, .5, shade(L.tail, 1.15), 0, .4); }
    else if (L.legs === 'skirt') { b.cyl(0, .05, 0, .72, .38, 1.25, 9, L.bottom); b.box(-.2, -.05, .05, .2, .2, .34, '#3a2a22'); b.box(.2, -.05, .05, .2, .2, .34, '#3a2a22'); }
    else if (L.legs === 'kimono') { b.cyl(0, .02, 0, .56, .42, 1.35, 8, L.bottom); b.box(-.18, -.04, .08, .2, .12, .36, '#f4f2ea'); b.box(.18, -.04, .08, .2, .12, .36, '#f4f2ea'); }
    else { b.box(-.24, .16, 0, .32, 1.02, .34, L.bottom); b.box(.24, .16, 0, .32, 1.02, .34, L.bottom); b.box(-.24, -.02, .08, .34, .22, .52, '#2a1f18'); b.box(.24, -.02, .08, .34, .22, .52, '#2a1f18'); }
    // 軀幹
    const tw = L.belly ? 1.2 : 1.0;
    b.box(0, 1.18, 0, tw, 1.12, .62, L.top, 0, .88);
    if (L.belly) b.sphere(0, 1.45, .12, .5, 8, L.top, .9);
    if (L.coat) { b.box(0, .45, -.04, tw * 1.18, 1.82, .78, L.coat, 0, .92); b.box(0, 1.0, .37, .34, 1.1, .04, L.top); b.box(0, 2.0, -.02, tw * 1.2, .22, .82, shade(L.coat, .92)); }
    if (L.collar) b.box(0, 1.96, .06, .72, .14, .5, L.collar);
    if (L.pantStripe && L.legs !== 'skirt' && L.legs !== 'kimono') [-.24, .24].forEach(lx => [.3, .58, .86].forEach(ly => b.box(lx, ly, 0, .345, .1, .355, L.pantStripe)));
    if (L.apron) b.box(0, 1.0, .3, .7, .9, .04, L.apron);
    if (L.belt || L.obi) b.box(0, 1.28, 0, tw * .98, .2, .66, L.obi || L.belt);
    if (L.stripes) { b.box(0, 1.8, .31, .9, .06, .02, L.stripes); b.box(0, 1.6, .31, .9, .06, .02, L.stripes); }
    if (L.beads) b.cyl(0, 2.08, 0, .44, .44, .1, 10, L.beads);
    if (L.cape) b.box(0, .75, -.35, tw * 1.1, 1.6, .08, L.cape, 0, .85);
    if (L.wings) { b.box(-.45, 1.5, -.38, .6, .7, .06, '#ffffff', .5, .6); b.box(.45, 1.5, -.38, .6, .7, .06, '#ffffff', -.5, .6); }
    // 手臂與手
    const aw = L.bigArms ? .42 : .26, armC = L.sleeve || L.coat || (L.top === sk ? sk : L.top);
    b.cyl(-.68, 1.05, 0, aw * .6, aw * .7, .95, 10, armC, null, 0, [-.08, 0]); b.cyl(.68, 1.05, 0, aw * .6, aw * .7, .95, 10, armC, null, 0, [.08, 0]);
    b.sphere(-.68, .98, .02, aw * .62, 9, sk); b.sphere(.68, .98, .02, aw * .62, 9, sk);
    if (L.sword) { b.box(-.62, 1.2, -.3, .08, .08, 1.4, '#1b1b22', .3); b.box(-.62, 1.22, .38, .12, .12, .12, '#e8c170', .3); }
    if (L.cane) b.cyl(.78, 0, .2, .05, .05, 1.1, 5, '#6b4a2f');
    if (L.axe) { /* 摩根的斧頭手：手臂接著金屬柄與半月形斧刃 */ b.cyl(.72, .1, .05, .08, .08, 1, 8, '#6a6a72'); b.box(.98, -.25, .05, .62, 1.5, .1, '#d8dce2', 0, .55); b.box(1.32, -.1, .05, .18, 1.2, .12, '#eef0f4', 0, .7); b.sphere(.72, .1, .05, .14, 8, '#5a5e66'); }
    if (L.lance) { b.cyl(.8, .1, .1, .05, .05, 3, 5, '#c9d6e6'); b.cyl(.8, 3.05, .1, .12, 0, .5, 5, '#e8e4dc'); }
    // 頭
    b.cyl(0, 1.95, 0, .16, .16, .2, 6, sk);
    b.sphere(0, 2.55, 0, .45, 16, sk, 1.08);
    b.sphere(-.44, 2.55, 0, .09, 5, sk); b.sphere(.44, 2.55, 0, .09, 5, sk);
    b.box(-.15, 2.58, .41, .13, .1, .03, '#ffffff'); b.box(.15, 2.58, .41, .13, .1, .03, '#ffffff');
    b.box(-.15, 2.58, .43, .07, .09, .02, L.eye || '#1b1b1b'); b.box(.15, 2.58, .43, .07, .09, .02, L.eye || '#1b1b1b'); b.box(-.13, 2.62, .445, .03, .03, .01, '#ffffff'); b.box(.17, 2.62, .445, .03, .03, .01, '#ffffff');
    if (L.stubble) b.sphere(0, 2.36, .14, .34, 10, L.stubble, .62); if (L.stache) { b.box(-.12, 2.39, .44, .22, .08, .06, L.stache, .15); b.box(.12, 2.39, .44, .22, .08, .06, L.stache, -.15); }
    if (L.jaw) { b.box(0, 2.12, .12, .6, .32, .52, L.jaw); b.sphere(-.26, 2.28, .3, .05, 5, '#5a5e66'); b.sphere(.26, 2.28, .3, .05, 5, '#5a5e66'); }
    b.box(-.15, 2.7, .42, .16, .03, .03, shade(L.hair, .9)); b.box(.15, 2.7, .42, .16, .03, .03, shade(L.hair, .9));
    b.box(0, 2.47, .45, .06, .1, .06, shade(sk, .9)); b.box(0, 2.35, .42, .16, .03, .03, '#8a3a3a');
    if (L.glasses === 'sun') b.box(0, 2.58, .45, .5, .1, .03, '#1b1b22');
    if (L.glasses === 'round') { const gc = L.glassC || '#5a4a3a'; [-.15, .15].forEach(gx => { b.box(gx, 2.5, .45, .2, .03, .03, gc); b.box(gx, 2.66, .45, .2, .03, .03, gc); b.box(gx - .1, 2.5, .45, .03, .19, .03, gc); b.box(gx + .1, 2.5, .45, .03, .19, .03, gc); b.box(gx, 2.53, .44, .16, .12, .01, '#cfe4f4'); }); b.box(0, 2.6, .45, .1, .03, .03, gc); }
    if (L.mask) b.box(0, 2.6, .44, .66, .34, .04, L.mask);
    if (L.beard) b.sphere(0, 2.26, .2, L.sc > 1.5 ? .42 : .3, 7, L.beard, 1.2);
    // 髮型
    const H = L.hair;
    if (L.hs === 'short') b.sphere(0, 2.66, -.04, .47, 14, H, .78);
    else if (L.hs === 'long') { b.sphere(0, 2.66, -.05, .48, 14, H, .8); b.box(0, 1.9, -.28, .9, 1.0, .22, H, 0, 1.1); }
    else if (L.hs === 'pony') { b.sphere(0, 2.66, -.04, .47, 14, H, .78); b.sphere(0, 2.9, -.45, .2, 6, H); b.cyl(0, 2.1, -.55, .12, .22, .8, 6, H, null, 0, [0, .1]); }
    else if (L.hs === 'bun') { b.sphere(0, 2.66, -.04, .47, 14, H, .78); b.sphere(0, 3.08, -.12, .26, 14, H); if (L.pin) b.box(.18, 3.1, -.1, .5, .05, .05, L.pin, .4); }
    else if (L.hs === 'spiky') { b.sphere(0, 2.66, -.04, .46, 14, H, .7); for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; b.cyl(Math.cos(a) * .28, 2.8, Math.sin(a) * .28 - .05, .14, 0, .38, 4, H, null, 0, [Math.cos(a) * .2, Math.sin(a) * .2]); } }
    else if (L.hs === 'pomp') { b.box(0, 2.95, .1, .6, .35, .8, H, 0, .8); b.sphere(0, 2.66, -.1, .44, 14, H, .7); }
    else if (L.hs === 'buzz') b.sphere(0, 2.66, -.03, .465, 14, H, .64);
    else if (L.hs === 'afro') b.sphere(0, 2.85, -.05, .66, 14, H, .9, .15, 3);
    else if (L.hs === 'topknot') { b.sphere(0, 2.62, -.08, .46, 14, H, .7); b.cyl(0, 3.0, -.1, .08, .08, .35, 5, H, null, 0, [0, -.12]); }
    // 帽子
    const hc = L.hatC || '#333';
    if (L.hat === 'cap') { b.cyl(0, 2.88, 0, .48, .46, .22, 10, hc); b.box(0, 2.88, .45, .6, .05, .35, shade(hc, .9)); }
    else if (L.hat === 'cowboy') { b.cyl(0, 2.9, 0, .9, .9, .06, 12, hc); b.cyl(0, 2.95, 0, .44, .38, .4, 10, hc); b.cyl(0, 2.96, 0, .45, .45, .1, 10, '#c8322b'); }
    else if (L.hat === 'crown') for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.cyl(Math.cos(a) * .36, 2.85, Math.sin(a) * .36, .1, 0, .4, 4, hc); }
    else if (L.hat === 'helmet') b.sphere(0, 2.72, 0, .5, 8, hc, .8);
    else if (L.hat === 'horned') { b.sphere(0, 2.72, 0, .5, 8, hc, .75); b.cyl(-.42, 2.85, 0, .1, .03, .6, 5, '#f4ead2', null, 0, [-.25, 0]); b.cyl(.42, 2.85, 0, .1, .03, .6, 5, '#f4ead2', null, 0, [.25, 0]); }
    else if (L.hat === 'bucket') { b.cyl(0, 2.82, 0, .76, .76, .06, 18, hc); b.cyl(0, 2.84, 0, .56, .46, .46, 16, hc); if (L.hatStripe) { b.cyl(0, 2.9, 0, .555, .53, .1, 16, L.hatStripe); b.cyl(0, 3.08, 0, .51, .49, .1, 16, L.hatStripe); } }
    else if (L.hat === 'bandana' || L.hat === 'scarf') { b.sphere(0, 2.7, -.05, .49, 14, hc, .72); if (L.hat === 'scarf') { b.box(-.08, 2.5, -.5, .22, .3, .08, hc, .3, .6); b.box(.1, 2.48, -.5, .22, .34, .08, shade(hc, .9), -.3, .6); } }
    else if (L.hat === 'band') b.cyl(0, 2.68, 0, .48, .48, .12, 10, hc);
    else if (L.hat === 'kappa') b.cyl(0, 2.98, 0, .34, .34, .06, 10, hc);
    if (L.antenna) { b.cyl(-.2, 2.95, 0, .03, .03, .5, 4, '#f4f2ea', null, 0, [-.1, 0]); b.cyl(.2, 2.95, 0, .03, .03, .5, 4, '#f4f2ea', null, 0, [.1, 0]); b.sphere(-.3, 3.47, 0, .07, 5, '#f4f2ea'); b.sphere(.3, 3.47, 0, .07, 5, '#f4f2ea'); }
    return renderer.mesh(b);
  }

  function itemMesh(renderer, icon) {
    const b = new Builder();
    const c = { map: '#f2e2b3', water: '#4aa8d8', shell: '#bfe8ff', flame: '#ffb347', fruit: '#e4572e' }[icon] || '#ffd26c';
    if (icon === 'meat') { b.sphere(0, .45, 0, .55, 8, '#b5502a', .8); b.cyl(-.9, .35, 0, .12, .12, .3, 5, '#f4ead2'); b.sphere(-1.05, .5, 0, .2, 5, '#f4ead2'); b.sphere(.9, .5, 0, .2, 5, '#f4ead2'); }
    else if (icon === 'sack') { b.sphere(0, .45, 0, .55, 7, '#c9b27e', .9, .15, 3); b.cyl(0, .9, 0, .18, .12, .3, 6, '#8a6240'); }
    else if (icon === 'gold') { b.box(0, 0, 0, .9, .5, .5, '#e8c170', .4, .8); b.box(.25, .5, 0, .5, .3, .4, '#f3d36b', .2); }
    else if (icon === 'paper') { b.box(0, 0, 0, .9, .08, 1.1, '#efe2c0'); b.box(0, .09, 0, .5, .02, .5, '#8a6240'); }
    else if (icon === 'pearl') { b.cyl(0, 0, 0, .7, .6, .25, 10, '#e89ab8'); b.sphere(0, .45, 0, .4, 9, '#fbf6ff'); }
    else if (icon === 'grain') { for (let i = 0; i < 5; i++) b.cyl((i - 2) * .12, 0, 0, .05, .03, 1.2, 4, '#c9a24a', null, 0, [(i - 2) * .12, 0]); b.sphere(0, 1.2, 0, .3, 6, '#e8c170', 1.6); }
    else if (icon === 'map') { b.box(0, 0, 0, 1.1, .12, .8, c); b.box(0, .12, 0, .7, .02, .5, '#9b7b4a'); }
    else if (icon === 'water') { b.cyl(0, 0, 0, .45, .38, .9, 7, c); b.cyl(0, .9, 0, .16, .14, .3, 6, '#7a5b33'); }
    else if (icon === 'shell') { b.cyl(0, 0, 0, .6, 0, .9, 9, c); b.sphere(0, .1, 0, .35, 6, '#ffffff'); }
    else if (icon === 'flame') { b.cyl(0, 0, 0, .12, .1, .8, 5, '#f4e9d0'); b.cyl(0, .8, 0, .22, 0, .55, 6, c); }
    else { b.sphere(0, .45, 0, .5, 8, c); b.box(0, .9, 0, .08, .3, .08, '#4a3a22'); b.box(.18, 1.02, 0, .3, .06, .16, '#4f8f3a'); }
    b.cyl(0, -.6, 0, .9, .9, .05, 14, '#fff6c9');
    return renderer.mesh(b);
  }

  function coneMesh(renderer) { const b = new Builder(); const N = 10, A = .7; for (let i = 0; i < N; i++) { const a0 = -A + i / N * 2 * A, a1 = -A + (i + 1) / N * 2 * A; b.tri([0, .15, 0], [Math.sin(a1), .15, Math.cos(a1)], [Math.sin(a0), .15, Math.cos(a0)], '#ff4a3a'); } return renderer.mesh(b); }
  function moundMesh(renderer) { const b = new Builder(); b.sphere(0, 0, 0, 1.1, 7, '#5a3d27', .35); b.cyl(0, -.1, 0, .6, .5, .2, 7, '#2a1f18'); return renderer.mesh(b); }
  function beaconMesh(renderer) { const b = new Builder(); b.cyl(0, 0, 0, 2.2, 1.6, 26, 12, '#ffe7a0', '#ffe7a0'); return renderer.mesh(b); }
  function barrierMesh(renderer, col) { const b = new Builder(); b.cyl(0, 0, 0, 13, 13, 9, 28, col, col); return renderer.mesh(b); }

  /* ---------- 各篇章 ---------- */
  const BUILD = {
    east(b, H, r, O, D) {
      /* ======== 東海・風車村（正式版）：依任務 NPC 的位置配置瑪琪諾的酒館、村長家、老漁夫的小屋、碼頭與魯夫的小船、海軍據點與摩根像、岬角 ======== */
      const ch = (typeof CHAPTERS !== 'undefined' ? CHAPTERS : []).find(c => c.id === 'east') || { npcs: [], steps: [] }, NP = {}; ch.npcs.forEach(n => { NP[n.id] = n.pos; });
      const keep = [...ch.npcs.map(n => n.pos), ...(D.L.spots || []), [40, 40], D.L.spawn, D.L.boss];
      const free = (x, z, c) => !onPath(x, z, c + 3.5) && keep.every(p => Math.hypot(x - p[0], z - p[1]) > c + 5) && O.every(o => Math.hypot(x - o[0], z - o[1]) > c + o[2]);
      const face = (x, z, t) => Math.atan2(t[0] - x, t[1] - z);
      const col = (x, y, z) => { const n = hash(x, z), sl = Math.abs(H(x + 1, z) - H(x - 1, z)) + Math.abs(H(x, z + 1) - H(x, z - 1));
        if (y < .25) return mix('#c9b07a', '#d4bc88', n); if (y < 1.05) return mix('#e6d29c', '#efdcaa', n); let c = y > 3.2 ? mix('#5ea845', '#78b850', n) : mix('#58a03e', '#6fb04a', n);
        if (Math.hypot(x + 2, z - 34) < 20) c = mix(c, '#7aae4a', .35); if (sl > 1.6) c = mix(c, '#8f8478', Math.min(1, (sl - 1.6) * .8)); return c; };
      b.terrain(210, 92, H, col);
      /* --- 瑪琪諾的酒館（兩層樓、招牌、露天座位、木桶）：門口朝向瑪琪諾 --- */
      { const t = NP.makino || [-10, 40], x = t[0] - 2, z = t[1] + 8.5, ry = face(x, z, t), y = H(x, z), c = Math.cos(ry), s2 = Math.sin(ry), L = (lx, lz) => [x + lx * c + lz * s2, z - lx * s2 + lz * c];
        P.house(b, x, y, z, 9, 6.6, 4.4, '#f2dfb8', '#b03a30', ry); b.box(x, y + 4.4, z, 6.4, 2.4, 4.8, '#f6e8cc', ry); { const [ax, az] = L(0, 0); b.box(ax, y + 6.8, az, 7.2, .3, 5.6, '#8a2a24', ry); }
        { const [sx, sz] = L(-2.6, 3.7); b.box(sx, y + 3.2, sz, 3.4, 1.1, .16, '#6a3e22', ry); const [tx, tz] = L(-2.6, 3.8); b.box(tx, y + 3.3, tz, 3.0, .8, .08, '#f2c46a', ry); }
        [[2.6, 5.4], [5.2, 5.0]].forEach(([lx, lz]) => { const [px, pz] = L(lx, lz), py = H(px, pz); b.cyl(px, py, pz, .12, .16, 1, 6, '#5e3e2a'); b.cyl(px, py + 1, pz, .8, .8, .12, 14, '#a87650'); [-1, 1].forEach(k => { const [qx, qz] = L(lx + k * 1.15, lz); b.box(qx, H(qx, qz), qz, .55, .55, .55, '#8a5a38', ry); }); });
        for (let i = 0; i < 4; i++) { const [px, pz] = L(-5.4 + (i % 2) * .95, 2.8 + Math.floor(i / 2) * .1); P.barrel(b, px, H(px, pz) + Math.floor(i / 2) * 1.15, pz, .85); }
        O.push([x, z, 5.6]); }
      /* --- 村長家（較大、旗竿）：門口朝向村長 --- */
      { const t = NP.mayor || [18, 26], x = t[0] + 5, z = t[1] + 7.5, ry = face(x, z, t), y = H(x, z); P.house(b, x, y, z, 7.4, 5.8, 3.9, '#efe4cc', '#3f6fa3', ry); const fx = x - Math.sin(ry) * 5 + Math.cos(ry) * 4.6, fz = z - Math.cos(ry) * 5 - Math.sin(ry) * 4.6; b.cyl(fx, H(fx, fz), fz, .1, .08, 7, 6, '#e8e4dc'); b.box(fx + .9, H(fx, fz) + 5.8, fz, 1.8, 1.1, .06, '#4a7ad8'); O.push([x, z, 5]); }
      /* --- 老漁夫的小屋：漁網架、曬魚架、翻過來的小船 --- */
      { const t = NP.roux || [-24, 18], x = t[0] - 7, z = t[1] + 3, ry = face(x, z, t), y = H(x, z); P.house(b, x, y, z, 5, 4.4, 3, '#d8c8a8', '#7a4b2a', ry);
        const nx = t[0] - 3, nz = t[1] - 6; [-2, 2].forEach(k => b.box(nx + k, H(nx + k, nz) - .2, nz, .18, 2.6, .18, '#6b4a2f')); b.box(nx, H(nx, nz) + 2.3, nz, 4.2, .12, .12, '#6b4a2f'); for (let i = 0; i < 7; i++) b.box(nx - 1.8 + i * .6, H(nx, nz) + .6, nz, .04, 1.7, .04, '#d8c890'); b.box(nx, H(nx, nz) + 1.4, nz + .02, 3.8, 1.6, .02, '#c8b880');
        const bx = t[0] + 5, bz = t[1] - 4; b.box(bx, H(bx, bz) - .1, bz, 1.6, .7, 4, '#8a5a38', .4, .7); O.push([x, z, 3.6]); O.push([nx, nz, 2.4]); }
      /* --- 一般民宅：自動挑選不擋路的位置 --- */
      { const cand = [[-30, 42], [-36, 28], [-20, 54], [-4, 58], [12, 58], [26, 46], [32, 22], [-38, 8], [6, 24], [-8, 24], [22, 56], [-44, 40]], walls = ['#f1e6cf', '#e8dcc2', '#f4ecd8', '#ead8b8'], roofs = ['#b8433a', '#3f6fa3', '#d8803a', '#5a8a4a', '#7a4b2a'];
        let k = 0; cand.forEach(([x, z]) => { if (!free(x, z, 3.6)) return; const y = H(x, z); if (y < 1.2) return; const ry = Math.atan2(-x, 34 - z) + (r() - .5) * .3; P.house(b, x, y, z, 5.2 + r() * 1.2, 4.4 + r() * .8, 3.1 + r() * .5, walls[k % 4], roofs[k % 5], ry); O.push([x, z, 4.2]);
          const gx = x + Math.cos(ry) * 4.2, gz = z - Math.sin(ry) * 4.2; if (free(gx, gz, 1.2)) for (let i = 0; i < 6; i++) b.sphere(gx + (i % 3) * .7 - .7, H(gx, gz) + .1, gz + Math.floor(i / 3) * .8, .38, 6, ['#ff6a8a', '#ffd34a', '#ffffff', '#ff8a3a'][(i + k) % 4], .7, .2, i + k * 7); k++; }); }
      /* --- 水井、曬衣繩、木箱、路牌 --- */
      { const x = 2, z = 36; if (free(x, z, 1.6)) { const y = H(x, z); b.cyl(x, y - .2, z, 1.3, 1.4, 1.1, 14, '#a99d90'); b.cyl(x, y + .85, z, 1.15, 1.15, .06, 14, '#2c4058'); [-1, 1].forEach(k => b.box(x + k * 1.15, y, z, .2, 2.6, .2, '#6b4a2f')); b.cyl(x, y + 2.6, z, 1.9, 0, 1, 4, '#b5543c', null, Math.PI / 4); O.push([x, z, 1.8]); } }
      { const x0 = -18, z0 = 30; if (free(x0 + 2, z0, 2.4)) { [0, 4].forEach(dx => b.cyl(x0 + dx, H(x0 + dx, z0), z0, .08, .08, 2.4, 5, '#6b4a2f')); ['#ff8a8a', '#ffffff', '#8ac8ff', '#ffe08a'].forEach((c2, i) => b.box(x0 + .6 + i * .9, H(x0 + 2, z0) + 1.3, z0, .7, .9, .04, c2)); } }
      for (let i = 0; i < 10; i++) { const a = r() * 6.28, d = 8 + r() * 26, x = -2 + Math.cos(a) * d, z = 36 + Math.sin(a) * d; if (!free(x, z, .8)) continue; const y = H(x, z); r() < .5 ? P.crate(b, x, y, z, .9, r() * 3) : P.barrel(b, x, y, z, .9); O.push([x, z, .9]); }
      { const x = 24, z = 34; if (free(x, z, .6)) { const y = H(x, z); b.box(x, y - .2, z, .18, 2.8, .18, '#6b4a2f'); b.box(x + .7, y + 2, z, 1.6, .45, .08, '#d8b880', -.6); b.box(x - .6, y + 1.5, z, 1.4, .4, .08, '#d8b880', .5); } }
      /* --- 小路兩旁的路燈 --- */
      for (let i = 0; i < D.L.path.length - 1; i++) { const [ax, az] = D.L.path[i], [bx, bz] = D.L.path[i + 1], L2 = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / L2, nz = (bx - ax) / L2; for (let t2 = .3; t2 < 1; t2 += .5) { const x = ax + (bx - ax) * t2 + nx * 4.4, z = az + (bz - az) * t2 + nz * 4.4; if (H(x, z) < 1 || keep.some(p => Math.hypot(x - p[0], z - p[1]) < 4)) continue; const y = H(x, z); b.cyl(x, y - .2, z, .1, .13, 3.6, 6, '#3a3040'); b.box(x, y + 3.2, z, .5, .6, .5, '#ffcf7a'); b.cyl(x, y + 3.8, z, .42, 0, .4, 4, '#3a3040', null, Math.PI / 4); O.push([x, z, .6]); } }
      /* --- 風車（石基、腰帶、門窗）：扇葉由遊戲繪製 --- */
      D.windmills = [[-44, -10], [44, 0], [-14, -30]].map(([x, z]) => { const y = H(x, z); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; b.box(x + Math.cos(a) * 2.5, y - .5, z + Math.sin(a) * 2.5, 1.4, .9, .9, mix('#a99d90', '#c4b8aa', hash(i, x)), -a); }
        b.cyl(x, y - .4, z, 2.4, 1.6, 9, 14, '#f4eee0'); for (let k = 1; k < 4; k++) b.cyl(x, y + k * 2.2, z, 2.4 - k * .22, 2.4 - k * .22, .22, 14, '#6b4a2f'); b.cyl(x, y + 8.6, z, 2.1, 0, 2.6, 14, '#8b3a2e');
        b.box(x, y - .3, z + 2.15, 1.2, 2.2, .2, '#8a5a38'); b.box(x, y + 5, z + 1.8, .8, .8, .2, '#2c3e58'); O.push([x, z, 3.2]); return [x, y + 7.6, z + 1.9]; });
      /* --- 碼頭：木板、木樁、繫船柱、繩索、燈；魯夫的小船 --- */
      for (let i = 0; i < 10; i++) { for (let k = 0; k < 4; k++) b.box(46 + i * 2.2, -.15, 42.4 + k * .9, 2.12, .3, .82, mix('#8a6240', '#a87650', hash(i, k))); [41.9, 46].forEach(zz => b.cyl(46 + i * 2.2, -3.2, zz, .2, .22, 3.6, 7, '#4a3222')); }
      [[47, 41.8], [58, 41.8], [66, 46.1]].forEach(([x, z]) => { b.cyl(x, .1, z, .26, .22, .7, 8, '#3a3a40'); b.cyl(x, .5, z, .45, .45, .12, 10, '#c8b080'); });
      { const x = 64, z = 46.2; b.cyl(x, .1, z, .1, .12, 3.4, 6, '#3a3040'); b.box(x, 3.3, z, .5, .6, .5, '#ffcf7a'); }
      { const x = 56, z = 38.6; b.box(x, -.6, z, 2.2, 1, 5.6, '#8a5a38', 0, .62); b.box(x, .35, z, 2, .12, 4.6, '#b58a5a'); b.cyl(x, .4, z + .3, .08, .1, 4.4, 6, '#6b4a2f'); b.box(x, 1.9, z + .45, .06, 2.4, 2, '#f6f0e2'); b.box(x, 3.6, z + .3, .08, .5, .9, '#c8322b'); }
      P.ship(b, 76, 0, 30, -.2, 1, '#f1ead8');
      /* --- 海軍據點（城牆、摩根像、旗）：在摩根附近 --- */
      { const t = NP.morgan_n || [-26, -10], x = t[0] - 9, z = t[1] - 6; if (free(x, z, 3) && H(x, z) > 1.3) { const y = H(x, z); b.box(x, y - .4, z, 2.6, 1.6, 2.6, '#c4bcac'); b.box(x, y + 1.2, z, 1.4, 3.2, 1, '#9aa0a6'); b.sphere(x, y + 5, z, .8, 10, '#9aa0a6'); b.box(x + .9, y + 2.4, z + .1, .4, 2.2, .4, '#9aa0a6', .4); b.box(x + 1.5, y + 3.6, z + .1, 1.2, 1.4, .18, '#c8ccd2', .4); O.push([x, z, 2.2]); }
        const wx = t[0] - 4, wz = t[1] - 14; for (let i = 0; i < 6; i++) { const px = wx + i * 2.4 - 6, pz = wz; if (!free(px, pz, .8) || H(px, pz) < 1.3) continue; const py = H(px, pz); b.box(px, py - .4, pz, 2.4, 3, 1, '#d8d2c4'); if (i % 2 === 0) b.box(px, py + 2.6, pz, .8, .6, 1, '#d8d2c4'); O.push([px, pz, 1.4]); }
        const fx = t[0] + 5, fz = t[1] - 8; if (free(fx, fz, .5)) { b.cyl(fx, H(fx, fz), fz, .1, .08, 7, 6, '#e8e4dc'); b.box(fx + .9, H(fx, fz) + 5.8, fz, 1.8, 1.1, .06, '#3a6ab0'); } }
      /* --- 孩子們的鞦韆 --- */
      { const t = NP.kid || [8, 48], x = t[0] - 6, z = t[1] + 3; if (free(x, z, 2)) { const y = H(x, z); [-1.4, 1.4].forEach(k => b.box(x + k, y, z, .2, 3, .2, '#6b4a2f')); b.box(x, y + 2.9, z, 3.2, .2, .2, '#6b4a2f'); b.box(x, y + .9, z, 1, .1, .4, '#a87650'); [-.4, .4].forEach(k => b.box(x + k, y + 1, z, .04, 1.9, .04, '#c8b080')); O.push([x, z, 2]); } }
      /* --- 樹與岩石 --- */
      for (let i = 0; i < 110; i++) { const a = r() * Math.PI * 2, d = 18 + r() * 62, x = Math.cos(a) * d, z = Math.sin(a) * d, y = H(x, z); if (bad(x, z) || y < 1.3 || !free(x, z, 1.4) || Math.hypot(x + 2, z - 34) < 16 || Math.hypot(x - D.L.boss[0], z - D.L.boss[1]) < 18) continue; if (r() < .75) { (r() < .2 ? P.pine(b, x, y, z, .9 + r() * .5) : P.tree(b, x, y, z, .8 + r() * .6, r)); O.push([x, z, 1.4]); } else { P.rock(b, x, y, z, .8 + r() * 1.4, r); O.push([x, z, 1.2]); } }
      for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = 72 + r() * 10, x = Math.cos(a) * d, z = Math.sin(a) * d, y = H(x, z); if (y > .6 || y < -2.5 || bad(x, z)) continue; P.rock(b, x, y - .4, z, 1 + r() * 1.8, r, mix('#8a8278', '#a49a90', r())); }
      /* --- 小溪上的木橋 --- */
      { const x = 38, zc = -26 - (x - 14) * .14 + Math.sin(x * .12) * 2.2; for (let i = 0; i < 9; i++) b.box(x, .9 + Math.sin(i / 8 * Math.PI) * .5, zc - 4 + i, 3.2, .2, .9, mix('#8a6240', '#a87650', hash(i, 3))); [-1.5, 1.5].forEach(k => b.box(x + k, 1.2, zc, .12, .12, 8.4, '#6b4a2f')); }
      P.fence(b, -42, 54, -16, 58, H, '#8a6240'); P.fence(b, 14, 58, 34, 56, H, '#8a6240');
      /* --- 北方岬角（送行之戰）：石圈、火把、孤樹、長椅 --- */
      { const [bx, bz] = D.L.boss, by = H(bx, bz); P.arena(b, bx, by, bz, 14, '#8d8f92', 14); for (let i = -1; i <= 1; i += 2) P.torch(b, bx + i * 6, H(bx + i * 6, bz + 16), bz + 16);
        const tx = bx - 15, tz = bz - 10; if (H(tx, tz) > 1) { P.tree(b, tx, H(tx, tz), tz, 1.6, r, '#5aa040'); O.push([tx, tz, 2.4]); b.box(tx + 3, H(tx + 3, tz), tz + 2, 2.4, .3, .7, '#8a6240'); [-1, 1].forEach(k => b.box(tx + 3 + k, H(tx + 3, tz) - .2, tz + 2, .2, .5, .6, '#6b4a2f')); } }
    },
    alabasta(b, H, r, O, D) {
      /* ======== 阿拉巴斯坦（正式版）：港口、尤巴的乾涸綠洲（托托挖井處）、沙岩城鎮與市集、叛亂軍營地、雨宴賭場、阿爾巴那王宮與鐘樓 ======== */
      const ch = (typeof CHAPTERS !== 'undefined' ? CHAPTERS : []).find(c => c.id === 'alabasta') || { npcs: [], steps: [] }, NP = {}; ch.npcs.forEach(n => { NP[n.id] = n.pos; });
      const st = ch.steps || [], keep = [...ch.npcs.map(n => n.pos), ...(D.L.spots || []), D.L.spawn, D.L.boss, ...st.flatMap(x => [x.start, x.goal].filter(Boolean)), ...st.flatMap(x => x.spots || []), ...st.flatMap(x => (x.guards || []).flatMap(g => g.path))];
      const free = (x, z, c) => !onPath(x, z, c + 3.5) && keep.every(p => Math.hypot(x - p[0], z - p[1]) > c + 5) && O.every(o => Math.hypot(x - o[0], z - o[1]) > c + o[2]);
      const face = (x, z, t) => Math.atan2(t[0] - x, t[1] - z);
      const yuba = [-18, 18];
      const col = (x, y, z) => { const n = hash(x, z), rip = Math.sin(x * .55 + z * .2 + Math.sin(z * .1) * 3) * .5 + .5;
        if (y < -.2) return mix('#3a8fb0', '#4aa0c0', n); if (Math.hypot(x - yuba[0], z - yuba[1]) < 10) return mix('#b8955e', '#c9a46c', n);
        let c = mix('#dcb878', '#ebcc8e', rip * .55 + n * .3); if (y < .9) c = mix(c, '#e6d4a6', .5); if (onPath(x, z, 3)) c = mix(c, '#c7a46a', .55); return c; };
      b.terrain(210, 90, H, col);
      /* --- 尤巴：乾涸的綠洲、枯掉的椰子樹、托托挖井的井架與水桶 --- */
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, x = yuba[0] + Math.cos(a) * 12.5, z = yuba[1] + Math.sin(a) * 10.5; if (!free(x, z, .8)) continue; const y = H(x, z); b.cyl(x, y - .2, z, .32, .22, 5, 6, '#8a6a44', null, 0, [Math.cos(a) * .6, Math.sin(a) * .6]); [0, 1, 2].forEach(k => b.box(x + Math.cos(a + k * 2) * .9, y + 5, z + Math.sin(a + k * 2) * .9, 2.2, .1, .4, '#9a8a5a', a + k * 2)); O.push([x, z, 1]); }
      { const t = NP.toto || [-18, 30], x = t[0] + 3, z = t[1] - 4; if (free(x, z, 1.6)) { const y = H(x, z); b.cyl(x, y - .6, z, 1.6, 1.7, .9, 14, '#a99070', '#4a3a28'); [-1.3, 1.3].forEach(k => b.box(x + k, y - .1, z, .18, 3, .18, '#6b4a2f')); b.box(x, y + 2.8, z, 3, .2, .2, '#6b4a2f'); b.cyl(x, y + 1.4, z, .3, .3, .45, 8, '#8a6a44'); b.box(x + 2.3, y - .1, z + .4, .12, 1.6, .12, '#6b4a2f', .3); b.box(x + 2.3, y + .1, z + .4, .5, .3, .08, '#9aa0a6', .3); O.push([x, z, 2]); } }
      /* --- 港口（出生點附近）：碼頭與停靠的船 --- */
      { const [sx, sz] = D.L.spawn; for (let i = 0; i < 8; i++) b.box(sx - 14 - i * 2, -.15, sz + 6, 2, .3, 3.4, mix('#9a7045', '#b08050', hash(i, 1))); P.ship(b, sx - 30, 0, sz + 14, 1.2, 1, '#f4ecd8'); }
      /* --- 沙岩城鎮：圓頂、拱門、遮陽布、水甕、市集攤位 --- */
      const awn = ['#c8322b', '#3f6fa3', '#e0a83a', '#4a8a5a', '#8a3a8a'];
      const house = (x, z, k) => { const y = H(x, z), w = 6 + r() * 2, d = 5.5 + r() * 2, h = 4.2 + r() * 2.2, ry = (r() - .5) * .5, wall = mix('#e8d2a6', '#f0dcb4', r());
        b.box(x, y - .6, z, w, h + .6, d, wall, ry); b.box(x, y + h, z, w + .3, .35, d + .3, shade(wall, .9), ry);
        if (r() < .6) b.sphere(x, y + h + .2, z, Math.min(w, d) * .38, 10, mix('#f4e4c0', '#e8c890', r()), .75); else for (let q = 0; q < 6; q++) b.box(x - w / 2 + .5 + q * (w - 1) / 5, y + h + .3, z + d / 2 - .1, .4, .5, .3, shade(wall, .92), ry);
        const c = Math.cos(ry), s2 = Math.sin(ry), L = (lx, lz) => [x + lx * c + lz * s2, z - lx * s2 + lz * c]; { const [ax, az] = L(0, d / 2 + .05); b.box(ax, y - .2, az, 1.4, 2.6, .2, '#5a3a24', ry); } { const [ax, az] = L(0, d / 2 + .9); b.box(ax, y + 2.7, az, 2.6, .08, 1.6, awn[k % 5], ry); }
        [-1, 1].forEach(q => { const [wx, wz] = L(q * w * .32, d / 2 + .05); b.box(wx, y + h * .55, wz, .7, 1, .12, '#2c3e58', ry); }); const [jx, jz] = L(w / 2 + .5, d / 2 - .4); b.cyl(jx, y - .1, jz, .35, .45, .9, 8, '#b06a3a'); O.push([x, z, Math.max(w, d) * .62]); };
      { const cand = [[0, 52], [-12, 60], [24, 50], [36, 42], [-30, 40], [-36, 56], [6, 26], [-6, 36], [20, 60], [-44, 52]]; let k = 0; cand.forEach(([x, z]) => { if (free(x, z, 4.2) && H(x, z) > .8) { house(x, z, k); k++; } }); }
      /* 市集攤位 */ for (let i = 0; i < 6; i++) { const x = -8 + i * 4.2, z = 44 + (i % 2) * 3; if (!free(x, z, 1.6)) continue; const y = H(x, z); [-1, 1].forEach(q => [-1, 1].forEach(w2 => b.box(x + q * 1.3, y - .2, z + w2 * .9, .12, 2.6, .12, '#6b4a2f'))); b.box(x, y + 2.4, z, 3, .1, 2.2, awn[i % 5]); b.box(x, y + .7, z, 2.6, .25, 1.6, '#9a7045'); for (let f = 0; f < 4; f++) b.sphere(x - .9 + f * .6, y + 1.05, z, .25, 6, ['#ff8a3a', '#ffd34a', '#8ac850', '#c8322b'][(f + i) % 4], .8); O.push([x, z, 1.8]); }
      /* --- 叛亂軍營地（寇沙附近）：帳篷、營火、旗幟、武器架 --- */
      { const t = NP.koza || [26, 12]; [[10, 14], [16, 6], [4, 20], [-4, 12]].forEach(([dx, dz], i) => { const x = t[0] + dx, z = t[1] + dz; if (!free(x, z, 2.6)) return; const y = H(x, z), ry = face(x, z, t); b.cyl(x, y - .2, z, 2.6, 0, 3.2, 6, mix('#d8c49a', '#c8a878', i / 4), null, ry); b.box(x, y + 3, z, .1, 1.6, .1, '#6b4a2f'); b.box(x + .5, y + 4.2, z, 1, .6, .05, '#c8322b'); O.push([x, z, 2.8]); });
        const fx = t[0] + 4, fz = t[1] + 6; if (free(fx, fz, 1)) { const y = H(fx, fz); for (let q = 0; q < 7; q++) { const a = q / 7 * 6.28; b.sphere(fx + Math.cos(a) * .9, y, fz + Math.sin(a) * .9, .3, 5, '#7a6a5a', .6); } b.cyl(fx, y - .1, fz, .5, 0, 1.1, 6, '#ff9a3a'); b.cyl(fx, y - .1, fz, .3, 0, 1.5, 6, '#ffd36a'); O.push([fx, fz, 1.2]); } }
      /* --- 雨宴賭場（潛入目標）：金字塔型建築、屋頂的巨大鱷魚、湖 --- */
      { const g = (st.find(x => x.type === 'stealth') || {}).goal || [42, -26]; const cands = []; for (let dd = 12; dd <= 24; dd += 3) for (let k3 = 0; k3 < 16; k3++) { const a3 = k3 / 16 * 6.283; cands.push([g[0] + Math.cos(a3) * dd, g[1] + Math.sin(a3) * dd]); } const c = cands.find(([x, z]) => free(x, z, 5.5) && H(x, z) > 1);
        if (c) { const [x, z] = c, y = H(x, z) - .5, ry = face(x, z, g); for (let k2 = 0; k2 < 4; k2++) b.box(x, y + k2 * 2.6, z, 14 - k2 * 3, 2.8, 12 - k2 * 2.6, k2 % 2 ? '#e8c890' : '#d8b070', ry);
          const c2 = Math.cos(ry), s2 = Math.sin(ry); b.box(x, y + 10.4, z, 4.4, 1, 1.4, '#4a8a4a', ry); b.box(x + s2 * 2.6, y + 10.6, z + c2 * 2.6, 1.6, .9, 2, '#4a8a4a', ry); b.box(x - s2 * 2.8, y + 10.5, z - c2 * 2.8, .6, .5, 3, '#3a7a3a', ry); b.sphere(x + s2 * 3.2 - c2 * .4, y + 11.2, z + c2 * 3.2 + s2 * .4, .2, 5, '#ffe060');
          b.box(x + s2 * 6.1, y - .1, z + c2 * 6.1, 3, 3, .3, '#3a2a1a', ry); b.box(x + s2 * 6.2, y + 3.4, z + c2 * 6.2, 5, 1, .2, '#ffd34a', ry); O.push([x, z, 7.5]); } }
      /* --- 阿爾巴那王宮與鐘樓：在 BOSS 決戰場後方 --- */
      { const [bx, bz] = D.L.boss, d = Math.hypot(bx, bz) || 1, ux = bx / d, uz = bz / d; const pc = [[bx + ux * 22, bz + uz * 22], [bx + ux * 18 - uz * 10, bz + uz * 18 + ux * 10], [bx - uz * 22, bz + ux * 22]].find(([x, z]) => H(x, z) > 1 && O.every(o => Math.hypot(x - o[0], z - o[1]) > 8 + o[2]));
        if (pc) { const [x, z] = pc, y = H(x, z) - .6, ry = Math.atan2(bx - x, bz - z), sand = '#ecd6a8', dm = '#e8c070', c2 = Math.cos(ry), s2 = Math.sin(ry), L = (lx, lz) => [x + lx * c2 + lz * s2, z - lx * s2 + lz * c2];
          b.box(x, y, z, 26, 3.2, 16, shade(sand, .9), ry); b.box(x, y + 3.2, z, 18, 7, 11, sand, ry); b.box(x, y + 10.2, z, 13, 1, 8, shade(sand, .92), ry); b.sphere(x, y + 11.2, z, 4.6, 14, '#f4e4c0', .9); b.cyl(x, y + 15.2, z, .5, 0, 3, 8, dm);
          [[-11, -6], [11, -6], [-11, 6], [11, 6]].forEach(([lx, lz]) => { const [tx, tz] = L(lx, lz); b.cyl(tx, y + 3, tz, 1.5, 1.3, 9, 12, sand); b.sphere(tx, y + 12.2, tz, 1.7, 10, '#f0dcb0', 1); b.cyl(tx, y + 13.6, tz, .3, 0, 1.6, 6, dm); });
          for (let q = 0; q < 6; q++) { const [ax, az] = L(-6.5 + q * 2.6, 5.6); b.box(ax, y + 3.4, az, 1.3, 4.4, .3, '#2c3e58', ry); }
          for (let q = 0; q < 7; q++) { const [sx2, sz2] = L(0, 8.6 + q * .7); b.box(sx2, y + 2.8 - q * .45, sz2, 7, .45, .7, shade(sand, .92 + (q % 2) * .06), ry); }
          O.push([x, z, 14]);
          const [cx, cz] = L(17, -2); if (H(cx, cz) > .8 && O.every(o => Math.hypot(cx - o[0], cz - o[1]) > 3 + o[2])) { const cy = H(cx, cz) - .4; b.box(cx, cy, cz, 4, 16, 4, '#e2c898', ry); b.box(cx, cy + 16, cz, 4.6, .6, 4.6, shade(sand, .85), ry); b.cyl(cx, cy + 16.6, cz, 2.8, 0, 3.2, 4, '#c8a060', null, Math.PI / 4 + ry);
            const [fx2, fz2] = L(17, 0.05); b.cyl(fx2, cy + 12.4, fz2, 1.4, 1.4, .2, 16, '#f8f4ea', null, 0, [0, 0]); b.box(fx2, cy + 12.9, fz2, .1, 1, .1, '#2a2a2a'); O.push([cx, cz, 3]); } } }
      P.arena(b, D.L.boss[0], H(D.L.boss[0], D.L.boss[1]), D.L.boss[1], 14, '#c9a86a', 12);
      /* --- 沙漠：岩石、仙人掌、椰子樹、沙漠大魚的骨頭、外圍台地 --- */
      for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = 18 + r() * 62, x = Math.cos(a) * d, z = Math.sin(a) * d; if (bad(x, z) || !free(x, z, 1.2) || Math.hypot(x - yuba[0], z - yuba[1]) < 16) continue; const y = H(x, z); if (y < .6) continue; const k = r();
        if (k < .4) { P.rock(b, x, y, z, 1 + r() * 2.2, r, mix('#b58d5a', '#c9a06a', r())); O.push([x, z, 1.6]); } else if (k < .75) { b.cyl(x, y - .2, z, .5, .45, 3 + r() * 2, 7, '#5d8a3a'); b.cyl(x + .9, y + 1.4, z, .3, .3, 1.4, 6, '#5d8a3a', null, 0, [.3, 0]); b.cyl(x - .8, y + 1.9, z, .28, .28, 1.1, 6, '#5d8a3a', null, 0, [-.3, 0]); O.push([x, z, .9]); } else if (y < 2.2) { P.palm(b, x, y, z, .9 + r() * .3, r); O.push([x, z, 1.1]); } }
      { for (let t2 = 0; t2 < 40; t2++) { const x = -40 + r() * 20, z = -40 + r() * 20; if (!free(x, z, 4)) continue; const y = H(x, z); for (let k = 0; k < 7; k++) b.cyl(x + (k - 3) * 1.4, y - .5, z, .25, .12, 3 - Math.abs(k - 3) * .3, 5, '#efe6d4', null, 0, [0, .9]); b.box(x, y - .2, z, 9.5, .5, .6, '#efe6d4'); b.sphere(x + 5.6, y + .6, z, 1.3, 8, '#efe6d4', .7); O.push([x, z, 5]); break; } }
      for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, x = Math.cos(a) * 94, z = Math.sin(a) * 94; b.box(x, -2, z, 16 + r() * 8, 10 + r() * 12, 12 + r() * 6, mix('#b58450', '#c79a62', r()), a); }
    },
    _alabastaOld(b, H, r, O, D) { /* 舊版沙漠城鎮：德雷斯羅薩仍沿用 */
      const col = (x, y, z) => { const n = hash(x, z); if (y < -.2) return mix('#3a8fb0', '#4aa0c0', n); if (y < .6 && Math.hypot(x + 18, z - 18) < 16) return mix('#6a9a45', '#7fae52', n); return mix('#d8b370', '#e7c887', n * .8 + Math.sin(x * .2) * .1); };
      b.terrain(200, 70, H, col);
      // 綠洲
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, x = -18 + Math.cos(a) * 12, z = 18 + Math.sin(a) * 10; P.palm(b, x, H(x, z), z, 1, r); O.push([x, z, 1.1]); }
      // 城鎮
      [[20, 40], [30, 26], [-30, 44], [34, 50], [-40, 30]].forEach(([x, z], i) => { const y = H(x, z); b.box(x, y - .4, z, 6, 4.4, 6, '#e8d2a6', i * .4); b.sphere(x, y + 4, z, 2.6, 8, '#f3e3c0', .7); O.push([x, z, 4.3]); });
      // 王宮
      const py = H(0, -80); b.box(0, py - 1, -84, 44, 12, 14, '#ecd9b0'); b.box(0, py + 11, -84, 20, 6, 10, '#f3e4c4');
      [-18, -9, 0, 9, 18].forEach((x, i) => { b.sphere(x, py + (i === 2 ? 17 : 11), -84, i === 2 ? 5 : 3, 9, '#f6e8c8', .8); });
      [-24, 24].forEach(x => { b.cyl(x, py - 1, -80, 2.4, 2, 22, 8, '#e7d3a8'); b.sphere(x, py + 21.5, -80, 2.6, 8, '#d9b35c', 1); });
      for (let x = -40; x <= 40; x += 8) O.push([x, -80, 6]);
      P.arena(b, D.L.boss[0], H(D.L.boss[0], D.L.boss[1]), D.L.boss[1], 14, '#c9a86a', 12);
      // 岩石、仙人掌
      for (let i = 0; i < 46; i++) { const a = r() * Math.PI * 2, d = 20 + r() * 60, x = Math.cos(a) * d, z = Math.sin(a) * d; if (bad(x, z) || Math.hypot(x + 18, z - 18) < 18 || Math.hypot(x, z + 60) < 18 || Math.abs(x) < 6 || z < -70) continue; const y = H(x, z); if (r() < .5) { P.rock(b, x, y, z, 1 + r() * 2.2, r, mix('#b58d5a', '#c9a06a', r())); O.push([x, z, 1.6]); } else { b.cyl(x, y - .2, z, .5, .45, 3 + r() * 2, 6, '#5d8a3a'); b.cyl(x + .9, y + 1.4, z, .3, .3, 1.4, 5, '#5d8a3a'); O.push([x, z, .9]); } }
      // 外圍台地
      for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, x = Math.cos(a) * 92, z = Math.sin(a) * 92; b.box(x, -2, z, 16 + r() * 8, 10 + r() * 10, 12 + r() * 6, mix('#b58450', '#c79a62', r()), a); }
    },
    skypiea(b, H, r, O, D) {
      /* ======== 空島（正式版，立體地圖）：可以進去的兩層雲屋、可以爬上去的黃金鐘塔、越過雲海的橋與要跳躍的雲朵踏腳石、香朵拉遺跡高台與斷橋 ======== */
      const K2 = D.K, ch = (typeof CHAPTERS !== 'undefined' ? CHAPTERS : []).find(c => c.id === 'skypiea') || { npcs: [], steps: [] }, st = ch.steps || [];
      const keep = [...ch.npcs.map(n => n.pos), ...(D.L.spots || []), D.L.spawn, D.L.boss, ...st.flatMap(x => [x.start, x.goal, x.pos].filter(Boolean)), ...st.flatMap(x => x.spots || [])];
      const free = (x, z, c) => !onPath(x, z, c + 3.5) && keep.every(p => Math.hypot(x - p[0], z - p[1]) > c + 5) && O.every(o => Math.hypot(x - o[0], z - o[1]) > c + o[2]) && (D.ST.plats.every(p => x + c < p.x0 - 2 || x - c > p.x1 + 2 || z + c < p.z0 - 2 || z - c > p.z1 + 2));
      const flat = (x, z, c) => { let lo = 99, hi = -99; for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283, h = H(x + Math.cos(a) * c, z + Math.sin(a) * c); lo = Math.min(lo, h); hi = Math.max(hi, h); } return hi - lo < 1.6 && lo > 1; };
      const find = (c, rs, test) => { for (const R of rs) for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283 + R * .1, x = Math.round(Math.cos(a) * R), z = Math.round(Math.sin(a) * R); if (free(x, z, c) && (!test || test(x, z))) return [x, z]; } return null; };
      const col = (x, y, z) => { const n = hash(x, z); if (y < 1) return mix('#f4f8ff', '#ffffff', n); if (Math.hypot(x - D.L.boss[0], z - D.L.boss[1]) < 18) return mix('#e8d6a0', '#f0e2b4', n); return mix('#8fd07a', '#a7dd8a', n * .7 + Math.sin(x * .15 + z * .1) * .15); };
      b.terrain(200, 80, H, col);
      const cloud = (x, y, z, w, d) => { for (let k = 0; k < Math.max(3, Math.round(w * d / 10)); k++) b.sphere(x + (hash(k, x) - .5) * w * .9, y - .6 - hash(z, k) * .6, z + (hash(x, k) - .5) * d * .9, 1.2 + hash(k, z) * 1.4, 8, '#ffffff', .6, .1, k); };
      /* --- 巨大豆莖（裝飾） --- */
      { let x = -52, z = -40, y = H(x, z) - 1; for (let i = 0; i < 22; i++) { const a = i * .55, dx = Math.cos(a) * .9, dz = Math.sin(a) * .9; b.cyl(x, y, z, 2.6 - i * .05, 2.5 - i * .05, 4, 8, i % 2 ? '#4f9a3a' : '#5aa844', null, 0, [dx, dz]); x += dx; z += dz; y += 4; if (i % 4 === 2) b.sphere(x + 3, y, z, 2.2, 8, '#6cbc50', .5); } O.push([-52, -40, 4]); }
      /* --- 兩層雲屋（可以走進去、上二樓） --- */
      for (let n = 0, tries = [22, 30, 38, 46]; n < 2; n++) { const c = find(4.8, tries, (x, z) => z > -10 && flat(x, z, 5)); if (!c) break; const [x, z] = c, y = H(x, z); const door = Math.abs(x) > Math.abs(z) ? (x > 0 ? 'x-' : 'x+') : (z > 0 ? 'z-' : 'z+'); K2.house2(b, x, z, 8, 7, y, n ? '#f0e2c8' : '#e8eef8', n ? '#e0b84a' : '#5a8ad0', door); O.push([x, z, .01]); cloud(x, y + .3, z, 9, 8); }
      /* --- 黃金鐘塔：繞著塔外的樓梯一路爬到頂端 --- */
      { const c = find(7.5, [34, 42, 50, 26], (x, z) => flat(x, z, 7)); if (c) { const [cx, cz] = c, y0 = H(cx, cz), rise = 2.6, stone = '#e8dcc0';
          b.box(cx, y0 - .5, cz, 6, 6 * rise + .6, 6, '#d8ccb0'); D.ST.walls.push({ x0: cx - 3, x1: cx + 3, z0: cz - 3, z1: cz + 3, y0: y0 - 1, y1: y0 + 6 * rise });
          const C = [[1, 1], [-1, 1], [-1, -1], [1, -1]], cr = (k, lv) => { const [sx, sz] = C[k % 4]; K2.slab(b, cx + sx * 3, cz + sz * 3, cx + sx * 5, cz + sz * 5, y0 + lv * rise + .05, stone, .5); };
          cr(0, 0); for (let f = 0; f < 6; f++) { const k = f % 4, lv = f, [ax2, az2] = C[k], [bx2, bz2] = C[(k + 1) % 4], yA = y0 + lv * rise + .05, yB = y0 + (lv + 1) * rise + .05;
            if (az2 === bz2) K2.stairs(b, cx + ax2 * 3, cz + az2 * 3, cx + bx2 * 3, cz + az2 * 5, yA, yB, 'x', stone, y0 - .5); else K2.stairs(b, cx + ax2 * 3, cz + az2 * 3, cx + ax2 * 5, cz + bz2 * 3, yA, yB, 'z', stone, y0 - .5); cr(k + 1, lv + 1); }
          const top = y0 + 6 * rise + .05; K2.slab(b, cx - 5, cz - 5, cx + 5, cz + 5, top + .02, '#d8c8a8', .4, '#f0e2b4'); [[-4, -4], [4, -4], [-4, 4], [4, 4]].forEach(([dx, dz]) => { b.cyl(cx + dx, top, cz + dz, .4, .4, 5, 10, '#f4ead4'); D.ST.walls.push({ x0: cx + dx - .4, x1: cx + dx + .4, z0: cz + dz - .4, z1: cz + dz + .4, y0: top, y1: top + 5 }); });
          b.box(cx, top + 5, cz, 10, .6, 10, '#e8dcc0'); b.cyl(cx, top + 1.6, cz, 2.2, 1.1, 3.2, 16, '#ffd34a', '#ffe48a'); b.cyl(cx, top + 1.3, cz, 2.4, 2.4, .35, 16, '#e8b830'); b.cyl(cx, top + 5.6, cz, 6, 0, 2.6, 4, '#d9b35c', null, Math.PI / 4);
          O.push([cx, cz, .01]); } }
      /* --- 越過雲海的橋與雲朵踏腳石 --- */
      { let done = false; for (let k = 0; k < 16 && !done; k++) { const ang = k / 16 * 6.283, ux = Math.cos(ang), uz = Math.sin(ang), ax = Math.abs(ux) > Math.abs(uz) ? 'x' : 'z', dx = ax === 'x' ? Math.sign(ux) : 0, dz = ax === 'z' ? Math.sign(uz) : 0;
          for (let R = 66; R > 40 && !done; R -= 2) { const px = Math.round(ux * R), pz = Math.round(uz * R); if (H(px, pz) < 1.4 || !free(px, pz, 4) || !flat(px, pz, 3)) continue; const qx = px + dx * 20, qz = pz + dz * 20; if (H(qx, qz) > -.5 || H(px + dx * 8, pz + dz * 8) > -.2) continue;
            const y = H(px, pz) + 2.5; K2.slab(b, px - 3, pz - 3, px + 3, pz + 3, y, '#f4f8ff', 2.8, '#ffffff'); cloud(px, y, pz, 6, 6);
            const sx = px - dx * 3 - (dx ? 0 : 1), sz2 = pz - dz * 3 - (dz ? 0 : 1); if (ax === 'x') K2.stairs(b, px - 1, pz + 3, px + 1, pz + 8, y, H(px, pz + 8), 'z', '#f4f8ff'); else K2.stairs(b, px + 3, pz - 1, px + 8, pz + 1, y, H(px + 8, pz), 'x', '#f4f8ff');
            const ex = px + dx * 16, ez = pz + dz * 16; K2.bridge(b, px + dx * 3, pz + dz * 3, ex - dx * 4, ez - dz * 4, y, 2.4, '#c8a878', '#8a6a44');
            K2.slab(b, ex - 4, ez - 4, ex + 4, ez + 4, y, '#f4f8ff', 1.6, '#ffffff'); cloud(ex, y, ez, 8, 8); b.cyl(ex, y, ez, .6, .5, 3.4, 10, '#e8c26a'); b.sphere(ex, y + 3.8, ez, .9, 10, '#ffd34a');
            /* 踏腳石：每顆高 1.2、間隔要用跳的 */ let sx2 = ex + dx * 6 + (ax === 'z' ? 3 : 0), sz3 = ez + dz * 6 + (ax === 'x' ? 3 : 0), sy = y; for (let q = 0; q < 4; q++) { sy += 1.2; K2.slab(b, sx2 - 1.1, sz3 - 1.1, sx2 + 1.1, sz3 + 1.1, sy, '#ffffff', .8); cloud(sx2, sy, sz3, 2, 2); sx2 += dx * 3.2 + (ax === 'z' ? 1.4 : 0); sz3 += dz * 3.2 + (ax === 'x' ? 1.4 : 0); }
            K2.slab(b, sx2 - 3, sz3 - 3, sx2 + 3, sz3 + 3, sy + 1.2, '#ffffff', 1.2, '#f8fbff'); cloud(sx2, sy + 1.2, sz3, 6, 6); P.chest && P.chest(b, sx2, sy + 1.2, sz3); b.box(sx2, sy + 1.2, sz3, 1.2, .9, .8, '#c9973a'); b.box(sx2, sy + 2.1, sz3, 1.3, .3, .9, '#e8b84a');
            done = true; } } }
      /* --- 香朵拉遺跡：兩座高台，中間是要跳過去的斷橋 --- */
      { const c = find(9, [30, 40, 50, 22], (x, z) => z < 10 && flat(x, z, 9)); if (c) { const [x, z] = c, y = H(x, z) + 2.4, gold = '#d9b35c';
          K2.slab(b, x - 9, z - 4, x - 1, z + 4, y, '#c9b27e', 2.8, '#e2c98e'); K2.slab(b, x + 2.2, z - 4, x + 9, z + 4, y + .6, '#c9b27e', 3.4, '#e2c98e');
          K2.stairs(b, x - 9, z - 1.5, x - 13, z + 1.5, y, H(x - 13, z), 'x', '#c9b27e'); K2.stairs(b, x + 9, z - 1.5, x + 13, z + 1.5, y + .6, H(x + 13, z), 'x', '#c9b27e');
          b.box(x - .4, y - .4, z, 1.2, .4, 2.2, '#a8925e', .2); b.box(x + 1.6, y + .1, z, .9, .4, 2.2, '#a8925e', -.3);
          [[-7, -3], [-3, -3], [-7, 3], [-3, 3], [4, -3], [8, -3], [4, 3], [8, 3]].forEach(([dx, dz], i) => { const h = 3 + (i % 3) * 1.6, yy = dx < 0 ? y : y + .6; b.cyl(x + dx, yy, z + dz, .55, .5, h, 10, gold, '#f0d27a'); D.ST.walls.push({ x0: x + dx - .55, x1: x + dx + .55, z0: z + dz - .55, z1: z + dz + .55, y0: yy, y1: yy + h }); });
          b.box(x + 5.5, y + .6, z, 4, .5, 2, '#e2c26c'); O.push([x, z, .01]); } }
      /* --- 神之社（BOSS） --- */
      { const [gx, gz] = D.L.boss, gy = H(gx, gz); P.arena(b, gx, gy, gz, 14, '#f0e2b4', 14); b.box(gx - 7, gy, gz - 14, 1.3, 11, 1.3, '#c8322b'); b.box(gx + 7, gy, gz - 14, 1.3, 11, 1.3, '#c8322b'); b.box(gx, gy + 10, gz - 14, 19, 1.2, 1.6, '#c8322b'); b.box(gx, gy + 8, gz - 14, 16, .8, 1.2, '#1c1c22'); }
      /* --- 雲朵、樹木、雲貝 --- */
      for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = 20 + r() * 58, px = Math.cos(a) * d, pz = Math.sin(a) * d; if (bad(px, pz) || !free(px, pz, 1.4)) continue; const py = H(px, pz); if (py < 1.2) { if (r() < .3) cloud(px, py + 1, pz, 3, 3); continue; } if (r() < .65) { P.tree(b, px, py, pz, .8 + r() * .5, r, mix('#6cbc50', '#8ad05a', r())); O.push([px, pz, 1.4]); } else { b.sphere(px, py + .2, pz, .6, 8, mix('#ffd0e0', '#d0e8ff', r()), .7); } }
      for (let i = 0; i < 14; i++) { const a = r() * 6.28, d = 90 + r() * 30; cloud(Math.cos(a) * d, 4 + r() * 10, Math.sin(a) * d, 10, 10); }
    },
    _skypieaOld(b, H, r, O, D) { /* 舊版雲島：蛋糕島仍沿用 */
      const col = (x, y, z) => { const n = hash(x, z); if (y < 1) return mix('#f4f8ff', '#ffffff', n); if (Math.hypot(x, z + 60) < 16) return mix('#e8d6a0', '#f0e2b4', n); return mix('#8fd07a', '#a7dd8a', n); };
      b.terrain(200, 70, H, col);
      // 巨大豆莖
      let x = -46, z = -44, y = H(x, z) - 1;
      for (let i = 0; i < 22; i++) { const a = i * .55; const dx = Math.cos(a) * .9, dz = Math.sin(a) * .9; b.cyl(x, y, z, 2.6 - i * .05, 2.5 - i * .05, 4, 7, i % 2 ? '#4f9a3a' : '#5aa844', null, 0, [dx, dz]); x += dx; z += dz; y += 4; if (i % 4 === 2) b.sphere(x + 3, y, z, 2.2, 6, '#6cbc50', .5); }
      O.push([-46, -44, 4]);
      // 黃金遺跡
      [[34, -30], [42, -18], [26, -42], [-30, 10], [36, 10]].forEach(([px, pz], i) => { const py = H(px, pz); b.cyl(px, py - .3, pz, 1.1, 1, 5 + (i % 3) * 2, 8, '#d9b35c', '#f0d27a'); O.push([px, pz, 1.4]); });
      b.box(38, H(38, -24) - .3, -24, 10, .8, 4, '#e2c26c', .4);
      // 神之社
      const gy = H(0, -62); P.arena(b, 0, gy, -62, 14, '#f0e2b4', 14);
      b.box(-7, gy, -76, 1.3, 11, 1.3, '#c8322b'); b.box(7, gy, -76, 1.3, 11, 1.3, '#c8322b'); b.box(0, gy + 10, -76, 19, 1.2, 1.6, '#c8322b'); b.box(0, gy + 8, -76, 16, .8, 1.2, '#1c1c22');
      // 房屋（雲朵屋）
      [[-24, 34], [26, 40], [-34, 44], [14, 26]].forEach(([px, pz]) => { const py = H(px, pz); b.sphere(px, py + 1.6, pz, 3.4, 9, '#ffffff', .85, .08, 7); b.box(px, py - .2, pz + 3, 1.3, 2, .4, '#8ab4d8'); O.push([px, pz, 3.6]); });
      for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, d = 22 + r() * 54, px = Math.cos(a) * d, pz = Math.sin(a) * d; if (bad(px, pz) || Math.hypot(px, pz + 62) < 18 || Math.abs(px) < 6 || Math.hypot(px + 46, pz + 44) < 8) continue; const py = H(px, pz); if (py < 1.2) continue; if (r() < .6) { P.tree(b, px, py, pz, .7 + r() * .5, r, mix('#9ad07a', '#c2e59a', r())); O.push([px, pz, 1.2]); } else b.sphere(px, py + .6, pz, 1.4 + r(), 7, '#ffffff', .6, .1, i + 3); }
      D.clouds = []; for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, d = 90 + r() * 70; D.clouds.push([Math.cos(a) * d, -2 + r() * 14, Math.sin(a) * d, 4 + r() * 6, r() * 6]); }
    },
    dark(b, H, r, O, D) {
      // 蜂巢島：黑鬍子海賊團的海賊島（暮色、骷髏山、海賊城鎮、港口）
      const col = (x, y, z) => { const n = hash(x, z); if (y < .9) return mix('#3a3230', '#4a3e38', n); if (y > 3.6) return mix('#7a5a40', '#8a6a4a', n); return mix('#6b4a32', '#7d583c', n * .9); };
      b.terrain(200, 70, H, col);
      // 骷髏山
      const sy = H(0, -100) - 6; b.sphere(0, sy + 34, -104, 34, 12, '#d8cdb8', .95, .06, 11); b.box(0, sy - 2, -104, 44, 20, 40, '#c8bca6', 0, .85);
      b.sphere(-12, sy + 36, -76, 8, 8, '#1b1614', 1.1); b.sphere(12, sy + 36, -76, 8, 8, '#1b1614', 1.1); b.cyl(0, sy + 22, -74, 3.5, 0, 7, 3, '#1b1614', null, Math.PI);
      for (let k = -4; k <= 4; k++) b.box(k * 4, sy + 10, -72, 3, 5, 3, '#efe6d2');
      for (let x = -30; x <= 30; x += 10) O.push([x, -98, 12]);
      P.arena(b, D.L.boss[0], H(D.L.boss[0], D.L.boss[1]), D.L.boss[1], 14, '#5a4a40', 12);
      // 黑鬍子海賊旗
      const flag = (x, z, h) => { const y = H(x, z); b.cyl(x, y - .3, z, .18, .15, h, 5, '#3a2a1a'); b.box(x + 2, y + h - 2.6, z, 4, 2.6, .12, '#141414'); [-1, 0, 1].forEach(k => b.sphere(x + 2 + k * 1.1, y + h - 1.4, z + .1, .38, 6, '#efe6d2')); };
      [[-12, -46, 9], [12, -46, 9], [-30, 30, 8], [30, 32, 8], [48, 10, 10]].forEach(([x, z, h]) => flag(x, z, h));
      // 海賊城鎮（拼湊的木屋）
      [[-22, 30, .2], [-32, 16, -.3], [22, 22, .4], [34, 40, -.2], [-40, 38, .6], [16, 6, 0], [-18, 4, .3], [40, -6, -.4]].forEach(([x, z, a], i) => { P.house(b, x, H(x, z), z, 6, 5.5, 3.4, mix('#7a5a3a', '#9a7a52', r()), ['#4a2a2a', '#2f3a3a', '#5a3a1a'][i % 3], a); b.box(x + Math.sin(a) * 2.8, H(x, z) + 1.4, z + Math.cos(a) * 2.8, 1, 1.3, .06, '#efe2c0', a); O.push([x, z, 4.2]); });
      // 篝火
      [[-6, 26], [8, 14], [-26, -8], [26, -20]].forEach(([x, z]) => { const y = H(x, z); for (let k = 0; k < 4; k++) b.box(x, y - .1, z, 2.4, .35, .35, '#4a3222', k * Math.PI / 4); b.cyl(x, y + .1, z, .8, 0, 1.6, 6, '#ff7a2a'); b.cyl(x, y + .1, z, .45, 0, 2.2, 5, '#ffd26c'); O.push([x, z, 1.3]); });
      // 瞭望塔
      [[-44, -20], [44, -30], [-10, -30]].forEach(([x, z]) => { const y = H(x, z); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, c]) => b.cyl(x + a * 1.4, y - .3, z + c * 1.4, .2, .2, 8, 4, '#5a3d27')); b.box(x, y + 7.6, z, 4, .4, 4, '#6b4a2f'); b.cyl(x, y + 8, z, 3.2, 0, 2, 4, '#3a2a1a', null, Math.PI / 4); O.push([x, z, 2.4]); });
      // 港口與船（東側海賊船、南側海軍軍艦）
      for (let i = 0; i < 9; i++) { b.box(56 + i * 2.2, -.2, 18, 2.1, .35, 3.4, i % 2 ? '#6a4a30' : '#5a3d27'); b.box(56 + i * 2.2, -3, 16.5, .35, 3, .35, '#3a2a1a'); }
      P.ship(b, 76, 0, 4, 0, 1.1, '#1b1b1b'); P.ship(b, 72, 0, 34, .2, 1, '#1b1b1b'); P.ship(b, -78, 0, -10, 1.3, 1.2, '#1b1b1b');
      P.ship(b, 20, 0, 88, Math.PI / 2, 1.2, '#f4f2ea');
      // 枯木與岩石
      for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, d = 20 + r() * 58, x = Math.cos(a) * d, z = Math.sin(a) * d; if (bad(x, z) || Math.abs(x) < 6 || Math.hypot(x, z + 60) < 18 || z < -80) continue; const y = H(x, z); if (y < 1) continue; if (r() < .4) { b.cyl(x, y - .3, z, .35, .15, 4, 5, '#3a2a22', null, 0, [.6, .3]); b.cyl(x + .6, y + 3, z + .3, .12, .05, 1.8, 4, '#3a2a22', null, 0, [1, .5]); O.push([x, z, .8]); } else { P.rock(b, x, y, z, .9 + r() * 1.6, r, mix('#5a4a40', '#7a6a5a', r())); O.push([x, z, 1.4]); } }
      [[-8, 36], [6, 38], [-14, 18], [18, 30]].forEach(([x, z], i) => i % 2 ? P.crate(b, x, H(x, z), z, 1, .4) : P.barrel(b, x, H(x, z), z));
    },
    enies(b, H, r, O, D) {
      /* ======== 司法島（正式版，立體地圖）：正門、可以進去的兩層審判所、橫越全島的瀑布深淵與吊橋、可以沿螺旋樓梯爬上去的司法之塔 ======== */
      const K2 = D.K, ch = (typeof CHAPTERS !== 'undefined' ? CHAPTERS : []).find(c => c.id === 'enies') || { npcs: [], steps: [] };
      const keep = [...ch.npcs.map(n => n.pos), ...(D.L.spots || []), D.L.spawn, D.L.boss];
      const free = (x, z, c) => !onPath(x, z, c + 3.5) && keep.every(p => Math.hypot(x - p[0], z - p[1]) > c + 5) && O.every(o => Math.hypot(x - o[0], z - o[1]) > c + o[2]) && Math.abs(z + 27) > c + 6;
      const col = (x, y, z) => { const n = hash(x, z); if (y < -1) return mix('#4a5a6a', '#5a6a78', n); if (y < .9) return mix('#9a9a92', '#aaa89e', n); if (Math.abs(x) < 7 && z < 40) return mix('#c9c3b0', '#d6d0bd', n); return mix('#7d8a6a', '#8e9a78', n); };
      b.terrain(200, 90, H, col);
      /* 正門 */ { const gy = H(0, 30); b.box(-12, gy - .5, 30, 8, 16, 6, '#e8e4dc'); b.box(12, gy - .5, 30, 8, 16, 6, '#e8e4dc'); b.box(0, gy + 14, 30, 32, 5, 6, '#d6d0c4'); b.box(0, gy + 18.5, 30, 10, 3, 6.4, '#c8322b'); [[-12, 30], [12, 30]].forEach(([x, z]) => O.push([x, z, 5])); }
      /* 瀑布深淵的岸邊護欄與吊橋 */
      { const by = Math.max(H(0, -19), H(0, -35)) + .2; K2.bridge(b, 0, -18, 0, -36, by, 5, '#8a6a44', '#5a4a3a'); [-1, 1].forEach(sd => { b.box(sd * 3.4, by - .3, -18, 1.2, 5, 1.2, '#b8b0a0'); b.box(sd * 3.4, by - .3, -36, 1.2, 5, 1.2, '#b8b0a0'); b.cyl(sd * 3.4, by + 4.6, -18, .5, 0, 1, 4, '#3a4a6a'); });
        for (let x = -60; x <= 60; x += 4) { if (Math.abs(x) < 6) continue; [-21.6, -32.4].forEach(z => { const zz = z - Math.sin(x * .08) * 1.5; if (H(x, zz) > 1) b.box(x, H(x, zz) - .2, zz, 3.6, 1, .5, '#b8b0a0'); }); } }
      /* 審判所：左右兩棟可以進去的兩層建築 */
      [[-26, -6], [26, -6]].forEach(([x, z], k) => { if (!free(x, z, 7.5)) return; K2.house2(b, x, z, 14, 12, H(x, z), '#efe9dc', '#3a4a6a', k ? 'x-' : 'x+'); O.push([x, z, .01]); });
      /* 司法之塔：在 BOSS 決戰場後方，沿外圍螺旋樓梯爬到塔頂 */
      { const [bx, bz] = D.L.boss, cx = bx, cz = bz - 24, y0 = H(cx, cz); if (y0 > 1) { const top = K2.tower(b, cx, cz, y0, 8, 2.8, '#e8e4dc', '#d8d4cc', 8 * 2.8 + 14);
          K2.slab(b, cx - 5, cz - 5, cx + 5, cz + 5, top + .02, '#c8c4b8', .4, '#e8e4dc'); b.cyl(cx, top + 14, cz, 5, 0, 8, 4, '#3a4a6a', null, Math.PI / 4); for (let i = 0; i < 4; i++) b.box(cx, y0 + 6 + i * 6, cz + 3.05, 1.6, 2.4, .2, '#8ab4d8');
          b.cyl(cx + 4.4, top, cz - 4.4, .15, .15, 7, 6, '#b8b0a0'); b.box(cx + 6, top + 5.5, cz - 4.4, 3.2, 2, .1, '#f4f2ea'); b.sphere(cx + 6, top + 5.5, cz - 4.35, .6, 8, '#3a6ad8'); O.push([cx, cz, .01]); } }
      P.arena(b, D.L.boss[0], H(D.L.boss[0], D.L.boss[1]), D.L.boss[1], 14, '#b8b0a0', 12);
      /* 城牆步道：從正門兩側的樓梯爬上去，可以沿城牆走一段 */
      [-1, 1].forEach(sd => { const x0 = sd * 20, z0 = 30, y = H(x0, z0); if (!free(x0, z0 + 2, 2)) return; K2.stairs(b, x0 - 1, z0 + 6, x0 + 1, z0 + 1, y, y + 4.5, 'z', '#d6d0c4'); K2.slab(b, x0 - 1.5, z0 - 3, x0 + 1.5, z0 + 1, y + 4.5, '#d6d0c4', 4.8, '#e8e4dc'); K2.bridge(b, x0, z0 - 1, x0 + sd * 14, z0 - 1, y + 4.5, 3, '#c8c2b4', '#8a8478'); });
      /* 樹、岩石、海軍旗 */
      for (let i = 0; i < 60; i++) { const a = r() * Math.PI * 2, d = 20 + r() * 52, x = Math.cos(a) * d, z = Math.sin(a) * d; if (bad(x, z) || !free(x, z, 1.4)) continue; const y = H(x, z); if (y < 1.2) continue; if (r() < .6) { P.pine(b, x, y, z, .8 + r() * .5); O.push([x, z, 1.4]); } else { P.rock(b, x, y, z, .8 + r() * 1.2, r); O.push([x, z, 1.2]); } }
    },
    thriller(b, H, r, O, D) {
      /* ======== 恐怖三桅帆船（正式版，立體地圖）：霧中的墓園、可以進去的霍古巴克宅邸、可以爬上去的巨大桅杆與瞭望台、空中棧道、莫利亞的城堡 ======== */
      const K2 = D.K, ch = (typeof CHAPTERS !== 'undefined' ? CHAPTERS : []).find(c => c.id === 'thriller') || { npcs: [], steps: [] }, st = ch.steps || [];
      const keep = [...ch.npcs.map(n => n.pos), ...(D.L.spots || []), D.L.spawn, D.L.boss, ...st.flatMap(x => [x.start, x.goal, x.pos].filter(Boolean)), ...st.flatMap(x => x.spots || []), ...st.flatMap(x => (x.guards || []).flatMap(g => g.path))];
      const free = (x, z, c) => !onPath(x, z, c + 3.5) && keep.every(p => Math.hypot(x - p[0], z - p[1]) > c + 5) && O.every(o => Math.hypot(x - o[0], z - o[1]) > c + o[2]) && D.ST.plats.every(p => x + c < p.x0 - 2 || x - c > p.x1 + 2 || z + c < p.z0 - 2 || z - c > p.z1 + 2);
      const find = (c, rs, test) => { for (const R of rs) for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283 + R * .13, x = Math.round(Math.cos(a) * R), z = Math.round(Math.sin(a) * R); if (free(x, z, c) && H(x, z) > 1.1 && (!test || test(x, z))) return [x, z]; } return null; };
      const col = (x, y, z) => { const n = hash(x, z); if (y < .9) return mix('#4a4a44', '#55554c', n); if (onPath(x, z, 3)) return mix('#5a4a3a', '#66553f', n); return mix('#3e4234', '#4a5038', n * .7 + Math.sin(x * .2 + z * .13) * .15); };
      b.terrain(200, 80, H, col);
      const deadTree = (x, z, s) => { const y = H(x, z); b.cyl(x, y - .3, z, .4 * s, .2 * s, 4.5 * s, 6, '#2a2420'); for (let k = 0; k < 4; k++) { const a = k * 1.7 + x; b.cyl(x, y + (2.4 + k * .5) * s, z, .14 * s, .05 * s, 2.2 * s, 5, '#2a2420', null, 0, [Math.cos(a) * 1.4 * s, Math.sin(a) * 1.4 * s]); } };
      /* --- 墓園：墓碑、十字架、枯樹 --- */
      { const c = find(10, [44, 52, 36], (x, z) => z < 20); if (c) { const [gx, gz] = c; for (let i = 0; i < 26; i++) { const x = gx + (i % 6 - 2.5) * 2.8 + (r() - .5), z = gz + Math.floor(i / 6) * 3 - 6; if (!free(x, z, .3)) continue; const y = H(x, z); if (i % 3 === 0) { b.box(x, y - .3, z, .25, 2.4, .25, '#6a6474'); b.box(x, y + 1.3, z, 1.3, .25, .25, '#6a6474'); } else { b.box(x, y - .3, z, 1.1, 1.6 + r() * .6, .35, mix('#7a7484', '#8a8494', r()), (r() - .5) * .3); } }
          deadTree(gx - 9, gz - 4, 1.3); deadTree(gx + 9, gz + 4, 1.1); O.push([gx, gz, 8]); } }
      /* --- 霍古巴克的宅邸：可以進去的兩層樓，加上尖塔 --- */
      { const c = find(8.5, [40, 30, 50], (x, z) => z > -30); if (c) { const [x, z] = c, y = H(x, z); K2.house2(b, x, z, 15, 12, y, '#5a4a6a', '#241c30', Math.abs(x) > Math.abs(z) ? (x > 0 ? 'x-' : 'x+') : (z > 0 ? 'z-' : 'z+'));
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { b.cyl(x + sx * 8, y - .3, z + sz * 6.6, 1.2, 1, 11, 10, '#4a3e5a'); b.cyl(x + sx * 8, y + 10.7, z + sz * 6.6, 1.5, 0, 4, 10, '#241c30'); D.ST.walls.push({ x0: x + sx * 8 - 1.2, x1: x + sx * 8 + 1.2, z0: z + sz * 6.6 - 1.2, z1: z + sz * 6.6 + 1.2, y0: y - 1, y1: y + 11 }); });
          for (let k = 0; k < 4; k++) b.box(x - 5 + k * 3.3, y + 1.4, z + 6.05, .9, 1.2, .12, '#ffcf6a'); O.push([x, z, .01]); } }
      /* --- 巨大桅杆：螺旋樓梯一路爬到瞭望台，旁邊有空中棧道 --- */
      { const c = find(8, [24, 30, 36, 44], (x, z) => z > -40 && z < 30); if (c) { const [cx, cz] = c, y0 = H(cx, cz); const top = K2.tower(b, cx, cz, y0, 7, 2.6, '#6a5038', '#4a3828', 7 * 2.6 + 16);
          K2.slab(b, cx - 5, cz - 5, cx + 5, cz + 5, top + .02, '#5a4230', .4, '#7a5a40'); [[-5, -5, 5, -5], [-5, 5, 5, 5], [-5, -5, -5, 5], [5, -5, 5, 5]].forEach(([a, bb, c2, d]) => K2.rail(b, cx + a, cz + bb, cx + c2, cz + d, top, '#3a2a1a'));
          b.cyl(cx, top + 16, cz, .5, .3, 14, 8, '#4a3828'); b.box(cx, top + 22, cz, 14, .4, .4, '#4a3828'); b.box(cx + 3.5, top + 13, cz + .3, 6.5, 8, .08, '#2a2a2e'); b.box(cx + 3.5, top + 17, cz + .35, 2, 2, .08, '#e8e4dc');
          for (let k = 0; k < 6; k++) b.cyl(cx + (k - 2.5) * 1.6, top + 1, cz + 5, .04, .04, 20, 4, '#8a7a5a', null, 0, [0, -.2]);
          /* 空中棧道：從桅杆中段（第 4 段樓梯頂）走出去，到一座高台 */ const midY = y0 + 4 * 2.6 + .05, dir = cx > 0 ? -1 : 1; const ex = cx + dir * 22; if (H(ex, cz - 3) > 1) { K2.bridge(b, cx + dir * 5, cz - 4, ex - dir * 3, cz - 4, midY, 2.2, '#6a5038', '#3a2a1a'); K2.slab(b, ex - 3, cz - 7, ex + 3, cz - 1, midY, '#5a4a3a', midY - H(ex, cz - 4) + .5, '#7a6048'); b.cyl(ex, midY, cz - 4, .25, .25, 3, 6, '#3a2a1a'); b.sphere(ex, midY + 3.3, cz - 4, .6, 8, '#9aff7a'); O.push([ex, cz - 4, .01]); }
          O.push([cx, cz, .01]); } }
      /* --- 莫利亞的城堡：BOSS 決戰場後方的哥德式外牆 --- */
      { const [bx0, bz0] = D.L.boss; P.arena(b, bx0, H(bx0, bz0), bz0, 14, '#5a5464', 12);
        const spotC = [[bx0, bz0 - 22], ...(D.L.lobes || []).map(l => [l[0], l[1]]), [bx0 + 26, bz0 - 2], [bx0 - 26, bz0 - 2]].find(([x, z]) => H(x, z) > 1 && H(x - 12, z) > .6 && H(x + 12, z) > .6 && keep.every(p => Math.hypot(x - p[0], z - p[1]) > 16));
        if (spotC) { const [bx, cz] = spotC, y = H(bx, cz), fz = cz + 3.1; b.box(bx, y - .5, cz, 30, 12, 6, '#3a3044'); for (let k = -2; k <= 2; k++) { b.cyl(bx + k * 7, y - .5, cz, 1.8, 1.5, 16 - Math.abs(k) * 2, 10, '#2e263a'); b.cyl(bx + k * 7, y + 15.5 - Math.abs(k) * 2, cz, 2.2, 0, 5, 10, '#1a1424'); }
          for (let k = 0; k < 6; k++) b.box(bx - 10 + k * 4, y + 6, fz, 1, 2.2, .12, '#9aff7a'); b.sphere(bx, y + 13, fz + .1, 2.4, 12, '#e8e4dc', .5); D.ST.walls.push({ x0: bx - 15, x1: bx + 15, z0: cz - 3, z1: cz + 3, y0: y - 1, y1: y + 12 }); O.push([bx, cz, .01]); } }
      /* --- 霧中的枯樹與南瓜燈 --- */
      for (let i = 0; i < 46; i++) { const a = r() * Math.PI * 2, d = 18 + r() * 56, x = Math.cos(a) * d, z = Math.sin(a) * d; if (bad(x, z) || !free(x, z, 1.4) || H(x, z) < 1.1) continue; if (r() < .6) { deadTree(x, z, .8 + r() * .6); O.push([x, z, 1.2]); } else { const y = H(x, z); b.sphere(x, y + .3, z, .7, 8, '#e07a2a', .75); b.box(x, y + .8, z, .12, .3, .12, '#3a5a2a'); } }
    },
    marineford(b, H, r, O, D) {
      /* ======== 頂上戰爭（正式版，立體地圖）：歐利斯廣場與可以爬上去的處刑台、海軍本部（外樓梯通往屋頂）、包圍壁、被青雉凍住的海灣與白鬍子的莫比迪克號 ======== */
      const K2 = D.K, ch = (typeof CHAPTERS !== 'undefined' ? CHAPTERS : []).find(c => c.id === 'marineford') || { npcs: [], steps: [] };
      const keep = [...ch.npcs.map(n => n.pos), ...(D.L.spots || []), D.L.spawn, D.L.boss];
      const free = (x, z, c) => !onPath(x, z, c + 3.5) && keep.every(p => Math.hypot(x - p[0], z - p[1]) > c + 5) && O.every(o => Math.hypot(x - o[0], z - o[1]) > c + o[2]) && D.ST.plats.every(p => x + c < p.x0 - 2 || x - c > p.x1 + 2 || z + c < p.z0 - 2 || z - c > p.z1 + 2);
      const col = (x, y, z) => { const n = hash(x, z); if (y < .9) return mix('#b8c8d0', '#c8d6de', n); if (Math.abs(x) < 26 && z < -16 && z > -54) return mix('#c9c3b6', '#d4cfc2', n); if (onPath(x, z, 3)) return mix('#bdb6a8', '#c8c1b2', n); return mix('#8a8680', '#96928a', n); };
      b.terrain(200, 80, H, col);
      const stone = '#e8e4dc', navy = '#3a5a9a';
      /* --- 歐利斯廣場的處刑台：外圍螺旋樓梯爬上去 --- */
      { const [bx, bz] = D.L.boss, pc = [[bx, bz - 22], [-15, -40], [15, -42], [-16, -30]].find(([x, z]) => H(x, z) > 1 && free(x, z, 5.5)) || [bx, bz - 22], cx = pc[0], cz = pc[1], y0 = H(cx, cz); if (y0 > 1) { const top = K2.tower(b, cx, cz, y0, 6, 2.6, '#b8b0a4', '#a8a094', 6 * 2.6);
          K2.slab(b, cx - 5, cz - 5, cx + 5, cz + 5, top + .02, '#8a8478', .5, '#a8a094'); [[-5, -5, 5, -5], [-5, 5, 5, 5], [-5, -5, -5, 5], [5, -5, 5, 5]].forEach(([a, c, e, f]) => K2.rail(b, cx + a, cz + c, cx + e, cz + f, top, '#5a5048'));
          [-3.4, 3.4].forEach(dx => { b.box(cx + dx, top, cz - 3, .5, 6, .5, '#5a5048'); D.ST.walls.push({ x0: cx + dx - .3, x1: cx + dx + .3, z0: cz - 3.3, z1: cz - 2.7, y0: top, y1: top + 6 }); }); b.box(cx, top + 5.8, cz - 3, 7.4, .5, .5, '#5a5048'); O.push([cx, cz, .01]); } }
      P.arena(b, D.L.boss[0], H(D.L.boss[0], D.L.boss[1]), D.L.boss[1], 14, '#b8b0a4', 14);
      /* --- 海軍本部：巨大的建築，側面外樓梯通往屋頂露台 --- */
      { const cands = [[-38, -30], [38, -30], [-40, -50], [40, -50], [0, -84]]; const c = cands.find(([x, z]) => free(x, z, 11) && H(x, z) > 1 && H(x - 10, z) > .8 && H(x + 10, z) > .8); if (c) { const [x, z] = c, y = H(x, z), hh = 10;
          b.box(x, y - .5, z, 20, hh + .5, 14, stone); D.ST.walls.push({ x0: x - 10, x1: x + 10, z0: z - 7, z1: z + 7, y0: y - 1, y1: y + hh - .6 }); /* 牆頂略低於屋頂，走上屋頂時不會被牆卡住 */ K2.slab(b, x - 10, z - 7, x + 10, z + 7, y + hh, '#d8d4cc', .3, '#e8e4dc');
          for (let k = 0; k < 2; k++) for (let i = 0; i < 6; i++) b.box(x - 7.5 + i * 3, y + 2 + k * 4, z + 7.02, 1.3, 2, .12, navy);
          b.cyl(x, y + hh, z, 3.6, 3.6, 4, 14, stone); b.sphere(x, y + hh + 4, z, 3.5, 14, navy, .9); D.ST.walls.push({ x0: x - 3.6, x1: x + 3.6, z0: z - 3.6, z1: z + 3.6, y0: y + hh, y1: y + hh + 7 });
          b.box(x, y + hh - 3, z + 7.1, 6, 2, .2, navy); b.box(x, y + hh - 2.6, z + 7.2, 4.4, 1.2, .1, '#f4f2ea');
          const sx = x > 0 ? x - 10 : x + 10, dir = x > 0 ? -1 : 1; K2.stairs(b, sx + dir * 3, z + 7, sx + dir * .05, z - 7, y, y + hh, 'z', '#c8c2b4');
          [[-10, -7, 10, -7], [-10, 7, 10, 7], [-10, -7, -10, 7], [10, -7, 10, 7]].filter(([a]) => !(a === (x > 0 ? -10 : 10) && true)).forEach(([a, c2, e, f]) => { if ((a === -10 && e === -10 && x > 0) || (a === 10 && e === 10 && x <= 0)) return; K2.rail(b, x + a, z + c2, x + e, z + f, y + hh, '#8a8478'); }); O.push([x, z, .01]); } } /* 樓梯那一側不加欄杆 */
      /* --- 包圍壁：沿著南邊海灣升起的鋼鐵牆，中間留出道路 --- */
      for (let xx = -46; xx <= 46; xx += 4) { if (Math.abs(xx) < 8) continue; const z = 46 - Math.abs(xx) * .18, y = H(xx, z); if (y < .2 || !keep.every(p => Math.hypot(xx - p[0], z - p[1]) > 6)) continue; b.box(xx, y - 2, z, 4.1, 9, 1.6, '#6a7078'); b.box(xx, y + 6.8, z, 4.1, .4, 2, '#4a5058'); D.ST.walls.push({ x0: xx - 2.05, x1: xx + 2.05, z0: z - .8, z1: z + .8, y0: y - 3, y1: y + 7 }); }
      /* --- 被凍住的海灣：從岸邊走過冰原，爬上白鬍子的莫比迪克號 --- */
      { let done = false; for (let k = 0; k < 20 && !done; k++) { const ang = (k / 20) * 6.283, ux = Math.cos(ang), uz = Math.sin(ang), ax = Math.abs(ux) > Math.abs(uz) ? 'x' : 'z', dx = ax === 'x' ? Math.sign(ux) : 0, dz = ax === 'z' ? Math.sign(uz) : 0;
          for (let R = 64; R > 44 && !done; R -= 2) { const px = Math.round(ux * R), pz = Math.round(uz * R); if (H(px, pz) < 1 || !free(px, pz, 3) || H(px + dx * 6, pz + dz * 6) > -.3 || H(px + dx * 30, pz + dz * 30) > -.5) continue;
            const iceY = .35; for (let q = 1; q <= 3; q++) { const cx = px + dx * q * 5.5, cz = pz + dz * q * 5.5; K2.slab(b, cx - 3, cz - 3, cx + 3, cz + 3, iceY, '#cfe8f4', 2.5, '#e8f6ff'); for (let s2 = 0; s2 < 3; s2++) b.box(cx + (hash(q, s2) - .5) * 4, iceY - .1, cz + (hash(s2, q) - .5) * 4, 1 + hash(q + s2, 3) * 1.4, 1.2, 1, '#bfe0f0', hash(s2, q) * 3); }
            /* 白鬍子的莫比迪克號（細節版帆船）：船尾朝岸，冰階通到船尾樓 */
            const sc = 1.7, shx = px + dx * 30, shz = pz + dz * 30, ry2 = Math.atan2(dx, dz), sh = P.ship2(b, shx, .7, shz, ry2, sc, { len: 15, w: 5.2, head: 'whale', masts: [-.16, .16], mastH: 10, sail: '#f4f2ea', hull: '#e8e4dc', deck: '#a87a50', trim: '#3a5a9a', flag: '#1c1c22' });
            const half = sh.Ln / 2, hw = sh.W * .4, ext = (a0, a1, w0) => { const p0 = sh.L(-w0, sh.Ln * a0), p1 = sh.L(w0, sh.Ln * a1); return [Math.min(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.max(p0[0], p1[0]), Math.max(p0[1], p1[1])]; };
            { const [a, bb, c2, d2] = ext(-.42, .44, hw); D.ST.plats.push({ x0: a, z0: bb, x1: c2, z1: d2, y0: sh.deckY + .05, y1: sh.deckY + .05 }); }
            { const [a, bb, c2, d2] = ext(-.49, -.28, sh.W * .36); D.ST.plats.push({ x0: a, z0: bb, x1: c2, z1: d2, y0: sh.deckY + 1.5 * sc, y1: sh.deckY + 1.5 * sc }); }
            const sx0 = shx - dx * (half + 6), sz0 = shz - dz * (half + 6), sx1 = shx - dx * (half - .6), sz1 = shz - dz * (half - .6);
            if (ax === 'x') K2.stairs(b, sx0, shz - 1.3, sx1, shz + 1.3, iceY, sh.deckY + 1.5 * sc, 'x', '#bfe0f0'); else K2.stairs(b, shx - 1.3, sz0, shx + 1.3, sz1, iceY, sh.deckY + 1.5 * sc, 'z', '#bfe0f0');
            K2.slab(b, px + dx * 16.5 - 3, pz + dz * 16.5 - 3, px + dx * 16.5 + 3, pz + dz * 16.5 + 3, iceY, '#cfe8f4', 2.5, '#e8f6ff'); K2.slab(b, px + dx * 21.5 - 3, pz + dz * 21.5 - 3, px + dx * 21.5 + 3, pz + dz * 21.5 + 3, iceY, '#cfe8f4', 2.5, '#e8f6ff');
            [-.16, .16].forEach(mz => { const [mx, mzz] = sh.L(0, sh.Ln * mz); D.ST.walls.push({ x0: mx - .45, x1: mx + .45, z0: mzz - .45, z1: mzz + .45, y0: sh.deckY, y1: sh.deckY + 17 }); });
            done = true; } } }
      /* --- 砲台、海軍旗、瓦礫 --- */
      for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, d = 18 + r() * 54, x = Math.cos(a) * d, z = Math.sin(a) * d; if (bad(x, z) || !free(x, z, 1.6) || H(x, z) < 1.1) continue; const y = H(x, z), k = r();
        if (k < .35) { b.cyl(x, y - .2, z, 1.1, 1.2, .8, 10, '#5a5a62'); b.cyl(x, y + .9, z, .35, .3, 2.6, 8, '#3a3a40', null, 0, [Math.cos(a) * 1.8, Math.sin(a) * 1.8]); O.push([x, z, 1.4]); } else if (k < .5) { b.cyl(x, y, z, .12, .1, 6, 6, '#e8e4dc'); b.box(x + .9, y + 5, z, 1.8, 1.1, .06, navy); } else { P.rock(b, x, y, z, .7 + r() * 1.2, r, '#9a948a'); O.push([x, z, 1.1]); } }
    },
    dressrosa(b, H, r, O, D) {
      /* ======== 德雷斯羅薩（正式版，立體地圖）：可以爬上看台的鬥技場、三層台地上的王宮、可以進去的玩具之家、向日葵花田、橘瓦石造街道 ======== */
      const K2 = D.K, ch = (typeof CHAPTERS !== 'undefined' ? CHAPTERS : []).find(c => c.id === 'dressrosa') || { npcs: [], steps: [] }, st = ch.steps || [];
      const keep = [...ch.npcs.map(n => n.pos), ...(D.L.spots || []), D.L.spawn, D.L.boss, ...st.flatMap(x => [x.start, x.goal, x.pos].filter(Boolean)), ...st.flatMap(x => x.spots || []), ...st.flatMap(x => (x.guards || []).flatMap(g => g.path))];
      const free = (x, z, c) => !onPath(x, z, c + 3.5) && keep.every(p => Math.hypot(x - p[0], z - p[1]) > c + 5) && O.every(o => Math.hypot(x - o[0], z - o[1]) > c + o[2]) && D.ST.plats.every(p => x + c < p.x0 - 2 || x - c > p.x1 + 2 || z + c < p.z0 - 2 || z - c > p.z1 + 2);
      const flatOk = (x, z, c) => { let lo = 99, hi = -99; for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; for (const rr of [c * .5, c]) { const h = H(x + Math.cos(a) * rr, z + Math.sin(a) * rr); lo = Math.min(lo, h); hi = Math.max(hi, h); } } return lo > .9 && hi - lo < 3; };
      const ring = rs => { const out = []; rs.forEach(R => { for (let k = 0; k < 28; k++) { const a = k / 28 * 6.283 + R * .07; out.push([Math.round(Math.cos(a) * R), Math.round(Math.sin(a) * R)]); } }); return out; };
      const find = (c, rs) => ring(rs).find(([x, z]) => free(x, z, c) && flatOk(x, z, c));
      const col = (x, y, z) => { const n = hash(x, z); if (y < .9) return mix('#e6d4a6', '#efdcb0', n); if (onPath(x, z, 3)) return mix('#d8b888', '#e2c494', n); return mix('#8fb05a', '#a2c06a', n * .6 + Math.sin(x * .12 + z * .1) * .2); };
      b.terrain(200, 80, H, col);
      const stone = '#e8d6b4', stone2 = '#d8c09a', roofO = '#d8603a', pink = '#ff6aa8';
      /* --- 鬥技場（克爾里亞鬥技場）：方形看台三層，四邊都有樓梯，可以爬到最上層繞一圈 --- */
      { const c = find(17, [40, 48, 32, 56]); if (c) { const [x, z] = c, y = H(x, z) - .1, W2 = 15, D2 = 12, tierH = 1.6;
          b.box(x, y - .4, z, W2 * 2 - 6, .5, D2 * 2 - 6, '#d8b888'); /* 場地沙地 */
          for (let t = 0; t < 3; t++) { const o = 3 + t * 2.4, top = y + (t + 1) * tierH, w0 = W2 - 3 + t * 2.4, d0 = D2 - 3 + t * 2.4, col2 = t % 2 ? stone : stone2;
            [[x - w0 - 2.4, z - d0 - 2.4, x + w0 + 2.4, z - d0], [x - w0 - 2.4, z + d0, x + w0 + 2.4, z + d0 + 2.4], [x - w0 - 2.4, z - d0, x - w0, z + d0], [x + w0, z - d0, x + w0 + 2.4, z + d0]].forEach(([a0, b0, a1, b1]) => K2.slab(b, a0, b0, a1, b1, top, col2, top - y + .4));
            D.ST.walls.push({ x0: x - w0, x1: x + w0, z0: z - d0 - .3, z1: z - d0, y0: top - tierH - .5, y1: top - .9 }, { x0: x - w0, x1: x + w0, z0: z + d0, z1: z + d0 + .3, y0: top - tierH - .5, y1: top - .9 }); }
          /* 四邊中央的樓梯：從場外地面爬上最上層 */ const topY = y + 3 * tierH, Wo = W2 - 3 + 2 * 2.4 + 2.4, Do = D2 - 3 + 2 * 2.4 + 2.4;
          K2.stairs(b, x - 1.6, z + Do + 7, x + 1.6, z + Do, y, topY, 'z', '#c8a878'); K2.stairs(b, x - 1.6, z - Do - 7, x + 1.6, z - Do, y, topY, 'z', '#c8a878');
          [[x - Wo, z - Do, x - 2, z - Do], [x + 2, z - Do, x + Wo, z - Do], [x - Wo, z + Do, x - 2, z + Do], [x + 2, z + Do, x + Wo, z + Do]].forEach(([a0, b0, a1, b1]) => K2.rail(b, a0, b0, a1, b1, topY, '#9a7a5a'));
          for (let k = 0; k < 8; k++) { const fx = x - Wo + k * (Wo * 2 / 7); b.cyl(fx, topY, z - Do, .1, .08, 4, 6, '#e8e4dc'); b.box(fx + .8, topY + 3.2, z - Do, 1.6, 1, .05, [pink, '#ffd34a', '#5ab0e0'][k % 3]); }
          O.push([x, z, .01]); } }
      /* --- 王宮：三層石造台地，正面大樓梯，頂端是橘瓦王宮與尖塔 --- */
      { const c = find(13, [56, 50, 44, 62]); if (c) { const [x, z] = c, y = H(x, z) - .1, f = z < 0 ? 1 : -1;
          const tier = (w, d, base, top, cz) => { b.box(x, base - .5, cz, w, top - base + .5, d, stone2); D.ST.walls.push({ x0: x - w / 2, x1: x + w / 2, z0: cz - d / 2, z1: cz + d / 2, y0: base - 1, y1: top - 1.3 }); K2.slab(b, x - w / 2, cz - d / 2, x + w / 2, cz + d / 2, top, stone2, .3, stone); for (let q = -2; q <= 2; q++) b.box(x + q * w / 5, base + .8, cz + f * (d / 2 + .02), .8, top - base - 1.6, .1, '#9a8060'); };
          const t1 = y + 4, t2 = t1 + 4, t3 = t2 + 4; tier(26, 16, y, t1, z); tier(18, 11, t1, t2, z - f * 2); tier(12, 7, t2, t3, z - f * 3.5);
          K2.stairs(b, x - 2.4, z + f * 14, x + 2.4, z + f * 8, Math.min(y, H(x, z + f * 14)), t1, 'z', '#c8a878'); K2.stairs(b, x - 2, z + f * 8 - f * .2, x + 2, z + f * 3.5, t1, t2, 'z', '#c8a878'); K2.stairs(b, x - 1.6, z + f * 3.5 - f * .2, x + 1.6, z + f * .02, t2, t3, 'z', '#c8a878');
          b.box(x, t3, z - f * 3.5, 9, 4, 5, '#f4e6cc'); b.cyl(x, t3 + 4, z - f * 3.5, 6, 0, 3.4, 4, roofO, null, Math.PI / 4); [[-4.5, -2], [4.5, -2], [-4.5, 2], [4.5, 2]].forEach(([dx, dz]) => { b.cyl(x + dx, t3, z - f * 3.5 + dz, .9, .8, 6, 10, '#f4e6cc'); b.cyl(x + dx, t3 + 6, z - f * 3.5 + dz, 1.1, 0, 2.4, 10, roofO); });
          D.ST.walls.push({ x0: x - 4.5, x1: x + 4.5, z0: z - f * 3.5 - 2.5, z1: z - f * 3.5 + 2.5, y0: t3 - 1, y1: t3 + 4 }); b.cyl(x, t3 + 7.4, z - f * 3.5, .1, .08, 3, 6, '#e8e4dc'); b.box(x + .8, t3 + 9.6, z - f * 3.5, 1.6, 1, .05, pink);
          [[-13, 0, -13, 0], [13, 0, 13, 0]].forEach(([a0]) => K2.rail(b, x + a0, z - 8, x + a0, z + 8, t1, '#9a7a5a')); O.push([x, z, .01]); } }
      /* --- 玩具之家（可以進去）：彩色牆、屋頂的巨大玩具 --- */
      { const c = find(6, [30, 24, 36, 42]); if (c) { const [x, z] = c, y = H(x, z); K2.house2(b, x, z, 10, 8, y, '#ffd8e8', '#5ab0e0', Math.abs(x) > Math.abs(z) ? (x > 0 ? 'x-' : 'x+') : (z > 0 ? 'z-' : 'z+'));
          b.sphere(x - 3, y + 7.2 + 3.4, z, 1.4, 10, '#ff5a5a', .9); b.box(x + 2.5, y + 7.2 + 2.6, z, 1.6, 2.6, 1.6, '#ffd34a'); b.cyl(x, y + 7.2 + 4.8, z + 2, .9, .9, 1.2, 12, '#5ad87a'); O.push([x, z, .01]); } }
      /* --- 向日葵花田 --- */
      { const c = find(8, [34, 44, 26, 52]); if (c) { const [x0, z0] = c; for (let i = 0; i < 40; i++) { const x = x0 + (i % 8 - 3.5) * 1.8 + (r() - .5) * .6, z = z0 + Math.floor(i / 8) * 1.8 - 3.6 + (r() - .5) * .6; if (!free(x, z, .3)) continue; const y = H(x, z), h = 2 + r() * 1.4; b.cyl(x, y - .2, z, .08, .06, h, 5, '#4f8a3a'); b.cyl(x, y + h, z, .55, .55, .12, 10, '#ffd34a'); b.cyl(x, y + h + .06, z, .25, .25, .1, 8, '#6a4a2a'); b.box(x + .3, y + h * .55, z, .5, .08, .3, '#5a9a44', .5); } O.push([x0, z0, 7]); } }
      /* --- 石造街道：橘瓦民宅 --- */
      { let k = 0; ring([22, 28, 34, 40, 46]).forEach(([x, z]) => { if (k >= 9 || !free(x, z, 4.2) || !flatOk(x, z, 4)) return; P.house(b, x, H(x, z), z, 6, 5, 3.4, ['#f4e6cc', '#f8dcc0', '#efe0d0'][k % 3], [roofO, '#c8473a', '#e07a3a'][k % 3], Math.atan2(-x, -z)); O.push([x, z, 4.6]); k++; }); }
      P.arena(b, D.L.boss[0], H(D.L.boss[0], D.L.boss[1]), D.L.boss[1], 14, '#c8a070', 14);
      /* --- 樹、花盆、街燈 --- */
      for (let i = 0; i < 60; i++) { const a = r() * Math.PI * 2, d = 18 + r() * 56, x = Math.cos(a) * d, z = Math.sin(a) * d; if (bad(x, z) || !free(x, z, 1.3) || H(x, z) < 1.1) continue; const y = H(x, z), k2 = r();
        if (k2 < .5) { P.tree(b, x, y, z, .8 + r() * .5, r, mix('#5a9a44', '#7aba54', r())); O.push([x, z, 1.4]); } else if (k2 < .75) { b.cyl(x, y - .1, z, .6, .45, .7, 10, '#c86a3a'); for (let q = 0; q < 4; q++) b.sphere(x + (q - 1.5) * .3, y + .8, z, .25, 6, [pink, '#ffd34a', '#ff8a3a', '#ffffff'][q], .8); O.push([x, z, .7]); } else { b.cyl(x, y - .2, z, .1, .12, 3.4, 6, '#3a3040'); b.box(x, y + 3.1, z, .5, .6, .5, '#ffcf7a'); O.push([x, z, .5]); } }
    },
    wholecake(b, H, r, O, D) {
      /* ======== 蛋糕島（正式版，立體地圖）：四層的萬國蛋糕城堡（正面大樓梯爬到頂端）、杯子蛋糕踏台（要跳）、糖果森林、可以進去的薑餅屋、茶會長桌、鏡子世界的大鏡子 ======== */
      const K2 = D.K, ch = (typeof CHAPTERS !== 'undefined' ? CHAPTERS : []).find(c => c.id === 'wholecake') || { npcs: [], steps: [] }, st = ch.steps || [];
      const keep = [...ch.npcs.map(n => n.pos), ...(D.L.spots || []), D.L.spawn, D.L.boss, ...st.flatMap(x => [x.start, x.goal, x.pos].filter(Boolean)), ...st.flatMap(x => [...(x.spots || []), ...(x.points || [])]), ...st.flatMap(x => (x.guards || []).flatMap(g => g.path))];
      const free = (x, z, c) => !onPath(x, z, c + 3.5) && keep.every(p => Math.hypot(x - p[0], z - p[1]) > c + 5) && O.every(o => Math.hypot(x - o[0], z - o[1]) > c + o[2]) && D.ST.plats.every(p => x + c < p.x0 - 2 || x - c > p.x1 + 2 || z + c < p.z0 - 2 || z - c > p.z1 + 2);
      const flatOk = (x, z, c) => { let lo = 99, hi = -99; for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; for (const rr of [c * .5, c]) { const h = H(x + Math.cos(a) * rr, z + Math.sin(a) * rr); lo = Math.min(lo, h); hi = Math.max(hi, h); } } return lo > .9 && hi - lo < 3; };
      const ring = rs => { const out = []; rs.forEach(R => { for (let k = 0; k < 28; k++) { const a = k / 28 * 6.283 + R * .09; out.push([Math.round(Math.cos(a) * R), Math.round(Math.sin(a) * R)]); } }); return out; };
      const find = (c, rs) => ring(rs).find(([x, z]) => free(x, z, c) && flatOk(x, z, c));
      const col = (x, y, z) => { const n = hash(x, z); if (y < .9) return mix('#fff0f4', '#fbe2ea', n); if (onPath(x, z, 3)) return mix('#f6d8a8', '#fbe4b8', n); return mix('#f4b8cc', '#f8cad8', n * .6 + Math.sin(x * .14 + z * .11) * .2); };
      b.terrain(200, 80, H, col);
      const cream = '#fff6ee', pinkC = '#ffb8d0', choco = '#7a4a32', straw = '#ff4a6a', gold = '#ffd34a';
      const drips = (x, y, z, w, d, colr) => { for (let i = 0; i < Math.round((w + d) * 1.2); i++) { const t = i / Math.round((w + d) * 1.2), per = 2 * (w + d), p = t * per; let px, pz; if (p < w) { px = x - w / 2 + p; pz = z - d / 2; } else if (p < w + d) { px = x + w / 2; pz = z - d / 2 + (p - w); } else if (p < 2 * w + d) { px = x + w / 2 - (p - w - d); pz = z + d / 2; } else { px = x - w / 2; pz = z + d / 2 - (p - 2 * w - d); } b.sphere(px, y - .2 - hash(i, x) * .4, pz, .35 + hash(x, i) * .25, 6, colr, 1.4); } };
      /* --- 萬國蛋糕城堡：四層方形蛋糕，正面大樓梯，頂端蠟燭與草莓 --- */
      { const c = find(15, [54, 48, 60, 42]); if (c) { const [x, z] = c, y = H(x, z) - .1, f = z < 0 ? 1 : -1, layers = [[28, 18, '#f8e0c8'], [22, 14, pinkC], [16, 10, '#fff0f6'], [10, 7, '#c87a5a']]; let base = y, cz = z;
          layers.forEach(([w, d, colr], k) => { const top = base + 4.2; cz = z - f * k * 1.6; b.box(x, base - .5, cz, w, top - base + .5, d, colr); D.ST.walls.push({ x0: x - w / 2, x1: x + w / 2, z0: cz - d / 2, z1: cz + d / 2, y0: base - 1, y1: top - 1.3 }); K2.slab(b, x - w / 2, cz - d / 2, x + w / 2, cz + d / 2, top, cream, .35, cream); drips(x, top, cz, w, d, k % 2 ? '#ffffff' : '#fff0f6');
            for (let q = 0; q < Math.floor(w / 4); q++) b.sphere(x - w / 2 + 2 + q * 4, top + .4, cz + f * (d / 2 - .8), .55, 8, straw, .9);
            const fe = cz + f * d / 2; if (k === 0) K2.stairs(b, x - 2.6, fe + f * 7, x + 2.6, fe, Math.min(base, H(x, fe + f * 7)), top, 'z', '#f6d8a8'); /* 第一段從地面高度開始 */ else { const fePrev = (z - f * (k - 1) * 1.6) + f * layers[k - 1][1] / 2; K2.stairs(b, x - 2, fePrev - f * .15, x + 2, fe, base, top, 'z', '#f6d8a8'); } /* 每一層的樓梯從下一層的邊緣爬到這一層的邊緣 */
            base = top; });
          for (let q = -2; q <= 2; q++) { b.cyl(x + q * 1.6, base, cz, .25, .25, 2.4, 8, ['#ff8ab0', '#8ad8ff', '#ffe08a'][(q + 2) % 3]); b.sphere(x + q * 1.6, base + 2.6, cz, .22, 6, '#ffcf6a', 1.4); }
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { b.cyl(x + sx * 15, y - .2, z + sz * 10, 1.4, 1.2, 14, 12, '#fff0f6'); b.cyl(x + sx * 15, y + 13.8, z + sz * 10, 1.8, 0, 4, 12, '#ff6a9a'); D.ST.walls.push({ x0: x + sx * 15 - 1.4, x1: x + sx * 15 + 1.4, z0: z + sz * 10 - 1.4, z1: z + sz * 10 + 1.4, y0: y - 1, y1: y + 14 }); });
          O.push([x, z, .01]); } }
      /* --- 杯子蛋糕踏台：一顆比一顆高，跳上去 --- */
      { const c = find(9, [32, 40, 26, 46]); if (c) { const [x0, z0] = c; let topY = H(x0, z0); for (let q = 0; q < 6; q++) { const a = q * 1.05, x = x0 + Math.cos(a) * (2.5 + q * 1.1), z = z0 + Math.sin(a) * (2.5 + q * 1.1), gy = H(x, z), top = gy + 1.1 + q * 1.05, colr = ['#ff8ab0', '#8ad8ff', '#c8a0ff', '#ffe08a', '#8af0b0', '#ffb070'][q];
          b.cyl(x, gy - .2, z, 1.2, 1.5, top - gy - .3, 12, '#c87a5a'); for (let k = 0; k < 10; k++) { const aa = k / 10 * 6.283; b.box(x + Math.cos(aa) * 1.42, gy - .2, z + Math.sin(aa) * 1.42, .25, top - gy - .4, .12, '#a85a3a', -aa); }
          K2.slab(b, x - 1.5, z - 1.5, x + 1.5, z + 1.5, top, colr, .5); b.sphere(x, top - .1, z, 1.6, 10, colr, .45); b.sphere(x, top + .5, z, .3, 6, straw); topY = top; }
          const fx = x0 + Math.cos(6.3) * 9.1, fz = z0 + Math.sin(6.3) * 9.1; b.sphere(fx, topY + 1.5, fz, .9, 10, gold); O.push([x0, z0, .01]); } }
      /* --- 可以進去的薑餅屋 --- */
      { const c = find(5, [24, 30, 36]); if (c) { const [x, z] = c, y = H(x, z); K2.house2(b, x, z, 9, 7, y, '#c8884a', '#ffffff', Math.abs(x) > Math.abs(z) ? (x > 0 ? 'x-' : 'x+') : (z > 0 ? 'z-' : 'z+')); for (let k = 0; k < 8; k++) b.sphere(x - 4 + k, y + 7.4, z + 3.6, .3, 6, ['#ff4a6a', '#5ad87a', '#ffd34a'][k % 3]); O.push([x, z, .01]); } }
      /* --- 茶會長桌 --- */
      { const c = find(6, [36, 30, 44]); if (c) { const [x, z] = c, y = H(x, z); b.box(x, y + .9, z, 12, .3, 2.6, '#fff6ee'); [-5.4, 5.4].forEach(dx => [-1, 1].forEach(dz => b.cyl(x + dx, y - .1, z + dz * 1, .12, .12, 1, 6, '#c8a070')));
          for (let k = 0; k < 6; k++) { b.cyl(x - 5 + k * 2, y + 1.2, z, .5, .5, .5 + (k % 3) * .3, 10, ['#ffb8d0', '#fff0f6', '#c87a5a'][k % 3]); b.sphere(x - 5 + k * 2, y + 1.9 + (k % 3) * .3, z, .2, 6, straw); [-1, 1].forEach(sd => b.box(x - 5 + k * 2, y, z + sd * 2.2, .9, 1.2, .9, '#ff8ab0')); } O.push([x, z, 7]); } }
      /* --- 鏡子世界的大鏡子 --- */
      { const c = find(3, [28, 38, 46]); if (c) { const [x, z] = c, y = H(x, z), ry = Math.atan2(-x, -z); b.box(x, y - .2, z, 4.4, 6.4, .5, gold, ry); b.box(x, y + .3, z + Math.cos(ry) * .2, 3.6, 5.4, .1, '#bfe8ff', ry); b.sphere(x, y + 6.4, z, .7, 8, gold); O.push([x, z, 2.4]); } }
      /* --- 糖果森林：棒棒糖樹、拐杖糖、甜甜圈 --- */
      for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = 18 + r() * 56, x = Math.cos(a) * d, z = Math.sin(a) * d; if (bad(x, z) || !free(x, z, 1.3) || H(x, z) < 1.1) continue; const y = H(x, z), k2 = r();
        if (k2 < .45) { b.cyl(x, y - .3, z, .18, .15, 4 + r() * 2, 6, '#ffffff'); const cc = ['#ff6a9a', '#8ad8ff', '#ffe08a', '#c8a0ff'][i % 4]; b.cyl(x, y + 4.4, z, 1.6, 1.6, .5, 14, cc, '#ffffff', 0, [0, 0]); b.cyl(x, y + 4.42, z, .9, .9, .52, 12, '#ffffff'); O.push([x, z, 1.4]); }
        else if (k2 < .7) { b.cyl(x, y - .2, z, .2, .2, 3.2, 6, '#ffffff'); for (let q = 0; q < 4; q++) b.cyl(x, y + q * .8, z, .21, .21, .3, 6, '#ff4a6a'); b.cyl(x + .5, y + 3.2, z, .2, .2, 1, 6, '#ff4a6a', null, 0, [.6, 0]); O.push([x, z, .6]); }
        else { b.cyl(x, y, z, 1.2, 1.2, .7, 14, '#e8b070', ['#ff8ab0', '#8a5a3a', '#ffffff'][i % 3]); O.push([x, z, 1.3]); } }
      P.arena(b, D.L.boss[0], H(D.L.boss[0], D.L.boss[1]), D.L.boss[1], 14, '#f0c8d8', 14);
    },
    _eniesOld(b, H, r, O, D) { /* 舊版要塞地形：頂上戰爭、蛋頭島仍沿用 */
      const col = (x, y, z) => { const n = hash(x, z); if (y < .9) return mix('#9a9a92', '#aaa89e', n); if (Math.abs(x) < 7 && z < 40) return mix('#c9c3b0', '#d6d0bd', n); return mix('#7d8a6a', '#8e9a78', n); };
      b.terrain(200, 70, H, col);
      // 正門
      const gy = H(0, 30); b.box(-12, gy - .5, 30, 8, 16, 6, '#e8e4dc'); b.box(12, gy - .5, 30, 8, 16, 6, '#e8e4dc'); b.box(0, gy + 14, 30, 32, 5, 6, '#d6d0c4'); b.box(0, gy + 18.5, 30, 10, 3, 6.4, '#c8322b');
      [[-12, 30], [12, 30]].forEach(([x, z]) => O.push([x, z, 5]));
      // 審判所與司法之塔
      const cy = H(0, -8); b.box(-26, cy - .5, -8, 16, 12, 14, '#efe9dc'); b.box(26, cy - .5, -8, 16, 12, 14, '#efe9dc'); b.cyl(-26, cy + 11.5, -8, 6, 0, 5, 4, '#3a4a6a', null, Math.PI / 4); b.cyl(26, cy + 11.5, -8, 6, 0, 5, 4, '#3a4a6a', null, Math.PI / 4);
      O.push([-26, -8, 10], [26, -8, 10]);
      const ty = H(0, -80); b.box(0, ty - 1, -84, 16, 44, 16, '#e8e4dc', 0, .82); b.cyl(0, ty + 43, -84, 9, 0, 12, 4, '#3a4a6a', null, Math.PI / 4); b.box(0, ty + 30, -75.6, 5, 7, .4, '#1b1b22');
      for (let i = 0; i < 5; i++) b.box(0, ty + 8 + i * 7, -75.9, 3, 2.5, .3, '#8ab4d8');
      // 世界政府旗
      b.cyl(8, ty + 36, -84, .2, .2, 14, 5, '#b8b0a0'); b.box(11, ty + 46, -84, 6, 4, .15, '#f4f2ea'); b.sphere(11, ty + 46, -83.9, 1.1, 6, '#3a6ad8');
      for (let x = -12; x <= 12; x += 6) O.push([x, -84, 9]);
      P.arena(b, D.L.boss[0], H(D.L.boss[0], D.L.boss[1]), D.L.boss[1], 14, '#b8b0a0', 12);
      // 無底洞瀑布感（外圍白色水花）
      for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, x = Math.cos(a) * 86, z = Math.sin(a) * 86; b.sphere(x, -1, z, 3 + r() * 3, 6, '#f4fbff', .5, .2, i + 2); }
      // 街燈與石柱
      for (let z = 50; z > -40; z -= 12) { [-8, 8].forEach(x => { const y = H(x, z); b.cyl(x, y - .3, z, .18, .14, 4.4, 6, '#2b2b33'); b.sphere(x, y + 4.4, z, .45, 6, '#fff3c0'); O.push([x, z, .6]); }); }
      for (let i = 0; i < 30; i++) { const a = r() * Math.PI * 2, d = 24 + r() * 50, x = Math.cos(a) * d, z = Math.sin(a) * d; if (bad(x, z) || Math.abs(x) < 12 || Math.hypot(x, z + 60) < 18) continue; const y = H(x, z); if (y < 1) continue; if (r() < .5) { P.pine(b, x, y, z, .8 + r() * .4, '#3f6a4a'); O.push([x, z, 1.3]); } else { b.box(x, y - .3, z, 1.4, 1.2 + r() * 1.5, 1.4, '#cfc8b8', r()); O.push([x, z, 1.2]); } }
      P.ship(b, 70, 0, 40, .4, 1.1, '#f4f2ea');
    },
    fishman(b, H, r, O, D) {
      /* ======== 魚人島（正式版，立體地圖）：三層階梯式的龍宮城（正面大樓梯一路爬到頂端）、珊瑚踏台（要跳）、海之森林與諾亞方舟（可以爬上甲板）、陽光樹伊布、凱米的章魚燒店 ======== */
      const K2 = D.K, ch = (typeof CHAPTERS !== 'undefined' ? CHAPTERS : []).find(c => c.id === 'fishman') || { npcs: [], steps: [] }, st = ch.steps || [];
      const keep = [...ch.npcs.map(n => n.pos), ...(D.L.spots || []), D.L.spawn, D.L.boss, ...st.flatMap(x => [x.start, x.goal, x.pos].filter(Boolean)), ...st.flatMap(x => x.spots || []), ...st.flatMap(x => (x.guards || []).flatMap(g => g.path))];
      const free = (x, z, c) => !onPath(x, z, c + 3.5) && keep.every(p => Math.hypot(x - p[0], z - p[1]) > c + 5) && O.every(o => Math.hypot(x - o[0], z - o[1]) > c + o[2]) && D.ST.plats.every(p => x + c < p.x0 - 2 || x - c > p.x1 + 2 || z + c < p.z0 - 2 || z - c > p.z1 + 2);
      const flat = (x, z, c) => { let lo = 99, hi = -99; for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283, h = H(x + Math.cos(a) * c, z + Math.sin(a) * c); lo = Math.min(lo, h); hi = Math.max(hi, h); } return hi - lo < 1.8 && lo > .9; };
      const find = (c, cands) => cands.find(([x, z]) => free(x, z, c) && flat(x, z, c));
      const col = (x, y, z) => { const n = hash(x, z), p = Math.sin(x * .09) * Math.cos(z * .08); if (y < .9) return mix('#d8c8a0', '#e4d6b0', n); if (p > .45) return mix('#4f8a6a', '#5f9a7a', n); return mix('#cdbf98', '#dccfa8', n * .6 + Math.sin(x * .3 + z * .2) * .2); };
      b.terrain(200, 80, H, col);
      const cor = ['#ff7f7f', '#ffb35c', '#e85a8a', '#b58cff', '#5fd3c8'], pink = '#fbe0ea', pink2 = '#f7b6cc', gold = '#ffd34a';
      /* --- 龍宮城：三層階梯式宮殿，正面大樓梯 --- */
      { const ring = []; for (const R of [44, 50, 38, 56, 32]) for (let k = 0; k < 32; k++) { const ang = k / 32 * 6.283; ring.push([Math.round(Math.cos(ang) * R), Math.round(Math.sin(ang) * R)]); }
        const okP = ([x, z]) => free(x, z, 14) && (() => { let lo = 99, hi = -99; for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; for (const rr of [8, 15]) { const h = H(x + Math.cos(a) * rr, z + Math.sin(a) * rr * .7); lo = Math.min(lo, h); hi = Math.max(hi, h); } } return lo > .6 && hi - lo < 3.2; })();
        const c = ring.find(okP); if (c) { const [x, z] = c, y = H(x, z) - .1, f = z < 0 ? 1 : -1; /* 正面朝向島中央 */
        const tier = (w, d, base, top, cz, colr) => { b.box(x, base - .5, cz, w, top - base + .5, d, colr); D.ST.walls.push({ x0: x - w / 2, x1: x + w / 2, z0: cz - d / 2, z1: cz + d / 2, y0: base - 1, y1: top - 1.3 }); /* 牆頂比樓梯頂低，走到樓梯最上面不會被牆擋住 */ K2.slab(b, x - w / 2, cz - d / 2, x + w / 2, cz + d / 2, top, shade(colr, .95), .3, shade(colr, 1.05)); ; /* 細節：金色飾帶、每一面的拱窗、貝殼裝飾 */ b.box(x, top - .5, cz, w + .2, .25, d + .2, gold); b.box(x, base + .25, cz, w + .15, .3, d + .15, shade(colr, .85));
          const nw = Math.max(2, Math.floor(w / 3.2)); for (let q = 0; q < nw; q++) { const wx = x - w / 2 + (q + .5) * w / nw; [-1, 1].forEach(sd => { const wz = cz + sd * (d / 2 + .02); b.box(wx, base + 1.1, wz, 1.1, Math.min(2.2, top - base - 1.6), .1, '#7ad8ff'); b.sphere(wx, base + 1.1 + Math.min(2.2, top - base - 1.6), wz, .55, 8, '#7ad8ff', .5); b.box(wx, base + .9, wz + sd * .05, 1.4, .14, .14, gold); }); }
          const nd = Math.max(2, Math.floor(d / 3.2)); for (let q = 0; q < nd; q++) { const wz = cz - d / 2 + (q + .5) * d / nd; [-1, 1].forEach(sd => b.box(x + sd * (w / 2 + .02), base + 1.1, wz, .1, Math.min(2.2, top - base - 1.6), 1.1, '#7ad8ff')); }
          [-1, 1].forEach(sd => b.sphere(x + sd * (w / 2 - 1), top + .4, cz + f * (d / 2 - .6), .7, 8, '#fff0d8', .6)); };
        const t1 = y + 4.5, t2 = t1 + 4.5, t3 = t2 + 4.5;
        tier(30, 18, y, t1, z, pink); tier(20, 12, t1, t2, z - f * 2, '#fff2f6'); tier(12, 8, t2, t3, z - f * 3, pink);
        K2.stairs(b, x - 2.5, z + f * 15, x + 2.5, z + f * 9, Math.min(y, H(x, z + f * 15)), t1, 'z', '#f0d0dc'); K2.stairs(b, x - 2, z + f * 9 - f * .2, x + 2, z + f * 4, t1, t2, 'z', '#f0d0dc'); K2.stairs(b, x - 1.6, z + f * 4 - f * .2, x + 1.6, z + f * 1, t2, t3, 'z', '#f0d0dc');
        b.sphere(x, t3 + 1, z - f * 3, 4, 14, pink2, 1.2); b.cyl(x, t3 + 5.6, z - f * 3, .3, 0, 3, 8, gold);
        [[-13, -7], [13, -7], [-13, 7], [13, 7]].forEach(([dx, dz]) => { b.cyl(x + dx, y, z + dz, 1.3, 1.1, t2 - y + 3, 12, '#fff2f6'); b.sphere(x + dx, t2 + 3.5, z + dz, 1.6, 10, pink2, 1.3); D.ST.walls.push({ x0: x + dx - 1.3, x1: x + dx + 1.3, z0: z + dz - 1.3, z1: z + dz + 1.3, y0: y, y1: t2 + 3 }); });
        for (let k = -4; k <= 4; k++) b.box(x + k * 3, y + 1.6, z + f * 9.05, 1.2, 1.8, .12, '#7ad8ff');
        [[-15, 0, -15, 0], [15, 0, 15, 0]].forEach(([a]) => K2.rail(b, x + a, z - 9, x + a, z + 9, t1, '#e8b8c8')); O.push([x, z, .01]); } }
      /* --- 珊瑚踏台：一根根大珊瑚柱，頂端是平台，要跳上去 --- */
      { const c = find(9, [[34, 30], [-34, -12], [40, 8], [-40, 0], [30, -40], [-30, 36]]); if (c) { const [x0, z0] = c; let hy = H(x0, z0); for (let q = 0; q < 6; q++) { const a = q * 1.1, x = x0 + Math.cos(a) * (2 + q * 1.2), z = z0 + Math.sin(a) * (2 + q * 1.2), top = H(x, z) + 1.1 + q * 1.05, colr = cor[q % 5];
          b.cyl(x, H(x, z) - .3, z, .7, 1, top - H(x, z) + .3, 8, shade(colr, .85)); K2.slab(b, x - 1.3, z - 1.3, x + 1.3, z + 1.3, top, colr, .4); b.sphere(x, top - .2, z, 1.5, 8, colr, .35); hy = top; }
          const ex = x0 + Math.cos(6.6) * 9.2, ez = z0 + Math.sin(6.6) * 9.2; b.sphere(ex, hy + 1.6, ez, 1.1, 10, '#bfefff'); b.sphere(ex, hy + 1.6, ez, .5, 8, gold); O.push([x0, z0, .01]); } }
      /* --- 海之森林與諾亞方舟：巨大的方舟躺在森林裡，側面的珊瑚坡道通到甲板 --- */
      { const c = find(13, [[46, 30], [-46, -20], [44, -14], [-40, 40], [48, 2]]); if (c) { const [x, z] = c, y = H(x, z); const ax = Math.abs(x) > Math.abs(z) ? 'z' : 'x', ry2 = ax === 'z' ? 0 : Math.PI / 2;
          const sh = P.ship2(b, x, y + 1.2, z, ry2, 1.6, { len: 16, w: 5.5, head: 'none', masts: [0], mastH: 7, sail: '#9a8a7a', hull: '#7a5a3a', deck: '#a88a60', trim: '#c9a24a', flag: '#2a4a6a' });
          const p0 = sh.L(-sh.W * .4, -sh.Ln * .42), p1 = sh.L(sh.W * .4, sh.Ln * .44); D.ST.plats.push({ x0: Math.min(p0[0], p1[0]), z0: Math.min(p0[1], p1[1]), x1: Math.max(p0[0], p1[0]), z1: Math.max(p0[1], p1[1]), y0: sh.deckY + .05, y1: sh.deckY + .05 });
          const side = x > 0 ? -1 : 1; if (ax === 'z') K2.stairs(b, x + side * (sh.W * .5 + 5), z - 1.4, x + side * sh.W * .38, z + 1.4, y, sh.deckY + .05, 'x', '#e8a0b8'); else K2.stairs(b, x - 1.4, z + side * (sh.W * .5 + 5), x + 1.4, z + side * sh.W * .38, y, sh.deckY + .05, 'z', '#e8a0b8');
          const [mx, mz] = sh.L(0, 0); D.ST.walls.push({ x0: mx - .45, x1: mx + .45, z0: mz - .45, z1: mz + .45, y0: sh.deckY, y1: sh.deckY + 12 });
          for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283, tx = x + Math.cos(a) * 16, tz = z + Math.sin(a) * 14; if (!free(tx, tz, 1) || H(tx, tz) < .9) continue; b.cyl(tx, H(tx, tz) - .3, tz, .5, .3, 6 + hash(k, 3) * 4, 6, '#3f7a5a'); b.sphere(tx, H(tx, tz) + 7, tz, 2.2, 8, '#4f9a6a', .8); O.push([tx, tz, .8]); } O.push([x, z, .01]); } }
      /* --- 陽光樹伊布：從海面上方延伸下來的巨大樹根，帶來光 --- */
      { const c = find(5, [[0, 18], [20, 0], [-20, -30], [26, -44]]); if (c) { const [x, z] = c, y = H(x, z); b.cyl(x, y - .5, z, 3.2, 2.2, 30, 12, '#c8a878'); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; b.cyl(x + Math.cos(a) * 2.6, y - .6, z + Math.sin(a) * 2.6, 1.2, .4, 5, 7, '#a88a60', null, 0, [Math.cos(a) * 2.4, Math.sin(a) * 2.4]); } b.cyl(x, y + 30, z, 4, 8, 6, 12, '#fff6c8'); D.ST.walls.push({ x0: x - 3.2, x1: x + 3.2, z0: z - 3.2, z1: z + 3.2, y0: y - 1, y1: y + 40 }); O.push([x, z, .01]); } }
      /* --- 凱米的章魚燒店（可以進去） --- */
      { const t = (ch.npcs.find(n => n.id === 'camie') || { pos: [-12, 40] }).pos, c = find(5, [[t[0] - 12, t[1] + 4], [t[0] + 12, t[1] + 2], [t[0], t[1] + 13], [t[0] - 14, t[1] - 8]]); if (c) { const [x, z] = c; K2.house2(b, x, z, 8, 7, H(x, z), '#ffd8b0', '#e85a5a', 'z+'); b.box(x, H(x, z) + 7.6 + 3.4, z + 3.6, 4, 1.2, .2, '#ff8a3a'); O.push([x, z, .01]); } }
      /* --- 珊瑚、海藻、貝殼 --- */
      for (let i = 0; i < 80; i++) { const a = r() * Math.PI * 2, d = 18 + r() * 60, x = Math.cos(a) * d, z = Math.sin(a) * d; if (bad(x, z) || !free(x, z, 1.3)) continue; const y = H(x, z), c2 = cor[i % 5];
        if (r() < .45) { for (let k = 0; k < 5; k++) b.cyl(x + (r() - .5) * 1.5, y - .2, z + (r() - .5) * 1.5, .3, .12, 1.6 + r() * 2.8, 6, c2, null, 0, [(r() - .5) * 1.4, (r() - .5) * 1.4]); b.sphere(x, y, z, .9, 7, shade(c2, .8), .5); O.push([x, z, 1.2]); }
        else if (r() < .6) { for (let k = 0; k < 3; k++) b.cyl(x + k * .4, y - .2, z, .12, .04, 4 + r() * 6, 5, mix('#3f8a5a', '#5fae6a', r()), null, 0, [(r() - .5) * 2, (r() - .5) * 2]); }
        else { b.sphere(x, y + .2, z, .5 + r() * .5, 8, mix('#ffe8f0', '#fff6e0', r()), .55); } }
      P.arena(b, D.L.boss[0], H(D.L.boss[0], D.L.boss[1]), D.L.boss[1], 14, '#f0d0dc', 14);
    },
    _fishmanOld(b, H, r, O, D) { /* 舊版魚人島 */
      const col = (x, y, z) => { const n = hash(x, z), p = Math.sin(x * .09) * Math.cos(z * .08); if (p > .45) return mix('#4f8a6a', '#5f9a7a', n); return mix('#cdbf98', '#dccfa8', n); };
      b.terrain(200, 70, H, col);
      // 珊瑚
      const cor = ['#ff7f7f', '#ffb35c', '#e85a8a', '#b58cff', '#5fd3c8'];
      for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = 18 + r() * 60, x = Math.cos(a) * d, z = Math.sin(a) * d; if (bad(x, z) || Math.abs(x) < 6 || Math.hypot(x, z + 60) < 18) continue; const y = H(x, z), c = cor[i % 5];
        if (r() < .5) { for (let k = 0; k < 4; k++) b.cyl(x + (r() - .5) * 1.5, y - .2, z + (r() - .5) * 1.5, .3, .15, 1.5 + r() * 2.5, 5, c, null, 0, [(r() - .5) * 1.2, (r() - .5) * 1.2]); O.push([x, z, 1.2]); }
        else if (r() < .6) { b.cyl(x, y - .2, z, .12, .05, 4 + r() * 5, 4, '#3f8a5a', null, 0, [(r() - .5) * 2, (r() - .5) * 2]); b.cyl(x + .5, y - .2, z, .1, .04, 3 + r() * 4, 4, '#4f9a6a', null, 0, [(r() - .5) * 2, (r() - .5) * 2]); }
        else b.sphere(x, y + .4, z, .8 + r(), 7, c, .6, .2, i); }
      // 龍宮城
      const py = H(0, -84); b.box(0, py - 1, -86, 40, 12, 16, '#fbe6ee'); b.box(0, py + 11, -86, 22, 8, 12, '#fff2f6');
      [-16, 0, 16].forEach((x, i) => b.sphere(x, py + (i === 1 ? 20 : 12), -86, i === 1 ? 7 : 4.5, 10, i === 1 ? '#f7b6cc' : '#ffd6e2', 1.1));
      [-22, 22].forEach(x => { b.cyl(x, py - 1, -80, 2, 1.6, 20, 8, '#fff2f6'); b.sphere(x, py + 20, -80, 2.4, 8, '#e89ab8', 1.3); });
      for (let x = -20; x <= 20; x += 8) O.push([x, -86, 7]);
      P.arena(b, D.L.boss[0], H(D.L.boss[0], D.L.boss[1]), D.L.boss[1], 14, '#e8d6c0', 12);
      // 陽光樹伊布的樹根
      const ex = -34, ez = -20, ey = H(ex, ez); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; b.cyl(ex + Math.cos(a) * 3, ey - 1, ez + Math.sin(a) * 3, 1.3, .7, 50, 6, '#8a6a4a', null, 0, [-Math.cos(a) * 2, -Math.sin(a) * 2]); } O.push([ex, ez, 5]);
      // 泡泡屋
      [[-24, 34], [26, 40], [22, 16], [-34, 44]].forEach(([x, z], i) => { const y = H(x, z); b.cyl(x, y - .3, z, 3, 2.6, 4, 8, ['#8ad8e8', '#ffd6a0', '#c8e8a0', '#e8b8f0'][i]); b.sphere(x, y + 3.8, z, 3, 8, '#ffffff', .7); O.push([x, z, 3.4]); });
      D.fish = []; for (let i = 0; i < 16; i++) D.fish.push([r() * 140 - 70, 6 + r() * 16, r() * 140 - 70, r() * 6, ['#ffb35c', '#5fd3c8', '#ff7f7f', '#ffe46a'][i % 4]]);
      D.dome = true;
    },
    wano(b, H, r, O, D) {
      /* ======== 和之國（正式版，立體地圖）：可以爬上天守閣的光月城、花之都的町家（可以進去的茶屋）、河上的紅色太鼓橋、千本鳥居與神社、櫻花、竹林 ======== */
      const K2 = D.K, ch = (typeof CHAPTERS !== 'undefined' ? CHAPTERS : []).find(c => c.id === 'wano') || { npcs: [], steps: [] }, st = ch.steps || [];
      const keep = [...ch.npcs.map(n => n.pos), ...(D.L.spots || []), D.L.spawn, D.L.boss, ...st.flatMap(x => [x.start, x.goal, x.pos, x.to].filter(Boolean)), ...st.flatMap(x => x.spots || [])];
      const free = (x, z, c) => !onPath(x, z, c + 3.5) && keep.every(p => Math.hypot(x - p[0], z - p[1]) > c + 5) && O.every(o => Math.hypot(x - o[0], z - o[1]) > c + o[2]) && D.ST.plats.every(p => x + c < p.x0 - 2 || x - c > p.x1 + 2 || z + c < p.z0 - 2 || z - c > p.z1 + 2) && Math.abs(z + 20) > c + 5;
      const flatOk = (x, z, c) => { let lo = 99, hi = -99; for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; for (const rr of [c * .5, c]) { const h = H(x + Math.cos(a) * rr, z + Math.sin(a) * rr); lo = Math.min(lo, h); hi = Math.max(hi, h); } } return lo > .9 && hi - lo < 3.2; };
      const ring = rs => { const out = []; rs.forEach(R => { for (let k = 0; k < 28; k++) { const a = k / 28 * 6.283 + R * .11; out.push([Math.round(Math.cos(a) * R), Math.round(Math.sin(a) * R)]); } }); return out; };
      const find = (c, rs) => ring(rs).find(([x, z]) => free(x, z, c) && flatOk(x, z, c));
      const col = (x, y, z) => { const n = hash(x, z); if (y < .9) return mix('#b8a888', '#c7b797', n); if (onPath(x, z, 3)) return mix('#a89878', '#b6a684', n); return mix('#6a9a4a', '#7aaa56', n * .6 + Math.sin(x * .12 + z * .09) * .2); };
      b.terrain(200, 80, H, col);
      const wood = '#5a3a26', white = '#f2ede2', tile = '#3a3a44', red = '#c8322b', gold = '#d9b35c';
      /* 和風屋頂：往外翹的瓦片屋頂（以兩層錯開的薄板表現屋簷上翹） */
      const jroof = (x, y, z, w, d, ry) => { b.box(x, y, z, w + 1.6, .3, d + 1.6, tile, ry); b.box(x, y + .3, z, w + .8, .5, d + .8, shade(tile, 1.1), ry); b.cyl(x, y + .8, z, Math.max(w, d) * .62, Math.max(w, d) * .12, 1.6, 4, tile, null, (ry || 0) + Math.PI / 4); b.box(x, y + 2.3, z, Math.max(w, d) * .5, .25, .4, shade(tile, .8), ry); };
      /* --- 光月城：三層天守閣，外側之字形樓梯爬到最上層 --- */
      { const c = find(13, [52, 46, 58, 40]); if (c) { const [x, z] = c, y = H(x, z) - .1;
          b.box(x, y - 1, z, 26, 4.5, 22, '#8a8478'); for (let q = 0; q < 26; q += 2) b.box(x - 13 + q + 1, y + 3.5, z + 11.05, 1.8, .9, .2, shade('#8a8478', .9 + (q % 4) * .05)); /* 石垣 */
          D.ST.walls.push({ x0: x - 13, x1: x + 13, z0: z - 11, z1: z + 11, y0: y - 1, y1: y + 2.2 }); K2.slab(b, x - 13, z - 11, x + 13, z + 11, y + 3.5, '#8a8478', .3, '#b8b0a0');
          K2.stairs(b, x - 2, z + 18, x + 2, z + 11, y, y + 3.5, 'z', '#9a9488');
          const t = [[16, 13, 4.2], [12, 10, 3.8], [8, 7, 3.4]]; let base = y + 3.5;
          t.forEach(([w, d, hgt], k) => { const top = base + hgt; b.box(x, base, z, w, hgt - .4, d, white); for (let q = -1; q <= 1; q++) b.box(x + q * w / 3.2, base + hgt * .45, z + d / 2 + .02, w / 5, hgt * .3, .1, wood); D.ST.walls.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y0: base - .5, y1: top - 1.3 }); K2.slab(b, x - w / 2 - 1.6, z - d / 2 - 1.6, x + w / 2 + 1.6, z + d / 2 + 1.6, top, tile, .4, '#4a4a54'); /* 屋簷平台比牆寬，外側樓梯的頂端可以直接走上來 */ b.box(x, top - .9, z, w + 1.8, .3, d + 1.8, tile);
            /* 外側樓梯：沿著這一層的東側或西側往上 */ const sx = k % 2 ? x - w / 2 - 1.8 : x + w / 2 + 1.8; K2.stairs(b, sx - 1.2, z + d / 2 + 1.6, sx + 1.2, z - d / 2 - 1.6, base, top, 'z', '#8a6a4a'); base = top; });
          jroof(x, base, z, 8, 7); b.box(x - 3.6, base + 2.2, z, .5, 1, .5, gold); b.box(x + 3.6, base + 2.2, z, .5, 1, .5, gold);
          O.push([x, z, .01]); } }
      /* --- 河上的紅色太鼓橋（道路跨河處） --- */
      { const bz0 = -27, bz1 = -13; for (let i = 0; i <= 14; i++) { const t = i / 14, zz = bz0 + (bz1 - bz0) * t; b.box(0, 1.3 + Math.sin(t * Math.PI) * 1.2 - .2, zz, 5, .25, 1.05, '#9a6a44'); } const bm = (bz0 + bz1) / 2; D.ST.plats.push({ x0: -2.5, x1: 2.5, z0: bz0, z1: bm, y0: 1.2, y1: 2.4, ax: 'z' }, { x0: -2.5, x1: 2.5, z0: bm, z1: bz1, y0: 2.4, y1: 1.2, ax: 'z' }); /* 拱橋：走上去會先上坡再下坡 */
        [-2.6, 2.6].forEach(xx => { for (let i = 0; i <= 7; i++) { const t = i / 7, zz = bz0 + (bz1 - bz0) * t, yy = 1.3 + Math.sin(t * Math.PI) * 1.2; b.box(xx, yy, zz, .2, 1.1, .2, red); } b.box(xx, 3.2, (bz0 + bz1) / 2, .16, .16, bz1 - bz0, red); D.ST.walls.push({ x0: xx - .15, x1: xx + .15, z0: bz0, z1: bz1, y0: 0, y1: 4 }); }); }
      /* --- 千本鳥居與神社 --- */
      { const c = find(6, [36, 44, 28, 50]); if (c) { const [x, z] = c, ry = Math.atan2(-x, -z), cs = Math.cos(ry), sn = Math.sin(ry);
          for (let k = 0; k < 9; k++) { const tx = x - sn * (k * 2.2 - 9), tz = z - cs * (k * 2.2 - 9), ty = H(tx, tz); [-1, 1].forEach(sd => b.cyl(tx + cs * sd * 1.6, ty - .2, tz - sn * sd * 1.6, .22, .2, 3.6, 8, red)); b.box(tx, ty + 3.4, tz, 4.4, .35, .5, '#2a2a2e', ry); b.box(tx, ty + 2.9, tz, 3.6, .25, .35, red, ry); }
          const sx = x + sn * 9.5, sz = z + cs * 9.5, sy = H(sx, sz); if (H(sx, sz) > .9) { b.box(sx, sy - .2, sz, 6, 3, 5, '#9a6a44', ry); jroof(sx, sy + 2.8, sz, 6, 5, ry); b.box(sx, sy - .2, sz, 6.6, .4, 5.6, '#d8d0c0', ry); O.push([sx, sz, 4]); }
          O.push([x, z, 3]); } }
      /* --- 花之都的町家：一般町家與可以進去的茶屋 --- */
      { let k = 0; ring([22, 28, 34, 40]).forEach(([x, z]) => { if (k >= 8 || !free(x, z, 4) || !flatOk(x, z, 4)) return; const y = H(x, z), ry = Math.atan2(-x, -z);
          if (k === 0) { K2.house2(b, x, z, 9, 7, y, white, tile, Math.abs(x) > Math.abs(z) ? (x > 0 ? 'x-' : 'x+') : (z > 0 ? 'z-' : 'z+')); b.box(x, y + 7.2 + 2.6, z, 3, .9, .2, red); }
          else { b.box(x, y - .3, z, 6, 3.4, 5, white, ry); const cs = Math.cos(ry), sn = Math.sin(ry); for (let q = -2; q <= 2; q++) b.box(x + cs * q * 1.2 + sn * 2.52, y + .2, z - sn * q * 1.2 + cs * 2.52, .12, 3, .08, wood, ry); b.box(x + sn * 2.55, y + 1.1, z + cs * 2.55, 5.4, .14, .1, wood, ry); jroof(x, y + 3.1, z, 6, 5, ry); b.box(x + sn * 3.2, y + 2.1, z + cs * 3.2, 1.8, .9, .1, ['#c8322b', '#3a5a9a', '#5a8a4a'][k % 3], ry); }
          O.push([x, z, k === 0 ? .01 : 4.2]); k++; }); }
      /* --- 櫻花、竹林、石燈籠 --- */
      for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = 18 + r() * 56, x = Math.cos(a) * d, z = Math.sin(a) * d; if (bad(x, z) || !free(x, z, 1.3) || H(x, z) < 1.1) continue; const y = H(x, z), k2 = r();
        if (k2 < .5) { b.cyl(x, y - .3, z, .35, .25, 3, 7, '#5a3a2a'); [[0, 3.6, 0, 2], [1.2, 3.2, .6, 1.5], [-1.1, 3.3, -.5, 1.4]].forEach(([dx, dy, dz, rr]) => b.sphere(x + dx, y + dy, z + dz, rr, 9, mix('#ffb8d0', '#ffd0e0', r()), .85, .15, i)); O.push([x, z, 1.3]); }
        else if (k2 < .75) { for (let q = 0; q < 6; q++) b.cyl(x + (r() - .5) * 2, y - .2, z + (r() - .5) * 2, .14, .12, 6 + r() * 3, 6, '#6aa04a'); O.push([x, z, 1.2]); }
        else { b.box(x, y - .2, z, .6, .8, .6, '#9a948a'); b.box(x, y + .6, z, .9, .6, .9, '#b8b0a0'); b.cyl(x, y + 1.2, z, .7, 0, .5, 4, '#7a746a', null, Math.PI / 4); O.push([x, z, .6]); } }
      P.arena(b, D.L.boss[0], H(D.L.boss[0], D.L.boss[1]), D.L.boss[1], 14, '#8a8478', 14);
    },
    _wanoOld(b, H, r, O, D) { /* 舊版和之國 */
      const col = (x, y, z) => { const n = hash(x, z); if (y < .9) return mix('#b8a888', '#c7b797', n); if (onPath(x, z, 5)) return mix('#9a8a6a', '#a89878', n); return mix('#5f7a3a', '#6f8a46', n); };
      b.terrain(200, 70, H, col);
      const wood = '#5a3a2a', roof = '#2b2f3a';
      // 町屋
      [[-22, 32, 0], [22, 38, 0], [-30, 50, .3], [30, 20, -.2], [-18, 14, 0], [18, 8, 0]].forEach(([x, z, a], i) => { const y = H(x, z); b.box(x, y - .4, z, 7, 3.6, 5.5, i % 2 ? '#e8dcc2' : '#d8ccb2', a); b.box(x, y + 1, z + 2.8, 7, .2, .3, wood, a); b.box(x, y + 3.2, z, 8.4, .5, 6.8, wood, a); b.cyl(x, y + 3.6, z, 5.4, 0, 2.4, 4, roof, null, a + Math.PI / 4); b.box(x + 2, y + 1.6, z + 2.9, 1, 1.2, .5, '#c8322b', a); O.push([x, z, 4.6]); });
      // 鳥居（通往渡口）
      [[0, 22], [0, -8], [0, -36]].forEach(([x, z]) => { const y = H(x, z); b.cyl(-4.5, y - .3, z, .45, .4, 8, 8, '#c8322b'); b.cyl(4.5, y - .3, z, .45, .4, 8, 8, '#c8322b'); b.box(0, y + 7.6, z, 12, .7, .9, '#1b1b22', 0, 1.1); b.box(0, y + 6.3, z, 10, .45, .6, '#c8322b'); O.push([-4.5, z, .8], [4.5, z, .8]); });
      // 天守閣
      const cy = H(0, -86); let lw = 30, ly = cy - 1; for (let i = 0; i < 4; i++) { b.box(0, ly, -88, lw, 6, lw * .7, i % 2 ? '#f4f2ea' : '#e8e4dc'); b.cyl(0, ly + 5.6, -88, lw * .78, lw * .42, 2.2, 4, roof, null, Math.PI / 4); ly += 7.4; lw *= .76; } b.cyl(0, ly, -88, 3, 0, 3, 4, '#c9973a', null, Math.PI / 4);
      for (let x = -14; x <= 14; x += 7) O.push([x, -88, 8]);
      P.arena(b, D.L.boss[0], H(D.L.boss[0], D.L.boss[1]), D.L.boss[1], 14, '#8a8a82', 12);
      // 櫻花樹
      for (let i = 0; i < 44; i++) { const a = r() * Math.PI * 2, d = 20 + r() * 58, x = Math.cos(a) * d, z = Math.sin(a) * d; if (bad(x, z) || Math.abs(x) < 8 || Math.hypot(x, z + 62) < 18) continue; const y = H(x, z); if (y < 1) continue; if (r() < .65) { b.cyl(x, y - .3, z, .45, .3, 3.4, 6, '#5a3a2a', null, 0, [(r() - .5), (r() - .5)]); b.sphere(x, y + 4, z, 2.4 + r(), 8, mix('#f7b6cc', '#ffd6e2', r()), .8, .25, i); O.push([x, z, 1.3]); } else { P.pine(b, x, y, z, .8 + r() * .4, '#2f5a3a'); O.push([x, z, 1.2]); } }
      // 遠方的富士山與鬼之島
      b.cyl(-110, -6, -120, 60, 6, 70, 12, '#6a7a9a', '#f4f8ff'); b.sphere(-110, 60, -120, 8, 8, '#f4f8ff', .5);
      b.sphere(90, 10, -150, 26, 9, '#3a3446', .9, .15, 3); b.sphere(82, 18, -128, 6, 6, '#1b1b22'); b.sphere(98, 18, -128, 6, 6, '#1b1b22'); b.cyl(80, 30, -150, 3, 0, 18, 5, '#3a3446', null, 0, [-6, 0]); b.cyl(100, 30, -150, 3, 0, 18, 5, '#3a3446', null, 0, [6, 0]);
      // 燈籠
      for (let z = 44; z > -40; z -= 10) [-6, 6].forEach(x => { const y = H(x, z); b.cyl(x, y - .3, z, .12, .12, 2.6, 5, '#2b2b2b'); b.cyl(x, y + 2.4, z, .5, .5, 1, 8, '#ff9a4a', '#c8322b'); });
      D.petals = true;
    },
    giant(b, H, r, O, D) {
      const col = (x, y, z) => { const n = hash(x, z); if (y < .9) return mix('#b89c6a', '#c7ab78', n); return mix('#3e6a2c', '#4f7d36', n); };
      b.terrain(200, 70, H, col);
      // 巨木
      const trees = [[-40, 10], [44, -6], [-30, -30], [34, -40], [-54, 40], [52, 34], [18, 6], [-16, -12]];
      trees.forEach(([x, z], i) => { const y = H(x, z); const s = 1 + (i % 3) * .25; b.cyl(x, y - 1, z, 3.4 * s, 2.4 * s, 20 * s, 8, '#6b4a2f'); b.sphere(x, y + 22 * s, z, 10 * s, 9, mix('#2f5d27', '#3f7a31', r()), .7, .2, i + 11); b.sphere(x + 6 * s, y + 17 * s, z + 3, 6 * s, 8, '#3a6e2e', .7, .2, i + 21); O.push([x, z, 3.8 * s]); });
      // 神木（BOSS 後方）
      const gy = H(0, -84); b.cyl(0, gy - 2, -86, 9, 6, 42, 10, '#5a3d27'); b.sphere(0, gy + 46, -86, 22, 10, '#2f5d27', .6, .15, 5); b.sphere(-16, gy + 38, -80, 12, 8, '#3a6e2e', .6, .15, 9); b.sphere(16, gy + 40, -82, 13, 8, '#356a2b', .6, .15, 13);
      for (let x = -12; x <= 12; x += 6) O.push([x, -86, 7]);
      P.arena(b, D.L.boss[0], H(D.L.boss[0], D.L.boss[1]), D.L.boss[1], 14, '#7a6a52', 12);
      // 巨獸肋骨
      for (let i = 0; i < 5; i++) { const z = 26 - i * 5, x = 44, y = H(x, z) - .5; b.cyl(x - 7, y, z, 1, .7, 12, 6, '#efe6d2', null, 0, [5, 0]); b.cyl(x + 7, y, z, 1, .7, 12, 6, '#efe6d2', null, 0, [-5, 0]); O.push([x - 7, z, 1.3]); O.push([x + 7, z, 1.3]); }
      // 巨人小屋
      [[-30, 40], [28, 48]].forEach(([x, z]) => { P.house(b, x, H(x, z), z, 11, 10, 7, '#9a7a52', '#5a4028', 0); O.push([x, z, 7.5]); });
      // 蕨類與火山
      for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = 16 + r() * 62, x = Math.cos(a) * d, z = Math.sin(a) * d; if (bad(x, z) || Math.hypot(x, z + 60) < 17 || Math.abs(x) < 6) continue; const y = H(x, z); if (y < 1) continue; if (r() < .7) b.cyl(x, y - .2, z, 1.4 + r(), 0, 1.6 + r(), 6, mix('#4f8a36', '#6aa34a', r()), null, r()); else { P.rock(b, x, y, z, .8 + r(), r, '#6b6457'); O.push([x, z, 1]); } }
      b.cyl(120, -8, -120, 50, 10, 60, 10, '#5a4a40', '#c8322b');
    }
  };

  const OPTS = {
    east: { R: 80, flats: [[0, 44, 26], [0, -58, 18, 2.2], [0, 10, 16]], hill: 1.6,
      /* 起伏的丘陵（村子與道路附近保持平坦） */ bump: (x, z) => { const v = Math.hypot(x + 2, z - 34); return (Math.sin(x * .05 + 1.2) * Math.cos(z * .045) * 2.6 + Math.sin(x * .11 - z * .08) * .9) * sm(18, 34, v); },
      /* 從東邊山坡流進海裡的小溪 */ carve: (x, z, h) => { const zc = -26 - (x - 14) * .14 + Math.sin(x * .12) * 2.2; if (x < 12) return h; const d = Math.abs(z - zc), k = 1 - sm(1.4, 4.2, d); return h * (1 - k) + Math.min(h, -1.1) * k; } },
    alabasta: { R: 80, flats: [[0, 44, 26], [0, -60, 18, 1.8], [0, 0, 14]], hill: 2.2, bump: (x, z) => Math.sin(x * .09 + z * .05) * 1.4, carve: (x, z, h) => { const d = Math.hypot(x + 18, z - 18); return d < 8 ? Math.max(.4, h - (1 - d / 8) * 2.4) : h; } }, /* 尤巴的綠洲已經乾涸：坑底高於海面，不會出現水 */
    wholecake: { R: 80, flats: [[0, 44, 26], [0, -60, 18, 2], [0, 0, 16]], hill: 1.6, bump: (x, z) => Math.sin(x * .06 - z * .05) * 1.2 },
    dressrosa: { R: 80, flats: [[0, 44, 26], [0, -60, 18, 2], [0, 0, 16]], hill: 1.8, bump: (x, z) => Math.sin(x * .07 + z * .04) * 1.1 },
    skypiea: { R: 76, flats: [[0, 44, 26], [0, -62, 18, 2.6], [0, 0, 16]], hill: 1.2 },
    dark: { R: 80, flats: [[0, 44, 24], [0, -60, 18, 2], [0, 0, 14], [0, -38, 10, 2]], hill: 1.9 },
    giant: { R: 80, flats: [[0, 44, 26], [0, -60, 18, 1.8], [0, 0, 16]], hill: 1.8 },
    enies: { R: 76, flats: [[0, 44, 26], [0, -60, 18, 2.2], [0, 0, 20], [0, -34, 12, 2]], hill: 1.2,
      /* 司法島中央的瀑布深淵：橫越全島的裂谷，只能靠吊橋通過 */ carve: (x, z, h) => { const d = Math.abs(z + 27 + Math.sin(x * .08) * 1.5); if (d > 4.5 || Math.abs(x) > 64) return h; return Math.min(h, -9 + d * .4); } },
    fishman: { R: 78, flats: [[0, 44, 26], [0, -60, 18, 1.8], [0, 0, 16]], hill: 1.6 },
    wano: { R: 80, flats: [[0, 44, 26], [0, -62, 18, 2], [0, 0, 14], [0, -40, 10, 2]], hill: 2,
      /* 花之都旁的河：從西到東流過島的中段（只在中間一段，避開兩側的任務地點） */ carve: (x, z, h) => { if (Math.abs(x) > 30) return h; const d = Math.abs(z + 20 + Math.sin(x * .1) * 2), edge = Math.min(1, (30 - Math.abs(x)) / 6), k = (1 - sm(1.5, 4.5, d)) * edge; return h * (1 - k) + Math.min(h, -1.2) * k; } }
  };
  const WATER = { east: '#2f8fbf', alabasta: '#3a8fb0', skypiea: '#f6fbff', dark: '#1f4a6a', giant: '#2e7d8f', enies: '#2a6f9a', fishman: '#1f6f8a', wano: '#2f6f7f' };

  /* 細節：草叢、花、木桶木箱、市集攤位、燈火 */
  /* 頂上戰爭篇：沿用要塞型的司法島地形 */
  queueMicrotask(() => { if (!BUILD.marineford || BUILD.marineford === BUILD.enies) BUILD.marineford = BUILD._eniesOld; OPTS.marineford = Object.assign({}, OPTS.enies, { carve: null }); WATER.marineford = WATER.enies; if (THEME.enies && !THEME.marineford) THEME.marineford = THEME.enies;
    /* 蛋糕島篇：有正式版就用自己的，否則沿用空島的舊版粉彩雲朵地形 */ if (!BUILD.wholecake || BUILD.wholecake === BUILD.skypiea) { BUILD.wholecake = BUILD._skypieaOld; OPTS.wholecake = OPTS.skypiea; } WATER.wholecake = WATER.dressrosa || WATER.skypiea; if (THEME.skypiea && !THEME.wholecake) THEME.wholecake = THEME.skypiea;
    /* v63：恐怖三桅帆船沿用蜂巢島的陰暗地形、蛋頭島沿用要塞型地形、德雷斯羅薩沿用阿拉巴斯坦的石造城鎮 */ if (BUILD.dressrosa) { WATER.dressrosa = WATER.dressrosa || WATER.alabasta; if (THEME.alabasta && !THEME.dressrosa) THEME.dressrosa = THEME.alabasta; } if (BUILD.thriller) { OPTS.thriller = OPTS.thriller || Object.assign({}, OPTS.dark); WATER.thriller = WATER.thriller || WATER.dark; if (THEME.dark && !THEME.thriller) THEME.thriller = THEME.dark; } /* 恐怖三桅帆船已有正式版場景 */
    [['thriller', 'dark'], ['egghead', 'enies'], ['dressrosa', 'alabasta']].filter(([a]) => !(a === 'thriller' && BUILD.thriller) && !(a === 'dressrosa' && BUILD.dressrosa)).forEach(([a, b]) => { BUILD[a] = a === 'dressrosa' ? BUILD._alabastaOld : a === 'egghead' ? BUILD._eniesOld : BUILD[b]; OPTS[a] = a === 'egghead' ? Object.assign({}, OPTS[b], { carve: null }) : OPTS[b]; WATER[a] = WATER[b]; if (THEME[b] && !THEME[a]) THEME[a] = THEME[b]; }); });
  const THEME = {
    east: { grass: '#5d9a3e', flower: ['#ffd26c', '#ff7f9f', '#ffffff'], stall: '#b8433a' },
    alabasta: { grass: '#8a9a4a', flower: ['#ff9a4a'], stall: '#3f6fa3', dry: true },
    skypiea: { grass: '#9ad07a', flower: ['#ffffff', '#ffe7a0', '#bfe8ff'], stall: '#8ab4d8' },
    enies: { grass: '#6d7a5a', flower: ['#e8e4dc'], stall: '#3a4a6a' },
    dark: { grass: '#6b5a40', flower: ['#e8553b'], stall: '#3a2a1a', dry: true },
    fishman: { grass: '#5fb88a', flower: ['#ff7f7f', '#ffe46a'], stall: '#e85a8a' },
    wano: { grass: '#6f8a46', flower: ['#f7b6cc', '#ffffff'], stall: '#c8322b' },
    giant: { grass: '#4f7d36', flower: ['#ffd26c', '#e8553b'], stall: '#7d5a3a' }
  };
  function detail(b, H, r, O, id) {
    const T = THEME[id] || THEME.east;
    // 彩色三角旗串
    if (id !== 'dark') { const FL = { wano: ['#c8322b', '#f4f0e4', '#1b1b1b'], fishman: ['#ff8fb8', '#8fd8ff', '#ffe46a'], skypiea: ['#ffffff', '#8fd8ff', '#ffe7a0'] }[id] || ['#e8553b', '#ffd26c', '#3fb6c9', '#6fd08c', '#b58cff'];
      [[-15, 26, 15, 26], [-13, 38, 13, 42]].forEach(([x0, z0, x1, z1]) => { if (bad((x0 + x1) / 2, (z0 + z1) / 2)) return; const y0 = H(x0, z0) + 5, y1 = H(x1, z1) + 5; b.cyl(x0, H(x0, z0) - .3, z0, .1, .1, 5.3, 4, '#5a3d27'); b.cyl(x1, H(x1, z1) - .3, z1, .1, .1, 5.3, 4, '#5a3d27');
        const n = 14; for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + .8) / n, sag = (t) => -Math.sin(t * Math.PI) * 1.2; const ax = x0 + (x1 - x0) * t0, az = z0 + (z1 - z0) * t0, ay = y0 + (y1 - y0) * t0 + sag(t0), bx = x0 + (x1 - x0) * t1, bz = z0 + (z1 - z0) * t1, by = y0 + (y1 - y0) * t1 + sag(t1), mx = (ax + bx) / 2, mz = (az + bz) / 2, my = (ay + by) / 2 - .9; const col = hex(FL[i % FL.length]); b.tri([ax, ay, az], [bx, by, bz], [mx, my, mz], col); b.tri([ax, ay, az], [mx, my, mz], [bx, by, bz], col); } }); }
    for (let i = 0; i < 260; i++) { const a = r() * Math.PI * 2, d = 10 + r() * 66, x = Math.cos(a) * d, z = Math.sin(a) * d, y = H(x, z); if (y < 1 || bad(x, z) || Math.abs(x) < 4) continue;
      if (i % 5 === 0 && !T.dry) { const c = T.flower[i % T.flower.length]; b.cyl(x, y - .1, z, .04, .04, .5, 3, '#4f8a36'); b.sphere(x, y + .5, z, .16, 5, c); }
      else b.cyl(x, y - .15, z, .35 + r() * .3, 0, .5 + r() * .5, 4, shade(T.grass, .85 + r() * .3), null, r() * 3); }
    // 村莊區：木桶、木箱、市集攤位
    const props = [[-6, 30], [6, 34], [-16, 44], [16, 46], [-4, 18], [10, 20]];
    props.forEach(([x, z], i) => { if (bad(x, z)) return; const y = H(x, z); if (y < 1) return;
      if (i % 3 === 0) { b.cyl(x, y - .1, z, .6, .55, 1.3, 8, '#8a6240', '#6b4a2f'); b.cyl(x, y + .35, z, .63, .63, .12, 8, '#3a2a1a'); O.push([x, z, .8]); }
      else if (i % 3 === 1) { b.box(x, y - .1, z, 1.2, 1.1, 1.2, '#a07a4a', r()); b.box(x + .3, y + 1, z, .9, .8, .9, '#b58d5a', r()); O.push([x, z, 1]); }
      else { b.box(x, y - .2, z, 3.2, 1.1, 1.6, '#8a6240'); [-1.4, 1.4].forEach(dx => b.cyl(x + dx, y, z - .7, .08, .08, 2.6, 4, '#5a3a2a')); b.box(x, y + 2.5, z - .2, 3.6, .15, 2.2, T.stall, 0, .9); for (let k = 0; k < 3; k++) b.sphere(x - 1 + k, y + 1.05, z, .25, 5, ['#ff9a4a', '#e8553b', '#ffd26c'][k]); O.push([x, z, 1.8]); } });
  }
  function buildScene(renderer, chapterId, clear, layout) {
    CHIMNEYS.length = 0;
    CLEAR = clear || []; CUR_PATH = layout ? layout.path : null;
    const base = OPTS[chapterId], opt = Object.assign({}, base);
    if (layout) { opt.lobes = layout.lobes || []; opt.flats = [...(base.flats || []), [layout.spawn[0], layout.spawn[1], 18], [layout.boss[0], layout.boss[1], 18, 2], ...layout.path.map(p => [p[0], p[1], 7])]; }
    const H = makeHeight(opt);
    const b = new Builder(); const O = []; ST = { plats: [], walls: [], roofs: [] }; const D = { L: layout || { boss: [0, -60], spawn: [0, 55], path: null }, K, ST }; const r = rng(chapterId.length * 7919 + chapterId.charCodeAt(0));
    BUILD[chapterId](b, H, r, O, D);
    // 路線：沿著各章的路徑鋪出貼地的道路
    if (layout && layout.path) { const RC = { east: '#c9a06a', alabasta: '#e0c080', skypiea: '#f4f7ff', enies: '#c4bcac', dark: '#6a4a32', fishman: '#efe0b8', wano: '#b09a6e', giant: '#7a6440' }[chapterId] || '#c9a06a'; const pts = layout.path, wd = 2.6;
      for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L2 = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L2 / 2)), nx = -(bz - az) / L2 * wd, nz = (bx - ax) / L2 * wd;
        for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n, x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0, x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1, y = (X, Z) => H(X, Z) + .08;
          const c = mix(RC, '#ffffff', hash(x0, z0) * .12); b.quad([x0 - nx, y(x0 - nx, z0 - nz), z0 - nz], [x0 + nx, y(x0 + nx, z0 + nz), z0 + nz], [x1 + nx, y(x1 + nx, z1 + nz), z1 + nz], [x1 - nx, y(x1 - nx, z1 - nz), z1 - nz], c); } } }
    detail(b, H, r, O, chapterId);
    if (global.LANDMARKS) LANDMARKS.build(chapterId, b, H, r, O, opt.R || 78, layout); /* 各島地標 */
    /* NPC 若被建築或樹的碰撞範圍包住，往外推到碰撞範圍外（只調整站位，劇情不變） */
    { const chd = (typeof CHAPTERS !== 'undefined' ? CHAPTERS : []).find(c => c.id === chapterId); if (chd) chd.npcs.forEach(n => { for (let k = 0; k < 3; k++) { const o = O.find(o => Math.hypot(n.pos[0] - o[0], n.pos[1] - o[1]) < o[2] + .8); if (!o) break; const dx = n.pos[0] - o[0], dz = n.pos[1] - o[1], d = Math.hypot(dx, dz) || 1; n.pos = [o[0] + dx / d * (o[2] + 1.6), o[1] + dz / d * (o[2] + 1.6)]; } }); }
    const w = new Builder(); w.grid(520, 44, 0, WATER[chapterId]);
    /* 立體結構：地面高度查詢與可走判斷 */
    const PL = ST.plats, WL = ST.walls;
    const topAt = (p, x, z) => p.ax === 'x' ? p.y0 + (p.y1 - p.y0) * ((x - p.x0) / (p.x1 - p.x0 || 1)) : p.ax === 'z' ? p.y0 + (p.y1 - p.y0) * ((z - p.z0) / (p.z1 - p.z0 || 1)) : p.y0;
    const G = (x, z, y) => { let g = H(x, z); for (const p of PL) { if (x < p.x0 || x > p.x1 || z < p.z0 || z > p.z1) continue; const t = topAt(p, x, z); if (t > g && t <= y + (p.ax ? 1.4 : .8)) g = t; } return g; }; /* 樓梯的容許高度較大：畫面卡頓、一步跨得比較遠時也不會從樓梯上掉下去 */
    const onPlat = (x, z, y) => PL.some(p => x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1 && topAt(p, x, z) <= y + .8);
    const roofs = ST.roofs.map(R => ({ x0: R.x0, z0: R.z0, x1: R.x1, z1: R.z1, mesh: renderer.mesh(R.b) }));
    const scene = { plats: PL, walls: WL, roofs, G, onPlat, chimneys: CHIMNEYS.slice(), H, obstacles: O, dyn: D, staticMesh: renderer.mesh(b), water: renderer.mesh(w), waterAlpha: chapterId === 'skypiea' ? 1 : .9, tris: b.count / 3 };
    if (D.windmills) { const bl = new Builder(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; bl.box(Math.cos(a) * 3.5, -.12, Math.sin(a) * 3.5, 7, .16, .22, '#6b4a2f', -a); bl.box(Math.cos(a) * 3.8 + Math.cos(a + 1.5708) * .7, -.06, Math.sin(a) * 3.8 + Math.sin(a + 1.5708) * .7, 5.6, .08, 1.3, '#f7f1e4', -a); for (let k = 0; k < 5; k++) bl.box(Math.cos(a) * (1.6 + k * 1.1) + Math.cos(a + 1.5708) * .7, .02, Math.sin(a) * (1.6 + k * 1.1) + Math.sin(a + 1.5708) * .7, .1, .08, 1.4, '#6b4a2f', -a); } bl.cyl(0, -.35, 0, .7, .7, .7, 12, '#8b3a2e'); scene.blade = renderer.mesh(bl); } /* 扇葉：骨架＋帆布＋橫桿 */
    if (D.fish) { const fb = new Builder(); fb.sphere(0, 0, 0, .5, 6, '#ffffff', .6); fb.cyl(-.5, -.25, 0, .02, .35, .5, 4, '#ffffff', null, 0, [-.2, 0]); scene.fishMesh = renderer.mesh(fb); }
    { const bb = new Builder(); bb.box(-.6, 0, 0, 1.2, .06, .35, '#ffffff', -.35); bb.box(.6, 0, 0, 1.2, .06, .35, '#ffffff', .35); scene.bird = renderer.mesh(bb); }
    if (D.petals) { const pb = new Builder(); pb.box(0, 0, 0, .35, .04, .25, '#ffc4d8'); scene.petal = renderer.mesh(pb); }
    // 漸層天幕與高空雲
    const env = (CHAPTERS.find(c => c.id === chapterId) || {}).env || { sky: '#9fd6f5', fog: '#bfe3f6' };
    { const sk = new Builder(), zen = shade(env.sky, chapterId === 'dark' ? .6 : .82), hor = hex(env.fog), R = 420, LAT = 14, LON = 28;
      const P = (la, lo) => { const y = la / LAT, ph = lo / LON * Math.PI * 2, e = -0.15 + y * 1.15, r = Math.cos(e * Math.PI / 2), yy = Math.sin(e * Math.PI / 2); return [Math.cos(ph) * r * R, yy * R, Math.sin(ph) * r * R]; };
      for (let la = 0; la < LAT; la++) for (let lo = 0; lo < LON; lo++) { const t = Math.max(0, (la + .5) / LAT - .08); const c = mix(hor, zen, Math.pow(t, .7)); sk.quad(P(la, lo), P(la + 1, lo), P(la + 1, lo + 1), P(la, lo + 1), c); }
      scene.sky = renderer.mesh(sk); }
    if (!D.clouds && chapterId !== 'dark' && chapterId !== 'fishman') { D.clouds = []; for (let i = 0; i < 12; i++) { const a2 = r() * Math.PI * 2, d = 70 + r() * 110; D.clouds.push([Math.cos(a2) * d, 42 + r() * 26, Math.sin(a2) * d, 6 + r() * 7, r() * 6]); } }
    if (D.clouds) { const cb = new Builder(); cb.sphere(0, 0, 0, 1, 8, '#ffffff', .55, .15, 3); cb.sphere(1.1, .1, .3, .7, 7, '#ffffff', .6, .1, 5); cb.sphere(-1, 0, -.2, .75, 7, '#ffffff', .6, .1, 8); scene.cloud = renderer.mesh(cb); }
    return scene;
  }

  global.SCENES = { buildScene, npcMesh, itemMesh, barrierMesh, beaconMesh, coneMesh, moundMesh, rng, lookScale };
})(window);
