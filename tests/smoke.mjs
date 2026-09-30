// 瀏覽器冒煙測試：node tests/smoke.mjs（需要 playwright）
// 在桌機與手機尺寸開啟遊戲，走過主要畫面，並讓每位角色的每一招都算一次，確認沒有程式錯誤或缺檔。
import http from 'http'; import fs from 'fs'; import path from 'path'; import { chromium } from 'playwright';
const root = path.resolve(new URL('..', import.meta.url).pathname), PORT = 8799;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }).listen(PORT);
const fails = [];
const browser = await chromium.launch();
for (const [label, vp, mobile] of [['桌機', { width: 1280, height: 800 }, false], ['手機', { width: 390, height: 844 }, true]]) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile }), pg = await ctx.newPage();
  pg.on('pageerror', e => { if (!/setProgress/.test(e.message)) fails.push(`[${label}] 程式錯誤：${e.message}`); });
  pg.on('response', r => { if (r.status() >= 400 && r.url().includes('127.0.0.1') && !r.url().includes('/assets/music/')) fails.push(`[${label}] 缺檔 ${r.status()}：${r.url()}`); });
  await pg.goto(`http://127.0.0.1:${PORT}/index.html`); await pg.waitForTimeout(3000);
  await pg.evaluate(() => { const b = document.getElementById('ldEnter'); if (b) b.click(); });
  await pg.waitForTimeout(800); await pg.evaluate(() => { const l = document.getElementById('loader'); if (l) l.remove(); });
  const r = await pg.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
    const step = async (name, fn) => { try { await fn(); await w(350); document.querySelectorAll('.modal.show').forEach(m => closeModal(m.id)); document.querySelectorAll('.dl-wrap,.tr-puzzle').forEach(x => x.remove()); } catch (e) { out.push(`${name}：${e.message}`); } };
    GAME_SETTINGS.unlockAll = true; ['luffy', 'zoro', 'sanji'].forEach(id => addCrew(id, 30)); SAVE.data.lineup = ['luffy', 'zoro', 'sanji']; SAVE.save();
    await step('遊戲大廳', () => openModes());
    await step('七日登入', () => openLogin(false));
    await step('懸賞召喚', () => openGacha('modeScreen'));
    await step('限定活動池', () => { openGacha('modeScreen'); const t = document.querySelector('#poolTabs [data-pool^=ev]'); if (t) t.click(); });
    await step('角色背包', () => openCrew('crew')); await step('圖鑑', () => openCrew('codex')); await step('背包', () => openBag());
    await step('寶藏日誌', () => openTreasure()); await step('海圖', () => openChart());
    await step('奪寶大冒險', () => openRunner());
    await step('進入篇章', async () => { enterChapter(CHAPTERS[0].id); await w(1800); });
    await step('戰鬥與全部技能', async () => {
      startBattle({ team: [{ id: 'luffy', lv: 80 }], enemyId: 'crocodile', enemyLv: 60, chapterId: 'east', isBoss: true, revives: 0, onEnd: () => ({ message: '' }), onLeave: () => {} }); await w(1200);
      for (const id of CHARACTER_ORDER) { const f = buildFighter(id, 80); f.status = f.status || {}; for (const s of f.skills) { try { const sk = JSON.parse(JSON.stringify(s)); const E = battle.enemy; E.hp = E.maxHp; const r = computeSkillOutcome(f, E, sk, {}); applySkillEffects(f, E, sk, r); for (let k = 0; k < 3; k++) endTurnStatus(f); } catch (e) { out.push(`${CHARACTERS[id].name}「${s.name}」：${e.message}`); } } }
    });
    return out;
  });
  r.forEach(x => fails.push(`[${label}] ${x}`)); await ctx.close();
}
await browser.close(); server.close();
if (fails.length) { console.log(fails.map(f => '✗ ' + f).join('\n')); console.log(`\n冒煙測試失敗：${fails.length} 個問題`); process.exit(1); }
console.log('冒煙測試通過：桌機與手機都沒有錯誤或缺檔');
