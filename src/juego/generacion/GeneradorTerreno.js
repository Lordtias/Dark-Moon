const PARED = "#";
const SUELO = ".";

// Genera un terreno de habitaciones y pasillos
// respetando las reglas de la plantilla elegida.
export function generarTerreno({ plantilla, aleatorio } = {}) {
  validarParametros(plantilla, aleatorio);

  const ancho = aleatorio.entero(
    plantilla.dimensiones.ancho.minimo,

    plantilla.dimensiones.ancho.maximo,
  );

  const alto = aleatorio.entero(
    plantilla.dimensiones.alto.minimo,

    plantilla.dimensiones.alto.maximo,
  );

  const porcentajeObjetivo = aleatorio.entero(
    plantilla.generacion.porcentajeNoCaminable.minimo,

    plantilla.generacion.porcentajeNoCaminable.maximo,
  );

  const intentosMaximos = plantilla.generacion.intentosMaximos;

  for (let intento = 1; intento <= intentosMaximos; intento++) {
    const resultado = generarIntento({
      ancho,
      alto,
      porcentajeObjetivo,
      aleatorio,
    });

    if (
      resultado.porcentajeConectado >=
      plantilla.generacion.porcentajeMinimoConectado
    ) {
      return {
        ...resultado,
        intentoExitoso: intento,
      };
    }
  }

  throw new Error(
    `No se pudo generar un mapa conectado ` +
      `después de ${intentosMaximos} intentos.`,
  );
}

function generarIntento({ ancho, alto, porcentajeObjetivo, aleatorio }) {
  const celdas = crearMatriz(ancho, alto, PARED);

  const cantidadTotal = ancho * alto;

  const capacidadInterior = (ancho - 2) * (alto - 2);

  // La cantidad de suelo se calcula a partir
  // del porcentaje total de paredes deseado.
  const cantidadSueloObjetivo = Math.min(
    capacidadInterior,

    Math.max(
      1,

      Math.round(cantidadTotal * (1 - porcentajeObjetivo / 100)),
    ),
  );

  const estado = {
    celdas,
    cantidadSuelo: 0,
    cantidadSueloObjetivo,
  };

  const primeraHabitacion = crearHabitacionAleatoria({
    ancho,
    alto,
    aleatorio,
  });

  excavarHabitacion(estado, primeraHabitacion);

  let centroAnterior = {
    ...primeraHabitacion.centro,
  };

  const intentosHabitaciones = Math.max(
    20,
    Math.ceil(cantidadSueloObjetivo / 6),
  );

  for (
    let intento = 0;
    intento < intentosHabitaciones &&
    estado.cantidadSuelo < cantidadSueloObjetivo;
    intento++
  ) {
    const habitacion = crearHabitacionAleatoria({
      ancho,
      alto,
      aleatorio,
    });

    // Primero conectamos la nueva zona con
    // el terreno ya existente.
    excavarPasillo({
      estado,
      origen: centroAnterior,

      destino: habitacion.centro,

      aleatorio,
    });

    excavarHabitacion(estado, habitacion);

    centroAnterior = {
      ...habitacion.centro,
    };
  }

  // Si las habitaciones y pasillos no alcanzaron
  // el porcentaje requerido, expandimos desde el
  // suelo existente. Cada nueva casilla continúa
  // conectada al terreno anterior.
  completarSueloConectado(estado, ancho, alto, aleatorio);

  const casillasCaminables = obtenerCasillas(celdas, SUELO);

  const cantidadParedes = cantidadTotal - casillasCaminables.length;

  const porcentajeNoCaminableReal = redondear(
    (cantidadParedes / cantidadTotal) * 100,

    1,
  );

  const porcentajeConectado = calcularPorcentajeConectado(
    celdas,
    casillasCaminables,
  );

  const posicionInicialSugerida =
    celdas[primeraHabitacion.centro.y][primeraHabitacion.centro.x] === SUELO
      ? {
          ...primeraHabitacion.centro,
        }
      : {
          ...casillasCaminables[0],
        };

  return {
    celdas: celdas.map((fila) => fila.join("")),

    ancho,
    alto,

    porcentajeNoCaminableObjetivo: porcentajeObjetivo,

    porcentajeNoCaminableReal,

    porcentajeConectado,

    posicionInicialSugerida,

    casillasCaminables,
  };
}

function crearHabitacionAleatoria({ ancho, alto, aleatorio }) {
  const anchoMaximo = Math.max(
    3,

    Math.min(7, ancho - 2),
  );

  const altoMaximo = Math.max(
    3,

    Math.min(6, alto - 2),
  );

  const anchoHabitacion = aleatorio.entero(3, anchoMaximo);

  const altoHabitacion = aleatorio.entero(3, altoMaximo);

  const x = aleatorio.entero(
    1,

    ancho - anchoHabitacion - 1,
  );

  const y = aleatorio.entero(
    1,

    alto - altoHabitacion - 1,
  );

  return {
    x,
    y,

    ancho: anchoHabitacion,

    alto: altoHabitacion,

    centro: {
      x: x + Math.floor(anchoHabitacion / 2),

      y: y + Math.floor(altoHabitacion / 2),
    },
  };
}

function excavarHabitacion(estado, habitacion) {
  // Excavamos primero el centro para conservar
  // una posición inicial válida aunque se alcance
  // el objetivo durante esta habitación.
  excavarCasilla(estado, habitacion.centro.x, habitacion.centro.y);

  for (let y = habitacion.y; y < habitacion.y + habitacion.alto; y++) {
    for (let x = habitacion.x; x < habitacion.x + habitacion.ancho; x++) {
      excavarCasilla(estado, x, y);
    }
  }
}

function excavarPasillo({ estado, origen, destino, aleatorio }) {
  const horizontalPrimero = aleatorio.siguiente() < 0.5;

  let x = origen.x;

  let y = origen.y;

  excavarCasilla(estado, x, y);

  const moverHorizontal = () => {
    while (x !== destino.x) {
      x += Math.sign(destino.x - x);

      excavarCasilla(estado, x, y);
    }
  };

  const moverVertical = () => {
    while (y !== destino.y) {
      y += Math.sign(destino.y - y);

      excavarCasilla(estado, x, y);
    }
  };

  if (horizontalPrimero) {
    moverHorizontal();
    moverVertical();
  } else {
    moverVertical();
    moverHorizontal();
  }
}

function completarSueloConectado(estado, ancho, alto, aleatorio) {
  while (estado.cantidadSuelo < estado.cantidadSueloObjetivo) {
    const frontera = obtenerFronteraExcavable(estado.celdas, ancho, alto);

    if (frontera.length === 0) {
      throw new Error("El generador no encontró más casillas conectables.");
    }

    const seleccionada = aleatorio.elegir(frontera);

    excavarCasilla(estado, seleccionada.x, seleccionada.y);
  }
}

function obtenerFronteraExcavable(celdas, ancho, alto) {
  const resultado = [];
  const agregadas = new Set();

  for (let y = 1; y < alto - 1; y++) {
    for (let x = 1; x < ancho - 1; x++) {
      if (celdas[y][x] !== SUELO) {
        continue;
      }

      for (const direccion of obtenerDireccionesCardinales()) {
        const nuevaX = x + direccion.x;

        const nuevaY = y + direccion.y;

        if (
          nuevaX <= 0 ||
          nuevaX >= ancho - 1 ||
          nuevaY <= 0 ||
          nuevaY >= alto - 1 ||
          celdas[nuevaY][nuevaX] !== PARED
        ) {
          continue;
        }

        const clave = `${nuevaX},${nuevaY}`;

        if (agregadas.has(clave)) {
          continue;
        }

        agregadas.add(clave);

        resultado.push({
          x: nuevaX,
          y: nuevaY,
        });
      }
    }
  }

  return resultado;
}

function excavarCasilla(estado, x, y) {
  if (estado.cantidadSuelo >= estado.cantidadSueloObjetivo) {
    return false;
  }

  if (estado.celdas[y][x] === SUELO) {
    return false;
  }

  estado.celdas[y][x] = SUELO;

  estado.cantidadSuelo++;

  return true;
}

function calcularPorcentajeConectado(celdas, casillasCaminables) {
  if (casillasCaminables.length === 0) {
    return 0;
  }

  const pendientes = [casillasCaminables[0]];

  const visitadas = new Set([crearClave(casillasCaminables[0])]);

  while (pendientes.length > 0) {
    const actual = pendientes.shift();

    for (const direccion of obtenerDireccionesCardinales()) {
      const siguiente = {
        x: actual.x + direccion.x,

        y: actual.y + direccion.y,
      };

      if (celdas[siguiente.y]?.[siguiente.x] !== SUELO) {
        continue;
      }

      const clave = crearClave(siguiente);

      if (visitadas.has(clave)) {
        continue;
      }

      visitadas.add(clave);
      pendientes.push(siguiente);
    }
  }

  return redondear(
    (visitadas.size / casillasCaminables.length) * 100,

    1,
  );
}

function obtenerCasillas(celdas, simbolo) {
  const resultado = [];

  for (let y = 0; y < celdas.length; y++) {
    for (let x = 0; x < celdas[y].length; x++) {
      if (celdas[y][x] === simbolo) {
        resultado.push({
          x,
          y,
        });
      }
    }
  }

  return resultado;
}

function obtenerDireccionesCardinales() {
  return [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
}

function crearMatriz(ancho, alto, contenido) {
  return Array.from(
    {
      length: alto,
    },

    () => Array(ancho).fill(contenido),
  );
}

function crearClave(posicion) {
  return `${posicion.x},` + `${posicion.y}`;
}

function redondear(valor, decimales) {
  const potencia = 10 ** decimales;

  return Math.round(valor * potencia) / potencia;
}

function validarParametros(plantilla, aleatorio) {
  if (!plantilla || typeof plantilla !== "object") {
    throw new Error("Se necesita una plantilla para generar el terreno.");
  }

  if (
    !aleatorio ||
    typeof aleatorio.entero !== "function" ||
    typeof aleatorio.siguiente !== "function"
  ) {
    throw new Error("Se necesita un generador aleatorio válido.");
  }

  if (plantilla.generacion?.tipo !== "habitaciones") {
    throw new Error(
      `El tipo de generación ` +
        `"${plantilla.generacion?.tipo}" no está implementado.`,
    );
  }
}
