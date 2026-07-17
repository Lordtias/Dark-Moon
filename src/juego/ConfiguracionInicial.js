import { Player } from "../entidad/destructible/combatiente/Player.js";

import { crearEnemigo } from "./FabricaEnemigos.js";

import { crearObjetosDesdeDefiniciones } from "../objetos/FabricaObjetos.js";

import { Barril } from "../entidad/destructible/Barril.js";

// Tamaño en píxeles de cada casilla.
export const TILE_SIZE = 32;

const MAPA_INICIAL = [
  "####################",
  "#..................#",
  "#..######..........#",
  "#..............###.#",
  "#..................#",
  "#....####..........#",
  "#..................#",
  "#..........#####...#",
  "#..................#",
  "#..####............#",
  "#..................#",
  "####################",
];

// Crea al jugador con la profesión seleccionada
// y sus objetos iniciales.
function crearJugadorInicial(
  datosPersonaje,
  configuracionPersonaje,
  configuracionObjetos,
) {
  if (datosPersonaje === null || typeof datosPersonaje !== "object") {
    throw new Error(
      "Se necesitan los datos del personaje " + "para iniciar la partida.",
    );
  }

  const { nombre, idProfesion, clasePersonaje, atributos } = datosPersonaje;

  const profesion = configuracionPersonaje.profesiones[idProfesion];

  if (!profesion) {
    throw new Error(`No existe la profesión "${idProfesion}".`);
  }

  if (!profesion.estadisticasBase) {
    throw new Error(
      `La profesión "${idProfesion}" no tiene ` + "estadísticas base.",
    );
  }

  const configuracionContenedor = profesion.contenedor ?? {};

  const configuracionEquipamiento = profesion.equipamiento ?? {};

  const objetosInventarioIniciales = crearObjetosDesdeDefiniciones({
    configuracionObjetos,

    definiciones: configuracionContenedor.objetosIniciales ?? [],
  });

  const equipamientoInicial = crearObjetosDesdeDefiniciones({
    configuracionObjetos,

    definiciones: configuracionEquipamiento.objetosIniciales ?? [],
  });

  return new Player({
    nombre,
    clasePersonaje,
    atributos,

    // La profesión define ahora sus estadísticas.
    estadisticasBase: profesion.estadisticasBase,

    // Permite que una profesión pueda modificar
    // su ataque natural en el futuro.
    ataqueNatural: profesion.ataqueNatural ?? null,

    nivel: 1,
    experiencia: 0,
    x: 2,
    y: 2,

    capacidadInventario: configuracionContenedor.capacidad ?? 12,

    objetosInventarioIniciales,
    equipamientoInicial,
  });
}

// Crea enemigos y destructibles iniciales.
function crearObjetivosIniciales(configuracionEnemigos) {
  const rata = crearEnemigo({
    configuracionEnemigos,
    idPlantilla: "rata",
    nivel: 1,
    idVariante: null,
    x: 10,
    y: 4,
  });

  const barril = new Barril({
    x: 6,
    y: 4,
  });

  return [rata, barril];
}

export function crearConfiguracionInicial({
  datosPersonaje,
  configuracionPersonaje,
  configuracionEnemigos,
  configuracionObjetos,
} = {}) {
  return {
    map: [...MAPA_INICIAL],

    player: crearJugadorInicial(
      datosPersonaje,
      configuracionPersonaje,
      configuracionObjetos,
    ),

    objetivos: crearObjetivosIniciales(configuracionEnemigos),
  };
}
