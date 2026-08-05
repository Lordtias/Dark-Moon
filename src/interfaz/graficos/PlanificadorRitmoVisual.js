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
  const costoFinal = ejecucionTemporal?.costoFinal;
  if (!Number.isInteger(costoFinal) || costoFinal <= 0) {
    return null;
  }
  const idSecuencia = perfilVisual?.secuencia;
  if (typeof idSecuencia !== "string" || idSecuencia === "") {
    throw new Error("La habilidad necesita una secuencia visual válida.");
  }
  const proporciones = obtenerSecuenciaHabilidadVisual(idSecuencia);
  const duracionTotalMs = convertirCostoFinalADuracionVisual(costoFinal);
  return Object.freeze({
    costoFinal,
    duracionTotalMs,
    secuencia: idSecuencia,
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

export function convertirCostoFinalADuracionVisual(costoFinal) {
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

function limitar(valor, minimo, maximo) {
  return Math.min(maximo, Math.max(minimo, valor));
}
