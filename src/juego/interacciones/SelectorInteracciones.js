import { seleccionarPosicionEnDireccion } from "../espacio/SelectorDireccionalCuadricula.js";

// Convierte una lista de interacciones ordenadas
// en una lista de entidades seleccionables.
//
// Una entidad puede ofrecer varias interacciones:
//
// - Hablar.
// - Comerciar.
// - Entregar misión.
//
// Aun así, debe aparecer una sola vez en el selector.
export function crearOpcionesInteraccion(interacciones) {
  if (!Array.isArray(interacciones)) {
    throw new Error("Las interacciones deben estar dentro de una lista.");
  }

  const opcionesPorEntidad = new Map();

  for (const interaccion of interacciones) {
    validarInteraccion(interaccion);

    const entidad = interaccion.entidad;

    if (!opcionesPorEntidad.has(entidad)) {
      opcionesPorEntidad.set(entidad, {
        entidad,

        // Como las interacciones ya llegan ordenadas
        // por SistemaInteracciones, la primera es
        // la prioritaria para esa entidad.
        interaccionPrioritaria: interaccion,

        interacciones: [],

        x: entidad.x,

        y: entidad.y,

        orden: opcionesPorEntidad.size,
      });
    }

    opcionesPorEntidad.get(entidad).interacciones.push(interaccion);
  }

  return [...opcionesPorEntidad.values()];
}

// Busca la mejor opción disponible
// en la dirección indicada.
//
// La geometría de navegación es compartida con otros selectores discretos.
// Este módulo conserva únicamente la validación propia de las opciones de
// interacción y delega la elección espacial a la primitiva canónica.
export function seleccionarOpcionEnDireccion({
  opciones,
  opcionActual,
  movimientoX,
  movimientoY,
} = {}) {
  validarOpciones(opciones);

  const siguiente = seleccionarPosicionEnDireccion({
    posiciones: opciones,
    posicionActual: opcionActual,
    movimientoX,
    movimientoY,
  });

  return siguiente;
}

function validarOpciones(opciones) {
  if (!Array.isArray(opciones)) {
    throw new Error(
      "Las opciones de interacción deben estar dentro de una lista.",
    );
  }

  for (const opcion of opciones) {
    if (
      !opcion ||
      typeof opcion !== "object" ||
      !opcion.entidad ||
      !Number.isInteger(opcion.x) ||
      !Number.isInteger(opcion.y)
    ) {
      throw new Error("Existe una opción de interacción inválida.");
    }
  }
}

function validarInteraccion(interaccion) {
  if (
    !interaccion ||
    typeof interaccion !== "object" ||
    !interaccion.entidad ||
    !Number.isInteger(interaccion.entidad.x) ||
    !Number.isInteger(interaccion.entidad.y)
  ) {
    throw new Error("Existe una interacción sin una entidad válida.");
  }
}
