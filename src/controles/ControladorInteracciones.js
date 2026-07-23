import { ModalCuracion } from "../interfaz/curacion/ModalCuracion.js";
import {
  calcularEstadoCuracion,
  curarJugador,
} from "../juego/curacion/SistemaCuracion.js";
import { TIPOS_INTERACCION } from "../juego/interacciones/TiposInteraccion.js";
import { aplicarResultadoAccion } from "./ProcesadorResultadoAccion.js";

// E ya se utiliza para el movimiento diagonal noreste.
// Utilizamos R como abreviatura de Revisar.
const TECLA_INTERACCION = "KeyR";

// Conecta las capacidades de interacción del dominio
// con las ventanas y acciones de la aplicación.
//
// Este controlador administra:
//
// - La tecla R.
// - La apertura de contenedores.
// - La selección de mazmorras.
// - La solicitud de comercio.
// - Los servicios de curación.
// - La confirmación del selector.
// - Las transiciones entre mapas.
export class ControladorInteracciones {
  constructor({
    juego,
    renderizador,
    modalContenedorObjetos,
    modalSeleccionMazmorra,
    obtenerMazmorrasDisponibles,
    alSeleccionarMazmorra,
    alSolicitarComercio,
    alSolicitarTransicionMapa,
  } = {}) {
    if (
      !juego ||
      typeof juego.obtenerOpcionesInteraccion !== "function" ||
      typeof juego.entrarModoInteraccion !== "function" ||
      typeof juego.confirmarInteraccionSeleccionada !== "function" ||
      typeof juego.recogerObjetoInteractuable !== "function" ||
      typeof juego.recogerTodoInteractuable !== "function"
    ) {
      throw new Error("ControladorInteracciones necesita una partida válida.");
    }

    if (
      !renderizador ||
      typeof renderizador.dibujarJuego !== "function" ||
      typeof renderizador.mostrarMensaje !== "function"
    ) {
      throw new Error(
        "ControladorInteracciones necesita un renderizador válido.",
      );
    }

    if (
      !modalContenedorObjetos ||
      typeof modalContenedorObjetos.abrir !== "function" ||
      typeof modalContenedorObjetos.actualizar !== "function" ||
      typeof modalContenedorObjetos.cerrar !== "function"
    ) {
      throw new Error(
        "ControladorInteracciones necesita un modal de contenedores.",
      );
    }

    if (
      !modalSeleccionMazmorra ||
      typeof modalSeleccionMazmorra.abrir !== "function" ||
      typeof modalSeleccionMazmorra.cerrar !== "function"
    ) {
      throw new Error(
        "ControladorInteracciones necesita un selector de mazmorras.",
      );
    }

    if (typeof obtenerMazmorrasDisponibles !== "function") {
      throw new Error(
        "ControladorInteracciones necesita consultar las mazmorras disponibles.",
      );
    }

    if (typeof alSeleccionarMazmorra !== "function") {
      throw new Error(
        "ControladorInteracciones necesita una acción para seleccionar mazmorras.",
      );
    }

    if (typeof alSolicitarComercio !== "function") {
      throw new Error(
        "ControladorInteracciones necesita un manejador de comercio.",
      );
    }

    if (typeof alSolicitarTransicionMapa !== "function") {
      throw new Error(
        "ControladorInteracciones necesita un manejador de transiciones de mapa.",
      );
    }

    this.juego = juego;
    this.renderizador = renderizador;
    this.modalContenedorObjetos = modalContenedorObjetos;
    this.modalSeleccionMazmorra = modalSeleccionMazmorra;
    this.obtenerMazmorrasDisponibles = obtenerMazmorrasDisponibles;
    this.alSeleccionarMazmorra = alSeleccionarMazmorra;
    this.alSolicitarComercio = alSolicitarComercio;
    this.alSolicitarTransicionMapa = alSolicitarTransicionMapa;

    // El modal de curación se crea de forma diferida.
    // Así las mazmorras que no contienen curanderas
    // no agregan una ventana innecesaria al documento.
    this.modalCuracion = null;
    this.interactuableActual = null;
    this.manejarTecla = this.manejarTecla.bind(this);
    this.estaActivo = false;
  }

  activar() {
    if (this.estaActivo) {
      return;
    }

    document.addEventListener("keydown", this.manejarTecla);
    this.estaActivo = true;
  }

  desactivar() {
    if (this.estaActivo) {
      document.removeEventListener("keydown", this.manejarTecla);
    }

    this.modalContenedorObjetos.cerrar();
    this.modalSeleccionMazmorra.cerrar();
    this.modalCuracion?.destruir();
    this.modalCuracion = null;
    this.interactuableActual = null;
    this.estaActivo = false;
  }

  manejarTecla(event) {
    if (event.code !== TECLA_INTERACCION || event.repeat) {
      return;
    }

    // Una ventana abierta administra
    // sus propias teclas.
    if (document.querySelector("dialog[open]")) {
      return;
    }

    event.preventDefault();

    if (this.juego.modoInteraccionActivo) {
      const resultado = this.juego.confirmarInteraccionSeleccionada();
      this.procesarResultado(resultado);

      if (resultado?.interaccion) {
        this.ejecutarInteraccion(resultado.interaccion);
      }

      return;
    }

    const bloqueo = this.juego.obtenerBloqueoInteraccion();

    if (bloqueo) {
      this.procesarResultado(bloqueo);
      return;
    }

    const opciones = this.juego.obtenerOpcionesInteraccion();

    if (opciones.length === 0) {
      this.renderizador.mostrarMensaje("No hay nada para revisar cerca.");
      return;
    }

    if (opciones.length === 1) {
      this.ejecutarInteraccion(opciones[0].interaccionPrioritaria);
      return;
    }

    const resultado = this.juego.entrarModoInteraccion();
    this.procesarResultado(resultado);
  }

  ejecutarInteraccion(interaccion) {
    switch (interaccion.tipo) {
      case TIPOS_INTERACCION.ABRIR_CONTENEDOR:
        this.abrirContenedor(interaccion);
        break;

      case TIPOS_INTERACCION.COMERCIAR:
        this.solicitarComercio(interaccion);
        break;

      case TIPOS_INTERACCION.CURAR:
        this.abrirCuracion(interaccion);
        break;

      case TIPOS_INTERACCION.SELECCIONAR_MAZMORRA:
        this.abrirSeleccionMazmorra();
        break;

      case TIPOS_INTERACCION.TRANSICION_MAPA:
        this.solicitarTransicionMapa(interaccion);
        break;

      default:
        this.renderizador.mostrarMensaje(
          `La interacción "${interaccion.texto}" ` +
            "todavía no tiene una interfaz asociada.",
        );
    }
  }

  abrirContenedor(interaccion) {
    const interactuable = interaccion.entidad;

    this.modalCuracion?.cerrar();
    this.interactuableActual = interactuable;

    this.modalContenedorObjetos.abrir({
      titulo: interactuable.nombre,
      contenedorObjetos: interaccion.contenedorObjetos,
      combatiente: this.juego.player,
      alRecoger: (indiceOrigen) => {
        const resultado = this.juego.recogerObjetoInteractuable(
          interactuable,
          indiceOrigen,
        );
        this.procesarResultado(resultado);
        this.actualizarModalDespuesAccion(interactuable);
      },
      alRecogerTodo: () => {
        const resultado = this.juego.recogerTodoInteractuable(interactuable);
        this.procesarResultado(resultado);
        this.actualizarModalDespuesAccion(interactuable);
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
    this.alSolicitarComercio(mercader.id);
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
        const resultado = curarJugador({
          jugador: this.juego.player,
          tipoServicio,
        });

        return this.procesarResultado(resultado);
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
      alConfirmar: (idMazmorra) => this.alSeleccionarMazmorra(idMazmorra),
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
    this.alSolicitarTransicionMapa(solicitud);
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

  procesarResultado(resultado) {
    return aplicarResultadoAccion({
      resultado,
      juego: this.juego,
      renderizador: this.renderizador,
    });
  }
}
