import { Objeto } from "./Objeto.js";

import { ContenedorObjetos } from "./ContenedorObjetos.js";

// Crea una instancia independiente desde
// el catálogo combinado de objetos.
//
// La fábrica no necesita saber en qué archivo JSON
// fue definida originalmente la plantilla.
//
// rutaCreacion evita configuraciones circulares,
// por ejemplo un quiver que se contenga a sí mismo.
export function crearObjeto({
  configuracionObjetos,
  idObjeto,
  cantidad = 1,
  rutaCreacion = [],
} = {}) {
  if (
    configuracionObjetos === null ||
    typeof configuracionObjetos !== "object" ||
    Array.isArray(configuracionObjetos)
  ) {
    throw new Error("Se necesita una configuración de objetos válida.");
  }

  if (typeof idObjeto !== "string" || idObjeto.trim() === "") {
    throw new Error("Se necesita el identificador del objeto.");
  }

  const idNormalizado = idObjeto.trim().toLowerCase();

  if (rutaCreacion.includes(idNormalizado)) {
    throw new Error(
      `La configuración del objeto "${idNormalizado}" ` +
        "contiene una referencia circular.",
    );
  }

  const plantilla = configuracionObjetos[idNormalizado];

  if (!plantilla) {
    throw new Error(`No existe el objeto "${idNormalizado}".`);
  }

  const nuevaRuta = [...rutaCreacion, idNormalizado];

  const contenedorObjetos = crearContenedorInterno({
    configuracionObjetos,

    configuracionContenedor: plantilla.contenedor ?? null,

    rutaCreacion: nuevaRuta,
  });

  return new Objeto({
    id: idNormalizado,

    nombre: plantilla.nombre,

    tipo: plantilla.tipo,

    descripcion: plantilla.descripcion ?? "",

    // Transportamos la ruta declarada
    // dentro del catálogo correspondiente.
    recursoVisual: plantilla.recursoVisual ?? null,

    apilable: plantilla.apilable ?? false,

    cantidadMaxima: plantilla.cantidadMaxima ?? 1,

    cantidad,

    ranurasCompatibles: [...(plantilla.ranurasCompatibles ?? [])],

    propiedades: {
      ...(plantilla.propiedades ?? {}),
    },

    contenedorObjetos,
  });
}

// Crea el contenido interno de un objeto,
// como las flechas almacenadas en un quiver.
function crearContenedorInterno({
  configuracionObjetos,
  configuracionContenedor,
  rutaCreacion,
}) {
  if (configuracionContenedor === null) {
    return null;
  }

  if (
    typeof configuracionContenedor !== "object" ||
    Array.isArray(configuracionContenedor)
  ) {
    throw new Error("La configuración del contenedor interno no es válida.");
  }

  const objetosIniciales = crearObjetosDesdeDefiniciones({
    configuracionObjetos,

    definiciones: configuracionContenedor.objetosIniciales ?? [],

    rutaCreacion,
  });

  return new ContenedorObjetos({
    capacidad: configuracionContenedor.capacidad,

    objetosIniciales,
  });
}

// Convierte una lista de definiciones JSON
// en una lista de instancias reales.
//
// Formatos admitidos:
//
// "pocion_curacion"
//
// {
//     "id": "flecha_madera",
//     "cantidad": 20
// }
export function crearObjetosDesdeDefiniciones({
  configuracionObjetos,
  definiciones = [],
  rutaCreacion = [],
} = {}) {
  if (!Array.isArray(definiciones)) {
    throw new Error("Las definiciones de objetos deben ser una lista.");
  }

  return definiciones.map((definicion) => {
    if (typeof definicion === "string") {
      return crearObjeto({
        configuracionObjetos,

        idObjeto: definicion,

        cantidad: 1,

        rutaCreacion,
      });
    }

    if (
      definicion !== null &&
      typeof definicion === "object" &&
      !Array.isArray(definicion)
    ) {
      return crearObjeto({
        configuracionObjetos,

        idObjeto: definicion.id,

        cantidad: definicion.cantidad ?? 1,

        rutaCreacion,
      });
    }

    throw new Error("Existe una definición de objeto inválida.");
  });
}
