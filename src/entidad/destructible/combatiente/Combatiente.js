// Combatiente hereda la capacidad de recibir daño
// desde la clase Destructible.
import { Destructible } from "../Destructible.js";

// Los combatientes pueden utilizar equipamiento,
// aunque algunos no tengan ninguna ranura disponible.
import { Equipamiento } from
    "../../../objetos/Equipamiento.js";

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
        bonificadorArmadura = 0,
        capacidadContenedor = 0,
        objetosIniciales = [],
        tablaBotin = [],
        ranurasEquipamiento = [],
        equipamientoInicial = []
    } = {}) {
        // Destructible valida y guarda:
        //
        // - Nombre.
        // - Posición.
        // - Símbolo.
        // - Vida máxima.
        // - Clase de Armadura básica.
        super({
            nombre,
            x,
            y,
            simbolo,
            vidaMaxima,

            // La Clase de Armadura inicial de un combatiente
            // comienza en 10.
            claseArmadura: 10,
            capacidadContenedor,
            objetosIniciales,
            tablaBotin
        });

        // El nivel debe ser un número entero
        // igual o mayor que uno.
        if (
            !Number.isInteger(nivel) ||
            nivel < 1
        ) {
            throw new Error(
                `${nombre} debe tener un nivel entero ` +
                "igual o mayor que 1."
            );
        }

        // Comprobamos que atributos sea realmente un objeto.
        if (
            atributos === null ||
            typeof atributos !== "object" ||
            Array.isArray(atributos)
        ) {
            throw new Error(
                `${nombre} debe tener un objeto de atributos.`
            );
        }

        // Estos son los seis atributos que actualmente
        // necesita cualquier combatiente.
        const atributosRequeridos = [
            "fuerza",
            "destreza",
            "constitucion",
            "inteligencia",
            "sabiduria",
            "carisma"
        ];

        // Revisamos individualmente cada atributo.
        for (
            const nombreAtributo
            of atributosRequeridos
        ) {
            // Verificamos que el atributo exista.
            const atributoExiste =
                Object.prototype.hasOwnProperty.call(
                    atributos,
                    nombreAtributo
                );

            if (!atributoExiste) {
                throw new Error(
                    `${nombre} no tiene el atributo ` +
                    `"${nombreAtributo}".`
                );
            }

            const valorAtributo =
                atributos[nombreAtributo];

            // Los atributos deben ser números enteros
            // mayores que cero.
            if (
                !Number.isInteger(valorAtributo) ||
                valorAtributo <= 0
            ) {
                throw new Error(
                    `El atributo "${nombreAtributo}" de ` +
                    `${nombre} debe ser un número entero ` +
                    "mayor que 0."
                );
            }
        }

        // El dado de daño representa la cantidad de caras.
        //
        // Por ejemplo:
        // 4 significa 1d4.
        // 6 significa 1d6.
        if (
            !Number.isInteger(dadoDanio) ||
            dadoDanio < 2
        ) {
            throw new Error(
                `${nombre} debe tener un dado de daño ` +
                "entero de al menos 2 caras."
            );
        }

        // El atributo utilizado para atacar debe ser texto.
        if (
            typeof atributoAtaque !== "string" ||
            atributoAtaque.trim() === ""
        ) {
            throw new Error(
                `${nombre} debe indicar qué atributo ` +
                "utiliza para atacar."
            );
        }

        // Convertimos el nombre del atributo a minúsculas.
        //
        // Así "Fuerza" y "fuerza" pueden interpretarse
        // de la misma manera.
        const atributoAtaqueNormalizado =
            atributoAtaque.trim().toLowerCase();

        // Comprobamos que el atributo elegido para atacar
        // exista dentro de los atributos del combatiente.
        if (
            !Object.prototype.hasOwnProperty.call(
                atributos,
                atributoAtaqueNormalizado
            )
        ) {
            throw new Error(
                `${nombre} intenta atacar utilizando ` +
                `"${atributoAtaqueNormalizado}", pero ese ` +
                "atributo no existe."
            );
        }

        // La bonificación de armadura debe ser
        // un número entero.
        //
        // Permitimos números negativos porque más adelante
        // podría existir alguna penalización.
        if (!Number.isInteger(bonificadorArmadura)) {
            throw new Error(
                `El bonificador de armadura de ${nombre} ` +
                "debe ser un número entero."
            );
        }

        // Nivel del combatiente.
        this.nivel = nivel;

        // Copiamos los atributos para evitar guardar
        // directamente la referencia al objeto recibido.
        this.atributos = {
            ...atributos
        };

        // Cantidad de caras del dado utilizado
        // para causar daño.
        this.dadoDanio = dadoDanio;

        // Atributo utilizado para atacar.
        this.atributoAtaque =
            atributoAtaqueNormalizado;

        // Bonificación producida por armaduras,
        // escudos u otros efectos.
        this.bonificadorArmadura =
            bonificadorArmadura;

        // Cada combatiente posee sus propias ranuras
        // y puede comenzar con objetos ya equipados.
        this.equipamiento = new Equipamiento({
            ranurasDisponibles:
                ranurasEquipamiento,

            objetosIniciales:
                equipamientoInicial
        });
    }

    // Convierte un atributo en su modificador.
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
                `${this.nombre} no tiene el atributo ` +
                `"${nombreAtributo}".`
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

    // Para una criatura, no estar destruida
    // significa estar viva.
    get estaVivo() {
        return !this.estaDestruido;
    }

    // Simula el lanzamiento de un dado.
    tirarDado(cantidadCaras) {
        // Evitamos tirar dados con valores inválidos.
        if (
            !Number.isInteger(cantidadCaras) ||
            cantidadCaras < 2
        ) {
            throw new Error(
                "Un dado debe tener al menos 2 caras."
            );
        }

        return Math.floor(
            Math.random() * cantidadCaras
        ) + 1;
    }

    // Realiza un ataque contra cualquier entidad destructible.
    atacar(objetivo) {
        // Un combatiente muerto o destruido
        // no puede realizar ataques.
        //
        // Esta validación pertenece a Combatiente,
        // no solamente a game.js.
        if (!this.estaVivo) {
            return {
                impacto: false,
                critico: false,
                danio: 0,
                objetivoDestruido: false,

                mensaje:
                    `${this.nombre} no puede atacar ` +
                    "porque está derrotado."
            };
        }

        // Comprobamos que el objetivo sea realmente
        // una entidad destructible.
        if (!(objetivo instanceof Destructible)) {
            throw new Error(
                `${this.nombre} solamente puede atacar ` +
                "objetivos destructibles."
            );
        }

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
        const tiradaAtaque =
            this.tirarDado(20);

        // Sumamos el modificador del atributo
        // utilizado para atacar.
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

        // Calculamos inicialmente el daño que podría
        // causar el ataque.
        let danioCalculado =
            this.tirarDado(this.dadoDanio) +
            this.bonificadorAtaque;

        // Un golpe crítico agrega otro dado de daño.
        //
        // El modificador del atributo no se vuelve a sumar.
        if (golpeCritico) {
            danioCalculado +=
                this.tirarDado(this.dadoDanio);
        }

        // Todo ataque exitoso causa al menos
        // 1 punto de daño calculado.
        danioCalculado = Math.max(
            1,
            danioCalculado
        );

        // recibirDanio() devuelve el daño que realmente
        // perdió el objetivo.
        //
        // Ejemplo:
        // Si calculamos 10 de daño, pero el objetivo
        // solamente tenía 2 de vida, devuelve 2.
        const danioAplicado =
            objetivo.recibirDanio(
                danioCalculado
            );

        // Devolvemos el daño realmente aplicado,
        // no el daño sobrante.
        return {
            impacto: true,
            critico: golpeCritico,
            danio: danioAplicado,

            objetivoDestruido:
                objetivo.estaDestruido,

            mensaje:
                `${this.nombre} ataca a ${objetivo.nombre}` +
                ` y causa ${danioAplicado} de daño.`
        };
    }
}