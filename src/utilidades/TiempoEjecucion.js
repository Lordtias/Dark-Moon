// Utilidades neutrales para medir duraciones del runtime sin depender de una
// capa concreta de presentación, IA o coordinación temporal.
export function obtenerInstante() {
  return globalThis.performance?.now?.() ?? Date.now();
}

export function redondearMilisegundos(valor) {
  return Math.round((Number(valor) || 0) * 100) / 100;
}
