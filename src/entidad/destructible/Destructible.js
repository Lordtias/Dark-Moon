// Importamos Entidad porque todo objeto destructible
// también es una entidad presente en el mapa.
import { Entidad } from "../Entidad.js";

// Destructible representa cualquier entidad que pueda
// recibir daño y eventualmente ser destruida.
//
// Puede ser un combatiente, una puerta, un barril,
// un cofre o cualquier otro objeto rompible.
export class Destructible extends Entidad {
    constructor({
        nombre,
        x = 0,
        y = 0,
        simbolo = "?",
        vidaMaxima,
        claseArmadura = 10
    }) {
        // Entidad se encarga de guardar nombre, posición y símbolo.
        super({
            nombre,
            x,
            y,
            simbolo
        });

        // Cantidad máxima de puntos de vida o integridad.
        this.vidaMaxima = vidaMaxima;

        // Toda entidad destructible comienza con su vida completa.
        this.vidaActual = vidaMaxima;

        // Dificultad básica para impactar a esta entidad.
        //
        // En D&D los objetos también pueden tener
        // Clase de Armadura y puntos de golpe.
        this.claseArmaduraBase = claseArmadura;
    }

    // Devuelve la Clase de Armadura actual.
    //
    // Combatiente podrá reemplazar este cálculo para
    // agregar el modificador de Destreza y armaduras.
    get claseArmadura() {
        return this.claseArmaduraBase;
    }

    // Devuelve true cuando la entidad ya no tiene vida.
    get estaDestruido() {
        return this.vidaActual <= 0;
    }

    // Reduce la vida o integridad del objeto.
    recibirDanio(cantidad) {
        // Convertimos el daño a un entero y evitamos valores negativos.
        const danioFinal = Math.max(
            0,
            Math.floor(cantidad)
        );

        // Reducimos la vida sin permitir que sea menor que cero.
        this.vidaActual = Math.max(
            0,
            this.vidaActual - danioFinal
        );

        // Devolvemos el daño aplicado.
        return danioFinal;
    }
}