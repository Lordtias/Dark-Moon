import { crearResultadoAccion } from "../acciones/ResultadoAccion.js";

import {
  CONFIGURACION_CURACION,
  TIPOS_SERVICIO_CURACION,
} from "./ConfiguracionCuracion.js";

const TIPOS_SERVICIO_VALIDOS = new Set(Object.values(TIPOS_SERVICIO_CURACION));

// Calcula el estado completo de los servicios
// sin modificar al jugador.
//
// La interfaz utiliza este resumen para mostrar:
//
// - Recursos actuales y máximos.
// - Cantidad faltante.
// - Precio actualizado.
// - Disponibilidad y capacidad de pago.
export function calcularEstadoCuracion({
  jugador,
  configuracion = CONFIGURACION_CURACION,
} = {}) {
  validarJugador(jugador);
  validarConfiguracion(configuracion);

  const vida = calcularServicioIndividual({
    tipoServicio: TIPOS_SERVICIO_CURACION.VIDA,
    actual: jugador.vidaActual,
    maximo: jugador.vidaMaxima,
    oro: jugador.oro,
    configuracion: configuracion.vida,
  });

  const mana = calcularServicioIndividual({
    tipoServicio: TIPOS_SERVICIO_CURACION.MANA,
    actual: jugador.manaActual,
    maximo: jugador.manaMaximo,
    oro: jugador.oro,
    configuracion: configuracion.mana,
  });

  const precioAmbos = vida.precio + mana.precio;
  const necesitaRecuperacionAmbos =
    vida.necesitaRecuperacion || mana.necesitaRecuperacion;

  const ambos = {
    tipoServicio: TIPOS_SERVICIO_CURACION.AMBOS,
    vidaFaltante: vida.faltante,
    manaFaltante: mana.faltante,
    precio: precioAmbos,
    necesitaRecuperacion: necesitaRecuperacionAmbos,
    puedePagar: necesitaRecuperacionAmbos && jugador.puedePagar(precioAmbos),
  };

  return {
    oro: jugador.oro,
    vida,
    mana,
    ambos,
  };
}

// Ejecuta una curación de Vida, Maná o ambos recursos.
//
// La operación vuelve a calcular el precio al confirmar,
// valida el saldo y recién entonces descuenta el oro.
//
// Si una recuperación falla o queda incompleta, restaura
// Vida, Maná y oro al estado previo a la transacción.
export function curarJugador({
  jugador,
  tipoServicio,
  configuracion = CONFIGURACION_CURACION,
} = {}) {
  validarJugador(jugador);
  validarTipoServicio(tipoServicio);
  validarConfiguracion(configuracion);

  if (jugador.estaVivo === false) {
    return crearResultadoAccion({
      exito: false,
      mensaje: "La curandera no puede devolver la vida a quien ya cayó.",
    });
  }

  const estado = calcularEstadoCuracion({
    jugador,
    configuracion,
  });

  const servicio = obtenerServicio(estado, tipoServicio);

  if (!servicio.necesitaRecuperacion) {
    return crearResultadoAccion({
      exito: false,
      mensaje: crearMensajeRecursoCompleto(tipoServicio),
    });
  }

  if (!servicio.puedePagar) {
    return crearResultadoAccion({
      exito: false,
      mensaje:
        `Necesitás ${crearTextoMonedas(servicio.precio)} ` +
        `y tenés ${crearTextoMonedas(jugador.oro)}.`,
      tipoServicio,
      precio: servicio.precio,
      oroActual: jugador.oro,
    });
  }

  // Se conserva una fotografía completa de los recursos
  // y del estado económico antes de iniciar la operación.
  const estadoAnterior = {
    vidaActual: jugador.vidaActual,
    manaActual: jugador.manaActual,
    oro: jugador.oro,
  };

  const resultadoPago = jugador.gastarOro(servicio.precio);

  if (!resultadoPago.exito) {
    return crearResultadoAccion({
      exito: false,
      mensaje: resultadoPago.mensaje,
      tipoServicio,
      precio: servicio.precio,
      oroActual: jugador.oro,
    });
  }

  let vidaRecuperada = 0;
  let manaRecuperado = 0;

  try {
    if (
      tipoServicio === TIPOS_SERVICIO_CURACION.VIDA ||
      tipoServicio === TIPOS_SERVICIO_CURACION.AMBOS
    ) {
      vidaRecuperada = jugador.recuperarVida(estado.vida.faltante);
    }

    if (
      tipoServicio === TIPOS_SERVICIO_CURACION.MANA ||
      tipoServicio === TIPOS_SERVICIO_CURACION.AMBOS
    ) {
      manaRecuperado = jugador.recuperarMana(estado.mana.faltante);
    }

    // Cada recurso incluido y necesitado por el servicio debe
    // recuperarse completamente.
    //
    // Una recuperación parcial también se considera un fallo
    // y provoca el rollback de toda la operación.
    validarRecuperacionCompleta({
      jugador,
      tipoServicio,
      estado,
      vidaRecuperada,
      manaRecuperado,
    });
  } catch (errorCuracion) {
    try {
      restaurarEstadoJugador({
        jugador,
        estadoAnterior,
      });
    } catch (errorRollback) {
      throw new Error(
        "La curación falló y no fue posible restaurar completamente " +
          `el estado anterior. Error original: ${obtenerMensajeError(
            errorCuracion,
          )}. Error de restauración: ${obtenerMensajeError(errorRollback)}.`,
      );
    }

    throw errorCuracion;
  }

  return crearResultadoAccion({
    exito: true,
    redibujar: true,
    mensaje: crearMensajeCuracion({
      vidaRecuperada,
      manaRecuperado,
      precio: servicio.precio,
    }),
    tipoServicio,
    precio: servicio.precio,
    oroGastado: servicio.precio,
    oroActual: jugador.oro,
    vidaRecuperada,
    manaRecuperado,
  });
}

function calcularServicioIndividual({
  tipoServicio,
  actual,
  maximo,
  oro,
  configuracion,
}) {
  const faltante = Math.max(0, maximo - actual);
  const necesitaRecuperacion = faltante > 0;

  const precio = necesitaRecuperacion
    ? Math.max(
        configuracion.precioMinimo,
        Math.ceil(faltante / configuracion.puntosPorMoneda),
      )
    : 0;

  return {
    tipoServicio,
    actual,
    maximo,
    faltante,
    precio,
    necesitaRecuperacion,
    puedePagar: necesitaRecuperacion && oro >= precio,
  };
}

function obtenerServicio(estado, tipoServicio) {
  switch (tipoServicio) {
    case TIPOS_SERVICIO_CURACION.VIDA:
      return estado.vida;

    case TIPOS_SERVICIO_CURACION.MANA:
      return estado.mana;

    case TIPOS_SERVICIO_CURACION.AMBOS:
      return estado.ambos;

    default:
      throw new Error(`El servicio de curación "${tipoServicio}" no existe.`);
  }
}

// Verifica individualmente cada recurso solicitado.
//
// Un recurso que ya estaba completo antes del servicio no necesita
// recuperarse y, por lo tanto, no se considera un fallo.
function validarRecuperacionCompleta({
  jugador,
  tipoServicio,
  estado,
  vidaRecuperada,
  manaRecuperado,
}) {
  const incluyeVida =
    tipoServicio === TIPOS_SERVICIO_CURACION.VIDA ||
    tipoServicio === TIPOS_SERVICIO_CURACION.AMBOS;

  const incluyeMana =
    tipoServicio === TIPOS_SERVICIO_CURACION.MANA ||
    tipoServicio === TIPOS_SERVICIO_CURACION.AMBOS;

  if (incluyeVida && estado.vida.faltante > 0) {
    validarRecuperacionRecurso({
      nombreRecurso: "Vida",
      cantidadEsperada: estado.vida.faltante,
      cantidadRecuperada: vidaRecuperada,
      valorActual: jugador.vidaActual,
      valorMaximo: jugador.vidaMaxima,
    });
  }

  if (incluyeMana && estado.mana.faltante > 0) {
    validarRecuperacionRecurso({
      nombreRecurso: "Maná",
      cantidadEsperada: estado.mana.faltante,
      cantidadRecuperada: manaRecuperado,
      valorActual: jugador.manaActual,
      valorMaximo: jugador.manaMaximo,
    });
  }
}

function validarRecuperacionRecurso({
  nombreRecurso,
  cantidadEsperada,
  cantidadRecuperada,
  valorActual,
  valorMaximo,
}) {
  const cantidadValida =
    Number.isFinite(cantidadRecuperada) && cantidadRecuperada > 0;

  const recursoCompleto = valorActual === valorMaximo;

  if (!cantidadValida || !recursoCompleto) {
    throw new Error(
      `La curación de ${nombreRecurso} quedó incompleta. ` +
        `Se esperaba recuperar ${cantidadEsperada} y se recuperaron ` +
        `${cantidadRecuperada}.`,
    );
  }
}

// Restaura cada valor de forma independiente para intentar
// recuperar la mayor cantidad posible del estado anterior.
//
// Al final se verifica que Vida, Maná y oro coincidan exactamente
// con la fotografía tomada antes de cobrar el servicio.
function restaurarEstadoJugador({ jugador, estadoAnterior }) {
  const errores = [];

  try {
    jugador.vidaActual = estadoAnterior.vidaActual;
  } catch (error) {
    errores.push(`Vida: ${obtenerMensajeError(error)}`);
  }

  try {
    jugador.manaActual = estadoAnterior.manaActual;
  } catch (error) {
    errores.push(`Maná: ${obtenerMensajeError(error)}`);
  }

  try {
    restaurarOroJugador({
      jugador,
      oroAnterior: estadoAnterior.oro,
    });
  } catch (error) {
    errores.push(`Oro: ${obtenerMensajeError(error)}`);
  }

  if (
    jugador.vidaActual !== estadoAnterior.vidaActual ||
    jugador.manaActual !== estadoAnterior.manaActual ||
    jugador.oro !== estadoAnterior.oro
  ) {
    errores.push(
      "Los valores restaurados no coinciden con el estado anterior.",
    );
  }

  if (errores.length > 0) {
    throw new Error(errores.join(" "));
  }
}

// Devuelve el oro mediante la operación pública del jugador.
//
// Si esa operación falla o no deja el saldo correcto, intenta como
// último recurso restaurar directamente el valor anterior.
function restaurarOroJugador({ jugador, oroAnterior }) {
  const oroFaltante = oroAnterior - jugador.oro;

  if (oroFaltante < 0) {
    throw new Error(
      "El oro actual supera al estado anterior y no puede restaurarse " +
        "mediante una devolución.",
    );
  }

  if (oroFaltante > 0) {
    try {
      jugador.agregarOro(oroFaltante);
    } catch (errorAgregarOro) {
      try {
        jugador.oro = oroAnterior;
      } catch (errorAsignacion) {
        throw new Error(
          `Falló agregarOro: ${obtenerMensajeError(errorAgregarOro)}. ` +
            `También falló la asignación directa: ${obtenerMensajeError(
              errorAsignacion,
            )}.`,
        );
      }
    }
  }

  // agregarOro podría no lanzar una excepción pero tampoco
  // completar correctamente la devolución.
  if (jugador.oro !== oroAnterior) {
    try {
      jugador.oro = oroAnterior;
    } catch (errorAsignacion) {
      throw new Error(
        `El oro quedó en ${jugador.oro} y la asignación directa falló: ` +
          obtenerMensajeError(errorAsignacion),
      );
    }
  }

  if (jugador.oro !== oroAnterior) {
    throw new Error(
      `El oro quedó en ${jugador.oro} y debía restaurarse a ` +
        `${oroAnterior}.`,
    );
  }
}

function obtenerMensajeError(error) {
  return error instanceof Error ? error.message : String(error);
}

function crearMensajeRecursoCompleto(tipoServicio) {
  switch (tipoServicio) {
    case TIPOS_SERVICIO_CURACION.VIDA:
      return "Tu Vida ya está completa.";

    case TIPOS_SERVICIO_CURACION.MANA:
      return "Tu Maná ya está completo.";

    case TIPOS_SERVICIO_CURACION.AMBOS:
      return "Tu Vida y tu Maná ya están completos.";

    default:
      return "No necesitás recuperación.";
  }
}

function crearMensajeCuracion({ vidaRecuperada, manaRecuperado, precio }) {
  const recuperaciones = [];

  if (vidaRecuperada > 0) {
    recuperaciones.push(`${vidaRecuperada} de Vida`);
  }

  if (manaRecuperado > 0) {
    recuperaciones.push(`${manaRecuperado} de Maná`);
  }

  const detalle = unirRecuperaciones(recuperaciones);

  return (
    `La curandera restauró ${detalle} ` + `por ${crearTextoMonedas(precio)}.`
  );
}

function unirRecuperaciones(recuperaciones) {
  if (recuperaciones.length === 1) {
    return recuperaciones[0];
  }

  return `${recuperaciones[0]} y ${recuperaciones[1]}`;
}

function crearTextoMonedas(cantidad) {
  return cantidad === 1 ? "1 moneda" : `${cantidad} monedas`;
}

function validarTipoServicio(tipoServicio) {
  if (!TIPOS_SERVICIO_VALIDOS.has(tipoServicio)) {
    throw new Error(`El servicio de curación "${tipoServicio}" no es válido.`);
  }
}

function validarJugador(jugador) {
  const recursosValidos =
    jugador &&
    Number.isFinite(jugador.vidaActual) &&
    Number.isFinite(jugador.vidaMaxima) &&
    Number.isFinite(jugador.manaActual) &&
    Number.isFinite(jugador.manaMaximo);

  const operacionesValidas =
    typeof jugador?.puedePagar === "function" &&
    typeof jugador?.gastarOro === "function" &&
    typeof jugador?.agregarOro === "function" &&
    typeof jugador?.recuperarVida === "function" &&
    typeof jugador?.recuperarMana === "function";

  if (
    !recursosValidos ||
    !Number.isSafeInteger(jugador.oro) ||
    jugador.oro < 0 ||
    !operacionesValidas
  ) {
    throw new Error(
      "El sistema de curación necesita un jugador con recursos y oro válidos.",
    );
  }

  if (
    jugador.vidaMaxima < 0 ||
    jugador.manaMaximo < 0 ||
    jugador.vidaActual < 0 ||
    jugador.manaActual < 0
  ) {
    throw new Error("Los recursos del jugador no pueden ser negativos.");
  }

  // Además de evitar números negativos, el sistema rechaza estados
  // incoherentes donde el recurso actual supera su máximo.
  if (
    jugador.vidaActual > jugador.vidaMaxima ||
    jugador.manaActual > jugador.manaMaximo
  ) {
    throw new Error(
      "Los recursos actuales del jugador no pueden superar " +
        "sus valores máximos.",
    );
  }
}

function validarConfiguracion(configuracion) {
  validarConfiguracionRecurso(configuracion?.vida, "Vida");
  validarConfiguracionRecurso(configuracion?.mana, "Maná");
}

function validarConfiguracionRecurso(configuracion, nombreRecurso) {
  if (
    !configuracion ||
    !Number.isFinite(configuracion.puntosPorMoneda) ||
    configuracion.puntosPorMoneda <= 0 ||
    !Number.isSafeInteger(configuracion.precioMinimo) ||
    configuracion.precioMinimo <= 0
  ) {
    throw new Error(
      `La configuración de curación de ${nombreRecurso} no es válida.`,
    );
  }
}
