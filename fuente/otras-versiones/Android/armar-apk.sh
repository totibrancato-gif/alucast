#!/bin/bash
# =========================================================================
# Arma Android/Alucast.apk a partir de codigo-fuente (sin Android Studio).
# Hace lo mismo que armar-apk.ps1, pero para la Mac.
# Usa Java y el Android SDK de ~/.local/share/alucast-android (jdk/ y sdk/),
# o de la carpeta que diga la variable ALUCAST_ANDROID.
# La firma (Android/firma/alucast.keystore y clave.txt) es la MISMA de la PC:
# hay que copiarla antes. Este script no crea una firma nueva, porque con otra
# firma la tablet no deja actualizar la app instalada.
# Uso: bash otras-versiones/Android/armar-apk.sh
# =========================================================================
set -euo pipefail
and="$(cd "$(dirname "$0")" && pwd)"
raiz="$(dirname "$(dirname "$and")")"
her="${ALUCAST_ANDROID:-$HOME/.local/share/alucast-android}"
bt="$her/sdk/build-tools/34.0.0"
jar="$her/sdk/platforms/android-34/android.jar"
export JAVA_HOME="$her/jdk/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
firma="${ALUCAST_FIRMA:-$and/firma}"
ks="$firma/alucast.keystore"
claveArchivo="$firma/clave.txt"
build="$and/build"

for f in "$bt/aapt2" "$bt/d8" "$bt/zipalign" "$bt/apksigner" "$jar" "$JAVA_HOME/bin/javac"; do
  [ -e "$f" ] || { echo "Falta $f (herramientas de Android)" >&2; exit 1; }
done
[ -f "$ks" ] && [ -f "$claveArchivo" ] || {
  echo "Falta la firma en $firma (alucast.keystore y clave.txt). Copiala de la PC." >&2; exit 1; }

rm -rf "$build"
mkdir -p "$build/assets/www/js" "$build/res/drawable-nodpi" "$build/gen" "$build/obj" "$build/dex" "$build/apk"

# 1. La app (los mismos archivos que la versión de escritorio)
res="$raiz/codigo-fuente/resources"
cp -R "$res/css" "$res/fonts" "$build/assets/www/"
for f in "$res"/js/*.js; do [ "$(basename "$f")" = neutralino.js ] || cp "$f" "$build/assets/www/js/"; done
cp "$res/icon-512.png" "$build/assets/www/"
# En Android no aplica la política de seguridad (archivos locales) ni neutralino.js
perl -0pe 's/\r\n/\n/g; s/^[ \t]*<!-- Seguridad:[^\n]*\n[ \t]*<meta http-equiv="Content-Security-Policy"[^\n]*\n//m; s{<script src="js/neutralino.js"></script>\n}{}' \
  "$res/index.html" > "$build/assets/www/index.html"
if grep -Eq 'neutralino\.js|Content-Security-Policy' "$build/assets/www/index.html"; then
  echo "No se pudo adaptar index.html para Android" >&2; exit 1
fi

# 2. Ícono
cp "$res/icon-512.png" "$build/res/drawable-nodpi/ic_launcher.png"

# 3. Recursos y manifest
version="$(date +%y%m%d%H)"
"$bt/aapt2" compile --dir "$build/res" -o "$build/res.zip"
"$bt/aapt2" link -o "$build/base.apk" -I "$jar" --manifest "$and/proyecto/AndroidManifest.xml" \
  -R "$build/res.zip" -A "$build/assets" --java "$build/gen" \
  --min-sdk-version 29 --target-sdk-version 34 --version-code "$version" --version-name "1.0.$version"

# 4. Código Java → .dex
find "$and/proyecto/src" "$build/gen" -name '*.java' > "$build/fuentes.txt"
javac -source 8 -target 8 -bootclasspath "$jar" -nowarn -Xlint:-options -d "$build/obj" @"$build/fuentes.txt"
find "$build/obj" -name '*.class' > "$build/clases.txt"
"$bt/d8" --release --min-api 29 --lib "$jar" --output "$build/dex" $(cat "$build/clases.txt")

# 5. Armar el .apk (sin comprimir: Android lo exige para resources.arsc), alinear y firmar
(cd "$build/apk" && unzip -q "$build/base.apk")
cp "$build/dex/classes.dex" "$build/apk/"
(cd "$build/apk" && jar cfM0 "$build/sin-alinear.apk" .)
"$bt/zipalign" -p -f 4 "$build/sin-alinear.apk" "$build/alineado.apk"

clave="$(perl -0pe 's/^\x{EF}\x{BB}\x{BF}//; s/\s+//g' "$claveArchivo")"  # sin BOM ni saltos de línea
salida="$and/Alucast.apk"
"$bt/apksigner" sign --ks "$ks" --ks-key-alias alucast --ks-pass "pass:$clave" --key-pass "pass:$clave" \
  --out "$salida" "$build/alineado.apk"
"$bt/apksigner" verify "$salida"

rm -rf "$build"
echo "Listo: $salida ($(( $(stat -f %z "$salida") / 1024 )) KB, versión 1.0.$version)"
