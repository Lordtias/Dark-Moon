import { Combatiente } from "./Combatiente.js";

import {
  calcularExperienciaNecesaria,
  calcularPuntosAtributoGanados,
} from "../../../juego/SistemaProgresion.js";

const ATRIBUTOS_VALIDOS = [
  "fuerza",
  "destreza",
  "constitucion",
  "inteligencia",
  "sabiduria",
  "carisma",
];

// Player administra la progresión, los puntos
// de atributos y el inventario del jugador.
//
// Las estadísticas propias de cada profesión
// se reciben desde ConfiguracionPersonaje.json.
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

    // Experiencia acumulada dentro
    // del nivel actual.
    this._experiencia = 0;

    // Experiencia obtenida durante
    // toda la partida.
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

  // Experiencia necesaria para avanzar
  // desde el nivel actual al siguiente.
  get experienciaNecesaria() {
    return calcularExperienciaNecesaria(this.nivel);
  }

  // Porcentaje utilizado por la barra
  // de experiencia del panel.
  get porcentajeExperiencia() {
    return Math.min(
      100,

      (this._experiencia / this.experienciaNecesaria) * 100,
    );
  }

  // Agrega experiencia y procesa todas
  // las subidas de nivel alcanzadas.
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

    // Permite subir varios niveles
    // mediante una sola recompensa.
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
      // Recalcula los máximos utilizando
      // el nuevo nivel del personaje.
      this.estadisticasDerivadas;

      // Conserva el daño sufrido, pero agrega
      // el crecimiento de Vida y Maná obtenido.
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

  // Gasta inmediatamente un punto y recalcula
  // todas las estadísticas relacionadas.
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
}
