import { Enemigo } from "../entidad/destructible/combatiente/Enemigo.js";

// Renderizador representa visualmente la partida
// sin modificar sus reglas.
export class Renderizador {
  constructor({
    canvas,
    panelPersonaje,
    combatLogText,
    tileSize,
    panelInventario,
    panelEquipamiento,
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

    if (!combatLogText) {
      throw new Error("Renderizador necesita el registro de combate.");
    }

    if (!Number.isInteger(tileSize) || tileSize <= 0) {
      throw new Error("El tamaño de las casillas debe ser mayor que 0.");
    }

    this.canvas = canvas;
    this.context = context;
    this.panelPersonaje = panelPersonaje;

    this.combatLogText = combatLogText;

    this.tileSize = tileSize;
    this.panelInventario = panelInventario;

    this.panelEquipamiento = panelEquipamiento;
  }

  dibujarJuego(juego) {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.dibujarMapa(juego.map);

    // Solo se resaltan casillas con trayectoria válida.
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

    this.panelPersonaje.actualizar(juego.player, juego.turno);

    this.panelInventario.actualizar(juego.player.inventario);

    this.panelEquipamiento.actualizar(juego.player.equipamiento);
  }

  dibujarMapa(map) {
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        const casilla = map[y][x];

        const pixelX = x * this.tileSize;

        const pixelY = y * this.tileSize;

        this.context.fillStyle = casilla === "#" ? "#5468d4" : "#252b45";

        this.context.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);

        this.context.strokeStyle = "#171b2e";

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
  // Una selección bloqueada utiliza naranja rojizo.
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

  dibujarJugador(player) {
    const simbolo = player.estaVivo ? player.simbolo : "X";

    this.dibujarEntidad(player, simbolo, "#ffe66d");
  }

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

  dibujarEntidad(entidad, simbolo, color) {
    const centroX = entidad.x * this.tileSize + this.tileSize / 2;

    const centroY = entidad.y * this.tileSize + this.tileSize / 2;

    this.context.fillStyle = color;

    this.context.font = "bold 26px monospace";

    this.context.textAlign = "center";

    this.context.textBaseline = "middle";

    this.context.fillText(simbolo, centroX, centroY);
  }

  mostrarMensaje(mensaje) {
    if (typeof mensaje !== "string" || mensaje.trim() === "") {
      return;
    }

    this.combatLogText.textContent = mensaje;
  }
}
