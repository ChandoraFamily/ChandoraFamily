// Chandora Family Tree - Service Worker
const CACHE_NAME = "chandora-tree-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/logo.png"
];

// 1. Install: Precache shell and vital offline assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Pre-caching warning:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate: Clean up previous cache versions & claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch strategy:
// - Navigations: Stale-While-Revalidate with fallback to cached shell
// - Static chunks (_next/static, fonts, images): Cache-First
// - API requests (/api/): Network-first with Cache fallback
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle HTTP/HTTPS GET requests (skip non-GET or chrome-extension)
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // A. Static Next.js chunks, fonts, images -> Cache-First
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|woff|woff2|ico|css|js)$/i)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return from cache, optionally revalidate in background
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse);
              });
            }
          }).catch(() => {/* offline, ignore */});
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // B. API requests -> Network-first with Cache fallback for offline browsing
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return new Response(
              JSON.stringify({
                error: "Offline",
                message: "You are currently offline. Displaying locally stored family data."
              }),
              {
                headers: { "Content-Type": "application/json" }
              }
            );
          });
        })
    );
    return;
  }

  // C. HTML Navigation requests -> Stale-while-revalidate / App shell
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put("/", responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // When offline, serve cached index/shell
          return caches.match("/").then((cached) => {
            if (cached) return cached;
            return new Response(
              "<!DOCTYPE html><html><body style='background:#080b20;color:#fff;font-family:sans-serif;text-align:center;padding:50px;'><h2>Chandora Family Tree</h2><p>You are currently offline. Please reconnect to sync the latest updates.</p></body></html>",
              { headers: { "Content-Type": "text/html" } }
            );
          });
        })
    );
    return;
  }
});
