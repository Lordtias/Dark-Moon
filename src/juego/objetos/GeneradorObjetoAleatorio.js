import { crearObjeto } from "../../objetos/FabricaObjetos.js";
import { RAREZAS_OBJETO } from "./RarezasObjeto.js";
import { seleccionarRarezaObjeto } from "./GeneradorRarezaObjeto.js";
import {
  componerPropiedadesObjeto,
  generarAfijosObjeto,
  puedeGenerarRarezaParaPlantilla,
} from "./SistemaAfijos.js";

const TIPOS_EQUIPABLES_CON_AFIJOS = new Set(["arma", "armadura", "quiver"]);

// Crea una instancia completa usando la plantilla, el nivel,
// las rarezas activas, los afijos compatibles y el generador
// pseudoaleatorio reproducible.
//
// Esta función todavía no está conectada a SistemaBotin.
export function crearObjetoGenerado({
  configuracionObjetos,
  configuracionGeneracionObjetos,
  idObjeto,
  cantidad = 1,
  nivelObjeto = 1,
  aleatorio,
  rarezaForzada = null,
} = {}) {
  validarObjetoPlano(configuracionObjetos, "La configuración de objetos");
  validarConfiguracionGeneracion(configuracionGeneracionObjetos);
  validarIdObjeto(idObjeto);
  validarNivelObjeto(nivelObjeto);
  validarAleatorio(aleatorio);

  const idNormalizado = idObjeto.trim().toLowerCase();
  const plantilla = configuracionObjetos[idNormalizado];

  if (!plantilla) {
    throw new Error(`No existe el objeto "${idNormalizado}".`);
  }

  // Materiales, municiones y consumibles continúan siendo comunes.
  if (!puedeRecibirAfijosAleatorios(plantilla)) {
    validarRarezaForzadaNoEquipable(rarezaForzada);

    return crearObjeto({
      configuracionObjetos,
      idObjeto: idNormalizado,
      cantidad,
      rareza: RAREZAS_OBJETO.COMUN,
      nivelObjeto,
    });
  }

  const { rarezas, prefijos, sufijos } = configuracionGeneracionObjetos;

  const idsPermitidos = obtenerRarezasPermitidasParaPlantilla({
    plantilla,
    nivelObjeto,
    rarezas,
    prefijos,
    sufijos,
  });

  const rarezaSeleccionada = seleccionarRarezaObjeto({
    configuracionRarezas: rarezas,
    nivelObjeto,
    aleatorio,
    idsPermitidos,
    rarezaForzada,
  });

  const idRareza = rarezaSeleccionada.id;
  const configuracionRareza = rarezaSeleccionada.configuracion;

  const afijos = generarAfijosObjeto({
    plantilla,
    idRareza,
    configuracionRareza,
    nivelObjeto,
    catalogoPrefijos: prefijos,
    catalogoSufijos: sufijos,
    aleatorio,
  });

  const propiedadesFinales = componerPropiedadesObjeto({
    propiedadesBase: plantilla.propiedades ?? {},
    prefijos: afijos.prefijos,
    sufijos: afijos.sufijos,
  });

  return crearObjeto({
    configuracionObjetos,
    idObjeto: idNormalizado,
    cantidad,
    rareza: idRareza,
    nivelObjeto,
    prefijos: afijos.prefijos,
    sufijos: afijos.sufijos,
    propiedadesFinales,
  });
}

// Excluye una rareza cuando no puede alcanzar la cantidad mínima
// de afijos compatible con la plantilla y el nivel actuales.
export function obtenerRarezasPermitidasParaPlantilla({
  plantilla,
  nivelObjeto,
  rarezas,
  prefijos,
  sufijos,
} = {}) {
  const permitidas = [];

  for (const [idRareza, configuracionRareza] of Object.entries(rarezas)) {
    if (
      configuracionRareza.estado !== "activo" ||
      configuracionRareza.nivelObjetoMinimo > nivelObjeto
    ) {
      continue;
    }

    if (
      puedeGenerarRarezaParaPlantilla({
        plantilla,
        idRareza,
        configuracionRareza,
        nivelObjeto,
        catalogoPrefijos: prefijos,
        catalogoSufijos: sufijos,
      })
    ) {
      permitidas.push(idRareza);
    }
  }

  if (permitidas.length === 0) {
    throw new Error("La plantilla no tiene ninguna rareza activa disponible.");
  }

  return permitidas;
}

function puedeRecibirAfijosAleatorios(plantilla) {
  const ranuras = plantilla.ranurasCompatibles ?? [];

  return (
    TIPOS_EQUIPABLES_CON_AFIJOS.has(plantilla.tipo) &&
    Array.isArray(ranuras) &&
    ranuras.length > 0
  );
}

function validarRarezaForzadaNoEquipable(rarezaForzada) {
  if (rarezaForzada === null) return;

  if (
    typeof rarezaForzada !== "string" ||
    rarezaForzada.trim().toLowerCase() !== RAREZAS_OBJETO.COMUN
  ) {
    throw new Error(
      "Los objetos no equipables solamente pueden ser comunes en esta etapa.",
    );
  }
}

function validarConfiguracionGeneracion(configuracion) {
  validarObjetoPlano(configuracion, "La configuración de generación");

  for (const catalogo of ["rarezas", "prefijos", "sufijos"]) {
    validarObjetoPlano(configuracion[catalogo], `El catálogo de ${catalogo}`);
  }
}

function validarIdObjeto(idObjeto) {
  if (typeof idObjeto !== "string" || idObjeto.trim() === "") {
    throw new Error("Se necesita el identificador del objeto a generar.");
  }
}

function validarNivelObjeto(nivelObjeto) {
  if (!Number.isInteger(nivelObjeto) || nivelObjeto < 1) {
    throw new Error(
      "El nivel del objeto debe ser un entero mayor o igual que 1.",
    );
  }
}

function validarAleatorio(aleatorio) {
  if (
    !aleatorio ||
    typeof aleatorio.siguiente !== "function" ||
    typeof aleatorio.entero !== "function" ||
    typeof aleatorio.elegir !== "function"
  ) {
    throw new Error(
      "Se necesita un generador aleatorio válido para generar el objeto.",
    );
  }
}

function validarObjetoPlano(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`${descripcion} debe formar un objeto válido.`);
  }
}
