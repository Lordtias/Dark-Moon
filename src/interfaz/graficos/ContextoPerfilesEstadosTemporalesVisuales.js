import { validarPerfilesEstadosTemporalesVisuales } from "./ValidadorPerfilesEstadosTemporalesVisuales.js";

let configuracionActiva = null;

export function configurarPerfilesEstadosTemporalesVisuales({
  configuracion,
  configuracionEfectos,
} = {}) {
  configuracionActiva = validarPerfilesEstadosTemporalesVisuales({
    configuracion,
    configuracionEfectos,
  });
  return configuracionActiva;
}

export function obtenerPerfilesEstadosTemporalesVisuales() {
  if (!configuracionActiva) {
    throw new Error(
      "Los perfiles visuales de estados temporales todavía no fueron configurados.",
    );
  }
  return configuracionActiva;
}

export function obtenerPerfilEstadoTemporalVisual(idEfecto) {
  if (typeof idEfecto !== "string" || idEfecto.trim() === "") {
    throw new Error("El perfil visual necesita un ID de efecto válido.");
  }
  const perfil =
    obtenerPerfilesEstadosTemporalesVisuales().estados[idEfecto];
  if (!perfil) {
    throw new Error(
      `El efecto temporal "${idEfecto}" no tiene perfil visual configurado.`,
    );
  }
  return perfil;
}

export function obtenerFeedbackEfectoNoAplicado(motivo) {
  const perfiles = obtenerPerfilesEstadosTemporalesVisuales().feedbackNoAplicado;
  return perfiles[motivo] ?? perfiles.duplicado;
}
