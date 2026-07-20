import { TIPOS_INTERACCION } from "../juego/interacciones/TiposInteraccion.js";

// E ya se utiliza para el movimiento diagonal noreste.
// Utilizamos R como abreviatura de Revisar.
const TECLA_INTERACCION = "KeyR";

// Conecta las capacidades de interacción del dominio
// con las ventanas de la interfaz.
//
// Este controlador administra:
//
// - La tecla R.
// - La apertura de contenedores.
// - La confirmación del selector de interacción.
// - La actualización de la ventana de botín.
export class ControladorInteracciones {
  constructor({ juego, renderizador, modalContenedorObjetos } = {}) {
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

    this.juego = juego;

    this.renderizador = renderizador;

    this.modalContenedorObjetos = modalContenedorObjetos;

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
    if (!this.estaActivo) {
      return;
    }

    document.removeEventListener("keydown", this.manejarTecla);

    this.modalContenedorObjetos.cerrar();

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

    // Cuando el selector ya está activo,
    // R confirma la entidad seleccionada.
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

    // Con una sola entidad no agregamos
    // una confirmación innecesaria.
    if (opciones.length === 1) {
      this.ejecutarInteraccion(opciones[0].interaccionPrioritaria);

      return;
    }

    // Con varias entidades activamos
    // el selector visual.
    const resultado = this.juego.entrarModoInteraccion();

    this.procesarResultado(resultado);
  }

  ejecutarInteraccion(interaccion) {
    switch (interaccion.tipo) {
      case TIPOS_INTERACCION.ABRIR_CONTENEDOR:
        this.abrirContenedor(interaccion);
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
    if (!resultado) {
      return;
    }

    if (
      typeof resultado.mensaje === "string" &&
      resultado.mensaje.trim() !== ""
    ) {
      this.renderizador.mostrarMensaje(resultado.mensaje);
    }

    if (resultado.redibujar) {
      this.renderizador.dibujarJuego(this.juego);
    }
  }
}
