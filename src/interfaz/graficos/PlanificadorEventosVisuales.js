import {
  TIPOS_EVENTO_ACCION,
} from "../../juego/acciones/EventosAccion.js";
import { obtenerIdVisualEntidad } from "./AdaptadorEscenaJuego.js";
import { obtenerPerfilHabilidadVisual } from "./ContextoPerfilesHabilidadesVisuales.js";
import {
  obtenerPerfilZonaTemporalVisual,
} from "./ContextoPerfilesZonasTemporalesVisuales.js";
import {
  obtenerFeedbackEfectoNoAplicado,
  obtenerPerfilEstadoTemporalVisual,
} from "./ContextoPerfilesEstadosTemporalesVisuales.js";
import {
  crearPlanRitmoVisualAtaque,
  crearPlanRitmoVisualConsumo,
  crearPlanRitmoVisualHabilidad,
  crearPlanRitmoVisualMovimiento,
} from "./PlanificadorRitmoVisual.js";
import {
  ESTADOS_HOSTILIDAD_VISUAL,
  TIPOS_ENTIDAD_VISUAL,
} from "./TiposEscena.js";

const TIPOS_EVENTO_EFECTO_CORRELACIONABLE = new Set([
  "efecto_aplicado",
  "efecto_renovado",
  "efecto_intensificado",
  "efecto_acumulado",
  "efecto_resistido",
  "efecto_inmune",
  "efecto_rechazado",
  "efecto_retirado",
]);

export const TIPOS_EVENTO_VISUAL = Object.freeze({
  MOVIMIENTO_ENTIDAD: "movimiento_entidad",
  ATAQUE_RESUELTO: "ataque_resuelto",
  HABILIDAD_RESUELTA: "habilidad_resuelta",
  CAMBIO_HOSTILIDAD: "cambio_hostilidad",
  DANIO_PERIODICO: "danio_periodico",
  ENTIDAD_DERROTADA: "entidad_derrotada",
  RECURSOS_RECUPERADOS: "recursos_recuperados",
  NIVEL_AUMENTADO: "nivel_aumentado",
  BOTIN_APARECIDO: "botin_aparecido",
  EFECTO_TEMPORAL_APLICADO: "efecto_temporal_aplicado",
  EFECTO_TEMPORAL_ACTUALIZADO: "efecto_temporal_actualizado",
  EFECTO_TEMPORAL_NO_APLICADO: "efecto_temporal_no_aplicado",
  EFECTO_TEMPORAL_TICK: "efecto_temporal_tick",
  EFECTO_TEMPORAL_RETIRADO: "efecto_temporal_retirado",
  ZONA_TEMPORAL_CREADA: "zona_temporal_creada",
  ZONA_TEMPORAL_RENOVADA: "zona_temporal_renovada",
  ZONA_TEMPORAL_VENCIDA: "zona_temporal_vencida",
  ZONA_TEMPORAL_PULSO: "zona_temporal_pulso",
  ACTOR_ENTRO_ZONA_TEMPORAL: "actor_entro_zona_temporal",
  ZONA_TEMPORAL_ACTIVADA: "zona_temporal_activada",
});

// Convierte referencias del dominio en un plan neutral basado en IDs visuales.
// Phaser no recibe Combatiente, Player ni Enemigo y no necesita reconstruir
// hechos a partir de mensajes de texto.
export function crearPlanEventosVisuales({
  eventos = [],
  escenaAnterior = null,
  escenaFinal = null,
} = {}) {
  if (!Array.isArray(eventos)) {
    throw new Error("El plan visual necesita una lista de eventos.");
  }

  const entidadesPorId = combinarEntidadesEscenas(escenaAnterior, escenaFinal);
  const plan = [];
  const indicesConsumidos = new Set();

  for (let indice = 0; indice < eventos.length; indice += 1) {
    if (indicesConsumidos.has(indice)) continue;
    const evento = eventos[indice];
    if (!evento || typeof evento !== "object") {
      continue;
    }

    switch (evento.tipo) {
      case TIPOS_EVENTO_ACCION.ENTIDAD_MOVIDA:
        agregarMovimiento(plan, evento, entidadesPorId);
        break;

      case TIPOS_EVENTO_ACCION.ATAQUE_RESUELTO:
        agregarAtaque(plan, evento, entidadesPorId, {
          eventos,
          indiceActual: indice,
          indicesConsumidos,
        });
        break;

      case TIPOS_EVENTO_ACCION.HABILIDAD_RESUELTA:
        agregarHabilidad(plan, evento, entidadesPorId, {
          eventos,
          indiceActual: indice,
          indicesConsumidos,
        });
        break;

      case TIPOS_EVENTO_ACCION.HOSTILIDAD_CAMBIADA:
        agregarCambioHostilidad(plan, evento, entidadesPorId);
        break;

      case TIPOS_EVENTO_ACCION.RECURSOS_RECUPERADOS:
        agregarRecursosRecuperados(plan, evento, entidadesPorId);
        break;

      case TIPOS_EVENTO_ACCION.NIVEL_AUMENTADO:
        agregarNivelAumentado(plan, evento, entidadesPorId);
        break;

      case TIPOS_EVENTO_ACCION.BOTIN_GENERADO:
        agregarBotinGenerado(plan, evento, entidadesPorId);
        break;

      case "efecto_aplicado":
        agregarEfectoTemporalAplicado(plan, evento, entidadesPorId);
        break;

      case "efecto_renovado":
      case "efecto_intensificado":
      case "efecto_acumulado":
        agregarEfectoTemporalActualizado(plan, evento, entidadesPorId);
        break;

      case "efecto_resistido":
      case "efecto_inmune":
      case "efecto_rechazado":
        agregarEfectoTemporalNoAplicado(plan, evento, entidadesPorId);
        break;

      case "efecto_vencido":
      case "efecto_retirado":
        agregarEfectoTemporalRetirado(plan, evento, entidadesPorId);
        break;

      case "efecto_tick":
        agregarEfectoTemporalTick(plan, evento, entidadesPorId);
        break;

      case "danio_periodico_aplicado":
        agregarDanioPeriodico(plan, evento, entidadesPorId);
        break;

      case "combatiente_derrotado": {
        agregarEntidadDerrotada(plan, evento.objetivo, entidadesPorId, {
          motivo: "efecto_periodico",
        });
        const botinVisual = extraerBotinVisualDerrota({
          objetivo: evento.objetivo,
          entidadesPorId,
          eventos,
          indiceActual: indice,
          indicesConsumidos,
        });
        if (botinVisual) plan.push(botinVisual);
        break;
      }

      case "zona_temporal_creada":
        agregarZonaTemporal(plan, evento, TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_CREADA);
        break;

      case "zona_temporal_renovada":
        agregarZonaTemporal(plan, evento, TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_RENOVADA);
        break;

      case "zona_temporal_vencida":
        agregarZonaTemporal(plan, evento, TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_VENCIDA);
        break;

      case "zona_temporal_pulso":
        agregarPulsoZonaTemporal(plan, evento);
        break;

      case "actor_entro_zona_temporal":
        agregarEntradaZonaTemporal(plan, evento, entidadesPorId);
        break;

      case "zona_temporal_activada":
        agregarActivacionZonaTemporal(plan, evento, entidadesPorId, {
          eventos,
          indiceActual: indice,
          indicesConsumidos,
        });
        break;

      default:
        break;
    }
  }

  return Object.freeze(plan);
}

function agregarMovimiento(plan, evento, entidadesPorId) {
  const idEntidad = obtenerIdSeguro(evento.entidad);
  const entidadVisual = entidadesPorId.get(idEntidad) ?? null;

  if (!idEntidad || !esPosicion(evento.origen) || !esPosicion(evento.destino)) {
    return;
  }

  plan.push(
    Object.freeze({
      tipo: TIPOS_EVENTO_VISUAL.MOVIMIENTO_ENTIDAD,
      idEntidad,
      tipoEntidad: entidadVisual?.tipo ?? null,
      origen: copiarPosicion(evento.origen),
      destino: copiarPosicion(evento.destino),
      ejecucionTemporal: evento.ejecucionTemporal ?? null,
      ritmoVisual: crearPlanRitmoVisualMovimiento({
        ejecucionTemporal: evento.ejecucionTemporal,
      }),
    }),
  );
}

function agregarAtaque(plan, evento, entidadesPorId, contexto = {}) {
  const idAtacante = obtenerIdSeguro(evento.atacante);
  const idObjetivo = obtenerIdSeguro(evento.objetivo);
  const atacanteVisual = entidadesPorId.get(idAtacante) ?? null;
  const objetivoVisual = entidadesPorId.get(idObjetivo) ?? null;

  if (!idAtacante || !evento.resultado) {
    return;
  }

  const ritmoVisual = crearPlanRitmoVisualAtaque({
    configuracionAtaque: evento.configuracionAtaque,
    ejecucionTemporal: evento.ejecucionTemporal,
  });

  plan.push(
    Object.freeze({
      tipo: TIPOS_EVENTO_VISUAL.ATAQUE_RESUELTO,
      idAtacante,
      idObjetivo,
      tipoAtacante: atacanteVisual?.tipo ?? null,
      tipoObjetivo: objetivoVisual?.tipo ?? null,
      esAtaqueEnemigo:
        atacanteVisual?.tipo === TIPOS_ENTIDAD_VISUAL.ENEMIGO,
      origenAtacante: esPosicion(evento.origenAtacante)
        ? copiarPosicion(evento.origenAtacante)
        : null,
      posicionObjetivo: esPosicion(evento.posicionObjetivo)
        ? copiarPosicion(evento.posicionObjetivo)
        : null,
      configuracionAtaque: evento.configuracionAtaque ?? null,
      ejecucionTemporal: evento.ejecucionTemporal ?? null,
      ritmoVisual,
      estadoObjetivoFinal: evento.estadoObjetivoFinal ?? null,
      resultado: evento.resultado,
    }),
  );

  if (evento.resultado.objetivoDestruido === true && idObjetivo) {
    agregarEntidadDerrotada(plan, evento.objetivo, entidadesPorId, {
      motivo: "ataque_directo",
    });
    const botinVisual = extraerBotinVisualDerrota({
      objetivo: evento.objetivo,
      entidadesPorId,
      eventos: contexto.eventos ?? [],
      indiceActual: contexto.indiceActual ?? -1,
      indicesConsumidos: contexto.indicesConsumidos ?? new Set(),
    });
    if (botinVisual) plan.push(botinVisual);
  }
}

function agregarHabilidad(plan, evento, entidadesPorId, contexto = {}) {
  const idActor = obtenerIdSeguro(evento.actor);
  const actorVisual = entidadesPorId.get(idActor) ?? null;
  const idHabilidad = evento.habilidad?.id;
  if (!idActor || typeof idHabilidad !== "string") {
    return;
  }

  const perfilVisual = obtenerPerfilHabilidadVisual(idHabilidad);
  const zonaTemporalVisual = normalizarZonaTemporalVisual(evento.zonaTemporal);
  const ritmoVisual = crearPlanRitmoVisualHabilidad({
    perfilVisual,
    ejecucionTemporal: evento.ejecucionTemporal,
  });
  const eventosCorrelacionados = correlacionarEventosEfectosHabilidad({
    eventoHabilidad: evento,
    entidadesPorId,
    eventos: contexto.eventos ?? [],
    indiceActual: contexto.indiceActual ?? -1,
    indicesConsumidos: contexto.indicesConsumidos ?? new Set(),
  });
  const impactos = Object.freeze(
    (evento.impactos ?? []).map((impacto) => {
      const idObjetivo = obtenerIdSeguro(impacto.objetivo);
      const objetivoVisual = entidadesPorId.get(idObjetivo) ?? null;
      return Object.freeze({
        idEjecucion: normalizarTextoSimple(impacto.idEjecucion),
        idObjetivo,
        tipoObjetivo: objetivoVisual?.tipo ?? null,
        posicionObjetivo: esPosicion(impacto.posicionObjetivo)
          ? copiarPosicion(impacto.posicionObjetivo)
          : objetivoVisual && esPosicion(objetivoVisual)
            ? copiarPosicion(objetivoVisual)
            : null,
        orden: Number.isInteger(impacto.orden) ? impacto.orden : 0,
        multiplicadorDanio: Number.isFinite(impacto.multiplicadorDanio)
          ? impacto.multiplicadorDanio
          : 1,
        impacto: impacto.impacto === true,
        critico: impacto.critico === true,
        objetivoDerrotado: impacto.objetivoDerrotado === true,
        derrotaVisual:
          impacto.objetivoDerrotado === true && idObjetivo
            ? Object.freeze({
                tipo: TIPOS_EVENTO_VISUAL.ENTIDAD_DERROTADA,
                idEntidad: idObjetivo,
                tipoEntidad: objetivoVisual?.tipo ?? null,
                posicion: esPosicion(impacto.posicionObjetivo)
                  ? copiarPosicion(impacto.posicionObjetivo)
                  : objetivoVisual && esPosicion(objetivoVisual)
                    ? copiarPosicion(objetivoVisual)
                    : null,
                motivo: "habilidad_directa",
              })
            : null,
        botinVisual:
          impacto.objetivoDerrotado === true
            ? extraerBotinVisualDerrota({
                objetivo: impacto.objetivo,
                entidadesPorId,
                eventos: contexto.eventos ?? [],
                indiceActual: contexto.indiceActual ?? -1,
                indicesConsumidos: contexto.indicesConsumidos ?? new Set(),
              })
            : null,
        danio: impacto.danio ?? null,
        efectos: impacto.efectos ?? Object.freeze([]),
        recursosObjetivo: impacto.recursosObjetivo ?? Object.freeze([]),
        eventosEfectos: Object.freeze(
          [...(eventosCorrelacionados.get(idObjetivo) ?? [])],
        ),
      });
    }),
  );

  const idObjetivoPrimario = obtenerIdSeguro(evento.objetivoPrimario);
  const objetivoPrimarioVisual = entidadesPorId.get(idObjetivoPrimario) ?? null;

  plan.push(Object.freeze({
    tipo: TIPOS_EVENTO_VISUAL.HABILIDAD_RESUELTA,
    idActor,
    tipoActor: actorVisual?.tipo ?? null,
    tipoActorCanonico: evento.tipoActor ?? null,
    origenActor: esPosicion(evento.origenActor)
      ? copiarPosicion(evento.origenActor)
      : actorVisual && esPosicion(actorVisual)
        ? copiarPosicion(actorVisual)
        : null,
    posicionObjetivo: esPosicion(evento.posicionObjetivo)
      ? copiarPosicion(evento.posicionObjetivo)
      : impactos[0]?.posicionObjetivo ?? null,
    idObjetivoPrimario,
    posicionObjetivoPrimario: esPosicion(evento.posicionObjetivoPrimario)
      ? copiarPosicion(evento.posicionObjetivoPrimario)
      : objetivoPrimarioVisual && esPosicion(objetivoPrimarioVisual)
        ? copiarPosicion(objetivoPrimarioVisual)
        : null,
    habilidad: evento.habilidad,
    casillasAfectadas: evento.casillasAfectadas ?? Object.freeze([]),
    recorrido: evento.recorrido ?? Object.freeze([]),
    impactos,
    recursosActor: evento.recursosActor ?? Object.freeze([]),
    zonaTemporal: zonaTemporalVisual,
    perfilVisual,
    idEjecucion: evento.idEjecucion ?? null,
    ejecucionTemporal: evento.ejecucionTemporal ?? null,
    ritmoVisual,
  }));

}

function agregarZonaTemporal(plan, evento, tipoVisual) {
  const zona = normalizarZonaTemporalVisual(evento?.zona);
  if (!zona) return;
  plan.push(Object.freeze({
    tipo: tipoVisual,
    zona,
    instante: Number.isFinite(evento.instante) ? evento.instante : null,
  }));
}

function agregarPulsoZonaTemporal(plan, evento) {
  const zona = normalizarZonaTemporalVisual(evento?.zona);
  if (!zona) return;
  plan.push(Object.freeze({
    tipo: TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_PULSO,
    zona,
    motivo: normalizarTextoSimple(evento.motivo) ?? "por_intervalo",
    instante: Number.isFinite(evento.instante) ? evento.instante : null,
    cantidadObjetivos: Number.isInteger(evento.cantidadObjetivos)
      ? Math.max(0, evento.cantidadObjetivos)
      : 0,
  }));
}

function agregarEntradaZonaTemporal(plan, evento, entidadesPorId) {
  const zona = normalizarZonaTemporalVisual(evento?.zona);
  const idActor = obtenerIdSeguro(evento.actor);
  const actorVisual = entidadesPorId.get(idActor) ?? null;
  if (!zona || !idActor) return;
  plan.push(Object.freeze({
    tipo: TIPOS_EVENTO_VISUAL.ACTOR_ENTRO_ZONA_TEMPORAL,
    zona,
    idActor,
    tipoActor: actorVisual?.tipo ?? null,
    origen: esPosicion(evento.origen) ? copiarPosicion(evento.origen) : null,
    destino: esPosicion(evento.destino)
      ? copiarPosicion(evento.destino)
      : actorVisual && esPosicion(actorVisual)
        ? copiarPosicion(actorVisual)
        : null,
    instante: Number.isFinite(evento.instante) ? evento.instante : null,
  }));
}

function agregarActivacionZonaTemporal(
  plan,
  evento,
  entidadesPorId,
  contexto = {},
) {
  const zona = normalizarZonaTemporalVisual(evento?.zona);
  const idObjetivo = obtenerIdSeguro(evento.objetivo);
  const objetivoVisual = entidadesPorId.get(idObjetivo) ?? null;
  const posicionObjetivo = esPosicion(evento.posicionObjetivo)
    ? copiarPosicion(evento.posicionObjetivo)
    : objetivoVisual && esPosicion(objetivoVisual)
      ? copiarPosicion(objetivoVisual)
      : null;
  const idEjecucion = normalizarTextoSimple(evento.idEjecucion);
  if (!zona || !idObjetivo || !posicionObjetivo || !idEjecucion) return;

  const eventosEfectos = correlacionarEventosEfectosEjecucion({
    idEjecucion,
    entidadesPorId,
    eventos: contexto.eventos ?? [],
    indiceActual: contexto.indiceActual ?? -1,
    indicesConsumidos: contexto.indicesConsumidos ?? new Set(),
  });

  const derrotaVisual = evento.objetivoDerrotado === true
    ? Object.freeze({
        tipo: TIPOS_EVENTO_VISUAL.ENTIDAD_DERROTADA,
        idEntidad: idObjetivo,
        tipoEntidad: objetivoVisual?.tipo ?? null,
        posicion: posicionObjetivo,
        motivo: "zona_temporal",
      })
    : null;
  const botinVisual = evento.objetivoDerrotado === true
    ? extraerBotinVisualDerrota({
        objetivo: evento.objetivo,
        entidadesPorId,
        eventos: contexto.eventos ?? [],
        indiceActual: contexto.indiceActual ?? -1,
        indicesConsumidos: contexto.indicesConsumidos ?? new Set(),
      })
    : null;

  plan.push(Object.freeze({
    tipo: TIPOS_EVENTO_VISUAL.ZONA_TEMPORAL_ACTIVADA,
    zona,
    idEjecucion,
    motivo: normalizarTextoSimple(evento.motivo) ?? "desconocido",
    instante: Number.isFinite(evento.instante) ? evento.instante : null,
    idObjetivo,
    tipoObjetivo: objetivoVisual?.tipo ?? null,
    posicionObjetivo,
    impacto: Object.freeze({
      idEjecucion,
      idObjetivo,
      tipoObjetivo: objetivoVisual?.tipo ?? null,
      posicionObjetivo,
      orden: 0,
      multiplicadorDanio: 1,
      impacto: evento.impacto === true,
      critico: evento.critico === true,
      objetivoDerrotado: evento.objetivoDerrotado === true,
      derrotaVisual,
      botinVisual,
      danio: normalizarDanioZona(evento.danio, evento.resolucionImpacto),
      efectos: Object.freeze(Array.isArray(evento.efectos) ? evento.efectos : []),
      recursosObjetivo: Object.freeze([]),
      eventosEfectos: Object.freeze(eventosEfectos),
    }),
  }));
}

function correlacionarEventosEfectosEjecucion({
  idEjecucion,
  entidadesPorId,
  eventos = [],
  indiceActual = -1,
  indicesConsumidos = new Set(),
} = {}) {
  const resultado = [];
  for (let indice = indiceActual + 1; indice < eventos.length; indice += 1) {
    if (indicesConsumidos.has(indice)) continue;
    const candidato = eventos[indice];
    if (!candidato || typeof candidato !== "object") continue;
    if (!TIPOS_EVENTO_EFECTO_CORRELACIONABLE.has(candidato.tipo)) continue;
    if (obtenerIdEjecucionAsociada(candidato) !== idEjecucion) continue;
    const visual = crearEventoVisualEfectoTemporal({
      evento: candidato,
      entidadesPorId,
    });
    if (!visual) continue;
    indicesConsumidos.add(indice);
    resultado.push(visual);
  }
  return resultado;
}

function normalizarDanioZona(danio, resolucionImpacto) {
  const fuente = danio ?? resolucionImpacto ?? {};
  return Object.freeze({
    cantidad: normalizarNumeroNoNegativo(
      fuente.danio ?? fuente.danioFinal ?? 0,
    ),
    vidaObjetivoAntes: normalizarNumeroOpcional(fuente.vidaObjetivoAntes),
    vidaObjetivoDespues: normalizarNumeroOpcional(fuente.vidaObjetivoDespues),
    vidaObjetivoMaxima: normalizarNumeroOpcional(fuente.vidaObjetivoMaxima),
    componentes: Object.freeze(
      Array.isArray(fuente.componentesDanio)
        ? fuente.componentesDanio.map((item) => Object.freeze({ ...item }))
        : Array.isArray(fuente.componentes)
          ? fuente.componentes.map((item) => Object.freeze({ ...item }))
          : [],
    ),
  });
}

function normalizarZonaTemporalVisual(zona) {
  if (
    !zona ||
    typeof zona.id !== "string" ||
    zona.id.trim() === "" ||
    !Array.isArray(zona.casillas)
  ) {
    return null;
  }
  const apariencia = normalizarTextoSimple(zona.apariencia) ?? "generica";
  const casillas = zona.casillas
    .filter(esPosicion)
    .map(copiarPosicion);
  if (casillas.length === 0) return null;

  return Object.freeze({
    id: zona.id.trim(),
    idHabilidad: normalizarTextoSimple(zona.idHabilidad),
    nombre: normalizarTextoSimple(zona.nombre) ?? "Zona temporal",
    grado: Number.isInteger(zona.grado) ? zona.grado : 1,
    apariencia,
    grupoSuperposicion: normalizarTextoSimple(zona.grupoSuperposicion),
    politicaSuperposicion: normalizarTextoSimple(zona.politicaSuperposicion),
    activadores: Object.freeze(
      Array.isArray(zona.activadores)
        ? zona.activadores.filter((item) => typeof item === "string")
        : [],
    ),
    creadaEn: Number.isFinite(zona.creadaEn) ? zona.creadaEn : null,
    venceEn: Number.isFinite(zona.venceEn) ? zona.venceEn : null,
    duracion: Number.isFinite(zona.duracion) ? zona.duracion : null,
    proximaActivacionEn: Number.isFinite(zona.proximaActivacion)
      ? zona.proximaActivacion
      : null,
    casillas: Object.freeze(casillas),
    perfilVisual: obtenerPerfilZonaTemporalVisual(apariencia),
  });
}

function agregarEfectoTemporalAplicado(plan, evento, entidadesPorId) {
  const visual = crearEventoVisualEfectoTemporal({ evento, entidadesPorId });
  if (visual) plan.push(visual);
}

function agregarEfectoTemporalActualizado(plan, evento, entidadesPorId) {
  const visual = crearEventoVisualEfectoTemporal({ evento, entidadesPorId });
  if (visual) plan.push(visual);
}

function agregarEfectoTemporalNoAplicado(plan, evento, entidadesPorId) {
  const visual = crearEventoVisualEfectoTemporal({ evento, entidadesPorId });
  if (visual) plan.push(visual);
}

function agregarEfectoTemporalTick(plan, evento, entidadesPorId) {
  const visual = crearEventoVisualEfectoTemporal({ evento, entidadesPorId });
  if (visual) plan.push(visual);
}

function agregarEfectoTemporalRetirado(plan, evento, entidadesPorId) {
  const visual = crearEventoVisualEfectoTemporal({ evento, entidadesPorId });
  if (visual) plan.push(visual);
}

function correlacionarEventosEfectosHabilidad({
  eventoHabilidad,
  entidadesPorId,
  eventos = [],
  indiceActual = -1,
  indicesConsumidos = new Set(),
} = {}) {
  const idsEjecucion = new Set(
    [
      eventoHabilidad?.idEjecucion,
      ...(eventoHabilidad?.impactos ?? []).map((impacto) => impacto?.idEjecucion),
    ]
      .map(normalizarTextoSimple)
      .filter(Boolean),
  );
  const correlacionados = new Map();
  if (idsEjecucion.size === 0 || !Array.isArray(eventos)) {
    return correlacionados;
  }

  const zonaId = normalizarTextoSimple(eventoHabilidad?.zonaTemporal?.id);

  for (let indice = indiceActual + 1; indice < eventos.length; indice += 1) {
    if (indicesConsumidos.has(indice)) continue;
    const candidato = eventos[indice];
    if (!candidato || typeof candidato !== "object") continue;

    if (
      candidato.tipo === "zona_temporal_activada" &&
      candidato.motivo === "al_crear" &&
      idsEjecucion.has(normalizarTextoSimple(candidato.idEjecucion)) &&
      (!zonaId || candidato.zonaId === zonaId)
    ) {
      indicesConsumidos.add(indice);
      continue;
    }

    if (!TIPOS_EVENTO_EFECTO_CORRELACIONABLE.has(candidato.tipo)) continue;
    if (!idsEjecucion.has(obtenerIdEjecucionAsociada(candidato))) continue;

    const visual = crearEventoVisualEfectoTemporal({
      evento: candidato,
      entidadesPorId,
    });
    if (!visual?.idObjetivo) continue;

    indicesConsumidos.add(indice);
    const lista = correlacionados.get(visual.idObjetivo) ?? [];
    lista.push(visual);
    correlacionados.set(visual.idObjetivo, lista);
  }

  return correlacionados;
}

function crearEventoVisualEfectoTemporal({ evento, entidadesPorId } = {}) {
  if (evento?.tipo === "efecto_rechazado" && evento.motivo !== "duplicado") {
    return null;
  }

  const normalizado = normalizarEventoEfectoTemporal(evento, entidadesPorId);
  if (!normalizado) return null;

  if (evento.tipo === "efecto_aplicado") {
    return Object.freeze({
      tipo: TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_APLICADO,
      ...normalizado,
      operacion: "aplicado",
    });
  }

  if (["efecto_renovado", "efecto_intensificado", "efecto_acumulado"].includes(evento.tipo)) {
    return Object.freeze({
      tipo: TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_ACTUALIZADO,
      ...normalizado,
      operacion: evento.tipo.replace("efecto_", ""),
      alcanzoMaximo: evento.alcanzoMaximo === true,
    });
  }

  if (["efecto_resistido", "efecto_inmune", "efecto_rechazado"].includes(evento.tipo)) {
    const motivo = resolverMotivoNoAplicado(evento);
    return Object.freeze({
      tipo: TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_NO_APLICADO,
      ...normalizado,
      operacion: "no_aplicado",
      motivo,
      feedback: obtenerFeedbackEfectoNoAplicado(motivo),
      resistencia: Number.isFinite(evento.resistencia) ? evento.resistencia : null,
      probabilidadFinal: Number.isFinite(evento.probabilidadFinal)
        ? evento.probabilidadFinal
        : null,
    });
  }

  if (evento.tipo === "efecto_tick") {
    return Object.freeze({
      tipo: TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_TICK,
      ...normalizado,
      operacion: "tick",
      instante: Number.isFinite(evento.instante) ? evento.instante : null,
    });
  }

  if (["efecto_vencido", "efecto_retirado"].includes(evento.tipo)) {
    return Object.freeze({
      tipo: TIPOS_EVENTO_VISUAL.EFECTO_TEMPORAL_RETIRADO,
      ...normalizado,
      operacion: evento.tipo === "efecto_vencido" ? "vencido" : "retirado",
      motivo: evento.motivo ?? (evento.tipo === "efecto_vencido" ? "vencimiento" : null),
    });
  }

  return null;
}

function obtenerIdEjecucionAsociada(evento) {
  const directo = normalizarTextoSimple(evento?.idEjecucion);
  if (directo) return directo;
  const fuente = normalizarTextoSimple(evento?.definicion?.fuente?.id ?? evento?.fuente?.id);
  if (fuente) return fuente;
  const etiquetas = [
    ...(Array.isArray(evento?.definicion?.etiquetas) ? evento.definicion.etiquetas : []),
    ...(Array.isArray(evento?.etiquetas) ? evento.etiquetas : []),
  ];
  for (const etiqueta of etiquetas) {
    if (typeof etiqueta !== "string") continue;
    if (etiqueta.startsWith("ejecucion:")) {
      return normalizarTextoSimple(etiqueta.slice("ejecucion:".length));
    }
  }
  return null;
}

function normalizarTextoSimple(valor) {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio === "" ? null : limpio;
}

function normalizarEventoEfectoTemporal(evento, entidadesPorId) {
  const definicion = evento.definicion ?? null;
  const objetivo = evento.objetivo ?? definicion?.objetivo ?? null;
  const idObjetivo = obtenerIdSeguro(objetivo);
  const objetivoVisual = entidadesPorId.get(idObjetivo) ?? null;
  const catalogoEfectoId =
    evento.catalogoEfectoId ?? definicion?.efectoId ?? null;

  if (!idObjetivo || typeof catalogoEfectoId !== "string") return null;

  return Object.freeze({
    idObjetivo,
    tipoObjetivo: objetivoVisual?.tipo ?? null,
    posicionObjetivo: esPosicion(objetivo)
      ? copiarPosicion(objetivo)
      : objetivoVisual && esPosicion(objetivoVisual)
        ? copiarPosicion(objetivoVisual)
        : null,
    efecto: Object.freeze({
      id: evento.catalogoEfectoId ? evento.efectoId ?? null : null,
      catalogoEfectoId,
      nombre: evento.nombreEfecto ?? definicion?.nombreEfecto ?? catalogoEfectoId,
      tipo: evento.tipoEfecto ?? definicion?.tipo ?? null,
      perfilAplicacion:
        evento.perfilAplicacion ?? definicion?.perfilAplicacion ?? null,
      intensidad: Number.isFinite(evento.intensidad)
        ? evento.intensidad
        : Number.isFinite(definicion?.intensidadInicial)
          ? definicion.intensidadInicial
          : 1,
      cantidad: Number.isFinite(evento.cantidad) ? evento.cantidad : 1,
      maximo: Number.isFinite(evento.maximo)
        ? evento.maximo
        : Number.isFinite(definicion?.maximo)
          ? definicion.maximo
          : 1,
      aplicadoEn: Number.isFinite(evento.aplicadoEn) ? evento.aplicadoEn : null,
      venceEn: Number.isFinite(evento.venceEn) ? evento.venceEn : null,
      proximoTick: Number.isFinite(evento.proximoTick) ? evento.proximoTick : null,
      beneficioso: evento.beneficioso === true || definicion?.beneficioso === true,
      perfilVisual: obtenerPerfilEstadoTemporalVisual(catalogoEfectoId),
    }),
  });
}

function resolverMotivoNoAplicado(evento) {
  if (evento.tipo === "efecto_resistido") return "resistencia";
  if (evento.tipo === "efecto_inmune") return "inmunidad";
  if (evento.motivo === "duplicado") return "duplicado";
  return "duplicado";
}

function agregarDanioPeriodico(plan, evento, entidadesPorId) {
  const idObjetivo = obtenerIdSeguro(evento.objetivo);
  const objetivoVisual = entidadesPorId.get(idObjetivo) ?? null;
  const danio = normalizarNumeroNoNegativo(evento.danio);
  const vidaAntes = normalizarNumeroNoNegativo(evento.vidaAntes);
  const vidaDespues = normalizarNumeroNoNegativo(evento.vidaDespues);
  const vidaMaxima = normalizarNumeroPositivo(evento.vidaMaxima);

  if (!idObjetivo || danio <= 0) {
    return;
  }

  plan.push(
    Object.freeze({
      tipo: TIPOS_EVENTO_VISUAL.DANIO_PERIODICO,
      idObjetivo,
      tipoObjetivo: objetivoVisual?.tipo ?? null,
      posicionObjetivo: objetivoVisual && esPosicion(objetivoVisual)
        ? copiarPosicion(objetivoVisual)
        : null,
      danio,
      vidaAntes,
      vidaDespues,
      vidaMaxima,
      idDefinicion: evento.idDefinicion ?? null,
      nombreEfecto: evento.nombreEfecto ?? null,
    }),
  );
}

function agregarEntidadDerrotada(
  plan,
  entidad,
  entidadesPorId,
  { motivo = null } = {},
) {
  const idEntidad = obtenerIdSeguro(entidad);
  const entidadVisual = entidadesPorId.get(idEntidad) ?? null;

  if (!idEntidad) {
    return;
  }

  const ultimo = plan.at(-1);
  if (
    ultimo?.tipo === TIPOS_EVENTO_VISUAL.ENTIDAD_DERROTADA &&
    ultimo.idEntidad === idEntidad
  ) {
    return;
  }

  plan.push(
    Object.freeze({
      tipo: TIPOS_EVENTO_VISUAL.ENTIDAD_DERROTADA,
      idEntidad,
      tipoEntidad: entidadVisual?.tipo ?? null,
      posicion: esPosicion(entidad)
        ? copiarPosicion(entidad)
        : entidadVisual && esPosicion(entidadVisual)
          ? copiarPosicion(entidadVisual)
          : null,
      motivo,
    }),
  );
}

function agregarBotinGenerado(plan, evento, entidadesPorId) {
  const visual = crearEventoVisualBotin(evento, entidadesPorId);
  if (visual) plan.push(visual);
}

function extraerBotinVisualDerrota({
  objetivo,
  entidadesPorId,
  eventos = [],
  indiceActual = -1,
  indicesConsumidos = new Set(),
} = {}) {
  if (!objetivo) return null;

  for (let indice = indiceActual + 1; indice < eventos.length; indice += 1) {
    if (indicesConsumidos.has(indice)) continue;
    const candidato = eventos[indice];
    if (
      candidato?.tipo !== TIPOS_EVENTO_ACCION.BOTIN_GENERADO ||
      candidato.fuente !== objetivo
    ) {
      continue;
    }

    const visual = crearEventoVisualBotin(candidato, entidadesPorId);
    if (!visual) continue;
    indicesConsumidos.add(indice);
    return visual;
  }

  return null;
}

function crearEventoVisualBotin(evento, entidadesPorId) {
  const idFuente = obtenerIdSeguro(evento?.fuente);
  const idBotin = obtenerIdSeguro(evento?.botin);
  const idBotinAnterior = obtenerIdSeguro(evento?.botinAnterior);
  const entidadBotin = entidadesPorId.get(idBotin) ?? null;
  if (!idBotin || !entidadBotin || !esPosicion(entidadBotin)) return null;

  return Object.freeze({
    tipo: TIPOS_EVENTO_VISUAL.BOTIN_APARECIDO,
    idFuente,
    idBotin,
    idBotinAnterior,
    posicion: copiarPosicion(entidadBotin),
    entidadBotin: Object.freeze({ ...entidadBotin }),
    botinCreado: evento.botinCreado === true,
    botinActualizado: evento.botinActualizado === true,
    cantidadUnidades: normalizarNumeroNoNegativo(evento.cantidadUnidades),
    resumenTexto: normalizarTextoSimple(evento.resumenTexto),
  });
}

function agregarRecursosRecuperados(plan, evento, entidadesPorId) {
  const idObjetivo = obtenerIdSeguro(evento.objetivo);
  const objetivoVisual = entidadesPorId.get(idObjetivo) ?? null;
  if (!idObjetivo || !Array.isArray(evento.recursos) || evento.recursos.length === 0) {
    return;
  }

  plan.push(Object.freeze({
    tipo: TIPOS_EVENTO_VISUAL.RECURSOS_RECUPERADOS,
    idObjetivo,
    tipoObjetivo: objetivoVisual?.tipo ?? null,
    posicionObjetivo: esPosicion(objetivo)
      ? copiarPosicion(objetivo)
      : objetivoVisual && esPosicion(objetivoVisual)
        ? copiarPosicion(objetivoVisual)
        : null,
    origen: evento.origen ?? "desconocido",
    fuente: evento.fuente ?? null,
    recursos: Object.freeze(evento.recursos.map((recurso) => Object.freeze({ ...recurso }))),
    ejecucionTemporal: evento.ejecucionTemporal ?? null,
    ritmoVisual: crearPlanRitmoVisualConsumo({
      ejecucionTemporal: evento.ejecucionTemporal,
    }),
  }));
}

function agregarNivelAumentado(plan, evento, entidadesPorId) {
  const idJugador = obtenerIdSeguro(evento.jugador);
  const jugadorVisual = entidadesPorId.get(idJugador) ?? null;
  if (!idJugador || !Number.isInteger(evento.nivelActual)) return;

  plan.push(Object.freeze({
    tipo: TIPOS_EVENTO_VISUAL.NIVEL_AUMENTADO,
    idJugador,
    tipoEntidad: jugadorVisual?.tipo ?? null,
    posicion: jugadorVisual && esPosicion(jugadorVisual)
      ? copiarPosicion(jugadorVisual)
      : null,
    nivelAnterior: evento.nivelAnterior,
    nivelActual: evento.nivelActual,
    nivelesGanados: evento.nivelesGanados,
  }));
}

function agregarCambioHostilidad(plan, evento, entidadesPorId) {
  const idEntidad = obtenerIdSeguro(evento.enemigo);
  const entidadVisual = entidadesPorId.get(idEntidad) ?? null;
  const estadosValidos = Object.values(ESTADOS_HOSTILIDAD_VISUAL);

  if (
    !idEntidad ||
    entidadVisual?.tipo !== TIPOS_ENTIDAD_VISUAL.ENEMIGO ||
    !estadosValidos.includes(evento.estadoAnterior) ||
    !estadosValidos.includes(evento.estadoActual)
  ) {
    return;
  }

  plan.push(
    Object.freeze({
      tipo: TIPOS_EVENTO_VISUAL.CAMBIO_HOSTILIDAD,
      idEntidad,
      estadoAnterior: evento.estadoAnterior,
      estadoActual: evento.estadoActual,
      motivo: evento.motivo ?? null,
      posicion: esPosicion(evento.enemigo)
        ? copiarPosicion(evento.enemigo)
        : entidadVisual && esPosicion(entidadVisual)
          ? copiarPosicion(entidadVisual)
          : null,
      ejecucionTemporal: evento.ejecucionTemporal ?? null,
    }),
  );
}

function combinarEntidadesEscenas(...escenas) {
  const entidades = new Map();

  for (const escena of escenas) {
    for (const entidad of escena?.entidades ?? []) {
      if (typeof entidad?.idVisual === "string" && entidad.idVisual !== "") {
        entidades.set(entidad.idVisual, entidad);
      }
    }
  }

  return entidades;
}

function obtenerIdSeguro(entidad) {
  return entidad && typeof entidad === "object"
    ? obtenerIdVisualEntidad(entidad)
    : null;
}

function normalizarNumeroNoNegativo(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.max(0, numero) : 0;
}

function normalizarNumeroPositivo(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

function normalizarNumeroOpcional(valor) {
  if (valor === null || valor === undefined) return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function esPosicion(posicion) {
  return Number.isInteger(posicion?.x) && Number.isInteger(posicion?.y);
}

function copiarPosicion(posicion) {
  return Object.freeze({ x: posicion.x, y: posicion.y });
}
