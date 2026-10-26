"use strict";
// =========================================================================
// Utilidades generales: DOM, formato de números y fechas, guardado local.
// =========================================================================

const $ = id => document.getElementById(id);

/** Escapa texto para meterlo en HTML sin riesgo. */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---- Números ----
/**
 * Pesos escritos a la uruguaya: "12.000" son doce mil y "1.500,50" es mil quinientos
 * con cincuenta (la coma ya llega convertida en punto). Un solo punto con 1 o 2
 * decimales ("12.5") se toma como decimal. Si no es un número, devuelve 0.
 */
function numPesos(v) {
  let s = String(v ?? "").trim();
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");   // 12.000 / 1.250.000
  else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\.(?=.*\.)/g, ""); // 1.500.50 → 1500.50
  const n = +s;
  return isFinite(n) ? n : 0;
}

/** ¿El texto es un número válido? (vacío cuenta como válido). */
function esNumeroValido(el) {
  const v = el.value.trim();
  if (v === "") return true;
  if (el.dataset.pesos !== undefined) return /^\d{1,3}(\.\d{3})+$/.test(v) || /^\d+(\.\d+)?$/.test(v.replace(/\.(?=.*\.)/g, ""));
  return /^\d*\.?\d+$/.test(v) || /^\d+\.$/.test(v);
}

// En los campos numéricos se puede escribir con coma (2,80): se cambia a punto al tipear.
// Si lo escrito no es un número, el campo se marca en rojo (antes se tomaba 0 sin avisar).
document.addEventListener("input", e => {
  const el = e.target;
  if (!el || el.inputMode !== "decimal") return;
  if (el.value.includes(",")) {
    const pos = el.selectionStart;
    el.value = el.value.replace(/,/g, ".");
    try { el.setSelectionRange(pos, pos); } catch (_) { /* algunos campos no tienen cursor */ }
  }
  el.setAttribute("aria-invalid", String(!esNumeroValido(el)));
}, true);

/** Pesos uruguayos redondeados: "$ 12.345". */
const pes = n => "$ " + Math.round(+n || 0).toLocaleString("es-UY");
/** Importe en la moneda del presupuesto: "$ 12.345" o "U$S 301" (redondeado). */
const dinero = (n, moneda) => (moneda === "USD" ? "U$S " : "$ ") + Math.round(+n || 0).toLocaleString("es-UY");
/** Número con decimales fijos: "1.234,50". */
const num = (n, d = 2) => (+n || 0).toLocaleString("es-UY", { minimumFractionDigits: d, maximumFractionDigits: d });
/** Número de presupuesto: "N.º 0012" (siempre un entero, aunque venga mal guardado). */
const nro = n => "N.º " + String(parseInt(n) || 0).padStart(4, "0");

// ---- Fechas (siempre en hora local, formato AAAA-MM-DD) ----
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const esFecha = v => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

function fechaISO(d) {
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
/** Hoy en hora de la compu (no UTC: así no cambia de día a las 21 h en Uruguay). */
const hoy = () => fechaISO(new Date());
/** "2026-10-15" → "15/10/2026" (vacío si no es una fecha válida). */
const dmy = v => { if (!esFecha(v)) return ""; const [a, m, d] = v.split("-"); return `${d}/${m}/${a}`; };
/** "2026-10" → "Octubre 2026". */
const mesTxt = k => { const [a, m] = String(k).split("-"); return `${MESES[+m - 1] || ""} ${parseInt(a) || ""}`; };
/** Días desde hoy hasta la fecha (negativo si ya pasó). */
function diasHasta(v) {
  const a = new Date(v + "T00:00:00"), h = new Date(hoy() + "T00:00:00");
  return Math.round((a - h) / 864e5);
}
/** Suma días a una fecha AAAA-MM-DD. */
function sumarDias(v, dias) {
  const d = new Date(v + "T00:00:00");
  d.setDate(d.getDate() + dias);
  return fechaISO(d);
}

// ---- Guardado local (queda en la compu, dentro de la app; nube.js lo sincroniza) ----
function load(clave, porDefecto) {
  try { const v = localStorage.getItem(clave); return v ? JSON.parse(v) : porDefecto; }
  catch (e) { return porDefecto; }
}
function save(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); }
  catch (e) { toast("No se pudo guardar en esta compu"); return; }
  if (typeof nubeCambio === "function") nubeCambio(clave);
}

// ---- Avisos ----
// El aviso queda siempre en la página (oculto con una clase) para que los lectores de
// pantalla lo anuncien: primero se vacía y después se escribe el mensaje.
let toastTimer;
function toast(mensaje) {
  const t = $("toast");
  clearTimeout(toastTimer);
  t.textContent = "";
  setTimeout(() => {
    t.textContent = mensaje;
    t.classList.add("on");
    toastTimer = setTimeout(() => t.classList.remove("on"), 3200);
  }, 50);
}
