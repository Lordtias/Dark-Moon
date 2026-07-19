// Cantidad de unidades temporales utilizadas como referencia.
//
// Un coste o factor de 100 representa el tiempo normal.
// Un valor menor representa una acción más rápida.
// Un valor mayor representa una acción más lenta.
export const TIEMPO_REFERENCIA = 100;

// Tipos de acciones que pueden consumir tiempo.
//
// Utilizamos constantes para evitar escribir textos
// diferentes en cada sistema.
export const TIPOS_ACCION_TEMPORAL = Object.freeze({
  MOVIMIENTO: "movimiento",
  ATAQUE: "ataque",
  ACCION: "accion",
  CONSUMO: "consumo",
  ESPERA: "espera",
});

// Costes predeterminados de las acciones que todavía
// no dependen de un arma, objeto o elemento concreto.
export const COSTOS_TEMPORALES_BASE = Object.freeze({
  movimiento: TIEMPO_REFERENCIA,
  accion: TIEMPO_REFERENCIA,
  consumo: TIEMPO_REFERENCIA,
  espera: TIEMPO_REFERENCIA,
});

// Factores temporales normales de cualquier combatiente.
export const FACTORES_TEMPORALES_PREDETERMINADOS = Object.freeze({
  factorTiempo: TIEMPO_REFERENCIA,
  factorMovimiento: TIEMPO_REFERENCIA,
  factorAtaque: TIEMPO_REFERENCIA,
  factorAccion: TIEMPO_REFERENCIA,
  factorConsumo: TIEMPO_REFERENCIA,
});

// Relaciona cada tipo de acción con el factor específico
// que debe utilizarse desde el combatiente.
const FACTOR_ESPECIFICO_POR_ACCION = Object.freeze({
  [TIPOS_ACCION_TEMPORAL.MOVIMIENTO]: "factorMovimiento",

  [TIPOS_ACCION_TEMPORAL.ATAQUE]: "factorAtaque",

  [TIPOS_ACCION_TEMPORAL.ACCION]: "factorAccion",

  [TIPOS_ACCION_TEMPORAL.CONSUMO]: "factorConsumo",

  // Esperar utiliza solamente el factor global.
  [TIPOS_ACCION_TEMPORAL.ESPERA]: null,
});

// Comprueba que un coste o factor temporal sea válido.
//
// Todos los valores deben ser positivos porque un coste
// igual o menor que cero rompería el orden temporal.
function validarValorTemporal(valor, nombreCampo) {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error(
      `El valor temporal "${nombreCampo}" debe ser ` + "un número mayor que 0.",
    );
  }
}

// Devuelve todos los factores temporales
// pertenecientes a un combatiente.
export function obtenerFactoresTemporales(combatiente) {
  if (!combatiente || typeof combatiente !== "object") {
    throw new Error(
      "Se necesita un combatiente válido para " +
        "obtener sus factores temporales.",
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
// × factor temporal global / 100
// × factor específico / 100
//
// El resultado se redondea porque la agenda
// trabaja únicamente con unidades enteras.
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

  // Nunca permitimos que una acción termine
  // costando cero unidades.
  return Math.max(1, Math.round(costoCalculado));
}

// Calcula el coste de una acción utilizando
// directamente los factores del combatiente.
export function calcularCostoAccionCombatiente({
  combatiente,
  tipoAccion,
  costoBase,
} = {}) {
  if (!Object.values(TIPOS_ACCION_TEMPORAL).includes(tipoAccion)) {
    throw new Error(
      `El tipo de acción temporal ` + `"${tipoAccion}" no es válido.`,
    );
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
// Cada actor posee:
//
// - proximoTurno: instante en el que podrá actuar.
// - ordenRegistro: desempate permanente y determinista.
export class SistemaTiempo {
  constructor() {
    // Momento alcanzado actualmente
    // por el reloj del mundo.
    this.tiempoActual = 0;

    // Relaciona cada actor con su información temporal.
    this.registros = new Map();

    // Contador utilizado para resolver empates
    // sin introducir azar.
    this.siguienteOrdenRegistro = 0;
  }

  // Registra un actor dentro de la agenda.
  //
  // Por defecto queda disponible en el tiempo actual.
  registrarActor(actor, proximoTurno = this.tiempoActual) {
    if (!actor || typeof actor !== "object") {
      throw new Error(
        "SistemaTiempo necesita un actor " + "válido para registrarlo.",
      );
    }

    if (this.registros.has(actor)) {
      throw new Error(
        `${actor.nombre ?? "El actor"} ya está ` +
          "registrado en el sistema de tiempo.",
      );
    }

    if (!Number.isFinite(proximoTurno) || proximoTurno < this.tiempoActual) {
      throw new Error(
        "El próximo turno de un actor no puede " +
          "ser anterior al tiempo actual.",
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
  eliminarActor(actor) {
    return this.registros.delete(actor);
  }

  // Avanza el reloj hasta un instante concreto.
  //
  // Este método también será utilizado por eventos
  // periódicos, como regeneración y estados futuros.
  avanzarTiempoHasta(instante) {
    if (!Number.isFinite(instante) || instante < this.tiempoActual) {
      throw new Error("El sistema de tiempo no puede " + "retroceder.");
    }

    this.tiempoActual = instante;

    return this.tiempoActual;
  }

  // Devuelve una copia de los registros
  // ordenados cronológicamente.
  obtenerRegistrosOrdenados() {
    return [...this.registros.values()].sort((registroA, registroB) => {
      if (registroA.proximoTurno !== registroB.proximoTurno) {
        return registroA.proximoTurno - registroB.proximoTurno;
      }

      return registroA.ordenRegistro - registroB.ordenRegistro;
    });
  }

  // Devuelve el siguiente actor
  // sin modificar el reloj.
  obtenerSiguienteActor() {
    const siguienteRegistro = this.obtenerRegistrosOrdenados()[0];

    return siguienteRegistro?.actor ?? null;
  }

  // Devuelve el instante correspondiente
  // al siguiente actor.
  obtenerTiempoSiguienteActor() {
    const siguienteRegistro = this.obtenerRegistrosOrdenados()[0];

    return siguienteRegistro?.proximoTurno ?? null;
  }

  // Avanza el reloj hasta el siguiente actor
  // y devuelve quién debe actuar.
  avanzarHastaSiguienteActor() {
    const siguienteRegistro = this.obtenerRegistrosOrdenados()[0];

    if (!siguienteRegistro) {
      return null;
    }

    this.avanzarTiempoHasta(siguienteRegistro.proximoTurno);

    return siguienteRegistro.actor;
  }

  // Registra el tiempo consumido por una acción.
  registrarAccion({ actor, tipoAccion, costoBase } = {}) {
    const registro = this.registros.get(actor);

    if (!registro) {
      throw new Error(
        `${actor?.nombre ?? "El actor"} no está ` +
          "registrado en el sistema de tiempo.",
      );
    }

    const costoFinal = calcularCostoAccionCombatiente({
      combatiente: actor,
      tipoAccion,
      costoBase,
    });

    // Normalmente el tiempo actual y el próximo
    // turno del actor serán iguales.
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

  // Devuelve una copia del estado temporal
  // correspondiente a un actor.
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

  // Devuelve el orden actual de la agenda.
  //
  // Más adelante esta información será utilizada
  // por la barra visual de próximos actores.
  obtenerOrdenActual() {
    return this.obtenerRegistrosOrdenados().map((registro) => ({
      actor: registro.actor,

      proximoTurno: registro.proximoTurno,

      ordenRegistro: registro.ordenRegistro,
    }));
  }
}
