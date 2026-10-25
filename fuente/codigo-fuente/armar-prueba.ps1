# =========================================================================
# Arma ..\Prueba\alucast-prueba.html: la app entera en un solo archivo para
# publicarla como link de prueba (Artifact de Claude).
# - Todo el CSS y el JS van adentro del archivo (el link no carga archivos sueltos).
# - Las tipografías vienen de Google Fonts.
# - El PDF y "Exportar copia" no se pueden usar en el link: avisan con un mensaje.
# Uso: powershell -ExecutionPolicy Bypass -File .\codigo-fuente\armar-prueba.ps1
# =========================================================================
$ErrorActionPreference = "Stop"
$origen = Join-Path $PSScriptRoot "resources"
$destino = Join-Path (Split-Path $PSScriptRoot) "Prueba"
$utf8 = New-Object Text.UTF8Encoding($false)
New-Item -ItemType Directory -Force $destino | Out-Null

$html = [IO.File]::ReadAllText((Join-Path $origen "index.html"), $utf8).Replace("`r`n", "`n")

# Cuerpo de la página (entre <body> y los <script>) y scripts en su orden
$ini = $html.IndexOf("<body>") + "<body>".Length
$fin = $html.IndexOf('<script src="js/')
$cuerpo = $html.Substring($ini, $fin - $ini).Trim()
# (jsPDF no hace falta: en el link no se pueden descargar archivos, el botón PDF avisa)
$scripts = [regex]::Matches($html, '<script src="js/([^"]+)"></script>') | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -notin @("neutralino.js", "jspdf.umd.min.js") }

# Aviso de versión de prueba arriba de todo
$cuerpo = $cuerpo.Replace('<div class="wrap">', "<div class=`"wrap`">`n  <p class=`"aviso-prueba`"><b>Versión de prueba.</b> Lo que cargues acá se guarda aparte de tu app. El PDF y la copia de seguridad solo funcionan en la app.</p>")

# CSS: sin las tipografías locales; margen lateral seguro en celulares
$css = [IO.File]::ReadAllText((Join-Path $origen "css\estilos.css"), $utf8).Replace("`r`n", "`n")
$css = [regex]::Replace($css, '(?m)^@font-face[^\n]*\n', '')
$css += @'

/* ---- Solo en el link de prueba ---- */
.wrap { padding-block: 20px 48px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
.cajon { padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-top: calc(18px + env(safe-area-inset-top, 0px)); padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px)); }
.toast { top: calc(16px + env(safe-area-inset-top, 0px)); }
.aviso-prueba { margin: 0 0 14px; padding: 10px 14px; border: 1px solid var(--danger); border-radius: 6px; background: var(--danger-soft); color: var(--fg); font-size: .9rem; }
'@

$sb = New-Object Text.StringBuilder
[void]$sb.AppendLine('<title>Alucast Prueba</title>')
[void]$sb.AppendLine('<meta name="claude:viewport-fit-sides" content="cover">')
[void]$sb.AppendLine('<link rel="preconnect" href="https://fonts.googleapis.com">')
[void]$sb.AppendLine('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>')
[void]$sb.AppendLine('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..100,500..800&family=Barlow:wght@400;500;600&display=swap">')
[void]$sb.AppendLine('<style>')
[void]$sb.Append($css)
[void]$sb.AppendLine('</style>')
[void]$sb.AppendLine($cuerpo)
foreach ($s in $scripts) {
  $js = [IO.File]::ReadAllText((Join-Path $origen "js\$s"), $utf8).Replace("`r`n", "`n")
  if ($js -match '</script') { throw "$s contiene </script>" }
  [void]$sb.AppendLine("<script>/* $s */")
  [void]$sb.Append($js)
  [void]$sb.AppendLine('</script>')
}
# En el link no se puede imprimir ni descargar: se avisa en vez de no hacer nada
[void]$sb.AppendLine(@'
<script>/* solo en el link de prueba */
$("btn-pdf").onclick = () => toast("En el link de prueba no se puede hacer el PDF. Usalo desde la app.");
$("bk-exp").onclick = () => toast("En el link de prueba no se puede exportar la copia. Usalo desde la app.");
</script>
'@)

$salida = Join-Path $destino "alucast-prueba.html"
[IO.File]::WriteAllText($salida, $sb.ToString(), $utf8)
Write-Host "Listo: $salida ($([math]::Round((Get-Item $salida).Length / 1KB)) KB, $($scripts.Count) scripts)"
