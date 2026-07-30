// Funciones encargadas de cargar los archivos JSON
// necesarios para iniciar Dark Moon.
import {
  cargarConfiguracionPersonaje,
  cargarConfiguracionEnemigos,
  cargarConfiguracionObjetos,
  cargarConfiguracionGeneracionObjetos,
  cargarConfiguracionMapas,
  cargarConfiguracionCiudad,
  cargarConfiguracionComercio,
} from "../juego/configuracion/CargadorConfiguracion.js";
import { cargarYConfigurarProgresoMagico } from "../juego/maestrias/ContextoProgresoMagico.js";
import { validarCatalogoCatalizadores } from "../juego/magia/SistemaCatalizadores.js";
import { eliminarGuardadoJugador } from "../partida/PersistenciaJugador.js";
import { eliminarConfiguracionBarraHabilidades } from "../juego/habilidades/PersistenciaBarraHabilidades.js";
// Pantalla utilizada para crear al personaje.
import { MenuCreacionPersonaje } from "../interfaz/MenuCreacionPersonaje.js";
// Controladores principales de la aplicación.
import { ControladorPantallas } from "./ControladorPantallas.js";
import { ControladorPartida } from "./ControladorPartida.js";
import { AdaptadorDerrotaDom } from "../interfaz/derrota/AdaptadorDerrotaDom.js";
// Aplicacion funciona como coordinador general.
export class Aplicacion {
  constructor() {
    this.controladorPantallas = null;
    this.controladorPartida = null;
    this.adaptadorDerrotaDom = null;
    this.menuCreacionPersonaje = null;
    this.configuracionPersonaje = null;
    this.configuracionEnemigos = null;
    this.configuracionObjetos = null;
    this.configuracionGeneracionObjetos = null;
    this.configuracionMapas = null;
    this.configuracionCiudad = null;
    this.configuracionComercio = null;
    this.configuracionProgresoMagico = null;
  }
  async iniciar() {
    try {
      this.crearControladores();
      this.controladorPantallas.configurarEventos();
      await this.cargarConfiguraciones();
      this.crearMenuCreacionPersonaje();
    } catch (error) {
      this.mostrarErrorInicio(error);
    }
  }
  crearControladores() {
    this.controladorPantallas = new ControladorPantallas({
      pantallaMenuPrincipal: document.getElementById("mainMenu"),
      contenedorBotonesMenuPrincipal:
        document.getElementById("mainMenuButtons"),
      panelConfiguracionMenu: document.getElementById("settingsPlaceholder"),
      pantallaCreacion: document.getElementById("characterCreation"),
      contenedorJuego: document.getElementById("gameContainer"),
      botonNuevoJuego: document.getElementById("newGameButton"),
      botonConfiguracion: document.getElementById("settingsButton"),
      botonVolverMenuPrincipal: document.getElementById("backToMainMenuButton"),
    });
    this.adaptadorDerrotaDom = new AdaptadorDerrotaDom();
    this.controladorPartida = new ControladorPartida({
      controladorPantallas: this.controladorPantallas,
      alJugadorDerrotado: (detalle) =>
        this.adaptadorDerrotaDom.presentar(detalle),
    });
  }
  // La configuración de maestrías se carga junto con el resto. Así, Player
  // siempre se construye después de validar los cuatro catálogos mágicos.
  async cargarConfiguraciones() {
    const [
      configuracionPersonaje,
      configuracionEnemigos,
      configuracionObjetos,
      configuracionGeneracionObjetos,
      configuracionMapas,
      configuracionCiudad,
      configuracionComercio,
      configuracionProgresoMagico,
    ] = await Promise.all([
      cargarConfiguracionPersonaje(),
      cargarConfiguracionEnemigos(),
      cargarConfiguracionObjetos(),
      cargarConfiguracionGeneracionObjetos(),
      cargarConfiguracionMapas(),
      cargarConfiguracionCiudad(),
      cargarConfiguracionComercio(),
      cargarYConfigurarProgresoMagico(),
    ]);
    this.configuracionPersonaje = configuracionPersonaje;
    this.configuracionEnemigos = configuracionEnemigos;
    this.configuracionObjetos =
      validarCatalogoCatalizadores(configuracionObjetos);
    this.configuracionGeneracionObjetos = configuracionGeneracionObjetos;
    this.configuracionMapas = configuracionMapas;
    this.configuracionCiudad = configuracionCiudad;
    this.configuracionComercio = configuracionComercio;
    this.configuracionProgresoMagico = configuracionProgresoMagico;
  }
  crearMenuCreacionPersonaje() {
    this.menuCreacionPersonaje = new MenuCreacionPersonaje({
      configuracion: this.configuracionPersonaje,
      configuracionObjetos: this.configuracionObjetos,
      configuracionGeneracionObjetos: this.configuracionGeneracionObjetos,
      alConfirmar: (datosPersonaje) => {
        // Confirmar una creación representa una nueva partida. El
        // guardado roguelike anterior y la configuración de accesos rápidos
        // no deben heredarse al nuevo personaje.
        try {
          eliminarGuardadoJugador();
        } catch (error) {
          console.warn("No se pudo limpiar el guardado anterior:", error);
        }
        try {
          eliminarConfiguracionBarraHabilidades();
        } catch (error) {
          console.warn("No se pudo limpiar la barra anterior:", error);
        }
        this.controladorPartida.iniciar({
          datosPersonaje,
          configuracionPersonaje: this.configuracionPersonaje,
          configuracionEnemigos: this.configuracionEnemigos,
          configuracionObjetos: this.configuracionObjetos,
          configuracionGeneracionObjetos: this.configuracionGeneracionObjetos,
          configuracionMapas: this.configuracionMapas,
          configuracionCiudad: this.configuracionCiudad,
          configuracionComercio: this.configuracionComercio,
        });
      },
    });
  }
  mostrarErrorInicio(error) {
    console.error("No se pudo iniciar la aplicación:", error);
    const mensaje = document.getElementById("creationMessage");
    if (mensaje) {
      mensaje.textContent = "No se pudo cargar la configuración del juego.";
    }
  }
}
