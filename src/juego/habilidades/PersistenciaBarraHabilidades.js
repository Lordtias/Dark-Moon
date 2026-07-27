export const CLAVE_BARRA_HABILIDADES = "dark-moon:barra-habilidades:v1";
export const VERSION_BARRA_HABILIDADES = 1;
export const CANTIDAD_RANURAS_BARRA = 10;
// La barra guarda únicamente accesos rápidos. Los grados, requisitos y puntos
// continúan perteneciendo exclusivamente a ProgresoMagicoJugador.
export function guardarConfiguracionBarraHabilidades({
  ranuras,
  almacenamiento = globalThis.localStorage,
} = {}) {
  validarAlmacenamiento(almacenamiento);
  const normalizadas = normalizarEstructuraBasica(ranuras);
  const snapshot = {
    version: VERSION_BARRA_HABILIDADES,
    guardadoEn: new Date().toISOString(),
    ranuras: normalizadas,
  };
  almacenamiento.setItem(CLAVE_BARRA_HABILIDADES, JSON.stringify(snapshot));
  return { exito: true, clave: CLAVE_BARRA_HABILIDADES, snapshot };
}
export function leerConfiguracionBarraHabilidades({
  almacenamiento = globalThis.localStorage,
} = {}) {
  validarAlmacenamiento(almacenamiento);
  const contenido = almacenamiento.getItem(CLAVE_BARRA_HABILIDADES);
  if (contenido === null) {
    return null;
  }
  let snapshot;
  try {
    snapshot = JSON.parse(contenido);
  } catch (error) {
    throw new Error(
      `La barra guardada no contiene JSON válido. ${error.message}`,
    );
  }
  validarSnapshot(snapshot);
  return {
    version: snapshot.version,
    guardadoEn: snapshot.guardadoEn ?? null,
    ranuras: [...snapshot.ranuras],
  };
}
export function validarBarraContraJugador({
  ranuras,
  habilidades,
  obtenerGrado,
} = {}) {
  const normalizadas = normalizarEstructuraBasica(ranuras);
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
  const idsUsados = new Set();
  return normalizadas.map((idHabilidad, indice) => {
    if (idHabilidad === null) {
      return null;
    }
    const habilidad = habilidades[idHabilidad];
    if (!habilidad) {
      throw new Error(
        `La ranura ${indice + 1} referencia la habilidad inexistente "${idHabilidad}".`,
      );
    }
    if (!habilidad.ejecucion) {
      throw new Error(
        `La habilidad "${idHabilidad}" todavía no posee ejecución jugable.`,
      );
    }
    if (obtenerGrado(idHabilidad) <= 0) {
      throw new Error(
        `La habilidad "${idHabilidad}" no está aprendida y no puede asignarse.`,
      );
    }
    if (idsUsados.has(idHabilidad)) {
      throw new Error(
        `La habilidad "${idHabilidad}" está repetida en la barra.`,
      );
    }
    idsUsados.add(idHabilidad);
    return idHabilidad;
  });
}
export function eliminarConfiguracionBarraHabilidades({
  almacenamiento = globalThis.localStorage,
} = {}) {
  if (!almacenamiento) {
    return { exito: false, eliminado: false };
  }
  validarAlmacenamiento(almacenamiento);
  const existia = almacenamiento.getItem(CLAVE_BARRA_HABILIDADES) !== null;
  almacenamiento.removeItem(CLAVE_BARRA_HABILIDADES);
  return {
    exito: true,
    eliminado: existia,
    clave: CLAVE_BARRA_HABILIDADES,
  };
}
function validarSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new Error("El guardado de la barra no es un objeto válido.");
  }
  if (snapshot.version !== VERSION_BARRA_HABILIDADES) {
    throw new Error(
      `La versión ${snapshot.version} de la barra no es compatible con la configuración actual.`,
    );
  }
  normalizarEstructuraBasica(snapshot.ranuras);
}
function normalizarEstructuraBasica(ranuras) {
  if (!Array.isArray(ranuras) || ranuras.length !== CANTIDAD_RANURAS_BARRA) {
    throw new Error("La barra debe contener exactamente diez ranuras.");
  }
  return ranuras.map((valor, indice) => {
    if (valor === null) {
      return null;
    }
    if (typeof valor !== "string" || valor.trim() === "") {
      throw new Error(`La ranura ${indice + 1} debe contener un ID o null.`);
    }
    return valor.trim().toLowerCase();
  });
}
function validarAlmacenamiento(almacenamiento) {
  if (
    !almacenamiento ||
    typeof almacenamiento.getItem !== "function" ||
    typeof almacenamiento.setItem !== "function" ||
    typeof almacenamiento.removeItem !== "function"
  ) {
    throw new Error("No existe un almacenamiento durable compatible.");
  }
}
