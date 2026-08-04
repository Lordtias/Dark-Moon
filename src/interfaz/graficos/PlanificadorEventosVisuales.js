import {
  TIPOS_EVENTO_ACCION,
} from "../../juego/acciones/EventosAccion.js";
import { obtenerIdVisualEntidad } from "./AdaptadorEscenaJuego.js";
import { TIPOS_ENTIDAD_VISUAL } from "./TiposEscena.js";

export const TIPOS_EVENTO_VISUAL = Object.freeze({
  MOVIMIENTO_ENTIDAD: "movimiento_entidad",
  ATAQUE_RESUELTO: "ataque_resuelto",
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
      estadoObjetivoFinal: evento.estadoObjetivoFinal ?? null,
      resultado: evento.resultado,
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

function esPosicion(posicion) {
  return Number.isInteger(posicion?.x) && Number.isInteger(posicion?.y);
}

function copiarPosicion(posicion) {
  return Object.freeze({ x: posicion.x, y: posicion.y });
}
