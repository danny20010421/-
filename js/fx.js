/* 戰鬥特效引擎 v2：發光粒子貼圖、漸層斬擊、集中線、命中白閃、鏡頭震推 */
const LOWFX = matchMedia('(pointer:coarse)').matches || Math.min(screen.width, screen.height) < 700;
const FXE = (() => {
  let cv, cx, list = [], raf = 0, last = 0, W = 0, H = 0, dpr = 1;
  const R = (a, b) => a + Math.random() * (b - a), TAU = Math.PI * 2;
  function ensure() {
    if (!cv) { cv = document.getElementById('bCanvas'); cx = cv.getContext('2d');
      // 手機：發光模糊降到三成，減少掉幀
      if (LOWFX) { const d = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'shadowBlur'); Object.defineProperty(cx, 'shadowBlur', { set(v) { d.set.call(cx, v * .3); }, get() { return d.get.call(cx); } }); } }
    const r = cv.parentElement.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
    W = r.width; H = r.height;
  }
  function add(e) { ensure(); e.t = 0; e.life = e.life || .6; list.push(e); if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } return e; }
  function loop(now) {
    const dt = Math.min(.05, (now - last) / 1000) * (window.BSPEED || 1); last = now;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H);
    list = list.filter(e => { e.t += dt; const k = Math.min(1, e.t / e.life); cx.save(); cx.globalCompositeOperation = e.add ? 'lighter' : 'source-over'; try { e.draw(cx, k, dt, e.t); } catch (err) { } cx.restore(); return e.t < e.life; });
    if (list.length) raf = requestAnimationFrame(loop); else { raf = 0; cx.clearRect(0, 0, W, H); }
  }
  function clear() { list = []; }
  const ease = { out: k => 1 - Math.pow(1 - k, 3), in: k => k * k * k, io: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, back: k => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2) };
  const fade = (k, a, b) => k < a ? k / a : k > b ? Math.max(0, (1 - k) / (1 - b)) : 1;
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  const SPR = {};
  function glowSpr(hex) { const key = 'g' + hex; if (!SPR[key]) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.2, rgba(hex, 1)); r.addColorStop(.5, rgba(hex, .35)); r.addColorStop(1, rgba(hex, 0)); g.fillStyle = r; g.fillRect(0, 0, 128, 128); SPR[key] = c; } return SPR[key]; }
  function smokeSpr(hex, a) { const key = 's' + hex + a; if (!SPR[key]) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); for (let i = 0; i < 7; i++) { const x = 64 + R(-18, 18), y = 64 + R(-18, 18), r = R(28, 50); const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, rgba(hex, a || .9)); rg.addColorStop(1, rgba(hex, 0)); g.globalAlpha = .5; g.fillStyle = rg; g.fillRect(0, 0, 128, 128); } SPR[key] = c; } return SPR[key]; }
  function jag(x1, y1, x2, y2, seg, amp) { const pts = [[x1, y1]]; const nx = -(y2 - y1), ny = x2 - x1, l = Math.hypot(nx, ny) || 1; for (let i = 1; i < seg; i++) { const t = i / seg, o = R(-amp, amp) * Math.sin(t * Math.PI); pts.push([x1 + (x2 - x1) * t + nx / l * o, y1 + (y2 - y1) * t + ny / l * o]); } pts.push([x2, y2]); return pts; }
  function path(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); }
  function spr(c, img, x, y, s) { c.drawImage(img, x - s, y - s, s * 2, s * 2); }

  const P = {
    flash(color, life, a) { return add({ life: life || .25, draw(c, k) { c.globalAlpha = (a || .7) * Math.pow(1 - k, 2); c.fillStyle = color; c.fillRect(0, 0, W, H); } }); },
    tint(color, life, a) { return add({ life, draw(c, k) { c.globalAlpha = (a || .3) * fade(k, .15, .7); c.fillStyle = color; c.fillRect(0, 0, W, H); } }); },
    glow(x, y, o) { o = o || {}; const img = glowSpr(o.color || '#ffbe78'); return add({ add: true, life: o.life || .4, draw(c, k) { c.globalAlpha = o.hold ? fade(k, .1, .6) : 1 - k; spr(c, img, x, y, (o.r || 120) * (o.grow === false ? 1 : .5 + ease.out(k) * .7)); } }); },
    burst(x, y, o) { o = o || {}; const col = o.color || '#ffaa5a'; P.glow(x, y, { color: col, r: (o.r || 110) * 1.4, life: .42 }); P.glow(x, y, { color: '#ffffff', r: (o.r || 110) * .5, life: .25 }); P.particles({ x, y, n: o.n || 20, spd: [220, 600], life: [.25, .5], size: [2, 4], colors: [col, '#ffffff'], shape: 'spark', drag: 3 }); },
    ring(x, y, o) { o = o || {}; const col = o.color || '#ffffff'; return add({ add: o.add !== false, life: o.life || .45, draw(c, k) { const r = (o.r0 || 10) + ((o.r1 || 150) - (o.r0 || 10)) * ease.out(k), w = (o.w || 14) * (1 - k) + 1; c.globalAlpha = 1 - k; c.translate(x, y); c.scale(1, o.flat || 1); c.strokeStyle = col; c.shadowColor = col; c.shadowBlur = 24; c.lineWidth = w; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); c.shadowBlur = 0; c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = w * .3; c.stroke(); } }); },
    speedLines(x, y, o) { o = o || {}; const n = o.n || 46, lines = []; for (let i = 0; i < n; i++) lines.push({ a: i / n * TAU + R(-.05, .05), w: R(.006, .022), inner: R(.32, .6) }); return add({ life: o.life || .3, draw(c, k) { const R0 = Math.hypot(W, H); c.globalAlpha = (o.a || .8) * (1 - k); c.fillStyle = o.color || '#ffffff'; lines.forEach(l => { const ri = R0 * l.inner * (.85 + k * .3); c.beginPath(); c.moveTo(x + Math.cos(l.a - l.w) * R0, y + Math.sin(l.a - l.w) * R0); c.lineTo(x + Math.cos(l.a) * ri, y + Math.sin(l.a) * ri); c.lineTo(x + Math.cos(l.a + l.w) * R0, y + Math.sin(l.a + l.w) * R0); c.fill(); }); } }); },
    bolt(x1, y1, x2, y2, o) { o = o || {}; const col = o.color || '#8fd8ff'; let pts, forks, acc = 0; const mk = () => { pts = jag(x1, y1, x2, y2, 14, o.amp || 30); forks = [4, 8].map(i => { const b = pts[i]; return jag(b[0], b[1], b[0] + R(-80, 80), b[1] + R(10, 90), 6, 12); }); }; mk();
      P.glow(x2, y2, { color: col, r: 90, life: o.life || .35 });
      return add({ add: true, life: o.life || .35, draw(c, k, dt) { acc += dt; if (acc > .05) { acc = 0; mk(); } const a = k < .15 ? 1 : 1 - (k - .15) / .85; c.lineJoin = 'round'; c.lineCap = 'round';
        [[(o.w || 7) * 4, .16], [(o.w || 7) * 1.8, .5], [(o.w || 7) * .6, 1]].forEach(([w, al], i) => { c.globalAlpha = a * al; c.strokeStyle = i === 2 ? '#ffffff' : col; c.lineWidth = w; path(c, pts); c.stroke(); if (i) { c.lineWidth = w * .5; forks.forEach(f => { path(c, f); c.stroke(); }); } }); } }); },
    beam(x1, y1, x2, y2, o) { o = o || {}; const col = o.c2 || '#6fd3ff', ang = Math.atan2(y2 - y1, x2 - x1), len = Math.hypot(x2 - x1, y2 - y1);
      P.glow(x1, y1, { color: col, r: (o.w || 30) * 2.5, life: o.life || .5, hold: true, grow: false });
      return add({ add: true, life: o.life || .5, draw(c, k, dt, t) { const reach = Math.min(1, k * 3.5) * len, w = (o.w || 30) * (k < .7 ? 1 : (1 - k) / .3) * (1 + Math.sin(t * 60) * .08); c.translate(x1, y1); c.rotate(ang);
        let g = c.createLinearGradient(0, -w * 1.6, 0, w * 1.6); g.addColorStop(0, rgba(col, 0)); g.addColorStop(.5, rgba(col, .55)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.fillRect(0, -w * 1.6, reach, w * 3.2);
        g = c.createLinearGradient(0, -w * .5, 0, w * .5); g.addColorStop(0, rgba(col, 0)); g.addColorStop(.3, rgba(col, 1)); g.addColorStop(.5, '#ffffff'); g.addColorStop(.7, rgba(col, 1)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.fillRect(0, -w * .5, reach, w);
        c.drawImage(glowSpr(col), reach - w * 2, -w * 2, w * 4, w * 4); } }); },
    particles(o) { const ps = []; const NN = LOWFX ? Math.ceil(o.n * .55) : o.n; for (let i = 0; i < NN; i++) { const a = R(o.ang ? o.ang[0] : 0, o.ang ? o.ang[1] : TAU), s = R(o.spd[0], o.spd[1]); ps.push({ x: o.x + R(-(o.jx || 0), o.jx || 0), y: o.y + R(-(o.jy || 0), o.jy || 0), vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: R(o.life[0], o.life[1]), s: R(o.size[0], o.size[1]), c: o.colors[i % o.colors.length], r: R(0, 6), vr: R(-8, 8), d: R(0, o.delay || 0) }); }
      const shape = o.shape || 'glow', additive = o.add !== undefined ? o.add : ['glow', 'spark', 'ember', 'snow'].includes(shape);
      return add({ add: additive, life: o.life[1] + (o.delay || 0) + .05, draw(c, k, dt, t) {
        for (const p of ps) { const lt = t - p.d; if (lt < 0 || lt > p.l) continue; if (o.toward) { p.vx += (o.toward.x - p.x) * dt * (o.pull || 6); p.vy += (o.toward.y - p.y) * dt * (o.pull || 6); } p.vy += (o.g || 0) * dt; const dr = 1 - (o.drag || 0) * dt; p.vx *= dr; p.vy *= dr; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
          const a = 1 - lt / p.l; c.globalAlpha = shape === 'smoke' ? a * .75 : a;
          if (shape === 'glow' || shape === 'ember' || shape === 'snow') spr(c, glowSpr(p.c), p.x, p.y, p.s * (shape === 'ember' ? 2.5 * a + 1 : 2.6));
          else if (shape === 'smoke') spr(c, smokeSpr(p.c, .9), p.x, p.y, p.s * (1 + lt * 2));
          else if (shape === 'spark') { c.strokeStyle = p.c; c.lineCap = 'round'; c.lineWidth = p.s; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * .05, p.y - p.vy * .05); c.stroke(); }
          else if (shape === 'shard') { c.save(); c.translate(p.x, p.y); c.rotate(p.r); const g = c.createLinearGradient(-p.s, 0, p.s, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(1, p.c); c.fillStyle = g; c.beginPath(); c.moveTo(0, -p.s * 1.4); c.lineTo(p.s * .5, 0); c.lineTo(0, p.s * 1.4); c.lineTo(-p.s * .5, 0); c.closePath(); c.fill(); c.restore(); }
          else if (shape === 'petal') { c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.scale(1, Math.abs(Math.sin(p.r * 2)) * .6 + .4); const g = c.createRadialGradient(-p.s * .3, 0, 0, 0, 0, p.s); g.addColorStop(0, '#ffffff'); g.addColorStop(1, p.c); c.fillStyle = g; c.beginPath(); c.moveTo(-p.s, 0); c.quadraticCurveTo(0, -p.s * .8, p.s, 0); c.quadraticCurveTo(0, p.s * .8, -p.s, 0); c.fill(); c.restore(); }
          else if (shape === 'sand') { c.fillStyle = p.c; c.fillRect(p.x, p.y, p.s, p.s); }
          else if (shape === 'note') { c.fillStyle = p.c; c.font = `700 ${p.s * 2.4}px serif`; c.fillText(['♪', '♫', '♬'][Math.floor(p.s) % 3], p.x, p.y); }
          else { c.fillStyle = p.c; c.beginPath(); c.arc(p.x, p.y, p.s, 0, TAU); c.fill(); } }
      } });
    },
    text(x, y, str, o) { o = o || {}; return add({ life: o.life || .85, draw(c, k) { const s = k < .12 ? .3 + ease.back(k / .12) * .9 : 1.2 - Math.min(.15, (k - .12) * .3), sz = o.size || 68; c.globalAlpha = fade(k, .05, .75); c.translate(x + (k < .3 ? R(-3, 3) : 0), y + (k < .3 ? R(-3, 3) : 0)); c.rotate(o.rot == null ? -.1 : o.rot); c.scale(s, s); c.font = `900 ${sz}px "Noto Serif TC","Noto Sans TC",serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      c.lineWidth = 16; c.strokeStyle = o.stroke || '#140806'; c.strokeText(str, 4, 5); c.strokeText(str, 0, 0); const g = c.createLinearGradient(0, -sz / 2, 0, sz / 2); g.addColorStop(0, '#ffffff'); g.addColorStop(.5, o.color || '#ffe27a'); g.addColorStop(1, o.color2 || '#ff8a3a'); c.fillStyle = g; c.fillText(str, 0, 0); } }); },
    slash(x, y, o) { o = o || {}; const a0 = o.a == null ? -2.4 : o.a, span = o.span || 2.2, r = o.r || 120, w = o.w || 26, col = o.color || '#ffffff', dir = o.ccw ? -1 : 1;
      P.particles({ x, y, n: 10, spd: [150, 380], life: [.2, .4], size: [1.5, 3], colors: [col, '#ffffff'], shape: 'spark' });
      return add({ add: true, life: o.life || .32, draw(c, k) { const head = ease.out(Math.min(1, k * 2.2)), tail = Math.max(0, (k - .25) / .75); const s0 = a0 + dir * span * tail, s1 = a0 + dir * span * head, N = 24; if (Math.abs(s1 - s0) < .01) return;
        c.translate(x, y); c.rotate(o.rot || 0); c.scale(1, o.flat || .7);
        const draw = (ww, col2, al) => { c.globalAlpha = al; c.fillStyle = col2; c.beginPath(); for (let i = 0; i <= N; i++) { const q = i / N, ang = s0 + (s1 - s0) * q, th = Math.sin(q * Math.PI) * ww * (.3 + q * .7); c.lineTo(Math.cos(ang) * (r + th), Math.sin(ang) * (r + th)); } for (let i = N; i >= 0; i--) { const q = i / N, ang = s0 + (s1 - s0) * q; c.lineTo(Math.cos(ang) * r, Math.sin(ang) * r); } c.closePath(); c.fill(); };
        c.shadowColor = col; c.shadowBlur = 30; draw(w * 1.6, col, .6 * (1 - k * .6)); c.shadowBlur = 0; draw(w * .55, '#ffffff', 1 - k * .5); } }); },
    crescent(x1, y1, x2, y2, o) { o = o || {}; const col = o.color || '#ffd27a'; return add({ add: true, life: o.life || .4, draw(c, k) { for (let g = 3; g >= 0; g--) { const e = ease.io(Math.max(0, k - g * .04)), x = x1 + (x2 - x1) * e, y = y1 + (y2 - y1) * e, s = o.size || 70, d = Math.sign(x2 - x1) || 1; c.globalAlpha = (g ? .25 : 1) * (1 - k * .4); c.shadowColor = col; c.shadowBlur = g ? 0 : 26; const grd = c.createLinearGradient(x - d * s, y, x + d * s * .5, y); grd.addColorStop(0, rgba(col, 0)); grd.addColorStop(.6, col); grd.addColorStop(1, '#ffffff'); c.fillStyle = grd; c.beginPath(); c.ellipse(x, y, s * .5, s, 0, -Math.PI / 2, Math.PI / 2, d < 0); c.ellipse(x - d * s * .22, y, s * .28, s * .86, 0, Math.PI / 2, -Math.PI / 2, d > 0); c.fill(); } } }); },
    arm(x1, y1, x2, y2, o) { o = o || {}; const dir = Math.sign(x2 - x1) || 1; return add({ life: o.life || .45, draw(c, k) {
      const ext = k < .4 ? ease.out(k / .4) : k < .58 ? 1 : 1 - ease.in((k - .58) / .42), tx = x1 + (x2 - x1) * ext, ty = y1 + (y2 - y1) * ext, w = o.w || 16, skin = o.haki ? '#1a1418' : (o.skin || '#f0b98a');
      c.lineCap = 'round'; c.strokeStyle = o.sleeve || '#c8322b'; c.lineWidth = w * 1.9; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 + dir * 30, y1); c.stroke();
      c.strokeStyle = o.haki ? '#000' : '#8a4a2a'; c.lineWidth = w + 4; c.beginPath(); c.moveTo(x1 + dir * 24, y1); c.lineTo(tx, ty); c.stroke();
      c.strokeStyle = skin; c.lineWidth = w; c.stroke(); c.strokeStyle = o.haki ? 'rgba(255,60,50,.6)' : 'rgba(255,240,220,.7)'; c.lineWidth = w * .3; c.beginPath(); c.moveTo(x1 + dir * 24, y1 - w * .25); c.lineTo(tx, ty - w * .25); c.stroke();
      if (ext > .5) for (let i = 1; i <= 3; i++) { c.globalAlpha = .25 / i; c.fillStyle = skin; c.beginPath(); c.arc(tx - dir * i * 26, ty, (o.fist || 22), 0, TAU); c.fill(); } c.globalAlpha = 1;
      const fr = o.fist || 22, g = c.createRadialGradient(tx - fr * .3, ty - fr * .3, 2, tx, ty, fr); g.addColorStop(0, o.haki ? '#4a3a44' : '#ffe0c0'); g.addColorStop(1, skin); c.fillStyle = g; if (o.haki) { c.shadowColor = '#ff3b2f'; c.shadowBlur = 22; } c.beginPath(); c.arc(tx, ty, fr, 0, TAU); c.fill(); c.shadowBlur = 0; c.strokeStyle = o.haki ? '#ff5a4a' : '#8a4a2a'; c.lineWidth = 3; c.stroke();
      c.lineWidth = 2; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(tx + dir * fr * .35, ty + i * fr * .38); c.lineTo(tx + dir * fr * .8, ty + i * fr * .38); c.stroke(); }
    } }); },
    snake(x1, y1, x2, y2, o) { o = o || {}; const pts = []; for (let i = 0; i <= 70; i++) { const t = i / 70; pts.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t + Math.sin(t * Math.PI * 3) * 80 * Math.sin(t * Math.PI)]); } return add({ life: o.life || .65, draw(c, k) {
      const n = Math.max(2, Math.floor(pts.length * Math.min(1, k / .5))), sub = k < .8 ? pts.slice(0, n) : pts.slice(Math.floor((k - .8) / .2 * pts.length), n); if (sub.length < 2) return;
      c.lineCap = 'round'; c.lineJoin = 'round'; c.shadowColor = '#ff2b2b'; c.shadowBlur = 24; c.strokeStyle = '#000'; c.lineWidth = 24; path(c, sub); c.stroke(); c.shadowBlur = 0; c.strokeStyle = '#1a1418'; c.lineWidth = 18; c.stroke(); c.strokeStyle = 'rgba(255,70,60,.7)'; c.lineWidth = 4; c.stroke();
      const e = sub[sub.length - 1]; c.shadowColor = '#ff2b2b'; c.shadowBlur = 30; c.fillStyle = '#1a1418'; c.beginPath(); c.arc(e[0], e[1], 26, 0, TAU); c.fill(); c.strokeStyle = '#ff5a4a'; c.lineWidth = 3; c.stroke(); } }); },
    vortex(x, y, o) { o = o || {}; const col = o.color || '#6a2a9a'; return add({ add: o.add, life: o.life || 1, draw(c, k, dt, t) { const r = (o.r || 100) * Math.min(1, k * 4) * (k > .8 ? (1 - k) / .2 : 1); c.translate(x, y); c.scale(1, o.flat || 1);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, o.core || '#000'); g.addColorStop(.55, rgba(col, .7)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
      for (let a = 0; a < (o.arms || 6); a++) { c.beginPath(); for (let i = 0; i < 40; i++) { const q = i / 40, ang = a / (o.arms || 6) * TAU + q * 4.5 + t * (o.spin || 8), rr = r * (1 - q * .9); i ? c.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr) : c.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr); } c.strokeStyle = rgba(o.arm || col, .9); c.lineWidth = o.w || 5; c.stroke(); }
      c.strokeStyle = o.rim || col; c.shadowColor = o.rim || col; c.shadowBlur = 20; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, r * .95, 0, TAU); c.stroke(); } }); },
    tornado(x, y, o) { o = o || {}; const smk = smokeSpr(o.smoke || '#d9b064', .9); return add({ life: o.life || 1.2, draw(c, k, dt, t) { const h = (o.h || 280) * Math.min(1, k * 3); for (let i = 0; i < 22; i++) { const q = i / 22, yy = y - q * h, w = 24 + q * (o.w || 130), ang = t * 9 + i * .8; c.globalAlpha = fade(k, .1, .75) * .8; spr(c, smk, x + Math.cos(ang) * w * .6, yy, w * .5); } c.strokeStyle = rgba(o.line || '#fff3c0', .5); c.lineWidth = 2; for (let i = 0; i < 8; i++) { const q = i / 8, yy = y - q * h, w = 24 + q * (o.w || 130); c.beginPath(); c.ellipse(x, yy, w, w * .2, 0, t * 6 + i, t * 6 + i + 2.4); c.stroke(); } } }); },
    cracks(x, y, o) { o = o || {}; const lines = []; for (let i = 0; i < (o.n || 10); i++) { const a = R(0, TAU); lines.push(jag(x, y, x + Math.cos(a) * R(90, o.len || 240), y + Math.sin(a) * R(90, o.len || 240), 7, 16)); } return add({ life: o.life || .9, draw(c, k) { c.globalAlpha = 1 - ease.in(k); c.lineJoin = 'miter'; lines.forEach((l, i) => { const sub = l.slice(0, Math.ceil(l.length * Math.min(1, k * 7))); c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 6 - (i % 3); path(c, sub); c.stroke(); c.shadowColor = '#fff'; c.shadowBlur = 12; c.strokeStyle = o.color || '#f4f7ff'; c.lineWidth = 2.5 - (i % 3) * .6; c.stroke(); c.shadowBlur = 0; }); } }); },
    hand(c, x, y, ang, s, skin, sleeve, grip) { c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s); c.lineJoin = 'round'; c.lineCap = 'round';
      const ol = 'rgba(70,25,45,.75)';
      // 袖口
      const sg = c.createLinearGradient(-9, 0, 9, 0); sg.addColorStop(0, sleeve); sg.addColorStop(.5, 'rgba(255,255,255,.25)'); sg.addColorStop(1, sleeve);
      c.fillStyle = sleeve; c.beginPath(); c.moveTo(-8.5, 46); c.quadraticCurveTo(-10, 20, -7.5, 4); c.lineTo(7.5, 4); c.quadraticCurveTo(10, 20, 8.5, 46); c.closePath(); c.fill(); c.fillStyle = sg; c.globalAlpha *= .5; c.fill(); c.globalAlpha /= .5; c.strokeStyle = ol; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(-8, 3, 16, 2.5);
      // 手腕與手掌（有弧度）
      const g = c.createLinearGradient(-10, -34, 10, 4); g.addColorStop(0, '#fff4ec'); g.addColorStop(.6, skin); g.addColorStop(1, '#d8a58a'); c.fillStyle = g;
      c.beginPath(); c.moveTo(-5.5, 4); c.quadraticCurveTo(-6.5, -8, -9.5, -17); c.quadraticCurveTo(-10.5, -27, -7, -29); c.lineTo(7.5, -29); c.quadraticCurveTo(10.5, -24, 9.5, -15); c.quadraticCurveTo(6.5, -8, 5.5, 4); c.closePath(); c.fill(); c.strokeStyle = ol; c.lineWidth = 1; c.stroke();
      // 手指：圓潤、長短不一、彎曲
      const L = grip ? [5, 6, 6, 5] : [12, 15, 14, 11]; const X0 = [-6.6, -2.3, 2.1, 6.3];
      X0.forEach((fx, i) => { const len = L[i], bend = grip ? .9 : (i - 1.5) * .05; c.save(); c.translate(fx, -28); c.rotate(bend * (grip ? 1 : 1)); const fg = c.createLinearGradient(-2.2, 0, 2.2, 0); fg.addColorStop(0, '#e8b89c'); fg.addColorStop(.5, '#fff1e6'); fg.addColorStop(1, '#e0ae92'); c.fillStyle = fg;
        c.beginPath(); c.moveTo(-2.2, 1); c.lineTo(-2.1, -len + 2.2); c.arc(0, -len + 2.2, 2.1, Math.PI, 0); c.lineTo(2.2, 1); c.closePath(); c.fill(); c.stroke();
        c.strokeStyle = 'rgba(120,60,50,.35)'; c.lineWidth = .7; c.beginPath(); c.moveTo(-1.2, -len * .45); c.lineTo(1.2, -len * .45); c.stroke(); c.strokeStyle = ol; c.lineWidth = 1; c.restore(); });
      // 拇指
      c.save(); c.translate(8.5, -14); c.rotate(grip ? -.2 : .75); c.fillStyle = skin; c.beginPath(); c.ellipse(0, -4, 2.8, grip ? 4.5 : 7.5, 0, 0, TAU); c.fill(); c.stroke(); c.restore();
      // 掌心高光
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-2, -16, 3.5, 7, -.2, 0, TAU); c.fill();
      c.restore(); },
    hands(x, y, o) { o = o || {}; const hs = []; for (let i = 0; i < (o.n || 12); i++) hs.push({ a: R(0, TAU), d: R(40, o.rad || 110), s: R(.9, 1.5), t0: R(0, .35), done: false }); return add({ life: o.life || .95, draw(c, k, dt, t) { hs.forEach(h => { const lt = (t - h.t0) / .4; if (lt < 0) return; const hx = x + Math.cos(h.a) * h.d, hy = y + Math.sin(h.a) * h.d * .75; if (!h.done) { h.done = true; P.particles({ x: hx, y: hy, n: 5, spd: [30, 90], life: [.4, .7], size: [4, 6], colors: ['#ff9ac2', '#ffd9ea'], shape: 'petal' }); }
        const grow = ease.back(Math.min(1, lt * 2.5)), slap = lt > .45 && lt < 1 ? Math.sin((lt - .45) * Math.PI * 5) * .45 : 0; c.globalAlpha = k > .85 ? (1 - k) / .15 : 1; P.hand(c, hx, hy, h.a + Math.PI / 2 + slap, h.s * grow, o.skin || '#f3caa8', o.sleeve || '#4a2a7a', lt > .55); }); } }); },
    bigHand(x, y, o) { o = o || {}; const glow = o.glow || '#ff6fa8'; return add({ life: o.life || 1.1, draw(c, k, dt, t) { const rise = ease.out(Math.min(1, k * 2.4)), grip = k > .45, s = (o.s || 5) * (grip ? 1 - Math.min(.12, (k - .45) * .4) : 1), hy = y + 200 - rise * 170, al = k > .85 ? (1 - k) / .15 : 1;
        // 背後柔光
        c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .75 * al; c.drawImage(glowSpr(glow), x - s * 38, hy - s * 58, s * 76, s * 76); c.restore();
        // 半透明的巨手本體與發光輪廓
        c.save(); c.globalAlpha = .9 * al; c.shadowColor = glow; c.shadowBlur = 34; P.hand(c, x, hy, o.ang || 0, s, o.skin || '#ffd9e6', o.sleeve || '#5a2a8a', grip); c.restore();
        // 環繞的花瓣
        c.save(); c.globalAlpha = al; for (let i = 0; i < 14; i++) { const a = t * 3 + i * TAU / 14, rr = s * (14 + (i % 3) * 5), px = x + Math.cos(a) * rr, py = hy - s * 14 + Math.sin(a) * rr * .55; c.save(); c.translate(px, py); c.rotate(a * 2); c.fillStyle = i % 2 ? '#ffb3d1' : '#ffe2ee'; c.beginPath(); c.ellipse(0, 0, s * 1.6, s * .8, 0, 0, TAU); c.fill(); c.restore(); }
        c.restore();
      } }); },
    wave(x1, x2, y, o) { o = o || {}; const d = Math.sign(x2 - x1) || 1; return add({ life: o.life || .85, draw(c, k, dt, t) { const x = x1 + (x2 - x1) * ease.io(k), h = ((o.h || 170) * Math.sin(Math.min(1, k * 1.15) * Math.PI) + 20) * Math.min(1, Math.abs(x - x1) / 220);
        const layer = (hh, off, g0, g1, al) => { const g = c.createLinearGradient(0, y - hh, 0, y + 70); g.addColorStop(0, g0); g.addColorStop(1, g1); c.fillStyle = g; c.globalAlpha = al * fade(k, .08, .85); c.beginPath(); c.moveTo(x1, y + 70); for (let xx = x1; d > 0 ? xx <= x - off : xx >= x + off; xx += d * 8) { const q = (xx - x1) / ((x - x1) || 1); c.lineTo(xx, y + 70 - Math.pow(Math.max(0, q), 2.4) * hh - Math.sin(xx * .045 + t * 9) * 9); } c.lineTo(x - d * off, y + 70); c.closePath(); c.fill(); };
        layer(h * .75, -30, '#2f8fbf', '#0a3e5e', .8); layer(h, 0, '#bff3ff', '#1a6f9a', .92);
        c.globalAlpha = fade(k, .08, .85); c.fillStyle = '#ffffff'; for (let i = 0; i < 16; i++) { c.beginPath(); c.arc(x - d * R(-10, 40), y + 70 - h + R(-14, 26), R(3, 9), 0, TAU); c.fill(); } } }); },
    serpent(x1, y1, x2, y2, o) { o = o || {}; const len = o.len || 440, body = o.body || '#2f9f8a', belly = o.belly || '#c9f5e6', w = o.w || 48; const trail = [];
      return add({ life: o.life || 1, draw(c, k, dt, t) { const head = ease.io(Math.min(1, k * 1.15)), hx = x1 + (x2 - x1) * head, hy = y1 + (y2 - y1) * head, d = Math.sign(x2 - x1) || 1, al = fade(k, .08, .85);
        const pts = []; for (let i = 0; i < 40; i++) { const q = i / 39; pts.push([hx - d * q * len, hy + Math.sin(q * 7 - t * 9) * (o.amp || 42) * q + q * 36]); }
        c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
        // 多層光暈、由頭到尾漸細
        [[2.4, .10, body], [1.6, .22, body], [1.0, .55, body], [.5, .6, belly], [.16, .9, '#ffffff']].forEach(([m, a, col]) => { for (let i = 0; i < pts.length - 1; i++) { const q = i / (pts.length - 1); c.strokeStyle = rgba(col, a * al * (1 - q * .6)); c.lineWidth = w * m * (1 - q * .75); c.beginPath(); c.moveTo(pts[i][0], pts[i][1]); c.lineTo(pts[i + 1][0], pts[i + 1][1]); c.stroke(); } });
        // 鱗片閃光
        for (let i = 3; i < 36; i += 3) { const p = pts[i], q = i / 39, f = .5 + .5 * Math.sin(t * 14 - i); c.globalAlpha = al * f; c.drawImage(glowSpr(belly), p[0] - w * .45 * (1 - q * .6), p[1] - w * .45 * (1 - q * .6), w * .9 * (1 - q * .6), w * .9 * (1 - q * .6)); }
        c.globalAlpha = al;
        if (o.fins) for (let i = 6; i < 34; i += 6) { const p = pts[i], q = i / 39, fh = w * (1.2 - q * .7); const g = c.createLinearGradient(p[0], p[1], p[0] - d * 20, p[1] - fh); g.addColorStop(0, rgba(o.fin || body, .7)); g.addColorStop(1, rgba(o.fin || body, 0)); c.fillStyle = g; c.beginPath(); c.moveTo(p[0] + d * 8, p[1] - w * .3); c.quadraticCurveTo(p[0] - d * 4, p[1] - fh, p[0] - d * 30, p[1] - fh * .9); c.lineTo(p[0] - d * 18, p[1] - w * .3); c.fill(); }
        // 頭部：發光的楔形與下顎
        c.drawImage(glowSpr(body), hx - w * 1.6, hy - w * 1.6, w * 3.2, w * 3.2);
        const hg = c.createLinearGradient(hx - d * 20, hy, hx + d * 90, hy); hg.addColorStop(0, rgba(body, .95)); hg.addColorStop(1, rgba(belly, .95)); c.fillStyle = hg;
        c.beginPath(); c.moveTo(hx - d * 20, hy - w * .6); c.quadraticCurveTo(hx + d * 50, hy - w * .75, hx + d * 92, hy - 6); c.lineTo(hx + d * 46, hy + 2); c.lineTo(hx + d * 86, hy + 16); c.quadraticCurveTo(hx + d * 30, hy + w * .65, hx - d * 20, hy + w * .45); c.closePath(); c.fill();
        c.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(hx + d * (50 + i * 9), hy - 2); c.lineTo(hx + d * (54 + i * 9), hy + 8); c.lineTo(hx + d * (58 + i * 9), hy - 2); c.fill(); }
        const ec = o.eye || '#fff3a0'; c.drawImage(glowSpr(ec), hx + d * 30 - 18, hy - w * .38 - 18, 36, 36); c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(hx + d * 30, hy - w * .36, 6, 3.5, 0, 0, TAU); c.fill();
        if (o.horn) { c.fillStyle = rgba('#ffffff', .85); c.beginPath(); c.moveTo(hx, hy - w * .55); c.lineTo(hx - d * 44, hy - w * 1.3); c.lineTo(hx + d * 10, hy - w * .5); c.fill(); }
        // 尾跡粒子
        if (Math.random() < .7) trail.push({ x: pts[8][0] + R(-20, 20), y: pts[8][1] + R(-20, 20), l: 0 });
        trail.forEach(p => { p.l += dt; p.y -= dt * 30; c.globalAlpha = Math.max(0, .8 - p.l * 1.4) * al; c.drawImage(glowSpr(belly), p.x - 8, p.y - 8, 16, 16); });
      } }); },
    hammer(x, y, o) { o = o || {}; return add({ life: o.life || .75, draw(c, k) { const fall = k < .42 ? ease.in(k / .42) : 1, hy = -100 + (y + 30) * fall; c.globalAlpha = k > .8 ? (1 - k) / .2 : 1;
        let g = c.createLinearGradient(x - 8, 0, x + 8, 0); g.addColorStop(0, '#3a2a1a'); g.addColorStop(.5, '#8a6a4a'); g.addColorStop(1, '#3a2a1a'); c.fillStyle = g; c.fillRect(x - 9, hy - 300, 18, 262);
        g = c.createLinearGradient(0, hy - 50, 0, hy + 50); g.addColorStop(0, '#e8f0f8'); g.addColorStop(.3, '#9aa7b8'); g.addColorStop(.7, '#5a6678'); g.addColorStop(1, '#2e3b4d'); c.fillStyle = g; c.shadowColor = '#7fd4ff'; c.shadowBlur = 36; c.fillRect(x - 84, hy - 48, 168, 96); c.shadowBlur = 0;
        c.strokeStyle = '#1b2433'; c.lineWidth = 4; c.strokeRect(x - 84, hy - 48, 168, 96); c.fillStyle = '#c9d6e6'; [-60, 0, 60].forEach(dx => { c.beginPath(); c.arc(x + dx, hy, 7, 0, TAU); c.fill(); });
        c.strokeStyle = rgba('#8fd8ff', .9); c.lineWidth = 2; for (let i = 0; i < 3; i++) { path(c, jag(x - 84 + R(0, 40), hy + R(-40, 40), x + 84 - R(0, 40), hy + R(-40, 40), 6, 14)); c.stroke(); } } }); },
    spikes(x, y, o) { o = o || {}; const sp = []; for (let i = 0; i < (o.n || 12); i++) sp.push({ x: x + R(-(o.w || 160), o.w || 160), h: R(70, o.h || 210), w: R(16, 34), d: R(0, .25), tilt: R(-.25, .25) }); sp.sort((a, b) => b.h - a.h); return add({ life: o.life || 1, draw(c, k, dt, t) { c.globalAlpha = k > .8 ? (1 - k) / .2 : 1; sp.forEach(s => { const g = Math.min(1, Math.max(0, (t - s.d) * 7)); if (!g) return; const tx = s.x + s.tilt * s.h, ty = y - s.h * ease.back(g);
          const gr = c.createLinearGradient(s.x - s.w, 0, s.x + s.w, 0); gr.addColorStop(0, '#5fb8e8'); gr.addColorStop(.45, '#e8faff'); gr.addColorStop(1, '#2f7fb0'); c.fillStyle = gr; c.shadowColor = '#bff0ff'; c.shadowBlur = 18; c.beginPath(); c.moveTo(s.x - s.w, y); c.lineTo(tx, ty); c.lineTo(s.x + s.w, y); c.closePath(); c.fill(); c.shadowBlur = 0;
          c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(s.x - s.w * .2, y); c.lineTo(tx, ty); c.stroke(); }); } }); },
    rays(x, y, o) { o = o || {}; return add({ add: true, life: o.life || 1.2, draw(c, k, dt, t) { c.globalAlpha = fade(k, .15, .7) * .8; c.translate(x, y); c.rotate(t * (o.spin || .8)); const n = o.n || 18; for (let i = 0; i < n; i++) { c.rotate(TAU / n); const g = c.createLinearGradient(0, 0, o.r || 340, 0); g.addColorStop(0, o.c1 || 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.lineTo(o.r || 340, -(o.wid || 20)); c.lineTo(o.r || 340, o.wid || 20); c.closePath(); c.fill(); } } }); },
    puffs(x, y, o) { o = o || {}; const img = smokeSpr(o.color || '#ffffff', .95), ps = []; for (let i = 0; i < (o.n || 16); i++) ps.push({ a: R(0, TAU), d: R(30, o.rad || 150), s: R(30, 60) }); return add({ life: o.life || 1.1, draw(c, k) { c.globalAlpha = fade(k, .1, .6); ps.forEach(p => { const e = ease.out(Math.min(1, k * 2)); spr(c, img, x + Math.cos(p.a) * p.d * e, y + Math.sin(p.a) * p.d * e * .7, p.s * (.6 + e * .6)); }); } }); },
    pillar(x, y, o) { o = o || {}; const col = o.color || '#8fd8ff'; P.ring(x, y + 30, { r1: 220, flat: .25, color: col, life: .6 }); return add({ add: true, life: o.life || .7, draw(c, k) { const w = (o.w || 100) * Math.sin(Math.min(1, k * 1.3) * Math.PI); const g = c.createLinearGradient(x - w * 1.6, 0, x + w * 1.6, 0); g.addColorStop(0, rgba(col, 0)); g.addColorStop(.3, rgba(col, .6)); g.addColorStop(.5, '#ffffff'); g.addColorStop(.7, rgba(col, .6)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.fillRect(x - w * 1.6, -40, w * 3.2, y + 70); c.drawImage(glowSpr(col), x - w * 2.5, y - w * 1.2, w * 5, w * 2.4); } }); },
    drums(x, y, o) { o = o || {}; return add({ life: o.life || 1, draw(c, k, dt, t) { c.globalAlpha = fade(k, .15, .8); for (let i = 0; i < 4; i++) { const a = t * 3 + i * Math.PI / 2, dx = x + Math.cos(a) * (o.r || 100), dy = y + Math.sin(a) * (o.r || 100) * .4 - 50;
        c.drawImage(glowSpr('#8fd8ff'), dx - 45, dy - 45, 90, 90); const g = c.createRadialGradient(dx - 8, dy - 8, 2, dx, dy, 26); g.addColorStop(0, '#fff6c8'); g.addColorStop(.6, '#e8c170'); g.addColorStop(1, '#8a611a'); c.fillStyle = g; c.beginPath(); c.arc(dx, dy, 24, 0, TAU); c.fill(); c.strokeStyle = '#5a3a0a'; c.lineWidth = 3; c.stroke();
        c.fillStyle = '#2b1b08'; for (let j = 0; j < 3; j++) { const aa = j * TAU / 3 + t * 2; c.beginPath(); c.arc(dx + Math.cos(aa) * 7, dy + Math.sin(aa) * 7, 5, 0, TAU); c.fill(); } } } }); },
    shield(x, y, o) { o = o || {}; const edge = o.edge || '#8ce6ff'; return add({ add: true, life: o.life || 1, draw(c, k, dt, t) { const r = (o.r || 130) * ease.back(Math.min(1, k * 3)); c.globalAlpha = fade(k, .1, .75) * .9; const g = c.createRadialGradient(x - r * .3, y - r * .35, r * .1, x, y, r); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(.75, rgba(edge, .12)); g.addColorStop(1, rgba(edge, .8)); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
        c.strokeStyle = rgba(edge, .45); c.lineWidth = 1.5; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * .5; c.beginPath(); c.moveTo(x + Math.cos(a) * r * .3, y + Math.sin(a) * r * .3); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); c.stroke(); } } }); },
    wings(x, y, o) { o = o || {}; return add({ life: o.life || 1, draw(c, k, dt, t) { c.globalAlpha = fade(k, .12, .75); const flap = Math.sin(t * 12) * .25; [-1, 1].forEach(sd => { for (let i = 0; i < 8; i++) { const ang = -Math.PI / 2 + sd * (.3 + i * .19 + flap), len = 70 + i * 14; P.hand(c, x + Math.cos(ang) * len * .6, y - 30 + Math.sin(ang) * len * .6, ang + Math.PI / 2, 1.3, o.skin || '#f3caa8', o.sleeve || '#4a2a7a', false); } }); } }); },
    claws(x, y, o) { o = o || {}; for (let i = 0; i < 3; i++) setTimeout(() => P.slash(x + (i - 1) * 28, y, { r: 150, a: -2.1, span: 1.3, w: 16, color: o.color || '#bff0ff', flat: .9, life: .3 }), i * 40); },
    flames(x, y, o) { o = o || {}; return P.particles({ x, y: y + (o.dy || 60), n: o.n || 50, spd: [60, 220], ang: [-2, -1.1], life: [.4, .9], size: [5, 12], colors: o.colors || ['#ff9a3a', '#ffd26c', '#ff5a2a'], shape: 'ember', jx: o.jx || 60, jy: 10, g: -120 }); }
  };
  return { add, P, R, clear, ensure, get W() { return W; }, get H() { return H; } };
})();

/* ---------- 鏡頭與角色動作 ---------- */
function moveFighter(side, kind, dist) {
  const el = $('bF' + side), d = side === 'L' ? 1 : -1, D = (dist || 1);
  const K = {
    lunge: [{ transform: 'none' }, { transform: `translateX(${d * 40 * D}%) scale(1.05)`, offset: .35 }, { transform: 'none' }],
    dash: [{ transform: 'none' }, { transform: `translateX(${d * 105}%)`, offset: .3 }, { transform: `translateX(${d * 95}%)`, offset: .65 }, { transform: 'none' }],
    stretch: [{ transform: 'none' }, { transform: `translateX(${d * 12}%) scaleX(1.12)`, offset: .3 }, { transform: 'none' }],
    float: [{ transform: 'none' }, { transform: 'translateY(-10%) scale(1.06)', offset: .4 }, { transform: 'translateY(-10%) scale(1.06)', offset: .7 }, { transform: 'none' }],
    stomp: [{ transform: 'none' }, { transform: 'translateY(-16%)', offset: .35 }, { transform: 'translateY(3%) scaleY(.95)', offset: .55 }, { transform: 'none' }],
    recoil: [{ transform: 'none' }, { transform: `translateX(${-d * 8}%)`, offset: .3 }, { transform: 'none' }],
    leap: [{ transform: 'none' }, { transform: `translate(${d * 60}%,-30%) rotate(${d * -8}deg)`, offset: .4 }, { transform: `translate(${d * 95}%,0)`, offset: .6 }, { transform: 'none' }],
    shake: [{ transform: 'none' }, { transform: 'translateX(-2%)', offset: .2 }, { transform: 'translateX(2%)', offset: .4 }, { transform: 'translateX(-2%)', offset: .6 }, { transform: 'none' }]
  };
  el.animate(K[kind] || K.lunge, { duration: kind === 'dash' || kind === 'leap' ? 900 : kind === 'float' ? 1100 : 520, easing: 'cubic-bezier(.3,.7,.3,1)' });
  if (kind === 'dash' || kind === 'leap') afterimage(side);
}
function afterimage(side) { const img = $('bImg' + side); for (let i = 1; i <= 3; i++) setTimeout(() => { const g = img.cloneNode(); g.removeAttribute('id'); const r = img.getBoundingClientRect(), a = $('bArena').getBoundingClientRect(); g.style.cssText = `position:absolute;left:${r.left - a.left}px;top:${r.top - a.top}px;width:${r.width}px;height:${r.height}px;max-width:none;max-height:none;opacity:.35;pointer-events:none;mix-blend-mode:screen;transition:opacity .35s;z-index:1;animation:none;transform:${side === 'R' ? 'scaleX(-1)' : 'none'}`; $('bArena').appendChild(g); requestAnimationFrame(() => g.style.opacity = '0'); setTimeout(() => g.remove(), 420); }, i * 70); }
function zoomPunch(side, s) { const a = $('bArena'), p = fighterPoint(side); a.animate([{ transform: 'none', transformOrigin: `${p.x}px ${p.y}px` }, { transform: `scale(${s || 1.06})`, transformOrigin: `${p.x}px ${p.y}px`, offset: .25 }, { transform: 'none', transformOrigin: `${p.x}px ${p.y}px` }], { duration: 360, easing: 'ease-out' }); }
function impactFrame(side) { $('bImg' + side).animate([{ filter: 'brightness(2.6) contrast(1.3)' }, { filter: 'none' }], { duration: 150 }); }
/* 每次命中的共同強化：白閃、集中線、鏡頭推近、火花 */
const HIT_COLORS = { blue: '#78d2ff', gold: '#ffd26e', red: '#ff7850', purple: '#aa6eff', green: '#78ffaa' };
function hitFX(side, theme, big) {
  const p = fighterPoint(side), col = HIT_COLORS[theme] || HIT_COLORS.red;
  impactFrame(side); zoomPunch(side, big ? 1.1 : 1.05);
  FXE.P.burst(p.x, p.y, { color: col, r: big ? 150 : 110 });
  FXE.P.speedLines(p.x, p.y, { life: big ? .42 : .26, a: big ? .8 : .5, n: big ? 60 : 40 });
  FXE.P.ring(p.x, p.y, { r1: big ? 230 : 150, color: col, life: .35 });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms / (window.BSPEED || 1)));
