// Validaciones geométricas compartidas por los creadores visuales de Phaser.
export function esCentroValido(centro) {
  return Number.isFinite(centro?.x) && Number.isFinite(centro?.y);
}
