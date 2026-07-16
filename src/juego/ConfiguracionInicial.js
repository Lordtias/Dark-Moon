// Importamos las clases necesarias para crear
// los elementos iniciales de la partida.
import { Player } from
    "../entidad/destructible/combatiente/Player.js";

// Importamos la fábrica encargada de crear enemigos
// a partir de sus plantillas, niveles y variantes.
import {
  crearEnemigo
} from "./FabricaEnemigos.js";

// Convierte los identificadores escritos en JSON
// en instancias reales de Objeto.
import {
  crearObjetosDesdeDefiniciones
} from "../objetos/FabricaObjetos.js";

import { Barril } from
    "../entidad/destructible/Barril.js";

// Tamaño en píxeles de cada casilla del mapa.
//
// Lo exportamos porque el renderizador necesitará
// utilizar este mismo valor para dibujar el juego.
export const TILE_SIZE = 32;

// Mapa con el que comienza una partida nueva.
//
// # representa una pared.
// . representa una casilla caminable.
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
    "####################"
];

/**
 * Crea al jugador utilizando los datos seleccionados,
 * la profesión y las plantillas de objetos.
 *
 * @param {Object} datosPersonaje Datos elegidos en el menú.
 * @param {Object} configuracionPersonaje Configuración de profesiones.
 * @param {Object} configuracionObjetos Plantillas de objetos.
 * @returns {Player} Jugador creado.
 */
function crearJugadorInicial(
  datosPersonaje,
  configuracionPersonaje,
  configuracionObjetos
) {
  if (
    datosPersonaje === null ||
    typeof datosPersonaje !== "object"
  ) {
    throw new Error(
      "Se necesitan los datos del personaje para iniciar la partida."
    );
  }

  const {
    nombre,
    idProfesion,
    clasePersonaje,
    atributos
  } = datosPersonaje;

  // Buscamos la configuración completa
  // de la profesión seleccionada.
  const profesion =
    configuracionPersonaje
      .profesiones[idProfesion];

  if (!profesion) {
    throw new Error(
      `No existe la profesión "${idProfesion}".`
    );
  }

  // Configuración de objetos guardados.
  const configuracionContenedor =
    profesion.contenedor ?? {};

  // Configuración de objetos equipados.
  const configuracionEquipamiento =
    profesion.equipamiento ?? {};

  // Convertimos los IDs del inventario
  // en instancias reales de Objeto.
  const objetosInventarioIniciales =
    crearObjetosDesdeDefiniciones({
      configuracionObjetos,

      definiciones:
        configuracionContenedor
          .objetosIniciales ?? []
    });

  // Convertimos los IDs del equipamiento
  // en instancias reales de Objeto.
  const equipamientoInicial =
    crearObjetosDesdeDefiniciones({
      configuracionObjetos,

      definiciones:
        configuracionEquipamiento
          .objetosIniciales ?? []
    });

  return new Player({
    nombre,
    clasePersonaje,
    atributos,

    nivel: 1,
    experiencia: 0,

    x: 2,
    y: 2,

    vidaMaxima: 12,
    dadoDanio: 6,
    atributoAtaque: "fuerza",
    bonificadorArmadura: 0,

    // Capacidad configurada para la profesión.
    capacidadInventario:
      configuracionContenedor.capacidad ?? 12,

    // Objetos guardados.
    objetosInventarioIniciales,

    // Objetos que Equipamiento colocará
    // automáticamente según sus ranuras compatibles.
    equipamientoInicial
  });
}

/**
 * Crea los enemigos y objetos presentes
 * cuando comienza una partida nueva.
 *
 * @param {Object} configuracionEnemigos Plantillas y variantes
 * de enemigos cargadas desde los archivos JSON.
 * @returns {Array<Object>} Enemigos y objetos iniciales.
 */
function crearObjetivosIniciales(
  configuracionEnemigos
) {
  // La rata ya no contiene sus estadísticas escritas aquí.
  //
  // La fábrica buscará la plantilla "rata" dentro de
  // enemigos.json y calculará sus valores según el nivel.
  const rata = crearEnemigo({
    configuracionEnemigos,
    idPlantilla: "rata",

    // Por ahora conservamos una rata normal de nivel 1
    // para no modificar la dificultad de la partida.
    nivel: 1,
    idVariante: null,

    // Posición inicial dentro del mapa.
    x: 10,
    y: 4
  });

  // El barril todavía se crea directamente.
  // Lo trasladaremos a su propia plantilla más adelante.
  const barril = new Barril({
    x: 6,
    y: 4
  });

  return [
    rata,
    barril
  ];
}


export function crearConfiguracionInicial({
  datosPersonaje,
  configuracionPersonaje,
  configuracionEnemigos,
  configuracionObjetos
} = {}) {
  return {
    // Creamos una copia del mapa inicial para evitar
    // modificar accidentalmente el array original.
    map: [
      ...MAPA_INICIAL
    ],

    // Creamos al jugador con la información
    // seleccionada dentro del menú.
    player:
      crearJugadorInicial(
        datosPersonaje,
        configuracionPersonaje,
        configuracionObjetos
      ),

    // Creamos enemigos mediante sus plantillas JSON
    // y los objetos mediante sus clases actuales.
    objetivos:
      crearObjetivosIniciales(
        configuracionEnemigos
      )
  };
}