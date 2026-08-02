import { calcularProfundidadMundoPhaser } from "./ConfiguracionPhaser.js";

export const NIVELES_PROFUNDIDAD_MUNDO_PHASER = Object.freeze({
  SOMBRA: -0.45,
  SUPERFICIE: -0.35,
  FACHADA: -0.08,
  ENTIDAD: 0,
  PUERTA: 0.08,
  REMATE: 0.16,
});

// Todos los objetos que pueden solaparse comparten esta misma regla. La línea
// de apoyo es el punto donde el elemento toca el suelo, no su categoría ni el
// orden en que fue creado.
export function calcularProfundidadOrdenablePhaser({
  baseY,
  baseX = 0,
  nivel = 0,
} = {}) {
  const x = Number.isFinite(baseX) ? baseX : 0;
  const desempateHorizontal = Math.max(-0.02, Math.min(0.02, x / 100000));
  return calcularProfundidadMundoPhaser(
    baseY,
    (Number.isFinite(nivel) ? nivel : 0) + desempateHorizontal,
  );
}

export function obtenerLineaApoyoCasillaPhaser({
  posicion,
  tamanoCasilla,
  desplazamiento = -2,
} = {}) {
  if (!Number.isFinite(posicion?.y) || !Number.isFinite(tamanoCasilla)) {
    return 0;
  }

  return posicion.y + tamanoCasilla + desplazamiento;
}
