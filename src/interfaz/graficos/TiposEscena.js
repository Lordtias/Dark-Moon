// Define los tipos de entidades que pueden
// aparecer dentro de una escena gráfica.
//
// Estos valores no dependen de Canvas, Phaser
// ni de ninguna otra librería de representación.
export const TIPOS_ENTIDAD_VISUAL = Object.freeze({
  JUGADOR: "jugador",
  ENEMIGO: "enemigo",
  DESTRUCTIBLE: "destructible",
  INTERACTUABLE: "interactuable",
});

// Describe cómo debe comunicar la interfaz
// la relación actual de un enemigo con el jugador.
//
// El dominio continúa utilizando su propio booleano
// estaAgresivo. El adaptador lo convierte a este contrato
// visual para que Canvas o Phaser no dependan de Enemigo.
//
// Más adelante podrán agregarse estados como:
//
// - alerta.
// - investigando.
// - huyendo.
export const ESTADOS_HOSTILIDAD_VISUAL = Object.freeze({
  PASIVO: "pasivo",
  AGRESIVO: "agresivo",
});
