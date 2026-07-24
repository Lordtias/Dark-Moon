import { Combatiente } from "./Combatiente.js";
import {
  calcularExperienciaNecesaria,
  calcularPuntosAtributoGanados,
} from "../../../juego/progresion/SistemaProgresion.js";
import {
  interactuarConObjetoInventario,
  desequiparObjetoAInventario,
} from "../../../juego/inventario/SistemaInventarioEquipamiento.js";
import {
  capturarEstadoRecursos,
  restaurarRecursosTrasRecalculo,
} from "../../../juego/magia/CalculadorAtributosMagicos.js";

const ATRIBUTOS_VALIDOS = [
  "fuerza",
  "destreza",
  "constitucion",
  "inteligencia",
  "sabiduria",
  "carisma",
];

// Player conserva únicamente responsabilidades propias del jugador:
//
// - Progresión y atributos.
// - Inventario y equipamiento personal.
// - Recursos persistentes, como el oro.
//
// La interacción de objetos se delega a SistemaInventarioEquipamiento.
export class Player extends Combatiente {
  constructor({
    nombre,
    nivel = 1,
    x = 0,
    y = 0,
    atributos,
    estadisticasBase,
    ataqueNatural = null,
    // Factores que controlan la velocidad global y específica del jugador.
    // Mientras no se configuren explícitamente, Combatiente utiliza 100.
    factoresTemporales = {},
    clasePersonaje = "Aventurero",
    // Ruta opcional de la imagen utilizada para representar al jugador.
    recursoVisual = null,
    experiencia = 0,
    puntosAtributoDisponibles = 0,
    // El oro pertenece al jugador y no ocupa una casilla del inventario.
    // Como Player se conserva entre mapas, también persiste en la sesión.
    oro = 100,
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
      factoresTemporales,
      simbolo: "@",
      capacidadContenedor: capacidadInventario,
      objetosIniciales: objetosInventarioIniciales,
      ranurasEquipamiento,
      equipamientoInicial,
    });

    // La imagen es opcional. Si no está configurada, el renderizador
    // continúa mostrando el símbolo "@".
    if (
      recursoVisual !== null &&
      (typeof recursoVisual !== "string" || recursoVisual.trim() === "")
    ) {
      throw new Error(
        `El recurso visual de ${nombre} debe ser una ruta válida.`,
      );
    }

    // Player solamente conserva la ruta; no carga la imagen ni conoce
    // Canvas, HTML o una futura librería 2D.
    this.recursoVisual = recursoVisual?.trim() ?? null;

    if (
      !Number.isInteger(puntosAtributoDisponibles) ||
      puntosAtributoDisponibles < 0
    ) {
      throw new Error(
        "Los puntos de atributo disponibles " +
          "deben ser un entero igual o mayor que 0.",
      );
    }

    validarCantidadOro({
      cantidad: oro,
      descripcion: "El oro inicial",
      permitirCero: true,
    });

    this.clasePersonaje = clasePersonaje;
    this.inventario = this.contenedorObjetos;
    // Utilizamos una propiedad interna para que el oro solo pueda
    // modificarse mediante las operaciones validadas de esta clase.
    this._oro = oro;
    this._experiencia = 0;
    this.experienciaTotal = 0;
    this.puntosAtributoDisponibles = puntosAtributoDisponibles;
    this.ultimoResultadoProgresion = null;

    if (experiencia > 0) {
      this.ganarExperiencia(experiencia);
    }
  }

  get oro() {
    return this._oro;
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

  // Agrega monedas al jugador.
  agregarOro(cantidad) {
    validarCantidadOro({
      cantidad,
      descripcion: "La cantidad de oro agregada",
    });
    this._oro += cantidad;
    return {
      exito: true,
      oroAgregado: cantidad,
      oroActual: this._oro,
    };
  }

  // Permite consultar si una compra puede pagarse sin modificar el saldo.
  puedePagar(cantidad) {
    validarCantidadOro({
      cantidad,
      descripcion: "El precio consultado",
      permitirCero: true,
    });
    return this._oro >= cantidad;
  }

  // Descuenta monedas únicamente cuando existe saldo suficiente.
  gastarOro(cantidad) {
    validarCantidadOro({
      cantidad,
      descripcion: "La cantidad de oro gastada",
    });

    if (!this.puedePagar(cantidad)) {
      return {
        exito: false,
        oroGastado: 0,
        oroActual: this._oro,
        mensaje: "No tenés suficiente oro.",
      };
    }

    this._oro -= cantidad;
    return {
      exito: true,
      oroGastado: cantidad,
      oroActual: this._oro,
      mensaje: `Gastaste ${cantidad} monedas.`,
    };
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

    const estadoRecursosAnterior = capturarEstadoRecursos(this);
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
      // Fuerza el recálculo después de cambiar el nivel. La Vida
      // conserva el faltante previo y el Maná conserva su proporción.
      this.estadisticasDerivadas;
      restaurarRecursosTrasRecalculo(this, estadoRecursosAnterior);
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
      throw new Error(`El atributo "${nombreAtributo}" ` + "no existe.");
    }

    if (this.puntosAtributoDisponibles <= 0) {
      return {
        exito: false,
        mensaje: "No tenés puntos de atributo disponibles.",
      };
    }

    const estadoRecursosAnterior = capturarEstadoRecursos(this);
    this.atributos[nombreAtributo]++;
    this.puntosAtributoDisponibles--;

    // Fuerza el recálculo después de cambiar un atributo. El Maná no se
    // rellena ni se vacía artificialmente: conserva el porcentaje previo.
    this.estadisticasDerivadas;
    restaurarRecursosTrasRecalculo(this, estadoRecursosAnterior);

    return {
      exito: true,
      mensaje:
        `${nombreAtributo} aumentó a ` + `${this.atributos[nombreAtributo]}.`,
    };
  }

  // Delega la acción del inventario al sistema especializado.
  interactuarConObjetoInventario(indiceInventario) {
    return interactuarConObjetoInventario(this, indiceInventario);
  }

  desequiparObjetoAInventario(nombreRanura) {
    return desequiparObjetoAInventario(this, nombreRanura);
  }
}

// El oro se maneja siempre como monedas enteras. No se aceptan valores
// negativos, decimales, infinitos ni conversiones implícitas desde texto.
function validarCantidadOro({ cantidad, descripcion, permitirCero = false }) {
  const minimo = permitirCero ? 0 : 1;
  if (!Number.isSafeInteger(cantidad) || cantidad < minimo) {
    throw new Error(
      `${descripcion} debe ser un entero ` +
        `${permitirCero ? "igual o mayor" : "mayor"} que 0.`,
    );
  }
}
