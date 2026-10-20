"use strict";
// =========================================================================
// PDF del presupuesto para el cliente.
// Arma una hoja A4 con tus datos, el cliente, las ventanas y el total, y
// abre el diálogo de impresión, donde se elige "Guardar como PDF" (o
// "Microsoft Print to PDF"). No muestra costos internos ni mano de obra.
// =========================================================================

function armarHoja() {
  const pc = preciosCliente();
  const c = cliente();
  const fecha = c.fecha || hoy();
  const validez = parseInt(EMP.validez) || 0;

  // Arriba va el nombre (y email/RUT si hay); teléfono y dirección van en el bloque de contacto de abajo
  const datosEmpresa = [EMP.extra].filter(s => s && s.trim()).map(esc).join("<br>");
  const tel = (EMP.tel || "").trim(), dir = (EMP.dir || "").trim();
  const contacto = [tel ? `<span><small>Teléfono</small>${esc(tel)}</span>` : "", dir ? `<span><small>Dirección</small>${esc(dir)}</span>` : ""].join("");
  const nombreNegocio = (EMP.nombre || "").trim();
  const condiciones = (EMP.condiciones || "").trim();

  const filas = items.map((it, i) => {
    const med = medidas(it);
    const vidrio = (+it.vid?.cant && it.vid?.tipo) ? `vidrio ${esc(it.vid.tipo)}` : "";
    const detalle = [`Línea ${esc(it.linea)}`, `acabado ${esc(it.acabado.toLowerCase())}`, vidrio, med].filter(Boolean).join(" · ");
    return `<tr>
      <td>${i + 1}</td>
      <td><b>${esc(it.nombre)}</b><div class="d">${detalle}</div></td>
      <td class="n">${cantV(it)}</td>
      <td class="n">${pes(pc.out[i])}</td>
    </tr>`;
  }).join("");

  $("hoja").innerHTML = `
    <div class="hoja-cab">
      <div>
        <div class="logo">Alu<span>cast</span></div>
        <div class="sub">Aberturas de aluminio</div>
      </div>
      <div class="hoja-empresa">${nombreNegocio ? `<b>${esc(nombreNegocio)}</b><br>` : ""}${datosEmpresa}</div>
    </div>

    <div class="hoja-titulo">
      <div><h1>Presupuesto</h1><div class="num">${nro(numero)}</div></div>
      <div class="hoja-fechas">
        Fecha: <b>${dmy(fecha)}</b>
        ${validez ? `<br>Válido hasta: <b>${dmy(sumarDias(fecha, validez))}</b>` : ""}
      </div>
    </div>

    <div class="hoja-cliente">
      <span class="et">Cliente</span>
      <b>${esc(c.nombre || "—")}</b>${c.tel ? ` · Tel. ${esc(c.tel)}` : ""}
    </div>

    <table>
      <thead><tr><th>#</th><th>Descripción</th><th class="n">Cant.</th><th class="n">Importe</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>

    <div class="hoja-total"><div><small>Total</small><span>${pes(pc.total)}</span></div></div>

    <div class="hoja-cond">
      <b>Condiciones</b>
      ${condiciones ? `<p>${esc(condiciones)}</p>` : ""}
      <p>Importes en pesos uruguayos.${validez ? ` Presupuesto válido por ${validez} días.` : ""}</p>
    </div>

    ${contacto ? `<div class="hoja-contacto"><b>Contacto</b><div>${contacto}</div></div>` : ""}

    <div class="hoja-pie">Gracias por su consulta${nombreNegocio ? " · " + esc(nombreNegocio) : ""}</div>`;
}

$("btn-pdf").onclick = () => {
  if (!items.length) { toast("Agregá al menos una ventana"); return; }
  armarHoja();

  // El título de la página es el nombre que propone el diálogo para el archivo.
  const tituloOriginal = document.title;
  const cli = $("c-nombre").value.trim().replace(/[\\/:*?"<>|]/g, "");
  document.title = `Presupuesto ${String(numero).padStart(4, "0")}${cli ? " - " + cli : ""}`;
  window.addEventListener("afterprint", () => { document.title = tituloOriginal; }, { once: true });

  toast('Elegí "Guardar como PDF" en la impresora');
  setTimeout(() => window.print(), 50);
};
