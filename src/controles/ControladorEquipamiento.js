// Coordina las interacciones visuales entre:
//
// - El panel de inventario.
// - El panel de equipamiento.
// - El modal de detalle.
// - Las acciones temporales expuestas por Juego.
//
// Inspeccionar un objeto no consume tiempo.
// Equipar, consumir, cargar o desequipar solamente
// ocurre cuando el jugador confirma la acción del modal.
export class ControladorEquipamiento {
  constructor({
    juego,
    renderizador,
    panelInventario,
    panelEquipamiento,
    modalDetalleObjeto,
  } = {}) {
    if (
      !juego ||
      typeof juego.interactuarConObjetoInventario !== "function" ||
      typeof juego.desequiparObjetoAInventario !== "function"
    ) {
      throw new Error(
        "ControladorEquipamiento necesita una partida " +
          "con acciones de objetos válidas.",
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

    if (
      !modalDetalleObjeto ||
      typeof modalDetalleObjeto.abrir !== "function" ||
      typeof modalDetalleObjeto.cerrar !== "function"
    ) {
      throw new Error("ControladorEquipamiento necesita un modal de detalle.");
    }

    this.juego = juego;

    this.renderizador = renderizador;

    this.panelInventario = panelInventario;

    this.panelEquipamiento = panelEquipamiento;

    this.modalDetalleObjeto = modalDetalleObjeto;

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

    this.modalDetalleObjeto.cerrar();

    this.estaActivo = false;
  }

  // Abre el detalle de un objeto almacenado.
  //
  // El botón principal se adapta al tipo del objeto.
  seleccionarInventario(indiceInventario) {
    const objeto =
      this.juego.player.inventario.obtenerObjetoEn(indiceInventario);

    if (!objeto) {
      return;
    }

    this.modalDetalleObjeto.abrir({
      objeto,

      combatiente: this.juego.player,

      accion: this.crearAccionInventario({
        objeto,
        indiceInventario,
      }),
    });
  }

  // Abre el detalle del objeto que ocupa
  // o reserva una ranura de equipamiento.
  seleccionarEquipamiento(nombreRanura) {
    const estado =
      this.juego.player.equipamiento.obtenerEstadoRanuras()[nombreRanura];

    const objeto = estado?.objeto ?? estado?.reservadaPor ?? null;

    if (!objeto) {
      return;
    }

    this.modalDetalleObjeto.abrir({
      objeto,

      combatiente: this.juego.player,

      accion: {
        texto: "Desequipar",

        ejecutar: () => {
          const resultado =
            this.juego.desequiparObjetoAInventario(nombreRanura);

          this.procesarResultado(resultado);
        },
      },
    });
  }

  // Los materiales y futuros objetos sin uso directo
  // pueden inspeccionarse sin mostrar un botón principal.
  crearAccionInventario({ objeto, indiceInventario }) {
    const texto = this.obtenerTextoAccionInventario(objeto);

    if (!texto) {
      return null;
    }

    return {
      texto,

      ejecutar: () => {
        const resultado =
          this.juego.interactuarConObjetoInventario(indiceInventario);

        this.procesarResultado(resultado);
      },
    };
  }

  obtenerTextoAccionInventario(objeto) {
    if (objeto.esMunicion) {
      return "Cargar";
    }

    if (objeto.esConsumible) {
      return "Consumir";
    }

    if (objeto.esEquipable) {
      return "Equipar";
    }

    return null;
  }

  // Muestra los mensajes producidos por Juego
  // y redibuja cuando una acción modificó el mundo.
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
