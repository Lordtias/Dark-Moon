import { Barril } from "../entidad/destructible/Barril.js";

// Centraliza la relación entre los IDs utilizados
// en Mapas.json y las clases reales del juego.
//
// Cuando agreguemos cofres, lápidas, cajas u otros
// destructibles, solamente habrá que registrarlos aquí.
const CREADORES_DESTRUCTIBLES = {
  barril({ x, y }) {
    return new Barril({
      x,
      y,
    });
  },
};

// Crea un destructible a partir de su ID configurado.
export function crearDestructible({ id, x, y } = {}) {
  if (typeof id !== "string" || id.trim() === "") {
    throw new Error("Se necesita un ID válido para crear un destructible.");
  }

  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new Error(
      `La posición del destructible "${id}" debe utilizar enteros.`,
    );
  }

  const creador = CREADORES_DESTRUCTIBLES[id];

  if (!creador) {
    throw new Error(`No existe una fábrica para el destructible "${id}".`);
  }

  return creador({
    x,
    y,
  });
}
