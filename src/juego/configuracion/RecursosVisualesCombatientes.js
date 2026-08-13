const EXPRESION_RECURSO_VISUAL = /\.(png|jpg|jpeg|webp)$/i;

export const DIRECCIONES_RECURSO_VISUAL_COMBATIENTE = Object.freeze([
  "arriba",
  "abajo",
  "izquierda",
  "derecha",
  "arriba_izquierda",
  "arriba_derecha",
  "abajo_izquierda",
  "abajo_derecha",
]);

const CAMPOS_RECURSO_VISUAL_COMBATIENTE = new Set([
  "predeterminado",
  ...DIRECCIONES_RECURSO_VISUAL_COMBATIENTE,
]);

// Normaliza el contrato visual configurado en la definición canónica de una
// profesión o plantilla de enemigo. El dominio continúa recibiendo únicamente
// la ruta predeterminada; las direcciones adicionales quedan disponibles para
// la capa de presentación.
export function normalizarRecursoVisualCombatiente(
  configuracion,
  { descripcion = "el recurso visual del combatiente" } = {},
) {
  if (
    configuracion === null ||
    typeof configuracion !== "object" ||
    Array.isArray(configuracion)
  ) {
    throw new Error(`${descripcion} debe ser un objeto válido.`);
  }

  for (const campo of Object.keys(configuracion)) {
    if (!CAMPOS_RECURSO_VISUAL_COMBATIENTE.has(campo)) {
      throw new Error(
        `${descripcion} contiene el campo visual no soportado "${campo}".`,
      );
    }
  }

  const predeterminado = validarRutaRecursoVisual(
    configuracion.predeterminado,
    `${descripcion}.predeterminado`,
  );

  const resultado = { predeterminado };

  for (const direccion of DIRECCIONES_RECURSO_VISUAL_COMBATIENTE) {
    if (configuracion[direccion] === undefined) continue;
    resultado[direccion] = validarRutaRecursoVisual(
      configuracion[direccion],
      `${descripcion}.${direccion}`,
    );
  }

  return Object.freeze(resultado);
}

export function obtenerRecursoVisualPredeterminado(
  configuracion,
  opciones = {},
) {
  return normalizarRecursoVisualCombatiente(configuracion, opciones)
    .predeterminado;
}

export function obtenerRecursosVisualesDireccionalesConfigurados(
  configuracion,
  opciones = {},
) {
  const normalizada = normalizarRecursoVisualCombatiente(
    configuracion,
    opciones,
  );
  const direcciones = {};

  for (const direccion of DIRECCIONES_RECURSO_VISUAL_COMBATIENTE) {
    if (normalizada[direccion]) {
      direcciones[direccion] = normalizada[direccion];
    }
  }

  return Object.freeze(direcciones);
}

export function obtenerRutasRecursosVisualesCombatiente(
  configuracion,
  opciones = {},
) {
  const normalizada = normalizarRecursoVisualCombatiente(
    configuracion,
    opciones,
  );

  return Object.freeze([
    ...new Set([
      normalizada.predeterminado,
      ...DIRECCIONES_RECURSO_VISUAL_COMBATIENTE.map(
        (direccion) => normalizada[direccion],
      ).filter(Boolean),
    ]),
  ]);
}

function validarRutaRecursoVisual(ruta, descripcion) {
  if (typeof ruta !== "string" || ruta.trim() === "") {
    throw new Error(`${descripcion} debe ser una ruta no vacía.`);
  }

  const normalizada = ruta.trim();
  if (
    normalizada.startsWith("/") ||
    normalizada.includes("..") ||
    !EXPRESION_RECURSO_VISUAL.test(normalizada)
  ) {
    throw new Error(`${descripcion} debe ser una ruta relativa a una imagen.`);
  }

  return normalizada;
}
