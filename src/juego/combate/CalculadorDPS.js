import {
  calcularCostoAccionCombatiente,
  TIEMPO_REFERENCIA,
  TIPOS_ACCION_TEMPORAL,
} from "../tiempo/SistemaTiempo.js";

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

  const costoAtaqueBase = combatiente.costoAtaqueActual;

  // Aplicamos factorTiempo y factorAtaque
  // exactamente igual que al registrar
  // una acción real en la agenda.
  const costoAtaqueEfectivo = calcularCostoAccionCombatiente({
    combatiente,

    tipoAccion: TIPOS_ACCION_TEMPORAL.ATAQUE,

    costoBase: costoAtaqueBase,
  });

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
