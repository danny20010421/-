/* 載入畫面：下載並檢查遊戲用到的所有圖片與字型，全部完成後才讓玩家進入 */
(function () {
  const el = id => document.getElementById(id);
  const MAX_TRY = 3, TIMEOUT = 20000, CONCURRENCY = 6;

  /* 蒐集資源：角色、篇章、樣式表裡的背景圖、頁面圖片 */
  function collect() {
    const L = [], seen = new Set();
    const push = (u, group) => { if (!u || u.startsWith('data:')) return; const abs = new URL(u, location.href).href; if (seen.has(abs)) return; seen.add(abs); L.push({ url: abs, group }); };
    try { Object.values(CHARACTERS).forEach(c => { push(c.image, '角色立繪'); push(c.avatar, '角色頭像'); if (c.ultimateBg) push(c.ultimateBg, '角色立繪'); }); } catch (e) { }
    try { CHAPTERS.forEach(c => push(c.art, '篇章封面')); } catch (e) { }
    try { Object.values(SKINS).forEach(s => { push(s.image, '角色皮膚'); push(s.avatar, '角色皮膚'); }); } catch (e) { }
    for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch (e) { continue; } const base = sh.href || location.href;
      const walk = rs => { for (const r of rs) { if (r.cssRules) walk(r.cssRules); const t = r.cssText || ''; for (const m of t.matchAll(/url\(["']?([^"')]+)["']?\)/g)) { if (/\.(webp|png|jpe?g|gif|svg)(\?|$)/i.test(m[1]) && !m[1].startsWith('data:')) { const abs = new URL(m[1], base).href; if (!seen.has(abs)) { seen.add(abs); L.push({ url: abs, group: '介面背景' }); } } } } };
      walk(rules); }
    document.querySelectorAll('img[src]').forEach(i => push(i.getAttribute('src'), '介面圖片'));
    const v = document.getElementById('loginVideo'); if (v && v.poster) push(v.poster, '登入畫面');
    return L;
  }
  /* 下載單一圖片並確認可以正常解碼（檔案完整） */
  function loadOne(item) {
    return new Promise(res => {
      const img = new Image(); let done = false;
      const fin = ok => { if (done) return; done = true; clearTimeout(t); res(ok); };
      const t = setTimeout(() => fin(false), TIMEOUT);
      img.onload = () => { const ok = img.naturalWidth > 0; if (ok && img.decode) img.decode().then(() => fin(true), () => fin(true)); else fin(ok); };
      img.onerror = () => fin(false);
      img.src = item.url + (item.tries > 0 ? (item.url.includes('?') ? '&' : '?') + 'retry=' + item.tries : '');
    });
  }

  let items = [], doneCount = 0, failed = [], started = 0, total = 0;
  function setProgress(label) {
    const p = total ? Math.min(100, Math.floor(Math.max(0, doneCount - failed.length) / total * 100)) : 0;
    el('ldPct').textContent = p; el('ldFill').style.width = p + '%'; el('ldBar').setAttribute('aria-valuenow', p);
    if (label) el('ldText').textContent = label;
  }
  async function runQueue(list) {
    let idx = 0;
    const worker = async () => { while (idx < list.length) { const it = list[idx++]; let ok = false;
      for (it.tries = it.tries || 0; it.tries < MAX_TRY && !ok; it.tries++) ok = await loadOne(it);
      if (!ok) failed.push(it); doneCount++;
      const g = items.filter(x => x.group === it.group), gd = g.filter(x => x.tries).length;
      setProgress(`正在下載：${it.group} ${gd}/${g.length}`); } };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  }
  async function start() {
    started = performance.now(); items = collect(); total = items.length + 1; doneCount = 0; failed = [];
    el('ldCount').textContent = `共 ${items.length} 個資源`;
    setProgress('正在確認遊戲資源…');
    const fonts = (document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 6000))]) : Promise.resolve()).then(() => { doneCount++; setProgress(); });
    await Promise.all([runQueue(items), fonts]);
    finish();
  }
  function finish() {
    doneCount = total; setProgress(failed.length ? `有 ${failed.length} 個資源下載失敗` : '全部資源已就緒');
    const box = el('ldDone'); box.hidden = false;
    if (!failed.length) {
      box.innerHTML = `<button class="ld-enter" id="ldEnter">點擊進入</button><small>資源檢查完成（${items.length}/${items.length}）・${((performance.now() - started) / 1000).toFixed(1)} 秒</small>`;
      el('ldEnter').onclick = enter; el('loader').classList.add('ready');
    } else {
      box.innerHTML = `<p class="ld-warn">以下資源下載失敗，可能是網路不穩定：</p><ul class="ld-fail">${failed.slice(0, 6).map(f => `<li>${f.group}・${decodeURIComponent(f.url.split('/').pop().split('?')[0])}</li>`).join('')}${failed.length > 6 ? `<li>…另外 ${failed.length - 6} 個</li>` : ''}</ul>
        <div class="ld-btns"><button class="ld-enter" id="ldRetry">重新下載失敗項目</button><button class="ld-skip" id="ldSkip">仍然進入</button></div>`;
      el('ldRetry').onclick = async () => { const list = failed.slice(); failed = []; list.forEach(x => x.tries = 0); doneCount = total - list.length; box.hidden = true; await runQueue(list); finish(); };
      el('ldSkip').onclick = enter;
    }
  }
  function enter() {
    try { if (window.AUDIO && AUDIO.unlock) AUDIO.unlock(); } catch (e) { }
    const L = el('loader'); L.classList.add('out'); setTimeout(() => { L.remove(); }, 700);
    try { const v = document.getElementById('loginVideo'); if (v && v.play) v.play().catch(() => { }); } catch (e) { }
  }
  /* 閃電：在進度條前端隨機產生鋸齒狀電弧 */
  function bolts() {
    const svg = el('ldBolt'); if (!svg || !document.getElementById('loader')) return;
    const w = svg.clientWidth, h = svg.clientHeight, fill = el('ldFill').getBoundingClientRect(), bar = el('ldBar').getBoundingClientRect();
    const hx = Math.max(6, fill.right - bar.left); let paths = '';
    for (let k = 0; k < 3; k++) { let x = hx, y = h / 2, d = `M${x},${y}`; const dir = Math.random() < .5 ? -1 : 1, len = 12 + Math.random() * 40; for (let i = 0; i < 6; i++) { x += (Math.random() * 10 - 3) * (i % 2 ? 1 : -1) + dir * len / 6 * .4; y += (Math.random() - .5) * h * .9; d += ` L${x.toFixed(1)},${Math.max(0, Math.min(h, y)).toFixed(1)}`; } paths += `<path d="${d}"/>`; }
    let s = 'M0,' + h / 2; for (let x = 8; x < hx; x += 8 + Math.random() * 10) s += ` L${x.toFixed(1)},${(h / 2 + (Math.random() - .5) * h * .7).toFixed(1)}`;
    svg.innerHTML = `<path class="core" d="${s} L${hx},${h / 2}"/>${paths}`;
    if (Math.random() < .06) { const f = el('ldFlash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
    setTimeout(() => requestAnimationFrame(bolts), 70 + Math.random() * 60);
  }
  window.addEventListener('DOMContentLoaded', () => { if (!el('loader')) return; bolts(); start(); });
})();
