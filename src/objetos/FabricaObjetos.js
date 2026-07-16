// Importamos la clase que representa
// cada instancia real de un objeto.
import {
    Objeto
} from "./Objeto.js";

// Crea un objeto utilizando una plantilla
// cargada desde Objetos.json.
export function crearObjeto({
    configuracionObjetos,
    idObjeto,
    cantidad = 1
} = {}) {
    if (
        configuracionObjetos === null ||
        typeof configuracionObjetos !== "object" ||
        Array.isArray(configuracionObjetos)
    ) {
        throw new Error(
            "Se necesita una configuración de objetos válida."
        );
    }

    if (
        typeof idObjeto !== "string" ||
        idObjeto.trim() === ""
    ) {
        throw new Error(
            "Se necesita el identificador del objeto."
        );
    }

    const idNormalizado =
        idObjeto.trim().toLowerCase();

    const plantilla =
        configuracionObjetos[idNormalizado];

    if (!plantilla) {
        throw new Error(
            `No existe el objeto "${idNormalizado}".`
        );
    }

    // Creamos una instancia independiente.
    //
    // Dos pociones creadas desde la misma plantilla
    // serán objetos distintos dentro de la partida.
    return new Objeto({
        id: idNormalizado,
        nombre: plantilla.nombre,
        tipo: plantilla.tipo,
        descripcion:
            plantilla.descripcion ?? "",
        apilable:
            plantilla.apilable ?? false,
        cantidadMaxima:
            plantilla.cantidadMaxima ?? 1,
        cantidad,
        ranurasCompatibles: [
            ...(
                plantilla.ranurasCompatibles ?? []
            )
        ],
        propiedades: {
            ...(
                plantilla.propiedades ?? {}
            )
        }
    });
}

// Convierte una lista de definiciones JSON
// en una lista de objetos reales.
//
// Admite dos formatos:
//
// "pocion_curacion"
//
// o:
//
// {
//     "id": "flecha_madera",
//     "cantidad": 10
// }
export function crearObjetosDesdeDefiniciones({
    configuracionObjetos,
    definiciones = []
} = {}) {
    if (!Array.isArray(definiciones)) {
        throw new Error(
            "Las definiciones de objetos deben ser una lista."
        );
    }

    return definiciones.map((definicion) => {
        // Un texto representa una unidad del objeto.
        if (typeof definicion === "string") {
            return crearObjeto({
                configuracionObjetos,
                idObjeto: definicion,
                cantidad: 1
            });
        }

        // Un objeto permite indicar una cantidad.
        if (
            definicion !== null &&
            typeof definicion === "object" &&
            !Array.isArray(definicion)
        ) {
            return crearObjeto({
                configuracionObjetos,
                idObjeto: definicion.id,
                cantidad:
                    definicion.cantidad ?? 1
            });
        }

        throw new Error(
            "Existe una definición de objeto inválida."
        );
    });
}