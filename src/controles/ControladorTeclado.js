// Relacionamos cada tecla válida con un movimiento.
//
// Esto evita tener un switch extenso dentro
// del controlador.
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
};

// ControladorTeclado convierte las teclas presionadas
// en acciones dentro de la partida.
//
// No decide las reglas del movimiento.
// Esa responsabilidad continúa perteneciendo a Juego.
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

    // Esta referencia se conserva para poder retirar
    // correctamente el evento más adelante.
    this.manejarTecla = this.manejarTecla.bind(this);

    this.estaActivo = false;
  }

  // Comienza a escuchar las teclas del jugador.
  activar() {
    // Evitamos registrar el mismo evento más de una vez.
    if (this.estaActivo) {
      return;
    }

    document.addEventListener("keydown", this.manejarTecla);

    this.estaActivo = true;
  }

  // Deja de escuchar las teclas.
  //
  // Será útil cuando agreguemos pausa,
  // menús internos o reinicio de partida.
  desactivar() {
    if (!this.estaActivo) {
      return;
    }

    document.removeEventListener("keydown", this.manejarTecla);

    this.estaActivo = false;
  }

  // Convierte una tecla válida en un movimiento.
  manejarTecla(event) {
    const movimiento = MOVIMIENTOS_POR_TECLA[event.code];

    // Ignoramos teclas que todavía
    // no representan acciones del juego.
    if (!movimiento) {
      return;
    }

    // Evitamos que las flechas desplacen la página.
    event.preventDefault();

    // Juego decide si el personaje se mueve,
    // ataca o encuentra un obstáculo.
    const resultado = this.juego.moverJugador(movimiento.x, movimiento.y);

    // Mostramos el mensaje generado por la acción.
    if (resultado.mensaje !== null) {
      this.renderizador.mostrarMensaje(resultado.mensaje);
    }

    // Redibujamos solamente cuando
    // la acción consumió un turno.
    if (resultado.turnoConsumido) {
      this.renderizador.dibujarJuego(this.juego);
    }
  }
}
