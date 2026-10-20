"use strict";
// =========================================================================
// Puente con el programa de escritorio (Neutralino).
// Expone window.alucast con lo que solo se puede hacer desde la app de
// Windows y Mac: guardar/abrir archivos y abrir links en el navegador. Si la página se abre en un navegador común, window.alucast no
// existe y cada parte de la app usa su alternativa web.
// =========================================================================
(function () {
  if (typeof Neutralino === "undefined") return;

  try {
    Neutralino.init();
    Neutralino.events.on("windowClose", () => Neutralino.app.exit());
  } catch (e) { /* fuera de la app de escritorio */ }

  const FILTRO_COPIA = [{ name: "Copia Alucast", extensions: ["json"] }];

  window.alucast = {
    /** Pide dónde guardar y escribe el texto. Devuelve false si se canceló. */
    async guardarArchivo(nombre, texto) {
      const ruta = await Neutralino.os.showSaveDialog("Guardar copia de Alucast", { defaultPath: nombre, filters: FILTRO_COPIA });
      if (!ruta) return false;
      await Neutralino.filesystem.writeFile(ruta, texto);
      return true;
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
