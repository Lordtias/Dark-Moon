import { Entidad } from "../Entidad.js";

import { ContenedorObjetos } from "../../objetos/ContenedorObjetos.js";

// Representa cualquier entidad que puede
// recibir daño:
//
// - Combatientes.
// - Barriles.
// - Cofres.
// - Puertas.
// - Otros objetos rompibles.
export class Destructible extends Entidad {
  constructor({
    nombre,
    x = 0,
    y = 0,
    simbolo = "?",
    vidaMaxima,
    armadura = 0,
    capacidadContenedor = 0,
    objetosIniciales = [],
    tablaBotin = [],
  } = {}) {
    if (!Number.isInteger(vidaMaxima) || vidaMaxima <= 0) {
      throw new Error(
        `${nombre ?? "La entidad"} debe tener una vida máxima ` +
          "entera mayor que 0.",
      );
    }

    if (!Number.isInteger(armadura) || armadura < 0) {
      throw new Error(
        `La armadura de ${nombre ?? "la entidad"} debe ser un entero ` +
          "igual o mayor que 0.",
      );
    }

    if (!Number.isInteger(capacidadContenedor) || capacidadContenedor < 0) {
      throw new Error(
        `La capacidad del contenedor de ` +
          `${nombre} debe ser un entero ` +
          "igual o mayor que 0.",
      );
    }

    if (!Array.isArray(objetosIniciales)) {
      throw new Error(
        `Los objetos iniciales de ` + `${nombre} deben ser una lista.`,
      );
    }

    if (!Array.isArray(tablaBotin)) {
      throw new Error(
        `La tabla de botín de ` + `${nombre} debe ser una lista.`,
      );
    }

    super({
      nombre,
      x,
      y,
      simbolo,
    });

    this.vidaMaxima = vidaMaxima;

    this.vidaActual = vidaMaxima;

    // Los destructibles que no son
    // combatientes también pueden tener
    // Armadura física.
    this.armadura = armadura;

    this.contenedorObjetos =
      capacidadContenedor > 0
        ? new ContenedorObjetos({
            capacidad: capacidadContenedor,

            objetosIniciales,
          })
        : null;

    this.tablaBotin = tablaBotin.map((entrada) => ({
      ...entrada,
    }));
  }

  get estaDestruido() {
    return this.vidaActual <= 0;
  }

  recibirDanio(cantidad) {
    if (!Number.isFinite(cantidad)) {
      throw new Error(
        `El daño recibido por ` +
          `${this.nombre} debe ser ` +
          "un número válido.",
      );
    }

    const vidaAnterior = this.vidaActual;

    const danioSolicitado = Math.max(0, Math.floor(cantidad));

    this.vidaActual = Math.max(0, this.vidaActual - danioSolicitado);

    return vidaAnterior - this.vidaActual;
  }
}
