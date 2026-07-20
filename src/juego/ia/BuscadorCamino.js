// Direcciones permitidas para recorrer el mapa.
//
// Incluimos movimientos horizontales, verticales
// y diagonales. Todos consumen un movimiento.
const DIRECCIONES = [
  // Movimientos verticales y horizontales.
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },

  // Movimientos diagonales.
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: 1, y: 1 },
];

/**
 * Convierte una posición en un texto único.
 *
 * Esto permite guardar posiciones dentro de
 * Set y Map para encontrarlas rápidamente.
 *
 * @param {number} x Posición horizontal.
 * @param {number} y Posición vertical.
 * @returns {string} Clave de la posición.
 */
function crearClavePosicion(x, y) {
  return `${x},${y}`;
}

/**
 * Comprueba que una posición exista dentro del mapa.
 *
 * @param {Array<string>} mapa Mapa de la partida.
 * @param {number} x Posición horizontal.
 * @param {number} y Posición vertical.
 * @returns {boolean} Verdadero si está dentro del mapa.
 */
function estaDentroDelMapa(mapa, x, y) {
  // Verificamos primero los límites verticales.
  if (y < 0 || y >= mapa.length) {
    return false;
  }

  // Después verificamos los límites horizontales
  // utilizando el ancho de la fila correspondiente.
  return x >= 0 && x < mapa[y].length;
}

/**
 * Comprueba que una casilla pueda ser recorrida.
 *
 * Por ahora solamente el carácter "#" representa
 * una pared que bloquea el movimiento.
 *
 * @param {Array<string>} mapa Mapa de la partida.
 * @param {number} x Posición horizontal.
 * @param {number} y Posición vertical.
 * @returns {boolean} Verdadero si puede caminarse.
 */
function esCasillaCaminable(mapa, x, y) {
  if (!estaDentroDelMapa(mapa, x, y)) {
    return false;
  }

  return mapa[y][x] !== "#";
}

/**
 * Comprueba si un movimiento diagonal intenta pasar
 * entre dos paredes que forman una esquina.
 *
 * Permitimos rodear una sola pared, pero bloqueamos
 * el movimiento cuando ambos laterales están cerrados.
 *
 * @param {Array} mapa Mapa de la partida.
 * @param {number} origenX Posición horizontal actual.
 * @param {number} origenY Posición vertical actual.
 * @param {Object} direccion Dirección evaluada.
 * @returns {boolean} Verdadero si la diagonal está bloqueada.
 */
function estaDiagonalBloqueada(mapa, origenX, origenY, direccion) {
  const esDiagonal = Math.abs(direccion.x) === 1 && Math.abs(direccion.y) === 1;

  // Los movimientos horizontales y verticales
  // no necesitan esta comprobación.
  if (!esDiagonal) {
    return false;
  }

  // Casilla lateral horizontal.
  const horizontalCaminable = esCasillaCaminable(
    mapa,
    origenX + direccion.x,
    origenY,
  );

  // Casilla lateral vertical.
  const verticalCaminable = esCasillaCaminable(
    mapa,
    origenX,
    origenY + direccion.y,
  );

  // Solamente bloqueamos cuando ambos laterales
  // contienen paredes o están fuera del mapa.
  return !horizontalCaminable && !verticalCaminable;
}

/**
 * Busca el siguiente paso del camino más corto
 * entre el origen y el destino.
 *
 * Utiliza BFS porque todas las casillas tienen
 * el mismo coste de movimiento.
 *
 * No devuelve todo el recorrido. Devuelve únicamente
 * la casilla a la que debe moverse ahora el enemigo.
 *
 * @param {Object} opciones Información de búsqueda.
 * @param {Array<string>} opciones.mapa Mapa actual.
 * @param {Object} opciones.origen Posición del enemigo.
 * @param {Object} opciones.destino Posición del jugador.
 * @param {Set<string>} opciones.posicionesBloqueadas
 * Casillas ocupadas por objetos u otros enemigos.
 * @returns {Object|null} Siguiente posición o null.
 */
export function buscarSiguientePaso({
  mapa,
  origen,
  destino,
  posicionesBloqueadas = new Set(),
}) {
  // Validamos que exista un mapa utilizable.
  if (!Array.isArray(mapa) || mapa.length === 0) {
    throw new Error("BuscadorCamino necesita un mapa válido.");
  }

  // Si ambas posiciones ya coinciden,
  // no existe ningún movimiento que realizar.
  if (origen.x === destino.x && origen.y === destino.y) {
    return null;
  }

  // No buscamos un camino hacia una pared
  // o una posición fuera del mapa.
  if (!esCasillaCaminable(mapa, destino.x, destino.y)) {
    return null;
  }

  const claveOrigen = crearClavePosicion(origen.x, origen.y);

  const claveDestino = crearClavePosicion(destino.x, destino.y);

  // La cola contiene las posiciones pendientes
  // de explorar.
  const cola = [
    {
      x: origen.x,
      y: origen.y,
    },
  ];

  // Utilizamos un índice en lugar de shift()
  // para no reorganizar el array en cada recorrido.
  let indiceCola = 0;

  // Registramos las posiciones ya exploradas.
  const visitadas = new Set([claveOrigen]);

  // Guarda desde qué posición llegamos a cada casilla.
  //
  // Después lo utilizaremos para reconstruir el camino.
  const posicionesAnteriores = new Map();

  // Continuamos mientras queden posiciones por explorar.
  while (indiceCola < cola.length) {
    const posicionActual = cola[indiceCola];

    indiceCola += 1;

    // Si encontramos el destino,
    // ya no es necesario seguir explorando.
    if (posicionActual.x === destino.x && posicionActual.y === destino.y) {
      break;
    }

    // Revisamos las cuatro casillas vecinas.
    DIRECCIONES.forEach((direccion) => {
      const nuevaX = posicionActual.x + direccion.x;

      const nuevaY = posicionActual.y + direccion.y;

      const nuevaClave = crearClavePosicion(nuevaX, nuevaY);

      // Evitamos que el enemigo atraviese diagonalmente
      // entre dos paredes que se tocan por una esquina.
      if (
        estaDiagonalBloqueada(
          mapa,
          posicionActual.x,
          posicionActual.y,
          direccion,
        )
      ) {
        return;
      }

      // Las paredes y posiciones exteriores
      // no pueden formar parte del camino.
      if (!esCasillaCaminable(mapa, nuevaX, nuevaY)) {
        return;
      }

      // No repetimos casillas ya exploradas.
      if (visitadas.has(nuevaClave)) {
        return;
      }

      // Otros enemigos y objetos bloquean el camino.
      //
      // El destino queda exceptuado porque representa
      // la posición del jugador.
      if (posicionesBloqueadas.has(nuevaClave) && nuevaClave !== claveDestino) {
        return;
      }

      // Marcamos la casilla como visitada.
      visitadas.add(nuevaClave);

      // Guardamos desde dónde llegamos.
      posicionesAnteriores.set(nuevaClave, {
        x: posicionActual.x,
        y: posicionActual.y,
      });

      // La agregamos a la cola para explorarla.
      cola.push({
        x: nuevaX,
        y: nuevaY,
      });
    });
  }

  // Si nunca alcanzamos el destino,
  // significa que no existe un camino disponible.
  if (!visitadas.has(claveDestino)) {
    return null;
  }

  // Comenzamos desde el destino y retrocedemos
  // hasta encontrar la primera casilla tras el origen.
  let pasoActual = {
    x: destino.x,
    y: destino.y,
  };

  while (true) {
    const clavePasoActual = crearClavePosicion(pasoActual.x, pasoActual.y);

    const pasoAnterior = posicionesAnteriores.get(clavePasoActual);

    // Protección ante una reconstrucción incompleta.
    if (!pasoAnterior) {
      return null;
    }

    // Cuando el paso anterior es el origen,
    // pasoActual es el primer movimiento del camino.
    if (pasoAnterior.x === origen.x && pasoAnterior.y === origen.y) {
      return pasoActual;
    }

    // Seguimos retrocediendo por el recorrido.
    pasoActual = pasoAnterior;
  }
}
