import { crearEnemigo } from "../fabricas/FabricaEnemigos.js";
import { incorporarEntidadMazmorra } from "../fabricas/FabricaEntidadesMazmorra.js";
import { ORIENTACIONES_PUERTA } from "../../entidad/interactuable/Puerta.js";

import { resolverEncuentroEspecial } from "./GeneradorEncuentroEspecial.js";

const DIRECCIONES_CARDINALES = [
  {
    x: 1,
    y: 0,
  },
  {
    x: -1,
    y: 0,
  },
  {
    x: 0,
    y: 1,
  },
  {
    x: 0,
    y: -1,
  },
];

const DIRECCIONES_ADYACENTES = [
  ...DIRECCIONES_CARDINALES,
  { x: 1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
];

const TIPOS_ENEMIGO_UNICO = Object.freeze({
  ESPECIAL: "especial",
  JEFE: "jefe",
});

// Genera todas las entidades que ocuparán
// el terreno procedural.
//
// La misma semilla controla:
//
// - El nivel del mapa.
// - La cantidad de enemigos recurrentes.
// - Los tipos y variantes recurrentes.
// - La aparición del encuentro especial.
// - La plantilla y variante del encuentro especial.
// - La selección y posición del jefe.
// - Las posiciones.
// - Los interactuables procedurales y barriles.
export function generarContenidoMapa({
  plantilla,
  terreno,
  posicionJugador,
  aleatorio,
  configuracionEnemigos,
  configuracionObjetos,
  nivelMapa = null,
} = {}) {
  validarParametros({
    plantilla,
    terreno,
    posicionJugador,
    aleatorio,
    configuracionEnemigos,
    configuracionObjetos,
  });

  // Todos los enemigos de la expedición se crean
  // utilizando el mismo nivel del mapa.
  const nivelMapaResuelto = Number.isInteger(nivelMapa)
    ? nivelMapa
    : aleatorio.entero(
        plantilla.niveles.minimo,
        plantilla.niveles.maximo,
      );

  const contextoPoblacion = crearContextoPoblacion({
    terreno,
    posicionJugador,
    aleatorio,
    configuracion: plantilla.enemigos,
  });

  const objetivosProcedurales = [];
  const interactuablesProcedurales = [];

  // Los interactuables que deben reservar espacio se resuelven antes que los
  // enemigos. Así el cofre importante de la zona especial está garantizado y
  // la población restante se adapta al espacio que realmente queda libre.
  const resultadoInteractuablesPrevios = generarInteractuablesPrevios({
    plantilla,
    terreno,
    posicionJugador,
    nivelMapa: nivelMapaResuelto,
    contextoPoblacion,
    objetivos: objetivosProcedurales,
    interactuables: interactuablesProcedurales,
    configuracionObjetos,
    aleatorio,
  });

  const posicionesEnemigos = [];

  const cantidadEnemigosRecurrentes = calcularCantidadEnemigosRecurrentes({
    configuracion: plantilla.enemigos,
    contextoPoblacion,
  });

  // Los enemigos únicos se resuelven primero para garantizar que la zona
  // especial preserve espacio para su objetivo principal. El orden lógico
  // del resumen continúa mostrando recurrentes, jefe y especial.
  const resultadoJefe = generarEnemigoUnicoEnZona({
    plantilla,
    configuracion: plantilla.jefe ?? null,
    tipo: TIPOS_ENEMIGO_UNICO.JEFE,
    obligatorio: plantilla.jefe !== undefined && plantilla.jefe !== null,
    nivelMapa: nivelMapaResuelto,
    posicionJugador,
    zona: contextoPoblacion.zonaEspecial,
    posicionesEnemigos,
    aleatorio,
    configuracionEnemigos,
    configuracionObjetos,
    numeroDetalleInicial: cantidadEnemigosRecurrentes + 1,
  });

  const resultadoEspecial = generarEnemigoUnicoEnZona({
    plantilla,
    configuracion: plantilla.encuentroEspecial ?? null,
    tipo: TIPOS_ENEMIGO_UNICO.ESPECIAL,
    obligatorio: false,
    nivelMapa: nivelMapaResuelto,
    posicionJugador,
    zona: contextoPoblacion.zonaEspecial,
    posicionesEnemigos,
    aleatorio,
    configuracionEnemigos,
    configuracionObjetos,
    numeroDetalleInicial:
      cantidadEnemigosRecurrentes + resultadoJefe.enemigos.length + 1,
  });

  const resultadoRecurrentes = generarEnemigosRecurrentes({
    plantilla,
    nivelMapa: nivelMapaResuelto,
    posicionJugador,
    contextoPoblacion,
    cantidadObjetivo: cantidadEnemigosRecurrentes,
    posicionesEnemigos,
    aleatorio,
    configuracionEnemigos,
    configuracionObjetos,
  });

  const enemigos = [
    ...resultadoRecurrentes.enemigos,
    ...resultadoJefe.enemigos,
    ...resultadoEspecial.enemigos,
  ];

  const detalleEnemigos = [
    ...resultadoRecurrentes.detalle,
    ...resultadoJefe.detalle,
    ...resultadoEspecial.detalle,
  ];

  const enemigosPorTipo = combinarConteosMultiples([
    resultadoRecurrentes.enemigosPorTipo,
    resultadoJefe.enemigosPorTipo,
    resultadoEspecial.enemigosPorTipo,
  ]);

  const variantes = combinarConteosMultiples([
    resultadoRecurrentes.variantes,
    resultadoJefe.variantes,
    resultadoEspecial.variantes,
  ]);

  const poblacionEnemigos = crearResumenPoblacionEnemigos({
    configuracion: plantilla.enemigos,
    contextoPoblacion,
    cantidadObjetivo: cantidadEnemigosRecurrentes,
    resultadoRecurrentes,
  });

  const resultadoBarriles = generarBarrilesProcedurales({
    plantilla,
    terreno,
    posicionJugador,
    contextoPoblacion,
    posicionesBloqueadasPersistentes:
      resultadoInteractuablesPrevios.posicionesBloqueadasPersistentes,
    objetivos: objetivosProcedurales,
    interactuables: interactuablesProcedurales,
    aleatorio,
  });

  const resumenInteractuables = crearResumenInteractuablesProcedurales({
    resultadoPrevio: resultadoInteractuablesPrevios,
    resultadoBarriles,
  });

  return {
    nivelMapa: nivelMapaResuelto,
    enemigos,
    destructibles: resultadoBarriles.barriles,
    barriles: resultadoBarriles.barriles,
    interactuables: interactuablesProcedurales,
    objetivos: [...enemigos, ...objetivosProcedurales],
    resumen: {
      nivelMapa: nivelMapaResuelto,
      cantidadEnemigos: enemigos.length,
      cantidadEnemigosRecurrentes: resultadoRecurrentes.enemigos.length,
      cantidadEnemigosEspeciales: resultadoEspecial.enemigos.length,
      cantidadJefes: resultadoJefe.enemigos.length,
      encuentroEspecial: resultadoEspecial.resumen,
      jefe: resultadoJefe.resumen,
      cantidadDestructibles: resultadoBarriles.barriles.length,
      cantidadDestructiblesObjetivo: resultadoBarriles.cantidadObjetivo,
      cantidadDestructiblesNoColocados:
        resultadoBarriles.cantidadNoColocada,
      porcentajeDestructibles: resultadoBarriles.densidadPor100Casillas,
      enemigosPorTipo,
      variantes,
      poblacionEnemigos,
      detalleEnemigos,
      detalleDestructibles: resultadoBarriles.detalle,
      interactuablesProcedurales: resumenInteractuables,
    },
  };
}

// Genera exclusivamente la población habitual
// declarada dentro de plantilla.enemigos.
//
// Los enemigos poco frecuentes y los jefes no deben
// aparecer dentro de esta lista ponderada.
function generarEnemigosRecurrentes({
  plantilla,
  nivelMapa,
  posicionJugador,
  contextoPoblacion,
  cantidadObjetivo,
  posicionesEnemigos,
  aleatorio,
  configuracionEnemigos,
  configuracionObjetos,
}) {
  const configuracion = plantilla.enemigos;
  const enemigos = [];
  const detalle = [];
  const enemigosPorTipo = {};
  const variantes = {};
  const zonasActivas = aleatorio.mezclar([
    contextoPoblacion.zonaEspecial,
    ...contextoPoblacion.zonasNormales.filter((zona) => zona.activaInicial),
  ]);
  const zonasReserva = aleatorio.mezclar(
    contextoPoblacion.zonasNormales.filter((zona) => !zona.activaInicial),
  );
  const zonasActivadasPorCapacidad = [];
  let indiceZonaSiguiente = 0;

  for (let indice = 0; indice < cantidadObjetivo; indice++) {
    let ubicacion = buscarUbicacionEnZonas({
      zonas: zonasActivas,
      indiceInicial: indiceZonaSiguiente,
      posicionJugador,
      posicionesEnemigos,
      distanciaSeguraJugador: configuracion.distanciaSeguraJugador,
      distanciaMinimaEntreEnemigos: configuracion.distanciaMinimaEntreEnemigos,
    });

    while (ubicacion === null && zonasReserva.length > 0) {
      const zonaActivada = zonasReserva.shift();
      zonaActivada.activadaPorCapacidad = true;
      zonasActivas.push(zonaActivada);
      zonasActivadasPorCapacidad.push(zonaActivada.idHabitacion);

      ubicacion = buscarUbicacionEnZonas({
        zonas: zonasActivas,
        indiceInicial: indiceZonaSiguiente,
        posicionJugador,
        posicionesEnemigos,
        distanciaSeguraJugador: configuracion.distanciaSeguraJugador,
        distanciaMinimaEntreEnemigos: configuracion.distanciaMinimaEntreEnemigos,
      });
    }

    if (ubicacion === null) {
      throw new Error(
        `El mapa "${plantilla.nombre}" no tiene espacio ` +
          `para colocar ${cantidadObjetivo} enemigos recurrentes ` +
          "respetando las zonas y distancias configuradas.",
      );
    }

    const { zona, indicePosicion, indiceZona } = ubicacion;
    const [posicion] = zona.posicionesDisponibles.splice(indicePosicion, 1);
    indiceZonaSiguiente = zonasActivas.length > 0
      ? (indiceZona + 1) % zonasActivas.length
      : 0;

    const enemigoPermitido = seleccionarPonderado(
      configuracion.permitidos,
      aleatorio,
    );

    const idVariante = seleccionarVariante(
      configuracion.probabilidadesVariantes,
      aleatorio,
    );

    const enemigo = crearEnemigo({
      configuracionEnemigos,
      configuracionObjetos,
      idPlantilla: enemigoPermitido.id,
      nivel: nivelMapa,
      idVariante,
      x: posicion.x,
      y: posicion.y,
    });

    enemigos.push(enemigo);
    posicionesEnemigos.push({ ...posicion });
    zona.cantidadEnemigosRecurrentes += 1;

    incrementarConteo(enemigosPorTipo, enemigoPermitido.id);
    incrementarConteo(variantes, idVariante ?? "normal");

    detalle.push({
      numero: indice + 1,
      nombre: enemigo.nombre,
      tipo: enemigoPermitido.id,
      variante: idVariante ?? "normal",
      nivel: nivelMapa,
      x: posicion.x,
      y: posicion.y,
      idHabitacion: zona.idHabitacion,
      zonaEspecial: zona.esEspecial,
      esEncuentroEspecial: false,
      esJefe: false,
    });
  }

  return {
    enemigos,
    posicionesEnemigos,
    detalle,
    enemigosPorTipo,
    variantes,
    zonasActivadasPorCapacidad,
  };
}

// Resuelve y coloca una entidad única configurada
// como encuentro especial o jefe.
//
// Los encuentros especiales son opcionales: si no existe
// una posición válida, el mapa continúa sin ellos.
//
// Los jefes son obligatorios: si fueron configurados y no
// pueden colocarse, la generación falla para impedir crear
// una Sala de guerra sin su objetivo principal.
function generarEnemigoUnicoEnZona({
  plantilla,
  configuracion,
  tipo,
  obligatorio,
  nivelMapa,
  posicionJugador,
  zona,
  posicionesEnemigos,
  aleatorio,
  configuracionEnemigos,
  configuracionObjetos,
  numeroDetalleInicial,
}) {
  validarTipoEnemigoUnico({
    tipo,
    obligatorio,
  });

  const resolucion = resolverEncuentroEspecial({
    configuracion,
    aleatorio,
  });

  const esJefe = tipo === TIPOS_ENEMIGO_UNICO.JEFE;
  const esEncuentroEspecial = tipo === TIPOS_ENEMIGO_UNICO.ESPECIAL;

  const resumenBase = {
    configurado: resolucion.configurado,
    tipo,
    obligatorio,
    probabilidadAparicion: resolucion.probabilidadAparicion,
    tirada: resolucion.tirada,
    tiradaExitosa: resolucion.aparece,
    colocado: false,
    omitidoPorEspacio: false,
    idEnemigo: resolucion.idEnemigo,
    nombre: null,
    variante: resolucion.variante,
    nivel: nivelMapa,
    idHabitacion: zona?.idHabitacion ?? null,
    zonaEspecial: true,
    x: null,
    y: null,
  };

  if (!resolucion.aparece) {
    if (obligatorio && resolucion.configurado) {
      throw new Error(
        `El jefe configurado de "${plantilla.nombre}" ` +
          "no superó su tirada obligatoria de aparición.",
      );
    }

    return crearResultadoEnemigoUnicoVacio(resumenBase);
  }

  if (!zona || zona.esEspecial !== true) {
    throw new Error(
      `El mapa "${plantilla.nombre}" no tiene una zona especial válida ` +
        `para colocar ${esJefe ? "su jefe" : "el encuentro especial"}.`,
    );
  }

  const configuracionPosicion = plantilla.enemigos;
  const indicePosicion = buscarIndicePosicionEnemigo({
    posicionesDisponibles: zona.posicionesDisponibles,
    posicionJugador,
    posicionesEnemigos,
    distanciaSeguraJugador: configuracionPosicion.distanciaSeguraJugador,
    distanciaMinimaEntreEnemigos:
      configuracionPosicion.distanciaMinimaEntreEnemigos,
  });

  if (indicePosicion === -1) {
    if (obligatorio) {
      throw new Error(
        `El jefe "${resolucion.idEnemigo}" de ` +
          `"${plantilla.nombre}" no pudo colocarse dentro de la zona especial ` +
          "respetando las distancias.",
      );
    }

    console.warn(
      `[Mapa] El encuentro especial "${resolucion.idEnemigo}" ` +
        `fue seleccionado para "${plantilla.nombre}", ` +
        "pero no pudo colocarse dentro de la zona especial.",
    );

    return crearResultadoEnemigoUnicoVacio({
      ...resumenBase,
      omitidoPorEspacio: true,
    });
  }

  const [posicion] = zona.posicionesDisponibles.splice(indicePosicion, 1);

  const enemigo = crearEnemigo({
    configuracionEnemigos,
    configuracionObjetos,
    idPlantilla: resolucion.idEnemigo,
    nivel: nivelMapa,
    idVariante: resolucion.idVariante,
    x: posicion.x,
    y: posicion.y,
  });

  agregarBotinAdicional({
    enemigo,
    tablaBotinAdicional: resolucion.tablaBotinAdicional,
    descripcion: esJefe ? "del jefe" : "del encuentro especial",
  });

  posicionesEnemigos.push({ ...posicion });
  zona.cantidadEnemigosUnicos += 1;

  return {
    enemigos: [enemigo],
    detalle: [
      {
        numero: numeroDetalleInicial,
        nombre: enemigo.nombre,
        tipo: resolucion.idEnemigo,
        variante: resolucion.variante,
        nivel: nivelMapa,
        x: posicion.x,
        y: posicion.y,
        idHabitacion: zona.idHabitacion,
        zonaEspecial: true,
        esEncuentroEspecial,
        esJefe,
        probabilidadEncuentro: resolucion.probabilidadAparicion,
        tiradaEncuentro: resolucion.tirada,
        cantidadEntradasBotinAdicional: resolucion.tablaBotinAdicional.length,
      },
    ],
    enemigosPorTipo: {
      [resolucion.idEnemigo]: 1,
    },
    variantes: {
      [resolucion.variante]: 1,
    },
    resumen: {
      ...resumenBase,
      colocado: true,
      nombre: enemigo.nombre,
      x: posicion.x,
      y: posicion.y,
    },
  };
}

function crearResultadoEnemigoUnicoVacio(resumen) {
  return {
    enemigos: [],
    detalle: [],
    enemigosPorTipo: {},
    variantes: {},
    resumen,
  };
}

function agregarBotinAdicional({ enemigo, tablaBotinAdicional, descripcion }) {
  if (!Array.isArray(tablaBotinAdicional)) {
    throw new Error(`El botín adicional ${descripcion} debe ser una lista.`);
  }

  enemigo.tablaBotin.push(
    ...tablaBotinAdicional.map((entrada) => ({
      ...entrada,
    })),
  );
}

function crearContextoPoblacion({
  terreno,
  posicionJugador,
  aleatorio,
  configuracion,
}) {
  const idHabitacionEspecial = terreno.salidaEstructural?.idHabitacion;

  if (
    typeof idHabitacionEspecial !== "string" ||
    idHabitacionEspecial.trim() === ""
  ) {
    throw new Error(
      "El plano necesita identificar la habitación asociada a la salida estructural.",
    );
  }

  const clavesReservadas = new Set(
    (terreno.casillasReservadasContenido ?? []).map((posicion) =>
      crearClave(posicion),
    ),
  );

  const zonas = (terreno.zonasCandidatasPoblacion ?? []).map((zona) => {
    const esEspecial = zona.idHabitacion === idHabitacionEspecial;
    const posicionesDisponibles = aleatorio.mezclar(
      (zona.casillas ?? []).filter(
        (posicion) =>
          !sonMismaPosicion(posicion, posicionJugador) &&
          !clavesReservadas.has(crearClave(posicion)),
      ),
    );

    return {
      idHabitacion: zona.idHabitacion,
      esEspecial,
      activaInicial:
        esEspecial ||
        aleatorio.siguiente() * 100 < configuracion.probabilidadZonaPoblada,
      activadaPorCapacidad: false,
      cantidadEnemigosRecurrentes: 0,
      cantidadEnemigosUnicos: 0,
      cantidadCasillasCandidatas: posicionesDisponibles.length,
      posicionesDisponibles,
    };
  });

  const zonasEspeciales = zonas.filter((zona) => zona.esEspecial);

  if (zonasEspeciales.length !== 1) {
    throw new Error(
      "El plano debe producir exactamente una zona de población asociada a la salida estructural.",
    );
  }

  return {
    zonaEspecial: zonasEspeciales[0],
    zonasNormales: zonas.filter((zona) => !zona.esEspecial),
    cantidadCasillasCandidatas: zonas.reduce(
      (total, zona) => total + zona.cantidadCasillasCandidatas,
      0,
    ),
  };
}

function calcularCantidadEnemigosRecurrentes({
  configuracion,
  contextoPoblacion,
}) {
  if (Number.isInteger(configuracion.cantidadPrueba)) {
    return configuracion.cantidadPrueba;
  }

  const cantidadCalculada = Math.round(
    contextoPoblacion.cantidadCasillasCandidatas *
      (configuracion.densidadPor100Casillas / 100),
  );

  return contextoPoblacion.cantidadCasillasCandidatas > 0
    ? Math.max(1, cantidadCalculada)
    : 0;
}

function buscarUbicacionEnZonas({
  zonas,
  indiceInicial,
  posicionJugador,
  posicionesEnemigos,
  distanciaSeguraJugador,
  distanciaMinimaEntreEnemigos,
}) {
  if (!Array.isArray(zonas) || zonas.length === 0) {
    return null;
  }

  for (let desplazamiento = 0; desplazamiento < zonas.length; desplazamiento++) {
    const indiceZona = (indiceInicial + desplazamiento) % zonas.length;
    const zona = zonas[indiceZona];
    const indicePosicion = buscarIndicePosicionEnemigo({
      posicionesDisponibles: zona.posicionesDisponibles,
      posicionJugador,
      posicionesEnemigos,
      distanciaSeguraJugador,
      distanciaMinimaEntreEnemigos,
    });

    if (indicePosicion !== -1) {
      return {
        zona,
        indiceZona,
        indicePosicion,
      };
    }
  }

  return null;
}

function crearResumenPoblacionEnemigos({
  configuracion,
  contextoPoblacion,
  cantidadObjetivo,
  resultadoRecurrentes,
}) {
  const zonas = [
    contextoPoblacion.zonaEspecial,
    ...contextoPoblacion.zonasNormales,
  ];

  return {
    estrategia: "densidad_por_zonas",
    cantidadForzadaPrueba: configuracion.cantidadPrueba ?? null,
    densidadPor100Casillas: configuracion.densidadPor100Casillas,
    probabilidadZonaPoblada: configuracion.probabilidadZonaPoblada,
    cantidadCasillasCandidatas: contextoPoblacion.cantidadCasillasCandidatas,
    cantidadObjetivoRecurrentes: cantidadObjetivo,
    idHabitacionZonaEspecial: contextoPoblacion.zonaEspecial.idHabitacion,
    cantidadZonasNormales: contextoPoblacion.zonasNormales.length,
    cantidadZonasActivasIniciales: zonas.filter((zona) => zona.activaInicial)
      .length,
    zonasActivadasPorCapacidad: [
      ...resultadoRecurrentes.zonasActivadasPorCapacidad,
    ],
    detalleZonas: zonas.map((zona) => ({
      idHabitacion: zona.idHabitacion,
      zonaEspecial: zona.esEspecial,
      activaInicial: zona.activaInicial,
      activadaPorCapacidad: zona.activadaPorCapacidad,
      cantidadCasillasCandidatas: zona.cantidadCasillasCandidatas,
      enemigosRecurrentes: zona.cantidadEnemigosRecurrentes,
      enemigosUnicos: zona.cantidadEnemigosUnicos,
    })),
  };
}

function generarInteractuablesPrevios({
  plantilla,
  terreno,
  posicionJugador,
  nivelMapa,
  contextoPoblacion,
  objetivos,
  interactuables,
  configuracionObjetos,
  aleatorio,
}) {
  const configuracion = plantilla.interactuables;
  const posicionesBloqueadasPersistentes = new Set();
  const posicionesReservadasAcceso = new Set();
  const detallePuertas = [];
  const detalleCofresModerados = [];

  const portalEntrada = generarPortalEntrada({
    terreno,
    posicionJugador,
    objetivos,
    interactuables,
    aleatorio,
  });

  const puertas = generarPuertasProcedurales({
    terreno,
    configuracion: configuracion.puertas,
    objetivos,
    interactuables,
    aleatorio,
  });
  detallePuertas.push(...puertas.detalle);

  const clavesCaminables = new Set(
    terreno.casillasCaminables.map((posicion) => crearClave(posicion)),
  );

  const cofreImportante = generarCofreEnZona({
    zona: contextoPoblacion.zonaEspecial,
    tipo: "importante",
    obligatorio: true,
    nombre: "Cofre importante",
    configuracion: configuracion.cofres.importante,
    nivelMapa,
    objetivos,
    interactuables,
    configuracionObjetos,
    aleatorio,
    clavesCaminables,
    posicionesBloqueadasPersistentes,
    posicionesReservadasAcceso,
    posicionJugador,
  });

  for (const zona of aleatorio.mezclar([...contextoPoblacion.zonasNormales])) {
    const tirada = aleatorio.siguiente() * 100;
    if (tirada >= configuracion.cofres.moderados.probabilidadPorHabitacion) {
      continue;
    }

    const resultado = generarCofreEnZona({
      zona,
      tipo: "moderado",
      obligatorio: false,
      nombre: "Cofre",
      configuracion: configuracion.cofres.moderados,
      nivelMapa,
      objetivos,
      interactuables,
      configuracionObjetos,
      aleatorio,
      clavesCaminables,
      posicionesBloqueadasPersistentes,
      posicionesReservadasAcceso,
      posicionJugador,
    });

    if (resultado) {
      detalleCofresModerados.push({
        ...resultado,
        tirada,
      });
    }
  }

  return {
    posicionesBloqueadasPersistentes,
    posicionesReservadasAcceso,
    portalEntrada,
    puertas: detallePuertas,
    cofreImportante,
    cofresModerados: detalleCofresModerados,
  };
}

function generarPortalEntrada({
  terreno,
  posicionJugador,
  objetivos,
  interactuables,
  aleatorio,
}) {
  const clavesHabitacionEntrada = new Set(
    (terreno.zonaEntrada?.casillasReservadas ?? []).map(crearClave),
  );
  const candidatas = aleatorio.mezclar(
    DIRECCIONES_ADYACENTES.map((direccion) => ({
      x: posicionJugador.x + direccion.x,
      y: posicionJugador.y + direccion.y,
    })),
  );
  const posicion = candidatas.find(
    (candidata) =>
      clavesHabitacionEntrada.has(crearClave(candidata)) &&
      terreno.celdas?.[candidata.y]?.[candidata.x] === ".",
  );

  if (!posicion) {
    throw new Error(
      "La habitación inicial no tiene una casilla adyacente válida para el portal de entrada.",
    );
  }

  const resultado = incorporarEntidadMazmorra({
    id: "portal_entrada",
    x: posicion.x,
    y: posicion.y,
    objetivos,
    interactuables,
  });

  return {
    x: posicion.x,
    y: posicion.y,
    activo: resultado.entidad.activo,
  };
}

function generarPuertasProcedurales({
  terreno,
  configuracion,
  objetivos,
  interactuables,
  aleatorio,
}) {
  const idHabitacionEntrada = terreno.zonaEntrada?.idHabitacion ?? null;
  const idPasilloSalida = terreno.salidaEstructural?.idPasillo ?? "pasillo_salida";
  const habitacionesPorId = new Map(
    (terreno.habitaciones ?? []).map((habitacion) => [habitacion.id, habitacion]),
  );
  const candidatosPorPasillo = new Map();

  for (const punto of terreno.puntosConexion ?? []) {
    if (
      punto.tipo !== "acceso_habitacion" ||
      punto.idPasillo === idPasilloSalida ||
      punto.idHabitacion === idHabitacionEntrada
    ) {
      continue;
    }

    const candidatos = candidatosPorPasillo.get(punto.idPasillo) ?? [];
    candidatos.push(punto);
    candidatosPorPasillo.set(punto.idPasillo, candidatos);
  }

  const detalle = [];
  const clavesPuertas = new Set();

  for (const [idPasillo, candidatos] of [...candidatosPorPasillo.entries()].sort()) {
    const tirada = aleatorio.siguiente() * 100;
    if (tirada >= configuracion.probabilidadPorPasillo) {
      continue;
    }

    const disponibles = aleatorio
      .mezclar([...candidatos])
      .filter((punto) => !clavesPuertas.has(crearClave(punto)))
      // Un acceso estructural puede compartir casillas con otra ruta o girar
      // inmediatamente al salir de una habitación. En esos casos el punto es
      // válido para conectividad, pero no representa visualmente un umbral de
      // una casilla donde tenga sentido materializar una puerta.
      .filter((punto) => {
        const habitacion = habitacionesPorId.get(punto.idHabitacion);
        return (
          habitacion &&
          esUmbralPuertaValido({
            punto,
            habitacion,
            celdas: terreno.celdas,
          })
        );
      });
    const punto = disponibles[0] ?? null;
    if (!punto) continue;

    const habitacion = habitacionesPorId.get(punto.idHabitacion);
    if (!habitacion) {
      throw new Error(
        `El acceso ${punto.id ?? "sin_id"} referencia una habitación inexistente.`,
      );
    }

    const orientacion = resolverOrientacionPuerta({ punto, habitacion });
    const resultado = incorporarEntidadMazmorra({
      id: "puerta",
      nombre: "Puerta",
      x: punto.x,
      y: punto.y,
      abierta: false,
      orientacion,
      objetivos,
      interactuables,
    });

    clavesPuertas.add(crearClave(punto));
    detalle.push({
      idPasillo,
      idHabitacion: punto.idHabitacion,
      x: punto.x,
      y: punto.y,
      orientacion,
      abierta: resultado.entidad.abierta,
      tirada,
    });
  }

  return { detalle };
}

function resolverOrientacionPuerta({ punto, habitacion }) {
  const fueraHorizontalmente =
    punto.x < habitacion.x || punto.x >= habitacion.x + habitacion.ancho;

  return fueraHorizontalmente
    ? ORIENTACIONES_PUERTA.VERTICAL
    : ORIENTACIONES_PUERTA.HORIZONTAL;
}

function esUmbralPuertaValido({ punto, habitacion, celdas }) {
  if (celdas?.[punto.y]?.[punto.x] !== ".") {
    return false;
  }

  const direccionHabitacion = obtenerDireccionHaciaHabitacion({
    punto,
    habitacion,
  });
  if (!direccionHabitacion) {
    return false;
  }

  const haciaHabitacion = {
    x: punto.x + direccionHabitacion.x,
    y: punto.y + direccionHabitacion.y,
  };
  const haciaPasillo = {
    x: punto.x - direccionHabitacion.x,
    y: punto.y - direccionHabitacion.y,
  };
  const perpendicularA = {
    x: punto.x + direccionHabitacion.y,
    y: punto.y + direccionHabitacion.x,
  };
  const perpendicularB = {
    x: punto.x - direccionHabitacion.y,
    y: punto.y - direccionHabitacion.x,
  };

  return (
    contieneHabitacion(habitacion, haciaHabitacion) &&
    celdas?.[haciaHabitacion.y]?.[haciaHabitacion.x] === "." &&
    celdas?.[haciaPasillo.y]?.[haciaPasillo.x] === "." &&
    celdas?.[perpendicularA.y]?.[perpendicularA.x] !== "." &&
    celdas?.[perpendicularB.y]?.[perpendicularB.x] !== "."
  );
}

function obtenerDireccionHaciaHabitacion({ punto, habitacion }) {
  if (punto.x < habitacion.x) return { x: 1, y: 0 };
  if (punto.x >= habitacion.x + habitacion.ancho) return { x: -1, y: 0 };
  if (punto.y < habitacion.y) return { x: 0, y: 1 };
  if (punto.y >= habitacion.y + habitacion.alto) return { x: 0, y: -1 };
  return null;
}

function contieneHabitacion(habitacion, posicion) {
  return (
    posicion.x >= habitacion.x &&
    posicion.x < habitacion.x + habitacion.ancho &&
    posicion.y >= habitacion.y &&
    posicion.y < habitacion.y + habitacion.alto
  );
}

function generarCofreEnZona({
  zona,
  tipo,
  obligatorio,
  nombre,
  configuracion,
  nivelMapa,
  objetivos,
  interactuables,
  configuracionObjetos,
  aleatorio,
  clavesCaminables,
  posicionesBloqueadasPersistentes,
  posicionesReservadasAcceso,
  posicionJugador,
}) {
  const posicion = extraerPosicionBloqueanteValida({
    zona,
    clavesCaminables,
    posicionesBloqueadasPersistentes,
    posicionJugador,
  });

  if (!posicion) {
    if (obligatorio) {
      throw new Error(
        `La zona especial "${zona.idHabitacion}" no tiene una posición válida para el cofre importante.`,
      );
    }
    return null;
  }

  const posicionAcceso = reservarAccesoCofre({
    zona,
    posicionCofre: posicion,
    clavesCaminables,
    posicionesBloqueadasPersistentes,
    posicionesReservadasAcceso,
  });

  if (!posicionAcceso) {
    posicionesBloqueadasPersistentes.delete(crearClave(posicion));
    zona.posicionesDisponibles.push(posicion);
    if (obligatorio) {
      throw new Error(
        `La zona especial "${zona.idHabitacion}" no puede reservar acceso al cofre importante.`,
      );
    }
    return null;
  }

  const resultado = incorporarEntidadMazmorra({
    id: "cofre",
    nombre,
    x: posicion.x,
    y: posicion.y,
    nivel: nivelMapa,
    tablaBotin: configuracion.tablaBotin,
    configuracionObjetos,
    aleatorio,
    objetivos,
    interactuables,
  });

  const cantidadObjetos = resultado.resultadoBotin?.objetosGenerados?.length ?? 0;
  if (cantidadObjetos === 0) {
    throw new Error(
      `El cofre ${tipo} de "${zona.idHabitacion}" quedó vacío. ` +
        "Su tabla debe garantizar al menos un objeto compatible con el nivel del mapa.",
    );
  }

  return {
    tipo,
    idHabitacion: zona.idHabitacion,
    zonaEspecial: zona.esEspecial,
    x: posicion.x,
    y: posicion.y,
    posicionAcceso: { ...posicionAcceso },
    cantidadPilas: resultado.resultadoBotin.cantidadPilas,
    cantidadUnidades: resultado.resultadoBotin.cantidadUnidades,
    botin: resultado.resultadoBotin.resumen,
  };
}

function reservarAccesoCofre({
  zona,
  posicionCofre,
  clavesCaminables,
  posicionesBloqueadasPersistentes,
  posicionesReservadasAcceso,
}) {
  const indice = zona.posicionesDisponibles.findIndex((candidata) => {
    const distancia =
      Math.abs(candidata.x - posicionCofre.x) +
      Math.abs(candidata.y - posicionCofre.y);
    const clave = crearClave(candidata);
    return (
      distancia === 1 &&
      clavesCaminables.has(clave) &&
      !posicionesBloqueadasPersistentes.has(clave) &&
      !posicionesReservadasAcceso.has(clave)
    );
  });

  if (indice === -1) return null;
  const [posicion] = zona.posicionesDisponibles.splice(indice, 1);
  posicionesReservadasAcceso.add(crearClave(posicion));
  return posicion;
}

function extraerPosicionBloqueanteValida({
  zona,
  clavesCaminables,
  posicionesBloqueadasPersistentes,
  posicionJugador,
}) {
  for (let indice = 0; indice < zona.posicionesDisponibles.length; indice++) {
    const posicion = zona.posicionesDisponibles[indice];
    const clave = crearClave(posicion);

    posicionesBloqueadasPersistentes.add(clave);
    const mantieneConectividad = comprobarConectividad({
      clavesCaminables,
      posicionesBloqueadas: posicionesBloqueadasPersistentes,
      posicionInicial: posicionJugador,
    });

    if (!mantieneConectividad) {
      posicionesBloqueadasPersistentes.delete(clave);
      continue;
    }

    zona.posicionesDisponibles.splice(indice, 1);
    return posicion;
  }

  return null;
}

function generarBarrilesProcedurales({
  plantilla,
  terreno,
  posicionJugador,
  contextoPoblacion,
  posicionesBloqueadasPersistentes,
  objetivos,
  interactuables,
  aleatorio,
}) {
  const configuracion = plantilla.interactuables.barriles;
  const cantidadCalculada = Math.round(
    contextoPoblacion.cantidadCasillasCandidatas *
      (configuracion.densidadPor100Casillas / 100),
  );
  const cantidadObjetivo =
    configuracion.densidadPor100Casillas > 0 &&
    contextoPoblacion.cantidadCasillasCandidatas > 0
      ? Math.max(1, cantidadCalculada)
      : 0;

  const clavesCaminables = new Set(
    terreno.casillasCaminables.map((posicion) => crearClave(posicion)),
  );
  const zonaPorClave = new Map();
  const candidatas = [];

  for (const zona of [
    contextoPoblacion.zonaEspecial,
    ...contextoPoblacion.zonasNormales,
  ]) {
    for (const posicion of zona.posicionesDisponibles) {
      zonaPorClave.set(crearClave(posicion), zona);
      candidatas.push(posicion);
    }
  }

  const barriles = [];
  const detalle = [];

  for (const posicion of aleatorio.mezclar(candidatas)) {
    if (barriles.length >= cantidadObjetivo) break;

    const clave = crearClave(posicion);
    posicionesBloqueadasPersistentes.add(clave);
    const mantieneConectividad = comprobarConectividad({
      clavesCaminables,
      posicionesBloqueadas: posicionesBloqueadasPersistentes,
      posicionInicial: posicionJugador,
    });

    if (!mantieneConectividad) {
      posicionesBloqueadasPersistentes.delete(clave);
      continue;
    }

    const permitido = seleccionarPonderado(configuracion.permitidos, aleatorio);
    const resultado = incorporarEntidadMazmorra({
      id: permitido.id,
      x: posicion.x,
      y: posicion.y,
      objetivos,
      interactuables,
    });
    const zona = zonaPorClave.get(clave);

    barriles.push(resultado.entidad);
    detalle.push({
      numero: barriles.length,
      tipo: permitido.id,
      nombre: resultado.entidad.nombre,
      x: posicion.x,
      y: posicion.y,
      idHabitacion: zona?.idHabitacion ?? null,
      zonaEspecial: zona?.esEspecial === true,
    });
  }

  const cantidadNoColocada = cantidadObjetivo - barriles.length;
  if (cantidadNoColocada > 0) {
    console.warn(
      `[Mapa] "${plantilla.nombre}" colocó ${barriles.length} de ` +
        `${cantidadObjetivo} barriles para conservar la conectividad.`,
    );
  }

  return {
    barriles,
    detalle,
    densidadPor100Casillas: configuracion.densidadPor100Casillas,
    cantidadObjetivo,
    cantidadNoColocada,
  };
}

function crearResumenInteractuablesProcedurales({
  resultadoPrevio,
  resultadoBarriles,
}) {
  return {
    portalEntrada: { ...resultadoPrevio.portalEntrada },
    cantidadPuertas: resultadoPrevio.puertas.length,
    detallePuertas: resultadoPrevio.puertas.map((entrada) => ({ ...entrada })),
    cantidadCofresModerados: resultadoPrevio.cofresModerados.length,
    cofresModerados: resultadoPrevio.cofresModerados.map((entrada) => ({
      ...entrada,
    })),
    cofreImportante: { ...resultadoPrevio.cofreImportante },
    cantidadBarriles: resultadoBarriles.barriles.length,
    cantidadBarrilesObjetivo: resultadoBarriles.cantidadObjetivo,
    cantidadBarrilesNoColocados: resultadoBarriles.cantidadNoColocada,
    densidadBarrilesPor100Casillas: resultadoBarriles.densidadPor100Casillas,
  };
}

function buscarIndicePosicionEnemigo({
  posicionesDisponibles,
  posicionJugador,
  posicionesEnemigos,
  distanciaSeguraJugador,
  distanciaMinimaEntreEnemigos,
}) {
  return posicionesDisponibles.findIndex((posicion) =>
    posicionValidaParaEnemigo({
      posicion,
      posicionJugador,
      posicionesEnemigos,
      distanciaSeguraJugador,
      distanciaMinimaEntreEnemigos,
    }),
  );
}

function posicionValidaParaEnemigo({
  posicion,
  posicionJugador,
  posicionesEnemigos,
  distanciaSeguraJugador,
  distanciaMinimaEntreEnemigos,
}) {
  const distanciaJugador = calcularDistanciaCuadricula(
    posicion,
    posicionJugador,
  );

  if (distanciaJugador < distanciaSeguraJugador) {
    return false;
  }

  return posicionesEnemigos.every(
    (enemigoExistente) =>
      calcularDistanciaCuadricula(posicion, enemigoExistente) >=
      distanciaMinimaEntreEnemigos,
  );
}

function comprobarConectividad({
  clavesCaminables,
  posicionesBloqueadas,
  posicionInicial,
}) {
  const claveInicial = crearClave(posicionInicial);

  if (
    !clavesCaminables.has(claveInicial) ||
    posicionesBloqueadas.has(claveInicial)
  ) {
    return false;
  }

  const pendientes = [
    {
      ...posicionInicial,
    },
  ];

  const visitadas = new Set([claveInicial]);

  let indicePendiente = 0;

  while (indicePendiente < pendientes.length) {
    const actual = pendientes[indicePendiente];

    indicePendiente++;

    for (const direccion of DIRECCIONES_CARDINALES) {
      const siguiente = {
        x: actual.x + direccion.x,
        y: actual.y + direccion.y,
      };

      const claveSiguiente = crearClave(siguiente);

      if (
        !clavesCaminables.has(claveSiguiente) ||
        posicionesBloqueadas.has(claveSiguiente) ||
        visitadas.has(claveSiguiente)
      ) {
        continue;
      }

      visitadas.add(claveSiguiente);

      pendientes.push(siguiente);
    }
  }

  const cantidadDisponible = clavesCaminables.size - posicionesBloqueadas.size;

  return visitadas.size === cantidadDisponible;
}

function seleccionarPonderado(elementos, aleatorio) {
  if (!Array.isArray(elementos) || elementos.length === 0) {
    throw new Error("No se puede realizar una selección ponderada vacía.");
  }

  const pesoTotal = elementos.reduce((total, elemento) => {
    if (!Number.isFinite(elemento.peso) || elemento.peso <= 0) {
      throw new Error(`El peso de "${elemento.id}" debe ser mayor que 0.`);
    }

    return total + elemento.peso;
  }, 0);

  const valorSeleccionado = aleatorio.siguiente() * pesoTotal;

  let acumulado = 0;

  for (const elemento of elementos) {
    acumulado += elemento.peso;

    if (valorSeleccionado < acumulado) {
      return elemento;
    }
  }

  return elementos[elementos.length - 1];
}

function seleccionarVariante(probabilidades, aleatorio) {
  const opciones = Object.entries(probabilidades)
    .filter(([, probabilidad]) => probabilidad > 0)
    .map(([id, probabilidad]) => ({
      id,
      peso: probabilidad,
    }));

  const seleccion = seleccionarPonderado(opciones, aleatorio);

  return seleccion.id === "normal" ? null : seleccion.id;
}

function combinarConteosMultiples(conteos) {
  return conteos.reduce(
    (resultado, conteo) => combinarConteos(resultado, conteo),
    {},
  );
}

function combinarConteos(conteoA, conteoB) {
  const resultado = {
    ...conteoA,
  };

  for (const [clave, cantidad] of Object.entries(conteoB)) {
    resultado[clave] = (resultado[clave] ?? 0) + cantidad;
  }

  return resultado;
}

function incrementarConteo(conteo, clave) {
  conteo[clave] = (conteo[clave] ?? 0) + 1;
}

// Utilizamos distancia Chebyshev porque coincide
// con el movimiento en ocho direcciones.
function calcularDistanciaCuadricula(origen, destino) {
  return Math.max(
    Math.abs(destino.x - origen.x),
    Math.abs(destino.y - origen.y),
  );
}

function sonMismaPosicion(posicionA, posicionB) {
  return posicionA.x === posicionB.x && posicionA.y === posicionB.y;
}

function crearClave(posicion) {
  return `${posicion.x},` + `${posicion.y}`;
}

function validarTipoEnemigoUnico({ tipo, obligatorio }) {
  if (!Object.values(TIPOS_ENEMIGO_UNICO).includes(tipo)) {
    throw new Error(`El tipo de enemigo único "${tipo}" no es válido.`);
  }

  if (typeof obligatorio !== "boolean") {
    throw new Error("La obligatoriedad del enemigo único debe ser booleana.");
  }
}

function validarParametros({
  plantilla,
  terreno,
  posicionJugador,
  aleatorio,
  configuracionEnemigos,
  configuracionObjetos,
}) {
  if (!plantilla || typeof plantilla !== "object") {
    throw new Error(
      "Se necesita una plantilla para generar el contenido del mapa.",
    );
  }

  if (
    !terreno ||
    !Array.isArray(terreno.casillasCaminables) ||
    terreno.casillasCaminables.length === 0
  ) {
    throw new Error("Se necesita un terreno con casillas caminables.");
  }

  if (
    !posicionJugador ||
    !Number.isInteger(posicionJugador.x) ||
    !Number.isInteger(posicionJugador.y)
  ) {
    throw new Error("Se necesita una posición válida para el jugador.");
  }

  if (
    !aleatorio ||
    typeof aleatorio.entero !== "function" ||
    typeof aleatorio.siguiente !== "function" ||
    typeof aleatorio.mezclar !== "function"
  ) {
    throw new Error("Se necesita un generador aleatorio válido.");
  }

  if (!configuracionEnemigos || typeof configuracionEnemigos !== "object") {
    throw new Error("Se necesita la configuración de enemigos.");
  }

  if (!configuracionObjetos || typeof configuracionObjetos !== "object") {
    throw new Error("Se necesita la configuración de objetos.");
  }
}
