import { EVENTO_JUGADOR_DERROTADO } from "./ProcesadorResultadoAccion.js";

import { ModalDerrota } from "../interfaz/ModalDerrota.js";

// Coordina el cierre de una partida derrotada.
//
// Vive al nivel de Aplicacion porque la derrota
// no pertenece a un mapa concreto y debe funcionar
// aunque Juego sea reemplazado entre expediciones.
export class ControladorDerrota {
  constructor() {
    this.modalDerrota = new ModalDerrota();

    this.derrotaProcesada = false;

    this.manejarJugadorDerrotado = this.manejarJugadorDerrotado.bind(this);

    document.addEventListener(
      EVENTO_JUGADOR_DERROTADO,
      this.manejarJugadorDerrotado,
    );
  }

  manejarJugadorDerrotado(event) {
    if (this.derrotaProcesada) {
      return;
    }

    const jugador = event.detail?.jugador ?? event.detail?.juego?.player;

    if (!jugador) {
      return;
    }

    this.derrotaProcesada = true;

    // Cerramos cualquier ventana que pudiera estar abierta,
    // por ejemplo el detalle de una poción consumida antes
    // de que los enemigos terminaran su fase.
    this.cerrarOtrosDialogos();

    this.modalDerrota.abrir({
      jugador,

      alVolverMenu: () => this.volverAlMenuPrincipal(),
    });
  }

  cerrarOtrosDialogos() {
    const dialogosAbiertos = document.querySelectorAll("dialog[open]");

    for (const dialogo of dialogosAbiertos) {
      if (dialogo !== this.modalDerrota.dialogo) {
        dialogo.close();
      }
    }
  }

  volverAlMenuPrincipal() {
    // Recargar la aplicación reinicia completamente
    // la sesión derrotada y permite comenzar otra partida
    // sin conservar controladores, modales o estados muertos.
    const ubicacionActual = globalThis.location;

    if (
      !ubicacionActual?.href ||
      typeof ubicacionActual.assign !== "function"
    ) {
      throw new Error("No se pudo determinar la ruta del menú principal.");
    }

    const urlMenu = new URL(ubicacionActual.href);

    // Los parámetros de prueba podrían iniciar directamente
    // una mazmorra. Los retiramos al volver al menú.
    urlMenu.search = "";
    urlMenu.hash = "";

    ubicacionActual.assign(urlMenu.href);
  }

  destruir() {
    document.removeEventListener(
      EVENTO_JUGADOR_DERROTADO,
      this.manejarJugadorDerrotado,
    );

    this.modalDerrota.destruir();
  }
}
