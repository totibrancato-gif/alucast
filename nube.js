"use strict";
// =========================================================================
// Nube (Supabase): inicio de sesión y sincronización entre equipos.
//
// Todo se sigue guardando en localStorage (la app anda sin internet) y, cuando
// hay conexión, se sincroniza con la tabla "registros" de Supabase, registro
// por registro: cada presupuesto (por número), cada movimiento y cada deudor
// (por id), y como "ajustes" la lista de precios, los datos de la empresa y el
// último número. Así dos equipos pueden trabajar a la vez sin pisarse listas enteras.
// Si el mismo registro se cambió en dos lados, gana el que llegó primero a la nube.
// El borrador (lo que se está cargando) queda solo en cada equipo.
//
// Se usa la API de Supabase con fetch, sin su librería: no hay nada más que cargar.
// =========================================================================

const NUBE = {
  url: "https://joedpfvixhxbegdtgpky.supabase.co",
  clave: "sb_publishable_sqQWxiAxs6D6XPqSXo-3Pw_BzY9zuFM", // clave pública: la seguridad la dan las reglas (RLS) de la base
};
const CLAVE_SESION = "alucast-sesion";             // sesión iniciada (no va en la copia de seguridad)
const CLAVE_ESTADO = "alucast-nube";               // { empresa, ultimo, snap } de la última sincronización
const CLAVE_RESPALDO = "alucast-copia-antes-de-nube"; // copia local hecha antes de la primera sincronización

// Listas que se sincronizan registro por registro
const LISTAS = {
  presupuesto: { clave: CLAVES.historial, id: q => String(parseInt(q?.num) || "") },
  movimiento: { clave: CLAVES.gastos, id: m => String(m?.id ?? "") },
  deudor: { clave: CLAVES.deudores, id: d => String(d?.id ?? "") },
};
// Valores que se sincronizan enteros
const AJUSTES = { lista: CLAVES.lista, empresa: CLAVES.empresa, numero: CLAVES.numero };
const CLAVES_NUBE = new Set([...Object.values(LISTAS).map(t => t.clave), ...Object.values(AJUSTES)]);

const BORRADO = "x"; // marca en snap de un registro borrado

// ---- Utilidades ----
/** JSON con las claves ordenadas: la base (jsonb) cambia el orden y así se comparan igual. */
function canon(v) {
  if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
  if (v && typeof v === "object") {
    return "{" + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}";
  }
  return JSON.stringify(v ?? null);
}
/** Huella corta de un texto (para recordar qué versión de cada registro ya está en la nube). */
function huella(s) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
const huellaDe = datos => huella(canon(datos));

const sesion = () => load(CLAVE_SESION, null);
const estadoNube = () => {
  const e = load(CLAVE_ESTADO, null);
  return e && typeof e === "object" && e.snap ? e : { empresa: null, ultimo: null, snap: {} };
};

// ---- Pedidos a Supabase ----
async function pedir(ruta, { metodo = "GET", cuerpo, token, extra = {} } = {}) {
  const r = await fetch(NUBE.url + ruta, {
    method: metodo,
    headers: { apikey: NUBE.clave, "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}), ...extra },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  let datos = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch (e) { /* respuesta sin JSON */ }
  if (!r.ok) throw { status: r.status, message: datos?.msg || datos?.message || datos?.error_description || datos?.error || texto || r.statusText };
  return datos;
}

function guardarSesion(d) {
  save(CLAVE_SESION, {
    token: d.access_token, refresco: d.refresh_token,
    vence: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600),
    email: d.user?.email || sesion()?.email || "", usuario: d.user?.id || sesion()?.usuario || "",
  });
}

/** Token vigente (lo renueva si vence en menos de un minuto). */
async function tokenVigente() {
  const s = sesion();
  if (!s?.token) throw { status: 401, message: "Sin sesión" };
  if (s.vence - 60 > Date.now() / 1000) return s.token;
  const d = await pedir("/auth/v1/token?grant_type=refresh_token", { metodo: "POST", cuerpo: { refresh_token: s.refresco } });
  guardarSesion(d);
  return d.access_token;
}

// ---- Leer y escribir los datos locales como registros ----
function registrosLocales() {
  const r = new Map();
  for (const [tipo, t] of Object.entries(LISTAS)) {
    const lista = load(t.clave, []);
    (Array.isArray(lista) ? lista : []).forEach(x => { const id = t.id(x); if (id) r.set(tipo + ":" + id, { tipo, id, datos: x }); });
  }
  for (const [id, clave] of Object.entries(AJUSTES)) {
    const v = load(clave, undefined);
    if (v !== undefined) r.set("ajuste:" + id, { tipo: "ajuste", id, datos: v });
  }
  return r;
}

/** Aplica en esta compu un registro que llegó de la nube. */
function aplicarRemoto(reg) {
  if (reg.tipo === "ajuste") {
    const clave = AJUSTES[reg.id];
    if (!clave || reg.borrado) return;
    // El último número nunca baja (así no se repite un número usado en otro equipo)
    const valor = reg.id === "numero" ? Math.max(parseInt(reg.datos) || 0, parseInt(load(clave, 0)) || 0) : reg.datos;
    guardarLocal(clave, valor);
    return;
  }
  const t = LISTAS[reg.tipo];
  if (!t) return;
  const lista = (l => Array.isArray(l) ? l : [])(load(t.clave, []));
  const i = lista.findIndex(x => t.id(x) === reg.id);
  if (reg.borrado) { if (i >= 0) lista.splice(i, 1); }
  else if (i >= 0) lista[i] = reg.datos;
  else lista.push(reg.datos);
  guardarLocal(t.clave, lista);
}

/** Guarda sin avisar a la nube (lo que viene de la nube no se vuelve a subir). */
function guardarLocal(clave, valor) {
  nubeAplicando = true;
  try { save(clave, valor); } finally { nubeAplicando = false; }
}

// ---- Sincronización ----
let nubeAplicando = false, nubeCorriendo = null, nubeOtraVez = false, nubeTimer = null, nubeError = "", nubeUltimaOk = null;
let refrescoPendiente = false;

/** La llama save(): si cambió algo que va a la nube, sincroniza en un ratito. */
function nubeCambio(clave) {
  if (nubeAplicando || !CLAVES_NUBE.has(clave) || !sesion()) return;
  clearTimeout(nubeTimer);
  nubeTimer = setTimeout(sincronizar, 1500);
}

/** Baja lo nuevo de la nube, sube lo cambiado acá. Devuelve true si salió bien. */
function sincronizar() {
  if (!sesion()) return Promise.resolve(false);
  if (nubeCorriendo) { nubeOtraVez = true; return nubeCorriendo; }
  nubeCorriendo = (async () => {
    try {
      await sincronizarUnaVez();
      nubeError = ""; nubeUltimaOk = new Date();
      return true;
    } catch (e) {
      if (e?.status === 401 || e?.status === 400 && /refresh/i.test(e.message)) {
        cerrarSesionLocal();
        toast("Tu sesión venció: volvé a entrar");
      } else {
        const antes = nubeError;
        nubeError = navigator.onLine === false ? "Sin internet: se sincroniza cuando vuelva la conexión" : "No se pudo sincronizar (" + (e?.message || e) + ")";
        if (!antes) toast(nubeError);
      }
      return false;
    } finally {
      nubeCorriendo = null;
      pintarNube();
      if (nubeOtraVez) { nubeOtraVez = false; setTimeout(sincronizar, 300); }
    }
  })();
  return nubeCorriendo;
}

async function sincronizarUnaVez() {
  const token = await tokenVigente();
  const s = sesion();
  let est = estadoNube();

  // Empresa del usuario
  const m = await pedir(`/rest/v1/miembros?select=empresa_id&user_id=eq.${encodeURIComponent(s.usuario)}`, { token });
  const empresa = m?.[0]?.empresa_id;
  if (!empresa) throw { status: 403, message: "tu usuario no tiene una empresa asignada" };

  if (est.empresa !== empresa) {
    // Primera vez en este equipo (o con otra empresa): copia de lo que había, por las dudas
    if (!localStorage.getItem(CLAVE_RESPALDO)) {
      const datos = {};
      [...CLAVES_NUBE].forEach(k => { const v = load(k, undefined); if (v !== undefined) datos[k] = v; });
      save(CLAVE_RESPALDO, { app: "alucast", version: 2, exportado: new Date().toISOString(), datos });
    }
    // Si los datos de esta compu eran de otra empresa, no se mezclan
    if (est.empresa && est.empresa !== empresa) {
      Object.values(LISTAS).forEach(t => guardarLocal(t.clave, []));
    }
    est = { empresa, ultimo: null, snap: {} };
  }

  // 1) Bajar lo que cambió en la nube (con un margen de 2 minutos: lo repetido se saltea)
  let cambios = false, desde = est.ultimo ? new Date(Date.parse(est.ultimo) - 120000).toISOString() : null;
  for (;;) {
    const filtro = desde ? `&actualizado=gte.${encodeURIComponent(desde)}` : "";
    const filas = await pedir(`/rest/v1/registros?select=tipo,id,datos,borrado,actualizado${filtro}&order=actualizado.asc&limit=1000`, { token });
    for (const r of filas) {
      const k = r.tipo + ":" + r.id, h = r.borrado ? BORRADO : huellaDe(r.datos);
      if (est.snap[k] !== h) { aplicarRemoto(r); est.snap[k] = h; cambios = true; }
      if (!est.ultimo || r.actualizado > est.ultimo) est.ultimo = r.actualizado;
    }
    if (filas.length < 1000) break;
    desde = filas[filas.length - 1].actualizado;
  }
  save(CLAVE_ESTADO, est);

  // 2) Subir lo que cambió acá (y marcar como borrado lo que ya no está)
  const locales = registrosLocales(), subir = [];
  for (const [k, r] of locales) {
    const h = huellaDe(r.datos);
    if (est.snap[k] !== h) subir.push({ k, h, fila: { empresa_id: empresa, tipo: r.tipo, id: r.id, datos: r.datos, borrado: false } });
  }
  for (const [k, h] of Object.entries(est.snap)) {
    if (h === BORRADO || locales.has(k) || k.startsWith("ajuste:")) continue;
    const [tipo, ...resto] = k.split(":");
    subir.push({ k, h: BORRADO, fila: { empresa_id: empresa, tipo, id: resto.join(":"), datos: null, borrado: true } });
  }
  for (let i = 0; i < subir.length; i += 200) {
    const parte = subir.slice(i, i + 200);
    await pedir("/rest/v1/registros?on_conflict=empresa_id,tipo,id", {
      metodo: "POST", token, cuerpo: parte.map(p => p.fila),
      extra: { Prefer: "resolution=merge-duplicates,return=minimal" },
    });
    parte.forEach(p => { est.snap[p.k] = p.h; });
    save(CLAVE_ESTADO, est);
  }

  if (cambios) refrescarPantalla();
}

/** Vuelve a dibujar con lo que llegó de la nube (si estás escribiendo, espera a que termines). */
function refrescarPantalla() {
  const el = document.activeElement;
  if (el && el.matches?.("input, textarea, select") && !el.closest("#login")) { refrescoPendiente = true; return; }
  refrescoPendiente = false;
  try {
    P = load(CLAVES.lista, P);
    EMP = { ...EMPRESA_DEF, ...load(CLAVES.empresa, {}) };
    if (typeof PL === "number" && PL >= P.lineas.length) PL = 0;
    pintarTodo();
    const visible = [...VISTAS, ...OTRAS_VISTAS].find(k => !$("v-" + k).hidden);
    if (visible && visible !== "presu") show(visible);
    if (typeof renderMenuPresupuestos === "function") { renderMenuPresupuestos(); renderMenuGastos(); }
  } catch (e) { console.error(e); }
}
document.addEventListener("focusout", () => {
  if (refrescoPendiente) setTimeout(() => { if (refrescoPendiente) refrescarPantalla(); }, 300);
});

// ---- Pantalla de inicio de sesión ----
function mostrarLogin(mostrar) {
  $("login").hidden = !mostrar;
  document.querySelector(".wrap").inert = mostrar;
  if (mostrar) setTimeout(() => $("login-email").focus(), 50);
}

$("login-form").addEventListener("submit", async e => {
  e.preventDefault();
  const email = $("login-email").value.trim(), clave = $("login-clave").value;
  const err = $("login-error"), btn = $("login-entrar");
  err.hidden = true;
  if (!email || !clave) { err.textContent = "Escribí tu correo y tu contraseña."; err.hidden = false; return; }
  btn.disabled = true; btn.textContent = "Entrando…";
  try {
    const d = await pedir("/auth/v1/token?grant_type=password", { metodo: "POST", cuerpo: { email, password: clave } });
    guardarSesion(d);
    $("login-clave").value = "";
    mostrarLogin(false);
    toast("Sincronizando tus datos…");
    if (await sincronizar()) toast("Listo: tus datos están sincronizados");
  } catch (x) {
    err.textContent = x?.status === 400 || x?.status === 401 ? "Correo o contraseña incorrectos."
      : navigator.onLine === false ? "No hay internet. Para entrar la primera vez hace falta conexión."
      : "No se pudo entrar (" + (x?.message || x) + ").";
    err.hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = "Entrar";
  }
});

function cerrarSesionLocal() {
  try { localStorage.removeItem(CLAVE_SESION); } catch (e) { /* sin acceso */ }
  pintarNube();
  mostrarLogin(true);
}

$("nube-salir").onclick = async () => {
  const s = sesion();
  await sincronizar(); // lo último que se hizo sube antes de salir
  if (s?.token) pedir("/auth/v1/logout", { metodo: "POST", token: s.token }).catch(() => {});
  cerrarSesionLocal();
};
$("nube-ahora").onclick = async () => { if (await sincronizar()) toast("Sincronizado"); };
// La copia de antes de la primera sincronización se recupera con el mismo aviso de "Importar copia"
$("nube-recuperar").onclick = () => {
  const c = load(CLAVE_RESPALDO, null);
  if (c) prepararImport(JSON.stringify(c));
};

/** Estado de la cuenta en "Ajustes y copia". */
function pintarNube() {
  const s = sesion();
  $("nube-email").textContent = s?.email || "—";
  const hora = nubeUltimaOk ? nubeUltimaOk.toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" }) : "";
  $("nube-estado").textContent = !s ? "Sin sesión" : nubeCorriendo ? "Sincronizando…" : nubeError || (hora ? `Sincronizado a las ${hora}` : "Todavía no se sincronizó");
  $("nube-estado").classList.toggle("nube-mal", !!(s && nubeError));
  $("nube-respaldo").hidden = !load(CLAVE_RESPALDO, null);
}

// ---- Arranque ----
(function iniciarNube() {
  pintarNube();
  if (!sesion()) { mostrarLogin(true); return; }
  sincronizar();
})();
// Cada 30 segundos (con la ventana a la vista), al volver a la app y al volver internet
setInterval(() => { if (document.visibilityState === "visible") sincronizar(); }, 30000);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") sincronizar(); });
window.addEventListener("online", () => sincronizar());
