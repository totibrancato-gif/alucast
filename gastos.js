"use strict";
// =========================================================================
// Control de gastos: cuánto hay en la caja chica, en el banco y cuánto te
// debe cada cliente. Cada deudor es una cuenta propia; "Deudores por ventas"
// es la suma de todos. Cada movimiento suma o resta en la cuenta que elegís:
//   - Entra plata: se suma a una cuenta.
//   - Sale plata: se resta de una cuenta.
//   - Pasar de una a otra: se resta de una y se suma a la otra
//     (ej.: Pérez te paga lo que debía → sale de "Pérez", entra a "Banco").
// =========================================================================

const FIJAS = [
  { id: "caja", n: "Caja chica" },
  { id: "banco", n: "Banco" },
];
const GRUPO_DEUDORES = "deudores";          // para ver/filtrar todos los deudores juntos
const NUEVO = "__nuevo";                    // opción "＋ Nuevo deudor…" en el formulario
// Antes había una sola cuenta "En la calle" (id "calle"). Si hay movimientos viejos con ella,
// pasa a ser un deudor más con este nombre (se puede renombrar).
const DEUDOR_VIEJO = { id: "calle", nombre: "Varios (antes \"En la calle\")" };

const AYUDA_TIPO = {
  entrada: "La plata se suma a la cuenta que elijas. Ej.: le hiciste un trabajo a Pérez y te queda debiendo → entra a Pérez (deudor).",
  salida: "La plata se resta de la cuenta que elijas. Ej.: compra de perfiles pagada por transferencia → sale de Banco.",
  pase: "Se resta de una cuenta y se suma a la otra. Ej.: Pérez te paga por transferencia lo que debía → sale de Pérez y entra a Banco.",
};

let tipoMov = "entrada";
let filtroGastos = "";      // "" = todo; "caja", "banco", "deudores" o el id de un deudor
let borrandoMov = null;     // id del movimiento que se está por borrar

// ---- Deudores ----
function normalizarDeudores(lista) {
  const vistos = new Set();
  return (Array.isArray(lista) ? lista : [])
    .filter(d => d && typeof d === "object" && d.id && !FIJAS.some(f => f.id === d.id))
    .map(d => ({ id: String(d.id), nombre: String(d.nombre ?? "").trim() || "Sin nombre" }))
    .filter(d => !vistos.has(d.id) && vistos.add(d.id));
}
const deudores = () => normalizarDeudores(load(CLAVES.deudores, []))
  .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
const esDeudor = id => deudores().some(d => d.id === id);

function nuevoIdUnico(usados) {
  let id;
  do { id = Date.now().toString(36).padStart(9, "0") + "-" + Math.random().toString(36).slice(2, 8); } while (usados.has(id));
  return id;
}

/** Crea un deudor (o devuelve el que ya existe con ese nombre). */
function crearDeudor(nombre) {
  nombre = String(nombre || "").trim();
  if (!nombre) return null;
  const lista = deudores();
  const existe = lista.find(d => d.nombre.toLowerCase() === nombre.toLowerCase());
  if (existe) return existe;
  const d = { id: "d-" + nuevoIdUnico(new Set(lista.map(x => x.id))), nombre };
  save(CLAVES.deudores, [...lista, d]);
  return d;
}

/** Cuentas válidas: caja, banco y cada deudor. */
const idsCuentas = (lista = deudores()) => new Set([...FIJAS.map(f => f.id), ...lista.map(d => d.id)]);
function nombreCuenta(id) {
  const f = FIJAS.find(c => c.id === id);
  if (f) return f.n;
  if (id === GRUPO_DEUDORES) return "Deudores por ventas";
  return (deudores().find(d => d.id === id) || {}).nombre || "";
}

// ---- Monedas: pesos y dólares van siempre por separado (no se convierten ni se suman entre sí) ----
const MONEDAS = ["UYU", "USD"];
let monedaMov = "UYU";
/** Dólares: "U$S 1.250" o "U$S 1.250,50" si tiene centavos. */
const usd = n => "U$S " + num(n, Math.round(Math.abs(+n || 0) * 100) % 100 ? 2 : 0);
const enMoneda = (n, moneda) => moneda === "USD" ? usd(n) : pes(n);
const cero = () => ({ UYU: 0, USD: 0 });

// ---- Movimientos ----
/** Un movimiento con la forma esperada (o null si no sirve). Los de antes, sin moneda, son en pesos. */
function normalizarMov(m, validas = idsCuentas()) {
  if (!m || typeof m !== "object") return null;
  const tipo = ["entrada", "salida", "pase"].includes(m.tipo) ? m.tipo : null;
  const monto = Math.abs(+m.monto || 0);
  const desde = validas.has(m.desde) ? m.desde : null, hacia = validas.has(m.hacia) ? m.hacia : null;
  if (!tipo || !monto) return null;
  if ((tipo === "entrada" && !hacia) || (tipo === "salida" && !desde) || (tipo === "pase" && (!desde || !hacia || desde === hacia))) return null;
  return {
    id: String(m.id || nuevoIdUnico(new Set())),
    fecha: esFecha(m.fecha) ? m.fecha : hoy(),
    tipo, monto,
    moneda: MONEDAS.includes(m.moneda) ? m.moneda : "UYU",
    desde: tipo === "entrada" ? null : desde,
    hacia: tipo === "salida" ? null : hacia,
    desc: String(m.desc ?? ""),
  };
}

const movimientos = () => {
  const l = load(CLAVES.gastos, []), validas = idsCuentas();
  return (Array.isArray(l) ? l : []).map(m => normalizarMov(m, validas)).filter(Boolean);
};

/**
 * Saldo de cada cuenta (caja, banco, cada deudor), del total de deudores y del total general,
 * cada uno con pesos y dólares por separado: s[cuenta] = { UYU, USD }.
 */
function saldos(lista = movimientos(), listaDeudores = deudores()) {
  const s = { caja: cero(), banco: cero() };
  listaDeudores.forEach(d => { s[d.id] = cero(); });
  lista.forEach(m => {
    if (m.hacia in s) s[m.hacia][m.moneda] += m.monto;
    if (m.desde in s) s[m.desde][m.moneda] -= m.monto;
  });
  const sumar = ids => { const t = cero(); ids.forEach(id => MONEDAS.forEach(mo => { t[mo] += s[id][mo]; })); return t; };
  s[GRUPO_DEUDORES] = sumar(listaDeudores.map(d => d.id));
  s.total = sumar(["caja", "banco", GRUPO_DEUDORES]);
  return s;
}

/** Los dos importes (pesos y dólares) de un saldo, cada uno marcado si es negativo o cero. */
function dosColumnas(v, clase = "") {
  const c = mo => `<span class="mon ${mo === "USD" ? "usd" : "uyu"}${v[mo] < 0 ? " negativo" : ""}${!v[mo] ? " cero" : ""}${clase}">${enMoneda(v[mo], mo)}</span>`;
  return c("UYU") + c("USD");
}

/** Si quedaron movimientos de la cuenta vieja "En la calle", se crea su deudor (una sola vez). */
(function migrarCalle() {
  const usados = (load(CLAVES.gastos, []) || []).some(m => m && (m.desde === "calle" || m.hacia === "calle"));
  const lista = normalizarDeudores(load(CLAVES.deudores, []));
  if (usados && !lista.some(d => d.id === DEUDOR_VIEJO.id)) save(CLAVES.deudores, [...lista, { ...DEUDOR_VIEJO }]);
})();

// ---- Pantalla ----
/** ¿El movimiento toca la cuenta (o el grupo) que se está mirando? */
function tocaFiltro(m, filtro, ids) {
  if (!filtro) return true;
  if (filtro === GRUPO_DEUDORES) return ids.has(m.desde) || ids.has(m.hacia);
  return m.desde === filtro || m.hacia === filtro;
}

function renderGastos() {
  const lista = movimientos(), ldeu = deudores(), s = saldos(lista, ldeu);
  const idsDeu = new Set(ldeu.map(d => d.id));
  if (filtroGastos && filtroGastos !== GRUPO_DEUDORES && !FIJAS.some(f => f.id === filtroGastos) && !idsDeu.has(filtroGastos)) filtroGastos = "";

  // Tarjetas: cada una con su columna de pesos y su columna de dólares
  const tarjeta = (id, nombre, punto) => `
    <button class="saldo${filtroGastos === id ? " activo" : ""}" data-cuenta="${id}" aria-pressed="${filtroGastos === id}">
      <span class="saldo-n"><span class="cuenta-punto ${punto}" aria-hidden="true"></span>${esc(nombre)}</span>
      <span class="saldo-cols">${dosColumnas(s[id])}</span>
    </button>`;
  $("saldos").innerHTML = `<div class="saldos-titulos" aria-hidden="true"><span></span><span>Pesos</span><span>Dólares</span></div>` +
    tarjeta("caja", "Caja chica", "caja") + tarjeta("banco", "Banco", "banco") +
    tarjeta(GRUPO_DEUDORES, `Deudores por ventas (${ldeu.length})`, "calle") +
    `<div class="saldo total"><span class="saldo-n">Total (caja + banco + deudores)</span><span class="saldo-cols">${dosColumnas(s.total)}</span></div>`;

  // Lista de deudores
  $("deudores").innerHTML = ldeu.length ? `<div class="deudores">
    <div class="deudores-titulos" aria-hidden="true"><span>Deudor</span><span>Pesos</span><span>Dólares</span><span></span></div>` + ldeu.map(d => `
    <div class="deudor${filtroGastos === d.id ? " activo" : ""}">
      <input class="deudor-n" data-renombrar="${esc(d.id)}" value="${esc(d.nombre)}" aria-label="Nombre del deudor ${esc(d.nombre)}">
      <button class="deudor-v" data-cuenta="${esc(d.id)}" title="Ver sus movimientos" aria-label="Ver movimientos de ${esc(d.nombre)}: ${enMoneda(s[d.id].UYU, "UYU")} y ${enMoneda(s[d.id].USD, "USD")}">${dosColumnas(s[d.id])}</button>
      <button class="x" data-borrardeudor="${esc(d.id)}" aria-label="Borrar deudor ${esc(d.nombre)}">×</button>
    </div>`).join("") + `</div>`
    : `<p class="empty">Todavía no hay deudores. Agregá uno abajo o desde "Nuevo movimiento".</p>`;

  // Filtro de la lista
  const opt = (v, t) => `<option value="${esc(v)}"${filtroGastos === v ? " selected" : ""}>${esc(t)}</option>`;
  $("g-filtro").innerHTML = opt("", "Todas las cuentas") + opt("caja", "Caja chica") + opt("banco", "Banco") +
    opt(GRUPO_DEUDORES, "Todos los deudores") +
    (ldeu.length ? `<optgroup label="Un deudor">${ldeu.map(d => opt(d.id, d.nombre)).join("")}</optgroup>` : "");

  const visibles = lista.filter(m => tocaFiltro(m, filtroGastos, idsDeu))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));

  $("g-lista").innerHTML = visibles.length ? visibles.map(m => {
    // Signo según la cuenta que se está mirando (o según el tipo si se ve todo)
    const es = id => filtroGastos === GRUPO_DEUDORES ? idsDeu.has(id) : id === filtroGastos;
    const suma = filtroGastos ? es(m.hacia) && !es(m.desde) : m.tipo === "entrada";
    const resta = filtroGastos ? es(m.desde) && !es(m.hacia) : m.tipo === "salida";
    const signo = suma ? "+" : resta ? "−" : "";
    const clase = suma ? "mas" : resta ? "menos" : "";
    const cuenta = m.tipo === "pase" ? `${esc(nombreCuenta(m.desde))} → ${esc(nombreCuenta(m.hacia))}` : esc(nombreCuenta(m.hacia || m.desde));
    const fila = `<tr>
      <td>${dmy(m.fecha)}</td>
      <td>${esc(m.desc) || '<span class="muted">Sin descripción</span>'}</td>
      <td>${cuenta}</td>
      <td class="n col-uyu ${m.moneda === "UYU" ? clase : ""}">${m.moneda === "UYU" ? `${signo} ${pes(m.monto)}` : ""}</td>
      <td class="n col-usd ${m.moneda === "USD" ? clase : ""}">${m.moneda === "USD" ? `${signo} ${usd(m.monto)}` : ""}</td>
      <td><button class="x" data-borrarmov="${esc(m.id)}" aria-label="Borrar movimiento ${esc(m.desc)}">×</button></td>
    </tr>`;
    const conf = borrandoMov !== m.id ? "" : `<tr><td colspan="6"><div class="acept" role="alertdialog" aria-labelledby="bm-txt">
      <span id="bm-txt">¿Borrar este movimiento? Los saldos se recalculan.</span>
      <button class="btn warn sm" data-borrarmovok="${esc(m.id)}">Sí, borrar</button>
      <button class="btn ghost sm" data-cancelmov="1">Cancelar</button></div></td></tr>`;
    return fila + conf;
  }).join("")
    : `<tr><td colspan="6" class="empty">${lista.length ? "No hay movimientos en esa cuenta." : "Todavía no cargaste movimientos. Empezá cargando lo que tenés hoy en caja y banco como \"Entra plata\", y lo que te debe cada cliente."}</td></tr>`;

  pintarTipoMov();
  if (typeof renderMenuGastos === "function") renderMenuGastos();
}

/** Opciones de cuentas para el formulario: caja y banco, después cada deudor y "nuevo deudor". */
function opcionesCuentas(sel) {
  const ldeu = deudores();
  const o = (v, t) => `<option value="${esc(v)}"${v === sel ? " selected" : ""}>${esc(t)}</option>`;
  return `<optgroup label="Caja y banco">${FIJAS.map(f => o(f.id, f.n)).join("")}</optgroup>` +
    `<optgroup label="Deudores por ventas">${ldeu.map(d => o(d.id, d.nombre)).join("")}${o(NUEVO, "＋ Nuevo deudor…")}</optgroup>`;
}

/** Muestra los campos que corresponden al tipo de movimiento elegido. */
function pintarTipoMov() {
  document.querySelectorAll("#g-tipo-mov [data-tipo]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tipo === tipoMov)));
  document.querySelectorAll("#g-moneda [data-moneda]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.moneda === monedaMov)));
  $("g-monto-et").textContent = monedaMov === "USD" ? "Monto (U$S)" : "Monto ($)";
  $("g-ayuda").textContent = AYUDA_TIPO[tipoMov];
  $("g-desde-l").hidden = tipoMov === "entrada";
  $("g-hacia-l").hidden = tipoMov === "salida";
  const valido = v => v === NUEVO || idsCuentas().has(v);
  const desde = valido($("g-desde").value) ? $("g-desde").value : "caja";
  const hacia = valido($("g-hacia").value) ? $("g-hacia").value : (tipoMov === "pase" ? "banco" : "caja");
  $("g-desde").innerHTML = opcionesCuentas(desde);
  $("g-hacia").innerHTML = opcionesCuentas(hacia);
  pintarNuevoDeudor();
  if (!$("g-fecha").value) $("g-fecha").value = hoy();
}

/** El campo "Nombre del deudor nuevo" aparece solo si se eligió "＋ Nuevo deudor…". */
function pintarNuevoDeudor() {
  const usa = (!$("g-desde-l").hidden && $("g-desde").value === NUEVO) || (!$("g-hacia-l").hidden && $("g-hacia").value === NUEVO);
  $("g-nuevo-l").hidden = !usa;
}

function errorGastos(msg) {
  $("g-error").textContent = msg || "";
  $("g-error").hidden = !msg;
}

/** Abre la pantalla de gastos (opcionalmente mirando una cuenta, un deudor o todos los deudores). */
function abrirGastos(cuenta) {
  filtroGastos = cuenta || "";
  borrandoMov = null;
  show("gastos");
  $("g-h").focus();
}

// ---- Eventos ----
$("g-tipo-mov").addEventListener("click", e => {
  const t = e.target.dataset.tipo;
  if (!t) return;
  tipoMov = t;
  errorGastos("");
  pintarTipoMov();
});
$("g-moneda").addEventListener("click", e => {
  const mo = e.target.dataset.moneda;
  if (!mo) return;
  monedaMov = mo;
  pintarTipoMov();
  $("g-monto").focus();
});
["g-desde", "g-hacia"].forEach(id => $(id).addEventListener("change", () => {
  pintarNuevoDeudor();
  if (!$("g-nuevo-l").hidden) $("g-nuevo").focus();
}));

$("g-guardar").onclick = () => {
  const monto = numPesos($("g-monto").value);
  let desde = tipoMov === "entrada" ? null : $("g-desde").value;
  let hacia = tipoMov === "salida" ? null : $("g-hacia").value;
  if (!(monto > 0)) { errorGastos("Poné un monto mayor a cero."); $("g-monto").focus(); return; }
  if (desde === NUEVO && hacia === NUEVO) { errorGastos("Elegí dos cuentas distintas para pasar la plata."); $("g-hacia").focus(); return; }
  if (desde === NUEVO || hacia === NUEVO) {
    const nombre = $("g-nuevo").value.trim();
    if (!nombre) { errorGastos("Escribí el nombre del deudor nuevo."); $("g-nuevo").focus(); return; }
    const d = crearDeudor(nombre);
    if (desde === NUEVO) desde = d.id; else hacia = d.id;
  }
  if (tipoMov === "pase" && desde === hacia) { errorGastos("Elegí dos cuentas distintas para pasar la plata."); $("g-hacia").focus(); return; }

  const actuales = movimientos();
  const m = normalizarMov({ id: nuevoIdUnico(new Set(actuales.map(x => x.id))), fecha: $("g-fecha").value, tipo: tipoMov, moneda: monedaMov, desde, hacia, monto, desc: $("g-desc").value.trim() });
  if (!m) { errorGastos("Revisá los datos del movimiento."); return; }
  errorGastos("");
  save(CLAVES.gastos, [...actuales, m]);
  $("g-monto").value = "";
  $("g-desc").value = "";
  $("g-nuevo").value = "";
  $("g-monto").removeAttribute("aria-invalid");
  // Si se creó un deudor, queda elegido en el formulario para el próximo movimiento
  if ($("g-desde").value === NUEVO) $("g-desde").value = m.desde;
  if ($("g-hacia").value === NUEVO) $("g-hacia").value = m.hacia;
  renderGastos();
  if (m.desde) $("g-desde").value = m.desde;
  if (m.hacia) $("g-hacia").value = m.hacia;
  pintarNuevoDeudor();
  const verbo = { entrada: `entró a ${nombreCuenta(m.hacia)}`, salida: `salió de ${nombreCuenta(m.desde)}`, pase: `pasó de ${nombreCuenta(m.desde)} a ${nombreCuenta(m.hacia)}` }[m.tipo];
  toast(`Guardado: ${enMoneda(m.monto, m.moneda)} ${verbo}`);
  $("g-monto").focus();
};
// Enter en monto, descripción o nombre del deudor guarda
["g-monto", "g-desc", "g-nuevo"].forEach(id => $(id).addEventListener("keydown", e => { if (e.key === "Enter") $("g-guardar").click(); }));

// Tarjetas de saldo y montos de cada deudor: filtran la lista (otro toque la vuelve a mostrar completa)
function alternarFiltro(id) {
  filtroGastos = filtroGastos === id ? "" : id;
  renderGastos();
}
$("saldos").addEventListener("click", e => {
  const b = e.target.closest("[data-cuenta]");
  if (!b) return;
  alternarFiltro(b.dataset.cuenta);
  $("saldos").querySelector(`[data-cuenta="${CSS.escape(b.dataset.cuenta)}"]`)?.focus();
});
$("g-filtro").onchange = e => { filtroGastos = e.target.value; renderGastos(); };

// Deudores: alta, renombrar, borrar y ver sus movimientos
function agregarDeudor() {
  const nombre = $("d-nuevo").value.trim();
  if (!nombre) { toast("Escribí el nombre del deudor"); $("d-nuevo").focus(); return; }
  const ya = deudores().some(d => d.nombre.toLowerCase() === nombre.toLowerCase());
  const d = crearDeudor(nombre);
  $("d-nuevo").value = "";
  renderGastos();
  toast(ya ? `${d.nombre} ya estaba en la lista` : `Deudor agregado: ${d.nombre}`);
  $("d-nuevo").focus();
}
$("d-agregar").onclick = agregarDeudor;
$("d-nuevo").addEventListener("keydown", e => { if (e.key === "Enter") agregarDeudor(); });

$("deudores").addEventListener("click", e => {
  const ver = e.target.closest("[data-cuenta]");
  if (ver) { alternarFiltro(ver.dataset.cuenta); $("g-lista").closest("section").scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  const id = e.target.dataset.borrardeudor;
  if (!id) return;
  const usado = movimientos().some(m => m.desde === id || m.hacia === id);
  if (usado) { toast("No se puede borrar: tiene movimientos. Borrá primero sus movimientos."); return; }
  save(CLAVES.deudores, deudores().filter(d => d.id !== id));
  renderGastos();
  toast("Deudor borrado");
  $("d-nuevo").focus();
});
// Renombrar: se guarda al salir del campo o con Enter
$("deudores").addEventListener("change", e => {
  const id = e.target.dataset.renombrar;
  if (!id) return;
  const nombre = e.target.value.trim();
  const lista = deudores();
  if (!nombre || lista.some(d => d.id !== id && d.nombre.toLowerCase() === nombre.toLowerCase())) {
    toast(nombre ? "Ya hay un deudor con ese nombre" : "El nombre no puede quedar vacío");
    renderGastos();
    return;
  }
  save(CLAVES.deudores, lista.map(d => d.id === id ? { ...d, nombre } : d));
  renderGastos();
});
$("deudores").addEventListener("keydown", e => { if (e.key === "Enter" && e.target.dataset.renombrar) e.target.blur(); });

$("g-lista").addEventListener("click", e => {
  const d = e.target.dataset;
  if (d.borrarmov) { borrandoMov = d.borrarmov; renderGastos(); $("g-lista").querySelector("[data-cancelmov]")?.focus(); return; }
  if (d.cancelmov) { const id = borrandoMov; borrandoMov = null; renderGastos(); $("g-lista").querySelector(`[data-borrarmov="${CSS.escape(id)}"]`)?.focus(); return; }
  if (d.borrarmovok) {
    save(CLAVES.gastos, movimientos().filter(m => m.id !== d.borrarmovok));
    borrandoMov = null;
    renderGastos();
    toast("Movimiento borrado");
    $("g-monto").focus();
  }
});
