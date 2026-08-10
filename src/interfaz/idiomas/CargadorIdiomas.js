import { cargarJson } from "../../utilidades/CargadorJson.js";
import { Traductor, validarParidadCatalogos } from "./Traductor.js";

const RUTAS = Object.freeze({
  es: "./src/config/idiomas/es.json",
  en: "./src/config/idiomas/en.json",
});

export async function cargarTraductor({ idioma = "es", cargarJson: cargarCatalogo = cargarJson } = {}) {
  const pares = await Promise.all(
    Object.entries(RUTAS).map(async ([id, ruta]) => [
      id,
      await cargarCatalogo(ruta, `el catálogo de idioma ${id}`),
    ]),
  );
  const catalogos = Object.fromEntries(pares);
  validarParidadCatalogos(catalogos);
  return new Traductor({ catalogos, idioma });
}
