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

function validarNivelProgreso(nivelProgreso) {
  if (!Number.isInteger(nivelProgreso) || nivelProgreso < 1) {
    throw new Error(
      "El nivel de progreso debe ser un entero mayor o igual que 1.",
    );
  }
}
