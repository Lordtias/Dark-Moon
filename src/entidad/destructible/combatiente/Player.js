// Importamos Combatiente porque el jugador puede:
//
// - Recibir daño.
// - Atacar.
// - Tener atributos de D&D.
// - Tener una posición dentro del mapa.
import { Combatiente } from "./Combatiente.js";

// Player representa exclusivamente al personaje controlado
// por la persona que está jugando.
//
// Hereda de Combatiente:
//
// - Nombre.
// - Posición.
// - Símbolo.
// - Nivel.
// - Atributos.
// - Vida.
// - Clase de Armadura.
// - Capacidad de atacar y recibir daño.
export class Player extends Combatiente {
    constructor({
        nombre,
        nivel = 1,
        x = 0,
        y = 0,
        atributos,
        vidaMaxima,
        dadoDanio,
        atributoAtaque,
        bonificadorArmadura = 0,
        clasePersonaje = "Aventurero",
        experiencia = 0
    }) {
        // Llamamos al constructor de Combatiente.
        //
        // Combatiente se encargará de crear toda la parte común:
        // vida, atributos, ataque, defensa, posición, etc.
        super({
            nombre,
            nivel,
            x,
            y,
            atributos,
            vidaMaxima,
            dadoDanio,
            atributoAtaque,
            bonificadorArmadura,

            // El símbolo temporal del jugador será @.
            //
            // Más adelante este símbolo podrá reemplazarse
            // por un sprite sin cambiar la lógica del Player.
            simbolo: "@"
        });

        // Clase de rol elegida por el jugador.
        //
        // Por ahora es solamente un texto.
        // Más adelante podrá definir habilidades,
        // dados de vida, equipamiento y progresión.
        this.clasePersonaje = clasePersonaje;

        // Cantidad de experiencia acumulada.
        this.experiencia = experiencia;
    }
}