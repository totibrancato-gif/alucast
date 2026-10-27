"use strict";
// =========================================================================
// PDF del presupuesto para el cliente.
// Se arma directamente como archivo PDF (con jsPDF, incluido en la app) y se
// guarda con la ventana "Guardar como…": funciona igual en Windows, Mac y la
// web, sin pasar por la impresora. No muestra costos internos ni mano de obra.
// =========================================================================

/** Mensaje de cierre que va en todos los presupuestos (PDF y WhatsApp). */
/** Se agrega después del precio final (pantalla, PDF y WhatsApp). */
const IVA_INC = ".- IVA Inc";
const MENSAJE_CIERRE ="Sin otro particular, esperando que esta información sea útil y ante cualquier duda no deje de consultarnos.";

// Colores del PDF (fijos: no dependen del modo oscuro)
const PDF_COL = {
  acento: [29, 90, 134], texto: [23, 33, 43], suave: [91, 105, 119],
  linea: [205, 213, 221], fondo: [238, 243, 248],
};

/** Nombre de archivo propuesto: "Presupuesto 2345 - Juan Pérez.pdf". */
function nombrePDF() {
  const cli = $("c-nombre").value.trim().replace(/[\\/:*?"<>|]/g, "");
  return `Presupuesto ${String(numero).padStart(4, "0")}${cli ? " - " + cli : ""}.pdf`;
}

/** Arma el PDF del presupuesto actual y devuelve el documento de jsPDF. */
function generarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 15, ANCHO = W - 2 * M, FIN = H - 18;
  const pc = preciosCliente(), c = cliente();
  const fecha = c.fecha || hoy();
  const validez = parseInt(EMP.validez) || 0;
  const negocio = (EMP.nombre || "").trim();
  const tel = (EMP.tel || "").trim(), dir = (EMP.dir || "").trim(), extra = (EMP.extra || "").trim();
  const specs = [...String(EMP.condiciones || "").split("\n"), ...especs.map(e => e.t)].map(s => s.trim()).filter(Boolean);
  const conUnitario = items.some(it => cantV(it) > 1);

  const color = (rgb, tipo = "text") => tipo === "text" ? doc.setTextColor(...rgb) : tipo === "fill" ? doc.setFillColor(...rgb) : doc.setDrawColor(...rgb);
  const fuente = (estilo, tam) => { doc.setFont("helvetica", estilo); doc.setFontSize(tam); };
  const etiqueta = (txt, x, yy, alinear) => { fuente("bold", 7.5); color(PDF_COL.suave); doc.text(txt.toUpperCase(), x, yy, { align: alinear, charSpace: 0.3 }); };
  let y = M;

  // ---- Encabezado: logo a la izquierda, negocio a la derecha ----
  fuente("bold", 26); color(PDF_COL.texto); doc.text("ALU", M, y + 9);
  color(PDF_COL.acento); doc.text("CAST", M + doc.getTextWidth("ALU"), y + 9);
  fuente("normal", 9); color(PDF_COL.suave); doc.text("Aberturas de aluminio", M, y + 15);
  if (negocio) { fuente("bold", 10.5); color(PDF_COL.texto); doc.text(negocio, W - M, y + 9, { align: "right" }); }
  if (extra) { fuente("normal", 9); color(PDF_COL.suave); doc.text(extra, W - M, y + 14, { align: "right" }); }
  y += 19;
  color(PDF_COL.acento, "draw"); doc.setLineWidth(0.9); doc.line(M, y, W - M, y);

  // ---- Título, número y fecha ----
  y += 11;
  fuente("bold", 17); color(PDF_COL.texto); doc.text("PRESUPUESTO", M, y);
  fuente("normal", 10); color(PDF_COL.texto); doc.text(`Fecha: ${dmy(fecha)}`, W - M, y, { align: "right" });
  y += 6.5;
  fuente("bold", 12); color(PDF_COL.acento); doc.text(nro(numero), M, y);

  // ---- Cliente ----
  y += 6;
  color(PDF_COL.linea, "draw"); doc.setLineWidth(0.3); doc.roundedRect(M, y, ANCHO, 14, 1.2, 1.2);
  etiqueta("Cliente", M + 4, y + 5);
  fuente("bold", 10.5); color(PDF_COL.texto);
  const nomCli = c.nombre.trim() || "-";
  doc.text(nomCli, M + 4, y + 10.5);
  if (c.tel.trim()) { const x = M + 4 + doc.getTextWidth(nomCli); fuente("normal", 10.5); doc.text(`  ·  Tel. ${c.tel.trim()}`, x, y + 10.5); }
  y += 21;

  // ---- Tabla de ventanas ----
  const colNum = M + 2, colImp = W - M - 2;
  const colUni = conUnitario ? colImp - 32 : null;
  const colCant = (conUnitario ? colUni : colImp) - 28;
  const anchoDesc = colCant - 14 - (M + 10);
  const cabecera = () => {
    color(PDF_COL.fondo, "fill"); doc.rect(M, y - 5, ANCHO, 8, "F");
    etiqueta("#", colNum, y); etiqueta("Descripción", M + 10, y);
    etiqueta("Cant.", colCant, y, "right");
    if (conUnitario) etiqueta("P. unitario", colUni, y, "right");
    etiqueta(conUnitario ? "Total" : "Importe", colImp, y, "right");
    color(PDF_COL.texto, "draw"); doc.setLineWidth(0.5); doc.line(M, y + 3, W - M, y + 3);
    y += 9;
  };
  const nuevaPagina = () => { doc.addPage(); y = M + 8; cabecera(); };
  cabecera();

  items.forEach((it, i) => {
    const k = cantV(it);
    const vidrio = (+it.vid?.cant && it.vid?.tipo) ? `vidrio ${it.vid.tipo}` : "";
    const mosquitero = conMosquitero(it) ? "con mosquitero" : "";
    const detalle = [`Línea ${it.linea}`, `acabado ${it.acabado.toLowerCase()}`, mosquitero, vidrio, medidas(it)].filter(Boolean).join(" · ");
    fuente("normal", 8.2);
    const lineasDet = doc.splitTextToSize(detalle, anchoDesc);
    fuente("bold", 10);
    const lineasNom = doc.splitTextToSize(it.nombre || `Ventana ${i + 1}`, anchoDesc);
    const alto = lineasNom.length * 4.6 + lineasDet.length * 3.8 + 3;
    if (y + alto > FIN) nuevaPagina();

    fuente("normal", 9.5); color(PDF_COL.suave); doc.text(String(i + 1), colNum, y);
    fuente("bold", 10); color(PDF_COL.texto); doc.text(lineasNom, M + 10, y);
    fuente("normal", 8.2); color(PDF_COL.suave); doc.text(lineasDet, M + 10, y + lineasNom.length * 4.6 - 0.6);
    fuente("normal", 10); color(PDF_COL.texto);
    doc.text(String(k), colCant, y, { align: "right" });
    if (conUnitario) doc.text(dinero(pc.out[i] / k, pc.moneda), colUni, y, { align: "right" });
    doc.text(dinero(pc.out[i], pc.moneda), colImp, y, { align: "right" });
    y += alto;
    color(PDF_COL.linea, "draw"); doc.setLineWidth(0.25); doc.line(M, y - 2.5, W - M, y - 2.5);
    y += 3;
  });

  // ---- Total ----
  if (y + 16 > FIN) { doc.addPage(); y = M + 8; }
  const anchoTot = 96, xTot = W - M - anchoTot;
  color(PDF_COL.fondo, "fill"); doc.rect(xTot, y, anchoTot, 13, "F");
  color(PDF_COL.acento, "draw"); doc.setLineWidth(0.9); doc.line(xTot, y, W - M, y);
  etiqueta("Total", xTot + 5, y + 8.3);
  fuente("bold", 15); color(PDF_COL.texto); doc.text(dinero(pc.total, pc.moneda) + IVA_INC, W - M - 5, y + 8.8, { align: "right" });
  y += 22;

  // ---- Especificaciones, validez y cierre ----
  const bloque = (lineas, alto) => { if (y + lineas * alto > FIN) { doc.addPage(); y = M + 8; } };
  if (specs.length) {
    bloque(2, 5); etiqueta("Especificaciones", M, y); y += 5.5;
    specs.forEach(s => {
      fuente("normal", 9.5); const ls = doc.splitTextToSize(s, ANCHO - 6);
      bloque(ls.length, 4.6);
      color(PDF_COL.texto, "fill"); doc.circle(M + 1.3, y - 1.2, 0.6, "F");
      color(PDF_COL.texto); doc.text(ls, M + 5, y);
      y += ls.length * 4.6 + 0.8;
    });
    y += 2;
  }
  bloque(2, 5);
  fuente("normal", 9.5); color(PDF_COL.suave);
  doc.text(`Importes en ${pc.moneda === "USD" ? "dólares estadounidenses (U$S)" : "pesos uruguayos"}.${validez ? ` Presupuesto válido por ${validez} días.` : ""}`, M, y);
  y += 8;
  fuente("italic", 10); color(PDF_COL.texto);
  const cierre = doc.splitTextToSize(MENSAJE_CIERRE, ANCHO);
  bloque(cierre.length, 5); doc.text(cierre, M, y); y += cierre.length * 5 + 8;

  // ---- Contacto ----
  if (tel || dir) {
    if (y + 20 > FIN) { doc.addPage(); y = M + 8; }
    color(PDF_COL.fondo, "fill"); doc.rect(M, y, ANCHO, 18, "F");
    color(PDF_COL.acento, "fill"); doc.rect(M, y, 1, 18, "F");
    fuente("bold", 7.5); color(PDF_COL.texto); doc.text("CONTACTO", M + 5, y + 5.5, { charSpace: 0.3 });
    let x = M + 5;
    [["Teléfono", tel], ["Dirección", dir]].filter(([, v]) => v).forEach(([et, v]) => {
      fuente("normal", 7.5); color(PDF_COL.suave); doc.text(et, x, y + 10);
      fuente("bold", 11); color(PDF_COL.texto); doc.text(v, x, y + 15);
      x += Math.max(doc.getTextWidth(v), 20) + 12;
    });
    y += 18;
  }

  // ---- Pie (en cada hoja) ----
  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    color(PDF_COL.linea, "draw"); doc.setLineWidth(0.25); doc.line(M, H - 12, W - M, H - 12);
    fuente("normal", 8); color(PDF_COL.suave);
    doc.text(`Gracias por su consulta${negocio ? " · " + negocio : ""}`, W / 2, H - 7.5, { align: "center" });
    if (paginas > 1) doc.text(`${p} / ${paginas}`, W - M, H - 7.5, { align: "right" });
  }
  return doc;
}

/** Texto corto de un error para mostrarlo en pantalla. */
const textoError = e => [e?.code, e?.message].filter(Boolean).join(": ") || String(e);

let guardandoPDF = false;
$("btn-pdf").onclick = async () => {
  if (guardandoPDF) return; // evita guardar dos veces si se toca dos veces
  if (!items.length) { toast("Agregá al menos una ventana"); return; }
  if (!window.jspdf) { toast("No se pudo cargar el generador de PDF"); return; }
  toast("Armando el PDF…");
  let doc;
  try { doc = generarPDF(); }
  catch (e) { console.error(e); toast("No se pudo armar el PDF (" + textoError(e) + ")"); return; }

  const nombre = nombrePDF();
  // App de escritorio: en Mac se guarda en Descargas; en Windows con "Guardar como…"
  if (window.alucast?.guardarPDF) {
    guardandoPDF = true;
    try {
      const ruta = await window.alucast.guardarPDF(nombre, doc.output("arraybuffer"));
      const enDescargas = window.NL_OS === "Darwin" || window.alucast.destino === "descargas";
      if (ruta) toast((enDescargas ? "PDF guardado en Descargas: " : "PDF guardado: ") + ruta.split(/[\\/]/).pop());
      else toast("No se guardó el PDF");
    } catch (e) {
      console.error(e);
      toast("No se pudo guardar el PDF (" + textoError(e) + "). Cerrá Alucast, abrilo de nuevo y probá otra vez.");
    } finally {
      guardandoPDF = false;
    }
    return;
  }
  // Navegador (versión web): se descarga el archivo
  doc.save(nombre);
  toast("PDF descargado: " + nombre);
};
