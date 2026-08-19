import { seleccionarPonderado as seleccionarPonderadoCanonico } from "./GeneradorAleatorio.js";

// Primitivas compartidas por los pobladores de contenido. No conocen tipos de
// entidad concretos ni modifican el estado de la mazmorra.
export function seleccionarPonderado(elementos, aleatorio) {
  return seleccionarPonderadoCanonico({
    elementos,
    aleatorio,
    descripcion: "una entrada de población de mazmorra",
  });
}

export function crearClave(posicion) {
  return `${posicion.x},` + `${posicion.y}`;
}
