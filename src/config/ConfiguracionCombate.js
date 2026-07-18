// Valores iniciales de balance del sistema de combate.
//
// Se centralizan para poder ajustar las fórmulas
// sin modificar directamente la lógica.
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
  },

  resistencias: {
    minima: -50,
    maxima: 75,
  },

  limites: {
    bloqueoMaximo: 75,
    mitigacionBloqueoMaxima: 100,
    criticoMaximo: 100,
  },
};
