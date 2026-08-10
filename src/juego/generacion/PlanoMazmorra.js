const PARED = "#";
const SUELO = ".";

// Construye el contrato descriptivo de una mazmorra ya generada.
//
// No resuelve reglas de juego: solamente conserva la estructura
// necesaria para que otros sistemas canónicos puedan consumirla.
export function crearPlanoMazmorra({
  celdas,
  ancho,
  alto,
  habitaciones,
  pasillos,
  puntosConexion,
  conexiones,
  zonaEntrada,
  salidaEstructural,
  zonasCandidatasSalida,
  zonasCandidatasPoblacion,
  porcentajeNoCaminableReal,
  porcentajeConectado,
  intentoExitoso,
} = {}) {
  validarDimensiones(ancho, alto);
  validarCeldas(celdas, ancho, alto);
  validarLista(habitaciones, "habitaciones");
  validarLista(pasillos, "pasillos");
  validarLista(puntosConexion, "puntos de conexión");
  validarLista(conexiones, "conexiones");
  validarZonaEntrada(zonaEntrada);
  validarSalidaEstructural(salidaEstructural);
  validarLista(zonasCandidatasSalida, "zonas candidatas de salida");
  validarLista(zonasCandidatasPoblacion, "zonas candidatas de población");

  const casillasTransitables = obtenerCasillas(celdas, SUELO);
  const casillasBloqueadas = obtenerCasillas(celdas, PARED);

  if (casillasTransitables.length + casillasBloqueadas.length !== ancho * alto) {
    throw new Error("El plano contiene símbolos de terreno no reconocidos.");
  }

  const posicionInicialSugerida = {
    ...zonaEntrada.posicionSugerida,
  };
  const casillasReservadasContenido = deduplicarCasillas([
    ...(zonaEntrada.casillasReservadas ?? []),
    ...(salidaEstructural.casillasReservadas ?? []),
  ]);

  return {
    celdas: [...celdas],
    ancho,
    alto,

    habitaciones,
    pasillos,
    puntosConexion,
    conexiones,

    zonaEntrada,
    salidaEstructural,
    zonasCandidatasSalida,
    zonasCandidatasPoblacion,

    casillasReservadasContenido,

    casillasTransitables,
    casillasBloqueadas,

    posicionInicialSugerida,

    porcentajeNoCaminableReal,
    porcentajeConectado,
    intentoExitoso,
  };
}

export function contieneCasillaHabitacion(habitacion, posicion) {
  if (!habitacion || !posicion) return false;

  return (
    posicion.x >= habitacion.x &&
    posicion.x < habitacion.x + habitacion.ancho &&
    posicion.y >= habitacion.y &&
    posicion.y < habitacion.y + habitacion.alto
  );
}

// Describe la geometría de un punto situado sobre el límite de una habitación.
// No decide si allí debe existir una puerta u otro interactuable.
export function analizarAccesoHabitacion({ punto, habitacion } = {}) {
  if (!punto || !habitacion) return null;

  let direccionInterior = null;
  let ejeLimite = null;

  if (punto.x < habitacion.x) {
    direccionInterior = { x: 1, y: 0 };
    ejeLimite = "vertical";
  } else if (punto.x >= habitacion.x + habitacion.ancho) {
    direccionInterior = { x: -1, y: 0 };
    ejeLimite = "vertical";
  } else if (punto.y < habitacion.y) {
    direccionInterior = { x: 0, y: 1 };
    ejeLimite = "horizontal";
  } else if (punto.y >= habitacion.y + habitacion.alto) {
    direccionInterior = { x: 0, y: -1 };
    ejeLimite = "horizontal";
  } else {
    return null;
  }

  return {
    ejeLimite,
    direccionInterior,
    haciaHabitacion: {
      x: punto.x + direccionInterior.x,
      y: punto.y + direccionInterior.y,
    },
    haciaExterior: {
      x: punto.x - direccionInterior.x,
      y: punto.y - direccionInterior.y,
    },
    lateralA: {
      x: punto.x + direccionInterior.y,
      y: punto.y + direccionInterior.x,
    },
    lateralB: {
      x: punto.x - direccionInterior.y,
      y: punto.y - direccionInterior.x,
    },
  };
}

function validarDimensiones(ancho, alto) {
  if (!Number.isInteger(ancho) || ancho < 1 || !Number.isInteger(alto) || alto < 1) {
    throw new Error("El plano necesita dimensiones enteras válidas.");
  }
}

function validarCeldas(celdas, ancho, alto) {
  if (!Array.isArray(celdas) || celdas.length !== alto) {
    throw new Error("La matriz del plano no coincide con el alto declarado.");
  }

  for (const fila of celdas) {
    if (typeof fila !== "string" || fila.length !== ancho) {
      throw new Error("La matriz del plano no coincide con el ancho declarado.");
    }
  }
}

function validarLista(lista, descripcion) {
  if (!Array.isArray(lista)) {
    throw new Error(`El plano debe declarar ${descripcion} como lista.`);
  }
}

function validarZonaEntrada(zonaEntrada) {
  if (!zonaEntrada || typeof zonaEntrada !== "object") {
    throw new Error("El plano debe declarar una zona de entrada.");
  }

  const posicion = zonaEntrada.posicionSugerida;

  if (
    !posicion ||
    !Number.isInteger(posicion.x) ||
    !Number.isInteger(posicion.y)
  ) {
    throw new Error("La zona de entrada necesita una posición sugerida válida.");
  }
}

function validarSalidaEstructural(salidaEstructural) {
  if (!salidaEstructural || typeof salidaEstructural !== "object") {
    throw new Error("El plano debe declarar una salida estructural.");
  }

  for (const nombre of ["posicionPortal", "posicionAcceso"]) {
    const posicion = salidaEstructural[nombre];

    if (
      !posicion ||
      !Number.isInteger(posicion.x) ||
      !Number.isInteger(posicion.y)
    ) {
      throw new Error(`La salida estructural necesita ${nombre} válida.`);
    }
  }

  if (!Array.isArray(salidaEstructural.casillasReservadas)) {
    throw new Error("La salida estructural debe reservar sus casillas de acceso.");
  }
}

function deduplicarCasillas(casillas) {
  const claves = new Set();
  const resultado = [];

  for (const casilla of casillas) {
    const clave = `${casilla.x},${casilla.y}`;
    if (claves.has(clave)) continue;
    claves.add(clave);
    resultado.push({ x: casilla.x, y: casilla.y });
  }

  return resultado;
}

function obtenerCasillas(celdas, simbolo) {
  const resultado = [];

  for (let y = 0; y < celdas.length; y++) {
    for (let x = 0; x < celdas[y].length; x++) {
      if (celdas[y][x] === simbolo) {
        resultado.push({ x, y });
      }
    }
  }

  return resultado;
}
