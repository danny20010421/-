/* 3D 探索：移動、鏡頭、NPC 互動、拾取、小地圖 */
(function (global) {
  'use strict';
  const { M } = E3;
  const TALK_R = 5.5, FIGHT_R = 6.5, PICK_R = 2.8, SPEED = 15;

  class World {
    constructor(opts) {
      this.canvas = opts.canvas; this.labels = opts.labels; this.cb = opts.callbacks; this.mini = opts.minimap;
      this.r = new E3.Renderer(this.canvas);
      this.keys = {}; this.joy = { x: 0, y: 0 }; this.running = false; this.paused = false;
      this.cam = { yaw: 0, pitch: .42, dist: 20, tYaw: 0 };
      this.npcMeshes = {}; this.itemMeshes = {}; this.labelEls = new Map();
      this._bind();
    }
    /* ---------- 載入篇章 ---------- */
    load(chapter, playerId, state) {
      if (this.scene) { this.r.free(this.scene.staticMesh); this.r.free(this.scene.water); }
      this.chapter = chapter; this.playerId = playerId;
      this.scene = SCENES.buildScene(this.r, chapter.id, (state && state.clear) || []);
      const env = chapter.env; this.r.env = { sky: E3.hex(env.sky), ground: E3.hex(env.ground), fog: E3.hex(env.fog), fogR: env.fogR, sun: env.sun };
      const [sx, sz] = chapter.spawn; this.p = { x: sx, z: sz, y: this.scene.H(sx, sz), flip: false, moving: false, t: 0, target: null };
      this.cam.yaw = this.cam.tYaw = 0;
      this.npcs = chapter.npcs.map(n => { if (!this.npcMeshes[n.look]) this.npcMeshes[n.look] = SCENES.npcMesh(this.r, n.look); return { ...n, x: n.pos[0], z: n.pos[1], face: Math.PI, kind: 'npc' }; });
      this.items = []; this.enemies = [];
      this.barrier = this.barrier || SCENES.barrierMesh(this.r, '#8fd8ff');
      this.setState(state);
      this.labels.innerHTML = ''; this.labelEls.clear();
      this._miniBase = null; this.r.flash = 0;
      this.r.texture(CHARACTERS[playerId].image);
    }
    /* 由 App 傳入目前任務狀態：可撿道具、敵人、BOSS 是否解鎖、任務目標 */
    setState(st) {
      this.st = st;
      this.items = (st.items || []).map(it => ({ ...it, y: this.scene.H(it.x, it.z) }));
      this.items.forEach(it => { if (!this.itemMeshes[it.icon]) this.itemMeshes[it.icon] = SCENES.itemMesh(this.r, it.icon); });
      this.enemies = (st.enemies || []).map(e => ({ ...e, y: this.scene.H(e.x, e.z), kind: 'enemy' }));
      this.enemies.forEach(e => this.r.texture(CHARACTERS[e.id].image));
      this.bossUnlocked = !!st.bossUnlocked; this.target = st.target || null; this.beacon = st.beacon || null; this._reached = false;
      if (this.beacon) { this.beacon.y = this.scene.H(this.beacon.x, this.beacon.z); if (!this.beaconMesh) this.beaconMesh = SCENES.beaconMesh(this.r); }
      if (this.labelEls) { this.labels.innerHTML = ''; this.labelEls.clear(); }
    }
    start() { if (this.running) return; this.running = true; this.last = performance.now(); const loop = (t) => { if (!this.running) return; this._raf = requestAnimationFrame(loop); this.frame(t); }; this._raf = requestAnimationFrame(loop); }
    stop() { this.running = false; cancelAnimationFrame(this._raf); this.keys = {}; this.joy = { x: 0, y: 0 }; }

    /* ---------- 輸入 ---------- */
    _bind() {
      const c = this.canvas;
      const typing = (e) => /input|textarea|select/i.test(e.target.tagName);
      window.addEventListener('keydown', e => { if (!this.running || typing(e)) return; const k = e.key.toLowerCase(); this.keys[k] = true; if ((k === 'e' || k === ' ' || k === 'enter') && !this.paused) { e.preventDefault(); this.interact(); } if (k === 'q') this.cam.tYaw += .5; if (k === 'r') this.cam.tYaw -= .5; if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault(); if (/^[wasd]$|^arrow/.test(k)) this.p.target = null; });
      window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
      window.addEventListener('blur', () => { this.keys = {}; });
      let down = null;
      c.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, yaw: this.cam.tYaw, pitch: this.cam.pitch, drag: false, id: e.pointerId }; c.setPointerCapture(e.pointerId); });
      c.addEventListener('pointermove', e => { if (!down || down.id !== e.pointerId) return; const dx = e.clientX - down.x, dy = e.clientY - down.y; if (Math.hypot(dx, dy) > 6) down.drag = true; if (down.drag) { this.cam.tYaw = down.yaw - dx * .006; this.cam.pitch = Math.max(.18, Math.min(1.1, down.pitch + dy * .004)); } });
      c.addEventListener('pointerup', e => { if (down && !down.drag && !this.paused) this._clickMove(e); down = null; });
      c.addEventListener('pointercancel', () => { down = null; });
      c.addEventListener('wheel', e => { e.preventDefault(); this.cam.dist = Math.max(10, Math.min(38, this.cam.dist + e.deltaY * .02)); }, { passive: false });
    }
    setJoystick(x, y) { this.joy.x = x; this.joy.y = y; if (x || y) this.p.target = null; }
    _clickMove(e) {
      const rect = this.canvas.getBoundingClientRect(), nx = (e.clientX - rect.left) / rect.width * 2 - 1, ny = 1 - (e.clientY - rect.top) / rect.height * 2;
      const eye = this.r.eye, tg = this.r.target; let fx = tg[0] - eye[0], fy = tg[1] - eye[1], fz = tg[2] - eye[2]; const fl = Math.hypot(fx, fy, fz); fx /= fl; fy /= fl; fz /= fl;
      const R = this.r.right; const ux = R[1] * fz - R[2] * fy, uy = R[2] * fx - R[0] * fz, uz = R[0] * fy - R[1] * fx;
      const t = Math.tan(.45), a = this.r.aspect; const dx = fx + R[0] * nx * t * a + ux * ny * t, dy = fy + R[1] * nx * t * a + uy * ny * t, dz = fz + R[2] * nx * t * a + uz * ny * t;
      let x = eye[0], y = eye[1], z = eye[2];
      for (let i = 0; i < 400; i++) { x += dx * .6; y += dy * .6; z += dz * .6; if (y <= this.scene.H(x, z)) { if (this.scene.H(x, z) > .3) { this.p.target = [x, z]; this.cb.onMoveMarker && this.cb.onMoveMarker(); this._marker = { x, z, t: 0 }; } return; } }
    }

    /* ---------- 互動 ---------- */
    nearest() {
      let best = null, bd = 1e9;
      for (const n of this.npcs) { const d = Math.hypot(n.x - this.p.x, n.z - this.p.z); if (d < TALK_R && d < bd) { bd = d; best = n; } }
      for (const e of this.enemies) { if (e.boss && !this.bossUnlocked) continue; const d = Math.hypot(e.x - this.p.x, e.z - this.p.z); if (d < FIGHT_R && d < bd) { bd = d; best = e; } }
      return best;
    }
    interact() { const n = this.nearest(); if (!n) return; if (n.kind === 'npc') n.face = Math.atan2(this.p.x - n.x, this.p.z - n.z); this.cb.onInteract(n); }
    goTo(obj) { this.p.target = [obj.x, obj.z + 3]; this._goObj = obj; }

    /* ---------- 更新 ---------- */
    frame(now) {
      const dt = Math.max(0, Math.min(.05, (now - this.last) / 1000)); this.last = now; this.r.time += dt;
      if (!this.paused) this.update(dt);
      this.render(dt);
    }
    update(dt) {
      const p = this.p, k = this.keys, yaw = this.cam.yaw;
      let ix = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0) + this.joy.x;
      let iz = (k.w || k.arrowup ? 1 : 0) - (k.s || k.arrowdown ? 1 : 0) + this.joy.y;
      let mx = 0, mz = 0;
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      if (ix || iz) { const l = Math.min(1, Math.hypot(ix, iz)) / (Math.hypot(ix, iz) || 1); mx = (fx * iz + rx * ix) * l; mz = (fz * iz + rz * ix) * l; }
      else if (p.target) { const dx = p.target[0] - p.x, dz = p.target[1] - p.z, d = Math.hypot(dx, dz); if (d < .8) { p.target = null; if (this._goObj) { const o = this._goObj; this._goObj = null; if (Math.hypot(o.x - p.x, o.z - p.z) < FIGHT_R + 1) this.interact(); } } else { mx = dx / d; mz = dz / d; } }
      const sp = Math.hypot(mx, mz); p.moving = sp > .05;
      if (p.moving) {
        let nx = p.x + mx * SPEED * dt, nz = p.z + mz * SPEED * dt;
        [nx, nz] = this._collide(nx, nz);
        if (this.scene.H(nx, nz) > .35) { p.x = nx; p.z = nz; } else if (this.scene.H(nx, p.z) > .35) p.x = nx; else if (this.scene.H(p.x, nz) > .35) p.z = nz; else p.target = null;
        const side = mx * rx + mz * rz; if (Math.abs(side) > .2) p.flip = side < 0;
        p.t += dt * 9;
        // 行進時鏡頭緩慢跟到背後
        if (!(ix || iz) && p.target) { const want = Math.atan2(-mx, -mz); let d = want - this.cam.tYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.cam.tYaw += d * dt * .6; }
      }
      p.y += (this.scene.H(p.x, p.z) - p.y) * Math.min(1, dt * 14);
      // 撿道具
      for (const it of this.items) { if (!it.taken && Math.hypot(it.x - p.x, it.z - p.z) < PICK_R) { it.taken = true; this.cb.onPickup(it); } }
      // 提示
      const n = this.nearest(); if (n !== this._near) { this._near = n; this.cb.onNear(n); }
      if (this._marker) this._marker.t += dt;
      if (this.beacon && !this._reached && Math.hypot(this.beacon.x - p.x, this.beacon.z - p.z) < this.beacon.r) { this._reached = true; this.cb.onReach && this.cb.onReach(); }
    }
    _collide(x, z) {
      const pr = 1.1;
      const all = this.scene.obstacles;
      for (let i = 0; i < all.length; i++) { const o = all[i], dx = x - o[0], dz = z - o[1], d = Math.hypot(dx, dz), m = o[2] + pr; if (d < m && d > 1e-4) { x = o[0] + dx / d * m; z = o[1] + dz / d * m; } }
      for (const n of this.npcs) { const dx = x - n.x, dz = z - n.z, d = Math.hypot(dx, dz), m = SCENES.lookScale(n.look) * 1.1 + pr; if (d < m && d > 1e-4) { x = n.x + dx / d * m; z = n.z + dz / d * m; } }
      for (const e of this.enemies) { const dx = x - e.x, dz = z - e.z, d = Math.hypot(dx, dz), m = (e.boss && !this.bossUnlocked ? 13.5 : 1.8) + pr; if (d < m && d > 1e-4) { x = e.x + dx / d * m; z = e.z + dz / d * m; } }
      const d = Math.hypot(x, z); if (d > 95) { x *= 95 / d; z *= 95 / d; }
      return [x, z];
    }

    /* ---------- 繪製 ---------- */
    render(dt) {
      const r = this.r, p = this.p, S = this.scene, t = r.time; r.resize();
      let dy = this.cam.tYaw - this.cam.yaw; this.cam.yaw += dy * Math.min(1, dt * 8);
      // 鏡頭避障：鏡頭與角色之間有障礙物時把鏡頭拉近
      let want = this.cam.dist; const sy = Math.sin(this.cam.yaw), cy = Math.cos(this.cam.yaw), cp0 = Math.cos(this.cam.pitch);
      for (const o of S.obstacles) { const ox = o[0] - p.x, oz = o[1] - p.z; if (ox * ox + oz * oz > 1600) continue; for (let k = .25; k <= 1; k += .125) { const d = want * k, qx = sy * d * cp0, qz = cy * d * cp0; if ((qx - ox) ** 2 + (qz - oz) ** 2 < (o[2] * 1.5 + 1) ** 2) { want = Math.max(7, d - 2); break; } } }
      this.cam.eff = this.cam.eff == null ? want : this.cam.eff + (want - this.cam.eff) * Math.min(1, dt * (want < this.cam.eff ? 10 : 3));
      const cp = Math.cos(this.cam.pitch), eye = [p.x + Math.sin(this.cam.yaw) * this.cam.eff * cp, p.y + 2.5 + Math.sin(this.cam.pitch) * this.cam.eff, p.z + Math.cos(this.cam.yaw) * this.cam.eff * cp];
      const minY = S.H(eye[0], eye[2]) + 2; if (eye[1] < minY) eye[1] = minY;
      r.setCamera(eye, [p.x, p.y + 3, p.z], .9);
      if (this.chapter.id === 'dark' || this.chapter.id === 'skypiea') { if (Math.random() < dt * .12) this._flashT = .35; if (this._flashT > 0) { this._flashT -= dt; r.flash = Math.max(0, this._flashT) * (this.chapter.id === 'dark' ? .5 : .35); } else r.flash = 0; }
      r.begin();
      r.draw(S.staticMesh, null);
      if (S.blade) S.dyn.windmills.forEach(([x, y, z], i) => r.draw(S.blade, M.mul(M.mul(M.trs(x, y, z, 0, 1), M.rz(t * .8 + i)), M.rx(Math.PI / 2))));
      if (S.cloud) S.dyn.clouds.forEach(([x, y, z, s, ph]) => r.draw(S.cloud, M.trs(x + Math.sin(t * .1 + ph) * 6, y + Math.sin(t * .4 + ph), z, ph, s)));
      if (S.bird && this.chapter.id !== 'fishman') for (let i = 0; i < 7; i++) { const a = t * (.25 + i * .03) + i * 1.3, R = 30 + i * 9; r.draw(S.bird, M.mul(M.trs(Math.cos(a) * R, 24 + i * 2 + Math.sin(t * 2 + i) * 1.5, Math.sin(a) * R, -a, 1.3), M.rz(Math.sin(t * 9 + i) * .35)), { noCull: true, tint: this.chapter.id === 'dark' ? [.3, .25, .35, 1] : [1, 1, 1, 1] }); }
      if (S.fishMesh) S.dyn.fish.forEach(([x, y, z, ph, c], i) => { const a = t * .4 + ph; r.draw(S.fishMesh, M.trs(x + Math.cos(a) * 12, y + Math.sin(t + ph) * .8, z + Math.sin(a) * 12, -a - Math.PI / 2, 1.4), { tint: E3.hex(c).concat(1) }); });
      if (S.petal) for (let i = 0; i < 40; i++) { const ph = i * 7.13, fx = p.x + ((i * 37) % 60) - 30 + Math.sin(t * .7 + ph) * 3, fz = p.z + ((i * 53) % 60) - 30, fy = S.H(fx, fz) + 12 - ((t * 1.6 + ph) % 12); r.draw(S.petal, M.mul(M.trs(fx, fy, fz, t + ph, 1), M.rx(t * 2 + ph)), { noCull: true }); }
      for (const n of this.npcs) { const sc = SCENES.lookScale(n.look); const lookAt = Math.hypot(n.x - p.x, n.z - p.z) < 9 ? Math.atan2(p.x - n.x, p.z - n.z) : n.face; n.face += Math.atan2(Math.sin(lookAt - n.face), Math.cos(lookAt - n.face)) * Math.min(1, dt * 5); r.draw(this.npcMeshes[n.look], M.trs(n.x, S.H(n.x, n.z) + Math.abs(Math.sin(t * 2 + n.x)) * .05, n.z, n.face, sc)); }
      for (const it of this.items) if (!it.taken) r.draw(this.itemMeshes[it.icon], M.trs(it.x, it.y + 1.4 + Math.sin(t * 2.4 + it.x) * .35, it.z, t * 1.5, 1.2));
      r.draw(S.water, M.trs(p.x - (p.x % 11.8), 0, p.z - (p.z % 11.8), 0, 1), { wave: true, alpha: S.waterAlpha < 1 ? false : false, tint: [1, 1, 1, 1] });
      // 影子
      r.sprite(null, p.x, p.y, p.z, 3.2, 2.2, { shadow: true });
      for (const e of this.enemies) r.sprite(null, e.x, e.y, e.z, e.boss ? 4.6 : 3.4, e.boss ? 3.2 : 2.4, { shadow: true });
      // 角色廣告板（由遠到近）
      const list = [];
      const pc = CHARACTERS[this.playerId];
      list.push({ url: pc.image, x: p.x, y: p.y + (p.moving ? Math.abs(Math.sin(p.t)) * .35 : Math.sin(t * 2.2) * .08), z: p.z, h: 5.6, flip: p.flip, d: 0 });
      for (const e of this.enemies) { const hh = e.boss ? 8 : 5.8; list.push({ url: CHARACTERS[e.id].image, x: e.x, y: e.y + Math.sin(t * 1.8 + e.x) * .12, z: e.z, h: hh, flip: true, d: Math.hypot(e.x - eye[0], e.z - eye[2]), glow: e.boss && !this.bossUnlocked ? .0 : 0, tint: [1, 1, 1, 1] }); }
      list.forEach(o => { if (!o.d) o.d = Math.hypot(o.x - eye[0], o.z - eye[2]); }); list.sort((a, b) => b.d - a.d);
      for (const o of list) { const rec = r.texture(o.url); const asp = rec.ready ? rec.w / rec.h : .75; r.sprite(o.url, o.x, o.y, o.z, o.h * asp, o.h, { flip: o.flip, tint: o.tint }); }
      if (this.beacon) r.draw(this.beaconMesh, M.trs3(this.beacon.x, this.beacon.y - 1, this.beacon.z, t, 1 + Math.sin(t * 3) * .08, 1, 1 + Math.sin(t * 3) * .08), { alpha: true, noCull: true, tint: [1, .9, .5, .28 + Math.sin(t * 4) * .06] });
      if (this.beacon) { const by = S.H(this.beacon.x, this.beacon.z); r.draw(this.beaconMesh, M.trs3(this.beacon.x, by - .5, this.beacon.z, t, 1 + Math.sin(t * 3) * .08, 1, 1 + Math.sin(t * 3) * .08), { alpha: true, noCull: true, tint: [1, .95, .7, .28] }); }
      // BOSS 屏障
      const boss = this.enemies.find(e => e.boss);
      if (boss && !this.bossUnlocked) r.draw(this.barrier, M.trs3(boss.x, boss.y - 1, boss.z, t * .3, 1, 1 + Math.sin(t * 2) * .03, 1), { alpha: true, noCull: true, tint: [.6, .85, 1, .22 + Math.sin(t * 3) * .05] });
      this._labels(eye);
      this._minimap();
    }
    _labels(eye) {
      const r = this.r, seen = new Set();
      const put = (key, x, y, z, html, cls, onclick) => {
        const s = r.project(x, y, z); if (!s || s.d > 75) return;
        let el = this.labelEls.get(key); if (!el) { el = document.createElement('div'); el.className = 'wlabel ' + cls; el.innerHTML = html; if (onclick) { el.onclick = onclick; el.classList.add('clickable'); } this.labels.appendChild(el); this.labelEls.set(key, el); }
        el.style.transform = `translate(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px) translate(-50%,-100%) scale(${Math.max(.72, Math.min(1.05, 26 / s.d + .3)).toFixed(3)})`;
        el.style.opacity = s.d > 60 ? (75 - s.d) / 15 : 1; seen.add(key);
      };
      const tgt = this.target;
      for (const n of this.npcs) { const h = SCENES.lookScale(n.look) * 3.6 + .4; const q = tgt && tgt.type === 'npc' && tgt.ids.includes(n.id); put('n' + n.id + (q ? 'q' : ''), n.x, S0(this, n) + h, n.z, (q ? '<b class="qmark">!</b>' : '') + `<span>${n.name}</span>`, 'npc' + (q ? ' qtarget' : ''), () => this.goTo(n)); }
      for (const e of this.enemies) { const lock = e.boss && !this.bossUnlocked; const h = e.boss ? 8.6 : 6.4; put('e' + e.id + (lock ? 'l' : ''), e.x, e.y + h, e.z, `${e.boss ? '<i class="crown"></i>' : ''}<em class="lv">LV ${e.lv || ''}</em><span>${CHARACTERS[e.id].name}</span>${lock ? '<em>屏障中</em>' : ''}`, 'foe' + (e.boss ? ' boss' : '') + (lock ? ' locked' : ''), lock ? null : () => this.goTo(e)); }
      for (const it of this.items) if (!it.taken) put('i' + it.idx, it.x, it.y + 3.2, it.z, `<span>${it.label}</span>`, 'item');
      if (this.beacon) put('bc', this.beacon.x, this.beacon.y + 9, this.beacon.z, `<b class="qmark">▼</b><span>${this.beacon.label}</span>`, 'npc qtarget beacon', () => { this.p.target = [this.beacon.x, this.beacon.z]; });
      if (this._marker && this._marker.t < .8 && this.p.target) put('mk', this._marker.x, this.scene.H(this._marker.x, this._marker.z) + .5, this._marker.z, '<i class="dot"></i>', 'marker'); 
      for (const [k, el] of this.labelEls) if (!seen.has(k)) { el.remove(); this.labelEls.delete(k); }
    }
    _minimap() {
      const cv = this.mini; if (!cv || !cv.offsetParent) return; const now = performance.now(); if (this._mt && now - this._mt < 90) return; this._mt = now;
      const ctx = cv.getContext('2d'), W = cv.width, sc = W / 200;
      if (!this._miniBase) {
        const b = document.createElement('canvas'); b.width = b.height = W; const bx = b.getContext('2d'); const img = bx.createImageData(W, W);
        const land = E3.hex(this.chapter.env.ground), sea = this.chapter.id === 'skypiea' ? [.93, .96, 1] : [.1, .25, .35];
        for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const wx = x / sc - 100, wz = y / sc - 100, h = this.scene.H(wx, wz), i = (y * W + x) * 4; const c = h > .35 ? land.map(v => Math.min(1, v * 1.25 + h * .02)) : sea; img.data[i] = c[0] * 255; img.data[i + 1] = c[1] * 255; img.data[i + 2] = c[2] * 255; img.data[i + 3] = 255; }
        bx.putImageData(img, 0, 0); this._miniBase = b;
      }
      ctx.clearRect(0, 0, W, W); ctx.save(); ctx.beginPath(); ctx.arc(W / 2, W / 2, W / 2 - 1, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(this._miniBase, 0, 0);
      const dot = (x, z, r, c, ring) => { ctx.beginPath(); ctx.arc((x + 100) * sc, (z + 100) * sc, r, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); if (ring) { ctx.lineWidth = 2; ctx.strokeStyle = ring; ctx.stroke(); } };
      const tg = this.target;
      for (const it of this.items) if (!it.taken) dot(it.x, it.z, 3, '#7fe3ff');
      for (const n of this.npcs) { const q = tg && tg.type === 'npc' && tg.ids.includes(n.id); dot(n.x, n.z, 3, q ? '#ffd26c' : '#f4ead2', q ? '#fff' : null); }
      if (this.beacon) dot(this.beacon.x, this.beacon.z, 5, '#ffd26c', '#fff');
      for (const e of this.enemies) dot(e.x, e.z, e.boss ? 5 : 3.2, e.boss ? (this.bossUnlocked ? '#ff5a4a' : '#8f9bb0') : '#e8553b', e.boss ? '#ffd26c' : null);
      const px = (this.p.x + 100) * sc, pz = (this.p.z + 100) * sc, a = -this.cam.yaw;
      ctx.translate(px, pz); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(0, 2.5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#0a1f33'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    }
    snapshot() { return this.canvas.toDataURL('image/webp', .85); }
  }
  function S0(w, n) { return w.scene.H(n.x, n.z); }
  global.World = World;
})(window);
