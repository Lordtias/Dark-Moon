export const VELOCIDADES_ANIMACION_PHASER = Object.freeze({
  NORMAL: "normal",
  RAPIDA: "rapida",
  MUY_RAPIDA: "muy-rapida",
});

const MULTIPLICADORES_DURACION = Object.freeze({
  [VELOCIDADES_ANIMACION_PHASER.NORMAL]: 1,
  [VELOCIDADES_ANIMACION_PHASER.RAPIDA]: 0.58,
  [VELOCIDADES_ANIMACION_PHASER.MUY_RAPIDA]: 0.34,
});

export const CONFIGURACION_ANIMACIONES_PHASER = Object.freeze({
  velocidadInicial: VELOCIDADES_ANIMACION_PHASER.NORMAL,
  movimientoJugadorCasillaMs: 110,
  movimientoEnemigoCasillaMs: 190,
  movimientoCasillaColaMediaMs: 75,
  movimientoCasillaColaLargaMs: 45,
  umbralMovimientosJugadorColaMedia: 2,
  umbralMovimientosJugadorColaLarga: 4,
  senalAtaqueMs: 320,
  pausaEntreAtaquesEnemigosMs: 130,
  escalaPulsoAtaque: 1.06,
  elevacionPulsoAtaque: 2,
  impactoObjetivoMs: 140,
  desplazamientoImpactoPx: 3,
  escalaMarcaImpactoInicial: 0.68,
  escalaMarcaImpactoFinal: 1.35,
  maximoEventosSinAcelerar: 5,
  factorAceleracionColaMedia: 0.78,
  factorAceleracionColaLarga: 0.58,
});

export function normalizarVelocidadAnimacionPhaser(velocidad) {
  return Object.prototype.hasOwnProperty.call(
    MULTIPLICADORES_DURACION,
    velocidad,
  )
    ? velocidad
    : CONFIGURACION_ANIMACIONES_PHASER.velocidadInicial;
}

export function calcularDuracionAnimacionPhaser(
  duracionBase,
  {
    velocidad = CONFIGURACION_ANIMACIONES_PHASER.velocidadInicial,
    cantidadPendiente = 0,
  } = {},
) {
  const velocidadNormalizada = normalizarVelocidadAnimacionPhaser(velocidad);
  let factorCola = 1;

  if (
    cantidadPendiente >
    CONFIGURACION_ANIMACIONES_PHASER.maximoEventosSinAcelerar * 2
  ) {
    factorCola = CONFIGURACION_ANIMACIONES_PHASER.factorAceleracionColaLarga;
  } else if (
    cantidadPendiente > CONFIGURACION_ANIMACIONES_PHASER.maximoEventosSinAcelerar
  ) {
    factorCola = CONFIGURACION_ANIMACIONES_PHASER.factorAceleracionColaMedia;
  }

  return Math.max(
    1,
    Math.round(
      duracionBase * MULTIPLICADORES_DURACION[velocidadNormalizada] * factorCola,
    ),
  );
}
