import { Combatiente } from "../../entidad/destructible/combatiente/Combatiente.js";
import { crearEventoEntidadMovida } from "../acciones/EventosAccion.js";
import { crearResultadoAccion } from "../acciones/ResultadoAccion.js";
import {
  COSTOS_TEMPORALES_BASE,
  TIPOS_ACCION_TEMPORAL,
} from "../tiempo/SistemaTiempo.js";
import {
  crearMensajeTraducible,
  TIPOS_MENSAJE_JUEGO,
} from "../mensajes/MensajesJuego.js";

export class SistemaMovimientoJugador {
  constructor({
    sistemaEspacial,
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
    if (
      !sistemaEspacial ||
      typeof sistemaEspacial.consultarPosicion !== "function" ||
      typeof sistemaEspacial.consultarTerreno !== "function" ||
      typeof sistemaEspacial.estaDentroMapa !== "function" ||
      typeof sistemaEspacial.bloqueaMovimiento !== "function" ||
      typeof sistemaEspacial.bloqueaPasoDiagonal !== "function"
    ) {
      throw new Error(
        "SistemaMovimientoJugador necesita un sistema espacial válido.",
      );
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

    this.sistemaEspacial = sistemaEspacial;
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
    return this.sistemaEspacial.estaDentroMapa(x, y);
  }

  // Conserva el contrato histórico: indica si el terreno de la casilla puede
  // recorrerse. Las entidades y zonas se combinan al resolver un movimiento.
  esCaminable(x, y) {
    const terreno = this.sistemaEspacial.consultarTerreno(x, y);
    return terreno.dentroMapa && !terreno.bloqueaMovimiento;
  }

  estaDiagonalBloqueada(movimientoX, movimientoY) {
    return this.sistemaEspacial.bloqueaPasoDiagonal({
      origen: this.jugador,
      movimientoX,
      movimientoY,
      ignorarEntidades: [this.jugador],
    });
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

    if (!this.estaDentroMapa(nuevaX, nuevaY)) {
      return crearResultadoAccion({ exito: false });
    }

    const objetivo = this.obtenerObjetivoEn(nuevaX, nuevaY);
    const consultaSinObjetivo = this.sistemaEspacial.consultarPosicion(
      nuevaX,
      nuevaY,
      { ignorarEntidades: [this.jugador, objetivo].filter(Boolean) },
    );
    if (
      consultaSinObjetivo.terreno.bloqueaMovimiento ||
      consultaSinObjetivo.zonas.some((zona) => zona.bloqueaMovimiento === true)
    ) {
      return crearResultadoAccion({ exito: false });
    }
    if (this.estaDiagonalBloqueada(movimientoX, movimientoY)) {
      return crearResultadoAccion({ exito: false });
    }

    if (objetivo instanceof Combatiente) {
      this.registrarUltimaDireccionCombate(movimientoX, movimientoY);
      return this.entrarModoCombate(nuevaX, nuevaY);
    }
    if (
      this.sistemaEspacial.bloqueaMovimiento(nuevaX, nuevaY, {
        ignorarEntidades: [this.jugador],
      })
    ) {
      return crearResultadoAccion({ exito: false });
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
    const mensajesMovimiento = [];
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
