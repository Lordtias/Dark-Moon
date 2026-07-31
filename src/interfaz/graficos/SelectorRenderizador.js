export const TIPO_RENDERIZADOR_CANVAS_2D = "canvas2d";
export const TIPO_RENDERIZADOR_PHASER = "phaser";

const TIPOS_ADMITIDOS = new Set([
  TIPO_RENDERIZADOR_CANVAS_2D,
  TIPO_RENDERIZADOR_PHASER,
]);

// Resuelve el backend visual sin mezclar esta decisión con la lógica del juego.
// La ausencia del parámetro mantiene Canvas 2D como modo seguro y conocido.
export function resolverTipoRenderizador({
  busqueda = globalThis.location?.search ?? "",
  advertir = (...argumentos) => console.warn(...argumentos),
} = {}) {
  const parametros = new URLSearchParams(busqueda);
  const valorSolicitado = parametros.get("render")?.trim().toLowerCase();

  if (!valorSolicitado) {
    return TIPO_RENDERIZADOR_CANVAS_2D;
  }

  if (TIPOS_ADMITIDOS.has(valorSolicitado)) {
    return valorSolicitado;
  }

  advertir(
    `Renderizador "${valorSolicitado}" no reconocido. ` +
      `Se utilizará "${TIPO_RENDERIZADOR_CANVAS_2D}".`,
  );

  return TIPO_RENDERIZADOR_CANVAS_2D;
}

export function utilizaPhaser(tipoRenderizador) {
  return tipoRenderizador === TIPO_RENDERIZADOR_PHASER;
}
