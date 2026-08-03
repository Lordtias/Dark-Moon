const DIRECCIONES_CARDINALES = Object.freeze({
  norte: Object.freeze({ dx: 0, dy: -1 }),
  este: Object.freeze({ dx: 1, dy: 0 }),
  sur: Object.freeze({ dx: 0, dy: 1 }),
  oeste: Object.freeze({ dx: -1, dy: 0 }),
});

const DIRECCIONES_DIAGONALES = Object.freeze({
  noroeste: Object.freeze({ dx: -1, dy: -1 }),
  noreste: Object.freeze({ dx: 1, dy: -1 }),
  sureste: Object.freeze({ dx: 1, dy: 1 }),
  suroeste: Object.freeze({ dx: -1, dy: 1 }),
});

export function analizarVecindadPared(
  mapa,
  x,
  y,
  { simboloPared = "#", esPared = null } = {},
) {
  return crearAnalisisVecindad({
    mapa,
    x,
    y,
    tipoObjetivo: "pared",
    predicadoPared: normalizarPredicadoPared({ simboloPared, esPared }),
  });
}

export function analizarVecindadSuelo(
  mapa,
  x,
  y,
  { simboloPared = "#", esPared = null } = {},
) {
  return crearAnalisisVecindad({
    mapa,
    x,
    y,
    tipoObjetivo: "suelo",
    predicadoPared: normalizarPredicadoPared({ simboloPared, esPared }),
  });
}

function crearAnalisisVecindad({
  mapa,
  x,
  y,
  tipoObjetivo,
  predicadoPared,
}) {
  const actual = obtenerCasilla(mapa, x, y);
  const esParedActual = actual.existe && predicadoPared(actual.valor);
  const corresponde =
    actual.existe &&
    (tipoObjetivo === "pared" ? esParedActual : !esParedActual);

  const vecinosCardinales = crearVecinos({
    mapa,
    x,
    y,
    direcciones: DIRECCIONES_CARDINALES,
    predicadoPared,
  });
  const vecinosDiagonales = crearVecinos({
    mapa,
    x,
    y,
    direcciones: DIRECCIONES_DIAGONALES,
    predicadoPared,
  });

  const cardinales = Object.freeze(
    mapearVecinos(vecinosCardinales, (vecino) => vecino.esPared),
  );
  const diagonales = Object.freeze(
    mapearVecinos(vecinosDiagonales, (vecino) => vecino.esPared),
  );

  const ladosExpuestos = Object.freeze(
    mapearVecinos(vecinosCardinales, (vecino) => {
      if (!corresponde) return false;

      // El exterior de la matriz no es piso. Un borde solo aparece cuando
      // la pared toca una casilla real no-pared del mapa.
      return tipoObjetivo === "pared"
        ? vecino.existe && !vecino.esPared
        : vecino.esPared;
    }),
  );

  const esquinasExteriores = Object.freeze({
    noroeste: ladosExpuestos.norte && ladosExpuestos.oeste,
    noreste: ladosExpuestos.norte && ladosExpuestos.este,
    sureste: ladosExpuestos.sur && ladosExpuestos.este,
    suroeste: ladosExpuestos.sur && ladosExpuestos.oeste,
  });

  const esquinasInteriores = Object.freeze({
    noroeste:
      corresponde &&
      cardinales.norte &&
      cardinales.oeste &&
      vecinosDiagonales.noroeste.existe &&
      !diagonales.noroeste,
    noreste:
      corresponde &&
      cardinales.norte &&
      cardinales.este &&
      vecinosDiagonales.noreste.existe &&
      !diagonales.noreste,
    sureste:
      corresponde &&
      cardinales.sur &&
      cardinales.este &&
      vecinosDiagonales.sureste.existe &&
      !diagonales.sureste,
    suroeste:
      corresponde &&
      cardinales.sur &&
      cardinales.oeste &&
      vecinosDiagonales.suroeste.existe &&
      !diagonales.suroeste,
  });

  return Object.freeze({
    x,
    y,
    actual: actual.valor,
    tipoObjetivo,
    corresponde,
    esParedActual,
    cardinales,
    diagonales,
    ladosExpuestos,
    esquinasExteriores,
    esquinasInteriores,
    cantidadCardinales: contarVerdaderos(cardinales),
    cantidadDiagonales: contarVerdaderos(diagonales),
    cantidadLadosExpuestos: contarVerdaderos(ladosExpuestos),
  });
}

function crearVecinos({ mapa, x, y, direcciones, predicadoPared }) {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(direcciones).map(([clave, direccion]) => {
        const casilla = obtenerCasilla(
          mapa,
          x + direccion.dx,
          y + direccion.dy,
        );

        return [
          clave,
          Object.freeze({
            existe: casilla.existe,
            valor: casilla.valor,
            esPared: casilla.existe && predicadoPared(casilla.valor),
          }),
        ];
      }),
    ),
  );
}

function mapearVecinos(vecinos, resolver) {
  return Object.fromEntries(
    Object.entries(vecinos).map(([clave, vecino]) => [
      clave,
      Boolean(resolver(vecino, clave)),
    ]),
  );
}

function obtenerCasilla(mapa, x, y) {
  const fila = mapa?.[y];
  const existe =
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    y >= 0 &&
    x >= 0 &&
    fila !== undefined &&
    fila !== null &&
    x < fila.length;

  return Object.freeze({
    existe,
    valor: existe ? fila[x] : null,
  });
}

function contarVerdaderos(diccionario) {
  return Object.values(diccionario).filter(Boolean).length;
}

function normalizarPredicadoPared({ simboloPared, esPared }) {
  if (typeof esPared === "function") {
    return (valor) => Boolean(esPared(valor));
  }

  return (valor) => valor === simboloPared;
}
