import { MenuCreacionPersonaje } from "../MenuCreacionPersonaje.js";
import { crearInterfazPartidaDom } from "./FabricaInterfazPartidaDom.js";
import { PresentacionMapaActivoDom } from "./PresentacionMapaActivoDom.js";
import { AdaptadorDerrotaDom } from "../derrota/AdaptadorDerrotaDom.js";
import { ControladorPantallasDom } from "./ControladorPantallasDom.js";
import { ControladorConfiguracionDom } from "./ControladorConfiguracionDom.js";
import { ControladorIdiomaDom } from "./ControladorIdiomaDom.js";
import { AplicadorIdiomaDom } from "../idiomas/AplicadorIdiomaDom.js";
import { configurarTraductorActivo, traducir } from "../idiomas/ContextoIdioma.js";

// Construye y conecta la presentación HTML actual de Dark Moon.
//
// La capa de aplicación solicita componentes mediante este contrato y no
// necesita conocer elementos, selectores o clases concretas del DOM.
export class PresentacionAplicacionDom {
  constructor({ tipoRenderizador = "phaser", Phaser = null } = {}) {
    this.adaptadorDerrota = null;
    this.tipoRenderizador = tipoRenderizador;
    this.Phaser = Phaser;
    this.traductor = null;
    this.aplicadorIdioma = null;
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

  crearControladorConfiguracion() {
    return new ControladorConfiguracionDom({
      selectorVelocidad: obtenerElementoObligatorio(
        "animationSpeedSelect",
        "selector de velocidad de animaciones",
      ),
      casillaEfectosReducidos: obtenerElementoObligatorio(
        "reducedEffectsCheckbox",
        "casilla de efectos reducidos",
      ),
      botonZoomMenos: obtenerElementoObligatorio(
        "zoomInitialDecreaseButton",
        "botón para reducir el zoom inicial",
      ),
      botonZoomMas: obtenerElementoObligatorio(
        "zoomInitialIncreaseButton",
        "botón para aumentar el zoom inicial",
      ),
      valorZoom: obtenerElementoObligatorio(
        "zoomInitialValue",
        "valor del zoom inicial",
      ),
      botonPantallaCompleta: obtenerElementoObligatorio(
        "fullscreenButton",
        "botón de pantalla completa",
      ),
      botonRestablecer: obtenerElementoObligatorio(
        "resetSettingsButton",
        "botón para restablecer configuración",
      ),
      mensajeConfiguracion: obtenerElementoObligatorio(
        "settingsMessage",
        "mensaje de configuración",
      ),
    });
  }

  crearControladorIdioma() {
    return new ControladorIdiomaDom({
      botones: {
        es: [
          obtenerElementoObligatorio("botonIdiomaEsMenu", "selector ES del menú"),
          obtenerElementoObligatorio("botonIdiomaEsConfiguracion", "selector ES de configuración"),
        ],
        en: [
          obtenerElementoObligatorio("botonIdiomaEnMenu", "selector EN del menú"),
          obtenerElementoObligatorio("botonIdiomaEnConfiguracion", "selector EN de configuración"),
        ],
      },
    });
  }

  configurarTraductor(traductor) {
    this.traductor = configurarTraductorActivo(traductor);
    this.aplicadorIdioma = new AplicadorIdiomaDom({ traductor });
    this.aplicadorIdioma.aplicar();
    return this.traductor;
  }

  actualizarIdioma() {
    this.aplicadorIdioma?.aplicar();
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
      traducir("interfaz.mensajes.confirmarReemplazo", {
        respaldo: "Existe una partida guardada. Crear este personaje reemplazará su progreso. ¿Continuar?",
      }),
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

    const texto = traducir("interfaz.mensajes.inicioError", {
      respaldo: "No se pudo cargar la configuración del juego.",
    });
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
