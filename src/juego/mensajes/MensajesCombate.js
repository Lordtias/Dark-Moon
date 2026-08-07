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
    ];
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
  ];

  if (golpe.critico === true) {
    mensajes.push(
      crearMensajeTraducible("mensajes.combate.golpeCritico", {
        tipo: tipoImpacto,
      }),
    );
  }

  if (golpe.bloqueado === true) {
    mensajes.push(
      crearMensajeTraducible("mensajes.combate.bloqueo", {
        tipo: ataqueDelJugador
          ? TIPOS_MENSAJE_JUEGO.ALERTA
          : TIPOS_MENSAJE_JUEGO.POSITIVO,
        parametros: {
          tirada: golpe.tiradaBloqueo ?? "—",
          probabilidad: formatearNumero(golpe.probabilidadBloqueo ?? 0),
          mitigacion: formatearNumero(golpe.mitigacionBloqueo ?? 0),
          danioMitigado: formatearNumero(golpe.danioMitigadoBloqueo ?? 0),
        },
      }),
    );
  }

  const componentes = (golpe.componentesDanio ?? []).filter(
    (componente) => Number(componente.danioBruto) > 0,
  );
  const esFisicoPuro = componentes.length === 1 && componentes[0].tipo === "fisico";

  if (esFisicoPuro && Number(golpe.armadura) > 0) {
    mensajes.push(
      crearMensajeTraducible("mensajes.combate.armadura", {
        tipo: TIPOS_MENSAJE_JUEGO.SISTEMA,
        parametros: {
          armadura: golpe.armadura,
          reduccion: formatearNumero((golpe.reduccionArmadura ?? 0) * 100),
        },
      }),
    );
  } else if (componentes.length > 0) {
    for (const componente of componentes) {
      mensajes.push(crearMensajeComponente(componente));
    }
  }

  return mensajes;
}

function crearMensajeComponente(componente) {
  let clave = "mensajes.combate.componenteDanio";
  const parametros = {
    final: formatearNumero(componente.danioFinal ?? 0),
    bruto: formatearNumero(componente.danioBruto ?? 0),
    tipo: crearParametroContenidoMensaje("tiposDanio", componente.tipo, {
      respaldo: componente.tipo ?? "daño",
    }),
  };
  if (componente.tipo === "fisico" && Number(componente.armadura) > 0) {
    clave = "mensajes.combate.componenteDanioArmadura";
    parametros.reduccion = formatearNumero((componente.reduccionArmadura ?? 0) * 100);
  } else if (Number(componente.resistencia) > 0) {
    clave = "mensajes.combate.componenteDanioResistencia";
    parametros.resistencia = formatearNumero(componente.resistencia);
  }
  return crearMensajeTraducible(clave, {
    tipo: TIPOS_MENSAJE_JUEGO.SISTEMA,
    parametros,
  });
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
