const MOVIMIENTOS = Object.freeze({
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  Numpad8: [0, -1],
  Numpad2: [0, 1],
  Numpad4: [-1, 0],
  Numpad6: [1, 0],
  Numpad7: [-1, -1],
  Numpad9: [1, -1],
  Numpad1: [-1, 1],
  Numpad3: [1, 1],
  KeyW: [0, -1],
  KeyS: [0, 1],
  KeyA: [-1, 0],
  KeyD: [1, 0],
  KeyQ: [-1, -1],
  KeyE: [1, -1],
  KeyZ: [-1, 1],
  KeyC: [1, 1],
});

export class ControladorEntradaHabilidades {
  constructor({ sistemaHabilidades, esJuegoActivo }) {
    this.sistema = sistemaHabilidades;
    this.esJuegoActivo = esJuegoActivo;
    this.alPresionarTecla = this.alPresionarTecla.bind(this);
    this.alHacerClickMapa = this.alHacerClickMapa.bind(this);
    window.addEventListener("keydown", this.alPresionarTecla, true);
    document.addEventListener("click", this.alHacerClickMapa, true);
  }

  destruir() {
    window.removeEventListener("keydown", this.alPresionarTecla, true);
    document.removeEventListener("click", this.alHacerClickMapa, true);
  }

  alPresionarTecla(evento) {
    if (!this.esJuegoActivo() || esElementoEditable(evento.target)) {
      return;
    }
    const indiceRanura = obtenerIndiceRanura(evento);
    if (indiceRanura !== null) {
      detener(evento);
      this.sistema.seleccionarPorRanura(indiceRanura);
      return;
    }
    if (!this.sistema.modoHabilidad) {
      return;
    }

    const movimiento = MOVIMIENTOS[evento.code] ?? MOVIMIENTOS[evento.key];
    if (movimiento) {
      detener(evento);
      this.sistema.moverSelector(movimiento[0], movimiento[1]);
      return;
    }
    if (evento.code === "KeyF" || evento.key === "f" || evento.key === "F") {
      detener(evento);
      const resultado = this.sistema.confirmar();
      registrarResultado(resultado);
      return;
    }
    // Evita superponer el selector de una habilidad con el selector del ataque
    // natural de respaldo. El jugador conserva ambas alternativas, pero debe
    // cancelar primero la selección vigente con Escape.
    if (evento.code === "KeyG" || evento.key === "g" || evento.key === "G") {
      detener(evento);
      registrarResultado({
        exito: false,
        mensaje:
          "Cancelá primero la habilidad con Escape para usar el ataque de respaldo.",
      });
      return;
    }
    if (evento.key === "Escape") {
      detener(evento);
      this.sistema.cancelar();
    }
  }

  alHacerClickMapa(evento) {
    if (!this.esJuegoActivo() || !this.sistema.modoHabilidad) {
      return;
    }
    const casilla = evento.target.closest(
      "[data-x][data-y], [data-columna][data-fila], [data-pos-x][data-pos-y]",
    );
    if (!casilla) {
      return;
    }
    const x = Number(
      casilla.dataset.x ?? casilla.dataset.columna ?? casilla.dataset.posX,
    );
    const y = Number(
      casilla.dataset.y ?? casilla.dataset.fila ?? casilla.dataset.posY,
    );
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      return;
    }
    detener(evento);
    this.sistema.fijarSelector(x, y);
  }
}

function obtenerIndiceRanura(evento) {
  if (evento.altKey || evento.ctrlKey || evento.metaKey) {
    return null;
  }
  const codigo = evento.code;
  if (/^Digit[1-9]$/.test(codigo)) {
    return Number(codigo.slice(-1)) - 1;
  }
  if (codigo === "Digit0") {
    return 9;
  }
  return null;
}

function detener(evento) {
  evento.preventDefault();
  evento.stopPropagation();
  evento.stopImmediatePropagation();
}

function registrarResultado(resultado) {
  if (!resultado) {
    return;
  }
  const metodo = resultado.exito ? "info" : "warn";
  console[metodo]("[Dark Moon · Habilidades]", resultado.mensaje, resultado);
}

function esElementoEditable(elemento) {
  return Boolean(
    elemento?.isContentEditable ||
    elemento?.closest?.('input, textarea, select, [contenteditable="true"]'),
  );
}
