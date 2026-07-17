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

// Cada profesión define su crecimiento automático.
// Los atributos continúan dependiendo de los puntos
// distribuidos por el jugador y del equipamiento.
const ESTADISTICAS_POR_PROFESION = {
  guerrero: {
    vida: 30,
    mana: 10,
    vidaPorNivel: 8,
    manaPorNivel: 2,
    precision: 10,
    evasion: 5,
    armadura: 0,
  },

  rogue: {
    vida: 24,
    mana: 14,
    vidaPorNivel: 6,
    manaPorNivel: 3,
    precision: 14,
    evasion: 8,
    armadura: 0,
  },

  mago: {
    vida: 18,
    mana: 24,
    vidaPorNivel: 4,
    manaPorNivel: 6,
    precision: 10,
    evasion: 5,
    armadura: 0,
  },
};

function normalizarProfesion(clasePersonaje) {
  const id = clasePersonaje.trim().toLowerCase();

  return id === "pícaro" ? "rogue" : id;
}

export class Player extends Combatiente {
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
    const idProfesion = normalizarProfesion(clasePersonaje);

    const estadisticasProfesion = ESTADISTICAS_POR_PROFESION[idProfesion] ?? {
      vida: 24,
      mana: 12,
      vidaPorNivel: 5,
      manaPorNivel: 3,
      precision: 10,
      evasion: 5,
      armadura: 0,
    };

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
      simbolo: "@",
      capacidadContenedor: capacidadInventario,
      objetosIniciales: objetosInventarioIniciales,
      ranurasEquipamiento,
      equipamientoInicial,
      estadisticasBase: estadisticasProfesion,
    });

    this.clasePersonaje = clasePersonaje;
    this.inventario = this.contenedorObjetos;

    // Experiencia del nivel actual.
    this._experiencia = 0;

    // Experiencia obtenida durante toda la partida.
    this.experienciaTotal = 0;

    this.puntosAtributoDisponibles = puntosAtributoDisponibles;

    this.ultimoResultadoProgresion = null;

    // Procesamos cualquier experiencia inicial
    // usando el mismo sistema de progresión.
    if (experiencia > 0) {
      this.ganarExperiencia(experiencia);
    }
  }

  // Mantiene compatibilidad con el código existente:
  // player.experiencia += cantidad.
  get experiencia() {
    return this._experiencia;
  }

  set experiencia(nuevoValor) {
    if (!Number.isFinite(nuevoValor) || nuevoValor < 0) {
      throw new Error("La experiencia debe ser un número positivo.");
    }

    const diferencia = nuevoValor - this._experiencia;

    if (diferencia > 0) {
      this.ganarExperiencia(diferencia);
      return;
    }

    this._experiencia = nuevoValor;
  }

  // Experiencia necesaria para alcanzar
  // el próximo nivel.
  get experienciaNecesaria() {
    return calcularExperienciaNecesaria(this.nivel);
  }

  // Porcentaje utilizado posteriormente
  // para dibujar una barra de experiencia.
  get porcentajeExperiencia() {
    return Math.min(100, (this._experiencia / this.experienciaNecesaria) * 100);
  }

  // Agrega experiencia y procesa todas las
  // subidas de nivel que correspondan.
  ganarExperiencia(cantidad) {
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return {
        experienciaGanada: 0,
        nivelesGanados: 0,
        puntosGanados: 0,
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

    // Permite subir varios niveles si se obtiene
    // una cantidad grande de experiencia.
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
      // El getter recalcula los máximos
      // utilizando el nuevo nivel.
      this.estadisticasDerivadas;

      // Conservamos el daño sufrido, pero agregamos
      // el crecimiento obtenido al subir de nivel.
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

  // Permite gastar un punto en cualquiera
  // de los seis atributos principales.
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

    // Si Constitución o Inteligencia aumentan
    // los máximos, también agregamos esa diferencia.
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
