// ContenedorObjetos representa cualquier espacio capaz
// de almacenar objetos.
//
// Puede utilizarse como:
//
// - Inventario del jugador.
// - Contenido de un cofre.
// - Mochila de un enemigo.
// - Contenido interno de otro objeto.
export class ContenedorObjetos {
    constructor({
        capacidad,
        objetosIniciales = []
    } = {}) {
        // La capacidad debe ser un número entero positivo.
        if (
            !Number.isInteger(capacidad) ||
            capacidad <= 0
        ) {
            throw new Error(
                "La capacidad del contenedor debe ser mayor que 0."
            );
        }

        // Los objetos iniciales deben recibirse como una lista.
        if (!Array.isArray(objetosIniciales)) {
            throw new Error(
                "Los objetos iniciales deben ser una lista."
            );
        }

        // No permitimos comenzar con más objetos
        // de los que el contenedor puede almacenar.
        if (objetosIniciales.length > capacidad) {
            throw new Error(
                "El contenedor no tiene capacidad suficiente."
            );
        }

        this.capacidad = capacidad;

        // null representa una posición vacía.
        this.espacios = Array(capacidad).fill(null);

        // Colocamos los objetos iniciales desde
        // la primera posición disponible.
        objetosIniciales.forEach((objeto, indice) => {
            if (!objeto) {
                throw new Error(
                    "Un contenedor no puede comenzar con objetos vacíos."
                );
            }

            this.espacios[indice] = objeto;
        });
    }

    // Devuelve una copia para que el contenido
    // no pueda modificarse directamente desde afuera.
    obtenerEspacios() {
        return [...this.espacios];
    }

    // Busca el primer espacio vacío.
    obtenerPrimerEspacioLibre() {
        return this.espacios.findIndex(
            (objeto) => objeto === null
        );
    }

    // Indica si no existe espacio disponible.
    estaLleno() {
        return this.obtenerPrimerEspacioLibre() === -1;
    }

    // Indica si no existe ningún objeto almacenado.
    estaVacio() {
        return this.espacios.every(
            (objeto) => objeto === null
        );
    }

    // Agrega un objeto en el primer espacio libre.
    agregarObjeto(objeto) {
        if (!objeto) {
            throw new Error(
                "No se puede agregar un objeto vacío."
            );
        }

        const indiceLibre =
            this.obtenerPrimerEspacioLibre();

        if (indiceLibre === -1) {
            return false;
        }

        this.espacios[indiceLibre] = objeto;

        return true;
    }

    // Retira y devuelve un objeto.
    retirarObjeto(indice) {
        this.validarIndice(indice);

        const objeto = this.espacios[indice];

        this.espacios[indice] = null;

        return objeto;
    }

    // Verifica que una posición pertenezca al contenedor.
    validarIndice(indice) {
        if (
            !Number.isInteger(indice) ||
            indice < 0 ||
            indice >= this.capacidad
        ) {
            throw new Error(
                "La posición del contenedor no es válida."
            );
        }
    }
}