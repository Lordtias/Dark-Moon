// Coordina inventario, equipamiento, modal
// y acciones expuestas por Juego.
//
// El controlador entrega una lista única del equipamiento.
// La comparación es manual y no intenta adivinar reemplazos.
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
          "con acciones de inventario válidas.",
      );
    }

    if (!juego.player?.inventario || !juego.player?.equipamiento) {
      throw new Error(
        "ControladorEquipamiento necesita un jugador " +
          "con inventario y equipamiento.",
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
      throw new Error(
        "ControladorEquipamiento necesita un modal " + "de detalle de objetos.",
      );
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

  // Los objetos equipados se entregan únicamente
  // como opciones para el botón Comparar.
  seleccionarInventario(indiceInventario) {
    const objeto =
      this.juego.player.inventario.obtenerObjetoEn(indiceInventario);

    if (!objeto) {
      return;
    }

    this.modalDetalleObjeto.abrir({
      objeto,

      combatiente: this.juego.player,

      objetosEquipados: this.obtenerObjetosEquipados(),

      accion: this.crearAccionInventario({
        objeto,
        indiceInventario,
      }),
    });
  }

  // Un objeto equipado también puede compararse
  // contra las demás piezas equipadas.
  seleccionarEquipamiento(nombreRanura) {
    const estados = this.juego.player.equipamiento.obtenerEstadoRanuras();

    const estado = estados?.[nombreRanura];

    const objeto = estado?.objeto ?? estado?.reservadaPor ?? null;

    if (!objeto) {
      return;
    }

    this.modalDetalleObjeto.abrir({
      objeto,

      combatiente: this.juego.player,

      objetosEquipados: this.obtenerObjetosEquipados(),

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

  crearAccionInventario({ objeto, indiceInventario }) {
    let texto = null;

    if (objeto.esMunicion) {
      texto = "Cargar";
    } else if (objeto.esConsumible) {
      texto = "Consumir";
    } else if (objeto.esEquipable) {
      texto = "Equipar";
    }

    if (texto === null) {
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

  // Un arma de dos manos puede aparecer en arma
  // y como reservante de secundaria.
  //
  // El Set garantiza que se muestre una sola vez.
  obtenerObjetosEquipados() {
    const estados = this.juego.player.equipamiento.obtenerEstadoRanuras();

    if (!estados || typeof estados !== "object") {
      return [];
    }

    const objetosProcesados = new Set();

    const objetosEquipados = [];

    for (const [nombreRanura, estado] of Object.entries(estados)) {
      const objeto = estado?.objeto ?? estado?.reservadaPor ?? null;

      if (!objeto || objetosProcesados.has(objeto)) {
        continue;
      }

      objetosProcesados.add(objeto);

      objetosEquipados.push({
        nombreRanura,

        etiquetaRanura: formatearNombreRanura(nombreRanura),

        objeto,
      });
    }

    return objetosEquipados;
  }

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

function formatearNombreRanura(nombreRanura) {
  if (typeof nombreRanura !== "string" || nombreRanura.trim() === "") {
    return "Equipado";
  }

  const texto = nombreRanura
    .replace(/([a-záéíóúñ])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .trim()
    .toLowerCase();

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
