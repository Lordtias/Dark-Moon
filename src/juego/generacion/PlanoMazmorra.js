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

  return {
    celdas: [...celdas],
    ancho,
    alto,

    habitaciones,
    pasillos,
    puntosConexion,
    conexiones,

    zonaEntrada,
    zonasCandidatasSalida,
    zonasCandidatasPoblacion,

    casillasTransitables,
    casillasBloqueadas,

    // Alias de compatibilidad con consumidores previos a E1.
    // Ambos se derivan del mismo plano y no constituyen
    // una segunda fuente de verdad.
    casillasCaminables: casillasTransitables,
    posicionInicialSugerida,

    porcentajeNoCaminableReal,
    porcentajeConectado,
    intentoExitoso,
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
