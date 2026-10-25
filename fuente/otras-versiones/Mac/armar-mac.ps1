# =========================================================================
# Arma Mac\Alucast-Mac.zip con el resources.neu actual.
# Reutiliza el motor de Mac que ya está dentro del zip (no descarga nada).
# Uso: powershell -ExecutionPolicy Bypass -File .\Mac\armar-mac.ps1
# =========================================================================
$ErrorActionPreference = "Stop"
$mac = $PSScriptRoot
$raiz = Split-Path $mac
$zip = Join-Path $mac "Alucast-Mac.zip"
$tmp = Join-Path $env:TEMP "alucast-mac-$(Get-Random)"
New-Item -ItemType Directory $tmp | Out-Null

try {
    # 1. Sacar el app del zip anterior y poner el resources.neu nuevo
    & tar.exe -xf $zip -C $tmp
    if ($LASTEXITCODE) { throw "No se pudo abrir $zip" }
    $contents = Join-Path $tmp "Alucast.app\Contents"
    Copy-Item (Join-Path $raiz "resources.neu") "$contents\MacOS\resources.neu" -Force
    Copy-Item (Join-Path $raiz "resources.neu") "$contents\Resources\resources.neu" -Force
    Copy-Item (Join-Path $mac "LEEME-MAC.txt") (Join-Path $tmp "LEEME-MAC.txt") -Force

    # 2. Lista de archivos con sus permisos de Mac (el programa tiene que ser ejecutable)
    $lineas = @(
        "#mtree",
        "Alucast.app/Contents type=dir mode=0755",
        "Alucast.app/Contents/MacOS type=dir mode=0755",
        "Alucast.app/Contents/Resources type=dir mode=0755"
    )
    foreach ($f in "Info.plist", "PkgInfo", "MacOS/resources.neu", "Resources/resources.neu", "Resources/Alucast.icns") {
        $lineas += "Alucast.app/Contents/$f type=file mode=0644 contents=Alucast.app/Contents/$f"
    }
    $lineas += "Alucast.app/Contents/MacOS/Alucast type=file mode=0755 contents=Alucast.app/Contents/MacOS/Alucast"
    $lineas += "LEEME-MAC.txt type=file mode=0644 contents=LEEME-MAC.txt"
    [IO.File]::WriteAllText("$tmp\spec.mtree", ($lineas -join "`n") + "`n", (New-Object Text.UTF8Encoding($false)))

    # 3. Armar el zip nuevo
    $nuevo = Join-Path $tmp "nuevo.zip"
    Push-Location $tmp
    & tar.exe --format zip -cf $nuevo "@spec.mtree"
    $codigo = $LASTEXITCODE
    Pop-Location
    if ($codigo) { throw "No se pudo armar el zip" }
    Copy-Item $nuevo $zip -Force
    Write-Host "Listo: $zip ($((Get-Item $zip).Length) bytes)"
}
finally {
    Remove-Item -Recurse -Force $tmp
}
