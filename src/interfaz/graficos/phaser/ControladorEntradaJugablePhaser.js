import { TIPOS_COMANDO_JUGADOR } from "../../../aplicacion/EjecutorAccionesJugador.js";
import { CONFIGURACION_CAMARA_PHASER } from "./ConfiguracionPhaser.js";

const MODOS_SELECCION_JUGABLE = new Set([
  "combate",
  "interaccion",
  "habilidad",
]);

// Adapta exclusivamente el clic izquierdo sobre el mapa Phaser.
//
// Su responsabilidad termina al convertir la posición de pantalla en una
// casilla lógica y emitir el mismo comando neutral utilizado por cualquier
// otro dispositivo de entrada. No valida alcance, objetivos, interacciones ni
// reglas de habilidades.
export class ControladorEntradaJugablePhaser {
  constructor({
    escena,
    conversorCoordenadas,
    obtenerModoSeleccion,
    alEjecutarComando,
  } = {}) {
    if (!escena?.input || !conversorCoordenadas) {
      throw new Error(
        "ControladorEntradaJugablePhaser necesita escena y conversor.",
      );
    }

    if (typeof obtenerModoSeleccion !== "function") {
      throw new Error(
        "La entrada Phaser necesita consultar el modo de selección activo.",
      );
    }

    if (typeof alEjecutarComando !== "function") {
      throw new Error(
        "La entrada Phaser necesita una función para ejecutar comandos.",
      );
    }

    this.escena = escena;
    this.conversorCoordenadas = conversorCoordenadas;
    this.obtenerModoSeleccion = obtenerModoSeleccion;
    this.alEjecutarComando = alEjecutarComando;
    this.ultimaSeleccion = null;
    this.destruido = false;

    this.alPointerDown = (pointer) => this.manejarPointerDown(pointer);
    this.escena.input.on("pointerdown", this.alPointerDown);
  }

  manejarPointerDown(pointer) {
    if (this.destruido || pointer?.button !== 0) {
      return;
    }

    const modoSeleccion = this.obtenerModoSeleccion();
    if (!MODOS_SELECCION_JUGABLE.has(modoSeleccion)) {
      return;
    }

    const casilla = this.conversorCoordenadas.pantallaACasilla(
      pointer.x,
      pointer.y,
    );

    if (!casilla) {
      return;
    }

    const instante = obtenerInstantePointer(pointer);
    if (
      esRepeticionInmediata({
        anterior: this.ultimaSeleccion,
        actual: { ...casilla, modo: modoSeleccion, instante },
      })
    ) {
      pointer.event?.preventDefault?.();
      return;
    }

    this.ultimaSeleccion = {
      ...casilla,
      modo: modoSeleccion,
      instante,
    };
    pointer.event?.preventDefault?.();
    this.alEjecutarComando({
      tipo: TIPOS_COMANDO_JUGADOR.SELECCIONAR_CASILLA,
      x: casilla.x,
      y: casilla.y,
      origenEntrada: "phaser",
    });
  }

  destruir() {
    if (this.destruido) {
      return false;
    }

    this.escena?.input?.off("pointerdown", this.alPointerDown);
    this.destruido = true;
    this.escena = null;
    this.conversorCoordenadas = null;
    this.obtenerModoSeleccion = null;
    this.alEjecutarComando = null;
    this.ultimaSeleccion = null;
    return true;
  }
}


function obtenerInstantePointer(pointer) {
  if (Number.isFinite(pointer?.downTime)) {
    return pointer.downTime;
  }

  return globalThis.performance?.now?.() ?? Date.now();
}

function esRepeticionInmediata({ anterior, actual }) {
  return Boolean(
    anterior &&
      anterior.x === actual.x &&
      anterior.y === actual.y &&
      anterior.modo === actual.modo &&
      actual.instante >= anterior.instante &&
      actual.instante - anterior.instante <=
        CONFIGURACION_CAMARA_PHASER.retardoDobleClicMs,
  );
}
