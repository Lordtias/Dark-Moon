import { crearConfiguracionPhaser } from "./ConfiguracionPhaser.js";

// Aísla la creación de Phaser para que el backend pueda validarse y destruirse
// sin trasladar reglas del juego a la librería gráfica.
export function inicializarPhaser({
  Phaser,
  host,
  Escena,
  alPrepararCanvas,
} = {}) {
  const configuracion = crearConfiguracionPhaser({
    Phaser,
    host,
    Escena,
    alPrepararCanvas,
  });

  return new Phaser.Game(configuracion);
}
