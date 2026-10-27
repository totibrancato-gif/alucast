// Alucast: funciona sin internet. La versión cambia sola cada vez que se arma la web.
const VERSION = "alucast-20261027-1807";
const ARCHIVOS = ["./", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png", "app.js", "calculo.js", "copia.js", "datos.js", "dolar.js", "estilos.css", "gastos.js", "index.html", "lista-fabrica.js", "menu.js", "nube.js", "pdf.js", "plataforma.js", "precios.js", "presupuesto.js", "sw-registro.js", "trabajos.js", "utilidades.js", "ventana.js", "sw.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS.filter(a => a !== "sw.js")))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // La app: primero internet (así siempre se ve la última versión); si no hay conexión, lo guardado.
  if (url.origin === location.origin) {
    e.respondWith(fetch(e.request, { cache: "no-cache" })
      .then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSION).then(ca => ca.put(e.request, c)); } return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("index.html"))));
    return;
  }
  // Tipografías de Google y jsPDF (cdnjs): lo guardado primero (así funcionan sin internet)
  if (url.hostname.endsWith("gstatic.com") || url.hostname.endsWith("googleapis.com") || url.hostname === "cdnjs.cloudflare.com") {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const c = res.clone(); caches.open(VERSION).then(ca => ca.put(e.request, c)); return res; })));
  }
});
