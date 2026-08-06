import {
  validarPerfilesZonasTemporalesVisuales,
} from "./ValidadorPerfilesZonasTemporalesVisuales.js";

let configuracionActiva = null;

export function configurarPerfilesZonasTemporalesVisuales({
  configuracion,
} = {}) {
  configuracionActiva = validarPerfilesZonasTemporalesVisuales(configuracion);
  return configuracionActiva;
}

export function obtenerPerfilesZonasTemporalesVisuales() {
  if (!configuracionActiva) {
    throw new Error(
      "Los perfiles visuales de zonas temporales todavía no fueron configurados.",
    );
  }
  return configuracionActiva;
}

export function obtenerPerfilZonaTemporalVisual(apariencia = "generica") {
  const perfiles = obtenerPerfilesZonasTemporalesVisuales().zonas;
  const id = normalizarApariencia(apariencia);
  return perfiles[id] ?? perfiles.generica;
}

function normalizarApariencia(valor) {
  if (typeof valor !== "string" || valor.trim() === "") return "generica";
  const id = valor.trim().toLowerCase();
  if (id === "rayo" || id === "electricidad") return "electrico";
  if (id === "hielo") return "frio";
  if (id === "toxico" || id === "toxica") return "veneno";
  return id;
}
