import { Enemigo } from "../entidad/destructible/combatiente/Enemigo.js";

// Renderizador administra toda la representación visual
// de la partida sin modificar sus reglas.
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
      throw new Error(
        "El tamaño de las casillas debe ser un entero mayor que 0.",
      );
    }

    this.canvas = canvas;
    this.context = context;
    this.panelPersonaje = panelPersonaje;
    this.combatLogText = combatLogText;
    this.tileSize = tileSize;
    this.panelInventario = panelInventario;
    this.panelEquipamiento = panelEquipamiento;
  }

  // Dibuja el estado completo de la partida.
  dibujarJuego(juego) {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // El orden determina qué elementos aparecen encima.
    this.dibujarMapa(juego.map);

    // El rango se dibuja debajo de las entidades.
    if (juego.modoCombateActivo) {
      this.dibujarRangoCombate(juego);
    }

    this.dibujarObjetivos(juego.objetivos);
    this.dibujarJugador(juego.player);

    // El selector se dibuja al final para que siempre sea visible.
    if (juego.modoCombateActivo) {
      this.dibujarSelectorCombate(juego.selectorCombate);
    }

    this.panelPersonaje.actualizar(juego.player, juego.turno);

    this.panelInventario.actualizar(juego.player.inventario);

    this.panelEquipamiento.actualizar(juego.player.equipamiento);
  }

  // Dibuja paredes, suelo y separación entre casillas.
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

  // Resalta todas las casillas que se encuentran
  // dentro del alcance actual del jugador.
  dibujarRangoCombate(juego) {
    for (let y = 0; y < juego.map.length; y++) {
      for (let x = 0; x < juego.map[y].length; x++) {
        // Las paredes no son objetivos seleccionables.
        if (!juego.esCaminable(x, y)) {
          continue;
        }

        if (!juego.estaCasillaDentroAlcance(x, y)) {
          continue;
        }

        const pixelX = x * this.tileSize;
        const pixelY = y * this.tileSize;

        // Sombreado semitransparente para mantener
        // visible el contenido original de la casilla.
        this.context.fillStyle = "rgba(220, 55, 55, 0.28)";

        this.context.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);

        this.context.strokeStyle = "rgba(255, 110, 110, 0.45)";

        this.context.lineWidth = 1;

        this.context.strokeRect(pixelX, pixelY, this.tileSize, this.tileSize);
      }
    }
  }

  // Dibuja un borde sobre la casilla seleccionada.
  dibujarSelectorCombate(selector) {
    if (!selector) {
      return;
    }

    const pixelX = selector.x * this.tileSize;
    const pixelY = selector.y * this.tileSize;

    // Reforzamos levemente el fondo de la selección.
    this.context.fillStyle = "rgba(255, 230, 90, 0.18)";

    this.context.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);

    // Dibujamos el borde dentro de la casilla
    // para evitar que quede cortado.
    this.context.strokeStyle = "#ffe66d";
    this.context.lineWidth = 4;

    this.context.strokeRect(
      pixelX + 2,
      pixelY + 2,
      this.tileSize - 4,
      this.tileSize - 4,
    );

    // Restauramos el grosor normal para los demás dibujos para los demás dibujos.
    this.context.lineWidth = 1;
  }

  // Dibuja al personaje controlado por el jugador.
  dibujarJugador(player) {
    const simbolo = player.estaVivo ? player.simbolo : "X";

    this.dibujarEntidad(player, simbolo, "#ffe66d");
  }

  // Dibuja enemigos y objetos no destruidos.
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
  // en el centro de su casilla.
  dibujarEntidad(entidad, simbolo, color) {
    const centroX = entidad.x * this.tileSize + this.tileSize / 2;

    const centroY = entidad.y * this.tileSize + this.tileSize / 2;

    this.context.fillStyle = color;
    this.context.font = "bold 26px monospace";
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";

    this.context.fillText(simbolo, centroX, centroY);
  }

  // Muestra el último mensaje producido por el juego.
  mostrarMensaje(mensaje) {
    if (typeof mensaje !== "string" || mensaje.trim() === "") {
      return;
    }

    this.combatLogText.textContent = mensaje;
  }
}
