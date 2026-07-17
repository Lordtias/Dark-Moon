import { Destructible } from "./Destructible.js";

// Objeto destructible simple utilizado
// para probar ataques contra entidades
// que no pueden evadir ni combatir.
export class Barril extends Destructible {
  constructor({ x, y } = {}) {
    super({
      nombre: "Barril",
      x,
      y,
      simbolo: "B",

      // Integridad del barril.
      vidaMaxima: 6,

      // Por ahora no posee protección física.
      armadura: 0,
    });
  }
}
