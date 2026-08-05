import {
  TIPOS_EVENTO_ACCION,
} from "../../juego/acciones/EventosAccion.js";
import { obtenerIdVisualEntidad } from "./AdaptadorEscenaJuego.js";
import { obtenerPerfilHabilidadVisual } from "./ContextoPerfilesHabilidadesVisuales.js";
import {
  crearPlanRitmoVisualAtaque,
  crearPlanRitmoVisualConsumo,
  crearPlanRitmoVisualHabilidad,
} from "./PlanificadorRitmoVisual.js";
import {
  ESTADOS_HOSTILIDAD_VISUAL,
  TIPOS_ENTIDAD_VISUAL,
} from "./TiposEscena.js";

export const TIPOS_EVENTO_VISUAL = Object.freeze({
  MOVIMIENTO_ENTIDAD: "movimiento_entidad",
  ATAQUE_RESUELTO: "ataque_resuelto",
  HABILIDAD_RESUELTA: "habilidad_resuelta",
  CAMBIO_HOSTILIDAD: "cambio_hostilidad",
  DANIO_PERIODICO: "danio_periodico",
  ENTIDAD_DERROTADA: "entidad_derrotada",
  RECURSOS_RECUPERADOS: "recursos_recuperados",
  NIVEL_AUMENTADO: "nivel_aumentado",
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

  for (const evento of eventos) {
    if (!evento || typeof evento !== "object") {
      continue;
    }

    switch (evento.tipo) {
      case TIPOS_EVENTO_ACCION.ENTIDAD_MOVIDA:
        agregarMovimiento(plan, evento, entidadesPorId);
        break;

      case TIPOS_EVENTO_ACCION.ATAQUE_RESUELTO:
        agregarAtaque(plan, evento, entidadesPorId);
        break;

      case TIPOS_EVENTO_ACCION.HABILIDAD_RESUELTA:
        agregarHabilidad(plan, evento, entidadesPorId);
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

      case "danio_periodico_aplicado":
        agregarDanioPeriodico(plan, evento, entidadesPorId);
        break;

      case "combatiente_derrotado":
        agregarEntidadDerrotada(plan, evento.objetivo, entidadesPorId, {
          motivo: "efecto_periodico",
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
    }),
  );
}

function agregarAtaque(plan, evento, entidadesPorId) {
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
  }
}

function agregarHabilidad(plan, evento, entidadesPorId) {
  const idActor = obtenerIdSeguro(evento.actor);
  const actorVisual = entidadesPorId.get(idActor) ?? null;
  const idHabilidad = evento.habilidad?.id;
  if (!idActor || typeof idHabilidad !== "string") {
    return;
  }

  const perfilVisual = obtenerPerfilHabilidadVisual(idHabilidad);
  const ritmoVisual = crearPlanRitmoVisualHabilidad({
    perfilVisual,
    ejecucionTemporal: evento.ejecucionTemporal,
  });
  const impactos = Object.freeze(
    (evento.impactos ?? []).map((impacto) => {
      const idObjetivo = obtenerIdSeguro(impacto.objetivo);
      const objetivoVisual = entidadesPorId.get(idObjetivo) ?? null;
      return Object.freeze({
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
        danio: impacto.danio ?? null,
        efectos: impacto.efectos ?? Object.freeze([]),
        recursosObjetivo: impacto.recursosObjetivo ?? Object.freeze([]),
      });
    }),
  );

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
    habilidad: evento.habilidad,
    casillasAfectadas: evento.casillasAfectadas ?? Object.freeze([]),
    recorrido: evento.recorrido ?? Object.freeze([]),
    impactos,
    recursosActor: evento.recursosActor ?? Object.freeze([]),
    zonaTemporal: evento.zonaTemporal ?? null,
    perfilVisual,
    ejecucionTemporal: evento.ejecucionTemporal ?? null,
    ritmoVisual,
  }));

  for (const impacto of evento.impactos ?? []) {
    if (impacto.objetivoDerrotado === true && impacto.objetivo) {
      agregarEntidadDerrotada(plan, impacto.objetivo, entidadesPorId, {
        motivo: "habilidad_directa",
      });
    }
  }
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
      posicion: entidadVisual && esPosicion(entidadVisual)
        ? copiarPosicion(entidadVisual)
        : null,
      motivo,
    }),
  );
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
    posicionObjetivo: objetivoVisual && esPosicion(objetivoVisual)
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

function esPosicion(posicion) {
  return Number.isInteger(posicion?.x) && Number.isInteger(posicion?.y);
}

function copiarPosicion(posicion) {
  return Object.freeze({ x: posicion.x, y: posicion.y });
}
