// AETHER service worker — app-shell caching only.
// Deliberately does NOT cache /api/chat or any dynamic response: AI output
// should never be served stale. This exists so the UI itself (HTML/CSS/JS/icons)
// loads instantly and the PWA install prompt is available, not to fake offline AI.

const CACHE_NAME = "aether-shell-v1";
const SHELL_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {
      // Best-effort — a failed precache shouldn't block install
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never touch API calls or non-GET requests — always go straight to the network.
  if (url.pathname.startsWith("/api/") || event.request.method !== "GET") {
    return;
  }

  // Cache-first for the static app shell; falls back to network, and updates
  // the cache in the background when the network does respond.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // offline and not cached — nothing we can do for this asset

      return cached || networkFetch;
    })
  );
});
