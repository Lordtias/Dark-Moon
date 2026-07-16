// Ruta del archivo JSON que contiene los valores
// configurables para la creación del personaje.
const RUTA_CONFIGURACION_PERSONAJE =
  "./src/config/configuracionPersonaje.json";

/**
 * Lee el archivo JSON que contiene la configuración
 * de atributos y profesiones del personaje.
 *
 * Como fetch trabaja de forma asincrónica, esta función
 * devuelve una promesa con la configuración cargada.
 *
 * @returns {Promise<Object>} Configuración del personaje.
 */
export async function cargarConfiguracionPersonaje() {
  // Solicitamos al navegador que lea el archivo JSON.
  const respuesta = await fetch(
    RUTA_CONFIGURACION_PERSONAJE
  );

  // Si el archivo no existe o no pudo cargarse,
  // detenemos el proceso con un mensaje explicativo.
  if (!respuesta.ok) {
    throw new Error(
      "No se pudo cargar la configuración del personaje. " +
      `Código HTTP: ${respuesta.status}`
    );
  }

  // Convertimos el texto del archivo JSON
  // en un objeto que JavaScript puede utilizar.
  const configuracion = await respuesta.json();

  return configuracion;
}