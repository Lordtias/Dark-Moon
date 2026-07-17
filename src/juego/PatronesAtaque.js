// Define los patrones espaciales disponibles
// para ataques, armas y habilidades.
//
// El patrón es independiente de:
//
// - La cantidad de manos.
// - El alcance.
// - El tipo de daño.
// - El atributo ofensivo.
export const PATRONES_ATAQUE = Object.freeze({
  ADYACENTE: "adyacente",
  LINEAL: "lineal",
  LIBRE: "libre",
});

const VALORES_PATRONES_ATAQUE = Object.freeze(Object.values(PATRONES_ATAQUE));

// Normaliza un patrón recibido desde JSON.
//
// Devuelve null cuando el valor no es válido,
// permitiendo que cada consumidor genere un
// mensaje de error adecuado a su contexto.
export function normalizarPatronAtaque(patronAtaque) {
  if (typeof patronAtaque !== "string" || patronAtaque.trim() === "") {
    return null;
  }

  const normalizado = patronAtaque.trim().toLowerCase();

  return VALORES_PATRONES_ATAQUE.includes(normalizado) ? normalizado : null;
}

export function esPatronAtaqueValido(patronAtaque) {
  return normalizarPatronAtaque(patronAtaque) !== null;
}

// Mantiene compatibilidad con ataques naturales
// antiguos mientras migramos los enemigos.
//
// Los ataques cuerpo a cuerpo son adyacentes.
// Los ataques a distancia utilizan selección libre.
export function obtenerPatronAtaquePredeterminado(tipoAtaque) {
  return tipoAtaque === "distancia"
    ? PATRONES_ATAQUE.LIBRE
    : PATRONES_ATAQUE.ADYACENTE;
}
