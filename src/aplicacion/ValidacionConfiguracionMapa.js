// Contrato único para cualquier mapa antes de construir o activar su Juego.
export function validarConfiguracionMapa(configuracionMapa) {
  if (
    !configuracionMapa ||
    !Array.isArray(configuracionMapa.map) ||
    configuracionMapa.map.length === 0 ||
    !configuracionMapa.player ||
    !Array.isArray(configuracionMapa.objetivos) ||
    !Array.isArray(configuracionMapa.interactuables) ||
    !configuracionMapa.mapaSeleccionado
  ) {
    throw new Error(
      "ControladorPartida recibió una configuración de mapa inválida.",
    );
  }
}
