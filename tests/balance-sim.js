// 平衡模擬：在遊戲頁面執行（page.evaluate），回傳 LV80 一對一循環賽的各角色勝率與稀有度對戰矩陣。
// AI 會挑時機放奧義與回復；雙方都套用稀有度體質（模擬玩家角色互打）。
async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  startBattle({ team: [{ id: 'luffy', lv: 80 }], enemyId: 'crocodile', enemyLv: 80, chapterId: 'east', isBoss: false, revives: 0, onEnd: () => ({ message: '' }), onLeave: () => {} });
  await w(1200);
  const noop = () => {}; ['log','floatText','showDamage','showHeal','triggerImpact','renderHUD','shake','flashScreen'].forEach(k => { try { window[k] = noop; } catch (e) {} });
  try { log = noop; } catch (e) {} try { showDamage = noop; } catch (e) {} try { showHeal = noop; } catch (e) {} try { floatText = noop; } catch (e) {} try { renderHUD = noop; } catch (e) {} try { triggerImpact = noop; } catch (e) {}
  const ids = CHARACTER_ORDER.filter(id => !['marine', 'mayor', 'imu', 'morgans'].includes(id)); const RR = {}; const tw = {};
  const CC = ['skipAttack', 'freeze', 'paralyze', 'fear', 'petrify'];
  function act(A, B, side) {
    for (const k of CC) if (A.status[k] > 0 && k !== 'freeze') { A.status[k]--; return; }
    const av = A.skills.map((s, i) => [s, i]).filter(([s]) => s.pp > 0 && !s.locked);
    if (!av.length) return;
    /* 會挑時機的 AI：對手血量低於 60% 或自己低於 40% 時放奧義；自己血量低時優先回復；其他時候偏好威力高的攻擊 */
    const hpA = A.hp / A.maxHp, hpB = B.hp / B.maxHp, ult = av.find(([s]) => s.ultimate), heal = av.find(([s]) => s.type === 'support' && s.effect && (s.effect.healRatio || s.effect.fullHeal || s.effect.regenTurns));
    let pick = null;
    if (ult && (hpB < .6 || hpA < .4)) pick = ult; else if (heal && hpA < .45 && Math.random() < .7) pick = heal;
    if (!pick) { const atk = av.filter(([s]) => !s.ultimate); const w = atk.map(([s]) => (s.type === 'attack' ? (s.power || 60) : 70) + 20); let r = Math.random() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < atk.length; i++) { r -= w[i]; if (r < 0) { pick = atk[i]; break; } } pick = pick || av[0]; }
    const skill = pick[0]; skill.pp--;
    const sk = JSON.parse(JSON.stringify(skill));
    if (sk.type === 'attack' && B.status.invuln > 0) return;
    if (sk.type === 'attack' && B.status.dodge > 0) { B.status.dodge--; return; }
    const r = computeSkillOutcome(A, B, sk, {});
    if (r.damage > 0) applyDamage(B, r.damage, side === 'L' ? 'R' : 'L', r.meta);
    applySkillEffects(A, B, sk, r);
    if (r.damage > 0 && sk.type === 'attack' && B.status.thornTurns > 0) applyDamage(A, Math.round(r.damage * (B.status.thornRatio || .5)), side);
  }
  function fight(a, b) {
    const A = applyRarityScale(buildFighter(a, 80)), B = applyRarityScale(buildFighter(b, 80)); battle.player = A; battle.enemy = B; battle.team = [A]; battle.isBoss = false; battle.eruption = null;
    for (let round = 0; round < 40; round++) {
      const first = (A.baseSpeed * (1 + A.buffs.spd * .05)) >= (B.baseSpeed * (1 + B.buffs.spd * .05)) ? [A, B] : [B, A];
      for (const f of first) { const o = f === A ? B : A; if (f.hp <= 0 || o.hp <= 0) continue; act(f, o, f === A ? 'L' : 'R');
        [A, B].forEach(x => { if (x.hp <= 0 && x.status.undyingTurns > 0) { x.status.undyingTurns = 0; x.hp = x.maxHp; } }); }
      if (A.hp <= 0 || B.hp <= 0) break;
      endTurnStatus(A); endTurnStatus(B);
      [A, B].forEach(x => { if (x.hp <= 0 && x.status.undyingTurns > 0) { x.status.undyingTurns = 0; x.hp = x.maxHp; } });
      if (A.hp <= 0 || B.hp <= 0) break;
    }
    if (A.hp <= 0 && B.hp > 0) return 0; if (B.hp <= 0 && A.hp > 0) return 1; return A.hp / A.maxHp > B.hp / B.maxHp ? 1 : 0;
  }
  const win = {}, games = {}; ids.forEach(i => { win[i] = 0; games[i] = 0; });
  const N = 12, errs = new Set();
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (let k = 0; k < N; k++) {
    const [a, b] = k % 2 ? [ids[i], ids[j]] : [ids[j], ids[i]];
    try { const r = fight(a, b); const w_ = r ? a : b, l_ = r ? b : a; win[w_]++; const key = CHAR_RARITY[w_] + '>' + CHAR_RARITY[l_]; tw[key] = (tw[key] || 0) + 1; } catch (e) { errs.add(a + '/' + b + ':' + e.message); }
    games[a]++; games[b]++;
  }
  const T = ['R','SR','SSR','UR'], mat = {}; T.forEach(x => T.forEach(y => { const w = tw[x + '>' + y] || 0, l = tw[y + '>' + x] || 0; if (w + l) mat[x + ' vs ' + y] = Math.round(w / (w + l) * 100); }));
  return { mat, rate: ids.map(i => [i, Math.round(win[i] / games[i] * 100)]).sort((x, y) => y[1] - x[1]), errs: [...errs].slice(0, 5) };
}
