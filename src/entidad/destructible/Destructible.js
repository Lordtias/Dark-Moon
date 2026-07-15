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
    } = {}) {
        // La vida máxima debe ser un número entero
        // y debe ser mayor que cero.
        if (
            !Number.isInteger(vidaMaxima) ||
            vidaMaxima <= 0
        ) {
            throw new Error(
                `${nombre ?? "La entidad"} debe tener ` +
                "una vida máxima entera mayor que 0."
            );
        }

        // La Clase de Armadura también debe ser
        // un número entero mayor que cero.
        if (
            !Number.isInteger(claseArmadura) ||
            claseArmadura <= 0
        ) {
            throw new Error(
                `${nombre ?? "La entidad"} debe tener ` +
                "una Clase de Armadura entera mayor que 0."
            );
        }

        // Entidad valida y guarda nombre, posición y símbolo.
        super({
            nombre,
            x,
            y,
            simbolo
        });

        // Cantidad máxima de puntos de vida o integridad.
        this.vidaMaxima = vidaMaxima;

        // Toda entidad destructible comienza
        // con su vida completa.
        this.vidaActual = vidaMaxima;

        // Dificultad básica para impactar a esta entidad.
        this.claseArmaduraBase = claseArmadura;
    }

    // Devuelve la Clase de Armadura actual.
    //
    // Combatiente reemplaza este cálculo para agregar
    // Destreza y bonificaciones de armadura.
    get claseArmadura() {
        return this.claseArmaduraBase;
    }

    // Devuelve true cuando la entidad ya no tiene vida.
    get estaDestruido() {
        return this.vidaActual <= 0;
    }

    // Reduce la vida o integridad del objeto.
    recibirDanio(cantidad) {
        // Evitamos aceptar valores inválidos como:
        //
        // undefined
        // NaN
        // "cinco"
        if (!Number.isFinite(cantidad)) {
            throw new Error(
                `El daño recibido por ${this.nombre} ` +
                "debe ser un número válido."
            );
        }

        // Guardamos la vida antes de aplicar el daño.
        //
        // Esto nos permitirá calcular cuánto daño
        // se aplicó realmente.
        const vidaAntesDelDanio =
            this.vidaActual;

        // Convertimos el daño a un entero
        // y evitamos valores negativos.
        const danioSolicitado = Math.max(
            0,
            Math.floor(cantidad)
        );

        // Reducimos la vida sin permitir
        // que sea menor que cero.
        this.vidaActual = Math.max(
            0,
            this.vidaActual - danioSolicitado
        );

        // Calculamos la cantidad real de vida perdida.
        //
        // Ejemplo:
        //
        // Vida antes: 2
        // Daño solicitado: 10
        // Vida después: 0
        // Daño realmente aplicado: 2
        const danioAplicado =
            vidaAntesDelDanio - this.vidaActual;

        // Devolvemos solamente el daño final
        // que verdaderamente perdió el objetivo.
        return danioAplicado;
    }
}