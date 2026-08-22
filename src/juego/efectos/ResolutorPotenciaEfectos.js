import { OBJETIVOS_MODIFICADOR } from "../modificadores/ContratosModificadoresCombatiente.js";
import { crearMultiplicadorPorcentaje } from "../combate/ResolutorEscaladoDanio.js";

export function resolverPotenciaEfectoEspecifica(
  combatiente,
  efectoId,
  contexto = {},
) {
  if (typeof efectoId !== "string" || efectoId.trim() === "") {
    throw new Error("La potencia específica necesita un ID de efecto válido.");
  }
  const idNormalizado = efectoId.trim().toLowerCase();
  const resolucion = combatiente?.sistemaModificadoresCombatiente
    ? combatiente.resolverModificador(
        OBJETIVOS_MODIFICADOR.POTENCIA_EFECTO,
        0,
        { ...contexto, efectoId: idNormalizado },
      )
    : crearResolucionNeutra(idNormalizado, contexto);

  return Object.freeze({
    ...resolucion,
    multiplicador: crearMultiplicadorPorcentaje(resolucion.resultado),
  });
}

function crearResolucionNeutra(efectoId, contexto) {
  return Object.freeze({
    objetivo: OBJETIVOS_MODIFICADOR.POTENCIA_EFECTO,
    valorBase: 0,
    contexto: Object.freeze({ ...contexto, efectoId }),
    resultado: 0,
    desglose: Object.freeze({
      aplicados: Object.freeze([]),
      omitidos: Object.freeze([]),
    }),
  });
}
