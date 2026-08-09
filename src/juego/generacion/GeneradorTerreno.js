import { crearPlanoMazmorra } from "./PlanoMazmorra.js";
import { planificarSalidaEstructural } from "./PlanificadorSalidaEstructural.js";

const PARED = "#";
const SUELO = ".";

const DIRECCIONES_CARDINALES = Object.freeze([
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: -1, y: 0 }),
  Object.freeze({ x: 0, y: 1 }),
  Object.freeze({ x: 0, y: -1 }),
]);

// Genera una mazmorra estructural a partir exclusivamente
// de los parámetros canónicos de la plantilla seleccionada.
export function generarTerreno({ plantilla, aleatorio } = {}) {
  validarParametros(plantilla, aleatorio);

  const intentosMaximos = plantilla.generacion.intentosMaximos;

  for (let intento = 1; intento <= intentosMaximos; intento++) {
    const ancho = aleatorio.entero(
      plantilla.dimensiones.ancho.minimo,
      plantilla.dimensiones.ancho.maximo,
    );

    const alto = aleatorio.entero(
      plantilla.dimensiones.alto.minimo,
      plantilla.dimensiones.alto.maximo,
    );

    const resultado = generarIntento({
      ancho,
      alto,
      configuracion: plantilla.generacion,
      aleatorio,
      intento,
    });

    if (resultado !== null) {
      return resultado;
    }
  }

  throw new Error(
    `No se pudo generar una mazmorra estructural válida ` +
      `después de ${intentosMaximos} intentos.`,
  );
}

function generarIntento({ ancho, alto, configuracion, aleatorio, intento }) {
  const cantidadHabitaciones = aleatorio.entero(
    configuracion.sectores.cantidad.minimo,
    configuracion.sectores.cantidad.maximo,
  );

  const habitaciones = colocarHabitaciones({
    ancho,
    alto,
    cantidadHabitaciones,
    configuracion,
    aleatorio,
  });

  if (habitaciones === null) {
    return null;
  }

  const definicionesConexion = construirRedConexiones({
    habitaciones,
    configuracion,
    aleatorio,
  });

  const celdas = crearMatriz(ancho, alto, PARED);

  for (const habitacion of habitaciones) {
    excavarHabitacion(celdas, habitacion);
  }

  const resultadoPasillos = construirPasillos({
    celdas,
    ancho,
    alto,
    habitaciones,
    definicionesConexion,
    anchoPasillo: configuracion.pasillos.ancho,
    aleatorio,
  });

  if (resultadoPasillos === null) {
    return null;
  }

  const { pasillos, conexiones, puntosConexion } = resultadoPasillos;

  const zonaEntrada = crearZonaEntrada(habitaciones[0]);
  const distanciasEstructurales = calcularDistanciasEstructurales({
    habitaciones,
    conexiones,
    idEntrada: habitaciones[0].id,
  });
  const zonasCandidatasSalida = crearZonasCandidatasSalida({
    habitaciones,
    conexiones,
    distanciasEstructurales,
    idEntrada: habitaciones[0].id,
  });

  const resultadoSalida = planificarSalidaEstructural({
    celdas,
    habitaciones,
    zonasCandidatasSalida,
    ancho,
    alto,
  });

  if (resultadoSalida === null) {
    return null;
  }

  pasillos.push(resultadoSalida.pasillo);

  for (const punto of resultadoSalida.puntosConexion) {
    puntosConexion.push({
      ...punto,
      id: `punto_${puntosConexion.length + 1}`,
    });
  }

  const celdasTexto = celdas.map((fila) => fila.join(""));
  const casillasTransitables = obtenerCasillas(celdas, SUELO);
  const porcentajeConectado = calcularPorcentajeConectado(
    celdas,
    casillasTransitables,
  );

  if (porcentajeConectado !== 100) {
    return null;
  }

  const cantidadTotal = ancho * alto;
  const porcentajeNoCaminableReal = redondear(
    ((cantidadTotal - casillasTransitables.length) / cantidadTotal) * 100,
    1,
  );

  const zonasCandidatasPoblacion = habitaciones
    .filter((habitacion) => habitacion.id !== habitaciones[0].id)
    .map((habitacion) => crearZonaDesdeHabitacion(habitacion));

  return crearPlanoMazmorra({
    celdas: celdasTexto,
    ancho,
    alto,
    habitaciones,
    pasillos,
    puntosConexion,
    conexiones,
    zonaEntrada,
    salidaEstructural: resultadoSalida.salidaEstructural,
    zonasCandidatasSalida,
    zonasCandidatasPoblacion,
    porcentajeNoCaminableReal,
    porcentajeConectado,
    intentoExitoso: intento,
  });
}

function colocarHabitaciones({
  ancho,
  alto,
  cantidadHabitaciones,
  configuracion,
  aleatorio,
}) {
  const habitaciones = [];
  const intentosPorHabitacion = Math.max(80, ancho * alto);

  for (let indice = 0; indice < cantidadHabitaciones; indice++) {
    const candidatas = [];

    for (let intento = 0; intento < intentosPorHabitacion; intento++) {
      const candidata = crearHabitacionAleatoria({
        ancho,
        alto,
        configuracion,
        aleatorio,
        indice,
      });

      if (
        habitaciones.length > 0 &&
        !cumpleSeparacion({
          candidata,
          habitaciones,
          separacion: configuracion.sectores.separacion,
        })
      ) {
        continue;
      }

      candidatas.push(candidata);

      // Varias candidatas válidas evitan depender siempre
      // de la primera posición encontrada.
      if (candidatas.length >= 12) {
        break;
      }
    }

    if (candidatas.length === 0) {
      return null;
    }

    habitaciones.push(aleatorio.elegir(candidatas));
  }

  return habitaciones;
}

function crearHabitacionAleatoria({
  ancho,
  alto,
  configuracion,
  aleatorio,
  indice,
}) {
  const anchoMaximo = Math.min(
    configuracion.habitaciones.ancho.maximo,
    ancho - 2,
  );
  const altoMaximo = Math.min(
    configuracion.habitaciones.alto.maximo,
    alto - 2,
  );

  const anchoHabitacion = aleatorio.entero(
    configuracion.habitaciones.ancho.minimo,
    anchoMaximo,
  );
  const altoHabitacion = aleatorio.entero(
    configuracion.habitaciones.alto.minimo,
    altoMaximo,
  );

  const x = aleatorio.entero(1, ancho - anchoHabitacion - 1);
  const y = aleatorio.entero(1, alto - altoHabitacion - 1);

  return {
    id: `habitacion_${indice + 1}`,
    x,
    y,
    ancho: anchoHabitacion,
    alto: altoHabitacion,
    centro: {
      x: x + Math.floor(anchoHabitacion / 2),
      y: y + Math.floor(altoHabitacion / 2),
    },
    casillas: crearCasillasRectangulo({
      x,
      y,
      ancho: anchoHabitacion,
      alto: altoHabitacion,
    }),
  };
}

function cumpleSeparacion({ candidata, habitaciones, separacion }) {
  let distanciaMasCercana = Number.POSITIVE_INFINITY;

  for (const habitacion of habitaciones) {
    if (rectangulosSeSuperponen(candidata, habitacion)) {
      return false;
    }

    distanciaMasCercana = Math.min(
      distanciaMasCercana,
      calcularSeparacionRectangulos(candidata, habitacion),
    );
  }

  return (
    distanciaMasCercana >= separacion.minimo &&
    distanciaMasCercana <= separacion.maximo
  );
}

function calcularSeparacionRectangulos(a, b) {
  const separacionX = calcularSeparacionEje(
    a.x,
    a.x + a.ancho - 1,
    b.x,
    b.x + b.ancho - 1,
  );
  const separacionY = calcularSeparacionEje(
    a.y,
    a.y + a.alto - 1,
    b.y,
    b.y + b.alto - 1,
  );

  return separacionX + separacionY;
}

function calcularSeparacionEje(inicioA, finA, inicioB, finB) {
  if (finA < inicioB) {
    return inicioB - finA - 1;
  }

  if (finB < inicioA) {
    return inicioA - finB - 1;
  }

  return 0;
}

function rectangulosSeSuperponen(a, b) {
  return !(
    a.x + a.ancho <= b.x ||
    b.x + b.ancho <= a.x ||
    a.y + a.alto <= b.y ||
    b.y + b.alto <= a.y
  );
}

function construirRedConexiones({ habitaciones, configuracion, aleatorio }) {
  const aristas = [];

  for (let i = 0; i < habitaciones.length; i++) {
    for (let j = i + 1; j < habitaciones.length; j++) {
      aristas.push({
        idHabitacionA: habitaciones[i].id,
        idHabitacionB: habitaciones[j].id,
        distancia: distanciaManhattan(
          habitaciones[i].centro,
          habitaciones[j].centro,
        ),
        desempate: aleatorio.siguiente(),
      });
    }
  }

  aristas.sort(
    (a, b) => a.distancia - b.distancia || a.desempate - b.desempate,
  );

  const conjuntos = new Map(
    habitaciones.map((habitacion) => [habitacion.id, habitacion.id]),
  );
  const principales = [];
  const restantes = [];

  for (const arista of aristas) {
    const raizA = encontrarRaiz(conjuntos, arista.idHabitacionA);
    const raizB = encontrarRaiz(conjuntos, arista.idHabitacionB);

    if (raizA !== raizB) {
      conjuntos.set(raizB, raizA);
      principales.push({ ...arista, tipo: "principal" });
    } else {
      restantes.push(arista);
    }
  }

  const cantidadExtraSolicitada = aleatorio.entero(
    configuracion.pasillos.conexionesExtra.minimo,
    configuracion.pasillos.conexionesExtra.maximo,
  );
  const cantidadExtra = Math.min(cantidadExtraSolicitada, restantes.length);
  const extras = aleatorio
    .mezclar(restantes)
    .slice(0, cantidadExtra)
    .map((arista) => ({ ...arista, tipo: "extra" }));

  return [...principales, ...extras];
}

function encontrarRaiz(conjuntos, id) {
  let actual = id;

  while (conjuntos.get(actual) !== actual) {
    actual = conjuntos.get(actual);
  }

  return actual;
}

function construirPasillos({
  celdas,
  ancho,
  alto,
  habitaciones,
  definicionesConexion,
  anchoPasillo,
  aleatorio,
}) {
  const habitacionesPorId = new Map(
    habitaciones.map((habitacion) => [habitacion.id, habitacion]),
  );
  const pasillos = [];
  const conexiones = [];
  const puntosConexion = [];
  const pertenenciasPasillos = new Map();

  for (let indice = 0; indice < definicionesConexion.length; indice++) {
    const definicion = definicionesConexion[indice];
    const habitacionA = habitacionesPorId.get(definicion.idHabitacionA);
    const habitacionB = habitacionesPorId.get(definicion.idHabitacionB);
    const ruta = elegirRutaPasillo({
      origen: habitacionA.centro,
      destino: habitacionB.centro,
      ancho,
      alto,
      anchoPasillo,
      habitaciones,
      idsHabitacionesPermitidas: new Set([habitacionA.id, habitacionB.id]),
      aleatorio,
    });

    if (ruta === null) {
      return null;
    }

    const idPasillo = `pasillo_${indice + 1}`;
    const casillasExcavadas = expandirRuta(ruta, anchoPasillo)
      .filter((casilla) => dentroInterior(casilla, ancho, alto));

    for (const casilla of casillasExcavadas) {
      celdas[casilla.y][casilla.x] = SUELO;
    }

    const casillasEstructurales = casillasExcavadas.filter(
      (casilla) => !habitaciones.some((habitacion) => contiene(habitacion, casilla)),
    );

    for (const casilla of casillasEstructurales) {
      const clave = crearClave(casilla);
      const ids = pertenenciasPasillos.get(clave) ?? new Set();
      ids.add(idPasillo);
      pertenenciasPasillos.set(clave, ids);
    }

    const pasillo = {
      id: idPasillo,
      ancho: anchoPasillo,
      longitud: contarLongitudRutaFueraHabitaciones(ruta, habitaciones),
      casillas: deduplicarCasillas(casillasEstructurales),
    };
    pasillos.push(pasillo);

    const idConexion = `conexion_${indice + 1}`;
    conexiones.push({
      id: idConexion,
      tipo: definicion.tipo,
      idHabitacionA: habitacionA.id,
      idHabitacionB: habitacionB.id,
      idPasillo,
      longitud: pasillo.longitud,
    });

    puntosConexion.push(
      ...crearPuntosAccesoHabitaciones({
        ruta,
        habitacionA,
        habitacionB,
        idPasillo,
        indiceBase: puntosConexion.length,
      }),
    );

    puntosConexion.push(
      ...crearPuntosGiro({
        ruta,
        habitaciones,
        idPasillo,
        indiceBase: puntosConexion.length,
      }),
    );
  }

  for (const [clave, idsPasillos] of pertenenciasPasillos.entries()) {
    if (idsPasillos.size < 2) {
      continue;
    }

    const [x, y] = clave.split(",").map(Number);
    puntosConexion.push({
      id: `punto_${puntosConexion.length + 1}`,
      tipo: "cruce_pasillos",
      x,
      y,
      idsPasillos: [...idsPasillos],
    });
  }

  return {
    pasillos,
    conexiones,
    puntosConexion: deduplicarPuntosConexion(puntosConexion),
  };
}

function elegirRutaPasillo({
  origen,
  destino,
  ancho,
  alto,
  anchoPasillo,
  habitaciones,
  idsHabitacionesPermitidas,
  aleatorio,
}) {
  const candidatas = [];

  candidatas.push(crearRutaPorFila(origen, destino, origen.y));
  candidatas.push(crearRutaPorColumna(origen, destino, origen.x));

  for (let y = 1; y < alto - 1; y++) {
    candidatas.push(crearRutaPorFila(origen, destino, y));
  }

  for (let x = 1; x < ancho - 1; x++) {
    candidatas.push(crearRutaPorColumna(origen, destino, x));
  }

  const validas = candidatas
    .map(normalizarRuta)
    .filter((ruta) => ruta.length > 0)
    .filter((ruta) =>
      rutaEsValida({
        ruta,
        ancho,
        alto,
        anchoPasillo,
        habitaciones,
        idsHabitacionesPermitidas,
      }),
    )
    .map((ruta) => ({
      ruta,
      longitud: ruta.length,
      giros: contarGiros(ruta),
      desempate: aleatorio.siguiente(),
    }))
    .sort(
      (a, b) =>
        a.longitud - b.longitud ||
        a.giros - b.giros ||
        a.desempate - b.desempate,
    );

  return validas[0]?.ruta ?? null;
}

function crearRutaPorFila(origen, destino, yIntermedia) {
  return unirTramos([
    crearTramoRecto(origen, { x: origen.x, y: yIntermedia }),
    crearTramoRecto(
      { x: origen.x, y: yIntermedia },
      { x: destino.x, y: yIntermedia },
    ),
    crearTramoRecto({ x: destino.x, y: yIntermedia }, destino),
  ]);
}

function crearRutaPorColumna(origen, destino, xIntermedia) {
  return unirTramos([
    crearTramoRecto(origen, { x: xIntermedia, y: origen.y }),
    crearTramoRecto(
      { x: xIntermedia, y: origen.y },
      { x: xIntermedia, y: destino.y },
    ),
    crearTramoRecto({ x: xIntermedia, y: destino.y }, destino),
  ]);
}

function crearTramoRecto(origen, destino) {
  const resultado = [{ ...origen }];
  let x = origen.x;
  let y = origen.y;

  while (x !== destino.x || y !== destino.y) {
    if (x !== destino.x) {
      x += Math.sign(destino.x - x);
    } else {
      y += Math.sign(destino.y - y);
    }

    resultado.push({ x, y });
  }

  return resultado;
}

function unirTramos(tramos) {
  return tramos.flatMap((tramo, indice) =>
    indice === 0 ? tramo : tramo.slice(1),
  );
}

function normalizarRuta(ruta) {
  const resultado = [];

  for (const casilla of ruta) {
    const anterior = resultado[resultado.length - 1];

    if (anterior?.x === casilla.x && anterior?.y === casilla.y) {
      continue;
    }

    resultado.push(casilla);
  }

  return resultado;
}

function rutaEsValida({
  ruta,
  ancho,
  alto,
  anchoPasillo,
  habitaciones,
  idsHabitacionesPermitidas,
}) {
  const casillas = expandirRuta(ruta, anchoPasillo);

  for (const casilla of casillas) {
    if (!dentroInterior(casilla, ancho, alto)) {
      return false;
    }

    const habitacionAjena = habitaciones.find(
      (habitacion) =>
        !idsHabitacionesPermitidas.has(habitacion.id) &&
        contiene(habitacion, casilla),
    );

    if (habitacionAjena) {
      return false;
    }
  }

  return true;
}

function expandirRuta(ruta, anchoPasillo) {
  const desplazamientoMinimo = -Math.floor((anchoPasillo - 1) / 2);
  const desplazamientoMaximo = Math.ceil((anchoPasillo - 1) / 2);
  const resultado = [];

  for (const casilla of ruta) {
    for (let dy = desplazamientoMinimo; dy <= desplazamientoMaximo; dy++) {
      for (let dx = desplazamientoMinimo; dx <= desplazamientoMaximo; dx++) {
        resultado.push({
          x: casilla.x + dx,
          y: casilla.y + dy,
        });
      }
    }
  }

  return deduplicarCasillas(resultado);
}

function crearPuntosAccesoHabitaciones({
  ruta,
  habitacionA,
  habitacionB,
  idPasillo,
  indiceBase,
}) {
  const puntos = [];
  const salidaA = buscarAccesoDesdeInicio(ruta, habitacionA);
  const rutaInvertida = [...ruta].reverse();
  const salidaB = buscarAccesoDesdeInicio(rutaInvertida, habitacionB);

  if (salidaA) {
    puntos.push({
      id: `punto_${indiceBase + puntos.length + 1}`,
      tipo: "acceso_habitacion",
      x: salidaA.x,
      y: salidaA.y,
      idHabitacion: habitacionA.id,
      idPasillo,
    });
  }

  if (salidaB) {
    puntos.push({
      id: `punto_${indiceBase + puntos.length + 1}`,
      tipo: "acceso_habitacion",
      x: salidaB.x,
      y: salidaB.y,
      idHabitacion: habitacionB.id,
      idPasillo,
    });
  }

  return puntos;
}

function buscarAccesoDesdeInicio(ruta, habitacion) {
  for (let indice = 1; indice < ruta.length; indice++) {
    const anterior = ruta[indice - 1];
    const actual = ruta[indice];

    if (contiene(habitacion, anterior) && !contiene(habitacion, actual)) {
      return actual;
    }
  }

  return null;
}

function crearPuntosGiro({ ruta, habitaciones, idPasillo, indiceBase }) {
  const puntos = [];

  for (let indice = 1; indice < ruta.length - 1; indice++) {
    const anterior = ruta[indice - 1];
    const actual = ruta[indice];
    const siguiente = ruta[indice + 1];
    const direccionAnterior = {
      x: actual.x - anterior.x,
      y: actual.y - anterior.y,
    };
    const direccionSiguiente = {
      x: siguiente.x - actual.x,
      y: siguiente.y - actual.y,
    };

    if (
      direccionAnterior.x === direccionSiguiente.x &&
      direccionAnterior.y === direccionSiguiente.y
    ) {
      continue;
    }

    if (habitaciones.some((habitacion) => contiene(habitacion, actual))) {
      continue;
    }

    puntos.push({
      id: `punto_${indiceBase + puntos.length + 1}`,
      tipo: "giro_pasillo",
      x: actual.x,
      y: actual.y,
      idPasillo,
    });
  }

  return puntos;
}

function deduplicarPuntosConexion(puntos) {
  const vistos = new Set();
  const resultado = [];

  for (const punto of puntos) {
    const clave = `${punto.tipo}:${punto.x},${punto.y}:` +
      `${punto.idHabitacion ?? ""}:${punto.idPasillo ?? ""}:` +
      `${(punto.idsPasillos ?? []).join("|")}`;

    if (vistos.has(clave)) {
      continue;
    }

    vistos.add(clave);
    resultado.push({
      ...punto,
      id: `punto_${resultado.length + 1}`,
    });
  }

  return resultado;
}

function contarLongitudRutaFueraHabitaciones(ruta, habitaciones) {
  return ruta.filter(
    (casilla) => !habitaciones.some((habitacion) => contiene(habitacion, casilla)),
  ).length;
}

function contarGiros(ruta) {
  let giros = 0;

  for (let indice = 1; indice < ruta.length - 1; indice++) {
    const dxA = ruta[indice].x - ruta[indice - 1].x;
    const dyA = ruta[indice].y - ruta[indice - 1].y;
    const dxB = ruta[indice + 1].x - ruta[indice].x;
    const dyB = ruta[indice + 1].y - ruta[indice].y;

    if (dxA !== dxB || dyA !== dyB) {
      giros++;
    }
  }

  return giros;
}

function crearZonaEntrada(habitacion) {
  return {
    idHabitacion: habitacion.id,
    posicionSugerida: { ...habitacion.centro },
    casillasReservadas: habitacion.casillas.map((casilla) => ({ ...casilla })),
  };
}

function crearZonasCandidatasSalida({
  habitaciones,
  conexiones,
  distanciasEstructurales,
  idEntrada,
}) {
  const gradoPorHabitacion = new Map(habitaciones.map((h) => [h.id, 0]));

  for (const conexion of conexiones) {
    gradoPorHabitacion.set(
      conexion.idHabitacionA,
      gradoPorHabitacion.get(conexion.idHabitacionA) + 1,
    );
    gradoPorHabitacion.set(
      conexion.idHabitacionB,
      gradoPorHabitacion.get(conexion.idHabitacionB) + 1,
    );
  }

  return habitaciones
    .filter((habitacion) => habitacion.id !== idEntrada)
    .map((habitacion) => ({
      ...crearZonaDesdeHabitacion(habitacion),
      distanciaEstructural: distanciasEstructurales.get(habitacion.id) ?? 0,
      terminal: gradoPorHabitacion.get(habitacion.id) === 1,
    }))
    .sort(
      (a, b) =>
        Number(b.terminal) - Number(a.terminal) ||
        b.distanciaEstructural - a.distanciaEstructural,
    );
}

function crearZonaDesdeHabitacion(habitacion) {
  return {
    idHabitacion: habitacion.id,
    posicionSugerida: { ...habitacion.centro },
    casillas: habitacion.casillas.map((casilla) => ({ ...casilla })),
  };
}

function calcularDistanciasEstructurales({
  habitaciones,
  conexiones,
  idEntrada,
}) {
  const adyacencias = new Map(habitaciones.map((h) => [h.id, []]));

  for (const conexion of conexiones) {
    const peso = Math.max(1, conexion.longitud);
    adyacencias.get(conexion.idHabitacionA).push({
      id: conexion.idHabitacionB,
      peso,
    });
    adyacencias.get(conexion.idHabitacionB).push({
      id: conexion.idHabitacionA,
      peso,
    });
  }

  const distancias = new Map(habitaciones.map((h) => [h.id, Infinity]));
  const pendientes = new Set(habitaciones.map((h) => h.id));
  distancias.set(idEntrada, 0);

  while (pendientes.size > 0) {
    let actual = null;
    let distanciaActual = Infinity;

    for (const id of pendientes) {
      const distancia = distancias.get(id);

      if (distancia < distanciaActual) {
        actual = id;
        distanciaActual = distancia;
      }
    }

    if (actual === null) {
      break;
    }

    pendientes.delete(actual);

    for (const vecino of adyacencias.get(actual)) {
      const nuevaDistancia = distanciaActual + vecino.peso;

      if (nuevaDistancia < distancias.get(vecino.id)) {
        distancias.set(vecino.id, nuevaDistancia);
      }
    }
  }

  return distancias;
}

function excavarHabitacion(celdas, habitacion) {
  for (const casilla of habitacion.casillas) {
    celdas[casilla.y][casilla.x] = SUELO;
  }
}

function crearCasillasRectangulo({ x, y, ancho, alto }) {
  const resultado = [];

  for (let fila = y; fila < y + alto; fila++) {
    for (let columna = x; columna < x + ancho; columna++) {
      resultado.push({ x: columna, y: fila });
    }
  }

  return resultado;
}

function calcularPorcentajeConectado(celdas, casillasTransitables) {
  if (casillasTransitables.length === 0) {
    return 0;
  }

  const pendientes = [casillasTransitables[0]];
  const visitadas = new Set([crearClave(casillasTransitables[0])]);

  while (pendientes.length > 0) {
    const actual = pendientes.shift();

    for (const direccion of DIRECCIONES_CARDINALES) {
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

  return redondear((visitadas.size / casillasTransitables.length) * 100, 1);
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

function crearMatriz(ancho, alto, contenido) {
  return Array.from({ length: alto }, () => Array(ancho).fill(contenido));
}

function contiene(rectangulo, casilla) {
  return (
    casilla.x >= rectangulo.x &&
    casilla.x < rectangulo.x + rectangulo.ancho &&
    casilla.y >= rectangulo.y &&
    casilla.y < rectangulo.y + rectangulo.alto
  );
}

function dentroInterior(casilla, ancho, alto) {
  return (
    casilla.x > 0 &&
    casilla.x < ancho - 1 &&
    casilla.y > 0 &&
    casilla.y < alto - 1
  );
}

function deduplicarCasillas(casillas) {
  const resultado = [];
  const vistas = new Set();

  for (const casilla of casillas) {
    const clave = crearClave(casilla);

    if (vistas.has(clave)) {
      continue;
    }

    vistas.add(clave);
    resultado.push(casilla);
  }

  return resultado;
}

function distanciaManhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function crearClave(posicion) {
  return `${posicion.x},${posicion.y}`;
}

function redondear(valor, decimales) {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

function validarParametros(plantilla, aleatorio) {
  if (!plantilla || typeof plantilla !== "object") {
    throw new Error("Se necesita una plantilla para generar el terreno.");
  }

  if (
    !aleatorio ||
    typeof aleatorio.siguiente !== "function" ||
    typeof aleatorio.entero !== "function" ||
    typeof aleatorio.elegir !== "function" ||
    typeof aleatorio.mezclar !== "function"
  ) {
    throw new Error("Se necesita un generador aleatorio válido.");
  }

  if (plantilla.generacion?.tipo !== "habitaciones") {
    throw new Error("El generador estructural solo admite el tipo habitaciones.");
  }
}
