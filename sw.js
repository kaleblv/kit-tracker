const CACHE = 'kit-tracker-v2';
const SHELL = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  // Pre-cache shell files, then skip waiting so this SW activates immediately
  // without waiting for existing tabs/windows to close
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Delete old caches, then claim clients — all chained in one promise
  // so the activate event won't complete until both steps are done
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Cache-first for Google Fonts (they change rarely)
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(hit =>
          hit || fetch(e.request).then(res => {
            cache.put(e.request, res.clone());
            return res;
          })
        )
      )
    );
    return;
  }

  // Cache-first for everything else; network updates cache on the side
  e.respondWith(
    caches.match(e.request).then(hit =>
      hit || fetch(e.request).then(res => {
        if (url.startsWith('http')) {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
