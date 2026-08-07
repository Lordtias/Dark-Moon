import { Combatiente } from "../../entidad/destructible/combatiente/Combatiente.js";
import { crearEventoEntidadMovida } from "../acciones/EventosAccion.js";
import { crearResultadoAccion } from "../acciones/ResultadoAccion.js";
import {
  COSTOS_TEMPORALES_BASE,
  TIPOS_ACCION_TEMPORAL,
} from "../tiempo/SistemaTiempo.js";
import {
  crearMensajeTraducible,
  crearParametroEntidadMensaje,
  TIPOS_MENSAJE_JUEGO,
} from "../mensajes/MensajesJuego.js";

function mensajeMovimiento(sufijo, respaldo, tipo = TIPOS_MENSAJE_JUEGO.SISTEMA) {
  return crearMensajeTraducible(`mensajes.movimiento.${sufijo}`, {
    tipo,
    respaldo,
  });
}

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
    notificarMovimientoActor = () => ({ mensajes: [], eventos: [] }),
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
      notificarMovimientoActor,
      "notificar movimientos a las zonas temporales",
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
    this.notificarMovimientoActor = notificarMovimientoActor;
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
        mensaje: mensajeMovimiento("pared", "No podés atravesar una pared.", TIPOS_MENSAJE_JUEGO.NEGATIVO),
      });
    }
    if (this.estaDiagonalBloqueada(movimientoX, movimientoY)) {
      return crearResultadoAccion({
        exito: false,
        mensaje: mensajeMovimiento("esquina", "No podés atravesar esa esquina.", TIPOS_MENSAJE_JUEGO.NEGATIVO),
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
        mensaje: crearMensajeTraducible("mensajes.movimiento.ocupado", {
          parametros: { objetivo: crearParametroEntidadMensaje(objetivo) },
          tipo: TIPOS_MENSAJE_JUEGO.NEGATIVO,
          respaldo: `No podés caminar sobre ${objetivo.nombre}.`,
        }),
      });
    }

    const origen = { x: this.jugador.x, y: this.jugador.y };
    this.jugador.x = nuevaX;
    this.jugador.y = nuevaY;
    this.registrarUltimaDireccionCombate(movimientoX, movimientoY);

    const resultadoZona = this.notificarMovimientoActor({
      actor: this.jugador,
      origen,
      destino: { x: nuevaX, y: nuevaY },
    });
    const opcionesInteraccion = this.obtenerOpcionesInteraccion();
    const mensajesMovimiento = [
      mensajeMovimiento("movido", "Te moviste por el mapa."),
    ];
    if (opcionesInteraccion.length === 1) {
      mensajesMovimiento.push(
        crearMensajeTraducible("mensajes.interacciones.unaCerca", {
          tipo: TIPOS_MENSAJE_JUEGO.ALERTA,
          respaldo: "Hay una entidad para revisar: presioná R.",
        }),
      );
    } else if (opcionesInteraccion.length > 1) {
      mensajesMovimiento.push(
        crearMensajeTraducible("mensajes.interacciones.variasCerca", {
          tipo: TIPOS_MENSAJE_JUEGO.ALERTA,
          respaldo: "Hay varias entidades para revisar: presioná R.",
        }),
      );
    }

    return this.finalizarAccionJugador({
      mensaje: [
        ...mensajesMovimiento,
        ...(resultadoZona?.mensajes ?? []),
      ].filter(Boolean),
      tipoAccion: TIPOS_ACCION_TEMPORAL.MOVIMIENTO,
      costoBase: COSTOS_TEMPORALES_BASE.movimiento,
      eventos: [
        crearEventoEntidadMovida({
          entidad: this.jugador,
          origen,
          destino: { x: nuevaX, y: nuevaY },
        }),
        ...(resultadoZona?.eventos ?? []),
      ],
    });
  }
}
