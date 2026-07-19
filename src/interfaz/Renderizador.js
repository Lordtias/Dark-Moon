import { Enemigo } from "../entidad/destructible/combatiente/Enemigo.js";

import { normalizarMensajesJuego } from "../juego/MensajesJuego.js";

const MAXIMO_MENSAJES_REGISTRO = 120;

// Renderizador representa visualmente
// la partida sin modificar sus reglas.
//
// Se encarga de:
//
// - Dibujar el mapa.
// - Resaltar el alcance de combate.
// - Dibujar entidades.
// - Actualizar los paneles.
// - Actualizar la agenda temporal.
// - Agregar eventos al historial.
export class Renderizador {
  constructor({
    canvas,
    panelPersonaje,
    combatLogText,
    tileSize,
    panelInventario,
    panelEquipamiento,
    panelOrdenTemporal,
  } = {}) {
    if (!canvas) {
      throw new Error("Renderizador necesita un canvas.");
    }

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("No se pudo obtener el contexto 2D del canvas.");
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

    if (!Number.isInteger(tileSize) || tileSize <= 0) {
      throw new Error("El tamaño de las casillas debe " + "ser mayor que 0.");
    }

    this.canvas = canvas;

    this.context = context;

    this.panelPersonaje = panelPersonaje;

    this.panelInventario = panelInventario;

    this.panelEquipamiento = panelEquipamiento;

    this.panelOrdenTemporal = panelOrdenTemporal;

    this.combatLogText = combatLogText;

    this.tileSize = tileSize;

    // Se utiliza para interpretar correctamente
    // mensajes antiguos de combate.
    this.nombreJugador = "";

    // La primera llamada reemplazará el mensaje
    // explicativo incluido en index.html.
    this.registroInicializado = false;
  }

  // Actualiza toda la representación
  // visible de la partida.
  dibujarJuego(juego) {
    this.nombreJugador = juego.player.nombre;

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.dibujarMapa(juego.map, juego.mapaSeleccionado?.apariencia);

    // Solo se resaltan casillas
    // con trayectoria válida.
    if (juego.modoCombateActivo) {
      this.dibujarRangoCombate(juego);
    }

    this.dibujarObjetivos(juego.objetivos);

    this.dibujarJugador(juego.player);

    if (juego.modoCombateActivo) {
      const selectorValido = juego.esCasillaAtacable(
        juego.selectorCombate.x,
        juego.selectorCombate.y,
      );

      this.dibujarSelectorCombate(juego.selectorCombate, selectorValido);
    }

    // El panel calcula sus valores directamente
    // desde el jugador, incluido el DPS actual.
    this.panelPersonaje.actualizar(juego.player);

    this.panelInventario.actualizar(juego.player.inventario);

    this.panelEquipamiento.actualizar(juego.player.equipamiento);

    // La agenda se actualiza después de resolver
    // todas las acciones temporales.
    this.panelOrdenTemporal.actualizar(juego);
  }

  // Dibuja paredes, suelo y grilla
  // utilizando los colores del bioma.
  dibujarMapa(map, apariencia = {}) {
    const colorSuelo = apariencia.colorSuelo ?? "#252b45";

    const colorPared = apariencia.colorPared ?? "#5468d4";

    const colorGrilla = apariencia.colorGrilla ?? "#171b2e";

    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        const casilla = map[y][x];

        const pixelX = x * this.tileSize;

        const pixelY = y * this.tileSize;

        this.context.fillStyle = casilla === "#" ? colorPared : colorSuelo;

        this.context.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);

        this.context.strokeStyle = colorGrilla;

        this.context.lineWidth = 1;

        this.context.strokeRect(pixelX, pixelY, this.tileSize, this.tileSize);
      }
    }
  }

  // Resalta solamente las casillas que cumplen:
  //
  // - Alcance.
  // - Dirección permitida.
  // - Línea de visión.
  dibujarRangoCombate(juego) {
    for (let y = 0; y < juego.map.length; y++) {
      for (let x = 0; x < juego.map[y].length; x++) {
        if (!juego.esCasillaAtacable(x, y)) {
          continue;
        }

        const pixelX = x * this.tileSize;

        const pixelY = y * this.tileSize;

        this.context.fillStyle = "rgba(220, 55, 55, 0.28)";

        this.context.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);

        this.context.strokeStyle = "rgba(255, 110, 110, 0.45)";

        this.context.lineWidth = 1;

        this.context.strokeRect(pixelX, pixelY, this.tileSize, this.tileSize);
      }
    }
  }

  // Una selección válida utiliza amarillo.
  //
  // Una selección bloqueada utiliza
  // naranja rojizo.
  dibujarSelectorCombate(selector, esValido) {
    if (!selector) {
      return;
    }

    const pixelX = selector.x * this.tileSize;

    const pixelY = selector.y * this.tileSize;

    this.context.fillStyle = esValido
      ? "rgba(255, 230, 90, 0.18)"
      : "rgba(255, 100, 70, 0.18)";

    this.context.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);

    this.context.strokeStyle = esValido ? "#ffe66d" : "#ff705c";

    this.context.lineWidth = 4;

    this.context.strokeRect(
      pixelX + 2,
      pixelY + 2,
      this.tileSize - 4,
      this.tileSize - 4,
    );

    this.context.lineWidth = 1;
  }

  // Dibuja al personaje controlado
  // por el jugador.
  dibujarJugador(player) {
    const simbolo = player.estaVivo ? player.simbolo : "X";

    this.dibujarEntidad(player, simbolo, "#ffe66d");
  }

  // Dibuja enemigos y otros objetivos
  // que todavía no fueron destruidos.
  dibujarObjetivos(objetivos) {
    for (const objetivo of objetivos) {
      if (objetivo.estaDestruido) {
        continue;
      }

      if (objetivo instanceof Enemigo) {
        this.dibujarEntidad(objetivo, objetivo.simbolo, "#ff8c8c");

        continue;
      }

      this.dibujarEntidad(objetivo, objetivo.simbolo, "#d9a066");
    }
  }

  // Dibuja el símbolo de cualquier entidad
  // dentro del centro de su casilla.
  dibujarEntidad(entidad, simbolo, color) {
    const centroX = entidad.x * this.tileSize + this.tileSize / 2;

    const centroY = entidad.y * this.tileSize + this.tileSize / 2;

    this.context.fillStyle = color;

    this.context.font = "bold 26px monospace";

    this.context.textAlign = "center";

    this.context.textBaseline = "middle";

    this.context.fillText(simbolo, centroX, centroY);
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
