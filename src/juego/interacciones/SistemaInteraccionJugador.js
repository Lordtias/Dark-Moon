import { crearResultadoAccion } from "../acciones/ResultadoAccion.js";

import {
  transferirObjetoEntreContenedores,
  transferirTodosLosObjetos,
} from "../inventario/SistemaTransferenciaObjetos.js";

import {
  COSTOS_TEMPORALES_BASE,
  TIPOS_ACCION_TEMPORAL,
} from "../tiempo/SistemaTiempo.js";

import {
  obtenerInteraccionesDisponibles as resolverInteraccionesDisponibles,
  obtenerInteraccionPrioritaria as resolverInteraccionPrioritaria,
} from "./SistemaInteracciones.js";

import {
  crearOpcionesInteraccion,
  seleccionarOpcionEnDireccion,
} from "./SelectorInteracciones.js";

import { TIPOS_INTERACCION } from "./TiposInteraccion.js";

// Administra todas las interacciones que el jugador
// puede realizar con las entidades del mapa.
//
// Este sistema se ocupa de:
//
// - Buscar interacciones disponibles.
// - Administrar el selector de interactuables.
// - Confirmar y cancelar una selección.
// - Validar contenedores de objetos.
// - Transferir botín al inventario.
// - Retirar del mapa contenedores vacíos.
//
// La interfaz continúa comunicándose con Juego.
// Juego simplemente delegará aquí las operaciones.
export class SistemaInteraccionJugador {
  constructor({
    jugador,
    interactuables,
    obtenerModoCombateActivo,
    obtenerContextoInteraccion,
    finalizarResultadoAccionJugador,
  } = {}) {
    if (!jugador || typeof jugador !== "object") {
      throw new Error("SistemaInteraccionJugador necesita un jugador válido.");
    }

    if (!Array.isArray(interactuables)) {
      throw new Error(
        "SistemaInteraccionJugador necesita una lista de interactuables.",
      );
    }

    if (typeof obtenerModoCombateActivo !== "function") {
      throw new Error(
        "SistemaInteraccionJugador necesita consultar el modo combate.",
      );
    }

    if (typeof obtenerContextoInteraccion !== "function") {
      throw new Error(
        "SistemaInteraccionJugador necesita un contexto de interacción.",
      );
    }

    if (typeof finalizarResultadoAccionJugador !== "function") {
      throw new Error(
        "SistemaInteraccionJugador necesita finalizar acciones temporales.",
      );
    }

    // Conservamos referencias a los elementos reales de la partida.
    //
    // No copiamos la lista porque los botines pueden agregarse
    // o retirarse durante la partida.
    this.jugador = jugador;
    this.interactuables = interactuables;

    // Estas funciones permiten consultar o ejecutar operaciones
    // externas sin acoplar este sistema a la clase Juego completa.
    this.obtenerModoCombateActivo = obtenerModoCombateActivo;

    this.obtenerContextoInteraccion = obtenerContextoInteraccion;

    this.finalizarResultadoAccionJugador = finalizarResultadoAccionJugador;

    this.modoActivo = false;

    this.selector = {
      entidad: null,
      x: this.jugador.x,
      y: this.jugador.y,
    };
  }

  // Devuelve todas las interacciones que el jugador
  // puede utilizar desde su posición actual.
  obtenerInteraccionesDisponibles() {
    return resolverInteraccionesDisponibles({
      actor: this.jugador,
      interactuables: this.interactuables,
      contexto: this.crearContextoInteraccion(),
    });
  }

  // Devuelve la interacción de mayor prioridad.
  obtenerInteraccionPrioritaria() {
    return resolverInteraccionPrioritaria({
      actor: this.jugador,
      interactuables: this.interactuables,
      contexto: this.crearContextoInteraccion(),
    });
  }

  // Agrupa las interacciones por entidad.
  //
  // Una entidad que en el futuro permita hablar,
  // comerciar y entregar una misión aparecerá una sola vez
  // dentro del selector.
  obtenerOpcionesInteraccion() {
    return crearOpcionesInteraccion(this.obtenerInteraccionesDisponibles());
  }

  // Devuelve la opción actualmente seleccionada.
  obtenerOpcionSeleccionada() {
    if (!this.selector.entidad) {
      return null;
    }

    return (
      this.obtenerOpcionesInteraccion().find(
        (opcion) => opcion.entidad === this.selector.entidad,
      ) ?? null
    );
  }

  // Activa el selector cuando existen varias
  // entidades interactuables alrededor del jugador.
  entrarModoInteraccion() {
    const bloqueo = this.obtenerBloqueoInteraccion();

    if (bloqueo) {
      return bloqueo;
    }

    if (this.modoActivo) {
      return crearResultadoAccion({
        exito: false,
        mensaje: "Ya estás seleccionando una interacción.",
      });
    }

    const opciones = this.obtenerOpcionesInteraccion();

    if (opciones.length === 0) {
      return crearResultadoAccion({
        exito: false,
        mensaje: "No hay nada para revisar cerca.",
      });
    }

    // Cuando solo existe una opción, la interfaz puede
    // ejecutarla directamente sin activar el selector.
    if (opciones.length === 1) {
      return crearResultadoAccion({
        exito: false,
        mensaje: "Solo hay una entidad interactuable disponible.",
        interaccion: opciones[0].interaccionPrioritaria,
      });
    }

    this.modoActivo = true;
    this.establecerSelector(opciones[0]);

    return crearResultadoAccion({
      exito: true,
      mensaje:
        `Seleccionaste ${opciones[0].entidad.nombre}. ` +
        "Mové el selector y confirmá con R.",
      redibujar: true,
    });
  }

  // Mueve el selector hacia la mejor entidad disponible
  // en la dirección indicada.
  moverSelector(movimientoX, movimientoY) {
    if (!this.modoActivo) {
      return crearResultadoAccion();
    }

    const opciones = this.obtenerOpcionesInteraccion();

    if (opciones.length === 0) {
      this.limpiarSelector();

      return crearResultadoAccion({
        mensaje: "Ya no hay interacciones disponibles.",
        redibujar: true,
      });
    }

    const opcionActual =
      opciones.find((opcion) => opcion.entidad === this.selector.entidad) ??
      opciones[0];

    const siguienteOpcion = seleccionarOpcionEnDireccion({
      opciones,
      opcionActual,
      movimientoX,
      movimientoY,
    });

    if (siguienteOpcion === opcionActual) {
      return crearResultadoAccion({
        mensaje: "No hay otro interactuable en esa dirección.",
      });
    }

    this.establecerSelector(siguienteOpcion);

    return crearResultadoAccion({
      mensaje:
        `Seleccionaste ${siguienteOpcion.entidad.nombre}. ` + "Confirmá con R.",
      redibujar: true,
    });
  }

  // Confirma la entidad seleccionada y devuelve
  // la interacción que debe ejecutar la interfaz.
  confirmarSeleccion() {
    if (!this.modoActivo) {
      return crearResultadoAccion({
        exito: false,
        interaccion: null,
      });
    }

    const opciones = this.obtenerOpcionesInteraccion();

    const opcionSeleccionada =
      opciones.find((opcion) => opcion.entidad === this.selector.entidad) ??
      opciones[0] ??
      null;

    this.limpiarSelector();

    if (!opcionSeleccionada) {
      return crearResultadoAccion({
        exito: false,
        mensaje: "La interacción seleccionada ya no está disponible.",
        interaccion: null,
        redibujar: true,
      });
    }

    return crearResultadoAccion({
      exito: true,
      interaccion: opcionSeleccionada.interaccionPrioritaria,
      entidad: opcionSeleccionada.entidad,
      redibujar: true,
    });
  }

  // Cancela el selector sin consumir tiempo.
  cancelarModoInteraccion() {
    if (!this.modoActivo) {
      return crearResultadoAccion();
    }

    this.limpiarSelector();

    return crearResultadoAccion({
      mensaje: "Cancelaste la selección de interacción.",
      redibujar: true,
    });
  }

  // Comprueba si el jugador puede iniciar
  // o continuar una interacción.
  obtenerBloqueoInteraccion() {
    if (!this.jugador.estaVivo) {
      return crearResultadoAccion({
        exito: false,
        mensaje: "No podés interactuar estando derrotado.",
      });
    }

    if (this.obtenerModoCombateActivo()) {
      return crearResultadoAccion({
        exito: false,
        mensaje: "Cancelá el modo combate antes de interactuar.",
      });
    }

    return null;
  }

  // Transfiere un único espacio del contenedor
  // al inventario del jugador.
  recogerObjeto(interactuable, indiceOrigen) {
    const validacion = this.validarInteraccionContenedor(interactuable);

    if (validacion) {
      return validacion;
    }

    const objeto =
      interactuable.contenedorObjetos.obtenerObjetoEn(indiceOrigen);

    if (!objeto) {
      return crearResultadoAccion({
        exito: false,
        mensaje: "Ese espacio del contenedor está vacío.",
      });
    }

    const resultadoTransferencia = transferirObjetoEntreContenedores({
      contenedorOrigen: interactuable.contenedorObjetos,

      contenedorDestino: this.jugador.inventario,

      indiceOrigen,
    });

    if (!resultadoTransferencia.exito) {
      return crearResultadoAccion({
        exito: false,
        mensaje: "No hay espacio suficiente en el inventario.",
      });
    }

    this.retirarInteractuableSiVacio(interactuable);

    const mensajes = [
      `Recogiste ${resultadoTransferencia.cantidadTransferida} ` +
        `${resultadoTransferencia.nombreObjeto}.`,
    ];

    if (resultadoTransferencia.cantidadRestante > 0) {
      mensajes.push(
        `Quedaron ${resultadoTransferencia.cantidadRestante} ` +
          `${resultadoTransferencia.nombreObjeto} en el botín.`,
      );
    }

    const resultado = crearResultadoAccion({
      ...resultadoTransferencia,
      exito: true,
      mensaje: mensajes.join("\n"),
    });

    return this.finalizarResultadoAccionJugador({
      resultado,
      tipoAccion: TIPOS_ACCION_TEMPORAL.ACCION,
      costoBase: COSTOS_TEMPORALES_BASE.accion,
    });
  }

  // Intenta transferir todos los objetos posibles
  // desde el contenedor hacia el inventario.
  recogerTodo(interactuable) {
    const validacion = this.validarInteraccionContenedor(interactuable);

    if (validacion) {
      return validacion;
    }

    const resultadoTransferencia = transferirTodosLosObjetos({
      contenedorOrigen: interactuable.contenedorObjetos,

      contenedorDestino: this.jugador.inventario,
    });

    if (!resultadoTransferencia.exito) {
      return crearResultadoAccion({
        exito: false,
        mensaje: "No hay espacio suficiente en el inventario.",
      });
    }

    this.retirarInteractuableSiVacio(interactuable);

    const detalles = resultadoTransferencia.resultados
      .filter((resultado) => resultado.cantidadTransferida > 0)
      .map(
        (resultado) =>
          `${resultado.cantidadTransferida} ` + `${resultado.nombreObjeto}`,
      );

    const mensajes = ["Recogiste todo lo posible:", ...detalles];

    if (!resultadoTransferencia.origenVacio) {
      mensajes.push(
        "Algunos objetos quedaron en el botín porque " +
          "el inventario no tiene espacio.",
      );
    }

    const resultado = crearResultadoAccion({
      ...resultadoTransferencia,
      exito: true,
      mensaje: mensajes.join("\n"),
    });

    return this.finalizarResultadoAccionJugador({
      resultado,
      tipoAccion: TIPOS_ACCION_TEMPORAL.ACCION,
      costoBase: COSTOS_TEMPORALES_BASE.accion,
    });
  }

  // Valida que la entidad siga existiendo,
  // contenga objetos y esté al alcance del jugador.
  validarInteraccionContenedor(interactuable) {
    const bloqueo = this.obtenerBloqueoInteraccion();

    if (bloqueo) {
      return bloqueo;
    }

    if (!this.interactuables.includes(interactuable)) {
      return crearResultadoAccion({
        exito: false,
        mensaje: "Ese contenedor ya no está disponible.",
      });
    }

    if (
      !interactuable?.contenedorObjetos ||
      typeof interactuable.contenedorObjetos.estaVacio !== "function"
    ) {
      return crearResultadoAccion({
        exito: false,
        mensaje: "La entidad seleccionada no contiene objetos.",
      });
    }

    if (interactuable.contenedorObjetos.estaVacio()) {
      this.retirarInteractuableSiVacio(interactuable);

      return crearResultadoAccion({
        exito: false,
        mensaje: "El contenedor está vacío.",
        redibujar: true,
      });
    }

    const interaccionDisponible = this.obtenerInteraccionesDisponibles().some(
      (interaccion) =>
        interaccion.entidad === interactuable &&
        interaccion.tipo === TIPOS_INTERACCION.ABRIR_CONTENEDOR,
    );

    if (!interaccionDisponible) {
      return crearResultadoAccion({
        exito: false,
        mensaje: "Acercate al contenedor para recoger sus objetos.",
      });
    }

    return null;
  }

  // Retira del mapa una entidad interactuable
  // cuando ya no contiene objetos.
  retirarInteractuableSiVacio(interactuable) {
    const estaVacio =
      interactuable?.estaVacio === true ||
      interactuable?.contenedorObjetos?.estaVacio?.() === true;

    if (!estaVacio) {
      return false;
    }

    const indice = this.interactuables.indexOf(interactuable);

    if (indice === -1) {
      return false;
    }

    this.interactuables.splice(indice, 1);

    if (this.selector.entidad === interactuable) {
      this.limpiarSelector();
    }

    return true;
  }

  // Actualiza el selector con una opción válida.
  establecerSelector(opcion) {
    this.selector = {
      entidad: opcion.entidad,
      x: opcion.x,
      y: opcion.y,
    };
  }

  // Desactiva el selector y lo devuelve
  // a la posición actual del jugador.
  limpiarSelector() {
    this.modoActivo = false;

    this.selector = {
      entidad: null,
      x: this.jugador.x,
      y: this.jugador.y,
    };
  }

  // Obtiene el contexto externo que las entidades
  // pueden necesitar al construir sus interacciones.
  crearContextoInteraccion() {
    const contexto = this.obtenerContextoInteraccion();

    if (
      contexto === null ||
      typeof contexto !== "object" ||
      Array.isArray(contexto)
    ) {
      throw new Error("El contexto de interacción debe ser un objeto válido.");
    }

    return contexto;
  }
}
