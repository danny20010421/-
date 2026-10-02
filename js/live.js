/* 即時對戰（1 對 1，回合制同時出招）
   - 邀請方是「主機」：雙方送出招式後，由主機用遊戲原本的戰鬥規則計算這一回合，再把結果（雙方體力、狀態、技能次數、戰報）寫回房間。
     被邀請方只負責送出招式與顯示結果，所以兩邊看到的戰況一定相同。
   - 房間：rooms/{id}：host、guest、status（invite → pick → battle → done／declined／cancelled）、hPick／gPick、turn、deadline、acts、state、sim、ev、winner。
   - 每回合 30 秒；時間到還沒出招，由系統替該玩家自動出招。主機重新整理頁面也能從房間裡的 sim 繼續。
   - 即時對戰沒有獎勵，結果記在對戰紀錄（duels，mode: 'live'）。 */
const LIVE_CFG = { turnSec: 30, inviteSec: 180, hostLostSec: 60, bg: 'assets/ui/throne_bg.webp?v=28' };
const LIVE = (function () {
  const F = () => CLOUD.fb(), U = () => CLOUD.user();
  const esc3 = s => (typeof esc === 'function' ? esc(s) : String(s));
  let rid = null, room = null, role = null, unsub = null, sim = null, tick = null, busyWrite = false, myName = '', invites = [], invUnsub = null, seenInv = new Set(), el = null, picking = null;
  const other = r => (r === 'h' ? 'g' : 'h');
  const ref = id => F().db.collection('rooms').doc(id || rid);

  /* ---------- 邀請 ---------- */
  async function invite(card, me) {
    if (!U()) return; myName = me || '';
    if (rid && room && ['invite', 'pick', 'battle'].includes(room.status)) { toast('你已經在一場即時對戰中'); open(); return; }
    const d = await F().db.collection('rooms').add({ host: U().uid, guest: card.uid, hostName: myName, guestName: card.username, status: 'invite', at: Date.now(), turn: 0, acts: {} });
    join(d.id, 'h');
  }
  async function accept(id) { try { await ref(id).update({ status: 'pick', joinedAt: Date.now() }); join(id, 'g'); } catch (e) { toast(CLOUD.errText(e)); } }
  async function decline(id) { try { await ref(id).update({ status: 'declined' }); } catch (e) { } invites = invites.filter(x => x.id !== id); notify(); }
  function join(id, r) {
    if (unsub) unsub(); rid = id; role = r; room = null; sim = null; picking = null; open();
    unsub = ref(id).onSnapshot(s => { room = s.exists ? s.data() : null; onRoom(); }, e => { msg(CLOUD.errText(e)); });
    clearInterval(tick); tick = setInterval(onTick, 1000);
  }
  function leave() { if (unsub) unsub(); unsub = null; clearInterval(tick); rid = null; room = null; role = null; sim = null; close(); }

  /* ---------- 主機：建立戰鬥與計算回合 ---------- */
  const QUIET = ['showDamage', 'showHeal', 'renderHUD', 'floatText', 'showFx', 'triggerImpact', 'refreshFighterImage', 'applyVisual', 'renderTeam', 'renderSkills', 'updateCamera', 'banner', 'spawnSupport'];
  let EV = [];
  function quiet(fn) { const saved = {}; QUIET.forEach(n => { saved[n] = window[n]; window[n] = () => { }; }); const sl = window.log; window.log = t => { EV.push(String(t).replace(/<[^>]+>/g, '')); };
    const sb = battle; battle = sim.b; try { return fn(); } finally { QUIET.forEach(n => { window[n] = saved[n]; }); window.log = sl; battle = sb; } }
  function mkFighter(p) { const f = buildFighter(p.id, p.lv, p.skin || null); applyRarityScale(f); f.status.revive = 0; return f; }
  function mkSim(h, g) { const b = { player: h, enemy: g, team: [h], pi: 0, isBoss: false, round: 1, opts: { pvp: true }, difficulty: CHAPTER_DIFFICULTY.pvp || CHAPTER_DIFFICULTY.east, chapterId: 'pvp', gameOver: false, voidDamage: 0, live: true }; return { h, g, b }; }
  function restore() { if (sim || !room || !room.sim) return; try { const S = JSON.parse(room.sim); sim = mkSim(S.h, S.g); sim.b.round = S.round || 1; sim.b.eruption = S.eruption ? { ...S.eruption, owner: S.eruption.owner === 'h' ? sim.h : sim.g } : null; sim.b.iceAge = S.iceAge ? { ...S.iceAge, owner: S.iceAge.owner === 'h' ? sim.h : sim.g } : null; } catch (e) { } }
  function pack() { const own = o => o ? (o === sim.h ? 'h' : 'g') : null, B = sim.b; return JSON.stringify({ h: sim.h, g: sim.g, round: B.round, eruption: B.eruption ? { ...B.eruption, owner: own(B.eruption.owner) } : null, iceAge: B.iceAge ? { ...B.iceAge, owner: own(B.iceAge.owner) } : null }); }
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
  const dead = () => { [sim.h, sim.g].forEach(rise); return sim.h.hp <= 0 || sim.g.hp <= 0; };
  function resolve(ah, ag) {
    EV = [];
    const end = quiet(() => {
      const fs = (f, i) => !!(i >= 0 && f.skills[i] && f.skills[i].effect && f.skills[i].effect.firstStrike), hF = fs(sim.h, ah), gF = fs(sim.g, ag), sh = effectiveSpeed(sim.h), sg = effectiveSpeed(sim.g);
      const hFirst = hF !== gF ? hF : sh === sg ? Math.random() < .5 : sh > sg, order = hFirst ? [[sim.h, sim.g, ah], [sim.g, sim.h, ag]] : [[sim.g, sim.h, ag], [sim.h, sim.g, ah]];
      for (const [a, t, i] of order) { sim.b.player = a; sim.b.enemy = t; sim.b.team = [a]; act(a, t, i); sim.b.player = sim.h; sim.b.enemy = sim.g; sim.b.team = [sim.h]; if (dead()) return true; }
      endTurnStatus(sim.h); endTurnStatus(sim.g); return dead();
    });
    sim.b.round++;
    let winner = null; if (end) winner = sim.h.hp <= 0 && sim.g.hp <= 0 ? 'draw' : sim.h.hp <= 0 ? 'g' : 'h';
    return { winner, ev: EV.slice(-16) };
  }
  const STAT = ['freeze', 'burn', 'paralyze', 'fear', 'fatigue', 'petrify', 'weak', 'armorBreak', 'stun'];
  function view(f) { return { id: f.id, name: f.name, title: f.title, image: f.image, avatar: f.avatar, level: f.level, hp: Math.max(0, Math.round(f.hp)), maxHp: Math.round(f.maxHp), shield: Math.round(f.status.shield || 0), buffs: { ...f.buffs }, st: STAT.filter(k => (f.status[k] || 0) > 0 && ABN[k]).map(k => ABN[k].icon + ABN[k].name),
    sk: f.skills.map(s => ({ n: s.name, t: s.type, pp: s.pp, mx: s.maxPP, pw: s.power, d: s.desc, u: !!s.ultimate, l: s.locked ? 1 : 0 })) }; }
  async function hostStart() {
    if (busyWrite) return; busyWrite = true;
    try { sim = mkSim(mkFighter(room.hPick), mkFighter(room.gPick));
      await ref().update({ status: 'battle', turn: 1, deadline: Date.now() + LIVE_CFG.turnSec * 1000, acts: {}, state: { h: view(sim.h), g: view(sim.g) }, sim: pack(), ev: [`即時對戰開始：${sim.h.name} 對上 ${sim.g.name}`] });
    } finally { busyWrite = false; }
  }
  async function hostTurn(force) {
    if (busyWrite || !room || room.status !== 'battle') return; restore(); if (!sim) return;
    const A = room.acts || {}, t = room.turn, ah = A.h && A.h.t === t ? A.h.i : null, ag = A.g && A.g.t === t ? A.g.i : null;
    if (!force && (ah == null || ag == null)) return;
    busyWrite = true;
    try { const r = resolve(ah == null ? autoIdx(sim.h) : ah, ag == null ? autoIdx(sim.g) : ag), auto = [ah == null ? `${room.hostName} 超時，自動出招` : null, ag == null ? `${room.guestName} 超時，自動出招` : null].filter(Boolean);
      const up = { turn: t + 1, deadline: Date.now() + LIVE_CFG.turnSec * 1000, acts: {}, state: { h: view(sim.h), g: view(sim.g) }, sim: pack(), ev: [...auto, ...r.ev] };
      if (r.winner) { up.status = 'done'; up.winner = r.winner; up.endedAt = Date.now(); }
      await ref().update(up);
      if (r.winner) record(r.winner, t);
    } catch (e) { msg(CLOUD.errText(e)); } finally { busyWrite = false; }
  }
  function record(winner, rounds, reason) { if (winner === 'draw') return; F().db.collection('duels').add({ attacker: room.host, defender: room.guest, attackerName: room.hostName, defenderName: room.guestName, win: winner === 'h', rounds, mode: 'live', reason: reason || '', at: Date.now() }).catch(() => { }); }

  /* ---------- 雙方：送出招式、選角、投降 ---------- */
  async function send(i) { if (!room || room.status !== 'battle') return; const A = room.acts || {}; if (A[role] && A[role].t === room.turn) return; try { await ref().update({ ['acts.' + role]: { t: room.turn, i } }); } catch (e) { msg(CLOUD.errText(e)); } }
  async function pick(id) { const sk = ((SAVE.data.skins || {}).equip || {})[id] || null; try { await ref().update({ [role + 'Pick']: { id, lv: crewLv(id), skin: sk, name: CHARACTERS[id].name } }); } catch (e) { msg(CLOUD.errText(e)); } }
  async function surrender() { const go = async () => { try { const w = other(role); await ref().update({ status: 'done', winner: w, reason: 'surrender', endedAt: Date.now() }); if (role === 'h') record(w, room.turn, 'surrender'); } catch (e) { } }; if (typeof confirmBox === 'function') confirmBox('投降？', '這場即時對戰會算你落敗。', '投降', go); else go(); }
  async function cancel() { try { await ref().update({ status: 'cancelled' }); } catch (e) { } leave(); }

  /* ---------- 房間狀態變化 ---------- */
  function onRoom() {
    if (!room) { msg('房間已不存在'); return; }
    if (role === 'h' && room.status === 'pick' && room.hPick && room.gPick) hostStart();
    if (role === 'h' && room.status === 'battle') { restore(); const A = room.acts || {}; if (A.h && A.g && A.h.t === room.turn && A.g.t === room.turn) hostTurn(false); }
    if (role === 'g' && room.status === 'done' && room.reason === 'surrender' && room.winner === 'g') { /* 對手投降 */ }
    render();
  }
  function onTick() {
    if (!room) return; const now = Date.now();
    if (room.status === 'invite' && role === 'h' && now - room.at > LIVE_CFG.inviteSec * 1000) { cancel(); toast('對方沒有回應，邀請已取消'); return; }
    if (room.status === 'battle' && role === 'h' && now > room.deadline) hostTurn(true);
    const t = el && el.querySelector('.lv-timer'); if (t && room.status === 'battle') { const s = Math.max(0, Math.ceil((room.deadline - now) / 1000)); t.textContent = s; t.classList.toggle('hurry', s <= 5); }
    const lost = el && el.querySelector('.lv-lost'); if (lost) lost.hidden = !(role === 'g' && room.status === 'battle' && now > room.deadline + LIVE_CFG.hostLostSec * 1000);
  }

  /* ---------- 畫面 ---------- */
  function open() { if (!el) { el = document.createElement('div'); el.className = 'lv-screen'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '即時對戰'); } document.body.appendChild(el); render(); }
  function close() { if (el) el.remove(); }
  function msg(m) { if (!el) return; const p = el.querySelector('.lv-msg'); if (p) p.textContent = m; else toast(m); }
  const bar = f => `<div class="lv-hp"><i style="width:${f.maxHp ? f.hp / f.maxHp * 100 : 0}%"></i>${f.shield ? `<em style="width:${Math.min(100, f.shield / f.maxHp * 100)}%"></em>` : ''}</div><small>${f.hp.toLocaleString()} / ${f.maxHp.toLocaleString()}${f.shield ? `・🛡️${f.shield.toLocaleString()}` : ''}</small>`;
  const buffs = f => ['atk', 'def', 'spd'].filter(k => f.buffs[k]).map(k => `<i class="${f.buffs[k] > 0 ? 'up' : 'dn'}">${{ atk: '攻', def: '防', spd: '速' }[k]}${f.buffs[k] > 0 ? '+' : ''}${f.buffs[k]}</i>`).join('') + f.st.map(s => `<i class="st">${s}</i>`).join('');
  function fighter(f, side, name) { return `<div class="lv-f ${side}"><img class="lv-art" src="${f.image}" alt=""><div class="lv-plate"><b>${esc3(f.name)}<small>LV ${f.level}・${esc3(name || '')}</small></b>${bar(f)}<div class="lv-buffs">${buffs(f)}</div></div></div>`; }
  function render() {
    if (!el || !el.isConnected) return; const R = room, me = role, op = other(role || 'h');
    const myN = R ? (me === 'h' ? R.hostName : R.guestName) : '', opN = R ? (me === 'h' ? R.guestName : R.hostName) : '';
    let body = '';
    if (!R) body = `<p class="lv-center">連線中…</p>`;
    else if (R.status === 'invite') body = me === 'h' ? `<div class="lv-center"><p>已邀請 <b>${esc3(R.guestName)}</b> 進行即時對戰</p><p class="lv-sub">等待對方接受…（${LIVE_CFG.inviteSec / 60} 分鐘內沒有回應會自動取消）</p><button class="btn-ghost" data-a="cancel">取消邀請</button></div>` : `<p class="lv-center">等待中…</p>`;
    else if (R.status === 'declined' || R.status === 'cancelled') body = `<div class="lv-center"><p>${R.status === 'declined' ? '對方婉拒了邀請' : '邀請已取消'}</p><button class="btn-gold" data-a="leave">離開</button></div>`;
    else if (R.status === 'pick') { const mine = R[me + 'Pick'], his = R[op + 'Pick'];
      body = mine ? `<div class="lv-center"><p>你選擇了 <b>${esc3(mine.name)}</b>（LV ${mine.lv}）</p><p class="lv-sub">${his ? '雙方都選好了，準備開戰…' : `等待 ${esc3(opN)} 選擇船員…`}</p></div>`
        : `<div class="lv-pick"><h3>選擇出戰的船員</h3><p class="lv-sub">1 對 1 對決，每回合 ${LIVE_CFG.turnSec} 秒內出招，雙方同時出手（速度快的先動）。即時對戰沒有獎勵。</p><div class="lv-grid">${CHARACTER_ORDER.filter(id => typeof owned === 'function' && owned(id)).map(id => `<button data-pick="${id}" class="${picking === id ? 'on' : ''}"><img src="${charArt(id, 'avatar')}" alt=""><em>LV ${crewLv(id)}</em><span>${CHARACTERS[id].name}</span></button>`).join('')}</div><button class="btn-gold big" data-a="pick" ${picking ? '' : 'disabled'}>確定出戰</button></div>`; }
    else if (R.status === 'battle' || R.status === 'done') { const S = R.state || {}, mf = S[me], of = S[op]; if (!mf || !of) body = '<p class="lv-center">準備中…</p>'; else {
      const sent = R.acts && R.acts[me] && R.acts[me].t === R.turn, done = R.status === 'done', W = R.winner;
      body = `<div class="lv-arena" style="background-image:url('${LIVE_CFG.bg}')">${fighter(of, 'op', opN)}${fighter(mf, 'me', myN)}<div class="lv-round">${done ? '結束' : `第 ${R.turn} 回合`}${done ? '' : `<b class="lv-timer">${LIVE_CFG.turnSec}</b>`}</div></div>
        <ol class="lv-log">${(R.ev || []).slice(-8).map(t => `<li>${esc3(t)}</li>`).join('')}</ol>
        ${done ? `<div class="lv-result ${W === me ? 'win' : W === 'draw' ? '' : 'lose'}"><b>${W === me ? '勝利！' : W === 'draw' ? '平手' : '落敗'}</b><small>${R.reason === 'surrender' ? (W === me ? '對手投降了' : '你投降了') : `共 ${R.turn - 1} 回合`}</small><button class="btn-gold" data-a="leave">離開</button></div>`
        : `<div class="lv-skills ${sent ? 'sent' : ''}">${mf.sk.map((s, i) => `<button data-sk="${i}" ${sent || s.l || s.pp <= 0 ? 'disabled' : ''} class="${s.u ? 'ult' : ''}" title="${esc3(s.d || '')}"><b>${esc3(s.n)}</b><small>${s.l ? '未解鎖' : `${s.t === 'attack' ? `威力 ${s.pw}` : '輔助'}・${s.pp}/${s.mx}`}</small></button>`).join('')}${mf.sk.every(s => s.l || s.pp <= 0) ? `<button data-sk="-1" ${sent ? 'disabled' : ''}><b>奮力一擊</b><small>技能用完時</small></button>` : ''}</div>
          <p class="lv-wait">${sent ? `已出招，等待 ${esc3(opN)}…` : '選擇這回合要使用的招式'}</p><p class="lv-lost" hidden>對手好像斷線了。<button class="btn-ghost sm" data-a="leave">離開（不計結果）</button></p>
          <div class="lv-foot"><button class="btn-ghost sm" data-a="surrender">投降</button></div>`}`; } }
    el.innerHTML = `<div class="lv-wrap"><header class="lv-head"><b>⚔️ 即時對戰</b><span>${R ? `${esc3(myN)} vs ${esc3(opN)}` : ''}</span><button class="icon-btn sm" data-a="hide" aria-label="收起">×</button></header><div class="lv-body">${body}</div><p class="lv-msg"></p></div>`;
    const on = (s, f) => el.querySelectorAll(s).forEach(b => b.onclick = () => f(b));
    on('[data-a=cancel]', cancel); on('[data-a=leave]', leave); on('[data-a=surrender]', surrender);
    on('[data-a=hide]', () => { if (R && ['battle', 'pick', 'invite'].includes(R.status)) { close(); toast('即時對戰仍在進行中，可從「好友 → 邀請」回到戰場'); } else leave(); });
    on('[data-pick]', b => { picking = b.dataset.pick; render(); }); on('[data-a=pick]', () => picking && pick(picking));
    on('[data-sk]', b => send(+b.dataset.sk)); onTick();
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
    if (rid) return; const p = document.createElement('div'); p.className = 'lv-pop'; p.innerHTML = `<b>⚔️ ${esc3(x.hostName)} 邀請你即時對戰！</b><span><button class="btn-gold sm">接受</button><button class="btn-ghost sm">婉拒</button></span>`;
    document.body.appendChild(p); const [a, d] = p.querySelectorAll('button'); a.onclick = () => { p.remove(); accept(x.id); }; d.onclick = () => { p.remove(); decline(x.id); }; setTimeout(() => p.remove(), 30000);
  }
  function notify() { if (typeof window.socialRefreshDot === 'function') window.socialRefreshDot(); }
  window.addEventListener('DOMContentLoaded', () => { if (typeof CLOUD === 'undefined') return; CLOUD.onUser(u => { if (!u) { if (invUnsub) invUnsub(); invUnsub = null; invites = []; notify(); } else listen(); }); });
  return { invite, accept, decline, open, invites: () => invites, active: () => !!(rid && room && ['invite', 'pick', 'battle'].includes(room.status)), _sim: () => sim, _room: () => room };
})();
