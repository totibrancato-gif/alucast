"use strict";
// =========================================================================
// Pestañas "Guardados" y "Por entregar": seguimiento de cada presupuesto
// (esperando respuesta → aceptado con fecha de entrega → entregado).
// =========================================================================

// Qué presupuesto tiene abierto cada mini-formulario (null = ninguno)
let aceptando = null, cambiando = null, borrando = null, abriendo = null;
let mesEnt = "", mesOk = "";

function updBadge() {
  const n = historial().filter(q => q.estado === "aceptado").length, b = $("badge-ent");
  b.hidden = !n;
  b.textContent = n;
}

const btnBorrar = q => `<button class="btn warn sm" data-borrar="${q.num}">Eliminar</button>`;

const confBorrar = q => borrando !== q.num ? "" : `<div class="acept" role="alertdialog" aria-labelledby="cb-${q.num}">
    <span id="cb-${q.num}">¿Eliminar el presupuesto ${nro(q.num)}${q.cli ? ` de ${esc(q.cli)}` : ""}? No se puede deshacer.</span>
    <button class="btn warn sm" data-borrarok="${q.num}">Sí, eliminar</button>
    <button class="btn ghost sm" data-cancel="1">Cancelar</button>
  </div>`;

/** Aviso antes de abrir otro presupuesto si el actual tiene cambios sin guardar. */
const confAbrir = q => abriendo !== q.num ? "" : `<div class="acept" role="alertdialog" aria-labelledby="ca-${q.num}">
    <span id="ca-${q.num}">El presupuesto ${nro(numero)} que tenés abierto tiene cambios sin guardar. ¿Abrir ${nro(q.num)} igual?</span>
    <button class="btn warn sm" data-openok="${q.num}">Abrir sin guardar</button>
    <button class="btn ghost sm" data-cancel="1">Cancelar</button>
  </div>`;

/**
 * Total del presupuesto en la moneda en que se le pasó al cliente (en dólares, con el dólar de ese día).
 * En dólares usa el total que vio el cliente (totalUsd); los guardados antes no lo tienen y se recalcula.
 */
const totalEnSuMoneda = q => q.moneda === "USD" && q.dolar > 0 ? (+q.totalUsd || Math.round(q.total / q.dolar)) : q.total;

function cabecera(q) {
  return `<div><b>${nro(q.num)}</b> · ${esc(q.cli || "Sin nombre")}${q.tel ? ` · ${esc(q.tel)}` : ""}
    <div class="muted">${esc(q.fechaTxt)} · ${q.items.length} ventana(s) · <b class="monto">${dinero(totalEnSuMoneda(q), q.moneda === "USD" && q.dolar > 0 ? "USD" : "UYU")}</b></div></div>`;
}

function formFecha(q, modo) {
  return `<div class="acept">
    <label>Fecha de entrega<input type="date" id="f-ent-${q.num}" value="${q.entrega || ""}"></label>
    <button class="btn sm" data-${modo}ok="${q.num}">${modo === "acep" ? "Confirmar aceptado" : "Guardar fecha"}</button>
    <button class="btn ghost sm" data-cancel="1">Cancelar</button>
  </div>`;
}

function renderHist() {
  const h = historial().filter(q => !q.estado).sort((a, b) => b.num - a.num);
  $("hist").innerHTML = h.length ? h.map(q => `<div class="hist-item">${cabecera(q)}
      <div class="actions">
        <button class="btn ghost sm" data-open="${q.num}">Abrir</button>
        <button class="btn sm" data-acep="${q.num}">Aceptado</button>
        ${btnBorrar(q)}
      </div>
      ${aceptando === q.num ? formFecha(q, "acep") : ""}${confBorrar(q)}${confAbrir(q)}
    </div>`).join("")
    : `<p class="empty">No hay presupuestos esperando respuesta. Los que guardes aparecen acá.</p>`;
}

/** Arma el selector de meses y devuelve el mes elegido (o "" si ya no existe). */
function selMes(id, lista, campo, actual) {
  const meses = [...new Set(lista.map(q => (q[campo] || "").slice(0, 7)).filter(Boolean))].sort().reverse();
  if (actual && actual !== "sin" && !meses.includes(actual)) actual = "";
  const sinFecha = lista.some(q => !q[campo]);
  $(id).innerHTML = `<option value="">Todos los meses (${lista.length})</option>` +
    meses.map(k => `<option value="${k}"${k === actual ? " selected" : ""}>${mesTxt(k)} (${lista.filter(q => (q[campo] || "").startsWith(k)).length})</option>`).join("") +
    (sinFecha ? `<option value="sin"${actual === "sin" ? " selected" : ""}>Sin fecha</option>` : "");
  return actual;
}
const enMes = (q, campo, mes) => !mes || (mes === "sin" ? !q[campo] : (q[campo] || "").startsWith(mes));
/** Cantidad de trabajos y la suma del mes: pesos y dólares por separado (no se mezclan). */
function resumenMes(lista, mes) {
  if (!lista.length || !mes) return "";
  const enUsd = q => q.moneda === "USD" && q.dolar > 0;
  const pesos = lista.filter(q => !enUsd(q)).reduce((s, q) => s + (q.total || 0), 0);
  const dolares = lista.filter(enUsd).reduce((s, q) => s + totalEnSuMoneda(q), 0);
  return `<p class="note intro">${lista.length} trabajo(s)${pesos ? " · " + pes(pesos) : ""}${dolares ? " · " + dinero(dolares, "USD") : ""}</p>`;
}

function chipEntrega(q) {
  if (!q.entrega) return `<span class="chip">Sin fecha</span>`;
  const d = diasHasta(q.entrega);
  if (d < 0) return `<span class="chip late">Atrasado ${-d} día${d === -1 ? "" : "s"}</span>`;
  if (d === 0) return `<span class="chip late">Se entrega hoy</span>`;
  return `<span class="chip">Faltan ${d} día${d === 1 ? "" : "s"}</span>`;
}

function renderEnt() {
  const h = historial();

  // Por entregar
  const todosPend = h.filter(q => q.estado === "aceptado");
  mesEnt = selMes("mes-ent", todosPend, "entrega", mesEnt);
  const pend = todosPend.filter(q => enMes(q, "entrega", mesEnt)).sort((a, b) => (a.entrega || "9").localeCompare(b.entrega || "9"));
  $("ent").innerHTML = resumenMes(pend, mesEnt) + (pend.length ? pend.map(q => `<div class="hist-item">${cabecera(q)}
      <div class="der"><div><b>Entrega ${dmy(q.entrega) || "–"}</b></div>${chipEntrega(q)}</div>
      <div class="actions fila">
        <button class="btn ghost sm" data-open="${q.num}">Abrir</button>
        <button class="btn ghost sm" data-cambiar="${q.num}">Cambiar fecha</button>
        <button class="btn sm" data-entregado="${q.num}">Entregado</button>
        <button class="btn ghost sm" data-volver="${q.num}">Volver a guardados</button>
        ${btnBorrar(q)}
      </div>
      ${cambiando === q.num ? formFecha(q, "camb") : ""}${confBorrar(q)}${confAbrir(q)}
    </div>`).join("")
    : `<p class="empty">${todosPend.length ? "No hay trabajos para entregar en ese mes." : 'No hay trabajos por entregar. Marcá un presupuesto como "Aceptado" en Guardados.'}</p>`);

  // Entregados
  const todosOk = h.filter(q => q.estado === "entregado");
  mesOk = selMes("mes-ok", todosOk, "entregadoEl", mesOk);
  const ok = todosOk.filter(q => enMes(q, "entregadoEl", mesOk)).sort((a, b) => (b.entregadoEl || "").localeCompare(a.entregadoEl || ""));
  $("ent-ok").innerHTML = resumenMes(ok, mesOk) + (ok.length ? ok.map(q => `<div class="hist-item">${cabecera(q)}
      <div class="der"><span class="chip ok">Entregado ${dmy(q.entregadoEl)}</span></div>
      <div class="actions fila">
        <button class="btn ghost sm" data-open="${q.num}">Abrir</button>
        <button class="btn ghost sm" data-reabrir="${q.num}">Pasar a por entregar</button>
        ${btnBorrar(q)}
      </div>
      ${confBorrar(q)}${confAbrir(q)}
    </div>`).join("")
    : `<p class="empty">${todosOk.length ? "No hay trabajos entregados en ese mes." : "Todavía no hay trabajos entregados."}</p>`);
}

function renderTrabajos() { renderHist(); renderEnt(); }

/** Cambia un presupuesto del historial por número. */
const cambiarQ = (n, fn) => updHist(h => { const q = h.find(x => x.num === n); if (q) fn(q); });

/** Pone el foco en el primer botón que cumpla el selector (después de redibujar la lista). */
const enfocar = sel => document.querySelector(sel)?.focus();

function accionesTrabajos(e) {
  const d = e.target.dataset;
  if (d.open) {
    const n = +d.open;
    // Si lo que está en pantalla tiene cambios sin guardar, primero se pregunta.
    if (items.length && n !== numero && !estaGuardado()) {
      abriendo = n; aceptando = cambiando = borrando = null;
      renderTrabajos();
      enfocar(`[data-openok="${n}"] + [data-cancel]`);
      return;
    }
    return abrir(n);
  }
  if (d.openok) { abriendo = null; return abrir(+d.openok); }
  if (d.acep) { aceptando = +d.acep; abriendo = null; renderHist(); $("f-ent-" + d.acep)?.focus(); return; }
  if (d.cambiar) { cambiando = +d.cambiar; abriendo = null; renderEnt(); $("f-ent-" + d.cambiar)?.focus(); return; }
  if (d.cancel) {
    // Al cancelar, el foco vuelve al botón que abrió el aviso.
    const volver = abriendo ? `[data-open="${abriendo}"]` : borrando ? `[data-borrar="${borrando}"]`
      : aceptando ? `[data-acep="${aceptando}"]` : cambiando ? `[data-cambiar="${cambiando}"]` : null;
    aceptando = cambiando = borrando = abriendo = null;
    renderTrabajos();
    if (volver) enfocar(volver);
    return;
  }
  if (d.borrar) {
    borrando = +d.borrar; aceptando = cambiando = abriendo = null;
    renderTrabajos();
    enfocar(`[data-borrarok="${borrando}"] + [data-cancel]`);
    return;
  }

  if (d.borrarok) {
    const n = +d.borrarok;
    updHist(h => { const i = h.findIndex(x => x.num === n); if (i >= 0) h.splice(i, 1); });
    borrando = null;
    renderTrabajos();
    toast(`${nro(n)} eliminado`);
    return;
  }
  if (d.acepok || d.cambok) {
    const n = +(d.acepok || d.cambok), f = $("f-ent-" + n).value;
    if (!f) { toast("Elegí la fecha de entrega"); return; }
    cambiarQ(n, q => { q.entrega = f; if (d.acepok) { q.estado = "aceptado"; q.aceptadoEl = hoy(); } });
    aceptando = cambiando = null;
    renderTrabajos();
    toast(d.acepok ? `${nro(n)} pasó a Por entregar` : "Fecha actualizada");
    return;
  }
  if (d.entregado) {
    const n = +d.entregado;
    cambiarQ(n, q => { q.estado = "entregado"; q.entregadoEl = hoy(); });
    renderEnt();
    toast(`${nro(n)} entregado`);
    return;
  }
  if (d.volver) {
    const n = +d.volver;
    cambiarQ(n, q => { delete q.estado; delete q.entrega; });
    renderEnt();
    toast(`${nro(n)} volvió a Guardados`);
    return;
  }
  if (d.reabrir) {
    const n = +d.reabrir;
    cambiarQ(n, q => { q.estado = "aceptado"; delete q.entregadoEl; });
    renderEnt();
  }
}

/** Carga un presupuesto guardado en la pestaña Presupuesto. */
function abrir(n) {
  const q = historial().find(x => x.num === n);
  if (!q) return;
  numero = q.num;
  items = q.items; // ya vienen completas (normalizarPresupuesto)
  extras = q.extras;
  especs = q.especs;
  monedaPres = q.moneda;
  $("c-nombre").value = q.cli;
  $("c-tel").value = q.tel;
  $("c-fecha").value = q.fecha || hoy();
  editIdx = -1;
  F = blank();
  renderExtras();
  renderEspecs();
  renderForm();
  show("presu");
  render();
  $("q-h").focus();
  toast("Abierto " + nro(n));
}

$("mes-ent").onchange = e => { mesEnt = e.target.value; renderEnt(); };
$("mes-ok").onchange = e => { mesOk = e.target.value; renderEnt(); };
["hist", "ent", "ent-ok"].forEach(id => $(id).onclick = accionesTrabajos);
