import { CONFIGURACION_COMBATE } from "../../config/ConfiguracionCombate.js";
import { OBJETIVOS_MODIFICADOR } from "../modificadores/ContratosModificadoresCombatiente.js";

export const FASES_ACCION_COMPUESTA = Object.freeze({
  PREPARACION: "preparacion",
  EJECUCION: "ejecucion",
});

export const TIPOS_ACCION_COMPUESTA = Object.freeze({
  ATAQUE: "ataque",
  HABILIDAD: "habilidad",
});

function obtenerPerfilAtaque(configuracionAtaque) {
  if (configuracionAtaque?.propiedadesControladoras?.requierePreparacionAtaque !== true) {
    return null;
  }
  const familia = configuracionAtaque.armaControladora?.familiaObjeto ?? null;
  const perfil = CONFIGURACION_COMBATE.accionesCompuestas?.ataque?.porFamilia?.[familia] ?? null;
  if (!perfil) {
    throw new Error(`No existe un perfil de acción compuesta para la familia "${familia}".`);
  }
  const preparacion = Number(perfil.preparacion);
  const ejecucion = Number(perfil.ejecucion);
  if (!Number.isFinite(preparacion) || !Number.isFinite(ejecucion) || preparacion < 0 || ejecucion < 0 || Math.abs(preparacion + ejecucion - 1) > 0.000001) {
    throw new Error(`El perfil temporal de "${familia}" debe sumar exactamente 1.`);
  }
  return Object.freeze({ familia, preparacion, ejecucion });
}

export function ataqueUsaAccionCompuesta(configuracionAtaque) {
  return obtenerPerfilAtaque(configuracionAtaque) !== null;
}

export function obtenerCostosBaseFasesAtaque(configuracionAtaque) {
  const perfil = obtenerPerfilAtaque(configuracionAtaque);
  const total = configuracionAtaque?.costoAtaqueBase;
  if (!Number.isInteger(total) || total <= 0) {
    throw new Error("El ataque necesita un costo base válido para dividir sus fases.");
  }
  if (!perfil) {
    return Object.freeze({ preparacion: 0, ejecucion: total, total });
  }
  const preparacion = Math.round(total * perfil.preparacion);
  const ejecucion = total - preparacion;
  return Object.freeze({ preparacion, ejecucion, total });
}

export function calcularCostoBaseFaseAtaque({ combatiente, configuracionAtaque, fase } = {}) {
  if (!combatiente || typeof combatiente !== "object") {
    throw new Error("Se necesita un combatiente para resolver el coste de fase.");
  }
  if (!Object.values(FASES_ACCION_COMPUESTA).includes(fase)) {
    throw new Error(`La fase de acción "${fase}" no es válida.`);
  }
  const costos = obtenerCostosBaseFasesAtaque(configuracionAtaque);
  const valorBase = costos[fase];
  const arma = configuracionAtaque?.armaControladora;
  const contexto = {
    tipoAccion: TIPOS_ACCION_COMPUESTA.ATAQUE,
    faseAccion: fase,
    familiaArma: arma?.familiaObjeto ?? null,
    tipoAtaque: configuracionAtaque?.propiedadesControladoras?.tipoAtaque ?? null,
    esAtaqueDual: configuracionAtaque?.esAtaqueDual === true,
  };
  const resuelto = combatiente.obtenerValorModificado(
    OBJETIVOS_MODIFICADOR.COSTO_FASE_ACCION,
    valorBase,
    contexto,
  );
  if (!Number.isFinite(resuelto)) {
    throw new Error("El coste de fase resuelto no es válido.");
  }
  return Math.max(0, Math.round(resuelto));
}

export function calcularCostoBaseFaseHabilidadArma({
  combatiente,
  configuracionAtaque,
  fase,
  idHabilidad,
  factorPreparacion = 1,
} = {}) {
  if (!combatiente || typeof combatiente !== "object") {
    throw new Error("Se necesita un combatiente para resolver la fase de habilidad de arma.");
  }
  if (!Object.values(FASES_ACCION_COMPUESTA).includes(fase)) {
    throw new Error(`La fase de acción "${fase}" no es válida.`);
  }
  if (typeof idHabilidad !== "string" || idHabilidad.trim() === "") {
    throw new Error("La fase de habilidad de arma necesita un ID de habilidad.");
  }
  if (!Number.isFinite(factorPreparacion) || factorPreparacion <= 0) {
    throw new Error("El factor de preparación de la habilidad debe ser mayor que 0.");
  }

  const costos = obtenerCostosBaseFasesAtaque(configuracionAtaque);
  let valorBase = costos[fase];
  if (fase === FASES_ACCION_COMPUESTA.PREPARACION) {
    valorBase = Math.round(valorBase * factorPreparacion);
  }
  const arma = configuracionAtaque?.armaControladora;
  const contexto = {
    tipoAccion: TIPOS_ACCION_COMPUESTA.HABILIDAD,
    faseAccion: fase,
    familiaArma: arma?.familiaObjeto ?? null,
    tipoAtaque: configuracionAtaque?.propiedadesControladoras?.tipoAtaque ?? null,
    esAtaqueDual: configuracionAtaque?.esAtaqueDual === true,
    idHabilidad: idHabilidad.trim().toLowerCase(),
  };
  const resuelto = combatiente.obtenerValorModificado(
    OBJETIVOS_MODIFICADOR.COSTO_FASE_ACCION,
    valorBase,
    contexto,
  );
  if (!Number.isFinite(resuelto)) {
    throw new Error("El coste de fase de habilidad resuelto no es válido.");
  }
  return Math.max(0, Math.round(resuelto));
}

