import {
  cargarConfiguracionCiudad,
  cargarConfiguracionComercio,
  cargarConfiguracionEnemigos,
  cargarConfiguracionGeneracionObjetos as cargarConfiguracionGeneracionObjetosBase,
  cargarConfiguracionMapas,
  cargarConfiguracionObjetos as cargarConfiguracionObjetosBase,
  cargarConfiguracionPersonaje,
} from "./CargadorConfiguracion.js";
import { validarConfiguracionGeneracionCatalizadores } from "../objetos/ValidadorConfiguracionCatalizadores.js";
import { validarCatalogoCatalizadores } from "../magia/SistemaCatalizadores.js";

const RUTA_CATALIZADORES = "./src/config/objetos/Catalizadores.json";
const RUTA_PREFIJOS_CATALIZADORES =
  "./src/config/objetos/afijos/PrefijosCatalizadores.json";

export {
  cargarConfiguracionCiudad,
  cargarConfiguracionComercio,
  cargarConfiguracionEnemigos,
  cargarConfiguracionMapas,
  cargarConfiguracionPersonaje,
};

export async function cargarConfiguracionObjetos() {
  const [catalogoBase, catalizadores] = await Promise.all([
    cargarConfiguracionObjetosBase(),
    cargarArchivoJson(RUTA_CATALIZADORES, "el catálogo de catalizadores"),
  ]);

  return validarCatalogoCatalizadores(
    aplicarCatalogoCatalizadores({ catalogoBase, catalizadores }),
  );
}

export async function cargarConfiguracionGeneracionObjetos() {
  const [configuracionBase, prefijosCatalizadores] = await Promise.all([
    cargarConfiguracionGeneracionObjetosBase(),
    cargarArchivoJson(
      RUTA_PREFIJOS_CATALIZADORES,
      "el catálogo de prefijos de catalizadores",
    ),
  ]);

  validarObjetoRaiz(prefijosCatalizadores, "el catálogo de prefijos de catalizadores");

  const prefijos = combinarCatalogosSinDuplicados({
    base: configuracionBase.prefijos,
    extension: prefijosCatalizadores,
    descripcion: "prefijo",
  });

  return validarConfiguracionGeneracionCatalizadores({
    ...configuracionBase,
    prefijos,
  });
}

function aplicarCatalogoCatalizadores({ catalogoBase, catalizadores }) {
  validarObjetoRaiz(catalogoBase, "el catálogo base de objetos");
  validarObjetoRaiz(catalizadores, "el catálogo de catalizadores");

  const combinado = copiarDatos(catalogoBase);
  for (const [idOriginal, extension] of Object.entries(catalizadores)) {
    const id = normalizarId(idOriginal, "catalizador");
    validarObjetoRaiz(extension, `la definición del catalizador "${id}"`);

    if (combinado[id]) {
      combinado[id] = combinarPlantillaExistente(combinado[id], extension);
    } else {
      validarPlantillaNueva(extension, id);
      combinado[id] = copiarDatos(extension);
    }
  }

  return combinado;
}

function combinarPlantillaExistente(base, extension) {
  const resultado = { ...copiarDatos(base), ...copiarDatos(extension) };

  // Las propiedades describen un contrato estructural completo. Reemplazarlas
  // evita conservar accidentalmente campos provisionales de una versión previa.
  if (extension.propiedades !== undefined) {
    resultado.propiedades = copiarDatos(extension.propiedades);
  }
  if (extension.ranurasCompatibles !== undefined) {
    resultado.ranurasCompatibles = [...extension.ranurasCompatibles];
  }

  return resultado;
}

function validarPlantillaNueva(plantilla, id) {
  const camposTexto = ["nombre", "tipo", "familiaObjeto", "descripcion"];
  for (const campo of camposTexto) {
    if (typeof plantilla[campo] !== "string" || plantilla[campo].trim() === "") {
      throw new Error(`El catalizador nuevo "${id}" necesita el campo "${campo}".`);
    }
  }
  if (!Array.isArray(plantilla.ranurasCompatibles)) {
    throw new Error(`El catalizador nuevo "${id}" necesita ranuras compatibles.`);
  }
  validarObjetoRaiz(plantilla.propiedades, `las propiedades de "${id}"`);
}

function combinarCatalogosSinDuplicados({ base, extension, descripcion }) {
  validarObjetoRaiz(base, `el catálogo base de ${descripcion}s`);
  const combinado = copiarDatos(base);

  for (const [idOriginal, configuracion] of Object.entries(extension)) {
    const id = normalizarId(idOriginal, descripcion);
    if (Object.prototype.hasOwnProperty.call(combinado, id)) {
      throw new Error(`El ${descripcion} "${id}" ya existe en el catálogo base.`);
    }
    combinado[id] = copiarDatos(configuracion);
  }

  return combinado;
}

async function cargarArchivoJson(ruta, descripcion) {
  const respuesta = await fetch(ruta);
  if (!respuesta.ok) {
    throw new Error(`No se pudo cargar ${descripcion}. Código HTTP: ${respuesta.status}`);
  }

  try {
    return await respuesta.json();
  } catch (error) {
    throw new Error(`${descripcion} no contiene un JSON válido. ${error.message}`);
  }
}

function normalizarId(id, descripcion) {
  if (typeof id !== "string" || !/^[a-z0-9_]+$/.test(id)) {
    throw new Error(`El ID de ${descripcion} "${id}" no es válido.`);
  }
  return id.trim().toLowerCase();
}

function validarObjetoRaiz(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`La raíz de ${descripcion} debe ser un objeto válido.`);
  }
}

function copiarDatos(valor) {
  if (Array.isArray(valor)) return valor.map(copiarDatos);
  if (valor !== null && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor).map(([clave, contenido]) => [clave, copiarDatos(contenido)]),
    );
  }
  return valor;
}
