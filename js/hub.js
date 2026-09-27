/* 懸賞處：懸賞召喚、懸賞任務、道具商店、海軍本部（販賣角色） */
const CHAR_RARITY = { lucci: 'SSR', hody: 'SR', luffy0: 'R', kaido: 'SSR', luffy: 'SSR', zoro: 'R', sanji: 'R', robin: 'SR', shirahoshi: 'SR', crocodile: 'SR', enel: 'SR', yamato: 'SSR', blackbeard: 'SSR', loki: 'SSR' };
const SELL_VALUE = { berry: { R: 2000, SR: 6000, SSR: 15000, perLv: 120 }, exp: { R: 1500, SR: 4500, SSR: 12000, perLv: 80 } };
const BOUNTY_POOL = [
  { id: 'win3', text: '擊敗 3 名敵人', stat: 'wins', goal: 3, berry: 1500 },
  { id: 'win6', text: '擊敗 6 名敵人', stat: 'wins', goal: 6, berry: 3200, tokens: 1 },
  { id: 'boss1', text: '擊敗 1 名篇章 BOSS', stat: 'bossWins', goal: 1, berry: 4000, tokens: 1 },
  { id: 'step3', text: '推進 3 個劇情任務', stat: 'steps', goal: 3, berry: 2000 },
  { id: 'pick3', text: '撿拾 3 個任務道具', stat: 'pickups', goal: 3, berry: 1200 },
  { id: 'skill15', text: '在戰鬥中使用 15 次技能', stat: 'skills', goal: 15, berry: 1500 },
  { id: 'ult2', text: '在戰鬥中發動 2 次奧義', stat: 'ults', goal: 2, berry: 2500 },
  { id: 'item2', text: '在戰鬥中使用 2 次道具', stat: 'items', goal: 2, berry: 1000 },
  { id: 'switch2', text: '在戰鬥中換人 2 次', stat: 'switches', goal: 2, berry: 1200 }
];
const TOKEN_PRICE = 2500;

/* 統計：各種行為的累計次數，懸賞任務依此計算進度 */
function track(key, n) { const d = SAVE.data; d.stats = d.stats || {}; d.stats[key] = (d.stats[key] || 0) + (n || 1); SAVE.save(); }
function statOf(key) { return (SAVE.data.stats || {})[key] || 0; }
function bounties() {
  const d = SAVE.data, day = today();
  if (!d.bounty || d.bounty.date !== day) {
    const pool = BOUNTY_POOL.slice(); for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[pool[i], pool[j]] = [pool[j], pool[i]]; }
    d.bounty = { date: day, list: pool.slice(0, 4).map(b => ({ id: b.id, base: statOf(b.stat), claimed: false })) }; SAVE.save();
  }
  return d.bounty.list.map(x => { const def = BOUNTY_POOL.find(b => b.id === x.id); return { ...def, ...x, prog: Math.min(def.goal, statOf(def.stat) - x.base) }; });
}

let hubTab = 'summon';
function openHub(tab) { if (currentScreen !== 'gachaScreen') openGacha(); switchHub(tab || hubTab); }
function switchHub(tab) {
  hubTab = tab;
  document.querySelectorAll('#hubTabs button').forEach(b => { b.classList.toggle('on', b.dataset.hub === tab); b.setAttribute('aria-selected', String(b.dataset.hub === tab)); });
  document.querySelectorAll('#gachaScreen [data-pane]').forEach(p => p.classList.toggle('hidden', p.dataset.pane !== tab));
  if (tab === 'bounty') renderBounty(); if (tab === 'shop') renderShop(); if (tab === 'navy') renderNavy();
  coins();
}
function renderBounty() {
  const list = bounties();
  $('bountyList').innerHTML = list.map(b => { const done = b.prog >= b.goal; return `<article class="bounty ${b.claimed ? 'claimed' : done ? 'done' : ''}">
    <div class="bt-poster"><span>WANTED</span><b>${b.claimed ? '已領取' : done ? '可領取' : `${b.prog}/${b.goal}`}</b></div>
    <div class="bt-body"><h4>${b.text}</h4><div class="bar"><i style="width:${b.prog / b.goal * 100}%"></i></div>
      <p class="bt-rew"><i class="berry-ico">B</i>${b.berry.toLocaleString()}${b.tokens ? ` ＋ <i class="coin-ico"></i>×${b.tokens}` : ''}</p></div>
    <button class="btn-gold" data-claim="${b.id}" ${done && !b.claimed ? '' : 'disabled'}>${b.claimed ? '已領取' : '領取賞金'}</button></article>`; }).join('');
  $('bountyList').querySelectorAll('[data-claim]').forEach(btn => btn.onclick = () => {
    const x = SAVE.data.bounty.list.find(y => y.id === btn.dataset.claim), def = BOUNTY_POOL.find(b => b.id === x.id); if (x.claimed) return;
    x.claimed = true; SAVE.save(); addBerry(def.berry); if (def.tokens) addTokens(def.tokens, '懸賞任務'); SFX.play('coin'); toast(`領到賞金 ${def.berry.toLocaleString()} 貝里`, 'gold'); renderBounty();
  });
  $('bountyNote').textContent = `每天更換 4 張懸賞單，今天剩下 ${list.filter(b => !b.claimed).length} 張。`;
}
function renderShop() {
  const B = SAVE.data.berry || 0;
  $('shopList').innerHTML = `<div class="bagItem r-SR"><span class="ico token-ico"><i class="coin-ico"></i></span><span class="bi-name">寶藏幣<small>用於懸賞召喚。貝里兌換寶藏幣。</small></span><span class="price"><i class="berry-ico">B</i>${TOKEN_PRICE.toLocaleString()}</span><button class="btn-gold sm" data-token ${B < TOKEN_PRICE ? 'disabled' : ''}>兌換</button><b>×${SAVE.data.tokens}</b></div>` +
    SHOP.map(x => { const it = ITEMS[x.id]; if (!it) return ''; return `<div class="bagItem r-${it.rarity}">${itemIcon(it)}<span class="bi-name">${it.name}<small>${it.desc}</small></span><span class="price"><i class="berry-ico">B</i>${x.price.toLocaleString()}</span><button class="btn-gold sm" data-buy="${x.id}" ${B < x.price ? 'disabled' : ''}>購買</button><b>×${SAVE.data.inventory[x.id] || 0}</b></div>`; }).join('');
  $('shopList').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { const x = SHOP.find(y => y.id === b.dataset.buy); if ((SAVE.data.berry || 0) < x.price) return; SAVE.data.berry -= x.price; SAVE.data.inventory[x.id] = (SAVE.data.inventory[x.id] || 0) + 1; SAVE.save(); coins(); SFX.play('coin'); toast(`買了${ITEMS[x.id].name}`); renderShop(); });
  const tk = $('shopList').querySelector('[data-token]'); if (tk) tk.onclick = () => { if ((SAVE.data.berry || 0) < TOKEN_PRICE) return; SAVE.data.berry -= TOKEN_PRICE; SAVE.save(); addTokens(1, '貝里兌換'); renderShop(); };
}
function openShop() { openHub('shop'); }

/* ---------- 海軍本部：販賣角色 ---------- */
let navyPick = null, navyMode = 'berry', navyTarget = null;
function sellValue(id, mode) { const r = CHAR_RARITY[id] || 'R', lv = crewLv(id), V = SELL_VALUE[mode]; return V[r] + lv * V.perLv; }
function renderNavy() {
  const ids = CHARACTER_ORDER.filter(owned);
  if (!ids.includes(navyPick)) navyPick = ids.find(id => !inLineup(id)) || ids[0];
  $('navyList').innerHTML = ids.map(id => { const c = CHARACTERS[id], r = CHAR_RARITY[id] || 'R'; return `<button class="char ${id === navyPick ? 'on' : ''}" data-id="${id}"><img src="${c.image}" alt="" loading="lazy"><span class="c-lv" style="--c:${TIERS[tierOf(crewLv(id))].color}">LV ${crewLv(id)}</span><span class="rar c-rar r-${r}">${r}</span>${inLineup(id) ? '<span class="c-tags"><span class="c-team">陣容中</span></span>' : ''}<span class="c-name">${c.name}</span></button>`; }).join('');
  $('navyList').querySelectorAll('.char').forEach(b => b.onclick = () => { navyPick = b.dataset.id; renderNavy(); });
  const id = navyPick, c = CHARACTERS[id]; if (!id) { $('navyDetail').innerHTML = ''; return; }
  const targets = ids.filter(x => x !== id && crewLv(x) < MAX_LV); if (!targets.includes(navyTarget)) navyTarget = targets[0] || null;
  const onlyOne = ids.length <= 1, lastInLineup = inLineup(id) && SAVE.data.lineup.length <= 1;
  const reason = onlyOne ? '這是你唯一的船員，不能販賣。' : lastInLineup ? '陣容至少要留一位船員。請先把其他船員加入陣容。' : '';
  $('navyDetail').innerHTML = `<img src="${c.avatar}" alt=""><div class="nv-main">
    <h3>${c.name}<small>LV ${crewLv(id)}・稀有度 ${CHAR_RARITY[id] || 'R'}</small></h3>
    <p class="nv-warn">販賣後船員會離開船隊，<b>無法反悔</b>。之後只能再從懸賞召喚或擊敗 BOSS 取得。</p>
    <div class="nv-opts" role="radiogroup" aria-label="換取的獎勵">
      <label class="${navyMode === 'berry' ? 'on' : ''}"><input type="radio" name="nvm" value="berry" ${navyMode === 'berry' ? 'checked' : ''}><b><i class="berry-ico">B</i>${sellValue(id, 'berry').toLocaleString()}</b><small>換成貝里</small></label>
      <label class="${navyMode === 'exp' ? 'on' : ''} ${targets.length ? '' : 'off'}"><input type="radio" name="nvm" value="exp" ${navyMode === 'exp' ? 'checked' : ''} ${targets.length ? '' : 'disabled'}><b>經驗 ${sellValue(id, 'exp').toLocaleString()}</b><small>傳承給另一位船員</small></label>
    </div>
    ${navyMode === 'exp' && targets.length ? `<label class="af"><span>把經驗交給</span><select id="nvTarget">${targets.map(x => `<option value="${x}" ${x === navyTarget ? 'selected' : ''}>${CHARACTERS[x].name}（LV ${crewLv(x)}）</option>`).join('')}</select></label>` : ''}
    ${reason ? `<p class="nv-block">${reason}</p>` : ''}
    <button class="btn-primary big" id="nvSell" ${reason ? 'disabled' : ''}>交給海軍本部</button>
  </div>`;
  $('navyDetail').querySelectorAll('input[name=nvm]').forEach(r => r.onchange = () => { navyMode = r.value; renderNavy(); });
  const tg = $('nvTarget'); if (tg) tg.onchange = () => { navyTarget = tg.value; };
  const sb = $('nvSell'); if (sb) sb.onclick = () => {
    const val = sellValue(id, navyMode), what = navyMode === 'berry' ? `${val.toLocaleString()} 貝里` : `${val.toLocaleString()} 經驗（給 ${CHARACTERS[navyTarget].name}）`;
    confirmBox(`販賣 ${c.name}？`, `你會得到 ${what}。這個動作無法復原，${c.name} 會永遠離開船隊。`, '確定販賣', () => sellChar(id, navyMode, navyTarget));
  };
}
function sellChar(id, mode, target) {
  const val = sellValue(id, mode), name = CHARACTERS[id].name;
  if (inLineup(id)) { if (!lineupRemove(id)) return; }
  delete SAVE.data.roster[id]; SAVE.save();
  if (mode === 'berry') addBerry(val); else gainExp(target, val, false, true);
  SFX.play('coin'); toast(`${name} 已交給海軍本部`, 'gold'); navyPick = null; renderNavy();
}

function bindHub() {
  document.querySelectorAll('#hubTabs button').forEach(b => b.onclick = () => switchHub(b.dataset.hub));
  const nb = $('navyBtnMap'); if (nb) nb.onclick = () => openHub('navy');
  ['shopBtnMap', 'shopBtnGacha'].forEach(i => { const b = $(i); if (b) b.onclick = () => openHub('shop'); });
}
window.addEventListener('DOMContentLoaded', bindHub);
