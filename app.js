"use strict";
// =========================================================================
// Arranque de la app y navegación entre pestañas.
// =========================================================================

const VISTAS = ["presu", "hist", "entregas", "precios", "backup"]; // las que tienen pestaña
const OTRAS_VISTAS = ["gastos"];                                    // se abren desde el menú

function show(vista) {
  [...VISTAS, ...OTRAS_VISTAS].forEach(k => { $("v-" + k).hidden = k !== vista; });
  VISTAS.forEach(k => {
    const tab = $("t-" + k), activa = k === vista;
    tab.setAttribute("aria-selected", activa);
    // Si la vista no tiene pestaña (gastos), "Presupuesto" queda como entrada con el teclado
    tab.tabIndex = activa || (!VISTAS.includes(vista) && k === "presu") ? 0 : -1;
  });
  aceptando = cambiando = borrando = abriendo = null;
  if (vista === "hist") renderHist();
  if (vista === "entregas") renderEnt();
  if (vista === "precios") renderPrecios();
  if (vista === "backup") renderEmpresa();
  if (vista === "gastos") renderGastos();
}

/** Pestañas con teclado: flechas izquierda/derecha, Inicio y Fin. */
function tecladoPestañas(e) {
  const i = VISTAS.indexOf(document.activeElement.id.slice(2));
  if (i < 0) return;
  const destino = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: VISTAS.length - 1 }[e.key];
  if (destino === undefined) return;
  e.preventDefault();
  const k = VISTAS[(destino + VISTAS.length) % VISTAS.length];
  show(k);
  $("t-" + k).focus();
}

/** Ejemplo basado en el presupuesto de la planilla (primera vez que se abre la app). */
function cargarEjemplo() {
  $("c-nombre").value = "Cliente de ejemplo";
  $("c-tel").value = "";
  items = [{ linea: "Probba", nombre: "Ventana living 3 × 1,5 m", acabado: "Negro", cant: "1",
    alu: [{ n: "RIEL PROBBA", m: "6" }, { n: "LATERAL MARCO", m: "3" }, { n: "ENGANCHE HOJA", m: "3" }, { n: "LATERAL HOJA", m: "3" }, { n: "DIVISOR HOJA", m: "6" }],
    acc: [{ n: "MANIJAS", q: "2" }], vid: { cant: "1", ancho: "3", alto: "1.5", tipo: vidrioPorDefecto() }, mo: "", exs: [] }];
  extras = [];
  especs = [];
  editIdx = -1;
  F = blank();
  if (F.alu[0]) F.alu[0].m = "2.8";
}

/** Recupera lo que estabas cargando (completando campos que falten), o arma el ejemplo. */
function cargarBorrador() {
  const b = load(CLAVES.borrador, null);
  if (b && typeof b === "object" && b.F) {
    items = (Array.isArray(b.items) ? b.items : []).map(normalizarItem);
    extras = (Array.isArray(b.extras) ? b.extras : []).filter(x => x && typeof x === "object");
    especs = normalizarEspecs(b.especs);
    monedaPres = b.monedaPres === "USD" ? "USD" : "UYU";
    F = normalizarItem(b.F);
    editIdx = Number.isInteger(b.editIdx) && b.editIdx < items.length ? b.editIdx : -1;    if (parseInt(b.numero) > 0) numero = parseInt(b.numero);
    const cli = Array.isArray(b.cli) ? b.cli : [];
    $("c-nombre").value = String(cli[0] ?? "");
    $("c-tel").value = String(cli[1] ?? "");
    $("c-fecha").value = esFecha(cli[2]) ? cli[2] : "";
  } else {
    cargarEjemplo();
  }
  if (!$("c-fecha").value) $("c-fecha").value = hoy();
}

function pintarTodo() {
  renderDolar();
  renderExtras();
  renderEspecs();
  renderForm();
  render();
  updBadge();
}

function iniciar() {
  VISTAS.forEach(k => { $("t-" + k).onclick = () => show(k); });
  $("t-presu").parentNode.addEventListener("keydown", tecladoPestañas);
  show("presu");
  cargarBorrador();
  try {
    pintarTodo();
  } catch (e) {
    // Si lo que había a medio cargar está dañado, se empieza limpio en vez de dejar la app trabada.
    console.error(e);
    items = []; extras = []; especs = []; editIdx = -1; F = blank();
    pintarTodo();
    toast("No se pudo recuperar lo que estabas cargando. Tus presupuestos guardados están intactos.");
  }
}

iniciar();
