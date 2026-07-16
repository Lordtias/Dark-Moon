// Importamos Entidad porque todo objeto destructible
// también es una entidad presente en el mapa.
import { Entidad } from "../Entidad.js";

// Un destructible puede albergar objetos,
// como ocurre con un cofre o ciertos enemigos.
import { ContenedorObjetos } from
    "../../objetos/ContenedorObjetos.js";

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
        claseArmadura = 10,

        // Cero indica que esta entidad no funciona
        // como contenedor de objetos.
        capacidadContenedor = 0,

        objetosIniciales = [],

        // La tabla de botín se interpretará más adelante
        // mediante un sistema especializado.
        tablaBotin = []
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

        // La capacidad cero es válida porque no todos
        // los destructibles pueden almacenar objetos.
        if (
            !Number.isInteger(capacidadContenedor) ||
            capacidadContenedor < 0
        ) {
            throw new Error(
                `La capacidad del contenedor de ${nombre} ` +
                "debe ser un entero igual o mayor que 0."
            );
        }

        if (!Array.isArray(objetosIniciales)) {
            throw new Error(
                `Los objetos iniciales de ${nombre} ` +
                "deben ser una lista."
            );
        }

        if (!Array.isArray(tablaBotin)) {
            throw new Error(
                `La tabla de botín de ${nombre} ` +
                "debe ser una lista."
            );
        }

        // Creamos el contenedor solamente cuando
        // la entidad realmente necesita almacenar objetos.
        this.contenedorObjetos =
            capacidadContenedor > 0
                ? new ContenedorObjetos({
                    capacidad: capacidadContenedor,
                    objetosIniciales
                })
                : null;

        // Guardamos una copia independiente.
        //
        // Más adelante GeneradorBotin será responsable
        // de interpretar probabilidades y cantidades.
        this.tablaBotin = tablaBotin.map(
            (entrada) => ({
                ...entrada
            })
        );
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