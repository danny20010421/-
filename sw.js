/* 離線快取：網頁本體優先抓最新版（沒網路時用快取），圖片、音樂、程式則先用快取、背景更新。
   所有資源網址都帶有 ?v= 版本號，改版後會自動換成新檔。 */
const CACHE = 'op-voyage-runtime';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || req.headers.has('range')) return;
  if (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); return r; }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async k => {
    const hit = await k.match(req);
    const net = fetch(req).then(r => { if (r.ok && r.type === 'basic') k.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
