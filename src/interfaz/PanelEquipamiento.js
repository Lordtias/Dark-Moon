// Nombres visibles de las ranuras.
//
// Internamente utilizamos identificadores simples,
// pero la interfaz muestra textos más claros.
const ETIQUETAS_RANURAS = {
    cabeza: "Cabeza",
    torso: "Torso",
    manos: "Manos",
    piernas: "Piernas",
    pies: "Pies",
    arma: "Arma",
    secundaria: "Secundaria",
    collar: "Collar",
    anillo_derecho: "Anillo der.",
    anillo_izquierdo: "Anillo izq.",
    municion: "Munición"
};

// PanelEquipamiento representa los objetos
// que el personaje tiene colocados actualmente.
export class PanelEquipamiento {
    constructor({
        cuadricula
    } = {}) {
        if (!cuadricula) {
            throw new Error(
                "PanelEquipamiento necesita una cuadrícula."
            );
        }

        this.cuadricula = cuadricula;
    }

    // Genera las ranuras utilizando
    // el equipamiento real del personaje.
    actualizar(equipamiento) {
        if (
            !equipamiento ||
            typeof equipamiento.obtenerRanuras !== "function"
        ) {
            throw new Error(
                "PanelEquipamiento necesita un equipamiento válido."
            );
        }

        const ranuras =
            equipamiento.obtenerRanuras();

        this.cuadricula.replaceChildren();

        for (
            const [
                nombreRanura,
                objeto
            ]
            of Object.entries(ranuras)
        ) {
            const elemento =
                this.crearRanura(
                    nombreRanura,
                    objeto
                );

            this.cuadricula.appendChild(
                elemento
            );
        }
    }

    // Crea la representación visual
    // de una posición de equipamiento.
    crearRanura(nombreRanura, objeto) {
        const contenedor =
            document.createElement("div");

        contenedor.classList.add(
            "slot-equipamiento"
        );

        const casilla =
            document.createElement("div");

        casilla.classList.add(
            "casilla-equipamiento"
        );

        const etiqueta =
            document.createElement("span");

        etiqueta.classList.add(
            "nombre-ranura"
        );

        etiqueta.textContent =
            ETIQUETAS_RANURAS[nombreRanura] ??
            nombreRanura;

        if (objeto) {
            casilla.classList.add("ocupada");
            casilla.title = objeto.descripcion;

            const nombreObjeto =
                document.createElement("span");

            nombreObjeto.classList.add(
                "nombre-objeto-equipado"
            );

            nombreObjeto.textContent =
                objeto.nombre;

            casilla.appendChild(
                nombreObjeto
            );
        }

        contenedor.append(
            casilla,
            etiqueta
        );

        return contenedor;
    }
}