/* Service Worker — Japón 2026 v7 */
const CACHE = 'japon2026-v7';
const CORE = ['./', './index.html'];

// Esquemas válidos para cachear
const CACHEABLE_SCHEMES = ['http:', 'https:'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).catch(()=>{})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // Ignorar esquemas no cacheables (chrome-extension://, data:, blob:, etc.)
  if (!CACHEABLE_SCHEMES.includes(url.protocol)) return;

  // No cachear endpoints de Firebase / Google APIs (siempre pedirlos online)
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('googleapis.com')
  ) {
    return; // dejar que el browser lo maneje normalmente
  }

  // Cross-origin (CDNs, fonts): network-first con fallback a cache
  if (url.origin !== location.origin) {
    e.respondWith(
      fetch(req).then(resp => {
        if (resp && resp.ok && resp.type !== 'opaque') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(req, clone).catch(()=>{}));
        }
        return resp;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Same-origin: cache-first con revalidación
  e.respondWith(
    caches.match(req).then(cached => {
      const fetchP = fetch(req).then(resp => {
        if (resp && resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(req, clone).catch(()=>{}));
        }
        return resp;
      }).catch(() => cached);
      return cached || fetchP;
    })
  );
});
