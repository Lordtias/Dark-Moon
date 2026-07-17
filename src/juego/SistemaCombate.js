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

export function calcularReduccionArmadura(armadura, danioFisicoBruto) {
  if (armadura <= 0 || danioFisicoBruto <= 0) {
    return 0;
  }

  const factor = CONFIGURACION_COMBATE.armadura.factorDanio;

  return armadura / (armadura + factor * danioFisicoBruto);
}

// Cada arma activa realiza su propia tirada
// y aplica su propio atributo.
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

function crearTextoMunicion(resultadoMunicion) {
  if (!resultadoMunicion.consumida) {
    return "";
  }

  return ` Munición restante: ` + `${resultadoMunicion.restante}.`;
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
        `${objetivo.nombre}. ` +
        `Impacto: ${tiradaImpacto.tirada} / ` +
        `${formatearNumero(probabilidadImpacto)}%.` +
        textoMunicion,
    };
  }

  const estadisticasObjetivo = obtenerEstadisticasCombatiente(objetivo);

  if (
    estadisticasObjetivo !== null &&
    estadisticasObjetivo.probabilidadBloqueo > 0
  ) {
    const tiradaBloqueo = tirarPorcentaje(
      estadisticasObjetivo.probabilidadBloqueo,
    );

    if (tiradaBloqueo.exito) {
      return {
        impacto: true,
        bloqueado: true,
        critico: false,
        danio: 0,
        objetivoDestruido: false,

        municionRestante: resultadoMunicion.restante,

        mensaje:
          `${objetivo.nombre} bloquea el ataque ` +
          `de ${atacante.nombre}. ` +
          `Bloqueo: ${tiradaBloqueo.tirada} / ` +
          `${formatearNumero(estadisticasObjetivo.probabilidadBloqueo)}%.` +
          textoMunicion,
      };
    }
  }

  const resultadoDanio = calcularDanioFisicoBruto(atacante);

  const armadura = estadisticasObjetivo?.armadura ?? objetivo.armadura ?? 0;

  const reduccionArmadura = calcularReduccionArmadura(
    armadura,
    resultadoDanio.danioBruto,
  );

  const danioReducido = resultadoDanio.danioBruto * (1 - reduccionArmadura);

  const danioSolicitado = Math.max(
    CONFIGURACION_COMBATE.armadura.danioMinimo,

    Math.floor(danioReducido),
  );

  const danioAplicado = objetivo.recibirDanio(danioSolicitado);

  const porcentajeReduccion = reduccionArmadura * 100;

  const textoCritico = resultadoDanio.critico ? " Golpe crítico." : "";

  return {
    impacto: true,
    bloqueado: false,

    critico: resultadoDanio.critico,

    danio: danioAplicado,

    danioBruto: resultadoDanio.danioBruto,

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
      `y causa ${danioAplicado} de daño. ` +
      `Bruto: ${formatearNumero(resultadoDanio.danioBruto)}. ` +
      `Armadura: ${armadura} ` +
      `(-${formatearNumero(porcentajeReduccion)}%).` +
      textoCritico +
      textoMunicion,
  };
}
