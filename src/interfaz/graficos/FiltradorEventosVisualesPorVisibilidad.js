import { TIPOS_EVENTO_VISUAL } from "./PlanificadorEventosVisuales.js";
import { TIPOS_ENTIDAD_VISUAL } from "./TiposEscena.js";

const TRANSICIONES_VISIBILIDAD = Object.freeze({
  ENTRADA: "entrada",
  SALIDA: "salida",
});

// Filtra exclusivamente presentación. No consulta Juego, no calcula FOV y no
// modifica eventos canónicos. La escena neutral ya contiene la decisión de
// visibilidad tomada por SistemaVisibilidadJugador.
export function filtrarEventosVisualesPorVisibilidad({
  eventosVisuales = [],
  escenaAnterior = null,
  escenaFinal = null,
} = {}) {
  if (!Array.isArray(eventosVisuales)) {
    throw new Error("El filtrado visual necesita una lista de eventos.");
  }

  const contexto = crearContextoVisibilidad({ escenaAnterior, escenaFinal });
  const conservados = [];
  let descartados = 0;
  let transicionesEntrada = 0;
  let transicionesSalida = 0;
  let impactosOcultosDescartados = 0;

  for (const evento of eventosVisuales) {
    const resultado = filtrarEvento(evento, contexto);
    if (!resultado) {
      descartados += 1;
      continue;
    }

    const eventosResultado = Array.isArray(resultado.eventos)
      ? resultado.eventos
      : [resultado.evento ?? resultado];

    conservados.push(...eventosResultado.filter(Boolean));
    descartados += resultado.descartados ?? 0;
    impactosOcultosDescartados += resultado.impactosOcultosDescartados ?? 0;
    transicionesEntrada += resultado.transicionesEntrada ?? 0;
    transicionesSalida += resultado.transicionesSalida ?? 0;
  }

  return Object.freeze({
    eventosVisuales: Object.freeze(conservados),
    diagnostico: Object.freeze({
      eventosVisualesGenerados: eventosVisuales.length,
      eventosVisualesConservados: conservados.length,
      eventosVisualesDescartados: descartados,
      impactosOcultosDescartados,
      transicionesEntrada,
      transicionesSalida,
      enemigosVisiblesAntes: contarEnemigosVisibles(escenaAnterior),
      enemigosVisiblesDespues: contarEnemigosVisibles(escenaFinal),
    }),
  });
}

function filtrarEvento(evento, contexto) {
  if (!evento || typeof evento !== "object") return null;

  switch (evento.tipo) {
    case TIPOS_EVENTO_VISUAL.MOVIMIENTO_ENTIDAD:
      return filtrarMovimiento(evento, contexto);

    case TIPOS_EVENTO_VISUAL.ATAQUE_RESUELTO:
      return filtrarAtaque(evento, contexto);

    case TIPOS_EVENTO_VISUAL.HABILIDAD_RESUELTA:
      return filtrarHabilidad(evento, contexto);

    case TIPOS_EVENTO_VISUAL.CAMBIO_HOSTILIDAD:
      return filtrarPorEntidad(evento, evento.idEntidad, contexto);

    case TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_APLICADO:
    case TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_ACTUALIZADO:
    case TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_NO_APLICADO:
    case TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_TICK:
    case TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_RETIRADO:
    case TIPOS_EVENTO_VISUAL.DANIO_PERIODICO:
    case TIPOS_EVENTO_VISUAL.RECURSOS_RECUPERADOS:
      return filtrarPorObjetivo(evento, contexto);

    case TIPOS_EVENTO_VISUAL.ENTIDAD_DERROTADA:
      return filtrarPorEntidad(evento, evento.idEntidad, contexto);

    case TIPOS_EVENTO_VISUAL.ACTOR_ENTRO_ZONA_TEMPORAL:
      return filtrarPorEntidad(evento, evento.idActor, contexto);

    case TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_ACTIVADA:
      return filtrarActivacionZona(evento, contexto);

    default:
      // Botín, zonas, recursos del jugador y el resto de presentaciones no se
      // ocultan por FOV según el contrato funcional de E0.3.
      return Object.freeze({ evento });
  }
}

function filtrarMovimiento(evento, contexto) {
  if (!esMovimientoOcultable(evento, contexto)) {
    return Object.freeze({ evento });
  }

  // Para un movimiento, la frontera correcta se obtiene comparando las dos
  // escenas neutrales: la anterior representa qué podía ver el jugador antes
  // de resolver la acción y la final qué puede ver después. Usar solo el FOV
  // final podría clasificar mal una salida cuando también se movió el jugador.
  const origenVisible = contexto.entidadesAnteriores.has(evento.idEntidad);
  const destinoVisible = contexto.entidadesFinales.has(evento.idEntidad);

  if (!origenVisible && !destinoVisible) {
    return null;
  }

  if (origenVisible && destinoVisible) {
    return Object.freeze({ evento });
  }

  if (origenVisible && !destinoVisible) {
    return Object.freeze({
      evento: Object.freeze({
        ...evento,
        transicionVisibilidad: TRANSICIONES_VISIBILIDAD.SALIDA,
      }),
      transicionesSalida: 1,
    });
  }

  const entidadFinal = contexto.entidadesFinales.get(evento.idEntidad) ?? null;
  if (!entidadFinal) {
    // No inventamos una entidad visual cuando el estado final tampoco la
    // expone. La lógica canónica ya ocurrió; solo se omite su presentación.
    return null;
  }

  return Object.freeze({
    evento: Object.freeze({
      ...evento,
      transicionVisibilidad: TRANSICIONES_VISIBILIDAD.ENTRADA,
      entidadFinal: Object.freeze({ ...entidadFinal }),
    }),
    transicionesEntrada: 1,
  });
}

function filtrarAtaque(evento, contexto) {
  const atacanteVisible = esEntidadRepresentada(
    contexto,
    evento.idAtacante,
    evento.origenAtacante,
  );
  const objetivoVisible = evento.idObjetivo
    ? esEntidadRepresentada(
        contexto,
        evento.idObjetivo,
        evento.posicionObjetivo,
      )
    : true;

  if (!atacanteVisible && !objetivoVisible) {
    return null;
  }

  if (!atacanteVisible && objetivoVisible) {
    return Object.freeze({
      evento: Object.freeze({
        ...evento,
        // La consecuencia visible se conserva, pero Phaser no recibe una
        // posición desde la que pueda revelar al atacante oculto.
        presentacionOrigenOculto: true,
        esAtaqueEnemigo: true,
        origenAtacante: null,
      }),
    });
  }

  return Object.freeze({ evento });
}

function filtrarHabilidad(evento, contexto) {
  const botinesPreservados = [];
  let impactosOcultosDescartados = 0;
  const impactos = [];

  for (const impacto of evento.impactos ?? []) {
    if (esObjetivoOculto(impacto, contexto)) {
      impactosOcultosDescartados += 1;
      if (impacto?.botinVisual) botinesPreservados.push(impacto.botinVisual);
      continue;
    }
    impactos.push(impacto);
  }

  const actorVisible = esEntidadRepresentada(
    contexto,
    evento.idActor,
    evento.origenActor,
  );
  const conservaRepresentacionPropia = Boolean(
    evento.zonaTemporal ||
      (Array.isArray(evento.casillasAfectadas) && evento.casillasAfectadas.length > 0) ||
      (Array.isArray(evento.recorrido) && evento.recorrido.length > 0),
  );

  if (!actorVisible && impactos.length === 0 && !conservaRepresentacionPropia) {
    return botinesPreservados.length > 0
      ? Object.freeze({
          eventos: Object.freeze(botinesPreservados),
          descartados: 1,
          impactosOcultosDescartados,
        })
      : null;
  }

  const habilidadFiltrada = impactos.length === (evento.impactos ?? []).length
    ? evento
    : Object.freeze({
        ...evento,
        impactos: Object.freeze(impactos),
        idObjetivoPrimario:
          impactos.some((impacto) => impacto.idObjetivo === evento.idObjetivoPrimario)
            ? evento.idObjetivoPrimario
            : null,
        posicionObjetivoPrimario:
          impactos.some((impacto) => impacto.idObjetivo === evento.idObjetivoPrimario)
            ? evento.posicionObjetivoPrimario
            : null,
      });

  return Object.freeze({
    eventos: Object.freeze([habilidadFiltrada, ...botinesPreservados]),
    impactosOcultosDescartados,
  });
}

function filtrarActivacionZona(evento, contexto) {
  if (!esObjetivoOculto(evento.impacto ?? evento, contexto)) {
    return Object.freeze({ evento });
  }

  const botin = evento?.impacto?.botinVisual ?? null;
  return botin
    ? Object.freeze({
        eventos: Object.freeze([botin]),
        descartados: 1,
        impactosOcultosDescartados: 1,
      })
    : null;
}

function filtrarPorObjetivo(evento, contexto) {
  return esObjetivoOculto(evento, contexto)
    ? null
    : Object.freeze({ evento });
}

function filtrarPorEntidad(evento, idEntidad, contexto) {
  if (!idEntidad) return Object.freeze({ evento });
  if (!esEntidadOcultablePorId(contexto, idEntidad, evento.tipoEntidad)) {
    return Object.freeze({ evento });
  }

  const posicion =
    evento.posicion ?? evento.posicionObjetivo ?? evento.destino ?? null;
  return esEntidadRepresentada(contexto, idEntidad, posicion)
    ? Object.freeze({ evento })
    : null;
}

function esObjetivoOculto(evento, contexto) {
  const idObjetivo = evento?.idObjetivo ?? null;
  if (!idObjetivo) return false;
  if (!esEntidadOcultablePorId(contexto, idObjetivo, evento?.tipoObjetivo)) {
    return false;
  }
  return !esEntidadRepresentada(
    contexto,
    idObjetivo,
    evento?.posicionObjetivo ?? null,
  );
}

function esMovimientoOcultable(evento, contexto) {
  if (evento.tipoEntidad === TIPOS_ENTIDAD_VISUAL.JUGADOR) return false;
  if (evento.tipoEntidad === TIPOS_ENTIDAD_VISUAL.DESTRUCTIBLE) return false;

  const entidadAntes = contexto.entidadesAnteriores.get(evento.idEntidad) ?? null;
  const entidadDespues = contexto.entidadesFinales.get(evento.idEntidad) ?? null;
  if (entidadAntes?.ocultablePorFov || entidadDespues?.ocultablePorFov) {
    return true;
  }

  if (evento.tipoEntidad === TIPOS_ENTIDAD_VISUAL.ENEMIGO) return true;

  // Los únicos actores móviles omitidos de ambas escenas por E0.3 son
  // enemigos fuera del campo visible.
  return !entidadAntes && !entidadDespues;
}

function esEntidadRepresentada(contexto, idEntidad, posicion = null) {
  if (!idEntidad) return false;
  if (contexto.casillasVisibles && esPosicion(posicion)) {
    return esCasillaVisible(contexto, posicion);
  }
  return contexto.entidadesFinales.has(idEntidad);
}

function esEntidadOcultablePorId(contexto, idEntidad, tipoDeclarado = null) {
  if (tipoDeclarado === TIPOS_ENTIDAD_VISUAL.ENEMIGO) return true;
  if (
    tipoDeclarado === TIPOS_ENTIDAD_VISUAL.JUGADOR ||
    tipoDeclarado === TIPOS_ENTIDAD_VISUAL.DESTRUCTIBLE
  ) {
    return false;
  }
  const entidad =
    contexto.entidadesFinales.get(idEntidad) ??
    contexto.entidadesAnteriores.get(idEntidad) ??
    null;
  if (entidad) return entidad.ocultablePorFov === true;

  // Si la escena neutral omite la entidad en ambos extremos, E0.3 la ha
  // ocultado por FOV (enemigos/NPC). Las entidades no ocultables permanecen
  // siempre en la escena aunque la casilla no sea visible.
  return true;
}

function esPosicion(posicion) {
  return Number.isInteger(posicion?.x) && Number.isInteger(posicion?.y);
}

function crearContextoVisibilidad({ escenaAnterior, escenaFinal }) {
  return Object.freeze({
    entidadesAnteriores: indexarEntidades(escenaAnterior),
    entidadesFinales: indexarEntidades(escenaFinal),
    casillasVisibles: crearSetCasillasVisibles(escenaFinal),
  });
}

function indexarEntidades(escena) {
  const resultado = new Map();
  for (const entidad of escena?.entidades ?? []) {
    if (typeof entidad?.idVisual === "string" && entidad.idVisual !== "") {
      resultado.set(entidad.idVisual, entidad);
    }
  }
  return resultado;
}

function crearSetCasillasVisibles(escena) {
  const visibilidad = escena?.mapa?.visibilidad;
  if (visibilidad?.campoVisible !== true) return null;
  return new Set(
    (visibilidad.casillasVisibles ?? []).map(({ x, y }) => `${x},${y}`),
  );
}

function esCasillaVisible(contexto, posicion) {
  if (!contexto.casillasVisibles) return true;
  if (!Number.isInteger(posicion?.x) || !Number.isInteger(posicion?.y)) {
    return false;
  }
  return contexto.casillasVisibles.has(`${posicion.x},${posicion.y}`);
}

function contarEnemigosVisibles(escena) {
  return (escena?.entidades ?? []).filter(
    (entidad) => entidad?.tipo === TIPOS_ENTIDAD_VISUAL.ENEMIGO,
  ).length;
}
