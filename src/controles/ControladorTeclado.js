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
const TECLA_COMBATE = "KeyF";
const TECLA_RESPALDO = "KeyG";
const TECLA_CANCELAR = "Escape";

// Adaptador de entrada del navegador.
//
// Su única responsabilidad es traducir teclas a comandos compartidos.
// No conoce Juego, renderizadores ni reglas de movimiento o combate.
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

  manejarTecla(event) {
    const movimiento = MOVIMIENTOS_POR_TECLA[event.code];
    const esEspera = TECLAS_ESPERA.has(event.code);
    const esCombate = event.code === TECLA_COMBATE;
    const esRespaldo = event.code === TECLA_RESPALDO;
    const esCancelar = event.code === TECLA_CANCELAR;

    if (!movimiento && !esEspera && !esCombate && !esRespaldo && !esCancelar) {
      return;
    }

    // Evita múltiples confirmaciones, cancelaciones o activaciones de respaldo
    // al mantener una tecla presionada. Movimiento y espera conservan repetición.
    if (event.repeat && (esCombate || esRespaldo || esCancelar)) return;

    event.preventDefault();

    const comando = crearComandoDesdeEntrada({
      movimiento,
      esEspera,
      esCombate,
      esRespaldo,
      esCancelar,
    });

    this.alEjecutarComando(comando);
  }
}

function crearComandoDesdeEntrada({
  movimiento,
  esEspera,
  esCombate,
  esRespaldo,
  esCancelar,
}) {
  if (esCombate) {
    return {
      tipo: TIPOS_COMANDO_JUGADOR.ACTIVAR_O_CONFIRMAR_ATAQUE,
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
