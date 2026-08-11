import { incorporarEntidadMazmorra } from "../fabricas/FabricaEntidadesMazmorra.js";
import { ORIENTACIONES_PUERTA } from "../../entidad/interactuable/Puerta.js";
import {
  analizarAccesoHabitacion,
  contieneCasillaHabitacion,
} from "./PlanoMazmorra.js";
import {
  calcularCostoCofrePoblacion,
  calcularCostoDestructiblePoblacion,
  consumirPresupuesto,
  puedeConsumirPresupuesto,
} from "./PlanificadorPoblacionMazmorra.js";
import { crearClave, seleccionarPonderado } from "./UtilidadesPoblacionMazmorra.js";

const DIRECCIONES_CARDINALES = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const DIRECCIONES_ADYACENTES = [
  ...DIRECCIONES_CARDINALES,
  { x: 1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
];

// Resuelve exclusivamente entidades e interactuables de contenido procedural.

export function generarInteractuablesPrevios({
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
    terreno.casillasTransitables.map((posicion) => crearClave(posicion)),
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
export function generarDestructiblesProcedurales(parametros = {}) {
  const plantilla = parametros.plantilla;
  if (!plantilla || typeof plantilla !== "object") {
    throw new Error("La población de destructibles necesita una plantilla válida.");
  }

  return plantilla.poblacion?.perfilesHabitacion
    ? generarDestructiblesPorPerfil(parametros)
    : generarDestructiblesPorDensidadGlobal(parametros);
}

// Mantiene el comportamiento histórico de las mazmorras que todavía no
// adoptaron perfiles: una densidad global sobre todas las zonas poblables.
// La familia concreta ya es genérica, pero la generalización del contrato no
// cambia por sí sola el balance de esos mapas.
function generarDestructiblesPorDensidadGlobal({
  plantilla,
  terreno,
  posicionJugador,
  nivelMapa,
  contextoPoblacion,
  posicionesBloqueadasPersistentes,
  objetivos,
  interactuables,
  configuracionObjetos,
  configuracionEntidadesMazmorra,
  aleatorio,
}) {
  const configuracion = plantilla.interactuables.destructibles;
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
    terreno.casillasTransitables.map((posicion) => crearClave(posicion)),
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

  const destructibles = [];
  const detalle = [];
  for (const posicion of aleatorio.mezclar(candidatas)) {
    if (destructibles.length >= cantidadObjetivo) break;

    const zona = zonaPorClave.get(crearClave(posicion));
    if (!zona) continue;
    const permitido = seleccionarPonderado(configuracion.permitidos, aleatorio);
    const datos = resolverDatosDestructible({
      permitido,
      configuracion,
      configuracionObjetos,
    });
    if (!puedeConsumirPresupuesto(zona, datos.costoPoblacion)) continue;

    const resultado = intentarColocarDestructible({
      permitido,
      datos,
      posicion,
      zona,
      plantilla,
      nivelMapa,
      posicionJugador,
      clavesCaminables,
      posicionesBloqueadasPersistentes,
      objetivos,
      interactuables,
      configuracionObjetos,
      configuracionEntidadesMazmorra,
      aleatorio,
    });
    if (!resultado) continue;

    retirarPosicionDisponible(zona, posicion);
    destructibles.push(resultado.entidad);
    detalle.push(
      crearDetalleDestructible({
        entidad: resultado.entidad,
        permitido,
        posicion,
        zona,
        numero: destructibles.length,
        costoPoblacion: datos.costoPoblacion,
      }),
    );
  }

  return finalizarResultadoDestructibles({
    plantilla,
    configuracion,
    destructibles,
    detalle,
    cantidadObjetivo,
  });
}

// Cuando el mapa ya define perfiles, cada habitación puede variar familias,
// pesos y multiplicador de contenido. Esta es la ruta que comienza a utilizar
// Alcantarilla y queda disponible para cualquier mazmorra futura.
function generarDestructiblesPorPerfil({
  plantilla,
  terreno,
  posicionJugador,
  nivelMapa,
  contextoPoblacion,
  posicionesBloqueadasPersistentes,
  objetivos,
  interactuables,
  configuracionObjetos,
  configuracionEntidadesMazmorra,
  aleatorio,
}) {
  const configuracion = plantilla.interactuables.destructibles;
  const clavesCaminables = new Set(
    terreno.casillasTransitables.map((posicion) => crearClave(posicion)),
  );
  const zonas = [
    contextoPoblacion.zonaEspecial,
    ...contextoPoblacion.zonasNormales,
  ];
  const destructibles = [];
  const detalle = [];
  let cantidadObjetivo = 0;

  for (const zona of aleatorio.mezclar(zonas)) {
    const configuracionPerfil = obtenerConfiguracionPerfil({
      plantilla,
      perfil: zona.perfil,
      esEspecial: zona.esEspecial,
    });
    const permitidos = resolverPermitidosZona({
      configuracion,
      configuracionPerfil,
    });
    if (permitidos.length === 0) continue;

    const multiplicadorContenido =
      configuracionPerfil?.multiplicadorContenido ?? 1;
    const cantidadCalculada = Math.round(
      zona.cantidadCasillasCandidatas *
        (configuracion.densidadPor100Casillas / 100) *
        multiplicadorContenido,
    );
    const objetivoZona =
      configuracion.densidadPor100Casillas > 0 &&
      zona.cantidadCasillasCandidatas > 0 &&
      multiplicadorContenido > 0
        ? Math.max(1, cantidadCalculada)
        : 0;
    cantidadObjetivo += objetivoZona;

    let colocadosZona = 0;
    for (const posicion of aleatorio.mezclar([...zona.posicionesDisponibles])) {
      if (colocadosZona >= objetivoZona) break;

      const permitido = seleccionarPonderado(permitidos, aleatorio);
      const datos = resolverDatosDestructible({
        permitido,
        configuracion,
        configuracionObjetos,
      });
      if (!puedeConsumirPresupuesto(zona, datos.costoPoblacion)) continue;

      const resultado = intentarColocarDestructible({
        permitido,
        datos,
        posicion,
        zona,
        plantilla,
        nivelMapa,
        posicionJugador,
        clavesCaminables,
        posicionesBloqueadasPersistentes,
        objetivos,
        interactuables,
        configuracionObjetos,
        configuracionEntidadesMazmorra,
        aleatorio,
      });
      if (!resultado) continue;

      retirarPosicionDisponible(zona, posicion);
      destructibles.push(resultado.entidad);
      colocadosZona += 1;
      detalle.push(
        crearDetalleDestructible({
          entidad: resultado.entidad,
          permitido,
          posicion,
          zona,
          numero: destructibles.length,
          costoPoblacion: datos.costoPoblacion,
        }),
      );
    }
  }

  return finalizarResultadoDestructibles({
    plantilla,
    configuracion,
    destructibles,
    detalle,
    cantidadObjetivo,
  });
}

function resolverDatosDestructible({ permitido, configuracion, configuracionObjetos }) {
  const tablaContenido = resolverTablaConfigurada({
    configuracion,
    idTabla: permitido.idTablaContenido,
  });
  const tablaBotin = resolverTablaConfigurada({
    configuracion,
    idTabla: permitido.idTablaBotin,
  });
  return {
    tablaContenido,
    tablaBotin,
    costoPoblacion: calcularCostoDestructiblePoblacion({
      tablaBotin: [...(tablaContenido ?? []), ...(tablaBotin ?? [])],
      configuracionObjetos,
    }),
  };
}

function intentarColocarDestructible({
  permitido,
  datos,
  posicion,
  zona,
  plantilla,
  nivelMapa,
  posicionJugador,
  clavesCaminables,
  posicionesBloqueadasPersistentes,
  objetivos,
  interactuables,
  configuracionObjetos,
  configuracionEntidadesMazmorra,
  aleatorio,
}) {
  const clave = crearClave(posicion);
  if (posicionesBloqueadasPersistentes.has(clave)) return null;
  posicionesBloqueadasPersistentes.add(clave);

  const mantieneConectividad = comprobarConectividad({
    clavesCaminables,
    posicionesBloqueadas: posicionesBloqueadasPersistentes,
    posicionInicial: posicionJugador,
  });
  const tieneAcceso = tieneCasillaAdyacenteDisponible({
    posicion,
    clavesCaminables,
    posicionesBloqueadas: posicionesBloqueadasPersistentes,
  });

  if (!mantieneConectividad || !tieneAcceso) {
    posicionesBloqueadasPersistentes.delete(clave);
    return null;
  }

  const resultado = incorporarEntidadMazmorra({
    id: permitido.id,
    x: posicion.x,
    y: posicion.y,
    nivel: nivelMapa,
    tablaContenido: datos.tablaContenido,
    tablaBotin: datos.tablaBotin,
    configuracionObjetos,
    configuracionEntidadesMazmorra,
    aleatorio,
    objetivos,
    interactuables,
  });

  if (
    !consumirPresupuesto({
      zona,
      costo: datos.costoPoblacion,
      origen: `destructible:${permitido.id}`,
    })
  ) {
    throw new Error(
      `La habitación "${zona.idHabitacion}" perdió disponibilidad de ` +
        `presupuesto durante la colocación de "${permitido.id}" en ` +
        `"${plantilla.nombre}".`,
    );
  }

  return resultado;
}

function crearDetalleDestructible({
  entidad,
  permitido,
  posicion,
  zona,
  numero,
  costoPoblacion,
}) {
  return {
    numero,
    tipo: permitido.id,
    familia: entidad.familiaEntidad ?? null,
    nombre: entidad.nombre,
    x: posicion.x,
    y: posicion.y,
    idHabitacion: zona.idHabitacion,
    perfil: zona.perfil,
    zonaEspecial: zona.esEspecial === true,
    cantidadContenido:
      entidad.contenedorObjetos?.obtenerObjetos?.().length ?? 0,
    costoPoblacion: resumirCosto(costoPoblacion),
  };
}

function finalizarResultadoDestructibles({
  plantilla,
  configuracion,
  destructibles,
  detalle,
  cantidadObjetivo,
}) {
  const cantidadNoColocada = Math.max(0, cantidadObjetivo - destructibles.length);
  if (cantidadNoColocada > 0) {
    console.warn(
      `[Mapa] "${plantilla.nombre}" colocó ${destructibles.length} de ` +
        `${cantidadObjetivo} destructibles tras aplicar presupuesto, restricciones y conectividad.`,
    );
  }

  return {
    destructibles,
    detalle,
    densidadPor100Casillas: configuracion.densidadPor100Casillas,
    cantidadObjetivo,
    cantidadNoColocada,
  };
}

export function crearResumenInteractuablesProcedurales({
  resultadoPrevio,
  resultadoDestructibles,
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
    cantidadDestructibles: resultadoDestructibles.destructibles.length,
    cantidadDestructiblesObjetivo: resultadoDestructibles.cantidadObjetivo,
    cantidadDestructiblesNoColocados:
      resultadoDestructibles.cantidadNoColocada,
    densidadDestructiblesPor100Casillas:
      resultadoDestructibles.densidadPor100Casillas,
  };
}

function retirarPosicionDisponible(zona, posicion) {
  const indice = zona.posicionesDisponibles.findIndex(
    (candidata) => candidata.x === posicion.x && candidata.y === posicion.y,
  );
  if (indice >= 0) zona.posicionesDisponibles.splice(indice, 1);
}

function obtenerConfiguracionPerfil({ plantilla, perfil, esEspecial }) {
  const perfiles = plantilla.poblacion.perfilesHabitacion;
  if (!perfiles || !perfil) return null;
  if (esEspecial) {
    return perfiles.especial?.id === perfil ? perfiles.especial : null;
  }
  return perfiles.normales?.find((candidato) => candidato.id === perfil) ?? null;
}

function resolverPermitidosZona({ configuracion, configuracionPerfil }) {
  const basePorId = new Map(
    configuracion.permitidos.map((permitido) => [permitido.id, permitido]),
  );
  if (!configuracionPerfil?.permitidos) {
    return configuracion.permitidos.map((permitido) => ({ ...permitido }));
  }

  return configuracionPerfil.permitidos.map((permitidoPerfil) => ({
    ...basePorId.get(permitidoPerfil.id),
    ...permitidoPerfil,
  }));
}

function resolverTablaConfigurada({ configuracion, idTabla }) {
  if (!idTabla) return null;
  const tabla = configuracion.tablasBotin?.[idTabla];
  if (!Array.isArray(tabla)) {
    throw new Error(`La tabla de botín "${idTabla}" no está configurada.`);
  }
  return tabla;
}

function tieneCasillaAdyacenteDisponible({
  posicion,
  clavesCaminables,
  posicionesBloqueadas,
}) {
  return DIRECCIONES_ADYACENTES.some((direccion) => {
    const clave = crearClave({
      x: posicion.x + direccion.x,
      y: posicion.y + direccion.y,
    });
    return clavesCaminables.has(clave) && !posicionesBloqueadas.has(clave);
  });
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
  const geometria = analizarAccesoHabitacion({ punto, habitacion });

  return geometria?.ejeLimite === "vertical"
    ? ORIENTACIONES_PUERTA.VERTICAL
    : ORIENTACIONES_PUERTA.HORIZONTAL;
}
function esUmbralPuertaValido({ punto, habitacion, celdas }) {
  if (celdas?.[punto.y]?.[punto.x] !== ".") {
    return false;
  }

  const geometria = analizarAccesoHabitacion({ punto, habitacion });
  if (!geometria) {
    return false;
  }

  return (
    contieneCasillaHabitacion(habitacion, geometria.haciaHabitacion) &&
    celdas?.[geometria.haciaHabitacion.y]?.[geometria.haciaHabitacion.x] === "." &&
    celdas?.[geometria.haciaExterior.y]?.[geometria.haciaExterior.x] === "." &&
    celdas?.[geometria.lateralA.y]?.[geometria.lateralA.x] !== "." &&
    celdas?.[geometria.lateralB.y]?.[geometria.lateralB.x] !== "."
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
  const costoPoblacion = calcularCostoCofrePoblacion({
    tablaBotin: configuracion.tablaBotin,
    configuracionObjetos,
  });

  if (!puedeConsumirPresupuesto(zona, costoPoblacion)) {
    if (obligatorio) {
      throw new Error(
        `La habitación "${zona.idHabitacion}" no tiene presupuesto suficiente para el cofre ${tipo} obligatorio.`,
      );
    }
    return null;
  }

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

  if (
    !consumirPresupuesto({
      zona,
      costo: costoPoblacion,
      origen: tipo === "importante" ? "cofre_importante" : "cofre_moderado",
    })
  ) {
    throw new Error(
      `La habitación "${zona.idHabitacion}" perdió disponibilidad de presupuesto durante la colocación de un cofre.`,
    );
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
    costoPoblacion: resumirCosto(costoPoblacion),
  };
}
function resumirCosto(costo) {
  return {
    ocupacion: costo.ocupacion,
    amenaza: costo.amenaza,
    valorRecompensa: costo.valorRecompensa,
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
