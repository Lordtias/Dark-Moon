import { traducir } from "../idiomas/ContextoIdioma.js";

// Coordina inventario, equipamiento, modal
// y acciones expuestas por Juego.
//
// El controlador entrega una lista única del equipamiento.
// La comparación es manual y no intenta adivinar reemplazos.
export class ControladorEquipamientoDom {
  constructor({
    juego,
    panelInventario,
    panelEquipamiento,
    modalDetalleObjeto,
    alProcesarResultado,
  } = {}) {
    if (
      !juego ||
      typeof juego.interactuarConObjetoInventario !== "function" ||
      typeof juego.desequiparObjetoAInventario !== "function"
    ) {
      throw new Error(
        "ControladorEquipamientoDom necesita una partida " +
          "con acciones de inventario válidas.",
      );
    }

    if (!juego.player?.inventario || !juego.player?.equipamiento) {
      throw new Error(
        "ControladorEquipamientoDom necesita un jugador " +
          "con inventario y equipamiento.",
      );
    }

    if (
      !panelInventario ||
      typeof panelInventario.configurarSeleccionador !== "function"
    ) {
      throw new Error(
        "ControladorEquipamientoDom necesita un panel de inventario.",
      );
    }

    if (
      !panelEquipamiento ||
      typeof panelEquipamiento.configurarSeleccionador !== "function"
    ) {
      throw new Error(
        "ControladorEquipamientoDom necesita un panel de equipamiento.",
      );
    }

    if (
      !modalDetalleObjeto ||
      typeof modalDetalleObjeto.abrir !== "function" ||
      typeof modalDetalleObjeto.cerrar !== "function"
    ) {
      throw new Error(
        "ControladorEquipamientoDom necesita un modal " +
          "de detalle de objetos.",
      );
    }

    if (typeof alProcesarResultado !== "function") {
      throw new Error(
        "ControladorEquipamientoDom necesita una acción para procesar resultados.",
      );
    }

    this.juego = juego;
    this.alProcesarResultado = alProcesarResultado;

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
        texto: traducir("interfaz.detalleObjeto.desequipar", { respaldo: "Desequipar" }),

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
      texto = traducir("interfaz.detalleObjeto.cargar", { respaldo: "Cargar" });
    } else if (objeto.esConsumible) {
      texto = traducir("interfaz.detalleObjeto.consumir", { respaldo: "Consumir" });
    } else if (objeto.esEquipable) {
      texto = traducir("interfaz.detalleObjeto.equipar", { respaldo: "Equipar" });
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

  // Entrega el resultado al coordinador de la partida para que mensajes,
  // redibujado y derrota utilicen un único camino de aplicación.
  procesarResultado(resultado) {
    return this.alProcesarResultado(resultado);
  }
}

function formatearNombreRanura(nombreRanura) {
  if (typeof nombreRanura !== "string" || nombreRanura.trim() === "") {
    return traducir("interfaz.equipamiento.equipado", { respaldo: "Equipado" });
  }

  const texto = nombreRanura
    .replace(/([a-záéíóúñ])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .trim()
    .toLowerCase();

  const respaldo = texto.charAt(0).toUpperCase() + texto.slice(1);
  return traducir(`interfaz.equipamiento.${nombreRanura}`, { respaldo });
}
