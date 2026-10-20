"use strict";
// Versión web: registra el service worker para que la app funcione sin internet.
if ("serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}