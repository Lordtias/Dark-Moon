import { Combatiente } from "../../entidad/destructible/combatiente/Combatiente.js";

import { crearResultadoAccion } from "../acciones/ResultadoAccion.js";

import {
  COSTOS_TEMPORALES_BASE,
  TIPOS_ACCION_TEMPORAL,
} from "../tiempo/SistemaTiempo.js";

// Administra el movimiento del jugador dentro del mapa.
//
// Este sistema se ocupa de:
//
// - Validar los límites del mapa.
// - Comprobar si una casilla es caminable.
// - Evitar atravesar esquinas bloqueadas en diagonal.
// - Desviar el movimiento hacia selectores activos.
// - Detectar colisiones con combatientes.
// - Desplazar al jugador.
// - Informar interacciones disponibles después de moverse.
// - Registrar el coste temporal del movimiento.
//
// Juego continúa funcionando como fachada pública,
// por lo que los controladores no necesitan conocer
// directamente este sistema.
export class SistemaMovimientoJugador {
  constructor({
    mapa,
    jugador,
    obtenerObjetivoEn,
    obtenerModoInteraccionActivo,
    moverSelectorInteraccion,
    obtenerModoCombateActivo,
    moverSelectorCombate,
    registrarUltimaDireccionCombate,
    entrarModoCombate,
    obtenerOpcionesInteraccion,
    finalizarAccionJugador,
  } = {}) {
    if (!Array.isArray(mapa) || mapa.length === 0) {
      throw new Error("SistemaMovimientoJugador necesita un mapa válido.");
    }

    if (!jugador || typeof jugador !== "object") {
      throw new Error("SistemaMovimientoJugador necesita un jugador válido.");
    }

    this.validarFuncion(obtenerObjetivoEn, "consultar objetivos del mapa");

    this.validarFuncion(
      obtenerModoInteraccionActivo,
      "consultar el modo interacción",
    );

    this.validarFuncion(
      moverSelectorInteraccion,
      "mover el selector de interacción",
    );

    this.validarFuncion(obtenerModoCombateActivo, "consultar el modo combate");

    this.validarFuncion(moverSelectorCombate, "mover el selector de combate");

    this.validarFuncion(
      registrarUltimaDireccionCombate,
      "registrar la dirección del jugador",
    );

    this.validarFuncion(entrarModoCombate, "iniciar el modo combate");

    this.validarFuncion(
      obtenerOpcionesInteraccion,
      "consultar interacciones disponibles",
    );

    this.validarFuncion(
      finalizarAccionJugador,
      "finalizar acciones temporales",
    );

    this.mapa = mapa;
    this.jugador = jugador;

    // Las funciones externas mantienen al sistema desacoplado
    // de la implementación completa de Juego.
    this.obtenerObjetivoEn = obtenerObjetivoEn;

    this.obtenerModoInteraccionActivo = obtenerModoInteraccionActivo;

    this.moverSelectorInteraccion = moverSelectorInteraccion;

    this.obtenerModoCombateActivo = obtenerModoCombateActivo;

    this.moverSelectorCombate = moverSelectorCombate;

    this.registrarUltimaDireccionCombate = registrarUltimaDireccionCombate;

    this.entrarModoCombate = entrarModoCombate;

    this.obtenerOpcionesInteraccion = obtenerOpcionesInteraccion;

    this.finalizarAccionJugador = finalizarAccionJugador;
  }

  // Valida las dependencias funcionales utilizadas
  // para comunicarse con otros sistemas.
  validarFuncion(funcion, descripcion) {
    if (typeof funcion !== "function") {
      throw new Error("SistemaMovimientoJugador necesita " + `${descripcion}.`);
    }
  }

  // Comprueba que una posición exista dentro
  // de la matriz que representa el mapa.
  estaDentroMapa(x, y) {
    return y >= 0 && y < this.mapa.length && x >= 0 && x < this.mapa[y].length;
  }

  // Una casilla es caminable cuando existe
  // y no contiene una pared.
  esCaminable(x, y) {
    return this.estaDentroMapa(x, y) && this.mapa[y][x] !== "#";
  }

  // Evita atravesar diagonalmente una esquina
  // cuando las dos casillas ortogonales están bloqueadas.
  estaDiagonalBloqueada(movimientoX, movimientoY) {
    const esDiagonal =
      Math.abs(movimientoX) === 1 && Math.abs(movimientoY) === 1;

    if (!esDiagonal) {
      return false;
    }

    const horizontalBloqueada = !this.esCaminable(
      this.jugador.x + movimientoX,
      this.jugador.y,
    );

    const verticalBloqueada = !this.esCaminable(
      this.jugador.x,
      this.jugador.y + movimientoY,
    );

    return horizontalBloqueada && verticalBloqueada;
  }

  // Intenta desplazar al jugador o, cuando existe
  // un selector activo, redirige el movimiento hacia él.
  mover(movimientoX, movimientoY) {
    if (!this.jugador.estaVivo) {
      return crearResultadoAccion({
        exito: false,
      });
    }

    // Los selectores consumen las teclas de movimiento,
    // pero no desplazan físicamente al jugador.
    if (this.obtenerModoInteraccionActivo()) {
      return this.moverSelectorInteraccion(movimientoX, movimientoY);
    }

    if (this.obtenerModoCombateActivo()) {
      return this.moverSelectorCombate(movimientoX, movimientoY);
    }

    const nuevaX = this.jugador.x + movimientoX;

    const nuevaY = this.jugador.y + movimientoY;

    if (!this.esCaminable(nuevaX, nuevaY)) {
      return crearResultadoAccion({
        exito: false,
        mensaje: "No podés atravesar una pared.",
      });
    }

    if (this.estaDiagonalBloqueada(movimientoX, movimientoY)) {
      return crearResultadoAccion({
        exito: false,
        mensaje: "No podés atravesar esa esquina.",
      });
    }

    const objetivo = this.obtenerObjetivoEn(nuevaX, nuevaY);

    // Chocar contra un combatiente abre el selector
    // de combate apuntando directamente a esa entidad.
    if (objetivo instanceof Combatiente) {
      this.registrarUltimaDireccionCombate(movimientoX, movimientoY);

      return this.entrarModoCombate(nuevaX, nuevaY);
    }

    // Los destructibles u otros objetivos sólidos
    // bloquean el desplazamiento sin abrir combate.
    if (objetivo) {
      return crearResultadoAccion({
        exito: false,
        mensaje: `No podés caminar sobre ${objetivo.nombre}.`,
      });
    }

    this.jugador.x = nuevaX;
    this.jugador.y = nuevaY;

    this.registrarUltimaDireccionCombate(movimientoX, movimientoY);

    const opcionesInteraccion = this.obtenerOpcionesInteraccion();

    let mensajeInteraccion = "";

    if (opcionesInteraccion.length === 1) {
      mensajeInteraccion =
        "\n" +
        `${opcionesInteraccion[0].interaccionPrioritaria.texto}: ` +
        "presioná R.";
    } else if (opcionesInteraccion.length > 1) {
      mensajeInteraccion = "\nHay varias entidades para revisar: presioná R.";
    }

    return this.finalizarAccionJugador({
      mensaje: "Te moviste por la mazmorra." + mensajeInteraccion,

      tipoAccion: TIPOS_ACCION_TEMPORAL.MOVIMIENTO,

      costoBase: COSTOS_TEMPORALES_BASE.movimiento,
    });
  }
}
