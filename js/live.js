/* 即時對戰（1 對 1／3 對 3，回合制同時出招）＋ 好友觀戰
   - 邀請方是「主機」：雙方送出行動後，由主機用遊戲原本的戰鬥規則計算這一回合，再把結果寫回房間；被邀請方與觀戰者只負責顯示，所以大家看到的戰況一定相同。
   - 3 對 3：雙方各選 3 位、依順序上場；每回合可以出招或換人（換人會用掉這回合，換上來的角色會承受對手的攻擊）；上場的角色倒下時，下一位自動上場；全員倒下就輸。
   - 觀戰：房間預設公開給登入的玩家讀取（open: true），好友面板會列出「好友正在對戰」，按「觀戰」即可即時觀看（觀戰者不能操作）。
   - 房間：rooms/{id}：host、guest、mode（1／3）、status（invite → pick → battle → done／declined／cancelled）、hPick／gPick（陣列）、turn、deadline、acts、state、sim、ev、winner、emo、open。
   - 每回合 30 秒；時間到還沒行動，由系統自動出招。即時對戰沒有獎勵，結果記在對戰紀錄（duels，mode: 'live'）。 */
const LIVE_CFG = { turnSec: 30, inviteSec: 180, hostLostSec: 60, bg: 'assets/ui/throne_bg.webp?v=28' };
const LIVE = (function () {
  const F = () => CLOUD.fb(), U = () => CLOUD.user();
  const esc3 = s => (typeof esc === 'function' ? esc(s) : String(s));
  let rid = null, room = null, role = null, unsub = null, sim = null, tick = null, busyWrite = false, myName = '', invites = [], invUnsub = null, seenInv = new Set(), el = null, picking = [], watching = false;
  const other = r => (r === 'h' ? 'g' : 'h');
  const ref = id => F().db.collection('rooms').doc(id || rid);
  const size = () => (room && room.mode === 3 ? 3 : 1);

  /* ---------- 邀請 ---------- */
  async function invite(card, me, mode) {
    if (!U()) return; myName = me || '';
    if (rid && room && !watching && ['invite', 'pick', 'battle'].includes(room.status)) { toast('你已經在一場即時對戰中'); open(); return; }
    const d = await F().db.collection('rooms').add({ host: U().uid, guest: card.uid, hostName: myName, guestName: card.username, mode: mode === 3 ? 3 : 1, status: 'invite', at: Date.now(), turn: 0, acts: {}, open: true });
    join(d.id, 'h');
  }
  async function accept(id) { try { await ref(id).update({ status: 'pick', joinedAt: Date.now() }); join(id, 'g'); } catch (e) { toast(CLOUD.errText(e)); } }
  async function decline(id) { try { await ref(id).update({ status: 'declined' }); } catch (e) { } invites = invites.filter(x => x.id !== id); notify(); }
  function join(id, r) {
    if (unsub) unsub(); rid = id; role = r; watching = r === 'w'; room = null; sim = null; picking = []; open();
    unsub = ref(id).onSnapshot(s => { room = s.exists ? s.data() : null; onRoom(); }, e => { msg(CLOUD.errText(e)); });
    clearInterval(tick); tick = setInterval(onTick, 1000);
  }
  function watch(id) { join(id, 'w'); }
  function leave() { if (unsub) unsub(); unsub = null; clearInterval(tick); rid = null; room = null; role = null; sim = null; watching = false; close(); }

  /* ---------- 主機：建立戰鬥與計算回合 ---------- */
  const QUIET = ['showDamage', 'showHeal', 'renderHUD', 'floatText', 'showFx', 'triggerImpact', 'refreshFighterImage', 'applyVisual', 'renderTeam', 'renderSkills', 'updateCamera', 'banner', 'spawnSupport'];
  let EV = [];
  function quiet(fn) { const saved = {}; QUIET.forEach(n => { saved[n] = window[n]; window[n] = () => { }; }); const sl = window.log; window.log = t => { EV.push(String(t).replace(/<[^>]+>/g, '')); };
    const sb = battle; battle = sim.b; try { return fn(); } finally { QUIET.forEach(n => { window[n] = saved[n]; }); window.log = sl; battle = sb; } }
  function mkFighter(p) { const f = buildFighter(p.id, p.lv, p.skin || null); applyRarityScale(f); f.status.revive = 0; return f; }
  const H = () => sim.H[sim.hi], G = () => sim.G[sim.gi];
  function mkSim(Ht, Gt, hi, gi) { const b = { player: Ht[hi || 0], enemy: Gt[gi || 0], team: Ht, pi: hi || 0, isBoss: false, round: 1, opts: { pvp: true }, difficulty: CHAPTER_DIFFICULTY.pvp || CHAPTER_DIFFICULTY.east, chapterId: 'pvp', gameOver: false, voidDamage: 0, live: true }; return { H: Ht, G: Gt, hi: hi || 0, gi: gi || 0, b }; }
  function owner(o) { if (!o) return null; let k = sim.H.indexOf(o); if (k >= 0) return 'h' + k; k = sim.G.indexOf(o); return k >= 0 ? 'g' + k : null; }
  const byOwner = s => s ? (s[0] === 'h' ? sim.H : sim.G)[+s.slice(1)] : null;
  function restore() { if (sim || !room || !room.sim) return; try { const S = JSON.parse(room.sim); sim = mkSim(S.H, S.G, S.hi, S.gi); sim.b.round = S.round || 1; ['eruption', 'iceAge'].forEach(k => { if (S[k]) sim.b[k] = { ...S[k], owner: byOwner(S[k].owner) }; }); } catch (e) { } }
  function pack() { const B = sim.b, o = {}; ['eruption', 'iceAge'].forEach(k => { if (B[k]) o[k] = { ...B[k], owner: owner(B[k].owner) }; }); return JSON.stringify({ H: sim.H, G: sim.G, hi: sim.hi, gi: sim.gi, round: B.round, ...o }); }
  const usable = f => f.skills.map((s, i) => ({ s, i })).filter(x => x.s.pp > 0 && !x.s.locked);
  const autoIdx = f => { const u = usable(f); return u.length ? u[Math.floor(Math.random() * u.length)].i : -1; };
  /* 一位角色的行動（照 battle.js 的 executeAction，但不播放動畫） */
  function act(actor, target, idx) {
    if (actor.hp <= 0) return; let skill = idx === -1 ? STRUGGLE : actor.skills[idx]; if (!skill || skill.pp <= 0 || skill.locked) { const a = autoIdx(actor); skill = a === -1 ? STRUGGLE : actor.skills[a]; }
    const unstoppable = !!(skill.effect && skill.effect.unstoppable), cc = !unstoppable && CC_KEYS.find(k => actor.status[k] > 0);
    if (cc) { actor.status[cc]--; log(`${actor.name} 陷入${ABN[cc].name}，這回合無法使用技能`); return; }
    if (!unstoppable && actor.status.skipAttack > 0) { actor.status.skipAttack--; log(`${actor.name} 本回合無法攻擊`); return; }
    if (!unstoppable && actor.status.attackFail > 0 && Math.random() < actor.status.attackFailChance) { actor.status.attackFail--; log(`${actor.name} 的攻擊失效了`); return; }
    if (actor.status.attackFail > 0) actor.status.attackFail--;
    if (skill !== STRUGGLE) skill.pp--; actor.status.lastSkill = skill.name; log(`▶ ${actor.name} 使用「${skill.name}」`);
    if (Math.random() * 100 > skill.accuracy) { log(`${actor.name} 的招式落空`); return; }
    const blocked = actor.status.skillNullify > 0;
    if (target.status.invuln > 0 && skill.type === 'attack') { log(`🛡️ ${actor.name} 的攻擊對 ${target.name} 無效！`); return; }
    if (target.status.dodge > 0 && skill.type === 'attack') { target.status.dodge--; log(`${target.name} 閃避了攻擊`); return; }
    const reflected = target.status.reflect > 0 && skill.type === 'attack', result = computeSkillOutcome(actor, target, skill, blocked);
    if (reflected) { const m = target.status.reflectMultiplier || 1; target.status.reflect = 0; log(`${target.name} 把傷害 ${m} 倍反彈回去`); applyDamage(actor, Math.max(1, Math.round(result.damage * m)), 'L'); if (target.status.reflectNegative && !blocked) applyReflectedNegativeEffects(skill, target, actor); target.status.reflectMultiplier = 1; target.status.reflectNegative = false; return; }
    if (result.damage > 0) { const before = target.hp; applyDamage(target, result.damage, 'R', result.meta); log(`💥 ${target.name} 受到 ${Math.max(0, before - target.hp)} 點傷害`); }
    if (!blocked) applySkillEffects(actor, target, skill, result);
    if (result.damage > 0 && skill.type === 'attack' && actor.hp > 0) {
      if (target.status.thornTurns > 0) { const d = Math.max(1, Math.round(result.damage * (target.status.thornRatio || .5))); log(`🌵 ${target.name} 反彈了 ${d} 點傷害`); applyDamage(actor, d, 'L'); }
      if (target.hp > 0 && target.status.phoenix > 0 && Math.random() < (target.status.counterChance || 0)) { const d = calcAttackDamage(target, actor, { type: 'attack', power: 70, effect: {} }); log(`🐦 ${target.name} 立刻反擊！`); applyDamage(actor, d, 'L'); }
    }
  }
  /* 倒下時的復活效果（不死鳥、最初的20人） */
  function rise(f) { if (f.hp > 0) return; if (f.status.undyingTurns > 0) { f.status.undyingTurns = 0; f.hp = f.maxHp; f.status.dots = []; log(`🐦 ${f.name} 從青色的火焰中重生，體力全滿！`); return; } if (f.status.lives > 0) { f.status.lives--; f.hp = f.maxHp; f.status.dots = []; log(`👑 ${f.name} 再次站了起來！`); } }
  const alive = T => T.some(f => f.hp > 0);
  function setCtx(side) { const me = side === 'h' ? H() : G(), op = side === 'h' ? G() : H(); sim.b.player = me; sim.b.enemy = op; sim.b.team = side === 'h' ? sim.H : sim.G; sim.b.pi = side === 'h' ? sim.hi : sim.gi; }
  function swap(side, k) { const T = side === 'h' ? sim.H : sim.G, cur = side === 'h' ? sim.hi : sim.gi; if (k === cur || !T[k] || T[k].hp <= 0) return false; if (side === 'h') sim.hi = k; else sim.gi = k; const f = T[k]; if (f.__dadPending && window.grantDad) { f.__dadPending = false; grantDad(f); } log(`🔁 ${T[cur].name} 退下，${f.name} 上場！`); return true; }
  function nextUp(side) { const T = side === 'h' ? sim.H : sim.G, cur = side === 'h' ? sim.hi : sim.gi; if (T[cur].hp > 0) return; const k = T.findIndex(f => f.hp > 0); if (k >= 0) { if (side === 'h') sim.hi = k; else sim.gi = k; log(`➡️ ${T[k].name} 上場！`); } }
  function resolve(ah, ag) {
    EV = [];
    const end = quiet(() => {
      /* 先處理換人（換人會用掉這回合） */
      const A = { h: ah, g: ag };
      ['h', 'g'].forEach(s => { if (A[s] && A[s].sw != null) swap(s, A[s].sw); });
      const idx = s => (A[s] && A[s].sw == null ? A[s].i : null);
      const fs = (f, i) => !!(i != null && i >= 0 && f.skills[i] && f.skills[i].effect && f.skills[i].effect.firstStrike), hF = fs(H(), idx('h')), gF = fs(G(), idx('g')), sh = effectiveSpeed(H()), sg = effectiveSpeed(G());
      const hFirst = hF !== gF ? hF : sh === sg ? Math.random() < .5 : sh > sg, order = hFirst ? ['h', 'g'] : ['g', 'h'];
      for (const s of order) { const i = idx(s); if (i == null) continue; const a = s === 'h' ? H() : G(), t = s === 'h' ? G() : H(); if (a.hp <= 0 || t.hp <= 0) continue; setCtx(s); act(a, t, i); [H(), G()].forEach(rise); }
      setCtx('h'); if (H().hp > 0) endTurnStatus(H()); setCtx('g'); if (G().hp > 0) endTurnStatus(G()); [H(), G()].forEach(rise);
      nextUp('h'); nextUp('g'); setCtx('h');
      return !alive(sim.H) || !alive(sim.G);
    });
    sim.b.round++;
    let winner = null; if (end) winner = !alive(sim.H) && !alive(sim.G) ? 'draw' : !alive(sim.H) ? 'g' : 'h';
    return { winner, ev: EV.slice(-18) };
  }
  const STAT = ['freeze', 'burn', 'paralyze', 'fear', 'fatigue', 'petrify', 'weak', 'armorBreak', 'stun'];
  function view(f) { return { id: f.id, name: f.name, title: f.title, image: f.image, avatar: f.avatar, level: f.level, hp: Math.max(0, Math.round(f.hp)), maxHp: Math.round(f.maxHp), shield: Math.round(f.status.shield || 0), buffs: { ...f.buffs }, st: STAT.filter(k => (f.status[k] || 0) > 0 && ABN[k]).map(k => ABN[k].icon + ABN[k].name),
    sk: f.skills.map(s => ({ n: s.name, t: s.type, pp: s.pp, mx: s.maxPP, pw: s.power, d: s.desc, u: !!s.ultimate, l: s.locked ? 1 : 0 })) }; }
  const sideView = (T, a) => ({ a, team: T.map(view) });
  async function hostStart() {
    if (busyWrite) return; busyWrite = true;
    try { const hp = [].concat(room.hPick), gp = [].concat(room.gPick); sim = mkSim(hp.map(mkFighter), gp.map(mkFighter));
      await ref().update({ status: 'battle', turn: 1, deadline: Date.now() + LIVE_CFG.turnSec * 1000, acts: {}, state: { h: sideView(sim.H, 0), g: sideView(sim.G, 0) }, sim: pack(), ev: [`即時對戰開始（${size()} 對 ${size()}）：${H().name} 對上 ${G().name}`] });
    } finally { busyWrite = false; }
  }
  const autoAct = (T, k) => ({ i: autoIdx(T[k]) });
  async function hostTurn(force) {
    if (busyWrite || !room || room.status !== 'battle') return; restore(); if (!sim) return;
    const A = room.acts || {}, t = room.turn, ah = A.h && A.h.t === t ? A.h : null, ag = A.g && A.g.t === t ? A.g : null;
    if (!force && (!ah || !ag)) return;
    busyWrite = true;
    try { const r = resolve(ah || autoAct(sim.H, sim.hi), ag || autoAct(sim.G, sim.gi)), auto = [!ah ? `${room.hostName} 超時，自動出招` : null, !ag ? `${room.guestName} 超時，自動出招` : null].filter(Boolean);
      const up = { turn: t + 1, deadline: Date.now() + LIVE_CFG.turnSec * 1000, acts: {}, state: { h: sideView(sim.H, sim.hi), g: sideView(sim.G, sim.gi) }, sim: pack(), ev: [...auto, ...r.ev] };
      if (r.winner) { up.status = 'done'; up.winner = r.winner; up.endedAt = Date.now(); }
      await ref().update(up);
      if (r.winner) record(r.winner, t);
    } catch (e) { msg(CLOUD.errText(e)); } finally { busyWrite = false; }
  }
  function record(winner, rounds, reason) { if (winner === 'draw') return; F().db.collection('duels').add({ attacker: room.host, defender: room.guest, attackerName: room.hostName, defenderName: room.guestName, win: winner === 'h', rounds, mode: 'live', size: size(), reason: reason || '', at: Date.now() }).catch(() => { }); }

  /* ---------- 雙方：送出行動、選角、投降 ---------- */
  async function send(a) { if (!room || room.status !== 'battle' || watching) return; const A = room.acts || {}; if (A[role] && A[role].t === room.turn) return; try { await ref().update({ ['acts.' + role]: { t: room.turn, ...a } }); } catch (e) { msg(CLOUD.errText(e)); } }
  async function pick(ids) { const eq = (SAVE.data.skins || {}).equip || {}; try { await ref().update({ [role + 'Pick']: ids.map(id => ({ id, lv: crewLv(id), skin: eq[id] || null, name: CHARACTERS[id].name })) }); } catch (e) { msg(CLOUD.errText(e)); } }
  async function surrender() { const go = async () => { try { const w = other(role); await ref().update({ status: 'done', winner: w, reason: 'surrender', endedAt: Date.now() }); if (role === 'h') record(w, room.turn, 'surrender'); } catch (e) { } }; if (typeof confirmBox === 'function') confirmBox('投降？', '這場即時對戰會算你落敗。', '投降', go); else go(); }
  /* 表情：雙方都看得到，3 秒冷卻 */
  const EMO = [['👍', '好招！'], ['😆', '哈哈哈'], ['😱', '不會吧！'], ['🔥', '認真了'], ['🙏', '手下留情'], ['🤝', '好對決！']];
  let lastEmo = 0, shownEmo = {};
  async function emote(k) { if (Date.now() - lastEmo < 3000) return; lastEmo = Date.now(); try { await ref().update({ ['emo.' + role]: { k: +k, at: Date.now() } }); } catch (e) { } }
  const activeEmo = {};
  function bubbles() { if (!el || !room) return; const now = Date.now(); ['h', 'g'].forEach(r => { const E = room.emo && room.emo[r]; if (E && shownEmo[r] !== E.at && now - E.at < 6000) { shownEmo[r] = E.at; activeEmo[r] = { t: EMO[E.k] ? EMO[E.k].join(' ') : '…', until: now + 3200 }; }
      const A = activeEmo[r]; if (!A || A.until < now) return; const host = el.querySelector(r === (watching ? 'h' : role) ? '.lv-f.me' : '.lv-f.op'); if (!host || host.querySelector('.lv-bubble')) return; const b = document.createElement('div'); b.className = 'lv-bubble'; b.textContent = A.t; host.appendChild(b); setTimeout(() => b.remove(), A.until - now); }); }
  /* 再戰一場：由按下的人當主機，重新邀請對方 */
  function rematch() { const o = role === 'h' ? { uid: room.guest, username: room.guestName } : { uid: room.host, username: room.hostName }, n = role === 'h' ? room.hostName : room.guestName, m = size(); leave(); invite(o, n, m); }
  async function cancel() { try { await ref().update({ status: 'cancelled' }); } catch (e) { } leave(); }

  /* ---------- 房間狀態變化 ---------- */
  function onRoom() {
    if (!room) { msg('房間已不存在'); return; }
    if (role === 'h' && room.status === 'pick' && room.hPick && room.gPick) hostStart();
    if (role === 'h' && room.status === 'battle') { restore(); const A = room.acts || {}; if (A.h && A.g && A.h.t === room.turn && A.g.t === room.turn) hostTurn(false); }
    render();
  }
  function onTick() {
    if (!room) return; const now = Date.now();
    if (room.status === 'invite' && role === 'h' && now - room.at > LIVE_CFG.inviteSec * 1000) { cancel(); toast('對方沒有回應，邀請已取消'); return; }
    if (room.status === 'battle' && role === 'h' && now > room.deadline) hostTurn(true);
    const t = el && el.querySelector('.lv-timer'); if (t && room.status === 'battle') { const s = Math.max(0, Math.ceil((room.deadline - now) / 1000)); t.textContent = s; t.classList.toggle('hurry', s <= 5); }
    const lost = el && el.querySelector('.lv-lost'); if (lost) lost.hidden = !(role !== 'h' && room.status === 'battle' && now > room.deadline + LIVE_CFG.hostLostSec * 1000);
  }

  /* ---------- 畫面 ---------- */
  function open() { if (!el) { el = document.createElement('div'); el.className = 'lv-screen'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '即時對戰'); } document.body.appendChild(el); render(); }
  function close() { if (el) el.remove(); }
  function msg(m) { if (!el) return; const p = el.querySelector('.lv-msg'); if (p) p.textContent = m; else toast(m); }
  const bar = f => `<div class="lv-hp"><i style="width:${f.maxHp ? f.hp / f.maxHp * 100 : 0}%"></i>${f.shield ? `<em style="width:${Math.min(100, f.shield / f.maxHp * 100)}%"></em>` : ''}</div><small>${f.hp.toLocaleString()} / ${f.maxHp.toLocaleString()}${f.shield ? `・🛡️${f.shield.toLocaleString()}` : ''}</small>`;
  const buffs = f => ['atk', 'def', 'spd'].filter(k => f.buffs[k]).map(k => `<i class="${f.buffs[k] > 0 ? 'up' : 'dn'}">${{ atk: '攻', def: '防', spd: '速' }[k]}${f.buffs[k] > 0 ? '+' : ''}${f.buffs[k]}</i>`).join('') + f.st.map(s => `<i class="st">${s}</i>`).join('');
  const bench = (S, cls) => S.team.length > 1 ? `<div class="lv-bench ${cls}">${S.team.map((f, k) => `<span class="${k === S.a ? 'on' : ''} ${f.hp <= 0 ? 'ko' : ''}"><img src="${f.avatar}" alt=""><i style="width:${f.maxHp ? f.hp / f.maxHp * 100 : 0}%"></i></span>`).join('')}</div>` : '';
  function fighter(S, side, name) { const f = S.team[S.a]; return `<div class="lv-f ${side}"><img class="lv-art" src="${f.image}" alt=""><div class="lv-plate"><b>${esc3(f.name)}<small>LV ${f.level}・${esc3(name || '')}</small></b>${bar(f)}<div class="lv-buffs">${buffs(f)}</div>${bench(S, side)}</div></div>`; }
  function render() {
    if (!el || !el.isConnected) return; const R = room, W = watching, me = W ? 'h' : role, op = other(me), N = size();
    const nm = r => R ? (r === 'h' ? R.hostName : R.guestName) : '', myN = nm(me), opN = nm(op);
    let body = '';
    if (!R) body = `<p class="lv-center">連線中…</p>`;
    else if (R.status === 'invite') body = me === 'h' && !W ? `<div class="lv-center"><p>已邀請 <b>${esc3(R.guestName)}</b> 進行 ${N} 對 ${N} 即時對戰</p><p class="lv-sub">等待對方接受…（${LIVE_CFG.inviteSec / 60} 分鐘內沒有回應會自動取消）</p><button class="btn-ghost" data-a="cancel">取消邀請</button></div>` : `<p class="lv-center">等待中…</p>`;
    else if (R.status === 'declined' || R.status === 'cancelled') body = `<div class="lv-center"><p>${R.status === 'declined' ? '對方婉拒了邀請' : '邀請已取消'}</p><button class="btn-gold" data-a="leave">離開</button></div>`;
    else if (R.status === 'pick') { const mine = W ? null : R[me + 'Pick'], his = R[op + 'Pick'];
      body = W ? `<p class="lv-center">雙方正在選擇船員…</p>` : mine ? `<div class="lv-center"><p>你選擇了 <b>${[].concat(mine).map(x => esc3(x.name)).join('、')}</b></p><p class="lv-sub">${his ? '雙方都選好了，準備開戰…' : `等待 ${esc3(opN)} 選擇船員…`}</p></div>`
        : `<div class="lv-pick"><h3>選擇出戰的船員（${picking.length}/${N}${N > 1 ? '，依點選順序上場' : ''}）</h3><p class="lv-sub">${N} 對 ${N} 對決，每回合 ${LIVE_CFG.turnSec} 秒內行動，雙方同時出手（速度快的先動）。${N > 1 ? '可以用一回合換人；上場的角色倒下時，下一位自動上場。' : ''}即時對戰沒有獎勵。</p><div class="lv-grid">${CHARACTER_ORDER.filter(id => typeof owned === 'function' && owned(id)).map(id => { const k = picking.indexOf(id); return `<button data-pick="${id}" class="${k >= 0 ? 'on' : ''}"><img src="${charArt(id, 'avatar')}" alt="">${k >= 0 && N > 1 ? `<b class="lv-ord">${k + 1}</b>` : ''}<em>LV ${crewLv(id)}</em><span>${CHARACTERS[id].name}</span></button>`; }).join('')}</div><button class="btn-gold big" data-a="pick" ${picking.length === N ? '' : 'disabled'}>確定出戰</button></div>`; }
    else if (R.status === 'battle' || R.status === 'done') { const S = R.state || {}, ms = S[me], os = S[op]; if (!ms || !os || !ms.team) body = '<p class="lv-center">準備中…</p>'; else {
      const mf = ms.team[ms.a], sent = !W && R.acts && R.acts[me] && R.acts[me].t === R.turn, done = R.status === 'done', Wn = R.winner;
      const res = W ? (Wn === 'draw' ? '平手' : `${esc3(nm(Wn))} 獲勝！`) : Wn === me ? '勝利！' : Wn === 'draw' ? '平手' : '落敗';
      body = `<div class="lv-arena" style="background-image:url('${LIVE_CFG.bg}')">${fighter(os, 'op', opN)}${fighter(ms, 'me', myN)}<div class="lv-round">${done ? '結束' : `第 ${R.turn} 回合`}${done ? '' : `<b class="lv-timer">${LIVE_CFG.turnSec}</b>`}</div>${W ? '<span class="lv-watch">👀 觀戰中</span>' : ''}</div>
        <ol class="lv-log">${(R.ev || []).slice(-8).map(t => `<li>${esc3(t)}</li>`).join('')}</ol>
        ${W ? '' : `<div class="lv-emo">${EMO.map((e, k) => `<button data-emo="${k}" title="${e[1]}" aria-label="${e[1]}">${e[0]}</button>`).join('')}</div>`}
        ${done ? `<div class="lv-result ${W ? '' : Wn === me ? 'win' : Wn === 'draw' ? '' : 'lose'}"><b>${res}</b><small>${R.reason === 'surrender' ? '有一方投降了' : `共 ${R.turn - 1} 回合`}</small><div class="sc-row">${W ? '' : '<button class="btn-gold" data-a="rematch">再戰一場</button>'}<button class="btn-ghost" data-a="leave">離開</button></div></div>`
        : W ? `<p class="lv-wait">觀戰中：雙方每回合同時出手</p><div class="lv-foot"><button class="btn-ghost sm" data-a="leave">離開觀戰</button></div>`
        : `<div class="lv-skills ${sent ? 'sent' : ''}">${mf.sk.map((s, i) => `<button data-sk="${i}" ${sent || s.l || s.pp <= 0 || mf.hp <= 0 ? 'disabled' : ''} class="${s.u ? 'ult' : ''}" title="${esc3(s.d || '')}"><b>${esc3(s.n)}</b><small>${s.l ? '未解鎖' : `${s.t === 'attack' ? `威力 ${s.pw}` : '輔助'}・${s.pp}/${s.mx}`}</small></button>`).join('')}${mf.sk.every(s => s.l || s.pp <= 0) ? `<button data-sk="-1" ${sent ? 'disabled' : ''}><b>奮力一擊</b><small>技能用完時</small></button>` : ''}</div>
          ${ms.team.length > 1 ? `<div class="lv-switch"><small>換人（用掉這回合）：</small>${ms.team.map((f, k) => k === ms.a ? '' : `<button class="btn-ghost sm" data-sw="${k}" ${sent || f.hp <= 0 ? 'disabled' : ''}><img src="${f.avatar}" alt="">${esc3(f.name)}</button>`).join('')}</div>` : ''}
          <p class="lv-wait">${sent ? `已行動，等待 ${esc3(opN)}…` : '選擇這回合要使用的招式'}</p><p class="lv-lost" hidden>對手好像斷線了。<button class="btn-ghost sm" data-a="leave">離開（不計結果）</button></p>
          <div class="lv-foot"><button class="btn-ghost sm" data-a="surrender">投降</button></div>`}`; } }
    el.innerHTML = `<div class="lv-wrap"><header class="lv-head"><b>${W ? '👀 觀戰' : '⚔️ 即時對戰'}${R ? `<small> ${size()} 對 ${size()}</small>` : ''}</b><span>${R ? `${esc3(myN)} vs ${esc3(opN)}` : ''}</span><button class="icon-btn sm" data-a="hide" aria-label="收起">×</button></header><div class="lv-body">${body}</div><p class="lv-msg"></p></div>`;
    const on = (s, f) => el.querySelectorAll(s).forEach(b => b.onclick = () => f(b));
    on('[data-a=cancel]', cancel); on('[data-a=leave]', leave); on('[data-a=surrender]', surrender);
    on('[data-a=hide]', () => { if (!W && R && ['battle', 'pick', 'invite'].includes(R.status)) { close(); toast('即時對戰仍在進行中，可從「好友 → 邀請・禮物」回到戰場'); } else leave(); });
    on('[data-pick]', b => { const id = b.dataset.pick, k = picking.indexOf(id); if (k >= 0) picking.splice(k, 1); else if (picking.length < size()) picking.push(id); else if (size() === 1) picking = [id]; render(); });
    on('[data-a=pick]', () => picking.length === size() && pick(picking.slice()));
    on('[data-sk]', b => send({ i: +b.dataset.sk })); on('[data-sw]', b => send({ sw: +b.dataset.sw }));
    on('[data-emo]', b => emote(b.dataset.emo)); on('[data-a=rematch]', rematch); bubbles(); onTick();
  }

  /* ---------- 收到邀請 ---------- */
  function listen() {
    if (invUnsub) { invUnsub(); invUnsub = null; } invites = []; notify(); if (!U()) return;
    invUnsub = F().db.collection('rooms').where('guest', '==', U().uid).where('status', '==', 'invite').onSnapshot(q => {
      invites = q.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => Date.now() - x.at < LIVE_CFG.inviteSec * 1000);
      invites.forEach(x => { if (!seenInv.has(x.id)) { seenInv.add(x.id); popup(x); } }); notify();
    }, () => { });
  }
  function popup(x) {
    if (rid && !watching && room && ['invite', 'pick', 'battle'].includes(room.status)) return; try { if (localStorage.getItem('op_live_pop') === '0') { toast(`${x.hostName} 邀請你即時對戰（到「好友 → 邀請・禮物」查看）`); return; } } catch (e) { }
    const p = document.createElement('div'); p.className = 'lv-pop'; p.innerHTML = `<b>⚔️ ${esc3(x.hostName)} 邀請你 ${x.mode === 3 ? '3 對 3' : '1 對 1'} 即時對戰！</b><span><button class="btn-gold sm">接受</button><button class="btn-ghost sm">婉拒</button></span>`;
    document.body.appendChild(p); const [a, d] = p.querySelectorAll('button'); a.onclick = () => { p.remove(); accept(x.id); }; d.onclick = () => { p.remove(); decline(x.id); }; setTimeout(() => p.remove(), 30000);
  }
  function notify() { if (typeof window.socialRefreshDot === 'function') window.socialRefreshDot(); }
  /* 好友正在進行的對戰（給觀戰用） */
  async function liveOf(uids) { if (!uids.length) return []; const out = [], db = F().db; for (let i = 0; i < uids.length; i += 10) { const part = uids.slice(i, i + 10); for (const f of ['host', 'guest']) { try { const q = await db.collection('rooms').where(f, 'in', part).where('status', '==', 'battle').where('open', '==', true).get(); q.docs.forEach(d => { const r = d.data(); if (r.open !== false && Date.now() - (r.deadline || 0) < 120000 && !out.some(x => x.id === d.id)) out.push({ id: d.id, ...r }); }); } catch (e) { } } } return out; }
  window.addEventListener('DOMContentLoaded', () => { if (typeof CLOUD === 'undefined') return; CLOUD.onUser(u => { if (!u) { if (invUnsub) invUnsub(); invUnsub = null; invites = []; notify(); } else listen(); }); });
  return { invite, accept, decline, watch, open, liveOf, invites: () => invites, active: () => !!(rid && room && !watching && ['invite', 'pick', 'battle'].includes(room.status)), _sim: () => sim, _room: () => room };
})();
