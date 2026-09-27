/* 各篇章 3D 場景：地形、建築、植被、可動物件與碰撞 */
(function (global) {
  'use strict';
  const { Builder, M, hex, shade, mix } = E3;

  function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  let CLEAR = [];
  const bad = (x, z) => CLEAR.some(c => Math.hypot(x - c[0], z - c[1]) < (c[2] || 6));
  const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };

  /* 通用島嶼高度：陸地半徑 R，重要地點會被整平 */
  function makeHeight(opt) {
    const R = opt.R || 76, flats = opt.flats || [];
    return function (x, z) {
      const r = Math.hypot(x, z * (opt.squash || 1));
      const wob = Math.sin(Math.atan2(z, x) * 5 + 1.3) * 5 + Math.sin(Math.atan2(z, x) * 11) * 2.2;
      const land = 1 - sm(R - 12, R + 6, r + wob);
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
  const P = {
    tree(b, x, y, z, s, r, col) {
      b.cyl(x, y - .3, z, .45 * s, .3 * s, 3.2 * s, 5, '#6b4a2f');
      b.sphere(x, y + 3.6 * s, z, 2.2 * s, 7, col || mix('#3f8a3a', '#6fae44', r()), 1, .25, (r() * 9999) | 0);
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
      b.box(x, y - .4, z, w, h + .4, d, wall, ry);
      b.cyl(x, y + h, z, Math.max(w, d) * .78, 0, h * .7, 4, roof, null, (ry || 0) + Math.PI / 4);
      const c = Math.cos(ry || 0), s = Math.sin(ry || 0), fx = x + s * (d / 2 + .02), fz = z + c * (d / 2 + .02);
      b.box(fx, y, fz, w * .28, h * .55, .2, '#4a3222', ry);
    },
    fence(b, x0, z0, x1, z1, hf, col) {
      const n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) / 2.4)), ang = Math.atan2(x1 - x0, z1 - z0);
      for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; b.box(x, hf(x, z) - .2, z, .25, 1.4, .25, col); }
      for (let i = 0; i < n; i++) { const t = (i + .5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; b.box(x, hf(x, z) + .7, z, .14, .16, Math.hypot(x1 - x0, z1 - z0) / n, col, ang); }
    },
    ship(b, x, y, z, ry, s, sail) {
      b.box(x, y - 1, z, 4.2 * s, 2.6 * s, 13 * s, '#7a4b2a', ry, 1.25);
      b.box(x, y + 1.5 * s, z, 5 * s, .3 * s, 13.5 * s, '#9a6a3f', ry);
      b.cyl(x, y + 1.6 * s, z, .28 * s, .2 * s, 11 * s, 5, '#5e3b22');
      b.box(x, y + 5 * s, z, .15 * s, 5 * s, 6 * s, sail || '#f1ead8', ry + Math.PI / 2 * 0);
      b.box(x, y + 12.4 * s, z, .1 * s, 1.2 * s, 2 * s, '#1c1c22', ry);
    },
    torch(b, x, y, z) { b.cyl(x, y - .2, z, .18, .14, 2.2, 5, '#4a3222'); b.sphere(x, y + 2.3, z, .38, 6, '#ffb347'); },
    arena(b, x, y, z, R, stone, n) {
      for (let i = 0; i < (n || 10); i++) { const a = i / (n || 10) * Math.PI * 2; b.box(x + Math.cos(a) * R, y - .3, z + Math.sin(a) * R, 1.2, 2.6 + (i % 2) * 1.2, 1.2, stone, a); }
      b.cyl(x, y - .55, z, R - 1.5, R - 1.5, .6, 18, shade(stone, .85), shade(stone, 1.05));
    }
  };

  /* NPC 小人 */
  function npcMesh(renderer, look) {
    const b = new Builder();
    const L = {
      elder: { body: '#6d4c3a', leg: '#3b2c24', skin: '#e8c29a', hat: '#d9d4c8', beard: '#f2efe8' },
      worker: { body: '#3f6fa3', leg: '#2b3e59', skin: '#d9a77c', hat: '#c9973a' },
      lady: { body: '#b8433a', leg: '#6a2a26', skin: '#f0c9a4', hat: '#5a2c1c' },
      kid: { body: '#e8b33b', leg: '#355e8a', skin: '#f0c9a4', hat: '#c8322b' },
      warrior: { body: '#6b7280', leg: '#3a3f47', skin: '#c99a73', hat: '#8b1e1e', cape: '#9a2a22' },
      giant: { body: '#7d5a3a', leg: '#4a3526', skin: '#c68d62', hat: '#b48a3a', cape: '#3f6a3a' }
    }[look] || { body: '#777', leg: '#444', skin: '#e0b894', hat: '#333' };
    b.box(-.28, 0, 0, .34, 1.1, .38, L.leg); b.box(.28, 0, 0, .34, 1.1, .38, L.leg);
    if (look === 'lady') b.cyl(0, .1, 0, .75, .35, 1.9, 7, L.body); else b.box(0, 1.05, 0, 1.05, 1.15, .6, L.body, 0, .92);
    b.box(-.7, 1.05, 0, .26, 1.05, .3, L.body); b.box(.7, 1.05, 0, .26, 1.05, .3, L.body);
    if (L.cape) b.box(0, .7, -.36, 1.1, 1.5, .1, L.cape);
    b.sphere(0, 2.62, 0, .46, 8, L.skin, 1.05);
    b.box(-.15, 2.66, .42, .09, .12, .05, '#222'); b.box(.15, 2.66, .42, .09, .12, .05, '#222');
    if (L.beard) b.sphere(0, 2.35, .18, .34, 6, L.beard, 1.1);
    if (look === 'kid' || look === 'worker') { b.cyl(0, 2.92, 0, .72, .72, .08, 10, L.hat); b.cyl(0, 2.98, 0, .44, .4, .36, 8, L.hat); }
    else if (look === 'elder') b.cyl(0, 2.95, 0, .5, .2, .45, 7, L.hat);
    else if (look === 'warrior' || look === 'giant') b.box(0, 2.9, 0, .96, .32, .96, L.hat, 0, .8);
    else b.sphere(0, 2.78, -.12, .42, 7, L.hat, .9);
    return renderer.mesh(b);
  }

  function itemMesh(renderer, icon) {
    const b = new Builder();
    const c = { map: '#f2e2b3', water: '#4aa8d8', shell: '#bfe8ff', flame: '#ffb347', fruit: '#e4572e' }[icon] || '#ffd26c';
    if (icon === 'meat') { b.sphere(0, .45, 0, .55, 8, '#b5502a', .8); b.cyl(-.9, .35, 0, .12, .12, .3, 5, '#f4ead2'); b.sphere(-1.05, .5, 0, .2, 5, '#f4ead2'); b.sphere(.9, .5, 0, .2, 5, '#f4ead2'); }
    else if (icon === 'sack') { b.sphere(0, .45, 0, .55, 7, '#c9b27e', .9, .15, 3); b.cyl(0, .9, 0, .18, .12, .3, 6, '#8a6240'); }
    else if (icon === 'gold') { b.box(0, 0, 0, .9, .5, .5, '#e8c170', .4, .8); b.box(.25, .5, 0, .5, .3, .4, '#f3d36b', .2); }
    else if (icon === 'paper') { b.box(0, 0, 0, .9, .08, 1.1, '#efe2c0'); b.box(0, .09, 0, .5, .02, .5, '#8a6240'); }
    else if (icon === 'map') { b.box(0, 0, 0, 1.1, .12, .8, c); b.box(0, .12, 0, .7, .02, .5, '#9b7b4a'); }
    else if (icon === 'water') { b.cyl(0, 0, 0, .45, .38, .9, 7, c); b.cyl(0, .9, 0, .16, .14, .3, 6, '#7a5b33'); }
    else if (icon === 'shell') { b.cyl(0, 0, 0, .6, 0, .9, 9, c); b.sphere(0, .1, 0, .35, 6, '#ffffff'); }
    else if (icon === 'flame') { b.cyl(0, 0, 0, .12, .1, .8, 5, '#f4e9d0'); b.cyl(0, .8, 0, .22, 0, .55, 6, c); }
    else { b.sphere(0, .45, 0, .5, 8, c); b.box(0, .9, 0, .08, .3, .08, '#4a3a22'); b.box(.18, 1.02, 0, .3, .06, .16, '#4f8f3a'); }
    b.cyl(0, -.6, 0, .9, .9, .05, 14, '#fff6c9');
    return renderer.mesh(b);
  }

  function barrierMesh(renderer, col) { const b = new Builder(); b.cyl(0, 0, 0, 13, 13, 9, 28, col, col); return renderer.mesh(b); }

  /* ---------- 各篇章 ---------- */
  const BUILD = {
    east(b, H, r, O, D) {
      const col = (x, y, z) => { const n = hash(x, z) * .08; if (y < .9) return mix('#d9c48f', '#e6d3a0', n * 5); if (y > 3.4) return mix('#6f9c47', '#7fae52', n * 5); return mix('#5d9a3e', '#76b04b', n * 6); };
      b.terrain(200, 70, H, col);
      // 村莊房屋
      const houses = [[-22, 30, 0.3], [-30, 44, -.2], [24, 42, .5], [30, 16, 1.2], [-34, 22, 2.8], [4, 30, 0]];
      houses.forEach(([x, z, a], i) => { P.house(b, x, H(x, z), z, 5.5, 5, 3.2, i % 2 ? '#e8dcc2' : '#f1e6cf', ['#b8433a', '#3f6fa3', '#7a4b2a'][i % 3], a); O.push([x, z, 4]); });
      // 風車（塔身）
      D.windmills = [[-44, -10], [44, 0], [-14, -30]].map(([x, z]) => { const y = H(x, z); b.cyl(x, y - .4, z, 2.4, 1.5, 9, 8, '#efe5cf'); b.cyl(x, y + 8.6, z, 1.9, 0, 2.2, 8, '#8b3a2e'); O.push([x, z, 3]); return [x, y + 7.6, z + 1.8]; });
      // 碼頭與船
      for (let i = 0; i < 8; i++) { b.box(46 + i * 2.2, -.2, 44, 2.1, .35, 3.4, i % 2 ? '#8a6240' : '#7a5636'); b.box(46 + i * 2.2, -3, 42.5, .35, 3, .35, '#4a3222'); b.box(46 + i * 2.2, -3, 45.5, .35, 3, .35, '#4a3222'); }
      P.ship(b, 72, 0, 36, 0, 1, '#f1ead8'); P.ship(b, -80, 0, 20, 1.2, .8, '#d9cfb8');
      // 樹與岩石
      for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = 20 + r() * 58, x = Math.cos(a) * d, z = Math.sin(a) * d, y = H(x, z); if (bad(x, z) || y < 1.2 || Math.hypot(x, z - 40) < 22 || Math.hypot(x, z + 58) < 18 || Math.abs(x) < 6) continue; if (r() < .7) { P.tree(b, x, y, z, .8 + r() * .6, r); O.push([x, z, 1.4]); } else { P.rock(b, x, y, z, .8 + r() * 1.4, r); O.push([x, z, 1.2]); } }
      P.fence(b, -40, 52, -14, 56, H, '#8a6240'); P.fence(b, 14, 56, 40, 52, H, '#8a6240');
      // 北方岬角（BOSS 區）
      P.arena(b, 0, H(0, -58), -58, 14, '#8d8f92', 12);
      for (let i = -1; i <= 1; i += 2) P.torch(b, i * 5, H(i * 5, -42), -42);
    },
    alabasta(b, H, r, O, D) {
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
      P.arena(b, 0, H(0, -60), -60, 14, '#c9a86a', 12);
      // 岩石、仙人掌
      for (let i = 0; i < 46; i++) { const a = r() * Math.PI * 2, d = 20 + r() * 60, x = Math.cos(a) * d, z = Math.sin(a) * d; if (bad(x, z) || Math.hypot(x + 18, z - 18) < 18 || Math.hypot(x, z + 60) < 18 || Math.abs(x) < 6 || z < -70) continue; const y = H(x, z); if (r() < .5) { P.rock(b, x, y, z, 1 + r() * 2.2, r, mix('#b58d5a', '#c9a06a', r())); O.push([x, z, 1.6]); } else { b.cyl(x, y - .2, z, .5, .45, 3 + r() * 2, 6, '#5d8a3a'); b.cyl(x + .9, y + 1.4, z, .3, .3, 1.4, 5, '#5d8a3a'); O.push([x, z, .9]); } }
      // 外圍台地
      for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, x = Math.cos(a) * 92, z = Math.sin(a) * 92; b.box(x, -2, z, 16 + r() * 8, 10 + r() * 10, 12 + r() * 6, mix('#b58450', '#c79a62', r()), a); }
    },
    skypiea(b, H, r, O, D) {
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
      const col = (x, y, z) => { const n = hash(x, z); if (y < .9) return mix('#3a3346', '#453b52', n); return mix('#4a4458', '#5a5268', n * .8); };
      b.terrain(200, 70, H, col);
      // 燈塔
      const lx = -30, lz = 34, ly = H(lx, lz); b.cyl(lx, ly - .4, lz, 3, 2, 16, 10, '#d8d2c8'); b.cyl(lx, ly + 7, lz, 3.05, 2.6, 2, 10, '#9a2a22'); b.cyl(lx, ly + 15.6, lz, 2.4, 2.4, 2.4, 8, '#2a2a33'); b.cyl(lx, ly + 18, lz, 2.8, 0, 2, 8, '#9a2a22'); O.push([lx, lz, 3.5]);
      D.lighthouse = [lx, ly + 16.8, lz];
      // 尖岩與水晶
      for (let i = 0; i < 60; i++) { const a = r() * Math.PI * 2, d = 18 + r() * 62, x = Math.cos(a) * d, z = Math.sin(a) * d; if (bad(x, z) || Math.hypot(x, z + 60) < 18 || Math.abs(x) < 6 || Math.hypot(x - lx, z - lz) < 8) continue; const y = H(x, z); if (y < .6) continue; if (r() < .55) { b.cyl(x, y - .5, z, 1 + r() * 1.5, 0, 4 + r() * 7, 5, mix('#3b3548', '#565066', r())); O.push([x, z, 1.6]); } else if (r() < .5) { b.cyl(x, y - .3, z, .7, 0, 2.6 + r() * 2, 4, '#9b6bff', '#c9a8ff', r()); O.push([x, z, 1]); } else { P.rock(b, x, y, z, 1 + r() * 1.6, r, '#3f3a4c'); O.push([x, z, 1.4]); } }
      // 破碎要塞
      const fy = H(0, -60); P.arena(b, 0, fy, -60, 14, '#4a4458', 12);
      [[-16, -76, 12], [16, -76, 9], [-22, -60, 7], [22, -58, 10]].forEach(([x, z, h], i) => { b.box(x, fy - .5, z, 8, h, 3, '#3a3446', i * .3); O.push([x, z, 4]); });
      [[-10, -48], [10, -48]].forEach(([x, z]) => { const y = H(x, z); b.cyl(x, y - .3, z, .2, .2, 6, 5, '#2a2a2a'); b.box(x + 1.5, y + 4.6, z, 3, 1.8, .1, '#141418'); b.sphere(x + 1.5, y + 4.8, z + .1, .45, 6, '#e8e4dc'); });
      // 沉船
      P.ship(b, 60, -2.4, -20, .7, 1, '#3a3446'); P.ship(b, -64, -3, -30, 2.2, .9, '#2c2838');
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
      P.arena(b, 0, H(0, -60), -60, 14, '#7a6a52', 12);
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
    east: { R: 78, flats: [[0, 44, 26], [0, -58, 18, 2.2], [0, 10, 16]], hill: 1.4 },
    alabasta: { R: 80, flats: [[0, 44, 26], [0, -60, 18, 1.8], [0, 0, 14]], hill: 2.2, bump: (x, z) => Math.sin(x * .09 + z * .05) * 1.4, carve: (x, z, h) => { const d = Math.hypot(x + 18, z - 18); return d < 8 ? h - (1 - d / 8) * 2.4 : h; } },
    skypiea: { R: 76, flats: [[0, 44, 26], [0, -62, 18, 2.6], [0, 0, 16]], hill: 1.2 },
    dark: { R: 74, flats: [[0, 44, 24], [0, -60, 18, 2], [0, 0, 14]], hill: 2.4 },
    giant: { R: 80, flats: [[0, 44, 26], [0, -60, 18, 1.8], [0, 0, 16]], hill: 1.8 }
  };
  const WATER = { east: '#2f8fbf', alabasta: '#3a8fb0', skypiea: '#f6fbff', dark: '#1b1630', giant: '#2e7d8f' };

  function buildScene(renderer, chapterId, clear) {
    CLEAR = clear || [];
    const H = makeHeight(OPTS[chapterId]);
    const b = new Builder(); const O = []; const D = {}; const r = rng(chapterId.length * 7919 + chapterId.charCodeAt(0));
    BUILD[chapterId](b, H, r, O, D);
    const w = new Builder(); w.grid(520, 44, 0, WATER[chapterId]);
    const scene = { H, obstacles: O, dyn: D, staticMesh: renderer.mesh(b), water: renderer.mesh(w), waterAlpha: chapterId === 'skypiea' ? 1 : .9, tris: b.count / 3 };
    if (D.windmills) { const bl = new Builder(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; bl.box(Math.cos(a) * 3.4, -.1, Math.sin(a) * 3.4, 6.4, .2, 1.3, '#f7f1e4', -a); } bl.cyl(0, -.3, 0, .7, .7, .6, 8, '#8b3a2e'); scene.blade = renderer.mesh(bl); }
    if (D.clouds) { const cb = new Builder(); cb.sphere(0, 0, 0, 1, 8, '#ffffff', .55, .15, 3); cb.sphere(1.1, .1, .3, .7, 7, '#ffffff', .6, .1, 5); cb.sphere(-1, 0, -.2, .75, 7, '#ffffff', .6, .1, 8); scene.cloud = renderer.mesh(cb); }
    return scene;
  }

  global.SCENES = { buildScene, npcMesh, itemMesh, barrierMesh, rng };
})(window);
