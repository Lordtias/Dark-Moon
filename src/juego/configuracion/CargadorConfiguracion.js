import { cargarJson } from "../../utilidades/CargadorJson.js";

import { validarConfiguracionMapas } from "./ValidadorConfiguracionMapas.js";

import { validarConfiguracionGeneracionObjetos } from "../objetos/ValidadorConfiguracionGeneracionObjetos.js";

import { validarConfiguracionComercio } from "../comercio/ValidadorConfiguracionComercio.js";
import { validarHabilidadesNPC } from "../habilidades/ValidadorHabilidadesNPC.js";
import { validarConfiguracionEntidadesMazmorra } from "./ValidadorConfiguracionEntidadesMazmorra.js";
import {
  validarConfiguracionBotin,
  validarReglasBotin,
} from "../botin/ValidadorConfiguracionBotin.js";
import { validarConfiguracionSuerte } from "./ValidadorConfiguracionSuerte.js";

// Rutas de las configuraciones generales.
const RUTA_CONFIGURACION_PERSONAJE = "./src/config/ConfiguracionPersonaje.json";

const RUTA_VARIANTES_ENEMIGOS = "./src/config/entidades/VariantesEnemigos.json";

const RUTA_PERFILES_BOTIN = "./src/config/botin/PerfilesBotin.json";

const RUTA_REGLAS_BOTIN = "./src/config/botin/ReglasBotin.json";

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

// Cada mazmorra mantiene su configuración completa en un archivo propio.
// El cargador recompone el contrato canónico { plantillas } para que el resto
// del juego no dependa de la organización física de los JSON.
const CATALOGOS_MAPAS = Object.freeze([
  { id: "alcantarilla", ruta: "./src/config/mapas/Alcantarilla.json" },
  { id: "cementerio", ruta: "./src/config/mapas/Cementerio.json" },
  { id: "casa_guerrero", ruta: "./src/config/mapas/CasaGuerrero.json" },
  {
    id: "fortaleza_abandonada",
    ruta: "./src/config/mapas/FortalezaAbandonada.json",
  },
  { id: "sala_guerra", ruta: "./src/config/mapas/SalaGuerra.json" },
]);

const CATALOGOS_ENTIDADES_MAZMORRA = Object.freeze([
  {
    id: "recipientes",
    ruta: "./src/config/entidades/mazmorra/Recipientes.json",
    descripcion: "el catálogo de recipientes de mazmorra",
  },
  {
    id: "obstaculos",
    ruta: "./src/config/entidades/mazmorra/Obstaculos.json",
    descripcion: "el catálogo de obstáculos de mazmorra",
  },
  {
    id: "decoraciones",
    ruta: "./src/config/entidades/mazmorra/Decoraciones.json",
    descripcion: "el catálogo de decoraciones destructibles de mazmorra",
  },
]);

const RUTA_CIUDAD_INICIAL = "./src/config/mapas/CiudadInicial.json";

const RUTA_CONFIGURACION_COMERCIO = "./src/config/comercio/Comercio.json";

const RUTA_HABILIDADES_NPC = "./src/config/magia/HabilidadesNPC.json";

const RUTA_PERFILES_ATAQUE_POR_FAMILIA =
  "./src/config/presentacion/PerfilesAtaquePorFamilia.json";

const RUTA_PERFILES_HABILIDADES_VISUALES =
  "./src/config/presentacion/PerfilesHabilidadesVisuales.json";

const RUTA_PERFILES_ESTADOS_TEMPORALES_VISUALES =
  "./src/config/presentacion/PerfilesEstadosTemporalesVisuales.json";

const RUTA_PERFILES_ZONAS_TEMPORALES_VISUALES =
  "./src/config/presentacion/PerfilesZonasTemporalesVisuales.json";

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
    id: "accesorios",
    ruta: "./src/config/objetos/Accesorios.json",
    descripcion: "el catálogo de accesorios",
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
  {
    id: "desechables",
    ruta: "./src/config/objetos/Desechables.json",
    descripcion: "el catálogo de desechables",
  },
]);


// Carga la configuración utilizada durante
// la creación del personaje.
export async function cargarConfiguracionPersonaje() {
  const configuracion = await cargarJson(
    RUTA_CONFIGURACION_PERSONAJE,
    "la configuración del personaje",
  );
  return validarConfiguracionSuerte(configuracion);
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
        configuracion: await cargarJson(
          catalogo.ruta,
          catalogo.descripcion,
        ),
      })),
    ),
    cargarJson(RUTA_VARIANTES_ENEMIGOS, "las variantes de enemigos"),
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
export async function cargarConfiguracionBotin() {
  const [perfiles, reglas] = await Promise.all([
    cargarJson(RUTA_PERFILES_BOTIN, "los perfiles canónicos de botín"),
    cargarJson(RUTA_REGLAS_BOTIN, "las reglas canónicas de botín"),
  ]);

  return {
    perfiles: validarConfiguracionBotin(perfiles),
    reglas: validarReglasBotin(reglas),
  };
}

export async function cargarConfiguracionObjetos() {
  const catalogosCargados = await Promise.all(
    CATALOGOS_OBJETOS.map(async (catalogo) => ({
      ...catalogo,
      configuracion: await cargarJson(
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
    cargarJson(
      RUTA_REGLAS_GENERACION_OBJETOS,
      "las reglas generales de generación de objetos",
    ),
    cargarJson(
      RUTA_RAREZAS_OBJETOS,
      "el catálogo de rarezas de objetos",
    ),
    cargarJson(
      RUTA_PREFIJOS_OBJETOS,
      "el catálogo de prefijos de objetos",
    ),
    cargarJson(
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
  const configuracion = await cargarJson(
    RUTA_CONFIGURACION_COMERCIO,
    "la configuración de comercio",
  );

  return validarConfiguracionComercio(configuracion);
}

export async function cargarConfiguracionHabilidadesNPC() {
  const configuracion = await cargarJson(
    RUTA_HABILIDADES_NPC,
    "el catálogo de habilidades NPC",
  );

  return validarHabilidadesNPC(configuracion);
}

export function cargarPerfilesAtaquePorFamilia() {
  return cargarJson(
    RUTA_PERFILES_ATAQUE_POR_FAMILIA,
    "los perfiles de ataque por familia",
  );
}

export function cargarPerfilesHabilidadesVisuales() {
  return cargarJson(
    RUTA_PERFILES_HABILIDADES_VISUALES,
    "los perfiles visuales de habilidades",
  );
}

export function cargarPerfilesEstadosTemporalesVisuales() {
  return cargarJson(
    RUTA_PERFILES_ESTADOS_TEMPORALES_VISUALES,
    "los perfiles visuales de estados temporales",
  );
}

export function cargarPerfilesZonasTemporalesVisuales() {
  return cargarJson(
    RUTA_PERFILES_ZONAS_TEMPORALES_VISUALES,
    "los perfiles visuales de zonas temporales",
  );
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

// Carga las familias de comportamiento de objetos físicos de mazmorra.
// Las variantes concretas viven en JSON; el runtime recibe un único catálogo
// por ID para evitar clases o fábricas específicas por escenario.
export async function cargarConfiguracionEntidadesMazmorra() {
  const cargados = await Promise.all(
    CATALOGOS_ENTIDADES_MAZMORRA.map(async (catalogo) => ({
      id: catalogo.id,
      configuracion: await cargarJson(catalogo.ruta, catalogo.descripcion),
    })),
  );

  const porFamilia = Object.fromEntries(
    cargados.map((catalogo) => [catalogo.id, catalogo.configuracion]),
  );

  return validarConfiguracionEntidadesMazmorra(porFamilia);
}

// Carga y valida las plantillas utilizadas
// para generar mapas procedurales.
export async function cargarConfiguracionMapas() {
  const cargados = await Promise.all(
    CATALOGOS_MAPAS.map(async ({ id, ruta }) => ({
      id,
      plantilla: await cargarJson(
        ruta,
        `la configuración del mapa "${id}"`,
      ),
    })),
  );

  const configuracion = {
    plantillas: Object.fromEntries(
      cargados.map(({ id, plantilla }) => [id, plantilla]),
    ),
  };

  return validarConfiguracionMapas(configuracion);
}

// Carga la definición del primer mapa fijo.
//
// La validación específica de filas, terrenos,
// posiciones y entidades se ejecuta al construir
// la ciudad dentro de ConfiguracionCiudad.
export function cargarConfiguracionCiudad() {
  return cargarJson(
    RUTA_CIUDAD_INICIAL,
    "la configuración de la ciudad inicial",
  );
}
