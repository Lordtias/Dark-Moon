const ESTADOS_RECURSO = Object.freeze({
  CARGANDO: "cargando",
  LISTO: "listo",
  ERROR: "error",
});

const UMBRAL_ALPHA_VISIBLE = 8;

// Carga imágenes mediante la API del navegador y las registra como texturas
// públicas de Phaser. No conoce entidades, mapas ni reglas del juego.
export class GestorRecursosPhaser {
  constructor({ escena, alActualizar = null } = {}) {
    if (!escena?.textures?.addImage) {
      throw new Error("GestorRecursosPhaser necesita una escena con texturas.");
    }

    if (alActualizar !== null && typeof alActualizar !== "function") {
      throw new Error("El callback de recursos Phaser debe ser una función.");
    }

    this.escena = escena;
    this.alActualizar = alActualizar;
    this.recursos = new Map();
    this.destruido = false;
  }

  obtener(ruta) {
    return this.obtenerInformacion(ruta)?.claveTextura ?? null;
  }

  obtenerInformacion(ruta) {
    const rutaNormalizada = normalizarRuta(ruta);

    if (!rutaNormalizada || this.destruido) {
      return null;
    }

    let recurso = this.recursos.get(rutaNormalizada);

    if (!recurso) {
      recurso = this.iniciarCarga(rutaNormalizada);
    }

    return recurso.estado === ESTADOS_RECURSO.LISTO
      ? recurso.informacion
      : null;
  }

  precargar(rutas) {
    for (const ruta of rutas ?? []) {
      this.obtenerInformacion(ruta);
    }
  }

  iniciarCarga(ruta) {
    const claveTextura = crearClaveTextura(ruta);
    const imagen = new Image();
    const recurso = {
      claveTextura,
      imagen,
      informacion: null,
      estado: ESTADOS_RECURSO.CARGANDO,
    };

    this.recursos.set(ruta, recurso);

    imagen.addEventListener(
      "load",
      () => {
        if (this.destruido) {
          return;
        }

        if (!this.escena.textures.exists(claveTextura)) {
          this.escena.textures.addImage(claveTextura, imagen);
        }

        recurso.informacion = crearInformacionRecurso({
          claveTextura,
          imagen,
        });
        recurso.estado = ESTADOS_RECURSO.LISTO;
        this.alActualizar?.({ ruta, cargada: true });
      },
      { once: true },
    );

    imagen.addEventListener(
      "error",
      () => {
        if (this.destruido) {
          return;
        }

        recurso.estado = ESTADOS_RECURSO.ERROR;
        console.warn(`[Phaser] No se pudo cargar la imagen "${ruta}".`);
        this.alActualizar?.({ ruta, cargada: false });
      },
      { once: true },
    );

    imagen.decoding = "async";
    imagen.crossOrigin = "anonymous";
    imagen.src = ruta;

    return recurso;
  }

  destruir() {
    this.destruido = true;

    for (const recurso of this.recursos.values()) {
      if (recurso.estado === ESTADOS_RECURSO.LISTO) {
        this.escena.textures.remove(recurso.claveTextura);
      }
    }

    this.recursos.clear();
    this.alActualizar = null;
    this.escena = null;
  }
}

function crearInformacionRecurso({ claveTextura, imagen }) {
  const ancho = Number(imagen.naturalWidth || imagen.width || 0);
  const alto = Number(imagen.naturalHeight || imagen.height || 0);
  const anchoSeguro = Math.max(1, ancho);
  const altoSeguro = Math.max(1, alto);
  const limitesVisibles = analizarLimitesVisibles(imagen, ancho, alto);
  const anclajeBase = Object.freeze({
    x: limitesVisibles.centroX / anchoSeguro,
    y: limitesVisibles.baseY / altoSeguro,
  });
  const anclajeCentro = Object.freeze({
    x: limitesVisibles.centroX / anchoSeguro,
    y: limitesVisibles.centroY / altoSeguro,
  });

  return Object.freeze({
    claveTextura,
    ancho,
    alto,
    limitesVisibles,

    // Se conserva el nombre histórico para cualquier consumidor heredado.
    anclaje: anclajeBase,
    anclajeBase,
    anclajeCentro,
  });
}

function analizarLimitesVisibles(imagen, ancho, alto) {
  const respaldo = crearLimitesCompletos(ancho, alto);

  if (ancho <= 0 || alto <= 0) {
    return respaldo;
  }

  try {
    const canvas = crearCanvasAnalisis(ancho, alto);
    const contexto = canvas?.getContext?.("2d", { willReadFrequently: true });

    if (!contexto) {
      return respaldo;
    }

    contexto.clearRect(0, 0, ancho, alto);
    contexto.drawImage(imagen, 0, 0, ancho, alto);
    const datos = contexto.getImageData(0, 0, ancho, alto).data;
    let minimoX = ancho;
    let minimoY = alto;
    let maximoX = -1;
    let maximoY = -1;

    for (let y = 0; y < alto; y++) {
      for (let x = 0; x < ancho; x++) {
        const alpha = datos[(y * ancho + x) * 4 + 3];

        if (alpha <= UMBRAL_ALPHA_VISIBLE) {
          continue;
        }

        minimoX = Math.min(minimoX, x);
        minimoY = Math.min(minimoY, y);
        maximoX = Math.max(maximoX, x);
        maximoY = Math.max(maximoY, y);
      }
    }

    if (maximoX < minimoX || maximoY < minimoY) {
      return respaldo;
    }

    return crearLimites({ minimoX, minimoY, maximoX, maximoY });
  } catch (error) {
    // La textura continúa siendo utilizable aunque el navegador impida leer
    // píxeles. En ese caso se conserva el anclaje tradicional del PNG completo.
    return respaldo;
  }
}

function crearCanvasAnalisis(ancho, alto) {
  if (typeof OffscreenCanvas === "function") {
    return new OffscreenCanvas(ancho, alto);
  }

  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    return canvas;
  }

  return null;
}

function crearLimitesCompletos(ancho, alto) {
  const anchoSeguro = Math.max(1, ancho);
  const altoSeguro = Math.max(1, alto);

  return crearLimites({
    minimoX: 0,
    minimoY: 0,
    maximoX: anchoSeguro - 1,
    maximoY: altoSeguro - 1,
  });
}

function crearLimites({ minimoX, minimoY, maximoX, maximoY }) {
  const anchoVisible = maximoX - minimoX + 1;
  const altoVisible = maximoY - minimoY + 1;

  return Object.freeze({
    minimoX,
    minimoY,
    maximoX,
    maximoY,
    ancho: anchoVisible,
    alto: altoVisible,
    centroX: minimoX + anchoVisible / 2,
    centroY: minimoY + altoVisible / 2,
    baseY: maximoY + 1,
  });
}

function normalizarRuta(ruta) {
  if (ruta === null || ruta === undefined) {
    return null;
  }

  if (typeof ruta !== "string") {
    throw new Error("La ruta de un recurso Phaser debe ser un texto.");
  }

  const normalizada = ruta.trim();
  return normalizada === "" ? null : normalizada;
}

function crearClaveTextura(ruta) {
  let hash = 2166136261;

  for (let indice = 0; indice < ruta.length; indice++) {
    hash ^= ruta.charCodeAt(indice);
    hash = Math.imul(hash, 16777619);
  }

  return `dark-moon-${(hash >>> 0).toString(16)}`;
}
