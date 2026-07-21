import { aplicarResultadoAccion } from "./ProcesadorResultadoAccion.js";

const MOVIMIENTOS_POR_TECLA = {
  ArrowUp: {
    x: 0,
    y: -1,
  },

  KeyW: {
    x: 0,
    y: -1,
  },

  ArrowDown: {
    x: 0,
    y: 1,
  },

  KeyS: {
    x: 0,
    y: 1,
  },

  ArrowLeft: {
    x: -1,
    y: 0,
  },

  KeyA: {
    x: -1,
    y: 0,
  },

  ArrowRight: {
    x: 1,
    y: 0,
  },

  KeyD: {
    x: 1,
    y: 0,
  },

  KeyQ: {
    x: -1,
    y: -1,
  },

  KeyE: {
    x: 1,
    y: -1,
  },

  KeyZ: {
    x: -1,
    y: 1,
  },

  KeyC: {
    x: 1,
    y: 1,
  },

  Numpad7: {
    x: -1,
    y: -1,
  },

  Numpad8: {
    x: 0,
    y: -1,
  },

  Numpad9: {
    x: 1,
    y: -1,
  },

  Numpad4: {
    x: -1,
    y: 0,
  },

  Numpad6: {
    x: 1,
    y: 0,
  },

  Numpad1: {
    x: -1,
    y: 1,
  },

  Numpad2: {
    x: 0,
    y: 1,
  },

  Numpad3: {
    x: 1,
    y: 1,
  },
};

const TECLAS_ESPERA = new Set(["Space", "Numpad5"]);

const TECLA_COMBATE = "KeyF";

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

    // Evitamos que mantener F o Escape presionados
    // ejecute varias confirmaciones o cancelaciones.
    if (event.repeat && (esCombate || esCancelar)) {
      return;
    }

    event.preventDefault();

    let resultado;

    if (esCombate) {
      // Juego impide entrar en combate cuando
      // está activo el selector de interacción.
      resultado = this.juego.modoCombateActivo
        ? this.juego.confirmarAtaque()
        : this.juego.entrarModoCombate();
    } else if (esCancelar) {
      // Escape cancela primero el modo
      // de interacción y luego el de combate.
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

    // Todos los resultados pasan por un único procesador.
    //
    // Esto evita que cada controlador tenga reglas diferentes
    // para mostrar mensajes, redibujar o procesar eventos.
    aplicarResultadoAccion({
      resultado,
      juego: this.juego,
      renderizador: this.renderizador,
    });
  }
}
