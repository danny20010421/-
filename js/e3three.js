/* 新版 3D 畫面（Three.js）：把原本登島場景用的輕量引擎（E3.Renderer）整個換成 Three.js 版，13 座島一次升級。
   介面與原本完全相同（mesh／draw／sprite／texture／setCamera／project／begin／resize／free），所以劇情、任務、NPC、敵人、寶箱、潛入、小地圖都不用改。
   升級內容：卡通分階光影＋外框描邊、即時陰影、風格化天空與雲、海面（淺灘透色、岸邊浪花、天空反射、太陽高光）、隨風擺動的草地、
   HD-2D 立繪角色（受場景光照、投射剪影陰影）、泛光＋ACES 色調＋調色、多重取樣抗鋸齒。
   設定頁可以關閉（op_r3 = '0'）改回原本的畫面；瀏覽器不支援 WebGL2 時也會自動用原本的畫面。 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const OLD = window.E3 && window.E3.Renderer;
const ok = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; } })();
const enabled = () => { try { return localStorage.getItem('op_r3') !== '0'; } catch (e) { return true; } };
const lin = v => Math.pow(v, 2.2);
const col3 = a => new THREE.Color().setRGB(a[0], a[1], a[2], THREE.SRGBColorSpace);
const U = { uTime: { value: 0 }, uRim: { value: new THREE.Color(1, .95, .85) }, uRimK: { value: .3 }, uWind: { value: 1 } };
const grad = (() => { const t = new THREE.DataTexture(new Uint8Array([72, 72, 72, 255, 150, 150, 150, 255, 215, 215, 215, 255, 255, 255, 255, 255]), 4, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; })();
function toon(o = {}) {
  const m = new THREE.MeshToonMaterial({ vertexColors: o.vc !== false, gradientMap: grad, color: o.color || 0xffffff, side: o.side || THREE.FrontSide });
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
    if (o.grass) sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime, uWind; varying float vGy;').replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 _wp = modelMatrix * instanceMatrix * vec4(transformed, 1.0); float _k = position.y*position.y*.55; float _s = sin(uTime*1.6 + _wp.x*.35 + _wp.z*.27)*.6 + sin(uTime*2.7 + _wp.x*.9)*.25; transformed.x += _s*_k*uWind; transformed.z += _s*.6*_k*uWind; vGy = position.y;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nuniform vec3 uRim; uniform float uRimK;${o.grass ? ' varying float vGy;' : ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>${o.grass ? '\n diffuseColor.rgb *= mix(.42, 1.02, clamp(vGy,0.,1.));' : ''}`)
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n float _rim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 3.0); gl_FragColor.rgb += uRim * _rim * uRimK;'); };
  m.customProgramCacheKey = () => 'e3t' + (o.grass ? 'g' : '');
  return m;
}
function outlineMat(thick) {
  return new THREE.ShaderMaterial({ side: THREE.BackSide, fog: true, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uThick: { value: thick }, uCol: { value: new THREE.Color(0x2a1e24) } }]),
    vertexShader: `uniform float uThick;\n#include <fog_pars_vertex>\nvoid main(){ vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); float d = -mvPosition.z; vec3 n = normalize(normalMatrix * normal); mvPosition.xyz += n * uThick * (1.0 + d*.012); gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}`,
    fragmentShader: `uniform vec3 uCol;\n#include <fog_pars_fragment>\nvoid main(){ gl_FragColor = vec4(uCol, 1.0);\n#include <fog_fragment>\n}` });
}
const softTex = (a0, a1) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, `rgba(0,0,0,${a0})`); r.addColorStop(.6, `rgba(0,0,0,${a1})`); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); };
/* 各島的水色：深水、淺灘 */
const WATERC = { east: ['#145e9e', '#3fd0c4'], alabasta: ['#1a6aa0', '#5ad8c8'], skypiea: ['#d8ecff', '#ffffff'], enies: ['#1a4f80', '#3fa8b8'], thriller: ['#1a2a40', '#3a5a6a'], marineford: ['#1a4a78', '#4aa8c0'], fishman: ['#0a3a68', '#2a9ac0'], dressrosa: ['#1a6aa0', '#4fd6c8'], wholecake: ['#3a6ab0', '#7ad8e0'], wano: ['#1a4a68', '#4a9aa8'], dark: ['#102438', '#2a5068'], egghead: ['#1468a8', '#3ad8e0'], giant: ['#1a5a70', '#4ab0b0'] };

class R3 {
  constructor(canvas) {
    this.canvas = canvas; this.low = localStorage.getItem('op_gfx') === 'low'; this.maxDpr = this.low ? .75 : Math.min(devicePixelRatio || 1, 2); this.dpr = this.maxDpr;
    const rd = this.rd = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); rd.shadowMap.enabled = true; rd.shadowMap.type = THREE.PCFShadowMap; rd.toneMapping = THREE.ACESFilmicToneMapping; rd.toneMappingExposure = .95;
    const S = this.scene = new THREE.Scene(); S.fog = new THREE.Fog(0xbfe3f6, 120, 480); this.camera = new THREE.PerspectiveCamera(52, 1, .4, 1600);
    this.hemi = new THREE.HemisphereLight(0xc6dcff, 0x7a8a5a, 1); S.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight(0xfff2dc, 2.6); sun.castShadow = true; const n = this.low ? 1024 : 4096; sun.shadow.mapSize.set(n, n); Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 1, far: 420 }); sun.shadow.bias = -.0004; sun.shadow.normalBias = .06; S.add(sun); S.add(sun.target);
    this.mat = toon(); this.olStatic = outlineMat(.03); this.olObj = outlineMat(.04);
    /* 天空 */
    this.SKY = { uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSun: { value: new THREE.Vector3(.4, .8, .3) }, uSunCol: { value: new THREE.Color(1, .95, .85) }, uFog: { value: new THREE.Color() }, uCloud: { value: 1 }, uTime: U.uTime };
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: this.SKY,
      vertexShader: `varying vec3 vD; void main(){ vD = normalize((modelMatrix*vec4(position,1.)).xyz - cameraPosition); vec4 p = projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.); gl_Position = p.xyww; }`,
      fragmentShader: `uniform vec3 uZen, uHor, uSun, uSunCol, uFog; uniform float uTime, uCloud; varying vec3 vD;
        float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); } float ns(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y); }
        float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*ns(p); p=p*2.03+vec2(17.1,9.3); a*=.5; } return s; }
        void main(){ vec3 d = normalize(vD); float h = max(d.y, 0.); vec3 col = mix(uHor, uZen, pow(h, .5)); float sd = max(dot(d, normalize(uSun)), 0.); col += uSunCol*(pow(sd, 1200.)*6. + pow(sd, 10.)*.25);
          if (d.y > 0. && uCloud > 0.) { vec2 cp = d.xz/(d.y+.1)*.6 + vec2(uTime*.01, uTime*.004); float c = fbm(cp*1.2); c = smoothstep(.5, .74, c)*smoothstep(0., .2, d.y)*uCloud; float lit = smoothstep(.4, .85, fbm(cp*1.2 + normalize(uSun).xz*.1)); col = mix(col, mix(uHor*.85 + .08, vec3(1.), lit*.7+.3), c*.9); }
          col = mix(col, uFog, smoothstep(.1, 0., d.y)*.7); gl_FragColor = vec4(col, 1.); }` }));
    this.sky.renderOrder = -1; S.add(this.sky);
    /* 後製 */
    const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: this.low ? 0 : 4 }); this.composer = new EffectComposer(rd, rt); this.composer.addPass(new RenderPass(S, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .35, .6, .92); this.composer.addPass(this.bloom);
    this.grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uSat: { value: 1.15 }, uCon: { value: 1.06 }, uVig: { value: .3 }, uFlash: { value: 0 } }, vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uSat, uCon, uVig, uFlash; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(.2126,.7152,.0722)); c.rgb = mix(vec3(l), c.rgb, uSat); c.rgb = max(vec3(0.), (c.rgb-.18)*uCon+.18); vec2 q = vUv-.5; c.rgb *= 1. - dot(q,q)*uVig; c.rgb += vec3(uFlash); gl_FragColor = c; }` });
    this.composer.addPass(this.grade); this.composer.addPass(new OutputPass());
    this.handles = new Set(); this.tex = new Map(); this.sprPools = new Map(); this.shPool = { list: [], used: 0 }; this.env = {}; this.time = 0; this.flash = 0; this.island = new THREE.Group(); S.add(this.island);
    this.contact = softTex(.55, .25); this.aspect = 1.6; this.eye = [0, 10, 20]; this.target = [0, 0, 0];
  }
  /* ---------- 與原本引擎相同的介面 ---------- */
  resize() { const c = this.canvas, w = Math.max(1, c.clientWidth), h = Math.max(1, c.clientHeight); if (this._w === w && this._h === h && this._d === this.dpr) return; this._w = w; this._h = h; this._d = this.dpr; this.rd.setPixelRatio(this.dpr); this.rd.setSize(w, h, false); this.composer.setPixelRatio(this.dpr); this.composer.setSize(w, h); this.aspect = w / h; }
  mesh(b) { const n = b.count; if (!n) return { n: 0 }; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3)); const c = new Float32Array(b.c.length); for (let i = 0; i < c.length; i++) c[i] = lin(b.c[i]); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.computeBoundingSphere();
    const h = { geo: g, n, pool: [], used: 0, big: n > 20000 }; this.handles.add(h); return h; }
  free(h) { if (!h || !h.geo) return; h.pool.forEach(o => { this.scene.remove(o); if (o.material !== this.mat && o.material.dispose) o.material.dispose(); }); h.geo.dispose(); this.handles.delete(h); }
  texture(url) { if (this.tex.has(url)) return this.tex.get(url); const rec = { ready: false, w: 1, h: 1 }; rec.t = new THREE.TextureLoader().load(url, t => { rec.ready = true; rec.w = t.image.naturalWidth || t.image.width; rec.h = t.image.naturalHeight || t.image.height; }); rec.t.colorSpace = THREE.SRGBColorSpace; rec.t.anisotropy = 8; rec.t.generateMipmaps = false; rec.t.minFilter = THREE.LinearFilter; /* 立繪不做 mipmap，避免遠看變糊 */ this.tex.set(url, rec); return rec; }
  setCamera(eye, target, fov) { this.eye = eye; this.target = target; { const dx = target[0] - eye[0], dz = target[2] - eye[2], l = Math.hypot(dx, dz) || 1; this.right = [-dz / l, 0, dx / l]; } const c = this.camera; c.fov = (fov || .9) * 180 / Math.PI * 1.05; c.aspect = this.aspect; c.position.set(eye[0], eye[1], eye[2]); c.lookAt(target[0], target[1], target[2]); c.updateProjectionMatrix(); c.updateMatrixWorld(); }
  project(x, y, z) { const v = new THREE.Vector3(x, y, z).applyMatrix4(this.camera.matrixWorldInverse); const d = -v.z; if (d <= .1) return null; v.applyMatrix4(this.camera.projectionMatrix); return { x: (v.x * .5 + .5) * this.canvas.clientWidth, y: (1 - (v.y * .5 + .5)) * this.canvas.clientHeight, d }; }
  begin() { this.handles.forEach(h => { for (let i = 0; i < h.pool.length; i++) h.pool[i].visible = false; h.used = 0; }); this.sprPools.forEach(p => { p.list.forEach(o => { o.visible = false; }); p.used = 0; }); this.shPool.list.forEach(o => { o.visible = false; }); this.shPool.used = 0;
    if (!this._queued) { this._queued = true; queueMicrotask(() => { this._queued = false; this.flush(); }); } }
  draw(h, model, opts) {
    if (!h || !h.n || h.skip) return; opts = opts || {};
    if (opts.wave && this.water) return;                 /* 海面改用新的水面 */
    if (opts.mat === 3) return;                           /* 天空改用新的天空 */
    let o = h.pool[h.used];
    if (!o) { const alpha = !!opts.alpha;
      if (alpha) o = new THREE.Mesh(h.geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true }));
      else { o = new THREE.Mesh(h.geo, this.mat); o.castShadow = true; o.receiveShadow = true; if (!opts.noOutline && !h.big) { const ol = new THREE.Mesh(h.geo, this.olObj); ol.matrixAutoUpdate = false; o.add(ol); } if (opts.noCull) o.material = this.matDS || (this.matDS = toon({ side: THREE.DoubleSide })); }
      o.matrixAutoUpdate = false; o.userData.alpha = alpha; h.pool.push(o); this.scene.add(o); }
    h.used++; o.visible = true;
    if (model) o.matrix.fromArray(model); else o.matrix.identity(); o.matrixWorldNeedsUpdate = true;
    const t = opts.tint;
    if (o.userData.alpha) { o.material.color.setRGB(t ? t[0] : 1, t ? t[1] : 1, t ? t[2] : 1, THREE.SRGBColorSpace); o.material.opacity = t ? t[3] : .5; }
    else if (t && (t[0] !== 1 || t[1] !== 1 || t[2] !== 1)) { if (!o.userData.own) { o.material = toon({ side: opts.noCull ? THREE.DoubleSide : THREE.FrontSide }); o.userData.own = true; } o.material.color.setRGB(t[0], t[1], t[2], THREE.SRGBColorSpace); }
  }
  sprite(url, x, y, z, w, h, opts) {
    opts = opts || {};
    if (opts.shadow) { let o = this.shPool.list[this.shPool.used]; if (!o) { o = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.contact, transparent: true, depthWrite: false, fog: true })); o.renderOrder = 3; this.shPool.list.push(o); this.scene.add(o); }
      this.shPool.used++; o.visible = true; o.position.set(x, y + .06, z); o.scale.set(w * .62, 1, h * .62); return null; }
    const rec = this.texture(url); if (!rec.ready) return rec;
    let P = this.sprPools.get(url); if (!P) { P = { list: [], used: 0 }; this.sprPools.set(url, P); }
    let o = P.list[P.used];
    if (!o) { const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, .5, 0); const nr = geo.attributes.normal; for (let i = 0; i < nr.count; i++) nr.setXYZ(i, 0, .75, .66);
      const m = new THREE.MeshLambertMaterial({ map: rec.t, alphaTest: .12, side: THREE.DoubleSide, transparent: true, depthWrite: true }); m.toneMapped = false; m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uRim; uniform float uRimK;').replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.rgb = mix(gl_FragColor.rgb * (1.0 + uRim*.1), diffuseColor.rgb * (.9 + uRim*.12), .6);'); };
      o = new THREE.Mesh(geo, m); o.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: rec.t, alphaTest: .4 }); o.castShadow = true; o.receiveShadow = false; P.list.push(o); this.scene.add(o); }
    P.used++; o.visible = true; o.position.set(x, y, z); o.scale.set(w * (opts.flip ? -1 : 1), h, 1); o.rotation.y = Math.atan2(this.eye[0] - x, this.eye[2] - z);
    const t = opts.tint; o.material.color.setRGB(t ? t[0] : 1, t ? t[1] : 1, t ? t[2] : 1); o.material.emissive.setScalar(opts.glow || 0); o.material.opacity = t && t[3] < 1 ? t[3] : 1;
    return rec;
  }
  /* ---------- 新增：載入島嶼時建立水面與草地 ---------- */
  setIsland(S, chapter) {
    this.island.clear(); this.water = null; if (S.cloud) S.cloud.skip = true; /* 舊的方塊雲改由新天空的雲取代 */ const id = chapter.id, E = chapter.env, R0 = 170, N = 256;
    const hd = new Float32Array(N * N); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) hd[j * N + i] = S.H(-R0 + i / (N - 1) * R0 * 2, -R0 + j / (N - 1) * R0 * 2);
    const hTex = new THREE.DataTexture(hd, N, N, THREE.RedFormat, THREE.FloatType); hTex.minFilter = hTex.magFilter = THREE.LinearFilter; hTex.needsUpdate = true;
    const wc = WATERC[id] || ['#145e9e', '#3fd0c4'], cloudSea = id === 'skypiea';
    if (!this.nTex) { this.nTex = new THREE.TextureLoader().load('vendor/three/textures/waternormals.jpg'); this.nTex.wrapS = this.nTex.wrapT = THREE.RepeatWrapping; }
    this.WU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uH: { value: null }, uN: { value: null }, uR: { value: R0 }, uSun: { value: new THREE.Vector3(.4, .8, .3) }, uSunCol: { value: new THREE.Color(1, .95, .85) }, uDeep: { value: new THREE.Color(wc[0]) }, uShallow: { value: new THREE.Color(wc[1]) }, uSkyA: { value: new THREE.Color() }, uSkyB: { value: new THREE.Color() }, uCloudSea: { value: cloudSea ? 1 : 0 } }]);
    this.WU.uH.value = hTex; this.WU.uN.value = this.nTex; this.WU.uTime = U.uTime;
    const w = new THREE.Mesh(new THREE.PlaneGeometry(R0 * 6, R0 * 6, this.low ? 96 : 220, this.low ? 96 : 220).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: this.WU, transparent: true, fog: true,
      vertexShader: `uniform float uTime; varying vec3 vW; varying float vWave;\n#include <fog_pars_vertex>\nvoid main(){ vec3 p = position; float t = uTime; float w = sin(p.x*.16+t*1.1)*.2 + sin(p.z*.21-t*.9)*.16 + sin((p.x+p.z)*.43+t*1.8)*.06; p.y += w; vWave = w; vec4 wp = modelMatrix*vec4(p,1.); vW = wp.xyz; vec4 mvPosition = viewMatrix*wp; gl_Position = projectionMatrix*mvPosition;\n#include <fog_vertex>\n}`,
      fragmentShader: `uniform sampler2D uH, uN; uniform float uR, uTime, uCloudSea; uniform vec3 uSun, uSunCol, uDeep, uShallow, uSkyA, uSkyB; varying vec3 vW; varying float vWave;\n#include <fog_pars_fragment>
        float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); } float ns(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y); }
        void main(){ vec2 uv = (vW.xz + uR) / (uR*2.); float g = (uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.) ? -14. : texture2D(uH, uv).r; float depth = vW.y - g;
          vec3 n1 = texture2D(uN, vW.xz*.035 + vec2(uTime*.012, uTime*.008)).xzy*2.-1.; vec3 n2 = texture2D(uN, vW.xz*.09 - vec2(uTime*.02, -uTime*.01)).xzy*2.-1.; vec3 n = normalize(vec3(0.,1.,0.) + (n1+n2)*vec3(.35,0.,.35));
          vec3 v = normalize(cameraPosition - vW); float fr = pow(1. - max(dot(n, v), 0.), 4.);
          vec3 base = mix(uShallow, uDeep, smoothstep(.3, 7., depth)); vec3 refl = mix(uSkyB, uSkyA, clamp(reflect(-v, n).y*1.6, 0., 1.)); vec3 col = mix(base, refl, fr*.7);
          if (uCloudSea > .5) { col = mix(vec3(.95,.97,1.), vec3(1.), ns(vW.xz*.05 + uTime*.02)); col *= .9 + .1*ns(vW.xz*.3); }
          col += smoothstep(.55, .9, ns(vW.xz*.9 + n.xz*3. + uTime*.3)) * smoothstep(3., .4, depth) * .22 * (1. - uCloudSea);
          vec3 hv = normalize(uSun + v); float sp = pow(max(dot(n, hv), 0.), 300.); col += uSunCol * smoothstep(.25, .45, sp) * 1.5 * (1. - uCloudSea);
          float foam = smoothstep(1.2, .0, depth) * (.55 + .45*ns(vW.xz*1.4 + uTime*.7)); float edge = smoothstep(.18, .0, abs(depth - .55 - sin(uTime*1.3 + vW.x*.2)*.25)) * .7; foam = max(foam, edge*smoothstep(2.5,.2,depth)); foam += smoothstep(.16,.24,vWave)*.18;
          col = mix(col, vec3(1.), clamp(foam, 0., 1.)*.85); float a = clamp(mix(.55, .97, smoothstep(0., 3.5, depth)) + foam + uCloudSea, 0., 1.);
          gl_FragColor = vec4(col, a);\n#include <fog_fragment>\n}` }));
    w.renderOrder = 2; this.island.add(w); this.water = w;
    /* 草地：地面是綠色系的島才長草 */
    const gr = E.ground ? new THREE.Color(E.ground) : null, green = gr && gr.g > gr.r * 1.05 && gr.g > gr.b; this.grass = null;
    if (green && !this.low) { const blade = new THREE.PlaneGeometry(.14, 1, 1, 4); blade.translate(0, .5, 0); const bp = blade.attributes.position; for (let i = 0; i < bp.count; i++) { const y = bp.getY(i); bp.setX(i, bp.getX(i) * (1 - y * .85)); bp.setZ(i, y * y * .18); } const nr = blade.attributes.normal; for (let i = 0; i < nr.count; i++) nr.setXYZ(i, 0, 1, 0);
      const NG = 70000, gm = new THREE.InstancedMesh(blade, toon({ vc: false, grass: true, side: THREE.DoubleSide }), NG); gm.receiveShadow = true; const Mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color(); let n = 0;
      const base = gr.clone().multiplyScalar(1.05), tip = gr.clone().lerp(new THREE.Color('#d8f080'), .4), path = (chapter.layout && chapter.layout.path) || [], obs = S.obstacles || [];
      const pd = (x, z) => { let d = 1e9; for (let i = 0; i < path.length - 1; i++) { const a = path[i], b = path[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); d = Math.min(d, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)); } return d; };
      let sd = 777; const rnd = () => (sd = sd * 16807 % 2147483647) / 2147483647;
      for (let k = 0; k < 400000 && n < NG; k++) { const x = (rnd() - .5) * 200, z = (rnd() - .5) * 200, h = S.H(x, z); if (h < 1.2) continue; const sl = Math.abs(S.H(x + .7, z) - h) + Math.abs(S.H(x, z + .7) - h); if (sl > .6 || pd(x, z) < 3.2 || obs.some(o => Math.hypot(x - o[0], z - o[1]) < o[2] * .8)) continue;
        e.set(0, rnd() * 6.28, 0); q.setFromEuler(e); Mx.compose(new THREE.Vector3(x, h - .05, z), q, new THREE.Vector3(.8 + rnd() * .5, .55 + rnd() * .8, 1)); gm.setMatrixAt(n, Mx); c.copy(base).lerp(tip, rnd()); gm.setColorAt(n, c); n++; }
      gm.count = n; gm.instanceMatrix.needsUpdate = true; if (gm.instanceColor) gm.instanceColor.needsUpdate = true; this.island.add(gm); this.grass = gm; }
    /* 煙囪冒煙 */
    if ((S.chimneys || []).length) { const pos = [], sdA = []; S.chimneys.forEach(p => { for (let i = 0; i < 12; i++) { pos.push(p[0], p[1], p[2]); sdA.push(i / 12 + Math.random() * .05); } }); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.Float32BufferAttribute(sdA, 1));
      this.island.add(new THREE.Points(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uTime: U.uTime, uTex: { value: this.puff || (this.puff = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), r = x.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.5, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = r; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })()) } },
        vertexShader: `attribute float seed; uniform float uTime; varying float vA; void main(){ float t = fract(uTime*.08 + seed); vec3 p = position + vec3(t*2.5 + sin(t*6.+seed*20.)*.4, t*7., t); vA = (1.-t)*smoothstep(0.,.1,t)*.5; vec4 mv = modelViewMatrix*vec4(p,1.); gl_Position = projectionMatrix*mv; gl_PointSize = (1.2 + t*3.5)*300./-mv.z; }`,
        fragmentShader: `uniform sampler2D uTex; varying float vA; void main(){ gl_FragColor = vec4(vec3(.96), texture2D(uTex, gl_PointCoord).a*vA); }` }))); }
    /* 空中的光點與綠色島的小花 */
    { const pos = [], sdB = []; let sd2 = 99; const rn = () => (sd2 = sd2 * 16807 % 2147483647) / 2147483647; for (let i = 0; i < 260; i++) { const x = (rn() - .5) * 150, z = (rn() - .5) * 150, h = S.H(x, z); if (h < 0) continue; pos.push(x, h + .8 + rn() * 4, z); sdB.push(rn()); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.Float32BufferAttribute(sdB, 1)); const mc = id === 'fishman' ? new THREE.Color(.6, .9, 1) : this.dark || id === 'thriller' ? new THREE.Color(.75, 1, .45) : new THREE.Color(1, .92, .6);
      this.island.add(new THREE.Points(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: U.uTime, uTex: { value: this.puff || (this.puff = this.contact) }, uCol: { value: mc } },
        vertexShader: `attribute float seed; uniform float uTime; varying float vA; void main(){ float t = uTime*.3 + seed*6.28; vec3 p = position + vec3(sin(t)*2., sin(t*1.7), cos(t*.8)*2.); vA = .35+.35*sin(uTime*2.+seed*40.); vec4 mv = modelViewMatrix*vec4(p,1.); gl_Position = projectionMatrix*mv; gl_PointSize = (.6+seed)*90./-mv.z; }`,
        fragmentShader: `uniform sampler2D uTex; uniform vec3 uCol; varying float vA; void main(){ gl_FragColor = vec4(uCol*1.6, texture2D(uTex, gl_PointCoord).a*vA); }` }))); }
    if (green) { const fl = new THREE.IcosahedronGeometry(.13, 0), FN = this.low ? 800 : 3000, fm = new THREE.InstancedMesh(fl, toon({ vc: false }), FN), FC = ['#ffffff', '#ffe14a', '#ff8ab0', '#b08aff', '#ff9a5a'].map(c => new THREE.Color(c)), Mx = new THREE.Matrix4(), path = (chapter.layout && chapter.layout.path) || []; let n = 0, sd3 = 4242; const rn = () => (sd3 = sd3 * 16807 % 2147483647) / 2147483647;
      for (let k = 0; k < 60000 && n < FN; k++) { const x = (rn() - .5) * 180, z = (rn() - .5) * 180, h = S.H(x, z); if (h < 1.3) continue; if (Math.abs(S.H(x + .7, z) - h) > .4) continue; if (path.some((p, i) => i < path.length - 1 && Math.hypot(x - p[0], z - p[1]) < 4)) continue; Mx.makeTranslation(x, h + .35 + rn() * .35, z); fm.setMatrixAt(n, Mx); fm.setColorAt(n, FC[(rn() * 5) | 0]); n++; }
      fm.count = n; if (fm.instanceColor) fm.instanceColor.needsUpdate = true; this.island.add(fm); }
    this.chapterId = id; this.dark = id === 'dark' || id === 'thriller';
  }
  flush() {
    const e = this.env; if (!e || !e.fog) return; this.resize(); this.time = this.time || 0; U.uTime.value = this.time;
    const fog = col3(e.fog), sky = col3(e.sky), gnd = col3(e.ground), sd = new THREE.Vector3(...(e.sun || [.4, .8, .3])).normalize();
    this.scene.fog.color.copy(fog); this.scene.fog.near = (e.fogR ? e.fogR[0] : 60) * 1.5; this.scene.fog.far = (e.fogR ? e.fogR[1] : 260) * 2;
    this.hemi.color.copy(sky).lerp(new THREE.Color(1, 1, 1), .35); this.hemi.groundColor.copy(gnd); this.hemi.intensity = this.dark ? .8 : 1;
    this.sun.intensity = this.dark ? 1.6 : 2.6; this.sun.color.set(this.dark ? 0xb8c4ff : 0xfff2dc); U.uRim.value.copy(this.sun.color);
    this.SKY.uZen.value.copy(sky).multiplyScalar(this.dark ? .55 : .8); this.SKY.uHor.value.copy(fog); this.SKY.uFog.value.copy(fog); this.SKY.uSun.value.copy(sd); this.SKY.uSunCol.value.copy(this.sun.color); this.SKY.uCloud.value = this.chapterId === 'fishman' ? 0 : 1;
    if (this.WU) { this.WU.uSun.value.copy(sd); this.WU.uSunCol.value.copy(this.sun.color); this.WU.uSkyA.value.copy(this.SKY.uZen.value); this.WU.uSkyB.value.copy(fog); }
    const tg = new THREE.Vector3(...this.target); this.sun.target.position.copy(tg); this.sun.position.copy(tg).addScaledVector(sd, 180); this.sky.position.copy(this.camera.position);
    this.grade.uniforms.uFlash.value = this.flash || 0; if (this.grass) this.grass.visible = true;
    this.composer.render();
  }
}
if (window.E3 && ok && enabled()) { window.E3.Renderer = R3; window.E3.Renderer3 = R3; window.E3.RendererOld = OLD;
  /* 載入島嶼時，讓新渲染器建立水面與草地 */
  if (window.World) { const L = window.World.prototype.load; window.World.prototype.load = function (ch, pid, st) { const r = L.apply(this, arguments); if (this.r && this.r.setIsland) this.r.setIsland(this.scene, ch); return r; }; }
}
window.__R3 = { ok, enabled: enabled() };
