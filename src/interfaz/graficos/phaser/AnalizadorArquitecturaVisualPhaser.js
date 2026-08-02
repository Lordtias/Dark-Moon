// Deriva una lectura arquitectónica exclusivamente visual desde la matriz
// canónica. No modifica caminabilidad, ocupación, IA ni reglas de combate.
export function analizarArquitecturaVisualPhaser({ mapa, entidades = [] } = {}) {
  validarMapa(mapa);

  const puertas = obtenerPuertas(entidades);
  const casillasPuerta = new Set();

  for (const puerta of puertas) {
    for (const casilla of puerta.casillas) {
      casillasPuerta.add(clave(casilla.x, casilla.y));
    }
  }

  const esPared = (x, y) =>
    y >= 0 &&
    y < mapa.length &&
    x >= 0 &&
    x < mapa[y].length &&
    mapa[y][x] === "#" &&
    !casillasPuerta.has(clave(x, y));

  return Object.freeze({
    columnas: mapa[0].length,
    filas: mapa.length,
    regionesSuelo: congelarLista(crearRegionesSuelo({ mapa, esPared })),
    tramosMuro: congelarLista(crearTramosMuro({ mapa, esPared })),
    frentesSur: congelarLista(crearFrentesSur({ mapa, esPared })),
    lateralesEste: congelarLista(crearLateralesEste({ mapa, esPared })),
    lateralesOeste: congelarLista(crearLateralesOeste({ mapa, esPared })),
    esquinas: congelarLista(crearEsquinas({ mapa, esPared })),
    puertas: congelarLista(puertas),
  });
}

function crearRegionesSuelo({ mapa, esPared }) {
  const terminadas = [];
  let activas = new Map();

  for (let y = 0; y < mapa.length; y += 1) {
    const corridas = obtenerCorridasFila({
      columnas: mapa[y].length,
      cumple: (x) => !esPared(x, y),
    });
    const siguientes = new Map();

    for (const corrida of corridas) {
      const id = `${corrida.inicio}:${corrida.longitud}`;
      const previa = activas.get(id);

      if (previa) {
        previa.altoCasillas += 1;
        siguientes.set(id, previa);
      } else {
        siguientes.set(id, {
          x: corrida.inicio,
          y,
          anchoCasillas: corrida.longitud,
          altoCasillas: 1,
        });
      }
    }

    for (const [id, region] of activas) {
      if (!siguientes.has(id)) {
        terminadas.push(region);
      }
    }

    activas = siguientes;
  }

  terminadas.push(...activas.values());
  return terminadas;
}

function crearTramosMuro({ mapa, esPared }) {
  const orientacion = new Map();

  for (let y = 0; y < mapa.length; y += 1) {
    for (let x = 0; x < mapa[y].length; x += 1) {
      if (!esPared(x, y)) continue;

      const horizontal = esPared(x - 1, y) || esPared(x + 1, y);
      const vertical = esPared(x, y - 1) || esPared(x, y + 1);
      orientacion.set(
        clave(x, y),
        horizontal || !vertical ? "horizontal" : "vertical",
      );
    }
  }

  const tramos = [];

  for (let y = 0; y < mapa.length; y += 1) {
    for (const corrida of obtenerCorridasFila({
      columnas: mapa[y].length,
      cumple: (x) => orientacion.get(clave(x, y)) === "horizontal",
    })) {
      tramos.push({
        orientacion: "horizontal",
        x: corrida.inicio,
        y,
        longitudCasillas: corrida.longitud,
      });
    }
  }

  for (let x = 0; x < mapa[0].length; x += 1) {
    for (const corrida of obtenerCorridasColumna({
      filas: mapa.length,
      cumple: (y) => orientacion.get(clave(x, y)) === "vertical",
    })) {
      tramos.push({
        orientacion: "vertical",
        x,
        y: corrida.inicio,
        longitudCasillas: corrida.longitud,
      });
    }
  }

  return tramos;
}

function crearFrentesSur({ mapa, esPared }) {
  const frentes = [];

  for (let y = 0; y < mapa.length; y += 1) {
    for (const corrida of obtenerCorridasFila({
      columnas: mapa[y].length,
      cumple: (x) => esPared(x, y) && !esPared(x, y + 1),
    })) {
      frentes.push({
        x: corrida.inicio,
        y,
        longitudCasillas: corrida.longitud,
      });
    }
  }

  return frentes;
}

function crearLateralesEste({ mapa, esPared }) {
  const laterales = [];

  for (let x = 0; x < mapa[0].length; x += 1) {
    for (const corrida of obtenerCorridasColumna({
      filas: mapa.length,
      cumple: (y) => esPared(x, y) && !esPared(x + 1, y),
    })) {
      laterales.push({
        x,
        y: corrida.inicio,
        longitudCasillas: corrida.longitud,
      });
    }
  }

  return laterales;
}

function crearLateralesOeste({ mapa, esPared }) {
  const laterales = [];

  for (let x = 0; x < mapa[0].length; x += 1) {
    for (const corrida of obtenerCorridasColumna({
      filas: mapa.length,
      cumple: (y) => esPared(x, y) && !esPared(x - 1, y),
    })) {
      laterales.push({
        x,
        y: corrida.inicio,
        longitudCasillas: corrida.longitud,
      });
    }
  }

  return laterales;
}

function crearEsquinas({ mapa, esPared }) {
  const esquinas = [];

  for (let y = 0; y < mapa.length; y += 1) {
    for (let x = 0; x < mapa[y].length; x += 1) {
      if (!esPared(x, y)) continue;

      const expuestaNorte = !esPared(x, y - 1);
      const expuestaSur = !esPared(x, y + 1);
      const expuestaOeste = !esPared(x - 1, y);
      const expuestaEste = !esPared(x + 1, y);

      if (expuestaSur && expuestaOeste) {
        esquinas.push({ x, y, orientacion: "suroeste" });
      }
      if (expuestaSur && expuestaEste) {
        esquinas.push({ x, y, orientacion: "sureste" });
      }
      if (expuestaNorte && expuestaOeste) {
        esquinas.push({ x, y, orientacion: "noroeste" });
      }
      if (expuestaNorte && expuestaEste) {
        esquinas.push({ x, y, orientacion: "noreste" });
      }
    }
  }

  return esquinas;
}

function obtenerPuertas(entidades) {
  if (!Array.isArray(entidades)) {
    return [];
  }

  return entidades
    .map((entidad) => entidad?.arquitectura)
    .filter((arquitectura) => arquitectura?.tipo === "puerta")
    .map((puerta) => ({
      ...puerta,
      casillas: (puerta.casillas ?? []).map((casilla) => ({ ...casilla })),
    }));
}

function obtenerCorridasFila({ columnas, cumple }) {
  const corridas = [];
  let inicio = null;

  for (let x = 0; x <= columnas; x += 1) {
    const activa = x < columnas && cumple(x);

    if (activa && inicio === null) {
      inicio = x;
    } else if (!activa && inicio !== null) {
      corridas.push({ inicio, longitud: x - inicio });
      inicio = null;
    }
  }

  return corridas;
}

function obtenerCorridasColumna({ filas, cumple }) {
  const corridas = [];
  let inicio = null;

  for (let y = 0; y <= filas; y += 1) {
    const activa = y < filas && cumple(y);

    if (activa && inicio === null) {
      inicio = y;
    } else if (!activa && inicio !== null) {
      corridas.push({ inicio, longitud: y - inicio });
      inicio = null;
    }
  }

  return corridas;
}

function congelarLista(lista) {
  return Object.freeze(lista.map((elemento) => Object.freeze({ ...elemento })));
}

function validarMapa(mapa) {
  if (!Array.isArray(mapa) || mapa.length === 0 || !Array.isArray(mapa[0])) {
    throw new Error("El analizador arquitectónico necesita un mapa válido.");
  }

  const columnas = mapa[0].length;
  if (columnas === 0 || mapa.some((fila) => fila.length !== columnas)) {
    throw new Error("El mapa arquitectónico debe ser rectangular.");
  }
}

function clave(x, y) {
  return `${x},${y}`;
}
