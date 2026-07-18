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

// Permite proporcionar la precisión de una mano
// específica durante un ataque dual.
//
// Los consumidores anteriores pueden seguir
// llamando la función con solamente dos argumentos.
export function calcularProbabilidadImpacto(
  atacante,
  objetivo,
  precisionAtaque = null,
) {
  const estadisticasAtacante = atacante.estadisticasDerivadas;

  const estadisticasObjetivo = obtenerEstadisticasCombatiente(objetivo);

  // Los destructibles inmóviles
  // no pueden evadir.
  if (estadisticasObjetivo === null) {
    return 100;
  }

  const precision = Math.max(
    1,

    precisionAtaque ?? estadisticasAtacante.precision,
  );

  const evasion = Math.max(
    0,

    estadisticasObjetivo.evasion,
  );

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

// Calcula el daño bruto de una sola mano.
//
// La tirada de daño global se comparte entre
// todos los golpes del ataque y luego se reparte
// mediante el multiplicador de cada mano.
function calcularDanioFisicoBruto({
  componente,
  configuracionDanio,
  tiradaDanioGlobal,
}) {
  const tiradaLocal = tirarRango(
    componente.minimoLocal,

    componente.maximoLocal,
  );

  const danioLocalEscalado = tiradaLocal * componente.multiplicadorAtributo;

  let danioBruto =
    (danioLocalEscalado + tiradaDanioGlobal) *
    componente.multiplicadorGolpe *
    configuracionDanio.multiplicadorGlobal;

  const tiradaCritico = tirarPorcentaje(componente.probabilidadCritico);

  if (tiradaCritico.exito) {
    danioBruto *= componente.multiplicadorCritico;
  }

  return {
    tiradaLocal,

    critico: tiradaCritico.exito,

    tiradaCritico: tiradaCritico.tirada,

    probabilidadCritico: componente.probabilidadCritico,

    multiplicadorCritico: componente.multiplicadorCritico,

    danioBruto: Math.max(0, danioBruto),
  };
}

// Procesa la primera capa defensiva:
//
// escudo físico.
function resolverBloqueoParcial({ estadisticasObjetivo, danioEntrante } = {}) {
  if (estadisticasObjetivo === null || danioEntrante <= 0) {
    return crearResultadoSinBloqueo(danioEntrante);
  }

  const probabilidadBloqueo = estadisticasObjetivo.probabilidadBloqueo ?? 0;

  const mitigacionBloqueo = estadisticasObjetivo.mitigacionBloqueo ?? 0;

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

// Resuelve un golpe individual.
//
// En combate dual esta función se ejecuta
// una vez por cada mano.
function resolverGolpeFisico({
  atacante,
  objetivo,
  componente,
  configuracionDanio,
  tiradaDanioGlobal,
  estadisticasObjetivo,
}) {
  const probabilidadImpacto = calcularProbabilidadImpacto(
    atacante,
    objetivo,
    componente.precision,
  );

  const tiradaImpacto = tirarPorcentaje(probabilidadImpacto);

  if (!tiradaImpacto.exito) {
    return {
      nombreFuente: componente.nombre,

      mano: componente.mano,

      multiplicadorGolpe: componente.multiplicadorGolpe,

      impacto: false,
      bloqueado: false,
      critico: false,

      danio: 0,
      danioBruto: 0,

      probabilidadImpacto,

      tiradaImpacto: tiradaImpacto.tirada,

      armadura: 0,
      reduccionArmadura: 0,

      danioMitigadoBloqueo: 0,
      danioDespuesBloqueo: 0,

      probabilidadBloqueo: 0,
      mitigacionBloqueo: 0,
      tiradaBloqueo: null,
    };
  }

  const resultadoDanio = calcularDanioFisicoBruto({
    componente,
    configuracionDanio,
    tiradaDanioGlobal,
  });

  // Primera capa defensiva:
  //
  // escudo físico.
  const resultadoBloqueo = resolverBloqueoParcial({
    estadisticasObjetivo,

    danioEntrante: resultadoDanio.danioBruto,
  });

  // En el futuro las barreras físicas o mágicas
  // se procesarán en este punto.
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

  // El resultado puede ser cero.
  const danioSolicitado = Math.max(
    0,

    Math.floor(danioTrasArmadura),
  );

  const danioAplicado = objetivo.recibirDanio(danioSolicitado);

  return {
    nombreFuente: componente.nombre,

    mano: componente.mano,

    multiplicadorGolpe: componente.multiplicadorGolpe,

    impacto: true,

    bloqueado: resultadoBloqueo.bloqueado,

    critico: resultadoDanio.critico,

    danio: danioAplicado,

    danioBruto: resultadoDanio.danioBruto,

    tiradaLocal: resultadoDanio.tiradaLocal,

    probabilidadCritico: resultadoDanio.probabilidadCritico,

    tiradaCritico: resultadoDanio.tiradaCritico,

    multiplicadorCritico: resultadoDanio.multiplicadorCritico,

    danioMitigadoBloqueo: resultadoBloqueo.danioMitigado,

    danioDespuesBloqueo: resultadoBloqueo.danioRestante,

    probabilidadBloqueo: resultadoBloqueo.probabilidadBloqueo,

    mitigacionBloqueo: resultadoBloqueo.mitigacionBloqueo,

    tiradaBloqueo: resultadoBloqueo.tiradaBloqueo,

    armadura,
    reduccionArmadura,

    probabilidadImpacto,

    tiradaImpacto: tiradaImpacto.tirada,
  };
}

function crearTextoMunicion(resultadoMunicion) {
  if (!resultadoMunicion.consumida) {
    return null;
  }

  return "Munición restante: " + `${resultadoMunicion.restante}.`;
}

function crearTextoBloqueo(resultadoGolpe) {
  if (!resultadoGolpe.bloqueado) {
    return "";
  }

  return (
    " Bloqueo: " +
    `${resultadoGolpe.tiradaBloqueo} / ` +
    `${formatearNumero(resultadoGolpe.probabilidadBloqueo)}%. ` +
    "Mitigación: " +
    `${formatearNumero(resultadoGolpe.mitigacionBloqueo)}% ` +
    `(-${formatearNumero(resultadoGolpe.danioMitigadoBloqueo)}).`
  );
}

function obtenerNombreMano(mano) {
  switch (mano) {
    case "principal":
      return "Mano principal";

    case "secundaria":
      return "Mano secundaria";

    default:
      return "Ataque";
  }
}

function crearTextoGolpe(resultadoGolpe, cantidadGolpes) {
  const nombreOrigen =
    cantidadGolpes > 1
      ? `${obtenerNombreMano(resultadoGolpe.mano)} ` +
        `(${resultadoGolpe.nombreFuente})`
      : resultadoGolpe.nombreFuente;

  if (!resultadoGolpe.impacto) {
    return (
      `${nombreOrigen} falla ` +
      `(${resultadoGolpe.tiradaImpacto} / ` +
      `${formatearNumero(resultadoGolpe.probabilidadImpacto)}%).`
    );
  }

  const textoCritico = resultadoGolpe.critico ? " Golpe crítico." : "";

  const textoBloqueo = crearTextoBloqueo(resultadoGolpe);

  const porcentajeArmadura = resultadoGolpe.reduccionArmadura * 100;

  return (
    `${nombreOrigen} impacta ` +
    `(${resultadoGolpe.tiradaImpacto} / ` +
    `${formatearNumero(resultadoGolpe.probabilidadImpacto)}%) ` +
    `y causa ${resultadoGolpe.danio} de daño. ` +
    `Bruto: ${formatearNumero(resultadoGolpe.danioBruto)}.` +
    textoCritico +
    textoBloqueo +
    ` Armadura: ${resultadoGolpe.armadura} ` +
    `(-${formatearNumero(porcentajeArmadura)}%).`
  );
}

function sumarCampo(resultados, campo) {
  return resultados.reduce(
    (total, resultado) =>
      total + (Number.isFinite(resultado[campo]) ? resultado[campo] : 0),

    0,
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

  const mensajeBase = requisitos.configuracion.esAtaqueDual
    ? "Atacaste una casilla vacía con ambas armas."
    : "Atacaste una casilla vacía.";

  const textoMunicion = crearTextoMunicion(resultadoMunicion);

  return {
    impacto: false,
    danio: 0,

    municionRestante: resultadoMunicion.restante,

    mensaje: [mensajeBase, textoMunicion].filter(Boolean).join(" "),
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

  // La munición se consume una sola vez
  // por acción de ataque.
  const resultadoMunicion = consumirMunicionAtaque(atacante);

  const estadisticasAtacante = atacante.estadisticasDerivadas;

  const configuracionDanio = estadisticasAtacante.danioFisico;

  const componentes = configuracionDanio.componentes;

  if (!Array.isArray(componentes) || componentes.length === 0) {
    throw new Error(`${atacante.nombre} no tiene golpes configurados.`);
  }

  // Esta tirada se comparte entre las manos.
  //
  // Cada componente recibe luego el porcentaje
  // correspondiente a su multiplicador.
  const tiradaDanioGlobal = tirarRango(
    configuracionDanio.danioPlanoGlobal.minimo,

    configuracionDanio.danioPlanoGlobal.maximo,
  );

  const estadisticasObjetivo = obtenerEstadisticasCombatiente(objetivo);

  const resultadosGolpes = [];

  for (const componente of componentes) {
    // Si el primer golpe destruyó al objetivo,
    // el golpe siguiente ya no se ejecuta.
    if (objetivo.estaDestruido) {
      break;
    }

    resultadosGolpes.push(
      resolverGolpeFisico({
        atacante,
        objetivo,
        componente,
        configuracionDanio,
        tiradaDanioGlobal,
        estadisticasObjetivo,
      }),
    );
  }

  const cantidadProgramada = componentes.length;

  const impacto = resultadosGolpes.some((resultado) => resultado.impacto);

  const bloqueado = resultadosGolpes.some((resultado) => resultado.bloqueado);

  const critico = resultadosGolpes.some((resultado) => resultado.critico);

  const danioTotal = sumarCampo(resultadosGolpes, "danio");

  const lineasMensaje = [
    configuracionDanio.esAtaqueDual
      ? `${atacante.nombre} ataca a ${objetivo.nombre} con dos armas.`
      : `${atacante.nombre} ataca a ${objetivo.nombre}.`,
  ];

  for (const resultadoGolpe of resultadosGolpes) {
    lineasMensaje.push(crearTextoGolpe(resultadoGolpe, cantidadProgramada));
  }

  if (configuracionDanio.esAtaqueDual) {
    lineasMensaje.push(`Daño total: ${danioTotal}.`);
  }

  if (resultadosGolpes.length < cantidadProgramada) {
    lineasMensaje.push(
      "El segundo golpe no se realizó porque el objetivo fue destruido.",
    );
  }

  const textoMunicion = crearTextoMunicion(resultadoMunicion);

  if (textoMunicion) {
    lineasMensaje.push(textoMunicion);
  }

  const primerGolpe = resultadosGolpes[0] ?? null;

  return {
    impacto,
    bloqueado,
    critico,

    danio: danioTotal,

    danioBruto: sumarCampo(resultadosGolpes, "danioBruto"),

    danioMitigadoBloqueo: sumarCampo(resultadosGolpes, "danioMitigadoBloqueo"),

    danioDespuesBloqueo: sumarCampo(resultadosGolpes, "danioDespuesBloqueo"),

    probabilidadBloqueo: primerGolpe?.probabilidadBloqueo ?? 0,

    mitigacionBloqueo: primerGolpe?.mitigacionBloqueo ?? 0,

    tiradaBloqueo: primerGolpe?.tiradaBloqueo ?? null,

    armadura: primerGolpe?.armadura ?? 0,

    reduccionArmadura: primerGolpe?.reduccionArmadura ?? 0,

    objetivoDestruido: objetivo.estaDestruido,

    probabilidadImpacto: primerGolpe?.probabilidadImpacto ?? 0,

    tiradaImpacto: primerGolpe?.tiradaImpacto ?? null,

    municionRestante: resultadoMunicion.restante,

    esAtaqueDual: configuracionDanio.esAtaqueDual,

    golpesProgramados: cantidadProgramada,

    golpesRealizados: resultadosGolpes.length,

    golpes: resultadosGolpes,

    mensaje: lineasMensaje.join("\n"),
  };
}
