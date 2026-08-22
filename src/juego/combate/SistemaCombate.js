import { limitar } from "../../utilidades/Numeros.js";
import { Destructible } from "../../entidad/destructible/Destructible.js";
import { CONFIGURACION_COMBATE } from "../../config/ConfiguracionCombate.js";
import { calcularDistanciaCuadricula } from "../espacio/GeometriaCuadricula.js";
import {
  verificarRequisitosAtaque,
  consumirRecursosAtaque,
  obtenerContextoSemanticoAtaque,
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

let secuenciaResolucionesAtaque = 0;

function crearIdResolucionAtaque() {
  secuenciaResolucionesAtaque += 1;
  return `ataque:${secuenciaResolucionesAtaque}`;
}

function crearDistribucionMitigacionArmadura(danioMitigadoArmadura, desgloseArmadura) {
  const categorias = ["ligera", "media", "pesada", "escudo", "otras"];
  const vacio = Object.fromEntries(categorias.map((categoria) => [categoria, 0]));
  if (!Number.isFinite(danioMitigadoArmadura) || danioMitigadoArmadura <= 0) {
    return Object.freeze(vacio);
  }

  const total = desgloseArmadura?.totalClasificable ?? 0;
  if (!Number.isFinite(total) || total <= 0) {
    return Object.freeze({ ...vacio, otras: danioMitigadoArmadura });
  }

  const distribucion = {};
  for (const categoria of categorias) {
    const aporte = desgloseArmadura?.[categoria] ?? 0;
    distribucion[categoria] = Number.isFinite(aporte) && aporte > 0
      ? danioMitigadoArmadura * (aporte / total)
      : 0;
  }
  return Object.freeze(distribucion);
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

// Permite proporcionar la precisión ya resuelta de una fuente concreta,
// por ejemplo una mano específica durante un ataque dual.
export function obtenerDesgloseProbabilidadImpacto(
  atacante,
  objetivo,
  precisionAtaque = null,
) {
  const estadisticasAtacante = atacante.estadisticasDerivadas;
  const estadisticasObjetivo = obtenerEstadisticasCombatiente(objetivo);

  // Los destructibles inmóviles no pueden evadir. El 100% forma parte del
  // contrato canónico y se conserva explícitamente en la instantánea.
  if (estadisticasObjetivo === null) {
    return Object.freeze({
      automatico: true,
      precision: Math.max(1, precisionAtaque ?? estadisticasAtacante.precision),
      evasion: 0,
      nivelAtacante: Math.max(1, atacante.nivel),
      nivelObjetivo: null,
      factorFormula: null,
      probabilidadMinima: 100,
      probabilidadMaxima: 100,
      probabilidadSinLimitar: 100,
      probabilidadFinal: 100,
    });
  }

  const precision = Math.max(
    1,
    precisionAtaque ?? estadisticasAtacante.precision,
  );
  const evasion = Math.max(0, estadisticasObjetivo.evasion);
  const nivelAtacante = Math.max(1, atacante.nivel);
  const nivelObjetivo = Math.max(1, objetivo.nivel);
  const configuracion = CONFIGURACION_COMBATE.impacto;
  const probabilidadSinLimitar =
    configuracion.factorFormula *
    (precision / (precision + evasion)) *
    (nivelAtacante / (nivelAtacante + nivelObjetivo));
  const probabilidadFinal = limitar(
    probabilidadSinLimitar,
    configuracion.probabilidadMinima,
    configuracion.probabilidadMaxima,
  );

  return Object.freeze({
    automatico: false,
    precision,
    evasion,
    nivelAtacante,
    nivelObjetivo,
    factorFormula: configuracion.factorFormula,
    probabilidadMinima: configuracion.probabilidadMinima,
    probabilidadMaxima: configuracion.probabilidadMaxima,
    probabilidadSinLimitar,
    probabilidadFinal,
  });
}

export function calcularProbabilidadImpacto(
  atacante,
  objetivo,
  precisionAtaque = null,
) {
  return obtenerDesgloseProbabilidadImpacto(
    atacante,
    objetivo,
    precisionAtaque,
  ).probabilidadFinal;
}

export function calcularDispersionAplicada({ dispersion = 0, distancia, alcance } = {}) {
  if (!Number.isFinite(dispersion)) {
    throw new Error("La Dispersión debe ser numérica.");
  }
  if (!Number.isFinite(distancia) || !Number.isFinite(alcance) || alcance <= 0) {
    return 0;
  }
  const configuracion = CONFIGURACION_COMBATE.dispersion;
  const dispersionLimitada = limitar(dispersion, configuracion.minima, configuracion.maxima);
  const inicio = alcance * configuracion.inicioTramoAlcance;
  if (distancia <= inicio) return 0;
  const tramo = alcance - inicio;
  if (tramo <= 0) return dispersionLimitada;
  const progreso = limitar((distancia - inicio) / tramo, 0, 1);
  return dispersionLimitada * progreso;
}

export function obtenerDesgloseProbabilidadImpactoFuente({ atacante, objetivo, fuente = null } = {}) {
  if (!atacante || !objetivo) {
    throw new Error("La consulta de impacto necesita atacante y objetivo.");
  }
  const fuenteResuelta = fuente ?? atacante.estadisticasDerivadas?.danioFisico?.componentes?.[0] ?? null;
  const precisionBase = fuenteResuelta?.precision ?? atacante.estadisticasDerivadas.precision;
  const dispersion = fuenteResuelta?.dispersion ?? 0;
  const distancia = Number.isFinite(atacante.x) && Number.isFinite(atacante.y) && Number.isFinite(objetivo.x) && Number.isFinite(objetivo.y)
    ? calcularDistanciaCuadricula(atacante, objetivo)
    : null;
  const alcance = atacante.alcanceAtaque;
  const dispersionAplicada = calcularDispersionAplicada({ dispersion, distancia, alcance });
  const precisionContextual = Math.max(1, precisionBase * (1 + dispersionAplicada / 100));
  const desglose = obtenerDesgloseProbabilidadImpacto(atacante, objetivo, precisionContextual);
  return Object.freeze({
    ...desglose,
    precisionBase,
    precisionContextual,
    dispersion,
    dispersionAplicada,
    distancia,
    alcance,
  });
}

function obtenerComponentesDanioFuente(fuente) {
  if (
    !Array.isArray(fuente.componentesDanio) ||
    fuente.componentesDanio.length === 0
  ) {
    throw new Error(
      `La fuente de daño "${fuente?.nombre ?? "desconocida"}" debe exponer componentes tipados.`,
    );
  }
  return fuente.componentesDanio;
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

  // Primero se realizan las tiradas locales y luego la tirada compartida de
  // crítico de la fuente; bloqueo y mitigaciones pertenecen a etapas posteriores.
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
  const desgloseImpacto = obtenerDesgloseProbabilidadImpactoFuente({
    atacante,
    objetivo,
    fuente,
  });
  const probabilidadImpacto = desgloseImpacto.probabilidadFinal;
  const tiradaImpacto = tirarPorcentaje(probabilidadImpacto);

  if (!tiradaImpacto.exito) {
    return {
      nombreFuente: fuente.nombre,
      idFuente: fuente.objeto?.id ?? null,
      familiaArma: fuente.objeto?.familiaObjeto ?? null,
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
      desgloseImpacto,
      tiradaImpacto: tiradaImpacto.tirada,
      armadura: 0,
      penetracionArmadura: fuente.penetracionArmadura ?? 0,
      dispersion: fuente.dispersion ?? 0,
      reduccionArmadura: 0,
      danioMitigadoArmadura: 0,
      distribucionMitigacionArmadura: crearDistribucionMitigacionArmadura(0, null),
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
    penetracionArmadura: fuente.penetracionArmadura ?? 0,
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
  const danioAplicado = objetivo.recibirDanio(paquete.danioCalculado, {
    fuente: atacante,
    tipoAccion: "ataque",
    hostil: true,
  });
  const componentesFisicos = componentesDanio.filter(
    (componente) => componente.tipo === TIPOS_DANIO.FISICO,
  );
  const primerFisico = componentesFisicos[0] ?? null;
  const danioMitigadoArmadura = sumarComponentes(
    componentesFisicos,
    "danioMitigadoArmadura",
  );
  const distribucionMitigacionArmadura = crearDistribucionMitigacionArmadura(
    danioMitigadoArmadura,
    estadisticasObjetivo?.desgloseArmadura,
  );

  return {
    nombreFuente: fuente.nombre,
    idFuente: fuente.objeto?.id ?? null,
    familiaArma: fuente.objeto?.familiaObjeto ?? null,
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
    danioMitigadoArmadura,
    distribucionMitigacionArmadura,
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
    penetracionArmadura: primerFisico?.penetracionArmadura ?? fuente.penetracionArmadura ?? 0,
    dispersion: fuente.dispersion ?? 0,
    reduccionArmaduraBase: primerFisico?.reduccionArmaduraBase ?? 0,
    reduccionArmadura: primerFisico?.reduccionArmadura ?? 0,
    resistencias,
    probabilidadImpacto,
    desgloseImpacto,
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

    if (entrada.tipo === TIPOS_DANIO.FISICO) {
      const reduccion = (componente?.reduccionArmadura ?? 0) * 100;
      const penetracion = componente?.penetracionArmadura ?? 0;
      defensa = reduccion >= 0
        ? `, Armadura -${formatearNumero(reduccion)}%`
        : `, vulnerabilidad física +${formatearNumero(Math.abs(reduccion))}%`;
      if (penetracion > 0) {
        defensa += `, penetración ${formatearNumero(penetracion)}%`;
      }
    } else if ((componente?.resistencia ?? 0) > 0) {
      defensa = `, resistencia ${formatearNumero(componente.resistencia)}%`;
    } else if ((componente?.resistencia ?? 0) < 0) {
      defensa = `, vulnerabilidad +${formatearNumero(Math.abs(componente.resistencia))}%`;
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
  const penetracionArmadura = resultadoGolpe.penetracionArmadura ?? 0;
  const textoDefensaFisica = porcentajeArmadura >= 0
    ? `mitigación ${formatearNumero(porcentajeArmadura)}%`
    : `vulnerabilidad +${formatearNumero(Math.abs(porcentajeArmadura))}%`;
  const textoPenetracion = penetracionArmadura > 0
    ? `, penetración ${formatearNumero(penetracionArmadura)}%`
    : "";
  const textoArmadura = incluyeFisico
    ? ` Armadura: ${resultadoGolpe.armadura} (${textoDefensaFisica}${textoPenetracion}).`
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
      ataqueNoDisponible: true,
      motivoNoDisponible: "atacante_derrotado",
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
      requisitos,
      mensaje: requisitos.mensaje,
    };
  }

  const resultadoMunicion = consumirRecursosAtaque(atacante);
  const mensajeBase = requisitos.configuracion.esAtaqueDual
    ? "Atacaste una casilla vacía con ambas armas."
    : "Atacaste una casilla vacía.";
  const textoMunicion = crearTextoMunicion(resultadoMunicion);

  return {
    impacto: false,
    danio: 0,
    municionRestante: resultadoMunicion.restante,
    municionUtilizada: resultadoMunicion.municionUtilizada,
    mensaje: [mensajeBase, textoMunicion].filter(Boolean).join(" "),
  };
}

// Resuelve una secuencia de golpes de una misma fuente de arma para una
// habilidad. No consume recursos ni tiempo: reutiliza exactamente impacto,
// crítico, bloqueo, Armadura, Penetración y daño del motor canónico.
export function resolverSecuenciaFuenteAtaque({
  atacante,
  objetivo,
  fuente,
  configuracionDanio,
  cantidadGolpes = 1,
  factorDanio = 1,
} = {}) {
  if (!atacante?.estaVivo) {
    throw new Error("La secuencia de arma necesita un atacante vivo.");
  }
  if (!(objetivo instanceof Destructible) || objetivo.estaDestruido) {
    throw new Error("La secuencia de arma necesita un objetivo destructible activo.");
  }
  if (!fuente || typeof fuente !== "object") {
    throw new Error("La secuencia de arma necesita una fuente canónica.");
  }
  if (!configuracionDanio || typeof configuracionDanio !== "object") {
    throw new Error("La secuencia de arma necesita la configuración canónica de daño.");
  }
  if (!Number.isInteger(cantidadGolpes) || cantidadGolpes <= 0) {
    throw new Error("La cantidad de golpes de la secuencia debe ser un entero positivo.");
  }
  if (!Number.isFinite(factorDanio) || factorDanio <= 0) {
    throw new Error("El factor de daño de la secuencia debe ser mayor que 0.");
  }

  const idResolucion = crearIdResolucionAtaque();
  const fuenteHabilidad = {
    ...fuente,
    multiplicadorGolpe: fuente.multiplicadorGolpe * factorDanio,
  };
  const golpes = [];

  for (let indice = 0; indice < cantidadGolpes; indice += 1) {
    // Una ráfaga ya comprometida resuelve todos sus proyectiles. Si un golpe
    // destruye al objetivo, los siguientes continúan su trayectoria y pueden
    // resolver impacto/crítico, pero recibirDanio devolverá 0 sobre Vida ya
    // agotada. Así visuales, munición y cantidad programada permanecen coherentes.
    const tiradaDanioGlobal = tirarRango(
      configuracionDanio.danioPlanoGlobal.minimo,
      configuracionDanio.danioPlanoGlobal.maximo,
    );
    golpes.push(
      resolverFuenteAtaque({
        atacante,
        objetivo,
        fuente: fuenteHabilidad,
        configuracionDanio,
        tiradaDanioGlobal,
        estadisticasObjetivo: obtenerEstadisticasCombatiente(objetivo),
      }),
    );
  }

  const primerGolpe = golpes[0] ?? null;
  return {
    idResolucion,
    impacto: golpes.some((golpe) => golpe.impacto),
    bloqueado: golpes.some((golpe) => golpe.bloqueado),
    critico: golpes.some((golpe) => golpe.critico),
    danio: sumarCampo(golpes, "danio"),
    danioCalculado: sumarCampo(golpes, "danioCalculado"),
    danioBruto: sumarCampo(golpes, "danioBruto"),
    desgloseDanio: combinarDesgloses(golpes),
    componentesDanio: golpes.flatMap((golpe) => golpe.componentesDanio ?? []),
    danioMitigadoArmadura: sumarCampo(golpes, "danioMitigadoArmadura"),
    danioMitigadoBloqueo: sumarCampo(golpes, "danioMitigadoBloqueo"),
    danioDespuesBloqueo: sumarCampo(golpes, "danioDespuesBloqueo"),
    probabilidadBloqueo: primerGolpe?.probabilidadBloqueo ?? 0,
    mitigacionBloqueo: primerGolpe?.mitigacionBloqueo ?? 0,
    tiradaBloqueo: primerGolpe?.tiradaBloqueo ?? null,
    armadura: primerGolpe?.armadura ?? 0,
    reduccionArmadura: primerGolpe?.reduccionArmadura ?? 0,
    objetivoDestruido: objetivo.estaDestruido,
    probabilidadImpacto: primerGolpe?.probabilidadImpacto ?? 0,
    tiradaImpacto: primerGolpe?.tiradaImpacto ?? null,
    esAtaqueDual: false,
    golpesProgramados: cantidadGolpes,
    golpesRealizados: golpes.length,
    golpes,
    factorDanio,
    mensaje: `${atacante.nombre} ejecuta una habilidad de arma contra ${objetivo.nombre}.`,
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
      ataqueNoDisponible: true,
      motivoNoDisponible: "atacante_derrotado",
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
      ataqueNoDisponible: true,
      motivoNoDisponible: "objetivo_destruido",
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
      requisitos,
      mensaje: requisitos.mensaje,
    };
  }

  // La munición se consume una sola vez
  // por acción de ataque.
  const resultadoMunicion = consumirRecursosAtaque(atacante);
  const idResolucion = crearIdResolucionAtaque();
  const contextoSemantico = obtenerContextoSemanticoAtaque(requisitos.configuracion);
  const estadisticasAtacante =
    contextoSemantico.etiquetaAccion &&
    typeof atacante.obtenerEstadisticasDerivadasContextuales === "function"
      ? atacante.obtenerEstadisticasDerivadasContextuales({
          tipoAccion: "ataque",
          etiquetaAccion: contextoSemantico.etiquetaAccion,
        })
      : atacante.estadisticasDerivadas;
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
    idResolucion,
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
    danioMitigadoArmadura: sumarCampo(
      resultadosGolpes,
      "danioMitigadoArmadura",
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
    municionUtilizada: resultadoMunicion.municionUtilizada,
    esAtaqueDual: configuracionDanio.esAtaqueDual,
    golpesProgramados: cantidadProgramada,
    golpesRealizados: resultadosGolpes.length,
    golpes: resultadosGolpes,
    mensaje: lineasMensaje.join("\n"),
  };
}
