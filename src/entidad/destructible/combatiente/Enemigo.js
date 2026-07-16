// Importamos Combatiente porque todos los enemigos
// pueden recibir daño y realizar ataques.
import {
  Combatiente
} from "./Combatiente.js";

// Tipos de agresividad aceptados actualmente.
//
// "activa":
// Puede comenzar a perseguir al detectar al jugador.
//
// "reactiva":
// Solamente comienza a perseguir después de ser atacado.
const TIPOS_AGRESIVIDAD_VALIDOS = [
  "activa",
  "reactiva"
];

/**
 * Representa cualquier criatura hostil del juego.
 *
 * Ratas, esqueletos y futuros enemigos utilizarán
 * esta misma clase, pero recibirán estadísticas,
 * niveles, variantes y comportamientos diferentes.
 */
export class Enemigo extends Combatiente {
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
    simbolo = "E",
    experienciaOtorgada = 0,

    // Contenedor opcional del enemigo.
    capacidadContenedor = 0,
    objetosIniciales = [],

    // Botín generado al derrotarlo.
    tablaBotin = [],

    // Equipamiento que puede utilizar.
    ranurasEquipamiento = [],
    equipamientoInicial = [],

    configuracionIA
  } = {}) {
    // Enviamos a Combatiente toda la información
    // compartida entre jugadores y enemigos.
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
        simbolo,

        // Información genérica heredada por Destructible.
        capacidadContenedor,
        objetosIniciales,
        tablaBotin,

        // Información de equipamiento heredada
        // por Combatiente.
        ranurasEquipamiento,
        equipamientoInicial
    });

    // La experiencia debe ser un número entero
    // igual o mayor que cero.
    if (
      !Number.isInteger(experienciaOtorgada) ||
      experienciaOtorgada < 0
    ) {
      throw new Error(
        `La experiencia otorgada por ${nombre} ` +
        "debe ser un número entero igual o mayor que 0."
      );
    }

    // Validamos la configuración antes de guardarla.
    this.validarConfiguracionIA(
      configuracionIA
    );

    // Experiencia entregada cuando el enemigo
    // es derrotado por el jugador.
    this.experienciaOtorgada =
      experienciaOtorgada;

    // Guardamos una copia para impedir que esta instancia
    // modifique directamente los valores del JSON.
    this.configuracionIA = {
      ...configuracionIA
    };

    // Todos los enemigos comienzan sin estar agresivos.
    //
    // En el futuro:
    // - Los activos se volverán agresivos al detectar.
    // - Los reactivos se volverán agresivos al ser atacados.
    this.estaAgresivo = false;
  }

  /**
   * Comprueba que la configuración de IA tenga
   * valores válidos antes de utilizarla.
   *
   * @param {Object} configuracionIA Configuración
   * calculada por la fábrica.
   */
  validarConfiguracionIA(
    configuracionIA
  ) {
    // La configuración de IA es obligatoria
    // para todas las plantillas de enemigos.
    if (
      configuracionIA === null ||
      typeof configuracionIA !== "object" ||
      Array.isArray(configuracionIA)
    ) {
      throw new Error(
        `El enemigo ${this.nombre} necesita ` +
        "una configuración de IA válida."
      );
    }

    // Validamos el tipo de agresividad.
    if (
      !TIPOS_AGRESIVIDAD_VALIDOS.includes(
        configuracionIA.tipoAgresividad
      )
    ) {
      throw new Error(
        `El tipo de agresividad de ${this.nombre} ` +
        `debe ser uno de estos valores: ` +
        `${TIPOS_AGRESIVIDAD_VALIDOS.join(", ")}.`
      );
    }

    // Cada campo debe ser un número entero.
    //
    // El mínimo determina si aceptamos el valor cero.
    const camposNumericos = [
      {
        nombre: "percepcion",
        minimo: 0
      },
      {
        nombre: "margenPersecucion",
        minimo: 0
      },
      {
        nombre: "rangoAtaque",
        minimo: 1
      },
      {
        nombre: "movimientosPorTurno",
        minimo: 0
      }
    ];

    camposNumericos.forEach((campo) => {
      const valor =
        configuracionIA[campo.nombre];

      if (
        !Number.isInteger(valor) ||
        valor < campo.minimo
      ) {
        throw new Error(
          `El valor "${campo.nombre}" de ${this.nombre} ` +
          `debe ser un número entero igual o mayor ` +
          `que ${campo.minimo}.`
        );
      }
    });
  }

  /**
   * Devuelve la distancia máxima hasta la cual
   * el enemigo continuará persiguiendo.
   *
   * El inicio de la agresividad utiliza percepción.
   * La persecución utiliza percepción más el margen.
   *
   * @returns {number} Rango máximo de persecución.
   */
  get rangoPersecucion() {
    return (
      this.configuracionIA.percepcion +
      this.configuracionIA.margenPersecucion
    );
  }

  /**
   * Marca al enemigo como agresivo.
   *
   * Será utilizado cuando:
   * - Un enemigo activo detecte al jugador.
   * - Un enemigo reactivo sea atacado.
   */
  activarAgresividad() {
    this.estaAgresivo = true;
  }

  /**
   * Hace que el enemigo abandone la persecución.
   *
   * Se utilizará cuando el jugador supere
   * el rango máximo de persecución.
   */
  desactivarAgresividad() {
    this.estaAgresivo = false;
  }
}