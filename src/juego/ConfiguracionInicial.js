// Importamos las clases necesarias para crear
// los elementos iniciales de la partida.
import { Player } from
    "../entidad/destructible/combatiente/Player.js";

import { Enemigo } from
    "../entidad/destructible/combatiente/Enemigo.js";

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

// Crea todos los enemigos y objetos destructibles
// con los que comienza una partida nueva.
function crearObjetivosIniciales() {
    // Creamos una rata utilizando la clase
    // genérica Enemigo.
    const rata = new Enemigo({
        nombre: "Rata",
        nivel: 1,
        x: 10,
        y: 4,

        vidaMaxima: 5,
        dadoDanio: 4,
        atributoAtaque: "fuerza",

        simbolo: "r",
        experienciaOtorgada: 10,

        atributos: {
            fuerza: 10,
            destreza: 14,
            constitucion: 8,
            inteligencia: 2,
            sabiduria: 10,
            carisma: 4
        }
    });

    // Creamos un barril destructible.
    //
    // Puede recibir daño, pero no puede atacar.
    const barril = new Barril({
        x: 6,
        y: 4
    });

    // Todos los elementos atacables se guardan
    // dentro de una misma lista.
    return [
        rata,
        barril
    ];
}

/**
 * Crea todos los elementos necesarios para comenzar
 * una partida nueva.
 *
 * @param {Object} datosPersonaje Datos seleccionados
 * dentro de la creación del personaje.
 * @returns {Object} Configuración completa de la partida.
 */
export function crearConfiguracionInicial(
  datosPersonaje
) {
  return {
    // Creamos una copia del array para evitar que
    // una partida modifique el mapa original.
    map: [...MAPA_INICIAL],

    // Creamos al jugador utilizando el nombre,
    // profesión y atributos elegidos en el menú.
    player: crearJugadorInicial(
      datosPersonaje
    ),

    // Los enemigos y objetos todavía utilizan
    // sus configuraciones predeterminadas.
    objetivos: crearObjetivosIniciales()
  };
}