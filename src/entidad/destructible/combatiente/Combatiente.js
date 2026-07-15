// Combatiente hereda la capacidad de recibir daño
// desde la clase Destructible.
import { Destructible } from "../Destructible.js";

// Un Combatiente es una entidad destructible que además:
//
// - Tiene atributos de D&D.
// - Puede realizar ataques.
// - Puede tener nivel.
// - Puede utilizar armas o ataques naturales.
export class Combatiente extends Destructible {
    constructor({
        nombre,
        nivel = 1,
        x = 0,
        y = 0,
        simbolo = "?",
        atributos,
        vidaMaxima,
        dadoDanio,
        atributoAtaque,
        bonificadorArmadura = 0
    }) {
        // Destructible guarda nombre, posición, símbolo,
        // vida y Clase de Armadura básica.
        super({
            nombre,
            x,
            y,
            simbolo,
            vidaMaxima,

            // La Clase de Armadura inicial de un combatiente
            // comienza en 10, siguiendo el modelo de D&D.
            claseArmadura: 10
        });

        // Nivel del combatiente.
        this.nivel = nivel;

        // Copiamos sus seis atributos de D&D.
        this.atributos = {
            ...atributos
        };

        // Cantidad de caras del dado utilizado para causar daño.
        //
        // Por ejemplo:
        // 4 representa 1d4.
        // 6 representa 1d6.
        this.dadoDanio = dadoDanio;

        // Atributo utilizado para atacar.
        //
        // Puede ser "fuerza", "destreza" u otro
        // cuando agreguemos magia.
        this.atributoAtaque = atributoAtaque;

        // Bonificación producida por armaduras,
        // escudos u otros efectos.
        this.bonificadorArmadura = bonificadorArmadura;
    }

    // Convierte un atributo de D&D en su modificador.
    //
    // Ejemplos:
    // 10 produce 0.
    // 12 produce +1.
    // 14 produce +2.
    // 8 produce -1.
    obtenerModificador(nombreAtributo) {
        const valorAtributo =
            this.atributos[nombreAtributo];

        // Informamos un error cuando se solicita
        // un atributo que no existe.
        if (valorAtributo === undefined) {
            throw new Error(
                `${this.nombre} no tiene el atributo "${nombreAtributo}".`
            );
        }

        // Fórmula de modificadores inspirada en D&D.
        return Math.floor(
            (valorAtributo - 10) / 2
        );
    }

    // Calcula la Clase de Armadura del combatiente.
    //
    // CA = 10 + Destreza + armadura.
    //
    // Este método reemplaza al getter claseArmadura
    // heredado desde Destructible.
    get claseArmadura() {
        return (
            this.claseArmaduraBase +
            this.obtenerModificador("destreza") +
            this.bonificadorArmadura
        );
    }

    // Obtiene el modificador utilizado en sus ataques.
    get bonificadorAtaque() {
        return this.obtenerModificador(
            this.atributoAtaque
        );
    }

    // Para una criatura, no estar destruida significa estar viva.
    get estaVivo() {
        return !this.estaDestruido;
    }

    // Simula el lanzamiento de un dado.
    //
    // Por ejemplo:
    // tirarDado(20) devuelve un número entre 1 y 20.
    // tirarDado(6) devuelve un número entre 1 y 6.
    tirarDado(cantidadCaras) {
        return Math.floor(
            Math.random() * cantidadCaras
        ) + 1;
    }

    // Realiza un ataque contra cualquier entidad destructible.
    //
    // El objetivo puede ser:
    // - Un enemigo.
    // - El jugador.
    // - Un barril.
    // - Una puerta.
    // - Cualquier objeto que herede de Destructible.
    atacar(objetivo) {
        // Evitamos atacar algo que ya fue destruido.
        if (objetivo.estaDestruido) {
            return {
                impacto: false,
                critico: false,
                danio: 0,
                objetivoDestruido: true,
                mensaje:
                    `${objetivo.nombre} ya está destruido.`
            };
        }

        // Tiramos un dado de veinte caras para determinar
        // si el ataque logra impactar.
        const tiradaAtaque = this.tirarDado(20);

        // Sumamos el modificador del atributo usado para atacar.
        //
        // Por ejemplo, el jugador puede utilizar Fuerza.
        const ataqueTotal =
            tiradaAtaque + this.bonificadorAtaque;

        // Un resultado natural de 1 siempre falla.
        const falloAutomatico =
            tiradaAtaque === 1;

        // Un resultado natural de 20 siempre impacta
        // y se considera un golpe crítico.
        const golpeCritico =
            tiradaAtaque === 20;

        // El ataque impacta cuando alcanza o supera
        // la Clase de Armadura del objetivo.
        const impacto =
            !falloAutomatico &&
            (
                golpeCritico ||
                ataqueTotal >= objetivo.claseArmadura
            );

        // Si el ataque falla, devolvemos el resultado
        // sin modificar la vida del objetivo.
        if (!impacto) {
            return {
                impacto: false,
                critico: false,
                danio: 0,
                objetivoDestruido: false,

                mensaje:
                    `${this.nombre} falla su ataque contra ` +
                    `${objetivo.nombre}.`
            };
        }

        // Tiramos el dado de daño del atacante.
        //
        // Si dadoDanio vale 6, tiramos 1d6.
        let danio =
            this.tirarDado(this.dadoDanio) +
            this.bonificadorAtaque;

        // Un golpe crítico agrega otro dado de daño.
        //
        // El modificador de Fuerza o Destreza
        // no se vuelve a sumar.
        if (golpeCritico) {
            danio += this.tirarDado(
                this.dadoDanio
            );
        }

        // Todo ataque exitoso causa al menos 1 punto de daño.
        danio = Math.max(
            1,
            danio
        );

        // Aplicamos el daño utilizando el método
        // heredado desde Destructible.
        objetivo.recibirDanio(danio);

        // Devolvemos toda la información del ataque.
        return {
            impacto: true,
            critico: golpeCritico,
            danio: danio,
            objetivoDestruido:
                objetivo.estaDestruido,

            mensaje:
                `${this.nombre} ataca a ${objetivo.nombre}` +
                ` y causa ${danio} de daño.`
        };
    }
}