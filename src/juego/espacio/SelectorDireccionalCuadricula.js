// Selecciona una posición discreta según una dirección de entrada.
//
// Esta primitiva solo resuelve geometría de navegación. No conoce combate,
// interacciones, habilidades, entidades ni reglas de validez específicas.
// Los consumidores deben entregar únicamente las posiciones que realmente
// forman parte de su selector.
export function seleccionarPosicionEnDireccion({
  posiciones,
  posicionActual,
  movimientoX,
  movimientoY,
} = {}) {
  validarPosiciones(posiciones);
  validarMovimiento({ movimientoX, movimientoY });

  if (!posicionActual) {
    return posiciones[0] ?? null;
  }

  validarPosicion(posicionActual);

  const candidatas = posiciones
    .map((posicion, indice) =>
      crearCandidata({
        posicion,
        posicionActual,
        movimientoX,
        movimientoY,
        orden: resolverOrden(posicion, indice),
      }),
    )
    .filter((candidata) => candidata !== null);

  if (candidatas.length === 0) {
    return posicionActual;
  }

  candidatas.sort(
    (primera, segunda) =>
      segunda.alineacion - primera.alineacion ||
      primera.distancia - segunda.distancia ||
      primera.orden - segunda.orden,
  );

  return candidatas[0].posicion;
}

function crearCandidata({
  posicion,
  posicionActual,
  movimientoX,
  movimientoY,
  orden,
}) {
  const diferenciaX = posicion.x - posicionActual.x;
  const diferenciaY = posicion.y - posicionActual.y;

  if (diferenciaX === 0 && diferenciaY === 0) {
    return null;
  }

  // Un producto escalar positivo garantiza que la posición candidata se
  // encuentra por delante de la dirección solicitada.
  const productoEscalar = diferenciaX * movimientoX + diferenciaY * movimientoY;
  if (productoEscalar <= 0) {
    return null;
  }

  const magnitudDiferencia = Math.hypot(diferenciaX, diferenciaY);
  const magnitudMovimiento = Math.hypot(movimientoX, movimientoY);
  const alineacion =
    productoEscalar / (magnitudDiferencia * magnitudMovimiento);
  const distancia = Math.max(Math.abs(diferenciaX), Math.abs(diferenciaY));

  return {
    posicion,
    alineacion,
    distancia,
    orden,
  };
}

function resolverOrden(posicion, indice) {
  return Number.isInteger(posicion.orden) ? posicion.orden : indice;
}

function validarPosiciones(posiciones) {
  if (!Array.isArray(posiciones)) {
    throw new Error("Las posiciones del selector deben estar dentro de una lista.");
  }

  for (const posicion of posiciones) {
    validarPosicion(posicion);
  }
}

function validarPosicion(posicion) {
  if (
    !posicion ||
    typeof posicion !== "object" ||
    !Number.isInteger(posicion.x) ||
    !Number.isInteger(posicion.y)
  ) {
    throw new Error("Existe una posición inválida para navegación direccional.");
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
    throw new Error("El movimiento del selector no es válido.");
  }
}
