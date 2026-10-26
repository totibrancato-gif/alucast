"use strict";
// =========================================================================
// Pestaña "Ajustes y copia": tus datos para el PDF y la copia de seguridad.
// =========================================================================

// ---- Datos del negocio (salen en el PDF) ----
function renderEmpresa() {
  document.querySelectorAll("[data-emp]").forEach(el => { el.value = EMP[el.dataset.emp] ?? ""; });
}
$("empresa").addEventListener("input", e => {
  const k = e.target.dataset.emp;
  if (!k) return;
  EMP[k] = e.target.value;
  save(CLAVES.empresa, EMP);
});

// ---- Copia de seguridad ----
// Incluye las marcas de actualización para que, al importar, no se vuelva a pisar la lista de precios.
const CLAVES_COPIA = [CLAVES.lista, CLAVES.historial, CLAVES.numero, CLAVES.borrador, CLAVES.empresa, CLAVES.gastos, CLAVES.deudores,
  "alucast-precios-2026-10-12", "alucast-num-2345", "alucast-num-2345-v2", "alucast-dolar-fijo", "alucast-empresa-contacto", "alucast-probba2", "alucast-acrilico", VERSION_LISTA, "alucast-acrilico-v2"];
let copiaPendiente = null;

$("bk-exp").onclick = () => {
  const o = { app: "alucast", version: 2, exportado: new Date().toISOString(), datos: {} };
  CLAVES_COPIA.forEach(k => {
    try { const v = localStorage.getItem(k); if (v !== null) o.datos[k] = JSON.parse(v); } catch (e) { /* clave dañada: se omite */ }
  });
  const texto = JSON.stringify(o, null, 1), nombre = `alucast-copia-${hoy()}.json`;

  if (window.alucast?.guardarArchivo) {
    window.alucast.guardarArchivo(nombre, texto)
      .then(ok => { if (ok) toast(ok === "Descargas" ? `Copia guardada en Descargas: ${nombre}` : "Copia exportada"); })
      .catch(e => toast("No se pudo guardar la copia (" + ([e?.code, e?.message].filter(Boolean).join(": ") || e) + ")"));
    return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast("Copia exportada");
};

/** Revisa el archivo elegido y pide confirmación antes de reemplazar. */
function prepararImport(texto) {
  try {
    const o = JSON.parse(texto);
    if (o.app !== "alucast" || !o.datos) throw new Error("no es copia");
    copiaPendiente = o;
    const n = (o.datos[CLAVES.historial] || []).length;
    const g = (o.datos[CLAVES.gastos] || []).length;
    $("bk-txt").textContent = `La copia tiene ${n} presupuesto(s) guardado(s)${g ? ` y ${g} movimiento(s) de gastos` : ""}, del ${dmy(String(o.exportado).slice(0, 10))}. Va a reemplazar todo lo de esta compu y de la nube (se ve en todos tus equipos).`;
    $("bk-conf").hidden = false;
    $("bk-no").focus();
  } catch (err) {
    toast("Ese archivo no es una copia de Alucast");
  }
}

// En la app de escritorio se usa el diálogo del sistema; en el navegador, el <input type=file> oculto.
$("bk-imp-btn").onclick = async () => {
  if (!window.alucast?.abrirArchivo) { $("bk-imp").click(); return; }
  try { const t = await window.alucast.abrirArchivo(); if (t) prepararImport(t); }
  catch (err) { toast("No se pudo abrir el archivo"); }
};
$("bk-imp").onchange = async e => {
  const f = e.target.files[0];
  e.target.value = "";
  if (f) prepararImport(await f.text());
};

/**
 * Limpia lo que viene en la copia antes de guardarlo: solo se aceptan datos con la
 * forma esperada (números enteros, fechas AAAA-MM-DD, textos). Así un archivo armado
 * a propósito no puede meter nada raro en la app.
 */
function limpiarCopia(datos) {
  const limpio = {};
  const texto = v => typeof v === "string" ? v : "";
  for (const k of CLAVES_COPIA) {
    if (!(k in datos)) continue;
    const v = datos[k];
    if (k === CLAVES.historial) limpio[k] = (Array.isArray(v) ? v : []).filter(q => q && typeof q === "object").map(normalizarPresupuesto).filter(q => q.num > 0);
    else if (k === CLAVES.numero) limpio[k] = parseInt(v) || NUMERO_INICIAL;
    else if (k === CLAVES.deudores) limpio[k] = normalizarDeudores(v);
    else if (k === CLAVES.gastos) {
      // Los movimientos se validan contra los deudores de la copia (más la cuenta vieja "En la calle")
      const deu = normalizarDeudores(datos[CLAVES.deudores] ?? load(CLAVES.deudores, []));
      const validas = new Set([...idsCuentas(deu), DEUDOR_VIEJO.id]);
      limpio[k] = (Array.isArray(v) ? v : []).map(m => normalizarMov(m, validas)).filter(Boolean);
    }
    else if (k === CLAVES.lista) { if (v && typeof v === "object" && !Array.isArray(v)) limpio[k] = v; }
    else if (k === CLAVES.empresa) { if (v && typeof v === "object") limpio[k] = Object.fromEntries(Object.keys(EMPRESA_DEF).map(c => [c, texto(v[c])])); }
    else if (k === CLAVES.borrador) {
      if (v && typeof v === "object") limpio[k] = {
        items: (Array.isArray(v.items) ? v.items : []).map(normalizarItem),
        extras: (Array.isArray(v.extras) ? v.extras : []).filter(x => x && typeof x === "object").map(x => ({ c: texto(x.c), monto: texto(String(x.monto ?? "")) })),
        especs: normalizarEspecs(v.especs),
        monedaPres: v.monedaPres === "USD" ? "USD" : "UYU",
        F: v.F ? normalizarItem(v.F) : null, editIdx: -1,
        numero: parseInt(v.numero) || undefined,
        cli: (Array.isArray(v.cli) ? v.cli : []).slice(0, 3).map(texto),
      };
    }
    else limpio[k] = v === true; // marcas de actualización
  }
  return limpio;
}

$("bk-no").onclick = () => { copiaPendiente = null; $("bk-conf").hidden = true; $("bk-imp-btn").focus(); };
$("bk-si").onclick = () => {
  if (!copiaPendiente) return;
  const datos = limpiarCopia(copiaPendiente.datos);
  Object.entries(datos).forEach(([k, v]) => save(k, v));
  // Si la copia no trae lo que se estaba cargando, se descarta lo de esta compu
  // (si no, su número podría pisar un presupuesto de la copia).
  if (!(CLAVES.borrador in datos)) { try { localStorage.removeItem(CLAVES.borrador); } catch (e) { /* sin acceso */ } }
  location.reload();
};
