import {
  crearMensajeTraducible,
  TIPOS_MENSAJE_JUEGO,
} from "../juego/mensajes/MensajesJuego.js";
import { crearResultadoAccion } from "../juego/acciones/ResultadoAccion.js";

export const TIPOS_COMANDO_JUGADOR = Object.freeze({
  MOVER: "mover",
  ESPERAR: "esperar",
  ACTIVAR_O_CONFIRMAR_SELECCION: "activar-o-confirmar-seleccion",
  ACTIVAR_ATAQUE_RESPALDO: "activar-ataque-respaldo",
  CANCELAR_SELECCION: "cancelar-seleccion",
  SELECCIONAR_HABILIDAD_RANURA: "seleccionar-habilidad-ranura",
  SELECCIONAR_CASILLA: "seleccionar-casilla",
  INTERACTUAR_O_CONFIRMAR: "interactuar-o-confirmar",
});

// Ejecuta acciones jugables sin conocer el dispositivo de entrada
// ni la presentación que mostrará sus resultados.
//
// Los adaptadores DOM, una futura escena de Phaser, la consola y las
// pruebas deterministas pueden construir los mismos comandos y reutilizar
// este flujo sin duplicar reglas de movimiento, combate, habilidades
// o interacción.
function mensajeCombate(sufijo, respaldo, tipo = TIPOS_MENSAJE_JUEGO.SISTEMA) {
  return crearMensajeTraducible(`mensajes.combate.${sufijo}`, { tipo, respaldo });
}

export class EjecutorAccionesJugador {
  constructor({ juego, obtenerSistemaHabilidades = null } = {}) {
    validarJuego(juego);
    validarProveedorHabilidades(obtenerSistemaHabilidades);

    this.juego = juego;
    this.obtenerSistemaHabilidades =
      obtenerSistemaHabilidades ?? (() => null);
  }

  ejecutar(comando) {
    validarComando(comando);

    switch (comando.tipo) {
      case TIPOS_COMANDO_JUGADOR.MOVER:
        return this.ejecutarMovimiento(comando);

      case TIPOS_COMANDO_JUGADOR.ESPERAR:
        return this.juego.esperarTurno();

      case TIPOS_COMANDO_JUGADOR.ACTIVAR_O_CONFIRMAR_SELECCION:
        return this.activarOConfirmarSeleccion();

      case TIPOS_COMANDO_JUGADOR.ACTIVAR_ATAQUE_RESPALDO:
        return this.activarAtaqueRespaldo(comando);

      case TIPOS_COMANDO_JUGADOR.CANCELAR_SELECCION:
        return this.cancelarSeleccion();

      case TIPOS_COMANDO_JUGADOR.SELECCIONAR_HABILIDAD_RANURA:
        return this.seleccionarHabilidadPorRanura(comando);

      case TIPOS_COMANDO_JUGADOR.SELECCIONAR_CASILLA:
        return this.seleccionarCasilla(comando);

      case TIPOS_COMANDO_JUGADOR.INTERACTUAR_O_CONFIRMAR:
        return this.interactuarOConfirmar();

      default:
        throw new Error(`Comando de jugador desconocido: ${comando.tipo}.`);
    }
  }

  ejecutarMovimiento({ movimientoX, movimientoY }) {
    validarMovimiento(movimientoX, movimientoY);

    const sistemaHabilidades = this.obtenerSistemaHabilidadesActivo();
    if (sistemaHabilidades?.modoHabilidad) {
      return sistemaHabilidades.moverSelector(movimientoX, movimientoY);
    }

    if (this.juego.modoInteraccionActivo) {
      return this.juego.moverSelectorInteraccion(movimientoX, movimientoY);
    }

    if (this.juego.modoCombateActivo) {
      return this.juego.moverSelectorCombate(movimientoX, movimientoY);
    }

    return this.juego.moverJugador(movimientoX, movimientoY);
  }

  activarOConfirmarSeleccion() {
    const sistemaHabilidades = this.obtenerSistemaHabilidadesActivo();
    if (sistemaHabilidades?.modoHabilidad) {
      return sistemaHabilidades.confirmar();
    }

    return this.juego.modoCombateActivo
      ? this.juego.confirmarAtaque()
      : this.juego.entrarModoCombate();
  }

  activarAtaqueRespaldo({ mensajeActivacion = null } = {}) {
    const sistemaHabilidades = this.obtenerSistemaHabilidadesActivo();
    if (sistemaHabilidades?.modoHabilidad) {
      return {
        exito: false,
        mensaje: mensajeCombate("cancelarHabilidadRespaldo", "Cancelá primero la habilidad con Escape para usar el ataque de respaldo.", TIPOS_MENSAJE_JUEGO.ALERTA),
        turnoConsumido: false,
        redibujar: false,
      };
    }

    const jugador = this.juego.player;

    if (!jugador?.estaVivo) {
      return {
        exito: false,
        mensaje: mensajeCombate("derrotadoNoAtaca", "No podés atacar estando derrotado.", TIPOS_MENSAJE_JUEGO.NEGATIVO),
        turnoConsumido: false,
        redibujar: false,
      };
    }

    if (this.juego.modoInteraccionActivo) {
      return {
        exito: false,
        mensaje: mensajeCombate("cancelarInteraccionRespaldo", "Cancelá la interacción antes de usar el ataque de respaldo.", TIPOS_MENSAJE_JUEGO.ALERTA),
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
        mensajeActivacion && typeof mensajeActivacion === "object"
          ? mensajeActivacion
          : typeof mensajeActivacion === "string" && mensajeActivacion.trim() !== ""
            ? mensajeActivacion
            : mensajeCombate(
                "respaldoActivo",
                "Ataque de respaldo activo. Seleccioná una casilla adyacente y confirmá.",
                TIPOS_MENSAJE_JUEGO.POSITIVO,
              ),
    };
  }

  cancelarSeleccion() {
    const sistemaHabilidades = this.obtenerSistemaHabilidadesActivo();
    if (sistemaHabilidades?.modoHabilidad) {
      return sistemaHabilidades.cancelar();
    }

    return this.juego.modoInteraccionActivo
      ? this.juego.cancelarModoInteraccion()
      : this.juego.cancelarModoCombate();
  }

  seleccionarHabilidadPorRanura({ indiceRanura }) {
    validarIndiceRanura(indiceRanura);

    const sistemaHabilidades = this.obtenerSistemaHabilidadesActivo();
    if (!sistemaHabilidades) {
      return null;
    }

    return sistemaHabilidades.seleccionarPorRanura(indiceRanura);
  }

  seleccionarCasilla({ x, y }) {
    validarCoordenadas(x, y);

    const sistemaHabilidades = this.obtenerSistemaHabilidadesActivo();
    if (sistemaHabilidades?.modoHabilidad) {
      return sistemaHabilidades.fijarSelector(x, y);
    }

    if (this.juego.modoInteraccionActivo) {
      return this.juego.seleccionarCasillaInteraccion(x, y);
    }

    if (this.juego.modoCombateActivo) {
      return this.juego.seleccionarCasillaCombate(x, y);
    }

    return crearResultadoAccion({ exito: false });
  }

  interactuarOConfirmar() {
    if (this.juego.modoInteraccionActivo) {
      return this.juego.confirmarInteraccionSeleccionada();
    }

    const bloqueo = this.juego.obtenerBloqueoInteraccion();
    if (bloqueo) {
      return bloqueo;
    }

    const opciones = this.juego.obtenerOpcionesInteraccion();
    if (!Array.isArray(opciones)) {
      throw new Error(
        "Juego debe devolver una lista de opciones de interacción.",
      );
    }

    if (opciones.length === 0) {
      return crearResultadoAccion({
        exito: false,
        mensaje: crearMensajeTraducible("mensajes.interacciones.nadaCerca", {
          tipo: TIPOS_MENSAJE_JUEGO.ALERTA,
          respaldo: "No hay nada para revisar cerca.",
        }),
      });
    }

    if (opciones.length === 1) {
      const opcion = opciones[0];

      return crearResultadoAccion({
        exito: true,
        interaccion: opcion.interaccionPrioritaria,
        entidad: opcion.entidad,
      });
    }

    return this.juego.entrarModoInteraccion();
  }

  obtenerSistemaHabilidadesActivo() {
    const sistema = this.obtenerSistemaHabilidades();

    if (sistema === null || sistema === undefined) {
      return null;
    }

    validarSistemaHabilidades(sistema);
    return sistema;
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

function validarIndiceRanura(indiceRanura) {
  if (!Number.isInteger(indiceRanura) || indiceRanura < 0 || indiceRanura > 9) {
    throw new Error("La ranura de habilidad debe estar entre 0 y 9.");
  }
}

function validarCoordenadas(x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new Error("La selección necesita coordenadas enteras.");
  }
}

function validarProveedorHabilidades(obtenerSistemaHabilidades) {
  if (
    obtenerSistemaHabilidades !== null &&
    obtenerSistemaHabilidades !== undefined &&
    typeof obtenerSistemaHabilidades !== "function"
  ) {
    throw new Error(
      "El proveedor del sistema de habilidades debe ser una función.",
    );
  }
}

function validarSistemaHabilidades(sistema) {
  const metodosRequeridos = [
    "seleccionarPorRanura",
    "moverSelector",
    "fijarSelector",
    "confirmar",
    "cancelar",
  ];

  for (const metodo of metodosRequeridos) {
    if (typeof sistema[metodo] !== "function") {
      throw new Error(
        `El sistema de habilidades activo necesita implementar ${metodo}().`,
      );
    }
  }
}

function validarJuego(juego) {
  const metodosRequeridos = [
    "moverJugador",
    "moverSelectorInteraccion",
    "seleccionarCasillaInteraccion",
    "moverSelectorCombate",
    "seleccionarCasillaCombate",
    "esperarTurno",
    "entrarModoCombate",
    "confirmarAtaque",
    "cancelarModoInteraccion",
    "cancelarModoCombate",
    "obtenerBloqueoInteraccion",
    "obtenerOpcionesInteraccion",
    "entrarModoInteraccion",
    "confirmarInteraccionSeleccionada",
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
