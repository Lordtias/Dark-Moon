import { ModalCuracion } from "../curacion/ModalCuracion.js";
import { traducirContenido } from "../idiomas/ContextoIdioma.js";
import {
  calcularEstadoCuracion,
  curarJugador,
} from "../../juego/curacion/SistemaCuracion.js";
import {
  TIPOS_INTERACCION,
} from "../../juego/interacciones/TiposInteraccion.js";

// Presenta mediante la interfaz DOM las interacciones resueltas
// por el sistema común de comandos.
//
// Este adaptador administra:
//
// - La apertura de contenedores.
// - La selección de mazmorras.
// - La solicitud de comercio.
// - Los servicios de curación.
// - Las transiciones entre mapas.
//
// No escucha teclado, no decide qué entidad interactuar
// y no procesa directamente el resultado visual general.
export class AdaptadorInteraccionesDom {
  constructor({
    juego,
    configuracionHabilidadesNPC,
    modalContenedorObjetos,
    modalSeleccionMazmorra,
    obtenerMazmorrasDisponibles,
    alSeleccionarMazmorra,
    alSolicitarComercio,
    alSolicitarTransicionMapa,
    alProcesarResultado,
    alEjecutarAccionJugable,
  } = {}) {
    if (
      !juego ||
      typeof juego.recogerObjetoInteractuable !== "function" ||
      typeof juego.recogerTodoInteractuable !== "function"
    ) {
      throw new Error(
        "AdaptadorInteraccionesDom necesita una partida válida.",
      );
    }

    if (
      !modalContenedorObjetos ||
      typeof modalContenedorObjetos.abrir !== "function" ||
      typeof modalContenedorObjetos.actualizar !== "function" ||
      typeof modalContenedorObjetos.cerrar !== "function"
    ) {
      throw new Error(
        "AdaptadorInteraccionesDom necesita un modal de contenedores.",
      );
    }

    if (
      !modalSeleccionMazmorra ||
      typeof modalSeleccionMazmorra.abrir !== "function" ||
      typeof modalSeleccionMazmorra.cerrar !== "function"
    ) {
      throw new Error(
        "AdaptadorInteraccionesDom necesita un selector de mazmorras.",
      );
    }

    if (typeof obtenerMazmorrasDisponibles !== "function") {
      throw new Error(
        "AdaptadorInteraccionesDom necesita consultar las mazmorras disponibles.",
      );
    }

    if (typeof alSeleccionarMazmorra !== "function") {
      throw new Error(
        "AdaptadorInteraccionesDom necesita una acción para seleccionar mazmorras.",
      );
    }

    if (typeof alSolicitarComercio !== "function") {
      throw new Error(
        "AdaptadorInteraccionesDom necesita un manejador de comercio.",
      );
    }

    if (typeof alSolicitarTransicionMapa !== "function") {
      throw new Error(
        "AdaptadorInteraccionesDom necesita un manejador de transiciones de mapa.",
      );
    }

    if (typeof alProcesarResultado !== "function") {
      throw new Error(
        "AdaptadorInteraccionesDom necesita procesar resultados de acción.",
      );
    }

    if (typeof alEjecutarAccionJugable !== "function") {
      throw new Error(
        "AdaptadorInteraccionesDom necesita una acción jugable centralizada.",
      );
    }

    this.juego = juego;
    this.configuracionHabilidadesNPC = configuracionHabilidadesNPC;
    this.modalContenedorObjetos = modalContenedorObjetos;
    this.modalSeleccionMazmorra = modalSeleccionMazmorra;
    this.obtenerMazmorrasDisponibles = obtenerMazmorrasDisponibles;
    this.alSeleccionarMazmorra = alSeleccionarMazmorra;
    this.alSolicitarComercio = alSolicitarComercio;
    this.alSolicitarTransicionMapa = alSolicitarTransicionMapa;
    this.alProcesarResultado = alProcesarResultado;
    this.alEjecutarAccionJugable = alEjecutarAccionJugable;

    // El modal de curación se crea de forma diferida.
    // Así las mazmorras que no contienen curanderas
    // no agregan una ventana innecesaria al documento.
    this.modalCuracion = null;
    this.interactuableActual = null;
  }

  desactivar() {
    this.modalContenedorObjetos.cerrar();
    this.modalSeleccionMazmorra.cerrar();
    this.modalCuracion?.destruir();
    this.modalCuracion = null;
    this.interactuableActual = null;
  }

  presentar(interaccion) {
    if (
      !interaccion ||
      typeof interaccion !== "object" ||
      Array.isArray(interaccion)
    ) {
      throw new Error(
        "AdaptadorInteraccionesDom necesita una interacción válida.",
      );
    }

    switch (interaccion.tipo) {
      case TIPOS_INTERACCION.ABRIR_CONTENEDOR:
        return this.abrirContenedor(interaccion);

      case TIPOS_INTERACCION.COMERCIAR:
        return this.solicitarComercio(interaccion);

      case TIPOS_INTERACCION.CURAR:
        return this.abrirCuracion(interaccion);

      case TIPOS_INTERACCION.SELECCIONAR_MAZMORRA:
        return this.abrirSeleccionMazmorra();

      case TIPOS_INTERACCION.TRANSICION_MAPA:
        return this.solicitarTransicionMapa(interaccion);

      default:
        return this.procesarResultado({
          exito: false,
          mensaje:
            `La interacción "${interaccion.texto}" ` +
            "todavía no tiene una interfaz asociada.",
          turnoConsumido: false,
          redibujar: false,
        });
    }
  }

  abrirContenedor(interaccion) {
    const interactuable = interaccion.entidad;

    this.modalCuracion?.cerrar();
    this.interactuableActual = interactuable;

    this.modalContenedorObjetos.abrir({
      titulo: traducirContenido(
        "entidades",
        interactuable.id,
        "nombre",
        interactuable.nombre,
      ),
      contenedorObjetos: interaccion.contenedorObjetos,
      combatiente: this.juego.player,
      alRecoger: (indiceOrigen) => {
        const ejecucion = this.ejecutarAccionJugable({
          tipoEntrada: "recoger_objeto",
          ejecutar: () =>
            this.juego.recogerObjetoInteractuable(
              interactuable,
              indiceOrigen,
            ),
        });

        if (ejecucion.aceptada) {
          this.actualizarModalDespuesAccion(interactuable);
        }
        return ejecucion.aceptada ? ejecucion.resultado : null;
      },
      alRecogerTodo: () => {
        const ejecucion = this.ejecutarAccionJugable({
          tipoEntrada: "recoger_todo",
          ejecutar: () =>
            this.juego.recogerTodoInteractuable(interactuable),
        });

        if (ejecucion.aceptada) {
          this.actualizarModalDespuesAccion(interactuable);
        }
        return ejecucion.aceptada ? ejecucion.resultado : null;
      },
    });
  }

  solicitarComercio(interaccion) {
    const mercader = interaccion.entidad;

    if (
      !mercader ||
      typeof mercader.id !== "string" ||
      mercader.id.trim() === ""
    ) {
      throw new Error(
        "La interacción comercial no contiene un mercader válido.",
      );
    }

    this.modalContenedorObjetos.cerrar();
    this.modalSeleccionMazmorra.cerrar();
    this.modalCuracion?.cerrar();
    this.interactuableActual = null;
    return this.alSolicitarComercio(mercader.id);
  }

  abrirCuracion(interaccion) {
    const curandera = interaccion.entidad;

    if (
      !curandera ||
      typeof curandera.nombre !== "string" ||
      curandera.nombre.trim() === ""
    ) {
      throw new Error(
        "La interacción de curación no contiene una curandera válida.",
      );
    }

    this.modalContenedorObjetos.cerrar();
    this.modalSeleccionMazmorra.cerrar();
    this.interactuableActual = null;

    const modalCuracion = this.obtenerModalCuracion();

    modalCuracion.abrir({
      curandera,
      jugador: this.juego.player,
      calcularEstado: () =>
        calcularEstadoCuracion({
          jugador: this.juego.player,
        }),
      alCurar: (tipoServicio) => {
        const ejecucion = this.ejecutarAccionJugable({
          tipoEntrada: "servicio_curacion",
          ejecutar: () =>
            curarJugador({
              jugador: this.juego.player,
              curandera,
              tipoServicio,
              configuracionHabilidadesNPC: this.configuracionHabilidadesNPC,
            }),
        });

        return ejecucion.aceptada ? ejecucion.resultado : null;
      },
    });
  }

  obtenerModalCuracion() {
    if (!this.modalCuracion) {
      this.modalCuracion = new ModalCuracion();
    }

    return this.modalCuracion;
  }

  abrirSeleccionMazmorra() {
    this.modalCuracion?.cerrar();

    const mazmorras = this.obtenerMazmorrasDisponibles();

    this.modalSeleccionMazmorra.abrir({
      mazmorras,
      alConfirmar: (seleccion) => {
        const ejecucion = this.ejecutarAccionJugable({
          tipoEntrada: "seleccionar_mazmorra",
          ejecutar: () => this.alSeleccionarMazmorra(seleccion),
          procesarResultado: false,
        });
        return ejecucion.aceptada ? ejecucion.resultado : false;
      },
    });
  }

  solicitarTransicionMapa(interaccion) {
    const solicitud = interaccion.solicitudTransicionMapa;

    if (!solicitud || typeof solicitud !== "object") {
      throw new Error(
        "La interacción no contiene una solicitud de transición válida.",
      );
    }

    this.modalContenedorObjetos.cerrar();
    this.modalSeleccionMazmorra.cerrar();
    this.modalCuracion?.cerrar();
    this.interactuableActual = null;
    return this.alSolicitarTransicionMapa(solicitud);
  }

  actualizarModalDespuesAccion(interactuable) {
    const continuaEnMapa = this.juego.interactuables.includes(interactuable);

    if (
      !continuaEnMapa ||
      !this.juego.player.estaVivo ||
      interactuable.estaVacio
    ) {
      this.modalContenedorObjetos.cerrar();
      this.interactuableActual = null;
      return;
    }

    this.modalContenedorObjetos.actualizar();
  }

  ejecutarAccionJugable({
    tipoEntrada,
    ejecutar,
    procesarResultado = true,
  }) {
    return this.alEjecutarAccionJugable({
      tipoEntrada,
      origenEntrada: "interaccion_dom",
      ejecutar,
      procesarResultado,
    });
  }

  procesarResultado(resultado) {
    return this.alProcesarResultado(resultado);
  }
}
