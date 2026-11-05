#!/bin/bash
# =========================================================================
# Arma ../Prueba/alucast-prueba.html: la app entera en un solo archivo para
# publicarla como link de prueba (Artifact de Claude). Hace lo mismo que
# armar-prueba.ps1, pero para la Mac, y además:
# - No lleva la nube: el link no pide usuario y no toca los datos de nadie.
# - Opcional: un .json con datos para arrancar (lista de precios, presupuesto
#   abierto...). Se cargan solo si ese navegador todavía no tiene nada.
# Uso: bash codigo-fuente/armar-prueba.sh [datos-iniciales.json]
# =========================================================================
set -euo pipefail
aqui="$(cd "$(dirname "$0")" && pwd)"
destino="$(dirname "$aqui")/Prueba"
mkdir -p "$destino"

perl -MJSON::PP -e '
  use strict;
  my ($origen, $salida, $datos) = @ARGV;
  sub leer { open my $f, "<:raw", $_[0] or die "$_[0]: $!"; local $/; my $t = <$f>; $t =~ s/\r\n/\n/g; $t }
  my $html = leer("$origen/index.html");
  my $ini = index($html, "<body>") + length("<body>");
  my $fin = index($html, q{<script src="js/});
  my $cuerpo = substr($html, $ini, $fin - $ini);
  $cuerpo =~ s/^\s+|\s+$//g;
  # En el link no va la nube; jsPDF se carga de cdnjs (el PDF se baja con el permiso "downloads" del link)
  my @scripts = grep { !/^(neutralino|nube)\.js$/ } ($html =~ /<script src="js\/([^"]+)"><\/script>/g);
  $cuerpo =~ s{<div class="wrap">}{<div class="wrap">\n  <p class="aviso-prueba"><b>Versión de prueba.</b> Lo que cargues acá se guarda aparte de tu app. La copia de seguridad solo funciona en la app.</p>};

  my $css = leer("$origen/css/estilos.css");
  $css =~ s/^\@font-face[^\n]*\n//mg;
  $css .= <<"FIN";

/* ---- Solo en el link de prueba ---- */
.wrap { padding-block: 20px 48px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
.cajon { padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-top: calc(18px + env(safe-area-inset-top, 0px)); padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px)); }
.toast { top: calc(16px + env(safe-area-inset-top, 0px)); }
.aviso-prueba { margin: 0 0 14px; padding: 10px 14px; border: 1px solid var(--danger); border-radius: 6px; background: var(--danger-soft); color: var(--fg); font-size: .9rem; }
section:has(#nube-email) { display: none; } /* sin nube en el link */
FIN

  my $s = qq{<title>Alucast Prueba</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n}
    . qq{<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n}
    . qq{<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght\@75..100,500..800&family=Barlow:wght\@400;500;600&display=swap">\n}
    . "<style>\n$css</style>\n$cuerpo\n";
  if ($datos) {
    # Datos para arrancar: solo si este navegador todavía no tiene nada de Alucast
    my $j = JSON::PP->new->canonical->ascii->encode(decode_json(leer($datos)));
    die "los datos contienen </script" if $j =~ m{</script}i;
    $s .= "<script>/* datos iniciales del link de prueba */\n(function () {\n  try {\n"
       . "    if (localStorage.getItem(\"alucast-borrador-v5\")) return;\n"
       . "    const d = $j;\n    Object.keys(d).forEach(k => localStorage.setItem(k, JSON.stringify(d[k])));\n"
       . "  } catch (e) { /* sin acceso al guardado: arranca vacío */ }\n})();\n</script>\n";
  }
  for my $f (@scripts) {
    if ($f eq "jspdf.umd.min.js") {
      $s .= qq{<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>\n};
      next;
    }
    my $js = leer("$origen/js/$f");
    die "$f contiene </script" if $js =~ m{</script}i;
    $js .= "\n" unless $js =~ /\n\z/;
    $s .= "<script>/* $f */\n$js</script>\n";
  }
  $s .= <<\FIN;
<script>/* solo en el link de prueba */
// El PDF se baja con el permiso "downloads" del link (el link pide confirmación antes de guardar)
const descargas = window.claude?.use ? window.claude.use("downloads").catch(() => null) : Promise.resolve(null);
$("btn-pdf").onclick = async () => {
  if (!items.length) { toast("Agregá al menos una ventana"); return; }
  if (!window.jspdf) { toast("No se pudo cargar el generador de PDF. Revisá la conexión y recargá."); return; }
  const d = await descargas;
  if (!d) { toast("En este link no se puede descargar el PDF."); return; }
  let doc;
  try { doc = generarPDF(); } catch (e) { console.error(e); toast("No se pudo armar el PDF"); return; }
  try {
    await d.save({ filename: nombrePDF(), data: new Blob([doc.output("arraybuffer")]) });
    toast("PDF descargado: " + nombrePDF());
  } catch (e) {
    if (e?.code === "declined") return;
    toast(e?.code === "rate_limited" ? "Esperá un momento y probá de nuevo" : "No se pudo descargar el PDF (" + (e?.code || e) + ")");
  }
};
$("bk-exp").onclick = () => toast("En el link de prueba no se puede exportar la copia. Usalo desde la app.");
</script>
FIN
  open my $o, ">:raw", $salida or die; print $o $s; close $o;
  printf "Listo: %s (%d KB, %d scripts)\n", $salida, (-s $salida) / 1024, scalar @scripts;
' "$aqui/resources" "$destino/alucast-prueba.html" "${1:-}"
