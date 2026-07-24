// Cantidad de unidades temporales utilizadas como referencia.
//
// Un coste o factor de 100 representa un segundo normal.
// Un valor menor representa una acción más rápida.
// Un valor mayor representa una acción más lenta.
export const TIEMPO_REFERENCIA = 100;

// Tipos de acciones que pueden consumir tiempo.
export const TIPOS_ACCION_TEMPORAL = Object.freeze({
  MOVIMIENTO: "movimiento",
  ATAQUE: "ataque",
  ACCION: "accion",
  CONSUMO: "consumo",
  ESPERA: "espera",
});

export const COSTOS_TEMPORALES_BASE = Object.freeze({
  movimiento: TIEMPO_REFERENCIA,
  accion: TIEMPO_REFERENCIA,
  consumo: TIEMPO_REFERENCIA,
  espera: TIEMPO_REFERENCIA,
});

export const FACTORES_TEMPORALES_PREDETERMINADOS = Object.freeze({
  factorTiempo: TIEMPO_REFERENCIA,
  factorMovimiento: TIEMPO_REFERENCIA,
  factorAtaque: TIEMPO_REFERENCIA,
  factorAccion: TIEMPO_REFERENCIA,
  factorConsumo: TIEMPO_REFERENCIA,
});

const FACTOR_ESPECIFICO_POR_ACCION = Object.freeze({
  [TIPOS_ACCION_TEMPORAL.MOVIMIENTO]: "factorMovimiento",
  [TIPOS_ACCION_TEMPORAL.ATAQUE]: "factorAtaque",
  [TIPOS_ACCION_TEMPORAL.ACCION]: "factorAccion",
  [TIPOS_ACCION_TEMPORAL.CONSUMO]: "factorConsumo",
  [TIPOS_ACCION_TEMPORAL.ESPERA]: null,
});

function validarValorTemporal(valor, nombreCampo) {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error(
      `El valor temporal "${nombreCampo}" debe ser un número mayor que 0.`,
    );
  }
}

export function obtenerFactoresTemporales(combatiente) {
  if (!combatiente || typeof combatiente !== "object") {
    throw new Error(
      "Se necesita un combatiente válido para obtener sus factores temporales.",
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

  return Math.max(1, Math.round(costoCalculado));
}

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

// Gestiona exclusivamente actores. Los ticks y vencimientos de efectos
// pertenecen a AgendaEventosTemporales y no se registran como combatientes.
export class SistemaTiempo {
  constructor({ obtenerDisponibilidadMinima = () => null } = {}) {
    if (typeof obtenerDisponibilidadMinima !== "function") {
      throw new Error(
        "La consulta de disponibilidad mínima debe ser una función.",
      );
    }

    this.tiempoActual = 0;
    this.registros = new Map();
    this.siguienteOrdenRegistro = 0;
    this.obtenerDisponibilidadMinima = obtenerDisponibilidadMinima;
  }

  establecerConsultaDisponibilidadMinima(funcion) {
    if (typeof funcion !== "function") {
      throw new Error(
        "La consulta de disponibilidad mínima debe ser una función.",
      );
    }
    this.obtenerDisponibilidadMinima = funcion;
  }

  obtenerProximoTurnoEfectivo(registro) {
    const disponibilidadMinima = this.obtenerDisponibilidadMinima(
      registro.actor,
    );

    if (disponibilidadMinima === null || disponibilidadMinima === undefined) {
      return registro.proximoTurno;
    }
    if (!Number.isFinite(disponibilidadMinima) || disponibilidadMinima < 0) {
      throw new Error(
        "La disponibilidad mínima de un actor debe ser un instante válido.",
      );
    }

    return Math.max(registro.proximoTurno, disponibilidadMinima);
  }

  registrarActor(actor, proximoTurno = this.tiempoActual) {
    if (!actor || typeof actor !== "object") {
      throw new Error(
        "SistemaTiempo necesita un actor válido para registrarlo.",
      );
    }
    if (this.registros.has(actor)) {
      throw new Error(
        `${actor.nombre ?? "El actor"} ya está registrado en el sistema de tiempo.`,
      );
    }
    if (!Number.isFinite(proximoTurno) || proximoTurno < this.tiempoActual) {
      throw new Error(
        "El próximo turno de un actor no puede ser anterior al tiempo actual.",
      );
    }

    this.registros.set(actor, {
      actor,
      proximoTurno,
      ordenRegistro: this.siguienteOrdenRegistro,
    });
    this.siguienteOrdenRegistro++;
  }

  tieneActor(actor) {
    return this.registros.has(actor);
  }

  eliminarActor(actor) {
    return this.registros.delete(actor);
  }

  avanzarTiempoHasta(instante) {
    if (!Number.isFinite(instante) || instante < this.tiempoActual) {
      throw new Error("El sistema de tiempo no puede retroceder.");
    }
    this.tiempoActual = instante;
    return this.tiempoActual;
  }

  obtenerRegistrosOrdenados() {
    return [...this.registros.values()]
      .map((registro) => ({
        ...registro,
        proximoTurnoBase: registro.proximoTurno,
        proximoTurno: this.obtenerProximoTurnoEfectivo(registro),
      }))
      .sort((registroA, registroB) => {
        if (registroA.proximoTurno !== registroB.proximoTurno) {
          return registroA.proximoTurno - registroB.proximoTurno;
        }
        return registroA.ordenRegistro - registroB.ordenRegistro;
      });
  }

  obtenerSiguienteActor() {
    return this.obtenerRegistrosOrdenados()[0]?.actor ?? null;
  }

  obtenerTiempoSiguienteActor() {
    return this.obtenerRegistrosOrdenados()[0]?.proximoTurno ?? null;
  }

  avanzarHastaSiguienteActor() {
    const siguienteRegistro = this.obtenerRegistrosOrdenados()[0];
    if (!siguienteRegistro) {
      return null;
    }
    this.avanzarTiempoHasta(siguienteRegistro.proximoTurno);
    return siguienteRegistro.actor;
  }

  registrarAccion({ actor, tipoAccion, costoBase } = {}) {
    const registro = this.registros.get(actor);
    if (!registro) {
      throw new Error(
        `${actor?.nombre ?? "El actor"} no está registrado en el sistema de tiempo.`,
      );
    }

    const costoFinal = calcularCostoAccionCombatiente({
      combatiente: actor,
      tipoAccion,
      costoBase,
    });
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

  // Permite que el coordinador saltee exactamente el período de aturdimiento
  // sin registrar una acción ficticia ni alterar los factores del actor.
  establecerProximoTurno(actor, instante) {
    const registro = this.registros.get(actor);
    if (!registro) {
      throw new Error(
        `${actor?.nombre ?? "El actor"} no está registrado en el sistema de tiempo.`,
      );
    }
    if (!Number.isFinite(instante) || instante < this.tiempoActual) {
      throw new Error(
        "La nueva disponibilidad de un actor no puede ser anterior al tiempo actual.",
      );
    }

    registro.proximoTurno = instante;
    return this.obtenerEstadoActor(actor);
  }

  obtenerEstadoActor(actor) {
    const registro = this.registros.get(actor);
    if (!registro) {
      return null;
    }
    return {
      proximoTurnoBase: registro.proximoTurno,
      proximoTurno: this.obtenerProximoTurnoEfectivo(registro),
      ordenRegistro: registro.ordenRegistro,
    };
  }

  obtenerOrdenActual() {
    return this.obtenerRegistrosOrdenados().map((registro) => ({
      actor: registro.actor,
      proximoTurno: registro.proximoTurno,
      ordenRegistro: registro.ordenRegistro,
    }));
  }
}
