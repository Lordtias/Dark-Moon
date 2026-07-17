import { Combatiente } from "./Combatiente.js";

import {
  calcularExperienciaNecesaria,
  calcularPuntosAtributoGanados,
} from "../../../juego/SistemaProgresion.js";

import {
  interactuarConObjetoInventario,
  desequiparObjetoAInventario,
} from "../../../juego/SistemaInventarioEquipamiento.js";

const ATRIBUTOS_VALIDOS = [
  "fuerza",
  "destreza",
  "constitucion",
  "inteligencia",
  "sabiduria",
  "carisma",
];

// Player conserva únicamente responsabilidades
// propias del jugador: progresión y atributos.
//
// La interacción de objetos se delega a
// SistemaInventarioEquipamiento.
export class Player extends Combatiente {
  constructor({
    nombre,
    nivel = 1,
    x = 0,
    y = 0,
    atributos,
    estadisticasBase,
    ataqueNatural = null,
    clasePersonaje = "Aventurero",
    experiencia = 0,
    puntosAtributoDisponibles = 0,
    capacidadInventario = 12,
    objetosInventarioIniciales = [],

    ranurasEquipamiento = [
      "cabeza",
      "torso",
      "manos",
      "piernas",
      "pies",
      "arma",
      "secundaria",
      "collar",
      "anillo_derecho",
      "anillo_izquierdo",
    ],

    equipamientoInicial = [],
  } = {}) {
    super({
      nombre,
      nivel,
      x,
      y,
      atributos,
      estadisticasBase,
      ataqueNatural,
      simbolo: "@",

      capacidadContenedor: capacidadInventario,

      objetosIniciales: objetosInventarioIniciales,

      ranurasEquipamiento,
      equipamientoInicial,
    });

    if (
      !Number.isInteger(puntosAtributoDisponibles) ||
      puntosAtributoDisponibles < 0
    ) {
      throw new Error(
        "Los puntos de atributo disponibles deben ser " +
          "un entero igual o mayor que 0.",
      );
    }

    this.clasePersonaje = clasePersonaje;

    this.inventario = this.contenedorObjetos;

    this._experiencia = 0;
    this.experienciaTotal = 0;

    this.puntosAtributoDisponibles = puntosAtributoDisponibles;

    this.ultimoResultadoProgresion = null;

    if (experiencia > 0) {
      this.ganarExperiencia(experiencia);
    }
  }

  get experiencia() {
    return this._experiencia;
  }

  get experienciaNecesaria() {
    return calcularExperienciaNecesaria(this.nivel);
  }

  get porcentajeExperiencia() {
    return Math.min(100, (this._experiencia / this.experienciaNecesaria) * 100);
  }

  ganarExperiencia(cantidad) {
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return {
        experienciaGanada: 0,
        nivelesGanados: 0,
        puntosGanados: 0,
        nivelActual: this.nivel,
      };
    }

    const vidaMaximaAnterior = this.vidaMaxima;

    const manaMaximoAnterior = this.manaMaximo;

    const vidaActualAnterior = this.vidaActual;

    const manaActualAnterior = this.manaActual;

    this._experiencia += cantidad;
    this.experienciaTotal += cantidad;

    let nivelesGanados = 0;
    let puntosGanados = 0;

    while (this._experiencia >= calcularExperienciaNecesaria(this.nivel)) {
      const experienciaRequerida = calcularExperienciaNecesaria(this.nivel);

      this._experiencia -= experienciaRequerida;

      this.nivel++;
      nivelesGanados++;

      const puntosNivel = calcularPuntosAtributoGanados(this.nivel);

      puntosGanados += puntosNivel;

      this.puntosAtributoDisponibles += puntosNivel;
    }

    if (nivelesGanados > 0) {
      this.estadisticasDerivadas;

      this.vidaActual = Math.min(
        this.vidaMaxima,
        vidaActualAnterior + (this.vidaMaxima - vidaMaximaAnterior),
      );

      this.manaActual = Math.min(
        this.manaMaximo,
        manaActualAnterior + (this.manaMaximo - manaMaximoAnterior),
      );
    }

    const resultado = {
      experienciaGanada: cantidad,
      nivelesGanados,
      puntosGanados,
      nivelActual: this.nivel,
    };

    this.ultimoResultadoProgresion = resultado;

    return resultado;
  }

  asignarPuntoAtributo(nombreAtributo) {
    if (!ATRIBUTOS_VALIDOS.includes(nombreAtributo)) {
      throw new Error(`El atributo "${nombreAtributo}" no existe.`);
    }

    if (this.puntosAtributoDisponibles <= 0) {
      return {
        exito: false,
        mensaje: "No tenés puntos de atributo disponibles.",
      };
    }

    const vidaMaximaAnterior = this.vidaMaxima;

    const manaMaximoAnterior = this.manaMaximo;

    const vidaActualAnterior = this.vidaActual;

    const manaActualAnterior = this.manaActual;

    this.atributos[nombreAtributo]++;
    this.puntosAtributoDisponibles--;

    this.estadisticasDerivadas;

    this.vidaActual = Math.min(
      this.vidaMaxima,
      vidaActualAnterior + (this.vidaMaxima - vidaMaximaAnterior),
    );

    this.manaActual = Math.min(
      this.manaMaximo,
      manaActualAnterior + (this.manaMaximo - manaMaximoAnterior),
    );

    return {
      exito: true,
      mensaje:
        `${nombreAtributo} aumentó a ` + `${this.atributos[nombreAtributo]}.`,
    };
  }

  // Delega la acción del inventario al sistema
  // especializado de objetos y equipamiento.
  interactuarConObjetoInventario(indiceInventario) {
    return interactuarConObjetoInventario(this, indiceInventario);
  }

  desequiparObjetoAInventario(nombreRanura) {
    return desequiparObjetoAInventario(this, nombreRanura);
  }
}
