import { Entidad } from "../Entidad.js";

import { ContenedorObjetos } from "../../objetos/ContenedorObjetos.js";

import { TIPOS_INTERACCION } from "../../juego/interacciones/TiposInteraccion.js";

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

    if (
      recursoVisual !== null &&
      (typeof recursoVisual !== "string" || recursoVisual.trim() === "")
    ) {
      throw new Error(
        `El recurso visual de ${this.nombre} debe ser una ruta válida.`,
      );
    }

    this.recursoVisual = recursoVisual?.trim() ?? null;

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
