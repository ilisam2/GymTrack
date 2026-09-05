// Bump CACHE when index.html changes so installed phones pick up the new version.
const CACHE = 'gymtrack-v5';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './history-template.csv'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Pages (index.html) are network first so a new version lands on the first reload; falls back to cache offline.
// Other assets are cache first, refreshed in the background.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  const isPage = e.request.mode === 'navigate' || e.request.destination === 'document';
  const put = (res) => { if (res && res.ok) caches.open(CACHE).then((c) => c.put(e.request, res.clone())); return res; };
  if (isPage) {
    e.respondWith(fetch(e.request).then(put).catch(() => caches.match(e.request, { ignoreSearch: true }).then((c) => c || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then((cached) => {
    const net = fetch(e.request).then(put).catch(() => cached);
    return cached || net;
  }));
});
