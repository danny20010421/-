/* 主線「拉夫德魯之路」：寶藏日誌、最終之島三連戰與結局 */
function openTreasure() {
  const found = treasureFoundAll(), T = TREASURE, all = found.length >= T.pieces.length, done = SAVE.data.treasure && SAVE.data.treasure.done;
  $('trIntro').textContent = T.intro;
  $('trProg').innerHTML = `<div class="bar"><i style="width:${found.length / T.pieces.length * 100}%"></i></div><span>${found.length}/${T.pieces.length} 塊歷史本文</span>`;
  $('trList').innerHTML = T.pieces.map((p, i) => { const ch = CHAPTERS.find(c => c.id === p.chapter), got = found.includes(p.chapter), cleared = SAVE.data.chapters[p.chapter].cleared;
    return `<li class="${got ? 'got' : ''}"><span class="tr-no">${i + 1}</span><div><b>${got ? p.name : '？？？的歷史本文'}</b><small>${ch.name}・${got ? '已找到' : cleared ? p.hint + '（登島後用探測器尋找）' : `先完成「${ch.name}」才能尋找`}</small></div>${got ? '<i class="tr-ok">✓</i>' : cleared ? `<button class="btn-ghost sm" data-go="${p.chapter}">前往</button>` : ''}</li>`; }).join('');
  $('trList').querySelectorAll('[data-go]').forEach(b => b.onclick = () => { closeModal('treasureModal'); enterChapter(b.dataset.go); });
  $('trFinal').innerHTML = done ? `<p class="tr-done">你已經抵達過拉夫德魯。可以再次挑戰最終之島的三連戰（不再發放首次獎勵）。</p><button class="btn-primary" id="trGo">再次挑戰</button>` : all ? `<p>四塊路標指向的海域已經浮現。最強的對手們正在等你。</p><button class="btn-gold big" id="trGo">前往${T.final.name}</button>` : `<p class="tr-lock">找齊全部歷史本文後，才能前往${T.final.name}。</p>`;
  const go = $('trGo'); if (go) go.onclick = () => { closeModal('treasureModal'); finalPrologue(); };
  openModal('treasureModal');
}
function treasureFoundAll() { SAVE.data.treasure = SAVE.data.treasure || { found: [], done: false }; return SAVE.data.treasure.found; }
function finalPrologue() {
  const F = TREASURE.final;
  storyCard(F.name, F.prologue, '出發', () => finalRush(0, null));
}
function storyCard(title, lines, btn, fn) {
  $('storyTitle').textContent = title; $('storyText').innerHTML = lines.map(l => `<p>${l}</p>`).join('');
  $('storyBtn').textContent = btn; $('storyBtn').onclick = () => { closeModal('storyModal'); fn && fn(); }; openModal('storyModal');
}
function finalRush(i, hp) {
  const F = TREASURE.final, foe = F.rush[i];
  startBattle({ team: SAVE.data.lineup.map(id => ({ id, lv: crewLv(id), hp: hp ? hp[id] : undefined })), enemyId: foe.id, enemyLv: foe.lv, chapterId: 'giant', isBoss: true, revives: 1,
    onEnd: r => {
      if (!r.win) return { message: `最終試煉失敗（第 ${i + 1}/${F.rush.length} 戰）。整頓陣容之後再來挑戰吧。` };
      track('wins'); track('bossWins');
      if (i < F.rush.length - 1) return { message: `最終試煉 ${i + 1}/${F.rush.length} 突破！下一位對手是 <b>${CHARACTERS[F.rush[i + 1].id].name}</b>。體力不會回復。`, next: { label: '迎戰下一位', fn: () => finalRush(i + 1, r.teamHp) } };
      const first = !SAVE.data.treasure.done; SAVE.data.treasure.done = true; SAVE.save();
      if (first) { addTokens(F.reward.tokens, '拉夫德魯'); addBerry(F.reward.berry); SAVE.data.lineup.forEach(id => gainExp(id, 20000, true, true)); }
      finalDone = true;
      return { message: first ? `你抵達了拉夫德魯！<br>寶藏幣 ×${F.reward.tokens}、貝里 ${F.reward.berry.toLocaleString()}、陣容全員經驗 +20000` : '你再次闖過了最終試煉。' };
    },
    onLeave: () => { if (finalDone) { finalDone = false; storyCard(F.name, F.ending, '回到海圖', () => openChart()); } else openChart(); } });
}
let finalDone = false;
window.addEventListener('DOMContentLoaded', () => { const b = $('treasureBtnMap'); if (b) b.onclick = openTreasure; });
