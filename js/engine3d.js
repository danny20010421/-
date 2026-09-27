/* 輕量 WebGL 引擎：低多邊形場景、廣告板角色、霧效與動態水面。無外部依賴。 */
(function (global) {
  'use strict';
  const M = {
    ident() { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); },
    mul(a, b) {
      const o = new Float32Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        o[c*4+r] = a[r]*b[c*4] + a[4+r]*b[c*4+1] + a[8+r]*b[c*4+2] + a[12+r]*b[c*4+3];
      }
      return o;
    },
    persp(fov, asp, n, f) {
      const t = 1 / Math.tan(fov / 2), nf = 1 / (n - f);
      return new Float32Array([t/asp,0,0,0, 0,t,0,0, 0,0,(f+n)*nf,-1, 0,0,2*f*n*nf,0]);
    },
    lookAt(e, c, u) {
      let zx=e[0]-c[0], zy=e[1]-c[1], zz=e[2]-c[2]; let l=Math.hypot(zx,zy,zz)||1; zx/=l; zy/=l; zz/=l;
      let xx=u[1]*zz-u[2]*zy, xy=u[2]*zx-u[0]*zz, xz=u[0]*zy-u[1]*zx; l=Math.hypot(xx,xy,xz)||1; xx/=l; xy/=l; xz/=l;
      const yx=zy*xz-zz*xy, yy=zz*xx-zx*xz, yz=zx*xy-zy*xx;
      return new Float32Array([xx,yx,zx,0, xy,yy,zy,0, xz,yz,zz,0,
        -(xx*e[0]+xy*e[1]+xz*e[2]), -(yx*e[0]+yy*e[1]+yz*e[2]), -(zx*e[0]+zy*e[1]+zz*e[2]), 1]);
    },
    trs(x, y, z, ry, s) {
      const c = Math.cos(ry), n = Math.sin(ry);
      return new Float32Array([c*s,0,-n*s,0, 0,s,0,0, n*s,0,c*s,0, x,y,z,1]);
    },
    rx(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]); },
    rz(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]); },
    trs3(x, y, z, ry, sx, sy, sz) {
      const c = Math.cos(ry), n = Math.sin(ry);
      return new Float32Array([c*sx,0,-n*sx,0, 0,sy,0,0, n*sz,0,c*sz,0, x,y,z,1]);
    }
  };

  function hex(c) {
    if (Array.isArray(c)) return c;
    const n = parseInt(c.replace('#', ''), 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }
  function shade(c, k) { c = hex(c); return [c[0]*k, c[1]*k, c[2]*k]; }
  function mix(a, b, t) { a = hex(a); b = hex(b); return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }

  /* 以三角形清單建構平面著色網格 */
  class Builder {
    constructor() { this.p = []; this.n = []; this.c = []; }
    tri(a, b, c, col) {
      const ux=b[0]-a[0], uy=b[1]-a[1], uz=b[2]-a[2], vx=c[0]-a[0], vy=c[1]-a[1], vz=c[2]-a[2];
      let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx; const l=Math.hypot(nx,ny,nz)||1; nx/=l; ny/=l; nz/=l;
      this.p.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) { this.n.push(nx, ny, nz); this.c.push(col[0], col[1], col[2]); }
    }
    quad(a, b, c, d, col) { this.tri(a, b, c, col); this.tri(a, c, d, col); }
    // 以局部座標轉換：旋轉 Y、平移
    _xf(o, ry) { const cs = Math.cos(ry || 0), sn = Math.sin(ry || 0); return (x, y, z) => [o[0] + x*cs + z*sn, o[1] + y, o[2] - x*sn + z*cs]; }
    box(cx, cy, cz, sx, sy, sz, col, ry, taper) {
      col = hex(col); const f = this._xf([cx, cy, cz], ry); const hx = sx/2, hz = sz/2, t = taper == null ? 1 : taper;
      const v = [f(-hx,0,-hz), f(hx,0,-hz), f(hx,0,hz), f(-hx,0,hz), f(-hx*t,sy,-hz*t), f(hx*t,sy,-hz*t), f(hx*t,sy,hz*t), f(-hx*t,sy,hz*t)];
      const top = shade(col, 1.06), side = col, bot = shade(col, .7);
      this.quad(v[4], v[7], v[6], v[5], top); this.quad(v[0], v[1], v[2], v[3], bot);
      this.quad(v[3], v[2], v[6], v[7], side); this.quad(v[1], v[0], v[4], v[5], side);
      this.quad(v[2], v[1], v[5], v[6], shade(col, .92)); this.quad(v[0], v[3], v[7], v[4], shade(col, .92));
    }
    cyl(cx, cy, cz, rb, rt, h, seg, col, colTop, ry, tilt) {
      col = hex(col); colTop = colTop ? hex(colTop) : shade(col, 1.08);
      const tx = tilt ? tilt[0] : 0, tz = tilt ? tilt[1] : 0; const f = this._xf([cx, cy, cz], ry || 0);
      for (let i = 0; i < seg; i++) {
        const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
        const b0 = f(Math.cos(a0)*rb, 0, Math.sin(a0)*rb), b1 = f(Math.cos(a1)*rb, 0, Math.sin(a1)*rb);
        const t0 = f(Math.cos(a0)*rt + tx, h, Math.sin(a0)*rt + tz), t1 = f(Math.cos(a1)*rt + tx, h, Math.sin(a1)*rt + tz);
        this.quad(b1, b0, t0, t1, col);
        if (rt > 0.001) this.tri(f(tx, h, tz), t1, t0, colTop);
      }
    }
    sphere(cx, cy, cz, r, seg, col, sy, jitter, seed) {
      col = hex(col); sy = sy || 1; const rings = Math.max(3, Math.floor(seg / 2)); let s = seed || 1;
      const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      const pts = [];
      for (let y = 0; y <= rings; y++) {
        const row = []; const th = y / rings * Math.PI;
        for (let x = 0; x <= seg; x++) {
          const ph = x / seg * Math.PI * 2; const j = jitter ? 1 + (rnd() - .5) * jitter : 1;
          const xx = x === seg ? row[0] : null;
          row.push(xx || [cx + Math.sin(th)*Math.cos(ph)*r*j, cy + Math.cos(th)*r*sy*j, cz + Math.sin(th)*Math.sin(ph)*r*j]);
        }
        pts.push(row);
      }
      for (let y = 0; y < rings; y++) for (let x = 0; x < seg; x++) {
        const a = pts[y][x], b = pts[y][x+1], c = pts[y+1][x+1], d = pts[y+1][x];
        const k = .88 + .12 * (1 - y / rings);
        if (y === 0) this.tri(a, c, d, shade(col, k)); else if (y === rings - 1) this.tri(a, b, d, shade(col, k)); else this.quad(a, b, c, d, shade(col, k));
      }
    }
    terrain(size, res, hfn, cfn, ox, oz) {
      ox = ox || 0; oz = oz || 0; const st = size / res, h0 = -size / 2;
      const H = []; for (let z = 0; z <= res; z++) { H.push([]); for (let x = 0; x <= res; x++) { const wx = ox + h0 + x*st, wz = oz + h0 + z*st; H[z].push([wx, hfn(wx, wz), wz]); } }
      for (let z = 0; z < res; z++) for (let x = 0; x < res; x++) {
        const a = H[z][x], b = H[z][x+1], c = H[z+1][x+1], d = H[z+1][x];
        const m1 = [(a[0]+b[0]+c[0])/3, (a[1]+b[1]+c[1])/3, (a[2]+b[2]+c[2])/3];
        const m2 = [(a[0]+c[0]+d[0])/3, (a[1]+c[1]+d[1])/3, (a[2]+c[2]+d[2])/3];
        this.tri(a, c, b, cfn(m1[0], m1[1], m1[2])); this.tri(a, d, c, cfn(m2[0], m2[1], m2[2]));
      }
    }
    grid(size, res, y, col) { // 水面或雲海用平面格
      col = hex(col); const st = size / res, h0 = -size / 2;
      for (let z = 0; z < res; z++) for (let x = 0; x < res; x++) {
        const x0 = h0 + x*st, z0 = h0 + z*st;
        this.quad([x0, y, z0], [x0, y, z0 + st], [x0 + st, y, z0 + st], [x0 + st, y, z0], col);
      }
    }
    get count() { return this.p.length / 3; }
  }

  const VS = `
precision highp float;
attribute vec3 aP; attribute vec3 aN; attribute vec3 aC;
uniform mat4 uPV; uniform mat4 uM; uniform float uT; uniform float uWave; uniform vec3 uCam;
varying vec3 vN; varying vec3 vC; varying float vD; varying vec3 vW;
void main(){
  vec4 w = uM * vec4(aP,1.0);
  vec3 n = normalize(mat3(uM) * aN);
  if(uWave > 0.5){
    float a = sin(w.x*0.18 + uT*1.1) * 0.35 + cos(w.z*0.21 + uT*0.9) * 0.3;
    w.y += a;
    n = normalize(vec3(-cos(w.x*0.18+uT*1.1)*0.063, 1.0, sin(w.z*0.21+uT*0.9)*0.063));
  }
  vW = w.xyz; vN = n; vC = aC; vD = distance(w.xyz, uCam);
  gl_Position = uPV * w;
}`;
  const FS = `
precision highp float;
varying vec3 vN; varying vec3 vC; varying float vD; varying vec3 vW;
uniform vec3 uSun; uniform vec3 uSky; uniform vec3 uGround; uniform vec3 uFog; uniform vec2 uFogR; uniform vec4 uTint; uniform float uWave; uniform float uT; uniform float uFlash;
void main(){
  vec3 n = normalize(vN);
  float dif = max(dot(n, normalize(uSun)), 0.0);
  vec3 amb = mix(uGround, uSky, n.y*0.5+0.5);
  vec3 col = vC * uTint.rgb;
  if(uWave > 0.5){ float s = sin(vW.x*0.5+uT*2.0)*sin(vW.z*0.45-uT*1.6); col += vec3(0.08)*smoothstep(0.7,1.0,s); }
  vec3 c = col * (amb*0.62 + dif*0.78) + vec3(uFlash);
  float f = clamp((vD - uFogR.x) / (uFogR.y - uFogR.x), 0.0, 1.0);
  gl_FragColor = vec4(mix(c, uFog, f*f*(3.0-2.0*f)), uTint.a);
}`;
  const BVS = `
precision highp float;
attribute vec2 aQ;
uniform mat4 uPV; uniform vec3 uCtr; uniform vec2 uSz; uniform vec3 uRight; uniform float uFlip; uniform vec3 uCam; uniform float uFlat;
varying vec2 vUV; varying float vD;
void main(){
  vec3 up = vec3(0.0,1.0,0.0);
  vec3 p;
  if(uFlat > 0.5){ p = uCtr + vec3((aQ.x)*uSz.x, 0.02, (aQ.y-0.5)*uSz.y); }
  else { p = uCtr + uRight * (aQ.x*uSz.x) + up * (aQ.y*uSz.y); }
  vUV = vec2(uFlip > 0.5 ? 0.5 - aQ.x : aQ.x + 0.5, 1.0 - aQ.y);
  vD = distance(p, uCam);
  gl_Position = uPV * vec4(p,1.0);
}`;
  const BFS = `
precision highp float;
varying vec2 vUV; varying float vD;
uniform sampler2D uTex; uniform vec4 uTint; uniform vec3 uFog; uniform vec2 uFogR; uniform float uMode; uniform float uGlow;
void main(){
  vec4 t;
  if(uMode > 0.5){ float d = length(vUV-vec2(0.5)); t = vec4(0.0,0.0,0.0, smoothstep(0.5,0.0,d)*0.55); }
  else { t = texture2D(uTex, vUV); if(t.a < 0.35) discard; }
  vec3 c = t.rgb * uTint.rgb + vec3(uGlow);
  float f = clamp((vD - uFogR.x) / (uFogR.y - uFogR.x), 0.0, 1.0);
  gl_FragColor = vec4(mix(c, uFog, f*f*0.9), t.a * uTint.a);
}`;

  function compile(gl, type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(gl, vs, fs) {
    const p = gl.createProgram(); gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
    return { p, u, a: (name) => gl.getAttribLocation(p, name) };
  }

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      const gl = canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'high-performance' }) || canvas.getContext('experimental-webgl');
      if (!gl) throw new Error('WebGL 不可用');
      this.gl = gl; this.lit = program(gl, VS, FS); this.bb = program(gl, BVS, BFS);
      this.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-.5,0, .5,0, .5,1, -.5,0, .5,1, -.5,1]), gl.STATIC_DRAW);
      this.tex = new Map(); this.env = {}; this.time = 0; this.flash = 0;
      gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
      this.dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 800 ? 1.25 : 1.6);
    }
    resize() {
      const c = this.canvas, w = Math.max(1, c.clientWidth), h = Math.max(1, c.clientHeight);
      const W = Math.round(w * this.dpr), H = Math.round(h * this.dpr);
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
      this.gl.viewport(0, 0, W, H); this.aspect = w / h;
    }
    mesh(builder) {
      const gl = this.gl, n = builder.count, data = new Float32Array(n * 9);
      for (let i = 0; i < n; i++) {
        data.set(builder.p.slice(i*3, i*3+3), i*9); data.set(builder.n.slice(i*3, i*3+3), i*9+3); data.set(builder.c.slice(i*3, i*3+3), i*9+6);
      }
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      return { buf, n };
    }
    free(mesh) { if (mesh && mesh.buf) this.gl.deleteBuffer(mesh.buf); }
    texture(url) {
      if (this.tex.has(url)) return this.tex.get(url);
      const gl = this.gl, t = gl.createTexture(), rec = { t, ready: false, w: 1, h: 1 };
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
      const img = new Image(); img.decoding = 'async';
      img.onload = () => {
        // 縮放到 2 的冪次，確保行動裝置也能產生 mipmap
        const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512;
        const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, 512, 512);
        gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        rec.ready = true; rec.w = img.naturalWidth; rec.h = img.naturalHeight;
      };
      img.src = url; this.tex.set(url, rec); return rec;
    }
    setCamera(eye, target, fov) {
      this.eye = eye; this.target = target;
      this.proj = M.persp(fov || 0.9, this.aspect || 1.6, 0.5, 700);
      this.view = M.lookAt(eye, target, [0, 1, 0]);
      this.pv = M.mul(this.proj, this.view);
      const dx = target[0] - eye[0], dz = target[2] - eye[2], l = Math.hypot(dx, dz) || 1;
      this.right = [-dz / l, 0, dx / l]; // 視線右向量 = 視線 × 上
    }
    project(x, y, z) {
      const m = this.pv, X = m[0]*x + m[4]*y + m[8]*z + m[12], Y = m[1]*x + m[5]*y + m[9]*z + m[13], W = m[3]*x + m[7]*y + m[11]*z + m[15];
      if (W <= 0.1) return null;
      return { x: (X / W * .5 + .5) * this.canvas.clientWidth, y: (1 - (Y / W * .5 + .5)) * this.canvas.clientHeight, d: W };
    }
    begin() {
      const gl = this.gl, e = this.env, f = e.fog;
      gl.clearColor(f[0], f[1], f[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.depthMask(true); gl.disable(gl.BLEND);
      const L = this.lit; gl.useProgram(L.p);
      gl.uniformMatrix4fv(L.u.uPV, false, this.pv); gl.uniform1f(L.u.uT, this.time); gl.uniform3fv(L.u.uCam, this.eye);
      gl.uniform3fv(L.u.uSun, e.sun); gl.uniform3fv(L.u.uSky, e.sky); gl.uniform3fv(L.u.uGround, e.ground);
      gl.uniform3fv(L.u.uFog, e.fog); gl.uniform2fv(L.u.uFogR, e.fogR); gl.uniform1f(L.u.uFlash, this.flash);
    }
    draw(mesh, model, opts) {
      if (!mesh || !mesh.n) return;
      const gl = this.gl, L = this.lit; opts = opts || {};
      gl.useProgram(L.p);
      gl.uniformMatrix4fv(L.u.uM, false, model || M.ident());
      gl.uniform4fv(L.u.uTint, opts.tint || [1, 1, 1, 1]); gl.uniform1f(L.u.uWave, opts.wave ? 1 : 0);
      const a = opts.alpha;
      if (a) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); }
      if (opts.noCull) gl.disable(gl.CULL_FACE);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
      const P = L.a('aP'), N = L.a('aN'), C = L.a('aC');
      gl.enableVertexAttribArray(P); gl.vertexAttribPointer(P, 3, gl.FLOAT, false, 36, 0);
      gl.enableVertexAttribArray(N); gl.vertexAttribPointer(N, 3, gl.FLOAT, false, 36, 12);
      gl.enableVertexAttribArray(C); gl.vertexAttribPointer(C, 3, gl.FLOAT, false, 36, 24);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.n);
      gl.disableVertexAttribArray(P); gl.disableVertexAttribArray(N); gl.disableVertexAttribArray(C);
      if (a) { gl.disable(gl.BLEND); gl.depthMask(true); }
      if (opts.noCull) gl.enable(gl.CULL_FACE);
    }
    sprite(url, x, y, z, w, h, opts) {
      const gl = this.gl, B = this.bb; opts = opts || {};
      const shadow = opts.shadow;
      let rec = null;
      if (!shadow) { rec = this.texture(url); if (!rec.ready) return; }
      gl.useProgram(B.p); gl.disable(gl.CULL_FACE);
      gl.uniformMatrix4fv(B.u.uPV, false, this.pv); gl.uniform3fv(B.u.uCam, this.eye);
      gl.uniform3f(B.u.uCtr, x, y, z); gl.uniform2f(B.u.uSz, w, h); gl.uniform3fv(B.u.uRight, this.right);
      gl.uniform1f(B.u.uFlip, opts.flip ? 1 : 0); gl.uniform1f(B.u.uFlat, shadow ? 1 : 0);
      gl.uniform4fv(B.u.uTint, opts.tint || [1, 1, 1, 1]); gl.uniform3fv(B.u.uFog, this.env.fog); gl.uniform2fv(B.u.uFogR, this.env.fogR);
      gl.uniform1f(B.u.uMode, shadow ? 1 : 0); gl.uniform1f(B.u.uGlow, opts.glow || 0);
      if (rec) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, rec.t); gl.uniform1i(B.u.uTex, 0); }
      if (shadow) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); }
      else { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
      const Q = B.a('aQ'); gl.enableVertexAttribArray(Q); gl.vertexAttribPointer(Q, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6); gl.disableVertexAttribArray(Q);
      gl.disable(gl.BLEND); gl.depthMask(true); gl.enable(gl.CULL_FACE);
      return rec;
    }
  }

  global.E3 = { M, Builder, Renderer, hex, shade, mix };
})(window);
