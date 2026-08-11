export const CLASE_CAPTURA_ENTRADA_INTERFAZ = "interfaz-captura-entrada";

// Expone un único criterio visual para saber si la interfaz de partida está
// consumiendo la entrada del usuario. Los controladores jugables no necesitan
// conocer qué panel o modal concreto produjo el bloqueo.
export function estaEntradaJugableCapturada(documento = globalThis.document) {
  return Boolean(
    documento?.body?.classList?.contains(CLASE_CAPTURA_ENTRADA_INTERFAZ),
  );
}
