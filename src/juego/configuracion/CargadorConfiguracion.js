import { validarConfiguracionMapas } from "./ValidadorConfiguracionMapas.js";

// Rutas de las configuraciones generales.
const RUTA_CONFIGURACION_PERSONAJE = "./src/config/ConfiguracionPersonaje.json";

const RUTA_PLANTILLAS_ENEMIGOS = "./src/config/entidades/Enemigos.json";

const RUTA_VARIANTES_ENEMIGOS = "./src/config/entidades/VariantesEnemigos.json";

const RUTA_MAPAS = "./src/config/mapas/Mapas.json";

// Los objetos se dividen por categoría para evitar
// que un único archivo crezca indefinidamente.
//
// Todos estos catálogos se combinan después
// en un único diccionario en memoria.
const CATALOGOS_OBJETOS = Object.freeze([
  {
    id: "armas",
    ruta: "./src/config/objetos/Armas.json",
    descripcion: "el catálogo de armas",
  },
  {
    id: "armaduras",
    ruta: "./src/config/objetos/Armaduras.json",
    descripcion: "el catálogo de armaduras",
  },
  {
    id: "consumibles",
    ruta: "./src/config/objetos/Consumibles.json",
    descripcion: "el catálogo de consumibles",
  },
  {
    id: "municiones",
    ruta: "./src/config/objetos/Municiones.json",
    descripcion: "el catálogo de municiones",
  },
  {
    id: "contenedores",
    ruta: "./src/config/objetos/Contenedores.json",
    descripcion: "el catálogo de contenedores",
  },
  {
    id: "materiales",
    ruta: "./src/config/objetos/Materiales.json",
    descripcion: "el catálogo de materiales",
  },
]);

// Lee un archivo JSON y devuelve su contenido
// convertido en un objeto de JavaScript.
async function cargarArchivoJson(ruta, descripcion) {
  const respuesta = await fetch(ruta);

  if (!respuesta.ok) {
    throw new Error(
      `No se pudo cargar ${descripcion}. ` + `Código HTTP: ${respuesta.status}`,
    );
  }

  try {
    return await respuesta.json();
  } catch (error) {
    throw new Error(
      `El archivo de ${descripcion} no contiene ` +
        `un JSON válido. ${error.message}`,
    );
  }
}

// Carga la configuración utilizada durante
// la creación del personaje.
export function cargarConfiguracionPersonaje() {
  return cargarArchivoJson(
    RUTA_CONFIGURACION_PERSONAJE,
    "la configuración del personaje",
  );
}

// Carga conjuntamente las plantillas
// y variantes disponibles para crear enemigos.
export async function cargarConfiguracionEnemigos() {
  const [plantillas, variantes] = await Promise.all([
    cargarArchivoJson(RUTA_PLANTILLAS_ENEMIGOS, "las plantillas de enemigos"),

    cargarArchivoJson(RUTA_VARIANTES_ENEMIGOS, "las variantes de enemigos"),
  ]);

  return {
    plantillas,
    variantes,
  };
}

// Carga todos los catálogos de objetos
// y los combina en un único diccionario.
//
// El resto del juego no necesita saber
// en qué archivo se encuentra cada objeto.
export async function cargarConfiguracionObjetos() {
  const catalogosCargados = await Promise.all(
    CATALOGOS_OBJETOS.map(async (catalogo) => ({
      ...catalogo,

      configuracion: await cargarArchivoJson(
        catalogo.ruta,
        catalogo.descripcion,
      ),
    })),
  );

  return combinarCatalogosObjetos(catalogosCargados);
}

// Une los catálogos conservando el formato
// utilizado actualmente por FabricaObjetos.
//
// También registra el origen de cada ID
// para detectar definiciones duplicadas.
function combinarCatalogosObjetos(catalogosCargados) {
  const configuracionCombinada = {};

  const origenPorId = new Map();

  for (const catalogo of catalogosCargados) {
    validarCatalogoObjetos(catalogo);

    for (const [idOriginal, plantilla] of Object.entries(
      catalogo.configuracion,
    )) {
      const idObjeto = normalizarIdObjeto(idOriginal, catalogo.descripcion);

      validarPlantillaObjeto({
        idObjeto,
        plantilla,
        descripcionCatalogo: catalogo.descripcion,
      });

      if (origenPorId.has(idObjeto)) {
        const origenAnterior = origenPorId.get(idObjeto);

        throw new Error(
          `El objeto "${idObjeto}" está definido ` +
            `tanto en ${origenAnterior} como en ` +
            `${catalogo.descripcion}.`,
        );
      }

      origenPorId.set(idObjeto, catalogo.descripcion);

      configuracionCombinada[idObjeto] = plantilla;
    }
  }

  return configuracionCombinada;
}

// Comprueba que la raíz de cada archivo
// sea un objeto JSON y no una lista o valor simple.
function validarCatalogoObjetos(catalogo) {
  const configuracion = catalogo.configuracion;

  if (
    configuracion === null ||
    typeof configuracion !== "object" ||
    Array.isArray(configuracion)
  ) {
    throw new Error(
      `La raíz de ${catalogo.descripcion} ` + "debe ser un objeto JSON.",
    );
  }
}

// Comprueba que cada entrada represente
// una plantilla de objeto válida.
function validarPlantillaObjeto({ idObjeto, plantilla, descripcionCatalogo }) {
  if (
    plantilla === null ||
    typeof plantilla !== "object" ||
    Array.isArray(plantilla)
  ) {
    throw new Error(
      `La plantilla "${idObjeto}" de ` + `${descripcionCatalogo} no es válida.`,
    );
  }
}

// Normaliza los IDs para que referencias como
// "ESPADA_LARGA" y "espada_larga"
// sean consideradas el mismo objeto.
function normalizarIdObjeto(idOriginal, descripcionCatalogo) {
  if (typeof idOriginal !== "string" || idOriginal.trim() === "") {
    throw new Error(
      `Existe un ID de objeto vacío en ` + `${descripcionCatalogo}.`,
    );
  }

  return idOriginal.trim().toLowerCase();
}

// Carga y valida las plantillas utilizadas
// para generar mapas procedurales.
export async function cargarConfiguracionMapas() {
  const configuracion = await cargarArchivoJson(
    RUTA_MAPAS,
    "la configuración de mapas",
  );

  return validarConfiguracionMapas(configuracion);
}
