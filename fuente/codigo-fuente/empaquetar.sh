#!/bin/bash
# =========================================================================
# Empaqueta la carpeta codigo-fuente en ../resources.neu (formato ASAR que
# usa Neutralino). Hace lo mismo que empaquetar.ps1, pero para la Mac (o Linux).
# Uso: bash codigo-fuente/empaquetar.sh
# Antes de reemplazar, guarda una copia del resources.neu anterior.
# =========================================================================
set -euo pipefail
aqui="$(cd "$(dirname "$0")" && pwd)"
destino="$(dirname "$aqui")/resources.neu"

if [ -f "$destino" ]; then cp "$destino" "$destino.anterior"; fi

# Solo se empaqueta lo que la app necesita (no este script ni otros archivos sueltos).
# Los archivos ocultos (.DS_Store y similares) quedan afuera, igual que en Windows.
perl -MJSON::PP -MDigest::SHA=sha256_hex -e '
  use strict;
  my ($origen, $destino) = @ARGV;
  my ($datos, $offset) = ("", 0);
  sub archivo {
    my ($p) = @_;
    open my $f, "<:raw", $p or die "$p: $!"; local $/; my $b = <$f>; close $f;
    my $h = sha256_hex($b);
    my $n = { size => length($b), offset => "$offset",
              integrity => { algorithm => "SHA256", hash => $h, blockSize => 4194304, blocks => [$h] } };
    $datos .= $b; $offset += length($b);
    return $n;
  }
  sub nodo {
    my ($ruta) = @_;
    opendir my $d, $ruta or die "$ruta: $!";
    my @items = sort grep { !/^\./ } readdir $d; closedir $d;
    my %archivos;
    for my $i (@items) { my $p = "$ruta/$i"; $archivos{$i} = -d $p ? nodo($p) : archivo($p); }
    return { files => \%archivos };
  }
  my %raiz = ("neutralino.config.json" => archivo("$origen/neutralino.config.json"));
  $raiz{resources} = nodo("$origen/resources");
  my $json = JSON::PP->new->canonical->utf8->encode({ files => \%raiz });
  my $relleno = (4 - length($json) % 4) % 4;
  my $encabezado = 4 + 4 + length($json) + $relleno;   # pickle: tamaño + largo + texto + relleno
  open my $o, ">:raw", $destino or die "$destino: $!";
  print $o pack("V4", 4, $encabezado, $encabezado - 4, length($json)), $json, "\0" x $relleno, $datos;
  close $o;
  print "Listo: $destino (", -s $destino, " bytes)\n";
' "$aqui" "$destino"
