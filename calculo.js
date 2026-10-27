"use strict";
// =========================================================================
// Cálculo de precios (igual que la planilla, cobrando barras enteras).
// =========================================================================

/** Datos de un perfil de la línea. */
const perfilDe = (n, lin) => L(lin).perfiles.find(p => p.n === n);
/** Kg por metro de un perfil. */
const kgm = (n, lin) => perfilDe(n, lin)?.kgm ?? 0;
/** U$S por kg de un perfil en un acabado: el suyo propio o, si está vacío, el precio general. */
function precioKg(p, acabado) {
  const v = p?.precio?.[acabado];
  return (v !== undefined && v !== "" && v !== null) ? +v : (P.acabados[acabado] ?? 0);
}
/** U$S de un tipo de vidrio: por m², o por unidad si es de los que se cobran por pieza (acrílico). */
function precioVidrio(tipo) {
  const g = (P.vidrios || []).find(x => x.n === tipo);
  return g ? (+g.usd || 0) : (+P.vidrio || 0);
}
/** ¿Ese vidrio se cobra por unidad en vez de por m²? */
const vidrioPorUnidad = tipo => !!(P.vidrios || []).find(x => x.n === tipo)?.unidad;
/** Precio en U$S de un accesorio. */
const accUsd = (n, lin) => L(lin).accesorios.find(a => a.n === n)?.usd ?? 0;
/** Cantidad de ventanas iguales (mínimo 1). */
const cantV = v => Math.max(1, parseInt(v.cant) || 1);
/** ¿La ventana lleva mosquitero? (tiene metros cargados en algún perfil "HOJA MOSQUITERO…") */
const conMosquitero = v => (v.alu || []).some(l => /hoja\s+mosquitero/i.test(l.n) && +l.m > 0);
/** Total de k ventanas iguales: el precio de una, redondeado, por la cantidad (así "c/u × k" da justo). */
const porCantidad = (total, k) => Math.round(total / k) * k;

/**
 * Una fila de aluminio. k = cantidad de ventanas.
 * b = barras que hacen falta; mc = metros que se cobran (los cargados o, si
 * "cobrar barra entera" está activo, las barras completas); kg = kg cobrados.
 */
function lineaAlu(l, lin, k = 1) {
  const m = (+l.m || 0) * k;
  const b = m > 0 ? Math.ceil(m / P.barra - 1e-9) : 0;
  const mc = P.cobrarBarra ? b * P.barra : m;
  return { b, m, mc, kg: mc * kgm(l.n, lin) };
}

/**
 * Mano de obra y extras de una ventana, en pesos.
 * La mano de obra es por ventana y se multiplica por la cantidad; los extras (flete, etc.)
 * son un total y no se multiplican.
 */
function manoDeObra(v) {
  const mo = numPesos(v.mo) * cantV(v);
  const ex = numPesos(v.ex) + (v.exs || []).reduce((s, x) => s + numPesos(x.monto), 0);
  return { mo, ex };
}

/** Precio completo de una ventana (todas sus unidades), en cada acabado. */
function calc(v) {
  const k = cantV(v);
  const kg = v.alu.reduce((s, l) => s + lineaAlu(l, v.linea, k).kg, 0);
  const acc = v.acc.reduce((s, l) => s + (+l.q || 0) * accUsd(l.n, v.linea), 0) * k;
  const m2 = (+v.vid.cant || 0) * (+v.vid.ancho || 0) * (+v.vid.alto || 0) * k;
  // Vidrio por m²; o por unidad (ej.: acrílico de la mampara): cantidad de piezas × precio
  const porUnidad = vidrioPorUnidad(v.vid.tipo);
  const unidades = (+v.vid.cant || 0) * k;
  const vid = (porUnidad ? unidades : m2) * precioVidrio(v.vid.tipo);
  const { mo, ex } = manoDeObra(v);

  const por = {};
  listaAcabados().forEach(a => {
    const alu = v.alu.reduce((s, l) => s + lineaAlu(l, v.linea, k).kg * precioKg(perfilDe(l.n, v.linea), a), 0);
    const usd = alu + acc + vid;
    por[a] = { usd, pesos: usd * P.dolar + mo + ex };
  });
  const sel = por[v.acabado] || { usd: 0, pesos: 0 };
  return { k, kg, acc, m2, porUnidad, unidades, vid, mo, ex, por, usd: sel.usd, pesos: sel.pesos, mat: sel.usd * P.dolar };
}

/** Totales del presupuesto: materiales (v), extras (e) y total. */
function totals() {
  const v = items.reduce((s, it) => s + calc(it).pesos, 0);
  const e = extras.reduce((s, x) => s + numPesos(x.monto), 0);
  return { v, e, total: v + e };
}

/**
 * Precio de cada ventana para el cliente: materiales + su parte de la mano de
 * obra y extras del presupuesto (proporcional). Se redondea el precio de UNA
 * ventana y la fila es ese precio × la cantidad, así "c/u × cantidad" da justo
 * y cada fila coincide con el precio del formulario. El total es la suma de las filas.
 * En la moneda del presupuesto: pesos, o dólares (todo pasado al dólar cargado).
 */
function preciosCliente(moneda = monedaPres) {
  const f = moneda === "USD" ? 1 / (+P.dolar || 1) : 1;
  const t = totals(), base = items.map(it => calc(it).pesos);
  const out = base.map((p, i) =>
    porCantidad((t.v > 0 ? p + t.e * p / t.v : p + (items.length ? t.e / items.length : 0)) * f, cantV(items[i])));
  // El total es la suma de las filas: ninguna ventana se toca para "cuadrar" el redondeo.
  const total = out.length ? out.reduce((s, x) => s + x, 0) : Math.round(t.total * f);
  return { out, total, moneda };
}
