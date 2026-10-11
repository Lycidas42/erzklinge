// Erzklinge – Service Worker
// Spieldatei (index.html): erst Netz, dann Cache – online gibt es immer die neueste Version.
// Statische Dateien (Three.js, Icons): aus dem Cache dieser Version.
// Schriften: aus dem Cache, im Hintergrund aktualisiert.
const VERSION = '__VERSION__';
const CACHE = `erzklinge-${VERSION}`;
const FONTS = 'erzklinge-fonts';
const CORE = __CORE__;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE && k !== FONTS) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith((async () => {
      const cache = await caches.open(FONTS);
      const hit = await cache.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') cache.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })());
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const r = await fetch(req, { cache: 'no-cache' });
        if (r.ok) (await caches.open(CACHE)).put('./index.html', r.clone());
        return r;
      } catch {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
