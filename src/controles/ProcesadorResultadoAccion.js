import { normalizarResultadoAccion } from "../juego/acciones/ResultadoAccion.js";

// Procesa de forma centralizada el resultado
// producido por una acción de Juego.
//
// Actualmente se encarga de:
//
// - Normalizar el resultado.
// - Mostrar el mensaje.
// - Redibujar la partida cuando corresponde.
//
// Más adelante será el punto donde podremos entregar
// los eventos visuales al renderizador de Phaser.
export function aplicarResultadoAccion({
  resultado,
  juego,
  renderizador,
} = {}) {
  // Algunas teclas o acciones pueden no producir resultado.
  if (resultado === null || resultado === undefined) {
    return null;
  }

  if (!juego || typeof juego !== "object") {
    throw new Error("El procesador de acciones necesita una partida válida.");
  }

  if (
    !renderizador ||
    typeof renderizador.mostrarMensaje !== "function" ||
    typeof renderizador.dibujarJuego !== "function"
  ) {
    throw new Error(
      "El procesador de acciones necesita un renderizador válido.",
    );
  }

  const resultadoNormalizado = normalizarResultadoAccion(resultado);

  // Evitamos agregar entradas vacías al historial.
  if (
    typeof resultadoNormalizado.mensaje === "string" &&
    resultadoNormalizado.mensaje.trim() !== ""
  ) {
    renderizador.mostrarMensaje(resultadoNormalizado.mensaje);
  }

  // Una acción temporal siempre puede haber modificado el mundo,
  // incluso aunque no establezca manualmente "redibujar".
  //
  // También redibujamos acciones sin coste temporal que modifican
  // selectores, ventanas o estados visuales.
  if (resultadoNormalizado.turnoConsumido || resultadoNormalizado.redibujar) {
    renderizador.dibujarJuego(juego);
  }

  // Devolvemos la versión normalizada porque algunos controladores
  // necesitan consultar propiedades específicas, como "interaccion".
  return resultadoNormalizado;
}
