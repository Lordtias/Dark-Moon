// Nombres de los atributos que se mostrarán
// dentro del panel del personaje.
const ATRIBUTOS_VISIBLES = [
    "fuerza",
    "destreza",
    "constitucion",
    "inteligencia",
    "sabiduria",
    "carisma"
];

// PanelPersonaje administra exclusivamente
// la representación visual del jugador.
//
// No modifica estadísticas ni lógica del juego.
export class PanelPersonaje {
    constructor({ contenedor } = {}) {
        // El panel necesita un elemento HTML principal.
        if (!contenedor) {
            throw new Error(
                "PanelPersonaje necesita un contenedor."
            );
        }

        this.contenedor = contenedor;

        // Guardamos las referencias a los campos generales.
        this.nombre = this.obtenerElemento(
            '[data-personaje="nombre"]'
        );

        this.clase = this.obtenerElemento(
            '[data-personaje="clase"]'
        );

        this.nivel = this.obtenerElemento(
            '[data-personaje="nivel"]'
        );

        this.experiencia = this.obtenerElemento(
            '[data-personaje="experiencia"]'
        );

        this.claseArmadura = this.obtenerElemento(
            '[data-personaje="clase-armadura"]'
        );

        this.turno = this.obtenerElemento(
            '[data-personaje="turno"]'
        );

        this.vidaTexto = this.obtenerElemento(
            '[data-personaje="vida-texto"]'
        );

        this.vidaBarra = this.obtenerElemento(
            '[data-personaje="vida-barra"]'
        );

        // Guardamos por separado los campos visuales
        // correspondientes a cada atributo.
        this.camposAtributos = new Map();

        for (const nombreAtributo of ATRIBUTOS_VISIBLES) {
            const fila = this.obtenerElemento(
                `[data-atributo="${nombreAtributo}"]`
            );

            const valor = fila.querySelector(
                '[data-campo="valor"]'
            );

            const modificador = fila.querySelector(
                '[data-campo="modificador"]'
            );

            if (!valor || !modificador) {
                throw new Error(
                    `Faltan campos para el atributo ` +
                    `"${nombreAtributo}".`
                );
            }

            this.camposAtributos.set(
                nombreAtributo,
                {
                    valor,
                    modificador
                }
            );
        }
    }

    // Busca un elemento dentro del panel.
    obtenerElemento(selector) {
        const elemento =
            this.contenedor.querySelector(selector);

        if (!elemento) {
            throw new Error(
                `No se encontró el elemento "${selector}".`
            );
        }

        return elemento;
    }

    // Actualiza toda la información visible.
    actualizar(player, turno) {
        if (!player) {
            throw new Error(
                "PanelPersonaje necesita un jugador."
            );
        }

        this.nombre.textContent = player.nombre;
        this.clase.textContent = player.clasePersonaje;
        this.nivel.textContent = player.nivel;
        this.experiencia.textContent = player.experiencia;
        this.claseArmadura.textContent =
            player.claseArmadura;
        this.turno.textContent = turno;

        this.actualizarVida(player);
        this.actualizarAtributos(player);
    }

    // Actualiza el texto y el ancho de la barra de vida.
    actualizarVida(player) {
        this.vidaTexto.textContent =
            `${player.vidaActual} / ${player.vidaMaxima}`;

        // Evitamos divisiones inválidas y porcentajes
        // menores que 0 o mayores que 100.
        const porcentajeVida =
            player.vidaMaxima > 0
                ? (
                    player.vidaActual /
                    player.vidaMaxima
                ) * 100
                : 0;

        const porcentajeLimitado = Math.max(
            0,
            Math.min(100, porcentajeVida)
        );

        this.vidaBarra.style.width =
            `${porcentajeLimitado}%`;
    }

    // Actualiza el valor y modificador de los atributos.
    actualizarAtributos(player) {
        for (
            const [
                nombreAtributo,
                campos
            ]
            of this.camposAtributos
        ) {
            const valor =
                player.atributos[nombreAtributo];

            const modificador =
                player.obtenerModificador(
                    nombreAtributo
                );

            campos.valor.textContent = valor;

            campos.modificador.textContent =
                this.formatearModificador(
                    modificador
                );
        }
    }

    // Los modificadores positivos se muestran con +.
    formatearModificador(modificador) {
        return modificador >= 0
            ? `+${modificador}`
            : `${modificador}`;
    }
}