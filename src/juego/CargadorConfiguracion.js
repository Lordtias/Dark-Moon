// Rutas de los archivos JSON utilizados por el juego.
const RUTA_CONFIGURACION_PERSONAJE =
  "./src/config/ConfiguracionPersonaje.json";

const RUTA_PLANTILLAS_ENEMIGOS =
  "./src/config/entidades/Enemigos.json";

const RUTA_VARIANTES_ENEMIGOS =
  "./src/config/entidades/VariantesEnemigos.json";

/**
 * Lee un archivo JSON y devuelve su contenido
 * convertido en un objeto de JavaScript.
 *
 * Esta función es interna porque todas las configuraciones
 * deben cargarse y validar sus errores de la misma manera.
 *
 * @param {string} ruta Ubicación del archivo JSON.
 * @param {string} descripcion Nombre utilizado en los errores.
 * @returns {Promise<Object>} Contenido del archivo JSON.
 */
async function cargarArchivoJson(
  ruta,
  descripcion
) {
  // Solicitamos el archivo al servidor local.
  const respuesta = await fetch(ruta);

  // Informamos un error claro cuando el archivo
  // no existe o no puede ser leído.
  if (!respuesta.ok) {
    throw new Error(
      `No se pudo cargar ${descripcion}. ` +
      `Código HTTP: ${respuesta.status}`
    );
  }

  try {
    // Convertimos el contenido JSON en un objeto.
    return await respuesta.json();
  } catch (error) {
    // Este error suele aparecer cuando falta una coma,
    // una llave o existe algún otro problema de sintaxis.
    throw new Error(
      `El archivo de ${descripcion} no contiene ` +
      `un JSON válido. ${error.message}`
    );
  }
}

/**
 * Carga la configuración utilizada durante
 * la creación del personaje.
 *
 * @returns {Promise<Object>} Configuración del personaje.
 */
export function cargarConfiguracionPersonaje() {
  return cargarArchivoJson(
    RUTA_CONFIGURACION_PERSONAJE,
    "la configuración del personaje"
  );
}

/**
 * Carga conjuntamente las plantillas y las variantes
 * disponibles para crear enemigos.
 *
 * Promise.all permite leer ambos archivos al mismo tiempo.
 *
 * @returns {Promise<Object>} Plantillas y variantes.
 */
export async function cargarConfiguracionEnemigos() {
  const [
    plantillas,
    variantes
  ] = await Promise.all([
    cargarArchivoJson(
      RUTA_PLANTILLAS_ENEMIGOS,
      "las plantillas de enemigos"
    ),

    cargarArchivoJson(
      RUTA_VARIANTES_ENEMIGOS,
      "las variantes de enemigos"
    )
  ]);

  return {
    plantillas,
    variantes
  };
}