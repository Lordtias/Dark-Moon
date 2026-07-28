export const IDS_RESISTENCIA_EFECTO = Object.freeze([
  "congelamiento",
  "aturdimiento",
  "envenenamiento",
  "quemadura",
]);

export const PROPIEDAD_RESISTENCIA_EFECTO = Object.freeze({
  congelamiento: "resistenciaCongelamiento",
  aturdimiento: "resistenciaAturdimiento",
  envenenamiento: "resistenciaEnvenenamiento",
  quemadura: "resistenciaQuemadura",
});

export function normalizarResistenciaEfecto(valor, descripcion) {
  if (!Number.isFinite(valor)) {
    throw new Error(`${descripcion} debe ser un número finito.`);
  }
  return Math.max(0, Math.min(75, valor));
}

export function normalizarResistenciasEfectos(resistencias = {}) {
  validarObjeto(resistencias, "Las resistencias a efectos");
  return Object.fromEntries(
    IDS_RESISTENCIA_EFECTO.map((id) => [
      id,
      normalizarResistenciaEfecto(
        resistencias[id] ?? 0,
        `La resistencia a ${id}`,
      ),
    ]),
  );
}

export function normalizarInmunidadesEfectos(inmunidades = []) {
  if (!Array.isArray(inmunidades)) {
    throw new Error("Las inmunidades a efectos deben estar dentro de una lista.");
  }
  const normalizadas = inmunidades.map((id) => {
    if (typeof id !== "string" || id.trim() === "") {
      throw new Error("Cada inmunidad a efectos debe tener un identificador.");
    }
    const normalizado = id.trim().toLowerCase();
    if (!IDS_RESISTENCIA_EFECTO.includes(normalizado)) {
      throw new Error(`La inmunidad a efectos "${normalizado}" no existe.`);
    }
    return normalizado;
  });
  return [...new Set(normalizadas)];
}

export function normalizarPropiedadesResistenciasEfectos(propiedades = {}) {
  validarObjeto(propiedades, "Las propiedades");
  const normalizadas = { ...propiedades };
  for (const [id, propiedad] of Object.entries(
    PROPIEDAD_RESISTENCIA_EFECTO,
  )) {
    if (!Object.prototype.hasOwnProperty.call(normalizadas, propiedad)) {
      continue;
    }
    normalizadas[propiedad] = normalizarResistenciaEfecto(
      normalizadas[propiedad],
      `La propiedad de resistencia a ${id}`,
    );
  }
  return normalizadas;
}

function validarObjeto(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`${descripcion} debe formar un objeto válido.`);
  }
}
