import { normalizarRanurasBarra } from "./ContratoBarraHabilidades.js";

export const CLAVE_BARRA_HABILIDADES = "dark-moon:barra-habilidades:v1";
export const VERSION_BARRA_HABILIDADES = 1;

// La barra guarda únicamente accesos rápidos. Los grados, requisitos y puntos
// continúan perteneciendo exclusivamente a ProgresoMagicoJugador.
export function guardarConfiguracionBarraHabilidades({
  ranuras,
  almacenamiento = globalThis.localStorage,
} = {}) {
  validarAlmacenamiento(almacenamiento);
  const normalizadas = normalizarRanurasBarra(ranuras);
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
  if (contenido === null) return null;

  let snapshot;
  try {
    snapshot = JSON.parse(contenido);
  } catch (error) {
    throw new Error(
      `La barra guardada no contiene JSON válido. ${error.message}`,
    );
  }

  const ranuras = validarSnapshot(snapshot);
  return {
    version: snapshot.version,
    guardadoEn: snapshot.guardadoEn ?? null,
    ranuras,
  };
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
  return normalizarRanurasBarra(snapshot.ranuras);
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
