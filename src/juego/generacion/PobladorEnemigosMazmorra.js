import { calcularDistanciaCuadricula } from "../espacio/GeometriaCuadricula.js";
import { crearEnemigo } from "../fabricas/FabricaEnemigos.js";
import { resolverEncuentroEspecial } from "./GeneradorEncuentroEspecial.js";
import { crearClave, seleccionarPonderado } from "./UtilidadesPoblacionMazmorra.js";

export const TIPOS_ENEMIGO_UNICO = Object.freeze({
  ESPECIAL: "especial",
  JEFE: "jefe",
});

// Resuelve exclusivamente la población hostil de una mazmorra. La fachada
// GeneradorContenidoMapa conserva el orden de llamadas y el flujo aleatorio.

export function generarEnemigosRecurrentes({
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
export function generarEnemigoUnicoEnZona({
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
export function crearContextoPoblacion({
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
export function calcularCantidadEnemigosRecurrentes({
  configuracion,
  contextoPoblacion,
}) {
  const cantidadCalculada = Math.round(
    contextoPoblacion.cantidadCasillasCandidatas *
      (configuracion.densidadPor100Casillas / 100),
  );

  return contextoPoblacion.cantidadCasillasCandidatas > 0
    ? Math.max(1, cantidadCalculada)
    : 0;
}
export function crearResumenPoblacionEnemigos({
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
function incrementarConteo(conteo, clave) {
  conteo[clave] = (conteo[clave] ?? 0) + 1;
}

function sonMismaPosicion(posicionA, posicionB) {
  return posicionA.x === posicionB.x && posicionA.y === posicionB.y;
}
function validarTipoEnemigoUnico({ tipo, obligatorio }) {
  if (!Object.values(TIPOS_ENEMIGO_UNICO).includes(tipo)) {
    throw new Error(`El tipo de enemigo único "${tipo}" no es válido.`);
  }

  if (typeof obligatorio !== "boolean") {
    throw new Error("La obligatoriedad del enemigo único debe ser booleana.");
  }
}
