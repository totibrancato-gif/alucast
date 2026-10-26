#!/bin/bash
# =========================================================================
# Arma la versión web (GitHub Pages) en ../Web a partir de codigo-fuente.
# Hace lo mismo que armar-web.ps1, pero para la Mac (o Linux).
# Es la misma app que la de escritorio, sin el motor de Neutralino, con el
# manifest para instalarla desde el navegador y el service worker para que
# funcione sin internet. Todos los archivos quedan en una sola carpeta.
# Uso: bash codigo-fuente/armar-web.sh
# =========================================================================
set -euo pipefail
aqui="$(cd "$(dirname "$0")" && pwd)"
origen="$aqui/resources"
web="$(dirname "$aqui")/Web"

rm -rf "$web"
mkdir -p "$web"

# 1. Archivos de la app, todos juntos (sin neutralino.js; jsPDF se carga desde cdnjs).
#    En la web las tipografías vienen de Google Fonts.
for f in "$origen"/js/*.js; do
  case "$(basename "$f")" in neutralino.js|jspdf.umd.min.js) ;; *) cp "$f" "$web/" ;; esac
done
perl -pe 's/\r\n/\n/; $_ = "" if /^\@font-face/; s{/\* ---- Tipografías \(incluidas en la app, funcionan sin internet\) ---- \*/}{/* ---- Tipografías: Archivo y Barlow desde Google Fonts (ver index.html) ---- */}' \
  "$origen/css/estilos.css" > "$web/estilos.css"
if grep -q "@font-face" "$web/estilos.css"; then echo "Quedaron @font-face en estilos.css" >&2; exit 1; fi

# 2. Registro del service worker (archivo propio: la política de seguridad no permite scripts sueltos)
cat > "$web/sw-registro.js" <<'EOF'
"use strict";
// Versión web: registra el service worker para que la app funcione sin internet.
if ("serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
EOF

# 3. index.html adaptado a la web
perl -0pe '
  s/\r\n/\n/g;
  s{  <link rel="icon" type="image/png" href="icon-512.png">}{  <link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">\n  <link rel="apple-touch-icon" href="apple-touch-icon.png">\n  <link rel="manifest" href="manifest.webmanifest">\n  <meta name="mobile-web-app-capable" content="yes">\n  <meta name="apple-mobile-web-app-capable" content="yes">\n  <meta name="apple-mobile-web-app-title" content="Alucast">};
  s{<script src="js/neutralino.js"></script>\n}{};
  s{<link rel="stylesheet" href="css/estilos.css">}{<link rel="preconnect" href="https://fonts.googleapis.com">\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght\@75..100,500..800&family=Barlow:wght\@400;500;600&display=swap">\n  <link rel="stylesheet" href="estilos.css">};
  s{<script src="js/jspdf.umd.min.js"></script>}{<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" integrity="sha512-qZvrmS2ekKPF2mSznTQsxqPgnpkI4DNTlrdUmTzrDgektczlKNRRhy5X5AAOnx5S09ydFYWWNSfcEqDTTHgtNA==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>};
  s{script-src \x27self\x27;}{script-src \x27self\x27 https://cdnjs.cloudflare.com;};
  s{<script src="js/}{<script src="}g;
  s{style-src \x27self\x27 \x27unsafe-inline\x27;}{style-src \x27self\x27 \x27unsafe-inline\x27 https://fonts.googleapis.com;};
  s{font-src \x27self\x27;}{font-src \x27self\x27 https://fonts.gstatic.com;};
  s{<script src="app.js"></script>}{<script src="app.js"></script>\n<script src="sw-registro.js"></script>};
' "$origen/index.html" > "$web/index.html"
grep -q "https://fonts.gstatic.com;" "$web/index.html" || { echo "No se pudo ajustar la política de seguridad" >&2; exit 1; }
if grep -Eq 'neutralino\.js|src="js/|href="css/' "$web/index.html"; then echo "Quedaron rutas de la versión de escritorio en index.html" >&2; exit 1; fi

# 4. Service worker con la lista de archivos nueva (la versión cambia en cada armado)
lista='"./", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"'
for f in $(cd "$web" && ls | LC_ALL=C sort -f); do lista="$lista, \"$f\""; done
version="alucast-$(date +%Y%m%d-%H%M)"
cat > "$web/sw.js" <<EOF
// Alucast: funciona sin internet. La versión cambia sola cada vez que se arma la web.
const VERSION = "$version";
const ARCHIVOS = [$lista, "sw.js"];
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
EOF

# Los íconos, el manifest y lo demás que ya está en el repositorio no se tocan.
echo "Listo: $web"
ls "$web" | sed 's/^/  /'
