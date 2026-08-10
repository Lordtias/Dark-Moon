import { calcularDistanciaCuadricula } from "../espacio/GeometriaCuadricula.js";

// Selecciona un objetivo con la prioridad canónica usada por el jugador:
// 1) menor distancia; 2) menor Vida actual; 3) orden estable de la lista.
export function seleccionarObjetivoPrioritario({
  origen,
  objetivos,
  esObjetivoValido = () => true,
} = {}) {
  if (!esPosicionValida(origen)) {
    throw new Error("La selección prioritaria necesita un origen válido.");
  }
  if (!Array.isArray(objetivos)) {
    throw new Error("La selección prioritaria necesita una lista de objetivos.");
  }
  if (typeof esObjetivoValido !== "function") {
    throw new Error("La selección prioritaria necesita un filtro válido.");
  }

  let seleccionado = null;
  let distanciaSeleccionada = Infinity;
  let vidaSeleccionada = Infinity;

  for (const objetivo of objetivos) {
    if (!esPosicionValida(objetivo) || !esObjetivoValido(objetivo)) continue;

    const distancia = calcularDistanciaCuadricula(origen, objetivo);
    const vidaActual = obtenerVidaActual(objetivo);
    const estaMasCerca = distancia < distanciaSeleccionada;
    const mismaDistanciaConMenosVida =
      distancia === distanciaSeleccionada && vidaActual < vidaSeleccionada;

    if (!estaMasCerca && !mismaDistanciaConMenosVida) continue;

    seleccionado = objetivo;
    distanciaSeleccionada = distancia;
    vidaSeleccionada = vidaActual;
  }

  return seleccionado;
}

function obtenerVidaActual(objetivo) {
  const vida = objetivo?.vidaActual ?? objetivo?.vida;
  return Number.isFinite(vida) ? vida : Infinity;
}

function esPosicionValida(entidad) {
  return Number.isFinite(entidad?.x) && Number.isFinite(entidad?.y);
}
