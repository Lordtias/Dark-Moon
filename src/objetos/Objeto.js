// Objeto representa una instancia real de cualquier
// elemento que pueda almacenarse o equiparse.
//
// Ejemplos:
// - Espadas.
// - Armaduras.
// - Pociones.
// - Flechas.
// - Materiales.
export class Objeto {
    constructor({
        id,
        nombre,
        tipo,
        descripcion = "",
        apilable = false,
        cantidadMaxima = 1,
        cantidad = 1,
        ranurasCompatibles = [],
        propiedades = {}
    } = {}) {
        this.validarTexto(id, "id");
        this.validarTexto(nombre, "nombre");
        this.validarTexto(tipo, "tipo");

        if (typeof descripcion !== "string") {
            throw new Error(
                `La descripción de "${nombre}" debe ser un texto.`
            );
        }

        if (typeof apilable !== "boolean") {
            throw new Error(
                `La propiedad apilable de "${nombre}" debe ser booleana.`
            );
        }

        if (
            !Number.isInteger(cantidadMaxima) ||
            cantidadMaxima <= 0
        ) {
            throw new Error(
                `La cantidad máxima de "${nombre}" debe ser mayor que 0.`
            );
        }

        // Un objeto no apilable solamente puede
        // ocupar una unidad por espacio.
        if (!apilable && cantidadMaxima !== 1) {
            throw new Error(
                `"${nombre}" no es apilable, por lo que ` +
                "su cantidad máxima debe ser 1."
            );
        }

        if (
            !Number.isInteger(cantidad) ||
            cantidad <= 0 ||
            cantidad > cantidadMaxima
        ) {
            throw new Error(
                `La cantidad de "${nombre}" debe estar entre ` +
                `1 y ${cantidadMaxima}.`
            );
        }

        if (!Array.isArray(ranurasCompatibles)) {
            throw new Error(
                `Las ranuras compatibles de "${nombre}" ` +
                "deben ser una lista."
            );
        }

        if (
            propiedades === null ||
            typeof propiedades !== "object" ||
            Array.isArray(propiedades)
        ) {
            throw new Error(
                `Las propiedades de "${nombre}" deben ser un objeto.`
            );
        }

        this.id = id.trim().toLowerCase();
        this.nombre = nombre.trim();
        this.tipo = tipo.trim().toLowerCase();
        this.descripcion = descripcion;
        this.apilable = apilable;
        this.cantidadMaxima = cantidadMaxima;
        this.cantidad = cantidad;

        // Cada objeto conoce las posiciones donde
        // puede equiparse.
        this.ranurasCompatibles =
            this.normalizarRanuras(
                ranurasCompatibles
            );

        // Las propiedades dependen del tipo de objeto.
        //
        // Ejemplos:
        // - dadoDanio para armas.
        // - bonificadorArmadura para armaduras.
        // - curacion para pociones.
        this.propiedades = {
            ...propiedades
        };
    }

    // Comprueba que un valor obligatorio sea texto válido.
    validarTexto(valor, nombreCampo) {
        if (
            typeof valor !== "string" ||
            valor.trim() === ""
        ) {
            throw new Error(
                `El campo "${nombreCampo}" del objeto es obligatorio.`
            );
        }
    }

    // Normaliza las ranuras y evita valores repetidos.
    normalizarRanuras(ranuras) {
        const ranurasNormalizadas =
            ranuras.map((ranura) => {
                this.validarTexto(
                    ranura,
                    "ranura compatible"
                );

                return ranura
                    .trim()
                    .toLowerCase();
            });

        const ranurasUnicas =
            new Set(ranurasNormalizadas);

        if (
            ranurasUnicas.size !==
            ranurasNormalizadas.length
        ) {
            throw new Error(
                `El objeto "${this.nombre}" tiene ` +
                "ranuras compatibles repetidas."
            );
        }

        return [
            ...ranurasUnicas
        ];
    }

    // Indica si el objeto puede colocarse
    // en alguna ranura de equipamiento.
    get esEquipable() {
        return this.ranurasCompatibles.length > 0;
    }

    // Indica si el objeto puede equiparse
    // en una ranura concreta.
    puedeEquiparseEn(nombreRanura) {
        this.validarTexto(
            nombreRanura,
            "nombre de ranura"
        );

        const nombreNormalizado =
            nombreRanura
                .trim()
                .toLowerCase();

        return this.ranurasCompatibles.includes(
            nombreNormalizado
        );
    }
}