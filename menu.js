"use strict";
// =========================================================================
// Menú lateral (se abre con ☰ arriba a la izquierda), con dos secciones:
//   - Presupuestos: los tipos de abertura (abre un presupuesto de ese tipo).
//   - Control de gastos: saldos de caja chica, banco y deudores por ventas.
// =========================================================================

/** "GALA BATIENTE" → "Gala Batiente" (los nombres vienen cargados de distintas formas). */
const lindo = n => String(n).toLowerCase().replace(/(^|\s)\p{L}/gu, c => c.toUpperCase());

const ICONO_VENTANA = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M12 4v16M4 12h16"/></svg>`;

function renderMenuPresupuestos() {
  $("m-presu").innerHTML = `<div class="tipos">` + P.lineas.map(l => `
    <button class="tipo${F && F.linea === l.n ? " actual" : ""}" data-mlin="${esc(l.n)}">
      <span class="tipo-ico">${ICONO_VENTANA}</span><span class="tipo-n">${esc(lindo(l.n))}</span>
    </button>`).join("") + `</div>`;
}

function renderMenuGastos() {
  const ldeu = deudores(), s = saldos(undefined, ldeu);
  const fila = (id, nombre, punto, clase = "") => `
    <button class="cuenta ${clase}" data-mgastos="${esc(id)}">
      ${punto ? `<span class="cuenta-punto ${punto}" aria-hidden="true"></span>` : ""}
      <span class="cuenta-n">${esc(nombre)}</span>
      <span class="cuenta-cols">${dosColumnas(s[id])}</span>
    </button>`;
  $("m-gastos").innerHTML = `<div class="cuentas">` +
    `<div class="cuenta titulos" aria-hidden="true"><span class="cuenta-n"></span><span class="cuenta-cols"><span class="mon">Pesos</span><span class="mon">Dólares</span></span></div>` +
    fila("caja", "Caja chica", "caja") + fila("banco", "Banco", "banco") +
    fila(GRUPO_DEUDORES, "Deudores por ventas", "calle") +
    // Cada deudor, debajo del total de deudores
    ldeu.map(d => fila(d.id, d.nombre, "", "sub")).join("") +
    `<div class="cuenta total"><span class="cuenta-n">Total</span><span class="cuenta-cols">${dosColumnas(s.total)}</span></div>
  </div>
  <button class="btn cargar-mov" data-mgastos="">＋ Cargar movimiento</button>`;
}

const menuAbierto = () => document.body.classList.contains("menu-abierto");

function abrirMenu() {
  renderMenuPresupuestos();
  renderMenuGastos();
  const p = $("menu-panel");
  p.removeAttribute("inert");
  p.setAttribute("aria-hidden", "false");
  document.body.classList.add("menu-abierto");
  $("menu-btn").setAttribute("aria-expanded", "true");
  $("menu-btn").setAttribute("aria-label", "Cerrar menú");
  // El panel se hace visible al empezar la animación: se enfoca apenas se pinta
  requestAnimationFrame(() => requestAnimationFrame(() => $("menu-cerrar").focus()));
}

function cerrarMenu(devolverFoco) {
  if (!menuAbierto()) return;
  const p = $("menu-panel");
  p.setAttribute("inert", "");
  p.setAttribute("aria-hidden", "true");
  document.body.classList.remove("menu-abierto");
  $("menu-btn").setAttribute("aria-expanded", "false");
  $("menu-btn").setAttribute("aria-label", "Abrir menú");
  if (devolverFoco) $("menu-btn").focus();
}

$("menu-btn").onclick = () => menuAbierto() ? cerrarMenu(false) : abrirMenu();
$("menu-cerrar").onclick = () => cerrarMenu(true);
$("menu-fondo").onclick = () => cerrarMenu(true);
document.addEventListener("keydown", e => { if (e.key === "Escape" && menuAbierto()) cerrarMenu(true); });

$("menu-panel").addEventListener("click", e => {
  // Secciones que se pliegan
  const cab = e.target.closest(".sec-cab");
  if (cab) {
    const abierta = cab.getAttribute("aria-expanded") === "true";
    cab.setAttribute("aria-expanded", String(!abierta));
    $(cab.getAttribute("aria-controls")).hidden = abierta;
    return;
  }

  const tipo = e.target.closest("[data-mlin]");
  if (tipo) {
    cerrarMenu(false);
    show("presu");
    const boton = [...$("lineas").querySelectorAll("[data-lin]")].find(b => b.dataset.lin === tipo.dataset.mlin);
    if (boton && boton.getAttribute("aria-pressed") !== "true") boton.click();
    $("form-ventana").scrollIntoView({ behavior: "smooth", block: "start" });
    $("v-nombre").focus({ preventScroll: true });
    toast(`Ventana ${lindo(tipo.dataset.mlin)}`);
    return;
  }

  const cuenta = e.target.closest("[data-mgastos]");
  if (cuenta) {
    cerrarMenu(false);
    abrirGastos(cuenta.dataset.mgastos);
    if (cuenta.dataset.mgastos === "") $("g-monto").focus(); // "Cargar movimiento" va directo al monto
  }
});
