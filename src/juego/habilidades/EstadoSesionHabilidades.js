const CANTIDAD_RANURAS = 10;
const estadosPorJugador = new WeakMap();

// Mantiene únicamente estado transitorio de sesión. Los grados y puntos no se
// duplican: continúan perteneciendo a ProgresoMagicoJugador.
export function obtenerEstadoSesionHabilidades(jugador) {
  if (!jugador || typeof jugador !== "object") {
    throw new Error(
      "Se necesita un jugador para obtener la sesión de habilidades.",
    );
  }
  if (!estadosPorJugador.has(jugador)) {
    estadosPorJugador.set(jugador, {
      asignaciones: Array(CANTIDAD_RANURAS).fill(null),
      contadorEjecuciones: 0,
      ultimaEjecucion: null,
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
  if (
    !Number.isInteger(indiceRanura) ||
    indiceRanura < 0 ||
    indiceRanura >= CANTIDAD_RANURAS
  ) {
    throw new Error("La ranura de habilidad debe estar entre 0 y 9.");
  }
  const estado = obtenerEstadoSesionHabilidades(jugador);
  const idNormalizado = idHabilidad
    ? String(idHabilidad).trim().toLowerCase()
    : null;
  if (idNormalizado) {
    const ranuraAnterior = estado.asignaciones.indexOf(idNormalizado);
    if (ranuraAnterior >= 0 && ranuraAnterior !== indiceRanura) {
      estado.asignaciones[ranuraAnterior] = null;
    }
  }
  estado.asignaciones[indiceRanura] = idNormalizado;
  return obtenerAsignacionesHabilidades(jugador);
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

export const CANTIDAD_RANURAS_HABILIDADES = CANTIDAD_RANURAS;

function clonarPlano(valor) {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(valor);
    } catch {
      // Algunos resultados contienen objetos del juego con métodos. La copia
      // segura conserva solamente datos serializables para la depuración.
    }
  }
  return copiarSerializable(valor, new WeakSet());
}

function copiarSerializable(valor, visitados) {
  if (
    valor === null ||
    typeof valor === "string" ||
    typeof valor === "number" ||
    typeof valor === "boolean"
  ) {
    return valor;
  }
  if (typeof valor === "bigint") return Number(valor);
  if (typeof valor === "undefined" || typeof valor === "function") return null;
  if (valor instanceof Error) {
    return { nombre: valor.name, mensaje: valor.message, stack: valor.stack };
  }
  if (typeof valor !== "object") return String(valor);
  if (visitados.has(valor)) return "[Referencia circular]";
  visitados.add(valor);
  if (Array.isArray(valor)) {
    const copia = valor.map((elemento) => copiarSerializable(elemento, visitados));
    visitados.delete(valor);
    return copia;
  }
  const copia = {};
  for (const [clave, actual] of Object.entries(valor)) {
    if (typeof actual === "function") continue;
    copia[clave] = copiarSerializable(actual, visitados);
  }
  visitados.delete(valor);
  return copia;
}
