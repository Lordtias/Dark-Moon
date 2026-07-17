// Coordina las interacciones entre los paneles,
// el inventario y el equipamiento del jugador.
export class ControladorEquipamiento {
  constructor({
    juego,
    renderizador,
    panelInventario,
    panelEquipamiento,
  } = {}) {
    if (!juego?.player) {
      throw new Error("ControladorEquipamiento necesita una partida válida.");
    }

    if (!renderizador || typeof renderizador.dibujarJuego !== "function") {
      throw new Error("ControladorEquipamiento necesita un renderizador.");
    }

    if (
      !panelInventario ||
      typeof panelInventario.configurarSeleccionador !== "function"
    ) {
      throw new Error(
        "ControladorEquipamiento necesita un panel de inventario.",
      );
    }

    if (
      !panelEquipamiento ||
      typeof panelEquipamiento.configurarSeleccionador !== "function"
    ) {
      throw new Error(
        "ControladorEquipamiento necesita un panel de equipamiento.",
      );
    }

    this.juego = juego;
    this.renderizador = renderizador;
    this.panelInventario = panelInventario;
    this.panelEquipamiento = panelEquipamiento;

    this.seleccionarInventario = this.seleccionarInventario.bind(this);

    this.seleccionarEquipamiento = this.seleccionarEquipamiento.bind(this);

    this.estaActivo = false;
  }

  activar() {
    if (this.estaActivo) {
      return;
    }

    this.panelInventario.configurarSeleccionador(this.seleccionarInventario);

    this.panelEquipamiento.configurarSeleccionador(
      this.seleccionarEquipamiento,
    );

    this.estaActivo = true;
  }

  desactivar() {
    if (!this.estaActivo) {
      return;
    }

    this.panelInventario.configurarSeleccionador(null);

    this.panelEquipamiento.configurarSeleccionador(null);

    this.estaActivo = false;
  }

  seleccionarInventario(indice) {
    if (!this.puedeModificarEquipo()) {
      return;
    }

    const resultado = this.juego.player.equiparObjetoDesdeInventario(indice);

    this.procesarResultado(resultado);
  }

  seleccionarEquipamiento(nombreRanura) {
    if (!this.puedeModificarEquipo()) {
      return;
    }

    const resultado =
      this.juego.player.desequiparObjetoAInventario(nombreRanura);

    this.procesarResultado(resultado);
  }

  puedeModificarEquipo() {
    if (!this.juego.player.estaVivo) {
      this.renderizador.mostrarMensaje(
        "No podés modificar el equipamiento estando derrotado.",
      );

      return false;
    }

    if (this.juego.modoCombateActivo) {
      this.renderizador.mostrarMensaje(
        "Cancelá el modo combate antes de cambiar el equipamiento.",
      );

      return false;
    }

    return true;
  }

  procesarResultado(resultado) {
    if (!resultado) {
      return;
    }

    this.renderizador.mostrarMensaje(resultado.mensaje);

    if (resultado.exito) {
      // Equipar no consume un turno por ahora.
      this.renderizador.dibujarJuego(this.juego);
    }
  }
}
