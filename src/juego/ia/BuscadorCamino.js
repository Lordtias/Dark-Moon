// Direcciones permitidas para recorrer el mapa.
//
// Incluimos movimientos horizontales, verticales y diagonales. Todos consumen
// un movimiento. El algoritmo continúa siendo BFS; solamente cambia la fuente
// canónica que responde qué casillas bloquean el paso.
const DIRECCIONES = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: 1, y: 1 },
];

function crearClavePosicion(x, y) {
  return `${x},${y}`;
}

/**
 * Busca el siguiente paso del camino más corto entre origen y destino.
 *
 * @param {Object} opciones Información de búsqueda.
 * @param {Object} opciones.sistemaEspacial Autoridad espacial del mapa activo.
 * @param {Object} opciones.origen Posición del enemigo.
 * @param {Object} opciones.destino Posición del jugador.
 * @param {Array<Object>} opciones.ignorarEntidades Entidades que no deben
 * bloquear esta búsqueda, normalmente el actor que se mueve y su destino.
 * @returns {Object|null} Siguiente posición o null.
 */
export function buscarSiguientePaso({
  sistemaEspacial,
  origen,
  destino,
  ignorarEntidades = [],
} = {}) {
  if (
    !sistemaEspacial ||
    typeof sistemaEspacial.bloqueaMovimiento !== "function" ||
    typeof sistemaEspacial.bloqueaPasoDiagonal !== "function" ||
    typeof sistemaEspacial.estaDentroMapa !== "function"
  ) {
    throw new Error("BuscadorCamino necesita un sistema espacial válido.");
  }
  validarPosicion(origen, "el origen del camino");
  validarPosicion(destino, "el destino del camino");

  if (origen.x === destino.x && origen.y === destino.y) {
    return null;
  }
  if (
    !sistemaEspacial.estaDentroMapa(destino.x, destino.y) ||
    sistemaEspacial.bloqueaMovimiento(destino.x, destino.y, {
      ignorarEntidades,
    })
  ) {
    return null;
  }

  const claveOrigen = crearClavePosicion(origen.x, origen.y);
  const claveDestino = crearClavePosicion(destino.x, destino.y);
  const cola = [{ x: origen.x, y: origen.y }];
  let indiceCola = 0;
  const visitadas = new Set([claveOrigen]);
  const posicionesAnteriores = new Map();

  while (indiceCola < cola.length) {
    const posicionActual = cola[indiceCola];
    indiceCola += 1;

    if (posicionActual.x === destino.x && posicionActual.y === destino.y) {
      break;
    }

    for (const direccion of DIRECCIONES) {
      const nuevaX = posicionActual.x + direccion.x;
      const nuevaY = posicionActual.y + direccion.y;
      const nuevaClave = crearClavePosicion(nuevaX, nuevaY);

      if (
        sistemaEspacial.bloqueaPasoDiagonal({
          origen: posicionActual,
          movimientoX: direccion.x,
          movimientoY: direccion.y,
          ignorarEntidades,
        })
      ) {
        continue;
      }
      if (
        sistemaEspacial.bloqueaMovimiento(nuevaX, nuevaY, {
          ignorarEntidades,
        })
      ) {
        continue;
      }
      if (visitadas.has(nuevaClave)) {
        continue;
      }

      visitadas.add(nuevaClave);
      posicionesAnteriores.set(nuevaClave, {
        x: posicionActual.x,
        y: posicionActual.y,
      });
      cola.push({ x: nuevaX, y: nuevaY });
    }
  }

  if (!visitadas.has(claveDestino)) {
    return null;
  }

  let pasoActual = { x: destino.x, y: destino.y };
  while (true) {
    const clavePasoActual = crearClavePosicion(pasoActual.x, pasoActual.y);
    const pasoAnterior = posicionesAnteriores.get(clavePasoActual);
    if (!pasoAnterior) return null;
    if (pasoAnterior.x === origen.x && pasoAnterior.y === origen.y) {
      return pasoActual;
    }
    pasoActual = pasoAnterior;
  }
}

function validarPosicion(posicion, descripcion) {
  if (!Number.isInteger(posicion?.x) || !Number.isInteger(posicion?.y)) {
    throw new Error(`${descripcion} debe usar coordenadas enteras.`);
  }
}
