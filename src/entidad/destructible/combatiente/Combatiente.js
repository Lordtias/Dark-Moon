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

const TIPOS_ATAQUE_VALIDOS = ["cuerpoACuerpo", "distancia"];

const ATRIBUTOS_REQUERIDOS = [
  "fuerza",
  "destreza",
  "constitucion",
  "inteligencia",
  "sabiduria",
  "carisma",
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
        `La estadística base "${campo}" ` + `de ${nombre} no es válida.`,
      );
    }
  }

  for (const [tipo, valor] of Object.entries(valores.resistencias)) {
    if (!Number.isFinite(valor)) {
      throw new Error(
        `La resistencia "${tipo}" ` + `de ${nombre} no es válida.`,
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

  const ataque = {
    danioFisicoMinimo: valores.danioFisicoMinimo ?? 1,

    danioFisicoMaximo: valores.danioFisicoMaximo ?? 2,

    atributoAtaque: valores.atributoAtaque ?? "fuerza",

    precision: valores.precision ?? 0,

    alcance: valores.alcance ?? 1,

    tipoAtaque: valores.tipoAtaque ?? "cuerpoACuerpo",

    probabilidadCritico: valores.probabilidadCritico ?? 5,

    multiplicadorCritico: valores.multiplicadorCritico ?? 1.5,
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
      `El ataque natural de ${nombre} ` + "necesita un atributo.",
    );
  }

  ataque.atributoAtaque = ataque.atributoAtaque.trim().toLowerCase();

  if (!Number.isFinite(ataque.precision)) {
    throw new Error(
      `La precisión del ataque natural ` + `de ${nombre} no es válida.`,
    );
  }

  if (!Number.isInteger(ataque.alcance) || ataque.alcance < 1) {
    throw new Error(
      `El alcance del ataque natural ` + `de ${nombre} no es válido.`,
    );
  }

  if (!TIPOS_ATAQUE_VALIDOS.includes(ataque.tipoAtaque)) {
    throw new Error(
      `El tipo de ataque natural ` + `de ${nombre} no es válido.`,
    );
  }

  if (
    !Number.isFinite(ataque.probabilidadCritico) ||
    !Number.isFinite(ataque.multiplicadorCritico)
  ) {
    throw new Error(`Los valores de crítico de ` + `${nombre} no son válidos.`);
  }

  return ataque;
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
    capacidadContenedor = 0,
    objetosIniciales = [],
    tablaBotin = [],
    ranurasEquipamiento = [],
    equipamientoInicial = [],
  } = {}) {
    if (!Number.isInteger(nivel) || nivel < 1) {
      throw new Error(`${nombre} debe tener un nivel ` + "entero mayor que 0.");
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

    if (
      !Object.prototype.hasOwnProperty.call(
        atributosNormalizados,

        ataqueNormalizado.atributoAtaque,
      )
    ) {
      throw new Error(
        `${nombre} no tiene el atributo ` +
          `"${ataqueNormalizado.atributoAtaque}".`,
      );
    }

    const equipamiento = new Equipamiento({
      ranurasDisponibles: ranurasEquipamiento,

      objetosIniciales: equipamientoInicial,
    });

    const recursosIniciales = calcularRecursosMaximos({
      nivel,

      atributos: atributosNormalizados,

      estadisticasBase: baseNormalizada,

      objetosEquipados: equipamiento.obtenerObjetosEquipados(),
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

  get configuracionAtaqueActual() {
    return obtenerConfiguracionAtaque(this);
  }

  get armaPrincipal() {
    return this.configuracionAtaqueActual.armaPrincipal;
  }

  get armaSecundaria() {
    return this.configuracionAtaqueActual.armaSecundaria;
  }

  get quiverEquipado() {
    return this.configuracionAtaqueActual.quiver;
  }

  get atributoAtaqueActual() {
    return this.configuracionAtaqueActual.propiedadesControladoras
      .atributoAtaque;
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

  procesarRegeneracionTurno() {
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

  atacar(objetivo) {
    return resolverAtaque({
      atacante: this,
      objetivo,
    });
  }

  atacarCasillaVacia() {
    return resolverAtaqueSinObjetivo({
      atacante: this,
    });
  }
}
