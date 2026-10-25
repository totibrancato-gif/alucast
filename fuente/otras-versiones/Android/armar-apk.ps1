# =========================================================================
# Arma Android\Alucast.apk a partir de codigo-fuente (sin Android Studio).
# Usa las herramientas de Android\herramientas (Java + Android SDK).
# La firma (Android\firma\alucast.keystore) se crea la primera vez y NO hay que
# borrarla: las actualizaciones de la app tienen que firmarse con la misma.
# Uso: powershell -ExecutionPolicy Bypass -File .\Android\armar-apk.ps1
# =========================================================================
$ErrorActionPreference = "Stop"
$and = $PSScriptRoot
$raiz = Split-Path $and
$her = Join-Path $and "herramientas"
$bt = Join-Path $her "sdk\build-tools\34.0.0"
$jar = Join-Path $her "sdk\platforms\android-34\android.jar"
$env:JAVA_HOME = Join-Path $her "jdk"
$env:Path = (Join-Path $env:JAVA_HOME "bin") + ";" + $env:Path
$build = Join-Path $and "build"
$utf8 = New-Object Text.UTF8Encoding($false)
function Correr($exe, [string[]]$argumentos) {
  & $exe @argumentos
  if ($LASTEXITCODE) { throw "Falló: $exe $($argumentos -join ' ')" }
}

if (Test-Path $build) { Remove-Item -Recurse -Force $build }
New-Item -ItemType Directory -Force "$build\assets\www", "$build\res\drawable-nodpi", "$build\gen", "$build\obj", "$build\dex", "$build\apk" | Out-Null

# 1. La app (los mismos archivos que la versión de escritorio)
$res = Join-Path $raiz "codigo-fuente\resources"
Copy-Item -Recurse "$res\css", "$res\fonts" "$build\assets\www"
New-Item -ItemType Directory "$build\assets\www\js" | Out-Null
Get-ChildItem "$res\js" -Filter *.js | Where-Object Name -ne "neutralino.js" | ForEach-Object { Copy-Item $_.FullName "$build\assets\www\js" }
Copy-Item "$res\icon-512.png" "$build\assets\www"
$html = [IO.File]::ReadAllText("$res\index.html", $utf8).Replace("`r`n", "`n")
$html = [regex]::Replace($html, '(?m)^\s*<!-- Seguridad:[^\n]*\n\s*<meta http-equiv="Content-Security-Policy"[^\n]*\n', '')  # en Android no aplica (archivos locales)
$html = $html.Replace('<script src="js/neutralino.js"></script>' + "`n", '')
if ($html -match 'neutralino\.js|Content-Security-Policy') { throw "No se pudo adaptar index.html para Android" }
[IO.File]::WriteAllText("$build\assets\www\index.html", $html, $utf8)

# 2. Ícono
Copy-Item "$res\icon-512.png" "$build\res\drawable-nodpi\ic_launcher.png"

# 3. Recursos y manifest
$version = (Get-Date -Format "yyMMddHH")
Correr "$bt\aapt2.exe" @("compile", "--dir", "$build\res", "-o", "$build\res.zip")
Correr "$bt\aapt2.exe" @("link", "-o", "$build\base.apk", "-I", $jar, "--manifest", "$and\proyecto\AndroidManifest.xml",
  "-R", "$build\res.zip", "-A", "$build\assets", "--java", "$build\gen",
  "--min-sdk-version", "29", "--target-sdk-version", "34", "--version-code", $version, "--version-name", "1.0.$version")

# 4. Código Java → .dex
$fuentes = @(Get-ChildItem "$and\proyecto\src" -Recurse -Filter *.java | ForEach-Object FullName) + @(Get-ChildItem "$build\gen" -Recurse -Filter *.java | ForEach-Object FullName)
Correr "javac" (@("-source", "8", "-target", "8", "-bootclasspath", $jar, "-nowarn", "-Xlint:-options", "-d", "$build\obj") + $fuentes)
$clases = Get-ChildItem "$build\obj" -Recurse -Filter *.class | ForEach-Object FullName
Correr "$bt\d8.bat" (@("--release", "--min-api", "29", "--lib", $jar, "--output", "$build\dex") + $clases)

# 5. Armar el .apk (sin comprimir: Android lo exige para resources.arsc), alinear y firmar
Correr "tar.exe" @("-xf", "$build\base.apk", "-C", "$build\apk")
Copy-Item "$build\dex\classes.dex" "$build\apk"
Push-Location "$build\apk"; Correr "jar" @("cfM0", "$build\sin-alinear.apk", "."); Pop-Location
Correr "$bt\zipalign.exe" @("-p", "-f", "4", "$build\sin-alinear.apk", "$build\alineado.apk")

$firma = Join-Path $and "firma"
$ks = Join-Path $firma "alucast.keystore"
$claveArchivo = Join-Path $firma "clave.txt"
if (-not (Test-Path $ks)) {
  New-Item -ItemType Directory -Force $firma | Out-Null
  $clave = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
  [IO.File]::WriteAllText($claveArchivo, $clave, $utf8)
  Correr "keytool" @("-genkeypair", "-keystore", $ks, "-storepass", $clave, "-keypass", $clave, "-alias", "alucast",
    "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000", "-dname", "CN=Alucast, O=Alucast, C=UY")
}
$clave = [IO.File]::ReadAllText($claveArchivo, $utf8).Trim()
$salida = Join-Path $and "Alucast.apk"
Correr "$bt\apksigner.bat" @("sign", "--ks", $ks, "--ks-key-alias", "alucast", "--ks-pass", "pass:$clave", "--key-pass", "pass:$clave", "--out", $salida, "$build\alineado.apk")
Correr "$bt\apksigner.bat" @("verify", $salida)

Remove-Item -Recurse -Force $build
Write-Host ("Listo: {0} ({1:N1} MB, versión 1.0.{2})" -f $salida, ((Get-Item $salida).Length / 1MB), $version)
