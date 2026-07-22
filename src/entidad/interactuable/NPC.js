import { Entidad } from "../Entidad.js";

import { TIPOS_INTERACCION } from "../../juego/interacciones/TiposInteraccion.js";

const TIPOS_INTERACCION_VALIDOS = new Set(Object.values(TIPOS_INTERACCION));

// Representa una entidad neutral capaz de ofrecer
// una o varias interacciones al jugador.
//
// La clase no conoce ventanas, comercio ni misiones.
// Solamente describe qué acciones ofrece el NPC.
export class NPC extends Entidad {
  constructor({
    id,
    nombre,
    rol = "npc",
    x = 0,
    y = 0,
    simbolo = "N",
    recursoVisual = null,
    interacciones = [],
  } = {}) {
    super({
      nombre,
      x,
      y,
      simbolo,
    });

    validarId(id);
    validarRol(rol);

    validarRecursoVisual(recursoVisual, nombre);

    if (!Array.isArray(interacciones)) {
      throw new Error(`${nombre} necesita una lista de interacciones.`);
    }

    if (interacciones.length === 0) {
      throw new Error(`${nombre} necesita al menos una interacción.`);
    }

    this.id = id.trim();
    this.rol = rol.trim();

    this.recursoVisual = recursoVisual === null ? null : recursoVisual.trim();

    // Guardamos copias normalizadas para evitar
    // que la configuración externa pueda modificarlas
    // después de crear el NPC.
    this.interacciones = interacciones.map((interaccion) =>
      normalizarInteraccion(interaccion, nombre),
    );
  }

  // Devuelve copias nuevas porque el sistema de
  // interacciones puede agregar información temporal,
  // como la entidad, distancia y orden de selección.
  obtenerInteracciones() {
    return this.interacciones.map((interaccion) => ({
      ...interaccion,
    }));
  }
}

function normalizarInteraccion(interaccion, nombreNpc) {
  if (
    !interaccion ||
    typeof interaccion !== "object" ||
    Array.isArray(interaccion)
  ) {
    throw new Error(`${nombreNpc} contiene una interacción inválida.`);
  }

  if (!TIPOS_INTERACCION_VALIDOS.has(interaccion.tipo)) {
    throw new Error(
      `${nombreNpc} contiene el tipo de interacción ` +
        `"${interaccion.tipo}" que no es válido.`,
    );
  }

  if (
    typeof interaccion.texto !== "string" ||
    interaccion.texto.trim() === ""
  ) {
    throw new Error(`${nombreNpc} necesita un texto de interacción válido.`);
  }

  const alcance = interaccion.alcance ?? 1;

  const prioridad = interaccion.prioridad ?? 0;

  if (!Number.isInteger(alcance) || alcance < 0) {
    throw new Error(
      `El alcance de una interacción de ${nombreNpc} ` +
        "debe ser un entero no negativo.",
    );
  }

  if (!Number.isFinite(prioridad)) {
    throw new Error(
      `La prioridad de una interacción de ${nombreNpc} ` + "debe ser numérica.",
    );
  }

  return {
    ...interaccion,

    texto: interaccion.texto.trim(),

    alcance,
    prioridad,
  };
}

function validarId(id) {
  if (typeof id !== "string" || id.trim() === "") {
    throw new Error("Todo NPC necesita un ID válido.");
  }
}

function validarRol(rol) {
  if (typeof rol !== "string" || rol.trim() === "") {
    throw new Error("Todo NPC necesita un rol válido.");
  }
}

function validarRecursoVisual(recursoVisual, nombre) {
  if (
    recursoVisual !== null &&
    (typeof recursoVisual !== "string" || recursoVisual.trim() === "")
  ) {
    throw new Error(
      `El recurso visual de ${nombre} debe ser una ruta válida o null.`,
    );
  }
}
