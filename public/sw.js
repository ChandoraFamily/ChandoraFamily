const CACHE_NAME = "chandora-tree-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn("[SW] Pre-caching warning:", err);
        });
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|woff|woff2|ico|css|js)$/i)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, networkResponse);
                });
              }
            })
            .catch(() => {
              /* offline, ignore */
            });
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
      }),
    );
    return;
  }

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
                message:
                  "You are currently offline. Displaying locally stored family data.",
              }),
              {
                headers: { "Content-Type": "application/json" },
              },
            );
          });
        }),
    );
    return;
  }

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
          return caches.match("/").then((cached) => {
            if (cached) return cached;
            return new Response(
              "<!DOCTYPE html><html><body style='background:#080b20;color:#fff;font-family:sans-serif;text-align:center;padding:50px;'><h2>Chandora Family Tree</h2><p>You are currently offline. Please reconnect to sync the latest updates.</p></body></html>",
              { headers: { "Content-Type": "text/html" } },
            );
          });
        }),
    );
    return;
  }
});
