// Validaciones y operaciones geométricas compartidas por la presentación Phaser.
export function esCentroValido(centro) {
  return Number.isFinite(centro?.x) && Number.isFinite(centro?.y);
}

export function normalizarDireccionVisual({ origen, destino } = {}) {
  const diferenciaX = Number(destino?.x) - Number(origen?.x);
  const diferenciaY = Number(destino?.y) - Number(origen?.y);
  const longitud = Math.hypot(diferenciaX, diferenciaY);

  if (!Number.isFinite(longitud) || longitud === 0) {
    return Object.freeze({ x: 0, y: -1 });
  }

  return Object.freeze({
    x: diferenciaX / longitud,
    y: diferenciaY / longitud,
  });
}

export function obtenerCentroEntidadVisual(
  contexto,
  { idEntidad = null, posicion = null } = {},
) {
  const nodo = idEntidad
    ? contexto?.compositor?.obtenerNodoEntidad?.(idEntidad)
    : null;
  if (nodo?.contenedor) {
    return { x: nodo.contenedor.x, y: nodo.contenedor.y };
  }
  return contexto?.compositor?.obtenerCentroCasilla?.(posicion) ?? null;
}
