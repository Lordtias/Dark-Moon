import { validarConfiguracionMapas } from "./ValidadorConfiguracionMapas.js";

import { validarConfiguracionGeneracionObjetos } from "../objetos/ValidadorConfiguracionGeneracionObjetos.js";

import { validarConfiguracionComercio } from "../comercio/ValidadorConfiguracionComercio.js";

// Rutas de las configuraciones generales.
const RUTA_CONFIGURACION_PERSONAJE = "./src/config/ConfiguracionPersonaje.json";

const RUTA_VARIANTES_ENEMIGOS = "./src/config/entidades/VariantesEnemigos.json";

// Las plantillas de enemigos se dividen por función.
//
// El resto del juego recibe un único catálogo combinado,
// del mismo modo que sucede con los objetos.
const CATALOGOS_ENEMIGOS = Object.freeze([
  {
    id: "recurrentes",
    ruta: "./src/config/entidades/Enemigos.json",
    descripcion: "el catálogo general de enemigos",
  },
  {
    id: "especiales",
    ruta: "./src/config/entidades/EnemigosEspeciales.json",
    descripcion: "el catálogo de enemigos especiales",
  },
]);

// El archivo existente utiliza minúscula.
// Mantener la misma capitalización evita errores
// al publicar en servidores Linux o GitHub Pages.
const RUTA_MAPAS = "./src/config/mapas/mapas.json";

const RUTA_CIUDAD_INICIAL = "./src/config/mapas/CiudadInicial.json";

const RUTA_CONFIGURACION_COMERCIO = "./src/config/comercio/Comercio.json";

// Catálogos que describen rarezas y afijos.
//
// Se cargan separados de las plantillas de objetos porque:
//
// - Las plantillas definen la base de cada objeto.
// - Las rarezas definen cuántos afijos puede recibir.
// - Los afijos definen mejoras posibles y sus grados.
const RUTA_REGLAS_GENERACION_OBJETOS =
  "./src/config/objetos/GeneracionObjetos.json";

const RUTA_RAREZAS_OBJETOS = "./src/config/objetos/Rarezas.json";

const RUTA_PREFIJOS_OBJETOS = "./src/config/objetos/afijos/Prefijos.json";

const RUTA_SUFIJOS_OBJETOS = "./src/config/objetos/afijos/Sufijos.json";

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

// Carga conjuntamente los catálogos de plantillas
// y las variantes disponibles para crear enemigos.
//
// Los IDs deben ser únicos entre enemigos generales
// y especiales. El resultado conserva el contrato:
//
// {
//   plantillas,
//   variantes
// }
export async function cargarConfiguracionEnemigos() {
  const [catalogosCargados, variantes] = await Promise.all([
    Promise.all(
      CATALOGOS_ENEMIGOS.map(async (catalogo) => ({
        ...catalogo,
        configuracion: await cargarArchivoJson(
          catalogo.ruta,
          catalogo.descripcion,
        ),
      })),
    ),
    cargarArchivoJson(RUTA_VARIANTES_ENEMIGOS, "las variantes de enemigos"),
  ]);

  const plantillas = combinarCatalogosPlantillas({
    catalogosCargados,
    tipoEntidad: "enemigo",
  });

  validarObjetoRaiz({
    valor: variantes,
    descripcion: "el catálogo de variantes de enemigos",
  });

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

// Carga y valida todas las reglas que controlan
// la generación aleatoria de objetos.
//
// La configuración queda separada en:
//
// - Reglas generales de nivel.
// - Rarezas y cantidad de afijos.
// - Prefijos y sufijos disponibles.
export async function cargarConfiguracionGeneracionObjetos() {
  const [reglas, rarezas, prefijos, sufijos] = await Promise.all([
    cargarArchivoJson(
      RUTA_REGLAS_GENERACION_OBJETOS,
      "las reglas generales de generación de objetos",
    ),
    cargarArchivoJson(
      RUTA_RAREZAS_OBJETOS,
      "el catálogo de rarezas de objetos",
    ),
    cargarArchivoJson(
      RUTA_PREFIJOS_OBJETOS,
      "el catálogo de prefijos de objetos",
    ),
    cargarArchivoJson(
      RUTA_SUFIJOS_OBJETOS,
      "el catálogo de sufijos de objetos",
    ),
  ]);

  return validarConfiguracionGeneracionObjetos({
    reglas,
    rarezas,
    prefijos,
    sufijos,
  });
}

// Carga y valida las reglas de precio y los perfiles
// económicos de los mercaderes.
export async function cargarConfiguracionComercio() {
  const configuracion = await cargarArchivoJson(
    RUTA_CONFIGURACION_COMERCIO,
    "la configuración de comercio",
  );

  return validarConfiguracionComercio(configuracion);
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
    validarCatalogo({
      catalogo,
      tipoEntidad: "objeto",
    });

    for (const [idOriginal, plantilla] of Object.entries(
      catalogo.configuracion,
    )) {
      const idObjeto = normalizarIdConfiguracion(
        idOriginal,
        catalogo.descripcion,
      );

      validarPlantilla({
        id: idObjeto,
        plantilla,
        descripcionCatalogo: catalogo.descripcion,
        tipoEntidad: "objeto",
      });

      validarIdNoDuplicado({
        id: idObjeto,
        origenPorId,
        descripcionCatalogo: catalogo.descripcion,
        tipoEntidad: "objeto",
      });

      origenPorId.set(idObjeto, catalogo.descripcion);

      configuracionCombinada[idObjeto] = plantilla;
    }
  }

  return configuracionCombinada;
}

// Combina las plantillas de enemigos generales
// y especiales dentro de un único catálogo.
function combinarCatalogosPlantillas({ catalogosCargados, tipoEntidad }) {
  const configuracionCombinada = {};
  const origenPorId = new Map();

  for (const catalogo of catalogosCargados) {
    validarCatalogo({
      catalogo,
      tipoEntidad,
    });

    for (const [idOriginal, plantilla] of Object.entries(
      catalogo.configuracion,
    )) {
      const id = normalizarIdConfiguracion(idOriginal, catalogo.descripcion);

      validarPlantilla({
        id,
        plantilla,
        descripcionCatalogo: catalogo.descripcion,
        tipoEntidad,
      });

      validarIdNoDuplicado({
        id,
        origenPorId,
        descripcionCatalogo: catalogo.descripcion,
        tipoEntidad,
      });

      origenPorId.set(id, catalogo.descripcion);

      configuracionCombinada[id] = plantilla;
    }
  }

  return configuracionCombinada;
}

function validarCatalogo({ catalogo, tipoEntidad }) {
  if (!catalogo || typeof catalogo !== "object" || Array.isArray(catalogo)) {
    throw new Error(`Existe un catálogo de ${tipoEntidad}s inválido.`);
  }

  validarObjetoRaiz({
    valor: catalogo.configuracion,
    descripcion: catalogo.descripcion,
  });
}

function validarPlantilla({ id, plantilla, descripcionCatalogo, tipoEntidad }) {
  if (
    plantilla === null ||
    typeof plantilla !== "object" ||
    Array.isArray(plantilla)
  ) {
    throw new Error(
      `La plantilla de ${tipoEntidad} "${id}" de ` +
        `${descripcionCatalogo} no es válida.`,
    );
  }
}

function validarIdNoDuplicado({
  id,
  origenPorId,
  descripcionCatalogo,
  tipoEntidad,
}) {
  if (!origenPorId.has(id)) {
    return;
  }

  const origenAnterior = origenPorId.get(id);

  throw new Error(
    `El ${tipoEntidad} "${id}" está definido ` +
      `tanto en ${origenAnterior} como en ` +
      `${descripcionCatalogo}.`,
  );
}

function validarObjetoRaiz({ valor, descripcion }) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`La raíz de ${descripcion} debe ser un objeto JSON.`);
  }
}

// Normaliza los IDs para que referencias como
// "ESPADA_LARGA" y "espada_larga"
// sean consideradas el mismo elemento.
function normalizarIdConfiguracion(idOriginal, descripcionCatalogo) {
  if (typeof idOriginal !== "string" || idOriginal.trim() === "") {
    throw new Error("Existe un ID vacío en " + `${descripcionCatalogo}.`);
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

// Carga la definición del primer mapa fijo.
//
// La validación específica de filas, terrenos,
// posiciones y entidades se ejecuta al construir
// la ciudad dentro de ConfiguracionCiudad.
export function cargarConfiguracionCiudad() {
  return cargarArchivoJson(
    RUTA_CIUDAD_INICIAL,
    "la configuración de la ciudad inicial",
  );
}
