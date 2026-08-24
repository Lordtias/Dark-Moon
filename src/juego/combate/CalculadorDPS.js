import {
  calcularCostoAccionCombatiente,
  TIEMPO_REFERENCIA,
  TIPOS_ACCION_TEMPORAL,
} from "../tiempo/SistemaTiempo.js";
import {
  ataqueUsaAccionCompuesta,
  calcularCostoBaseFaseAtaque,
  FASES_ACCION_COMPUESTA,
} from "../acciones/CostosAccionCompuesta.js";
import { obtenerDesgloseCostoBaseAtaque } from "../../entidad/destructible/combatiente/ConfiguracionAtaque.js";

// Calcula el daño bruto medio por turno temporal (DPT) del ataque actual.
//
// Se considera:
//
// - El daño medio del ataque completo.
// - El coste temporal base del arma.
// - El factor temporal general.
// - El factor temporal de ataque.
// - El coste combinado de dos armas y sus fases cuando corresponda.
//
// No se considera:
//
// - Probabilidad de impacto.
// - Armadura del objetivo.
// - Bloqueo del objetivo.
// - Golpes críticos.
//
// Esos valores dependen del enemigo atacado
// o de resultados aleatorios.
export function calcularDptCombatiente(combatiente) {
  if (!combatiente || typeof combatiente !== "object") {
    throw new Error("Se necesita un combatiente válido para calcular DPT.");
  }

  const estadisticas = combatiente.estadisticasDerivadas;

  const danioMedio = estadisticas.danioFisico?.promedio;

  if (!Number.isFinite(danioMedio) || danioMedio < 0) {
    throw new Error(`El daño medio de ${combatiente.nombre} no es válido.`);
  }

  const configuracionAtaque = combatiente.configuracionAtaqueActual;
  const desgloseCostoBase =
    configuracionAtaque.desgloseCostoAtaqueBase ??
    obtenerDesgloseCostoBaseAtaque(configuracionAtaque, combatiente);
  const costoAtaqueBase = configuracionAtaque.costoAtaqueBase ?? desgloseCostoBase.costoBase;

  // Una acción compuesta se mide exactamente como se ejecuta: cada fase pasa
  // por sus modificadores contextuales y luego por los factores temporales.
  const fases = (ataqueUsaAccionCompuesta(configuracionAtaque)
    ? [
        FASES_ACCION_COMPUESTA.PREPARACION,
        FASES_ACCION_COMPUESTA.EJECUCION,
      ]
    : [FASES_ACCION_COMPUESTA.EJECUCION]
  ).map((fase) => {
    const costoBase = ataqueUsaAccionCompuesta(configuracionAtaque)
      ? calcularCostoBaseFaseAtaque({ combatiente, configuracionAtaque, fase })
      : costoAtaqueBase;
    const costoEfectivo = costoBase <= 0
      ? 0
      : calcularCostoAccionCombatiente({
          combatiente,
          tipoAccion: TIPOS_ACCION_TEMPORAL.ATAQUE,
          costoBase,
        });
    return Object.freeze({ fase, costoBase, costoEfectivo });
  });
  const costoAtaqueEfectivo = fases.reduce(
    (total, fase) => total + fase.costoEfectivo,
    0,
  );
  const dpt = costoAtaqueEfectivo > 0
    ? (danioMedio * TIEMPO_REFERENCIA) / costoAtaqueEfectivo
    : 0;

  return Object.freeze({
    dpt,
    danioMedio,
    costoAtaqueBase,
    costoAtaqueEfectivo,
    velocidadAtaqueEfectiva: costoAtaqueEfectivo > 0
      ? TIEMPO_REFERENCIA / costoAtaqueEfectivo
      : 0,
    desgloseCostoBase,
    fases: Object.freeze(fases),
  });
}

// Compatibilidad para consumidores externos que todavía importen el nombre
// histórico. La interfaz deja de presentar segundos y consume DPT.
export function calcularDpsCombatiente(combatiente) {
  const dpt = calcularDptCombatiente(combatiente);
  return Object.freeze({
    ...dpt,
    dps: dpt.dpt,
    duracionAtaqueSegundos: dpt.costoAtaqueEfectivo / TIEMPO_REFERENCIA,
  });
}
