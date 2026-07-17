// Valores iniciales de balance del nuevo sistema.
// Se centralizan para poder ajustarlos sin modificar las fórmulas.
export const CONFIGURACION_COMBATE = {
  atributos: {
    danioPorPuntoRespectoDiez: 0.02,
    precisionPorDestreza: 3,
    evasionPorDestreza: 2,
    vidaPorConstitucion: 5,
    manaPorInteligencia: 4,
    regeneracionVidaPorConstitucion: 0.1,
    regeneracionManaPorSabiduria: 0.1,
    resistenciaElementalPorSabiduria: 0.5,
    resistenciaVenenoPorConstitucion: 0.2,
    potenciaEfectosPorSabiduria: 2,
    resistenciaMentalPorSabiduria: 2,
    potenciaAuraPorCarisma: 2,
  },

  impacto: {
    factorFormula: 200,
    probabilidadMinima: 5,
    probabilidadMaxima: 95,
  },

  armadura: {
    factorDanio: 10,
    danioMinimo: 1,
  },

  resistencias: {
    minima: -50,
    maxima: 75,
  },

  limites: {
    bloqueoMaximo: 75,
    criticoMaximo: 100,
  },
};
