import { Player } from "../entidad/destructible/combatiente/Player.js";

import { crearEnemigo } from "./FabricaEnemigos.js";

import { crearObjetosDesdeDefiniciones } from "../objetos/FabricaObjetos.js";

import { Barril } from "../entidad/destructible/Barril.js";

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

function crearJugadorInicial(
  datosPersonaje,
  configuracionPersonaje,
  configuracionObjetos,
) {
  if (datosPersonaje === null || typeof datosPersonaje !== "object") {
    throw new Error(
      "Se necesitan los datos del personaje para iniciar la partida.",
    );
  }

  const { nombre, idProfesion, clasePersonaje, atributos } = datosPersonaje;

  const profesion = configuracionPersonaje.profesiones[idProfesion];

  if (!profesion) {
    throw new Error(`No existe la profesión "${idProfesion}".`);
  }

  if (!profesion.estadisticasBase) {
    throw new Error(
      `La profesión "${idProfesion}" no tiene estadísticas base.`,
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

    estadisticasBase: profesion.estadisticasBase,

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

// Crea todos los objetivos iniciales.
//
// El botín continúa fuera de este hito.
function crearObjetivosIniciales(configuracionEnemigos, configuracionObjetos) {
  const rata = crearEnemigo({
    configuracionEnemigos,
    configuracionObjetos,

    idPlantilla: "rata",
    nivel: 1,
    idVariante: null,

    x: 10,
    y: 6,
  });

  const esqueletoGuerrero = crearEnemigo({
    configuracionEnemigos,
    configuracionObjetos,

    idPlantilla: "esqueleto_guerrero",

    nivel: 1,
    idVariante: null,

    x: 4,
    y: 4,
  });

  // El muro horizontal situado entre el jugador
  // y este enemigo permite probar que:
  //
  // - La percepción lo activa.
  // - No puede disparar a través de la pared.
  // - Debe buscar una posición con línea de visión.
  const esqueletoRogue = crearEnemigo({
    configuracionEnemigos,
    configuracionObjetos,

    idPlantilla: "esqueleto_rogue",

    nivel: 1,
    idVariante: null,

    x: 10,
    y: 2,
  });

  const barril = new Barril({
    x: 6,
    y: 4,
  });

  return [rata, esqueletoGuerrero, esqueletoRogue, barril];
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

    objetivos: crearObjetivosIniciales(
      configuracionEnemigos,
      configuracionObjetos,
    ),
  };
}
