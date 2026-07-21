// Coordina las interacciones visuales entre:
//
// - El panel de inventario.
// - El panel de equipamiento.
// - El modal de objetos.
// - Las acciones expuestas por Juego.
//
// El controlador solamente selecciona referencias
// y solicita confirmaciones.
//
// Las reglas definitivas, validaciones y costes temporales
// siguen perteneciendo a Juego.
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
  //
  // La acción real se ejecuta solamente después
  // de confirmar el botón principal del modal.
  seleccionarInventario(indiceInventario) {
    const objeto =
      this.juego.player.inventario.obtenerObjetoEn(indiceInventario);

    if (!objeto) {
      return;
    }

    const objetoEquipado = objeto.esEquipable
      ? this.obtenerObjetoEquipadoComparable(objeto)
      : null;

    this.modalDetalleObjeto.abrir({
      objeto,

      combatiente: this.juego.player,

      objetoEquipado,

      mostrarComparacion: objeto.esEquipable === true,

      accion: this.crearAccionInventario({
        objeto,
        indiceInventario,
      }),
    });
  }

  // Un clic sobre una ranura equipada abre su detalle
  // antes de permitir devolver el objeto al inventario.
  seleccionarEquipamiento(nombreRanura) {
    const estados = this.juego.player.equipamiento.obtenerEstadoRanuras();

    const estado = estados[nombreRanura];

    // Una ranura puede contener directamente el objeto
    // o estar reservada por un objeto de dos manos.
    const objeto = estado?.objeto ?? estado?.reservadaPor ?? null;

    if (!objeto) {
      return;
    }

    this.modalDetalleObjeto.abrir({
      objeto,

      combatiente: this.juego.player,

      mostrarComparacion: false,

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

  // Define el texto del botón sin duplicar
  // las reglas internas de uso del objeto.
  //
  // Juego continúa resolviendo qué sucede realmente
  // cuando el jugador confirma la acción.
  crearAccionInventario({ objeto, indiceInventario }) {
    let texto = null;

    if (objeto.esMunicion) {
      texto = "Cargar";
    } else if (objeto.esConsumible) {
      texto = "Consumir";
    } else if (objeto.esEquipable) {
      texto = "Equipar";
    }

    // Los materiales u objetos sin interacción
    // pueden inspeccionarse sin mostrar un botón principal.
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

  // Determina el objeto equipado contra el cual
  // debe compararse el objeto inspeccionado.
  obtenerObjetoEquipadoComparable(objeto) {
    const ranura = this.elegirRanuraAutomatica(objeto);

    if (!ranura) {
      return null;
    }

    const estados = this.juego.player.equipamiento.obtenerEstadoRanuras();

    const estado = estados[ranura];

    return estado?.objeto ?? estado?.reservadaPor ?? null;
  }

  // Mantiene la misma prioridad general utilizada
  // por el equipamiento automático:
  //
  // - Arma principal.
  // - Arma secundaria.
  // - Reservas producidas por armas de dos manos.
  // - Primera ranura compatible que esté libre.
  //
  // Esta selección solo decide qué objeto mostrar
  // en la comparación. La acción real sigue siendo
  // resuelta y validada por Juego.
  elegirRanuraAutomatica(objeto) {
    const equipamiento = this.juego.player.equipamiento;

    const compatibles = objeto.ranurasCompatibles.filter((ranura) =>
      equipamiento.tieneRanura(ranura),
    );

    if (compatibles.length === 0) {
      return null;
    }

    if (compatibles.length === 1) {
      return compatibles[0];
    }

    const puedePrincipal = compatibles.includes("arma");

    const puedeSecundaria = compatibles.includes("secundaria");

    // Las armas de una mano pueden ocupar
    // la mano principal o la secundaria.
    if (objeto.esArma && puedePrincipal && puedeSecundaria) {
      const principal = equipamiento.obtenerObjetoEnRanura("arma");

      const secundaria = equipamiento.obtenerObjetoEnRanura("secundaria");

      const secundariaReservada =
        equipamiento.estaRanuraReservada("secundaria");

      // Sin arma principal, el objeto se equipará allí.
      //
      // Si la principal actual bloquea la secundaria,
      // también debe reemplazarse desde la ranura principal.
      if (!principal || principal.bloqueaSecundaria) {
        return "arma";
      }

      // Cuando la principal es un arma a distancia,
      // la nueva arma de una mano se dirige a secundaria.
      if (principal.propiedades?.tipoAtaque === "distancia") {
        return "secundaria";
      }

      if (!secundaria && !secundariaReservada) {
        return "secundaria";
      }

      // Si ambas manos están ocupadas,
      // la acción automática reemplaza la secundaria.
      return "secundaria";
    }

    // Para objetos compatibles con varias ranuras,
    // se prioriza la primera que esté realmente libre.
    const ranuraLibre = compatibles.find(
      (ranura) =>
        equipamiento.obtenerObjetoEnRanura(ranura) === null &&
        !equipamiento.estaRanuraReservada(ranura),
    );

    return ranuraLibre ?? compatibles[0];
  }

  // Muestra el mensaje producido por Juego
  // y actualiza la interfaz cuando corresponde.
  //
  // No dependemos únicamente de "éxito", porque
  // una acción temporal puede provocar movimiento,
  // ataques enemigos, regeneración o derrota.
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
