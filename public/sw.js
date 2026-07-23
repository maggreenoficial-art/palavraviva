/* Service worker mínimo — necessário para o navegador oferecer "Instalar app". */
const CACHE = 'palavraviva-shell-v17';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/', '/manifest.json', '/favicon.ico'])),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (
          response.ok &&
          request.url.startsWith(self.location.origin) &&
          (request.destination === 'document' ||
            request.destination === 'script' ||
            request.destination === 'style' ||
            request.url.includes('/_expo/'))
        ) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/'))),
  );
});
