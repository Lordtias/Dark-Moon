const CLAVE_PREFERENCIAS_INTERFAZ = "dark-moon:preferencias-interfaz";

export function leerPreferenciasInterfazPersistidas({
  almacenamiento = obtenerAlmacenamientoPredeterminado(),
} = {}) {
  if (!almacenamiento) return null;

  const contenido = almacenamiento.getItem(CLAVE_PREFERENCIAS_INTERFAZ);
  if (contenido === null) return null;

  let datos;
  try {
    datos = JSON.parse(contenido);
  } catch (error) {
    throw new Error(
      `Las preferencias guardadas no contienen JSON válido. ${error.message}`,
    );
  }

  if (
    datos === null ||
    typeof datos !== "object" ||
    Array.isArray(datos) ||
    !Number.isInteger(datos.version) ||
    datos.version <= 0 ||
    datos.preferencias === null ||
    typeof datos.preferencias !== "object" ||
    Array.isArray(datos.preferencias)
  ) {
    throw new Error("Las preferencias guardadas tienen un formato inválido.");
  }

  return {
    version: datos.version,
    preferencias: { ...datos.preferencias },
  };
}

export function guardarPreferenciasInterfazPersistidas({
  version,
  preferencias,
  almacenamiento = obtenerAlmacenamientoPredeterminado(),
} = {}) {
  if (!almacenamiento) return false;
  if (!Number.isInteger(version) || version <= 0) {
    throw new Error("La persistencia de preferencias necesita una versión.");
  }
  if (
    preferencias === null ||
    typeof preferencias !== "object" ||
    Array.isArray(preferencias)
  ) {
    throw new Error("Las preferencias persistibles deben ser un objeto.");
  }

  const claves = Object.keys(preferencias);
  if (claves.length === 0) {
    almacenamiento.removeItem(CLAVE_PREFERENCIAS_INTERFAZ);
    return true;
  }

  almacenamiento.setItem(
    CLAVE_PREFERENCIAS_INTERFAZ,
    JSON.stringify({
      version,
      preferencias,
    }),
  );
  return true;
}

export function eliminarPreferenciasInterfazPersistidas({
  almacenamiento = obtenerAlmacenamientoPredeterminado(),
} = {}) {
  if (!almacenamiento) return false;
  almacenamiento.removeItem(CLAVE_PREFERENCIAS_INTERFAZ);
  return true;
}

function obtenerAlmacenamientoPredeterminado() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
