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
const TECLA_CANCELAR = "Escape";

export class ControladorTeclado {
  constructor({ juego, renderizador } = {}) {
    if (!juego || typeof juego.moverJugador !== "function") {
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
    if (this.estaActivo) {
      return;
    }

    document.addEventListener("keydown", this.manejarTecla);
    this.estaActivo = true;
  }

  desactivar() {
    if (!this.estaActivo) {
      return;
    }

    document.removeEventListener("keydown", this.manejarTecla);
    this.estaActivo = false;
  }

  manejarTecla(event) {
    const movimiento = MOVIMIENTOS_POR_TECLA[event.code];
    const esEspera = TECLAS_ESPERA.has(event.code);
    const esCombate = event.code === TECLA_COMBATE;
    const esCancelar = event.code === TECLA_CANCELAR;

    if (!movimiento && !esEspera && !esCombate && !esCancelar) {
      return;
    }

    // Evitamos que mantener F presionada entre y confirme
    // automáticamente el ataque.
    if (event.repeat && (esCombate || esCancelar)) {
      return;
    }

    event.preventDefault();

    let resultado;

    if (esCombate) {
      resultado = this.juego.modoCombateActivo
        ? this.juego.confirmarAtaque()
        : this.juego.entrarModoCombate();
    } else if (esCancelar) {
      resultado = this.juego.cancelarModoCombate();
    } else if (movimiento) {
      resultado = this.juego.modoCombateActivo
        ? this.juego.moverSelectorCombate(movimiento.x, movimiento.y)
        : this.juego.moverJugador(movimiento.x, movimiento.y);
    } else if (esEspera) {
      resultado = this.juego.esperarTurno();
    }

    if (!resultado) {
      return;
    }

    if (resultado.mensaje !== null) {
      this.renderizador.mostrarMensaje(resultado.mensaje);
    }

    // También redibujamos cambios que no consumen turno,
    // como entrar, mover o cancelar el selector.
    if (resultado.turnoConsumido || resultado.redibujar) {
      this.renderizador.dibujarJuego(this.juego);
    }
  }
}
