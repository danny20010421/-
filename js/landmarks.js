/* 各島地標：依原作在每座島放上一眼認得出來的建築或地形。
   放置方式：在島上（或島外海面）自動尋找不會擋到道路、任務 NPC、出生點、BOSS 位置、既有建築的空地，並加入碰撞，劇情與任務不受影響。
   由 scenes.js 的 buildScene 在建好地形後呼叫：LANDMARKS[篇章 id](建造器, 地形高度, 亂數, 碰撞清單, 尋找空地) */
(function (global) {
  const { mix, shade } = global.E3;
  /* ---------- 共用零件 ---------- */
  const ring = (b, x, y, z, R, n, w, h, d, col, phase) => { for (let i = 0; i < n; i++) { const a = (i + (phase || 0)) / n * Math.PI * 2; b.box(x + Math.cos(a) * R, y, z + Math.sin(a) * R, w, h, d, col, -a + Math.PI / 2); } };
  const dome = (b, x, y, z, r, col, top) => { b.sphere(x, y, z, r, 12, col, .9); if (top) b.cyl(x, y + r * .85, z, r * .12, 0, r * .8, 8, top); };
  const tower = (b, x, y, z, r, h, wall, roof, ry) => { b.cyl(x, y, z, r * 1.08, r, h, 12, wall); b.cyl(x, y + h, z, r * 1.25, r * 1.25, .4, 12, shade(wall, .85)); ring(b, x, y + h + .4, z, r * 1.15, 10, .5, .7, .5, shade(wall, .9)); if (roof) b.cyl(x, y + h + .4, z, r * 1.3, 0, r * 2.4, 12, roof); };
  const flag = (b, x, y, z, col) => { b.cyl(x, y, z, .08, .06, 3, 5, '#5a4a3a'); b.box(x + .7, y + 2.2, z, 1.4, .8, .06, col); };
  const stairs = (b, x, y, z, w, n, dir, col) => { for (let i = 0; i < n; i++) b.box(x, y + i * .35 - .3, z + dir * i * .7, w, .4, .7, shade(col, .9 + (i % 2) * .08)); };
  const L = { /* 每座島的地標：f(b, H, r, O, spot) */
    /* 東海：魯夫出海的岬角燈台與瑪琪諾酒館前的大招牌（岬角上的瞭望塔） */
    _eastOld(b, H, r, O, spot) { /* 東海篇已改為正式版場景（scenes.js），不再額外放地標 */
      const s = spot(.55, .82, 14, 1.2); if (s) { const [x, z] = s, y = H(x, z); tower(b, x, y - .3, z, 1.6, 8, '#f4ede0', '#c8473a'); b.box(x, y + 8.4, z, 1.6, 1.4, 1.6, '#ffe08a'); flag(b, x, y + 11.4, z, '#e8c26a'); O.push([x, z, 2.6]); }
      const t = spot(.35, .6, 12, 1.5); if (t) { const [x, z] = t, y = H(x, z); for (let i = 0; i < 3; i++) { const a = i / 3 * 6.28; b.box(x + Math.cos(a) * 2.2, y - .3, z + Math.sin(a) * 2.2, 1.6, 2.2, 1.6, '#b07a48', a); } b.box(x, y + 1.6, z, 6, .3, 6, '#9a6a44'); b.box(x, y + 1.9, z, .2, 2.4, .2, '#6a4630'); b.box(x, y + 4.2, z, 3, 1.2, .2, '#e8c26a'); O.push([x, z, 3.6]); }
    },
    /* 阿拉巴斯坦：阿爾巴那宮殿（圓頂、四座塔、階梯） */
    _alabastaOld(b, H, r, O, spot) { /* 阿拉巴斯坦已改為正式版場景 */
      const s = spot(.45, .85, 16, 1.2) || spot(.3, .9, 12, .8); if (!s) return; const [x, z, f] = s, y = H(x, z) - .4, sand = '#ecd6a8', dm = '#e8c070';
      b.box(x, y, z, 22, 3, 16, shade(sand, .92)); b.box(x, y + 3, z, 16, 6, 11, sand); b.box(x, y + 9, z, 12, 1, 8, shade(sand, .9));
      dome(b, x, y + 11, z, 4.2, '#f4e4c0', dm); [[-9, -6], [9, -6], [-9, 6], [9, 6]].forEach(([dx, dz]) => { tower(b, x + dx, y + 3, z + dz, 1.4, 8, sand, null); dome(b, x + dx, y + 11.6, z + dz, 1.6, '#f0dcb0', dm); });
      for (let i = 0; i < 6; i++) b.box(x - 6 + i * 2.4, y + 3, z + 5.7, 1.2, 4, .4, '#2a3a58'); stairs(b, x, y + .4, z + 8.5, 6, 6, 1, sand); flag(b, x, y + 15.6, z, '#4a7ad8'); O.push([x, z, 13]);
      const p = spot(.3, .6, 10, 1.3); if (p) { const [px, pz] = p, py = H(px, pz); b.cyl(px, py - .6, pz, 5, 5, .7, 20, '#3a8ab0'); b.cyl(px, py - .5, pz, 5.6, 5.6, .6, 20, '#c8b080', '#d8c090'); [0, 1, 2].forEach(i => { const a = i * 2.1; b.cyl(px + Math.cos(a) * 6.4, py, pz + Math.sin(a) * 6.4, .3, .2, 6, 5, '#7a5b33'); b.sphere(px + Math.cos(a) * 6.4, py + 6.2, pz + Math.sin(a) * 6.4, 1.8, 7, '#4f8f3a', .5); }); O.push([px, pz, 6]); }
    },
    /* 空島：黃金鐘（藤蔓巨柱上的大金鐘）與雲朵上的神殿遺跡 */
    _skypieaOld(b, H, r, O, spot) { /* 空島已改為正式版場景 */
      const s = spot(.5, .82, 16, 1.5); if (s) { const [x, z] = s, y = H(x, z) - .3; b.cyl(x, y, z, 3.4, 2.4, 14, 10, '#7a9a5a'); for (let i = 0; i < 6; i++) b.cyl(x, y + i * 2.4, z, 3.6 - i * .2, 3.4 - i * .2, .6, 10, '#5a7a3a');
        b.box(x, y + 14, z, 7, .8, 7, '#d8c8a8'); [[-2.8, -2.8], [2.8, -2.8], [-2.8, 2.8], [2.8, 2.8]].forEach(([dx, dz]) => b.cyl(x + dx, y + 14.8, z + dz, .4, .4, 6, 8, '#e8dcc0')); b.box(x, y + 20.8, z, 7.4, .8, 7.4, '#d8c8a8');
        b.cyl(x, y + 16.4, z, 2.6, 1.3, 3.8, 14, '#ffd34a', '#ffe48a'); b.cyl(x, y + 16.1, z, 2.8, 2.8, .4, 14, '#e8b830'); b.sphere(x, y + 16.4, z, .5, 6, '#c89a20'); O.push([x, z, 4.5]); }
      const t = spot(.3, .62, 12, 1.4); if (t) { const [x, z] = t, y = H(x, z) - .3; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28, h = 3 + (i % 3) * 1.5; b.cyl(x + Math.cos(a) * 5, y, z + Math.sin(a) * 5, .45, .4, h, 8, '#e8e0d0'); } b.cyl(x, y - .2, z, 6, 6, .5, 16, '#d8d0c0', '#f0e8d8'); O.push([x, z, 6]); }
    },
    /* 司法島：司法之塔與海上的正義之門 */
    enies(b, H, r, O, spot) {
      const s = null; /* 司法之塔已在正式版場景中 */ if (s) { const [x, z] = s, y = H(x, z) - .4; b.box(x, y, z, 12, 4, 10, '#c4bcac'); tower(b, x, y + 4, z, 3, 16, '#e8e2d4', '#3a5a8a'); for (let k = 0; k < 4; k++) for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; b.box(x + Math.cos(a) * 3.1, y + 7 + k * 3.4, z + Math.sin(a) * 3.1, .7, 1.2, .2, '#2a3a58', -a + 1.57); } flag(b, x, y + 27, z, '#f4f2ea'); O.push([x, z, 7]); }
      const g = spot(1.15, 1.35, 20, -99, true); if (g) { const [x, z, f] = g; const c = Math.cos(f), sn = Math.sin(f); [-1, 1].forEach(k => b.box(x + k * 9 * c, -6, z - k * 9 * sn, 5, 46, 6, '#9a9488', f)); b.box(x, 34, z, 24, 6, 6.4, '#8a847a', f); b.box(x, -6, z, 13, 40, 1.2, '#5a5a62', f); b.box(x, 38, z, 10, 3, 4, '#c9a24a', f); }
    },
    /* 恐怖三桅帆船：霍古巴克的哥德式宅邸與墓園 */
    _thrillerOld(b, H, r, O, spot) { /* 恐怖三桅帆船已改為正式版場景 */
      const s = spot(.45, .8, 16, 1.4); if (s) { const [x, z] = s, y = H(x, z) - .4, wall = '#6a5a7a', roof = '#2a2238'; b.box(x, y, z, 14, 7, 9, wall); b.cyl(x, y + 7, z, 9, 0, 5, 4, roof, null, Math.PI / 4); [[-7, -4.5], [7, -4.5], [-7, 4.5], [7, 4.5]].forEach(([dx, dz]) => tower(b, x + dx, y, z + dz, 1.5, 10, wall, roof));
        for (let i = 0; i < 5; i++) b.box(x - 5 + i * 2.5, y + 3, z + 4.6, .9, 2, .2, '#ffcf6a'); O.push([x, z, 9]); }
      const g = spot(.3, .7, 12, 1.4); if (g) { const [x, z] = g; for (let i = 0; i < 14; i++) { const gx = x + (i % 5 - 2) * 2.6 + r() * .5, gz = z + Math.floor(i / 5) * 3 - 3, gy = H(gx, gz); b.box(gx, gy - .3, gz, 1, 1.6 + r() * .6, .3, '#8a8494', r() * .2 - .1); if (i % 3 === 0) { b.box(gx, gy + .6, gz, .15, 1.5, .15, '#6a6474'); b.box(gx, gy + 1.5, gz, .8, .15, .15, '#6a6474'); } } O.push([x, z, 7]); }
    },
    /* 頂上戰爭：海軍本部大樓與處刑台 */
    _marinefordOld(b, H, r, O, spot) { /* 頂上戰爭已改為正式版場景 */
      const s = spot(.45, .8, 18, 1.4); if (s) { const [x, z] = s, y = H(x, z) - .4; b.box(x, y, z, 16, 10, 10, '#f4f2ea'); b.box(x, y + 10, z, 12, 6, 8, '#e8e6de'); b.cyl(x, y + 16, z, 3.5, 3.5, 3, 12, '#f4f2ea'); dome(b, x, y + 19, z, 3.4, '#3a6ab0');
        for (let k = 0; k < 2; k++) for (let i = 0; i < 6; i++) b.box(x - 6.2 + i * 2.5, y + 2 + k * 4, z + 5.05, 1.2, 2, .2, '#3a6ab0'); b.box(x, y + 13, z + 4.05, 5, 1.6, .2, '#3a6ab0'); O.push([x, z, 10]); }
      const t = spot(.3, .6, 12, 1.4); if (t) { const [x, z] = t, y = H(x, z); stairs(b, x, y, z - 4, 5, 8, 1, '#a8a49a'); b.box(x, y + 2.4, z + 2, 6, .6, 4, '#8a847a'); [[-2.6, 1], [2.6, 1]].forEach(([dx, dz]) => b.box(x + dx, y + 2.9, z + dz, .4, 6, .4, '#5a5048')); b.box(x, y + 8.9, z + 1, 6, .5, .5, '#5a5048'); O.push([x, z, 5]); }
    },
    /* 魚人島：龍宮城（珊瑚色城堡＋泡泡圓頂）與巨大珊瑚 */
    _fishmanOld(b, H, r, O, spot) { /* 魚人島已改為正式版場景 */
      const s = spot(.45, .8, 18, 1.2); if (s) { const [x, z] = s, y = H(x, z) - .4, pink = '#ff9ac0', gold = '#ffd34a'; b.cyl(x, y, z, 9, 7, 5, 16, '#f0d8e8'); b.cyl(x, y + 5, z, 6, 5, 6, 16, pink); dome(b, x, y + 11, z, 4.5, '#ffb8d4', gold);
        for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; tower(b, x + Math.cos(a) * 7.5, y, z + Math.sin(a) * 7.5, .9, 7 + (i % 2) * 2, '#f8e0ee', pink); } O.push([x, z, 11]); }
      for (let k = 0; k < 6; k++) { const c = spot(.25, .85, 6, 1.0); if (!c) break; const [x, z] = c, y = H(x, z), col = ['#ff7a8a', '#ffb06a', '#c87aff', '#6ad8c0'][k % 4]; for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28 + r(); b.cyl(x, y - .3, z, .35, .18, 3 + r() * 2, 6, col, null, 0, [Math.cos(a) * 1.4, Math.sin(a) * 1.4]); } b.sphere(x, y + .3, z, 1, 7, shade(col, .85), .7); O.push([x, z, 2]); }
    },
    /* 德雷斯羅薩：高台上的王宮、鬥技場、花田 */
    _dressrosaOld(b, H, r, O, spot) { /* 德雷斯羅薩已改為正式版場景 */
      const s = spot(.5, .82, 20, 1.4); if (s) { const [x, z] = s, y = H(x, z) - .4, wall = '#f4e6cc', roof = '#d8603a'; b.box(x, y, z, 18, 8, 14, '#c4a880'); b.box(x, y + 8, z, 12, 6, 9, wall); b.cyl(x, y + 14, z, 8, 0, 4, 4, roof, null, Math.PI / 4); [[-6, -4.5], [6, -4.5], [-6, 4.5], [6, 4.5]].forEach(([dx, dz]) => tower(b, x + dx, y + 8, z + dz, 1.2, 7, wall, roof)); flag(b, x, y + 18, z, '#ff6aa8'); O.push([x, z, 10]); }
      const c = spot(.3, .65, 16, 1.2); if (c) { const [x, z] = c, y = H(x, z) - .3; for (let k = 0; k < 3; k++) ring(b, x, y + k * 2.4, z, 9 - k * .3, 26, 2, 2.4, 1.4, k % 2 ? '#d8b890' : '#e8c8a0', k * .5); b.cyl(x, y - .2, z, 7.2, 7.2, .5, 24, '#c8a070', '#d8b080'); O.push([x, z, 10]); }
      const f = spot(.25, .8, 8, 1.2); if (f) { const [x, z] = f; for (let i = 0; i < 40; i++) { const fx = x + (r() - .5) * 10, fz = z + (r() - .5) * 8; b.sphere(fx, H(fx, fz) + .3, fz, .35, 5, ['#ff6aa8', '#ffd34a', '#ff8a3a', '#ffffff'][i % 4], .8, .2, i); } }
    },
    /* 蛋糕島：萬國城堡（層層蛋糕）與糖果樹 */
    _wholecakeOld(b, H, r, O, spot) { /* 蛋糕島已改為正式版場景 */
      const s = spot(.45, .8, 18, 1.4); if (s) { const [x, z] = s, y = H(x, z) - .4; const layers = [['#f8e0c8', 9, 4], ['#ffb8d0', 7.5, 3.6], ['#f8e8f0', 6, 3.2], ['#c87a5a', 4.5, 3]]; let yy = y; layers.forEach(([c, R, h]) => { b.cyl(x, yy, z, R, R, h, 20, c); b.cyl(x, yy + h - .3, z, R + .3, R + .3, .5, 20, '#ffffff'); yy += h; });
        for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; b.sphere(x + Math.cos(a) * 9.2, y + 4.2, z + Math.sin(a) * 9.2, .6, 6, '#ff4a6a'); } tower(b, x, yy, z, 1.6, 5, '#ffe8f0', '#ff6a9a'); O.push([x, z, 10]); }
      for (let k = 0; k < 6; k++) { const c = spot(.25, .85, 6, 1.2); if (!c) break; const [x, z] = c, y = H(x, z); b.cyl(x, y - .3, z, .3, .25, 3.4, 8, '#ffffff'); for (let i = 0; i < 4; i++) b.cyl(x, y + .2 + i * .8, z, .32, .32, .3, 8, '#ff4a6a'); b.sphere(x, y + 4.4, z, 1.8, 10, ['#ff9ac0', '#9ad8ff', '#ffe08a'][k % 3], .9); O.push([x, z, 1.6]); }
    },
    /* 和之國：花之都的五重塔、海上的鬼之島骷髏頭 */
    wano(b, H, r, O, spot) {
      const s = spot(.45, .8, 12, 1.4); if (s) { const [x, z] = s, y = H(x, z) - .3; b.box(x, y, z, 7, 1, 7, '#8a7a6a'); for (let i = 0; i < 5; i++) { const w = 6 - i * .8, yy = y + 1 + i * 3.2; b.box(x, yy, z, w * .7, 2.4, w * .7, '#c84a3a'); b.cyl(x, yy + 2.3, z, w * .82, w * .2, 1.1, 4, '#3a3a40', null, Math.PI / 4); } b.cyl(x, y + 17.4, z, .2, .1, 4, 6, '#c9a24a'); O.push([x, z, 4.5]); }
      const k = spot(1.18, 1.38, 26, -99, true); if (k) { const [x, z, f] = k, c = Math.cos(f), sn = Math.sin(f); b.sphere(x, -4, z, 14, 14, '#6a5a52', 1.05, .1); b.sphere(x - 5 * c, 6, z + 5 * sn, 3.2, 8, '#1a1418'); b.sphere(x + 5 * c, 6, z - 5 * sn, 3.2, 8, '#1a1418'); b.cyl(x + 9 * c, 10, z - 9 * sn, 2, .3, 9, 8, '#e8dcc8', null, 0, [3 * c, -3 * sn]); b.cyl(x - 9 * c, 10, z + 9 * sn, 2, .3, 9, 8, '#e8dcc8', null, 0, [-3 * c, 3 * sn]); }
    },
    /* 蜂巢島：骷髏造型的海賊要塞與海賊學校 */
    dark(b, H, r, O, spot) {
      const s = spot(.45, .8, 16, 1.4); if (s) { const [x, z] = s, y = H(x, z) - .4; b.box(x, y, z, 14, 6, 10, '#4a4048'); b.sphere(x, y + 9, z, 6.5, 14, '#d8ccc0', .95); b.sphere(x - 2.4, y + 9.6, z + 5.2, 1.6, 8, '#1a1418'); b.sphere(x + 2.4, y + 9.6, z + 5.2, 1.6, 8, '#1a1418'); b.box(x, y + 4.8, z + 5.6, 4, 1.6, .6, '#e8dcc8');
        tower(b, x - 8, y, z, 1.4, 11, '#3a3440', '#1a1418'); tower(b, x + 8, y, z, 1.4, 11, '#3a3440', '#1a1418'); flag(b, x, y + 15.5, z, '#1a1418'); O.push([x, z, 9]); }
    },
    /* 蛋頭島：蛋形研究所圓頂、未來塔、漂浮的龐克記錄 */
    egghead(b, H, r, O, spot) {
      const s = spot(.45, .8, 16, 1.4); if (s) { const [x, z] = s, y = H(x, z) - .4; b.cyl(x, y, z, 9, 8, 2, 20, '#e8f0f8'); b.sphere(x, y + 6, z, 8, 18, '#f8fbff', 1.3); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; b.box(x + Math.cos(a) * 7.4, y + 4, z + Math.sin(a) * 7.4, 1.2, 4, .3, '#5ac8f0', -a + 1.57); }
        b.cyl(x, y + 16, z, 1.2, .8, 4, 10, '#d8e8f8'); b.sphere(x, y + 22, z, 4, 14, '#ff9ac0', .85); b.sphere(x + 1.4, y + 22.6, z + 1, 2, 8, '#ff7aa8'); O.push([x, z, 10]); }
      for (let k = 0; k < 3; k++) { const t = spot(.3, .8, 8, 1.2); if (!t) break; const [x, z] = t, y = H(x, z) - .3; b.cyl(x, y, z, 1.6, 1.2, 10 + k * 3, 12, '#e8f0f8'); b.cyl(x, y + 10 + k * 3, z, 2.2, 2.2, .6, 12, '#5ac8f0'); b.sphere(x, y + 11 + k * 3, z, 1.4, 10, '#bfefff'); O.push([x, z, 2.4]); }
    },
    /* 巨人島：寶樹亞當與巨人的村落 */
    giant(b, H, r, O, spot) {
      const s = spot(.45, .78, 22, 1.4); if (s) { const [x, z] = s, y = H(x, z) - .5; b.cyl(x, y, z, 5, 3.4, 26, 14, '#6a4a30'); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; b.cyl(x + Math.cos(a) * 4, y - .5, z + Math.sin(a) * 4, 1.8, .6, 4, 7, '#5a3e28', null, 0, [Math.cos(a) * 2.5, Math.sin(a) * 2.5]); }
        [[0, 30, 0, 12], [-8, 26, 4, 8], [8, 27, -3, 8.5], [3, 34, 6, 7], [-4, 33, -6, 7]].forEach(([dx, dy, dz, R]) => b.sphere(x + dx, y + dy, z + dz, R, 12, mix('#3f7a3a', '#5a9a44', r()), .7, .2, (r() * 999) | 0)); O.push([x, z, 7]); }
      for (let k = 0; k < 2; k++) { const t = spot(.3, .8, 14, 1.3); if (!t) break; const [x, z] = t, y = H(x, z) - .4; b.box(x, y, z, 10, 8, 8, '#a88a68'); b.cyl(x, y + 8, z, 8, 0, 5, 4, '#6a5a3a', null, Math.PI / 4); b.box(x, y, z + 4.05, 3, 5, .3, '#5a3e28'); O.push([x, z, 7]); }
    }
  };
  /* 尋找空地：在半徑範圍內找一個遠離道路、NPC、出生點、BOSS、既有碰撞物的位置 */
  function finder(chapterId, H, R, O, layout, rnd) {
    const ch = (typeof CHAPTERS !== 'undefined' ? CHAPTERS : []).find(c => c.id === chapterId) || {}, npcs = (ch.npcs || []).map(n => n.pos), path = (layout && layout.path) || [], spawn = (layout && layout.spawn) || [0, 55], boss = (layout && layout.boss) || [0, -60];
    const steps = (ch.steps || []).flatMap(s => [s.pos, s.to, s.goal, s.start].filter(Boolean)).concat((ch.steps || []).flatMap(s => s.spots || []));
    const pd = (x, z) => { let d = 1e9; for (let i = 0; i < path.length - 1; i++) { const a = path[i], c = path[i + 1], dx = c[0] - a[0], dz = c[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); d = Math.min(d, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)); } return d; };
    const taken = [];
    return (r0, r1, clear, minH, sea) => {
      for (let k = 0; k < 400; k++) { const a = rnd() * Math.PI * 2, rr = R * (r0 + rnd() * (r1 - r0)), x = Math.cos(a) * rr, z = Math.sin(a) * rr, h = H(x, z);
        if (!sea && h < minH) continue; if (sea && h > -1.5) continue;
        if (!sea && (pd(x, z) < clear + 6 || Math.hypot(x - spawn[0], z - spawn[1]) < clear + 16 || Math.hypot(x - boss[0], z - boss[1]) < clear + 18 || npcs.some(p => Math.hypot(x - p[0], z - p[1]) < clear + 8) || steps.some(p => Math.hypot(x - p[0], z - p[1]) < clear + 6) || O.some(o => Math.hypot(x - o[0], z - o[1]) < clear + o[2]))) continue;
        if (!sea) { let rough = 0; for (let i = 0; i < 6; i++) { const q = i / 6 * 6.28; rough = Math.max(rough, Math.abs(H(x + Math.cos(q) * clear * .6, z + Math.sin(q) * clear * .6) - h)); } if (rough > 3.5) continue; }
        if (taken.some(t => Math.hypot(x - t[0], z - t[1]) < clear + t[2])) continue; taken.push([x, z, clear]); PLACED.push([x, z, clear]); return [x, z, Math.atan2(-x, -z)]; }
      return null;
    };
  }
  const PLACED = [];
  global.LANDMARKS = { placed: PLACED, build(chapterId, b, H, r, O, R, layout) { PLACED.length = 0; const f = L[chapterId]; if (!f) return; try { f(b, H, r, O, finder(chapterId, H, R, O, layout, r)); } catch (e) { console.warn('地標建立失敗', chapterId, e); } } };
})(window);
