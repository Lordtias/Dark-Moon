// Agrega a una casilla una imagen de objeto
// con respaldo textual.
//
// La imagen se oculta mientras carga.
// Si termina correctamente, reemplaza al texto.
// Si falla, el nombre continúa visible.
export function agregarRepresentacionObjeto({
    contenedor,
    objeto,
    claseTexto,
} = {}) {
    if (!contenedor) {
        throw new Error(
            "Se necesita un contenedor para representar el objeto.",
        );
    }

    if (!objeto) {
        throw new Error(
            "Se necesita un objeto para crear su representación.",
        );
    }

    const texto =
        document.createElement("span");

    texto.classList.add(
        claseTexto,
    );

    texto.textContent =
        objeto.nombre;

    contenedor.appendChild(
        texto,
    );

    const ruta =
        normalizarRuta(
            objeto.recursoVisual,
        );

    if (!ruta) {
        return;
    }

    const imagen =
        document.createElement("img");

    imagen.classList.add(
        "imagen-objeto",
    );

    // El contenedor ya tiene una etiqueta ARIA
    // completa, por lo que evitamos duplicarla.
    imagen.alt = "";
    imagen.draggable = false;
    imagen.decoding = "async";
    imagen.hidden = true;

    imagen.addEventListener(
        "load",
        () => {
            imagen.hidden = false;
            texto.hidden = true;
        },
        {
            once: true,
        },
    );

    imagen.addEventListener(
        "error",
        () => {
            imagen.remove();
            texto.hidden = false;
        },
        {
            once: true,
        },
    );

    // Los eventos se registran antes de asignar
    // src para contemplar recursos ya cacheados.
    imagen.src = ruta;

    contenedor.insertBefore(
        imagen,
        texto,
    );
}

function normalizarRuta(ruta) {
    return typeof ruta === "string" &&
        ruta.trim() !== ""
        ? ruta.trim()
        : null;
}
