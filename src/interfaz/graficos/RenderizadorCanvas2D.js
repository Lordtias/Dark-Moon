import { traducir, traducirContenido } from "../idiomas/ContextoIdioma.js";
import {
  ESTADOS_HOSTILIDAD_VISUAL,
  TIPOS_ENTIDAD_VISUAL,
} from "./TiposEscena.js";
import { TIPOS_EVENTO_VISUAL } from "./PlanificadorEventosVisuales.js";

import { CargadorImagenes } from "./CargadorImagenes.js";

// Colores utilizados por los respaldos ASCII
// y los indicadores de estado.
//
// Los sprites se dibujan directamente sobre el mapa,
// sin círculos de fondo ni anillos alrededor.
const OPACIDAD_INTERACTUABLE_INACTIVO = 0.38;

const INDICADORES_VARIANTE_ENEMIGO = {
  enfermo: {
    forma: "gota",
    colorPrincipal: "#4ecf69",
    colorBorde: "#173f21",
  },

  gigante: {
    forma: "rombo",
    colorPrincipal: "#ff9d3f",
    colorBorde: "#5c2f0d",
  },

  elite: {
    forma: "estrella",
    colorPrincipal: "#ffe66d",
    colorBorde: "#6b5412",
  },
};

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

    this.feedbackEstadosTemporales = [];
    this.pulsosEstadosTemporales = [];
    this.pulsosZonasTemporales = [];
    this.temporizadorFeedbackEstados = null;

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

    if (this.temporizadorFeedbackEstados !== null) {
      clearTimeout(this.temporizadorFeedbackEstados);
      this.temporizadorFeedbackEstados = null;
    }

    this.feedbackEstadosTemporales = [];
    this.pulsosEstadosTemporales = [];
    this.pulsosZonasTemporales = [];

    this.ultimaEscena = null;
  }

  // Dibuja una escena completa.
  dibujar(escena, { eventosVisuales = null } = {}) {
    validarEscena(escena);

    // Guardamos la escena plana, no la instancia
    // completa de Juego.
    this.ultimaEscena = escena;

    if (Array.isArray(eventosVisuales)) {
      this.actualizarFeedbackEstadosTemporales(eventosVisuales);
    }

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.dibujarMapa(escena.mapa);

    this.dibujarZonasTemporales(escena.zonasTemporales);
    this.dibujarPulsosZonasTemporales();

    if (escena.combate.activo) {
      this.dibujarRangoCombate(
        escena.combate.casillasAtacables,
        escena.combate.modo,
        escena.combate.habilidad,
      );
    }

    if (escena.combate.modo === "habilidad") {
      this.dibujarAreaHabilidad(
        escena.combate.casillasAfectadas,
        escena.combate.habilidad,
      );
      this.dibujarRecorridoHabilidad(
        escena.combate.recorrido,
        escena.combate.habilidad,
      );
    }

    this.dibujarEntidades(escena.entidades);

    this.dibujarPulsosEstadosTemporales(escena.entidades);
    this.dibujarFeedbackEstadosTemporales(escena.entidades);

    if (escena.combate.modo === "habilidad") {
      this.dibujarObjetivosHabilidad(
        escena.combate.objetivosAfectados,
        escena.combate.habilidad,
      );
    }

    if (escena.combate.activo && escena.combate.selector) {
      this.dibujarSelectorCombate(
        escena.combate.selector,
        escena.combate.habilidad,
      );
    }
  }

  actualizarFeedbackEstadosTemporales(eventosVisuales) {
    const tiposValidos = new Set([
      TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_APLICADO,
      TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_ACTUALIZADO,
    ]);

    const eventosEstados = eventosVisuales.flatMap((evento) => {
      const anidadosHabilidad = evento?.tipo === TIPOS_EVENTO_VISUAL.HABILIDAD_RESUELTA
        ? (evento.impactos ?? []).flatMap((impacto) => impacto.eventosEfectos ?? [])
        : [];
      const anidadosZona = evento?.tipo === TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_ACTIVADA
        ? evento.impacto?.eventosEfectos ?? []
        : [];
      return [evento, ...anidadosHabilidad, ...anidadosZona];
    });

    this.feedbackEstadosTemporales = eventosEstados
      .filter((evento) => tiposValidos.has(evento?.tipo))
      .map((evento) => crearFeedbackEstadoCanvas(evento))
      .filter(Boolean);

    this.pulsosEstadosTemporales = eventosVisuales
      .filter(
        (evento) => evento?.tipo === TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_TICK,
      )
      .map((evento) => crearPulsoEstadoCanvas(evento))
      .filter(Boolean);

    const tiposZona = new Set([
      TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_CREADA,
      TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_RENOVADA,
      TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_VENCIDA,
      TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_PULSO,
      TIPOS_EVENTO_VISUAL.ACTOR_ENTRO_ZONA_TEMPORAL,
      TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_ACTIVADA,
    ]);
    this.pulsosZonasTemporales = eventosVisuales
      .filter((evento) => tiposZona.has(evento?.tipo) && evento?.zona)
      .map((evento) => ({
        tipo: evento.tipo,
        zona: evento.zona,
        posicion:
          evento.destino ?? evento.impacto?.posicionObjetivo ?? null,
      }));

    if (this.temporizadorFeedbackEstados !== null) {
      clearTimeout(this.temporizadorFeedbackEstados);
      this.temporizadorFeedbackEstados = null;
    }

    if (
      this.feedbackEstadosTemporales.length === 0 &&
      this.pulsosEstadosTemporales.length === 0 &&
      this.pulsosZonasTemporales.length === 0
    ) return;

    this.temporizadorFeedbackEstados = setTimeout(() => {
      this.temporizadorFeedbackEstados = null;
      this.feedbackEstadosTemporales = [];
      this.pulsosEstadosTemporales = [];
      this.pulsosZonasTemporales = [];
      if (this.ultimaEscena) {
        this.dibujar(this.ultimaEscena);
      }
    }, 760);
  }

  dibujarPulsosEstadosTemporales(entidades) {
    if (this.pulsosEstadosTemporales.length === 0) return;
    const entidadesPorId = new Map(
      entidades.map((entidad) => [entidad.idVisual, entidad]),
    );

    this.context.save();
    this.context.lineWidth = Math.max(1, Math.floor(this.tileSize / 20));
    for (const pulso of this.pulsosEstadosTemporales) {
      const entidad = entidadesPorId.get(pulso.idObjetivo);
      if (!entidad) continue;
      const centroX = entidad.x * this.tileSize + this.tileSize / 2;
      const centroY = entidad.y * this.tileSize + this.tileSize / 2;
      const radio = Math.max(5, Math.floor(this.tileSize * 0.22));
      this.context.strokeStyle = pulso.colorSecundario;
      this.context.fillStyle = pulso.colorPrincipal;

      if (pulso.forma === "burbuja_estallido") {
        for (let indice = 0; indice < 3; indice += 1) {
          const x = centroX - radio + indice * radio;
          const y = centroY + 4 - (indice % 2) * 7;
          this.context.beginPath();
          this.context.arc(x, y, 2 + indice % 2, 0, Math.PI * 2);
          this.context.fill();
          this.context.stroke();
        }
      } else if (pulso.forma === "llamarada_ascendente") {
        this.context.beginPath();
        this.context.moveTo(centroX - 6, centroY + 8);
        this.context.lineTo(centroX - 1, centroY - 9);
        this.context.lineTo(centroX + 2, centroY - 2);
        this.context.lineTo(centroX + 6, centroY - 11);
        this.context.lineTo(centroX + 8, centroY + 8);
        this.context.closePath();
        this.context.fill();
      }
    }
    this.context.restore();
  }

  dibujarFeedbackEstadosTemporales(entidades) {
    if (this.feedbackEstadosTemporales.length === 0) return;
    const entidadesPorId = new Map(
      entidades.map((entidad) => [entidad.idVisual, entidad]),
    );

    this.context.save();
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
    this.context.font = `bold ${Math.max(11, Math.round(this.tileSize * 0.34))}px monospace`;
    this.context.lineWidth = Math.max(2, Math.floor(this.tileSize / 12));
    this.context.strokeStyle = "#11141a";

    for (const feedback of this.feedbackEstadosTemporales) {
      const entidad = entidadesPorId.get(feedback.idObjetivo);
      if (!entidad) continue;
      const x = entidad.x * this.tileSize + this.tileSize / 2;
      const y = entidad.y * this.tileSize + this.tileSize * 0.05;
      this.context.strokeText(feedback.texto, x, y);
      this.context.fillStyle = feedback.color;
      this.context.fillText(feedback.texto, x, y);
    }

    this.context.restore();
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

  // Dibuja las zonas persistentes después del terreno y antes de las
  // entidades. La representación depende de una apariencia genérica y no del
  // nombre de la habilidad que originó la zona.
  dibujarZonasTemporales(zonas) {
    for (const zona of zonas ?? []) {
      this.dibujarZonaTemporal(zona);
    }
  }

  dibujarZonaTemporal(zona) {
    const perfil = zona?.perfilVisual ?? null;
    const estilo = obtenerEstiloZonaTemporal(zona?.apariencia);
    const colorPrincipal = perfil?.colorPrincipal ?? estilo.borde;
    const colorSecundario = perfil?.colorSecundario ?? estilo.detalle;
    const opacidad = Number.isFinite(perfil?.opacidadBase)
      ? perfil.opacidadBase
      : 0.42;
    const densidad = Number.isInteger(perfil?.densidad)
      ? perfil.densidad
      : 3;

    for (const casilla of zona?.casillas ?? []) {
      const pixelX = casilla.x * this.tileSize;
      const pixelY = casilla.y * this.tileSize;
      const centroX = pixelX + this.tileSize / 2;
      const centroY = pixelY + this.tileSize / 2;
      const hash = obtenerHashCasilla(casilla.x, casilla.y);

      this.context.save();
      this.context.globalAlpha = Math.min(0.72, opacidad);
      this.context.fillStyle = colorPrincipal;
      this.context.beginPath();
      this.context.ellipse(
        centroX,
        centroY + this.tileSize * 0.18,
        this.tileSize * 0.38,
        this.tileSize * 0.2,
        0,
        0,
        Math.PI * 2,
      );
      this.context.fill();
      this.context.beginPath();
      this.context.ellipse(
        centroX - this.tileSize * 0.18,
        centroY - this.tileSize * 0.02,
        this.tileSize * 0.24,
        this.tileSize * 0.18,
        0,
        0,
        Math.PI * 2,
      );
      this.context.ellipse(
        centroX + this.tileSize * 0.16,
        centroY - this.tileSize * 0.08,
        this.tileSize * 0.28,
        this.tileSize * 0.2,
        0,
        0,
        Math.PI * 2,
      );
      this.context.fill();

      this.context.globalAlpha = Math.min(0.9, opacidad + 0.24);
      this.context.fillStyle = colorSecundario;
      for (let indice = 0; indice < densidad; indice += 1) {
        const espacio = Math.max(4, this.tileSize - 8);
        const x = pixelX + 4 + ((hash >>> (indice * 4)) % espacio);
        const y = pixelY + 4 + ((hash >>> (indice * 6 + 3)) % espacio);
        const radio = Math.max(1, Math.round(this.tileSize * (0.035 + (indice % 2) * 0.015)));
        this.context.beginPath();
        this.context.arc(x, y, radio, 0, Math.PI * 2);
        this.context.fill();
      }
      this.context.restore();
    }
  }

  dibujarPulsosZonasTemporales() {
    for (const pulso of this.pulsosZonasTemporales) {
      const zona = pulso.zona;
      const perfil = zona?.perfilVisual ?? null;
      const color = perfil?.colorSecundario ?? "#e4ffd1";
      const esVencimiento =
        pulso.tipo === TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_VENCIDA;
      const esRenovacion =
        pulso.tipo === TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_RENOVADA;
      const esPulso =
        pulso.tipo === TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_PULSO;
      const esEntrada =
        pulso.tipo === TIPOS_EVENTO_VISUAL.ACTOR_ENTRO_ZONA_TEMPORAL;
      const esActivacion =
        pulso.tipo === TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_ACTIVADA;
      const casillas = esEntrada || esActivacion
        ? (pulso.posicion ? [pulso.posicion] : [])
        : zona?.casillas ?? [];

      this.context.save();
      this.context.strokeStyle = color;
      this.context.lineWidth = esRenovacion || esActivacion ? 3 : 2;
      this.context.globalAlpha = esVencimiento
        ? 0.34
        : esPulso || esActivacion
          ? 0.86
          : 0.72;
      for (const casilla of casillas) {
        const centroX = casilla.x * this.tileSize + this.tileSize / 2;
        const centroY = casilla.y * this.tileSize + this.tileSize / 2;
        const radioX = this.tileSize * (
          esVencimiento ? 0.32 : esEntrada ? 0.34 : esActivacion ? 0.48 : 0.42
        );
        const radioY = this.tileSize * (
          esVencimiento ? 0.2 : esEntrada ? 0.24 : esActivacion ? 0.34 : 0.28
        );
        this.context.beginPath();
        this.context.ellipse(
          centroX,
          centroY,
          radioX,
          radioY,
          0,
          0,
          Math.PI * 2,
        );
        this.context.stroke();
        if (esPulso || esEntrada || esActivacion) {
          this.context.globalAlpha *= 0.65;
          this.context.beginPath();
          this.context.arc(
            centroX,
            centroY - this.tileSize * 0.08,
            this.tileSize * (esActivacion ? 0.18 : 0.13),
            0,
            Math.PI * 2,
          );
          this.context.stroke();
          this.context.globalAlpha /= 0.65;
        }
      }
      this.context.restore();
    }
  }

  // Resalta las casillas válidas de ataque
  // sin ocultar excesivamente el terreno.
  dibujarRangoCombate(casillas, modo = "combate", habilidad = null) {
    const esHabilidad = modo === "habilidad";
    const estiloHabilidad = obtenerEstiloSeleccionHabilidad(habilidad?.maestria);
    for (const casilla of casillas) {
      const pixelX = casilla.x * this.tileSize;

      const pixelY = casilla.y * this.tileSize;

      this.context.save();

      this.context.fillStyle = esHabilidad
        ? estiloHabilidad.rangoFondo
        : "rgba(220, 55, 55, 0.13)";

      this.context.fillRect(
        pixelX + 1,
        pixelY + 1,
        this.tileSize - 2,
        this.tileSize - 2,
      );

      this.context.strokeStyle = esHabilidad
        ? estiloHabilidad.rangoBorde
        : "rgba(255, 110, 110, 0.28)";

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

  // Destaca la forma que será afectada al confirmar la habilidad.
  dibujarAreaHabilidad(casillas, habilidad = null) {
    const estilo = obtenerEstiloSeleccionHabilidad(habilidad?.maestria);
    for (const casilla of casillas ?? []) {
      const pixelX = casilla.x * this.tileSize;
      const pixelY = casilla.y * this.tileSize;

      this.context.save();
      this.context.fillStyle = estilo.areaFondo;
      this.context.fillRect(
        pixelX + 2,
        pixelY + 2,
        this.tileSize - 4,
        this.tileSize - 4,
      );
      this.context.strokeStyle = estilo.areaBorde;
      this.context.lineWidth = 1;
      this.context.strokeRect(
        pixelX + 2.5,
        pixelY + 2.5,
        this.tileSize - 5,
        this.tileSize - 5,
      );
      this.context.restore();
    }
  }

  // Une visualmente los saltos de una forma de impacto en cadena.
  dibujarRecorridoHabilidad(recorrido, habilidad = null) {
    if (!Array.isArray(recorrido) || recorrido.length < 2) return;

    const pasos = [...recorrido].sort((a, b) => a.orden - b.orden);
    const estilo = obtenerEstiloSeleccionHabilidad(habilidad?.maestria);
    this.context.save();
    this.context.strokeStyle = estilo.recorrido;
    this.context.lineWidth = Math.max(2, Math.floor(this.tileSize * 0.08));
    this.context.lineJoin = "round";
    this.context.lineCap = "round";
    this.context.beginPath();

    pasos.forEach((paso, indice) => {
      const centroX = paso.x * this.tileSize + this.tileSize / 2;
      const centroY = paso.y * this.tileSize + this.tileSize / 2;
      if (indice === 0) this.context.moveTo(centroX, centroY);
      else this.context.lineTo(centroX, centroY);
    });

    this.context.stroke();
    this.context.restore();
  }

  // Marca los objetivos que recibirán daño o efectos y su orden de cadena.
  dibujarObjetivosHabilidad(objetivos, habilidad = null) {
    const estilo = obtenerEstiloSeleccionHabilidad(habilidad?.maestria);
    for (const objetivo of objetivos ?? []) {
      const pixelX = objetivo.x * this.tileSize;
      const pixelY = objetivo.y * this.tileSize;
      const margen = Math.max(3, Math.floor(this.tileSize * 0.12));
      const tamanoMarca = Math.max(10, Math.floor(this.tileSize * 0.34));

      this.context.save();
      this.context.strokeStyle = estilo.objetivoBorde;
      this.context.lineWidth = 2;
      this.context.strokeRect(
        pixelX + margen + 0.5,
        pixelY + margen + 0.5,
        this.tileSize - margen * 2 - 1,
        this.tileSize - margen * 2 - 1,
      );

      this.context.fillStyle = estilo.objetivoFondo;
      this.context.fillRect(
        pixelX + this.tileSize - tamanoMarca - 2,
        pixelY + 2,
        tamanoMarca,
        tamanoMarca,
      );
      this.context.strokeStyle = "rgba(245, 225, 255, 0.95)";
      this.context.strokeRect(
        pixelX + this.tileSize - tamanoMarca - 1.5,
        pixelY + 2.5,
        tamanoMarca - 1,
        tamanoMarca - 1,
      );
      this.context.fillStyle = "#ffffff";
      this.context.font = `bold ${Math.max(8, Math.floor(tamanoMarca * 0.7))}px monospace`;
      this.context.textAlign = "center";
      this.context.textBaseline = "middle";
      this.context.fillText(
        String((objetivo.orden ?? 0) + 1),
        pixelX + this.tileSize - tamanoMarca / 2 - 2,
        pixelY + tamanoMarca / 2 + 2,
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

    if (
      entidad.tipo === TIPOS_ENTIDAD_VISUAL.INTERACTUABLE &&
      entidad.activo === false &&
      entidad.atenuarInactivo !== false
    ) {
      this.context.globalAlpha = OPACIDAD_INTERACTUABLE_INACTIVO;
    }

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

    this.dibujarEstadosTemporalesEntidad({
      entidad,
      centroX,
      centroY,
    });

    if (entidad.tipo === TIPOS_ENTIDAD_VISUAL.ENEMIGO) {
      this.dibujarIndicadorVarianteEnemigo({
        entidad,
        pixelX,
        pixelY,
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

  dibujarEstadosTemporalesEntidad({ entidad, centroX, centroY }) {
    const efectos = Array.isArray(entidad?.efectosTemporales)
      ? entidad.efectosTemporales
      : [];
    if (efectos.length === 0) return;

    this.context.save();
    this.context.lineCap = "round";
    this.context.lineJoin = "round";

    for (const efecto of efectos) {
      const perfil = efecto?.perfilVisual;
      if (!perfil) continue;
      const principal = perfil.colorPrincipal ?? "#ffffff";
      const secundario = perfil.colorSecundario ?? "#ffffff";
      const factorCompactacion = efectos.length >= 4 ? 0.88 : 1;
      const nivelVisual = resolverMultiplicadorEstadoCanvas(efecto, perfil);
      const radio = Math.max(
        5,
        Math.floor(this.tileSize * 0.26 * factorCompactacion),
      );

      this.context.strokeStyle = principal;
      this.context.fillStyle = principal;
      this.context.lineWidth = Math.max(1, Math.floor(this.tileSize / 24));

      if (perfil.forma === "escarcha_inmovilizante") {
        const y = centroY + radio * 0.72;
        this.context.beginPath();
        this.context.moveTo(centroX - radio, y);
        this.context.lineTo(centroX - radio * 0.56, centroY + radio * 0.14);
        this.context.lineTo(centroX - radio * 0.34, centroY - radio * 0.58);
        this.context.moveTo(centroX + radio, y);
        this.context.lineTo(centroX + radio * 0.54, centroY + radio * 0.12);
        this.context.lineTo(centroX + radio * 0.32, centroY - radio * 0.54);
        this.context.stroke();
        this.context.strokeStyle = secundario;
        this.context.beginPath();
        this.context.moveTo(centroX - radio * 0.72, y + 2);
        this.context.lineTo(centroX + radio * 0.72, y + 2);
        this.context.stroke();
      } else if (perfil.canal === "pies") {
        const y = centroY + radio * 0.78;
        this.context.beginPath();
        this.context.moveTo(centroX - radio, y);
        this.context.lineTo(centroX - radio * 0.25, y - 2);
        this.context.lineTo(centroX + radio * 0.3, y + 1);
        this.context.lineTo(centroX + radio, y - 2);
        this.context.stroke();
      } else if (perfil.canal === "laterales") {
        dibujarZigzagCanvas(this.context, centroX - radio, centroY - radio * 0.65, centroX - radio * 0.75, centroY + radio * 0.6);
        dibujarZigzagCanvas(this.context, centroX + radio * 0.78, centroY - radio * 0.55, centroX + radio, centroY + radio * 0.55);
      } else if (perfil.canal === "contorno") {
        this.context.beginPath();
        this.context.moveTo(centroX - radio, centroY + radio * 0.45);
        this.context.lineTo(centroX - radio * 0.78, centroY - radio * 0.72);
        this.context.lineTo(centroX - radio * 0.22, centroY - radio);
        this.context.moveTo(centroX + radio * 0.25, centroY - radio);
        this.context.lineTo(centroX + radio * 0.8, centroY - radio * 0.66);
        this.context.lineTo(centroX + radio, centroY + radio * 0.42);
        this.context.stroke();
      } else if (perfil.canal === "superior") {
        this.context.strokeStyle = secundario;
        this.context.beginPath();
        this.context.arc(centroX, centroY - radio * 1.2, radio * 0.32, 0, Math.PI * 2);
        this.context.stroke();
        this.context.fillStyle = principal;
        this.context.fillRect(centroX - 1, centroY - radio * 1.2 - 1, 2, 2);
      } else if (perfil.canal === "lateral_izquierdo") {
        const burbujas = [
          [-0.9, 0.4, 0.2],
          [-1.05, -0.1, 0.14],
          [-0.72, -0.55, 0.11],
          [-1.12, 0.68, 0.1],
          [-0.52, 0.05, 0.09],
          [-0.84, -0.82, 0.08],
        ];
        this.context.globalAlpha = Math.min(0.94, 0.72 + nivelVisual * 0.07);
        this.context.beginPath();
        for (const [x, y, escala] of burbujas.slice(0, 2 + nivelVisual * 2)) {
          this.context.moveTo(centroX + radio * x + radio * escala, centroY + radio * y);
          this.context.arc(
            centroX + radio * x,
            centroY + radio * y,
            radio * escala,
            0,
            Math.PI * 2,
          );
        }
        this.context.fill();
      } else if (perfil.canal === "lateral_derecho") {
        this.context.fillStyle = principal;
        this.context.beginPath();
        this.context.moveTo(centroX + radio * 0.55, centroY + radio * 0.7);
        this.context.lineTo(centroX + radio, centroY - radio * 0.25);
        this.context.lineTo(centroX + radio * 0.7, centroY - radio * 0.05);
        this.context.lineTo(centroX + radio * 0.8, centroY - radio * 0.8);
        this.context.lineTo(centroX + radio * 0.35, centroY - radio * 0.18);
        this.context.closePath();
        this.context.fill();
        if (nivelVisual >= 2) {
          this.context.strokeStyle = secundario;
          this.context.beginPath();
          this.context.moveTo(centroX + radio * 0.92, centroY + radio * 0.32);
          this.context.lineTo(centroX + radio * 1.08, centroY - radio * 0.45);
          this.context.stroke();
        }
        if (nivelVisual >= 3) {
          this.context.beginPath();
          this.context.moveTo(centroX + radio * 0.46, centroY + radio * 0.4);
          this.context.lineTo(centroX + radio * 0.32, centroY - radio * 0.68);
          this.context.stroke();
        }
      }
      const multiplicador = nivelVisual;
      if (multiplicador > 1) {
        const posicion = resolverPosicionMultiplicadorCanvas({
          canal: perfil.canal,
          centroX,
          centroY,
          radio,
        });
        this.context.font = `bold ${Math.max(8, Math.floor(this.tileSize * 0.22))}px monospace`;
        this.context.textAlign = "center";
        this.context.textBaseline = "middle";
        this.context.lineWidth = 2;
        this.context.strokeStyle = "#11141a";
        this.context.strokeText(`×${multiplicador}`, posicion.x, posicion.y);
        this.context.fillStyle = secundario;
        this.context.fillText(`×${multiplicador}`, posicion.x, posicion.y);
      }
    }

    this.context.restore();
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

  dibujarIndicadorVarianteEnemigo({ entidad, pixelX, pixelY }) {
    const indicador = INDICADORES_VARIANTE_ENEMIGO[entidad.idVariante];

    if (!indicador) {
      return;
    }

    const tamano = Math.max(7, Math.floor(this.tileSize * 0.24));
    const centroX = pixelX + Math.ceil(this.tileSize * 0.24);
    const centroY = pixelY + Math.ceil(this.tileSize * 0.25);

    this.context.save();
    this.context.lineCap = "round";
    this.context.lineJoin = "round";
    this.context.fillStyle = indicador.colorPrincipal;
    this.context.strokeStyle = indicador.colorBorde;
    this.context.lineWidth = Math.max(1.5, Math.floor(this.tileSize / 18));
    this.context.shadowColor = "rgba(0, 0, 0, 0.45)";
    this.context.shadowBlur = 1;
    this.context.shadowOffsetX = 0;
    this.context.shadowOffsetY = 1;

    if (indicador.forma === "rombo") {
      this.dibujarRomboMarcador({ centroX, centroY, tamano });
    } else if (indicador.forma === "gota") {
      this.dibujarGotaMarcador({ centroX, centroY, tamano });
    } else {
      this.dibujarEstrellaMarcador({ centroX, centroY, tamano });
    }

    this.context.restore();
  }

  dibujarRomboMarcador({ centroX, centroY, tamano }) {
    this.context.beginPath();
    this.context.moveTo(centroX, centroY - tamano / 2);
    this.context.lineTo(centroX + tamano / 2, centroY);
    this.context.lineTo(centroX, centroY + tamano / 2);
    this.context.lineTo(centroX - tamano / 2, centroY);
    this.context.closePath();
    this.context.fill();
    this.context.stroke();
  }

  dibujarGotaMarcador({ centroX, centroY, tamano }) {
    const radio = tamano * 0.28;
    const puntaY = centroY - tamano / 2;
    const baseY = centroY + tamano * 0.24;

    this.context.beginPath();
    this.context.moveTo(centroX, puntaY);
    this.context.quadraticCurveTo(
      centroX + tamano * 0.42,
      centroY - tamano * 0.14,
      centroX + radio,
      baseY,
    );
    this.context.arc(centroX, baseY, radio, 0, Math.PI, true);
    this.context.quadraticCurveTo(
      centroX - tamano * 0.42,
      centroY - tamano * 0.14,
      centroX,
      puntaY,
    );
    this.context.closePath();
    this.context.fill();
    this.context.stroke();
  }

  dibujarEstrellaMarcador({ centroX, centroY, tamano }) {
    const radioExterior = tamano / 2;
    const radioInterior = tamano * 0.22;

    this.context.beginPath();

    for (let indice = 0; indice < 10; indice += 1) {
      const angulo = -Math.PI / 2 + indice * (Math.PI / 5);
      const radio = indice % 2 === 0 ? radioExterior : radioInterior;
      const x = centroX + Math.cos(angulo) * radio;
      const y = centroY + Math.sin(angulo) * radio;

      if (indice === 0) {
        this.context.moveTo(x, y);
      } else {
        this.context.lineTo(x, y);
      }
    }

    this.context.closePath();
    this.context.fill();
    this.context.stroke();
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
  dibujarSelectorCombate(selector, habilidad = null) {
    const pixelX = selector.x * this.tileSize;

    const pixelY = selector.y * this.tileSize;

    const estiloHabilidad = obtenerEstiloSeleccionHabilidad(
      habilidad?.maestria,
    );
    const color = selector.esValido
      ? habilidad
        ? estiloHabilidad.selector
        : "#ffe66d"
      : "#ff705c";

    const colorFondo = selector.esValido
      ? habilidad
        ? estiloHabilidad.selectorFondo
        : "rgba(255, 230, 90, 0.10)"
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
function dibujarZigzagCanvas(contexto, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  contexto.beginPath();
  contexto.moveTo(x1, y1);
  contexto.lineTo(x1 + dx * 0.35 - 2, y1 + dy * 0.32);
  contexto.lineTo(x1 + dx * 0.64 + 2, y1 + dy * 0.66);
  contexto.lineTo(x2, y2);
  contexto.stroke();
}

function crearPulsoEstadoCanvas(evento) {
  const perfil = evento?.efecto?.perfilVisual;
  if (
    typeof evento?.idObjetivo !== "string" ||
    !perfil ||
    perfil.pulsoTick === "ninguno"
  ) {
    return null;
  }
  return Object.freeze({
    idObjetivo: evento.idObjetivo,
    forma: perfil.pulsoTick,
    colorPrincipal: perfil.colorPrincipal ?? "#ffffff",
    colorSecundario: perfil.colorSecundario ?? "#ffffff",
  });
}

function resolverMultiplicadorEstadoCanvas(efecto, perfil) {
  if (perfil?.mostrarMultiplicador !== true) return 1;
  const maximo = Number.isInteger(perfil.densidadMaxima)
    ? Math.max(1, perfil.densidadMaxima)
    : 3;
  return Math.min(
    maximo,
    Math.max(
      1,
      Number.isFinite(efecto?.intensidad) ? Math.round(efecto.intensidad) : 1,
      Number.isFinite(efecto?.cantidad) ? Math.round(efecto.cantidad) : 1,
    ),
  );
}

function resolverPosicionMultiplicadorCanvas({ canal, centroX, centroY, radio }) {
  if (canal === "lateral_izquierdo") {
    return { x: centroX - radio * 1.15, y: centroY - radio * 0.92 };
  }
  if (canal === "lateral_derecho") {
    return { x: centroX + radio * 1.15, y: centroY - radio * 0.92 };
  }
  if (canal === "pies") {
    return { x: centroX + radio, y: centroY + radio };
  }
  return { x: centroX + radio, y: centroY - radio };
}

function crearFeedbackEstadoCanvas(evento) {
  const perfil = evento?.efecto?.perfilVisual;
  const respaldo = typeof perfil?.textoEstado === "string"
    ? perfil.textoEstado.trim()
    : "";
  const idEfecto = evento?.efecto?.catalogoEfectoId ?? evento?.efecto?.efectoId ?? evento?.efecto?.idDefinicion ?? null;
  const base = idEfecto
    ? traducirContenido("efectos", idEfecto, "textoEstado", respaldo)
    : respaldo;
  if (!base || typeof evento?.idObjetivo !== "string") return null;

  let texto = base;
  if (evento.operacion === "renovado") {
    texto = `${base} · ${traducir("mensajes.feedback.renovado", { respaldo: "RENOVADO" })}`;
  } else if (
    evento.operacion === "intensificado" ||
    evento.operacion === "acumulado"
  ) {
    const multiplicador = Math.max(
      1,
      Number.isFinite(evento.efecto?.intensidad)
        ? Math.round(evento.efecto.intensidad)
        : 1,
      Number.isFinite(evento.efecto?.cantidad)
        ? Math.round(evento.efecto.cantidad)
        : 1,
    );
    texto = multiplicador > 1 ? `${base} ×${multiplicador}` : base;
  }

  return Object.freeze({
    idObjetivo: evento.idObjetivo,
    texto,
    color: perfil.colorSecundario ?? "#ffffff",
  });
}

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

  if (!Array.isArray(escena.zonasTemporales)) {
    throw new Error("La escena necesita una lista de zonas temporales.");
  }

  if (!Array.isArray(escena.entidades)) {
    throw new Error("La escena necesita una lista de entidades.");
  }
}

function obtenerEstiloZonaTemporal(apariencia) {
  const estilos = {
    veneno: {
      relleno: "rgba(78, 155, 66, 0.30)",
      borde: "rgba(155, 235, 115, 0.74)",
      detalle: "rgba(205, 255, 160, 0.58)",
    },
    fuego: {
      relleno: "rgba(215, 80, 34, 0.30)",
      borde: "rgba(255, 170, 75, 0.78)",
      detalle: "rgba(255, 225, 130, 0.62)",
    },
    frio: {
      relleno: "rgba(80, 160, 215, 0.27)",
      borde: "rgba(155, 225, 255, 0.76)",
      detalle: "rgba(225, 250, 255, 0.62)",
    },
    electrico: {
      relleno: "rgba(105, 105, 225, 0.26)",
      borde: "rgba(185, 195, 255, 0.78)",
      detalle: "rgba(240, 245, 255, 0.64)",
    },
    generica: {
      relleno: "rgba(150, 95, 190, 0.24)",
      borde: "rgba(225, 175, 255, 0.70)",
      detalle: "rgba(245, 225, 255, 0.56)",
    },
  };

  return estilos[apariencia] ?? estilos.generica;
}

// Convierte un valor CSS expresado en píxeles
// a un número utilizable en los cálculos.
//
// Los valores vacíos o inválidos se consideran 0.
function obtenerEstiloSeleccionHabilidad(maestria) {
  const estilos = {
    fuego: {
      rangoFondo: "rgba(255, 95, 45, 0.10)",
      rangoBorde: "rgba(255, 150, 85, 0.30)",
      areaFondo: "rgba(255, 75, 35, 0.19)",
      areaBorde: "rgba(255, 195, 95, 0.56)",
      recorrido: "rgba(255, 170, 90, 0.90)",
      objetivoBorde: "rgba(255, 225, 170, 0.96)",
      objetivoFondo: "rgba(120, 40, 20, 0.94)",
      selector: "#ffbd62",
      selectorFondo: "rgba(255, 110, 45, 0.12)",
    },
    frio: {
      rangoFondo: "rgba(80, 190, 255, 0.10)",
      rangoBorde: "rgba(145, 225, 255, 0.30)",
      areaFondo: "rgba(80, 190, 255, 0.18)",
      areaBorde: "rgba(205, 248, 255, 0.56)",
      recorrido: "rgba(175, 235, 255, 0.90)",
      objetivoBorde: "rgba(225, 251, 255, 0.96)",
      objetivoFondo: "rgba(25, 75, 110, 0.94)",
      selector: "#9be8ff",
      selectorFondo: "rgba(90, 205, 255, 0.12)",
    },
    rayo: {
      rangoFondo: "rgba(175, 85, 255, 0.10)",
      rangoBorde: "rgba(210, 155, 255, 0.30)",
      areaFondo: "rgba(170, 75, 235, 0.18)",
      areaBorde: "rgba(235, 190, 255, 0.56)",
      recorrido: "rgba(210, 170, 255, 0.92)",
      objetivoBorde: "rgba(245, 225, 255, 0.96)",
      objetivoFondo: "rgba(75, 30, 105, 0.94)",
      selector: "#d7a3ff",
      selectorFondo: "rgba(180, 90, 255, 0.12)",
    },
    veneno: {
      rangoFondo: "rgba(100, 215, 55, 0.10)",
      rangoBorde: "rgba(170, 245, 95, 0.30)",
      areaFondo: "rgba(95, 205, 50, 0.18)",
      areaBorde: "rgba(205, 255, 125, 0.56)",
      recorrido: "rgba(185, 245, 105, 0.90)",
      objetivoBorde: "rgba(225, 255, 175, 0.96)",
      objetivoFondo: "rgba(45, 95, 25, 0.94)",
      selector: "#b8ef70",
      selectorFondo: "rgba(105, 220, 55, 0.12)",
    },
  };
  return estilos[maestria] ?? {
    rangoFondo: "rgba(85, 120, 235, 0.10)",
    rangoBorde: "rgba(125, 165, 255, 0.26)",
    areaFondo: "rgba(170, 80, 230, 0.18)",
    areaBorde: "rgba(225, 155, 255, 0.48)",
    recorrido: "rgba(185, 220, 255, 0.88)",
    objetivoBorde: "rgba(245, 225, 255, 0.95)",
    objetivoFondo: "rgba(80, 35, 110, 0.94)",
    selector: "#ffe66d",
    selectorFondo: "rgba(255, 230, 90, 0.10)",
  };
}

function convertirPixeles(valor) {
  const numero = Number.parseFloat(valor);

  return Number.isFinite(numero) ? numero : 0;
}
