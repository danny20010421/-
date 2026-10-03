/* 劇情台詞統計：在瀏覽器載入遊戲後執行，回傳 JSON（總句數、旁白、NPC、有立繪的台詞、各說話者句數） */
const ART = window.speakerArt || (id => null);
const st = { total: 0, narr: 0, npc: 0, art: 0, by: {}, byCh: {} };
const add = (ch, l) => { if (!Array.isArray(l) || l.length < 2 || typeof l[1] !== 'string') return; st.total++; st.byCh[ch] = (st.byCh[ch] || 0) + 1; const k = l[0]; if (!k) { st.narr++; return; } st.npc++; const a = ART(k, ch); if (a) st.art++; const e = st.by[k] || (st.by[k] = { n: 0, art: a || '' }); e.n++; };
const walk = (ch, v) => { if (Array.isArray(v)) { if (v.length >= 2 && (typeof v[0] === 'string' || v[0] === null) && typeof v[1] === 'string') add(ch, v); else v.forEach(x => walk(ch, x)); } else if (v && typeof v === 'object') Object.values(v).forEach(x => walk(ch, x)); };
CHAPTERS.forEach(c => { walk(c.id, c.prologue); walk(c.epilogue === undefined ? [] : c.epilogue, []); walk(c.id, c.epilogue); c.steps.forEach(s => walk(c.id, s)); (c.sides || []).forEach(s => walk(c.id, s)); c.npcs.forEach(n => (n.chat || []).forEach(t => add(c.id, Array.isArray(t) ? t : [n.id, t]))); });
return JSON.stringify(st);
