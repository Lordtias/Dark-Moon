// Identifica los servicios que puede ofrecer
// una curandera al jugador.
export const TIPOS_SERVICIO_CURACION = Object.freeze({
  VIDA: "vida",
  MANA: "mana",
  AMBOS: "ambos",
});

// Centraliza el balance económico de la curación.
//
// El precio se calcula únicamente sobre los puntos
// que le faltan al jugador en el momento de confirmar:
//
// - Vida: 1 moneda cada 5 puntos faltantes.
// - Maná: 1 moneda cada 3 puntos faltantes.
//
// Math.ceil garantiza que una recuperación parcial
// nunca produzca un precio fraccionario ni gratuito.
export const CONFIGURACION_CURACION = Object.freeze({
  vida: Object.freeze({
    puntosPorMoneda: 5,
    precioMinimo: 1,
  }),
  mana: Object.freeze({
    puntosPorMoneda: 3,
    precioMinimo: 1,
  }),
});
