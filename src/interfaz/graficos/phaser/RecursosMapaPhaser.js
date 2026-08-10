import {
  normalizarConfiguracionAutotilingPared,
  obtenerRutasRecursosPared,
} from "../mapas/ResolutorAutotilingParedes.js";
import {
  normalizarConfiguracionTerrenosMapa,
  obtenerRutasRecursosTerreno,
} from "../mapas/ResolutorTerrenosMapa.js";

// Reúne únicamente rutas visuales neutrales necesarias para preparar un mapa
// Phaser. No conoce Juego, posiciones ocultas ni reglas de visibilidad.
export function obtenerRutasRecursosMapaPhaser({
  escena,
  recursosEntidades = [],
} = {}) {
  if (!escena?.mapa) {
    throw new Error("La precarga Phaser necesita una escena de mapa válida.");
  }

  const apariencia = escena.mapa.apariencia ?? {};
  const aparienciaPhaser = apariencia.phaser ?? {};
  const configuracionPared = normalizarConfiguracionAutotilingPared(
    aparienciaPhaser.pared,
  );
  const configuracionTerrenos = normalizarConfiguracionTerrenosMapa(apariencia);

  const rutas = [
    ...obtenerRutasRecursosTerreno(configuracionTerrenos),
    ...obtenerRutasRecursosPared(configuracionPared),
    ...(escena.entidades ?? []).flatMap((entidad) => [
      entidad.recursoVisual,
      ...(Array.isArray(entidad.recursosVisualesPrecarga)
        ? entidad.recursosVisualesPrecarga
        : []),
    ]),
    ...(Array.isArray(recursosEntidades) ? recursosEntidades : []),
  ];

  return Object.freeze([
    ...new Set(
      rutas
        .filter((ruta) => typeof ruta === "string")
        .map((ruta) => ruta.trim())
        .filter(Boolean),
    ),
  ]);
}
