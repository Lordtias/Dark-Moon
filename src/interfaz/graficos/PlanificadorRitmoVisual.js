import { limitar } from "../../utilidades/Numeros.js";
import {
  obtenerConfiguracionRitmoVisual,
  obtenerPerfilAtaque,
  obtenerSecuenciaAtaque,
} from "./ContextoPerfilesAtaquePorFamilia.js";
import {
  obtenerSecuenciaHabilidadVisual,
} from "./ContextoPerfilesHabilidadesVisuales.js";

export function crearPlanRitmoVisualAtaque({
  configuracionAtaque,
  ejecucionTemporal,
} = {}) {
  const costoFinal = ejecucionTemporal?.costoFinal;
  if (!Number.isInteger(costoFinal) || costoFinal <= 0) {
    return null;
  }

  const idSecuencia = resolverIdSecuencia(configuracionAtaque);
  const proporciones = obtenerSecuenciaAtaque(idSecuencia);
  const duracionTotalMs = convertirCostoFinalADuracionVisual(costoFinal);
  const fases = distribuirDuracionPorFases({
    duracionTotalMs,
    proporciones,
  });

  return Object.freeze({
    costoFinal,
    duracionTotalMs,
    secuencia: idSecuencia,
    fases,
  });
}


export function crearPlanRitmoVisualHabilidad({
  perfilVisual,
  ejecucionTemporal,
} = {}) {
  const idSecuencia = perfilVisual?.secuencia;
  if (typeof idSecuencia !== "string" || idSecuencia === "") {
    throw new Error("La habilidad necesita una secuencia visual válida.");
  }

  const costoFinal = ejecucionTemporal?.costoFinal;
  const usaCostoTemporal = Number.isInteger(costoFinal) && costoFinal > 0;
  const duracionVisualFija = Number(perfilVisual?.duracionVisualMs);
  const usaDuracionVisualFija =
    Number.isFinite(duracionVisualFija) && duracionVisualFija > 0;

  if (!usaCostoTemporal && !usaDuracionVisualFija) {
    return null;
  }

  const proporciones = obtenerSecuenciaHabilidadVisual(idSecuencia);
  const duracionTotalMs = usaCostoTemporal
    ? convertirCostoFinalADuracionVisual(costoFinal)
    : Math.round(duracionVisualFija);

  return Object.freeze({
    costoFinal: usaCostoTemporal ? costoFinal : null,
    duracionTotalMs,
    secuencia: idSecuencia,
    origenDuracion: usaCostoTemporal ? "costo_temporal" : "visual_fija",
    fases: distribuirDuracionPorFases({
      duracionTotalMs,
      proporciones,
    }),
  });
}

const PROPORCIONES_CONSUMO = Object.freeze({
  preparacion: 0.2,
  uso: 0.2,
  recuperacion: 0.45,
  retorno: 0.15,
});

export function crearPlanRitmoVisualConsumo({ ejecucionTemporal } = {}) {
  const costoFinal = ejecucionTemporal?.costoFinal;
  if (!Number.isInteger(costoFinal) || costoFinal <= 0) {
    return null;
  }
  const duracionTotalMs = convertirCostoFinalADuracionVisual(costoFinal);
  return Object.freeze({
    costoFinal,
    duracionTotalMs,
    secuencia: "consumo",
    fases: distribuirDuracionPorFases({
      duracionTotalMs,
      proporciones: PROPORCIONES_CONSUMO,
    }),
  });
}

export function crearPlanRitmoVisualMovimiento({ ejecucionTemporal } = {}) {
  const costoBase = ejecucionTemporal?.costoBase;
  const costoFinal = ejecucionTemporal?.costoFinal;
  if (
    !Number.isInteger(costoBase) ||
    costoBase <= 0 ||
    !Number.isInteger(costoFinal) ||
    costoFinal <= 0
  ) {
    return null;
  }

  return Object.freeze({
    costoBase,
    costoFinal,
    factorTemporal: costoFinal / costoBase,
  });
}

function convertirCostoFinalADuracionVisual(costoFinal) {
  if (!Number.isInteger(costoFinal) || costoFinal <= 0) {
    throw new Error(
      "El ritmo visual necesita un costoFinal entero mayor que 0.",
    );
  }

  const configuracion = obtenerConfiguracionRitmoVisual();
  const duracionCalculada = Math.round(
    costoFinal * configuracion.milisegundosPorUnidadTemporal,
  );

  return limitar(
    duracionCalculada,
    configuracion.duracionMinimaMs,
    configuracion.duracionMaximaMs,
  );
}

function resolverIdSecuencia(configuracionAtaque) {
  if (esAtaqueDualDeVaritas(configuracionAtaque)) {
    return "proyectil_dual";
  }

  if (configuracionAtaque?.esAtaqueDual === true) {
    return "dual";
  }

  const fuentePrincipal = configuracionAtaque?.fuentes?.[0] ?? null;
  const perfil = obtenerPerfilAtaque({
    familiaObjeto: fuentePrincipal?.familiaObjeto ?? null,
    esAtaqueNatural: fuentePrincipal?.esAtaqueNatural === true,
  });

  return perfil.secuencia;
}

function esAtaqueDualDeVaritas(configuracionAtaque) {
  const fuentes = configuracionAtaque?.fuentes ?? [];
  return configuracionAtaque?.esAtaqueDual === true &&
    fuentes.length === 2 &&
    fuentes.every((fuente) => fuente?.familiaObjeto === "varita");
}

function distribuirDuracionPorFases({
  duracionTotalMs,
  proporciones,
}) {
  const entradas = Object.entries(proporciones);
  const fases = {};
  let duracionAsignada = 0;

  entradas.forEach(([idFase, proporcion], indice) => {
    const esUltimaFase = indice === entradas.length - 1;
    const duracion = esUltimaFase
      ? duracionTotalMs - duracionAsignada
      : Math.max(1, Math.round(duracionTotalMs * proporcion));

    fases[idFase] = duracion;
    duracionAsignada += duracion;
  });

  return Object.freeze(fases);
}
