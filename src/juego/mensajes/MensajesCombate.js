import {
  crearMensajeDetalleImpacto,
  crearMensajesDetalleDanioAtaque,
} from "./MensajesCalculoCombate.js";
import {
  crearMensajeTraducible,
  crearParametroContenidoMensaje,
  crearParametroEntidadMensaje,
  crearParametroTraduccionMensaje,
  TIPOS_MENSAJE_JUEGO,
} from "./MensajesJuego.js";

export function crearMensajesResultadoAtaque({
  atacante,
  objetivo,
  resultado,
  ataqueDelJugador = true,
} = {}) {
  if (!resultado || typeof resultado !== "object") return [];

  if (resultado.ataqueNoDisponible === true) {
    const semantico = resultado.requisitos?.mensajePresentacion ??
      crearMensajeNoDisponible({ atacante, objetivo, resultado });
    return semantico ? [semantico] : [];
  }

  const tipoImpacto = ataqueDelJugador
    ? TIPOS_MENSAJE_JUEGO.POSITIVO
    : TIPOS_MENSAJE_JUEGO.NEGATIVO;
  const tipoFallo = ataqueDelJugador
    ? TIPOS_MENSAJE_JUEGO.NEGATIVO
    : TIPOS_MENSAJE_JUEGO.POSITIVO;
  const mensajes = [
    crearMensajeTraducible(
      resultado.esAtaqueDual
        ? "mensajes.combate.ataqueDual"
        : "mensajes.combate.ataqueSimple",
      {
        tipo: ataqueDelJugador
          ? TIPOS_MENSAJE_JUEGO.SISTEMA
          : TIPOS_MENSAJE_JUEGO.ALERTA,
        parametros: {
          atacante: crearParametroEntidadMensaje(atacante),
          objetivo: crearParametroEntidadMensaje(objetivo),
        },
      },
    ),
  ];

  const golpes = Array.isArray(resultado.golpes) ? resultado.golpes : [];
  for (const golpe of golpes) {
    mensajes.push(
      ...crearMensajesGolpe({
        golpe,
        esDual: resultado.esAtaqueDual === true,
        tipoImpacto,
        tipoFallo,
        ataqueDelJugador,
        objetivo,
      }),
    );
  }

  if (resultado.esAtaqueDual === true) {
    mensajes.push(
      crearMensajeTraducible("mensajes.combate.danioTotal", {
        tipo: tipoImpacto,
        parametros: { danio: resultado.danio ?? 0 },
      }),
    );
  }

  if (
    Number.isInteger(resultado.golpesProgramados) &&
    Number.isInteger(resultado.golpesRealizados) &&
    resultado.golpesRealizados < resultado.golpesProgramados
  ) {
    mensajes.push(
      crearMensajeTraducible("mensajes.combate.segundoGolpeOmitido", {
        tipo: TIPOS_MENSAJE_JUEGO.SISTEMA,
      }),
    );
  }

  if (resultado.municionUtilizada && Number.isFinite(resultado.municionRestante)) {
    mensajes.push(
      crearMensajeTraducible("mensajes.combate.municionRestante", {
        tipo: TIPOS_MENSAJE_JUEGO.SISTEMA,
        parametros: { cantidad: resultado.municionRestante },
      }),
    );
  }

  return mensajes;
}

export function crearMensajesAtaqueCasillaVacia({ resultado } = {}) {
  if (!resultado || typeof resultado !== "object") return [];
  if (resultado.ataqueNoDisponible === true) {
    const semantico = resultado.requisitos?.mensajePresentacion ??
      (resultado.motivoNoDisponible === "atacante_derrotado"
        ? crearMensajeTraducible("mensajes.combate.atacanteDerrotado", {
            tipo: TIPOS_MENSAJE_JUEGO.NEGATIVO,
          })
        : null);
    return semantico ? [semantico] : [];
  }
  const mensajes = [
    crearMensajeTraducible(
      resultado.esAtaqueDual
        ? "mensajes.combate.casillaVaciaDual"
        : "mensajes.combate.casillaVacia",
      { tipo: TIPOS_MENSAJE_JUEGO.SISTEMA },
    ),
  ];
  if (resultado.municionUtilizada && Number.isFinite(resultado.municionRestante)) {
    mensajes.push(
      crearMensajeTraducible("mensajes.combate.municionRestante", {
        parametros: { cantidad: resultado.municionRestante },
      }),
    );
  }
  return mensajes;
}

function crearMensajeNoDisponible({ atacante, objetivo, resultado }) {
  if (resultado?.motivoNoDisponible === "atacante_derrotado") {
    return crearMensajeTraducible("mensajes.combate.atacanteDerrotado", {
      tipo: TIPOS_MENSAJE_JUEGO.NEGATIVO,
      parametros: { atacante: crearParametroEntidadMensaje(atacante) },
    });
  }
  if (resultado?.motivoNoDisponible === "objetivo_destruido") {
    return crearMensajeTraducible("mensajes.combate.objetivoYaDestruido", {
      tipo: TIPOS_MENSAJE_JUEGO.ALERTA,
      parametros: { objetivo: crearParametroEntidadMensaje(objetivo) },
    });
  }
  return null;
}

function crearMensajesGolpe({
  golpe,
  esDual,
  tipoImpacto,
  tipoFallo,
  ataqueDelJugador,
  objetivo,
}) {
  const fuente = parametroFuente(golpe);
  const parametrosBase = {
    fuente,
    tirada: golpe.tiradaImpacto ?? "—",
    probabilidad: formatearNumero(golpe.probabilidadImpacto ?? 0),
  };
  if (esDual) parametrosBase.mano = parametroMano(golpe.mano);

  if (golpe.impacto !== true) {
    return [
      crearMensajeTraducible(
        esDual ? "mensajes.combate.golpeFalloDual" : "mensajes.combate.golpeFallo",
        { tipo: tipoFallo, parametros: parametrosBase },
      ),
      crearMensajeDetalleImpacto(golpe, { tipo: tipoFallo }),
    ].filter(Boolean);
  }

  const mensajes = [
    crearMensajeTraducible(
      esDual ? "mensajes.combate.golpeImpactoDual" : "mensajes.combate.golpeImpacto",
      {
        tipo: tipoImpacto,
        parametros: {
          ...parametrosBase,
          danio: golpe.danio ?? 0,
          bruto: formatearNumero(golpe.danioBruto ?? 0),
        },
      },
    ),
    ...crearMensajesDetalleDanioAtaque({
      golpe,
      objetivo,
      fuente,
      tipo: ataqueDelJugador
        ? TIPOS_MENSAJE_JUEGO.POSITIVO
        : TIPOS_MENSAJE_JUEGO.NEGATIVO,
    }),
    crearMensajeDetalleImpacto(golpe, { tipo: tipoImpacto }),
  ];

  return mensajes.filter(Boolean);
}

function parametroFuente(golpe) {
  if (typeof golpe.idFuente === "string" && golpe.idFuente) {
    return crearParametroContenidoMensaje("objetos", golpe.idFuente, {
      respaldo: golpe.nombreFuente ?? "",
    });
  }
  return crearParametroTraduccionMensaje("mensajes.combate.ataqueNatural", {
    respaldo: golpe.nombreFuente ?? "Ataque natural",
  });
}

function parametroMano(mano) {
  const clave = mano === "secundaria"
    ? "mensajes.combate.manoSecundaria"
    : "mensajes.combate.manoPrincipal";
  return crearParametroTraduccionMensaje(clave, {
    respaldo: mano === "secundaria" ? "Mano secundaria" : "Mano principal",
  });
}

function formatearNumero(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return "0";
  return Number.isInteger(numero) ? String(numero) : numero.toFixed(1);
}
