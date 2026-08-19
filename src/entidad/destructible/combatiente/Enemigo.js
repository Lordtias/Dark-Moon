import { Combatiente } from "./Combatiente.js";
import { OBJETIVOS_MODIFICADOR } from "../../../juego/modificadores/ContratosModificadoresCombatiente.js";

const TIPOS_AGRESIVIDAD_VALIDOS = ["activa", "reactiva"];

const ESTRATEGIAS_SIN_RECURSOS_VALIDAS = ["ataqueNatural", "esperar"];

// Representa cualquier combatiente controlado
// por la inteligencia artificial.
export class Enemigo extends Combatiente {
  constructor({
    nombre,
    idPlantilla = null,
    idVariante = null,
    genero = null,
    nivel = 1,
    x = 0,
    y = 0,
    atributos,
    estadisticasBase,
    ataqueNatural,
    factoresTemporales = {},
    modificadoresIniciales = [],
    simbolo = "E",
    // Ruta opcional del sprite del enemigo.
    recursoVisual = null,
    experienciaOtorgada = 0,
    capacidadContenedor = 0,
    objetosIniciales = [],
    solicitudBotin = null,
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
      modificadoresIniciales,
      tipoContextoModificadores: "enemigo",
      simbolo,
      capacidadContenedor,
      objetosIniciales,
      solicitudBotin,
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

    // Metadata canónica de presentación. No altera estadísticas ni IA;
    // permite localizar el nombre sin depender del texto español final.
    this.idPlantilla = normalizarIdPresentacion(idPlantilla);
    this.idVariante = normalizarIdPresentacion(idVariante);
    this.genero = normalizarIdPresentacion(genero);

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

  get percepcionBase() {
    return this.configuracionIA.percepcion;
  }

  get percepcion() {
    return Math.max(
      0,
      this.obtenerValorModificado(
        OBJETIVOS_MODIFICADOR.PERCEPCION,
        this.percepcionBase,
      ),
    );
  }

  // El enemigo abandona la persecución cuando supera la Percepción final
  // resuelta por el centralizador más el margen propio de su IA.
  get rangoPersecucion() {
    return this.percepcion + this.configuracionIA.margenPersecucion;
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

function normalizarIdPresentacion(valor) {
  return typeof valor === "string" && valor.trim() !== ""
    ? valor.trim().toLowerCase()
    : null;
}
