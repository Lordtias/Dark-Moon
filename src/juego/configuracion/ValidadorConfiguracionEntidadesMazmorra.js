const FAMILIAS_ENTIDAD_MAZMORRA = Object.freeze({
  RECIPIENTE: "recipiente",
  OBSTACULO: "obstaculo",
  DECORACION: "decoracion",
});

const EXPRESION_RECURSO_VISUAL = /\.(png|jpg|jpeg|webp)$/i;

export function validarConfiguracionEntidadesMazmorra({
  recipientes,
  obstaculos,
  decoraciones,
} = {}) {
  const catalogos = [
    {
      familia: FAMILIAS_ENTIDAD_MAZMORRA.RECIPIENTE,
      descripcion: "el catálogo de recipientes de mazmorra",
      configuracion: recipientes,
    },
    {
      familia: FAMILIAS_ENTIDAD_MAZMORRA.OBSTACULO,
      descripcion: "el catálogo de obstáculos de mazmorra",
      configuracion: obstaculos,
    },
    {
      familia: FAMILIAS_ENTIDAD_MAZMORRA.DECORACION,
      descripcion: "el catálogo de decoraciones destructibles de mazmorra",
      configuracion: decoraciones,
    },
  ];
  const porId = {};

  for (const catalogo of catalogos) {
    validarObjeto(catalogo.configuracion, catalogo.descripcion);

    for (const [idOriginal, definicion] of Object.entries(
      catalogo.configuracion,
    )) {
      const id = normalizarId(idOriginal, catalogo.descripcion);
      if (porId[id]) {
        throw new Error(
          `La entidad de mazmorra "${id}" está definida en más de una familia.`,
        );
      }

      validarDefinicion({
        id,
        familia: catalogo.familia,
        definicion,
      });

      porId[id] = {
        ...clonar(definicion),
        id,
        familia: catalogo.familia,
      };
    }
  }

  return {
    recipientes: clonar(recipientes),
    obstaculos: clonar(obstaculos),
    decoraciones: clonar(decoraciones),
    porId,
  };
}

export function obtenerEntidadMazmorraConfigurada(configuracion, id) {
  if (!configuracion?.porId || typeof configuracion.porId !== "object") {
    throw new Error(
      "Se necesita la configuración canónica de entidades de mazmorra.",
    );
  }

  const idNormalizado = normalizarId(id, "la referencia de entidad");
  const definicion = configuracion.porId[idNormalizado];

  if (!definicion) {
    throw new Error(
      `No existe una entidad de mazmorra configurada como "${idNormalizado}".`,
    );
  }

  return definicion;
}


export function validarReferenciasEntidadesMazmorra({
  configuracionMapas,
  configuracionEntidadesMazmorra,
} = {}) {
  validarObjeto(configuracionMapas?.plantillas, "las plantillas de mapas");
  validarObjeto(
    configuracionEntidadesMazmorra?.porId,
    "el catálogo consolidado de entidades de mazmorra",
  );

  for (const [idMapa, plantilla] of Object.entries(configuracionMapas.plantillas)) {
    const destructibles = plantilla.interactuables?.destructibles;
    if (!destructibles) continue;

    for (const permitido of destructibles.permitidos ?? []) {
      const definicion = obtenerEntidadMazmorraConfigurada(
        configuracionEntidadesMazmorra,
        permitido.id,
      );
      if (
        permitido.idSolicitudContenido !== undefined &&
        definicion.familia !== FAMILIAS_ENTIDAD_MAZMORRA.RECIPIENTE
      ) {
        throw new Error(
          `"${permitido.id}" de "${idMapa}" declara contenido registrable, pero no pertenece a la familia recipiente.`,
        );
      }
    }
  }

  return true;
}

export { FAMILIAS_ENTIDAD_MAZMORRA };

function validarDefinicion({ id, familia, definicion }) {
  validarObjeto(definicion, `la definición de "${id}"`);
  validarTexto(definicion.nombre, `el nombre de "${id}"`);
  validarTexto(definicion.simbolo, `el símbolo de "${id}"`);
  validarRecursoVisual(definicion.recursoVisual, id);
  validarEnteroPositivo(definicion.vidaMaxima, `la Vida máxima de "${id}"`);
  validarEnteroNoNegativo(definicion.armadura, `la Armadura de "${id}"`);
  validarBooleano(
    definicion.bloqueaMovimiento,
    `el bloqueo de movimiento de "${id}"`,
  );
  validarBooleano(
    definicion.bloqueaVision,
    `el bloqueo de visión de "${id}"`,
  );
  validarBooleano(
    definicion.bloqueaCruceDiagonal,
    `el bloqueo diagonal de "${id}"`,
  );

  if (definicion.solicitudBotinDestruccion !== undefined) {
    validarSolicitudBotinDeclarativa(
      definicion.solicitudBotinDestruccion,
      `la solicitud de botín al destruir "${id}"`,
    );
  }

  if (familia === FAMILIAS_ENTIDAD_MAZMORRA.RECIPIENTE) {
    validarEnteroPositivo(
      definicion.capacidadContenedor,
      `la capacidad de "${id}"`,
    );
    validarEnteroNoNegativo(
      definicion.alcanceInteraccion,
      `el alcance de interacción de "${id}"`,
    );
    if (!Number.isFinite(definicion.prioridadInteraccion)) {
      throw new Error(
        `La prioridad de interacción de "${id}" debe ser numérica.`,
      );
    }
  }
}

function validarSolicitudBotinDeclarativa(solicitud, descripcion) {
  validarObjeto(solicitud, descripcion);
  validarTexto(solicitud.perfil, `el perfil de ${descripcion}`);
  if (
    !Array.isArray(solicitud.marcosPermitidos) ||
    solicitud.marcosPermitidos.length === 0
  ) {
    throw new Error(`${descripcion} debe declarar al menos un marco permitido.`);
  }
  solicitud.marcosPermitidos.forEach((marco) =>
    validarTexto(marco, `un marco permitido de ${descripcion}`),
  );
}

function validarRecursoVisual(ruta, id) {
  validarTexto(ruta, `el recurso visual de "${id}"`);
  const normalizada = ruta.trim();
  if (
    normalizada.startsWith("/") ||
    normalizada.includes("..") ||
    !EXPRESION_RECURSO_VISUAL.test(normalizada)
  ) {
    throw new Error(
      `El recurso visual de "${id}" debe ser una ruta relativa a una imagen.`,
    );
  }
}

function validarObjeto(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`${descripcion} debe ser un objeto válido.`);
  }
}

function validarTexto(valor, descripcion) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`${descripcion} debe ser un texto válido.`);
  }
}

function validarBooleano(valor, descripcion) {
  if (typeof valor !== "boolean") {
    throw new Error(`${descripcion} debe ser booleano.`);
  }
}

function validarEnteroPositivo(valor, descripcion) {
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new Error(`${descripcion} debe ser un entero mayor que 0.`);
  }
}

function validarEnteroNoNegativo(valor, descripcion) {
  if (!Number.isInteger(valor) || valor < 0) {
    throw new Error(`${descripcion} debe ser un entero no negativo.`);
  }
}

function normalizarId(valor, descripcion) {
  validarTexto(valor, descripcion);
  return valor.trim().toLowerCase();
}

function clonar(valor) {
  return JSON.parse(JSON.stringify(valor));
}
