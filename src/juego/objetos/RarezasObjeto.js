// Algunas rarezas poseen semántica estructural propia en los objetos:
// Común no admite afijos y Mágico identifica hoy el primer nivel con afijos.
//
// Esta pareja NO es el catálogo de rarezas válidas. La autoridad para saber
// qué rarezas existen y cuáles pueden generarse es Rarezas.json.
export const RAREZA_COMUN = "comun";
export const RAREZA_MAGICA = "magico";

// Identificadores utilizados para separar los dos grupos estructurales de
// afijos. Los límites de cada grupo pertenecen a la configuración de rareza.
export const TIPOS_AFIJO_OBJETO = Object.freeze({
  PREFIJO: "prefijo",
  SUFIJO: "sufijo",
});

// Normaliza el ID de una rareza sin restringirlo a un catálogo codificado.
export function normalizarIdRarezaObjeto(valor = RAREZA_COMUN) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error("La rareza del objeto debe ser un identificador válido.");
  }

  return valor.trim().toLowerCase();
}

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
