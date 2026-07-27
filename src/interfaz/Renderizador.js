import { normalizarMensajesJuego } from "../juego/mensajes/MensajesJuego.js";

import { crearEscenaJuego } from "./graficos/AdaptadorEscenaJuego.js";

const MAXIMO_MENSAJES_REGISTRO = 120;

// Renderizador coordina toda la interfaz
// visible de la partida.
//
// No dibuja directamente con Canvas.
//
// La representación del mapa se delega a un
// renderizador gráfico intercambiable, mientras
// esta clase continúa actualizando:
//
// - Panel del personaje.
// - Inventario.
// - Equipamiento.
// - Agenda temporal.
// - Historial de eventos.
export class Renderizador {
  constructor({
    renderizadorMapa,
    panelPersonaje,
    combatLogText,
    panelInventario,
    panelEquipamiento,
    panelOrdenTemporal,
  } = {}) {
    if (
      !renderizadorMapa ||
      typeof renderizadorMapa.dibujar !== "function" ||
      typeof renderizadorMapa.configurarDimensiones !== "function"
    ) {
      throw new Error(
        "Renderizador necesita una implementación gráfica válida.",
      );
    }

    if (!panelPersonaje || typeof panelPersonaje.actualizar !== "function") {
      throw new Error("Renderizador necesita un PanelPersonaje.");
    }

    if (!panelInventario || typeof panelInventario.actualizar !== "function") {
      throw new Error("Renderizador necesita un PanelInventario.");
    }

    if (
      !panelEquipamiento ||
      typeof panelEquipamiento.actualizar !== "function"
    ) {
      throw new Error("Renderizador necesita un PanelEquipamiento.");
    }

    if (
      !panelOrdenTemporal ||
      typeof panelOrdenTemporal.actualizar !== "function"
    ) {
      throw new Error("Renderizador necesita un PanelOrdenTemporal.");
    }

    if (!combatLogText) {
      throw new Error("Renderizador necesita el registro de combate.");
    }

    this.renderizadorMapa = renderizadorMapa;
    this.panelPersonaje = panelPersonaje;
    this.panelInventario = panelInventario;
    this.panelEquipamiento = panelEquipamiento;
    this.panelOrdenTemporal = panelOrdenTemporal;
    this.combatLogText = combatLogText;

    // Se utiliza para interpretar correctamente
    // mensajes antiguos de combate.
    this.nombreJugador = "";

    // La primera llamada reemplazará el mensaje
    // explicativo incluido en index.html.
    this.registroInicializado = false;

    // La selección de habilidades es una capa visual del renderizador y no
    // modifica la instancia de Juego ni el contrato del backend Canvas.
    this.estadoVisualHabilidad = crearEstadoVisualHabilidad();
  }

  // Permite que el controlador configure
  // las dimensiones sin conocer la tecnología
  // gráfica utilizada.
  configurarDimensionesMapa({ columnas, filas } = {}) {
    this.renderizadorMapa.configurarDimensiones({
      columnas,
      filas,
    });
  }

  // Actualiza la capa visual de selección mágica. La integración del mapa
  // activo es la única responsable de establecerla y limpiarla.
  actualizarEstadoVisualHabilidad(estado = null) {
    this.estadoVisualHabilidad = crearEstadoVisualHabilidad(estado);
    return this.estadoVisualHabilidad;
  }

  // Actualiza toda la representación
  // visible de la partida.
  dibujarJuego(juego) {
    this.nombreJugador = juego.player.nombre;

    // Convertimos Juego en una escena plana
    // antes de entregarla al backend gráfico.
    const escena = crearEscenaJuego(juego, {
      habilidad: this.estadoVisualHabilidad,
    });

    this.renderizadorMapa.dibujar(escena);

    // Los paneles HTML continúan siendo
    // independientes del backend del mapa.
    this.panelPersonaje.actualizar(juego.player);

    // PanelInventario recibe también al jugador
    // porque el oro no forma parte del contenedor
    // ni ocupa una casilla de inventario.
    this.panelInventario.actualizar(juego.player.inventario, juego.player);
    this.panelEquipamiento.actualizar(juego.player.equipamiento);
    this.panelOrdenTemporal.actualizar(juego);
  }

  // Agrega mensajes al historial
  // sin borrar eventos anteriores.
  mostrarMensaje(mensaje) {
    const mensajes = normalizarMensajesJuego(mensaje, {
      nombreJugador: this.nombreJugador,
    });

    if (mensajes.length === 0) {
      return;
    }

    if (!this.registroInicializado) {
      this.combatLogText.replaceChildren();
      this.registroInicializado = true;
    }

    const fragmento = document.createDocumentFragment();

    for (const evento of mensajes) {
      const elemento = document.createElement("p");
      elemento.classList.add(
        "mensaje-registro",
        `mensaje-registro--${evento.tipo}`,
      );
      elemento.dataset.tipo = evento.tipo;
      elemento.textContent = evento.texto;
      fragmento.appendChild(elemento);
    }

    this.combatLogText.appendChild(fragmento);
    this.limitarHistorialMensajes();

    // Mantiene visible automáticamente
    // el evento más reciente.
    this.combatLogText.scrollTop = this.combatLogText.scrollHeight;
  }

  // Evita que el historial crezca
  // indefinidamente.
  limitarHistorialMensajes() {
    while (this.combatLogText.childElementCount > MAXIMO_MENSAJES_REGISTRO) {
      this.combatLogText.firstElementChild?.remove();
    }
  }
}

function crearEstadoVisualHabilidad(estado = null) {
  const selector = estado?.selector;

  return Object.freeze({
    activo: estado?.activo === true,
    selector:
      selector && Number.isInteger(selector.x) && Number.isInteger(selector.y)
        ? Object.freeze({
            x: selector.x,
            y: selector.y,
            objetivoValido: selector.objetivoValido === true,
            puedeEjecutar: selector.geometria?.puedeEjecutar === true,
          })
        : null,
  });
}
