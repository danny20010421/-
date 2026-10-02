// 資料一致性檢查（不需瀏覽器）：node tests/check-data.mjs
import fs from 'fs'; import vm from 'vm'; import { execSync } from 'child_process';
const root = new URL('..', import.meta.url).pathname, rd = f => fs.readFileSync(root + f, 'utf8');
const errs = [], warn = [];
for (const f of fs.readdirSync(root + 'js')) if (f.endsWith('.js')) { try { execSync(`node --check "${root}js/${f}"`, { stdio: 'pipe' }); } catch (e) { errs.push(`語法錯誤 js/${f}: ${e.stderr}`); } }
const ctx = { window: {}, console }; vm.createContext(ctx);
vm.runInContext(rd('js/data.js').replace(/^const /gm, 'var '), ctx);
vm.runInContext(rd('js/data_ext.js'), ctx);
const { CHARACTERS: C, CHARACTER_ORDER: O, CHAR_OBTAIN: OB, CHAPTERS: CH, TREASURE: T, COLLECTION_SETS: S, EVENT_POOLS: EP, ITEMS: IT, LOGIN_REWARDS: LR } = ctx;
const exists = u => fs.existsSync(root + String(u).split('?')[0]);
const hub = rd('js/hub.js'), battle = rd('js/battle_core.js') + rd('js/battle.js') + rd('js/ext_effects.js');
const nos = {};
for (const id of O) {
  const c = C[id]; if (!c) { errs.push(`CHARACTER_ORDER 有不存在的角色 ${id}`); continue; }
  if (!exists(c.image)) errs.push(`${id} 立繪不存在 ${c.image}`); if (!exists(c.avatar)) errs.push(`${id} 頭像不存在 ${c.avatar}`);
  if (!new RegExp(`\\b${id}: *'(N|R|SR|SSR|UR|UR\\+)'`).test(hub)) errs.push(`${id} 沒有稀有度（js/hub.js CHAR_RARITY）`);
  (nos[c.no] = nos[c.no] || []).push(id);
  c.skills.forEach((s, i) => { const keys = Object.keys(s.effect || {}); (s.effect && s.effect.variants || []).forEach(v => keys.push(...Object.keys(v.effect || {})));
    keys.forEach(k => { const base = k.replace(/(Chance|Turns)$/, ''); if (!battle.includes(k) && !/^(fear|fatigue|paralyze|armorBreak|burn|freeze|weak|petrify)$/.test(base)) warn.push(`${id} 第 ${i + 1} 招的效果 ${k} 在戰鬥程式中找不到`); });
    ['formImage', 'phoenixForm'].forEach(k => { const im = s.effect && s.effect[k] && s.effect[k].image; if (im && !exists(im)) errs.push(`${id} 變身圖不存在 ${im}`); }); });
}
Object.entries(nos).forEach(([n, a]) => { if (a.length > 1) errs.push(`編號重複 No.${n}: ${a}`); });
Object.keys(C).forEach(id => { if (!O.includes(id)) warn.push(`${id} 不在 CHARACTER_ORDER`); });
CH.forEach(c => { if (!exists(c.art)) errs.push(`篇章插圖不存在 ${c.id}`); if (!C[c.boss]) errs.push(`篇章 ${c.id} 的 BOSS ${c.boss} 不存在`); c.steps.forEach(s => { ['npc', 'enemy', 'joins'].forEach(k => { if (s[k] && k !== 'npc' && !C[s[k]]) errs.push(`篇章 ${c.id} 任務 ${s.title} 的 ${k}=${s[k]} 不存在`); if (k === 'npc' && s.npc && !c.npcs.some(n => n.id === s.npc)) errs.push(`篇章 ${c.id} 任務 ${s.title} 的 NPC ${s.npc} 不存在`); }); }); });
T.pieces.forEach(p => { if (!CH.some(c => c.id === p.chapter)) errs.push(`歷史本文的篇章 ${p.chapter} 不存在`); });
S.forEach(s => s.members.forEach(m => { if (!C[m]) errs.push(`羈絆 ${s.name} 的成員 ${m} 不存在`); }));
EP.forEach(p => { if (!exists(p.banner)) errs.push(`活動橫幅不存在 ${p.id}`); p.shards.forEach(x => { if (!C[x.char]) errs.push(`活動池 ${p.id} 的角色 ${x.char} 不存在`); if (!exists(x.icon)) errs.push(`碎片圖不存在 ${x.icon}`); }); });
LR.forEach(r => Object.keys(r.items || {}).forEach(k => { if (!IT[k]) errs.push(`七日登入的道具 ${k} 不存在`); }));
Object.entries(OB).forEach(([id, o]) => { (o.needs || []).forEach(n => { if (!C[n]) errs.push(`${id} 的組合條件角色 ${n} 不存在`); }); if (!C[id]) errs.push(`CHAR_OBTAIN 有不存在的角色 ${id}`); if (o.reward && !String(o.reward).startsWith('_') && !CH.some(c => c.id === o.reward)) errs.push(`${id} 的獎勵篇章 ${o.reward} 不存在`); });
const html = rd('index.html'); for (const m of html.matchAll(/(?:src|href)="((?:js|css|assets)\/[^"?]+)/g)) if (!exists(m[1])) errs.push(`index.html 引用的檔案不存在 ${m[1]}`);
warn.forEach(w => console.log('⚠ ' + w)); errs.forEach(e => console.log('✗ ' + e));
console.log(errs.length ? `\n資料檢查失敗：${errs.length} 個錯誤` : `\n資料檢查通過（${O.length} 位角色、${CH.length} 個篇章、${warn.length} 個提醒）`);
process.exit(errs.length ? 1 : 0);
