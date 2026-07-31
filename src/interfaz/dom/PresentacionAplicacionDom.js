import { MenuCreacionPersonaje } from "../MenuCreacionPersonaje.js";
import { crearInterfazPartidaDom } from "./FabricaInterfazPartidaDom.js";
import { PresentacionMapaActivoDom } from "./PresentacionMapaActivoDom.js";
import { AdaptadorDerrotaDom } from "../derrota/AdaptadorDerrotaDom.js";
import { ControladorPantallasDom } from "./ControladorPantallasDom.js";

// Construye y conecta la presentación HTML actual de Dark Moon.
//
// La capa de aplicación solicita componentes mediante este contrato y no
// necesita conocer elementos, selectores o clases concretas del DOM.
export class PresentacionAplicacionDom {
  constructor({ tipoRenderizador = "canvas2d", Phaser = null } = {}) {
    this.adaptadorDerrota = null;
    this.tipoRenderizador = tipoRenderizador;
    this.Phaser = Phaser;
  }

  crearControladorPantallas() {
    return new ControladorPantallasDom({
      pantallaMenuPrincipal: obtenerElementoObligatorio(
        "mainMenu",
        "pantalla del menú principal",
      ),
      contenedorBotonesMenuPrincipal: obtenerElementoObligatorio(
        "mainMenuButtons",
        "contenedor de botones del menú",
      ),
      panelConfiguracionMenu: obtenerElementoObligatorio(
        "settingsPlaceholder",
        "panel de configuración",
      ),
      pantallaCreacion: obtenerElementoObligatorio(
        "characterCreation",
        "pantalla de creación",
      ),
      contenedorJuego: obtenerElementoObligatorio(
        "gameContainer",
        "contenedor del juego",
      ),
      botonNuevoJuego: obtenerElementoObligatorio(
        "newGameButton",
        "botón de nuevo juego",
      ),
      botonConfiguracion: obtenerElementoObligatorio(
        "settingsButton",
        "botón de configuración",
      ),
      botonVolverMenuPrincipal: obtenerElementoObligatorio(
        "backToMainMenuButton",
        "botón para volver al menú",
      ),
    });
  }

  crearMenuCreacionPersonaje(configuracion) {
    return new MenuCreacionPersonaje(configuracion);
  }

  crearInterfazPartida(configuracion) {
    return crearInterfazPartidaDom({
      ...configuracion,
      tipoRenderizador: this.tipoRenderizador,
      Phaser: this.Phaser,
    });
  }

  crearPresentacionMapaActivo(configuracion) {
    return new PresentacionMapaActivoDom(configuracion);
  }

  presentarDerrota(detalle) {
    if (!this.adaptadorDerrota) {
      this.adaptadorDerrota = new AdaptadorDerrotaDom();
    }

    return this.adaptadorDerrota.presentar(detalle);
  }

  mostrarErrorInicio(error) {
    console.error("No se pudo iniciar la aplicación:", error);

    const mensaje = document.getElementById("creationMessage");
    if (mensaje) {
      mensaje.textContent = "No se pudo cargar la configuración del juego.";
    }
  }
}

function obtenerElementoObligatorio(id, descripcion) {
  const elemento = document.getElementById(id);

  if (!elemento) {
    throw new Error(`No se encontró ${descripcion} con id "${id}".`);
  }

  return elemento;
}
