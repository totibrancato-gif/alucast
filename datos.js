"use strict";
// =========================================================================
// Datos de la app: valores por defecto, claves de guardado y estado actual.
// Las claves NO se renombran: así se conservan los datos ya guardados.
// =========================================================================

const CLAVES = {
  lista: "alucast-lista-v5",       // precios, líneas y dólar
  historial: "alucast-hist-v4",    // presupuestos guardados
  numero: "alucast-num",           // último número de presupuesto usado
  borrador: "alucast-borrador-v5", // lo que estás cargando ahora
  empresa: "alucast-empresa",      // tus datos para el PDF
};

// Lista de precios de fábrica (cargada el 12/10/2026, igual que en la versión web)
const defPerfiles = lista => lista.map(([n, kgm]) => ({ n, kgm }));
const defPrecios = lista => lista.map(([n, usd]) => ({ n, usd }));
const DEF = {
  dolar: 41, vidrio: 14, barra: 6.8,
  acabados: { "Negro": 12, "Gris": 10.5, "Anolok": 14 },
  lineas: [
    { n: "Probba",
      perfiles: defPerfiles([["RIEL PROBBA", 0.921], ["LATERAL MARCO", 0.554], ["ENGANCHE HOJA", 0.615], ["LATERAL HOJA", 0.62], ["DIVISOR HOJA", 0.6], ["HOJA MOSQUITERO", 0.53], ["RIEL MOSQUITERO", 0.32]]),
      accesorios: defPrecios([["MANIJAS", 0.4], ["RUEDAS 40Kg", 1.68], ["CIERRE LARA", 1.5], ["TAPON", 0.55], ["DISPOSITIVO", 0.9], ["CUBRE DESAGUE", 0.5], ["BURLETE", 0.53], ["TEJIDO", 4.5], ["RUEDAS MOSQUITERO", 0.7], ["RUEDAS 80Kg", 3.8]]) },
    { n: "Serie 20",
      perfiles: defPerfiles([["MARCO SUPERIOR", 0.605], ["MARCO LATERAL", 0.4], ["DIVISOR HOJA", 0.4], ["ENGANCHE", 0.473], ["LATERAL HOJA", 0.432], ["RIEL MOSQUITERO", 0.19], ["HOJA MOSQUITERO", 0.25]]),
      accesorios: defPrecios([["RUEDAS VERDE", 0.3], ["RUEDA RULEMAN", 1.25], ["MANIJAS", 0.4], ["CIERRE", 1.5], ["BURLETE", 0.53], ["CUBRE DESAGUE", 0.25], ["DISPOSITIVO", 0.9], ["TEJIDO", 4.5], ["MANIJA MOSQUITERO", 0.4], ["PATIN", 0.15], ["TAPON", 0.1]]) },
    { n: "Mampara",
      perfiles: defPerfiles([["PERFIL U", 0], ["GUÍA SUPERIOR", 0], ["GUÍA INFERIOR", 0], ["TIRADOR", 0]]),
      accesorios: defPrecios([["RUEDAS MAMPARA", 0], ["TOPES", 0]]) },
    { n: "SERIE 30", perfiles: [], accesorios: [] },
    { n: "GALA", perfiles: [], accesorios: [] },
    { n: "GALA BATIENTE", perfiles: [], accesorios: [] },
    { n: "PROBBA BATIENTE", perfiles: [], accesorios: [] },
  ],
  vidrios: defPrecios([["3 mm", 8], ["4 mm", 14], ["5 mm", 19], ["6 mm", 22], ["Laminado", 40], ["Fantasía", 23]]),
};

const EMPRESA_DEF = { nombre: "Alucast", tel: "098975733", dir: "Bolivia 915", extra: "", validez: "15", condiciones: "" };
const NUMERO_INICIAL = 2345;

// ---- Estado ----
let P = load(CLAVES.lista, structuredClone(DEF)); // lista de precios
let EMP = { ...EMPRESA_DEF, ...load(CLAVES.empresa, {}) };
let items = [];      // ventanas del presupuesto actual
let extras = [];     // extras generales (solo presupuestos de la versión anterior)
let numero = load(CLAVES.numero, NUMERO_INICIAL);

// ---- Actualizaciones de datos (cada una corre una sola vez, igual que en la web) ----
(function migrar() {
  // Lista de precios con la forma mínima esperada (por si una copia importada vino incompleta)
  if (!P || typeof P !== "object") P = structuredClone(DEF);
  if (!Array.isArray(P.lineas) || !P.lineas.length) P.lineas = structuredClone(DEF.lineas);
  P.lineas = P.lineas.filter(l => l && typeof l === "object").map(l => ({
    ...l, n: String(l.n ?? ""),
    perfiles: (Array.isArray(l.perfiles) ? l.perfiles : []).filter(p => p && typeof p === "object"),
    accesorios: (Array.isArray(l.accesorios) ? l.accesorios : []).filter(a => a && typeof a === "object"),
  }));
  if (!P.acabados || typeof P.acabados !== "object" || !Object.keys(P.acabados).length) P.acabados = { ...DEF.acabados };
  if (!(+P.barra >= 1)) P.barra = DEF.barra;
  if (!(+P.dolar > 0)) P.dolar = DEF.dolar;
  numero = parseInt(numero) || NUMERO_INICIAL;
  // Tipos de vidrio: se crean con el precio único de vidrio que había
  if (!Array.isArray(P.vidrios)) {
    const base = +P.vidrio || 10;
    P.vidrios = DEF.vidrios.map(g => ({ n: g.n, usd: base }));
  }
  // Las barras miden 6,80 m (antes se usaba 3 m)
  if (!P.barra68) { if (+P.barra === 3) P.barra = 6.8; P.barra68 = true; }
  // Lista de precios de fábrica del 12/10/2026 (se conserva el dólar y cómo se cobra el aluminio)
  if (!load("alucast-precios-2026-10-12", false)) {
    const conservar = { dolar: P.dolar, cobrarBarra: P.cobrarBarra };
    P = Object.assign(structuredClone(DEF), conservar, { barra68: true });
    if (P.dolar == null) P.dolar = DEF.dolar;
    save("alucast-precios-2026-10-12", true);
  }
  // Descuentos del vidrio en metros (si alguno quedó cargado en cm, se pasa a metros)
  if (!P.descEnM) {
    (P.lineas || []).forEach(l => ["descA", "descH"].forEach(k => { if (+l[k] >= 1) l[k] = Math.round(l[k] / 100 * 1000) / 1000; }));
    P.descEnM = true;
  }
  // El dólar deja de ser automático: queda fijo en 41 y se cambia con las flechas
  if (!load("alucast-dolar-fijo", false)) {
    P.dolar = DEF.dolar;
    delete P.compra; delete P.venta; delete P.dolarFecha;
    try { localStorage.removeItem("alucast-dolar-auto"); } catch (e) { /* sin acceso */ }
    save("alucast-dolar-fijo", true);
  }
  save(CLAVES.lista, P);
  // La numeración arranca en 2345
  if (!load("alucast-num-2345", false)) {
    if (numero < NUMERO_INICIAL) numero = NUMERO_INICIAL;
    save(CLAVES.numero, numero);
    save("alucast-num-2345", true);
  }
  // Teléfono y dirección del negocio para el PDF (solo si estaban vacíos)
  if (!load("alucast-empresa-contacto", false)) {
    if (!String(EMP.tel || "").trim()) EMP.tel = EMPRESA_DEF.tel;
    if (!String(EMP.dir || "").trim()) EMP.dir = EMPRESA_DEF.dir;
    save(CLAVES.empresa, EMP);
    save("alucast-empresa-contacto", true);
  }
  // Presupuestos numerados desde 1 por la versión anterior de la app: pasan a 2345 en adelante
  if (!load("alucast-num-2345-v2", false)) {
    renumerarViejos();
    save("alucast-num-2345-v2", true);
  }
})();

/** Da números nuevos (después del más alto) a los presupuestos con número menor a 2345. */
function renumerarViejos() {
  const h = load(CLAVES.historial, []);
  const borrador = load(CLAVES.borrador, null);
  let siguiente = Math.max(NUMERO_INICIAL - 1, +numero || 0, ...h.map(q => +q.num || 0).filter(n => n >= NUMERO_INICIAL)) + 1;
  const cambio = {};
  h.filter(q => q.num < NUMERO_INICIAL).sort((a, b) => a.num - b.num).forEach(q => { cambio[q.num] = q.num = siguiente++; });

  if (borrador && borrador.numero < NUMERO_INICIAL) {
    // Si lo que estabas cargando ya estaba guardado, sigue con su número nuevo; si no, toma el siguiente libre.
    borrador.numero = cambio[borrador.numero] || siguiente++;
    save(CLAVES.borrador, borrador);
  }
  numero = Math.max(numero, siguiente - 1);
  save(CLAVES.historial, h);
  save(CLAVES.numero, numero);
}
let F;               // ventana que se está cargando en el formulario
let editIdx = -1;    // índice de la ventana que se está editando (-1 = nueva)

/** Busca una línea (tipo de ventana) por nombre. */
const L = n => P.lineas.find(x => x.n === n) || { n, perfiles: [], accesorios: [] };

/** Formulario de ventana vacío para la línea indicada. */
function blank(linea) {
  const l = L(linea || P.lineas[0]?.n);
  return {
    linea: l.n, nombre: "", cant: "1", ancho: "", alto: "",
    acabado: Object.keys(P.acabados)[0],
    alu: l.perfiles.map(p => ({ n: p.n, m: "" })),
    acc: l.accesorios.map(a => ({ n: a.n, q: "" })),
    vid: { cant: "", ancho: "", alto: "", tipo: vidrioPorDefecto() },
    mo: "", exs: [], // mano de obra y extras de esta ventana, en pesos
  };
}

/** El vidrio que se elige al empezar una ventana: 4 mm, o el primero de la lista. */
function vidrioPorDefecto() {
  const v = P.vidrios || [];
  return (v.find(g => g.n === "4 mm") || v[0] || {}).n || "";
}

/**
 * Completa una ventana guardada con los campos que le falten (datos viejos,
 * importados o de la web) para que nunca rompa la pantalla. No cambia precios.
 */
function normalizarItem(it) {
  const v = (it && typeof it === "object") ? it : {};
  const lista = x => Array.isArray(x) ? x.filter(o => o && typeof o === "object") : [];
  const vid = (v.vid && typeof v.vid === "object") ? v.vid : {};
  return {
    ...v,
    linea: String(v.linea ?? "Probba"),
    nombre: String(v.nombre ?? ""),
    cant: String(v.cant ?? "1"),
    acabado: String(v.acabado ?? Object.keys(P.acabados)[0] ?? ""),
    alu: lista(v.alu).map(l => ({ ...l, n: String(l.n ?? ""), m: String(l.m ?? "") })),
    acc: lista(v.acc).map(l => ({ ...l, n: String(l.n ?? ""), q: String(l.q ?? "") })),
    vid: { ...vid, cant: String(vid.cant ?? ""), ancho: String(vid.ancho ?? ""), alto: String(vid.alto ?? ""), tipo: String(vid.tipo ?? "") },
    mo: String(v.mo ?? ""),
    exs: lista(v.exs).map(x => ({ c: String(x.c ?? ""), monto: String(x.monto ?? "") })),
  };
}

/** Un presupuesto guardado con número entero, fechas válidas y ventanas completas. */
function normalizarPresupuesto(q) {
  const fecha = k => esFecha(q[k]) ? q[k] : undefined;
  return {
    ...q,
    num: parseInt(q.num) || 0,
    cli: String(q.cli ?? ""), tel: String(q.tel ?? ""),
    fecha: fecha("fecha"), fechaTxt: dmy(q.fecha),
    entrega: fecha("entrega"), aceptadoEl: fecha("aceptadoEl"), entregadoEl: fecha("entregadoEl"),
    estado: ["aceptado", "entregado"].includes(q.estado) ? q.estado : undefined,
    items: (Array.isArray(q.items) ? q.items : []).map(normalizarItem),
    extras: (Array.isArray(q.extras) ? q.extras : []).filter(x => x && typeof x === "object")
      .map(x => ({ c: String(x.c ?? ""), monto: String(x.monto ?? "") })),
    total: +q.total || 0,
  };
}

// ---- Historial de presupuestos ----
// Se limpia al leerlo: así ningún dato raro (de una copia importada) llega a la pantalla.
const historial = () => {
  const h = load(CLAVES.historial, []);
  return (Array.isArray(h) ? h : []).filter(q => q && typeof q === "object").map(normalizarPresupuesto).filter(q => q.num > 0);
};

/** Modifica el historial y lo guarda. */
function updHist(fn) {
  const h = historial();
  fn(h);
  save(CLAVES.historial, h);
  updBadge();
}

/**
 * Próximo número libre. Nunca repite uno ya usado, aunque se haya abierto un
 * presupuesto viejo (antes eso podía pisar un presupuesto guardado).
 */
function siguienteNumero() {
  const maxGuardado = historial().reduce((m, q) => Math.max(m, +q.num || 0), 0);
  return Math.max(+load(CLAVES.numero, 0) || 0, maxGuardado, numero) + 1;
}
