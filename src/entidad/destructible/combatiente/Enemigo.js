import { Combatiente } from "./Combatiente.js";

const TIPOS_AGRESIVIDAD_VALIDOS = ["activa", "reactiva"];

const ESTRATEGIAS_SIN_RECURSOS_VALIDAS = ["ataqueNatural", "esperar"];

// Representa cualquier combatiente controlado
// por la inteligencia artificial.
export class Enemigo extends Combatiente {
  constructor({
    nombre,
    nivel = 1,
    x = 0,
    y = 0,
    atributos,
    estadisticasBase,
    ataqueNatural,
    factoresTemporales = {},
    simbolo = "E",
    // Ruta opcional del sprite del enemigo.
    recursoVisual = null,
    experienciaOtorgada = 0,
    capacidadContenedor = 0,
    objetosIniciales = [],
    tablaBotin = [],
    ranurasEquipamiento = [],
    equipamientoInicial = [],
    configuracionIA,
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
      simbolo,
      capacidadContenedor,
      objetosIniciales,
      tablaBotin,
      ranurasEquipamiento,
      equipamientoInicial,
    });

    // La ausencia de imagen es válida porque
    // el renderizador conserva el símbolo ASCII.
    if (
      recursoVisual !== null &&
      (typeof recursoVisual !== "string" || recursoVisual.trim() === "")
    ) {
      throw new Error(
        `El recurso visual de ${nombre} debe ser una ruta válida.`,
      );
    }

    this.recursoVisual = recursoVisual?.trim() ?? null;

    if (!Number.isInteger(experienciaOtorgada) || experienciaOtorgada < 0) {
      throw new Error(
        `La experiencia otorgada por ${nombre} ` +
          "debe ser un entero igual o mayor que 0.",
      );
    }

    this.validarConfiguracionIA(configuracionIA);

    this.experienciaOtorgada = experienciaOtorgada;

    this.configuracionIA = {
      ...configuracionIA,
    };

    this.estaAgresivo = false;

    // Cuando vale true, ConfiguracionAtaque
    // ignora temporalmente las armas equipadas
    // y utiliza el ataque natural del enemigo.
    this.ataqueNaturalForzado = false;
  }

  validarConfiguracionIA(configuracionIA) {
    if (
      !configuracionIA ||
      typeof configuracionIA !== "object" ||
      Array.isArray(configuracionIA)
    ) {
      throw new Error(
        `${this.nombre} necesita una ` + "configuración de IA válida.",
      );
    }

    if (!TIPOS_AGRESIVIDAD_VALIDOS.includes(configuracionIA.tipoAgresividad)) {
      throw new Error(
        `El tipo de agresividad de ${this.nombre} ` +
          "debe ser: " +
          `${TIPOS_AGRESIVIDAD_VALIDOS.join(" o ")}.`,
      );
    }

    if (
      !ESTRATEGIAS_SIN_RECURSOS_VALIDAS.includes(
        configuracionIA.estrategiaSinRecursos,
      )
    ) {
      throw new Error(
        `La estrategia sin recursos de ${this.nombre} ` +
          "debe ser: " +
          `${ESTRATEGIAS_SIN_RECURSOS_VALIDAS.join(" o ")}.`,
      );
    }

    // El alcance y la rapidez de ataque
    // pertenecen al arma o ataque natural.
    //
    // La rapidez de movimiento pertenece
    // a los factores temporales.
    const camposNumericos = [
      {
        nombre: "percepcion",
        minimo: 0,
      },
      {
        nombre: "margenPersecucion",
        minimo: 0,
      },
    ];

    for (const campo of camposNumericos) {
      const valor = configuracionIA[campo.nombre];

      if (!Number.isInteger(valor) || valor < campo.minimo) {
        throw new Error(
          `El valor "${campo.nombre}" de ` +
            `${this.nombre} debe ser un entero ` +
            `igual o mayor que ${campo.minimo}.`,
        );
      }
    }
  }

  // El enemigo abandona la persecución cuando
  // supera percepción más el margen configurado.
  get rangoPersecucion() {
    return (
      this.configuracionIA.percepcion + this.configuracionIA.margenPersecucion
    );
  }

  activarAgresividad() {
    this.estaAgresivo = true;
  }

  desactivarAgresividad() {
    this.estaAgresivo = false;
  }

  // Activa el ataque natural como respaldo.
  //
  // Devuelve true únicamente cuando cambió
  // realmente el estado.
  activarAtaqueNaturalForzado() {
    if (this.ataqueNaturalForzado) {
      return false;
    }

    this.ataqueNaturalForzado = true;

    return true;
  }

  // Permite volver a comprobar el arma
  // equipada durante la siguiente acción.
  desactivarAtaqueNaturalForzado() {
    if (!this.ataqueNaturalForzado) {
      return false;
    }

    this.ataqueNaturalForzado = false;

    return true;
  }
}
