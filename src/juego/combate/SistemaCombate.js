import { Destructible } from "../../entidad/destructible/Destructible.js";
import { CONFIGURACION_COMBATE } from "../../config/ConfiguracionCombate.js";
import {
  verificarRequisitosAtaque,
  consumirMunicionAtaque,
} from "../../entidad/destructible/combatiente/ConfiguracionAtaque.js";
import {
  TIPOS_DANIO,
  calcularReduccionArmadura,
  crearDesgloseDanioVacio,
  normalizarTipoDanio,
  obtenerEtiquetaTipoDanio,
  resolverPaqueteDanio,
} from "./ComponentesDanio.js";

export { calcularReduccionArmadura } from "./ComponentesDanio.js";

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

function tirarRango(minimo, maximo) {
  if (!Number.isFinite(minimo) || !Number.isFinite(maximo)) {
    throw new Error("El rango de daño debe contener números finitos.");
  }

  if (minimo < 0 || maximo < minimo) {
    throw new Error("El rango de daño no es válido.");
  }

  const minimoEntero = Math.ceil(minimo);
  const maximoEntero = Math.floor(maximo);

  if (maximoEntero <= minimoEntero) {
    return minimoEntero;
  }

  return (
    Math.floor(Math.random() * (maximoEntero - minimoEntero + 1)) +
    minimoEntero
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

function obtenerComponentesDanioFuente(fuente) {
  if (
    Array.isArray(fuente.componentesDanio) &&
    fuente.componentesDanio.length > 0
  ) {
    return fuente.componentesDanio;
  }

  // Adaptador de compatibilidad para estadísticas físicas
  // creadas antes del contrato de componentes tipados.
  return [
    {
      tipo: TIPOS_DANIO.FISICO,
      minimoLocal: fuente.minimoLocal,
      maximoLocal: fuente.maximoLocal,
      multiplicadorAtributo: fuente.multiplicadorAtributo,
      aplicaDanioPlanoGlobal: true,
      aplicaMultiplicadorGlobal: true,
      aplicaCritico: true,
    },
  ];
}

// Calcula todos los componentes brutos de una fuente.
//
// La fuente realiza una única tirada de crítico. Cuando
// el crítico se activa, afecta al conjunto de componentes
// que no lo hayan deshabilitado explícitamente.
function calcularComponentesDanioBruto({
  fuente,
  configuracionDanio,
  tiradaDanioGlobal,
}) {
  const descriptores = obtenerComponentesDanioFuente(fuente);

  // Primero se realizan las tiradas locales. De esta forma,
  // un ataque físico antiguo conserva el mismo orden de azar:
  // daño local, crítico y luego bloqueo.
  const componentesBase = descriptores.map((descriptor) => {
    const tipo = normalizarTipoDanio(descriptor.tipo);
    const minimoLocal = descriptor.minimoLocal ?? descriptor.minimo ?? 0;
    const maximoLocal = descriptor.maximoLocal ?? descriptor.maximo ?? 0;
    const tiradaLocal = tirarRango(minimoLocal, maximoLocal);
    const multiplicadorAtributo =
      descriptor.multiplicadorAtributo ??
      (tipo === TIPOS_DANIO.FISICO
        ? fuente.multiplicadorAtributo
        : 1);
    const aplicaDanioPlanoGlobal =
      descriptor.aplicaDanioPlanoGlobal ?? (tipo === TIPOS_DANIO.FISICO);
    const aplicaMultiplicadorGlobal =
      descriptor.aplicaMultiplicadorGlobal ?? (tipo === TIPOS_DANIO.FISICO);
    const multiplicadorGolpe =
      descriptor.multiplicadorGolpe ?? fuente.multiplicadorGolpe ?? 1;
    const multiplicadorGlobal =
      descriptor.multiplicadorGlobal ??
      (aplicaMultiplicadorGlobal
        ? configuracionDanio.multiplicadorGlobal
        : 1);
    const danioPlanoGlobal = aplicaDanioPlanoGlobal
      ? tiradaDanioGlobal
      : 0;
    const danioBrutoBase =
      (tiradaLocal * multiplicadorAtributo + danioPlanoGlobal) *
      multiplicadorGolpe *
      multiplicadorGlobal;

    return {
      tipo,
      tiradaLocal,
      minimoLocal,
      maximoLocal,
      multiplicadorAtributo,
      danioPlanoGlobal,
      multiplicadorGolpe,
      multiplicadorGlobal,
      aplicaCritico: descriptor.aplicaCritico !== false,
      danioBrutoBase: Math.max(0, danioBrutoBase),
    };
  });

  const tiradaCritico = tirarPorcentaje(fuente.probabilidadCritico);
  const componentes = componentesBase.map((componente) => ({
    ...componente,
    danioBruto:
      tiradaCritico.exito && componente.aplicaCritico
        ? componente.danioBrutoBase * fuente.multiplicadorCritico
        : componente.danioBrutoBase,
  }));

  return {
    critico: tiradaCritico.exito,
    tiradaCritico: tiradaCritico.tirada,
    probabilidadCritico: fuente.probabilidadCritico,
    multiplicadorCritico: fuente.multiplicadorCritico,
    componentes,
  };
}

function crearResultadoSinBloqueo(danioFisicoEntrante = 0) {
  return {
    bloqueado: false,
    probabilidadBloqueo: 0,
    mitigacionBloqueo: 0,
    tiradaBloqueo: null,
    proporcionMitigada: 0,
    danioMitigado: 0,
    danioRestante: Math.max(0, danioFisicoEntrante),
  };
}

// La tirada de bloqueo pertenece a la fuente completa,
// pero la mitigación se aplica únicamente a sus componentes
// físicos dentro de ComponentesDanio.
function resolverTiradaBloqueo({
  estadisticasObjetivo,
  danioFisicoEntrante,
} = {}) {
  if (estadisticasObjetivo === null || danioFisicoEntrante <= 0) {
    return crearResultadoSinBloqueo(danioFisicoEntrante);
  }

  const probabilidadBloqueo =
    estadisticasObjetivo.probabilidadBloqueo ?? 0;
  const mitigacionBloqueo = estadisticasObjetivo.mitigacionBloqueo ?? 0;

  if (probabilidadBloqueo <= 0 || mitigacionBloqueo <= 0) {
    return crearResultadoSinBloqueo(danioFisicoEntrante);
  }

  const tiradaBloqueo = tirarPorcentaje(probabilidadBloqueo);
  if (!tiradaBloqueo.exito) {
    return {
      ...crearResultadoSinBloqueo(danioFisicoEntrante),
      probabilidadBloqueo,
      mitigacionBloqueo,
      tiradaBloqueo: tiradaBloqueo.tirada,
    };
  }

  const proporcionMitigada = mitigacionBloqueo / 100;
  const danioMitigado = danioFisicoEntrante * proporcionMitigada;
  const danioRestante = Math.max(
    0,
    danioFisicoEntrante - danioMitigado,
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

function sumarComponentes(componentes, campo, tipo = null) {
  return componentes.reduce((total, componente) => {
    if (tipo !== null && componente.tipo !== tipo) {
      return total;
    }

    const valor = componente[campo];
    return total + (Number.isFinite(valor) ? valor : 0);
  }, 0);
}

// Resuelve una fuente individual.
//
// En combate dual esta función se ejecuta
// una vez por cada mano.
function resolverFuenteAtaque({
  atacante,
  objetivo,
  fuente,
  configuracionDanio,
  tiradaDanioGlobal,
  estadisticasObjetivo,
}) {
  const probabilidadImpacto = calcularProbabilidadImpacto(
    atacante,
    objetivo,
    fuente.precision,
  );
  const tiradaImpacto = tirarPorcentaje(probabilidadImpacto);

  if (!tiradaImpacto.exito) {
    return {
      nombreFuente: fuente.nombre,
      mano: fuente.mano,
      multiplicadorGolpe: fuente.multiplicadorGolpe,
      impacto: false,
      bloqueado: false,
      critico: false,
      danio: 0,
      danioCalculado: 0,
      danioBruto: 0,
      componentesDanio: [],
      desgloseDanio: crearDesgloseDanioVacio(),
      probabilidadImpacto,
      tiradaImpacto: tiradaImpacto.tirada,
      armadura: 0,
      reduccionArmadura: 0,
      danioMitigadoBloqueo: 0,
      danioDespuesBloqueo: 0,
      probabilidadBloqueo: 0,
      mitigacionBloqueo: 0,
      tiradaBloqueo: null,
      resistencias: {},
    };
  }

  const resultadoBruto = calcularComponentesDanioBruto({
    fuente,
    configuracionDanio,
    tiradaDanioGlobal,
  });
  const danioFisicoBruto = sumarComponentes(
    resultadoBruto.componentes,
    "danioBruto",
    TIPOS_DANIO.FISICO,
  );
  const resultadoBloqueo = resolverTiradaBloqueo({
    estadisticasObjetivo,
    danioFisicoEntrante: danioFisicoBruto,
  });
  const armadura =
    estadisticasObjetivo?.armadura ?? objetivo.armadura ?? 0;
  const resistencias = estadisticasObjetivo?.resistencias ?? {};
  const paquete = resolverPaqueteDanio({
    componentes: resultadoBruto.componentes.map((componente) => ({
      tipo: componente.tipo,
      danioBruto: componente.danioBruto,
    })),
    armadura,
    resistencias,
    bloqueo: {
      activo: resultadoBloqueo.bloqueado,
      mitigacion: resultadoBloqueo.mitigacionBloqueo,
    },
  });
  const componentesDanio = paquete.componentes.map(
    (componenteResuelto, indice) => ({
      ...resultadoBruto.componentes[indice],
      ...componenteResuelto,
    }),
  );
  const danioAplicado = objetivo.recibirDanio(paquete.danioCalculado);
  const componentesFisicos = componentesDanio.filter(
    (componente) => componente.tipo === TIPOS_DANIO.FISICO,
  );
  const primerFisico = componentesFisicos[0] ?? null;

  return {
    nombreFuente: fuente.nombre,
    mano: fuente.mano,
    multiplicadorGolpe: fuente.multiplicadorGolpe,
    impacto: true,
    bloqueado: resultadoBloqueo.bloqueado,
    critico: resultadoBruto.critico,
    danio: danioAplicado,
    danioCalculado: paquete.danioCalculado,
    danioBruto: paquete.danioBruto,
    componentesDanio,
    desgloseDanio: paquete.desgloseDanio,
    tiradaLocal: resultadoBruto.componentes[0]?.tiradaLocal ?? null,
    probabilidadCritico: resultadoBruto.probabilidadCritico,
    tiradaCritico: resultadoBruto.tiradaCritico,
    multiplicadorCritico: resultadoBruto.multiplicadorCritico,
    danioMitigadoBloqueo: sumarComponentes(
      componentesFisicos,
      "danioMitigadoBloqueo",
    ),
    danioDespuesBloqueo: sumarComponentes(
      componentesFisicos,
      "danioDespuesBloqueo",
    ),
    probabilidadBloqueo: resultadoBloqueo.probabilidadBloqueo,
    mitigacionBloqueo: resultadoBloqueo.mitigacionBloqueo,
    tiradaBloqueo: resultadoBloqueo.tiradaBloqueo,
    armadura: primerFisico?.armadura ?? 0,
    reduccionArmadura: primerFisico?.reduccionArmadura ?? 0,
    resistencias,
    probabilidadImpacto,
    tiradaImpacto: tiradaImpacto.tirada,
  };
}

function crearTextoMunicion(resultadoMunicion) {
  if (!resultadoMunicion.consumida) {
    return null;
  }

  return `Munición restante: ${resultadoMunicion.restante}.`;
}

function crearTextoBloqueo(resultadoGolpe) {
  if (!resultadoGolpe.bloqueado) {
    return "";
  }

  return (
    " Bloqueo: " +
    `${resultadoGolpe.tiradaBloqueo} / ` +
    `${formatearNumero(resultadoGolpe.probabilidadBloqueo)}%.\n` +
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

function obtenerTiposActivos(resultadoGolpe) {
  return Object.values(resultadoGolpe.desgloseDanio ?? {}).filter(
    (entrada) => entrada.danioBruto > 0,
  );
}

function crearTextoDesglose(resultadoGolpe) {
  const tiposActivos = obtenerTiposActivos(resultadoGolpe);
  const esFisicoPuro =
    tiposActivos.length === 1 &&
    tiposActivos[0].tipo === TIPOS_DANIO.FISICO;

  if (tiposActivos.length === 0 || esFisicoPuro) {
    return "";
  }

  const partes = tiposActivos.map((entrada) => {
    const etiqueta = obtenerEtiquetaTipoDanio(entrada.tipo);
    const componente = resultadoGolpe.componentesDanio.find(
      (actual) => actual.tipo === entrada.tipo,
    );
    let defensa = "";

    if (
      entrada.tipo === TIPOS_DANIO.FISICO &&
      (componente?.armadura ?? 0) > 0
    ) {
      defensa =
        `, Armadura -` +
        `${formatearNumero((componente.reduccionArmadura ?? 0) * 100)}%`;
    } else if ((componente?.resistencia ?? 0) > 0) {
      defensa = `, resistencia ${formatearNumero(componente.resistencia)}%`;
    }

    return (
      `${formatearNumero(entrada.danioFinal)} ${etiqueta}` +
      ` (bruto ${formatearNumero(entrada.danioBruto)}${defensa})`
    );
  });

  return ` Desglose: ${partes.join("; ")}.`;
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
  const tiposActivos = obtenerTiposActivos(resultadoGolpe);
  const incluyeFisico = tiposActivos.some(
    (entrada) => entrada.tipo === TIPOS_DANIO.FISICO,
  );
  const porcentajeArmadura = resultadoGolpe.reduccionArmadura * 100;
  const textoArmadura = incluyeFisico
    ? ` Armadura: ${resultadoGolpe.armadura} ` +
      `(-${formatearNumero(porcentajeArmadura)}%).`
    : "";
  const textoDesglose = crearTextoDesglose(resultadoGolpe);

  return (
    `${nombreOrigen} impacta ` +
    `(${resultadoGolpe.tiradaImpacto} / ` +
    `${formatearNumero(resultadoGolpe.probabilidadImpacto)}%) ` +
    `y causa ${resultadoGolpe.danio} de daño.\n` +
    `Bruto: ${formatearNumero(resultadoGolpe.danioBruto)}.` +
    textoCritico +
    textoBloqueo +
    textoArmadura +
    textoDesglose
  );
}

function sumarCampo(resultados, campo) {
  return resultados.reduce(
    (total, resultado) =>
      total + (Number.isFinite(resultado[campo]) ? resultado[campo] : 0),
    0,
  );
}

function combinarDesgloses(resultados) {
  const combinado = crearDesgloseDanioVacio();

  for (const resultado of resultados) {
    for (const tipo of Object.keys(combinado)) {
      const entrada = resultado.desgloseDanio?.[tipo];
      if (!entrada) {
        continue;
      }

      combinado[tipo].danioBruto += entrada.danioBruto;
      combinado[tipo].danioMitigado += entrada.danioMitigado;
      combinado[tipo].danioFinal += entrada.danioFinal;
    }
  }

  return combinado;
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
      `${atacante.nombre} solamente puede atacar ` +
        "objetivos destructibles.",
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
  const fuentes = configuracionDanio.componentes;

  if (!Array.isArray(fuentes) || fuentes.length === 0) {
    throw new Error(`${atacante.nombre} no tiene golpes configurados.`);
  }

  // Esta tirada se comparte entre las manos.
  //
  // Cada fuente recibe luego el porcentaje
  // correspondiente a su multiplicador.
  const tiradaDanioGlobal = tirarRango(
    configuracionDanio.danioPlanoGlobal.minimo,
    configuracionDanio.danioPlanoGlobal.maximo,
  );
  const estadisticasObjetivo = obtenerEstadisticasCombatiente(objetivo);
  const resultadosGolpes = [];

  for (const fuente of fuentes) {
    // Si el primer golpe destruyó al objetivo,
    // el golpe siguiente ya no se ejecuta.
    if (objetivo.estaDestruido) {
      break;
    }

    resultadosGolpes.push(
      resolverFuenteAtaque({
        atacante,
        objetivo,
        fuente,
        configuracionDanio,
        tiradaDanioGlobal,
        estadisticasObjetivo,
      }),
    );
  }

  const cantidadProgramada = fuentes.length;
  const impacto = resultadosGolpes.some((resultado) => resultado.impacto);
  const bloqueado = resultadosGolpes.some((resultado) => resultado.bloqueado);
  const critico = resultadosGolpes.some((resultado) => resultado.critico);
  const danioTotal = sumarCampo(resultadosGolpes, "danio");
  const danioCalculado = sumarCampo(resultadosGolpes, "danioCalculado");
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
    danioCalculado,
    danioBruto: sumarCampo(resultadosGolpes, "danioBruto"),
    desgloseDanio: combinarDesgloses(resultadosGolpes),
    componentesDanio: resultadosGolpes.flatMap(
      (resultado) => resultado.componentesDanio ?? [],
    ),
    danioMitigadoBloqueo: sumarCampo(
      resultadosGolpes,
      "danioMitigadoBloqueo",
    ),
    danioDespuesBloqueo: sumarCampo(
      resultadosGolpes,
      "danioDespuesBloqueo",
    ),
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
