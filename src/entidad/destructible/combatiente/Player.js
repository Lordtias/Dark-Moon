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

const ETIQUETAS_RANURAS = {
  cabeza: "Cabeza",
  torso: "Torso",
  manos: "Manos",
  piernas: "Piernas",
  pies: "Pies",
  arma: "Arma",
  secundaria: "Secundaria",
  collar: "Collar",
  anillo_derecho: "Anillo derecho",
  anillo_izquierdo: "Anillo izquierdo",
};

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
    return Math.min(
      100,

      (this._experiencia / this.experienciaNecesaria) * 100,
    );
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

  // Equipa un objeto directamente desde
  // una posición del inventario.
  equiparObjetoDesdeInventario(indiceInventario, ranuraPreferida = null) {
    const objeto = this.inventario.obtenerObjetoEn(indiceInventario);

    if (!objeto) {
      return {
        exito: false,
        mensaje: "Ese espacio del inventario está vacío.",
      };
    }

    if (!objeto.esEquipable) {
      return {
        exito: false,
        mensaje: `${objeto.nombre} no puede equiparse.`,
      };
    }

    const ranura = ranuraPreferida ?? this.elegirRanuraAutomatica(objeto);

    if (!ranura) {
      return {
        exito: false,
        mensaje: `${objeto.nombre} no tiene una ranura compatible.`,
      };
    }

    let objetosDesplazados;

    try {
      objetosDesplazados = this.equipamiento.previsualizarObjetosDesplazados(
        ranura,
        objeto,
      );
    } catch (error) {
      return {
        exito: false,
        mensaje: error.message,
      };
    }

    // Retirar el objeto seleccionado libera
    // una posición adicional del inventario.
    const espaciosDisponibles = this.inventario.contarEspaciosLibres() + 1;

    if (objetosDesplazados.length > espaciosDisponibles) {
      return {
        exito: false,

        mensaje:
          "No hay espacio suficiente para guardar " +
          "los objetos que serían desequipados.",
      };
    }

    const objetoRetirado = this.inventario.retirarObjeto(indiceInventario);

    let resultado;

    try {
      resultado = this.equipamiento.equiparEnRanura(ranura, objetoRetirado);
    } catch (error) {
      this.inventario.colocarObjetoEn(indiceInventario, objetoRetirado);

      return {
        exito: false,
        mensaje: error.message,
      };
    }

    this.guardarObjetosDesplazados(
      resultado.objetosDesequipados,
      indiceInventario,
    );

    const etiqueta =
      ETIQUETAS_RANURAS[resultado.ranuraAsignada] ?? resultado.ranuraAsignada;

    const nombresDesplazados = resultado.objetosDesequipados.map(
      (item) => item.nombre,
    );

    let mensaje = `Equipaste ${objeto.nombre} en ${etiqueta}.`;

    if (nombresDesplazados.length === 1) {
      mensaje += ` ${nombresDesplazados[0]} volvió al inventario.`;
    } else if (nombresDesplazados.length > 1) {
      mensaje += ` ${nombresDesplazados.join(", ")} volvieron al inventario.`;
    }

    return {
      exito: true,
      mensaje,
      ...resultado,
    };
  }

  // Devuelve un objeto equipado al inventario.
  desequiparObjetoAInventario(nombreRanura) {
    if (this.inventario.estaLleno()) {
      return {
        exito: false,

        mensaje: "El inventario está lleno.",
      };
    }

    const estados = this.equipamiento.obtenerEstadoRanuras();

    const estado = estados[nombreRanura];

    if (!estado) {
      return {
        exito: false,
        mensaje: "La ranura seleccionada no existe.",
      };
    }

    const objeto = estado.objeto ?? estado.reservadaPor;

    if (!objeto) {
      return {
        exito: false,
        mensaje: "Esa ranura está vacía.",
      };
    }

    const objetoDesequipado = this.equipamiento.desequipar(nombreRanura);

    if (!objetoDesequipado) {
      return {
        exito: false,
        mensaje: "No se pudo desequipar el objeto.",
      };
    }

    const agregado = this.inventario.agregarObjeto(objetoDesequipado);

    if (!agregado) {
      // Esta situación no debería ocurrir porque
      // comprobamos la capacidad previamente.
      return {
        exito: false,

        mensaje: "No se pudo devolver el objeto al inventario.",
      };
    }

    return {
      exito: true,

      mensaje: `${objetoDesequipado.nombre} volvió al inventario.`,

      objetoDesequipado,
    };
  }

  // Decide automáticamente dónde colocar
  // el objeto cuando el usuario hace clic.
  elegirRanuraAutomatica(objeto) {
    const compatibles = objeto.ranurasCompatibles.filter((ranura) =>
      this.equipamiento.tieneRanura(ranura),
    );

    if (compatibles.length === 0) {
      return null;
    }

    if (compatibles.length === 1) {
      return compatibles[0];
    }

    const puedePrincipal = compatibles.includes("arma");

    const puedeSecundaria = compatibles.includes("secundaria");

    if (objeto.esArma && puedePrincipal && puedeSecundaria) {
      const principal = this.equipamiento.obtenerObjetoEnRanura("arma");

      const secundaria = this.equipamiento.obtenerObjetoEnRanura("secundaria");

      const secundariaReservada =
        this.equipamiento.estaRanuraReservada("secundaria");

      if (!principal) {
        return "arma";
      }

      // Reemplazar directamente una arma de
      // dos manos deja la secundaria libre.
      if (principal.bloqueaSecundaria) {
        return "arma";
      }

      // Con un arco principal, la espada se
      // coloca en secundaria para facilitar el swap.
      if (principal.propiedades?.tipoAtaque === "distancia") {
        return "secundaria";
      }

      if (!secundaria && !secundariaReservada) {
        return "secundaria";
      }

      // Si ambas manos están ocupadas,
      // reemplazamos temporalmente la secundaria.
      return "secundaria";
    }

    const ranuraLibre = compatibles.find(
      (ranura) =>
        this.equipamiento.obtenerObjetoEnRanura(ranura) === null &&
        !this.equipamiento.estaRanuraReservada(ranura),
    );

    return ranuraLibre ?? compatibles[0];
  }

  guardarObjetosDesplazados(objetos, indiceOriginal) {
    objetos.forEach((objeto, indice) => {
      const puedeUsarEspacioOriginal =
        indice === 0 &&
        this.inventario.obtenerObjetoEn(indiceOriginal) === null;

      const agregado = puedeUsarEspacioOriginal
        ? this.inventario.colocarObjetoEn(indiceOriginal, objeto)
        : this.inventario.agregarObjeto(objeto);

      if (!agregado) {
        throw new Error(
          `No se pudo guardar ${objeto.nombre} en el inventario.`,
        );
      }
    });
  }
}
