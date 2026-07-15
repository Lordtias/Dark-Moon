// Un barril es una entidad destructible,
// pero no es un combatiente.
import { Destructible } from "./Destructible.js";

// Esta clase representa un barril que puede ser atacado.
export class Barril extends Destructible {
    constructor({
        x,
        y
    } = {}) {
        // Definimos aquí las características comunes
        // de todos los barriles.
        super({
            nombre: "Barril",
            x,
            y,

            // B representa temporalmente al barril en el mapa.
            simbolo: "B",

            // El barril tiene 6 puntos de integridad.
            vidaMaxima: 6,

            // Es relativamente sencillo impactarlo.
            claseArmadura: 10
        });
    }
}