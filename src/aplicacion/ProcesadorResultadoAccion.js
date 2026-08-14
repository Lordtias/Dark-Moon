import { normalizarResultadoAccion } from "../juego/acciones/ResultadoAccion.js";

// Evita notificar varias veces la derrota para una misma instancia de Juego
// cuando más de una actualización intenta procesar su estado final.
const JUEGOS_CON_DERROTA_NOTIFICADA = new WeakSet();

// Procesa de forma centralizada el resultado producido por una acción de Juego.
//
// Se encarga de:
//
// - Normalizar el resultado.
// - Mostrar el mensaje.
// - Redibujar la partida cuando corresponde.
// - Notificar la derrota mediante un callback independiente de la presentación.
//
// El procesador no conoce DOM, Canvas ni Phaser. La aplicación decide cómo
// presentar una derrota mediante alJugadorDerrotado.
export function aplicarResultadoAccion({
  resultado,
  juego,
  renderizador,
  alJugadorDerrotado,
} = {}) {
  // Algunas teclas o acciones pueden no producir resultado.
  if (resultado === null || resultado === undefined) {
    return null;
  }

  validarJuego(juego);
  validarRenderizador(renderizador);
  validarNotificadorDerrota(alJugadorDerrotado);

  const resultadoNormalizado = normalizarResultadoAccion(resultado);

  // Evitamos agregar entradas vacías al historial.
  if (
    resultadoNormalizado.mensaje !== null &&
    resultadoNormalizado.mensaje !== undefined &&
    resultadoNormalizado.mensaje !== ""
  ) {
    renderizador.mostrarMensaje(resultadoNormalizado.mensaje);
  }

  // Una acción temporal siempre puede haber modificado el mundo,
  // incluso aunque no establezca manualmente "redibujar".
  //
  // También redibujamos acciones sin coste temporal que modifican
  // selectores, ventanas o estados visuales.
  if (resultadoNormalizado.turnoConsumido || resultadoNormalizado.redibujar) {
    renderizador.dibujarJuego(juego, {
      eventos: resultadoNormalizado.eventos,
      orientacionesSolicitadas:
        resultadoNormalizado.orientacionesSolicitadas ?? [],
    });
  }

  // La comprobación se realiza después del redibujado para que los paneles
  // alcancen a mostrar la Vida final en cero antes de presentar la derrota.
  notificarDerrotaSiCorresponde({
    juego,
    resultado: resultadoNormalizado,
    renderizador,
    alJugadorDerrotado,
  });

  // Devolvemos la versión normalizada porque algunos coordinadores necesitan
  // consultar propiedades específicas, como "interaccion".
  return resultadoNormalizado;
}

function notificarDerrotaSiCorresponde({
  juego,
  resultado,
  renderizador,
  alJugadorDerrotado,
}) {
  if (
    juego.player?.estaVivo !== false ||
    JUEGOS_CON_DERROTA_NOTIFICADA.has(juego)
  ) {
    return;
  }

  JUEGOS_CON_DERROTA_NOTIFICADA.add(juego);

  const presentarDerrota = () => {
    alJugadorDerrotado({
      juego,
      jugador: juego.player,
      resultado,
    });
  };
  const esperaPresentacion = renderizador.esperarPresentacionPendiente?.();
  if (!esperaPresentacion || typeof esperaPresentacion.then !== "function") {
    presentarDerrota();
    return;
  }

  esperaPresentacion.then(presentarDerrota, presentarDerrota);
}

function validarJuego(juego) {
  if (!juego || typeof juego !== "object") {
    throw new Error("El procesador de acciones necesita una partida válida.");
  }
}

function validarRenderizador(renderizador) {
  if (
    !renderizador ||
    typeof renderizador.mostrarMensaje !== "function" ||
    typeof renderizador.dibujarJuego !== "function"
  ) {
    throw new Error(
      "El procesador de acciones necesita un renderizador válido.",
    );
  }
}

function validarNotificadorDerrota(alJugadorDerrotado) {
  if (typeof alJugadorDerrotado !== "function") {
    throw new Error(
      "El procesador de acciones necesita una acción para notificar la derrota.",
    );
  }
}
