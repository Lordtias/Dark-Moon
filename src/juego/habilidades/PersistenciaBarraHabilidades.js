import {
  eliminarClaveAlmacenada,
  guardarJsonAlmacenado,
  leerJsonAlmacenado,
  validarAlmacenamientoClaveValor,
} from "../../utilidades/AlmacenamientoJson.js";
import { normalizarRanurasBarra } from "./ContratoBarraHabilidades.js";

export const CLAVE_BARRA_HABILIDADES = "dark-moon:barra-habilidades:v1";
export const VERSION_BARRA_HABILIDADES = 1;

// La barra guarda únicamente accesos rápidos. Los grados, requisitos y puntos
// continúan perteneciendo exclusivamente a ProgresoMagicoJugador.
export function guardarConfiguracionBarraHabilidades({
  ranuras,
  almacenamiento = globalThis.localStorage,
} = {}) {
  validarAlmacenamientoClaveValor(almacenamiento);
  const normalizadas = normalizarRanurasBarra(ranuras);
  const snapshot = {
    version: VERSION_BARRA_HABILIDADES,
    guardadoEn: new Date().toISOString(),
    ranuras: normalizadas,
  };
  guardarJsonAlmacenado({
    almacenamiento,
    clave: CLAVE_BARRA_HABILIDADES,
    valor: snapshot,
  });
  return { exito: true, clave: CLAVE_BARRA_HABILIDADES, snapshot };
}

export function leerConfiguracionBarraHabilidades({
  almacenamiento = globalThis.localStorage,
} = {}) {
  validarAlmacenamientoClaveValor(almacenamiento);
  const snapshot = leerJsonAlmacenado({
    almacenamiento,
    clave: CLAVE_BARRA_HABILIDADES,
    descripcion: "La barra guardada",
  });
  if (snapshot === null) return null;

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
  validarAlmacenamientoClaveValor(almacenamiento);
  const existia = eliminarClaveAlmacenada({
    almacenamiento,
    clave: CLAVE_BARRA_HABILIDADES,
  });
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
