// Equipamiento administra los objetos colocados
// en las ranuras disponibles de una entidad.
//
// La entidad define qué ranuras posee.
//
// Cada objeto define en qué ranuras puede colocarse
// mediante su propiedad ranurasCompatibles.
export class Equipamiento {
    constructor({
        ranurasDisponibles = [],
        objetosIniciales = []
    } = {}) {
        // Las ranuras siempre deben recibirse como una lista.
        if (!Array.isArray(ranurasDisponibles)) {
            throw new Error(
                "Las ranuras de equipamiento deben ser una lista."
            );
        }

        // Los objetos iniciales también deben ser una lista.
        //
        // No indicamos manualmente la ranura porque
        // cada objeto conocerá sus ranuras compatibles.
        if (!Array.isArray(objetosIniciales)) {
            throw new Error(
                "Los objetos equipados inicialmente deben ser una lista."
            );
        }

        this.ranuras = {};

        // Creamos todas las ranuras disponibles
        // y las inicializamos vacías.
        for (const nombreRanura of ranurasDisponibles) {
            const nombreNormalizado =
                this.normalizarNombreRanura(
                    nombreRanura
                );

            if (
                Object.prototype.hasOwnProperty.call(
                    this.ranuras,
                    nombreNormalizado
                )
            ) {
                throw new Error(
                    `La ranura "${nombreNormalizado}" está repetida.`
                );
            }

            this.ranuras[nombreNormalizado] = null;
        }

        // Intentamos equipar automáticamente
        // cada objeto recibido.
        for (const objeto of objetosIniciales) {
            const ranuraAsignada =
                this.equiparAutomaticamente(objeto);

            if (ranuraAsignada === null) {
                throw new Error(
                    `No existe una ranura compatible libre ` +
                    `para "${objeto.nombre ?? "el objeto"}".`
                );
            }
        }
    }

    // Convierte el nombre de una ranura
    // a un formato común.
    normalizarNombreRanura(nombreRanura) {
        if (
            typeof nombreRanura !== "string" ||
            nombreRanura.trim() === ""
        ) {
            throw new Error(
                "Cada ranura debe tener un nombre válido."
            );
        }

        return nombreRanura
            .trim()
            .toLowerCase();
    }

    // Devuelve una copia del equipamiento actual.
    obtenerRanuras() {
        return {
            ...this.ranuras
        };
    }

    // Indica si la entidad posee una ranura concreta.
    tieneRanura(nombreRanura) {
        const nombreNormalizado =
            this.normalizarNombreRanura(
                nombreRanura
            );

        return Object.prototype.hasOwnProperty.call(
            this.ranuras,
            nombreNormalizado
        );
    }

    // Busca la primera ranura compatible
    // que además se encuentre libre.
    buscarRanuraCompatibleLibre(objeto) {
        this.validarObjetoEquipable(objeto);

        for (
            const nombreRanura
            of objeto.ranurasCompatibles
        ) {
            const nombreNormalizado =
                this.normalizarNombreRanura(
                    nombreRanura
                );

            if (
                this.tieneRanura(nombreNormalizado) &&
                this.ranuras[nombreNormalizado] === null
            ) {
                return nombreNormalizado;
            }
        }

        return null;
    }

    // Equipa un objeto en la primera ranura
    // compatible que se encuentre disponible.
    equiparAutomaticamente(objeto) {
        const ranuraDisponible =
            this.buscarRanuraCompatibleLibre(objeto);

        if (ranuraDisponible === null) {
            return null;
        }

        this.ranuras[ranuraDisponible] =
            objeto;

        return ranuraDisponible;
    }

    // Equipa manualmente un objeto en una ranura concreta.
    //
    // El objeto igualmente debe ser compatible
    // con la ranura seleccionada.
    equiparEnRanura(nombreRanura, objeto) {
        const nombreNormalizado =
            this.normalizarNombreRanura(
                nombreRanura
            );

        this.validarRanura(
            nombreNormalizado
        );

        this.validarObjetoEquipable(objeto);

        const ranurasCompatiblesNormalizadas =
            objeto.ranurasCompatibles.map(
                (ranura) =>
                    this.normalizarNombreRanura(
                        ranura
                    )
            );

        if (
            !ranurasCompatiblesNormalizadas.includes(
                nombreNormalizado
            )
        ) {
            throw new Error(
                `${objeto.nombre ?? "El objeto"} no puede ` +
                `equiparse en "${nombreNormalizado}".`
            );
        }

        const objetoAnterior =
            this.ranuras[nombreNormalizado];

        this.ranuras[nombreNormalizado] =
            objeto;

        return objetoAnterior;
    }

    // Retira y devuelve el objeto equipado.
    desequipar(nombreRanura) {
        const nombreNormalizado =
            this.normalizarNombreRanura(
                nombreRanura
            );

        this.validarRanura(
            nombreNormalizado
        );

        const objeto =
            this.ranuras[nombreNormalizado];

        this.ranuras[nombreNormalizado] =
            null;

        return objeto;
    }

    // Comprueba que el objeto indique
    // sus ranuras compatibles.
    validarObjetoEquipable(objeto) {
        if (
            objeto === null ||
            typeof objeto !== "object" ||
            Array.isArray(objeto)
        ) {
            throw new Error(
                "Se necesita un objeto válido para equipar."
            );
        }

        if (!Array.isArray(objeto.ranurasCompatibles)) {
            throw new Error(
                `${objeto.nombre ?? "El objeto"} debe indicar ` +
                "sus ranuras compatibles."
            );
        }
    }

    // Verifica que la entidad posea la ranura solicitada.
    validarRanura(nombreRanura) {
        if (!this.tieneRanura(nombreRanura)) {
            throw new Error(
                `La ranura "${nombreRanura}" no existe.`
            );
        }
    }
}