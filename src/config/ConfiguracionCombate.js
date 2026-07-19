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

  // Eficiencia inicial al combatir con dos armas.
  //
  // La suma de los multiplicadores de daño es 100%,
  // por lo que dos armas iguales mantienen un daño
  // aproximado al de una sola arma, pero producen
  // dos impactos independientes.
  //
  // El recargo temporal representa el tiempo adicional
  // necesario para utilizar también la mano secundaria.
  dosArmas: {
    multiplicadorManoPrincipal: 0.6,
    multiplicadorManoSecundaria: 0.4,

    // El ataque utiliza el coste completo del arma
    // más lenta y agrega el 30% del arma más rápida.
    recargoTemporalSecundaria: 0.3,
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
