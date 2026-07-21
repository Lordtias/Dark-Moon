// Coordina las interacciones visuales entre:
//
// - El panel de inventario.
// - El panel de equipamiento.
// - El modal de objetos.
// - Las acciones expuestas por Juego.
//
// El controlador decide qué referencias deben compararse,
// pero las reglas definitivas, las validaciones y los costes
// temporales continúan perteneciendo a Juego.
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

  // Un clic en el inventario abre primero el detalle.
  // La acción real se ejecuta al confirmar el botón principal.
  seleccionarInventario(indiceInventario) {
    const objeto =
      this.juego.player.inventario.obtenerObjetoEn(indiceInventario);

    if (!objeto) {
      return;
    }

    const objetosDesplazados =
      objeto.esEquipable === true
        ? this.obtenerObjetosParaComparacion(objeto)
        : [];

    this.modalDetalleObjeto.abrir({
      objeto,

      combatiente: this.juego.player,

      objetosDesplazados,

      accion: this.crearAccionInventario({
        objeto,
        indiceInventario,
      }),
    });
  }

  // Un clic sobre una ranura equipada abre su detalle
  // antes de permitir devolver el objeto al inventario.
  seleccionarEquipamiento(nombreRanura) {
    const objeto = this.obtenerObjetoVisibleEnRanura(nombreRanura);

    if (!objeto) {
      return;
    }

    this.modalDetalleObjeto.abrir({
      objeto,

      combatiente: this.juego.player,

      objetosDesplazados: [],

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

    // Los materiales y objetos sin interacción
    // pueden inspeccionarse sin botón principal.
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

  // Devuelve los objetos cuyas estadísticas deben usarse
  // como referencia visual.
  //
  // Esta resolución corrige especialmente dos casos:
  //
  // 1. Un arma de una mano se compara con el arma principal
  //    cuando la secundaria contiene un escudo o un carcaj.
  //
  // 2. Un arma de dos manos compara su parte ofensiva con el arma
  //    principal y también muestra las pérdidas únicas del objeto
  //    secundario, como Armadura, Bloqueo o sus afijos.
  obtenerObjetosParaComparacion(objeto) {
    if (objeto.esArma === true) {
      return this.obtenerReferenciasArma(objeto);
    }

    const ranura = this.elegirRanuraGenerica(objeto);

    if (!ranura) {
      return [];
    }

    const objetoActual = this.obtenerObjetoVisibleEnRanura(ranura);

    return objetoActual ? [objetoActual] : [];
  }

  obtenerReferenciasArma(objeto) {
    const armaPrincipal = this.obtenerObjetoVisibleEnRanura("arma");

    const objetoSecundario = this.obtenerObjetoDirectoEnRanura("secundaria");

    const referencias = [];

    // Las armas de dos manos sustituyen la fuente ofensiva principal
    // y además dejan sin efecto el objeto secundario.
    if (objeto.bloqueaSecundaria === true) {
      agregarReferenciaUnica(referencias, armaPrincipal);

      agregarReferenciaUnica(referencias, objetoSecundario);

      return referencias;
    }

    // Sin arma principal no existe una referencia ofensiva.
    if (!armaPrincipal) {
      return referencias;
    }

    // Si la secundaria contiene otra arma, la comparación se realiza
    // contra esa arma porque representa la alternativa de doble arma.
    if (objetoSecundario?.esArma === true) {
      agregarReferenciaUnica(referencias, objetoSecundario);

      return referencias;
    }

    // Un escudo, carcaj u objeto utilitario de secundaria
    // nunca debe utilizarse como referencia ofensiva para una daga,
    // espada o hacha de una mano.
    agregarReferenciaUnica(referencias, armaPrincipal);

    return referencias;
  }

  // Para armaduras, escudos, carcajes, anillos y otros objetos
  // se mantiene una selección sencilla:
  //
  // - Primera ranura compatible libre.
  // - Si todas están ocupadas, primera ranura compatible.
  elegirRanuraGenerica(objeto) {
    const equipamiento = this.juego.player.equipamiento;

    if (!Array.isArray(objeto.ranurasCompatibles)) {
      return null;
    }

    const compatibles = objeto.ranurasCompatibles
      .map((ranura) => normalizarNombreRanura(ranura))
      .filter(
        (ranura) =>
          typeof equipamiento.tieneRanura !== "function" ||
          equipamiento.tieneRanura(ranura),
      );

    if (compatibles.length === 0) {
      return null;
    }

    const ranuraLibre = compatibles.find(
      (ranura) =>
        this.obtenerObjetoDirectoEnRanura(ranura) === null &&
        !this.estaRanuraReservada(ranura),
    );

    return ranuraLibre ?? compatibles[0];
  }

  // Devuelve el objeto que ocupa directamente la ranura.
  // No devuelve el objeto que solamente la reserva.
  obtenerObjetoDirectoEnRanura(nombreRanura) {
    const estado = this.obtenerEstadoRanura(nombreRanura);

    if (estado) {
      return estado.objeto ?? null;
    }

    const equipamiento = this.juego.player.equipamiento;

    if (typeof equipamiento.obtenerObjetoEnRanura === "function") {
      return equipamiento.obtenerObjetoEnRanura(nombreRanura) ?? null;
    }

    return null;
  }

  // Devuelve el objeto visible desde una ranura.
  // Si la ranura está reservada por un arma de dos manos,
  // devuelve esa arma para poder abrir su detalle correctamente.
  obtenerObjetoVisibleEnRanura(nombreRanura) {
    const estado = this.obtenerEstadoRanura(nombreRanura);

    if (estado) {
      return estado.objeto ?? estado.reservadaPor ?? null;
    }

    return this.obtenerObjetoDirectoEnRanura(nombreRanura);
  }

  obtenerEstadoRanura(nombreRanura) {
    const equipamiento = this.juego.player.equipamiento;

    if (typeof equipamiento.obtenerEstadoRanuras !== "function") {
      return null;
    }

    const estados = equipamiento.obtenerEstadoRanuras();

    return estados?.[normalizarNombreRanura(nombreRanura)] ?? null;
  }

  estaRanuraReservada(nombreRanura) {
    const equipamiento = this.juego.player.equipamiento;

    if (typeof equipamiento.estaRanuraReservada === "function") {
      return equipamiento.estaRanuraReservada(nombreRanura);
    }

    const estado = this.obtenerEstadoRanura(nombreRanura);

    return estado?.reservadaPor != null;
  }

  // Muestra el mensaje producido por Juego y actualiza la interfaz.
  // No dependemos solo de "éxito", porque una acción temporal
  // también puede provocar ataques enemigos o regeneración.
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

function agregarReferenciaUnica(referencias, objeto) {
  if (objeto && !referencias.includes(objeto)) {
    referencias.push(objeto);
  }
}

function normalizarNombreRanura(nombreRanura) {
  return String(nombreRanura).trim().toLowerCase();
}
