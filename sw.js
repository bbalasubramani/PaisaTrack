// Change this number every time you deploy. A new number makes phones drop old files.
const CACHE = 'paisatrack-v5';

// Every file the app needs. Add new files here.
const FILES = [
  './',
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/main.js',
  'js/config.js',
  'js/db.js',
  'js/state.js',
  'js/cycle.js',
  'js/budget.js',
  'js/insights.js',
  'js/voice.js',
  'js/icons.js',
  'js/sheet.js',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', e => {
  // add files one by one, so one missing file does not break the install
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(FILES.map(f => c.add(f))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  // delete caches from older versions
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => clients.claim())
  );
});

// Network first: online = always the newest file. Offline = the saved copy.
// Only our own files. Supabase calls are never saved.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
