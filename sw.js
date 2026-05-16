/**
 * EstateBot PWA – Service Worker
 * Cache-first strategy for static assets, network-first for HTML
 */
const CACHE_NAME = 'estatebot-v1';
const PRECACHE   = ['/', '/index.html', '/css/styles.css', '/js/i18n.js', '/js/app.js', '/manifest.json'];

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', evt => {
  // Skip non-GET requests
  if (evt.request.method !== 'GET') return;

  // Network-first for HTML (fresh content)
  if (evt.request.headers.get('accept')?.includes('text/html')) {
    evt.respondWith(
      fetch(evt.request)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(evt.request, clone));
          return resp;
        })
        .catch(() => caches.match(evt.request))
    );
    return;
  }

  // Cache-first for all other static assets
  evt.respondWith(
    caches.match(evt.request).then(cached => {
      if (cached) return cached;
      return fetch(evt.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(evt.request, clone));
        return resp;
      });
    })
  );
});
