"use strict";
// =========================================================================
// Pestaña "Lista de precios": parámetros generales, tipos de ventana
// (líneas), perfiles de aluminio, accesorios y vidrios.
// =========================================================================

let PL = 0; // índice de la línea elegida en la lista de precios

const chipFaltanKg = l => faltanKg(l.n) ? ' <span class="chip">faltan kg</span>' : "";
const campoNum = (atributos, valor, extra = "") =>
  `<input type="text" inputmode="decimal" autocomplete="off" ${atributos} value="${esc(valor)}"${extra}>`;

function renderPrecios() {
  const acabados = Object.keys(P.acabados);

  $("p-gen").innerHTML =
    `<label>Dólar<input value="$ ${num(P.dolar)}" readonly tabindex="-1" title="Se cambia con las flechas en la pestaña Presupuesto"></label>` +
    acabados.map(a => `<label>Precio general ${esc(a.toLowerCase())} (U$S/kg)${campoNum(`data-acab="${esc(a)}"`, P.acabados[a])}</label>`).join("") +
    `<label>N.º de presupuesto actual<input type="text" inputmode="numeric" autocomplete="off" data-num="1" value="${+numero}"></label>` +
    `<label>Cobrar aluminio por<select data-cb="1">
        <option value="0"${P.cobrarBarra ? "" : " selected"}>Metros cargados</option>
        <option value="1"${P.cobrarBarra ? " selected" : ""}>Barra entera</option>
      </select></label>` +
    `<label>Largo de barra (m)${campoNum('data-g="barra"', P.barra)}</label>`;

  renderVidrios();

  if (PL >= P.lineas.length) PL = 0;
  const LN = P.lineas[PL];

  $("p-lineas").innerHTML = P.lineas.map((l, i) =>
    `<button class="tab" data-pl="${i}" aria-pressed="${i === PL}">${esc(l.n)}${chipFaltanKg(l)}</button>`).join("") +
    `<button class="btn ghost sm" id="add-linea">+ Nueva línea</button>`;
  $("p-lnombre").value = LN ? LN.n : "";
  $("p-desca").value = LN?.descA ?? "";
  $("p-desch").value = LN?.descH ?? "";
  $("p-lt1").textContent = $("p-lt2").textContent = LN ? LN.n : "";
  $("p-ldel-conf").hidden = true;

  $("p-perf-head").innerHTML = `<tr><th>Artículo</th><th class="n">Kg / metro</th><th class="n">Kg / barra</th>` +
    acabados.map(a => `<th class="n">${esc(a)}<br><small>U$S por kg</small></th>`).join("") + `<th><span class="sr">Quitar</span></th></tr>`;

  if (!LN) { $("p-perf").innerHTML = ""; $("p-acc").innerHTML = ""; return; }

  $("p-perf").innerHTML = LN.perfiles.map((p, i) => `<tr>
      <td><input data-pf="${i}" data-f="n" value="${esc(p.n)}" aria-label="Nombre del perfil ${i + 1}"></td>
      <td class="n">${campoNum(`data-pf="${i}" data-f="kgm"`, p.kgm, ` aria-label="Kg por metro de ${esc(p.n)}"`)}</td>
      <td class="n">${campoNum(`id="pk-${i}" data-kb="${i}"`, "", ` title="Kg de una barra entera" aria-label="Kg por barra de ${esc(p.n)}"`)}</td>
      ${acabados.map((a, j) => `<td class="n">${campoNum(`data-pp="${i}" data-ac="${esc(a)}"`, p.precio?.[a] ?? "",
        ` placeholder="${esc(P.acabados[a])}" title="Vacío: usa el precio general de ${esc(a.toLowerCase())}" aria-label="Precio ${esc(a.toLowerCase())} en U$S por kg de ${esc(p.n)}"`)}<div class="d" id="pm-${i}-${j}"></div></td>`).join("")}
      <td><button class="x" data-pfdel="${i}" aria-label="Quitar ${esc(p.n)}">×</button></td>
    </tr>`).join("");

  $("p-acc").innerHTML = LN.accesorios.map((a, i) => `<tr>
      <td><input data-ax="${i}" data-f="n" value="${esc(a.n)}" aria-label="Nombre del accesorio ${i + 1}"></td>
      <td class="n">${campoNum(`data-ax="${i}" data-f="usd"`, a.usd, ` aria-label="Precio en U$S de ${esc(a.n)}"`)}</td>
      <td><button class="x" data-axdel="${i}" aria-label="Quitar ${esc(a.n)}">×</button></td>
    </tr>`).join("");

  calcPrecios();
}

function renderVidrios() {
  $("p-vid").innerHTML = (P.vidrios || []).map((g, i) => `<tr>
      <td><input data-gv="${i}" data-f="n" value="${esc(g.n)}" aria-label="Nombre del vidrio ${i + 1}"></td>
      <td class="n">${campoNum(`data-gv="${i}" data-f="usd"`, g.usd, ` aria-label="Precio en U$S por m² de ${esc(g.n)}"`)}</td>
      <td><button class="x" data-gvdel="${i}" aria-label="Quitar ${esc(g.n)}">×</button></td>
    </tr>`).join("");
}

/** Actualiza kg/m ↔ kg/barra y lo que sale el metro en cada acabado (sin tocar el campo que estás escribiendo). */
function calcPrecios() {
  const acabados = Object.keys(P.acabados);
  (P.lineas[PL]?.perfiles || []).forEach((p, i) => {
    const kb = $("pk-" + i);
    if (kb && document.activeElement !== kb) kb.value = Math.round(p.kgm * P.barra * 1000) / 1000;
    const km = document.querySelector(`[data-pf="${i}"][data-f="kgm"]`);
    if (km && document.activeElement !== km) km.value = Math.round(p.kgm * 10000) / 10000;
    acabados.forEach((a, j) => { const t = $(`pm-${i}-${j}`); if (t) t.textContent = `U$S ${num(p.kgm * precioKg(p, a))} /m`; });
  });
}

// ---- Cambios que tienen que llegar a todas las ventanas (la actual, el presupuesto y los guardados) ----

/** Aplica fn a cada ventana: la del formulario, las del presupuesto y las de los presupuestos guardados. */
function paraTodasLasVentanas(fn) {
  [F, ...items].forEach(fn);
  updHist(h => h.forEach(q => q.items.forEach(fn)));
}

/** Cuántas ventanas (del presupuesto actual y de los guardados) cumplen la condición. */
function ventanasQue(cond) {
  return [...items, ...historial().flatMap(q => q.items)].filter(cond).length;
}

/** Si se renombra un perfil o accesorio, actualiza todas las ventanas que lo usan. */
function rename(lista, viejo, nuevo) {
  const lin = P.lineas[PL].n;
  paraTodasLasVentanas(v => {
    if (v.linea === lin) v[lista].forEach(l => { if (l.n === viejo) l.n = nuevo; });
  });
}

/** Marca un campo en rojo con un motivo (o lo desmarca). */
function marcar(el, motivo) {
  el.setAttribute("aria-invalid", String(!!motivo));
  el.title = motivo || "";
  if (motivo) toast(motivo);
}

/** Actualiza la pestaña de la línea (aviso "faltan kg"). */
function pintarPestañaLinea() {
  const t = $("p-lineas").children[PL];
  if (t) t.innerHTML = esc(P.lineas[PL].n) + chipFaltanKg(P.lineas[PL]);
}

function guardarPrecios(redibujar) {
  save(CLAVES.lista, P);
  if (redibujar) renderPrecios(); else calcPrecios();
  renderForm();
  render();
}

// ---- Eventos ----
$("v-precios").addEventListener("input", e => {
  const el = e.target, d = el.dataset;
  const v = el.inputMode === "decimal" ? (+el.value || 0) : el.value;

  if (d.num) {
    // No se puede elegir un número que ya tiene otro presupuesto guardado (lo pisaría al guardar).
    const n = parseInt(el.value);
    if (!(n > 0)) return;
    if (n !== numero && historial().some(q => q.num === n)) { marcar(el, `El ${nro(n)} ya es otro presupuesto guardado`); return; }
    marcar(el, "");
    numero = n; save(CLAVES.numero, numero); render();
    return;
  }
  if (d.desc) {
    // Descuento del vidrio de este tipo de ventana (en metros)
    const LN = P.lineas[PL];
    if (el.value === "") delete LN[d.desc]; else LN[d.desc] = +el.value || 0;
    save(CLAVES.lista, P);
    if (F.linea === LN.n && !F.vidManual) { vidAuto(); renderForm(); }
    render();
    return;
  }
  if (d.cb) {
    P.cobrarBarra = el.value === "1";
  } else if (d.g) {
    if (d.g === "barra" && v < 1) return;
    P[d.g] = v;
  } else if (d.acab) {
    P.acabados[d.acab] = v;
    document.querySelectorAll(`[data-pp][data-ac="${CSS.escape(d.acab)}"]`).forEach(x => x.placeholder = v);
  } else if (d.pf !== undefined) {
    const lista = P.lineas[PL].perfiles, p = lista[+d.pf];
    if (d.f === "n") {
      if (!v.trim() || lista.some((x, i) => i !== +d.pf && x.n === v)) { marcar(el, "Ya hay un perfil con ese nombre"); return; }
      marcar(el, "");
      rename("alu", p.n, v);
    }
    p[d.f] = v;
    if (d.f === "kgm") pintarPestañaLinea();
  } else if (d.kb !== undefined) {
    // Kg de la barra entera → kg por metro
    P.lineas[PL].perfiles[+d.kb].kgm = (+el.value || 0) / (P.barra || 6.8);
    pintarPestañaLinea();
  } else if (d.pp !== undefined) {
    const p = P.lineas[PL].perfiles[+d.pp];
    p.precio = p.precio || {};
    if (el.value === "") delete p.precio[d.ac]; else p.precio[d.ac] = +el.value || 0;
  } else if (d.gv !== undefined) {
    const g = P.vidrios[+d.gv];
    if (d.f === "n") {
      if (!v.trim() || P.vidrios.some((x, i) => i !== +d.gv && x.n === v)) { marcar(el, "Ya hay un vidrio con ese nombre"); return; }
      marcar(el, "");
      const viejo = g.n;
      paraTodasLasVentanas(x => { if (x.vid && x.vid.tipo === viejo) x.vid.tipo = v; });
      g.n = v;
    } else {
      g.usd = +el.value || 0;
    }
  } else if (d.ax !== undefined) {
    const lista = P.lineas[PL].accesorios, a = lista[+d.ax];
    if (d.f === "n") {
      if (!v.trim() || lista.some((x, i) => i !== +d.ax && x.n === v)) { marcar(el, "Ya hay un accesorio con ese nombre"); return; }
      marcar(el, "");
      rename("acc", a.n, v);
    }
    a[d.f] = v;
  } else if (el.id === "p-lnombre") {
    const nuevo = el.value.trim(), viejo = P.lineas[PL].n;
    if (!nuevo || P.lineas.some((l, i) => i !== PL && l.n === nuevo)) { marcar(el, nuevo ? "Ya hay un tipo de ventana con ese nombre" : ""); return; }
    marcar(el, "");
    paraTodasLasVentanas(x => { if (x.linea === viejo) x.linea = nuevo; });
    P.lineas[PL].n = nuevo;
    $("p-lt1").textContent = $("p-lt2").textContent = nuevo;
    pintarPestañaLinea();
    save(CLAVES.lista, P);
    renderLineas();
    render();
    return;
  } else {
    return;
  }
  guardarPrecios(false);
});

/** Si algo que se quiere borrar lo usan ventanas, avisa y devuelve true (no se borra). */
function enUso(cuantas, que) {
  if (!cuantas) return false;
  toast(`No se puede borrar: ${que} se usa en ${cuantas} ventana(s) de presupuestos. Podés cambiarle el nombre.`);
  return true;
}

$("v-precios").addEventListener("click", e => {
  const d = e.target.dataset, id = e.target.id, LN = P.lineas[PL];

  if (d.pl !== undefined) {
    PL = +d.pl;
    renderPrecios();
    $("p-lineas").querySelector('[aria-pressed="true"]')?.focus();
    return;
  }

  if (id === "add-linea") {
    let k = P.lineas.length + 1;
    while (P.lineas.some(l => l.n === "Nueva línea " + k)) k++;
    P.lineas.push({ n: "Nueva línea " + k, perfiles: [], accesorios: [] });
    PL = P.lineas.length - 1;
    guardarPrecios(true);
    $("p-lnombre").focus();
    $("p-lnombre").select();
    return;
  }
  if (id === "p-ldel") {
    if (P.lineas.length < 2) { toast("Tiene que quedar al menos una línea"); return; }
    if (enUso(ventanasQue(v => v.linea === LN.n), `"${LN.n}"`)) return;
    $("p-ldel-conf").hidden = false;
    $("p-ldel-no").focus();
    return;
  }
  if (id === "p-ldel-no") { $("p-ldel-conf").hidden = true; $("p-ldel").focus(); return; }
  if (id === "p-ldel-si") {
    P.lineas.splice(PL, 1);
    PL = 0;
    if (!P.lineas.some(l => l.n === F.linea)) F = blank();
    guardarPrecios(true);
    toast("Línea borrada");
    $("p-lineas").querySelector('[aria-pressed="true"]')?.focus();
    return;
  }
  if (d.pfdel !== undefined) {
    const p = LN.perfiles[+d.pfdel];
    if (enUso(ventanasQue(v => v.linea === LN.n && v.alu.some(l => l.n === p.n && +l.m)), `"${p.n}"`)) return;
    LN.perfiles.splice(+d.pfdel, 1);
    guardarPrecios(true);
    $("add-perf").focus();
  }
  if (d.axdel !== undefined) {
    const a = LN.accesorios[+d.axdel];
    if (enUso(ventanasQue(v => v.linea === LN.n && v.acc.some(l => l.n === a.n && +l.q)), `"${a.n}"`)) return;
    LN.accesorios.splice(+d.axdel, 1);
    guardarPrecios(true);
    $("add-acc").focus();
  }
  if (d.gvdel !== undefined) {
    if ((P.vidrios || []).length < 2) { toast("Tiene que quedar al menos un vidrio"); return; }
    const g = P.vidrios[+d.gvdel];
    if (enUso(ventanasQue(v => v.vid.tipo === g.n && +v.vid.cant), `"${g.n}"`)) return;
    P.vidrios.splice(+d.gvdel, 1);
    guardarPrecios(true);
    $("add-vid").focus();
  }
});

$("add-perf").onclick = () => {
  const p = P.lineas[PL].perfiles;
  p.push({ n: "NUEVO PERFIL " + (p.length + 1), kgm: 0 });
  guardarPrecios(true);
  $("p-perf").querySelector("tr:last-child input")?.select();
};
$("add-acc").onclick = () => {
  const a = P.lineas[PL].accesorios;
  a.push({ n: "NUEVO ACCESORIO " + (a.length + 1), usd: 0 });
  guardarPrecios(true);
  $("p-acc").querySelector("tr:last-child input")?.select();
};
$("add-vid").onclick = () => {
  P.vidrios = P.vidrios || [];
  P.vidrios.push({ n: "Nuevo vidrio " + (P.vidrios.length + 1), usd: 0 });
  guardarPrecios(true);
  $("p-vid").querySelector("tr:last-child input")?.select();
};
$("btn-reset-precios").onclick = () => {
  // Vuelve a la lista de fábrica, pero conserva el dólar y cómo se cobra el aluminio
  P = Object.assign(structuredClone(DEF), { dolar: P.dolar, cobrarBarra: P.cobrarBarra, barra68: true, descEnM: true });
  PL = 0;
  if (!P.lineas.some(l => l.n === F.linea)) F = blank();
  guardarPrecios(true);
  renderDolar();
  toast("Precios de la planilla restaurados");
};
