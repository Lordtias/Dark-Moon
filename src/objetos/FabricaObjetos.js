import { Objeto } from "./Objeto.js";

import { ContenedorObjetos } from "./ContenedorObjetos.js";

import { RAREZAS_OBJETO } from "../juego/objetos/RarezasObjeto.js";

import { aplicarMetadatosComercialesObjeto } from "../juego/comercio/MetadatosComercialesObjeto.js";

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

  // Toda creación tradicional continúa
  // generando objetos comunes de nivel 1.
  rareza = RAREZAS_OBJETO.COMUN,

  nivelObjeto = 1,

  prefijos = [],

  sufijos = [],

  // El generador de afijos compone las propiedades
  // finales y las entrega aquí.
  //
  // Cuando no se proporciona este valor,
  // se utilizan las propiedades originales
  // de la plantilla.
  propiedadesFinales = null,

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

  if (
    propiedadesFinales !== null &&
    (typeof propiedadesFinales !== "object" ||
      Array.isArray(propiedadesFinales))
  ) {
    throw new Error(
      "Las propiedades finales del objeto " + "deben formar un objeto válido.",
    );
  }

  const idNormalizado = idObjeto.trim().toLowerCase();

  if (rutaCreacion.includes(idNormalizado)) {
    throw new Error(
      "La configuración del objeto " +
        `"${idNormalizado}" contiene ` +
        "una referencia circular.",
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

  const propiedadesBase = plantilla.propiedades ?? {};

  const objeto = new Objeto({
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

    // Los metadatos de progresión pertenecen
    // a la plantilla base y no cambian
    // al generar rareza o afijos.
    tierBase: plantilla.tierBase ?? 1,

    nivelMinimoGeneracion: plantilla.nivelMinimoGeneracion ?? 1,

    familiaObjeto: plantilla.familiaObjeto ?? null,

    categoriaArmadura: plantilla.categoriaArmadura ?? null,

    // Objeto realiza copias profundas
    // independientes de las propiedades
    // base y finales.
    propiedadesBase,

    propiedades: propiedadesFinales ?? propiedadesBase,

    rareza,
    nivelObjeto,
    prefijos,
    sufijos,
    contenedorObjetos,
  });

  // Los datos comerciales no participan
  // del combate ni de los afijos.
  //
  // Se agregan después de construir la instancia,
  // utilizando siempre la plantilla base.
  return aplicarMetadatosComercialesObjeto({
    objeto,
    plantilla,
  });
}

// Crea el contenido interno de un objeto,
// como las flechas almacenadas en un quiver.
//
// Los objetos internos continúan siendo comunes
// salvo que su propia definición especifique
// explícitamente otros metadatos.
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
//
// También admite objetos generados:
//
// {
//     "id": "daga_hierro",
//     "rareza": "magico",
//     "nivelObjeto": 2,
//     "prefijos": [...],
//     "sufijos": [...],
//     "propiedadesFinales": {...}
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

        rareza: definicion.rareza ?? RAREZAS_OBJETO.COMUN,

        nivelObjeto: definicion.nivelObjeto ?? 1,

        prefijos: definicion.prefijos ?? [],

        sufijos: definicion.sufijos ?? [],

        propiedadesFinales: definicion.propiedadesFinales ?? null,

        rutaCreacion,
      });
    }

    throw new Error("Existe una definición de objeto inválida.");
  });
}
