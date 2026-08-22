import {
  crearDestacadoMensajeTraducible,
  crearMensajeTraducible,
  crearParametroContenidoMensaje,
  crearParametroEntidadMensaje,
  TIPOS_MENSAJE_JUEGO,
} from "./MensajesJuego.js";

export function crearMensajeDetalleImpacto(
  resultado,
  { tipo = TIPOS_MENSAJE_JUEGO.SISTEMA } = {},
) {
  if (!resultado || typeof resultado !== "object") return null;
  const desglose = resultado.desgloseImpacto;
  if (!desglose || typeof desglose !== "object") return null;

  const impacto = resultado.impacto === true;
  const destacado = crearDestacadoMensajeTraducible(
    impacto ? "mensajes.calculos.impacto" : "mensajes.calculos.fallo",
    { respaldo: impacto ? "IMPACTO" : "FALLO" },
  );

  if (desglose.automatico === true) {
    return crearMensajeTraducible("mensajes.calculos.impactoAutomatico", {
      tipo,
      destacado,
      parametros: {
        probabilidad: numero(desglose.probabilidadFinal),
        tirada: resultado.tiradaImpacto ?? "—",
      },
      respaldo: `Probabilidad de impacto ${numero(desglose.probabilidadFinal)}%. Tirada ${resultado.tiradaImpacto ?? "—"}.`,
    });
  }

  const parametros = {
    factor: numero(desglose.factorFormula),
    precision: numero(desglose.precision),
    evasion: numero(desglose.evasion),
    nivelAtacante: numero(desglose.nivelAtacante),
    nivelObjetivo: numero(desglose.nivelObjetivo),
    probabilidadSinLimitar: numero(desglose.probabilidadSinLimitar),
    minima: numero(desglose.probabilidadMinima),
    maxima: numero(desglose.probabilidadMaxima),
    probabilidad: numero(desglose.probabilidadFinal),
    tirada: resultado.tiradaImpacto ?? "—",
  };

  return crearMensajeTraducible(
    impacto
      ? "mensajes.calculos.impactoFormulaExito"
      : "mensajes.calculos.impactoFormulaFallo",
    {
      tipo,
      destacado,
      parametros,
    },
  );
}

export function crearMensajesDetalleDanioAtaque({
  golpe,
  objetivo,
  fuente,
  tipo = TIPOS_MENSAJE_JUEGO.SISTEMA,
} = {}) {
  if (!golpe || golpe.impacto !== true) return [];

  const componentes = (golpe.componentesDanio ?? []).filter(
    (componente) => Number(componente.danioBruto) > 0,
  );
  if (componentes.length === 0) return [];

  const objetivoParametro = crearParametroEntidadMensaje(
    objetivo,
    objetivo?.nombre ?? "Objetivo",
  );
  const mensajes = [
    crearResumenDanio({
      danioFinal: golpe.danio ?? 0,
      danioCalculado: golpe.danioCalculado ?? golpe.danio ?? 0,
      fuente,
      objetivo: objetivoParametro,
      tipo,
    }),
  ];

  mensajes.push(crearMensajeDetalleCritico(golpe, { tipo }));
  const detalleBloqueo = crearMensajeDetalleBloqueo(golpe, { tipo });
  if (detalleBloqueo) mensajes.push(detalleBloqueo);

  for (const componente of componentes) {
    mensajes.push(crearMensajeDetalleComponenteAtaque(componente, golpe, { tipo }));
  }

  return mensajes.filter(Boolean);
}

export function crearMensajesDetalleDanioHabilidad({
  habilidad,
  objetivo,
  danio,
  tipo = TIPOS_MENSAJE_JUEGO.SISTEMA,
} = {}) {
  if (!danio || typeof danio !== "object") return [];

  const mensajes = [];
  const detalleImpacto = crearMensajeDetalleImpacto(danio, { tipo });
  if (danio.impacto !== true) {
    if (detalleImpacto) mensajes.push(detalleImpacto);
    return mensajes;
  }

  const fuente = crearParametroContenidoMensaje("habilidades", habilidad?.id, {
    respaldo: habilidad?.nombre ?? "Habilidad",
  });
  const objetivoParametro = crearParametroEntidadMensaje(
    objetivo,
    objetivo?.nombre ?? "Objetivo",
  );

  mensajes.push(
    crearResumenDanio({
      danioFinal: danio.danioFinal ?? danio.danio ?? 0,
      danioCalculado: danio.danioCalculado ?? danio.danio ?? 0,
      fuente,
      objetivo: objetivoParametro,
      tipo,
    }),
  );
  if (detalleImpacto) mensajes.push(detalleImpacto);

  mensajes.push(
    crearMensajeTraducible("mensajes.calculos.escaladoHabilidad", {
      tipo,
      parametros: {
        magico: numero(danio.multiplicadorDanioMagico ?? 1),
        habilidad: numero(danio.danoHabilidad ?? 0),
        multiplicadorHabilidad: numero(danio.multiplicadorDanioHabilidad ?? 1),
        critico: numero(danio.critico ? danio.multiplicadorCritico ?? 1 : 1),
      },
    }),
  );
  mensajes.push(crearMensajeDetalleCritico(danio, { tipo }));

  for (const componente of danio.componentesDanio ?? []) {
    mensajes.push(crearMensajeDetalleComponenteHabilidad(componente, danio, { tipo }));
  }

  return mensajes.filter(Boolean);
}

export function crearMensajeDetalleDanioPeriodico({
  efectoId,
  nombreEfecto,
  objetivo,
  componente,
  baseTick = null,
  escala = 1,
  danioFinal = 0,
  danioCalculado = 0,
  tipo = TIPOS_MENSAJE_JUEGO.NEGATIVO,
  destacar = true,
} = {}) {
  if (!componente || typeof componente !== "object") return null;
  const efecto = crearParametroContenidoMensaje("efectos", efectoId, {
    respaldo: nombreEfecto ?? "Efecto",
  });
  const objetivoParametro = crearParametroEntidadMensaje(
    objetivo,
    objetivo?.nombre ?? "Objetivo",
  );
  const tipoDanio = crearParametroContenidoMensaje("tiposDanio", componente.tipo, {
    respaldo: componente.tipo ?? "daño",
  });

  const esFisico = componente.tipo === "fisico";
  return crearMensajeTraducible(
    esFisico
      ? "mensajes.calculos.danioPeriodicoFisico"
      : "mensajes.calculos.danioPeriodico",
    {
      tipo,
      destacado: destacar
        ? crearDestacadoMensajeTraducible(
            "mensajes.calculos.danioFinal",
            {
              parametros: { danio: numero(danioFinal) },
              respaldo: `DAÑO FINAL: ${numero(danioFinal)}`,
            },
          )
        : null,
      parametros: {
        efecto,
        objetivo: objetivoParametro,
        tipo: tipoDanio,
        baseTick: numero(baseTick ?? componente.danioBruto ?? 0),
        bruto: numero(componente.danioBruto ?? 0),
        escala: numero(escala),
        armadura: numero(componente.armadura ?? 0),
        factorArmadura: numero(componente.factorArmadura ?? 0),
        reduccionArmadura: numero((componente.reduccionArmadura ?? 0) * 100),
        resistencia: numero(componente.resistencia ?? 0),
        antesRedondeo: numero(componente.danioAntesRedondeo ?? 0),
        componenteFinal: numero(componente.danioFinal ?? 0),
        calculado: numero(danioCalculado),
      },
    },
  );
}

function crearResumenDanio({
  danioFinal,
  danioCalculado,
  fuente,
  objetivo,
  tipo,
}) {
  return crearMensajeTraducible("mensajes.calculos.resumenDanio", {
    tipo,
    destacado: crearDestacadoMensajeTraducible("mensajes.calculos.danioFinal", {
      parametros: { danio: numero(danioFinal) },
      respaldo: `DAÑO FINAL: ${numero(danioFinal)}`,
    }),
    parametros: {
      fuente,
      objetivo,
      calculado: numero(danioCalculado),
      aplicado: numero(danioFinal),
    },
  });
}

function crearMensajeDetalleCritico(resultado, { tipo }) {
  const probabilidad = Number(resultado.probabilidadCritico ?? 0);
  const tirada = resultado.tiradaCritico;
  if (tirada === null || tirada === undefined) return null;
  const critico = resultado.critico === true;
  return crearMensajeTraducible(
    critico
      ? "mensajes.calculos.criticoExito"
      : "mensajes.calculos.criticoFallo",
    {
      tipo,
      parametros: {
        tirada,
        probabilidad: numero(probabilidad),
        multiplicador: numero(
          critico ? resultado.multiplicadorCritico ?? 1 : 1,
        ),
      },
    },
  );
}

function crearMensajeDetalleBloqueo(resultado, { tipo }) {
  const tirada = resultado.tiradaBloqueo;
  const probabilidad = Number(resultado.probabilidadBloqueo ?? 0);
  if ((tirada === null || tirada === undefined) && probabilidad <= 0) return null;
  const bloqueado = resultado.bloqueado === true;
  return crearMensajeTraducible(
    bloqueado
      ? "mensajes.calculos.bloqueoExito"
      : "mensajes.calculos.bloqueoFallo",
    {
      tipo,
      parametros: {
        tirada: tirada ?? "—",
        probabilidad: numero(probabilidad),
        mitigacion: numero(resultado.mitigacionBloqueo ?? 0),
        mitigado: numero(resultado.danioMitigadoBloqueo ?? 0),
        restante: numero(resultado.danioDespuesBloqueo ?? 0),
      },
    },
  );
}

function crearMensajeDetalleComponenteAtaque(componente, golpe, { tipo }) {
  const tipoDanio = crearParametroContenidoMensaje("tiposDanio", componente.tipo, {
    respaldo: componente.etiqueta ?? componente.tipo ?? "daño",
  });
  const parametros = parametrosBaseComponenteAtaque(componente, golpe, tipoDanio);
  const clave = componente.tipo === "fisico"
    ? "mensajes.calculos.componenteAtaqueFisico"
    : "mensajes.calculos.componenteAtaqueElemental";
  return crearMensajeTraducible(clave, { tipo, parametros });
}

function parametrosBaseComponenteAtaque(componente, golpe, tipoDanio) {
  return {
    tipo: tipoDanio,
    tiradaLocal: numero(componente.tiradaLocal ?? 0),
    minimo: numero(componente.minimoLocal ?? 0),
    maximo: numero(componente.maximoLocal ?? 0),
    multiplicadorAtributo: numero(componente.multiplicadorAtributo ?? 1),
    plano: numero(componente.danioPlanoGlobal ?? 0),
    multiplicadorGolpe: numero(componente.multiplicadorGolpe ?? 1),
    multiplicadorGlobal: numero(componente.multiplicadorGlobal ?? 1),
    brutoBase: numero(componente.danioBrutoBase ?? componente.danioBruto ?? 0),
    multiplicadorCritico: numero(
      golpe.critico === true && componente.aplicaCritico !== false
        ? golpe.multiplicadorCritico ?? 1
        : 1,
    ),
    bruto: numero(componente.danioBruto ?? 0),
    mitigacionBloqueo: numero(componente.mitigacionBloqueo ?? 0),
    despuesBloqueo: numero(componente.danioDespuesBloqueo ?? componente.danioBruto ?? 0),
    armadura: numero(componente.armadura ?? 0),
    factorArmadura: numero(componente.factorArmadura ?? 0),
    reduccionArmadura: numero((componente.reduccionArmadura ?? 0) * 100),
    resistencia: numero(componente.resistencia ?? 0),
    antesRedondeo: numero(componente.danioAntesRedondeo ?? 0),
    final: numero(componente.danioFinal ?? 0),
  };
}

function crearMensajeDetalleComponenteHabilidad(componente, danio, { tipo }) {
  const tipoDanio = crearParametroContenidoMensaje("tiposDanio", componente.tipo, {
    respaldo: componente.etiqueta ?? componente.tipo ?? "daño",
  });
  const parametros = {
    tipo: tipoDanio,
    base: numero(componente.valorBase ?? 0),
    magico: numero(componente.multiplicadorDanioMagico ?? 1),
    tipoDanio: numero(componente.multiplicadorDanioTipo ?? 1),
    multiplicadorHabilidad: numero(componente.multiplicadorDanioHabilidad ?? 1),
    multiplicadorCritico: numero(
      danio.critico === true ? danio.multiplicadorCritico ?? 1 : 1,
    ),
    bruto: numero(componente.danioBruto ?? 0),
    armadura: numero(componente.armadura ?? 0),
    factorArmadura: numero(componente.factorArmadura ?? 0),
    reduccionArmadura: numero((componente.reduccionArmadura ?? 0) * 100),
    resistencia: numero(componente.resistencia ?? 0),
    antesRedondeo: numero(componente.danioAntesRedondeo ?? 0),
    final: numero(componente.danioFinal ?? 0),
  };
  const clave = componente.tipo === "fisico"
    ? "mensajes.calculos.componenteHabilidadFisico"
    : "mensajes.calculos.componenteHabilidadElemental";
  return crearMensajeTraducible(clave, { tipo, parametros });
}

function numero(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return "0";
  const redondeado = Math.round(n * 1000) / 1000;
  return Number.isInteger(redondeado)
    ? String(redondeado)
    : String(redondeado);
}
