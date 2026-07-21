// Identificadores de las rarezas registradas
// inicialmente en Rarezas.json.
//
// El catálogo JSON sigue siendo responsable de:
//
// - Estado.
// - Color.
// - Peso.
// - Cantidad mínima y máxima de afijos.
// - Nivel mínimo.
//
// Estas constantes solamente evitan repetir
// cadenas literales dentro del código.
export const RAREZAS_OBJETO = Object.freeze({
  COMUN: "comun",

  MAGICO: "magico",

  RARO: "raro",

  UNICO: "unico",
});

// Identificadores utilizados para separar
// los dos grupos de afijos.
//
// Los límites de cada grupo pertenecen
// a la configuración de la rareza.
export const TIPOS_AFIJO_OBJETO = Object.freeze({
  PREFIJO: "prefijo",

  SUFIJO: "sufijo",
});

// Normaliza el ID de una rareza.
//
// No limita el valor a las cuatro rarezas conocidas.
// Esto permite agregar en el futuro una rareza nueva
// desde configuración sin modificar esta función.
export function normalizarIdRarezaObjeto(valor = RAREZAS_OBJETO.COMUN) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error("La rareza del objeto debe ser un identificador válido.");
  }

  return valor.trim().toLowerCase();
}

// Normaliza y valida el grupo de un afijo.
//
// A diferencia de las rarezas, los grupos estructurales
// sí son exclusivamente prefijo o sufijo.
export function normalizarTipoAfijoObjeto(valor) {
  if (typeof valor !== "string") {
    throw new Error("El tipo del afijo debe ser un texto.");
  }

  const normalizado = valor.trim().toLowerCase();

  const tiposValidos = Object.values(TIPOS_AFIJO_OBJETO);

  if (!tiposValidos.includes(normalizado)) {
    throw new Error(`El tipo de afijo "${valor}" no es válido.`);
  }

  return normalizado;
}
