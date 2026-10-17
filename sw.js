// Holds a shared screenshot in MEMORY only (never cache/IndexedDB), hands it to the page once, then forgets it.
let pending = null;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method === 'POST' && u.searchParams.has('share')) {
    e.respondWith((async () => {
      try { pending = (await e.request.formData()).get('shot'); } catch (_) { pending = null; }
      return Response.redirect(new URL('./?shared=1', self.registration.scope).href, 303);
    })());
  }
});
self.addEventListener('message', e => {
  if (e.data === 'getShot') { e.ports[0].postMessage(pending); pending = null; }
});
