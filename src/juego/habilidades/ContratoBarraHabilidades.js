export const CANTIDAD_RANURAS_BARRA = 10;

// Describe la forma funcional de la barra. La persistencia puede guardar o
// recuperar estas ranuras, pero no define cuántas existen ni qué es válido.
export function crearRanurasBarraVacias() {
  return Array(CANTIDAD_RANURAS_BARRA).fill(null);
}

export function normalizarRanurasBarra(ranuras) {
  if (!Array.isArray(ranuras) || ranuras.length !== CANTIDAD_RANURAS_BARRA) {
    throw new Error("La barra debe contener exactamente diez ranuras.");
  }

  return ranuras.map((valor, indice) => {
    if (valor === null) return null;
    if (typeof valor !== "string" || valor.trim() === "") {
      throw new Error(`La ranura ${indice + 1} debe contener un ID o null.`);
    }
    return valor.trim().toLowerCase();
  });
}

export function validarBarraContraJugador({
  ranuras,
  habilidades,
  obtenerGrado,
  habilidadesAdicionales = {},
} = {}) {
  const normalizadas = normalizarRanurasBarra(ranuras);
  if (
    !habilidades ||
    typeof habilidades !== "object" ||
    Array.isArray(habilidades)
  ) {
    throw new Error("Falta el catálogo de habilidades para validar la barra.");
  }
  if (typeof obtenerGrado !== "function") {
    throw new Error("Falta la función para consultar grados aprendidos.");
  }

  const catalogo = { ...habilidades, ...habilidadesAdicionales };
  const idsUsados = new Set();
  return normalizadas.map((idHabilidad, indice) => {
    if (idHabilidad === null) return null;
    const habilidad = catalogo[idHabilidad];
    if (!habilidad) {
      throw new Error(
        `La ranura ${indice + 1} referencia la habilidad inexistente "${idHabilidad}".`,
      );
    }
    if (habilidad.tipo !== "activa" || (!habilidad.ejecucion && !habilidad.accionCanonica)) {
      throw new Error(
        `La habilidad "${idHabilidad}" no es una habilidad activa ejecutable.`,
      );
    }
    if (obtenerGrado(idHabilidad) <= 0) {
      throw new Error(
        `La habilidad "${idHabilidad}" no está aprendida y no puede asignarse.`,
      );
    }
    if (idsUsados.has(idHabilidad)) {
      throw new Error(`La habilidad "${idHabilidad}" está repetida en la barra.`);
    }
    idsUsados.add(idHabilidad);
    return idHabilidad;
  });
}

export function validarIndiceRanuraBarra(indiceRanura) {
  if (
    !Number.isInteger(indiceRanura) ||
    indiceRanura < 0 ||
    indiceRanura >= CANTIDAD_RANURAS_BARRA
  ) {
    throw new Error(
      `La ranura de habilidad debe estar entre 0 y ${CANTIDAD_RANURAS_BARRA - 1}.`,
    );
  }
  return indiceRanura;
}
