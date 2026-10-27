"use strict";
// =========================================================================
// Formulario "Nueva ventana": tipo, medidas, aluminio, accesorios, vidrio y
// acabado. Muestra el precio en vivo y agrega la ventana al presupuesto.
// =========================================================================

const faltanKg = lin => L(lin).perfiles.some(p => !p.kgm);

const opciones = (lista, sel) => lista.map(x => `<option${x.n === sel ? " selected" : ""}>${esc(x.n)}</option>`).join("");

function renderLineas() {
  $("lineas").innerHTML = P.lineas.map(l =>
    `<button class="tab" data-lin="${esc(l.n)}" aria-pressed="${l.n === F.linea}">${esc(l.n)}</button>`).join("");

  const aviso = $("aviso-linea");
  aviso.hidden = !faltanKg(F.linea);
  aviso.innerHTML = `Faltan los kg por metro de algunos perfiles de <b>${esc(F.linea)}</b>. Completalos en
    <button class="btn ghost sm" data-goto="${esc(F.linea)}">Lista de precios</button>`;
}

function renderForm() {
  renderLineas();
  const lin = L(F.linea);

  $("v-nombre").value = F.nombre;
  $("v-cant").value = F.cant ?? "1";
  $("v-ancho").value = F.ancho ?? "";
  $("v-alto").value = F.alto ?? "";

  $("l-alu").innerHTML = F.alu.map((l, i) => `<tr>
      <td><select data-al="${i}" data-f="n" aria-label="Perfil ${i + 1}">${opciones(lin.perfiles, l.n)}</select></td>
      <td class="n"><input type="text" inputmode="decimal" autocomplete="off" data-al="${i}" data-f="m" value="${esc(l.m)}" placeholder="0" aria-label="Metros de ${esc(l.n)}"></td>
      <td class="n" id="ab-${i}"></td>
      <td class="n" id="ak-${i}"></td>
      <td><button class="x" data-aldel="${i}" aria-label="Quitar ${esc(l.n)}">×</button></td>
    </tr>`).join("");

  $("l-acc").innerHTML = F.acc.map((l, i) => `<tr>
      <td><select data-ac="${i}" data-f="n" aria-label="Accesorio ${i + 1}">${opciones(lin.accesorios, l.n)}</select></td>
      <td class="n"><input type="text" inputmode="decimal" autocomplete="off" data-ac="${i}" data-f="q" value="${esc(l.q)}" placeholder="0" aria-label="Cantidad de ${esc(l.n)}"></td>
      <td class="n" id="cu-${i}"></td>
      <td><button class="x" data-acdel="${i}" aria-label="Quitar ${esc(l.n)}">×</button></td>
    </tr>`).join("");

  if (!F.vid.tipo) F.vid.tipo = vidrioPorDefecto();
  $("g-tipo").innerHTML = opciones(P.vidrios || [], F.vid.tipo);
  $("g-cant").value = F.vid.cant;
  $("g-ancho").value = F.vid.ancho;
  $("g-alto").value = F.vid.alto;
  notaVid();
  $("nota-barra").textContent = P.cobrarBarra
    ? `Se cobran barras enteras de ${num(P.barra, 2)} m (se cambia en Lista de precios → Parámetros).`
    : `Los kg se calculan con los metros que ponés. "Barras" te muestra cuántas barras de ${num(P.barra, 2)} m vas a necesitar.`;

  $("v-mo").value = F.mo ?? "";
  renderExs();
  avisoMo(false);

  const editando = editIdx >= 0;
  $("v-titulo").textContent = editando ? `Editando ventana ${editIdx + 1}` : "Nueva ventana";
  $("btn-add").textContent = editando ? "Guardar cambios" : "Guardar ventana en el presupuesto";
  $("btn-cancel").hidden = !editando;
  updateForm();
}

// ---- Descuento del vidrio ----
// La medida del vidrio = medida de la ventana menos el descuento fijo del tipo de ventana (en metros).
// Si cargás la medida del vidrio a mano, queda manual hasta que toques "Usar el descuento".
const r3 = x => String(Math.round(x * 1000) / 1000);

function vidAuto() {
  const l = L(F.linea), a = +F.ancho || 0, h = +F.alto || 0;
  if (a) F.vid.ancho = r3(Math.max(0, a - (+l.descA || 0)));
  else if (F.ancho === "") F.vid.ancho = ""; // si se borra la medida, se borra la del vidrio
  if (h) F.vid.alto = r3(Math.max(0, h - (+l.descH || 0)));
  else if (F.alto === "") F.vid.alto = "";
  if ((a || h) && F.vid.cant === "") F.vid.cant = "1";
}

function notaVid() {
  const l = L(F.linea), dA = +l.descA || 0, dH = +l.descH || 0, n = $("nota-vid");
  if (F.vidManual) {
    n.innerHTML = `Medida del vidrio cargada a mano. <button class="btn ghost sm" id="vid-auto">Usar el descuento de ${esc(l.n)}</button>`;
    return;
  }
  n.textContent = (dA || dH)
    ? `Se calcula sola: ancho de la ventana − ${num(dA, 3)} m y alto − ${num(dH, 3)} m (descuento de ${l.n}, se cambia en Lista de precios).`
    : `Se calcula sola con la medida de la ventana. Podés fijar el descuento del vidrio de ${l.n} en Lista de precios → Tipos de ventana.`;
}

/** Extras de esta ventana (flete, colocación…). */
function renderExs() {
  if (!F.exs) F.exs = [];
  // Ventanas de antes que tenían un único monto de extras
  if (+F.ex && !F.exs.length) { F.exs.push({ c: "Extras", monto: F.ex }); F.ex = ""; }
  $("v-exs").innerHTML = F.exs.map((x, i) => `<div class="extra-row">
      <input data-vx="${i}" data-f="c" value="${esc(x.c)}" placeholder="Concepto (ej: flete, colocación)" aria-label="Concepto del extra ${i + 1}">
      <input data-vx="${i}" data-f="monto" data-pesos type="text" inputmode="decimal" autocomplete="off" value="${esc(x.monto)}" placeholder="$" aria-label="Monto del extra ${i + 1} en pesos">
      <button class="x" data-vxdel="${i}" aria-label="Quitar extra ${i + 1}">×</button>
    </div>`).join("");
}

/** Marca (o desmarca) el recuadro de mano de obra cuando falta cargarla. */
function avisoMo(mostrar) {
  $("conf-mo").hidden = !mostrar;
  $("mo-box").classList.toggle("falta", mostrar);
}

/** Recalcula barras, kg y precios sin redibujar los campos (no se pierde el foco). */
function updateForm() {
  const k = cantV(F);
  F.alu.forEach((l, i) => {
    const r = lineaAlu(l, F.linea, k);
    $("ab-" + i).textContent = r.b ? `${r.b} (${num(r.b * P.barra, 2)} m)` : "–";
    $("ak-" + i).textContent = r.kg ? num(r.kg, 3) : "–";
  });
  F.acc.forEach((l, i) => {
    const u = (+l.q || 0) * accUsd(l.n, F.linea);
    $("cu-" + i).textContent = u ? num(u) : "–";
  });

  const c = calc(F);
  // Vidrio por unidad (acrílico): se muestra cuántas piezas se cobran en vez de los m²
  $("g-m2-et").textContent = c.porUnidad ? "Se cobran" : "M² totales";
  $("g-m2").value = c.porUnidad ? `${num(c.unidades, 0)} unid. × U$S ${num(precioVidrio(F.vid.tipo))}` : num(c.m2);
  pintarAcabados(c);
  $("ab-head").textContent = k > 1 ? `Barras (${k} vent.)` : "Barras";
  anunciarPrecio(c);
  saveDraft();
}

/**
 * Tarjetas de precio por acabado. Se arman una sola vez y después solo se
 * actualizan los textos: así no se pierde el foco al elegir con las flechas.
 */
function pintarAcabados(c) {
  const acabados = listaAcabados(), fin = $("fin");
  if (fin.dataset.acabados !== acabados.join("|")) {
    fin.dataset.acabados = acabados.join("|");
    fin.innerHTML = acabados.map((a, j) => `
      <label class="opt"><input type="radio" name="acabado" value="${esc(a)}">
        <span><span class="u" id="fa-${j}"></span><span class="p" id="fp-${j}"></span><span class="u" id="fu-${j}"></span></span>
      </label>`).join("") + `<div class="muted resumen" id="fin-resumen"></div>`;
  }
  acabados.forEach((a, j) => {
    fin.querySelectorAll('input[name="acabado"]')[j].checked = F.acabado === a;
    $("fa-" + j).textContent = `${c.k > 1 ? c.k + " ventanas" : "Ventana"} en ${a.toLowerCase()}`;
    $("fp-" + j).textContent = pes(porCantidad(c.por[a].pesos, c.k));
    $("fu-" + j).textContent = `U$S ${num(c.por[a].usd)}${c.k > 1 ? ` · ${pes(c.por[a].pesos / c.k)} c/u` : ""}`;
  });
  $("fin-resumen").textContent = `${c.k > 1 ? `Total de ${c.k} ventanas. ` : ""}Aluminio ${num(c.kg, 3)} kg · Accesorios U$S ${num(c.acc)} · Vidrio U$S ${num(c.vid)}` +
    ((c.mo || c.ex) ? ` · Mano de obra ${pes(c.mo)} · Extras ${pes(c.ex)} (incluidos)` : "");
}

/** Para lectores de pantalla: anuncia el precio cuando se deja de tipear un momento. */
let precioTimer;
function anunciarPrecio(c) {
  clearTimeout(precioTimer);
  precioTimer = setTimeout(() => {
    const sel = c.por[F.acabado];
    $("fin-vivo").textContent = sel ? `Precio de la ventana: ${pes(porCantidad(sel.pesos, c.k))}` : "";
  }, 700);
}

// ---- Eventos del formulario ----
$("form-ventana").addEventListener("input", e => {
  const el = e.target, d = el.dataset;
  if (!$("form-error").hidden) errorForm("");
  if (d.al !== undefined) { F.alu[+d.al][d.f] = el.value; updateForm(); return; }
  if (d.ac !== undefined) { F.acc[+d.ac][d.f] = el.value; updateForm(); return; }
  if (el.id === "v-nombre") { F.nombre = el.value; saveDraft(); return; }
  if (el.id === "v-mo") { F.mo = el.value; avisoMo(false); updateForm(); return; }
  if (d.vx !== undefined) { F.exs[+d.vx][d.f] = el.value; avisoMo(false); updateForm(); return; }
  if (el.id === "v-cant") { F.cant = el.value; updateForm(); return; }
  if (el.id === "v-ancho" || el.id === "v-alto") {
    F[el.id.slice(2)] = el.value;
    // Si el vidrio no se cargó a mano, se recalcula con el descuento del tipo de ventana.
    if (!F.vidManual) {
      vidAuto();
      $("g-ancho").value = F.vid.ancho;
      $("g-alto").value = F.vid.alto;
      $("g-cant").value = F.vid.cant;
    }
    updateForm();
    return;
  }
  if (el.id === "g-ancho" || el.id === "g-alto") {
    F.vid[el.id.slice(2)] = el.value;
    if (!F.vidManual) { F.vidManual = true; notaVid(); }
    updateForm();
    return;
  }
  if (el.id.startsWith("g-")) { F.vid[el.id.slice(2)] = el.value; updateForm(); return; }
  if (el.name === "acabado") { F.acabado = el.value; updateForm(); }
});
$("form-ventana").addEventListener("change", e => {
  if (e.target.name === "acabado") { F.acabado = e.target.value; updateForm(); }
});

/** Después de quitar una fila, el foco pasa a la que quedó en su lugar (o al botón de agregar). */
function enfocarFila(tabla, i, botonAgregar) {
  const filas = $(tabla).querySelectorAll("tr");
  (filas[Math.min(i, filas.length - 1)]?.querySelector("select, input") || $(botonAgregar)).focus();
}

$("l-alu").addEventListener("click", e => {
  const i = e.target.dataset.aldel;
  if (i !== undefined) { F.alu.splice(+i, 1); renderForm(); enfocarFila("l-alu", +i, "add-alu"); }
});
$("l-acc").addEventListener("click", e => {
  const i = e.target.dataset.acdel;
  if (i !== undefined) { F.acc.splice(+i, 1); renderForm(); enfocarFila("l-acc", +i, "add-acc-l"); }
});

$("add-alu").onclick = () => {
  const p = L(F.linea).perfiles;
  if (!p.length) { toast("Agregá perfiles en la lista de precios"); return; }
  F.alu.push({ n: p[0].n, m: "" });
  renderForm();
  $("l-alu").querySelector('tr:last-child [data-f="m"]')?.focus();
};
$("add-acc-l").onclick = () => {
  const a = L(F.linea).accesorios;
  if (!a.length) { toast("Agregá accesorios en la lista de precios"); return; }
  F.acc.push({ n: a[0].n, q: "" });
  renderForm();
  $("l-acc").querySelector('tr:last-child [data-f="q"]')?.focus();
};

$("lineas").onclick = e => {
  const n = e.target.dataset.lin;
  if (n === undefined || n === F.linea) return;
  const nuevo = blank(n);
  nuevo.nombre = F.nombre; nuevo.acabado = F.acabado;
  // Se conservan las medidas del vidrio. El tipo pasa al propio de la nueva línea si tiene uno (Mampara → Acrílico);
  // si el que había era el automático de la línea anterior, vuelve al de siempre (así Probba no queda con acrílico).
  const propio = L(n).vidrioDef, anterior = L(F.linea).vidrioDef;
  const tipo = propio && P.vidrios.some(g => g.n === propio) ? propio
    : (anterior && F.vid.tipo === anterior) ? vidrioPorDefecto(n) : F.vid.tipo;
  nuevo.vid = { ...F.vid, tipo };
  nuevo.cant = F.cant; nuevo.ancho = F.ancho; nuevo.alto = F.alto;
  nuevo.mo = F.mo; nuevo.exs = F.exs; nuevo.vidManual = F.vidManual;  F = nuevo;
  if (!F.vidManual) vidAuto(); // cada tipo de ventana tiene su propio descuento
  renderForm();
  $("lineas").querySelector('[aria-pressed="true"]')?.focus();
};

$("aviso-linea").onclick = e => {
  const n = e.target.dataset.goto;
  if (n === undefined) return;
  PL = Math.max(0, P.lineas.findIndex(l => l.n === n));
  show("precios");
  $("t-precios").focus();
};

// Si la ventana no tiene mano de obra se pregunta una vez antes de guardarla.
let sinMoOk = false;
$("conf-mo-cargar").onclick = () => {
  $("conf-mo").hidden = true;
  $("mo-box").scrollIntoView({ behavior: "smooth", block: "center" });
  $("v-mo").focus({ preventScroll: true });
};
$("conf-mo-si").onclick = () => { sinMoOk = true; $("btn-add").click(); };

$("v-exs").addEventListener("click", e => {
  const i = e.target.dataset.vxdel;
  if (i !== undefined) { F.exs.splice(+i, 1); renderExs(); updateForm(); ($("v-exs").querySelector("input") || $("add-ex")).focus(); }
});
$("add-ex").onclick = () => {
  F.exs = F.exs || [];
  F.exs.push({ c: "", monto: "" });
  renderExs();
  $("v-exs").querySelector(".extra-row:last-child input")?.focus();
};

/** Muestra (o borra) un error al lado del botón de agregar; también se anuncia. */
function errorForm(mensaje) {
  const e = $("form-error");
  e.textContent = mensaje || "";
  e.hidden = !mensaje;
}

$("btn-add").onclick = () => {
  const c = calc(F);
  if (c.usd <= 0) { errorForm("Cargá metros de aluminio, accesorios o vidrio para poder agregar la ventana."); return; }
  errorForm("");
  if (!c.mo && !c.ex && !sinMoOk) {
    avisoMo(true);
    $("conf-mo").scrollIntoView({ behavior: "smooth", block: "center" });
    $("conf-mo-cargar").focus({ preventScroll: true });
    return;
  }
  sinMoOk = false;
  avisoMo(false);

  const v = structuredClone(F);
  v.cant = String(cantV(v));
  if (!v.nombre.trim()) v.nombre = "Ventana " + (editIdx >= 0 ? editIdx + 1 : items.length + 1);

  if (editIdx >= 0) { items[editIdx] = v; toast("Ventana actualizada"); }
  else { items.push(v); toast("Ventana guardada. Cargá la siguiente"); }

  const acabado = F.acabado;
  editIdx = -1;
  F = blank(v.linea);
  F.acabado = acabado;
  renderForm();
  render();
  $("v-titulo").scrollIntoView({ behavior: "smooth", block: "start" });
  $("v-nombre").focus({ preventScroll: true });
};

$("nota-vid").addEventListener("click", e => {
  if (e.target.id === "vid-auto") { F.vidManual = false; vidAuto(); renderForm(); $("g-ancho").focus(); }
});

$("btn-cancel").onclick = () => { editIdx = -1; F = blank(); errorForm(""); renderForm(); $("v-nombre").focus(); };
