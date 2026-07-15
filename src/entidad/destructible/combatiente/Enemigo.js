// Importamos Combatiente porque todos los enemigos
// pueden recibir daño y realizar ataques.
import { Combatiente } from "./Combatiente.js";

// Enemigo representa cualquier criatura hostil.
//
// Rata, goblin y esqueleto serán diferentes objetos
// construidos utilizando esta misma clase.
export class Enemigo extends Combatiente {
    constructor({
        nombre,
        nivel = 1,
        x = 0,
        y = 0,
        atributos,
        vidaMaxima,
        dadoDanio,
        atributoAtaque,
        simbolo = "E",
        experienciaOtorgada = 0
    } = {}) {
        // Enviamos a Combatiente toda la información
        // que comparten el jugador y los enemigos.
        super({
            nombre,
            nivel,
            x,
            y,
            atributos,
            vidaMaxima,
            dadoDanio,
            atributoAtaque,
            simbolo
        });

        // Experiencia entregada al derrotar al enemigo.
        this.experienciaOtorgada =
            experienciaOtorgada;
    }
}