# =========================================================================
# Arma la versión web (GitHub Pages) en ..\Web a partir de codigo-fuente.
# Es la misma app que la de escritorio, sin el motor de Neutralino, con el
# manifest para instalarla desde el navegador y el service worker para que
# funcione sin internet.
# Todos los archivos quedan en una sola carpeta (sin subcarpetas) para que
# se puedan subir a GitHub de una vez eligiéndolos con Ctrl+A.
# Uso: powershell -ExecutionPolicy Bypass -File .\codigo-fuente\armar-web.ps1
# =========================================================================
$ErrorActionPreference = "Stop"
$origen = Join-Path $PSScriptRoot "resources"
$web = Join-Path (Split-Path $PSScriptRoot) "Web"
$utf8 = New-Object Text.UTF8Encoding($false)

if (Test-Path $web) { Remove-Item -Recurse -Force $web }
New-Item -ItemType Directory $web | Out-Null

# 1. Archivos de la app, todos juntos (sin neutralino.js ni dolar.json, que en la web no se usan).
#    En la web las tipografías vienen de Google Fonts (como en la versión web anterior), así
#    todo son archivos de texto y se pueden subir desde cualquier lado.
#    jsPDF no se copia: en la web se carga desde cdnjs (con su firma de integridad).
Get-ChildItem (Join-Path $origen "js") -Filter *.js | Where-Object { $_.Name -notin @("neutralino.js", "jspdf.umd.min.js") } |
    ForEach-Object { Copy-Item $_.FullName $web }
$css = [IO.File]::ReadAllText((Join-Path $origen "css\estilos.css")).Replace("`r`n", "`n")
$css = [regex]::Replace($css, '(?m)^@font-face[^\n]*\n', '')
$css = $css.Replace("/* ---- Tipografías (incluidas en la app, funcionan sin internet) ---- */", "/* ---- Tipografías: Archivo y Barlow desde Google Fonts (ver index.html) ---- */")
if ($css.Contains("@font-face")) { throw "Quedaron @font-face en estilos.css" }
[IO.File]::WriteAllText((Join-Path $web "estilos.css"), $css, $utf8)

# 2. Registro del service worker (archivo propio: la política de seguridad no permite scripts sueltos)
[IO.File]::WriteAllText((Join-Path $web "sw-registro.js"),
@'
"use strict";
// Versión web: registra el service worker para que la app funcione sin internet.
if ("serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
'@, $utf8)

# 3. index.html adaptado a la web
$html = [IO.File]::ReadAllText((Join-Path $origen "index.html")).Replace("`r`n", "`n")
$html = $html.Replace('  <link rel="icon" type="image/png" href="icon-512.png">',
@'
  <link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">
  <link rel="apple-touch-icon" href="apple-touch-icon.png">
  <link rel="manifest" href="manifest.webmanifest">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="Alucast">
'@.Replace("`r`n", "`n").TrimEnd())
$html = $html.Replace('<script src="js/neutralino.js"></script>' + "`n", '')
$html = $html.Replace('<link rel="stylesheet" href="css/estilos.css">',
  '<link rel="preconnect" href="https://fonts.googleapis.com">' + "`n  " +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' + "`n  " +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..100,500..800&family=Barlow:wght@400;500;600&display=swap">' + "`n  " +
  '<link rel="stylesheet" href="estilos.css">')
$html = $html.Replace('<script src="js/jspdf.umd.min.js"></script>',
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" integrity="sha512-qZvrmS2ekKPF2mSznTQsxqPgnpkI4DNTlrdUmTzrDgektczlKNRRhy5X5AAOnx5S09ydFYWWNSfcEqDTTHgtNA==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>')
$html = $html.Replace("script-src 'self';", "script-src 'self' https://cdnjs.cloudflare.com;")
$html = $html.Replace('<script src="js/', '<script src="')
# La política de seguridad permite además las tipografías de Google
$html = $html.Replace("style-src 'self' 'unsafe-inline';", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;").Replace("font-src 'self';", "font-src 'self' https://fonts.gstatic.com;")
if (-not $html.Contains("https://fonts.gstatic.com;")) { throw "No se pudo ajustar la política de seguridad" }
$html = $html.Replace('<script src="app.js"></script>', "<script src=`"app.js`"></script>`n<script src=`"sw-registro.js`"></script>")
if ($html -match 'neutralino\.js|src="js/|href="css/') { throw "Quedaron rutas de la versión de escritorio en index.html" }
[IO.File]::WriteAllText((Join-Path $web "index.html"), $html, $utf8)

# 4. Service worker con la lista de archivos nueva (la versión cambia en cada armado)
$archivos = @("./", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png") +
    (Get-ChildItem $web -File | ForEach-Object Name | Sort-Object)
$lista = ($archivos | ForEach-Object { "`"$_`"" }) -join ", "
$version = "alucast-" + (Get-Date -Format "yyyyMMdd-HHmm")
$sw = @"
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
"@
[IO.File]::WriteAllText((Join-Path $web "sw.js"), $sw, $utf8)

# Los íconos, el manifest y lo demás que ya está en el repositorio no se tocan.
Write-Host "Listo: $web"
Get-ChildItem $web -File | ForEach-Object { "  " + $_.Name }
