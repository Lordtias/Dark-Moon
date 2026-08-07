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
  cargarConfiguracionHabilidadesNPC,
  cargarPerfilesAtaquePorFamilia,
  cargarPerfilesHabilidadesVisuales,
  cargarPerfilesEstadosTemporalesVisuales,
  cargarPerfilesZonasTemporalesVisuales,
} from "../juego/configuracion/CargadorConfiguracion.js";
import {
  cargarYConfigurarProgresoMagico,
  obtenerConfiguracionEjecucionHabilidades,
} from "../juego/maestrias/ContextoProgresoMagico.js";
import { validarCatalogoCatalizadores } from "../juego/magia/SistemaCatalizadores.js";
import {
  crearJugadorDesdeGuardado,
  eliminarGuardadoJugador,
  existeGuardadoJugador,
} from "../partida/PersistenciaJugador.js";
import { eliminarConfiguracionBarraHabilidades } from "../juego/habilidades/PersistenciaBarraHabilidades.js";
import { configurarPerfilesAtaquePorFamilia } from "../interfaz/graficos/ContextoPerfilesAtaquePorFamilia.js";
import { configurarPerfilesHabilidadesVisuales } from "../interfaz/graficos/ContextoPerfilesHabilidadesVisuales.js";
import { configurarPerfilesEstadosTemporalesVisuales } from "../interfaz/graficos/ContextoPerfilesEstadosTemporalesVisuales.js";
import { configurarPerfilesZonasTemporalesVisuales } from "../interfaz/graficos/ContextoPerfilesZonasTemporalesVisuales.js";
import { ControladorPartida } from "./ControladorPartida.js";
import { VERSION_APLICACION } from "../config/VersionAplicacion.js";

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
    this.configuracionHabilidadesNPC = null;
    this.configuracionProgresoMagico = null;
    this.configuracionPresentacionCombate = null;
    this.configuracionPresentacionHabilidades = null;
    this.configuracionPresentacionEstadosTemporales = null;
    this.configuracionPresentacionZonasTemporales = null;
    this.guardadoPresente = false;
    this.guardadoValido = false;
  }

  async iniciar() {
    try {
      this.crearControladores();
      this.presentacion.mostrarVersionAplicacion(VERSION_APLICACION);
      this.controladorPantallas.configurarEventos({
        alSolicitarNuevoJuego: () => this.confirmarInicioNuevaPartida(),
        alSolicitarContinuar: () => this.continuarPartida(),
      });
      await this.cargarConfiguraciones();
      this.actualizarDisponibilidadContinuar();
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
      configuracionHabilidadesNPC,
      configuracionProgresoMagico,
      perfilesAtaquePorFamilia,
      perfilesHabilidadesVisuales,
      perfilesEstadosTemporalesVisuales,
      perfilesZonasTemporalesVisuales,
    ] = await Promise.all([
      cargarConfiguracionPersonaje(),
      cargarConfiguracionEnemigos(),
      cargarConfiguracionObjetos(),
      cargarConfiguracionGeneracionObjetos(),
      cargarConfiguracionMapas(),
      cargarConfiguracionCiudad(),
      cargarConfiguracionComercio(),
      cargarConfiguracionHabilidadesNPC(),
      cargarYConfigurarProgresoMagico(),
      cargarPerfilesAtaquePorFamilia(),
      cargarPerfilesHabilidadesVisuales(),
      cargarPerfilesEstadosTemporalesVisuales(),
      cargarPerfilesZonasTemporalesVisuales(),
    ]);

    this.configuracionPersonaje = configuracionPersonaje;
    this.configuracionEnemigos = configuracionEnemigos;
    this.configuracionObjetos =
      validarCatalogoCatalizadores(configuracionObjetos);
    this.configuracionPresentacionCombate =
      configurarPerfilesAtaquePorFamilia({
        configuracion: perfilesAtaquePorFamilia,
        configuracionObjetos: this.configuracionObjetos,
      });
    const configuracionEjecucionHabilidades =
      obtenerConfiguracionEjecucionHabilidades();
    const configuracionHabilidadesVisualesCanonicas = {
      ...configuracionEjecucionHabilidades,
      habilidades: {
        ...configuracionEjecucionHabilidades.habilidades,
        ...configuracionHabilidadesNPC.habilidades,
      },
    };
    this.configuracionPresentacionHabilidades =
      configurarPerfilesHabilidadesVisuales({
        configuracion: perfilesHabilidadesVisuales,
        configuracionHabilidades: configuracionHabilidadesVisualesCanonicas,
      });
    this.configuracionPresentacionEstadosTemporales =
      configurarPerfilesEstadosTemporalesVisuales({
        configuracion: perfilesEstadosTemporalesVisuales,
        configuracionEfectos: configuracionEjecucionHabilidades,
      });
    this.configuracionPresentacionZonasTemporales =
      configurarPerfilesZonasTemporalesVisuales({
        configuracion: perfilesZonasTemporalesVisuales,
      });
    this.configuracionGeneracionObjetos = configuracionGeneracionObjetos;
    this.configuracionMapas = configuracionMapas;
    this.configuracionCiudad = configuracionCiudad;
    this.configuracionComercio = configuracionComercio;
    this.configuracionHabilidadesNPC = configuracionHabilidadesNPC;
    this.configuracionProgresoMagico = configuracionProgresoMagico;
  }

  confirmarInicioNuevaPartida() {
    if (!this.guardadoPresente) {
      return true;
    }

    return this.presentacion.confirmarReemplazoGuardado();
  }

  actualizarDisponibilidadContinuar() {
    try {
      this.guardadoPresente = existeGuardadoJugador();
    } catch (error) {
      this.guardadoPresente = false;
      this.guardadoValido = false;
      console.warn("No se pudo consultar el guardado durable:", error);
      this.controladorPantallas.configurarContinuar({
        habilitado: false,
        mensaje: "No se pudo acceder al guardado del navegador.",
        error: true,
      });
      return false;
    }

    if (!this.guardadoPresente) {
      this.guardadoValido = false;
      this.controladorPantallas.configurarContinuar({
        habilitado: false,
        mensaje: "",
      });
      return false;
    }

    try {
      const jugador = this.crearJugadorDesdeGuardadoActual();
      this.guardadoValido = jugador !== null;
      this.controladorPantallas.configurarContinuar({
        habilitado: this.guardadoValido,
        mensaje: "",
        titulo: this.guardadoValido
          ? `Continuar como ${jugador.nombre} (nivel ${jugador.nivel})`
          : "",
      });
      return this.guardadoValido;
    } catch (error) {
      this.guardadoValido = false;
      console.warn("El guardado durable no pudo validarse:", error);
      this.controladorPantallas.configurarContinuar({
        habilitado: false,
        mensaje:
          "No se pudo cargar la partida guardada. Podés comenzar una partida nueva.",
        error: true,
      });
      return false;
    }
  }

  crearJugadorDesdeGuardadoActual() {
    return crearJugadorDesdeGuardado({
      configuracionPersonaje: this.configuracionPersonaje,
      configuracionObjetos: this.configuracionObjetos,
    });
  }

  continuarPartida() {
    if (!this.guardadoValido || this.controladorPartida.partidaIniciada) {
      return false;
    }

    try {
      const jugadorRestaurado = this.crearJugadorDesdeGuardadoActual();
      if (!jugadorRestaurado) {
        this.guardadoPresente = false;
        this.guardadoValido = false;
        this.controladorPantallas.configurarContinuar({
          habilitado: false,
          mensaje: "No existe una partida guardada para continuar.",
        });
        return false;
      }

      return this.controladorPartida.iniciar({
        jugadorRestaurado,
        ...this.obtenerConfiguracionInicioPartida(),
      });
    } catch (error) {
      this.guardadoValido = false;
      console.error("No se pudo continuar la partida guardada:", error);
      this.controladorPantallas.configurarContinuar({
        habilitado: false,
        mensaje:
          "No se pudo cargar la partida guardada. Podés comenzar una partida nueva.",
        error: true,
      });
      return false;
    }
  }

  obtenerConfiguracionInicioPartida() {
    return {
      configuracionPersonaje: this.configuracionPersonaje,
      configuracionEnemigos: this.configuracionEnemigos,
      configuracionObjetos: this.configuracionObjetos,
      configuracionGeneracionObjetos: this.configuracionGeneracionObjetos,
      configuracionMapas: this.configuracionMapas,
      configuracionCiudad: this.configuracionCiudad,
      configuracionComercio: this.configuracionComercio,
      configuracionHabilidadesNPC: this.configuracionHabilidadesNPC,
    };
  }

  crearMenuCreacionPersonaje() {
    this.menuCreacionPersonaje =
      this.presentacion.crearMenuCreacionPersonaje({
        configuracion: this.configuracionPersonaje,
        configuracionObjetos: this.configuracionObjetos,
        configuracionGeneracionObjetos:
          this.configuracionGeneracionObjetos,
        alConfirmar: (datosPersonaje) => {
          // Entrar a creación ya requirió confirmación si existía progreso.
          // El guardado solo se elimina al comenzar efectivamente la nueva
          // aventura, por lo que cancelar/reload antes de este punto lo conserva.
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

          this.guardadoPresente = false;
          this.guardadoValido = false;

          return this.controladorPartida.iniciar({
            datosPersonaje,
            ...this.obtenerConfiguracionInicioPartida(),
          });
        },
      });
  }
}

function validarPresentacion(presentacion) {
  const metodosObligatorios = [
    "crearControladorPantallas",
    "mostrarVersionAplicacion",
    "confirmarReemplazoGuardado",
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
