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
  constructor({ tipoRenderizador = "phaser", Phaser = null } = {}) {
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
      botonContinuar: obtenerElementoObligatorio(
        "continueGameButton",
        "botón para continuar",
      ),
      botonConfiguracion: obtenerElementoObligatorio(
        "settingsButton",
        "botón de configuración",
      ),
      botonVolverMenuPrincipal: obtenerElementoObligatorio(
        "backToMainMenuButton",
        "botón para volver al menú",
      ),
      mensajeMenuPrincipal: obtenerElementoObligatorio(
        "mainMenuMessage",
        "mensaje del menú principal",
      ),
    });
  }


  mostrarVersionAplicacion(version) {
    const elemento = obtenerElementoObligatorio(
      "appVersion",
      "versión de la aplicación",
    );
    elemento.textContent = version;
  }

  confirmarReemplazoGuardado() {
    const confirmar = globalThis.confirm;
    if (typeof confirmar !== "function") {
      return true;
    }

    return confirmar(
      "Existe una partida guardada. Crear este personaje reemplazará su progreso. ¿Continuar?",
    );
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

    const texto = "No se pudo cargar la configuración del juego.";
    for (const id of ["startupError", "creationMessage"]) {
      const mensaje = document.getElementById(id);
      if (mensaje) {
        mensaje.textContent = texto;
      }
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
