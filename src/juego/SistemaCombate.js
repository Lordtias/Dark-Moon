import { Destructible } from "../entidad/destructible/Destructible.js";

import { CONFIGURACION_COMBATE } from "../config/ConfiguracionCombate.js";

import {
  verificarRequisitosAtaque,
  consumirMunicionAtaque,
} from "../entidad/destructible/combatiente/ConfiguracionAtaque.js";

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

function tirarRango(minimo, maximo) {
  const minimoEntero = Math.ceil(minimo);

  const maximoEntero = Math.floor(maximo);

  if (maximoEntero <= minimoEntero) {
    return minimoEntero;
  }

  return (
    Math.floor(Math.random() * (maximoEntero - minimoEntero + 1)) + minimoEntero
  );
}

function tirarPorcentaje(probabilidad) {
  const tirada = Math.floor(Math.random() * 100) + 1;

  return {
    tirada,

    exito: tirada <= probabilidad,
  };
}

function formatearNumero(valor) {
  return Number.isInteger(valor) ? `${valor}` : valor.toFixed(1);
}

function obtenerEstadisticasCombatiente(objetivo) {
  if (!objetivo || !("estadisticasDerivadas" in objetivo)) {
    return null;
  }

  return objetivo.estadisticasDerivadas;
}

export function calcularProbabilidadImpacto(atacante, objetivo) {
  const estadisticasAtacante = atacante.estadisticasDerivadas;

  const estadisticasObjetivo = obtenerEstadisticasCombatiente(objetivo);

  // Los destructibles inmóviles
  // no pueden evadir.
  if (estadisticasObjetivo === null) {
    return 100;
  }

  const precision = Math.max(1, estadisticasAtacante.precision);

  const evasion = Math.max(0, estadisticasObjetivo.evasion);

  const nivelAtacante = Math.max(1, atacante.nivel);

  const nivelObjetivo = Math.max(1, objetivo.nivel);

  const configuracion = CONFIGURACION_COMBATE.impacto;

  const probabilidad =
    configuracion.factorFormula *
    (precision / (precision + evasion)) *
    (nivelAtacante / (nivelAtacante + nivelObjetivo));

  return limitar(
    probabilidad,

    configuracion.probabilidadMinima,

    configuracion.probabilidadMaxima,
  );
}

export function calcularReduccionArmadura(armadura, danioFisicoEntrante) {
  if (armadura <= 0 || danioFisicoEntrante <= 0) {
    return 0;
  }

  const factor = CONFIGURACION_COMBATE.armadura.factorDanio;

  return armadura / (armadura + factor * danioFisicoEntrante);
}

// Cada arma activa realiza su propia tirada
// de daño y utiliza su propio atributo.
//
// El sistema de dos armas se modificará
// en la siguiente etapa.
function calcularDanioFisicoBruto(atacante) {
  const estadisticas = atacante.estadisticasDerivadas;

  const configuracionDanio = estadisticas.danioFisico;

  let danioFuentes = 0;

  for (const componente of configuracionDanio.componentes) {
    const tirada = tirarRango(
      componente.minimoLocal,

      componente.maximoLocal,
    );

    danioFuentes += tirada * componente.multiplicadorAtributo;
  }

  const tiradaGlobal = tirarRango(
    configuracionDanio.danioPlanoGlobal.minimo,

    configuracionDanio.danioPlanoGlobal.maximo,
  );

  let danioBruto =
    (danioFuentes + tiradaGlobal) * configuracionDanio.multiplicadorGlobal;

  const tiradaCritico = tirarPorcentaje(estadisticas.probabilidadCritico);

  if (tiradaCritico.exito) {
    danioBruto *= estadisticas.multiplicadorCritico;
  }

  return {
    critico: tiradaCritico.exito,

    tiradaCritico: tiradaCritico.tirada,

    danioBruto: Math.max(0, danioBruto),
  };
}

// Procesa la primera capa defensiva:
//
// escudo físico.
//
// Un bloqueo exitoso ya no anula
// automáticamente todo el ataque.
function resolverBloqueoParcial({ estadisticasObjetivo, danioEntrante } = {}) {
  if (estadisticasObjetivo === null || danioEntrante <= 0) {
    return crearResultadoSinBloqueo(danioEntrante);
  }

  const probabilidadBloqueo = estadisticasObjetivo.probabilidadBloqueo ?? 0;

  const mitigacionBloqueo = estadisticasObjetivo.mitigacionBloqueo ?? 0;

  // Una probabilidad sin mitigación no genera
  // un bloqueo real. Esto permite que bonos
  // base mejoren un escudo equipado, pero no
  // bloqueen por sí solos.
  if (probabilidadBloqueo <= 0 || mitigacionBloqueo <= 0) {
    return crearResultadoSinBloqueo(danioEntrante);
  }

  const tiradaBloqueo = tirarPorcentaje(probabilidadBloqueo);

  if (!tiradaBloqueo.exito) {
    return {
      ...crearResultadoSinBloqueo(danioEntrante),

      probabilidadBloqueo,
      mitigacionBloqueo,

      tiradaBloqueo: tiradaBloqueo.tirada,
    };
  }

  const proporcionMitigada = mitigacionBloqueo / 100;

  const danioMitigado = danioEntrante * proporcionMitigada;

  const danioRestante = Math.max(
    0,

    danioEntrante - danioMitigado,
  );

  return {
    bloqueado: true,

    probabilidadBloqueo,
    mitigacionBloqueo,

    tiradaBloqueo: tiradaBloqueo.tirada,

    proporcionMitigada,
    danioMitigado,
    danioRestante,
  };
}

function crearResultadoSinBloqueo(danioEntrante) {
  return {
    bloqueado: false,

    probabilidadBloqueo: 0,
    mitigacionBloqueo: 0,

    tiradaBloqueo: null,

    proporcionMitigada: 0,
    danioMitigado: 0,

    danioRestante: Math.max(0, danioEntrante),
  };
}

function crearTextoMunicion(resultadoMunicion) {
  if (!resultadoMunicion.consumida) {
    return "";
  }

  return " Munición restante: " + `${resultadoMunicion.restante}.`;
}

function crearTextoBloqueo(resultadoBloqueo) {
  if (!resultadoBloqueo.bloqueado) {
    return "";
  }

  return (
    " Bloqueo: " +
    `${resultadoBloqueo.tiradaBloqueo} / ` +
    `${formatearNumero(resultadoBloqueo.probabilidadBloqueo)}%. ` +
    "Mitigación del escudo: " +
    `${formatearNumero(resultadoBloqueo.mitigacionBloqueo)}% ` +
    `(-${formatearNumero(resultadoBloqueo.danioMitigado)}).`
  );
}

// Se utiliza cuando el jugador confirma
// un ataque sobre una casilla vacía.
export function resolverAtaqueSinObjetivo({ atacante } = {}) {
  if (!atacante?.estaVivo) {
    return {
      impacto: false,
      danio: 0,

      mensaje:
        `${atacante?.nombre ?? "El combatiente"} ` +
        "no puede atacar porque está derrotado.",
    };
  }

  const requisitos = verificarRequisitosAtaque(atacante);

  if (!requisitos.disponible) {
    return {
      impacto: false,
      danio: 0,

      ataqueNoDisponible: true,

      mensaje: requisitos.mensaje,
    };
  }

  const resultadoMunicion = consumirMunicionAtaque(atacante);

  return {
    impacto: false,
    danio: 0,

    municionRestante: resultadoMunicion.restante,

    mensaje:
      "Atacaste una casilla vacía." + crearTextoMunicion(resultadoMunicion),
  };
}

export function resolverAtaque({ atacante, objetivo } = {}) {
  if (!atacante?.estaVivo) {
    return {
      impacto: false,
      bloqueado: false,
      critico: false,
      danio: 0,

      objetivoDestruido: false,

      mensaje:
        `${atacante?.nombre ?? "El combatiente"} ` +
        "no puede atacar porque está derrotado.",
    };
  }

  if (!(objetivo instanceof Destructible)) {
    throw new Error(
      `${atacante.nombre} solamente puede atacar ` + "objetivos destructibles.",
    );
  }

  if (objetivo.estaDestruido) {
    return {
      impacto: false,
      bloqueado: false,
      critico: false,
      danio: 0,

      objetivoDestruido: true,

      mensaje: `${objetivo.nombre} ya está destruido.`,
    };
  }

  const requisitos = verificarRequisitosAtaque(atacante);

  if (!requisitos.disponible) {
    return {
      impacto: false,
      bloqueado: false,
      critico: false,
      danio: 0,

      objetivoDestruido: false,

      ataqueNoDisponible: true,

      mensaje: requisitos.mensaje,
    };
  }

  // La flecha se consume antes de saber
  // si el disparo impacta.
  const resultadoMunicion = consumirMunicionAtaque(atacante);

  const textoMunicion = crearTextoMunicion(resultadoMunicion);

  const probabilidadImpacto = calcularProbabilidadImpacto(atacante, objetivo);

  const tiradaImpacto = tirarPorcentaje(probabilidadImpacto);

  if (!tiradaImpacto.exito) {
    return {
      impacto: false,
      bloqueado: false,
      critico: false,
      danio: 0,

      objetivoDestruido: false,

      probabilidadImpacto,

      tiradaImpacto: tiradaImpacto.tirada,

      municionRestante: resultadoMunicion.restante,

      mensaje:
        `${atacante.nombre} falla contra ` +
        `${objetivo.nombre}.\n` +
        `Impacto: ${tiradaImpacto.tirada} / ` +
        `${formatearNumero(probabilidadImpacto)}%.` +
        textoMunicion,
    };
  }

  // Primera etapa ofensiva:
  //
  // daño bruto y crítico.
  const resultadoDanio = calcularDanioFisicoBruto(atacante);

  const estadisticasObjetivo = obtenerEstadisticasCombatiente(objetivo);

  // Primera capa defensiva:
  //
  // escudo físico.
  const resultadoBloqueo = resolverBloqueoParcial({
    estadisticasObjetivo,

    danioEntrante: resultadoDanio.danioBruto,
  });

  // En el futuro, las barreras o escudos
  // mágicos se procesarán en este punto.
  const danioTrasBarreras = resultadoBloqueo.danioRestante;

  // Segunda capa defensiva actual:
  //
  // armadura física.
  const armadura = estadisticasObjetivo?.armadura ?? objetivo.armadura ?? 0;

  const reduccionArmadura = calcularReduccionArmadura(
    armadura,
    danioTrasBarreras,
  );

  const danioTrasArmadura = danioTrasBarreras * (1 - reduccionArmadura);

  // Ya no existe un daño mínimo obligatorio.
  //
  // Si todas las capas defensivas reducen
  // el resultado a menos de 1, se aplicará 0.
  const danioSolicitado = Math.max(
    0,

    Math.floor(danioTrasArmadura),
  );

  const danioAplicado = objetivo.recibirDanio(danioSolicitado);

  const porcentajeReduccionArmadura = reduccionArmadura * 100;

  const textoCritico = resultadoDanio.critico ? " Golpe crítico." : "";

  const textoBloqueo = crearTextoBloqueo(resultadoBloqueo);

  return {
    impacto: true,

    bloqueado: resultadoBloqueo.bloqueado,

    critico: resultadoDanio.critico,

    danio: danioAplicado,

    danioBruto: resultadoDanio.danioBruto,

    danioMitigadoBloqueo: resultadoBloqueo.danioMitigado,

    danioDespuesBloqueo: resultadoBloqueo.danioRestante,

    probabilidadBloqueo: resultadoBloqueo.probabilidadBloqueo,

    mitigacionBloqueo: resultadoBloqueo.mitigacionBloqueo,

    tiradaBloqueo: resultadoBloqueo.tiradaBloqueo,

    armadura,
    reduccionArmadura,

    objetivoDestruido: objetivo.estaDestruido,

    probabilidadImpacto,

    tiradaImpacto: tiradaImpacto.tirada,

    municionRestante: resultadoMunicion.restante,

    mensaje:
      `${atacante.nombre} impacta a ${objetivo.nombre} ` +
      `(${tiradaImpacto.tirada} / ` +
      `${formatearNumero(probabilidadImpacto)}%) ` +
      `y causa ${danioAplicado} de daño.\n` +
      `Bruto: ${formatearNumero(resultadoDanio.danioBruto)}.` +
      textoCritico +
      textoBloqueo +
      ` Armadura: ${armadura} ` +
      `(-${formatearNumero(porcentajeReduccionArmadura)}%).` +
      textoMunicion,
  };
}
