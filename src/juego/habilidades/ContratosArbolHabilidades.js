export const TIPOS_RELACION_ARBOL_HABILIDADES = Object.freeze({
  MODIFICACION: "modificacion",
});

const TIPOS_RELACION_VALIDOS = new Set(
  Object.values(TIPOS_RELACION_ARBOL_HABILIDADES),
);

// Normaliza exclusivamente la relación declarada por una habilidad. La
// existencia del destino y la pertenencia a una maestría se validan cuando el
// catálogo completo ya está disponible.
export function normalizarRelacionesArbolHabilidad({
  idHabilidad,
  relaciones = [],
} = {}) {
  const idOrigen = normalizarId(idHabilidad, "la habilidad origen");
  if (!Array.isArray(relaciones)) {
    throw new Error(`Las relaciones de árbol de "${idOrigen}" deben ser una lista.`);
  }

  const claves = new Set();
  return relaciones.map((relacion, indice) => {
    if (!relacion || typeof relacion !== "object" || Array.isArray(relacion)) {
      throw new Error(
        `La relación de árbol ${indice + 1} de "${idOrigen}" debe ser un objeto.`,
      );
    }
    const clavesPermitidas = new Set(["hacia", "tipo"]);
    for (const clave of Object.keys(relacion)) {
      if (!clavesPermitidas.has(clave)) {
        throw new Error(
          `La relación de árbol de "${idOrigen}" usa la clave desconocida "${clave}".`,
        );
      }
    }

    const hacia = normalizarId(relacion.hacia, `el destino de "${idOrigen}"`);
    const tipo = normalizarId(relacion.tipo, `el tipo de relación de "${idOrigen}"`);
    if (!TIPOS_RELACION_VALIDOS.has(tipo)) {
      throw new Error(
        `La relación de árbol de "${idOrigen}" usa el tipo desconocido "${tipo}".`,
      );
    }
    if (hacia === idOrigen) {
      throw new Error(`La habilidad "${idOrigen}" no puede relacionarse consigo misma.`);
    }

    const clave = `${hacia}:${tipo}`;
    if (claves.has(clave)) {
      throw new Error(
        `La habilidad "${idOrigen}" repite la relación de árbol hacia "${hacia}" (${tipo}).`,
      );
    }
    claves.add(clave);
    return Object.freeze({ hacia, tipo });
  });
}

function normalizarId(valor, etiqueta) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`${etiqueta} debe usar un identificador válido.`);
  }
  return valor.trim().toLowerCase();
}
