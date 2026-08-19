import { incorporarEntidadMazmorra } from "../fabricas/FabricaEntidadesMazmorra.js";
import { obtenerEntidadMazmorraConfigurada } from "../configuracion/ValidadorConfiguracionEntidadesMazmorra.js";
import { ORIENTACIONES_PUERTA } from "../../entidad/interactuable/Puerta.js";
import {
  analizarAccesoHabitacion,
  contieneCasillaHabitacion,
} from "./PlanoMazmorra.js";
import {
  calcularCostoCofrePoblacion,
  calcularCostoDestructiblePoblacion,
  calcularCostoPoblacion,
  consumirPresupuesto,
  puedeConsumirPresupuesto,
} from "./PlanificadorPoblacionMazmorra.js";
import { crearClave, seleccionarPonderado } from "./UtilidadesPoblacionMazmorra.js";
import { crearGeneradorAleatorio } from "./GeneradorAleatorio.js";
import { crearCandidatosComposicionHabitacion } from "./AplicadorComposicionesHabitacion.js";

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

  const diferirCofresModerados = Boolean(plantilla.habitaciones?.perfiles);
  if (!diferirCofresModerados) {
    detalleCofresModerados.push(
      ...generarCofresModeradosEnZonas({
        zonas: contextoPoblacion.zonasNormales,
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
      }),
    );
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
export function generarCofresModeradosPosteriores({
  plantilla,
  terreno,
  posicionJugador,
  nivelMapa,
  contextoPoblacion,
  objetivos,
  interactuables,
  configuracionObjetos,
  aleatorio,
  resultadoPrevio,
} = {}) {
  if (!resultadoPrevio || !Array.isArray(resultadoPrevio.cofresModerados)) {
    throw new Error(
      "Se necesita el resultado de interactuables estructurales para agregar cofres moderados.",
    );
  }
  const clavesCaminables = new Set(
    terreno.casillasTransitables.map((posicion) => crearClave(posicion)),
  );
  const nuevos = generarCofresModeradosEnZonas({
    zonas: contextoPoblacion.zonasNormales,
    configuracion: plantilla.interactuables.cofres.moderados,
    nivelMapa,
    objetivos,
    interactuables,
    configuracionObjetos,
    aleatorio,
    clavesCaminables,
    posicionesBloqueadasPersistentes:
      resultadoPrevio.posicionesBloqueadasPersistentes,
    posicionesReservadasAcceso: resultadoPrevio.posicionesReservadasAcceso,
    posicionJugador,
  });
  resultadoPrevio.cofresModerados.push(...nuevos);
  return resultadoPrevio;
}

export function generarDestructiblesProcedurales(parametros = {}) {
  const plantilla = parametros.plantilla;
  if (!plantilla || typeof plantilla !== "object") {
    throw new Error("La población de destructibles necesita una plantilla válida.");
  }
  if (!plantilla.habitaciones?.perfiles) {
    throw new Error(
      `La mazmorra "${plantilla.nombre ?? "sin nombre"}" debe utilizar el contrato canónico de cupos y composiciones.`,
    );
  }

  return generarDestructiblesPorComposiciones(parametros);
}

// Materializa una composición humana completa por habitación. La geometría
// sigue siendo procedural y el presupuesto canónico limita ocupación, amenaza
// y recompensa antes de que se incorporen cofres opcionales y enemigos.
function generarDestructiblesPorComposiciones({
  plantilla,
  terreno,
  posicionJugador,
  nivelMapa,
  contextoPoblacion,
  posicionesBloqueadasPersistentes,
  posicionesReservadasAcceso = new Set(),
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
  const habitacionesPorId = new Map(
    (terreno.habitaciones ?? []).map((habitacion) => [habitacion.id, habitacion]),
  );
  const destructibles = [];
  const detalle = [];

  for (const zona of contextoPoblacion.zonas) {
    const configuracionPerfil = obtenerPerfilDirigido({
      plantilla,
      zona,
    });
    if (!configuracionPerfil) continue;

    const habitacion = habitacionesPorId.get(zona.idHabitacion);
    if (!habitacion) {
      throw new Error(
        `No existe la geometría de la habitación "${zona.idHabitacion}" para aplicar su composición.`,
      );
    }

    const aleatorioComposicion = crearGeneradorAleatorio(
      `${aleatorio.semilla}:${plantilla.bioma ?? plantilla.nombre}:composicion:${zona.idHabitacion}`,
    );
    const posicionesNoDisponibles = new Set([
      ...posicionesBloqueadasPersistentes,
      ...posicionesReservadasAcceso,
    ]);
    const candidatos = crearCandidatosComposicionHabitacion({
      habitacion,
      composiciones: configuracionPerfil.composiciones,
      celdas: terreno.celdas,
      posicionesNoDisponibles,
      aleatorio: aleatorioComposicion,
    });

    let seleccion = null;
    for (const candidato of candidatos) {
      const obligatorios = candidato.obligatorios.map((elemento) => {
        const permitido = resolverPermitidoPorId(configuracion, elemento.id);
        const datos = resolverDatosDestructible({
          permitido,
          configuracion,
          configuracionObjetos,
          configuracionEntidadesMazmorra,
          nivelMapa,
        });
        return { ...elemento, permitido, datos };
      });
      const costoConjunto = calcularCostoPoblacion(
        obligatorios.map(({ datos }, indice) => ({
          tipo: `composicion_obligatoria_${indice + 1}`,
          ...datos.costoPoblacion,
        })),
      );
      if (!puedeConsumirPresupuesto(zona, costoConjunto)) continue;
      if (
        !composicionMantieneConectividad({
          obligatorios,
          configuracionEntidadesMazmorra,
          clavesCaminables,
          posicionesBloqueadasPersistentes,
          posicionJugador,
        })
      ) {
        continue;
      }
      seleccion = { ...candidato, obligatorios };
      break;
    }

    if (!seleccion) {
      throw new Error(
        `La habitación "${zona.idHabitacion}" con perfil "${zona.perfil}" no admite ninguna composición completa válida en "${plantilla.nombre}".`,
      );
    }

    zona.composicion = seleccion.idComposicion;
    zona.orientacionComposicion = seleccion.orientacion;
    zona.origenComposicion = { ...seleccion.origen };

    for (const elemento of seleccion.obligatorios) {
      const resultado = intentarColocarDestructible({
        permitido: elemento.permitido,
        datos: elemento.datos,
        posicion: elemento.posicion,
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
        aleatorio: aleatorioComposicion,
      });
      if (!resultado) {
        throw new Error(
          `La composición "${seleccion.idComposicion}" dejó de ser válida al materializar "${elemento.permitido.id}".`,
        );
      }
      retirarPosicionDisponible(zona, elemento.posicion);
      destructibles.push(resultado.entidad);
      detalle.push(
        crearDetalleDestructible({
          entidad: resultado.entidad,
          permitido: elemento.permitido,
          posicion: elemento.posicion,
          zona,
          numero: destructibles.length,
          costoPoblacion: elemento.datos.costoPoblacion,
          composicion: seleccion.idComposicion,
          obligatorioComposicion: true,
        }),
      );
    }

    for (const slot of aleatorioComposicion.mezclar([...seleccion.opcionales])) {
      const configuracionOpcional = slot.configuracion;
      if (
        !configuracionOpcional ||
        aleatorioComposicion.siguiente() * 100 >= configuracionOpcional.probabilidad
      ) {
        continue;
      }
      const opcion = seleccionarPonderado(
        configuracionOpcional.permitidos,
        aleatorioComposicion,
      );
      const permitido = resolverPermitidoPorId(configuracion, opcion.id);
      const datos = resolverDatosDestructible({
        permitido,
        configuracion,
        configuracionObjetos,
        configuracionEntidadesMazmorra,
        nivelMapa,
      });
      if (!puedeConsumirPresupuesto(zona, datos.costoPoblacion)) continue;

      const resultado = intentarColocarDestructible({
        permitido,
        datos,
        posicion: slot.posicion,
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
        aleatorio: aleatorioComposicion,
      });
      if (!resultado) continue;

      retirarPosicionDisponible(zona, slot.posicion);
      destructibles.push(resultado.entidad);
      detalle.push(
        crearDetalleDestructible({
          entidad: resultado.entidad,
          permitido,
          posicion: slot.posicion,
          zona,
          numero: destructibles.length,
          costoPoblacion: datos.costoPoblacion,
          composicion: seleccion.idComposicion,
          obligatorioComposicion: false,
        }),
      );
    }
  }

  return {
    destructibles,
    detalle,
  };
}

function obtenerPerfilDirigido({ plantilla, zona }) {
  const habitaciones = plantilla.habitaciones;
  if (zona.esAmbiental) return habitaciones.perfilAmbiental ?? null;
  if (zona.esEspecial) return habitaciones.perfilEspecial ?? null;
  return (
    habitaciones.perfiles?.normales?.find(
      (perfil) => perfil.id === zona.perfil,
    ) ?? null
  );
}

function resolverPermitidoPorId(configuracion, id) {
  const permitido = configuracion.permitidos.find((entrada) => entrada.id === id);
  if (!permitido) {
    throw new Error(`La entidad "${id}" no está permitida por el mapa.`);
  }
  return permitido;
}

function composicionMantieneConectividad({
  obligatorios,
  configuracionEntidadesMazmorra,
  clavesCaminables,
  posicionesBloqueadasPersistentes,
  posicionJugador,
}) {
  const bloqueos = new Set(posicionesBloqueadasPersistentes);
  for (const elemento of obligatorios) {
    const definicion = obtenerEntidadMazmorraConfigurada(
      configuracionEntidadesMazmorra,
      elemento.id,
    );
    if (definicion.bloqueaMovimiento) {
      bloqueos.add(crearClave(elemento.posicion));
    }
  }

  if (
    !comprobarConectividad({
      clavesCaminables,
      posicionesBloqueadas: bloqueos,
      posicionInicial: posicionJugador,
    })
  ) {
    return false;
  }

  return obligatorios.every((elemento) =>
    tieneCasillaAdyacenteDisponible({
      posicion: elemento.posicion,
      clavesCaminables,
      posicionesBloqueadas: bloqueos,
    }),
  );
}

function resolverDatosDestructible({
  permitido,
  configuracion,
  configuracionObjetos,
  configuracionEntidadesMazmorra,
  nivelMapa,
}) {
  const solicitudContenido = resolverSolicitudConfigurada({
    configuracion,
    idSolicitud: permitido.idSolicitudContenido,
  });
  const definicion = obtenerEntidadMazmorraConfigurada(
    configuracionEntidadesMazmorra,
    permitido.id,
  );
  const solicitudDestruccion = definicion.solicitudBotinDestruccion ?? null;

  return {
    solicitudContenido,
    solicitudDestruccion,
    costoPoblacion: calcularCostoDestructiblePoblacion({
      solicitudesBotin: [solicitudContenido, solicitudDestruccion],
      configuracionObjetos,
      nivel: nivelMapa,
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
    solicitudContenido: datos.solicitudContenido,
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
  composicion = null,
  obligatorioComposicion = null,
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
    composicion,
    obligatorioComposicion,
    zonaEspecial: zona.esEspecial === true,
    cantidadContenido:
      entidad.contenedorObjetos?.obtenerObjetos?.().length ?? 0,
    costoPoblacion: resumirCosto(costoPoblacion),
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
  };
}

function retirarPosicionDisponible(zona, posicion) {
  const indice = zona.posicionesDisponibles.findIndex(
    (candidata) => candidata.x === posicion.x && candidata.y === posicion.y,
  );
  if (indice >= 0) zona.posicionesDisponibles.splice(indice, 1);
}

function resolverSolicitudConfigurada({ configuracion, idSolicitud }) {
  if (!idSolicitud) return null;
  const solicitud = configuracion.solicitudesBotin?.[idSolicitud];
  if (
    solicitud === null ||
    typeof solicitud !== "object" ||
    Array.isArray(solicitud)
  ) {
    throw new Error(`La solicitud de botín "${idSolicitud}" no está configurada.`);
  }
  return solicitud;
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

function generarCofresModeradosEnZonas({
  zonas,
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
  const detalle = [];
  for (const zona of aleatorio.mezclar([...zonas])) {
    const tirada = aleatorio.siguiente() * 100;
    if (tirada >= configuracion.probabilidadPorHabitacion) continue;

    const resultado = generarCofreEnZona({
      zona,
      tipo: "moderado",
      obligatorio: false,
      nombre: "Cofre",
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
    });
    if (resultado) detalle.push({ ...resultado, tirada });
  }
  return detalle;
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
    solicitudBotin: configuracion.solicitudBotin,
    configuracionObjetos,
    nivel: nivelMapa,
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
    solicitudBotin: configuracion.solicitudBotin,
    configuracionObjetos,
    aleatorio,
    objetivos,
    interactuables,
  });

  const contenidoDiferido =
    resultado.entidad?.contenidoMaterializado === false &&
    resultado.entidad?.solicitudContenidoBotin !== null;
  const cantidadObjetos = resultado.resultadoBotin?.objetosGenerados?.length ?? 0;

  // Los cofres conservan su solicitud canónica y materializan el contenido
  // recién al abrirse o destruirse. El cálculo de costo realizado antes de
  // colocarlos ya valida que la solicitud tenga candidatos para el nivel del
  // mapa, por lo que un resultadoBotin nulo aquí representa contenido pendiente
  // y no un cofre inválidamente vacío.
  if (!contenidoDiferido && cantidadObjetos === 0) {
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
    contenidoPendiente: contenidoDiferido,
    cantidadPilas: resultado.resultadoBotin?.cantidadPilas ?? null,
    cantidadUnidades: resultado.resultadoBotin?.cantidadUnidades ?? null,
    botin: resultado.resultadoBotin?.resumen ?? [],
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
