const EXPRESION_COLOR_HEXADECIMAL = /^#[0-9a-f]{6}$/i;

const TIPOS_TERRENO_VALIDOS = new Set(["suelo", "pared"]);

const VARIANTES_MURO_VALIDAS = new Set([
  "aislado",
  "extremo",
  "recto",
  "esquina",
  "unionT",
  "cruce",
  "interior",
]);

const TIPOS_DECORACION_VALIDOS = new Set([
  "charco",
  "rejilla",
  "escombros",
  "mancha",
]);

// Valida el contrato visual común utilizado por Canvas 2D y Phaser.
// La validación no utiliza la apariencia para decidir caminabilidad,
// conectividad, ocupación ni movimiento.
export function validarAparienciaMapa({
  identificador = "del mapa",
  apariencia,
  simbolosRequeridos = [],
} = {}) {
  validarObjeto(apariencia, `la apariencia ${identificador}`);

  for (const nombreColor of ["colorSuelo", "colorPared", "colorGrilla"]) {
    validarColor(
      apariencia[nombreColor],
      `"${nombreColor}" ${identificador}`,
    );
  }

  validarObjeto(apariencia.terrenos, `los terrenos ${identificador}`);

  const entradasTerrenos = Object.entries(apariencia.terrenos);

  if (entradasTerrenos.length === 0) {
    throw new Error(`Los terrenos ${identificador} no pueden estar vacíos.`);
  }

  for (const simbolo of simbolosRequeridos) {
    if (!tienePropiedad(apariencia.terrenos, simbolo)) {
      throw new Error(
        `El símbolo "${simbolo}" no tiene una apariencia configurada ${identificador}.`,
      );
    }
  }

  for (const [simbolo, terreno] of entradasTerrenos) {
    if (typeof simbolo !== "string" || Array.from(simbolo).length !== 1) {
      throw new Error(
        `Cada terreno ${identificador} debe utilizar un símbolo individual.`,
      );
    }

    validarObjeto(terreno, `el terreno "${simbolo}" ${identificador}`);

    if (!TIPOS_TERRENO_VALIDOS.has(terreno.tipo)) {
      throw new Error(
        `El tipo del terreno "${simbolo}" ${identificador} debe ser suelo o pared.`,
      );
    }

    if (
      terreno.caminable !== undefined &&
      typeof terreno.caminable !== "boolean"
    ) {
      throw new Error(
        `"caminable" del terreno "${simbolo}" ${identificador} debe ser booleano.`,
      );
    }

    validarColor(
      terreno.color,
      `el color del terreno "${simbolo}" ${identificador}`,
    );
    validarTexto(
      terreno.detalle,
      `el detalle del terreno "${simbolo}" ${identificador}`,
    );
  }

  if (apariencia.phaser !== undefined) {
    validarAparienciaPhaser({
      identificador,
      configuracion: apariencia.phaser,
      terrenos: apariencia.terrenos,
    });
  }

  return apariencia;
}

function validarAparienciaPhaser({ identificador, configuracion, terrenos }) {
  validarObjeto(configuracion, `la apariencia Phaser ${identificador}`);

  validarConfiguracionSueloPhaser(
    configuracion.suelo,
    `el suelo Phaser ${identificador}`,
  );
  validarConfiguracionParedPhaser(
    configuracion.pared,
    `la pared Phaser ${identificador}`,
  );
  validarConfiguracionGrillaPhaser(
    configuracion.grilla,
    `la grilla Phaser ${identificador}`,
  );
  validarConfiguracionDecoracionPhaser(
    configuracion.decoracion,
    `la decoración Phaser ${identificador}`,
  );
  validarConfiguracionSombrasPhaser(
    configuracion.sombras,
    `las sombras Phaser ${identificador}`,
  );
  validarConfiguracionIluminacionPhaser(
    configuracion.iluminacion,
    `la iluminación Phaser ${identificador}`,
  );

  if (configuracion.terrenos === undefined) {
    return;
  }

  validarObjeto(
    configuracion.terrenos,
    `los terrenos Phaser ${identificador}`,
  );

  for (const [simbolo, terreno] of Object.entries(configuracion.terrenos)) {
    if (!tienePropiedad(terrenos, simbolo)) {
      throw new Error(
        `El terreno Phaser "${simbolo}" ${identificador} no existe en apariencia.terrenos.`,
      );
    }

    validarObjeto(
      terreno,
      `el terreno Phaser "${simbolo}" ${identificador}`,
    );
    validarListaRutasImagen(
      terreno.recursos,
      `los recursos del terreno Phaser "${simbolo}" ${identificador}`,
    );
    validarConfiguracionParedPhaser(
      terreno.pared,
      `la pared del terreno Phaser "${simbolo}" ${identificador}`,
    );

    if (terreno.recurso !== undefined || terreno.variantes !== undefined) {
      validarConfiguracionParedPhaser(
        {
          recurso: terreno.recurso,
          variantes: terreno.variantes,
        },
        `el terreno de pared Phaser "${simbolo}" ${identificador}`,
      );
    }

    validarConfiguracionDecoracionPhaser(
      terreno.decoracion,
      `la decoración del terreno Phaser "${simbolo}" ${identificador}`,
    );

    if (terreno.opacidadGrilla !== undefined) {
      validarNumeroEntre(
        terreno.opacidadGrilla,
        0,
        1,
        `la opacidad de grilla del terreno Phaser "${simbolo}" ${identificador}`,
      );
    }
  }
}

function validarConfiguracionSueloPhaser(configuracion, descripcion) {
  if (configuracion === undefined) return;
  validarObjeto(configuracion, descripcion);
  validarListaRutasImagen(configuracion.recursos, `${descripcion}.recursos`);
}

function validarConfiguracionParedPhaser(configuracion, descripcion) {
  if (configuracion === undefined) return;
  validarObjeto(configuracion, descripcion);

  if (configuracion.recurso !== undefined) {
    validarRutaImagen(configuracion.recurso, `${descripcion}.recurso`);
  }

  validarConfiguracionAlturaParedPhaser(
    configuracion.altura,
    `${descripcion}.altura`,
  );

  if (configuracion.variantes === undefined) return;

  validarObjeto(configuracion.variantes, `${descripcion}.variantes`);

  for (const [variante, ruta] of Object.entries(configuracion.variantes)) {
    if (!VARIANTES_MURO_VALIDAS.has(variante)) {
      throw new Error(
        `La variante de muro "${variante}" de ${descripcion} no está soportada.`,
      );
    }

    validarRutaImagen(ruta, `${descripcion}.variantes.${variante}`);
  }
}

function validarConfiguracionAlturaParedPhaser(configuracion, descripcion) {
  if (configuracion === undefined) return;
  validarObjeto(configuracion, descripcion);

  validarListaRutasImagen(configuracion.frentes, `${descripcion}.frentes`);

  if (
    configuracion.frentes !== undefined &&
    configuracion.frentes.length === 0
  ) {
    throw new Error(`${descripcion}.frentes no puede estar vacía.`);
  }

  const limites = {
    altoVisual: [8, 30],
    solapeSuperior: [0, 8],
    anchoLateral: [0, 12],
    sombraProyectada: [0, 16],
    opacidad: [0.1, 1],
  };

  for (const [propiedad, [minimo, maximo]] of Object.entries(limites)) {
    if (configuracion[propiedad] !== undefined) {
      validarNumeroEntre(
        configuracion[propiedad],
        minimo,
        maximo,
        `${descripcion}.${propiedad}`,
      );
    }
  }
}

function validarConfiguracionGrillaPhaser(configuracion, descripcion) {
  if (configuracion === undefined) return;
  validarObjeto(configuracion, descripcion);

  for (const propiedad of ["opacidadSuelo", "opacidadPared"]) {
    if (configuracion[propiedad] !== undefined) {
      validarNumeroEntre(
        configuracion[propiedad],
        0,
        1,
        `${descripcion}.${propiedad}`,
      );
    }
  }
}

function validarConfiguracionDecoracionPhaser(configuracion, descripcion) {
  if (configuracion === undefined) return;
  validarObjeto(configuracion, descripcion);

  if (configuracion.densidad !== undefined) {
    validarNumeroEntre(
      configuracion.densidad,
      0,
      0.4,
      `${descripcion}.densidad`,
    );
  }

  if (configuracion.tipos !== undefined) {
    if (!Array.isArray(configuracion.tipos) || configuracion.tipos.length === 0) {
      throw new Error(`${descripcion}.tipos debe ser una lista no vacía.`);
    }

    for (const tipo of configuracion.tipos) {
      if (!TIPOS_DECORACION_VALIDOS.has(tipo)) {
        throw new Error(
          `El tipo de decoración "${tipo}" de ${descripcion} no está soportado.`,
        );
      }
    }
  }

  for (const propiedad of [
    "colorHumedad",
    "colorReflejo",
    "colorMetal",
    "colorOxido",
    "colorEscombro",
    "colorMancha",
  ]) {
    if (configuracion[propiedad] !== undefined) {
      validarColor(configuracion[propiedad], `${descripcion}.${propiedad}`);
    }
  }
}

function validarConfiguracionSombrasPhaser(configuracion, descripcion) {
  if (configuracion === undefined) return;
  validarObjeto(configuracion, descripcion);

  if (configuracion.color !== undefined) {
    validarColor(configuracion.color, `${descripcion}.color`);
  }

  for (const propiedad of ["opacidadMuros", "opacidadEntidades"]) {
    if (configuracion[propiedad] !== undefined) {
      validarNumeroEntre(
        configuracion[propiedad],
        0,
        0.8,
        `${descripcion}.${propiedad}`,
      );
    }
  }
}

function validarConfiguracionIluminacionPhaser(configuracion, descripcion) {
  if (configuracion === undefined) return;
  validarObjeto(configuracion, descripcion);

  for (const propiedad of [
    "colorAmbiente",
    "colorSombraAmbiente",
    "colorJugador",
  ]) {
    if (configuracion[propiedad] !== undefined) {
      validarColor(configuracion[propiedad], `${descripcion}.${propiedad}`);
    }
  }

  if (configuracion.intensidad !== undefined) {
    validarNumeroEntre(
      configuracion.intensidad,
      0,
      0.3,
      `${descripcion}.intensidad`,
    );
  }
}

function validarListaRutasImagen(rutas, descripcion) {
  if (rutas === undefined) return;

  if (!Array.isArray(rutas)) {
    throw new Error(`${descripcion} debe ser una lista.`);
  }

  for (const ruta of rutas) {
    validarRutaImagen(ruta, descripcion);
  }
}

function validarRutaImagen(ruta, descripcion) {
  validarTexto(ruta, descripcion);
  const rutaNormalizada = ruta.trim();

  if (
    rutaNormalizada.startsWith("/") ||
    rutaNormalizada.includes("..") ||
    !/\.(png|jpg|jpeg|webp)$/i.test(rutaNormalizada)
  ) {
    throw new Error(
      `${descripcion} debe ser una ruta relativa a una imagen PNG, JPG, JPEG o WEBP.`,
    );
  }
}

function validarColor(valor, descripcion) {
  if (typeof valor !== "string" || !EXPRESION_COLOR_HEXADECIMAL.test(valor)) {
    throw new Error(
      `${descripcion} debe ser un color hexadecimal como #26372f.`,
    );
  }
}

function validarNumeroEntre(valor, minimo, maximo, descripcion) {
  if (!Number.isFinite(valor) || valor < minimo || valor > maximo) {
    throw new Error(
      `${descripcion} debe estar entre ${minimo} y ${maximo}.`,
    );
  }
}

function validarTexto(valor, descripcion) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`${descripcion} debe ser un texto válido.`);
  }
}

function tienePropiedad(objeto, propiedad) {
  return Object.prototype.hasOwnProperty.call(objeto, propiedad);
}

function validarObjeto(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`${descripcion} debe ser un objeto válido.`);
  }
}
