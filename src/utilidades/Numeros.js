// Primitivas numéricas sin dependencia de dominio.
export function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}
