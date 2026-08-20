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

// Calcula el DPS bruto del ataque actual.
//
// Se considera:
//
// - El daño medio del ataque completo.
// - El coste temporal base del arma.
// - El factor temporal general.
// - El factor temporal de ataque.
// - El coste combinado de dos armas.
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
export function calcularDpsCombatiente(combatiente) {
  if (!combatiente || typeof combatiente !== "object") {
    throw new Error("Se necesita un combatiente válido para calcular DPS.");
  }

  const estadisticas = combatiente.estadisticasDerivadas;

  const danioMedio = estadisticas.danioFisico?.promedio;

  if (!Number.isFinite(danioMedio) || danioMedio < 0) {
    throw new Error(`El daño medio de ${combatiente.nombre} no es válido.`);
  }

  const configuracionAtaque = combatiente.configuracionAtaqueActual;
  const costoAtaqueBase = combatiente.costoAtaqueActual;

  // Una acción compuesta se mide exactamente como se ejecuta: cada fase pasa
  // por sus modificadores contextuales y luego por los factores temporales.
  const costosBaseFases = ataqueUsaAccionCompuesta(configuracionAtaque)
    ? [
        calcularCostoBaseFaseAtaque({
          combatiente,
          configuracionAtaque,
          fase: FASES_ACCION_COMPUESTA.PREPARACION,
        }),
        calcularCostoBaseFaseAtaque({
          combatiente,
          configuracionAtaque,
          fase: FASES_ACCION_COMPUESTA.EJECUCION,
        }),
      ]
    : [costoAtaqueBase];
  const costoAtaqueEfectivo = costosBaseFases.reduce((total, costoBase) => {
    if (costoBase <= 0) return total;
    return total + calcularCostoAccionCombatiente({
      combatiente,
      tipoAccion: TIPOS_ACCION_TEMPORAL.ATAQUE,
      costoBase,
    });
  }, 0);

  // Cien unidades temporales representan
  // un segundo completo.
  const duracionAtaqueSegundos = costoAtaqueEfectivo / TIEMPO_REFERENCIA;

  const dps =
    duracionAtaqueSegundos > 0 ? danioMedio / duracionAtaqueSegundos : 0;

  return {
    dps,
    danioMedio,
    costoAtaqueBase,
    costoAtaqueEfectivo,
    duracionAtaqueSegundos,
  };
}
