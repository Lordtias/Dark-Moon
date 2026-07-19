import { Destructible } from "../Destructible.js";

import { Equipamiento } from "../../../objetos/Equipamiento.js";

import {
  calcularEstadisticasDerivadas,
  calcularRecursosMaximos,
} from "./EstadisticasDerivadas.js";

import { obtenerConfiguracionAtaque } from "./ConfiguracionAtaque.js";

import {
  resolverAtaque,
  resolverAtaqueSinObjetivo,
} from "../../../juego/SistemaCombate.js";

import {
  PATRONES_ATAQUE,
  normalizarPatronAtaque,
  obtenerPatronAtaquePredeterminado,
} from "../../../juego/PatronesAtaque.js";

import {
  FACTORES_TEMPORALES_PREDETERMINADOS,
  TIEMPO_REFERENCIA,
} from "../../../juego/tiempo/SistemaTiempo.js";

const TIPOS_ATAQUE_VALIDOS = ["cuerpoACuerpo", "distancia"];

const ATRIBUTOS_REQUERIDOS = [
  "fuerza",
  "destreza",
  "constitucion",
  "inteligencia",
  "sabiduria",
  "carisma",
];

const NOMBRES_FACTORES_TEMPORALES = [
  "factorTiempo",
  "factorMovimiento",
  "factorAtaque",
  "factorAccion",
  "factorConsumo",
];

function validarAtributos(nombre, atributos) {
  if (!atributos || typeof atributos !== "object" || Array.isArray(atributos)) {
    throw new Error(`${nombre} debe tener atributos válidos.`);
  }

  for (const atributo of ATRIBUTOS_REQUERIDOS) {
    if (!Number.isInteger(atributos[atributo]) || atributos[atributo] <= 0) {
      throw new Error(
        `El atributo "${atributo}" de ` +
          `${nombre} debe ser un entero ` +
          "mayor que 0.",
      );
    }
  }
}

function normalizarEstadisticasBase(nombre, configuracion) {
  if (
    !configuracion ||
    typeof configuracion !== "object" ||
    Array.isArray(configuracion)
  ) {
    throw new Error(`${nombre} debe tener estadísticas base válidas.`);
  }

  const valores = {
    vida: configuracion.vida,
    mana: configuracion.mana,

    vidaPorNivel: configuracion.vidaPorNivel ?? 0,

    manaPorNivel: configuracion.manaPorNivel ?? 0,

    precision: configuracion.precision ?? 10,

    evasion: configuracion.evasion ?? 5,

    armadura: configuracion.armadura ?? 0,

    regeneracionVida: configuracion.regeneracionVida ?? 0,

    regeneracionMana: configuracion.regeneracionMana ?? 0,

    probabilidadCritico: configuracion.probabilidadCritico ?? 5,

    multiplicadorCritico: configuracion.multiplicadorCritico ?? 1.5,

    probabilidadBloqueo: configuracion.probabilidadBloqueo ?? 0,

    potenciaEfectos: configuracion.potenciaEfectos ?? 0,

    resistenciaMental: configuracion.resistenciaMental ?? 0,

    potenciaAura: configuracion.potenciaAura ?? 0,

    resistencias: {
      fuego: configuracion.resistencias?.fuego ?? 0,

      frio: configuracion.resistencias?.frio ?? 0,

      rayo: configuracion.resistencias?.rayo ?? 0,

      veneno: configuracion.resistencias?.veneno ?? 0,
    },
  };

  const camposNumericos = [
    "vida",
    "mana",
    "vidaPorNivel",
    "manaPorNivel",
    "precision",
    "evasion",
    "armadura",
    "regeneracionVida",
    "regeneracionMana",
    "probabilidadCritico",
    "multiplicadorCritico",
    "probabilidadBloqueo",
    "potenciaEfectos",
    "resistenciaMental",
    "potenciaAura",
  ];

  for (const campo of camposNumericos) {
    if (!Number.isFinite(valores[campo])) {
      throw new Error(
        `La estadística base "${campo}" de ` + `${nombre} no es válida.`,
      );
    }
  }

  for (const [tipo, valor] of Object.entries(valores.resistencias)) {
    if (!Number.isFinite(valor)) {
      throw new Error(
        `La resistencia "${tipo}" de ` + `${nombre} no es válida.`,
      );
    }
  }

  return valores;
}

function normalizarAtaqueNatural(nombre, configuracion = null) {
  const valores =
    configuracion &&
    typeof configuracion === "object" &&
    !Array.isArray(configuracion)
      ? configuracion
      : {};

  const tipoAtaque = valores.tipoAtaque ?? "cuerpoACuerpo";

  const patronSolicitado =
    valores.patronAtaque ?? obtenerPatronAtaquePredeterminado(tipoAtaque);

  const patronNormalizado = normalizarPatronAtaque(patronSolicitado);

  const ataque = {
    danioFisicoMinimo: valores.danioFisicoMinimo ?? 1,

    danioFisicoMaximo: valores.danioFisicoMaximo ?? 2,

    atributoAtaque: valores.atributoAtaque ?? "fuerza",

    precision: valores.precision ?? 0,

    alcance: valores.alcance ?? 1,

    tipoAtaque,
    patronAtaque: patronNormalizado,

    probabilidadCritico: valores.probabilidadCritico ?? 5,

    multiplicadorCritico: valores.multiplicadorCritico ?? 1.5,

    // Los ataques naturales utilizan
    // un coste normal de 100 salvo que
    // su plantilla indique otro valor.
    costoAtaque: valores.costoAtaque ?? TIEMPO_REFERENCIA,
  };

  if (
    !Number.isFinite(ataque.danioFisicoMinimo) ||
    !Number.isFinite(ataque.danioFisicoMaximo) ||
    ataque.danioFisicoMinimo < 0 ||
    ataque.danioFisicoMaximo < ataque.danioFisicoMinimo
  ) {
    throw new Error(
      `El ataque natural de ${nombre} ` + "tiene un rango inválido.",
    );
  }

  if (
    typeof ataque.atributoAtaque !== "string" ||
    ataque.atributoAtaque.trim() === ""
  ) {
    throw new Error(
      `El ataque natural de ${nombre} ` + "necesita un atributo de ataque.",
    );
  }

  ataque.atributoAtaque = ataque.atributoAtaque.trim().toLowerCase();

  if (!Number.isFinite(ataque.precision)) {
    throw new Error(
      "La precisión del ataque natural de " + `${nombre} no es válida.`,
    );
  }

  if (!Number.isInteger(ataque.alcance) || ataque.alcance < 1) {
    throw new Error(
      "El alcance del ataque natural de " + `${nombre} no es válido.`,
    );
  }

  if (!TIPOS_ATAQUE_VALIDOS.includes(ataque.tipoAtaque)) {
    throw new Error(
      "El tipo de ataque natural de " + `${nombre} no es válido.`,
    );
  }

  if (!ataque.patronAtaque) {
    throw new Error(
      "El patrón del ataque natural de " + `${nombre} no es válido.`,
    );
  }

  if (
    ataque.patronAtaque === PATRONES_ATAQUE.ADYACENTE &&
    ataque.alcance !== 1
  ) {
    throw new Error(
      `El ataque natural de ${nombre} utiliza ` +
        "patrón adyacente y debe tener alcance 1.",
    );
  }

  if (
    !Number.isFinite(ataque.probabilidadCritico) ||
    !Number.isFinite(ataque.multiplicadorCritico)
  ) {
    throw new Error(
      "Los valores de crítico del ataque " +
        `natural de ${nombre} no son válidos.`,
    );
  }

  if (!Number.isInteger(ataque.costoAtaque) || ataque.costoAtaque <= 0) {
    throw new Error(
      "El costo del ataque natural de " +
        `${nombre} debe ser un entero mayor que 0.`,
    );
  }

  return ataque;
}

function normalizarFactoresTemporales(nombre, configuracion = {}) {
  if (
    configuracion === null ||
    typeof configuracion !== "object" ||
    Array.isArray(configuracion)
  ) {
    throw new Error(
      `${nombre} debe tener una ` + "configuración temporal válida.",
    );
  }

  const factores = {
    factorTiempo:
      configuracion.factorTiempo ??
      FACTORES_TEMPORALES_PREDETERMINADOS.factorTiempo,

    factorMovimiento:
      configuracion.factorMovimiento ??
      FACTORES_TEMPORALES_PREDETERMINADOS.factorMovimiento,

    factorAtaque:
      configuracion.factorAtaque ??
      FACTORES_TEMPORALES_PREDETERMINADOS.factorAtaque,

    factorAccion:
      configuracion.factorAccion ??
      FACTORES_TEMPORALES_PREDETERMINADOS.factorAccion,

    factorConsumo:
      configuracion.factorConsumo ??
      FACTORES_TEMPORALES_PREDETERMINADOS.factorConsumo,
  };

  for (const nombreFactor of NOMBRES_FACTORES_TEMPORALES) {
    const valor = factores[nombreFactor];

    if (!Number.isFinite(valor) || valor <= 0) {
      throw new Error(
        `El factor temporal "${nombreFactor}" de ` +
          `${nombre} debe ser un número mayor que 0.`,
      );
    }
  }

  return factores;
}

export class Combatiente extends Destructible {
  constructor({
    nombre,
    nivel = 1,
    x = 0,
    y = 0,
    simbolo = "?",
    atributos,
    estadisticasBase,
    ataqueNatural = null,
    factoresTemporales = {},
    capacidadContenedor = 0,
    objetosIniciales = [],
    tablaBotin = [],
    ranurasEquipamiento = [],
    equipamientoInicial = [],
  } = {}) {
    if (!Number.isInteger(nivel) || nivel < 1) {
      throw new Error(
        `${nombre} debe tener un nivel entero ` + "igual o mayor que 1.",
      );
    }

    validarAtributos(nombre, atributos);

    const atributosNormalizados = {
      ...atributos,
    };

    const baseNormalizada = normalizarEstadisticasBase(
      nombre,
      estadisticasBase,
    );

    const ataqueNormalizado = normalizarAtaqueNatural(nombre, ataqueNatural);

    const factoresTemporalesNormalizados = normalizarFactoresTemporales(
      nombre,
      factoresTemporales,
    );

    if (
      !Object.prototype.hasOwnProperty.call(
        atributosNormalizados,

        ataqueNormalizado.atributoAtaque,
      )
    ) {
      throw new Error(
        `${nombre} no tiene el atributo ` +
          `"${ataqueNormalizado.atributoAtaque}" ` +
          "usado por su ataque natural.",
      );
    }

    const equipamiento = new Equipamiento({
      ranurasDisponibles: ranurasEquipamiento,

      objetosIniciales: equipamientoInicial,
    });

    const objetosEquipados = Object.values(
      equipamiento.obtenerRanuras(),
    ).filter(Boolean);

    const recursosIniciales = calcularRecursosMaximos({
      nivel,

      atributos: atributosNormalizados,

      estadisticasBase: baseNormalizada,

      objetosEquipados,
    });

    super({
      nombre,
      x,
      y,
      simbolo,

      vidaMaxima: recursosIniciales.vidaMaxima,

      armadura: 0,
      capacidadContenedor,
      objetosIniciales,
      tablaBotin,
    });

    this.nivel = nivel;

    this.atributos = atributosNormalizados;

    this.estadisticasBase = baseNormalizada;

    this.ataqueNatural = ataqueNormalizado;

    this.equipamiento = equipamiento;

    this.factorTiempo = factoresTemporalesNormalizados.factorTiempo;

    this.factorMovimiento = factoresTemporalesNormalizados.factorMovimiento;

    this.factorAtaque = factoresTemporalesNormalizados.factorAtaque;

    this.factorAccion = factoresTemporalesNormalizados.factorAccion;

    this.factorConsumo = factoresTemporalesNormalizados.factorConsumo;

    this.manaMaximo = recursosIniciales.manaMaximo;

    this.manaActual = recursosIniciales.manaMaximo;

    this.acumuladorRegeneracionVida = 0;
    this.acumuladorRegeneracionMana = 0;
  }

  get estadisticasDerivadas() {
    const estadisticas = calcularEstadisticasDerivadas(this);

    this.vidaMaxima = estadisticas.vidaMaxima;

    this.manaMaximo = estadisticas.manaMaximo;

    this.vidaActual = Math.min(this.vidaActual, this.vidaMaxima);

    this.manaActual = Math.min(this.manaActual, this.manaMaximo);

    return estadisticas;
  }

  get armaEquipada() {
    if (!this.equipamiento.tieneRanura("arma")) {
      return null;
    }

    const objeto = this.equipamiento.obtenerObjetoEnRanura("arma");

    return objeto?.tipo === "arma" ? objeto : null;
  }

  get configuracionAtaqueActual() {
    return obtenerConfiguracionAtaque(this);
  }

  get atributoAtaqueActual() {
    return this.configuracionAtaqueActual.propiedadesControladoras
      .atributoAtaque;
  }

  get costoAtaqueActual() {
    const costoAtaque = this.configuracionAtaqueActual.costoAtaqueBase;

    if (!Number.isInteger(costoAtaque) || costoAtaque <= 0) {
      throw new Error(
        `El costo de ataque actual de ${this.nombre} ` + "no es válido.",
      );
    }

    return costoAtaque;
  }

  get alcanceAtaque() {
    const alcance =
      this.configuracionAtaqueActual.propiedadesControladoras.alcance;

    if (!Number.isInteger(alcance) || alcance < 1) {
      throw new Error(`El alcance de ${this.nombre} no es válido.`);
    }

    return alcance;
  }

  get tipoAtaqueActual() {
    const tipo =
      this.configuracionAtaqueActual.propiedadesControladoras.tipoAtaque;

    if (!TIPOS_ATAQUE_VALIDOS.includes(tipo)) {
      throw new Error(`El tipo de ataque de ${this.nombre} no es válido.`);
    }

    return tipo;
  }

  get patronAtaqueActual() {
    const patronAtaque =
      this.configuracionAtaqueActual.propiedadesControladoras.patronAtaque;

    const normalizado = normalizarPatronAtaque(patronAtaque);

    if (!normalizado) {
      throw new Error(`El patrón de ataque de ${this.nombre} no es válido.`);
    }

    return normalizado;
  }

  get estaVivo() {
    return !this.estaDestruido;
  }

  recuperarVida(cantidad) {
    if (!Number.isFinite(cantidad)) {
      throw new Error("La recuperación de Vida debe ser numérica.");
    }

    const anterior = this.vidaActual;

    this.vidaActual = Math.min(
      this.vidaMaxima,

      this.vidaActual + Math.max(0, cantidad),
    );

    return this.vidaActual - anterior;
  }

  recuperarMana(cantidad) {
    if (!Number.isFinite(cantidad)) {
      throw new Error("La recuperación de Maná debe ser numérica.");
    }

    const anterior = this.manaActual;

    this.manaActual = Math.min(
      this.manaMaximo,

      this.manaActual + Math.max(0, cantidad),
    );

    return this.manaActual - anterior;
  }

  gastarMana(cantidad) {
    if (!Number.isFinite(cantidad) || cantidad < 0) {
      throw new Error("El costo de Maná no es válido.");
    }

    if (this.manaActual < cantidad) {
      return false;
    }

    this.manaActual -= cantidad;

    return true;
  }

  // Procesa un pulso periódico de regeneración.
  //
  // Este método se ejecuta cada 100 unidades
  // temporales y no depende de las acciones
  // realizadas por el jugador.
  procesarPulsoRegeneracion() {
    if (!this.estaVivo) {
      return {
        vidaRecuperada: 0,
        manaRecuperado: 0,
      };
    }

    const estadisticas = this.estadisticasDerivadas;

    let vidaRecuperada = 0;
    let manaRecuperado = 0;

    if (this.vidaActual < this.vidaMaxima) {
      this.acumuladorRegeneracionVida += estadisticas.regeneracionVida;

      const vidaEntera = Math.floor(this.acumuladorRegeneracionVida);

      if (vidaEntera > 0) {
        vidaRecuperada = this.recuperarVida(vidaEntera);

        this.acumuladorRegeneracionVida -= vidaEntera;
      }
    } else {
      this.acumuladorRegeneracionVida = 0;
    }

    if (this.manaActual < this.manaMaximo) {
      this.acumuladorRegeneracionMana += estadisticas.regeneracionMana;

      const manaEntero = Math.floor(this.acumuladorRegeneracionMana);

      if (manaEntero > 0) {
        manaRecuperado = this.recuperarMana(manaEntero);

        this.acumuladorRegeneracionMana -= manaEntero;
      }
    } else {
      this.acumuladorRegeneracionMana = 0;
    }

    return {
      vidaRecuperada,
      manaRecuperado,
    };
  }

  atacarCasillaVacia() {
    return resolverAtaqueSinObjetivo({
      atacante: this,
    });
  }

  atacar(objetivo) {
    return resolverAtaque({
      atacante: this,
      objetivo,
    });
  }
}
