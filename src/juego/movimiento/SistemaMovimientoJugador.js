import { Combatiente } from "../../entidad/destructible/combatiente/Combatiente.js";
import { crearResultadoAccion } from "../acciones/ResultadoAccion.js";
import {
  COSTOS_TEMPORALES_BASE,
  TIPOS_ACCION_TEMPORAL,
} from "../tiempo/SistemaTiempo.js";

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
    obtenerBloqueoMovimiento = () => null,
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
      obtenerBloqueoMovimiento,
      "consultar bloqueos temporales del movimiento",
    );
    this.validarFuncion(
      finalizarAccionJugador,
      "finalizar acciones temporales",
    );

    this.mapa = mapa;
    this.jugador = jugador;
    this.obtenerObjetivoEn = obtenerObjetivoEn;
    this.obtenerModoInteraccionActivo = obtenerModoInteraccionActivo;
    this.moverSelectorInteraccion = moverSelectorInteraccion;
    this.obtenerModoCombateActivo = obtenerModoCombateActivo;
    this.moverSelectorCombate = moverSelectorCombate;
    this.registrarUltimaDireccionCombate = registrarUltimaDireccionCombate;
    this.entrarModoCombate = entrarModoCombate;
    this.obtenerOpcionesInteraccion = obtenerOpcionesInteraccion;
    this.obtenerBloqueoMovimiento = obtenerBloqueoMovimiento;
    this.finalizarAccionJugador = finalizarAccionJugador;
  }

  validarFuncion(funcion, descripcion) {
    if (typeof funcion !== "function") {
      throw new Error(`SistemaMovimientoJugador necesita ${descripcion}.`);
    }
  }

  estaDentroMapa(x, y) {
    return y >= 0 && y < this.mapa.length && x >= 0 && x < this.mapa[y].length;
  }

  esCaminable(x, y) {
    return this.estaDentroMapa(x, y) && this.mapa[y][x] !== "#";
  }

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

  mover(movimientoX, movimientoY) {
    if (!this.jugador.estaVivo) {
      return crearResultadoAccion({ exito: false });
    }

    // Mover selectores no consume tiempo ni es una acción del combatiente.
    if (this.obtenerModoInteraccionActivo()) {
      return this.moverSelectorInteraccion(movimientoX, movimientoY);
    }
    if (this.obtenerModoCombateActivo()) {
      return this.moverSelectorCombate(movimientoX, movimientoY);
    }

    const bloqueoTemporal = this.obtenerBloqueoMovimiento();
    if (bloqueoTemporal) {
      return bloqueoTemporal;
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
    if (objetivo instanceof Combatiente) {
      this.registrarUltimaDireccionCombate(movimientoX, movimientoY);
      return this.entrarModoCombate(nuevaX, nuevaY);
    }
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
        `\n${opcionesInteraccion[0].interaccionPrioritaria.texto}: ` +
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
