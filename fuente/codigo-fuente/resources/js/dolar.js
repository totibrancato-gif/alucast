"use strict";
// =========================================================================
// Dólar: valor fijo que se cambia a mano con las flechas (de a $ 0,50).
// =========================================================================

const PASO_DOLAR = 0.5;

function renderDolar() {
  $("d-valor").textContent = "$ " + num(P.dolar);
}

function cambiarDolar(delta) {
  // Se redondea a centavos para que sumar 0,50 muchas veces no acumule errores
  P.dolar = Math.max(PASO_DOLAR, Math.round(((+P.dolar || DEF.dolar) + delta) * 100) / 100);
  save(CLAVES.lista, P);
  renderDolar();
  updateForm();
  render();
}

$("d-bajar").onclick = () => cambiarDolar(-PASO_DOLAR);
$("d-subir").onclick = () => cambiarDolar(PASO_DOLAR);
