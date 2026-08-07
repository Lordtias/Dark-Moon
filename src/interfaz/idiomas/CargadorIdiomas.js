import { Traductor, validarParidadCatalogos } from "./Traductor.js";

const RUTAS = Object.freeze({
  es: "./src/config/idiomas/es.json",
  en: "./src/config/idiomas/en.json",
});

export async function cargarTraductor({ idioma = "es", cargarJson = cargarJsonPorFetch } = {}) {
  const pares = await Promise.all(
    Object.entries(RUTAS).map(async ([id, ruta]) => [
      id,
      await cargarJson(ruta, `el catálogo de idioma ${id}`),
    ]),
  );
  const catalogos = Object.fromEntries(pares);
  validarParidadCatalogos(catalogos);
  return new Traductor({ catalogos, idioma });
}

async function cargarJsonPorFetch(ruta, descripcion) {
  const respuesta = await fetch(ruta);
  if (!respuesta.ok) {
    throw new Error(`No se pudo cargar ${descripcion}. Código HTTP: ${respuesta.status}`);
  }
  try {
    return await respuesta.json();
  } catch (error) {
    throw new Error(`${descripcion} no contiene JSON válido. ${error.message}`);
  }
}
