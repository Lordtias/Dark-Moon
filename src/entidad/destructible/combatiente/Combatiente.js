import { Destructible } from "../Destructible.js";
import { Equipamiento } from "../../../objetos/Equipamiento.js";
import { calcularEstadisticasDerivadas } from "./EstadisticasDerivadas.js";
import { resolverAtaque } from "../../../juego/SistemaCombate.js";

const TIPOS_ATAQUE_VALIDOS = ["cuerpoACuerpo", "distancia"];

const ATRIBUTOS_REQUERIDOS = [
  "fuerza",
  "destreza",
  "constitucion",
  "inteligencia",
  "sabiduria",
  "carisma",
];

export class Combatiente extends Destructible {
  constructor({
    nombre,
    nivel = 1,
    x = 0,
    y = 0,
    simbolo = "?",
    atributos,
    vidaMaxima,
    dadoDanio,
    atributoAtaque,
    bonificadorArmadura = 0,
    capacidadContenedor = 0,
    objetosIniciales = [],
    tablaBotin = [],
    ranurasEquipamiento = [],
    equipamientoInicial = [],
    estadisticasBase = null,
    ataqueNatural = null,
  } = {}) {
    super({
      nombre,
      x,
      y,
      simbolo,
      vidaMaxima,
      claseArmadura: 10,
      capacidadContenedor,
      objetosIniciales,
      tablaBotin,
    });

    if (!Number.isInteger(nivel) || nivel < 1) {
      throw new Error(`${nombre} debe tener un nivel válido.`);
    }

    if (
      !atributos ||
      typeof atributos !== "object" ||
      Array.isArray(atributos)
    ) {
      throw new Error(`${nombre} debe tener atributos válidos.`);
    }

    for (const atributo of ATRIBUTOS_REQUERIDOS) {
      if (!Number.isInteger(atributos[atributo]) || atributos[atributo] <= 0) {
        throw new Error(
          `El atributo "${atributo}" de ${nombre} ` +
            "debe ser un entero mayor que 0.",
        );
      }
    }

    const atributoBase =
      typeof atributoAtaque === "string"
        ? atributoAtaque.trim().toLowerCase()
        : "fuerza";

    if (!Object.prototype.hasOwnProperty.call(atributos, atributoBase)) {
      throw new Error(`${nombre} no tiene el atributo "${atributoBase}".`);
    }

    this.nivel = nivel;
    this.atributos = { ...atributos };

    // Se conservan mientras migramos
    // completamente la configuración antigua.
    this.dadoDanio = dadoDanio;
    this.atributoAtaque = atributoBase;
    this.bonificadorArmadura = bonificadorArmadura;

    this.equipamiento = new Equipamiento({
      ranurasDisponibles: ranurasEquipamiento,
      objetosIniciales: equipamientoInicial,
    });

    this.ataqueNatural = this.crearAtaqueNatural(ataqueNatural, atributoBase);

    this.estadisticasBase = this.crearEstadisticasBase(
      estadisticasBase,
      vidaMaxima,
    );

    const estadisticasIniciales = calcularEstadisticasDerivadas(this);

    this.vidaMaxima = estadisticasIniciales.vidaMaxima;

    this.vidaActual = estadisticasIniciales.vidaMaxima;

    this.manaMaximo = estadisticasIniciales.manaMaximo;

    this.manaActual = estadisticasIniciales.manaMaximo;

    // Conservan las fracciones de regeneración.
    this.acumuladorRegeneracionVida = 0;
    this.acumuladorRegeneracionMana = 0;
  }

  crearAtaqueNatural(configuracion, atributoBase) {
    const valores =
      configuracion && typeof configuracion === "object" ? configuracion : {};

    const ataque = {
      danioFisicoMinimo: valores.danioFisicoMinimo ?? 1,

      danioFisicoMaximo: valores.danioFisicoMaximo ?? 2,

      atributoAtaque: valores.atributoAtaque ?? atributoBase,

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
      throw new Error(`El ataque natural de ${this.nombre} es inválido.`);
    }

    return ataque;
  }

  crearEstadisticasBase(configuracion, vidaMaximaAnterior) {
    const valores =
      configuracion && typeof configuracion === "object" ? configuracion : {};

    const vidaAnterior = Number.isFinite(vidaMaximaAnterior)
      ? vidaMaximaAnterior
      : 1;

    return {
      vida: valores.vida ?? vidaAnterior - 5 * this.atributos.constitucion,

      mana: valores.mana ?? -4 * this.atributos.inteligencia,

      vidaPorNivel: valores.vidaPorNivel ?? 0,

      manaPorNivel: valores.manaPorNivel ?? 0,

      precision: valores.precision ?? 10,

      evasion: valores.evasion ?? 5,

      armadura: valores.armadura ?? 0,

      regeneracionVida: valores.regeneracionVida ?? 0,

      regeneracionMana: valores.regeneracionMana ?? 0,

      probabilidadCritico: valores.probabilidadCritico ?? 5,

      multiplicadorCritico: valores.multiplicadorCritico ?? 1.5,

      probabilidadBloqueo: valores.probabilidadBloqueo ?? 0,

      potenciaEfectos: valores.potenciaEfectos ?? 0,

      resistenciaMental: valores.resistenciaMental ?? 0,

      potenciaAura: valores.potenciaAura ?? 0,

      resistencias: {
        fuego: valores.resistencias?.fuego ?? 0,
        frio: valores.resistencias?.frio ?? 0,
        rayo: valores.resistencias?.rayo ?? 0,
        veneno: valores.resistencias?.veneno ?? 0,
      },
    };
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

  get atributoAtaqueActual() {
    return (
      this.armaEquipada?.propiedades?.atributoAtaque ??
      this.ataqueNatural.atributoAtaque
    );
  }

  get alcanceAtaque() {
    const alcance =
      this.armaEquipada?.propiedades?.alcance ?? this.ataqueNatural.alcance;

    if (!Number.isInteger(alcance) || alcance < 1) {
      throw new Error(`El alcance de ${this.nombre} es inválido.`);
    }

    return alcance;
  }

  get tipoAtaqueActual() {
    const tipo =
      this.armaEquipada?.propiedades?.tipoAtaque ??
      this.ataqueNatural.tipoAtaque;

    if (!TIPOS_ATAQUE_VALIDOS.includes(tipo)) {
      throw new Error(`El tipo de ataque de ${this.nombre} es inválido.`);
    }

    return tipo;
  }

  get estaVivo() {
    return !this.estaDestruido;
  }

  recuperarVida(cantidad) {
    const anterior = this.vidaActual;

    this.vidaActual = Math.min(
      this.vidaMaxima,
      this.vidaActual + Math.max(0, cantidad),
    );

    return this.vidaActual - anterior;
  }

  recuperarMana(cantidad) {
    const anterior = this.manaActual;

    this.manaActual = Math.min(
      this.manaMaximo,
      this.manaActual + Math.max(0, cantidad),
    );

    return this.manaActual - anterior;
  }

  gastarMana(cantidad) {
    if (!Number.isFinite(cantidad) || cantidad < 0) {
      throw new Error("El costo de Maná es inválido.");
    }

    if (this.manaActual < cantidad) {
      return false;
    }

    this.manaActual -= cantidad;
    return true;
  }

  // Procesa la regeneración usando acumuladores,
  // para no perder valores decimales pequeños.
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
}
