// Valores iniciales de balance del sistema de combate.
//
// Se centralizan para poder ajustar las fórmulas
// sin modificar directamente la lógica.
export const CONFIGURACION_COMBATE = {
  atributos: {
    // Cada punto por encima o debajo de 10 modifica
    // el daño físico en un 3%.
    danioPorPuntoRespectoDiez: 0.03,
    // Destreza continúa aumentando tanto precisión
    // como evasión, pero con una progresión más moderada.
    precisionPorDestreza: 2,
    evasionPorDestreza: 2,
    // La Constitución sigue siendo la fuente principal
    // de Vida, sin generar reservas excesivas en nivel 1.
    vidaPorConstitucion: 2,
    regeneracionVidaPorConstitucion: 0.1,
    resistenciaElementalPorSabiduria: 0.5,
    resistenciaVenenoPorConstitucion: 0.2,
    resistenciaMentalPorSabiduria: 2,
    potenciaAuraPorCarisma: 2,
  },
  impacto: {
    // El factor aumentado reduce la frecuencia de fallos
    // durante los combates iniciales.
    factorFormula: 240,
    probabilidadMinima: 5,
    probabilidadMaxima: 95,
  },
  armadura: {
    // Un valor mayor hace que la armadura reduzca menos
    // los golpes pequeños, evitando daños redondeados a cero.
    factorDanio: 20,
  },
  // Combatir con dos armas produce más daño,
  // pero obliga a renunciar al escudo y consume
  // tiempo adicional.
  dosArmas: {
    multiplicadorManoPrincipal: 1,
    multiplicadorManoSecundaria: 0.5,
    // El ataque utiliza el coste completo del arma
    // más lenta y agrega el 30% del arma más rápida.
    recargoTemporalSecundaria: 0.3,
  },
  resistencias: {
    // La primera versión no permite resistencias negativas.
    minima: 0,
    maxima: 75,
  },
  limites: {
    bloqueoMaximo: 75,
    mitigacionBloqueoMaxima: 100,
    criticoMaximo: 100,
  },
};
