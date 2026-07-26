import {
  componerPropiedadesObjeto,
  generarAfijosObjeto as generarAfijosObjetoBase,
  puedeGenerarRarezaParaPlantilla as puedeGenerarRarezaParaPlantillaBase,
} from "./SistemaAfijos.js";

export { componerPropiedadesObjeto };

export function puedeGenerarRarezaParaPlantilla(opciones = {}) {
  const catalogos = filtrarCatalogosPorFamilia(opciones);
  return puedeGenerarRarezaParaPlantillaBase({ ...opciones, ...catalogos });
}

export function generarAfijosObjeto(opciones = {}) {
  const catalogos = filtrarCatalogosPorFamilia(opciones);
  return generarAfijosObjetoBase({ ...opciones, ...catalogos });
}

function filtrarCatalogosPorFamilia({
  plantilla,
  catalogoPrefijos,
  catalogoSufijos,
} = {}) {
  return {
    catalogoPrefijos: filtrarCatalogo({
      catalogo: catalogoPrefijos,
      plantilla,
    }),
    catalogoSufijos: filtrarCatalogo({ catalogo: catalogoSufijos, plantilla }),
  };
}

function filtrarCatalogo({ catalogo, plantilla }) {
  if (
    catalogo === null ||
    typeof catalogo !== "object" ||
    Array.isArray(catalogo)
  ) {
    return catalogo;
  }

  return Object.fromEntries(
    Object.entries(catalogo).filter(([, afijo]) =>
      esCompatibleConFamilia({ afijo, plantilla }),
    ),
  );
}

function esCompatibleConFamilia({ afijo, plantilla }) {
  const aplicacion = afijo?.aplicaA;
  if (!aplicacion || typeof aplicacion !== "object") return true;

  const familia = plantilla?.familiaObjeto ?? null;
  const incluidas = aplicacion.familiasIncluidas ?? [];
  const excluidas = aplicacion.familiasExcluidas ?? [];

  if (!Array.isArray(incluidas) || !Array.isArray(excluidas)) {
    throw new Error(
      `Las familias compatibles del afijo "${afijo?.nombre}" no son válidas.`,
    );
  }

  if (incluidas.length > 0 && !incluidas.includes(familia)) return false;
  return !excluidas.includes(familia);
}
