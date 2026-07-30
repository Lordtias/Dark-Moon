import { eliminarGuardadoJugador } from "../../partida/PersistenciaJugador.js";
import { ModalDerrota } from "./ModalDerrota.js";

// Presenta mediante DOM el cierre de una partida derrotada.
//
// La detección de la derrota pertenece al procesamiento de aplicación. Este
// adaptador solamente conoce el modal HTML y las acciones propias del navegador.
export class AdaptadorDerrotaDom {
  constructor() {
    this.modalDerrota = new ModalDerrota();
    this.derrotaProcesada = false;
  }

  presentar({ juego, jugador } = {}) {
    if (this.derrotaProcesada) {
      return false;
    }

    const jugadorDerrotado = jugador ?? juego?.player;

    if (!jugadorDerrotado) {
      throw new Error(
        "AdaptadorDerrotaDom necesita un jugador derrotado válido.",
      );
    }

    this.derrotaProcesada = true;
    this.cerrarOtrosDialogos();
    this.modalDerrota.abrir({
      jugador: jugadorDerrotado,
      alVolverMenu: () => this.volverAlMenuPrincipal(),
    });

    return true;
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
    // La muerte cierra el ciclo roguelike. Ningún inventario, oro o progreso
    // durable del personaje derrotado debe reaparecer.
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
    this.modalDerrota.destruir();
  }
}
