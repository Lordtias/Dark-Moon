// Coordina las interacciones visuales entre:
//
// - El panel de inventario.
// - El panel de equipamiento.
// - Las acciones expuestas por Juego.
//
// El controlador no modifica directamente al jugador.
// Las reglas, validaciones y costes temporales pertenecen
// a Juego.
export class ControladorEquipamiento {
  constructor({
    juego,
    renderizador,
    panelInventario,
    panelEquipamiento,
  } = {}) {
    if (
      !juego ||
      typeof juego.interactuarConObjetoInventario !== "function" ||
      typeof juego.desequiparObjetoAInventario !== "function"
    ) {
      throw new Error(
        "ControladorEquipamiento necesita una partida " +
          "con acciones de inventario válidas.",
      );
    }

    if (
      !renderizador ||
      typeof renderizador.dibujarJuego !== "function" ||
      typeof renderizador.mostrarMensaje !== "function"
    ) {
      throw new Error("ControladorEquipamiento necesita un renderizador.");
    }

    if (
      !panelInventario ||
      typeof panelInventario.configurarSeleccionador !== "function"
    ) {
      throw new Error(
        "ControladorEquipamiento necesita un panel " + "de inventario.",
      );
    }

    if (
      !panelEquipamiento ||
      typeof panelEquipamiento.configurarSeleccionador !== "function"
    ) {
      throw new Error(
        "ControladorEquipamiento necesita un panel " + "de equipamiento.",
      );
    }

    this.juego = juego;
    this.renderizador = renderizador;
    this.panelInventario = panelInventario;
    this.panelEquipamiento = panelEquipamiento;

    // Conservamos las referencias enlazadas para poder
    // asignarlas y retirarlas correctamente.
    this.seleccionarInventario = this.seleccionarInventario.bind(this);

    this.seleccionarEquipamiento = this.seleccionarEquipamiento.bind(this);

    this.estaActivo = false;
  }

  // Conecta los paneles con sus acciones.
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

  // Retira las acciones de los paneles.
  desactivar() {
    if (!this.estaActivo) {
      return;
    }

    this.panelInventario.configurarSeleccionador(null);
    this.panelEquipamiento.configurarSeleccionador(null);

    this.estaActivo = false;
  }

  // Seleccionar un objeto puede producir:
  //
  // - Equipamiento.
  // - Cambio de arma.
  // - Carga de munición.
  // - Un fallo sin coste temporal.
  seleccionarInventario(indiceInventario) {
    const resultado =
      this.juego.interactuarConObjetoInventario(indiceInventario);

    this.procesarResultado(resultado);
  }

  // Seleccionar una ranura ocupada intenta
  // devolver su objeto al inventario.
  seleccionarEquipamiento(nombreRanura) {
    const resultado = this.juego.desequiparObjetoAInventario(nombreRanura);

    this.procesarResultado(resultado);
  }

  // Muestra el historial producido por la acción
  // y redibuja cuando Juego lo solicita.
  //
  // Ya no dependemos únicamente de "exito", porque una
  // acción temporal también puede provocar movimiento,
  // ataques enemigos, regeneración o la derrota del jugador.
  procesarResultado(resultado) {
    if (!resultado) {
      return;
    }

    if (
      typeof resultado.mensaje === "string" &&
      resultado.mensaje.trim() !== ""
    ) {
      this.renderizador.mostrarMensaje(resultado.mensaje);
    }

    if (resultado.redibujar) {
      this.renderizador.dibujarJuego(this.juego);
    }
  }
}
