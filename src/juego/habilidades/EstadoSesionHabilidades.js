const CANTIDAD_RANURAS = 10;
const estadosPorJugador = new WeakMap();

// Mantiene únicamente estado transitorio de sesión. Los grados y puntos no se
// duplican: continúan perteneciendo a ProgresoMagicoJugador.
export function obtenerEstadoSesionHabilidades(jugador) {
  if (!jugador || typeof jugador !== "object") {
    throw new Error("Se necesita un jugador para obtener la sesión de habilidades.");
  }

  if (!estadosPorJugador.has(jugador)) {
    estadosPorJugador.set(jugador, {
      asignaciones: Array(CANTIDAD_RANURAS).fill(null),
      contadorEjecuciones: 0,
      ultimaEjecucion: null,
      efectosFallback: [],
    });
  }

  return estadosPorJugador.get(jugador);
}

export function generarIdEjecucionHabilidad(jugador) {
  const estado = obtenerEstadoSesionHabilidades(jugador);
  estado.contadorEjecuciones += 1;
  return `habilidad-${String(estado.contadorEjecuciones).padStart(6, "0")}`;
}

export function obtenerAsignacionesHabilidades(jugador) {
  return [...obtenerEstadoSesionHabilidades(jugador).asignaciones];
}

export function asignarHabilidadARanura(jugador, indiceRanura, idHabilidad) {
  if (!Number.isInteger(indiceRanura) || indiceRanura < 0 || indiceRanura >= CANTIDAD_RANURAS) {
    throw new Error("La ranura de habilidad debe estar entre 0 y 9.");
  }

  const estado = obtenerEstadoSesionHabilidades(jugador);
  const idNormalizado = idHabilidad ? String(idHabilidad).trim().toLowerCase() : null;

  if (idNormalizado) {
    const ranuraAnterior = estado.asignaciones.indexOf(idNormalizado);
    if (ranuraAnterior >= 0 && ranuraAnterior !== indiceRanura) {
      estado.asignaciones[ranuraAnterior] = null;
    }
  }

  estado.asignaciones[indiceRanura] = idNormalizado;
  return obtenerAsignacionesHabilidades(jugador);
}

export function asignarPrimeraRanuraLibre(jugador, idHabilidad) {
  const estado = obtenerEstadoSesionHabilidades(jugador);
  const idNormalizado = String(idHabilidad).trim().toLowerCase();

  if (estado.asignaciones.includes(idNormalizado)) {
    return estado.asignaciones.indexOf(idNormalizado);
  }

  const indiceLibre = estado.asignaciones.indexOf(null);
  if (indiceLibre < 0) {
    return -1;
  }

  estado.asignaciones[indiceLibre] = idNormalizado;
  return indiceLibre;
}

export function registrarUltimaEjecucion(jugador, resultado) {
  obtenerEstadoSesionHabilidades(jugador).ultimaEjecucion = resultado
    ? clonarPlano(resultado)
    : null;
}

export function obtenerUltimaEjecucion(jugador) {
  const resultado = obtenerEstadoSesionHabilidades(jugador).ultimaEjecucion;
  return resultado ? clonarPlano(resultado) : null;
}

export function obtenerEfectosFallback(jugador) {
  return obtenerEstadoSesionHabilidades(jugador).efectosFallback;
}

export const CANTIDAD_RANURAS_HABILIDADES = CANTIDAD_RANURAS;

function clonarPlano(valor) {
  if (typeof structuredClone === "function") {
    return structuredClone(valor);
  }
  return JSON.parse(JSON.stringify(valor));
}
