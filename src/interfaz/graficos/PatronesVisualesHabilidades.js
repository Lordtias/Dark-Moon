// Contratos visuales reutilizables para familias de habilidades. Esta capa
// define cómo se organiza una presentación, pero no decide casillas, daño,
// objetivos, línea de visión ni duración jugable.
export const PATRONES_VISUALES_HABILIDAD = Object.freeze({
  PROYECTIL: "proyectil",
  AREA_INSTANTANEA: "area_instantanea",
  CADENA: "cadena",
  ZONA_PERSISTENTE: "zona_persistente",
  LINEA: "linea",
});

export const CENTROS_VISUALES_HABILIDAD = Object.freeze({
  ACTOR: "actor",
  SELECCION: "seleccion",
  OBJETIVO_PRIMARIO: "objetivo_primario",
});

const CONTRATOS = Object.freeze({
  [PATRONES_VISUALES_HABILIDAD.PROYECTIL]: Object.freeze({
    representaTodasLasCasillas: false,
    agrupaPorAnillos: false,
    admiteObjetivoPrimario: true,
    persistente: false,
  }),
  [PATRONES_VISUALES_HABILIDAD.AREA_INSTANTANEA]: Object.freeze({
    representaTodasLasCasillas: true,
    agrupaPorAnillos: true,
    admiteObjetivoPrimario: true,
    persistente: false,
  }),
  [PATRONES_VISUALES_HABILIDAD.CADENA]: Object.freeze({
    representaTodasLasCasillas: false,
    agrupaPorAnillos: false,
    admiteObjetivoPrimario: true,
    usaRecorridoOrdenado: true,
    reproduceImpactosSecuencialmente: true,
    conservaTramosAnteriores: true,
    enfatizaObjetivoPrimario: true,
    intensidadVisualMinima: 0.52,
    opacidadTramosAnteriores: 0.28,
    opacidadUltimoTramo: 0.72,
    persistente: false,
  }),
  [PATRONES_VISUALES_HABILIDAD.ZONA_PERSISTENTE]: Object.freeze({
    representaTodasLasCasillas: true,
    agrupaPorAnillos: false,
    admiteObjetivoPrimario: false,
    persistente: true,
  }),
  [PATRONES_VISUALES_HABILIDAD.LINEA]: Object.freeze({
    representaTodasLasCasillas: true,
    agrupaPorAnillos: false,
    admiteObjetivoPrimario: true,
    persistente: false,
  }),
});

export function resolverContratoPatronVisualHabilidad(perfil = {}) {
  const patronVisual = perfil.patronVisual;
  const contrato = CONTRATOS[patronVisual];
  if (!contrato) {
    throw new Error(
      `El patrón visual de habilidad "${patronVisual}" no está soportado.`,
    );
  }
  if (!Object.values(CENTROS_VISUALES_HABILIDAD).includes(perfil.centroVisual)) {
    throw new Error(
      `El centro visual de habilidad "${perfil.centroVisual}" no está soportado.`,
    );
  }

  return Object.freeze({
    patronVisual,
    centroVisual: perfil.centroVisual,
    efectoCasilla: normalizarTextoOpcional(perfil.efectoCasilla),
    efectoObjetivo: normalizarTextoOpcional(perfil.efectoObjetivo),
    efectoObjetivoPrimario: normalizarTextoOpcional(
      perfil.efectoObjetivoPrimario,
    ),
    ...contrato,
  });
}

export function validarPerfilPatronVisualHabilidad(perfil, idHabilidad) {
  const contrato = resolverContratoPatronVisualHabilidad(perfil);
  if (contrato.representaTodasLasCasillas && !contrato.efectoCasilla) {
    throw new Error(
      `La habilidad "${idHabilidad}" necesita efectoCasilla para su patrón visual.`,
    );
  }
  if (!contrato.efectoObjetivo) {
    throw new Error(
      `La habilidad "${idHabilidad}" necesita efectoObjetivo.`,
    );
  }
  return contrato;
}

function normalizarTextoOpcional(valor) {
  if (valor === null || valor === undefined) return null;
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error("Los identificadores visuales deben ser textos no vacíos.");
  }
  return valor.trim();
}
