// Minimal service worker — exists primarily so Chrome/Android will actually
// finish a PWA install (a fetch handler is part of its installability
// criteria; without one, "Install" spins on "Installing..." forever and
// never completes). Also gives a small amount of real offline value: the
// app shell assets (icons, manifest) are cached so the tab chrome / home
// screen icon still work with no connection, and any other request falls
// back to cache if the network is unreachable.
const CACHE_NAME = "fasttrack-shell-v1";
const PRECACHE_URLS = ["/manifest.json", "/icon.png", "/apple-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Network-first: pages are dynamic/session-gated, so never serve a stale
  // cached copy while online. Only fall back to cache (app shell assets)
  // when the network request fails outright (offline).
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
