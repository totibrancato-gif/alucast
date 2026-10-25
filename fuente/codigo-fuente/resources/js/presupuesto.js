"use strict";
// =========================================================================
// Panel "Presupuesto": lista de ventanas, mano de obra y extras, totales,
// guardar, copiar para WhatsApp y empezar uno nuevo.
// =========================================================================

const cliente = () => ({ nombre: $("c-nombre").value, tel: $("c-tel").value, fecha: $("c-fecha").value });
const fechaTxt = () => dmy($("c-fecha").value);

/**
 * Extras generales del presupuesto. Ahora la mano de obra va en cada ventana;
 * esto solo aparece en presupuestos viejos que tenían montos cargados.
 */
function renderExtras() {
  const hay = extras.some(x => numPesos(x.monto));
  $("extras-viejos").hidden = !hay;
  if (!hay) extras = [];
  $("extras").innerHTML = extras.map((x, i) => `<div class="extra-row">
      <input data-ex="${i}" data-f="c" value="${esc(x.c)}" placeholder="Concepto" aria-label="Concepto del extra ${i + 1}">
      <input data-ex="${i}" data-f="monto" data-pesos type="text" inputmode="decimal" autocomplete="off" value="${esc(x.monto)}" placeholder="$" aria-label="Monto del extra ${i + 1} en pesos">
      <button class="x" data-exdel="${i}" aria-label="Quitar extra ${i + 1}">×</button>
    </div>`).join("");
}

/** Especificaciones de este presupuesto: una fila por cada una (salen en el PDF). */
function renderEspecs() {
  $("especs").innerHTML = especs.map((e, i) => `<div class="espec-row">
      <input data-esp="${i}" value="${esc(e.t)}" placeholder="Ej: Vidrio incoloro 4 mm · Entrega en 20 días hábiles" aria-label="Especificación ${i + 1}">
      <button class="x" data-espdel="${i}" aria-label="Quitar especificación ${i + 1}">×</button>
    </div>`).join("");
}

/** Detalle de una ventana para mostrar: "2 × Dormitorio · 1,20 × 1,00 m". */
function medidas(it) {
  return (+it.ancho && +it.alto) ? `${num(+it.ancho)} × ${num(+it.alto)} m` : "";
}

function render() {
  $("q-num").textContent = nro(numero);
  $("q-fecha").textContent = fechaTxt();
  $("q-cli").textContent = $("c-nombre").value || "Cliente sin nombre";

  const pc = preciosCliente();
  $("items").innerHTML = items.length ? items.map((it, i) => {
    const c = calc(it);
    const det = it.alu.filter(l => +l.m).map(l => `${esc(l.n.toLowerCase())} ${num(+l.m)} m`).join(" · ");
    const med = medidas(it);
    return `<tr>
      <td>${i + 1}</td>
      <td><b>${c.k} ×</b> ${esc(it.nombre)}${med ? " · " + med : ""}<span class="chip">${esc(it.linea)}</span><span class="chip">${esc(it.acabado)}</span>
        <div class="d">${num(c.kg, 2)} kg aluminio${c.porUnidad ? (c.unidades ? ` · ${num(c.unidades, 0)} unid. ${esc(it.vid.tipo)}` : "") : (c.m2 ? ` · ${num(c.m2)} m² vidrio${it.vid?.tipo ? " " + esc(it.vid.tipo) : ""}` : "")}${(c.mo || c.ex) ? ` · M. de obra y extras ${pes(c.mo + c.ex)}` : ""}</div>
        ${det ? `<div class="d">Por ventana: ${det}</div>` : ""}</td>
      <td class="n">${dinero(pc.out[i], pc.moneda)}</td>
      <td class="acciones"><button class="btn ghost sm" data-edit="${i}" aria-label="Editar ventana ${i + 1}">Editar</button><button class="x" data-del="${i}" aria-label="Quitar ventana ${i + 1}">×</button></td>
    </tr>`;
  }).join("")
    : `<tr><td colspan="4" class="empty">Todavía no hay ventanas. Cargá los metros a la izquierda y tocá "Guardar ventana en el presupuesto".</td></tr>`;

  const t = totals(), enPesos = preciosCliente("UYU").total;
  // Botones "Precio en: $ Pesos / U$S Dólares"
  document.querySelectorAll("#q-moneda [data-qmoneda]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.qmoneda === monedaPres)));
  $("totales").innerHTML = `<div class="grand"><span>Precio final</span><span>${dinero(pc.total, pc.moneda)}${IVA_INC}</span></div>` +
    (pc.moneda === "USD" ? `<div class="chico"><span>Equivale a ${pes(enPesos)} con el dólar a $ ${num(P.dolar)}</span></div>` : "");
  const sm = items.reduce((a, it) => { const c = calc(it); a.mat += c.mat; a.mo += c.mo; a.ex += c.ex; return a; }, { mat: 0, mo: 0, ex: 0 });
  $("interno").innerHTML = `
    <div><span>Materiales (aluminio, accesorios, vidrio)</span><span>${pes(sm.mat)}</span></div>
    <div><span>Mano de obra</span><span>${pes(sm.mo)}</span></div>
    <div><span>Extras</span><span>${pes(sm.ex + t.e)}</span></div>
    <div class="grand"><span>Precio final</span><span>${pes(enPesos)}</span></div>
    ${pc.moneda === "USD" ? `<div><span>Al cliente en dólares</span><span>${dinero(pc.total, "USD")}</span></div>` : ""}
    <div class="chico">Dólar a $ ${num(P.dolar)}</div>`;
  saveDraft();
}

function saveDraft() {
  const c = cliente();
  save(CLAVES.borrador, { items, extras, especs, monedaPres, F, editIdx, numero, cli: [c.nombre, c.tel, c.fecha] });
}

/** Lo que se guarda en "Guardados" para este presupuesto. */
function datosPresupuesto() {
  const c = cliente();
  return { num: numero, cli: c.nombre, tel: c.tel, fecha: c.fecha, fechaTxt: fechaTxt(),
           items: structuredClone(items), extras: structuredClone(extras),
           especs: especs.filter(e => e.t.trim()).map(e => ({ t: e.t.trim() })), total: totals().total,
           moneda: monedaPres, dolar: +P.dolar };
}

/** true si lo que está en pantalla es igual a lo último que se guardó. */
function estaGuardado() {
  const q = historial().find(x => x.num === numero);
  if (!q) return false;
  const a = normalizarPresupuesto(datosPresupuesto()); // mismo formato que lo guardado
  return ["cli", "tel", "fecha", "items", "extras", "especs", "moneda"].every(k => JSON.stringify(q[k] ?? "") === JSON.stringify(a[k] ?? ""));
}

function textoWhatsApp() {
  const pc = preciosCliente();
  let s = `*${(EMP.nombre || "Alucast").toUpperCase()} · Presupuesto ${nro(numero)}*\n${fechaTxt()}\nCliente: ${$("c-nombre").value || "-"}\n\n`;
  items.forEach((it, i) => {
    const med = medidas(it).replace(" × ", "x"), k = cantV(it);
    const d = n => dinero(n, pc.moneda);
    const precio = k > 1 ? `${d(pc.out[i] / k)} c/u = ${d(pc.out[i])}` : d(pc.out[i]);
    s += `${i + 1}. ${k} x ${it.nombre}${med ? " " + med : ""} (${it.linea}, ${it.acabado.toLowerCase()}): ${precio}\n`;
  });
  s += `\n*PRECIO FINAL: ${dinero(pc.total, pc.moneda)}${IVA_INC}*`;
  const specs = [...String(EMP.condiciones || "").split("\n"), ...especs.map(e => e.t)].map(x => x.trim()).filter(Boolean);
  if (specs.length) s += `\n\n*Especificaciones*\n${specs.map(x => "• " + x).join("\n")}`;
  return s + `\n\n${MENSAJE_CIERRE}`;
}

// ---- Eventos ----
$("cliente").addEventListener("input", render);

// Moneda del precio final (pesos o dólares)
$("q-moneda").addEventListener("click", e => {
  const m = e.target.dataset.qmoneda;
  if (!m || m === monedaPres) return;
  monedaPres = m;
  render();
  toast(m === "USD" ? "Precio en dólares" : "Precio en pesos");
});

// Especificaciones
$("especs").addEventListener("input", e => {
  const i = e.target.dataset.esp;
  if (i !== undefined) { especs[+i].t = e.target.value; saveDraft(); }
});
$("especs").addEventListener("keydown", e => {
  // Enter en una especificación agrega la siguiente
  if (e.key === "Enter" && e.target.dataset.esp !== undefined) { e.preventDefault(); $("add-espec").click(); }
});
$("especs").onclick = e => {
  const i = e.target.dataset.espdel;
  if (i === undefined) return;
  especs.splice(+i, 1);
  renderEspecs();
  saveDraft();
  ($("especs").querySelector(`[data-esp="${Math.min(+i, especs.length - 1)}"]`) || $("add-espec")).focus();
};
$("add-espec").onclick = () => {
  especs.push({ t: "" });
  renderEspecs();
  saveDraft();
  $("especs").querySelector(".espec-row:last-child input")?.focus();
};

$("extras").addEventListener("input", e => {
  const d = e.target.dataset;
  if (d.ex !== undefined) { extras[+d.ex][d.f] = e.target.value; render(); }
});
$("extras").onclick = e => {
  const i = e.target.dataset.exdel;
  if (i !== undefined) { extras.splice(+i, 1); renderExtras(); render(); }
};

$("items").onclick = e => {
  const d = e.target.dataset;
  if (d.del !== undefined) {
    const i = +d.del;
    items.splice(i, 1);
    // Si se estaba editando esa ventana, se cancela; si era una posterior, se corre el índice.
    if (editIdx === i) { editIdx = -1; F = blank(); renderForm(); }
    else if (editIdx > i) { editIdx--; renderForm(); }
    render();
    // El foco pasa a la ventana que quedó en ese lugar (o al formulario si no quedan).
    ($("items").querySelector(`[data-del="${Math.min(i, items.length - 1)}"]`) || $("v-nombre")).focus();
  }
  if (d.edit !== undefined) {
    editIdx = +d.edit;
    F = structuredClone(items[editIdx]);
    renderForm();
    $("v-titulo").scrollIntoView({ behavior: "smooth", block: "start" });
    $("v-nombre").focus({ preventScroll: true });
  }
};

$("btn-guardar").onclick = () => {
  if (!items.length) { toast("Agregá al menos una ventana"); return; }
  updHist(h => {
    const i = h.findIndex(q => q.num === numero);
    const prev = i >= 0 ? h[i] : {};
    const q = { estado: prev.estado, entrega: prev.entrega, aceptadoEl: prev.aceptadoEl, entregadoEl: prev.entregadoEl, ...datosPresupuesto() };
    if (i >= 0) h[i] = q; else h.push(q);
  });
  if (numero > (+load(CLAVES.numero, 0) || 0)) save(CLAVES.numero, numero);
  toast("Guardado " + nro(numero));
};

$("btn-copiar").onclick = () => {
  const s = textoWhatsApp(), ta = $("copia");
  ta.value = s;
  const aMano = () => { ta.hidden = false; ta.select(); toast("Seleccionado: copialo con Ctrl+C"); };
  if (navigator.clipboard) navigator.clipboard.writeText(s).then(() => { ta.hidden = true; toast("Copiado"); }).catch(aMano);
  else aMano();
};

$("btn-nuevo").onclick = () => {
  const sinGuardar = items.length && !estaGuardado();
  $("conf-nuevo-txt").innerHTML = (sinGuardar ? "<b>Ojo: este presupuesto tiene cambios sin guardar.</b> " : "") +
    "¿Borrar los datos de este presupuesto y empezar uno nuevo? La lista de precios no se toca.";
  $("conf-nuevo").hidden = false;
  $("conf-no").focus();
};
$("conf-no").onclick = () => { $("conf-nuevo").hidden = true; $("btn-nuevo").focus(); };
$("conf-si").onclick = () => {
  items = [];
  extras = [];
  especs = [];
  monedaPres = "UYU";
  editIdx = -1;
  F = blank();
  $("c-nombre").value = "";
  $("c-tel").value = "";
  $("c-fecha").value = hoy();
  $("conf-nuevo").hidden = true;
  $("copia").hidden = true;
  numero = siguienteNumero();
  save(CLAVES.numero, numero);
  renderExtras();
  renderEspecs();
  renderForm();
  render();
  toast("Presupuesto nuevo listo");
  $("c-nombre").focus();
};
