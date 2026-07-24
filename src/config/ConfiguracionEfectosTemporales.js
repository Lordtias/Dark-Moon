// Centraliza los límites y prioridades del motor de efectos temporales.
//
// Los valores de esta configuración forman parte de la infraestructura.
// Las habilidades futuras podrán aportar su propio balance sin modificar
// la lógica del sistema.
export const CONFIGURACION_EFECTOS_TEMPORALES = Object.freeze({
  limites: Object.freeze({
    duracionMinima: 1,
    intervaloMinimo: 1,
    maximoAcumulacionesPredeterminado: 1,
    multiplicadorFactorMinimo: 0.1,
    multiplicadorFactorMaximo: 10,
  }),

  // Cuando un tick y el vencimiento coinciden, el tick se procesa primero.
  prioridadesAgenda: Object.freeze({
    tick: 10,
    vencimiento: 20,
  }),

  // Una transición válida no consume unidades temporales. Los efectos del
  // jugador se suspenden con tiempos relativos y se reanudan en el mapa nuevo.
  transferencia: Object.freeze({
    conservarEfectosJugadorEntreMapas: true,
  }),
});
