// Estados internos posibles para una imagen.
//
// El renderizador solamente recibe la imagen
// cuando la carga terminó correctamente.
const ESTADOS_IMAGEN = Object.freeze({
    CARGANDO: "cargando",
    LISTA: "lista",
    ERROR: "error",
});

// Carga y almacena imágenes utilizadas por
// una implementación gráfica.
//
// Esta clase no conoce Juego, enemigos u objetos.
// Solamente trabaja con rutas de recursos.
export class CargadorImagenes {
    constructor({
        alActualizar = null,
    } = {}) {
        if (
            alActualizar !== null &&
            typeof alActualizar !== "function"
        ) {
            throw new Error(
                "El callback del cargador de imágenes debe ser una función.",
            );
        }

        this.alActualizar = alActualizar;
        this.recursos = new Map();
    }

    // Devuelve una imagen cargada.
    //
    // Si la ruta todavía no fue solicitada,
    // inicia su carga y devuelve null.
    //
    // Si la carga falla, conserva el error en
    // caché para no repetir solicitudes inútiles.
    obtener(ruta) {
        const rutaNormalizada =
            normalizarRuta(ruta);

        if (!rutaNormalizada) {
            return null;
        }

        let recurso =
            this.recursos.get(
                rutaNormalizada,
            );

        if (!recurso) {
            recurso =
                this.iniciarCarga(
                    rutaNormalizada,
                );
        }

        return recurso.estado ===
            ESTADOS_IMAGEN.LISTA
            ? recurso.imagen
            : null;
    }

    // Inicia la carga de una ruta una sola vez.
    iniciarCarga(ruta) {
        const imagen =
            new Image();

        const recurso = {
            imagen,
            estado:
                ESTADOS_IMAGEN.CARGANDO,
        };

        this.recursos.set(
            ruta,
            recurso,
        );

        imagen.addEventListener(
            "load",
            () => {
                recurso.estado =
                    ESTADOS_IMAGEN.LISTA;

                this.alActualizar?.({
                    ruta,
                    cargada: true,
                });
            },
            {
                once: true,
            },
        );

        imagen.addEventListener(
            "error",
            () => {
                recurso.estado =
                    ESTADOS_IMAGEN.ERROR;

                console.warn(
                    `[Gráficos] No se pudo cargar la imagen "${ruta}".`,
                );

                this.alActualizar?.({
                    ruta,
                    cargada: false,
                });
            },
            {
                once: true,
            },
        );

        imagen.decoding = "async";
        imagen.src = ruta;

        return recurso;
    }

    // Elimina referencias conservadas por
    // el backend gráfico.
    destruir() {
        this.recursos.clear();
        this.alActualizar = null;
    }
}

// Las rutas vacías se interpretan como
// ausencia de recurso visual.
function normalizarRuta(ruta) {
    if (
        ruta === null ||
        ruta === undefined
    ) {
        return null;
    }

    if (typeof ruta !== "string") {
        throw new Error(
            "La ruta de una imagen debe ser un texto.",
        );
    }

    const normalizada =
        ruta.trim();

    return normalizada === ""
        ? null
        : normalizada;
}
