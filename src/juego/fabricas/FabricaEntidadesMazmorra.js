import { Cofre } from "../../entidad/interactuable/Cofre.js";
import { PortalMapa } from "../../entidad/interactuable/PortalMapa.js";
import { Puerta } from "../../entidad/interactuable/Puerta.js";
import { ContenedorObjetos } from "../../objetos/ContenedorObjetos.js";
import {
  FAMILIAS_ENTIDAD_MAZMORRA,
  obtenerEntidadMazmorraConfigurada,
} from "../configuracion/ValidadorConfiguracionEntidadesMazmorra.js";
import { crearDestructible } from "./FabricaDestructibles.js";

export const DESTINOS_ENTIDAD_MAZMORRA = Object.freeze({
  OBJETIVOS: "objetivos",
  INTERACTUABLES: "interactuables",
  AMBOS: "ambos",
});

// Las entidades estructurales conservan creadores explícitos porque su
// comportamiento es singular. Los objetos ambientales configurables se
// resuelven por catálogo y no necesitan un creador por variante visual.
const CREADORES_ENTIDADES_ESTRUCTURALES = Object.freeze({
  puerta(parametros) {
    return {
      destino: DESTINOS_ENTIDAD_MAZMORRA.INTERACTUABLES,
      entidad: new Puerta(parametros),
    };
  },

  cofre(parametros) {
    const { contenedorObjetos, solicitudContenidoBotin } = resolverContenidoContenedor({
      ...parametros,
      solicitudContenido: parametros.solicitudBotin,
      nombreFuente: parametros.nombre ?? "Cofre",
      capacidadMinima: 6,
    });

    return {
      destino: DESTINOS_ENTIDAD_MAZMORRA.INTERACTUABLES,
      entidad: new Cofre({
        ...parametros,
        contenedorObjetos,
        solicitudContenidoBotin,
      }),
      resultadoBotin: null,
    };
  },

  portal_entrada(parametros) {
    return {
      destino: DESTINOS_ENTIDAD_MAZMORRA.INTERACTUABLES,
      entidad: new PortalMapa({
        nombre: parametros.nombre ?? "Portal de entrada",
        x: parametros.x,
        y: parametros.y,
        simbolo: parametros.simbolo ?? "o",
        recursoVisual: parametros.recursoVisual,
        recursoVisualActivo: parametros.recursoVisualActivo,
        recursoVisualInactivo: parametros.recursoVisualInactivo,
        textoInteraccion: parametros.textoInteraccion ?? "Portal inactivo",
        alcance: parametros.alcance ?? 1,
        prioridad: parametros.prioridad ?? 90,
        activo: false,
      }),
    };
  },
});

export function crearEntidadMazmorra({ id, ...parametros } = {}) {
  const idNormalizado = validarId(id);
  validarPosicion(parametros.x, parametros.y, idNormalizado);

  const creadorEstructural = CREADORES_ENTIDADES_ESTRUCTURALES[idNormalizado];
  if (creadorEstructural) {
    const resultado = creadorEstructural(parametros);
    validarResultadoFabrica(resultado, idNormalizado);
    return resultado;
  }

  const configuracionEntidadesMazmorra =
    parametros.configuracionEntidadesMazmorra;
  const definicion = obtenerEntidadMazmorraConfigurada(
    configuracionEntidadesMazmorra,
    idNormalizado,
  );
  const esRecipiente =
    definicion.familia === FAMILIAS_ENTIDAD_MAZMORRA.RECIPIENTE;
  const contenido = esRecipiente
    ? resolverContenidoContenedor({
        ...parametros,
        nombreFuente: definicion.nombre,
        capacidadMinima: definicion.capacidadContenedor,
      })
    : { contenedorObjetos: null, solicitudContenidoBotin: null, resultadoBotin: null };

  const entidad = crearDestructible({
    id: idNormalizado,
    x: parametros.x,
    y: parametros.y,
    configuracionEntidadesMazmorra,
    objetosIniciales:
      contenido.contenedorObjetos?.obtenerObjetos?.() ?? [],
    solicitudContenidoBotin: contenido.solicitudContenidoBotin,
  });

  return {
    destino: esRecipiente
      ? DESTINOS_ENTIDAD_MAZMORRA.AMBOS
      : DESTINOS_ENTIDAD_MAZMORRA.OBJETIVOS,
    entidad,
    resultadoBotin: contenido.resultadoBotin,
  };
}

export function incorporarEntidadMazmorra({
  id,
  objetivos,
  interactuables,
  ...parametros
} = {}) {
  if (!Array.isArray(objetivos) || !Array.isArray(interactuables)) {
    throw new Error(
      "La integración de entidades de mazmorra necesita listas de objetivos e interactuables.",
    );
  }

  const resultado = crearEntidadMazmorra({ id, ...parametros });

  if (
    resultado.destino === DESTINOS_ENTIDAD_MAZMORRA.OBJETIVOS ||
    resultado.destino === DESTINOS_ENTIDAD_MAZMORRA.AMBOS
  ) {
    objetivos.push(resultado.entidad);
  }
  if (
    resultado.destino === DESTINOS_ENTIDAD_MAZMORRA.INTERACTUABLES ||
    resultado.destino === DESTINOS_ENTIDAD_MAZMORRA.AMBOS
  ) {
    interactuables.push(resultado.entidad);
  }

  return resultado;
}

function resolverContenidoContenedor({
  contenedorObjetos,
  objetosIniciales = null,
  solicitudContenido = null,
  nombreFuente,
  x,
  y,
  nivel = null,
  configuracionObjetos,
  capacidad = null,
  capacidadMinima = 6,
} = {}) {
  if (contenedorObjetos instanceof ContenedorObjetos) {
    return { contenedorObjetos, solicitudContenidoBotin: null, resultadoBotin: null };
  }

  let objetosResueltos = objetosIniciales;
  let solicitudPendiente = null;

  if (
    objetosResueltos === null &&
    solicitudContenido !== null &&
    typeof solicitudContenido === "object" &&
    !Array.isArray(solicitudContenido)
  ) {
    solicitudPendiente = JSON.parse(JSON.stringify(solicitudContenido));
    objetosResueltos = [];
  }

  objetosResueltos ??= [];
  if (!Array.isArray(objetosResueltos)) {
    throw new Error("Los objetos iniciales del contenedor deben ser una lista.");
  }

  const capacidadResuelta =
    capacidad ?? Math.max(capacidadMinima, objetosResueltos.length);

  return {
    contenedorObjetos: new ContenedorObjetos({
      capacidad: capacidadResuelta,
      objetosIniciales: objetosResueltos,
    }),
    solicitudContenidoBotin: solicitudPendiente,
    resultadoBotin: null,
  };
}

function validarId(id) {
  if (typeof id !== "string" || id.trim() === "") {
    throw new Error(
      "Se necesita un ID interno válido para crear una entidad de mazmorra.",
    );
  }
  return id.trim().toLowerCase();
}

function validarPosicion(x, y, id) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new Error(`La posición de la entidad "${id}" debe utilizar enteros.`);
  }
}

function validarResultadoFabrica(resultado, id) {
  if (
    !resultado ||
    !resultado.entidad ||
    !Object.values(DESTINOS_ENTIDAD_MAZMORRA).includes(resultado.destino)
  ) {
    throw new Error(`La fábrica de "${id}" devolvió una integración inválida.`);
  }
}
