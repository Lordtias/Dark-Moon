// Primitivas compartidas por los pobladores de contenido. No conocen tipos de
// entidad concretos ni modifican el estado de la mazmorra.

export function seleccionarPonderado(elementos, aleatorio) {
  if (!Array.isArray(elementos) || elementos.length === 0) {
    throw new Error("No se puede realizar una selección ponderada vacía.");
  }

  const pesoTotal = elementos.reduce((total, elemento) => {
    if (!Number.isFinite(elemento.peso) || elemento.peso <= 0) {
      throw new Error(`El peso de "${elemento.id}" debe ser mayor que 0.`);
    }

    return total + elemento.peso;
  }, 0);

  const valorSeleccionado = aleatorio.siguiente() * pesoTotal;

  let acumulado = 0;

  for (const elemento of elementos) {
    acumulado += elemento.peso;

    if (valorSeleccionado < acumulado) {
      return elemento;
    }
  }

  return elementos[elementos.length - 1];
}
export function crearClave(posicion) {
  return `${posicion.x},` + `${posicion.y}`;
}
