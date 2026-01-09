
// 🔥 FIX: Renamed cache to 'walktale-v2' to force update with new icons
const CACHE_NAME = 'walktale-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Force cache critical assets
        return cache.addAll(urlsToCache);
      })
  );
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // API calls: Network Only
  if (event.request.url.includes('google') || event.request.url.includes('api')) {
    return;
  }

  // 🔥 CRITICAL FIX FOR PWA 404: 
  // Handle Navigation Requests (e.g. opening app from icon which hits '/')
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((response) => {
        return response || fetch(event.request).catch(() => {
           // Fallback to index.html if network fails (Offline Support)
           return caches.match('/index.html');
        });
      })
    );
    return;
  }

  // Static Assets: Cache First, then Network
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Ensure the SW takes control of clients immediately
  event.waitUntil(self.clients.claim());
});
