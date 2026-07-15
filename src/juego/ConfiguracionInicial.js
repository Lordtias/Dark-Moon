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

// Crea un jugador nuevo con sus valores iniciales.
function crearJugadorInicial() {
    return new Player({
        nombre: "Aventurero",
        nivel: 1,
        x: 2,
        y: 2,

        // Información específica del jugador.
        clasePersonaje: "Guerrero",
        experiencia: 0,

        // Información heredada de Combatiente.
        vidaMaxima: 12,
        dadoDanio: 6,
        atributoAtaque: "fuerza",
        bonificadorArmadura: 0,

        // Atributos inspirados en D&D.
        atributos: {
            fuerza: 15,
            destreza: 12,
            constitucion: 14,
            inteligencia: 10,
            sabiduria: 11,
            carisma: 8
        }
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

// Crea todos los elementos necesarios para comenzar
// una partida nueva.
//
// Cada vez que llamemos esta función recibiremos
// un jugador y objetivos nuevos.
export function crearConfiguracionInicial() {
    return {
        // Creamos una copia del array para evitar que
        // una partida modifique el mapa original.
        map: [...MAPA_INICIAL],

        player: crearJugadorInicial(),

        objetivos: crearObjetivosIniciales()
    };
}