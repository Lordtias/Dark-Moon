import { validarConfiguracionMapas } from "./ValidadorConfiguracionMapas.js";

// Rutas de los archivos JSON utilizados por el juego.
const RUTA_CONFIGURACION_PERSONAJE = "./src/config/ConfiguracionPersonaje.json";

const RUTA_PLANTILLAS_ENEMIGOS = "./src/config/entidades/Enemigos.json";

const RUTA_VARIANTES_ENEMIGOS = "./src/config/entidades/VariantesEnemigos.json";

const RUTA_OBJETOS = "./src/config/objetos/Objetos.json";

const RUTA_MAPAS = "./src/config/mapas/Mapas.json";

/**
 * Lee un archivo JSON y devuelve su contenido
 * convertido en un objeto de JavaScript.
 */
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

// Carga conjuntamente plantillas y variantes
// disponibles para crear enemigos.
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

// Carga las plantillas de objetos.
export function cargarConfiguracionObjetos() {
  return cargarArchivoJson(RUTA_OBJETOS, "la configuración de objetos");
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
