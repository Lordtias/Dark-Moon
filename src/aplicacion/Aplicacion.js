// Funciones encargadas de cargar los archivos JSON
// necesarios para iniciar Dark Moon.
import {
  cargarConfiguracionPersonaje,
  cargarConfiguracionEnemigos,
  cargarConfiguracionObjetos,
  cargarConfiguracionBotin,
  cargarConfiguracionGeneracionObjetos,
  cargarConfiguracionMapas,
  cargarConfiguracionCiudad,
  cargarConfiguracionComercio,
  cargarConfiguracionHabilidadesNPC,
  cargarConfiguracionEntidadesMazmorra,
  cargarPerfilesAtaquePorFamilia,
  cargarPerfilesHabilidadesVisuales,
  cargarPerfilesEstadosTemporalesVisuales,
  cargarPerfilesZonasTemporalesVisuales,
} from "../juego/configuracion/CargadorConfiguracion.js";
import {
  cargarYConfigurarProgresoHabilidades,
  obtenerConfiguracionEjecucionHabilidades,
} from "../juego/maestrias/ContextoProgresoHabilidades.js";
import { validarCatalogoCatalizadores } from "../juego/magia/SistemaCatalizadores.js";
import { validarReferenciasEntidadesMazmorra } from "../juego/configuracion/ValidadorConfiguracionEntidadesMazmorra.js";
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
import {
  actualizarPreferenciaInterfaz,
  cargarConfiguracionPreferenciasInterfaz,
  crearOverridesPreferenciasInterfaz,
  crearPreferenciasIniciales,
  resolverPreferenciasInterfaz,
} from "../interfaz/configuracion/PreferenciasInterfaz.js";
import {
  eliminarPreferenciasInterfazPersistidas,
  guardarPreferenciasInterfazPersistidas,
  leerPreferenciasInterfazPersistidas,
} from "../interfaz/configuracion/PersistenciaPreferenciasInterfaz.js";
import { cargarTraductor } from "../interfaz/idiomas/CargadorIdiomas.js";
import { traducir } from "../interfaz/idiomas/ContextoIdioma.js";

// Aplicacion coordina el arranque y la sesión sin conocer la tecnología visual.
export class Aplicacion {
  constructor({ presentacion } = {}) {
    validarPresentacion(presentacion);

    this.presentacion = presentacion;
    this.controladorPantallas = null;
    this.controladorConfiguracion = null;
    this.controladorIdioma = null;
    this.controladorPartida = null;
    this.menuCreacionPersonaje = null;
    this.configuracionPersonaje = null;
    this.configuracionEnemigos = null;
    this.configuracionObjetos = null;
    this.configuracionBotin = null;
    this.configuracionGeneracionObjetos = null;
    this.configuracionMapas = null;
    this.configuracionCiudad = null;
    this.configuracionComercio = null;
    this.configuracionHabilidadesNPC = null;
    this.configuracionEntidadesMazmorra = null;
    this.configuracionProgresoHabilidades = null;
    this.configuracionPresentacionCombate = null;
    this.configuracionPresentacionHabilidades = null;
    this.configuracionPresentacionEstadosTemporales = null;
    this.configuracionPresentacionZonasTemporales = null;
    this.guardadoPresente = false;
    this.guardadoValido = false;
    this.configuracionPreferenciasInterfaz = null;
    this.preferenciasInterfaz = null;
    this.traductor = null;
    this.mensajePreferenciasInicial = "";
  }

  async iniciar() {
    try {
      this.crearControladores();
      this.presentacion.mostrarVersionAplicacion(VERSION_APLICACION);
      this.controladorPantallas.configurarEventos({
        alSolicitarNuevoJuego: () => this.confirmarInicioNuevaPartida(),
        alSolicitarContinuar: () => this.continuarPartida(),
      });
      this.controladorConfiguracion.configurarEventos({
        alCambiarPreferencia: (clave, valor) =>
          this.cambiarPreferenciaInterfaz(clave, valor),
        alRestablecerPreferencias: () =>
          this.restablecerPreferenciasInterfaz(),
      });
      this.controladorIdioma.configurarEventos({
        alCambiarIdioma: (idioma) => this.cambiarIdioma(idioma),
      });
      await this.cargarPreferenciasInterfaz();
      await this.cargarIdiomaInterfaz();
      this.presentarPreferenciasInterfaz(this.mensajePreferenciasInicial);
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
    this.controladorConfiguracion =
      this.presentacion.crearControladorConfiguracion();
    this.controladorIdioma = this.presentacion.crearControladorIdioma();

    this.controladorPartida = new ControladorPartida({
      controladorPantallas: this.controladorPantallas,
      presentadorCargaMapa: this.presentacion.crearPresentadorCargaMapa(),
      alJugadorDerrotado: (detalle) =>
        this.presentacion.presentarDerrota(detalle),
      crearInterfazPartida: (configuracion) =>
        this.presentacion.crearInterfazPartida({
          ...configuracion,
          preferenciasInterfaz: this.preferenciasInterfaz,
          configuracionZoomInterfaz:
            this.configuracionPreferenciasInterfaz.preferencias.zoomInicial,
          obtenerContextoDiagnostico: () => this.obtenerContextoDiagnostico(),
        }),
      crearPresentacionMapaActivo: (configuracion) =>
        this.presentacion.crearPresentacionMapaActivo(configuracion),
    });
  }


  obtenerContextoDiagnostico() {
    return {
      version: VERSION_APLICACION,
      renderizador: this.presentacion.obtenerInformacionRenderizador?.() ?? null,
      idioma: this.traductor?.obtenerIdioma?.() ?? this.preferenciasInterfaz?.idioma ?? "es",
      preferencias: this.preferenciasInterfaz ? { ...this.preferenciasInterfaz } : null,
      partida: this.controladorPartida?.obtenerContextoDiagnostico?.() ?? null,
    };
  }

  async cargarPreferenciasInterfaz() {
    this.configuracionPreferenciasInterfaz =
      await cargarConfiguracionPreferenciasInterfaz();

    let persistidas = null;
    let mensaje = "";

    try {
      persistidas = leerPreferenciasInterfazPersistidas();
    } catch (error) {
      console.warn(
        "Las preferencias guardadas no pudieron utilizarse; se aplicarán los valores canónicos:",
        error,
      );
      mensaje =
        "Las preferencias guardadas no eran válidas. Se utilizaron los valores predeterminados.";
    }

    this.preferenciasInterfaz = resolverPreferenciasInterfaz({
      configuracion: this.configuracionPreferenciasInterfaz,
      persistidas,
    });

    this.mensajePreferenciasInicial = mensaje
      ? "interfaz.mensajes.preferenciasInvalidas"
      : "";
  }

  async cargarIdiomaInterfaz() {
    this.traductor = await cargarTraductor({
      idioma: this.preferenciasInterfaz?.idioma ?? "es",
    });
    this.presentacion.configurarTraductor(this.traductor);
    this.controladorIdioma.presentar(this.traductor.obtenerIdioma());
  }

  presentarPreferenciasInterfaz(claveMensaje = "") {
    this.controladorConfiguracion.presentar({
      configuracion: this.configuracionPreferenciasInterfaz,
      preferencias: this.preferenciasInterfaz,
      mensaje: claveMensaje ? traducir(claveMensaje) : "",
    });
  }

  cambiarPreferenciaInterfaz(clave, valor) {
    try {
      const preferenciasNuevas = actualizarPreferenciaInterfaz({
        configuracion: this.configuracionPreferenciasInterfaz,
        preferenciasActuales: this.preferenciasInterfaz,
        clave,
        valor,
      });
      const overrides = crearOverridesPreferenciasInterfaz({
        configuracion: this.configuracionPreferenciasInterfaz,
        preferencias: preferenciasNuevas,
      });

      guardarPreferenciasInterfazPersistidas({
        version: this.configuracionPreferenciasInterfaz.version,
        preferencias: overrides,
      });

      this.preferenciasInterfaz = preferenciasNuevas;
      this.controladorConfiguracion.mostrarMensaje(
        traducir("interfaz.mensajes.preferenciasGuardadas"),
      );
      return this.preferenciasInterfaz;
    } catch (error) {
      console.warn("No se pudo guardar la preferencia de interfaz:", error);
      this.controladorConfiguracion.mostrarMensaje(
        traducir("interfaz.mensajes.preferenciaError", {
          respaldo: "No se pudo guardar la preferencia seleccionada.",
        }),
        { error: true },
      );
      return this.preferenciasInterfaz;
    }
  }

  cambiarIdioma(idioma) {
    if (!this.traductor || idioma === this.preferenciasInterfaz?.idioma) {
      return this.preferenciasInterfaz;
    }

    const preferencias = this.cambiarPreferenciaInterfaz("idioma", idioma);
    if (preferencias?.idioma !== idioma) return preferencias;

    this.traductor.cambiarIdioma(idioma);
    this.presentacion.actualizarIdioma();
    this.controladorIdioma.presentar(idioma);
    this.presentarPreferenciasInterfaz();
    this.actualizarDisponibilidadContinuar();
    this.menuCreacionPersonaje?.actualizarIdioma?.();
    return preferencias;
  }

  restablecerPreferenciasInterfaz() {
    try {
      eliminarPreferenciasInterfazPersistidas();
      this.preferenciasInterfaz = crearPreferenciasIniciales(
        this.configuracionPreferenciasInterfaz,
      );
      const idioma = this.preferenciasInterfaz.idioma;
      if (this.traductor && idioma !== this.traductor.obtenerIdioma()) {
        this.traductor.cambiarIdioma(idioma);
        this.presentacion.actualizarIdioma();
        this.controladorIdioma.presentar(idioma);
        this.actualizarDisponibilidadContinuar();
        this.menuCreacionPersonaje?.actualizarIdioma?.();
      }
      this.controladorConfiguracion.presentar({
        configuracion: this.configuracionPreferenciasInterfaz,
        preferencias: this.preferenciasInterfaz,
        mensaje: traducir("interfaz.mensajes.preferenciasRestauradas"),
      });
      return this.preferenciasInterfaz;
    } catch (error) {
      console.warn("No se pudieron restablecer las preferencias:", error);
      this.controladorConfiguracion.mostrarMensaje(
        traducir("interfaz.mensajes.restablecerError", {
          respaldo: "No se pudieron restablecer las preferencias.",
        }),
        { error: true },
      );
      return this.preferenciasInterfaz;
    }
  }

  // La configuración de maestrías se carga junto con el resto. Así, Player
  // siempre se construye después de validar la progresión general y los catálogos jugables.
  async cargarConfiguraciones() {
    const [
      configuracionPersonaje,
      configuracionEnemigos,
      configuracionObjetos,
      configuracionBotin,
      configuracionGeneracionObjetos,
      configuracionMapas,
      configuracionCiudad,
      configuracionComercio,
      configuracionHabilidadesNPC,
      configuracionEntidadesMazmorra,
      configuracionProgresoHabilidades,
      perfilesAtaquePorFamilia,
      perfilesHabilidadesVisuales,
      perfilesEstadosTemporalesVisuales,
      perfilesZonasTemporalesVisuales,
    ] = await Promise.all([
      cargarConfiguracionPersonaje(),
      cargarConfiguracionEnemigos(),
      cargarConfiguracionObjetos(),
      cargarConfiguracionBotin(),
      cargarConfiguracionGeneracionObjetos(),
      cargarConfiguracionMapas(),
      cargarConfiguracionCiudad(),
      cargarConfiguracionComercio(),
      cargarConfiguracionHabilidadesNPC(),
      cargarConfiguracionEntidadesMazmorra(),
      cargarYConfigurarProgresoHabilidades(),
      cargarPerfilesAtaquePorFamilia(),
      cargarPerfilesHabilidadesVisuales(),
      cargarPerfilesEstadosTemporalesVisuales(),
      cargarPerfilesZonasTemporalesVisuales(),
    ]);

    this.configuracionPersonaje = configuracionPersonaje;
    this.configuracionEnemigos = configuracionEnemigos;
    this.configuracionObjetos =
      validarCatalogoCatalizadores(configuracionObjetos);
    this.configuracionBotin = configuracionBotin;
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
    this.configuracionEntidadesMazmorra = configuracionEntidadesMazmorra;
    validarReferenciasEntidadesMazmorra({
      configuracionMapas: this.configuracionMapas,
      configuracionEntidadesMazmorra: this.configuracionEntidadesMazmorra,
    });
    this.configuracionProgresoHabilidades = configuracionProgresoHabilidades;
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
        mensaje: traducir("interfaz.mensajes.guardadoAccesoError", { respaldo: "No se pudo acceder al guardado del navegador." }),
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
          ? traducir("interfaz.menu.continuarTitulo", {
              parametros: { nombre: jugador.nombre, nivel: jugador.nivel },
              respaldo: `Continuar como ${jugador.nombre} (nivel ${jugador.nivel})`,
            })
          : "",
      });
      return this.guardadoValido;
    } catch (error) {
      this.guardadoValido = false;
      console.warn("El guardado durable no pudo validarse:", error);
      this.controladorPantallas.configurarContinuar({
        habilitado: false,
        mensaje: traducir("interfaz.mensajes.guardadoCargaError", {
          respaldo: "No se pudo cargar la partida guardada. Podés comenzar una partida nueva.",
        }),
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
          mensaje: traducir("interfaz.mensajes.guardadoInexistente", { respaldo: "No existe una partida guardada para continuar." }),
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
        mensaje: traducir("interfaz.mensajes.guardadoCargaError", {
          respaldo: "No se pudo cargar la partida guardada. Podés comenzar una partida nueva.",
        }),
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
      configuracionBotin: this.configuracionBotin,
      configuracionGeneracionObjetos: this.configuracionGeneracionObjetos,
      configuracionMapas: this.configuracionMapas,
      configuracionCiudad: this.configuracionCiudad,
      configuracionComercio: this.configuracionComercio,
      configuracionHabilidadesNPC: this.configuracionHabilidadesNPC,
      configuracionEntidadesMazmorra: this.configuracionEntidadesMazmorra,
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
    "crearControladorConfiguracion",
    "crearControladorIdioma",
    "configurarTraductor",
    "actualizarIdioma",
    "mostrarVersionAplicacion",
    "confirmarReemplazoGuardado",
    "crearMenuCreacionPersonaje",
    "crearInterfazPartida",
    "crearPresentacionMapaActivo",
    "crearPresentadorCargaMapa",
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
