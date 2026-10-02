/* 東海・風車村（Three.js 版 3D 場景樣板）
   卡通分階光影＋外框描邊、即時柔邊陰影、風格化天空與雲、海面（波浪、淺灘透色、岸邊浪花、天空反射）、
   會擺動的草地與花、細節豐富的民宅（石基、木架、瓦片屋頂、窗框與窗台花、煙囪冒煙）、起伏地形（岬角懸崖、小溪與木橋）、
   HD-2D 立繪角色（受場景光照、投射剪影陰影、腳下接觸陰影），泛光＋ACES 色調＋調色、多重取樣抗鋸齒。 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const cv = document.getElementById('hdCanvas');
/* ?q=low：低畫質（測試或低階裝置用） */ const LOW = new URLSearchParams(location.search).get('q') === 'low';
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(LOW ? 1 : Math.min(2, devicePixelRatio || 1)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xa9d2f2, 150, 520);
const camera = new THREE.PerspectiveCamera(52, 1, .3, 1600);

/* ---------------- 亂數、雜訊 ---------------- */
let seed = 20261003; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; const rr = (a, b) => a + rnd() * (b - a);
const h2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const n2 = (x, y) => { const i = Math.floor(x), j = Math.floor(y), f = x - i, g = y - j, u = f * f * (3 - 2 * f), v = g * g * (3 - 2 * g); return (h2(i, j) * (1 - u) + h2(i + 1, j) * u) * (1 - v) + (h2(i, j + 1) * (1 - u) + h2(i + 1, j + 1) * u) * v; };
const fbm = (x, y) => n2(x, y) * .5 + n2(x * 2.1, y * 2.1) * .25 + n2(x * 4.3, y * 4.3) * .125 + n2(x * 8.7, y * 8.7) * .0625;
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const C = h => new THREE.Color(h);

/* ---------------- 共用 uniform、材質 ---------------- */
const U = { uTime: { value: 0 }, uWind: { value: 1 }, uRim: { value: new THREE.Color(1, .95, .85) }, uRimK: { value: .35 } };
const grad = (() => { const t = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 215, 215, 215, 255, 255, 255, 255, 255]), 4, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; })();
const WIND_VS = `
  vec4 _wp = modelMatrix * vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    _wp = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
  #endif
  float _ws = sin(uTime*1.6 + _wp.x*.35 + _wp.z*.27)*.6 + sin(uTime*2.7 + _wp.x*.9)*.25;
  transformed.x += _ws * aWindW * uWind; transformed.z += _ws * .6 * aWindW * uWind;`;
/* 卡通材質：分階光影＋邊緣光，可選擇是否隨風擺動 */
function toon(o = {}) {
  const m = new THREE.MeshToonMaterial({ vertexColors: o.vc !== false, color: o.color || 0xffffff, gradientMap: grad, side: o.side || THREE.FrontSide, map: o.map || null, alphaTest: o.alphaTest || 0, transparent: !!o.transparent });
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\nuniform float uTime, uWind;\n${o.wind ? (o.grass ? 'varying float vGy;' : 'attribute float wind;') : ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${o.wind ? (o.grass ? 'float aWindW = position.y*position.y*.55; vGy = position.y;' : 'float aWindW = wind;') + WIND_VS : ''}`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nuniform vec3 uRim; uniform float uRimK;\n${o.grass ? 'varying float vGy;' : ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${o.grass ? 'diffuseColor.rgb *= mix(.42, 1.02, clamp(vGy,0.,1.));' : ''}`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>\n float _rim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 3.0); gl_FragColor.rgb += uRim * _rim * uRimK;`);
  };
  m.customProgramCacheKey = () => (o.wind ? 'w' : '') + (o.grass ? 'g' : '');
  return m;
}
/* 外框描邊：把模型沿法線往外推、只畫背面 */
function outlineMat(thick, color, wind) {
  return new THREE.ShaderMaterial({ side: THREE.BackSide, fog: true,
    uniforms: Object.assign(THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uThick: { value: thick }, uCol: { value: new THREE.Color(color) } }]), { uTime: U.uTime, uWind: U.uWind }),
    vertexShader: `uniform float uThick; uniform float uTime, uWind;\n${wind ? 'attribute float wind;' : ''}\n#include <fog_pars_vertex>\nvoid main(){ vec3 transformed = position; ${wind ? 'float aWindW = wind;' + WIND_VS : ''}\n vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0); float d = -mvPosition.z; vec3 n = normalize(normalMatrix * normal); mvPosition.xyz += n * uThick * (1.0 + d*.012); gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}`,
    fragmentShader: `uniform vec3 uCol;\n#include <fog_pars_fragment>\nvoid main(){ gl_FragColor = vec4(uCol, 1.0);\n#include <fog_fragment>\n}` });
}

/* ---------------- 幾何工具：上色、合併 ---------------- */
const parts = { static: [], tree: [], glow: [], cloth: [] };
/* 把一個幾何加上顏色與風力屬性，套上位置／旋轉／縮放後收集起來 */
function put(list, geo, color, o = {}) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone(); g.deleteAttribute('uv'); const m = new THREE.Matrix4().compose(new THREE.Vector3(...(o.p || [0, 0, 0])), new THREE.Quaternion().setFromEuler(new THREE.Euler(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ')), new THREE.Vector3(...(Array.isArray(o.s) ? o.s : [o.s || 1, o.s || 1, o.s || 1]))); g.applyMatrix4(m);
  const n = g.attributes.position.count, col = new Float32Array(n * 3), w = new Float32Array(n); const c = color instanceof THREE.Color ? color : C(color);
  for (let i = 0; i < n; i++) { const v = o.vary ? 1 + (rnd() - .5) * o.vary : 1; col[i * 3] = c.r * v; col[i * 3 + 1] = c.g * v; col[i * 3 + 2] = c.b * v; w[i] = typeof o.w === 'function' ? o.w(g.attributes.position.getY(i)) : (o.w || 0); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('wind', new THREE.BufferAttribute(w, 1)); list.push(g); return g;
}
const BOX = (w, h, d) => new THREE.BoxGeometry(w, h, d);
function addMerged(list, mat, o = {}) { if (!list.length) return null; const g = mergeGeometries(list, false); g.computeBoundingSphere(); const m = new THREE.Mesh(g, mat); m.castShadow = o.cast !== false; m.receiveShadow = true; scene.add(m);
  if (o.outline) { const ol = new THREE.Mesh(g, outlineMat(o.outline, o.outCol || 0x2a1e24, o.wind)); scene.add(ol); outlines.push(ol); } return m; }
const outlines = [];

/* ---------------- 地形 ---------------- */
const WORLD = 240, GN = 300, VILLAGE = [0, 14], CAPE = [-4, -64];
const PATH = [[2, 60], [0, 44], [-2, 26], [0, 10], [7, -6], [5, -26], [-2, -44], [-4, -58]];
const STREAM = [[34, -4], [42, 6], [48, 16], [52, 28], [58, 40], [70, 46]];
const distSeg = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
const polyD = (P, x, z) => { let d = 1e9; for (let i = 0; i < P.length - 1; i++) d = Math.min(d, distSeg(x, z, P[i], P[i + 1])); return d; };
function height(x, z) {
  const ang = Math.atan2(z, x), r = Math.hypot(x, z * .92) + (fbm(Math.cos(ang) * 2 + 3, Math.sin(ang) * 2 + 3) - .45) * 26;
  let h = (1 - sm(54, 84, r)) * 4.6 - 2.2;
  h += (fbm(x * .022 + 7, z * .022 + 2) - .35) * 9 * sm(78, 34, r);            /* 大片起伏的丘陵 */
  h += (fbm(x * .09, z * .09) - .5) * 1.1 * sm(80, 50, r);                       /* 小起伏 */
  const cape = Math.hypot(x - CAPE[0], (z - CAPE[1]) * .8); h += 17 * sm(36, 6, cape);   /* 北邊岬角高地 */
  if (z < CAPE[1] - 6) h -= sm(CAPE[1] - 8, CAPE[1] - 22, z) * 22 * sm(40, 10, Math.abs(x - CAPE[0])); /* 岬角北側的懸崖 */
  const east = Math.hypot(x - 34, z + 8); h += 8 * sm(32, 6, east);             /* 東側風車山坡 */
  const vil = Math.hypot(x - VILLAGE[0], z - VILLAGE[1]); h = h * (1 - sm(28, 14, vil)) + 2.6 * sm(28, 14, vil);
  const pd = polyD(PATH, x, z); h = h - .4 * sm(3.4, .4, pd);
  const sd = polyD(STREAM, x, z); h = h * (1 - sm(5, 1.2, sd)) + Math.min(h, -.9) * sm(5, 1.2, sd);   /* 小溪 */
  const dock = Math.hypot(x - 2, z - 64); h = h * (1 - sm(16, 5, dock)) + .9 * sm(16, 5, dock);
  return h;
}
const HD = new Float32Array(GN * GN); for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) HD[j * GN + i] = height(-WORLD / 2 + i / (GN - 1) * WORLD, -WORLD / 2 + j / (GN - 1) * WORLD);
const hAt = (x, z) => { const fx = (x / WORLD + .5) * (GN - 1), fz = (z / WORLD + .5) * (GN - 1), i = Math.max(0, Math.min(GN - 2, Math.floor(fx))), j = Math.max(0, Math.min(GN - 2, Math.floor(fz))), u = fx - i, v = fz - j; return (HD[j * GN + i] * (1 - u) + HD[j * GN + i + 1] * u) * (1 - v) + (HD[(j + 1) * GN + i] * (1 - u) + HD[(j + 1) * GN + i + 1] * u) * v; };
const slopeAt = (x, z) => Math.hypot(hAt(x + .7, z) - hAt(x - .7, z), hAt(x, z + .7) - hAt(x, z - .7)) / 1.4;
{
  const g = new THREE.PlaneGeometry(WORLD, WORLD, GN - 1, GN - 1); g.rotateX(-Math.PI / 2); const P = g.attributes.position, col = new Float32Array(P.count * 3);
  const K = { sand: C('#ecd9a0'), wet: C('#c7ac76'), grass: C('#5fae46'), grass2: C('#3f9038'), meadow: C('#86c456'), rock: C('#9a8f86'), cliff: C('#857a70'), dirt: C('#c49b6a') };
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), h = height(x, z); P.setY(i, h);
    const sl = slopeAt(x, z), c = new THREE.Color(); if (h < .2) c.copy(K.wet); else if (h < 1.2) c.copy(K.sand).lerp(K.grass, sm(.8, 1.2, h)); else c.copy(K.grass).lerp(K.grass2, fbm(x * .06, z * .06)).lerp(K.meadow, sm(.55, .8, fbm(x * .03 + 5, z * .03)) * .6);
    c.lerp(K.dirt, sm(2.8, .6, polyD(PATH, x, z)) * (h > .9 ? 1 : 0)); c.lerp(K.cliff, sm(.55, .95, sl)); c.lerp(K.rock, sm(1.1, 1.6, sl) * .7);
    const v = .94 + fbm(x * .4, z * .4) * .12; col[i * 3] = c.r * v; col[i * 3 + 1] = c.g * v; col[i * 3 + 2] = c.b * v; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); const m = new THREE.Mesh(g, toon()); m.receiveShadow = true; m.castShadow = true; scene.add(m);
}
const solids = []; /* [x, z, 半徑, 高度] */

/* ---------------- 民宅（細節版） ---------------- */
const PAL = { plaster: ['#f4ead2', '#efe0c0', '#f6f0e2', '#eadcc4'], beam: '#6a4630', stone: ['#b9ada0', '#a89c90', '#c4b8aa'], roofs: ['#c8473a', '#3f72b8', '#e08a3a', '#5a8a4a', '#b5543c', '#4a68a8'], shutters: ['#3f72b8', '#5a8a4a', '#c8473a', '#e0a83a'], flowers: ['#ff6a8a', '#ffd34a', '#ffffff', '#c86aff', '#ff8a3a'] };
const smokeSrc = [];
function house(x, z, ry, w, d, h, k, o = {}) {
  const y0 = hAt(x, z) - .25, cs = Math.cos(ry), sn = Math.sin(ry); const L = (lx, ly, lz) => [x + lx * cs + lz * sn, y0 + ly, z - lx * sn + lz * cs];
  const S = parts.static, G = parts.glow, plaster = o.plaster || PAL.plaster[k % 4], roof = o.roof || PAL.roofs[k % 6], shut = PAL.shutters[k % 4];
  /* 石頭地基：一顆顆深淺不同的石塊 */
  for (let side = 0; side < 4; side++) { const len = side % 2 ? d : w, n = Math.max(2, Math.round(len / .9)); for (let i = 0; i < n; i++) { const t = (i + .5) / n - .5, lx = side === 0 ? t * w : side === 2 ? -t * w : side === 1 ? w / 2 : -w / 2, lz = side === 1 ? t * d : side === 3 ? -t * d : side === 0 ? d / 2 : -d / 2;
    put(S, BOX(len / n * .96, .62, .55), PAL.stone[(i + side) % 3], { p: L(lx, .31, lz), ry: ry + (side % 2 ? Math.PI / 2 : 0), vary: .08 }); } }
  put(S, BOX(w, h - .5, d), plaster, { p: L(0, .5 + (h - .5) / 2, 0), ry });
  /* 木頭骨架：轉角柱、中間橫樑、長邊斜撐 */
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => put(S, BOX(.3, h - .4, .3), PAL.beam, { p: L(a * w / 2, .4 + (h - .4) / 2, b * d / 2), ry }));
  [.5 + (h - .5) * .5, h].forEach(yy => { put(S, BOX(w + .12, .22, .26), PAL.beam, { p: L(0, yy, d / 2 + .02), ry }); put(S, BOX(w + .12, .22, .26), PAL.beam, { p: L(0, yy, -d / 2 - .02), ry }); put(S, BOX(.26, .22, d + .12), PAL.beam, { p: L(w / 2 + .02, yy, 0), ry }); put(S, BOX(.26, .22, d + .12), PAL.beam, { p: L(-w / 2 - .02, yy, 0), ry }); });
  [-1, 1].forEach(sd => { const bl = Math.hypot(w * .3, (h - .5) * .45); put(S, BOX(.18, bl, .16), PAL.beam, { p: L(sd * w * .33, .5 + (h - .5) * .75, -d / 2 - .06), ry, rz: sd * .7 }); });
  /* 門：門框、木門、石階、門燈 */
  put(S, BOX(1.5, 2.5, .2), PAL.beam, { p: L(0, 1.25 + .5, d / 2 + .06), ry }); put(S, BOX(1.1, 2.2, .14), '#8a5a38', { p: L(0, 1.1 + .5, d / 2 + .12), ry }); put(S, BOX(1.8, .3, .9), PAL.stone[0], { p: L(0, .2, d / 2 + .5), ry });
  put(G, BOX(.32, .42, .32), '#ffb24a', { p: L(1.05, 2.6, d / 2 + .38), ry }); put(S, BOX(.4, .1, .4), PAL.beam, { p: L(1.05, 2.86, d / 2 + .38), ry });
  /* 窗：窗框、發光玻璃、百葉窗、窗台花箱 */
  const win = (lx, ly, lz, face) => { const fr = face, P = (ox, oy, oz) => L(lx + ox * Math.cos(fr) + oz * Math.sin(fr), ly + oy, lz - ox * Math.sin(fr) + oz * Math.cos(fr));
    put(S, BOX(1.15, 1.05, .14), PAL.beam, { p: P(0, 0, .05), ry: ry + fr }); put(G, BOX(.86, .78, .06), '#ffcf7a', { p: P(0, 0, .1), ry: ry + fr }); put(S, BOX(.08, .78, .1), PAL.beam, { p: P(0, 0, .13), ry: ry + fr }); put(S, BOX(.86, .08, .1), PAL.beam, { p: P(0, 0, .13), ry: ry + fr });
    [-1, 1].forEach(s => put(S, BOX(.5, 1.05, .08), shut, { p: P(s * .85, 0, .12), ry: ry + fr }));
    put(S, BOX(1.2, .28, .34), '#8a5a38', { p: P(0, -.66, .24), ry: ry + fr }); for (let f = 0; f < 5; f++) put(S, new THREE.IcosahedronGeometry(.15, 0), PAL.flowers[(f + k) % 5], { p: P(-.45 + f * .22, -.42, .26), vary: .1 }); };
  win(-w * .3, .5 + (h - .5) * .55, d / 2, 0); win(w * .3, .5 + (h - .5) * .55, d / 2, 0); win(0, .5 + (h - .5) * .55, -d / 2, Math.PI); win(w / 2, .5 + (h - .5) * .55, 0, Math.PI / 2);
  /* 瓦片屋頂：一排排交錯的瓦片、屋脊、山牆 */
  const rh = h * .55, over = .55, hw = w / 2 + over, hd = d / 2 + over, slope = Math.atan2(rh, hd), sl = Math.hypot(rh, hd), rows = Math.max(4, Math.round(sl / .55)), rc = C(roof);
  [-1, 1].forEach(sd => { for (let r = 0; r < rows; r++) { const t = (r + .5) / rows, cols = Math.max(4, Math.round(hw * 2 / .7)); const shade = rc.clone().multiplyScalar(.82 + (r % 2) * .1);
      for (let c = 0; c < cols; c++) { const lx = -hw + (c + .5 + (r % 2) * .5) / cols * hw * 2; if (lx > hw) continue; put(S, BOX(hw * 2 / cols * .98, .12, sl / rows * 1.25), shade, { p: L(lx, h + rh * (1 - t) + .08, sd * hd * t), ry, rx: sd * slope, vary: .12 }); } } });
  put(S, BOX(w + over * 2 + .1, .3, .36), C(roof).multiplyScalar(.7), { p: L(0, h + rh + .14, 0), ry });
  [-1, 1].forEach(sd => { const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, -d / 2, 0, 0, d / 2, 0, rh, 0]), 3)); tri.computeVertexNormals(); const gg = put(S, tri, plaster, { p: L(sd * (w / 2), h, 0), ry: ry + (sd > 0 ? 0 : Math.PI) }); });
  /* 煙囪 */ if (o.chimney !== false) { put(S, BOX(.8, rh + 1.4, .8), PAL.stone[1], { p: L(w * .28, h + (rh + 1.4) / 2, -d * .2), ry, vary: .06 }); put(S, BOX(1, .2, 1), PAL.stone[2], { p: L(w * .28, h + rh + 1.45, -d * .2), ry }); smokeSrc.push(L(w * .28, h + rh + 1.6, -d * .2)); }
  solids.push([x, z, Math.max(w, d) * .62, h + rh + 1]);
}
[[10, 6, -.45, 0], [13, 24, .2, 1], [-17, 4, .9, 2], [4, 32, 3.0, 3], [-5, 0, .05, 4], [19, 13, -1.15, 5], [-16, 30, 2.5, 1]].forEach(([x, z, r, k]) => house(x, z, r, 5.4, 4.4, 3.4, k));
/* 瑪琪諾的酒館「PARTYS BAR」：兩層樓、陽台、招牌、戶外桌椅與木桶 */
{ const x = -9, z = 18, ry = .35; house(x, z, ry, 8.5, 6.2, 4.4, 0, { plaster: '#f2dfb8', roof: '#b03a30' }); const y0 = hAt(x, z) - .25, cs = Math.cos(ry), sn = Math.sin(ry), L = (lx, ly, lz) => [x + lx * cs + lz * sn, y0 + ly, z - lx * sn + lz * cs];
  put(parts.static, BOX(3.2, 1.1, .16), '#7a4a2a', { p: L(-2.4, 3.6, 3.35), ry }); put(parts.static, BOX(2.8, .7, .1), '#f2c46a', { p: L(-2.4, 3.6, 3.45), ry });
  for (let t = 0; t < 2; t++) { const tx = 2.2 + t * 2.6, tz = 5.8; put(parts.static, new THREE.CylinderGeometry(.75, .75, .12, 14), '#9a6a44', { p: L(tx, 1.05, tz), ry }); put(parts.static, new THREE.CylinderGeometry(.1, .14, 1, 6), '#6a4630', { p: L(tx, .5, tz), ry });
    [-1, 1].forEach(s => put(parts.static, BOX(.5, .5, .5), '#8a5a38', { p: L(tx + s * 1.05, .25, tz), ry })); }
  for (let b = 0; b < 4; b++) put(parts.static, new THREE.CylinderGeometry(.45, .4, 1.1, 12), b % 2 ? '#8a5a38' : '#9a6a44', { p: L(-4.8 + (b % 2) * .9, .55 + Math.floor(b / 2) * 1.1, 3.6), ry });
}
/* 水井（有屋頂）、曬衣繩、木箱、路牌 */
{ const x = 2, z = 16, y = hAt(x, z); put(parts.static, new THREE.CylinderGeometry(1.3, 1.4, 1.1, 16, 1, true), PAL.stone[0], { p: [x, y + .3, z], vary: .05 }); put(parts.static, new THREE.CircleGeometry(1.25, 16), '#1c2e44', { p: [x, y + .55, z], rx: -Math.PI / 2 });
  [-1, 1].forEach(s => put(parts.static, BOX(.2, 2.6, .2), PAL.beam, { p: [x + s * 1.2, y + 1.3, z] })); const rf = new THREE.ConeGeometry(1.9, 1.1, 4); put(parts.static, rf, '#b5543c', { p: [x, y + 3.1, z], ry: Math.PI / 4 }); solids.push([x, z, 1.7, 4]); }
[[7, 27], [8.2, 27.6], [7.6, 28.4], [-13, 12], [16, 3]].forEach(([x, z]) => put(parts.static, BOX(1, 1, 1), '#b07a48', { p: [x, hAt(x, z) + .45, z], ry: rr(0, 3), vary: .1 }));
/* 小路兩旁的柵欄與路燈 */
for (let i = 0; i < PATH.length - 1; i++) { const [a, b] = [PATH[i], PATH[i + 1]], len = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[0] - a[0], b[1] - a[1]), nx = Math.cos(ang), nz = -Math.sin(ang);
  if (i >= 3) for (let s = 0; s < len; s += 2.4) { const t = s / len, x = a[0] + (b[0] - a[0]) * t + nx * 3.4, z = a[1] + (b[1] - a[1]) * t + nz * 3.4, y = hAt(x, z); if (y < 1) continue; put(parts.static, BOX(.18, 1.1, .18), PAL.beam, { p: [x, y + .5, z] }); put(parts.static, BOX(.1, .12, 2.4), '#8a5a38', { p: [x, y + .82, z + 0], ry: ang }); put(parts.static, BOX(.1, .12, 2.4), '#8a5a38', { p: [x, y + .45, z], ry: ang }); }
  const lx = a[0] - nx * 3.2, lz = a[1] - nz * 3.2, ly = hAt(lx, lz); put(parts.static, new THREE.CylinderGeometry(.09, .12, 3.4, 8), '#3a3040', { p: [lx, ly + 1.7, lz] }); put(parts.static, BOX(.16, .16, .8), '#3a3040', { p: [lx, ly + 3.35, lz + .3] }); put(parts.glow, BOX(.42, .52, .42), '#ffb24a', { p: [lx, ly + 3.05, lz + .62] }); put(parts.static, new THREE.ConeGeometry(.36, .3, 4), '#3a3040', { p: [lx, ly + 3.45, lz + .62], ry: Math.PI / 4 }); }
/* 溪上的木橋 */ { const [x, z] = [3.6, -12], y = 1.4; for (let i = 0; i < 9; i++) put(parts.static, BOX(3.4, .2, .7), '#9a6a44', { p: [x + (i - 4) * .1, y + Math.sin(i / 8 * Math.PI) * .5, z + (i - 4) * .75], vary: .1 }); }

/* ---------------- 風車 ---------------- */
const blades = [];
[[33, 0, -.9], [41, -12, -1.3], [26, -20, -.6]].forEach(([x, z, ry]) => {
  const y = hAt(x, z) - .3; for (let i = 0; i < 10; i++) put(parts.static, BOX(1.1, .6, .9), PAL.stone[i % 3], { p: [x + Math.cos(i / 10 * 6.28) * 2.1, y + .3, z + Math.sin(i / 10 * 6.28) * 2.1], ry: -i / 10 * 6.28, vary: .08 });
  put(parts.static, new THREE.CylinderGeometry(1.5, 2.2, 7.5, 16), '#f6f0e2', { p: [x, y + 4, z] }); for (let k = 1; k < 4; k++) put(parts.static, new THREE.CylinderGeometry(1.5 + (4 - k) * .17, 1.5 + (4 - k) * .17 + .02, .18, 16), PAL.beam, { p: [x, y + 1 + k * 1.8, z] });
  put(parts.static, new THREE.ConeGeometry(1.9, 2.6, 16), '#8a4a32', { p: [x, y + 9, z] }); put(parts.static, BOX(1, 1.9, .12), '#8a5a38', { p: [x + Math.sin(ry) * 2.05, y + 1.4, z + Math.cos(ry) * 2.05], ry }); put(parts.glow, BOX(.6, .6, .1), '#ffcf7a', { p: [x + Math.sin(ry) * 1.75, y + 5, z + Math.cos(ry) * 1.75], ry });
  const bg = []; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; put(bg, BOX(.22, 6.2, .14), PAL.beam, { p: [Math.cos(a + Math.PI / 2) * 3.1, Math.sin(a + Math.PI / 2) * 3.1, 0], rz: a });
    for (let r = 0; r < 4; r++) put(bg, BOX(1.5, .08, .06), PAL.beam, { p: [Math.cos(a + Math.PI / 2) * (1.4 + r * 1.3) + Math.cos(a) * .75, Math.sin(a + Math.PI / 2) * (1.4 + r * 1.3) + Math.sin(a) * .75, .02], rz: a });
    put(bg, BOX(1.4, 5, .04), '#efe4d0', { p: [Math.cos(a + Math.PI / 2) * 3.4 + Math.cos(a) * .75, Math.sin(a + Math.PI / 2) * 3.4 + Math.sin(a) * .75, -.04], rz: a, w: .06 }); }
  put(bg, new THREE.CylinderGeometry(.35, .35, .8, 10), PAL.beam, { p: [0, 0, -.3], rx: Math.PI / 2 });
  const gm = new THREE.Group(); const mg = mergeGeometries(bg, false); const mm = new THREE.Mesh(mg, toon()); mm.castShadow = true; gm.add(mm); gm.add(new THREE.Mesh(mg, outlineMat(.03, 0x2a1e24))); gm.position.set(x + Math.sin(ry) * 2.3, y + 7.6, z + Math.cos(ry) * 2.3); gm.rotation.y = ry; scene.add(gm); blades.push({ g: gm, s: rr(.4, .8) });
  solids.push([x, z, 2.6, 12]);
});

/* ---------------- 碼頭與小船 ---------------- */
{ for (let k = 0; k < 13; k++) { const z = 60 + k * 1.9; for (let p = 0; p < 4; p++) put(parts.static, BOX(.78, .16, 1.75), '#a87650', { p: [.85 + p * .8, .95 + rr(-.02, .02), z], ry: rr(-.02, .02), vary: .14 }); if (k % 2 === 0) [-.1, 3.5].forEach(o => put(parts.static, new THREE.CylinderGeometry(.18, .2, 4.4, 8), '#6a4a30', { p: [o, -1.2, z] })); }
  [-.1, 3.5].forEach(o => put(parts.static, BOX(.12, .12, 24), '#8a6a44', { p: [o, 1.6, 71] }));
  /* 小船：船身前窄後寬 */ const hull = new THREE.BoxGeometry(2.4, 1, 6, 1, 1, 6); const hp = hull.attributes.position; for (let i = 0; i < hp.count; i++) { const zz = hp.getZ(i), t = Math.max(0, (zz - .5) / 2.5); hp.setX(i, hp.getX(i) * (1 - t * .85)); if (hp.getY(i) < 0) hp.setX(i, hp.getX(i) * .7); } hull.computeVertexNormals();
  const bx = 7.4, bz = 74; put(parts.static, hull, '#8a5a38', { p: [bx, .5, bz] }); put(parts.static, BOX(2, .1, 4.4), '#c49a6a', { p: [bx, .95, bz - .4] }); put(parts.static, new THREE.CylinderGeometry(.09, .11, 5.2, 8), PAL.beam, { p: [bx, 3.4, bz - .4] });
  const sail = new THREE.PlaneGeometry(2.6, 3, 6, 6); put(parts.cloth, sail, '#f6f0e2', { p: [bx, 3.8, bz - .2], ry: Math.PI / 2, w: y => .12 + (y - 2.3) * .05 }); put(parts.static, BOX(.12, .12, 2.8), PAL.beam, { p: [bx, 5.4, bz - .2] }); solids.push([bx, bz, 3, 0]);
  /* 繩索捲、木箱 */ for (let i = 0; i < 3; i++) put(parts.static, new THREE.TorusGeometry(.35, .1, 6, 12), '#c8b080', { p: [.9 + i * .4, 1.1, 64 + i * 7], rx: Math.PI / 2 }); }

/* ---------------- 樹木、岩石 ---------------- */
function blobGeo(r, det, jit) { const g = new THREE.IcosahedronGeometry(r, det); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i), k = 1 + (n2(v.x * 1.7 + 10, v.y * 1.7 + v.z) - .5) * jit; v.multiplyScalar(k); p.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals(); return g; }
function tree(x, z, s, kind) { const y = hAt(x, z) - .25; const leaf = [C('#5fae46'), C('#4f9a3e'), C('#6cbc50')][kind % 3];
  if (kind === 3) { /* 針葉樹 */ put(parts.tree, new THREE.CylinderGeometry(.22 * s, .38 * s, 2.4 * s, 7), '#6a4630', { p: [x, y + 1.2 * s, z] }); for (let k = 0; k < 4; k++) put(parts.tree, new THREE.ConeGeometry((2.4 - k * .5) * s, 2.2 * s, 9), '#3f8a4a', { p: [x, y + (2.4 + k * 1.2) * s, z], w: .08 + k * .05, vary: .06 }); }
  else { put(parts.tree, new THREE.CylinderGeometry(.32 * s, .55 * s, 3.6 * s, 8), '#7a5034', { p: [x, y + 1.8 * s, z], vary: .05 }); put(parts.tree, new THREE.CylinderGeometry(.12 * s, .2 * s, 1.8 * s, 6), '#7a5034', { p: [x + .6 * s, y + 3.4 * s, z], rz: -.7 });
    [[0, 4.8, 0, 2.3], [1.4, 4, .7, 1.7], [-1.3, 4.2, -.6, 1.6], [.2, 5.8, -.4, 1.5]].forEach(([dx, dy, dz, r]) => put(parts.tree, blobGeo(r * s, 3, .22), leaf, { p: [x + dx * s, y + dy * s, z + dz * s], s: [1, .88, 1], w: .22, vary: .08 })); }
  solids.push([x, z, .7 * s, 0]); }
tree(CAPE[0] + 3, CAPE[1] - 1, 1.6, 0);
for (let k = 0, n = 0; k < 1600 && n < 95; k++) { const x = rr(-85, 85), z = rr(-85, 85), h = hAt(x, z); if (h < 1.6 || slopeAt(x, z) > .7 || polyD(PATH, x, z) < 5 || polyD(STREAM, x, z) < 4 || Math.hypot(x - VILLAGE[0], z - VILLAGE[1]) < 31 || solids.some(s => Math.hypot(x - s[0], z - s[1]) < s[2] + 4) || Math.hypot(x - 2, z - 64) < 18) continue; tree(x, z, rr(.8, 1.35), (rnd() * 4) | 0); n++; }
/* 岩石：海岸、懸崖、溪邊 */
for (let k = 0; k < 140; k++) { const x = rr(-100, 100), z = rr(-100, 100), h = hAt(x, z), sl = slopeAt(x, z); const shore = h > -1.6 && h < .8, cliff = sl > .9 && h > 2, creek = polyD(STREAM, x, z) < 3.5; if (!(shore || cliff || creek) || rnd() < .4) continue; const r = rr(.5, cliff ? 2.6 : 1.6);
  put(parts.static, blobGeo(r, 1, .5), C('#9c938a').multiplyScalar(rr(.85, 1.1)), { p: [x, h - r * .25, z], s: [1, rr(.55, .85), 1.1], ry: rr(0, 6) }); }
/* 遠方的島 */ [[260, -120, 46, 30], [-280, -60, 60, 38], [-150, 260, 40, 22], [190, 230, 34, 18]].forEach(([x, z, r, h]) => put(parts.static, blobGeo(r, 2, .3), '#6f9a7a', { p: [x, -h * .25, z], s: [1, h / r, 1] }));

/* ---------------- 合併網格 ---------------- */
const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0x553a20, toneMapped: true });
addMerged(parts.static, toon(), { outline: .045 }); addMerged(parts.tree, toon({ wind: true }), { outline: .05, wind: true }); addMerged(parts.cloth, toon({ wind: true, side: THREE.DoubleSide }), { cast: true });
addMerged(parts.glow, glowMat, { cast: false });

/* ---------------- 草地與花 ---------------- */
{ const blade = new THREE.PlaneGeometry(.14, 1, 1, 4); blade.translate(0, .5, 0); const bp = blade.attributes.position; for (let i = 0; i < bp.count; i++) { const y = bp.getY(i); bp.setX(i, bp.getX(i) * (1 - y * .85)); bp.setZ(i, y * y * .18); } const nrm = blade.attributes.normal; for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
  const N = LOW ? 12000 : 110000, gm = new THREE.InstancedMesh(blade, toon({ vc: false, wind: true, grass: true, side: THREE.DoubleSide }), N); gm.receiveShadow = true; const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color(); let n = 0;
  const gA = C('#2f7a2e'), gB = C('#7cc04e'), gC = C('#b0c850');
  for (let k = 0; k < 500000 && n < N; k++) { const x = rr(-92, 92), z = rr(-92, 92), h = hAt(x, z); if (h < 1.15 || slopeAt(x, z) > .55 || polyD(PATH, x, z) < 2.6 || polyD(STREAM, x, z) < 2.5 || solids.some(s => s[3] && Math.hypot(x - s[0], z - s[1]) < s[2] * .85)) continue; const dens = fbm(x * .05 + 11, z * .05); if (dens < .32 && rnd() > .25) continue;
    const s = rr(.6, 1.25) * (.8 + dens * .7); e.set(0, rr(0, 6.28), 0); q.setFromEuler(e); M.compose(new THREE.Vector3(x, h - .05, z), q, new THREE.Vector3(rr(.8, 1.3), s, 1)); gm.setMatrixAt(n, M); col.copy(gA).lerp(gB, rnd() * .6 + fbm(x * .1, z * .1) * .5).lerp(gC, rnd() < .08 ? .5 : 0); gm.setColorAt(n, col); n++; }
  gm.count = n; gm.instanceMatrix.needsUpdate = true; gm.instanceColor.needsUpdate = true; scene.add(gm); window.__grass = gm;
  /* 小花 */ const fl = new THREE.IcosahedronGeometry(.11, 0), FN = 2600, fm = new THREE.InstancedMesh(fl, toon({ vc: false }), FN), FC = ['#ffffff', '#ffe14a', '#ff8ab0', '#b08aff', '#ff9a5a'].map(C); let fnn = 0;
  for (let k = 0; k < 60000 && fnn < FN; k++) { const x = rr(-85, 85), z = rr(-85, 85), h = hAt(x, z); if (h < 1.3 || slopeAt(x, z) > .5 || polyD(PATH, x, z) < 2.6 || fbm(x * .08 + 3, z * .08) < .55) continue; M.compose(new THREE.Vector3(x, h + rr(.35, .7), z), q.identity(), new THREE.Vector3(1, .6, 1)); fm.setMatrixAt(fnn, M); fm.setColorAt(fnn, FC[(rnd() * 5) | 0]); fnn++; }
  fm.count = fnn; fm.instanceColor.needsUpdate = true; scene.add(fm); }

/* ---------------- 水面 ---------------- */
const hTex = new THREE.DataTexture(HD, GN, GN, THREE.RedFormat, THREE.FloatType); hTex.minFilter = hTex.magFilter = THREE.LinearFilter; hTex.needsUpdate = true;
const nTex = new THREE.TextureLoader().load('vendor/three/textures/waternormals.jpg'); nTex.wrapS = nTex.wrapT = THREE.RepeatWrapping;
const WU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uH: { value: null }, uN: { value: null }, uWorld: { value: WORLD }, uSun: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color() }, uDeep: { value: new THREE.Color() }, uShallow: { value: new THREE.Color() }, uSkyA: { value: new THREE.Color() }, uSkyB: { value: new THREE.Color() } }]);
WU.uH.value = hTex; WU.uN.value = nTex; WU.uTime = U.uTime;
const water = new THREE.Mesh(new THREE.PlaneGeometry(WORLD * 4, WORLD * 4, LOW ? 96 : 256, LOW ? 96 : 256).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: WU, transparent: true, fog: true,
  vertexShader: `uniform float uTime; varying vec3 vW; varying float vWave;\n#include <fog_pars_vertex>\nvoid main(){ vec3 p = position; float t = uTime; float w = sin(p.x*.16+t*1.1)*.2 + sin(p.z*.21-t*.9)*.16 + sin((p.x+p.z)*.43+t*1.8)*.06; p.y += w; vWave = w; vec4 wp = modelMatrix*vec4(p,1.); vW = wp.xyz; vec4 mvPosition = viewMatrix*wp; gl_Position = projectionMatrix*mvPosition;\n#include <fog_vertex>\n}`,
  fragmentShader: `uniform sampler2D uH, uN; uniform float uWorld, uTime; uniform vec3 uSun, uSunCol, uDeep, uShallow, uSkyA, uSkyB; varying vec3 vW; varying float vWave;\n#include <fog_pars_fragment>
    float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); } float ns(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y); }
    void main(){ vec2 uv = vW.xz/uWorld + .5; float g = (uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.) ? -12. : texture2D(uH, uv).r; float depth = vW.y - g;
      vec3 n1 = texture2D(uN, vW.xz*.035 + vec2(uTime*.012, uTime*.008)).xzy*2.-1.; vec3 n2 = texture2D(uN, vW.xz*.09 - vec2(uTime*.02, -uTime*.01)).xzy*2.-1.; vec3 n = normalize(vec3(0.,1.,0.) + (n1+n2)*vec3(.35,0.,.35));
      vec3 v = normalize(cameraPosition - vW); float fr = pow(1. - max(dot(n, v), 0.), 4.);
      vec3 base = mix(uShallow, uDeep, smoothstep(.3, 7., depth)); vec3 refl = mix(uSkyB, uSkyA, clamp(reflect(-v, n).y*1.6, 0., 1.)); vec3 col = mix(base, refl, fr*.7);
      float caus = smoothstep(.55, .9, ns(vW.xz*.9 + n.xz*3. + uTime*.3)) * smoothstep(3., .4, depth) * .25; col += caus;
      vec3 hv = normalize(uSun + v); float sp = pow(max(dot(n, hv), 0.), 300.); col += uSunCol * smoothstep(.25, .45, sp) * 1.6;
      float foam = smoothstep(1.2, .0, depth) * (.55 + .45*ns(vW.xz*1.4 + uTime*.7)); float edge = smoothstep(.18, .0, abs(depth - .55 - sin(uTime*1.3 + vW.x*.2)*.25)) * .7; foam = max(foam, edge*smoothstep(2.5,.2,depth)); foam += smoothstep(.16,.24,vWave)*.18;
      col = mix(col, vec3(1.), clamp(foam, 0., 1.)*.85); float a = clamp(mix(.55, .97, smoothstep(0., 3.5, depth)) + foam, 0., 1.);
      gl_FragColor = vec4(col, a);\n#include <fog_fragment>\n}` }));
water.renderOrder = 2; scene.add(water);

/* ---------------- 天空 ---------------- */
const SKY = { uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uCloud: { value: new THREE.Color() }, uCloudSh: { value: new THREE.Color() }, uSun: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color() }, uStars: { value: 0 }, uFog: { value: new THREE.Color() }, uTime: U.uTime };
const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: SKY,
  vertexShader: `varying vec3 vD; void main(){ vD = normalize((modelMatrix*vec4(position,1.)).xyz - cameraPosition); vec4 p = projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.); gl_Position = p.xyww; }`,
  fragmentShader: `uniform vec3 uZen, uHor, uCloud, uCloudSh, uSun, uSunCol, uFog; uniform float uStars, uTime; varying vec3 vD;
    float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); } float ns(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y); }
    float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*ns(p); p=p*2.03+vec2(17.1,9.3); a*=.5; } return s; }
    void main(){ vec3 d = normalize(vD); float h = max(d.y, 0.); vec3 col = mix(uHor, uZen, pow(h, .5)); float sd = max(dot(d, normalize(uSun)), 0.); col += uSunCol*(pow(sd, 1200.)*8. + pow(sd, 10.)*.3);
      if (d.y > 0.) { vec2 cp = d.xz/(d.y+.1)*.6 + vec2(uTime*.01, uTime*.004); float c = fbm(cp*1.2); c = smoothstep(.5, .74, c)*smoothstep(0., .2, d.y); float lit = smoothstep(.4, .85, fbm(cp*1.2 + normalize(uSun).xz*.1)); col = mix(col, mix(uCloudSh, uCloud, lit*.75+.25), c*.95); }
      if (uStars > 0. && d.y > 0.) { vec2 sp = d.xz/(d.y+.3)*120.; col += vec3(step(.996, hs(floor(sp)))*uStars*(.6+.4*sin(uTime*3.+hs(floor(sp))*40.))); }
      col = mix(col, uFog, smoothstep(.1, 0., d.y)*.7); gl_FragColor = vec4(col, 1.); }` }));
sky.renderOrder = -1; scene.add(sky);

/* ---------------- 光照 ---------------- */
const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x6a7a4a, 1.2); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = true; sun.shadow.mapSize.set(LOW ? 1024 : 4096, LOW ? 1024 : 4096); const SC = sun.shadow.camera; SC.left = -70; SC.right = 70; SC.top = 70; SC.bottom = -70; SC.near = 1; SC.far = 400; sun.shadow.bias = -.0004; sun.shadow.normalBias = .05; sun.shadow.radius = 3; scene.add(sun); scene.add(sun.target);
const lampLights = [[-6, 22], [2, 16], [10, 9], [-15, 6], [4, 31], [0, 44]].map(([x, z]) => { const l = new THREE.PointLight(0xffb060, 0, 22, 1.6); l.position.set(x, hAt(x, z) + 3.2, z); scene.add(l); return l; });

/* ---------------- 煙、光點、海鷗 ---------------- */
const softTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.5, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const smoke = (() => { const pos = [], seedA = []; smokeSrc.forEach(p => { for (let i = 0; i < 14; i++) { pos.push(...p); seedA.push(i / 14 + rnd() * .05); } }); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.Float32BufferAttribute(seedA, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uTime: U.uTime, uTex: { value: softTex }, uCol: { value: new THREE.Color(1, 1, 1) } }, vertexShader: `attribute float seed; uniform float uTime; varying float vA; void main(){ float t = fract(uTime*.08 + seed); vec3 p = position + vec3(t*2.5 + sin(t*6.+seed*20.)*.4, t*7., t*1.); vA = (1.-t)*smoothstep(0.,.1,t)*.55; vec4 mv = modelViewMatrix*vec4(p,1.); gl_Position = projectionMatrix*mv; gl_PointSize = (1.2 + t*3.5) * 300. / -mv.z; }`,
    fragmentShader: `uniform sampler2D uTex; uniform vec3 uCol; varying float vA; void main(){ gl_FragColor = vec4(uCol, texture2D(uTex, gl_PointCoord).a*vA); }` }); const p = new THREE.Points(g, m); scene.add(p); return m; })();
const motes = (() => { const pos = [], sd = []; for (let i = 0; i < 300; i++) { const x = rr(-80, 80), z = rr(-80, 80); pos.push(x, hAt(x, z) + rr(.8, 5), z); sd.push(rnd()); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.Float32BufferAttribute(sd, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: U.uTime, uTex: { value: softTex }, uCol: { value: new THREE.Color() }, uSize: { value: 1 } }, vertexShader: `attribute float seed; uniform float uTime, uSize; varying float vA; void main(){ float t = uTime*.3 + seed*6.28; vec3 p = position + vec3(sin(t)*2., sin(t*1.7)*1., cos(t*.8)*2.); vA = .5+.5*sin(uTime*2.+seed*40.); vec4 mv = modelViewMatrix*vec4(p,1.); gl_Position = projectionMatrix*mv; gl_PointSize = uSize*(.8+seed)*160./-mv.z; }`,
    fragmentShader: `uniform sampler2D uTex; uniform vec3 uCol; varying float vA; void main(){ gl_FragColor = vec4(uCol*2., texture2D(uTex, gl_PointCoord).a*vA); }` }); scene.add(new THREE.Points(g, m)); return m; })();
const gulls = []; { const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, .3, -1.2, .25, -.1, 0, 0, -.3, 0, 0, .3, 1.2, .25, -.1, 0, 0, -.3], 3)); gg.computeVertexNormals(); const gmat = new THREE.MeshBasicMaterial({ color: 0xf8f8f8, side: THREE.DoubleSide, fog: true });
  for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(gg, gmat); m.scale.setScalar(rr(.9, 1.3)); scene.add(m); gulls.push({ m, r: rr(30, 70), y: rr(22, 38), sp: rr(.08, .16) * (rnd() < .5 ? -1 : 1), ph: rr(0, 6.28), cx: rr(-20, 20), cz: rr(-10, 40) }); } }

/* ---------------- HD-2D 立繪角色 ---------------- */
const contactTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(0,0,0,.55)'); r.addColorStop(.6, 'rgba(0,0,0,.25)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const chars = [];
function character(url, x, z, h, o = {}) {
  const tex = new THREE.TextureLoader().load(url, t => { const a = t.image.width / t.image.height; mesh.scale.set(h * a, h, 1); depth.needsUpdate = true; }); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, .5, 0); const nrm = geo.attributes.normal; for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, .75, .66); /* 法線朝上偏前：受光一致，不會因為鏡頭角度忽明忽暗 */
  const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: .5, side: THREE.DoubleSide }); mat.onBeforeCompile = sh => { Object.assign(sh.uniforms, U); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uRim; uniform float uRimK;').replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.rgb = mix(gl_FragColor.rgb * (1.0 + uRim*.15), diffuseColor.rgb * (.82 + uRim*.22), .45); /* 保留立繪原本的顏色，同時帶到場景的光色與陰影 */'); };
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: .5 });
  const mesh = new THREE.Mesh(geo, mat); mesh.customDepthMaterial = depth; mesh.castShadow = true; mesh.receiveShadow = true; mesh.position.set(x, hAt(x, z), z); scene.add(mesh);
  const cs = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false, fog: true })); cs.renderOrder = 3; scene.add(cs);
  const c = { mesh, cs, h, flip: o.flip || 0, bob: 0, ground: o.ground }; chars.push(c); return c;
}
const player = character('assets/chars/luffy0.webp?v=63', 3, 6, 2.9);
const npcs = [character('assets/chars/mayor.webp?v=63', -4.6, 25.5, 2.5), character('assets/chars/marine.webp?v=63', 4.4, 66, 2.6, { flip: 1, ground: .96 })];

/* ---------------- 後製 ---------------- */
const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: LOW ? 0 : 4 });
const composer = new EffectComposer(renderer, rt); composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .45, .6, .92); composer.addPass(bloom);
const grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uSat: { value: 1.2 }, uCon: { value: 1.06 }, uVig: { value: .3 }, uTint: { value: new THREE.Color(1, 1, 1) } }, vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uSat, uCon, uVig; uniform vec3 uTint; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(.2126,.7152,.0722)); c.rgb = mix(vec3(l), c.rgb, uSat); c.rgb = max(vec3(0.), (c.rgb - .18)*uCon + .18); c.rgb *= uTint; vec2 q = vUv-.5; c.rgb *= 1. - dot(q,q)*uVig; gl_FragColor = c; }` });
composer.addPass(grade); composer.addPass(new OutputPass());

/* ---------------- 時段（平滑切換） ---------------- */
const ENV = {
  noon: { sun: [.45, .78, .35], sunCol: '#fff4e0', sunI: 2.6, hemiSky: '#c6dcff', hemiGround: '#7a8a5a', hemiI: 1.0, zen: '#2a78e0', hor: '#a6d6ff', fog: '#b4d8f2', fogN: 160, fogF: 560, cloud: '#ffffff', cloudSh: '#b4c4dc', deep: '#145e9e', shallow: '#3fd0c4', rim: '#fff4e0', rimK: .28, exp: .9, sat: 1.15, con: 1.08, vig: .3, tint: '#fffaf2', bloomT: .92, bloomK: .35, lamp: 0, glow: .25, stars: 0, mote: '#fff2c0', moteS: .5, smoke: '#ffffff' },
  dusk: { sun: [-.62, .2, .52], sunCol: '#ffb070', sunI: 3.4, hemiSky: '#c49ac0', hemiGround: '#6a4a3a', hemiI: .9, zen: '#3f4f9a', hor: '#ffae6a', fog: '#e6a487', fogN: 120, fogF: 480, cloud: '#ffc09a', cloudSh: '#7a5a8a', deep: '#263f6a', shallow: '#5a98a0', rim: '#ffb070', rimK: .45, exp: 1, sat: 1.18, con: 1.08, vig: .4, tint: '#fff0e4', bloomT: .85, bloomK: .45, lamp: 3, glow: 1.6, stars: 0, mote: '#ffc080', moteS: .9, smoke: '#ffd8c0' },
  night: { sun: [.3, .62, -.4], sunCol: '#9ab0ff', sunI: 1.1, hemiSky: '#3a4a80', hemiGround: '#141a24', hemiI: .7, zen: '#081232', hor: '#26386a', fog: '#1a2848', fogN: 80, fogF: 360, cloud: '#5a6488', cloudSh: '#1a1e36', deep: '#0a2240', shallow: '#1a4c68', rim: '#8aa0ff', rimK: .5, exp: 1.1, sat: 1.1, con: 1.06, vig: .55, tint: '#e8f0ff', bloomT: .75, bloomK: .6, lamp: 7, glow: 2.6, stars: 1, mote: '#d8ff80', moteS: 1.5, smoke: '#8a90a8' }
};
let envCur = JSON.parse(JSON.stringify(ENV.noon)), envTo = ENV.noon, envK = 1;
const lerpEnv = (a, b, k) => { const o = {}; for (const key in b) { const x = a[key], y = b[key]; if (typeof y === 'number') o[key] = x + (y - x) * k; else if (Array.isArray(y)) o[key] = y.map((v, i) => x[i] + (v - x[i]) * k); else o[key] = '#' + C(x).lerp(C(y), k).getHexString(); } return o; };
function applyEnv(E) {
  const sd = new THREE.Vector3(...E.sun).normalize(); sun.color.set(E.sunCol); sun.intensity = E.sunI; hemi.color.set(E.hemiSky); hemi.groundColor.set(E.hemiGround); hemi.intensity = E.hemiI;
  scene.fog.color.set(E.fog); scene.fog.near = E.fogN; scene.fog.far = E.fogF; SKY.uZen.value.set(E.zen); SKY.uHor.value.set(E.hor); SKY.uCloud.value.set(E.cloud); SKY.uCloudSh.value.set(E.cloudSh); SKY.uSun.value.copy(sd); SKY.uSunCol.value.set(E.sunCol); SKY.uStars.value = E.stars; SKY.uFog.value.set(E.fog);
  WU.uSun.value.copy(sd); WU.uSunCol.value.set(E.sunCol); WU.uDeep.value.set(E.deep); WU.uShallow.value.set(E.shallow); WU.uSkyA.value.set(E.zen); WU.uSkyB.value.set(E.hor);
  U.uRim.value.set(E.rim); U.uRimK.value = E.rimK; renderer.toneMappingExposure = E.exp; grade.uniforms.uSat.value = E.sat; grade.uniforms.uCon.value = E.con; grade.uniforms.uVig.value = E.vig; grade.uniforms.uTint.value.set(E.tint);
  bloom.threshold = E.bloomT; bloom.strength = E.bloomK; lampLights.forEach(l => { l.intensity = E.lamp; }); glowMat.color.setScalar(1).multiplyScalar(E.glow); motes.uniforms.uCol.value.set(E.mote); motes.uniforms.uSize.value = E.moteS; smoke.uniforms.uCol.value.set(E.smoke); sun.userData.dir = sd;
}
applyEnv(envCur);

/* ---------------- 操作 ---------------- */
const key = {}; addEventListener('keydown', e => { key[e.key.toLowerCase()] = true; }); addEventListener('keyup', e => { key[e.key.toLowerCase()] = false; });
let yaw = 2.5, pitch = .3, dist = 16, joy = null, drag = null, pinch = null; const stick = document.getElementById('hdStick'), knob = stick.querySelector('i');
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); if (e.pointerType === 'touch' && e.clientX < innerWidth * .45 && !joy) { joy = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 }; stick.style.left = e.clientX - 60 + 'px'; stick.style.top = e.clientY - 60 + 'px'; stick.hidden = false; } else drag = drag || { id: e.pointerId, x: e.clientX, y: e.clientY }; });
cv.addEventListener('pointermove', e => { if (joy && e.pointerId === joy.id) { let dx = e.clientX - joy.x, dy = e.clientY - joy.y; const l = Math.hypot(dx, dy); if (l > 50) { dx *= 50 / l; dy *= 50 / l; } joy.dx = dx / 50; joy.dy = dy / 50; knob.style.transform = `translate(${dx}px,${dy}px)`; } else if (drag && e.pointerId === drag.id) { yaw -= (e.clientX - drag.x) * .006; pitch = Math.max(.06, Math.min(1.25, pitch + (e.clientY - drag.y) * .004)); drag.x = e.clientX; drag.y = e.clientY; } });
const up = e => { if (joy && e.pointerId === joy.id) { joy = null; stick.hidden = true; knob.style.transform = ''; } if (drag && e.pointerId === drag.id) drag = null; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('wheel', e => { dist = Math.max(5, Math.min(45, dist * (1 + Math.sign(e.deltaY) * .1))); e.preventDefault(); }, { passive: false });
cv.addEventListener('touchmove', e => { if (e.touches.length === 2) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); if (pinch) dist = Math.max(5, Math.min(45, dist * pinch / d)); pinch = d; } e.preventDefault(); }, { passive: false }); cv.addEventListener('touchend', () => { pinch = null; });

/* ---------------- 迴圈 ---------------- */
function resize() { const w = cv.clientWidth, h = cv.clientHeight; renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const onDock = (x, z) => x > .2 && x < 3.6 && z > 58 && z < 84;
const blocked = (x, z) => (hAt(x, z) < .35 && !onDock(x, z)) || solids.some(s => Math.hypot(x - s[0], z - s[1]) < s[2]);
const vel = [0, 0], eye = new THREE.Vector3(0, 10, 30), look = new THREE.Vector3(); let walkT = 0, last = performance.now(), t0 = last, snap = true;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; const t = (now - t0) / 1000; U.uTime.value = t; U.uWind.value = 1 + Math.sin(t * .3) * .25;
  if (envK < 1) { envK = Math.min(1, envK + dt / 1.6); applyEnv(lerpEnv(envFrom, envTo, envK)); if (envK >= 1) envCur = JSON.parse(JSON.stringify(envTo)); }
  let ix = (key.d || key.arrowright ? 1 : 0) - (key.a || key.arrowleft ? 1 : 0), iz = (key.s || key.arrowdown ? 1 : 0) - (key.w || key.arrowup ? 1 : 0); if (joy) { ix = joy.dx; iz = joy.dy; }
  const fwd = [-Math.sin(yaw), -Math.cos(yaw)], rt2 = [Math.cos(yaw), -Math.sin(yaw)]; const mx = rt2[0] * ix - fwd[0] * iz, mz = rt2[1] * ix - fwd[1] * iz, ml = Math.hypot(mx, mz), sp = key.shift ? 13 : 8;
  vel[0] += ((ml > .05 ? mx / Math.max(1, ml) * sp : 0) - vel[0]) * Math.min(1, dt * 10); vel[1] += ((ml > .05 ? mz / Math.max(1, ml) * sp : 0) - vel[1]) * Math.min(1, dt * 10);
  const P = player.mesh.position, nx = P.x + vel[0] * dt, nz = P.z + vel[1] * dt; if (!blocked(nx, P.z)) P.x = nx; if (!blocked(P.x, nz)) P.z = nz;
  const gy = onDock(P.x, P.z) ? Math.max(hAt(P.x, P.z), .96) : hAt(P.x, P.z); P.y += (gy - P.y) * Math.min(1, dt * 14);
  const moving = Math.hypot(vel[0], vel[1]) > .6; walkT += moving ? dt * 9 : 0; player.bob = moving ? Math.abs(Math.sin(walkT)) * .16 : 0; if (Math.abs(ix) > .2) player.flip = ix < 0 ? 1 : 0;
  /* 立繪面向鏡頭、走路彈跳、腳下接觸陰影 */
  chars.forEach((c, k) => { const m = c.mesh; if (c !== player) { c.bob = Math.abs(Math.sin(t * 1.4 + k)) * .04; if (c.ground) m.position.y = c.ground; } m.rotation.y = Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z); m.scale.x = Math.abs(m.scale.x) * (c.flip ? -1 : 1);
    m.position.y += c.bob - (c.lastBob || 0); c.lastBob = c.bob; c.cs.position.set(m.position.x, (c.ground || hAt(m.position.x, m.position.z)) + .06, m.position.z); c.cs.scale.setScalar(1 - c.bob * 1.2); });
  blades.forEach(b => { b.g.children.forEach(m => { m.rotation.z = t * b.s; }); });
  gulls.forEach(g => { const a = t * g.sp + g.ph; g.m.position.set(g.cx + Math.cos(a) * g.r, g.y + Math.sin(t * .7 + g.ph) * 2, g.cz + Math.sin(a) * g.r); g.m.rotation.y = -a + (g.sp > 0 ? 0 : Math.PI); g.m.scale.y = .6 + Math.abs(Math.sin(t * 6 + g.ph)) * .8; });
  /* 鏡頭：跟隨、碰撞時拉近 */
  const at = new THREE.Vector3(P.x, P.y + 1.8, P.z), want = new THREE.Vector3(at.x + Math.sin(yaw) * Math.cos(pitch) * dist, at.y + Math.sin(pitch) * dist, at.z + Math.cos(yaw) * Math.cos(pitch) * dist);
  { let k = 1; for (let s = 1; s <= 24; s++) { const f = s / 24, x = at.x + (want.x - at.x) * f, y = at.y + (want.y - at.y) * f, z = at.z + (want.z - at.z) * f; if (solids.some(o => o[3] && y < hAt(o[0], o[1]) + o[3] && Math.hypot(x - o[0], z - o[1]) < o[2] + 1.2)) { k = Math.max(.2, f - .06); break; } } want.lerp(at, 1 - k); }
  want.y = Math.max(want.y, hAt(want.x, want.z) + 1.2, 1.4); if (snap) { eye.copy(want); look.copy(at); snap = false; } else { eye.lerp(want, Math.min(1, dt * 8)); look.lerp(at, Math.min(1, dt * 10)); } camera.position.copy(eye); camera.lookAt(look); sky.position.copy(camera.position);
  /* 陰影跟著玩家 */ const sd = sun.userData.dir || new THREE.Vector3(.4, .8, .3); sun.target.position.copy(at); sun.position.copy(at).addScaledVector(sd, 160);
  composer.render(dt); requestAnimationFrame(frame);
}
let envFrom = envCur;
document.querySelectorAll('[data-env]').forEach(b => b.onclick = () => { envFrom = lerpEnv(envCur, envTo, envK); envCur = envFrom; envTo = ENV[b.dataset.env]; envK = 0; document.querySelectorAll('[data-env]').forEach(x => x.classList.toggle('on', x === b)); });
document.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => { const k = b.dataset.opt, on = !b.classList.contains('on'); b.classList.toggle('on', on);
  if (k === 'shadow') { renderer.shadowMap.enabled = on; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); } if (k === 'bloom') bloom.enabled = on; if (k === 'outline') outlines.forEach(o => { o.visible = on; }); if (k === 'grass') window.__grass.visible = on; });
window.__HDSET = e => { envFrom = envCur = JSON.parse(JSON.stringify(ENV[e])); envTo = ENV[e]; envK = 1; applyEnv(envCur); };
window.__HDCAM = (y, p, d, pos) => { yaw = y; pitch = p; dist = d; if (pos) { player.mesh.position.x = pos[0]; player.mesh.position.z = pos[1]; } snap = true; };
document.getElementById('hdLoad').hidden = true;
requestAnimationFrame(frame);
