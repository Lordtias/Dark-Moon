import { TIPOS_COMANDO_JUGADOR } from "../aplicacion/EjecutorAccionesJugador.js";

const MOVIMIENTOS_POR_TECLA = {
  ArrowUp: { x: 0, y: -1 },
  KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyD: { x: 1, y: 0 },
  KeyQ: { x: -1, y: -1 },
  KeyE: { x: 1, y: -1 },
  KeyZ: { x: -1, y: 1 },
  KeyC: { x: 1, y: 1 },
  Numpad7: { x: -1, y: -1 },
  Numpad8: { x: 0, y: -1 },
  Numpad9: { x: 1, y: -1 },
  Numpad4: { x: -1, y: 0 },
  Numpad6: { x: 1, y: 0 },
  Numpad1: { x: -1, y: 1 },
  Numpad2: { x: 0, y: 1 },
  Numpad3: { x: 1, y: 1 },
};

const TECLAS_ESPERA = new Set(["Space", "Numpad5"]);
const TECLA_CONFIRMAR = "KeyF";
const TECLA_RESPALDO = "KeyG";
const TECLA_CANCELAR = "Escape";
const TECLA_INTERACTUAR = "KeyR";

// Adaptador de entrada del navegador.
//
// Su única responsabilidad es traducir teclas a comandos compartidos.
// No conoce Juego, sistemas de habilidades, renderizadores ni reglas.
export class ControladorTeclado {
  constructor({ alEjecutarComando } = {}) {
    if (typeof alEjecutarComando !== "function") {
      throw new Error(
        "ControladorTeclado necesita una función para ejecutar comandos.",
      );
    }

    this.alEjecutarComando = alEjecutarComando;
    this.manejarTecla = this.manejarTecla.bind(this);
    this.estaActivo = false;
  }

  activar() {
    if (this.estaActivo) return;
    document.addEventListener("keydown", this.manejarTecla);
    this.estaActivo = true;
  }

  desactivar() {
    if (!this.estaActivo) return;
    document.removeEventListener("keydown", this.manejarTecla);
    this.estaActivo = false;
  }

  manejarTecla(evento) {
    if (document.body?.classList.contains("modal-ayuda-juego-abierta")) {
      return;
    }

    const movimiento = MOVIMIENTOS_POR_TECLA[evento.code];
    const indiceRanura = obtenerIndiceRanura(evento);
    const esEspera = TECLAS_ESPERA.has(evento.code);
    const esConfirmar = evento.code === TECLA_CONFIRMAR;
    const esRespaldo = evento.code === TECLA_RESPALDO;
    const esCancelar = evento.code === TECLA_CANCELAR;
    const esInteractuar = evento.code === TECLA_INTERACTUAR;

    // La selección numérica de habilidades no debe activarse mientras el
    // usuario escribe en un control editable. El resto de las teclas conserva
    // el comportamiento general que ya tenía el controlador principal.
    if (indiceRanura !== null && esElementoEditable(evento.target)) {
      return;
    }

    if (
      !movimiento &&
      indiceRanura === null &&
      !esEspera &&
      !esConfirmar &&
      !esRespaldo &&
      !esCancelar &&
      !esInteractuar
    ) {
      return;
    }

    // Evita múltiples confirmaciones, cancelaciones, interacciones o
    // activaciones de respaldo al mantener una tecla presionada. Movimiento,
    // espera y ranuras conservan
    // la repetición que ya tenían antes de centralizar el teclado.
    if (
      evento.repeat &&
      (esConfirmar || esRespaldo || esCancelar || esInteractuar)
    ) {
      return;
    }

    evento.preventDefault();

    const comando = crearComandoDesdeEntrada({
      movimiento,
      indiceRanura,
      esEspera,
      esConfirmar,
      esRespaldo,
      esCancelar,
      esInteractuar,
    });

    this.alEjecutarComando(comando);
  }
}

function crearComandoDesdeEntrada({
  movimiento,
  indiceRanura,
  esEspera,
  esConfirmar,
  esRespaldo,
  esCancelar,
  esInteractuar,
}) {
  if (indiceRanura !== null) {
    return {
      tipo: TIPOS_COMANDO_JUGADOR.SELECCIONAR_HABILIDAD_RANURA,
      indiceRanura,
      origenEntrada: "teclado",
    };
  }

  if (esConfirmar) {
    return {
      tipo: TIPOS_COMANDO_JUGADOR.ACTIVAR_O_CONFIRMAR_SELECCION,
    };
  }

  if (esRespaldo) {
    return {
      tipo: TIPOS_COMANDO_JUGADOR.ACTIVAR_ATAQUE_RESPALDO,
      mensajeActivacion:
        "Ataque de respaldo activo. Seleccioná una casilla adyacente y " +
        "confirmá con F; Escape cancela.",
    };
  }

  if (esCancelar) {
    return {
      tipo: TIPOS_COMANDO_JUGADOR.CANCELAR_SELECCION,
    };
  }

  if (esInteractuar) {
    return {
      tipo: TIPOS_COMANDO_JUGADOR.INTERACTUAR_O_CONFIRMAR,
    };
  }

  if (movimiento) {
    return {
      tipo: TIPOS_COMANDO_JUGADOR.MOVER,
      movimientoX: movimiento.x,
      movimientoY: movimiento.y,
    };
  }

  if (esEspera) {
    return {
      tipo: TIPOS_COMANDO_JUGADOR.ESPERAR,
    };
  }

  throw new Error("No se pudo traducir la entrada a un comando de jugador.");
}

function obtenerIndiceRanura(evento) {
  if (evento.altKey || evento.ctrlKey || evento.metaKey) {
    return null;
  }

  if (/^Digit[1-9]$/.test(evento.code)) {
    return Number(evento.code.slice(-1)) - 1;
  }

  return evento.code === "Digit0" ? 9 : null;
}

function esElementoEditable(elemento) {
  return Boolean(
    elemento?.isContentEditable ||
      elemento?.closest?.('input, textarea, select, [contenteditable="true"]'),
  );
}
