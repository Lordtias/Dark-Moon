// Centraliza las consultas espaciales canónicas del mapa activo.
//
// Su responsabilidad es responder qué existe en una posición y si ese
// contenido bloquea movimiento, visión o el cruce físico de una esquina.
// No mueve actores, no resuelve
// combate y no conoce nombres concretos de entidades, habilidades o mapas.
export class SistemaEspacial {
  constructor({
    mapa,
    obtenerEntidades = () => [],
    obtenerZonas = () => [],
  } = {}) {
    validarMapa(mapa);
    validarFuncion(obtenerEntidades, "consultar las entidades del mapa");
    validarFuncion(obtenerZonas, "consultar las zonas espaciales activas");

    this.mapa = mapa;
    this.obtenerEntidades = obtenerEntidades;
    this.obtenerZonas = obtenerZonas;
  }

  estaDentroMapa(x, y) {
    return estaDentroMapa(this.mapa, x, y);
  }

  consultarTerreno(x, y) {
    return consultarTerrenoMapa(this.mapa, x, y);
  }

  consultarPosicion(x, y, { ignorarEntidades = [] } = {}) {
    const terreno = this.consultarTerreno(x, y);
    const entidadesIgnoradas = new Set(
      Array.isArray(ignorarEntidades) ? ignorarEntidades : [],
    );
    const entidades = terreno.dentroMapa
      ? this.obtenerEntidadesEn(x, y).filter(
          (entidad) => !entidadesIgnoradas.has(entidad),
        )
      : [];
    const zonas = terreno.dentroMapa ? this.obtenerZonasEn(x, y) : [];

    const bloqueaMovimiento =
      terreno.bloqueaMovimiento ||
      entidades.some((entidad) => entidad?.bloqueaMovimiento === true) ||
      zonas.some((zona) => zona?.bloqueaMovimiento === true);
    const bloqueaVision =
      terreno.bloqueaVision ||
      entidades.some((entidad) => entidad?.bloqueaVision === true) ||
      zonas.some((zona) => zona?.bloqueaVision === true);
    const bloqueaCruceDiagonal =
      terreno.bloqueaCruceDiagonal ||
      entidades.some((entidad) => entidad?.bloqueaCruceDiagonal === true) ||
      zonas.some((zona) => zona?.bloqueaCruceDiagonal === true);

    return {
      x,
      y,
      dentroMapa: terreno.dentroMapa,
      terreno,
      entidades,
      zonas,
      bloqueaMovimiento,
      bloqueaVision,
      bloqueaCruceDiagonal,
    };
  }

  bloqueaMovimiento(x, y, opciones = {}) {
    return this.consultarPosicion(x, y, opciones).bloqueaMovimiento;
  }

  bloqueaVision(x, y, opciones = {}) {
    return this.consultarPosicion(x, y, opciones).bloqueaVision;
  }

  bloqueaCruceDiagonal(x, y, opciones = {}) {
    return this.consultarPosicion(x, y, opciones).bloqueaCruceDiagonal;
  }

  bloqueaPasoDiagonal({
    origen,
    movimientoX,
    movimientoY,
    ignorarEntidades = [],
  } = {}) {
    if (!Number.isInteger(origen?.x) || !Number.isInteger(origen?.y)) {
      throw new Error(
        "La consulta diagonal necesita una posición de origen válida.",
      );
    }

    const esDiagonal =
      Math.abs(movimientoX) === 1 && Math.abs(movimientoY) === 1;
    if (!esDiagonal) return false;

    const horizontalBloqueada = this.bloqueaCruceDiagonal(
      origen.x + movimientoX,
      origen.y,
      { ignorarEntidades },
    );
    const verticalBloqueada = this.bloqueaCruceDiagonal(
      origen.x,
      origen.y + movimientoY,
      { ignorarEntidades },
    );

    return horizontalBloqueada && verticalBloqueada;
  }

  obtenerEntidadesEn(x, y) {
    const candidatas = this.obtenerEntidades();
    if (!Array.isArray(candidatas)) {
      throw new Error(
        "La consulta de entidades del sistema espacial debe devolver una lista.",
      );
    }

    const unicas = new Set();
    for (const entidad of candidatas) {
      if (!entidad || typeof entidad !== "object" || unicas.has(entidad)) {
        continue;
      }
      unicas.add(entidad);
    }

    return [...unicas].filter(
      (entidad) =>
        entidad.estaDestruido !== true && entidad.x === x && entidad.y === y,
    );
  }

  obtenerZonasEn(x, y) {
    const zonas = this.obtenerZonas();
    if (!Array.isArray(zonas)) {
      throw new Error(
        "La consulta de zonas del sistema espacial debe devolver una lista.",
      );
    }

    return zonas.filter(
      (zona) =>
        zona &&
        typeof zona === "object" &&
        Array.isArray(zona.casillas) &&
        zona.casillas.some((casilla) => casilla.x === x && casilla.y === y),
    );
  }
}

// Mantiene en un único lugar el significado espacial de la representación
// actual del terreno. Los consumidores no deben interpretar directamente el
// símbolo "#" para decidir reglas de movimiento o visión.
export function consultarTerrenoMapa(mapa, x, y) {
  validarMapa(mapa);
  const dentroMapa = estaDentroMapa(mapa, x, y);
  if (!dentroMapa) {
    return {
      x,
      y,
      dentroMapa: false,
      simbolo: null,
      bloqueaMovimiento: true,
      bloqueaVision: true,
      bloqueaCruceDiagonal: true,
    };
  }

  const simbolo = mapa[y][x];
  const esPared = simbolo === "#";
  return {
    x,
    y,
    dentroMapa: true,
    simbolo,
    bloqueaMovimiento: esPared,
    bloqueaVision: esPared,
    bloqueaCruceDiagonal: esPared,
  };
}

function estaDentroMapa(mapa, x, y) {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    y >= 0 &&
    y < mapa.length &&
    x >= 0 &&
    x < mapa[y].length
  );
}

function validarMapa(mapa) {
  if (!Array.isArray(mapa) || mapa.length === 0) {
    throw new Error("SistemaEspacial necesita un mapa válido.");
  }
}

function validarFuncion(funcion, descripcion) {
  if (typeof funcion !== "function") {
    throw new Error(`SistemaEspacial necesita ${descripcion}.`);
  }
}
