// Contrato estructural único de los atributos base de cualquier combatiente.
//
// Las fórmulas y pesos continúan perteneciendo a sus sistemas/configuraciones;
// este módulo solamente evita que cada consumidor mantenga su propia lista.
export const ATRIBUTOS_COMBATIENTE_CANONICOS = Object.freeze([
  "fuerza",
  "destreza",
  "constitucion",
  "inteligencia",
  "sabiduria",
  "suerte",
]);

const CONJUNTO_ATRIBUTOS_COMBATIENTE = new Set(
  ATRIBUTOS_COMBATIENTE_CANONICOS,
);

export function esAtributoCombatienteCanonico(idAtributo) {
  return (
    typeof idAtributo === "string" &&
    CONJUNTO_ATRIBUTOS_COMBATIENTE.has(idAtributo)
  );
}

export function validarIdsAtributosCombatiente(
  ids,
  { descripcion = "los atributos del combatiente" } = {},
) {
  if (!Array.isArray(ids)) {
    throw new Error(`${descripcion} deben formar una lista.`);
  }

  for (const id of ids) {
    if (typeof id !== "string" || id.trim() === "") {
      throw new Error(`${descripcion} contienen un identificador inválido.`);
    }
  }

  const unicos = new Set(ids);
  if (
    ids.length !== ATRIBUTOS_COMBATIENTE_CANONICOS.length ||
    unicos.size !== ATRIBUTOS_COMBATIENTE_CANONICOS.length ||
    ATRIBUTOS_COMBATIENTE_CANONICOS.some((id) => !unicos.has(id))
  ) {
    throw new Error(
      `${descripcion} deben coincidir exactamente con el contrato canónico: ` +
        `${ATRIBUTOS_COMBATIENTE_CANONICOS.join(", ")}.`,
    );
  }

  return [...ids];
}

export function validarClavesAtributosCombatiente(
  atributos,
  { descripcion = "los atributos del combatiente" } = {},
) {
  if (atributos === null || typeof atributos !== "object" || Array.isArray(atributos)) {
    throw new Error(`${descripcion} deben formar un objeto válido.`);
  }

  validarIdsAtributosCombatiente(Object.keys(atributos), { descripcion });
  return atributos;
}
