// Importamos Combatiente porque todos los enemigos
// pueden recibir daño y realizar ataques.
import {
  Combatiente
} from "./Combatiente.js";

/**
 * Representa cualquier criatura hostil del juego.
 *
 * Ratas, esqueletos y futuros enemigos utilizarán
 * esta misma clase, pero recibirán estadísticas diferentes
 * desde sus respectivas plantillas.
 */
export class Enemigo extends Combatiente {
  constructor({
    nombre,
    nivel = 1,
    x = 0,
    y = 0,
    atributos,
    vidaMaxima,
    dadoDanio,
    atributoAtaque,
    bonificadorArmadura = 0,
    simbolo = "E",
    experienciaOtorgada = 0
  } = {}) {
    // Enviamos a Combatiente toda la información
    // compartida entre jugadores y enemigos.
    super({
      nombre,
      nivel,
      x,
      y,
      atributos,
      vidaMaxima,
      dadoDanio,
      atributoAtaque,
      bonificadorArmadura,
      simbolo
    });

    // La experiencia debe ser un número entero
    // igual o mayor que cero.
    if (
      !Number.isInteger(experienciaOtorgada) ||
      experienciaOtorgada < 0
    ) {
      throw new Error(
        `La experiencia otorgada por ${nombre} ` +
        "debe ser un número entero igual o mayor que 0."
      );
    }

    // Experiencia entregada cuando el enemigo
    // es derrotado por el jugador.
    this.experienciaOtorgada =
      experienciaOtorgada;
  }
}