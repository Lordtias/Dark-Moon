// Centraliza las reglas de progresión que determinan
// cuándo puede aparecer una plantilla de objeto.
//
// Separamos tres conceptos:
//
// - tierBase:
//   Define la potencia de las propiedades base.
//
// - nivelObjeto:
//   Define los grados de afijos que puede recibir
//   una instancia concreta.
//
// - nivelProgreso:
//   Representa el nivel de la fuente que intenta
//   generar el objeto: mapa, enemigo, mercader,
//   recompensa u otro sistema futuro.
//
// nivelMinimoGeneracion se compara exclusivamente
// contra nivelProgreso. No cambia el tier ni obliga
// a que nivelObjeto tenga el mismo valor.

const NIVEL_MINIMO_POR_DEFECTO = 1;

// Devuelve el nivel mínimo declarado por una plantilla.
//
// Los objetos antiguos o no equipables que no declaren
// este campo continúan disponibles desde nivel 1.
export function obtenerNivelMinimoGeneracionPlantilla(plantilla) {
  validarPlantilla(plantilla);

  const nivelMinimo =
    plantilla.nivelMinimoGeneracion ?? NIVEL_MINIMO_POR_DEFECTO;

  if (!Number.isInteger(nivelMinimo) || nivelMinimo < 1) {
    throw new Error(
      "El nivel mínimo de generación de una plantilla " +
        "debe ser un entero mayor o igual que 1.",
    );
  }

  return nivelMinimo;
}

// Indica si una plantilla puede generarse
// para el nivel de progreso recibido.
export function puedeGenerarsePlantilla({ plantilla, nivelProgreso } = {}) {
  validarNivelProgreso(nivelProgreso);

  const nivelMinimo = obtenerNivelMinimoGeneracionPlantilla(plantilla);

  return nivelProgreso >= nivelMinimo;
}

// Falla de forma explícita cuando un sistema intenta
// generar una plantilla antes de su desbloqueo.
//
// Esta validación funciona como última barrera,
// aunque el sistema llamador ya haya filtrado candidatos.
export function validarPlantillaDisponible({
  plantilla,
  idObjeto = null,
  nivelProgreso,
  contexto = "la generación de objetos",
} = {}) {
  validarNivelProgreso(nivelProgreso);

  const nivelMinimo = obtenerNivelMinimoGeneracionPlantilla(plantilla);

  if (nivelProgreso >= nivelMinimo) {
    return true;
  }

  const nombreObjeto = obtenerNombrePlantilla({
    plantilla,
    idObjeto,
  });

  throw new Error(
    `${contexto} no puede generar "${nombreObjeto}" ` +
      `con progreso ${nivelProgreso}. ` +
      `La plantilla requiere nivel ${nivelMinimo}.`,
  );
}

// Filtra una lista de candidatos ponderados.
//
// Cada candidato debe poseer:
//
// {
//     "id": "espada_larga",
//     "peso": 10
// }
//
// La función conserva el objeto candidato completo,
// por lo que futuros campos adicionales no se pierden.
export function filtrarCandidatosPorNivel({
  candidatos,
  configuracionObjetos,
  nivelProgreso,
} = {}) {
  if (!Array.isArray(candidatos)) {
    throw new Error(
      "Los candidatos de objetos deben estar dentro de una lista.",
    );
  }

  validarConfiguracionObjetos(configuracionObjetos);
  validarNivelProgreso(nivelProgreso);

  const disponibles = [];
  const bloqueados = [];

  candidatos.forEach((candidato, indice) => {
    validarCandidato({
      candidato,
      indice,
    });

    const idObjeto = candidato.id.trim().toLowerCase();

    const plantilla = configuracionObjetos[idObjeto];

    if (!plantilla) {
      throw new Error(
        `El candidato "${idObjeto}" no existe ` +
          "en la configuración de objetos.",
      );
    }

    const nivelMinimo = obtenerNivelMinimoGeneracionPlantilla(plantilla);

    const detalle = {
      ...candidato,
      id: idObjeto,
      nivelMinimoGeneracion: nivelMinimo,
    };

    if (
      puedeGenerarsePlantilla({
        plantilla,
        nivelProgreso,
      })
    ) {
      disponibles.push(detalle);
    } else {
      bloqueados.push(detalle);
    }
  });

  return {
    disponibles,
    bloqueados,
  };
}

// Devuelve un resumen simple para consola,
// validaciones y futuras herramientas de balance.
export function crearResumenDisponibilidadObjetos({
  configuracionObjetos,
  nivelProgreso,
} = {}) {
  validarConfiguracionObjetos(configuracionObjetos);
  validarNivelProgreso(nivelProgreso);

  return Object.entries(configuracionObjetos)
    .map(([idObjeto, plantilla]) => {
      const nivelMinimo = obtenerNivelMinimoGeneracionPlantilla(plantilla);

      return {
        idObjeto,
        nombre: plantilla.nombre ?? idObjeto,
        tipo: plantilla.tipo ?? "desconocido",
        tier: plantilla.tierBase ?? 1,
        nivelMinimo,
        disponible: nivelProgreso >= nivelMinimo,
      };
    })
    .sort(
      (entradaA, entradaB) =>
        entradaA.nivelMinimo - entradaB.nivelMinimo ||
        entradaA.idObjeto.localeCompare(entradaB.idObjeto),
    );
}

function obtenerNombrePlantilla({ plantilla, idObjeto }) {
  if (typeof plantilla.nombre === "string" && plantilla.nombre.trim() !== "") {
    return plantilla.nombre.trim();
  }

  if (typeof idObjeto === "string" && idObjeto.trim() !== "") {
    return idObjeto.trim().toLowerCase();
  }

  return "objeto desconocido";
}

function validarPlantilla(plantilla) {
  if (
    plantilla === null ||
    typeof plantilla !== "object" ||
    Array.isArray(plantilla)
  ) {
    throw new Error("Se necesita una plantilla de objeto válida.");
  }
}

function validarConfiguracionObjetos(configuracionObjetos) {
  if (
    configuracionObjetos === null ||
    typeof configuracionObjetos !== "object" ||
    Array.isArray(configuracionObjetos)
  ) {
    throw new Error("Se necesita una configuración de objetos válida.");
  }
}

function validarNivelProgreso(nivelProgreso) {
  if (!Number.isInteger(nivelProgreso) || nivelProgreso < 1) {
    throw new Error(
      "El nivel de progreso debe ser un entero mayor o igual que 1.",
    );
  }
}

function validarCandidato({ candidato, indice }) {
  if (
    candidato === null ||
    typeof candidato !== "object" ||
    Array.isArray(candidato)
  ) {
    throw new Error(`El candidato ${indice + 1} no es válido.`);
  }

  if (typeof candidato.id !== "string" || candidato.id.trim() === "") {
    throw new Error(`El candidato ${indice + 1} necesita un ID de objeto.`);
  }

  if (!Number.isFinite(candidato.peso) || candidato.peso <= 0) {
    throw new Error(
      `El peso del candidato "${candidato.id}" ` + "debe ser mayor que 0.",
    );
  }
}
