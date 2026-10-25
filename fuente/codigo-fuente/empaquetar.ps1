# =========================================================================
# Empaqueta la carpeta codigo-fuente en ..\resources.neu (formato ASAR que
# usa Neutralino). Uso, desde PowerShell:
#   powershell -ExecutionPolicy Bypass -File .\codigo-fuente\empaquetar.ps1
# Antes de reemplazar, guarda una copia del resources.neu anterior.
# =========================================================================
$ErrorActionPreference = "Stop"
$origen = $PSScriptRoot
$destino = Join-Path (Split-Path $origen) "resources.neu"
# Solo se empaqueta lo que la app necesita (no este script ni otros archivos sueltos)
$incluir = @("neutralino.config.json", "resources")

$sha = [Security.Cryptography.SHA256]::Create()
$datos = New-Object IO.MemoryStream
$offset = [int64]0

function Hash([byte[]]$b) { -join ($sha.ComputeHash($b) | ForEach-Object { $_.ToString("x2") }) }

function Nodo([string]$ruta) {
    $archivos = [ordered]@{}
    foreach ($item in Get-ChildItem -LiteralPath $ruta | Sort-Object Name) {
        if ($item.PSIsContainer) { $archivos[$item.Name] = Nodo $item.FullName; continue }
        $bytes = [IO.File]::ReadAllBytes($item.FullName)
        $h = Hash $bytes
        $archivos[$item.Name] = [ordered]@{
            size = $bytes.Length; offset = [string]$script:offset
            integrity = [ordered]@{ algorithm = "SHA256"; hash = $h; blockSize = 4194304; blocks = @($h) }
        }
        $datos.Write($bytes, 0, $bytes.Length)
        $script:offset += $bytes.Length
    }
    return [ordered]@{ files = $archivos }
}

$raiz = [ordered]@{}
foreach ($n in $incluir) {
    $p = Join-Path $origen $n
    if ((Get-Item $p).PSIsContainer) { $raiz[$n] = Nodo $p }
    else {
        $bytes = [IO.File]::ReadAllBytes($p); $h = Hash $bytes
        $raiz[$n] = [ordered]@{ size = $bytes.Length; offset = [string]$offset
            integrity = [ordered]@{ algorithm = "SHA256"; hash = $h; blockSize = 4194304; blocks = @($h) } }
        $datos.Write($bytes, 0, $bytes.Length); $offset += $bytes.Length
    }
}

$json = [Text.Encoding]::UTF8.GetBytes((@{ files = $raiz } | ConvertTo-Json -Depth 50 -Compress))
$relleno = (4 - ($json.Length % 4)) % 4
$encabezado = 4 + 4 + $json.Length + $relleno          # pickle: tamaño + largo + texto + relleno

$salida = New-Object IO.MemoryStream
$w = New-Object IO.BinaryWriter($salida)
$w.Write([uint32]4); $w.Write([uint32]$encabezado)
$w.Write([uint32]($encabezado - 4)); $w.Write([uint32]$json.Length)
$w.Write($json); $w.Write((New-Object byte[] $relleno))
$w.Write($datos.ToArray()); $w.Flush()

if (Test-Path $destino) { Copy-Item $destino "$destino.anterior" -Force }
[IO.File]::WriteAllBytes($destino, $salida.ToArray())
Write-Host "Listo: $destino ($($salida.Length) bytes)"

# Si la app está instalada en la compu, se actualiza también la copia instalada
$instalada = Join-Path $env:LOCALAPPDATA "Programs\Alucast"
if (Test-Path (Join-Path $instalada "Alucast.exe")) {
    try {
        Copy-Item $destino (Join-Path $instalada "resources.neu") -Force
        Write-Host "Actualizada también la app instalada: $instalada"
    } catch {
        Write-Host "No se pudo actualizar la app instalada (¿está abierta?). Cerrala y volvé a correr este script."
    }
}
