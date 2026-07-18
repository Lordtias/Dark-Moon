import { Combatiente } from "./Combatiente.js";

const TIPOS_AGRESIVIDAD_VALIDOS = ["activa", "reactiva"];

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
    simbolo = "E",
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
      simbolo,
      capacidadContenedor,
      objetosIniciales,
      tablaBotin,
      ranurasEquipamiento,
      equipamientoInicial,
    });

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
  }

  validarConfiguracionIA(configuracionIA) {
    if (
      !configuracionIA ||
      typeof configuracionIA !== "object" ||
      Array.isArray(configuracionIA)
    ) {
      throw new Error(
        `${this.nombre} necesita una configuración de IA válida.`,
      );
    }

    if (!TIPOS_AGRESIVIDAD_VALIDOS.includes(configuracionIA.tipoAgresividad)) {
      throw new Error(
        `El tipo de agresividad de ${this.nombre} debe ser: ` +
          `${TIPOS_AGRESIVIDAD_VALIDOS.join(" o ")}.`,
      );
    }

    // El alcance de ataque ya no forma parte de la IA.
    //
    // Se obtiene dinámicamente desde:
    // - El arma equipada.
    // - El ataque natural.
    const camposNumericos = [
      {
        nombre: "percepcion",
        minimo: 0,
      },
      {
        nombre: "margenPersecucion",
        minimo: 0,
      },
      {
        nombre: "movimientosPorTurno",
        minimo: 0,
      },
    ];

    for (const campo of camposNumericos) {
      const valor = configuracionIA[campo.nombre];

      if (!Number.isInteger(valor) || valor < campo.minimo) {
        throw new Error(
          `El valor "${campo.nombre}" de ${this.nombre} ` +
            `debe ser un entero igual o mayor que ${campo.minimo}.`,
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
}
