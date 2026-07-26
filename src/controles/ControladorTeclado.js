import { aplicarResultadoAccion } from "./ProcesadorResultadoAccion.js";

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

export class ControladorTeclado {
  constructor({ juego, renderizador } = {}) {
    if (
      !juego ||
      typeof juego.moverJugador !== "function" ||
      typeof juego.moverSelectorInteraccion !== "function" ||
      typeof juego.cancelarModoInteraccion !== "function"
    ) {
      throw new Error("ControladorTeclado necesita una partida válida.");
    }
    if (!renderizador || typeof renderizador.dibujarJuego !== "function") {
      throw new Error("ControladorTeclado necesita un renderizador válido.");
    }

    this.juego = juego;
    this.renderizador = renderizador;
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

  activarAtaqueRespaldo() {
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
        "Ataque de respaldo activo. Seleccioná una casilla adyacente y " +
        "confirmá con F; Escape cancela.",
    };
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
    // al mantener una tecla presionada.
    if (event.repeat && (esCombate || esRespaldo || esCancelar)) return;

    event.preventDefault();

    let resultado;
    if (esCombate) {
      resultado = this.juego.modoCombateActivo
        ? this.juego.confirmarAtaque()
        : this.juego.entrarModoCombate();
    } else if (esRespaldo) {
      resultado = this.activarAtaqueRespaldo();
    } else if (esCancelar) {
      resultado = this.juego.modoInteraccionActivo
        ? this.juego.cancelarModoInteraccion()
        : this.juego.cancelarModoCombate();
    } else if (movimiento) {
      if (this.juego.modoInteraccionActivo) {
        resultado = this.juego.moverSelectorInteraccion(
          movimiento.x,
          movimiento.y,
        );
      } else if (this.juego.modoCombateActivo) {
        resultado = this.juego.moverSelectorCombate(movimiento.x, movimiento.y);
      } else {
        resultado = this.juego.moverJugador(movimiento.x, movimiento.y);
      }
    } else if (esEspera) {
      resultado = this.juego.esperarTurno();
    }

    aplicarResultadoAccion({
      resultado,
      juego: this.juego,
      renderizador: this.renderizador,
    });
  }
}
