import { normalizarResultadoAccion } from "../juego/acciones/ResultadoAccion.js";

// Evento emitido cuando una acción deja al jugador sin Vida.
//
// Se utiliza un evento de aplicación para que los controladores
// que ya procesan acciones no necesiten conocer el modal de derrota.
export const EVENTO_JUGADOR_DERROTADO = "dark-moon:jugador-derrotado";

// Evita mostrar varias veces la derrota para la misma
// instancia de Juego cuando más de un componente intenta redibujarla.
const JUEGOS_CON_DERROTA_NOTIFICADA = new WeakSet();

// Procesa de forma centralizada el resultado
// producido por una acción de Juego.
//
// Actualmente se encarga de:
//
// - Normalizar el resultado.
// - Mostrar el mensaje.
// - Redibujar la partida cuando corresponde.
// - Notificar la derrota del jugador una única vez.
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

  // La comprobación se realiza después del redibujado para que
  // los paneles alcancen a mostrar la Vida final en cero antes
  // de que aparezca la ventana de derrota.
  notificarDerrotaSiCorresponde(juego);

  // Devolvemos la versión normalizada porque algunos controladores
  // necesitan consultar propiedades específicas, como "interaccion".
  return resultadoNormalizado;
}

function notificarDerrotaSiCorresponde(juego) {
  if (
    juego.player?.estaVivo !== false ||
    JUEGOS_CON_DERROTA_NOTIFICADA.has(juego)
  ) {
    return;
  }

  JUEGOS_CON_DERROTA_NOTIFICADA.add(juego);

  // Los módulos pueden seguir comprobándose desde Node sin DOM.
  // La notificación visual solamente existe dentro del navegador.
  if (typeof document === "undefined" || typeof CustomEvent !== "function") {
    return;
  }

  document.dispatchEvent(
    new CustomEvent(
      EVENTO_JUGADOR_DERROTADO,

      {
        detail: {
          juego,

          jugador: juego.player,
        },
      },
    ),
  );
}
