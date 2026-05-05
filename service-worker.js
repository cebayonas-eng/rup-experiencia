// ==============================
// VERSIONADO
// ==============================
const CACHE_NAME = "rup-dashboard-v3"; // 🔥 cambia versión cuando actualices

// ==============================
// ARCHIVOS A CACHEAR (APP SHELL)
// ==============================
const urlsToCache = [
  "./",
  "./index.html",
  "./app.js",
  "./styles.css",
  "./contratos.json",
  "./manifest.json"
];

// ==============================
// INSTALL
// ==============================
self.addEventListener("install", event => {
  console.log("🟢 Service Worker instalado");

  self.skipWaiting(); // 🔥 fuerza activación inmediata

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// ==============================
// ACTIVATE
// ==============================
self.addEventListener("activate", event => {
  console.log("🟡 Service Worker activado");

  self.clients.claim(); // 🔥 toma control inmediato

  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log("🧹 Eliminando caché antigua:", key);
            return caches.delete(key);
          })
      );
    })
  );
});

// ==============================
// FETCH (NETWORK FIRST)
// ==============================
self.addEventListener("fetch", event => {
  // Solo manejar GET
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clonar respuesta
        const responseClone = response.clone();

        // Guardar en caché
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });

        return response; // 🔥 siempre usa versión nueva
      })
      .catch(() => {
        // Si falla internet → usar caché
        return caches.match(event.request);
      })
  );
});