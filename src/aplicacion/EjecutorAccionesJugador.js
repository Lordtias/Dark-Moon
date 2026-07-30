export const TIPOS_COMANDO_JUGADOR = Object.freeze({
  MOVER: "mover",
  ESPERAR: "esperar",
  ACTIVAR_O_CONFIRMAR_ATAQUE: "activar-o-confirmar-ataque",
  ACTIVAR_ATAQUE_RESPALDO: "activar-ataque-respaldo",
  CANCELAR_SELECCION: "cancelar-seleccion",
});

// Ejecuta acciones jugables sin conocer el dispositivo de entrada
// ni la presentación que mostrará sus resultados.
//
// Los adaptadores DOM, una futura escena de Phaser, la consola y las
// pruebas deterministas pueden construir los mismos comandos y reutilizar
// este flujo sin duplicar reglas de movimiento o combate.
export class EjecutorAccionesJugador {
  constructor({ juego } = {}) {
    validarJuego(juego);
    this.juego = juego;
  }

  ejecutar(comando) {
    validarComando(comando);

    switch (comando.tipo) {
      case TIPOS_COMANDO_JUGADOR.MOVER:
        return this.ejecutarMovimiento(comando);

      case TIPOS_COMANDO_JUGADOR.ESPERAR:
        return this.juego.esperarTurno();

      case TIPOS_COMANDO_JUGADOR.ACTIVAR_O_CONFIRMAR_ATAQUE:
        return this.juego.modoCombateActivo
          ? this.juego.confirmarAtaque()
          : this.juego.entrarModoCombate();

      case TIPOS_COMANDO_JUGADOR.ACTIVAR_ATAQUE_RESPALDO:
        return this.activarAtaqueRespaldo(comando);

      case TIPOS_COMANDO_JUGADOR.CANCELAR_SELECCION:
        return this.juego.modoInteraccionActivo
          ? this.juego.cancelarModoInteraccion()
          : this.juego.cancelarModoCombate();

      default:
        throw new Error(`Comando de jugador desconocido: ${comando.tipo}.`);
    }
  }

  ejecutarMovimiento({ movimientoX, movimientoY }) {
    validarMovimiento(movimientoX, movimientoY);

    if (this.juego.modoInteraccionActivo) {
      return this.juego.moverSelectorInteraccion(movimientoX, movimientoY);
    }

    if (this.juego.modoCombateActivo) {
      return this.juego.moverSelectorCombate(movimientoX, movimientoY);
    }

    return this.juego.moverJugador(movimientoX, movimientoY);
  }

  activarAtaqueRespaldo({ mensajeActivacion = null } = {}) {
    const jugador = this.juego.player;

    if (!jugador?.estaVivo) {
      return {
        exito: false,
        mensaje: "No podés atacar estando derrotado.",
        turnoConsumido: false,
        redibujar: false,
      };
    }

    if (this.juego.modoInteraccionActivo) {
      return {
        exito: false,
        mensaje: "Cancelá la interacción antes de usar el ataque de respaldo.",
        turnoConsumido: false,
        redibujar: false,
      };
    }

    if (this.juego.modoCombateActivo) {
      this.juego.cancelarModoCombate();
    }

    jugador.ataqueNaturalForzado = true;
    const resultado = this.juego.entrarModoCombate();

    if (resultado?.exito === false) {
      jugador.ataqueNaturalForzado = false;
      return resultado;
    }

    return {
      ...resultado,
      mensaje:
        typeof mensajeActivacion === "string" && mensajeActivacion.trim() !== ""
          ? mensajeActivacion
          : "Ataque de respaldo activo. Seleccioná una casilla adyacente y confirmá.",
    };
  }
}

function validarComando(comando) {
  if (!comando || typeof comando !== "object" || Array.isArray(comando)) {
    throw new Error("El ejecutor necesita un comando de jugador válido.");
  }

  if (typeof comando.tipo !== "string" || comando.tipo.trim() === "") {
    throw new Error("El comando de jugador necesita un tipo válido.");
  }
}

function validarMovimiento(movimientoX, movimientoY) {
  const movimientosValidos = new Set([-1, 0, 1]);

  if (
    !Number.isInteger(movimientoX) ||
    !Number.isInteger(movimientoY) ||
    !movimientosValidos.has(movimientoX) ||
    !movimientosValidos.has(movimientoY) ||
    (movimientoX === 0 && movimientoY === 0)
  ) {
    throw new Error(
      "El comando de movimiento necesita una dirección válida entre -1 y 1.",
    );
  }
}

function validarJuego(juego) {
  const metodosRequeridos = [
    "moverJugador",
    "moverSelectorInteraccion",
    "moverSelectorCombate",
    "esperarTurno",
    "entrarModoCombate",
    "confirmarAtaque",
    "cancelarModoInteraccion",
    "cancelarModoCombate",
  ];

  if (!juego || typeof juego !== "object") {
    throw new Error("EjecutorAccionesJugador necesita una partida válida.");
  }

  for (const metodo of metodosRequeridos) {
    if (typeof juego[metodo] !== "function") {
      throw new Error(
        `EjecutorAccionesJugador necesita que Juego implemente ${metodo}().`,
      );
    }
  }
}
