import { TIPOS_DANIO, normalizarTipoDanio } from "./ComponentesDanio.js";
import { OBJETIVOS_MODIFICADOR } from "../modificadores/ContratosModificadoresCombatiente.js";

export function crearMultiplicadorPorcentaje(porcentaje = 0) {
  if (!Number.isFinite(porcentaje)) {
    throw new Error("La bonificación porcentual de daño debe ser numérica.");
  }
  return Math.max(0, 1 + porcentaje / 100);
}

export function resolverDanioFisicoGlobal(combatiente, contexto = {}) {
  return resolverPorcentajeGlobal({
    combatiente,
    objetivo: OBJETIVOS_MODIFICADOR.DANO_FISICO,
    valorBase: 0,
    contexto,
  });
}

export function resolverDanioMagicoGlobal(
  combatiente,
  bonificacionBase = 0,
  contexto = {},
) {
  return resolverPorcentajeGlobal({
    combatiente,
    objetivo: OBJETIVOS_MODIFICADOR.DANO_MAGICO,
    valorBase: bonificacionBase,
    contexto,
  });
}

export function resolverDanioHabilidadGlobal(
  combatiente,
  valorBase = 0,
  contexto = {},
) {
  return resolverPorcentajeGlobal({
    combatiente,
    objetivo: OBJETIVOS_MODIFICADOR.DANO_HABILIDAD,
    valorBase,
    contexto,
  });
}

export function resolverDanioTipoGlobal(combatiente, tipo, contexto = {}) {
  const tipoNormalizado = normalizarTipoDanio(tipo);
  if (tipoNormalizado === TIPOS_DANIO.FISICO) {
    return crearResolucionNeutra(OBJETIVOS_MODIFICADOR.DANO_TIPO, {
      ...contexto,
      tipoDanio: tipoNormalizado,
    });
  }
  return resolverPorcentajeGlobal({
    combatiente,
    objetivo: OBJETIVOS_MODIFICADOR.DANO_TIPO,
    valorBase: 0,
    contexto: { ...contexto, tipoDanio: tipoNormalizado },
  });
}

export function resolverMultiplicadorComponenteDanio({
  combatiente,
  tipo,
  bonificacionDanioMagicoBase = 0,
  aplicaDanioFisicoGlobal = true,
  contexto = {},
} = {}) {
  const tipoNormalizado = normalizarTipoDanio(tipo);
  if (tipoNormalizado === TIPOS_DANIO.FISICO) {
    const danioFisico = aplicaDanioFisicoGlobal
      ? resolverDanioFisicoGlobal(combatiente, contexto)
      : crearResolucionNeutra(OBJETIVOS_MODIFICADOR.DANO_FISICO, contexto);
    return Object.freeze({
      tipo: tipoNormalizado,
      danioFisico,
      danioMagico: null,
      danioTipo: null,
      multiplicador: danioFisico.multiplicador,
    });
  }

  const danioMagico = resolverDanioMagicoGlobal(
    combatiente,
    bonificacionDanioMagicoBase,
    contexto,
  );
  const danioTipo = resolverDanioTipoGlobal(combatiente, tipoNormalizado, contexto);
  return Object.freeze({
    tipo: tipoNormalizado,
    danioFisico: null,
    danioMagico,
    danioTipo,
    multiplicador: danioMagico.multiplicador * danioTipo.multiplicador,
  });
}

function resolverPorcentajeGlobal({ combatiente, objetivo, valorBase, contexto }) {
  if (!Number.isFinite(valorBase)) {
    throw new Error(`El valor base de "${objetivo}" debe ser numérico.`);
  }
  const resolucion = combatiente?.sistemaModificadoresCombatiente
    ? combatiente.resolverModificador(objetivo, valorBase, contexto)
    : crearResolucionSimple(objetivo, valorBase, contexto);
  return Object.freeze({
    ...resolucion,
    multiplicador: crearMultiplicadorPorcentaje(resolucion.resultado),
  });
}

function crearResolucionNeutra(objetivo, contexto) {
  return Object.freeze({
    ...crearResolucionSimple(objetivo, 0, contexto),
    multiplicador: 1,
  });
}

function crearResolucionSimple(objetivo, valorBase, contexto) {
  return Object.freeze({
    objetivo,
    valorBase,
    contexto: Object.freeze({ ...(contexto ?? {}) }),
    resultado: valorBase,
    desglose: Object.freeze({
      aplicados: Object.freeze([]),
      omitidos: Object.freeze([]),
    }),
  });
}
