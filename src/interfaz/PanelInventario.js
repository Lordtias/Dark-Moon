// PanelInventario muestra los objetos almacenados
// dentro del contenedor del jugador.
//
// No agrega, retira ni utiliza objetos.
// Solamente representa su estado actual.
export class PanelInventario {
    constructor({
        cuadricula,
        mensajeVacio
    } = {}) {
        if (!cuadricula) {
            throw new Error(
                "PanelInventario necesita una cuadrícula."
            );
        }

        if (!mensajeVacio) {
            throw new Error(
                "PanelInventario necesita un mensaje vacío."
            );
        }

        this.cuadricula = cuadricula;
        this.mensajeVacio = mensajeVacio;
    }

    // Actualiza todas las casillas del inventario.
    actualizar(inventario) {
        if (
            !inventario ||
            typeof inventario.obtenerEspacios !== "function"
        ) {
            throw new Error(
                "PanelInventario necesita un inventario válido."
            );
        }

        const espacios =
            inventario.obtenerEspacios();

        // Eliminamos las casillas anteriores.
        this.cuadricula.replaceChildren();

        for (const objeto of espacios) {
            const casilla =
                this.crearCasilla(objeto);

            this.cuadricula.appendChild(
                casilla
            );
        }

        // Mostramos el mensaje solamente
        // cuando no existe ningún objeto.
        this.mensajeVacio.classList.toggle(
            "oculto",
            !inventario.estaVacio()
        );
    }

    // Crea una casilla vacía u ocupada.
    crearCasilla(objeto) {
        const casilla =
            document.createElement("div");

        casilla.classList.add(
            "slot-inventario"
        );

        if (!objeto) {
            casilla.setAttribute(
                "aria-label",
                "Espacio vacío"
            );

            return casilla;
        }

        casilla.classList.add("ocupado");
        casilla.title = objeto.descripcion;
        casilla.setAttribute(
            "aria-label",
            objeto.nombre
        );

        const nombre =
            document.createElement("span");

        nombre.classList.add(
            "nombre-objeto"
        );

        nombre.textContent =
            objeto.nombre;

        casilla.appendChild(nombre);

        // La cantidad solamente se muestra
        // cuando existe más de una unidad.
        if (objeto.cantidad > 1) {
            const cantidad =
                document.createElement("span");

            cantidad.classList.add(
                "cantidad-objeto"
            );

            cantidad.textContent =
                objeto.cantidad;

            casilla.appendChild(cantidad);
        }

        return casilla;
    }
}