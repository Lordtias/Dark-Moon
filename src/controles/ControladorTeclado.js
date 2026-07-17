// Relacionamos cada tecla válida con un movimiento.
//
// x controla el movimiento horizontal:
// -1 = izquierda | 1 = derecha
//
// y controla el movimiento vertical:
// -1 = arriba | 1 = abajo
const MOVIMIENTOS_POR_TECLA = {
  // Flechas y WASD.
  ArrowUp: { x: 0, y: -1 },
  KeyW: { x: 0, y: -1 },

  ArrowDown: { x: 0, y: 1 },
  KeyS: { x: 0, y: 1 },

  ArrowLeft: { x: -1, y: 0 },
  KeyA: { x: -1, y: 0 },

  ArrowRight: { x: 1, y: 0 },
  KeyD: { x: 1, y: 0 },

  // Diagonales con el teclado principal.
  KeyQ: { x: -1, y: -1 },
  KeyE: { x: 1, y: -1 },
  KeyZ: { x: -1, y: 1 },
  KeyC: { x: 1, y: 1 },

  // Teclado numérico completo.
  Numpad7: { x: -1, y: -1 },
  Numpad8: { x: 0, y: -1 },
  Numpad9: { x: 1, y: -1 },

  Numpad4: { x: -1, y: 0 },
  Numpad6: { x: 1, y: 0 },

  Numpad1: { x: -1, y: 1 },
  Numpad2: { x: 0, y: 1 },
  Numpad3: { x: 1, y: 1 },
};

// Estas teclas permiten esperar sin moverse,
// pero igualmente consumen el turno del jugador.
const TECLAS_ESPERA = new Set(["Space", "Numpad5"]);

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

  manejarTecla(event) {
    // Buscamos si la tecla representa un movimiento.
    const movimiento = MOVIMIENTOS_POR_TECLA[event.code];

    // Comprobamos si representa la acción de esperar.
    const esTeclaEspera = TECLAS_ESPERA.has(event.code);

    // Ignoramos cualquier tecla que no sea una acción del juego.
    if (!movimiento && !esTeclaEspera) {
      return;
    }

    // Evitamos comportamientos del navegador,
    // como desplazar la página con la barra espaciadora.
    event.preventDefault();

    let resultado;

    if (esTeclaEspera) {
      // El jugador permanece en su posición,
      // pero permite que avance el turno.
      resultado = this.juego.esperarTurno();
    } else {
      // Juego decide si el personaje se mueve,
      // ataca o encuentra un obstáculo.
      resultado = this.juego.moverJugador(movimiento.x, movimiento.y);
    }

    // Mostramos el mensaje generado por la acción.
    if (resultado.mensaje !== null) {
      this.renderizador.mostrarMensaje(resultado.mensaje);
    }

    // Redibujamos solamente cuando la acción consumió un turno.
    if (resultado.turnoConsumido) {
      this.renderizador.dibujarJuego(this.juego);
    }
  }
}
