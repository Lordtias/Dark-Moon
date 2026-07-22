import { Destructible } from "./Destructible.js";

// Imagen utilizada por todos los barriles
// que no declaren expresamente otro recurso.
//
// La constante queda exportada para que futuras
// fábricas, variantes o herramientas puedan
// reutilizar la misma ruta sin duplicarla.
export const RECURSO_VISUAL_BARRIL_PREDETERMINADO =
  "assets/imagenes/destructibles/barril_madera.png";

// Objeto destructible simple utilizado
// para probar ataques contra entidades
// que no pueden evadir ni combatir.
export class Barril extends Destructible {
  constructor({
    x,
    y,

    // La imagen puede reemplazarse más adelante
    // para crear variantes visuales de barriles.
    //
    // Un valor null conserva el símbolo B
    // como respaldo visual.
    recursoVisual = RECURSO_VISUAL_BARRIL_PREDETERMINADO,
  } = {}) {
    validarRecursoVisual(recursoVisual);

    super({
      nombre: "Barril",

      x,
      y,

      // El símbolo continúa disponible cuando
      // la imagen no existe, falla al cargar
      // o se desactiva expresamente.
      simbolo: "B",

      // Integridad del barril.
      vidaMaxima: 6,

      // Por ahora no posee protección física.
      armadura: 0,
    });

    // RenderizadorCanvas2D consulta esta propiedad
    // antes de utilizar el símbolo de respaldo.
    this.recursoVisual = recursoVisual === null ? null : recursoVisual.trim();
  }
}

function validarRecursoVisual(recursoVisual) {
  if (
    recursoVisual !== null &&
    (typeof recursoVisual !== "string" || recursoVisual.trim() === "")
  ) {
    throw new Error(
      "El recurso visual del barril debe ser una ruta válida o null.",
    );
  }
}
