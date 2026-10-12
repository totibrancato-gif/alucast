// Alucast: funciona sin internet. Cambiá VERSION al publicar una actualización.
const VERSION = "alucast-v12";
const ARCHIVOS = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // La cotización y la app: primero internet, si no hay, lo guardado
  if (url.origin === location.origin) {
    e.respondWith(fetch(e.request, {cache: "no-cache"}).then(r => { if (r.ok && !url.pathname.endsWith("dolar.json")) { const c = r.clone(); caches.open(VERSION).then(ca => ca.put(e.request, c)); } return r; })
      .catch(() => caches.match(e.request, {ignoreSearch: true}).then(r => r || caches.match("index.html"))));
    return;
  }
  // Tipografías de Google: lo guardado primero
  if (url.hostname.endsWith("gstatic.com") || url.hostname.endsWith("googleapis.com")) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const c = res.clone(); caches.open(VERSION).then(ca => ca.put(e.request, c)); return res; })));
  }
});
