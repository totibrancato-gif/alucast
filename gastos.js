"use strict";
// =========================================================================
// Control de gastos: cuánto hay en la caja chica, en el banco y cuánto te
// debe cada cliente. Cada deudor es una cuenta propia; "Deudores por ventas"
// es la suma de todos. Cada movimiento suma o resta en la cuenta que elegís:
//   - Entra plata: se suma a una cuenta.
//   - Sale plata: se resta de una cuenta.
//   - Pasar de una a otra: se resta de una y se suma a la otra
//     (ej.: Pérez te paga lo que debía → sale de "Pérez", entra a "Banco").
// "Plata que debo" es lo que le debés a otros: va aparte del total (ver efecto()).
// =========================================================================

const FIJAS = [
  { id: "caja", n: "Caja chica" },
  { id: "banco", n: "Banco" },
];
const GRUPO_DEUDORES = "deudores";          // para ver/filtrar todos los deudores juntos
const GRUPO_ACREEDORES = "acreedores";      // "Plata que debo": todas las cuentas a las que les debés
const NUEVO = "__nuevo";                    // opción "＋ Nuevo deudor…" en el formulario
const NUEVO_DEBO = "__nuevodebo";           // opción "＋ Nueva cuenta que debo…" en el formulario
// Antes había una sola cuenta "En la calle" (id "calle"). Si hay movimientos viejos con ella,
// pasa a ser un deudor más con este nombre (se puede renombrar).
const DEUDOR_VIEJO = { id: "calle", nombre: "Varios (antes \"En la calle\")" };
// "Plata que debo" empezó como una sola cuenta (id "debo"). Si hay movimientos con ella,
// pasa a ser una cuenta más de lo que debés, con este nombre (se puede renombrar).
const ACREEDOR_VIEJO = { id: "debo", nombre: "Varios", debo: true };

const AYUDA_TIPO = {
  entrada: "La plata se suma a la cuenta que elijas. Ej.: le hiciste un trabajo a Pérez y te queda debiendo → entra a Pérez (deudor).",
  salida: "La plata se resta de la cuenta que elijas. Ej.: compra de perfiles pagada por transferencia → sale de Banco.",
  pase: "Se resta de una cuenta y se suma a la otra. Ej.: Pérez te paga por transferencia lo que debía → sale de Pérez y entra a Banco.",
};
/** Se agrega a la ayuda cuando el movimiento usa "Plata que debo". */
const AYUDA_DEBO = {
  entrada: "En \"Plata que debo\", entra plata = debés más (ej.: compraste perfiles a pagar).",
  salida: "En \"Plata que debo\", sale plata = debés menos (ej.: te descontaron parte de la deuda).",
  pase: "Pasar de Banco (o Caja) a \"Plata que debo\" = pagaste: bajan los dos. De \"Plata que debo\" a Banco = te prestaron: suben los dos.",
};

let tipoMov = "entrada";
let filtroGastos = "";      // "" = todo; "caja", "banco", "deudores" o el id de un deudor
let borrandoMov = null;     // id del movimiento que se está por borrar

// Cuentas con saldo 0 (en pesos y en dólares), de deudores o de lo que debés: se ocultan, salvo que se
// marque "Mostrar los que están en 0". La preferencia queda en cada equipo (no va a la nube).
const CLAVE_VER_CERO = "alucast-ver-deudores-en-0";
let verDeudoresEnCero = load(CLAVE_VER_CERO, false) === true;
const enCero = v => Math.abs(v?.UYU || 0) < 0.005 && Math.abs(v?.USD || 0) < 0.005;
/** Cuentas que se muestran: todas, o solo las que tienen saldo (y la que se está mirando, aunque esté en 0). */
const cuentasVisibles = (lista, s) => verDeudoresEnCero ? lista : lista.filter(d => !enCero(s[d.id]) || d.id === filtroGastos);
const deudoresVisibles = cuentasVisibles;

// ---- Cuentas de personas: deudores (te deben) y cuentas de "Plata que debo" (les debés) ----
// Van todas en la misma lista (CLAVES.deudores, así se sincronizan igual); las que debés llevan debo: true.
function normalizarDeudores(lista) {
  const vistos = new Set();
  return (Array.isArray(lista) ? lista : [])
    .filter(d => d && typeof d === "object" && d.id && !FIJAS.some(f => f.id === d.id))
    .map(d => ({ id: String(d.id), nombre: String(d.nombre ?? "").trim() || "Sin nombre", ...(d.debo === true ? { debo: true } : {}) }))
    .filter(d => !vistos.has(d.id) && vistos.add(d.id));
}
const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
const personas = () => normalizarDeudores(load(CLAVES.deudores, [])).sort(porNombre);
const deudores = () => personas().filter(d => !d.debo);
const acreedores = () => personas().filter(d => d.debo);
const esDeudor = id => deudores().some(d => d.id === id);

function nuevoIdUnico(usados) {
  let id;
  do { id = Date.now().toString(36).padStart(9, "0") + "-" + Math.random().toString(36).slice(2, 8); } while (usados.has(id));
  return id;
}

/** Crea un deudor, o una cuenta de lo que debés (debo = true); si ya hay una con ese nombre, devuelve esa. */
function crearCuenta(nombre, debo = false) {
  nombre = String(nombre || "").trim();
  if (!nombre) return null;
  const todas = personas();
  const existe = todas.find(d => !!d.debo === debo && d.nombre.toLowerCase() === nombre.toLowerCase());
  if (existe) return existe;
  const d = { id: (debo ? "a-" : "d-") + nuevoIdUnico(new Set(todas.map(x => x.id))), nombre, ...(debo ? { debo: true } : {}) };
  save(CLAVES.deudores, [...todas, d]);
  return d;
}
const crearDeudor = nombre => crearCuenta(nombre, false);

/** Cuentas válidas: caja, banco, cada deudor y cada cuenta de lo que debés. */
const idsCuentas = (lista = personas()) => new Set([...FIJAS.map(f => f.id), ...lista.map(d => d.id)]);
function nombreCuenta(id) {
  const f = FIJAS.find(c => c.id === id);
  if (f) return f.n;
  if (id === GRUPO_DEUDORES) return "Deudores por ventas";
  if (id === GRUPO_ACREEDORES) return "Plata que debo";
  return (personas().find(d => d.id === id) || {}).nombre || "";
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
 * Cuánto cambia el saldo de una cuenta con un movimiento: +1 (sube), -1 (baja) o 0.
 * Las cuentas de "Plata que debo" (idsAcr) son deudas: entra plata = debés más, sale plata = debés
 * menos, y en un pase van al revés que las demás: de Banco a una cuenta que debés es un pago
 * (bajan los dos) y de una cuenta que debés a Banco es un préstamo (suben los dos).
 */
function efecto(m, id, idsAcr) {
  const pase = m.tipo === "pase" && idsAcr.has(id);
  return (m.hacia === id ? (pase ? -1 : 1) : 0) + (m.desde === id ? (pase ? 1 : -1) : 0);
}

/**
 * Saldo de cada cuenta (caja, banco, cada deudor, cada cuenta que debés), del total de deudores,
 * del total de lo que debés y del total general, con pesos y dólares por separado: s[cuenta] = { UYU, USD }.
 * El total es caja + banco + deudores (lo que debés va aparte).
 */
function saldos(lista = movimientos(), listaDeudores = deudores(), listaAcreedores = acreedores()) {
  const s = { caja: cero(), banco: cero() };
  [...listaDeudores, ...listaAcreedores].forEach(d => { s[d.id] = cero(); });
  const idsAcr = new Set(listaAcreedores.map(d => d.id));
  lista.forEach(m => [...new Set([m.hacia, m.desde])].forEach(id => {
    if (id in s) s[id][m.moneda] += efecto(m, id, idsAcr) * m.monto;
  }));
  const sumar = ids => { const t = cero(); ids.forEach(id => MONEDAS.forEach(mo => { t[mo] += s[id][mo]; })); return t; };
  s[GRUPO_DEUDORES] = sumar(listaDeudores.map(d => d.id));
  s[GRUPO_ACREEDORES] = sumar(listaAcreedores.map(d => d.id));
  s.total = sumar(["caja", "banco", GRUPO_DEUDORES]);
  return s;
}

/** Signo de un movimiento visto desde una cuenta o un grupo (todos los deudores, toda la plata que debo): "+", "−" o "". */
function signoEn(m, cuenta, idsDeu, idsAcr) {
  let e;
  if (cuenta === GRUPO_DEUDORES) e = (idsDeu.has(m.hacia) ? 1 : 0) - (idsDeu.has(m.desde) ? 1 : 0);
  else if (cuenta === GRUPO_ACREEDORES) e = [...new Set([m.hacia, m.desde])].filter(id => idsAcr.has(id)).reduce((t, id) => t + efecto(m, id, idsAcr), 0);
  else e = efecto(m, cuenta, idsAcr);
  return e > 0 ? "+" : e < 0 ? "−" : "";
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

/** Si hay movimientos de la primera "Plata que debo" (una sola cuenta), se crea su cuenta "Varios" (una sola vez). */
(function migrarDebo() {
  const usados = (load(CLAVES.gastos, []) || []).some(m => m && (m.desde === ACREEDOR_VIEJO.id || m.hacia === ACREEDOR_VIEJO.id));
  const lista = normalizarDeudores(load(CLAVES.deudores, []));
  if (usados && !lista.some(d => d.id === ACREEDOR_VIEJO.id)) save(CLAVES.deudores, [...lista, { ...ACREEDOR_VIEJO }]);
})();

// ---- Pantalla ----
/** ¿El movimiento toca la cuenta (o el grupo) que se está mirando? */
function tocaFiltro(m, filtro, idsDeu, idsAcr) {
  if (!filtro) return true;
  if (filtro === GRUPO_DEUDORES) return idsDeu.has(m.desde) || idsDeu.has(m.hacia);
  if (filtro === GRUPO_ACREEDORES) return idsAcr.has(m.desde) || idsAcr.has(m.hacia);
  return m.desde === filtro || m.hacia === filtro;
}

/** Lista de cuentas de personas (deudores o lo que debés) con su saldo, para renombrar, borrar y ver movimientos. */
function htmlCuentas(lista, s, titulo) {
  return `<div class="deudores">
    <div class="deudores-titulos" aria-hidden="true"><span>${titulo}</span><span>Pesos</span><span>Dólares</span><span></span></div>` + lista.map(d => `
    <div class="deudor${filtroGastos === d.id ? " activo" : ""}">
      <input class="deudor-n" data-renombrar="${esc(d.id)}" value="${esc(d.nombre)}" aria-label="Nombre de ${esc(d.nombre)}">
      <button class="deudor-v" data-cuenta="${esc(d.id)}" title="Ver sus movimientos" aria-label="Ver movimientos de ${esc(d.nombre)}: ${enMoneda(s[d.id].UYU, "UYU")} y ${enMoneda(s[d.id].USD, "USD")}">${dosColumnas(s[d.id])}</button>
      <button class="x" data-borrardeudor="${esc(d.id)}" aria-label="Borrar ${esc(d.nombre)}">×</button>
    </div>`).join("") + `</div>`;
}

function renderGastos() {
  const lista = movimientos(), ldeu = deudores(), lacr = acreedores(), s = saldos(lista, ldeu, lacr);
  const idsDeu = new Set(ldeu.map(d => d.id)), idsAcr = new Set(lacr.map(d => d.id));
  if (filtroGastos && ![GRUPO_DEUDORES, GRUPO_ACREEDORES].includes(filtroGastos) && !FIJAS.some(f => f.id === filtroGastos)
    && !idsDeu.has(filtroGastos) && !idsAcr.has(filtroGastos)) filtroGastos = "";

  // Tarjetas: cada una con su columna de pesos y su columna de dólares
  const tarjeta = (id, nombre, punto) => `
    <button class="saldo${filtroGastos === id ? " activo" : ""}" data-cuenta="${id}" aria-pressed="${filtroGastos === id}">
      <span class="saldo-n"><span class="cuenta-punto ${punto}" aria-hidden="true"></span>${esc(nombre)}</span>
      <span class="saldo-cols">${dosColumnas(s[id])}</span>
    </button>`;
  $("saldos").innerHTML = `<div class="saldos-titulos" aria-hidden="true"><span></span><span>Pesos</span><span>Dólares</span></div>` +
    tarjeta("caja", "Caja chica", "caja") + tarjeta("banco", "Banco", "banco") +
    tarjeta(GRUPO_DEUDORES, `Deudores por ventas (${ldeu.length})`, "calle") +
    `<div class="saldo total"><span class="saldo-n">Total (caja + banco + deudores)</span><span class="saldo-cols">${dosColumnas(s.total)}</span></div>` +
    tarjeta(GRUPO_ACREEDORES, `Plata que debo (${lacr.length})`, "debo");

  // Listas de deudores y de lo que debés (sin las cuentas en 0, salvo que se pidan)
  const pintarLista = (pref, todas, vacio, ninguno, titulo) => {
    const vis = cuentasVisibles(todas, s), ocultos = todas.length - vis.length;
    $(pref + "-ver-cero").checked = verDeudoresEnCero;
    $(pref + "-cero-info").textContent = ocultos ? `(${ocultos} ${ocultos === 1 ? "oculto" : "ocultos"})` : "";
    $(pref === "d" ? "deudores" : "acreedores").innerHTML = !todas.length ? `<p class="empty">${vacio}</p>`
      : !vis.length ? `<p class="empty">${ninguno} Marcá "Mostrar los que están en 0" para verlos.</p>`
      : htmlCuentas(vis, s, titulo);
  };
  pintarLista("d", ldeu, "Todavía no hay deudores. Agregá uno abajo o desde \"Nuevo movimiento\".", "Ningún deudor te debe nada.", "Deudor");
  pintarLista("a", lacr, "Todavía no hay cuentas. Agregá una abajo (ej.: Aluminios del Uruguay) o desde \"Nuevo movimiento\".", "No le debés nada a nadie.", "Le debo a");

  // Filtro de la lista
  const opt = (v, t) => `<option value="${esc(v)}"${filtroGastos === v ? " selected" : ""}>${esc(t)}</option>`;
  $("g-filtro").innerHTML = opt("", "Todas las cuentas") + opt("caja", "Caja chica") + opt("banco", "Banco") +
    opt(GRUPO_DEUDORES, "Todos los deudores") +
    (ldeu.length ? `<optgroup label="Un deudor">${ldeu.map(d => opt(d.id, d.nombre)).join("")}</optgroup>` : "") +
    opt(GRUPO_ACREEDORES, "Toda la plata que debo") +
    (lacr.length ? `<optgroup label="Una cuenta que debo">${lacr.map(d => opt(d.id, d.nombre)).join("")}</optgroup>` : "");
  // El estado de cuenta en PDF es de una cuenta: aparece cuando se elige una
  $("g-estado").hidden = !filtroGastos;

  const visibles = lista.filter(m => tocaFiltro(m, filtroGastos, idsDeu, idsAcr))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));

  $("g-lista").innerHTML = visibles.length ? visibles.map(m => {
    // Signo según la cuenta que se está mirando (o según el tipo si se ve todo)
    const signo = filtroGastos ? signoEn(m, filtroGastos, idsDeu, idsAcr) : m.tipo === "entrada" ? "+" : m.tipo === "salida" ? "−" : "";
    const suma = signo === "+", resta = signo === "−";
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

/** Opciones de cuentas para el formulario: caja y banco, cada deudor ("nuevo deudor") y cada cuenta que debés ("nueva cuenta"). */
function opcionesCuentas(sel) {
  const o = (v, t) => `<option value="${esc(v)}"${v === sel ? " selected" : ""}>${esc(t)}</option>`;
  return `<optgroup label="Caja y banco">${FIJAS.map(f => o(f.id, f.n)).join("")}</optgroup>` +
    `<optgroup label="Deudores por ventas">${deudores().map(d => o(d.id, d.nombre)).join("")}${o(NUEVO, "＋ Nuevo deudor…")}</optgroup>` +
    `<optgroup label="Plata que debo">${acreedores().map(d => o(d.id, d.nombre)).join("")}${o(NUEVO_DEBO, "＋ Nueva cuenta que debo…")}</optgroup>`;
}

/** Muestra los campos que corresponden al tipo de movimiento elegido. */
function pintarTipoMov() {
  document.querySelectorAll("#g-tipo-mov [data-tipo]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tipo === tipoMov)));
  document.querySelectorAll("#g-moneda [data-moneda]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.moneda === monedaMov)));
  $("g-monto-et").textContent = monedaMov === "USD" ? "Monto (U$S)" : "Monto ($)";
  $("g-desde-l").hidden = tipoMov === "entrada";
  $("g-hacia-l").hidden = tipoMov === "salida";
  const valido = v => v === NUEVO || v === NUEVO_DEBO || idsCuentas().has(v);
  const desde = valido($("g-desde").value) ? $("g-desde").value : "caja";
  const hacia = valido($("g-hacia").value) ? $("g-hacia").value : (tipoMov === "pase" ? "banco" : "caja");
  $("g-desde").innerHTML = opcionesCuentas(desde);
  $("g-hacia").innerHTML = opcionesCuentas(hacia);
  pintarNuevoDeudor();
  pintarAyuda();
  if (!$("g-fecha").value) $("g-fecha").value = hoy();
}

/** Ayuda del tipo de movimiento; si usa "Plata que debo", también qué significa ahí. */
function pintarAyuda() {
  const idsAcr = new Set(acreedores().map(d => d.id));
  const debo = v => v === NUEVO_DEBO || idsAcr.has(v);
  const usaDebo = (!$("g-desde-l").hidden && debo($("g-desde").value)) || (!$("g-hacia-l").hidden && debo($("g-hacia").value));
  $("g-ayuda").textContent = AYUDA_TIPO[tipoMov] + (usaDebo ? " " + AYUDA_DEBO[tipoMov] : "");
}

/** Lo que se eligió como cuenta nueva en el formulario: NUEVO (deudor), NUEVO_DEBO (cuenta que debés) o "". */
function cuentaNuevaElegida() {
  const v = [!$("g-desde-l").hidden && $("g-desde").value, !$("g-hacia-l").hidden && $("g-hacia").value];
  return v.includes(NUEVO) ? NUEVO : v.includes(NUEVO_DEBO) ? NUEVO_DEBO : "";
}

/** El campo del nombre aparece solo si se eligió "＋ Nuevo deudor…" o "＋ Nueva cuenta que debo…". */
function pintarNuevoDeudor() {
  const nueva = cuentaNuevaElegida();
  $("g-nuevo-l").hidden = !nueva;
  $("g-nuevo-et").textContent = nueva === NUEVO_DEBO ? "Nombre de la cuenta que debo (a quién le debés)" : "Nombre del deudor nuevo";
  $("g-nuevo").placeholder = nueva === NUEVO_DEBO ? "Ej: Aluminios del Uruguay" : "Ej: Juan Pérez";
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
  pintarAyuda();
  if (!$("g-nuevo-l").hidden) $("g-nuevo").focus();
}));

$("g-guardar").onclick = () => {
  const monto = numPesos($("g-monto").value);
  let desde = tipoMov === "entrada" ? null : $("g-desde").value;
  let hacia = tipoMov === "salida" ? null : $("g-hacia").value;
  if (!(monto > 0)) { errorGastos("Poné un monto mayor a cero."); $("g-monto").focus(); return; }
  const nuevas = [desde, hacia].filter(v => v === NUEVO || v === NUEVO_DEBO);
  if (nuevas.length > 1) { errorGastos("Creá una cuenta nueva por vez: elegí una cuenta que ya exista en el otro lado."); $("g-hacia").focus(); return; }
  if (nuevas.length) {
    const nombre = $("g-nuevo").value.trim(), debo = nuevas[0] === NUEVO_DEBO;
    if (!nombre) { errorGastos(debo ? "Escribí a quién le debés." : "Escribí el nombre del deudor nuevo."); $("g-nuevo").focus(); return; }
    const d = crearCuenta(nombre, debo);
    if (desde === nuevas[0]) desde = d.id; else hacia = d.id;
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
  // Si se creó una cuenta, queda elegida en el formulario para el próximo movimiento
  if ([NUEVO, NUEVO_DEBO].includes($("g-desde").value)) $("g-desde").value = m.desde;
  if ([NUEVO, NUEVO_DEBO].includes($("g-hacia").value)) $("g-hacia").value = m.hacia;
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
// "Mostrar los que están en 0" (la misma elección para deudores y para lo que debés)
["d-ver-cero", "a-ver-cero"].forEach(id => $(id).onchange = e => {
  verDeudoresEnCero = e.target.checked;
  save(CLAVE_VER_CERO, verDeudoresEnCero);
  renderGastos();
});

// Estado de cuenta en PDF de la cuenta elegida (caja, banco, un deudor o todos los deudores)
$("g-estado").onclick = async () => {
  if (!filtroGastos) return;
  if (!window.jspdf) { toast("No se pudo cargar el generador de PDF"); return; }
  let doc;
  try { doc = generarEstadoCuenta(filtroGastos); }
  catch (e) { console.error(e); toast("No se pudo armar el PDF (" + textoError(e) + ")"); return; }
  await guardarDocPDF(doc, nombreEstadoCuenta(filtroGastos));
};

// Deudores y cuentas de lo que debés: alta, renombrar, borrar y ver sus movimientos.
// Se guardan siempre sobre la lista completa (personas()), así tocar una no borra las de la otra.
[["d", false, "deudores", "deudor", "Deudor agregado"], ["a", true, "acreedores", "cuenta", "Cuenta agregada"]].forEach(([pref, debo, cont, cual, agregado]) => {
  const agregar = () => {
    const nombre = $(pref + "-nuevo").value.trim();
    if (!nombre) { toast(debo ? "Escribí a quién le debés" : "Escribí el nombre del deudor"); $(pref + "-nuevo").focus(); return; }
    const ya = (debo ? acreedores() : deudores()).some(d => d.nombre.toLowerCase() === nombre.toLowerCase());
    const d = crearCuenta(nombre, debo);
    $(pref + "-nuevo").value = "";
    renderGastos();
    toast(ya ? `${d.nombre} ya estaba en la lista` : `${agregado}: ${d.nombre}`);
    $(pref + "-nuevo").focus();
  };
  $(pref + "-agregar").onclick = agregar;
  $(pref + "-nuevo").addEventListener("keydown", e => { if (e.key === "Enter") agregar(); });

  $(cont).addEventListener("click", e => {
    const ver = e.target.closest("[data-cuenta]");
    if (ver) { alternarFiltro(ver.dataset.cuenta); $("g-lista").closest("section").scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    const id = e.target.dataset.borrardeudor;
    if (!id) return;
    const usado = movimientos().some(m => m.desde === id || m.hacia === id);
    if (usado) { toast("No se puede borrar: tiene movimientos. Borrá primero sus movimientos."); return; }
    save(CLAVES.deudores, personas().filter(d => d.id !== id));
    renderGastos();
    toast(debo ? "Cuenta borrada" : "Deudor borrado");
    $(pref + "-nuevo").focus();
  });
  // Renombrar: se guarda al salir del campo o con Enter
  $(cont).addEventListener("change", e => {
    const id = e.target.dataset.renombrar;
    if (!id) return;
    const nombre = e.target.value.trim();
    const mismas = debo ? acreedores() : deudores();
    if (!nombre || mismas.some(d => d.id !== id && d.nombre.toLowerCase() === nombre.toLowerCase())) {
      toast(nombre ? `Ya hay un ${cual} con ese nombre` : "El nombre no puede quedar vacío");
      renderGastos();
      return;
    }
    save(CLAVES.deudores, personas().map(d => d.id === id ? { ...d, nombre } : d));
    renderGastos();
  });
  $(cont).addEventListener("keydown", e => { if (e.key === "Enter" && e.target.dataset.renombrar) e.target.blur(); });
});

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
