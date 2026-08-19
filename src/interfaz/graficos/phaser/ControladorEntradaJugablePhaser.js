import { TIPOS_COMANDO_JUGADOR } from "../../../aplicacion/EjecutorAccionesJugador.js";
import { estaEntradaJugableCapturada } from "../../../controles/ContextoEntradaInterfaz.js";
import { CONFIGURACION_CAMARA_PHASER } from "./ConfiguracionPhaser.js";

const MODOS_SELECCION_JUGABLE = new Set([
  "combate",
  "interaccion",
  "habilidad",
]);

// Traduce mouse y touch a comandos neutrales. Las reglas jugables continúan en
// EjecutorAccionesJugador y los sistemas canónicos; este controlador solamente
// interpreta gestos, casillas y la intención de selección/confirmación.
export class ControladorEntradaJugablePhaser {
  constructor({
    escena,
    conversorCoordenadas,
    obtenerEstadoSeleccion,
    existeEntidadVisibleEnCasilla,
    alEjecutarComando,
    alRecentrarCamara,
    alIniciarArrastreTactil,
    alFinalizarArrastreTactil,
  } = {}) {
    if (!escena?.input || !conversorCoordenadas) {
      throw new Error(
        "ControladorEntradaJugablePhaser necesita escena y conversor.",
      );
    }
    for (const [nombre, funcion] of Object.entries({
      obtenerEstadoSeleccion,
      existeEntidadVisibleEnCasilla,
      alEjecutarComando,
      alRecentrarCamara,
      alIniciarArrastreTactil,
      alFinalizarArrastreTactil,
    })) {
      if (typeof funcion !== "function") {
        throw new Error(`La entrada Phaser necesita la función ${nombre}.`);
      }
    }

    this.escena = escena;
    this.conversorCoordenadas = conversorCoordenadas;
    this.obtenerEstadoSeleccion = obtenerEstadoSeleccion;
    this.existeEntidadVisibleEnCasilla = existeEntidadVisibleEnCasilla;
    this.alEjecutarComando = alEjecutarComando;
    this.alRecentrarCamara = alRecentrarCamara;
    this.alIniciarArrastreTactil = alIniciarArrastreTactil;
    this.alFinalizarArrastreTactil = alFinalizarArrastreTactil;
    this.gestoActual = null;
    this.clicPendiente = null;
    this.destruido = false;

    this.alPointerDown = (pointer) => this.manejarPointerDown(pointer);
    this.alPointerMove = (pointer) => this.manejarPointerMove(pointer);
    this.alPointerUp = (pointer) => this.manejarPointerUp(pointer);
    this.alPointerOut = (pointer) => this.manejarPointerOut(pointer);
    escena.input.on("pointerdown", this.alPointerDown);
    escena.input.on("pointermove", this.alPointerMove);
    escena.input.on("pointerup", this.alPointerUp);
    escena.input.on("pointerout", this.alPointerOut);
  }

  manejarPointerDown(pointer) {
    if (!this.puedeProcesarPuntero(pointer)) return;

    const casilla = this.obtenerCasilla(pointer);
    if (!casilla) return;

    const estadoSeleccion = this.obtenerEstadoSeleccion() ?? {};
    const tactil = esPunteroTactil(pointer);
    if (MODOS_SELECCION_JUGABLE.has(estadoSeleccion.modo) && !tactil) {
      pointer.event?.preventDefault?.();
      this.cancelarClicPendiente();
      this.ejecutarSeleccionOConfirmacion(casilla, estadoSeleccion);
      return;
    }

    this.gestoActual = {
      casilla,
      origenPantalla: { x: pointer.x, y: pointer.y },
      ultimaPantalla: { x: pointer.x, y: pointer.y },
      instanteInicio: obtenerInstantePointer(pointer),
      tactil,
      arrastrandoCamara: false,
      origenEntrada: tactil ? "touch" : "mouse",
      estadoSeleccionInicial: MODOS_SELECCION_JUGABLE.has(estadoSeleccion.modo)
        ? estadoSeleccion
        : null,
    };
  }

  manejarPointerMove(pointer) {
    const gesto = this.gestoActual;
    if (!gesto?.tactil || !pointer) return;

    const desplazamiento = distanciaPantalla(gesto.origenPantalla, pointer);
    const duracion = obtenerInstantePointer(pointer) - gesto.instanteInicio;

    if (
      !gesto.arrastrandoCamara &&
      desplazamiento >=
        CONFIGURACION_CAMARA_PHASER.umbralArrastreTactilPixeles &&
      duracion >= CONFIGURACION_CAMARA_PHASER.retardoArrastreTactilMs
    ) {
      gesto.arrastrandoCamara = true;
      this.cancelarClicPendiente();
      this.alIniciarArrastreTactil(pointer);
    }

    if (gesto.arrastrandoCamara) {
      pointer.event?.preventDefault?.();
    }

    gesto.ultimaPantalla = { x: pointer.x, y: pointer.y };
  }

  manejarPointerUp(pointer) {
    if (this.destruido || pointer?.button !== 0) return;

    const gesto = this.gestoActual;
    this.gestoActual = null;
    if (!gesto) return;

    if (gesto.arrastrandoCamara) {
      this.alFinalizarArrastreTactil(pointer);
      pointer.event?.preventDefault?.();
      return;
    }

    if (estaEntradaJugableCapturada(this.obtenerDocumento())) return;

    const casilla = this.obtenerCasilla(pointer) ?? gesto.casilla;
    if (!casilla) return;
    pointer.event?.preventDefault?.();

    if (gesto.estadoSeleccionInicial) {
      this.cancelarClicPendiente();
      this.ejecutarSeleccionOConfirmacion(
        casilla,
        this.obtenerEstadoSeleccion() ?? gesto.estadoSeleccionInicial,
      );
      return;
    }

    this.procesarClicSimpleODoble({
      casilla,
      puntoPantalla: { x: pointer.x, y: pointer.y },
      instante: obtenerInstantePointer(pointer),
      origenEntrada: gesto.origenEntrada,
    });
  }

  manejarPointerOut(pointer) {
    if (this.gestoActual?.arrastrandoCamara) {
      this.alFinalizarArrastreTactil(pointer);
    }
    this.gestoActual = null;
  }

  ejecutarSeleccionOConfirmacion(casilla, estadoSeleccion) {
    const selector = estadoSeleccion.selector;
    const mismaCasilla =
      Number.isInteger(selector?.x) &&
      Number.isInteger(selector?.y) &&
      selector.x === casilla.x &&
      selector.y === casilla.y;

    if (mismaCasilla) {
      this.alEjecutarComando({
        tipo:
          estadoSeleccion.modo === "interaccion"
            ? TIPOS_COMANDO_JUGADOR.INTERACTUAR_O_CONFIRMAR
            : TIPOS_COMANDO_JUGADOR.ACTIVAR_O_CONFIRMAR_SELECCION,
        origenEntrada: "puntero",
      });
      return;
    }

    this.alEjecutarComando({
      tipo: TIPOS_COMANDO_JUGADOR.SELECCIONAR_CASILLA,
      x: casilla.x,
      y: casilla.y,
      origenEntrada: "puntero",
    });
  }

  procesarClicSimpleODoble(clicActual) {
    const anterior = this.clicPendiente;
    if (anterior && esDoblePuntero(anterior, clicActual)) {
      clearTimeout(anterior.temporizador);
      this.clicPendiente = null;
      this.alRecentrarCamara();
      return;
    }

    this.cancelarClicPendiente();
    const temporizador = setTimeout(() => {
      if (this.destruido) return;
      this.clicPendiente = null;
      if (estaEntradaJugableCapturada(this.obtenerDocumento())) return;
      this.ejecutarClicSimple(clicActual);
    }, CONFIGURACION_CAMARA_PHASER.retardoDobleClicMs);

    this.clicPendiente = { ...clicActual, temporizador };
  }

  ejecutarClicSimple({ casilla, origenEntrada }) {
    const inspeccionar = this.existeEntidadVisibleEnCasilla(
      casilla.x,
      casilla.y,
    );
    this.alEjecutarComando({
      tipo: inspeccionar
        ? TIPOS_COMANDO_JUGADOR.INSPECCIONAR_CASILLA
        : TIPOS_COMANDO_JUGADOR.MOVER_HACIA_CASILLA,
      x: casilla.x,
      y: casilla.y,
      origenEntrada,
    });
  }

  cancelarClicPendiente() {
    if (this.clicPendiente?.temporizador) {
      clearTimeout(this.clicPendiente.temporizador);
    }
    this.clicPendiente = null;
  }

  puedeProcesarPuntero(pointer) {
    return Boolean(
      !this.destruido &&
        pointer?.button === 0 &&
        !estaEntradaJugableCapturada(this.obtenerDocumento()),
    );
  }

  obtenerCasilla(pointer) {
    return this.conversorCoordenadas.pantallaACasilla(pointer.x, pointer.y);
  }

  obtenerDocumento() {
    return this.escena?.game?.canvas?.ownerDocument;
  }

  destruir() {
    if (this.destruido) return false;
    this.cancelarClicPendiente();
    if (this.gestoActual?.arrastrandoCamara) {
      this.alFinalizarArrastreTactil(null);
    }
    this.escena?.input?.off("pointerdown", this.alPointerDown);
    this.escena?.input?.off("pointermove", this.alPointerMove);
    this.escena?.input?.off("pointerup", this.alPointerUp);
    this.escena?.input?.off("pointerout", this.alPointerOut);
    this.destruido = true;
    this.escena = null;
    this.conversorCoordenadas = null;
    this.obtenerEstadoSeleccion = null;
    this.existeEntidadVisibleEnCasilla = null;
    this.alEjecutarComando = null;
    return true;
  }
}

function esDoblePuntero(anterior, actual) {
  return Boolean(
    actual.instante >= anterior.instante &&
      actual.instante - anterior.instante <=
        CONFIGURACION_CAMARA_PHASER.retardoDobleClicMs &&
      distanciaPantalla(anterior.puntoPantalla, actual.puntoPantalla) <=
        CONFIGURACION_CAMARA_PHASER.umbralDoblePunteroPixeles,
  );
}

function distanciaPantalla(origen, destino) {
  return Math.hypot(
    (destino?.x ?? 0) - (origen?.x ?? 0),
    (destino?.y ?? 0) - (origen?.y ?? 0),
  );
}

function esPunteroTactil(pointer) {
  const tipo = pointer?.event?.pointerType ?? pointer?.pointerType ?? "";
  return tipo === "touch" || tipo === "pen" || pointer?.wasTouch === true;
}

function obtenerInstantePointer(pointer) {
  if (Number.isFinite(pointer?.event?.timeStamp)) return pointer.event.timeStamp;
  if (Number.isFinite(pointer?.upTime)) return pointer.upTime;
  if (Number.isFinite(pointer?.downTime)) return pointer.downTime;
  return globalThis.performance?.now?.() ?? Date.now();
}
