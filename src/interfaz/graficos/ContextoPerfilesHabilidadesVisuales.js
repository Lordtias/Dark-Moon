import { validarPerfilesHabilidadesVisuales } from "./ValidadorPerfilesHabilidadesVisuales.js";

let configuracionActiva = null;

export function configurarPerfilesHabilidadesVisuales({
  configuracion,
  configuracionHabilidades,
} = {}) {
  configuracionActiva = validarPerfilesHabilidadesVisuales({
    configuracion,
    configuracionHabilidades,
  });
  return configuracionActiva;
}

export function obtenerPerfilesHabilidadesVisuales() {
  if (!configuracionActiva) {
    throw new Error(
      "Los perfiles visuales de habilidades todavía no fueron configurados.",
    );
  }
  return configuracionActiva;
}

export function obtenerPerfilHabilidadVisual(idHabilidad) {
  if (typeof idHabilidad !== "string" || idHabilidad.trim() === "") {
    throw new Error("El perfil visual necesita un ID de habilidad válido.");
  }
  const perfil = obtenerPerfilesHabilidadesVisuales().habilidades[idHabilidad];
  if (!perfil) {
    throw new Error(
      `La habilidad "${idHabilidad}" no tiene perfil visual configurado.`,
    );
  }
  return perfil;
}

export function obtenerSecuenciaHabilidadVisual(idSecuencia) {
  const secuencia = obtenerPerfilesHabilidadesVisuales().secuencias[idSecuencia];
  if (!secuencia) {
    throw new Error(
      `La secuencia visual de habilidad "${idSecuencia}" no existe.`,
    );
  }
  return secuencia;
}
