import { CONFIGURACION_COMBATE } from "../../config/ConfiguracionCombate.js";
import { limitar } from "../../utilidades/Numeros.js";

function validarNumeroFinito(valor, descripcion) {
  if (!Number.isFinite(valor)) {
    throw new Error(`${descripcion} debe ser un número finito.`);
  }
}

// Las fuentes base conservan sus validaciones históricas. Este contrato se
// aplica únicamente al resultado efectivo que consumen combate, efectos y UI.
export function normalizarResistenciaEfectiva(
  valor = 0,
  descripcion = "La resistencia efectiva",
) {
  validarNumeroFinito(valor, descripcion);
  return limitar(
    valor,
    CONFIGURACION_COMBATE.resistencias.minimaEfectiva,
    CONFIGURACION_COMBATE.resistencias.maxima,
  );
}


export function obtenerLimitesResistenciaEfectiva() {
  return Object.freeze({
    minima: CONFIGURACION_COMBATE.resistencias.minimaEfectiva,
    maxima: CONFIGURACION_COMBATE.resistencias.maxima,
  });
}

export function calcularMultiplicadorResistencia(resistencia = 0) {
  const efectiva = normalizarResistenciaEfectiva(resistencia);
  return 1 - efectiva / 100;
}

export function calcularProbabilidadConResistencia(
  probabilidadBase,
  resistencia = 0,
) {
  validarNumeroFinito(probabilidadBase, "La probabilidad base");
  return limitar(
    probabilidadBase * calcularMultiplicadorResistencia(resistencia),
    0,
    100,
  );
}

export function esVulnerabilidadResistencia(resistencia = 0) {
  return normalizarResistenciaEfectiva(resistencia) < 0;
}
