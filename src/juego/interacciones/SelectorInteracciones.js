// Convierte una lista de interacciones ordenadas
// en una lista de entidades seleccionables.
//
// Una entidad puede ofrecer varias interacciones:
//
// - Hablar.
// - Comerciar.
// - Entregar misión.
//
// Aun así, debe aparecer una sola vez en el selector.
export function crearOpcionesInteraccion(interacciones) {
  if (!Array.isArray(interacciones)) {
    throw new Error("Las interacciones deben estar dentro de una lista.");
  }

  const opcionesPorEntidad = new Map();

  for (const interaccion of interacciones) {
    validarInteraccion(interaccion);

    const entidad = interaccion.entidad;

    if (!opcionesPorEntidad.has(entidad)) {
      opcionesPorEntidad.set(entidad, {
        entidad,

        // Como las interacciones ya llegan ordenadas
        // por SistemaInteracciones, la primera es
        // la prioritaria para esa entidad.
        interaccionPrioritaria: interaccion,

        interacciones: [],

        x: entidad.x,

        y: entidad.y,

        orden: opcionesPorEntidad.size,
      });
    }

    opcionesPorEntidad.get(entidad).interacciones.push(interaccion);
  }

  return [...opcionesPorEntidad.values()];
}

// Busca la mejor opción disponible
// en la dirección indicada.
//
// La selección prioriza:
//
// 1. Mayor alineación con la dirección.
// 2. Menor distancia.
// 3. Orden original de prioridad.
//
// Por ejemplo, al presionar derecha:
//
// - Una entidad exactamente a la derecha tiene
//   mejor alineación que una ubicada en diagonal.
// - Si dos entidades están igual de alineadas,
//   se elige la más cercana.
export function seleccionarOpcionEnDireccion({
  opciones,
  opcionActual,
  movimientoX,
  movimientoY,
} = {}) {
  validarOpciones(opciones);

  validarMovimiento({
    movimientoX,
    movimientoY,
  });

  if (!opcionActual) {
    return opciones[0] ?? null;
  }

  const candidatas = opciones
    .filter((opcion) => opcion !== opcionActual)
    .map((opcion) =>
      crearCandidata({
        opcion,
        opcionActual,
        movimientoX,
        movimientoY,
      }),
    )
    .filter((candidata) => candidata !== null);

  if (candidatas.length === 0) {
    return opcionActual;
  }

  candidatas.sort(
    (primera, segunda) =>
      segunda.alineacion - primera.alineacion ||
      primera.distancia - segunda.distancia ||
      primera.opcion.orden - segunda.opcion.orden,
  );

  return candidatas[0].opcion;
}

function crearCandidata({ opcion, opcionActual, movimientoX, movimientoY }) {
  const diferenciaX = opcion.x - opcionActual.x;

  const diferenciaY = opcion.y - opcionActual.y;

  if (diferenciaX === 0 && diferenciaY === 0) {
    return null;
  }

  // El producto escalar debe ser positivo.
  //
  // Eso garantiza que la opción se encuentre
  // delante de la dirección solicitada.
  const productoEscalar = diferenciaX * movimientoX + diferenciaY * movimientoY;

  if (productoEscalar <= 0) {
    return null;
  }

  const magnitudDiferencia = Math.hypot(diferenciaX, diferenciaY);

  const magnitudMovimiento = Math.hypot(movimientoX, movimientoY);

  const alineacion =
    productoEscalar / (magnitudDiferencia * magnitudMovimiento);

  const distancia = Math.max(
    Math.abs(diferenciaX),

    Math.abs(diferenciaY),
  );

  return {
    opcion,
    alineacion,
    distancia,
  };
}

function validarOpciones(opciones) {
  if (!Array.isArray(opciones)) {
    throw new Error(
      "Las opciones de interacción deben estar dentro de una lista.",
    );
  }

  for (const opcion of opciones) {
    if (
      !opcion ||
      typeof opcion !== "object" ||
      !opcion.entidad ||
      !Number.isInteger(opcion.x) ||
      !Number.isInteger(opcion.y)
    ) {
      throw new Error("Existe una opción de interacción inválida.");
    }
  }
}

function validarMovimiento({ movimientoX, movimientoY }) {
  const componentesValidos =
    Number.isInteger(movimientoX) &&
    Number.isInteger(movimientoY) &&
    movimientoX >= -1 &&
    movimientoX <= 1 &&
    movimientoY >= -1 &&
    movimientoY <= 1;

  if (!componentesValidos || (movimientoX === 0 && movimientoY === 0)) {
    throw new Error("El movimiento del selector de interacción no es válido.");
  }
}

function validarInteraccion(interaccion) {
  if (
    !interaccion ||
    typeof interaccion !== "object" ||
    !interaccion.entidad ||
    !Number.isInteger(interaccion.entidad.x) ||
    !Number.isInteger(interaccion.entidad.y)
  ) {
    throw new Error("Existe una interacción sin una entidad válida.");
  }
}
