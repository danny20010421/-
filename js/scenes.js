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
    ship(b, x, y, z, ry, s, sail) {
      b.box(x, y - 1, z, 4.2 * s, 2.6 * s, 13 * s, '#7a4b2a', ry, 1.25);
      b.box(x, y + 1.5 * s, z, 5 * s, .3 * s, 13.5 * s, '#9a6a3f', ry);
      b.cyl(x, y + 1.6 * s, z, .28 * s, .2 * s, 11 * s, 5, '#5e3b22');
      b.box(x, y + 5 * s, z, .15 * s, 5 * s, 6 * s, sail || '#f1ead8', ry + Math.PI / 2 * 0);
      b.box(x, y + 12.4 * s, z, .1 * s, 1.2 * s, 2 * s, '#1c1c22', ry);
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
    makino: { skin: '#f6d2b0', hair: '#2f5a3a', hs: 'short', top: '#f4f2ea', sleeve: '#f4f2ea', bottom: '#4a7a4a', legs: 'skirt', hat: 'scarf', hatC: '#e8763a', apron: '#ffffff', eye: '#3a2a20', collar: '#e8e2d4' },
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
      const ch = (global.CHAPTERS || []).find(c => c.id === 'east') || { npcs: [], steps: [] }, NP = {}; ch.npcs.forEach(n => { NP[n.id] = n.pos; });
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
    alabasta: { R: 80, flats: [[0, 44, 26], [0, -60, 18, 1.8], [0, 0, 14]], hill: 2.2, bump: (x, z) => Math.sin(x * .09 + z * .05) * 1.4, carve: (x, z, h) => { const d = Math.hypot(x + 18, z - 18); return d < 8 ? h - (1 - d / 8) * 2.4 : h; } },
    skypiea: { R: 76, flats: [[0, 44, 26], [0, -62, 18, 2.6], [0, 0, 16]], hill: 1.2 },
    dark: { R: 80, flats: [[0, 44, 24], [0, -60, 18, 2], [0, 0, 14], [0, -38, 10, 2]], hill: 1.9 },
    giant: { R: 80, flats: [[0, 44, 26], [0, -60, 18, 1.8], [0, 0, 16]], hill: 1.8 },
    enies: { R: 76, flats: [[0, 44, 26], [0, -60, 18, 2.2], [0, 0, 20], [0, -34, 12, 2]], hill: 1.2 },
    fishman: { R: 78, flats: [[0, 44, 26], [0, -60, 18, 1.8], [0, 0, 16]], hill: 1.6 },
    wano: { R: 80, flats: [[0, 44, 26], [0, -62, 18, 2], [0, 0, 14], [0, -40, 10, 2]], hill: 2 }
  };
  const WATER = { east: '#2f8fbf', alabasta: '#3a8fb0', skypiea: '#f6fbff', dark: '#1f4a6a', giant: '#2e7d8f', enies: '#2a6f9a', fishman: '#1f6f8a', wano: '#2f6f7f' };

  /* 細節：草叢、花、木桶木箱、市集攤位、燈火 */
  /* 頂上戰爭篇：沿用要塞型的司法島地形 */
  queueMicrotask(() => { BUILD.marineford = BUILD.enies; OPTS.marineford = OPTS.enies; WATER.marineford = WATER.enies; if (THEME.enies && !THEME.marineford) THEME.marineford = THEME.enies;
    /* 蛋糕島篇：沿用空島的粉彩雲朵地形 */ BUILD.wholecake = BUILD.skypiea; OPTS.wholecake = OPTS.skypiea; WATER.wholecake = WATER.skypiea; if (THEME.skypiea && !THEME.wholecake) THEME.wholecake = THEME.skypiea;
    /* v63：恐怖三桅帆船沿用蜂巢島的陰暗地形、蛋頭島沿用要塞型地形、德雷斯羅薩沿用阿拉巴斯坦的石造城鎮 */ [['thriller', 'dark'], ['egghead', 'enies'], ['dressrosa', 'alabasta']].forEach(([a, b]) => { BUILD[a] = BUILD[b]; OPTS[a] = OPTS[b]; WATER[a] = WATER[b]; if (THEME[b] && !THEME[a]) THEME[a] = THEME[b]; }); });
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
    const b = new Builder(); const O = []; const D = { L: layout || { boss: [0, -60], spawn: [0, 55], path: null } }; const r = rng(chapterId.length * 7919 + chapterId.charCodeAt(0));
    BUILD[chapterId](b, H, r, O, D);
    // 路線：沿著各章的路徑鋪出貼地的道路
    if (layout && layout.path) { const RC = { east: '#c9a06a', alabasta: '#e0c080', skypiea: '#f4f7ff', enies: '#c4bcac', dark: '#6a4a32', fishman: '#efe0b8', wano: '#b09a6e', giant: '#7a6440' }[chapterId] || '#c9a06a'; const pts = layout.path, wd = 2.6;
      for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L2 = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L2 / 2)), nx = -(bz - az) / L2 * wd, nz = (bx - ax) / L2 * wd;
        for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n, x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0, x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1, y = (X, Z) => H(X, Z) + .08;
          const c = mix(RC, '#ffffff', hash(x0, z0) * .12); b.quad([x0 - nx, y(x0 - nx, z0 - nz), z0 - nz], [x0 + nx, y(x0 + nx, z0 + nz), z0 + nz], [x1 + nx, y(x1 + nx, z1 + nz), z1 + nz], [x1 - nx, y(x1 - nx, z1 - nz), z1 - nz], c); } } }
    detail(b, H, r, O, chapterId);
    if (global.LANDMARKS) LANDMARKS.build(chapterId, b, H, r, O, opt.R || 78, layout); /* 各島地標 */
    const w = new Builder(); w.grid(520, 44, 0, WATER[chapterId]);
    const scene = { chimneys: CHIMNEYS.slice(), H, obstacles: O, dyn: D, staticMesh: renderer.mesh(b), water: renderer.mesh(w), waterAlpha: chapterId === 'skypiea' ? 1 : .9, tris: b.count / 3 };
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
