/* 主線「拉夫德魯之路」：寶藏日誌、最終之島三連戰與結局 */
function openTreasure() {
  const found = treasureFoundAll(), T = TREASURE, all = found.length >= T.pieces.length, done = SAVE.data.treasure && SAVE.data.treasure.done;
  $('trIntro').textContent = T.intro;
  $('trProg').innerHTML = `<div class="bar"><i style="width:${found.length / T.pieces.length * 100}%"></i></div><span>${found.length}/${T.pieces.length} 塊歷史本文</span>`;
  $('trList').innerHTML = T.pieces.map((p, i) => { const ch = CHAPTERS.find(c => c.id === p.chapter), got = found.includes(p.chapter), cleared = SAVE.data.chapters[p.chapter].cleared;
    return `<li class="${got ? 'got' : ''}"><span class="tr-no">${i + 1}</span><div><b>${got ? p.name : '？？？的歷史本文'}</b><small>${ch.name}・${got ? '已找到' : cleared ? p.hint + '（在這裡解讀石碑）' : `先完成「${ch.name}」才能尋找`}</small></div>${got ? '<i class="tr-ok">✓</i>' : cleared ? `<button class="btn-gold sm" data-decode="${p.chapter}">解讀石碑</button>` : ''}</li>`; }).join('');
  $('trList').querySelectorAll('[data-go]').forEach(b => b.onclick = () => { closeModal('treasureModal'); enterChapter(b.dataset.go); });
  $('trList').querySelectorAll('[data-decode]').forEach(b => b.onclick = () => decodeStone(b.dataset.decode));
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

/* ===== 解讀石碑：記住古代文字亮起的順序，再依序點出來 ===== */
const GLYPHS = [
  '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/>',
  '<path d="M12 4 20 19H4z"/>', '<rect x="5" y="5" width="14" height="14" rx="1.5"/><path d="M5 12h14"/>',
  '<path d="M12 3 20 12 12 21 4 12z"/>', '<path d="M12 3.5l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.8l6-.7z"/>',
  '<path d="M12 4v16M4 12h16M6.5 6.5l11 11"/>', '<path d="M3 9c3-4 6 4 9 0s6 4 9 0M3 16c3-4 6 4 9 0s6 4 9 0"/>',
  '<path d="M12 12c0-1.5 1.8-1.8 2.4-.6.9 1.8-1 3.8-3.2 3.3-3-.7-3.4-4.8-1-6.6 3.2-2.4 7.9-.4 8.4 3.6.6 4.6-3.8 8-8.4 7"/>'
];
const glyph = i => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPHS[i]}</svg>`;
function decodeStone(chId) {
  const T = TREASURE, idx = T.pieces.findIndex(p => p.chapter === chId), p = T.pieces[idx]; if (!p || treasureFoundAll().includes(chId)) return;
  const len = 4 + Math.floor(idx / 2), seq = Array.from({ length: len }, () => Math.floor(Math.random() * GLYPHS.length));
  let input = [], busy = true, tries = 0;
  const box = document.createElement('div'); box.className = 'tr-puzzle'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', '解讀石碑');
  box.innerHTML = `<div class="trp-card"><header><h3>解讀石碑・${p.name}</h3><button class="icon-btn sm" data-x aria-label="關閉">×</button></header>
    <p class="trp-tip">石碑上的古代文字會依序亮起 ${len} 個。記住順序，再依序點出來。</p>
    <div class="trp-stone" id="trpStone">${seq.map(() => '<i class="trp-slot"></i>').join('')}</div>
    <div class="trp-pad">${GLYPHS.map((_, i) => `<button class="trp-g" data-g="${i}" aria-label="古代文字 ${i + 1}">${glyph(i)}</button>`).join('')}</div>
    <p class="trp-msg" id="trpMsg">仔細看……</p><button class="btn-ghost sm" id="trpReplay">再看一次</button></div>`;
  $('treasureModal').appendChild(box); if (window.fixIcons) fixIcons(box);
  const slots = box.querySelectorAll('.trp-slot'), pads = box.querySelectorAll('.trp-g'), msg = box.querySelector('#trpMsg'), wait = ms => new Promise(r => setTimeout(r, ms));
  async function show() {
    busy = true; input = []; slots.forEach(s => { s.innerHTML = ''; s.className = 'trp-slot'; }); msg.textContent = '仔細看……';
    await wait(500);
    for (let k = 0; k < seq.length; k++) { const g = pads[seq[k]]; g.classList.add('lit'); slots[k].innerHTML = glyph(seq[k]); slots[k].classList.add('shown'); SFX.play('pickup'); await wait(650); g.classList.remove('lit'); await wait(180); }
    await wait(350); slots.forEach(s => { s.innerHTML = ''; s.classList.remove('shown'); }); msg.textContent = '輪到你了：依序點出剛才的古代文字。'; busy = false;
  }
  pads.forEach(b => b.onclick = async () => {
    if (busy) return; const g = +b.dataset.g, k = input.length; b.classList.add('tap'); setTimeout(() => b.classList.remove('tap'), 180);
    if (g !== seq[k]) { busy = true; tries++; SFX.play('miss'); slots[k].classList.add('bad'); msg.textContent = '文字對不上……石碑又模糊了，再看一次。'; await wait(900); show(); return; }
    input.push(g); slots[k].innerHTML = glyph(g); slots[k].classList.add('ok');
    if (input.length === seq.length) {
      busy = true; SFX.play('rare'); msg.textContent = '解讀成功！'; await wait(700); box.remove();
      treasureFoundAll().push(chId); SAVE.save(); addTokens(3, '歷史本文'); addBerry(3000);
      const lines = (p.lines || []).map(l => (l[0] === '@robin' ? '羅賓：「' + l[1] + '」' : l[1]));
      const n = treasureFoundAll().length, all = n >= T.pieces.length;
      storyCard(p.name, [...lines, `獲得寶藏幣 ×3、貝里 3,000。主線進度：${n}/${T.pieces.length}${all ? '。所有歷史本文都解讀完成了！' : ''}`], '收下', () => openTreasure());
    }
  });
  box.querySelector('#trpReplay').onclick = () => { if (!busy) show(); };
  box.querySelector('[data-x]').onclick = () => box.remove();
  show();
}
