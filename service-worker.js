/* ==========================================================================
   FITE — service-worker.js
   Caches every static asset the app needs so it works fully offline.
   YouTube (video embeds) is explicitly never cached and always requires
   the network — everything else is served from cache first.
   ========================================================================== */

const CACHE_VERSION = 'fite-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './sports.html',
  './gallery.html',
  './foods.html',
  './checklist.html',
  './notes.html',
  './moneytracker.html',
  './settings.html',
  './offline.html',
  './manifest.json',

  './css/themes.css',
  './css/shared.css',
  './css/index.css',
  './css/sports.css',
  './css/gallery.css',
  './css/foods.css',
  './css/checklist.css',
  './css/notes.css',
  './css/moneytracker.css',
  './css/settings.css',

  './js/db.js',
  './js/app-shared.js',
  './js/plan-data.js',
  './js/index.js',
  './js/sports.js',
  './js/gallery.js',
  './js/foods.js',
  './js/checklist.js',
  './js/notes.js',
  './js/moneytracker.js',
  './js/settings.js',

  './assets/icons/icon-72.png',
  './assets/icons/icon-96.png',
  './assets/icons/icon-128.png',
  './assets/icons/icon-144.png',
  './assets/icons/icon-152.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-384.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-192.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/app-sports.png',
  './assets/icons/app-gallery.png',
  './assets/icons/app-foods.png',
  './assets/icons/app-checklist.png',
  './assets/icons/app-notes.png',
  './assets/icons/app-money.png',
  './assets/icons/app-settings.png',

  './assets/wallpapers/wall-1.jpg',
  './assets/wallpapers/wall-2.jpg',
  './assets/wallpapers/wall-3.jpg',
  './assets/wallpapers/wall-4.jpg',
  './assets/wallpapers/wall-5.jpg',
  './assets/wallpapers/wall-6.jpg',
  './assets/wallpapers/wall-7.jpg',
  './assets/wallpapers/wall-8.jpg',
];

// Hosts that must NEVER be cached (video / third-party streaming, and the
// daily-quote text APIs — those must always hit the network so the quote
// actually changes day to day; the app's own IndexedDB cache in index.js
// handles the "same all day, offline fallback" behaviour instead).
const NEVER_CACHE_HOSTS = [
  'youtube.com', 'www.youtube.com', 'youtube-nocookie.com',
  'ytimg.com', 'googlevideo.com', 'youtu.be',
  'api.quotable.io', 'zenquotes.io'
];

function isNeverCacheHost(url){
  try {
    const host = new URL(url).hostname;
    return NEVER_CACHE_HOSTS.some(h => host === h || host.endsWith('.' + h));
  } catch(e){ return false; }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k.startsWith('fite-') && k !== STATIC_CACHE && k !== RUNTIME_CACHE)
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Never touch YouTube / video streaming requests — always go to network.
  if (isNeverCacheHost(req.url)) {
    return; // let the browser handle it normally
  }

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Navigation requests: try network first (fresh HTML), fall back to cache, then offline page.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then(cached => cached || caches.match('./offline.html'))
        )
    );
    return;
  }

  if (!sameOrigin) {
    // Third-party (non-YouTube) resource — try cache, then network, cache it for next time.
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(RUNTIME_CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => cached))
    );
    return;
  }

  // Same-origin static assets: cache-first, refresh in background.
  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req).then(res => {
        const copy = res.clone();
        caches.open(STATIC_CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
