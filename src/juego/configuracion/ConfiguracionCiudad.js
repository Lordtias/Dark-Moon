import { NPC } from "../../entidad/interactuable/NPC.js";

import { PortalMapa } from "../../entidad/interactuable/PortalMapa.js";

const TIPOS_ENTIDAD_CIUDAD = Object.freeze({
  NPC: "npc",
  PORTAL_MAPA: "portalMapa",
});

// Construye el mapa fijo de la ciudad utilizando
// una configuración JSON y al jugador persistente.
//
// La ciudad utiliza el mismo contrato que una mazmorra:
//
// - map.
// - mapaSeleccionado.
// - player.
// - objetivos.
// - interactuables.
//
// Gracias a esto Juego no necesita saber qué tipo
// de mapa está ejecutando.
export function crearConfiguracionCiudad({
  player,
  configuracionCiudad,
  puntoEntrada = "inicioPartida",
} = {}) {
  validarJugador(player);

  const configuracion = validarConfiguracionCiudad(configuracionCiudad);

  const posicionJugador = obtenerPosicionJugador({
    configuracion,
    puntoEntrada,
  });

  player.x = posicionJugador.x;

  player.y = posicionJugador.y;

  const map = configuracion.terreno.map((fila) => Array.from(fila));

  const interactuables = configuracion.entidades.map((entidad) =>
    crearEntidadCiudad(entidad),
  );

  const alto = map.length;

  const ancho = map[0].length;

  const mapaSeleccionado = {
    id: configuracion.id,

    nombre: configuracion.nombre,

    tipo: configuracion.tipo,

    bioma: configuracion.bioma,

    apariencia: copiarApariencia(configuracion.apariencia),

    // Conservamos el mismo bloque utilizado por
    // las mazmorras para que herramientas visuales
    // y registros puedan consultar el mapa activo.
    generacionActual: {
      tipoGeneracion: "fija",

      semilla: configuracion.id,

      ancho,
      alto,

      nivelMapa: configuracion.nivel ?? 1,

      cantidadEnemigos: 0,

      enemigosPorTipo: {},

      variantes: {},

      cantidadDestructibles: 0,

      detalleEnemigos: [],

      detalleDestructibles: [],

      puntoEntrada,
    },
  };

  return {
    map,
    mapaSeleccionado,
    player,

    // La primera ciudad no posee enemigos
    // ni destructibles atacables.
    objetivos: [],
    interactuables,
  };
}

function crearEntidadCiudad(configuracionEntidad) {
  switch (configuracionEntidad.tipo) {
    case TIPOS_ENTIDAD_CIUDAD.NPC:
      return crearNpcCiudad(configuracionEntidad);

    case TIPOS_ENTIDAD_CIUDAD.PORTAL_MAPA:
      return crearPortalCiudad(configuracionEntidad);

    default:
      throw new Error(
        `La entidad de ciudad "${configuracionEntidad.tipo}" ` +
          "no está soportada.",
      );
  }
}

// Construye un NPC únicamente con datos de configuración.
//
// No se crean clases específicas como Mercader, Herrero
// o Alquimista. Sus capacidades se expresan mediante:
//
// - Roles.
// - Interacciones.
// - Facción.
// - Datos adicionales.
//
// Esto permite combinar funciones sin aumentar la cantidad
// de clases del dominio.
function crearNpcCiudad(configuracionNpc) {
  return new NPC({
    id: configuracionNpc.id,

    nombre: configuracionNpc.nombre,

    rol: configuracionNpc.rol,

    roles: configuracionNpc.roles ?? null,

    descripcion: configuracionNpc.descripcion ?? "",

    faccion: configuracionNpc.faccion ?? "neutral",

    x: configuracionNpc.x,

    y: configuracionNpc.y,

    simbolo: configuracionNpc.simbolo,

    recursoVisual: configuracionNpc.recursoVisual ?? null,

    interacciones: configuracionNpc.interacciones,

    datos: configuracionNpc.datos ?? {},
  });
}

function crearPortalCiudad(configuracionPortal) {
  return new PortalMapa({
    nombre: configuracionPortal.nombre,

    x: configuracionPortal.x,

    y: configuracionPortal.y,

    simbolo: configuracionPortal.simbolo,

    // No utilizamos "?? null".
    //
    // Cuando la propiedad no existe, PortalMapa
    // puede aplicar su imagen genérica predeterminada.
    // Un valor null explícito continúa desactivándola.
    recursoVisual: configuracionPortal.recursoVisual,

    textoInteraccion: configuracionPortal.textoInteraccion,

    alcance: configuracionPortal.alcance,

    prioridad: configuracionPortal.prioridad,

    tipoInteraccion: configuracionPortal.tipoInteraccion,

    solicitudTransicionMapa:
      configuracionPortal.solicitudTransicionMapa ?? null,
  });
}

function validarConfiguracionCiudad(configuracion) {
  if (
    !configuracion ||
    typeof configuracion !== "object" ||
    Array.isArray(configuracion)
  ) {
    throw new Error("La configuración de la ciudad no es válida.");
  }

  validarTexto(configuracion.id, "ID de la ciudad");

  validarTexto(configuracion.nombre, "nombre de la ciudad");

  validarTexto(configuracion.tipo, "tipo de mapa de la ciudad");

  validarTexto(configuracion.bioma, "bioma de la ciudad");

  validarTerreno(configuracion);

  validarPosicionesJugador(configuracion);

  validarEntidades(configuracion);

  return configuracion;
}

function validarTerreno(configuracion) {
  const terreno = configuracion.terreno;

  if (!Array.isArray(terreno) || terreno.length === 0) {
    throw new Error("La ciudad necesita una lista de filas de terreno.");
  }

  const ancho = typeof terreno[0] === "string" ? terreno[0].length : 0;

  if (ancho === 0) {
    throw new Error("Las filas de la ciudad deben ser textos no vacíos.");
  }

  const terrenosVisuales = configuracion.apariencia?.terrenos;

  if (
    !terrenosVisuales ||
    typeof terrenosVisuales !== "object" ||
    Array.isArray(terrenosVisuales)
  ) {
    throw new Error(
      "La ciudad necesita la configuración visual de sus terrenos.",
    );
  }

  terreno.forEach((fila, indiceFila) => {
    if (typeof fila !== "string" || fila.length !== ancho) {
      throw new Error(
        `La fila ${indiceFila} de la ciudad ` + `debe tener ${ancho} casillas.`,
      );
    }

    for (const simbolo of fila) {
      if (!terrenosVisuales[simbolo]) {
        throw new Error(
          `El terreno "${simbolo}" no tiene ` + "una apariencia configurada.",
        );
      }
    }
  });
}

function validarPosicionesJugador(configuracion) {
  const posiciones = configuracion.posicionesJugador;

  if (
    !posiciones ||
    typeof posiciones !== "object" ||
    Array.isArray(posiciones)
  ) {
    throw new Error(
      "La ciudad necesita posiciones de entrada para el jugador.",
    );
  }

  const entradas = Object.entries(posiciones);

  if (entradas.length === 0) {
    throw new Error("La ciudad necesita al menos una posición de entrada.");
  }

  for (const [nombre, posicion] of entradas) {
    validarPosicionMapa({
      configuracion,
      posicion,

      descripcion: `la entrada "${nombre}"`,

      necesitaSerCaminable: true,
    });
  }
}

function validarEntidades(configuracion) {
  if (!Array.isArray(configuracion.entidades)) {
    throw new Error(
      "Las entidades de la ciudad deben estar dentro de una lista.",
    );
  }

  configuracion.entidades.forEach((entidad, indice) => {
    if (!entidad || typeof entidad !== "object" || Array.isArray(entidad)) {
      throw new Error(`La entidad ${indice} de la ciudad no es válida.`);
    }

    if (!Object.values(TIPOS_ENTIDAD_CIUDAD).includes(entidad.tipo)) {
      throw new Error(
        `El tipo de entidad "${entidad.tipo}" ` +
          "no está soportado por la ciudad.",
      );
    }

    validarTexto(entidad.nombre, `nombre de la entidad ${indice}`);

    validarRecursoVisualOpcional(entidad.recursoVisual, entidad.nombre);

    validarPosicionMapa({
      configuracion,
      posicion: entidad,

      descripcion: `la entidad "${entidad.nombre}"`,

      necesitaSerCaminable: false,
    });

    if (entidad.tipo === TIPOS_ENTIDAD_CIUDAD.NPC) {
      validarConfiguracionNpc(entidad);
    }

    if (entidad.tipo === TIPOS_ENTIDAD_CIUDAD.PORTAL_MAPA) {
      validarConfiguracionPortal(entidad);
    }
  });
}

function validarConfiguracionNpc(configuracionNpc) {
  validarTexto(configuracionNpc.id, `ID de ${configuracionNpc.nombre}`);

  if (
    configuracionNpc.descripcion !== undefined &&
    typeof configuracionNpc.descripcion !== "string"
  ) {
    throw new Error(
      `La descripción de ${configuracionNpc.nombre} debe ser un texto.`,
    );
  }

  if (configuracionNpc.faccion !== undefined) {
    validarTexto(
      configuracionNpc.faccion,
      `facción de ${configuracionNpc.nombre}`,
    );
  }

  const roles = configuracionNpc.roles;

  if (roles !== undefined) {
    if (!Array.isArray(roles) || roles.length === 0) {
      throw new Error(
        `Los roles de ${configuracionNpc.nombre} ` +
          "deben formar una lista no vacía.",
      );
    }

    for (const rol of roles) {
      validarTexto(rol, `rol de ${configuracionNpc.nombre}`);
    }
  } else {
    validarTexto(
      configuracionNpc.rol ?? "npc",
      `rol de ${configuracionNpc.nombre}`,
    );
  }

  if (
    !Array.isArray(configuracionNpc.interacciones) ||
    configuracionNpc.interacciones.length === 0
  ) {
    throw new Error(
      `${configuracionNpc.nombre} necesita al menos una interacción.`,
    );
  }

  if (
    configuracionNpc.datos !== undefined &&
    (!configuracionNpc.datos ||
      typeof configuracionNpc.datos !== "object" ||
      Array.isArray(configuracionNpc.datos))
  ) {
    throw new Error(
      `Los datos adicionales de ${configuracionNpc.nombre} ` +
        "deben formar un objeto válido.",
    );
  }
}

function validarConfiguracionPortal(configuracionPortal) {
  validarTexto(
    configuracionPortal.textoInteraccion,
    `texto de interacción de ${configuracionPortal.nombre}`,
  );

  if (
    configuracionPortal.alcance !== undefined &&
    (!Number.isInteger(configuracionPortal.alcance) ||
      configuracionPortal.alcance < 0)
  ) {
    throw new Error(
      `El alcance de ${configuracionPortal.nombre} ` +
        "debe ser un entero no negativo.",
    );
  }

  if (
    configuracionPortal.prioridad !== undefined &&
    !Number.isFinite(configuracionPortal.prioridad)
  ) {
    throw new Error(
      `La prioridad de ${configuracionPortal.nombre} ` + "debe ser numérica.",
    );
  }
}

function obtenerPosicionJugador({ configuracion, puntoEntrada }) {
  validarTexto(puntoEntrada, "punto de entrada a la ciudad");

  const posicion = configuracion.posicionesJugador[puntoEntrada];

  if (!posicion) {
    throw new Error(
      "La ciudad no contiene el punto de entrada " + `"${puntoEntrada}".`,
    );
  }

  return {
    x: posicion.x,

    y: posicion.y,
  };
}

function validarPosicionMapa({
  configuracion,
  posicion,
  descripcion,
  necesitaSerCaminable,
}) {
  if (
    !posicion ||
    !Number.isInteger(posicion.x) ||
    !Number.isInteger(posicion.y)
  ) {
    throw new Error(`${descripcion} necesita coordenadas enteras.`);
  }

  const alto = configuracion.terreno.length;

  const ancho = configuracion.terreno[0].length;

  const dentroMapa =
    posicion.x >= 0 &&
    posicion.x < ancho &&
    posicion.y >= 0 &&
    posicion.y < alto;

  if (!dentroMapa) {
    throw new Error(`${descripcion} está fuera de la ciudad.`);
  }

  if (!necesitaSerCaminable) {
    return;
  }

  const simbolo = configuracion.terreno[posicion.y][posicion.x];

  const configuracionTerreno = configuracion.apariencia.terrenos[simbolo];

  if (simbolo === "#" || configuracionTerreno.caminable === false) {
    throw new Error(`${descripcion} debe estar sobre una casilla caminable.`);
  }
}

function copiarApariencia(apariencia) {
  const terrenos = {};

  for (const [simbolo, configuracion] of Object.entries(
    apariencia.terrenos ?? {},
  )) {
    terrenos[simbolo] = {
      ...configuracion,
    };
  }

  return {
    ...apariencia,
    terrenos,
  };
}

function validarJugador(player) {
  if (!player || typeof player !== "object") {
    throw new Error("Se necesita un jugador persistente para crear la ciudad.");
  }
}

function validarRecursoVisualOpcional(recursoVisual, nombre) {
  if (
    recursoVisual !== undefined &&
    recursoVisual !== null &&
    (typeof recursoVisual !== "string" || recursoVisual.trim() === "")
  ) {
    throw new Error(
      `El recurso visual de ${nombre} ` + "debe ser una ruta válida o null.",
    );
  }
}

function validarTexto(valor, descripcion) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`El ${descripcion} debe ser un texto válido.`);
  }
}
