// Cantidad de unidades temporales utilizadas como referencia.
//
// Un coste o factor de 100 representa la velocidad normal.
// Un valor menor representa una acción más rápida.
// Un valor mayor representa una acción más lenta.
export const TIEMPO_REFERENCIA = 100;

// Tipos de acciones que pueden consumir tiempo.
//
// Utilizamos constantes para evitar escribir textos diferentes
// en cada sistema que necesite calcular un coste temporal.
export const TIPOS_ACCION_TEMPORAL = Object.freeze({
  MOVIMIENTO: "movimiento",
  ATAQUE: "ataque",
  ACCION: "accion",
  CONSUMO: "consumo",
  ESPERA: "espera",
});

// Costes predeterminados de las acciones que todavía
// no dependen de un arma, objeto o elemento del mapa.
//
// El coste de ataque no aparece aquí porque será definido
// por el arma equipada o por el ataque natural.
export const COSTOS_TEMPORALES_BASE = Object.freeze({
  movimiento: TIEMPO_REFERENCIA,
  accion: TIEMPO_REFERENCIA,
  consumo: TIEMPO_REFERENCIA,
  espera: TIEMPO_REFERENCIA,
});

// Factores temporales normales de cualquier combatiente.
//
// Estos valores serán incorporados dentro de Combatiente
// durante el siguiente paso del hito.
export const FACTORES_TEMPORALES_PREDETERMINADOS = Object.freeze({
  factorTiempo: TIEMPO_REFERENCIA,
  factorMovimiento: TIEMPO_REFERENCIA,
  factorAtaque: TIEMPO_REFERENCIA,
  factorAccion: TIEMPO_REFERENCIA,
  factorConsumo: TIEMPO_REFERENCIA,
});

// Relaciona cada tipo de acción con el factor específico
// que deberá utilizarse desde el combatiente.
const FACTOR_ESPECIFICO_POR_ACCION = Object.freeze({
  [TIPOS_ACCION_TEMPORAL.MOVIMIENTO]: "factorMovimiento",
  [TIPOS_ACCION_TEMPORAL.ATAQUE]: "factorAtaque",
  [TIPOS_ACCION_TEMPORAL.ACCION]: "factorAccion",
  [TIPOS_ACCION_TEMPORAL.CONSUMO]: "factorConsumo",

  // Esperar solamente utiliza el factor temporal general.
  // No necesita un factor específico separado.
  [TIPOS_ACCION_TEMPORAL.ESPERA]: null,
});

// Comprueba que un número utilizado como coste o factor
// temporal sea válido.
//
// Todos los valores deben ser positivos porque un coste
// igual o menor que cero rompería el orden de la agenda.
function validarValorTemporal(valor, nombreCampo) {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error(
      `El valor temporal "${nombreCampo}" debe ser ` + "un número mayor que 0.",
    );
  }
}

// Devuelve todos los factores temporales de un combatiente.
//
// Mientras todavía no estén implementados dentro de
// Combatiente, esta función utilizará automáticamente 100.
// Esto permite construir el sistema de manera progresiva.
export function obtenerFactoresTemporales(combatiente) {
  if (!combatiente || typeof combatiente !== "object") {
    throw new Error(
      "Se necesita un combatiente válido para obtener " +
        "sus factores temporales.",
    );
  }

  const factores = {
    factorTiempo:
      combatiente.factorTiempo ??
      FACTORES_TEMPORALES_PREDETERMINADOS.factorTiempo,

    factorMovimiento:
      combatiente.factorMovimiento ??
      FACTORES_TEMPORALES_PREDETERMINADOS.factorMovimiento,

    factorAtaque:
      combatiente.factorAtaque ??
      FACTORES_TEMPORALES_PREDETERMINADOS.factorAtaque,

    factorAccion:
      combatiente.factorAccion ??
      FACTORES_TEMPORALES_PREDETERMINADOS.factorAccion,

    factorConsumo:
      combatiente.factorConsumo ??
      FACTORES_TEMPORALES_PREDETERMINADOS.factorConsumo,
  };

  for (const [nombre, valor] of Object.entries(factores)) {
    validarValorTemporal(valor, nombre);
  }

  return factores;
}

// Calcula el coste temporal final de una acción.
//
// Fórmula:
//
// coste final =
// coste base
// × factor temporal general / 100
// × factor específico / 100
//
// Ejemplo:
//
// Daga: 75
// Factor general élite: 90
// Factor de ataque: 100
//
// 75 × 90 / 100 × 100 / 100 = 67,5
//
// El resultado se redondea al entero más cercano porque
// la agenda temporal trabajará solamente con enteros.
export function calcularCostoTemporal({
  costoBase,
  factorTiempo = TIEMPO_REFERENCIA,
  factorEspecifico = TIEMPO_REFERENCIA,
} = {}) {
  validarValorTemporal(costoBase, "costoBase");
  validarValorTemporal(factorTiempo, "factorTiempo");
  validarValorTemporal(factorEspecifico, "factorEspecifico");

  const costoCalculado =
    costoBase *
    (factorTiempo / TIEMPO_REFERENCIA) *
    (factorEspecifico / TIEMPO_REFERENCIA);

  // Nunca permitimos que una acción termine costando
  // cero unidades, aunque existan bonificaciones futuras.
  return Math.max(1, Math.round(costoCalculado));
}

// Calcula el coste de una acción utilizando directamente
// los factores temporales del combatiente.
export function calcularCostoAccionCombatiente({
  combatiente,
  tipoAccion,
  costoBase,
} = {}) {
  if (!Object.values(TIPOS_ACCION_TEMPORAL).includes(tipoAccion)) {
    throw new Error(`El tipo de acción temporal "${tipoAccion}" no es válido.`);
  }

  const factores = obtenerFactoresTemporales(combatiente);
  const nombreFactorEspecifico = FACTOR_ESPECIFICO_POR_ACCION[tipoAccion];

  const factorEspecifico = nombreFactorEspecifico
    ? factores[nombreFactorEspecifico]
    : TIEMPO_REFERENCIA;

  return calcularCostoTemporal({
    costoBase,
    factorTiempo: factores.factorTiempo,
    factorEspecifico,
  });
}

// Gestiona el orden temporal de todos los actores.
//
// Cada actor tiene:
//
// - proximoTurno: momento en el que podrá actuar.
// - ordenRegistro: desempate permanente y determinista.
//
// El actor con el menor próximo turno será el siguiente.
// Si dos actores empatan, actuará primero quien haya sido
// registrado primero.
export class SistemaTiempo {
  constructor() {
    // Momento actual alcanzado por el mundo.
    this.tiempoActual = 0;

    // Map permite asociar cada combatiente con su
    // información temporal sin modificar todavía
    // directamente todas las clases de entidades.
    this.registros = new Map();

    // Contador utilizado para resolver empates de manera
    // estable, sin introducir ninguna tirada aleatoria.
    this.siguienteOrdenRegistro = 0;
  }

  // Registra un actor dentro de la agenda temporal.
  //
  // Por defecto comienza disponible en el tiempo actual.
  registrarActor(actor, proximoTurno = this.tiempoActual) {
    if (!actor || typeof actor !== "object") {
      throw new Error(
        "SistemaTiempo necesita un actor válido para registrarlo.",
      );
    }

    if (this.registros.has(actor)) {
      throw new Error(
        `${actor.nombre ?? "El actor"} ya está registrado ` +
          "en el sistema de tiempo.",
      );
    }

    if (!Number.isFinite(proximoTurno) || proximoTurno < this.tiempoActual) {
      throw new Error(
        "El próximo turno de un actor no puede ser anterior " +
          "al tiempo actual.",
      );
    }

    this.registros.set(actor, {
      actor,
      proximoTurno,
      ordenRegistro: this.siguienteOrdenRegistro,
    });

    this.siguienteOrdenRegistro++;
  }

  // Indica si un actor ya pertenece a la agenda.
  tieneActor(actor) {
    return this.registros.has(actor);
  }

  // Retira un actor de la agenda.
  //
  // Se utilizará, por ejemplo, cuando un enemigo sea
  // derrotado o deje de pertenecer al mapa actual.
  eliminarActor(actor) {
    return this.registros.delete(actor);
  }

  // Devuelve los registros ordenados cronológicamente.
  //
  // Se crea una copia para no alterar el Map original.
  obtenerRegistrosOrdenados() {
    return [...this.registros.values()].sort((registroA, registroB) => {
      if (registroA.proximoTurno !== registroB.proximoTurno) {
        return registroA.proximoTurno - registroB.proximoTurno;
      }

      return registroA.ordenRegistro - registroB.ordenRegistro;
    });
  }

  // Devuelve el siguiente actor sin modificar el tiempo.
  obtenerSiguienteActor() {
    const siguienteRegistro = this.obtenerRegistrosOrdenados()[0];

    return siguienteRegistro?.actor ?? null;
  }

  // Avanza el reloj hasta el momento del siguiente actor
  // y devuelve quién debe actuar.
  avanzarHastaSiguienteActor() {
    const siguienteRegistro = this.obtenerRegistrosOrdenados()[0];

    if (!siguienteRegistro) {
      return null;
    }

    this.tiempoActual = Math.max(
      this.tiempoActual,
      siguienteRegistro.proximoTurno,
    );

    return siguienteRegistro.actor;
  }

  // Registra el tiempo consumido por una acción.
  //
  // Después de actuar, el combatiente vuelve a quedar
  // programado para el futuro según el coste calculado.
  registrarAccion({ actor, tipoAccion, costoBase } = {}) {
    const registro = this.registros.get(actor);

    if (!registro) {
      throw new Error(
        `${actor?.nombre ?? "El actor"} no está registrado ` +
          "en el sistema de tiempo.",
      );
    }

    const costoFinal = calcularCostoAccionCombatiente({
      combatiente: actor,
      tipoAccion,
      costoBase,
    });

    // El actor comienza su acción en el mayor valor entre:
    //
    // - El momento actual.
    // - El momento en el que estaba programado.
    //
    // Normalmente ambos valores serán iguales.
    const inicioAccion = Math.max(this.tiempoActual, registro.proximoTurno);

    registro.proximoTurno = inicioAccion + costoFinal;

    return {
      actor,
      tipoAccion,
      costoBase,
      costoFinal,
      inicioAccion,
      proximoTurno: registro.proximoTurno,
    };
  }

  // Permite consultar el estado temporal de un actor
  // sin entregar el registro interno modificable.
  obtenerEstadoActor(actor) {
    const registro = this.registros.get(actor);

    if (!registro) {
      return null;
    }

    return {
      proximoTurno: registro.proximoTurno,
      ordenRegistro: registro.ordenRegistro,
    };
  }

  // Devuelve una vista simple del orden actual.
  //
  // Más adelante servirá como base para mostrar
  // la futura barra de próximos actores en pantalla.
  obtenerOrdenActual() {
    return this.obtenerRegistrosOrdenados().map((registro) => ({
      actor: registro.actor,
      proximoTurno: registro.proximoTurno,
      ordenRegistro: registro.ordenRegistro,
    }));
  }
}
