import { Cofre } from "../../entidad/interactuable/Cofre.js";
import { PortalMapa } from "../../entidad/interactuable/PortalMapa.js";
import { Puerta } from "../../entidad/interactuable/Puerta.js";
import { ContenedorObjetos } from "../../objetos/ContenedorObjetos.js";
import { crearDestructible } from "./FabricaDestructibles.js";
import { generarContenidoBotin } from "../botin/SistemaBotin.js";

export const DESTINOS_ENTIDAD_MAZMORRA = Object.freeze({
  OBJETIVOS: "objetivos",
  INTERACTUABLES: "interactuables",
});

// Relación única entre IDs estables de población y clases concretas.
// El poblador de E2.B no necesitará conocer constructores ni decidir en qué
// colección runtime debe registrarse cada entidad.
const CREADORES_ENTIDADES_MAZMORRA = Object.freeze({
  barril(parametros) {
    return {
      destino: DESTINOS_ENTIDAD_MAZMORRA.OBJETIVOS,
      entidad: crearDestructible({
        id: "barril",
        x: parametros.x,
        y: parametros.y,
      }),
    };
  },

  puerta(parametros) {
    return {
      destino: DESTINOS_ENTIDAD_MAZMORRA.INTERACTUABLES,
      entidad: new Puerta(parametros),
    };
  },

  cofre(parametros) {
    const { contenedorObjetos, resultadoBotin } =
      resolverContenidoCofre(parametros);

    return {
      destino: DESTINOS_ENTIDAD_MAZMORRA.INTERACTUABLES,
      entidad: new Cofre({
        ...parametros,
        contenedorObjetos,
      }),
      resultadoBotin,
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

  const creador = CREADORES_ENTIDADES_MAZMORRA[idNormalizado];
  if (!creador) {
    throw new Error(
      `No existe una entidad de mazmorra registrada como "${idNormalizado}".`,
    );
  }

  const resultado = creador(parametros);
  validarResultadoFabrica(resultado, idNormalizado);
  return resultado;
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
  const destino =
    resultado.destino === DESTINOS_ENTIDAD_MAZMORRA.OBJETIVOS
      ? objetivos
      : interactuables;

  destino.push(resultado.entidad);
  return resultado;
}

function resolverContenidoCofre(parametros) {
  if (parametros.contenedorObjetos instanceof ContenedorObjetos) {
    return {
      contenedorObjetos: parametros.contenedorObjetos,
      resultadoBotin: null,
    };
  }

  let objetosIniciales = parametros.objetosIniciales ?? null;
  let resultadoBotin = null;

  if (objetosIniciales === null && Array.isArray(parametros.tablaBotin)) {
    resultadoBotin = generarContenidoBotin({
      fuente: {
        nombre: parametros.nombre ?? "Cofre",
        x: parametros.x,
        y: parametros.y,
        nivel: parametros.nivel ?? null,
        tablaBotin: parametros.tablaBotin,
      },
      configuracionObjetos: parametros.configuracionObjetos,
      aleatorio: parametros.aleatorio,
    });
    objetosIniciales = resultadoBotin.objetosGenerados;
  }

  objetosIniciales ??= [];
  if (!Array.isArray(objetosIniciales)) {
    throw new Error("Los objetos iniciales del cofre deben ser una lista.");
  }

  const capacidad = parametros.capacidad ?? Math.max(6, objetosIniciales.length);
  return {
    contenedorObjetos: new ContenedorObjetos({
      capacidad,
      objetosIniciales,
    }),
    resultadoBotin,
  };
}

function validarId(id) {
  if (typeof id !== "string" || id.trim() === "") {
    throw new Error(
      "Se necesita un ID interno válido para crear una entidad de mazmorra.",
    );
  }
  return id.trim();
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
