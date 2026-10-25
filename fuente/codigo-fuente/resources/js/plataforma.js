"use strict";
// =========================================================================
// Puente con el programa de escritorio (Neutralino).
// Expone window.alucast con lo que solo se puede hacer desde la app de
// Windows y Mac: guardar/abrir archivos y abrir links en el navegador. Si la página se abre en un navegador común, window.alucast no
// existe y cada parte de la app usa su alternativa web.
// =========================================================================
(function () {
  // ---- App de Android: el programa le da a la página un puente "AndroidApp" ----
  if (window.AndroidApp) {
    const aBase64 = buf => {
      const bytes = new Uint8Array(buf); let s = "";
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return btoa(s);
    };
    const resultado = r => { if (String(r).startsWith("ERROR:")) throw { code: "ANDROID", message: String(r).slice(6) }; return r; };
    window.alucast = {
      destino: "descargas",
      /** Guarda el PDF en Descargas y lo abre. Devuelve "Descargas/nombre.pdf". */
      async guardarPDF(nombre, datos) { return resultado(window.AndroidApp.guardarPdf(nombre, aBase64(datos))); },
      /** Guarda la copia de seguridad en Descargas. */
      async guardarArchivo(nombre, texto) { resultado(window.AndroidApp.guardarTexto(nombre, texto)); return "Descargas"; },
      // "Importar copia" usa el selector de archivos de la tablet (el <input type=file> de la página)
    };
    return;
  }

  if (typeof Neutralino === "undefined") return;

  try {
    Neutralino.init();
    Neutralino.events.on("windowClose", () => Neutralino.app.exit());
  } catch (e) { /* fuera de la app de escritorio */ }

  const FILTRO_COPIA = [{ name: "Copia Alucast", extensions: ["json"] }];

  /** Espera una respuesta del programa, pero no para siempre. */
  const conTiempo = (promesa, ms) => Promise.race([
    promesa,
    new Promise((_, rechazar) => setTimeout(() => rechazar({ code: "SIN_RESPUESTA", message: "el programa no respondió" }), ms)),
  ]);

  window.alucast = {
    /** Pide dónde guardar y escribe el texto. Devuelve false si se canceló. */
    async guardarArchivo(nombre, texto) {
      // En Mac se guarda directo en Descargas (igual que el PDF)
      if (window.NL_OS === "Darwin") {
        const descargas = await conTiempo(Neutralino.os.getPath("downloads"), 8000);
        await conTiempo(Neutralino.filesystem.writeFile(descargas.replace(/\/+$/, "") + "/" + nombre, texto), 15000);
        return "Descargas";
      }
      const ruta = await Neutralino.os.showSaveDialog("Guardar copia de Alucast", { defaultPath: nombre, filters: FILTRO_COPIA });
      if (!ruta) return false;
      await Neutralino.filesystem.writeFile(ruta, texto);
      return true;
    },

    /**
     * Guarda el PDF del presupuesto y lo abre. Devuelve la ruta donde quedó, o null si se canceló.
     * - Mac: se guarda directo en Descargas (la ventana "Guardar como…" no responde bien ahí).
     * - Windows: se elige dónde con la ventana "Guardar como…".
     * Si el sistema no contesta en unos segundos, avisa en vez de quedarse esperando.
     */
    async guardarPDF(nombre, datos) {
      const esMac = window.NL_OS === "Darwin";
      // Comprobación rápida de que el programa responde (y de paso, la carpeta Descargas)
      const descargas = await conTiempo(Neutralino.os.getPath("downloads"), 8000);
      let ruta;
      if (esMac) {
        ruta = descargas.replace(/\/+$/, "") + "/" + nombre;
      } else {
        ruta = await Neutralino.os.showSaveDialog("Guardar presupuesto en PDF", {
          defaultPath: descargas.replace(/[\\/]+$/, "") + "\\" + nombre,
          filters: [{ name: "PDF", extensions: ["pdf"] }],
        });
        if (!ruta) return null;
        if (!/\.pdf$/i.test(ruta)) ruta += ".pdf";
      }
      await conTiempo(Neutralino.filesystem.writeBinaryFile(ruta, datos), 15000);
      // Se abre el PDF (en Mac hace falta pasarlo como dirección "file://")
      try { await conTiempo(Neutralino.os.open(esMac ? "file://" + encodeURI(ruta) : ruta), 5000); } catch (e) { /* se guardó igual */ }
      return ruta;
    },

    /** Pide un archivo y devuelve su contenido, o null si se canceló. */
    async abrirArchivo() {
      const rutas = await Neutralino.os.showOpenDialog("Importar copia de Alucast", { filters: FILTRO_COPIA });
      if (!rutas || !rutas.length) return null;
      return await Neutralino.filesystem.readFile(rutas[0]);
    },
  };

  // Los links externos se abren en el navegador de la compu, no dentro de la app.
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest('a[href^="http"]');
    if (a) { e.preventDefault(); Neutralino.os.open(a.href); }
  }, true);
})();
