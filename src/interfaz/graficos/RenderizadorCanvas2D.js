import { TIPOS_ENTIDAD_VISUAL } from "./TiposEscena.js";

import { CargadorImagenes } from "./CargadorImagenes.js";

// Colores utilizados por cada categoría
// de entidad.
//
// Más adelante estos valores podrán moverse
// a una configuración visual o reemplazarse
// por sprites.
const ESTILOS_ENTIDADES = {
  [TIPOS_ENTIDAD_VISUAL.JUGADOR]: {
    colorSimbolo: "#ffe66d",
    colorFondo: "rgba(52, 46, 15, 0.90)",
    colorBorde: "#d6bd45",
  },

  [TIPOS_ENTIDAD_VISUAL.ENEMIGO]: {
    colorSimbolo: "#ffb0b0",
    colorFondo: "rgba(55, 16, 21, 0.90)",
    colorBorde: "#bd4b55",
    colorAgresividad: "#ff3f4d",
  },

  [TIPOS_ENTIDAD_VISUAL.DESTRUCTIBLE]: {
    colorSimbolo: "#e2b276",
    colorFondo: "rgba(52, 34, 17, 0.88)",
    colorBorde: "#a97942",
  },
};

// Implementación gráfica basada exclusivamente
// en la API Canvas 2D del navegador.
//
// Esta clase no conoce:
//
// - Juego.
// - Player.
// - Enemigo.
// - Combate.
// - Inventario.
// - Paneles.
//
// Solamente recibe una escena visual preparada
// por AdaptadorEscenaJuego.
export class RenderizadorCanvas2D {
  constructor({ canvas, contenedor, tileSize } = {}) {
    if (!canvas) {
      throw new Error("RenderizadorCanvas2D necesita un canvas.");
    }

    if (!contenedor) {
      throw new Error("RenderizadorCanvas2D necesita el contenedor del mapa.");
    }

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("No se pudo obtener el contexto 2D del canvas.");
    }

    if (!Number.isInteger(tileSize) || tileSize <= 0) {
      throw new Error("El tamaño de las casillas debe ser mayor que 0.");
    }

    this.canvas = canvas;
    this.contenedor = contenedor;
    this.context = context;
    this.tileSize = tileSize;

    // Conservamos la última escena para volver
    // a dibujarla cuando termine de cargar una imagen.
    this.ultimaEscena = null;
    this.redibujoPendiente = false;

    // La carga y caché quedan aisladas dentro
    // del backend Canvas 2D.
    this.cargadorImagenes = new CargadorImagenes({
      alActualizar: () => {
        this.programarRedibujo();
      },
    });

    // Evita el suavizado de píxeles cuando
    // el canvas cambia de tamaño visualmente.
    this.context.imageSmoothingEnabled = false;

    // Observamos el panel que contiene el mapa.
    //
    // Cuando cambia el tamaño de la ventana,
    // de las columnas laterales o del propio panel,
    // recalculamos la escala visual del canvas.
    this.observadorDimensiones = new ResizeObserver(() => {
      this.ajustarTamanoVisual();
    });

    this.observadorDimensiones.observe(this.contenedor);
  }

  // Ajusta el tamaño interno del canvas
  // según las dimensiones lógicas del mapa.
  //
  // El tamaño interno conserva el TILE_SIZE real.
  // El tamaño visual se calcula por separado para
  // que las casillas nunca se deformen.
  configurarDimensiones({ columnas, filas } = {}) {
    if (
      !Number.isInteger(columnas) ||
      columnas <= 0 ||
      !Number.isInteger(filas) ||
      filas <= 0
    ) {
      throw new Error(
        "Las dimensiones gráficas deben utilizar enteros mayores que 0.",
      );
    }

    this.canvas.width = columnas * this.tileSize;

    this.canvas.height = filas * this.tileSize;

    // Cambiar width o height reinicia
    // las propiedades del contexto.
    this.context.imageSmoothingEnabled = false;

    this.ajustarTamanoVisual();
  }

  // Calcula el mayor tamaño posible para el canvas
  // dentro de su panel conservando la proporción.
  //
  // Como ancho y alto utilizan la misma escala,
  // todas las casillas continúan siendo cuadradas.
  ajustarTamanoVisual() {
    const espacioDisponible = this.obtenerEspacioDisponible();

    if (
      espacioDisponible.ancho <= 0 ||
      espacioDisponible.alto <= 0 ||
      this.canvas.width <= 0 ||
      this.canvas.height <= 0
    ) {
      // El panel puede estar oculto durante
      // la creación inicial de la partida.
      //
      // ResizeObserver volverá a ejecutar este
      // método cuando la pantalla sea visible.
      return;
    }

    const escalaHorizontal = espacioDisponible.ancho / this.canvas.width;

    const escalaVertical = espacioDisponible.alto / this.canvas.height;

    // Utilizamos una sola escala para ambos ejes.
    //
    // Esto evita que una casilla de 32 × 32
    // termine representándose, por ejemplo,
    // como una casilla de 48 × 28.
    const escalaVisual = Math.min(escalaHorizontal, escalaVertical);

    const anchoVisual = this.canvas.width * escalaVisual;

    const altoVisual = this.canvas.height * escalaVisual;

    this.canvas.style.width = `${anchoVisual}px`;

    this.canvas.style.height = `${altoVisual}px`;
  }

  // Obtiene el espacio interior realmente disponible
  // dentro del panel del mapa.
  //
  // Se descuentan:
  //
  // - Padding del panel.
  // - Bordes del canvas.
  //
  // De esta manera el canvas completo queda visible
  // y no se corta en los extremos.
  obtenerEspacioDisponible() {
    const estiloContenedor = window.getComputedStyle(this.contenedor);

    const estiloCanvas = window.getComputedStyle(this.canvas);

    const paddingHorizontal =
      convertirPixeles(estiloContenedor.paddingLeft) +
      convertirPixeles(estiloContenedor.paddingRight);

    const paddingVertical =
      convertirPixeles(estiloContenedor.paddingTop) +
      convertirPixeles(estiloContenedor.paddingBottom);

    const bordeHorizontal =
      convertirPixeles(estiloCanvas.borderLeftWidth) +
      convertirPixeles(estiloCanvas.borderRightWidth);

    const bordeVertical =
      convertirPixeles(estiloCanvas.borderTopWidth) +
      convertirPixeles(estiloCanvas.borderBottomWidth);

    return {
      ancho: Math.max(
        0,
        this.contenedor.clientWidth - paddingHorizontal - bordeHorizontal,
      ),

      alto: Math.max(
        0,
        this.contenedor.clientHeight - paddingVertical - bordeVertical,
      ),
    };
  }

  // Permite detener el observador cuando en el futuro
  // exista destrucción o reemplazo de una partida.
  destruir() {
    this.observadorDimensiones?.disconnect();

    this.cargadorImagenes?.destruir();

    this.ultimaEscena = null;
  }

  // Dibuja una escena completa.
  dibujar(escena) {
    validarEscena(escena);

    // Guardamos la escena plana, no la instancia
    // completa de Juego.
    this.ultimaEscena = escena;

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.dibujarMapa(escena.mapa);

    if (escena.combate.activo) {
      this.dibujarRangoCombate(escena.combate.casillasAtacables);
    }

    this.dibujarEntidades(escena.entidades);

    if (escena.combate.activo && escena.combate.selector) {
      this.dibujarSelectorCombate(escena.combate.selector);
    }
  }

  // Dibuja todas las casillas del mapa
  // utilizando los colores del bioma.
  dibujarMapa({ casillas, apariencia = {} }) {
    const colorSuelo = apariencia.colorSuelo ?? "#252b45";

    const colorPared = apariencia.colorPared ?? "#5468d4";

    const colorGrilla = apariencia.colorGrilla ?? "#171b2e";

    for (let y = 0; y < casillas.length; y++) {
      for (let x = 0; x < casillas[y].length; x++) {
        const pixelX = x * this.tileSize;

        const pixelY = y * this.tileSize;

        if (casillas[y][x] === "#") {
          this.dibujarPared({
            x,
            y,
            pixelX,
            pixelY,
            colorPared,
          });
        } else {
          this.dibujarSuelo({
            x,
            y,
            pixelX,
            pixelY,
            colorSuelo,
          });
        }

        this.dibujarGrilla({
          pixelX,
          pixelY,
          colorGrilla,
        });
      }
    }
  }

  // Dibuja una casilla de suelo con una
  // variación sutil y determinista.
  //
  // No utilizamos Math.random porque provocaría
  // cambios visuales en cada redibujado.
  dibujarSuelo({ x, y, pixelX, pixelY, colorSuelo }) {
    const hash = obtenerHashCasilla(x, y);

    this.context.fillStyle = colorSuelo;

    this.context.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);

    this.context.save();

    // Alternamos una sombra o luz muy suave
    // para romper la uniformidad del suelo.
    this.context.fillStyle =
      hash % 2 === 0 ? "rgba(255, 255, 255, 0.025)" : "rgba(0, 0, 0, 0.04)";

    this.context.fillRect(
      pixelX + 1,
      pixelY + 1,
      this.tileSize - 2,
      this.tileSize - 2,
    );

    // Algunas casillas reciben una pequeña
    // marca visual similar a una piedra
    // o irregularidad del terreno.
    if (hash % 3 === 0) {
      const espacioDisponible = Math.max(1, this.tileSize - 10);

      const detalleX = pixelX + 5 + (hash % espacioDisponible);

      const detalleY = pixelY + 5 + ((hash >>> 8) % espacioDisponible);

      this.context.fillStyle = "rgba(255, 255, 255, 0.08)";

      this.context.fillRect(detalleX, detalleY, 1, 1);

      this.context.fillStyle = "rgba(0, 0, 0, 0.10)";

      this.context.fillRect(detalleX + 1, detalleY + 1, 1, 1);
    }

    this.context.restore();
  }

  // Dibuja una pared con borde superior claro
  // y borde inferior oscuro para simular volumen.
  dibujarPared({ x, y, pixelX, pixelY, colorPared }) {
    const hash = obtenerHashCasilla(x, y);

    this.context.fillStyle = colorPared;

    this.context.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);

    this.context.save();

    // Luz superior.
    this.context.fillStyle = "rgba(255, 255, 255, 0.14)";

    this.context.fillRect(pixelX + 1, pixelY + 1, this.tileSize - 2, 2);

    // Luz lateral.
    this.context.fillStyle = "rgba(255, 255, 255, 0.07)";

    this.context.fillRect(pixelX + 1, pixelY + 3, 1, this.tileSize - 5);

    // Sombra inferior.
    this.context.fillStyle = "rgba(0, 0, 0, 0.22)";

    this.context.fillRect(
      pixelX + 1,
      pixelY + this.tileSize - 3,
      this.tileSize - 2,
      2,
    );

    // Sombra lateral.
    this.context.fillStyle = "rgba(0, 0, 0, 0.13)";

    this.context.fillRect(
      pixelX + this.tileSize - 2,
      pixelY + 3,
      1,
      this.tileSize - 6,
    );

    // Algunas paredes muestran una grieta
    // simple y determinista.
    if (hash % 5 === 0) {
      const inicioX = pixelX + Math.floor(this.tileSize * 0.35);

      const inicioY = pixelY + Math.floor(this.tileSize * 0.3);

      this.context.strokeStyle = "rgba(0, 0, 0, 0.18)";

      this.context.lineWidth = 1;

      this.context.beginPath();

      this.context.moveTo(inicioX, inicioY);

      this.context.lineTo(inicioX + 3, inicioY + 4);

      this.context.lineTo(inicioX + 1, inicioY + 8);

      this.context.stroke();
    }

    this.context.restore();
  }

  // Dibuja la división entre casillas
  // con menor intensidad que el sistema anterior.
  dibujarGrilla({ pixelX, pixelY, colorGrilla }) {
    this.context.save();

    this.context.globalAlpha = 0.58;
    this.context.strokeStyle = colorGrilla;
    this.context.lineWidth = 1;

    // El desplazamiento de medio píxel ayuda
    // a obtener líneas de un píxel más nítidas.
    this.context.strokeRect(
      pixelX + 0.5,
      pixelY + 0.5,
      this.tileSize - 1,
      this.tileSize - 1,
    );

    this.context.restore();
  }

  // Resalta las casillas válidas de ataque
  // sin ocultar excesivamente el terreno.
  dibujarRangoCombate(casillas) {
    for (const casilla of casillas) {
      const pixelX = casilla.x * this.tileSize;

      const pixelY = casilla.y * this.tileSize;

      this.context.save();

      this.context.fillStyle = "rgba(220, 55, 55, 0.13)";

      this.context.fillRect(
        pixelX + 1,
        pixelY + 1,
        this.tileSize - 2,
        this.tileSize - 2,
      );

      this.context.strokeStyle = "rgba(255, 110, 110, 0.28)";

      this.context.lineWidth = 1;

      this.context.strokeRect(
        pixelX + 1.5,
        pixelY + 1.5,
        this.tileSize - 3,
        this.tileSize - 3,
      );

      this.context.restore();
    }
  }

  // Dibuja todas las entidades visibles.
  dibujarEntidades(entidades) {
    for (const entidad of entidades) {
      this.dibujarEntidad(entidad);
    }
  }

  // Dibuja una entidad utilizando:
  //
  // - Sombra.
  // - Fondo.
  // - Borde.
  // - Imagen o símbolo de respaldo.
  // - Barra de Vida opcional.
  dibujarEntidad(entidad) {
    const estilo =
      ESTILOS_ENTIDADES[entidad.tipo] ??
      ESTILOS_ENTIDADES[TIPOS_ENTIDAD_VISUAL.DESTRUCTIBLE];

    const pixelX = entidad.x * this.tileSize;

    const pixelY = entidad.y * this.tileSize;

    const centroX = pixelX + this.tileSize / 2;

    const centroY = pixelY + this.tileSize / 2;

    const radio = this.tileSize * 0.31;

    this.context.save();

    // Sombra debajo de la entidad.
    this.context.fillStyle = "rgba(0, 0, 0, 0.34)";

    this.context.beginPath();

    this.context.ellipse(
      centroX,
      centroY + this.tileSize * 0.2,
      radio * 0.85,
      radio * 0.36,
      0,
      0,
      Math.PI * 2,
    );

    this.context.fill();

    // Los enemigos que detectaron al jugador
    // conservan el anillo rojo.
    if (entidad.tipo === TIPOS_ENTIDAD_VISUAL.ENEMIGO && entidad.estaAgresiva) {
      this.context.strokeStyle = estilo.colorAgresividad;

      this.context.lineWidth = 3;

      this.context.beginPath();

      this.context.arc(centroX, centroY, radio + 2, 0, Math.PI * 2);

      this.context.stroke();
    }

    // Fondo de contraste.
    this.context.fillStyle = estilo.colorFondo;

    this.context.beginPath();

    this.context.arc(centroX, centroY, radio, 0, Math.PI * 2);

    this.context.fill();

    // Borde principal.
    this.context.strokeStyle = estilo.colorBorde;

    this.context.lineWidth = 2;
    this.context.stroke();

    const imagen = this.cargadorImagenes.obtener(entidad.recursoVisual);

    if (imagen) {
      this.dibujarImagenEntidad({
        imagen,
        centroX,
        centroY,
      });
    } else {
      this.dibujarSimboloEntidad({
        entidad,
        estilo,
        centroX,
        centroY,
      });
    }

    this.context.restore();

    if (entidad.mostrarBarraVida) {
      this.dibujarBarraVida(entidad, pixelX, pixelY);
    }
  }

  // Dibuja un sprite pixel-art centrado.
  //
  // Se utilizan posiciones y tamaños enteros
  // para conservar píxeles nítidos.
  dibujarImagenEntidad({ imagen, centroX, centroY }) {
    const tamano = Math.max(16, Math.floor(this.tileSize * 0.72));

    const x = Math.round(centroX - tamano / 2);

    const y = Math.round(centroY - tamano / 2);

    this.context.imageSmoothingEnabled = false;

    this.context.drawImage(imagen, x, y, tamano, tamano);
  }

  // Conserva el sistema ASCII como respaldo
  // para jugador, barriles o imágenes faltantes.
  dibujarSimboloEntidad({ entidad, estilo, centroX, centroY }) {
    this.context.fillStyle = estilo.colorSimbolo;

    this.context.font = `bold ${Math.max(
      12,
      Math.floor(this.tileSize * 0.58),
    )}px monospace`;

    this.context.textAlign = "center";
    this.context.textBaseline = "middle";

    this.context.shadowColor = "rgba(0, 0, 0, 0.75)";

    this.context.shadowBlur = 2;
    this.context.shadowOffsetY = 1;

    this.context.fillText(entidad.simbolo, centroX, centroY + 1);
  }

  // Agrupa varias cargas terminadas dentro
  // de un único redibujado del navegador.
  programarRedibujo() {
    if (this.redibujoPendiente || !this.ultimaEscena) {
      return;
    }

    this.redibujoPendiente = true;

    requestAnimationFrame(() => {
      this.redibujoPendiente = false;

      if (this.ultimaEscena) {
        this.dibujar(this.ultimaEscena);
      }
    });
  }

  // Muestra la barra únicamente cuando
  // un enemigo ya recibió daño.
  dibujarBarraVida(entidad, pixelX, pixelY) {
    const porcentaje = Math.max(
      0,
      Math.min(1, entidad.vidaActual / entidad.vidaMaxima),
    );

    const margen = 3;

    const anchoTotal = this.tileSize - margen * 2;

    const alto = Math.max(3, Math.floor(this.tileSize * 0.11));

    const barraX = pixelX + margen;

    const barraY = pixelY + 2;

    let colorVida = "#55cf72";

    if (porcentaje <= 0.25) {
      colorVida = "#e55555";
    } else if (porcentaje <= 0.5) {
      colorVida = "#e4c44e";
    }

    this.context.save();

    this.context.fillStyle = "rgba(10, 10, 12, 0.90)";

    this.context.fillRect(barraX, barraY, anchoTotal, alto);

    this.context.fillStyle = colorVida;

    this.context.fillRect(
      barraX + 1,
      barraY + 1,
      Math.max(0, (anchoTotal - 2) * porcentaje),
      Math.max(1, alto - 2),
    );

    this.context.strokeStyle = "rgba(255, 255, 255, 0.35)";

    this.context.lineWidth = 1;

    this.context.strokeRect(
      barraX + 0.5,
      barraY + 0.5,
      anchoTotal - 1,
      alto - 1,
    );

    this.context.restore();
  }

  // Dibuja el selector mediante esquinas,
  // evitando cubrir por completo a la entidad
  // o casilla seleccionada.
  dibujarSelectorCombate(selector) {
    const pixelX = selector.x * this.tileSize;

    const pixelY = selector.y * this.tileSize;

    const color = selector.esValido ? "#ffe66d" : "#ff705c";

    const colorFondo = selector.esValido
      ? "rgba(255, 230, 90, 0.10)"
      : "rgba(255, 100, 70, 0.10)";

    const margen = 2;

    const inicioX = pixelX + margen;

    const inicioY = pixelY + margen;

    const finX = pixelX + this.tileSize - margen;

    const finY = pixelY + this.tileSize - margen;

    const longitud = Math.max(6, Math.floor(this.tileSize * 0.25));

    this.context.save();

    this.context.fillStyle = colorFondo;

    this.context.fillRect(
      pixelX + 1,
      pixelY + 1,
      this.tileSize - 2,
      this.tileSize - 2,
    );

    this.context.strokeStyle = color;
    this.context.lineWidth = 3;
    this.context.lineCap = "square";

    this.context.beginPath();

    // Esquina superior izquierda.
    this.context.moveTo(inicioX, inicioY + longitud);

    this.context.lineTo(inicioX, inicioY);

    this.context.lineTo(inicioX + longitud, inicioY);

    // Esquina superior derecha.
    this.context.moveTo(finX - longitud, inicioY);

    this.context.lineTo(finX, inicioY);

    this.context.lineTo(finX, inicioY + longitud);

    // Esquina inferior derecha.
    this.context.moveTo(finX, finY - longitud);

    this.context.lineTo(finX, finY);

    this.context.lineTo(finX - longitud, finY);

    // Esquina inferior izquierda.
    this.context.moveTo(inicioX + longitud, finY);

    this.context.lineTo(inicioX, finY);

    this.context.lineTo(inicioX, finY - longitud);

    this.context.stroke();
    this.context.restore();
  }
}

// Genera una variación estable a partir
// de la posición de una casilla.
function obtenerHashCasilla(x, y) {
  const valorX = Math.imul(x + 1, 73856093);

  const valorY = Math.imul(y + 1, 19349663);

  return (valorX ^ valorY) >>> 0;
}

// Comprueba el contrato mínimo
// de una escena gráfica.
function validarEscena(escena) {
  if (!escena || typeof escena !== "object") {
    throw new Error("RenderizadorCanvas2D necesita una escena válida.");
  }

  if (!escena.mapa || !Array.isArray(escena.mapa.casillas)) {
    throw new Error("La escena necesita un mapa válido.");
  }

  if (!escena.combate || typeof escena.combate !== "object") {
    throw new Error("La escena necesita información de combate.");
  }

  if (!Array.isArray(escena.entidades)) {
    throw new Error("La escena necesita una lista de entidades.");
  }
}

// Convierte un valor CSS expresado en píxeles
// a un número utilizable en los cálculos.
//
// Los valores vacíos o inválidos se consideran 0.
function convertirPixeles(valor) {
  const numero = Number.parseFloat(valor);

  return Number.isFinite(numero) ? numero : 0;
}
