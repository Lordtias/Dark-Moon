import { EVENTO_JUGADOR_DERROTADO } from "./ProcesadorResultadoAccion.js";
import { ModalDerrota } from "../interfaz/ModalDerrota.js";
import { eliminarGuardadoJugador } from "../partida/PersistenciaJugador.js";

// Coordina el cierre de una partida derrotada.
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
    // La muerte cierra el ciclo roguelike. Ningún inventario, oro o
    // progreso durable del personaje derrotado debe reaparecer.
    try {
      eliminarGuardadoJugador();
    } catch (error) {
      // La limpieza durable es obligatoria cuando el almacenamiento está
      // disponible, pero una política del navegador no debe bloquear el
      // regreso al menú principal.
      console.warn(
        "No se pudo limpiar el guardado del personaje derrotado:",
        error,
      );
    }

    const ubicacionActual = globalThis.location;
    if (
      !ubicacionActual?.href ||
      typeof ubicacionActual.assign !== "function"
    ) {
      throw new Error("No se pudo determinar la ruta del menú principal.");
    }

    const urlMenu = new URL(ubicacionActual.href);
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
