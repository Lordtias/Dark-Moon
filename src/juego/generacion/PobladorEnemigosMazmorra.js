import { calcularDistanciaCuadricula } from "../espacio/GeometriaCuadricula.js";
import { crearEnemigo } from "../fabricas/FabricaEnemigos.js";
import { resolverEncuentroEspecial } from "./GeneradorEncuentroEspecial.js";
import {
  calcularCostoEnemigoPoblacion,
  consumirPresupuesto,
  crearPlanPoblacionMazmorra,
  puedeConsumirPresupuesto,
} from "./PlanificadorPoblacionMazmorra.js";
import { seleccionarPonderado } from "./UtilidadesPoblacionMazmorra.js";

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
  let cantidadNoColocadaPorPresupuesto = 0;
  let cantidadNoColocadaPorCapacidadFisica = 0;

  for (let indice = 0; indice < cantidadObjetivo; indice++) {
    const candidato = seleccionarCandidatoEnemigoConPresupuesto({
      configuracion,
      nivelMapa,
      zonas: [...zonasActivas, ...zonasReserva],
      aleatorio,
      configuracionEnemigos,
      configuracionObjetos,
    });

    if (!candidato) {
      cantidadNoColocadaPorPresupuesto = cantidadObjetivo - enemigos.length;
      break;
    }

    let ubicacion = buscarUbicacionEnZonas({
      zonas: zonasActivas,
      indiceInicial: indiceZonaSiguiente,
      posicionJugador,
      posicionesEnemigos,
      distanciaSeguraJugador: configuracion.distanciaSeguraJugador,
      distanciaMinimaEntreEnemigos: configuracion.distanciaMinimaEntreEnemigos,
      costoPoblacion: candidato.costoPoblacion,
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
        costoPoblacion: candidato.costoPoblacion,
      });
    }

    if (ubicacion === null) {
      // La ocupación es compartida por enemigos y contenido físico. Puede
      // quedar presupuesto numérico disponible aunque las restricciones de
      // distancia y las entidades ya colocadas agoten las posiciones reales.
      // Eso es capacidad física consumida, no una inconsistencia del mapa.
      cantidadNoColocadaPorCapacidadFisica = cantidadObjetivo - enemigos.length;
      break;
    }

    const { zona, indicePosicion, indiceZona } = ubicacion;
    const [posicion] = zona.posicionesDisponibles.splice(indicePosicion, 1);
    indiceZonaSiguiente =
      zonasActivas.length > 0 ? (indiceZona + 1) % zonasActivas.length : 0;

    if (
      !consumirPresupuesto({
        zona,
        costo: candidato.costoPoblacion,
        origen: "enemigo_recurrente",
      })
    ) {
      throw new Error(
        `La habitación "${zona.idHabitacion}" perdió disponibilidad de presupuesto durante la colocación de un enemigo.`,
      );
    }

    const enemigo = crearEnemigo({
      configuracionEnemigos,
      configuracionObjetos,
      idPlantilla: candidato.enemigoPermitido.id,
      nivel: nivelMapa,
      idVariante: candidato.idVariante,
      x: posicion.x,
      y: posicion.y,
    });

    enemigos.push(enemigo);
    posicionesEnemigos.push({ ...posicion });
    zona.cantidadEnemigosRecurrentes += 1;

    incrementarConteo(enemigosPorTipo, candidato.enemigoPermitido.id);
    incrementarConteo(variantes, candidato.idVariante ?? "normal");

    detalle.push({
      numero: enemigos.length,
      nombre: enemigo.nombre,
      tipo: candidato.enemigoPermitido.id,
      variante: candidato.idVariante ?? "normal",
      nivel: nivelMapa,
      x: posicion.x,
      y: posicion.y,
      idHabitacion: zona.idHabitacion,
      zonaEspecial: zona.esEspecial,
      esEncuentroEspecial: false,
      esJefe: false,
      costoPoblacion: resumirCosto(candidato.costoPoblacion),
    });
  }

  return {
    enemigos,
    posicionesEnemigos,
    detalle,
    enemigosPorTipo,
    variantes,
    zonasActivadasPorCapacidad,
    cantidadNoColocadaPorPresupuesto,
    cantidadNoColocadaPorCapacidadFisica,
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
    omitidoPorPresupuesto: false,
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

  const costoPoblacion = calcularCostoEnemigoPoblacion({
    configuracionEnemigos,
    configuracionObjetos,
    idPlantilla: resolucion.idEnemigo,
    nivel: nivelMapa,
    idVariante: resolucion.idVariante,
  });

  if (!puedeConsumirPresupuesto(zona, costoPoblacion)) {
    if (obligatorio) {
      throw new Error(
        `La habitación especial "${zona.idHabitacion}" no tiene presupuesto suficiente para el jefe obligatorio de "${plantilla.nombre}".`,
      );
    }

    return crearResultadoEnemigoUnicoVacio({
      ...resumenBase,
      omitidoPorPresupuesto: true,
      costoPoblacion: resumirCosto(costoPoblacion),
    });
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

  if (
    !consumirPresupuesto({
      zona,
      costo: costoPoblacion,
      origen: esJefe ? "jefe" : "encuentro_especial",
    })
  ) {
    throw new Error(
      `La habitación especial "${zona.idHabitacion}" perdió disponibilidad de presupuesto durante la colocación de un enemigo único.`,
    );
  }

  const enemigo = crearEnemigo({
    configuracionEnemigos,
    configuracionObjetos,
    idPlantilla: resolucion.idEnemigo,
    nivel: nivelMapa,
    idVariante: resolucion.idVariante,
    x: posicion.x,
    y: posicion.y,
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
        costoPoblacion: resumirCosto(costoPoblacion),
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
      costoPoblacion: resumirCosto(costoPoblacion),
    },
  };
}
export function crearContextoPoblacion({
  plantilla,
  terreno,
  posicionJugador,
  aleatorio,
} = {}) {
  return crearPlanPoblacionMazmorra({
    plantilla,
    terreno,
    posicionJugador,
    aleatorio,
  });
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
    estrategia: "presupuesto_por_habitacion",
    densidadPor100Casillas: configuracion.densidadPor100Casillas,
    probabilidadZonaPoblada: configuracion.probabilidadZonaPoblada,
    cantidadCasillasCandidatas: contextoPoblacion.cantidadCasillasCandidatas,
    cantidadObjetivoRecurrentes: cantidadObjetivo,
    cantidadNoColocadaPorPresupuesto:
      resultadoRecurrentes.cantidadNoColocadaPorPresupuesto ?? 0,
    cantidadNoColocadaPorCapacidadFisica:
      resultadoRecurrentes.cantidadNoColocadaPorCapacidadFisica ?? 0,
    idHabitacionZonaEspecial: contextoPoblacion.zonaEspecial.idHabitacion,
    cantidadZonasNormales: contextoPoblacion.zonasNormales.length,
    cantidadZonasAmbientales: contextoPoblacion.zonasAmbientales.length,
    cantidadZonasActivasIniciales: zonas.filter((zona) => zona.activaInicial)
      .length,
    zonasActivadasPorCapacidad: [
      ...resultadoRecurrentes.zonasActivadasPorCapacidad,
    ],
    detalleZonas: contextoPoblacion.zonas.map((zona) => ({
      idHabitacion: zona.idHabitacion,
      tipoUso: zona.tipoUso,
      zonaEspecial: zona.esEspecial,
      ambiental: zona.esAmbiental,
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
function seleccionarCandidatoEnemigoConPresupuesto({
  configuracion,
  nivelMapa,
  zonas,
  aleatorio,
  configuracionEnemigos,
  configuracionObjetos,
}) {
  const intentosMaximos = Math.max(4, configuracion.permitidos.length * 4);

  for (let intento = 0; intento < intentosMaximos; intento++) {
    const enemigoPermitido = seleccionarPonderado(
      configuracion.permitidos,
      aleatorio,
    );
    const idVariante = seleccionarVariante(
      configuracion.probabilidadesVariantes,
      aleatorio,
    );
    const costoPoblacion = calcularCostoEnemigoPoblacion({
      configuracionEnemigos,
      configuracionObjetos,
      idPlantilla: enemigoPermitido.id,
      nivel: nivelMapa,
      idVariante,
    });

    if (zonas.some((zona) => puedeConsumirPresupuesto(zona, costoPoblacion))) {
      return {
        enemigoPermitido,
        idVariante,
        costoPoblacion,
      };
    }
  }

  return null;
}

function resumirCosto(costo) {
  return {
    ocupacion: costo.ocupacion,
    amenaza: costo.amenaza,
    valorRecompensa: costo.valorRecompensa,
  };
}

function buscarUbicacionEnZonas({
  zonas,
  indiceInicial,
  posicionJugador,
  posicionesEnemigos,
  distanciaSeguraJugador,
  distanciaMinimaEntreEnemigos,
  costoPoblacion,
}) {
  if (!Array.isArray(zonas) || zonas.length === 0) {
    return null;
  }

  for (let desplazamiento = 0; desplazamiento < zonas.length; desplazamiento++) {
    const indiceZona = (indiceInicial + desplazamiento) % zonas.length;
    const zona = zonas[indiceZona];
    if (!puedeConsumirPresupuesto(zona, costoPoblacion)) {
      continue;
    }
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

function validarTipoEnemigoUnico({ tipo, obligatorio }) {
  if (!Object.values(TIPOS_ENEMIGO_UNICO).includes(tipo)) {
    throw new Error(`El tipo de enemigo único "${tipo}" no es válido.`);
  }

  if (typeof obligatorio !== "boolean") {
    throw new Error("La obligatoriedad del enemigo único debe ser booleana.");
  }
}
