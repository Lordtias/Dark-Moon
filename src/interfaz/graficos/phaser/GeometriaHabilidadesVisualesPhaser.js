import { obtenerCentroEntidadVisual } from "./GeometriaVisualPhaser.js";

// Geometría visual compartida por los reproductores de patrones de habilidad.
// No resuelve alcance, objetivos ni reglas espaciales del juego.
export function crearClaveCasillaVisual(casilla) {
  return Number.isInteger(casilla?.x) && Number.isInteger(casilla?.y)
    ? `${casilla.x}:${casilla.y}`
    : "";
}

export function obtenerCentroActorHabilidad(reproductor, evento) {
  const nodo = reproductor.compositor.obtenerNodoEntidad(evento.idActor);
  if (nodo?.contenedor) {
    return { x: nodo.contenedor.x, y: nodo.contenedor.y };
  }
  return reproductor.compositor.obtenerCentroCasilla(evento.origenActor);
}
export function obtenerCentroImpactoHabilidad(reproductor, evento, impacto) {
  return obtenerCentroEntidadVisual(reproductor, {
    idEntidad: impacto?.idObjetivo,
    posicion: impacto?.posicionObjetivo ?? evento.posicionObjetivo,
  });
}
