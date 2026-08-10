import {
  eliminarClaveAlmacenada,
  guardarJsonAlmacenado,
  leerJsonAlmacenado,
  obtenerAlmacenamientoLocalSeguro,
} from "../../utilidades/AlmacenamientoJson.js";

const CLAVE_PREFERENCIAS_INTERFAZ = "dark-moon:preferencias-interfaz";

export function leerPreferenciasInterfazPersistidas({
  almacenamiento = obtenerAlmacenamientoLocalSeguro(),
} = {}) {
  if (!almacenamiento) return null;

  const datos = leerJsonAlmacenado({
    almacenamiento,
    clave: CLAVE_PREFERENCIAS_INTERFAZ,
    descripcion: "Las preferencias guardadas",
  });
  if (datos === null) return null;

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
  almacenamiento = obtenerAlmacenamientoLocalSeguro(),
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
    eliminarClaveAlmacenada({
      almacenamiento,
      clave: CLAVE_PREFERENCIAS_INTERFAZ,
    });
    return true;
  }

  guardarJsonAlmacenado({
    almacenamiento,
    clave: CLAVE_PREFERENCIAS_INTERFAZ,
    valor: {
      version,
      preferencias,
    },
  });
  return true;
}

export function eliminarPreferenciasInterfazPersistidas({
  almacenamiento = obtenerAlmacenamientoLocalSeguro(),
} = {}) {
  if (!almacenamiento) return false;
  eliminarClaveAlmacenada({
    almacenamiento,
    clave: CLAVE_PREFERENCIAS_INTERFAZ,
  });
  return true;
}
