# =========================================================================
# Genera ..\PARA-CLAUDE-GITHUB.md: instrucciones + el contenido completo de
# cada archivo de la carpeta Web, para pasárselo a un chat de Claude que
# tenga acceso a GitHub y que lo suba al repositorio de la página.
# Antes hay que correr armar-web.ps1.
# =========================================================================
$ErrorActionPreference = "Stop"
$raiz = Split-Path $PSScriptRoot
$web = Join-Path $raiz "Web"
$salida = Join-Path $raiz "PARA-CLAUDE-GITHUB.md"
$utf8 = New-Object Text.UTF8Encoding($false)

$archivos = Get-ChildItem $web -File | Sort-Object { if ($_.Name -eq "index.html") { 0 } elseif ($_.Name -eq "sw.js") { 1 } else { 2 } }, Name
$sha = [Security.Cryptography.SHA256]::Create()
$filas = $archivos | ForEach-Object {
  $bytes = [IO.File]::ReadAllBytes($_.FullName)
  $hash = (-join ($sha.ComputeHash($bytes) | ForEach-Object { $_.ToString("x2") })).Substring(0, 12)
  $accion = if ($_.Name -in @("index.html", "sw.js")) { "reemplazar" } else { "crear" }
  "| ``$($_.Name)`` | $accion | $($bytes.Length) | ``$hash`` |"
}

$md = New-Object Text.StringBuilder
[void]$md.AppendLine(@"
# Actualizar la página web de Alucast (GitHub Pages)

Hola Claude. Necesito que subas estos archivos a mi repositorio de GitHub para que la página web
quede igual que la app de escritorio que uso. Seguí estas instrucciones al pie de la letra.

## Dónde

- Repositorio: **totibrancato-gif/alucast**
- Rama: **main**
- Página publicada: https://totibrancato-gif.github.io/alucast/
- Todos los archivos van en la **raíz** del repositorio (no en subcarpetas).

## Qué hacer

1. Subí los **$($archivos.Count) archivos** de la lista de abajo, con el contenido **exactamente** como está en este
   documento: sin reformatear, sin "mejorar" nada, sin cambiar comillas, espacios ni saltos de línea.
   - ``index.html`` y ``sw.js`` ya existen: **reemplazalos**.
   - Los otros $($archivos.Count - 2) son **nuevos**: crealos (si alguno ya existe de una subida anterior, reemplazalo).
2. Si podés, hacelo todo en **un solo commit** con el mensaje:
   ``Actualizar Alucast: misma versión que la app de escritorio``
3. **No borres ni modifiques ningún otro archivo** del repositorio. Se quedan como están:
   ``manifest.webmanifest``, ``icon-192.png``, ``icon-512.png``, ``icon-maskable-512.png``, ``apple-touch-icon.png``,
   ``dolar.json``, ``README.md``, ``.nojekyll``, la carpeta ``scripts/`` y la carpeta ``.github/``.
4. Después de subirlo, comprobá que cada archivo quedó con el **tamaño en bytes** de la tabla
   (y si podés, que el SHA-256 empiece con los caracteres indicados). Si alguno no coincide, volvé a subirlo
   tal cual.
5. GitHub Pages tarda 1 o 2 minutos en publicar. Después abrí https://totibrancato-gif.github.io/alucast/ y
   confirmame que carga, que arriba dice **ALUCAST** con las pestañas Presupuesto, Guardados, Por entregar,
   Lista de precios y Ajustes y copia, y que el dólar aparece como **\$ 41,00** con flechas ▲ ▼.

## Para tu tranquilidad

- Los presupuestos que ya están guardados en la web **no se pierden**: la app usa las mismas claves de
  ``localStorage`` que la versión anterior y solo completa datos que falten. Esto ya se probó.
- Los archivos ``.js`` se cargan como scripts clásicos (no módulos) y en un orden fijo que está en ``index.html``.
  No cambies ese orden ni los nombres.
- ``index.html`` tiene una política de seguridad (Content-Security-Policy) a propósito: no la saques.

## Archivos

| Archivo | Acción | Tamaño (bytes) | SHA-256 (inicio) |
|---|---|---|---|
"@)
$filas | ForEach-Object { [void]$md.AppendLine($_) }
[void]$md.AppendLine("")
[void]$md.AppendLine('A continuación, el contenido completo de cada archivo. Cada uno va entre las líneas de cinco acentos graves y **no incluye** esas líneas.')
[void]$md.AppendLine("")

foreach ($a in $archivos) {
  $texto = [IO.File]::ReadAllText($a.FullName, $utf8)
  if ($texto.Contains('`````')) { throw "El archivo $($a.Name) contiene la marca de cierre" }
  $lang = @{ ".html" = "html"; ".js" = "javascript"; ".css" = "css" }[$a.Extension]
  [void]$md.AppendLine("### ``$($a.Name)``")
  [void]$md.AppendLine("")
  [void]$md.AppendLine('`````' + $lang)
  [void]$md.Append($texto)
  if (-not $texto.EndsWith("`n")) { [void]$md.AppendLine("") }
  [void]$md.AppendLine('`````')
  [void]$md.AppendLine("")
}

[IO.File]::WriteAllText($salida, $md.ToString().Replace("`r`n", "`n"), $utf8)
Write-Host "Listo: $salida ($([math]::Round((Get-Item $salida).Length / 1KB)) KB)"
