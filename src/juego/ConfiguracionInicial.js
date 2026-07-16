// Importamos las clases necesarias para crear
// los elementos iniciales de la partida.
import { Player } from
    "../entidad/destructible/combatiente/Player.js";

// Importamos la fábrica encargada de crear enemigos
// a partir de sus plantillas, niveles y variantes.
import {
  crearEnemigo
} from "./FabricaEnemigos.js";



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
 * Crea al jugador utilizando los datos seleccionados
 * dentro de la pantalla de creación del personaje.
 *
 * @param {Object} datosPersonaje Información generada por el menú.
 * @param {string} datosPersonaje.nombre Nombre elegido.
 * @param {string} datosPersonaje.clasePersonaje Profesión visible.
 * @param {Object} datosPersonaje.atributos Atributos distribuidos.
 * @returns {Player} Nuevo personaje controlado por el jugador.
 */

function crearJugadorInicial(datosPersonaje) {
  // Comprobamos que la función haya recibido
  // la información necesaria para crear al jugador.
  if (
    datosPersonaje === null ||
    typeof datosPersonaje !== "object"
  ) {
    throw new Error(
      "Se necesitan los datos del personaje para iniciar la partida."
    );
  }

  // Extraemos los valores elegidos dentro del menú.
  const {
    nombre,
    clasePersonaje,
    atributos
  } = datosPersonaje;

  return new Player({
    // Información elegida por el jugador.
    nombre,
    clasePersonaje,
    atributos,

    // Valores iniciales comunes a todas las profesiones.
    //
    // Por ahora Guerrero, Rogue y Mago solamente
    // funcionan como títulos y no cambian estas estadísticas.
    nivel: 1,
    experiencia: 0,

    // Posición inicial dentro del mapa.
    x: 2,
    y: 2,

    // Información de combate inicial.
    //
    // Por ahora todas las profesiones atacan utilizando Fuerza.
    // Más adelante cada profesión podrá tener su propio ataque.
    vidaMaxima: 12,
    dadoDanio: 6,
    atributoAtaque: "fuerza",
    bonificadorArmadura: 0
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

/**
 * Crea todos los elementos necesarios
 * para comenzar una partida nueva.
 *
 * @param {Object} datosPersonaje Datos elegidos
 * en la creación del personaje.
 * @param {Object} configuracionEnemigos Plantillas
 * y variantes cargadas desde JSON.
 * @returns {Object} Configuración completa de la partida.
 */
export function crearConfiguracionInicial(
  datosPersonaje,
  configuracionEnemigos
) {
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
        datosPersonaje
      ),

    // Creamos enemigos mediante sus plantillas JSON
    // y los objetos mediante sus clases actuales.
    objetivos:
      crearObjetivosIniciales(
        configuracionEnemigos
      )
  };
}