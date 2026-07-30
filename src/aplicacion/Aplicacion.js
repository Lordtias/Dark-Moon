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
import { ControladorPartida } from "./ControladorPartida.js";

// Aplicacion coordina el arranque y la sesión sin conocer la tecnología visual.
export class Aplicacion {
  constructor({ presentacion } = {}) {
    validarPresentacion(presentacion);

    this.presentacion = presentacion;
    this.controladorPantallas = null;
    this.controladorPartida = null;
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
      this.presentacion.mostrarErrorInicio(error);
    }
  }

  crearControladores() {
    this.controladorPantallas =
      this.presentacion.crearControladorPantallas();

    this.controladorPartida = new ControladorPartida({
      controladorPantallas: this.controladorPantallas,
      alJugadorDerrotado: (detalle) =>
        this.presentacion.presentarDerrota(detalle),
      crearInterfazPartida: (configuracion) =>
        this.presentacion.crearInterfazPartida(configuracion),
      crearPresentacionMapaActivo: (configuracion) =>
        this.presentacion.crearPresentacionMapaActivo(configuracion),
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
    this.menuCreacionPersonaje =
      this.presentacion.crearMenuCreacionPersonaje({
        configuracion: this.configuracionPersonaje,
        configuracionObjetos: this.configuracionObjetos,
        configuracionGeneracionObjetos:
          this.configuracionGeneracionObjetos,
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
            configuracionGeneracionObjetos:
              this.configuracionGeneracionObjetos,
            configuracionMapas: this.configuracionMapas,
            configuracionCiudad: this.configuracionCiudad,
            configuracionComercio: this.configuracionComercio,
          });
        },
      });
  }
}

function validarPresentacion(presentacion) {
  const metodosObligatorios = [
    "crearControladorPantallas",
    "crearMenuCreacionPersonaje",
    "crearInterfazPartida",
    "crearPresentacionMapaActivo",
    "presentarDerrota",
    "mostrarErrorInicio",
  ];

  if (!presentacion || typeof presentacion !== "object") {
    throw new Error("Aplicacion necesita una presentación válida.");
  }

  for (const metodo of metodosObligatorios) {
    if (typeof presentacion[metodo] !== "function") {
      throw new Error(
        `La presentación debe implementar el método "${metodo}".`,
      );
    }
  }
}
