import { Entidad } from "../Entidad.js";

import { ContenedorObjetos } from "../../objetos/ContenedorObjetos.js";

import { TIPOS_INTERACCION } from "../../juego/interacciones/TiposInteraccion.js";

// Recurso visual predeterminado utilizado
// por todas las pilas de botín.
//
// La entidad conserva también el símbolo "*"
// como respaldo para renderizadores sin imágenes
// o ante un fallo de carga.
const RECURSO_VISUAL_BOTIN_PREDETERMINADO =
  "assets/imagenes/interactuables/botin.png";

// Representa una pila de objetos abandonada
// dentro del mapa.
//
// El botín:
//
// - No tiene Vida.
// - No recibe daño.
// - No forma parte de los objetivos de combate.
// - No bloquea el movimiento.
// - Desaparece cuando su contenedor queda vacío.
export class BotinSuelo extends Entidad {
  constructor({
    nombre = "Botín",
    x = 0,
    y = 0,
    simbolo = "*",

    // Cuando no se especifica una imagen
    // utilizamos la bolsa de botín estándar.
    //
    // También tratamos null como ausencia
    // de una configuración personalizada.
    recursoVisual = null,

    contenedorObjetos,
  } = {}) {
    super({
      nombre,
      x,
      y,
      simbolo,
    });

    if (!(contenedorObjetos instanceof ContenedorObjetos)) {
      throw new Error(
        `${this.nombre} necesita un contenedor de objetos válido.`,
      );
    }

    const recursoVisualFinal =
      recursoVisual ?? RECURSO_VISUAL_BOTIN_PREDETERMINADO;

    if (
      typeof recursoVisualFinal !== "string" ||
      recursoVisualFinal.trim() === ""
    ) {
      throw new Error(
        `El recurso visual de ${this.nombre} debe ser una ruta válida.`,
      );
    }

    // BotinSuelo solamente conserva la ruta.
    //
    // La carga y caché de la imagen continúan
    // perteneciendo a la capa gráfica.
    this.recursoVisual = recursoVisualFinal.trim();

    this.contenedorObjetos = contenedorObjetos;
  }

  get estaVacio() {
    return this.contenedorObjetos.estaVacio();
  }

  get cantidadObjetos() {
    return this.contenedorObjetos.obtenerObjetos().length;
  }

  get cantidadUnidades() {
    return this.contenedorObjetos
      .obtenerObjetos()
      .reduce(
        (total, objeto) => total + (objeto.apilable ? objeto.cantidad : 1),
        0,
      );
  }

  // Ofrece una capacidad de interacción
  // sin obligar a otras entidades a heredar
  // de BotinSuelo ni de una clase interactuable.
  obtenerInteracciones() {
    if (this.estaVacio) {
      return [];
    }

    return [
      {
        tipo: TIPOS_INTERACCION.ABRIR_CONTENEDOR,

        texto: "Revisar botín",

        // Puede revisarse desde la misma casilla
        // o desde cualquiera de las ocho casillas
        // adyacentes.
        alcance: 1,

        prioridad: 100,

        contenedorObjetos: this.contenedorObjetos,
      },
    ];
  }
}
