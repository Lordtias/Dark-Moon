// Categorías defensivas disponibles para las armaduras.
//
// La categoría define el estilo de la pieza y permitirá
// aplicar pasivas diferentes según el equipo utilizado.
export const CATEGORIAS_ARMADURA = Object.freeze({
  LIGERA: "ligera",

  MEDIA: "media",

  PESADA: "pesada",
});

const CATEGORIAS_ARMADURA_VALIDAS = new Set(Object.values(CATEGORIAS_ARMADURA));

// Normaliza el tier propio de la plantilla base.
//
// El tier no representa rareza:
//
// - Una espada común Tier I continúa siendo Tier I.
// - Una espada mágica Tier I también continúa siendo Tier I.
// - Los afijos modifican la instancia, no el tier de su base.
export function normalizarTierBase(valor = 1) {
  if (!Number.isInteger(valor) || valor < 1) {
    throw new Error(
      "El tier base de un objeto debe ser " + "un entero mayor o igual que 1.",
    );
  }

  return valor;
}

// Define desde qué nivel puede participar una plantilla
// en sistemas como drops, comercio y generación aleatoria.
//
// Este metadato todavía no bloquea la creación explícita.
// Esa restricción se conectará en la etapa de progresión.
export function normalizarNivelMinimoGeneracion(valor = 1) {
  if (!Number.isInteger(valor) || valor < 1) {
    throw new Error(
      "El nivel mínimo de generación de un objeto " +
        "debe ser un entero mayor o igual que 1.",
    );
  }

  return valor;
}

// Relaciona diferentes bases que pertenecen
// al mismo grupo de progresión.
//
// Ejemplos:
//
// - daga_hierro y daga_acero pertenecen a "daga".
// - espada_larga y espada_acero pertenecen a "espada".
// - cuero y cuero endurecido pertenecen a "armadura_media".
export function normalizarFamiliaObjeto(valor = null) {
  if (valor === null || valor === undefined) {
    return null;
  }

  return normalizarIdentificador({
    valor,
    descripcion: "familia del objeto",
  });
}

// Normaliza la rama defensiva de una armadura.
//
// Los escudos no pertenecen a las ramas ligera,
// media o pesada y por eso utilizan null.
export function normalizarCategoriaArmadura(valor = null) {
  if (valor === null || valor === undefined) {
    return null;
  }

  const categoriaNormalizada = normalizarIdentificador({
    valor,
    descripcion: "categoría de armadura",
  });

  if (!CATEGORIAS_ARMADURA_VALIDAS.has(categoriaNormalizada)) {
    throw new Error(
      `La categoría de armadura "${categoriaNormalizada}" ` + "no es válida.",
    );
  }

  return categoriaNormalizada;
}

// Comprueba que un identificador configurable utilice
// el mismo formato simple que los catálogos de Dark Moon.
function normalizarIdentificador({ valor, descripcion }) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`La ${descripcion} debe ser un texto válido.`);
  }

  const normalizado = valor.trim().toLowerCase();

  if (!/^[a-z0-9_]+$/.test(normalizado)) {
    throw new Error(
      `La ${descripcion} "${valor}" no es válida. ` +
        "Utilizá solamente minúsculas, números " +
        "y guiones bajos.",
    );
  }

  return normalizado;
}
