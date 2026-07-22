import {
  ESTADOS_HOSTILIDAD_VISUAL,
  TIPOS_ENTIDAD_VISUAL,
} from "./TiposEscena.js";

import { CargadorImagenes } from "./CargadorImagenes.js";

// Colores utilizados por los respaldos ASCII
// y los indicadores de estado.
//
// Los sprites se dibujan directamente sobre el mapa,
// sin círculos de fondo ni anillos alrededor.
const ESTILOS_ENTIDADES = {
  [TIPOS_ENTIDAD_VISUAL.JUGADOR]: {
    colorSimbolo: "#ffe66d",

    colorFondoRespaldo: "rgba(52, 46, 15, 0.90)",

    colorBordeRespaldo: "#d6bd45",
  },

  [TIPOS_ENTIDAD_VISUAL.ENEMIGO]: {
    colorSimbolo: "#ffb0b0",

    colorFondoRespaldo: "rgba(55, 16, 21, 0.90)",

    colorBordeRespaldo: "#bd4b55",

    colorAgresividad: "#ff3f4d",
  },

  [TIPOS_ENTIDAD_VISUAL.DESTRUCTIBLE]: {
    colorSimbolo: "#e2b276",

    colorFondoRespaldo: "rgba(52, 34, 17, 0.88)",

    colorBordeRespaldo: "#a97942",
  },

  // Los NPC, portales y botines reciben
  // colores propios cuando necesitan usar
  // su símbolo de respaldo.
  [TIPOS_ENTIDAD_VISUAL.INTERACTUABLE]: {
    colorSimbolo: "#c8f1ff",

    colorFondoRespaldo: "rgba(18, 48, 61, 0.90)",

    colorBordeRespaldo: "#68b7d3",
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
  // dentro del panel que contiene el mapa.
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

  // Permite detener el observador cuando
  // en el futuro exista destrucción o
  // reemplazo de una partida.
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

  // Dibuja todas las casillas del mapa.
  //
  // Los mapas procedurales pueden continuar usando
  // colorSuelo y colorPared.
  //
  // Los mapas fijos pueden declarar una apariencia
  // distinta para cada símbolo de terreno.
  dibujarMapa({ casillas, apariencia = {} }) {
    const colorSuelo = apariencia.colorSuelo ?? "#252b45";

    const colorPared = apariencia.colorPared ?? "#5468d4";

    const colorGrilla = apariencia.colorGrilla ?? "#171b2e";

    const terrenos = apariencia.terrenos ?? {};

    for (let y = 0; y < casillas.length; y++) {
      for (let x = 0; x < casillas[y].length; x++) {
        const pixelX = x * this.tileSize;

        const pixelY = y * this.tileSize;

        const simbolo = casillas[y][x];

        const configuracionTerreno = terrenos[simbolo] ?? {};

        const tipoTerreno =
          configuracionTerreno.tipo ?? (simbolo === "#" ? "pared" : "suelo");

        if (tipoTerreno === "pared") {
          this.dibujarPared({
            x,
            y,
            pixelX,
            pixelY,

            colorPared: configuracionTerreno.color ?? colorPared,

            detalle: configuracionTerreno.detalle ?? "piedra",
          });
        } else {
          this.dibujarSuelo({
            x,
            y,
            pixelX,
            pixelY,

            colorSuelo: configuracionTerreno.color ?? colorSuelo,

            detalle: configuracionTerreno.detalle ?? "natural",
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
  dibujarSuelo({ x, y, pixelX, pixelY, colorSuelo, detalle = "natural" }) {
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

    this.dibujarDetalleSuelo({
      detalle,
      hash,
      pixelX,
      pixelY,
    });

    this.context.restore();
  }

  // Agrega patrones sencillos para que la ciudad
  // pueda distinguir caminos, césped, madera y tierra
  // sin necesitar todavía un tileset externo.
  dibujarDetalleSuelo({ detalle, hash, pixelX, pixelY }) {
    switch (detalle) {
      case "adoquin":
        this.dibujarDetalleAdoquin({
          hash,
          pixelX,
          pixelY,
        });
        break;

      case "cesped":
        this.dibujarDetalleCesped({
          hash,
          pixelX,
          pixelY,
        });
        break;

      case "madera":
        this.dibujarDetalleMadera({
          hash,
          pixelX,
          pixelY,
        });
        break;

      case "tierra":
        this.dibujarDetalleTierra({
          hash,
          pixelX,
          pixelY,
        });
        break;

      default:
        this.dibujarDetalleNatural({
          hash,
          pixelX,
          pixelY,
        });
    }
  }

  dibujarDetalleAdoquin({ hash, pixelX, pixelY }) {
    const mitad = Math.floor(this.tileSize / 2);

    this.context.strokeStyle = "rgba(20, 20, 22, 0.18)";

    this.context.lineWidth = 1;

    this.context.beginPath();

    this.context.moveTo(pixelX + 1, pixelY + mitad + 0.5);

    this.context.lineTo(
      pixelX + this.tileSize - 1,

      pixelY + mitad + 0.5,
    );

    const desplazamiento = hash % 2 === 0 ? mitad : Math.floor(mitad * 0.55);

    this.context.moveTo(
      pixelX + desplazamiento + 0.5,

      pixelY + 1,
    );

    this.context.lineTo(
      pixelX + desplazamiento + 0.5,

      pixelY + mitad,
    );

    this.context.moveTo(
      pixelX + this.tileSize - desplazamiento + 0.5,

      pixelY + mitad,
    );

    this.context.lineTo(
      pixelX + this.tileSize - desplazamiento + 0.5,

      pixelY + this.tileSize - 1,
    );

    this.context.stroke();

    this.context.fillStyle = "rgba(255, 255, 255, 0.06)";

    this.context.fillRect(
      pixelX + 4 + (hash % 7),

      pixelY + 4 + ((hash >>> 6) % 7),

      2,
      1,
    );
  }

  dibujarDetalleCesped({ hash, pixelX, pixelY }) {
    const cantidad = 1 + (hash % 3);

    this.context.strokeStyle = "rgba(210, 245, 190, 0.18)";

    this.context.lineWidth = 1;

    for (let indice = 0; indice < cantidad; indice++) {
      const baseX =
        pixelX +
        5 +
        ((hash >>> (indice * 5)) % Math.max(1, this.tileSize - 10));

      const baseY =
        pixelY +
        8 +
        ((hash >>> (indice * 7 + 3)) % Math.max(1, this.tileSize - 13));

      this.context.beginPath();

      this.context.moveTo(baseX, baseY + 3);

      this.context.lineTo(baseX - 1, baseY);

      this.context.moveTo(baseX, baseY + 3);

      this.context.lineTo(baseX + 2, baseY + 1);

      this.context.stroke();
    }
  }

  dibujarDetalleMadera({ hash, pixelX, pixelY }) {
    const altoTabla = Math.max(
      5,

      Math.floor(this.tileSize / 3),
    );

    this.context.strokeStyle = "rgba(25, 13, 7, 0.22)";

    this.context.lineWidth = 1;

    this.context.beginPath();

    for (let y = altoTabla; y < this.tileSize; y += altoTabla) {
      this.context.moveTo(pixelX + 1, pixelY + y + 0.5);

      this.context.lineTo(
        pixelX + this.tileSize - 1,

        pixelY + y + 0.5,
      );
    }

    const unionX = pixelX + 6 + (hash % Math.max(1, this.tileSize - 12));

    this.context.moveTo(unionX + 0.5, pixelY + 1);

    this.context.lineTo(unionX + 0.5, pixelY + altoTabla);

    this.context.stroke();

    this.context.fillStyle = "rgba(255, 238, 190, 0.09)";

    this.context.fillRect(pixelX + 3, pixelY + 3, this.tileSize - 6, 1);
  }

  dibujarDetalleTierra({ hash, pixelX, pixelY }) {
    const cantidad = 2 + (hash % 3);

    for (let indice = 0; indice < cantidad; indice++) {
      const puntoX =
        pixelX + 4 + ((hash >>> (indice * 4)) % Math.max(1, this.tileSize - 8));

      const puntoY =
        pixelY +
        4 +
        ((hash >>> (indice * 6 + 2)) % Math.max(1, this.tileSize - 8));

      this.context.fillStyle =
        indice % 2 === 0
          ? "rgba(25, 15, 8, 0.18)"
          : "rgba(255, 235, 190, 0.08)";

      this.context.fillRect(puntoX, puntoY, 1, 1);
    }
  }

  dibujarDetalleNatural({ hash, pixelX, pixelY }) {
    // Algunas casillas reciben una pequeña
    // marca visual similar a una piedra
    // o irregularidad del terreno.
    if (hash % 3 !== 0) {
      return;
    }

    const espacioDisponible = Math.max(1, this.tileSize - 10);

    const detalleX = pixelX + 5 + (hash % espacioDisponible);

    const detalleY = pixelY + 5 + ((hash >>> 8) % espacioDisponible);

    this.context.fillStyle = "rgba(255, 255, 255, 0.08)";

    this.context.fillRect(detalleX, detalleY, 1, 1);

    this.context.fillStyle = "rgba(0, 0, 0, 0.10)";

    this.context.fillRect(detalleX + 1, detalleY + 1, 1, 1);
  }

  // Dibuja una pared con borde superior claro
  // y borde inferior oscuro para simular volumen.
  dibujarPared({ x, y, pixelX, pixelY, colorPared, detalle = "piedra" }) {
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

    if (detalle === "mamposteria") {
      this.dibujarDetalleMamposteria({
        hash,
        pixelX,
        pixelY,
      });
    }

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

  dibujarDetalleMamposteria({ hash, pixelX, pixelY }) {
    const mitad = Math.floor(this.tileSize / 2);

    this.context.strokeStyle = "rgba(15, 18, 22, 0.20)";

    this.context.lineWidth = 1;

    this.context.beginPath();

    this.context.moveTo(pixelX + 1, pixelY + mitad + 0.5);

    this.context.lineTo(
      pixelX + this.tileSize - 1,

      pixelY + mitad + 0.5,
    );

    const unionSuperior =
      pixelX + (hash % 2 === 0 ? mitad : Math.floor(mitad * 0.65));

    this.context.moveTo(unionSuperior + 0.5, pixelY + 2);

    this.context.lineTo(unionSuperior + 0.5, pixelY + mitad);

    const unionInferior =
      pixelX +
      this.tileSize -
      (hash % 2 === 0 ? Math.floor(mitad * 0.65) : mitad);

    this.context.moveTo(unionInferior + 0.5, pixelY + mitad);

    this.context.lineTo(
      unionInferior + 0.5,

      pixelY + this.tileSize - 2,
    );

    this.context.stroke();
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
  // - Una sombra rectangular muy sutil.
  // - La imagen directamente sobre el mapa.
  // - Un respaldo cuadrado cuando no existe imagen.
  // - Un indicador de hostilidad para enemigos agresivos.
  // - Una barra de Vida opcional.
  //
  // Ya no se dibujan círculos de fondo,
  // bordes circulares ni anillos de agresividad.
  dibujarEntidad(entidad) {
    const estilo =
      ESTILOS_ENTIDADES[entidad.tipo] ??
      ESTILOS_ENTIDADES[TIPOS_ENTIDAD_VISUAL.DESTRUCTIBLE];

    const pixelX = entidad.x * this.tileSize;

    const pixelY = entidad.y * this.tileSize;

    const centroX = pixelX + this.tileSize / 2;

    const centroY = pixelY + this.tileSize / 2;

    this.context.save();

    this.dibujarSombraEntidad({
      centroX,
      pixelY,
    });

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

    if (
      entidad.tipo === TIPOS_ENTIDAD_VISUAL.ENEMIGO &&
      entidad.estadoHostilidad === ESTADOS_HOSTILIDAD_VISUAL.AGRESIVO
    ) {
      this.dibujarIndicadorAgresividad({
        pixelX,
        pixelY,

        color: estilo.colorAgresividad,
      });
    }

    this.context.restore();

    if (entidad.mostrarBarraVida) {
      this.dibujarBarraVida(entidad, pixelX, pixelY);
    }
  }

  // Conserva una referencia de profundidad
  // sin volver a encerrar cada sprite en una figura.
  dibujarSombraEntidad({ centroX, pixelY }) {
    const ancho = Math.max(
      10,

      Math.floor(this.tileSize * 0.48),
    );

    const alto = Math.max(
      2,

      Math.floor(this.tileSize * 0.08),
    );

    this.context.fillStyle = "rgba(0, 0, 0, 0.30)";

    this.context.fillRect(
      Math.round(centroX - ancho / 2),

      Math.round(pixelY + this.tileSize * 0.78),

      ancho,
      alto,
    );
  }

  // Dibuja un sprite pixel-art centrado.
  //
  // Se utilizan posiciones y tamaños enteros
  // para conservar píxeles nítidos.
  dibujarImagenEntidad({ imagen, centroX, centroY }) {
    const tamano = Math.max(
      16,

      Math.floor(this.tileSize * 0.78),
    );

    const x = Math.round(centroX - tamano / 2);

    const y = Math.round(centroY - tamano / 2);

    this.context.imageSmoothingEnabled = false;

    // La sombra pertenece al sprite y no forma
    // un círculo alrededor de la entidad.
    this.context.shadowColor = "rgba(0, 0, 0, 0.58)";

    this.context.shadowBlur = 2;

    this.context.shadowOffsetX = 1;

    this.context.shadowOffsetY = 2;

    this.context.drawImage(imagen, x, y, tamano, tamano);

    this.context.shadowColor = "transparent";

    this.context.shadowBlur = 0;

    this.context.shadowOffsetX = 0;

    this.context.shadowOffsetY = 0;
  }

  // Conserva el sistema ASCII como respaldo
  // para imágenes ausentes o fallidas.
  //
  // En lugar del círculo anterior, utiliza
  // una placa cuadrada compacta.
  dibujarSimboloEntidad({ entidad, estilo, centroX, centroY }) {
    const tamanoFondo = Math.max(
      18,

      Math.floor(this.tileSize * 0.68),
    );

    const inicioX = Math.round(centroX - tamanoFondo / 2);

    const inicioY = Math.round(centroY - tamanoFondo / 2);

    this.context.fillStyle = estilo.colorFondoRespaldo;

    this.context.fillRect(inicioX, inicioY, tamanoFondo, tamanoFondo);

    this.context.strokeStyle = estilo.colorBordeRespaldo;

    this.context.lineWidth = 2;

    this.context.strokeRect(
      inicioX + 0.5,
      inicioY + 0.5,
      tamanoFondo - 1,
      tamanoFondo - 1,
    );

    this.context.fillStyle = estilo.colorSimbolo;

    this.context.font = `bold ${Math.max(
      12,

      Math.floor(this.tileSize * 0.54),
    )}px monospace`;

    this.context.textAlign = "center";

    this.context.textBaseline = "middle";

    this.context.shadowColor = "rgba(0, 0, 0, 0.75)";

    this.context.shadowBlur = 2;

    this.context.shadowOffsetY = 1;

    this.context.fillText(entidad.simbolo, centroX, centroY + 1);

    this.context.shadowColor = "transparent";

    this.context.shadowBlur = 0;

    this.context.shadowOffsetY = 0;
  }

  // Muestra un rombo pequeño con "!" cuando
  // el enemigo ya detectó al jugador y está
  // persiguiendo o atacando.
  //
  // Los enemigos pasivos no reciben ninguna marca,
  // por lo que la lectura queda limpia hasta que
  // existe una amenaza real.
  dibujarIndicadorAgresividad({ pixelX, pixelY, color }) {
    const tamano = Math.max(
      7,

      Math.floor(this.tileSize * 0.25),
    );

    const centroIndicadorX = pixelX + this.tileSize - Math.ceil(tamano * 0.75);

    // Se coloca debajo de la barra de Vida
    // para que ambos indicadores puedan convivir.
    const centroIndicadorY = pixelY + Math.ceil(this.tileSize * 0.32);

    this.context.save();

    this.context.translate(centroIndicadorX, centroIndicadorY);

    this.context.rotate(Math.PI / 4);

    this.context.fillStyle = "rgba(55, 8, 13, 0.94)";

    this.context.fillRect(-tamano / 2, -tamano / 2, tamano, tamano);

    this.context.strokeStyle = color;

    this.context.lineWidth = 2;

    this.context.strokeRect(
      -tamano / 2 + 0.5,
      -tamano / 2 + 0.5,
      tamano - 1,
      tamano - 1,
    );

    this.context.restore();

    this.context.save();

    this.context.fillStyle = "#ffffff";

    this.context.font = `bold ${Math.max(
      8,

      Math.floor(tamano * 0.95),
    )}px monospace`;

    this.context.textAlign = "center";

    this.context.textBaseline = "middle";

    this.context.shadowColor = "rgba(0, 0, 0, 0.9)";

    this.context.shadowBlur = 1;

    this.context.fillText("!", centroIndicadorX, centroIndicadorY + 0.5);

    this.context.restore();
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

      Math.min(
        1,

        entidad.vidaActual / entidad.vidaMaxima,
      ),
    );

    const margen = 3;

    const anchoTotal = this.tileSize - margen * 2;

    const alto = Math.max(
      3,

      Math.floor(this.tileSize * 0.11),
    );

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

      Math.max(
        0,

        (anchoTotal - 2) * porcentaje,
      ),

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

    const longitud = Math.max(
      6,

      Math.floor(this.tileSize * 0.25),
    );

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
